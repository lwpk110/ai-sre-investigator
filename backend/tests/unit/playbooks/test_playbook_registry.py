"""黄金路径剧本库测试（V2-F2）。

验证 YAML 加载、剧本匹配、模板渲染、全局单例。
"""

from __future__ import annotations

from app.playbooks.registry import PlaybookRegistry


def test_registry_loads_playbooks():
    """YAML 配置正确加载至少 5 个剧本。"""
    registry = PlaybookRegistry()
    playbooks = registry.all()
    assert len(playbooks) >= 5
    ids = [p.id for p in playbooks]
    assert "oom" in ids


def test_get_by_id():
    """按 ID 精确查询剧本。"""
    registry = PlaybookRegistry()
    pb = registry.get("oom")
    assert pb is not None
    assert "OOM" in pb.name or "oom" in pb.name.lower()
    assert len(pb.steps) >= 2
    assert len(pb.trigger_keywords) >= 1


def test_nonexistent_playbook():
    """查询不存在的剧本返回 None。"""
    registry = PlaybookRegistry()
    assert registry.get("nonexistent-fault") is None


def test_match_by_keyword():
    """根据用户申告文本匹配剧本。"""
    registry = PlaybookRegistry()
    matches = registry.match("内存溢出 OOM 导致服务重启")
    assert len(matches) >= 1
    assert matches[0].playbook.id == "oom"
    assert matches[0].score > 0
    assert len(matches[0].matched_keywords) > 0


def test_match_english_keyword():
    """英文关键词也能匹配。"""
    registry = PlaybookRegistry()
    matches = registry.match("connection pool exhausted, too many connections")
    assert len(matches) >= 1
    assert any(m.playbook.id == "conn_pool" for m in matches)


def test_match_no_result():
    """无法匹配的文本返回空列表。"""
    registry = PlaybookRegistry()
    matches = registry.match("今天天气不错")
    assert len(matches) == 0


def test_match_sorted_by_score():
    """匹配结果按分数降序排列。"""
    registry = PlaybookRegistry()
    matches = registry.match("内存不够，进程被 kill，out of memory")
    assert len(matches) >= 1
    if len(matches) >= 2:
        assert matches[0].score >= matches[1].score


def test_playbook_has_steps():
    """剧本至少包含 2 个排查步骤。"""
    registry = PlaybookRegistry()
    for pb in registry.all():
        assert len(pb.steps) >= 2, f"剧本 {pb.id} 步骤太少"
        for step in pb.steps:
            assert step.probe in ("mimir", "loki", "tempo")
            assert step.query_template != ""
            assert step.purpose != ""


def test_playbook_has_common_root_causes():
    """每个剧本包含常见根因列表。"""
    registry = PlaybookRegistry()
    for pb in registry.all():
        assert len(pb.common_root_causes) >= 1, f"剧本 {pb.id} 缺少常见根因"


def test_render_query_template():
    """查询模板支持变量替换。"""
    registry = PlaybookRegistry()
    rendered = registry.render_query("oom", step_index=0, service="payment-service")
    assert rendered is not None
    assert "payment-service" in rendered


def test_render_query_invalid_step():
    """非法步骤索引返回 None。"""
    registry = PlaybookRegistry()
    assert registry.render_query("oom", step_index=999, service="x") is None


def test_match_returns_match_objects():
    """匹配结果包含 PlaybookMatch 对象。"""
    registry = PlaybookRegistry()
    matches = registry.match("GC 停顿，java 进程卡住")
    if matches:
        m = matches[0]
        assert hasattr(m, "playbook")
        assert hasattr(m, "score")
        assert hasattr(m, "matched_keywords")
        assert 0.0 <= m.score <= 1.0


def test_match_limit():
    """match 支持限制返回数量。"""
    registry = PlaybookRegistry()
    matches = registry.match("服务故障 timeout 超时", limit=2)
    assert len(matches) <= 2


def test_summary():
    """summary 返回精简信息列表（不含 steps 详情）。"""
    registry = PlaybookRegistry()
    summaries = registry.summary()
    assert len(summaries) == len(registry.all())
    s = summaries[0]
    assert "id" in s
    assert "name" in s
    assert "fault_type" in s
    assert "trigger_keywords" in s
    assert "step_count" in s


def test_coverage_stats():
    """coverage_stats 返回覆盖统计。"""
    registry = PlaybookRegistry()
    stats = registry.coverage_stats()
    assert "total_playbooks" in stats
    assert stats["total_playbooks"] >= 5
    assert "by_fault_type" in stats
    assert isinstance(stats["by_fault_type"], dict)
