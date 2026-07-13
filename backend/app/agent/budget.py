"""预算跟踪器 — 管理每个会话的 token 和工具调用次数（ADR-004 §5.2）。

SafeToolExecutor L1 层在每次工具调用前检查预算，超限抛出 BudgetExhausted。
"""

from __future__ import annotations

from dataclasses import dataclass


class BudgetExhausted(Exception):
    """预算耗尽异常。Agent loop 捕获后生成部分 RCA。"""


@dataclass
class BudgetTracker:
    """会话级预算跟踪。"""

    max_tokens: int = 80_000
    max_tool_calls: int = 25
    tokens_used: int = 0
    tool_calls: int = 0
    failure_count: int = 0

    @property
    def tokens_remaining(self) -> int:
        return max(0, self.max_tokens - self.tokens_used)

    @property
    def calls_remaining(self) -> int:
        return max(0, self.max_tool_calls - self.tool_calls)

    @property
    def is_exhausted(self) -> bool:
        return self.tokens_remaining <= 0 or self.calls_remaining <= 0

    def consume_tokens(self, amount: int) -> None:
        """记录已消耗的 token。"""
        self.tokens_used += amount

    def check_and_consume_call(self) -> None:
        """检查工具调用预算，扣减一次。超限抛出 BudgetExhausted。"""
        if self.is_exhausted:
            raise BudgetExhausted(
                f"预算耗尽: tokens {self.tokens_used}/{self.max_tokens}, "
                f"calls {self.tool_calls}/{self.max_tool_calls}"
            )
        self.tool_calls += 1

    def record_failure(self) -> None:
        """记录一次工具失败。"""
        self.failure_count += 1
