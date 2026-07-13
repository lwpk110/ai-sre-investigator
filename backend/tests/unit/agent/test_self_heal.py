"""self-heal 回调接线测试（ADR-004 L4 层）。

验证 AgentLoop 内置的 heal_callback 能在工具失败时向 LLM 请求修正参数。
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

from pydantic import BaseModel

from app.agent.budget import BudgetTracker
from app.agent.events import SSEEvent
from app.agent.loop import AgentLoop
from app.agent.safe_executor import SafeToolExecutor
from app.tools.base import ToolResult, ToolSpec


class _Params(BaseModel):
    query: str = "up"


class _FailingThenSuccessTool(ToolSpec):
    """前 fail_count 次失败，之后成功的测试工具。"""

    name: str = "mimir"
    description: str = "测试工具"
    parameters: type = _Params

    def __init__(self, fail_count: int = 1, **data: Any) -> None:
        super().__init__(**data)
        self._fail_count = fail_count
        self._calls = 0

    async def execute(self, params: BaseModel) -> ToolResult:
        self._calls += 1
        if self._calls <= self._fail_count:
            return ToolResult(success=False, error=f"模拟失败 #{self._calls}")
        return ToolResult(success=True, data={"result": "ok"})


def _make_tc_mock(tc_id: str, name: str, arguments: str) -> MagicMock:
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


class TestSelfHealWiring:
    """验证 AgentLoop 自动为 executor 注入 heal_callback。"""

    async def test_heal_callback_is_set_after_init(self):
        """AgentLoop 初始化后 executor 应有 heal_callback。"""
        client = _mock_client([])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _FailingThenSuccessTool(fail_count=1)

        agent = AgentLoop(
            tools=[tool],
            executor=executor,
            budget=budget,
            client=client,
        )

        # AgentLoop.run() 内部会注入 heal_callback
        # 直接检查 executor._heal_callback 不为 None
        assert agent._executor._heal_callback is not None

    async def test_heal_recovers_failed_query(self):
        """工具第一次失败 → heal_callback 向 LLM 请求修正 → LLM 给出修正参数 → 成功。"""
        # 主循环第一轮：LLM 调用 mimir（query=up）
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )
        # 主循环第二轮：LLM 返回 RCA
        r2 = _make_response(
            content="## RCA\n修正后查询成功。",
            finish_reason="stop",
        )
        # heal 调用：LLM 返回修正后的参数
        heal_resp = MagicMock()
        heal_msg = MagicMock()
        heal_msg.content = json.dumps({"query": "rate(http_requests_total[5m])"})
        heal_msg.tool_calls = None
        heal_choice = MagicMock()
        heal_choice.message = heal_msg
        heal_choice.finish_reason = "stop"
        heal_resp.choices = [heal_choice]
        heal_resp.usage = MagicMock(total_tokens=100)

        client = _mock_client([r1, heal_resp, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _FailingThenSuccessTool(fail_count=1)

        agent = AgentLoop(
            tools=[tool],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")

        # 最终应该成功完成
        assert events[-1].type == "rca_complete"

        # tool_result 应该有成功结果
        tr_events = [e for e in events if e.type == "tool_result"]
        assert any(e.data["success"] for e in tr_events)

    async def test_heal_returns_none_on_give_up(self):
        """LLM 无法修正 → heal_callback 返回 None → 工具保持失败。"""
        r1 = _make_response(
            tool_calls=[_make_tc_mock("c1", "mimir", json.dumps({"query": "up"}))],
            finish_reason="tool_calls",
        )
        r2 = _make_response(
            content="## RCA\n工具持续失败。",
            finish_reason="stop",
        )
        # heal 调用：LLM 返回无法解析的内容（None）
        heal_resp = MagicMock()
        heal_msg = MagicMock()
        heal_msg.content = "我无法修正这个查询"
        heal_msg.tool_calls = None
        heal_choice = MagicMock()
        heal_choice.message = heal_msg
        heal_choice.finish_reason = "stop"
        heal_resp.choices = [heal_choice]
        heal_resp.usage = MagicMock(total_tokens=100)

        client = _mock_client([r1, heal_resp, r2])
        budget = BudgetTracker(max_tokens=100_000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _FailingThenSuccessTool(fail_count=99)  # 永远失败

        agent = AgentLoop(
            tools=[tool],
            executor=executor,
            budget=budget,
            client=client,
        )

        events = await _collect(agent, "排查")

        # 循环不崩溃
        assert events[-1].type == "rca_complete"
        tr_events = [e for e in events if e.type == "tool_result"]
        assert all(not e.data["success"] for e in tr_events)
