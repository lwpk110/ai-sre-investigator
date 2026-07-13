"""会话持久化测试（V3-F4）。"""

from __future__ import annotations

from pathlib import Path
from tempfile import mkdtemp

from app.persistence.session_store import SessionPersistence, SessionSnapshot


def _temp_persistence() -> SessionPersistence:
    return SessionPersistence(db_path=Path(mkdtemp()) / "test_sessions.db")


def test_save_and_get():
    """保存并获取会话快照。"""
    store = _temp_persistence()
    store.save(
        SessionSnapshot(
            session_id="test-1",
            message="payment-service 为什么 500",
            status="completed",
            created_at="2026-01-01T00:00:00",
            rca_report="## RCA",
            rca_confidence="high",
        )
    )
    snapshot = store.get("test-1")
    assert snapshot is not None
    assert snapshot.message == "payment-service 为什么 500"
    assert snapshot.status == "completed"
    assert snapshot.rca_report == "## RCA"


def test_list_recent():
    """列出最近的会话。"""
    store = _temp_persistence()
    for i in range(5):
        store.save(
            SessionSnapshot(
                session_id=f"test-{i}",
                message=f"问题 {i}",
                status="completed",
                created_at="2026-01-01T00:00:00",
            )
        )
    snapshots = store.list_recent(limit=3)
    assert len(snapshots) == 3


def test_update_existing():
    """更新已存在的会话。"""
    store = _temp_persistence()
    store.save(
        SessionSnapshot(
            session_id="test-1",
            message="原始问题",
            status="created",
            created_at="2026-01-01T00:00:00",
        )
    )
    store.save(
        SessionSnapshot(
            session_id="test-1",
            message="原始问题",
            status="completed",
            created_at="2026-01-01T00:00:00",
            rca_report="## RCA",
        )
    )
    snapshot = store.get("test-1")
    assert snapshot is not None
    assert snapshot.status == "completed"
    assert snapshot.rca_report == "## RCA"


def test_delete():
    """删除会话。"""
    store = _temp_persistence()
    store.save(
        SessionSnapshot(
            session_id="test-1",
            message="问题",
            status="completed",
            created_at="2026-01-01T00:00:00",
        )
    )
    assert store.delete("test-1") is True
    assert store.get("test-1") is None


def test_get_nonexistent():
    """获取不存在的会话返回 None。"""
    store = _temp_persistence()
    assert store.get("nonexistent") is None
