"""会话持久化存储（V3-F4 流式可恢复会话）。

将会话快照持久化到 SQLite，支持断线重连和页面刷新后恢复。
存储内容：session_id / 消息 / 状态 / 事件历史 / RCA 报告。

当前架构：内存 SessionStore 为主，SQLite 为持久化镜像。
每次会话状态变更或 RCA 完成时同步写入 SQLite。
页面刷新时从 SQLite 恢复历史会话列表。
"""

from __future__ import annotations

import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel


class SessionSnapshot(BaseModel):
    """会话快照（用于持久化和恢复）。"""

    session_id: str
    message: str
    status: str = "created"
    created_at: str = ""
    updated_at: str = ""
    events_json: str = "[]"  # JSON 序列化的 SSE 事件列表
    rca_report: str | None = None
    rca_confidence: str | None = None
    is_partial: bool = False


class SessionPersistence:
    """会话 SQLite 持久化层。线程安全。"""

    def __init__(self, db_path: Path | None = None) -> None:
        if db_path is None:
            db_path = (
                Path(__file__).parent.parent.parent / "data" / "sessions.db"
            )
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """建表。"""
        with self._lock:
            conn = self._get_conn()
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    message TEXT NOT NULL,
                    status TEXT DEFAULT 'created',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    events_json TEXT DEFAULT '[]',
                    rca_report TEXT,
                    rca_confidence TEXT,
                    is_partial INTEGER DEFAULT 0
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_updated ON sessions(updated_at DESC)"
            )
            conn.commit()
            conn.close()

    def save(self, snapshot: SessionSnapshot) -> None:
        """保存或更新会话快照。"""
        with self._lock:
            conn = self._get_conn()
            now = datetime.now().isoformat()
            conn.execute(
                """
                INSERT INTO sessions
                    (session_id, message, status, created_at, updated_at,
                     events_json, rca_report, rca_confidence, is_partial)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    message=excluded.message,
                    status=excluded.status,
                    updated_at=excluded.updated_at,
                    events_json=excluded.events_json,
                    rca_report=excluded.rca_report,
                    rca_confidence=excluded.rca_confidence,
                    is_partial=excluded.is_partial
                """,
                (
                    snapshot.session_id,
                    snapshot.message,
                    snapshot.status,
                    snapshot.created_at or now,
                    now,
                    snapshot.events_json,
                    snapshot.rca_report,
                    snapshot.rca_confidence,
                    1 if snapshot.is_partial else 0,
                ),
            )
            conn.commit()
            conn.close()

    def get(self, session_id: str) -> SessionSnapshot | None:
        """获取单个会话快照。"""
        with self._lock:
            conn = self._get_conn()
            row = conn.execute(
                "SELECT * FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            conn.close()
        return self._row_to_snapshot(row) if row else None

    def list_recent(self, limit: int = 50) -> list[SessionSnapshot]:
        """列出最近更新的会话（不含事件详情）。"""
        with self._lock:
            conn = self._get_conn()
            rows = conn.execute(
                "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            conn.close()
        return [self._row_to_snapshot(r) for r in rows]

    def delete(self, session_id: str) -> bool:
        """删除会话。"""
        with self._lock:
            conn = self._get_conn()
            cursor = conn.execute(
                "DELETE FROM sessions WHERE session_id = ?",
                (session_id,),
            )
            conn.commit()
            conn.close()
            return cursor.rowcount > 0

    def _row_to_snapshot(self, row: sqlite3.Row | Any) -> SessionSnapshot:
        """数据库行转 SessionSnapshot。"""
        return SessionSnapshot(
            session_id=row["session_id"],
            message=row["message"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            events_json=row["events_json"],
            rca_report=row["rca_report"],
            rca_confidence=row["rca_confidence"],
            is_partial=bool(row["is_partial"]),
        )


# 全局单例
persistence = SessionPersistence()
