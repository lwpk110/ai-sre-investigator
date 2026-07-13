"""SSE 事件类型定义 — Agent 循环每一步都向客户端推送事件。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class SSEEvent:
    """SSE 事件，通过 SSE 流推送到客户端。"""

    # 事件类型: thinking | tool_call | tool_result | heal_attempt
    #          | budget_update | rca_partial | rca_complete | error
    type: str
    data: dict[str, Any]


def thinking(text: str) -> SSEEvent:
    """Agent 正在推理。"""
    return SSEEvent(type="thinking", data={"text": text})


def tool_call(tool_name: str, params: dict[str, Any]) -> SSEEvent:
    """Agent 调用了一个工具。"""
    return SSEEvent(type="tool_call", data={"tool": tool_name, "params": params})


def tool_result(
    tool_name: str,
    success: bool,
    data: dict[str, Any] | None = None,
    error: str | None = None,
    latency_ms: int = 0,
    cached: bool = False,
) -> SSEEvent:
    """工具执行结果。"""
    return SSEEvent(
        type="tool_result",
        data={
            "tool": tool_name,
            "success": success,
            "data": data,
            "error": error,
            "latency_ms": latency_ms,
            "cached": cached,
        },
    )


def budget_update(
    tokens_used: int, tokens_max: int, calls_used: int, calls_max: int
) -> SSEEvent:
    """预算消耗更新。"""
    return SSEEvent(
        type="budget_update",
        data={
            "tokens_used": tokens_used,
            "tokens_max": tokens_max,
            "calls_used": calls_used,
            "calls_max": calls_max,
        },
    )


def rca_complete(report: str, confidence: str = "high") -> SSEEvent:
    """RCA 报告生成完成。"""
    return SSEEvent(
        type="rca_complete",
        data={"report": report, "confidence": confidence},
    )


def rca_partial(report: str, missing: list[str]) -> SSEEvent:
    """部分 RCA（预算耗尽或证据不足）。"""
    return SSEEvent(
        type="rca_partial",
        data={"report": report, "missing": missing, "confidence": "low"},
    )


def error(message: str) -> SSEEvent:
    """错误事件。"""
    return SSEEvent(type="error", data={"message": message})
