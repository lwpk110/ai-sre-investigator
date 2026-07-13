"""全链路集成测试（T9, ADR-001/004/005）。

测试完整路径：NL message → mock LLM → mock Mimir → RCA 输出。
包括部分 RCA 路径和自修正路径。
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
from pydantic import BaseModel

from app.agent.budget import BudgetTracker
from app.agent.events import SSEEvent
from app.agent.loop import AgentLoop
from app.agent.safe_executor import SafeToolExecutor
from app.tools.base import ToolResult, ToolSpec
from app.tools.mimir import MimirTool

# ---------------------------------------------------------------------------
# Mock 工具构造
# ---------------------------------------------------------------------------


class _Params(BaseModel):
    query: str = "up"


class _ControllableTool(ToolSpec):
    """可控测试工具：可配置返回值和失败次数。"""

    name: str = "mimir"
    description: str = "可控测试工具"
    parameters: type = _Params

    def __init__(self, fail_count: int = 0, **data: Any) -> None:
        super().__init__(**data)
        self._fail_count = fail_count
        self._call_count = 0

    async def execute(self, params: BaseModel) -> ToolResult:
        self._call_count += 1
        if self._call_count <= self._fail_count:
            return ToolResult(success=False, error=f"模拟失败 #{self._call_count}")
        return ToolResult(
            success=True,
            data={"resultType": "vector", "result": [{"value": [1, "42"]}]},
        )


def _make_tc_mock(tc_id: str, name: str, arguments: str) -> MagicMock:
    """构造 mock tool_call。"""
    mock_tc = MagicMock()
    mock_tc.id = tc_id
    mock_tc.type = "function"
    mock_tc.function = MagicMock()
    mock_tc.function.name = name
    mock_tc.function.arguments = arguments
    return mock_tc


def _make_response(
    content: str | None = None,
    tool_calls: list[MagicMock] | None = None,
    finish_reason: str = "stop",
    total_tokens: int = 500,
) -> MagicMock:
    """构造 mock ChatCompletion response。"""
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = tool_calls

    choice = MagicMock()
    choice.message = msg
    choice.finish_reason = finish_reason

    resp = MagicMock()
    resp.choices = [choice]
    resp.usage = MagicMock(total_tokens=total_tokens)
    return resp


def _mock_client(responses: list[MagicMock]) -> MagicMock:
    """创建按顺序返回 responses 的 mock AsyncOpenAI client。"""
    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=responses)
    return client


async def _collect(agent: AgentLoop, message: str) -> list[SSEEvent]:
    events: list[SSEEvent] = []
    async for event in agent.run(message):
        events.append(event)
    return events


# ---------------------------------------------------------------------------
# 集成测试
# ---------------------------------------------------------------------------


class TestFullLoopNLtoRCA:
    """NL → mock LLM → 工具执行 → RCA 完整链路。"""

    async def test_nl_to_rca_full_chain(self):
        """自然语言 → LLM 生成工具调用 → 工具执行 → LLM 生成 RCA。"""
        # 第一轮：LLM 请求调用 mimir 查询指标
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )
        # 第二轮：LLM 基于结果生成 RCA
        r2 = _make_response(
            content="## RCA 报告\n\n根因：payment-service 内存泄漏导致 OOM。",
            finish_reason="stop",
        )

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _ControllableTool()

        agent = AgentLoop(
            tools=[tool],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "payment-service 为什么大量 500")

        # 验证完整事件链
        types = [e.type for e in events]
        assert "thinking" in types
        assert "tool_call" in types
        assert "tool_result" in types
        assert "budget_update" in types
        assert types[-1] == "rca_complete"

        # 验证 RCA 内容
        rca_event = events[-1]
        assert "OOM" in rca_event.data["report"]
        assert rca_event.data["confidence"] == "medium"  # 1 条证据 → medium

    async def test_multiple_tools_then_rca(self):
        """多轮工具调用后生成 RCA。"""
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )
        r2 = _make_response(
            tool_calls=[_make_tc_mock("c2", "mimir", json.dumps({"query": "rate(up[5m])"}))],
            finish_reason="tool_calls",
        )
        r3 = _make_response(
            content="## RCA\n多轮排查完成。",
            finish_reason="stop",
        )

        client = _mock_client([r1, r2, r3])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_ControllableTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "详细排查")

        tc_events = [e for e in events if e.type == "tool_call"]
        tr_events = [e for e in events if e.type == "tool_result"]
        assert len(tc_events) == 2
        assert len(tr_events) == 2
        assert events[-1].type == "rca_complete"
        assert events[-1].data["confidence"] == "high"


class TestPartialRCABudgetExhaustion:
    """预算耗尽 → 部分 RCA（ADR-005）。"""

    async def test_budget_exhaustion_produces_partial_rca(self):
        """工具调用预算耗尽后发送 rca_partial，包含已收集的证据。"""
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )

        client = _mock_client([r1])
        # 只允许 1 次工具调用
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=1)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_ControllableTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")

        assert events[-1].type == "rca_partial"
        assert "预算耗尽" in events[-1].data["report"]
        # 部分报告中包含已收集的工具证据
        assert "mimir" in events[-1].data["report"].lower()
        assert len(events[-1].data["missing"]) > 0

    async def test_budget_exhaustion_no_evidence(self):
        """预算从一开始就耗尽且无证据 → 空部分 RCA。"""
        client = _mock_client([])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=0)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_ControllableTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")
        assert events[-1].type == "rca_partial"
        assert "未能收集到任何证据" in events[-1].data["report"]


class TestSelfHealPath:
    """自修正路径：工具失败 → 自修正 → 成功。"""

    async def test_tool_failure_then_heal_success(self):
        """工具第一次失败 → 自修正回调修正 → 第二次成功。"""
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )
        r2 = _make_response(
            content="## RCA\n修正后成功。",
            finish_reason="stop",
        )

        # heal response: LLM 返回修正后的参数
        heal_resp = _make_response(
            content=json.dumps({"query": "rate(up[5m])"}),
            finish_reason="stop",
        )

        # 执行顺序: r1(主循环第一轮) → heal_resp(修正) → r2(主循环第二轮)
        client = _mock_client([r1, heal_resp, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)

        executor = SafeToolExecutor(budget=budget)
        tool = _ControllableTool(fail_count=1)  # 只失败一次

        agent = AgentLoop(
            tools=[tool],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")

        # 最终应该成功
        assert events[-1].type == "rca_complete"

        # 验证 tool_result 中有成功结果
        tr_events = [e for e in events if e.type == "tool_result"]
        assert any(e.data["success"] for e in tr_events)

    async def test_heal_gives_up_gracefully(self):
        """自修正多次失败后优雅放弃 → 返回失败结果，不崩溃。"""
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )
        r2 = _make_response(
            content="## RCA\n工具持续失败，无法获取数据。",
            finish_reason="stop",
        )

        # heal responses: LLM 尝试修正但工具仍然失败（3次后放弃）
        heal_resps = [
            _make_response(content=json.dumps({"query": "up"}), finish_reason="stop"),
            _make_response(content=json.dumps({"query": "rate(up[5m])"}), finish_reason="stop"),
            _make_response(content=json.dumps({"query": "up"}), finish_reason="stop"),
        ]

        # 执行顺序: r1 → heal×3 → r2
        client = _mock_client([r1] + heal_resps + [r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)

        executor = SafeToolExecutor(budget=budget)
        tool = _ControllableTool(fail_count=99)  # 永远失败

        agent = AgentLoop(
            tools=[tool],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")

        # 循环不崩溃，最终完成 RCA（LLM 基于失败信息生成结论）
        assert events[-1].type == "rca_complete"

        # tool_result 应显示失败
        tr_events = [e for e in events if e.type == "tool_result"]
        assert all(not e.data["success"] for e in tr_events)


class TestErrorHandling:
    """异常路径 → error 事件（ADR-005 优雅失败）。"""

    async def test_llm_api_error_yields_error_event(self):
        """LLM API 异常 → error 事件，不抛出异常。"""
        client = MagicMock()
        client.chat = MagicMock()
        client.chat.completions = MagicMock()
        client.chat.completions.create = AsyncMock(
            side_effect=RuntimeError("API 连接超时")
        )

        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_ControllableTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")
        assert events[-1].type == "error"
        assert "API" in events[-1].data["message"]

    async def test_unknown_tool_does_not_crash(self):
        """LLM 调用未知工具 → 反馈错误给 LLM → 继续循环。"""
        r1 = _make_response(
            tool_calls=[
                _make_tc_mock("c1", "unknown_tool", json.dumps({"query": "up"}))
            ],
            finish_reason="tool_calls",
        )
        r2 = _make_response(
            content="## RCA\n未知工具已跳过。",
            finish_reason="stop",
        )

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_ControllableTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")
        assert events[-1].type == "rca_complete"


class TestMimirIntegrationWithMockTransport:
    """使用真实 MimirTool + httpx MockTransport 的集成测试。"""

    async def test_real_mimir_tool_in_loop(self):
        """真实 MimirTool（mock transport）集成到 AgentLoop 中。"""
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={
                "status": "success",
                "data": {
                    "resultType": "vector",
                    "result": [{
                        "metric": {"service": "payment"},
                        "value": [1719800000, "42"],
                    }],
                },
            })

        mimir = MimirTool(
            client=httpx.AsyncClient(
                transport=httpx.MockTransport(handler),
                base_url="http://mock",
                timeout=5.0,
            )
        )

        r1 = _make_response(
            tool_calls=[
                _make_tc_mock(
                    "c1", "mimir",
                    json.dumps({"query": "rate(http_requests_total[5m])"}),
                )
            ],
            finish_reason="tool_calls",
        )
        r2 = _make_response(
            content="## RCA\n请求量正常。",
            finish_reason="stop",
        )

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[mimir],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查请求量")

        tr_events = [e for e in events if e.type == "tool_result"]
        assert len(tr_events) == 1
        assert tr_events[0].data["success"] is True
        assert events[-1].type == "rca_complete"
