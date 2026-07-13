"""SafeToolExecutor — 四层包装器（ADR-004）。

L1: 预算预检 → L2: 缓存命中 → L3: QL 验证 → L4: 执行 + 自修正

所有工具调用都经过此包装器，保证：预算可控、结果可缓存、QL 合法、失败可自愈。
绝不向上抛出异常（ADR-005）。
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any

from cachetools import TTLCache
from pydantic import BaseModel

from app.agent.budget import BudgetExhausted, BudgetTracker
from app.tools.base import ToolResult, ToolSpec
from app.tools.ql.validators import validate_ql

logger = logging.getLogger(__name__)

# 自修正时需要向 LLM 请求修正的最大尝试次数
MAX_HEAL_ATTEMPTS = 3


class SafeToolExecutor:
    """四层包装器，包裹所有 ToolSpec.execute() 调用。"""

    def __init__(
        self,
        budget: BudgetTracker,
        cache: TTLCache[str, ToolResult] | None = None,
        heal_callback: Any = None,
    ) -> None:
        self._budget = budget
        # L2 缓存：按 tool.name + params 哈希做 key
        self._cache: TTLCache[str, ToolResult] = cache or TTLCache(
            maxsize=512, ttl=300
        )
        # L4 自修正回调：当工具失败时，调用此函数让 LLM 修正参数
        # 签名: async def heal(tool_name, params, error) -> BaseModel | None
        self._heal_callback = heal_callback

    async def call(self, tool: ToolSpec, params: BaseModel) -> ToolResult:
        """执行工具调用，经过四层包装。

        绝不抛出异常 — 所有失败路径返回 ToolResult(success=False)。
        唯一例外是 L1 预算耗尽抛出 BudgetExhausted（由 Agent loop 捕获）。
        """
        # L1: 预算预检
        try:
            self._budget.check_and_consume_call()
        except BudgetExhausted:
            raise  # 向上传播，让 agent loop 生成部分 RCA

        cache_key = self._make_cache_key(tool, params)

        # L2: 缓存命中
        cached: ToolResult | None = self._cache.get(cache_key)
        if cached is not None:
            return cached.model_copy(update={"cached": True})

        # L3: QL 验证（仅对 mimir/loki/tempo 工具）
        query = self._extract_query(params)
        if query:
            validation = validate_ql(tool.name, query)
            if not validation.valid:
                # QL 不合法，尝试自修正
                healed = await self._try_heal(
                    tool, params, f"QL 验证失败: {validation.error}"
                )
                if healed is not None:
                    params = healed
                    query = self._extract_query(params)
                    if query:
                        revalidation = validate_ql(tool.name, query)
                        if not revalidation.valid:
                            return ToolResult(
                                success=False,
                                error=f"QL 验证失败（自修正后仍不合法）: {revalidation.error}",
                            )
                else:
                    return ToolResult(
                        success=False,
                        error=f"QL 验证失败: {validation.error}",
                    )

        # L4: 执行 + 自修正
        result = await tool.execute(params)

        if not result.success and self._heal_callback is not None:
            # 工具执行失败，尝试自修正
            for _attempt in range(MAX_HEAL_ATTEMPTS):
                healed_params = await self._heal_callback(
                    tool.name, params, result.error or "未知错误"
                )
                if healed_params is None:
                    break
                result = await tool.execute(healed_params)
                if result.success:
                    break

        # 缓存成功结果
        if result.success:
            self._cache[cache_key] = result

        if not result.success:
            self._budget.record_failure()

        return result

    def _make_cache_key(self, tool: ToolSpec, params: BaseModel) -> str:
        """根据工具名和参数生成缓存 key。"""
        params_str = params.model_dump_json()
        raw = f"{tool.name}:{params_str}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _extract_query(self, params: BaseModel) -> str | None:
        """从参数中提取 QL 查询字符串（如果有 query 字段）。"""
        if hasattr(params, "query"):
            return str(params.query)
        return None

    async def _try_heal(
        self, tool: ToolSpec, params: BaseModel, error: str
    ) -> BaseModel | None:
        """调用自修正回调，让 LLM 修正参数。"""
        if self._heal_callback is None:
            return None
        try:
            result: BaseModel | None = await self._heal_callback(tool.name, params, error)
            return result
        except Exception as exc:
            logger.warning("自修正回调异常: %s", exc)
            return None
