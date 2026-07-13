"""SafeToolExecutor 四层包装器单元测试（T6, ADR-004/005）。"""

import pytest
from pydantic import BaseModel

from app.agent.budget import BudgetExhausted, BudgetTracker
from app.agent.safe_executor import SafeToolExecutor
from app.tools.base import ToolResult, ToolSpec


class _TestParams(BaseModel):
    query: str = "up"


class _TestTool(ToolSpec):
    """可控的测试工具：可以配置返回值和失败行为。"""

    name: str = "mimir"
    description: str = "测试工具"
    parameters: type = _TestParams
    _should_fail: bool = False

    def __init__(self, should_fail: bool = False, **data):
        super().__init__(**data)
        self._should_fail = should_fail

    async def execute(self, params: BaseModel) -> ToolResult:
        if self._should_fail:
            return ToolResult(success=False, error="模拟失败")
        return ToolResult(success=True, data={"query": params.query})


class TestBudgetPrecheck:
    """L1: 预算预检。"""

    async def test_budget_exhausted_raises(self):
        budget = BudgetTracker(max_tokens=100, max_tool_calls=1)
        budget.check_and_consume_call()  # 用掉唯一一次调用
        executor = SafeToolExecutor(budget=budget)
        tool = _TestTool()
        with pytest.raises(BudgetExhausted):
            await executor.call(tool, _TestParams())

    async def test_budget_allows_within_limit(self):
        budget = BudgetTracker(max_tokens=100, max_tool_calls=10)
        executor = SafeToolExecutor(budget=budget)
        tool = _TestTool()
        result = await executor.call(tool, _TestParams())
        assert result.success is True


class TestCacheLayer:
    """L2: 缓存命中。"""

    async def test_cache_hit_returns_cached(self):
        budget = BudgetTracker(max_tokens=10000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _TestTool()
        # 第一次调用
        r1 = await executor.call(tool, _TestParams(query="up"))
        assert r1.cached is False
        # 第二次相同参数 → 缓存命中
        r2 = await executor.call(tool, _TestParams(query="up"))
        assert r2.cached is True
        assert r2.data == r1.data


class TestQLValidation:
    """L3: QL 验证。"""

    async def test_invalid_promql_blocked(self):
        budget = BudgetTracker(max_tokens=10000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _TestTool()  # name=mimir，触发 PromQL 验证
        result = await executor.call(tool, _TestParams(query="SELECT * FROM x"))
        assert result.success is False
        assert "SQL" in result.error or "验证失败" in result.error

    async def test_valid_promql_passes(self):
        budget = BudgetTracker(max_tokens=10000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _TestTool()
        result = await executor.call(tool, _TestParams(query="rate(up[5m])"))
        assert result.success is True


class TestNeverRaises:
    """ADR-005: 绝不向上抛出。"""

    async def test_tool_failure_returns_error_result(self):
        budget = BudgetTracker(max_tokens=10000, max_tool_calls=100)
        executor = SafeToolExecutor(budget=budget)
        tool = _TestTool(should_fail=True)
        result = await executor.call(tool, _TestParams(query="rate(up[5m])"))
        assert isinstance(result, ToolResult)
        assert result.success is False
        assert "模拟失败" in result.error


class TestHealCallback:
    """L4: 自修正。"""

    async def test_heal_callback_invoked_on_failure(self):
        budget = BudgetTracker(max_tokens=10000, max_tool_calls=100)
        call_log: list[str] = []

        async def heal(tool_name, params, error):
            call_log.append(f"{tool_name}: {error}")
            return None  # 无法修正

        executor = SafeToolExecutor(budget=budget, heal_callback=heal)
        tool = _TestTool(should_fail=True)
        result = await executor.call(tool, _TestParams(query="rate(up[5m])"))
        assert result.success is False
        assert len(call_log) > 0

    async def test_heal_recovers(self):
        budget = BudgetTracker(max_tokens=10000, max_tool_calls=100)

        # 自修正回调：第一次修正后让工具成功
        heal_count = [0]

        class _RecoverableTool(ToolSpec):
            name: str = "mimir"
            description: str = "可恢复测试工具"
            parameters: type = _TestParams

            async def execute(self, params: BaseModel) -> ToolResult:
                if heal_count[0] == 0:
                    return ToolResult(success=False, error="临时失败")
                return ToolResult(success=True, data={"recovered": True})

        async def heal(tool_name, params, error):
            heal_count[0] += 1
            return params  # 返回相同参数触发重试

        executor = SafeToolExecutor(budget=budget, heal_callback=heal)
        tool = _RecoverableTool()
        result = await executor.call(tool, _TestParams(query="rate(up[5m])"))
        assert result.success is True
        assert result.data == {"recovered": True}
