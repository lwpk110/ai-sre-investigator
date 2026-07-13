"""RCA 知识库测试（V2-F1）。"""

from __future__ import annotations

from pathlib import Path
from tempfile import mkdtemp

from app.knowledge.store import KnowledgeStore, RCAEntry


def _temp_store() -> KnowledgeStore:
    """创建临时数据库的知识库实例。"""
    return KnowledgeStore(db_path=Path(mkdtemp()) / "test_rca.db")


def test_insert_and_retrieve():
    """插入并按 ID 查询。"""
    store = _temp_store()
    entry_id = store.insert(
        RCAEntry(
            symptom="payment-service 500 错误",
            service_name="tendata-auth-service",
            root_cause="数据库连接池打满",
            confidence="high",
            report="## RCA\n连接池耗尽",
        )
    )
    assert entry_id > 0

    retrieved = store.get_by_id(entry_id)
    assert retrieved is not None
    assert retrieved.symptom == "payment-service 500 错误"
    assert retrieved.service_name == "tendata-auth-service"
    assert retrieved.confidence == "high"


def test_search_by_service_name():
    """按服务名搜索相似 RCA。"""
    store = _temp_store()
    store.insert(
        RCAEntry(
            symptom="auth 延迟",
            service_name="tendata-auth-service",
            confidence="medium",
        )
    )
    store.insert(
        RCAEntry(
            symptom="corp 数据库问题",
            service_name="tendata-corp-service",
            confidence="low",
        )
    )

    results = store.search_by_symptom("tendata-auth-service")
    assert len(results) >= 1
    assert results[0].service_name == "tendata-auth-service"


def test_search_by_symptom_keyword():
    """症状模糊匹配。"""
    store = _temp_store()
    store.insert(
        RCAEntry(
            symptom="OOM 导致重启",
            service_name="svc-a",
        )
    )
    store.insert(
        RCAEntry(
            symptom="GC 频繁暂停",
            service_name="svc-b",
        )
    )

    results = store.search_by_symptom("OOM")
    assert len(results) >= 1
    assert "OOM" in results[0].symptom


def test_count():
    """总条目数统计。"""
    store = _temp_store()
    assert store.count() == 0
    store.insert(RCAEntry(symptom="test1"))
    store.insert(RCAEntry(symptom="test2"))
    assert store.count() == 2


def test_get_all():
    """分页获取全部条目。"""
    store = _temp_store()
    for i in range(5):
        store.insert(RCAEntry(symptom=f"test-{i}"))

    entries = store.get_all(limit=3)
    assert len(entries) == 3
