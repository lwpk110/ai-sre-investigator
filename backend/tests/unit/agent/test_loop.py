"""AgentLoop 单元测试（T7, ADR-001/005）。

使用 mock AsyncOpenAI client 模拟 LLM 的 tool-calling 行为，
验证循环逻辑：工具调用→结果反馈→预算耗尽→部分/完整 RCA→SSE 事件。
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import BaseModel

from app.agent.budget import BudgetTracker
from app.agent.events import SSEEvent
from app.agent.loop import AgentLoop
from app.agent.safe_executor import SafeToolExecutor
from app.tools.base import ToolResult, ToolSpec


class _SimpleParams(BaseModel):
    """测试用参数模型。"""

    query: str = "up"


class _StubTool(ToolSpec):
    """可控的测试工具。"""

    name: str = "mimir"
    description: str = "测试用 Mimir 工具"
    parameters: type = _SimpleParams

    async def execute(self, params: BaseModel) -> ToolResult:
        return ToolResult(success=True, data={"value": params.query})


# ---------------------------------------------------------------------------
# Mock 构造辅助
# ---------------------------------------------------------------------------


def _make_tool_call_mock(tc_id: str, name: str, arguments: str) -> MagicMock:
    """构造一个 mock tool_call 对象，模拟 openai SDK 的 ChoiceMessageToolCall。"""
    mock_tc = MagicMock()
    mock_tc.id = tc_id
    mock_tc.type = "function"
    mock_tc.function = MagicMock()
    mock_tc.function.name = name
    mock_tc.function.arguments = arguments
    return mock_tc


def _make_choice(
    content: str | None = None,
    tool_calls: list[dict[str, Any]] | None = None,
    finish_reason: str = "stop",
) -> dict[str, Any]:
    """构造一个 mock chat.completions choice 字典。"""
    message = MagicMock()
    message.role = "assistant"
    message.content = content
    if tool_calls:
        message.tool_calls = [
            _make_tool_call_mock(
                tc["id"],
                tc["function"]["name"],
                tc["function"]["arguments"],
            )
            for tc in tool_calls
        ]
    else:
        message.tool_calls = None
    return {"message": message, "finish_reason": finish_reason}


def _make_response(
    choices: list[dict[str, Any]],
    total_tokens: int = 500,
) -> MagicMock:
    """构造一个 mock ChatCompletion 对象。"""
    response = MagicMock()
    response.choices = [
        MagicMock(message=c["message"], finish_reason=c["finish_reason"])
        for c in choices
    ]
    response.usage = MagicMock(total_tokens=total_tokens)
    return response


def _mock_client(responses: list[MagicMock]) -> MagicMock:
    """创建 mock AsyncOpenAI client，按顺序返回 responses。"""
    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(side_effect=responses)
    return client


# ---------------------------------------------------------------------------
# 事件收集辅助
# ---------------------------------------------------------------------------


async def _collect_events(agent: AgentLoop, message: str) -> list[SSEEvent]:
    """收集 AgentLoop.run() 产出的所有 SSE 事件。"""
    events: list[SSEEvent] = []
    async for event in agent.run(message):
        events.append(event)
    return events


# ---------------------------------------------------------------------------
# 测试类
# ---------------------------------------------------------------------------


class TestAgentLoopNormal:
    """正常循环：LLM 调用工具→获取结果→finish_reason=stop→rca_complete。"""

    async def test_completes_after_tool_call(self):
        """第一轮调用工具，第二轮 finish_reason=stop → 发送 rca_complete。"""
        # 第一轮：LLM 请求调用 mimir 工具
        tool_call_resp = _make_response([
            _make_choice(
                content=None,
                tool_calls=[{
                    "id": "call_1",
                    "function": {"name": "mimir", "arguments": json.dumps({"query": "up"})},
                }],
                finish_reason="tool_calls",
            ),
        ])
        # 第二轮：LLM 返回最终 RCA
        final_resp = _make_response([
            _make_choice(content="## RCA 报告\n原因是内存不足。", finish_reason="stop"),
        ])

        client = _mock_client([tool_call_resp, final_resp])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "payment-service 为什么 500")

        types = [e.type for e in events]
        # 应该有 thinking → budget_update → tool_call → tool_result → ... → rca_complete
        assert "tool_call" in types
        assert "tool_result" in types
        assert "budget_update" in types
        assert events[-1].type == "rca_complete"
        assert "RCA" in events[-1].data["report"]

    async def test_immediate_stop_no_tool(self):
        """LLM 直接返回 finish_reason=stop 不调用工具 → rca_complete。"""
        resp = _make_response([
            _make_choice(content="## 快速 RCA\n无异常。", finish_reason="stop"),
        ])

        client = _mock_client([resp])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "一切正常吗？")
        assert events[-1].type == "rca_complete"
        assert events[-1].data["confidence"] == "medium"  # 无证据

    async def test_evidence_affects_confidence(self):
        """收集了 2+ 条证据 → confidence=high。"""
        # 第一轮：调用 mimir
        r1 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c1",
                    "function": {"name": "mimir", "arguments": json.dumps({"query": "up"})},
                }],
                finish_reason="tool_calls",
            ),
        ])
        # 第二轮：再调用 mimir
        r2 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c2",
                    "function": {
                        "name": "mimir",
                        "arguments": json.dumps({"query": "rate(up[5m])"}),
                    },
                }],
                finish_reason="tool_calls",
            ),
        ])
        # 第三轮：完成
        r3 = _make_response([
            _make_choice(content="## RCA\n确认问题。", finish_reason="stop"),
        ])

        client = _mock_client([r1, r2, r3])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )
        events = await _collect_events(agent, "详细排查")
        assert events[-1].type == "rca_complete"
        assert events[-1].data["confidence"] == "high"

    async def test_tool_call_event_has_correct_params(self):
        """tool_call 事件应携带工具名和参数。"""
        r1 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c1",
                    "function": {
                        "name": "mimir",
                        "arguments": json.dumps(
                            {"query": "rate(http_requests_total[5m])"}
                        ),
                    },
                }],
                finish_reason="tool_calls",
            ),
        ])
        r2 = _make_response([
            _make_choice(content="## RCA", finish_reason="stop"),
        ])

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        tc_events = [e for e in events if e.type == "tool_call"]
        assert len(tc_events) == 1
        assert tc_events[0].data["tool"] == "mimir"
        assert tc_events[0].data["params"]["query"] == "rate(http_requests_total[5m])"

    async def test_tool_result_event_has_data(self):
        """tool_result 事件应携带执行结果。"""
        r1 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c1",
                    "function": {"name": "mimir", "arguments": json.dumps({"query": "up"})},
                }],
                finish_reason="tool_calls",
            ),
        ])
        r2 = _make_response([
            _make_choice(content="## RCA", finish_reason="stop"),
        ])

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        tr_events = [e for e in events if e.type == "tool_result"]
        assert len(tr_events) == 1
        assert tr_events[0].data["success"] is True
        assert tr_events[0].data["data"]["value"] == "up"


class TestAgentLoopBudgetExhaustion:
    """预算耗尽 → rca_partial。"""

    async def test_budget_exhausted_triggers_partial_rca(self):
        """预算耗尽时发送 rca_partial 事件。"""
        r1 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c1",
                    "function": {"name": "mimir", "arguments": json.dumps({"query": "up"})},
                }],
                finish_reason="tool_calls",
            ),
        ])

        client = _mock_client([r1])
        # 预算只够 1 次工具调用 — 第二轮循环 is_exhausted 会变 True
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=1)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        # 最后事件应该是 rca_partial
        assert events[-1].type == "rca_partial"
        assert "预算耗尽" in events[-1].data["report"]
        assert len(events[-1].data["missing"]) > 0

    async def test_partial_rca_includes_evidence(self):
        """预算耗尽时部分 RCA 应包含已收集的证据。"""
        r1 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c1",
                    "function": {"name": "mimir", "arguments": json.dumps({"query": "up"})},
                }],
                finish_reason="tool_calls",
            ),
        ])

        client = _mock_client([r1])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=1)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        partial = events[-1]
        assert partial.type == "rca_partial"
        # 报告中应包含工具收集到的证据
        assert "mimir" in partial.data["report"].lower()

    async def test_partial_rca_no_evidence(self):
        """预算耗尽且无证据 → 生成空的部分 RCA。"""
        client = _mock_client([])
        # 预算从一开始就耗尽
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=0)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        assert events[-1].type == "rca_partial"
        assert "未能收集到任何证据" in events[-1].data["report"]


class TestAgentLoopErrorHandling:
    """异常处理 → error 事件。"""

    async def test_llm_exception_yields_error(self):
        """LLM API 异常时发送 error 事件。"""
        client = MagicMock()
        client.chat = MagicMock()
        client.chat.completions = MagicMock()
        client.chat.completions.create = AsyncMock(side_effect=RuntimeError("API 不可用"))

        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        assert events[-1].type == "error"
        assert "API 不可用" in events[-1].data["message"]

    async def test_unknown_tool_feeds_back_to_llm(self):
        """LLM 调用了不存在的工具 → 反馈错误给 LLM，继续循环。"""
        r1 = _make_response([
            _make_choice(
                tool_calls=[{
                    "id": "c1",
                    "function": {
                        "name": "nonexistent_tool",
                        "arguments": json.dumps({"query": "up"}),
                    },
                }],
                finish_reason="tool_calls",
            ),
        ])
        r2 = _make_response([
            _make_choice(content="## RCA\n无法排查。", finish_reason="stop"),
        ])

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        # 不应该崩溃，最终应返回 rca_complete
        assert events[-1].type == "rca_complete"


class TestAgentLoopEvents:
    """SSE 事件类型和内容验证。"""

    async def test_thinking_event_emitted(self):
        """每轮循环应产出 thinking 事件。"""
        r1 = _make_response([
            _make_choice(content="## RCA", finish_reason="stop"),
        ])

        client = _mock_client([r1])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        thinking_events = [e for e in events if e.type == "thinking"]
        assert len(thinking_events) >= 1
        assert "推理中" in thinking_events[0].data["text"]

    async def test_budget_update_event_emitted(self):
        """LLM 调用后应产出 budget_update 事件。"""
        r1 = _make_response([
            _make_choice(content="## RCA", finish_reason="stop"),
        ])

        client = _mock_client([r1])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        bu_events = [e for e in events if e.type == "budget_update"]
        assert len(bu_events) >= 1
        assert bu_events[0].data["tokens_used"] == 500
        assert bu_events[0].data["tokens_max"] == 100_000

    async def test_multiple_tool_calls_in_one_round(self):
        """LLM 在一轮中调用多个工具 — 所有工具都应执行。"""
        r1 = _make_response([
            _make_choice(
                tool_calls=[
                    {
                        "id": "c1",
                        "function": {"name": "mimir", "arguments": json.dumps({"query": "up"})},
                    },
                    {
                        "id": "c2",
                        "function": {
                        "name": "mimir",
                        "arguments": json.dumps(
                            {"query": "rate(http_requests_total[5m])"}
                        ),
                    },
                    },
                ],
                finish_reason="tool_calls",
            ),
        ])
        r2 = _make_response([
            _make_choice(content="## RCA\n双查完成。", finish_reason="stop"),
        ])

        client = _mock_client([r1, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect_events(agent, "排查")
        tc_events = [e for e in events if e.type == "tool_call"]
        tr_events = [e for e in events if e.type == "tool_result"]
        assert len(tc_events) == 2
        assert len(tr_events) == 2
        assert events[-1].type == "rca_complete"
        assert events[-1].data["confidence"] == "high"  # 2 条证据


class TestPartialRCAEnhancements:
    """部分 RCA 增强：suggestions 和 missing_queries（V1.5-F4）。"""

    @pytest.mark.asyncio
    async def test_partial_rca_includes_suggestions(self):
        """预算耗尽时部分 RCA 包含 suggestions 字段。"""
        budget = BudgetTracker(max_tokens=100, max_tool_calls=1)
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=MagicMock(),
        )

        suggestions = agent._generate_suggestions(
            evidence=["[mimir] 数据点1"],
            pending_queries=["loki: {service=\"x\"} |= \"error\""],
        )
        assert len(suggestions) >= 1
        assert isinstance(suggestions, list)

    def test_generate_suggestions_for_mimir(self):
        """mimir 查询的待执行建议应包含时间窗口。"""
        budget = BudgetTracker()
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=MagicMock(),
        )
        suggestions = agent._generate_suggestions(
            evidence=[],
            pending_queries=["mimir: rate(cpu[5m])"],
        )
        assert any("时间窗口" in s or "趋势" in s for s in suggestions)

    def test_generate_suggestions_fills_to_minimum(self):
        """建议不足 2 条时自动补充通用建议。"""
        budget = BudgetTracker()
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=MagicMock(),
        )
        suggestions = agent._generate_suggestions(
            evidence=["[mimir] 数据"],
            pending_queries=[],
        )
        assert len(suggestions) >= 2

    def test_generate_suggestions_max_three(self):
        """建议最多 3 条。"""
        budget = BudgetTracker()
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=MagicMock(),
        )
        suggestions = agent._generate_suggestions(
            evidence=[],
            pending_queries=["mimir: q1", "loki: q2", "tempo: q3", "mimir: q4"],
        )
        assert len(suggestions) <= 3


class TestRCACompleteSuggestions:
    """rca_complete 事件包含 suggestions 字段（V1.5-F3/F4）。"""

    def test_rca_complete_has_suggestions_field(self):
        """rca_complete 事件应包含 suggestions 字段（空列表）。"""
        from app.agent.events import rca_complete

        event = rca_complete(report="RCA 报告", confidence="high")
        assert "suggestions" in event.data
        assert isinstance(event.data["suggestions"], list)

    def test_rca_partial_has_suggestions_field(self):
        """rca_partial 事件应包含 suggestions 字段。"""
        from app.agent.events import rca_partial

        event = rca_partial(
            report="部分报告",
            missing=["缺失查询1"],
            suggestions=["建议1", "建议2"],
        )
        assert event.data["suggestions"] == ["建议1", "建议2"]
        assert event.data["missing"] == ["缺失查询1"]
        assert event.data["confidence"] == "low"


class TestPlaybookInjection:
    """V2-F2: 剧本注入到 Agent 系统提示词的测试。"""

    async def test_playbook_injected_into_system_prompt(self):
        """匹配的剧本步骤出现在 Agent 发送给 LLM 的 system 消息中。"""
        from app.playbooks.models import Playbook, PlaybookStep

        resp = _make_response(
            choices=[
                {
                    "message": MagicMock(
                        content="## RCA\n排查完成。",
                        tool_calls=None,
                    ),
                    "finish_reason": "stop",
                }
            ],
        )
        client = _mock_client([resp])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        pb = Playbook(
            id="test-oom",
            name="OOM 排查",
            fault_type="memory",
            trigger_keywords=["oom"],
            description="内存溢出",
            steps=[
                PlaybookStep(
                    probe="mimir",
                    query_template='container_memory_rss{{container="{service}"}}',
                    purpose="查看内存使用率",
                ),
            ],
            common_root_causes=["内存泄漏"],
        )
        agent.set_playbook(pb)

        async for _ in agent.run("排查内存问题"):
            pass

        call_kwargs = client.chat.completions.create.call_args.kwargs
        messages = call_kwargs.get("messages", [])
        system_content = messages[0].get("content", "") if messages else ""
        assert "黄金路径剧本" in system_content
        assert "OOM 排查" in system_content
        assert "内存泄漏" in system_content

    async def test_no_playbook_uses_base_prompt(self):
        """没有注入剧本时，系统提示词不包含黄金路径段落。"""
        resp = _make_response(
            choices=[
                {
                    "message": MagicMock(
                        content="## RCA\n完成。",
                        tool_calls=None,
                    ),
                    "finish_reason": "stop",
                }
            ],
        )
        client = _mock_client([resp])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)

        agent = AgentLoop(
            tools=[_StubTool()],
            executor=executor,
            budget=budget,
            client=client,
        )

        async for _ in agent.run("排查"):
            pass

        call_kwargs = client.chat.completions.create.call_args.kwargs
        messages = call_kwargs.get("messages", [])
        system_content = messages[0].get("content", "") if messages else ""
        assert "黄金路径剧本" not in system_content
