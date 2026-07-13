"""RCA 知识库 — SQLite 持久化存储（V2-F1 Incident Memory）。

每次成功排查的 RCA 结构化入库（症状 → 查询路径 → 根因），
下次相似症状命中时复用历史"黄金排查路径"。

使用同步 sqlite3（无需额外依赖，查询路径短，写入频率低）。
"""

from __future__ import annotations

import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel


class RCAEntry(BaseModel):
    """RCA 知识库条目。"""

    id: int | None = None
    symptom: str  # 用户原始问题描述
    service_name: str = ""  # 涉及的服务名
    query_path: str = ""  # 查询路径摘要（哪些探针查了什么）
    root_cause: str = ""  # 根因结论
    confidence: str = "medium"  # high / medium / low
    report: str = ""  # 完整 RCA 报告 Markdown
    tags: str = ""  # 逗号分隔的标签
    created_at: str = ""


class KnowledgeStore:
    """RCA 知识库存储 — 线程安全的 SQLite 操作。

    初始化时自动建表，支持插入、搜索、按 ID 查询。
    """

    def __init__(self, db_path: Path | None = None) -> None:
        if db_path is None:
            db_path = Path(__file__).parent.parent.parent / "data" / "rca_knowledge.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """建表（如果不存在）。"""
        with self._lock:
            conn = self._get_conn()
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS rca_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symptom TEXT NOT NULL,
                    service_name TEXT DEFAULT '',
                    query_path TEXT DEFAULT '',
                    root_cause TEXT DEFAULT '',
                    confidence TEXT DEFAULT 'medium',
                    report TEXT DEFAULT '',
                    tags TEXT DEFAULT '',
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_service
                ON rca_entries(service_name)
                """
            )
            conn.commit()
            conn.close()

    def insert(self, entry: RCAEntry) -> int:
        """插入一条 RCA 条目，返回 ID。"""
        with self._lock:
            conn = self._get_conn()
            cursor = conn.execute(
                """
                INSERT INTO rca_entries
                    (symptom, service_name, query_path, root_cause,
                     confidence, report, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.symptom,
                    entry.service_name,
                    entry.query_path,
                    entry.root_cause,
                    entry.confidence,
                    entry.report,
                    entry.tags,
                    datetime.now().isoformat(),
                ),
            )
            entry_id = cursor.lastrowid or 0
            conn.commit()
            conn.close()
            return entry_id

    def search_by_symptom(self, keyword: str, limit: int = 5) -> list[RCAEntry]:
        """按症状关键词搜索相似 RCA。

        匹配策略：service_name 精确匹配优先，symptom 模糊匹配次之。
        """
        with self._lock:
            conn = self._get_conn()
            # 先按服务名精确匹配
            rows = conn.execute(
                """
                SELECT * FROM rca_entries
                WHERE service_name LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (f"%{keyword}%", limit),
            ).fetchall()

            # 如果不够，补充症状模糊匹配
            if len(rows) < limit:
                extra = conn.execute(
                    """
                    SELECT * FROM rca_entries
                    WHERE symptom LIKE ? AND id NOT IN (
                        SELECT id FROM rca_entries WHERE service_name LIKE ?
                    )
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (f"%{keyword}%", f"%{keyword}%", limit - len(rows)),
                ).fetchall()
                rows.extend(extra)

            conn.close()

        return [self._row_to_entry(r) for r in rows]

    def get_all(self, limit: int = 50) -> list[RCAEntry]:
        """获取全部条目（分页）。"""
        with self._lock:
            conn = self._get_conn()
            rows = conn.execute(
                "SELECT * FROM rca_entries ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            conn.close()
        return [self._row_to_entry(r) for r in rows]

    def get_by_id(self, entry_id: int) -> RCAEntry | None:
        """按 ID 查询单条。"""
        with self._lock:
            conn = self._get_conn()
            row = conn.execute(
                "SELECT * FROM rca_entries WHERE id = ?",
                (entry_id,),
            ).fetchone()
            conn.close()
        return self._row_to_entry(row) if row else None

    def count(self) -> int:
        """返回总条目数。"""
        with self._lock:
            conn = self._get_conn()
            row = conn.execute("SELECT COUNT(*) as cnt FROM rca_entries").fetchone()
            conn.close()
        return row["cnt"] if row else 0

    def _row_to_entry(self, row: sqlite3.Row | Any) -> RCAEntry:
        """数据库行转 RCAEntry。"""
        return RCAEntry(
            id=row["id"],
            symptom=row["symptom"],
            service_name=row["service_name"],
            query_path=row["query_path"],
            root_cause=row["root_cause"],
            confidence=row["confidence"],
            report=row["report"],
            tags=row["tags"],
            created_at=row["created_at"],
        )


# 全局单例
store = KnowledgeStore()
