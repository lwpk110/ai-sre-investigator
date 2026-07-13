"""自观测指标测试（E-5 / V2-F4）。

验证 SessionMetrics 和 MetricsCollector 的全部方法：
工具调用记录、自修正记录、缓存命中率、成功率、延迟统计、
全局汇总和仪表盘 KPI 聚合。
"""

from __future__ import annotations

import time

from app.observability.metrics import MetricsCollector, SessionMetrics

# ---------------------------------------------------------------------------
# SessionMetrics 单元测试
# ---------------------------------------------------------------------------


class TestSessionMetrics:
    def test_record_tool_call_success(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("mimir", success=True, latency_ms=100)
        assert m.tool_calls_total == 1
        assert m.tool_calls_success == 1
        assert m.tool_calls_failed == 0

    def test_record_tool_call_failure(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("loki", success=False, latency_ms=50)
        assert m.tool_calls_total == 1
        assert m.tool_calls_success == 0
        assert m.tool_calls_failed == 1

    def test_record_tool_call_cached(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("mimir", success=True, latency_ms=5, cached=True)
        assert m.tool_calls_cached == 1

    def test_record_multiple_tool_calls(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("mimir", True, 100)
        m.record_tool_call("loki", True, 200)
        m.record_tool_call("tempo", False, 300)
        assert m.tool_calls_total == 3
        assert m.tool_calls_success == 2
        assert m.tool_calls_failed == 1

    def test_record_heal_success(self):
        m = SessionMetrics(session_id="s1")
        m.record_heal(success=True)
        assert m.heal_attempts == 1
        assert m.heal_successes == 1

    def test_record_heal_failure(self):
        m = SessionMetrics(session_id="s1")
        m.record_heal(success=False)
        assert m.heal_attempts == 1
        assert m.heal_successes == 0

    def test_cache_hit_rate_empty(self):
        m = SessionMetrics(session_id="s1")
        assert m.cache_hit_rate == 0.0

    def test_cache_hit_rate_with_data(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("mimir", True, 100, cached=True)
        m.record_tool_call("mimir", True, 100, cached=False)
        assert m.cache_hit_rate == 0.5

    def test_success_rate_empty(self):
        m = SessionMetrics(session_id="s1")
        assert m.success_rate == 0.0

    def test_success_rate_with_data(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("mimir", True, 100)
        m.record_tool_call("loki", False, 200)
        assert m.success_rate == 0.5

    def test_avg_latency_empty(self):
        m = SessionMetrics(session_id="s1")
        assert m.avg_latency_ms == 0.0

    def test_avg_latency_multiple_tools(self):
        m = SessionMetrics(session_id="s1")
        m.record_tool_call("mimir", True, 100)
        m.record_tool_call("mimir", True, 200)
        m.record_tool_call("loki", True, 300)
        # avg = (100+200+300) / 3 = 200
        assert m.avg_latency_ms == 200.0

    def test_to_dict_structure(self):
        m = SessionMetrics(session_id="s1")
        m.tokens_used = 5000
        m.record_tool_call("mimir", True, 100)
        m.record_heal(True)
        d = m.to_dict()

        assert d["session_id"] == "s1"
        assert d["tokens_used"] == 5000
        assert d["tool_calls_total"] == 1
        assert d["cache_hit_rate"] == 0.0
        assert d["success_rate"] == 1.0
        assert d["avg_latency_ms"] == 100.0
        assert "mimir" in d["tool_latencies"]
        assert d["tool_latencies"]["mimir"]["count"] == 1
        assert d["tool_latencies"]["mimir"]["avg_ms"] == 100.0

    def test_to_dict_duration(self):
        m = SessionMetrics(session_id="s1")
        time.sleep(0.05)
        m.completed_at = time.time()
        m.status = "completed"
        d = m.to_dict()
        assert d["duration_seconds"] > 0
        assert d["status"] == "completed"


# ---------------------------------------------------------------------------
# MetricsCollector 单元测试
# ---------------------------------------------------------------------------


class TestMetricsCollector:
    def test_create_session(self):
        c = MetricsCollector()
        m = c.create_session("s1")
        assert m.session_id == "s1"
        assert m.status == "running"

    def test_get_session(self):
        c = MetricsCollector()
        c.create_session("s1")
        m = c.get_session("s1")
        assert m is not None
        assert m.session_id == "s1"

    def test_get_session_not_found(self):
        c = MetricsCollector()
        assert c.get_session("nonexistent") is None

    def test_complete_session(self):
        c = MetricsCollector()
        c.create_session("s1")
        c.complete_session("s1", "completed")
        m = c.get_session("s1")
        assert m is not None
        assert m.status == "completed"
        assert m.completed_at is not None

    def test_complete_session_not_found(self):
        c = MetricsCollector()
        c.complete_session("nonexistent")
        # 不报错即可

    def test_get_summary_empty(self):
        c = MetricsCollector()
        s = c.get_summary()
        assert s["total_sessions"] == 0
        assert s["avg_tokens"] == 0

    def test_get_summary_with_data(self):
        c = MetricsCollector()
        m1 = c.create_session("s1")
        m1.tokens_used = 1000
        m1.record_tool_call("mimir", True, 100)
        c.complete_session("s1", "completed")

        m2 = c.create_session("s2")
        m2.tokens_used = 2000
        c.complete_session("s2", "error")

        s = c.get_summary()
        assert s["total_sessions"] == 2
        assert s["completed_sessions"] == 1
        assert s["error_sessions"] == 1

    def test_get_dashboard_empty(self):
        c = MetricsCollector()
        d = c.get_dashboard()
        assert d["total_sessions"] == 0
        assert d["self_resolution_rate"] == 0.0
        assert d["est_cost_usd"] == 0.0

    def test_get_dashboard_with_data(self):
        c = MetricsCollector()
        m1 = c.create_session("s1")
        m1.tokens_used = 50000
        m1.record_tool_call("mimir", True, 100, cached=True)
        m1.record_tool_call("loki", True, 200)
        m1.record_heal(True)
        c.complete_session("s1", "completed")

        m2 = c.create_session("s2")
        m2.tokens_used = 30000
        c.complete_session("s2", "error")

        d = c.get_dashboard()
        assert d["total_sessions"] == 2
        assert d["self_resolution_rate"] == 0.5
        assert d["total_tokens"] == 80000
        assert d["est_cost_usd"] > 0
        assert d["tool_calls_total"] == 2
        assert d["cache_hit_rate"] == 0.5
        assert d["heal_success_rate"] == 1.0

    def test_dashboard_mttr_calculation(self):
        c = MetricsCollector()
        c.create_session("s1")
        time.sleep(0.1)
        c.complete_session("s1", "completed")
        d = c.get_dashboard()
        assert d["avg_mttr_seconds"] > 0
