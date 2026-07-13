"""Agent 自身可观测性指标（brainstorm E-5: Self-Observability / Dogfooding）。

给 Agent 自身埋点：token 用量、tool 调用次数与延迟、循环深度、成功率、
缓存命中率、失败原因分布。用 Mimir/Loki 看自己。
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class SessionMetrics:
    """单次会话指标。"""

    session_id: str
    created_at: float = field(default_factory=time.time)
    completed_at: float | None = None
    status: str = "running"  # running | completed | partial | error

    # Token 用量
    tokens_used: int = 0

    # 工具调用
    tool_calls_total: int = 0
    tool_calls_success: int = 0
    tool_calls_failed: int = 0
    tool_calls_cached: int = 0
    tool_latencies: dict[str, list[int]] = field(default_factory=lambda: defaultdict(list))

    # 自修正
    heal_attempts: int = 0
    heal_successes: int = 0

    def record_tool_call(
        self,
        tool_name: str,
        success: bool,
        latency_ms: int,
        cached: bool = False,
    ) -> None:
        """记录一次工具调用。"""
        self.tool_calls_total += 1
        if success:
            self.tool_calls_success += 1
        else:
            self.tool_calls_failed += 1
        if cached:
            self.tool_calls_cached += 1
        self.tool_latencies[tool_name].append(latency_ms)

    def record_heal(self, success: bool) -> None:
        """记录一次自修正尝试。"""
        self.heal_attempts += 1
        if success:
            self.heal_successes += 1

    @property
    def cache_hit_rate(self) -> float:
        """缓存命中率。"""
        if self.tool_calls_total == 0:
            return 0.0
        return self.tool_calls_cached / self.tool_calls_total

    @property
    def success_rate(self) -> float:
        """工具成功率。"""
        if self.tool_calls_total == 0:
            return 0.0
        return self.tool_calls_success / self.tool_calls_total

    @property
    def avg_latency_ms(self) -> float:
        """平均工具延迟。"""
        all_latencies: list[int] = []
        for latencies in self.tool_latencies.values():
            all_latencies.extend(latencies)
        if not all_latencies:
            return 0.0
        return sum(all_latencies) / len(all_latencies)

    def to_dict(self) -> dict[str, object]:
        """序列化为字典（用于 /metrics 端点）。"""
        return {
            "session_id": self.session_id,
            "status": self.status,
            "duration_seconds": (self.completed_at or time.time()) - self.created_at,
            "tokens_used": self.tokens_used,
            "tool_calls_total": self.tool_calls_total,
            "tool_calls_success": self.tool_calls_success,
            "tool_calls_failed": self.tool_calls_failed,
            "tool_calls_cached": self.tool_calls_cached,
            "cache_hit_rate": round(self.cache_hit_rate, 4),
            "success_rate": round(self.success_rate, 4),
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "heal_attempts": self.heal_attempts,
            "heal_successes": self.heal_successes,
            "tool_latencies": {
                name: {
                    "count": len(lats),
                    "avg_ms": round(sum(lats) / len(lats), 2) if lats else 0,
                    "min_ms": min(lats) if lats else 0,
                    "max_ms": max(lats) if lats else 0,
                }
                for name, lats in self.tool_latencies.items()
            },
        }


class MetricsCollector:
    """全局指标收集器（单例，线程安全）。"""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionMetrics] = {}
        self._lock = Lock()

    def create_session(self, session_id: str) -> SessionMetrics:
        """开始追踪一个新会话。"""
        with self._lock:
            metrics = SessionMetrics(session_id=session_id)
            self._sessions[session_id] = metrics
            return metrics

    def get_session(self, session_id: str) -> SessionMetrics | None:
        """获取会话指标。"""
        with self._lock:
            return self._sessions.get(session_id)

    def complete_session(self, session_id: str, status: str = "completed") -> None:
        """标记会话完成。"""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.completed_at = time.time()
                session.status = status

    def get_summary(self) -> dict[str, object]:
        """全局汇总指标。"""
        with self._lock:
            sessions = list(self._sessions.values())

        total = len(sessions)
        if total == 0:
            return {
                "total_sessions": 0,
                "completed_sessions": 0,
                "error_sessions": 0,
                "avg_tokens": 0,
                "avg_tool_calls": 0,
                "avg_success_rate": 0,
                "avg_cache_hit_rate": 0,
            }

        completed = sum(1 for s in sessions if s.status in ("completed", "partial"))
        errors = sum(1 for s in sessions if s.status == "error")

        return {
            "total_sessions": total,
            "completed_sessions": completed,
            "error_sessions": errors,
            "avg_tokens": sum(s.tokens_used for s in sessions) // total,
            "avg_tool_calls": sum(s.tool_calls_total for s in sessions) // total,
            "avg_success_rate": round(
                sum(s.success_rate for s in sessions) / total, 4
            ),
            "avg_cache_hit_rate": round(
                sum(s.cache_hit_rate for s in sessions) / total, 4
            ),
        }

    def get_dashboard(self) -> dict[str, object]:
        """V2-F4 价值仪表盘 KPI 数据。

        自闭环率 = completed / total
        MTTR = avg(completed_at - created_at) 秒
        成本估算 = total_tokens * token_price
        """
        with self._lock:
            sessions = list(self._sessions.values())

        total = len(sessions)
        if total == 0:
            return {
                "total_sessions": 0,
                "self_resolution_rate": 0.0,
                "avg_mttr_seconds": 0,
                "total_tokens": 0,
                "est_cost_usd": 0.0,
                "tool_calls_total": 0,
                "cache_hit_rate": 0.0,
                "heal_success_rate": 0.0,
            }

        completed = sum(
            1 for s in sessions if s.status in ("completed", "partial")
        )
        self_resolution = completed / total

        # MTTR: 只计算已完成的会话
        mttr_values: list[float] = []
        for s in sessions:
            if s.completed_at and s.status in ("completed", "partial"):
                mttr_values.append(s.completed_at - s.created_at)
        avg_mttr = (
            sum(mttr_values) / len(mttr_values) if mttr_values else 0.0
        )

        total_tokens = sum(s.tokens_used for s in sessions)
        # 估算成本: ~$0.002 / 1K tokens（GPT-4o-mini 级别）
        est_cost = total_tokens * 0.002 / 1000

        all_tool_calls = sum(s.tool_calls_total for s in sessions)
        all_cached = sum(s.tool_calls_cached for s in sessions)
        cache_rate = all_cached / all_tool_calls if all_tool_calls else 0.0

        all_heal_attempts = sum(s.heal_attempts for s in sessions)
        all_heal_success = sum(s.heal_successes for s in sessions)
        heal_rate = (
            all_heal_success / all_heal_attempts
            if all_heal_attempts
            else 0.0
        )

        return {
            "total_sessions": total,
            "self_resolution_rate": round(self_resolution, 4),
            "avg_mttr_seconds": round(avg_mttr, 2),
            "total_tokens": total_tokens,
            "est_cost_usd": round(est_cost, 4),
            "tool_calls_total": all_tool_calls,
            "cache_hit_rate": round(cache_rate, 4),
            "heal_success_rate": round(heal_rate, 4),
        }


# 全局单例
collector = MetricsCollector()
