"""剧本注册表与匹配引擎（V2-F2 黄金路径剧本库）。

从 YAML 加载预置剧本，按关键词匹配用户申告文本，
返回按匹配置信度排序的结果。模板支持变量替换。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

from app.playbooks.models import Playbook, PlaybookMatch, PlaybookStep


class PlaybookSummary(BaseModel):
    """剧本精简信息（列表展示用）。"""

    id: str
    name: str
    fault_type: str
    trigger_keywords: list[str]
    step_count: int


class PlaybookRegistry:
    """剧本注册表 -- 从 YAML 加载，支持匹配与模板渲染。

    初始化后只读，线程安全。
    """

    def __init__(self, config_path: Path | None = None) -> None:
        if config_path is None:
            config_path = Path(__file__).parent.parent / "assets" / "playbooks.yaml"
        self._playbooks: dict[str, Playbook] = {}
        self._load(config_path)

    def _load(self, path: Path) -> None:
        """从 YAML 加载剧本配置。"""
        if not path.exists():
            return
        with open(path, encoding="utf-8") as f:
            data: dict[str, Any] = yaml.safe_load(f)
        for raw in data.get("playbooks", []):
            steps = [
                PlaybookStep(
                    probe=s["probe"],
                    query_template=s["query_template"],
                    purpose=s.get("purpose", ""),
                    evidence_key=s.get("evidence_key", ""),
                )
                for s in raw.get("steps", [])
            ]
            pb = Playbook(
                id=raw["id"],
                name=raw["name"],
                fault_type=raw.get("fault_type", ""),
                trigger_keywords=raw.get("trigger_keywords", []),
                description=raw.get("description", ""),
                steps=steps,
                common_root_causes=raw.get("common_root_causes", []),
                confidence_threshold=raw.get("confidence_threshold", "medium"),
            )
            self._playbooks[pb.id] = pb

    def get(self, playbook_id: str) -> Playbook | None:
        """按 ID 精确查询剧本。"""
        return self._playbooks.get(playbook_id)

    def all(self) -> list[Playbook]:
        """返回全部剧本。"""
        return list(self._playbooks.values())

    def match(self, text: str, limit: int = 5) -> list[PlaybookMatch]:
        """根据用户申告文本匹配剧本，按分数降序返回。

        匹配策略：统计 trigger_keywords 在文本中的命中数，
        分数 = 命中关键词数 / 该剧本关键词总数（Jaccard 风格）。
        只返回分数 > 0 的结果。
        """
        text_lower = text.lower()
        results: list[PlaybookMatch] = []
        for pb in self._playbooks.values():
            matched = [
                kw for kw in pb.trigger_keywords
                if kw.lower() in text_lower
            ]
            if not matched:
                continue
            total = len(pb.trigger_keywords)
            score = len(matched) / total if total > 0 else 0.0
            results.append(PlaybookMatch(
                playbook=pb,
                score=min(score, 1.0),
                matched_keywords=matched,
            ))
        results.sort(key=lambda m: m.score, reverse=True)
        return results[:limit]

    def render_query(
        self,
        playbook_id: str,
        step_index: int,
        **variables: str,
    ) -> str | None:
        """渲染剧本某一步的查询模板，替换变量占位符。

        Args:
            playbook_id: 剧本 ID。
            step_index: 步骤索引（0-based）。
            **variables: 模板变量（如 service="payment-service"）。

        Returns:
            渲染后的 QL 字符串，剧本或步骤不存在时返回 None。
        """
        pb = self._playbooks.get(playbook_id)
        if pb is None or step_index < 0 or step_index >= len(pb.steps):
            return None
        template = pb.steps[step_index].query_template
        return template.format(**variables) if variables else template

    def summary(self) -> list[dict[str, Any]]:
        """返回精简信息列表（不含 steps 详情）。"""
        return [
            {
                "id": pb.id,
                "name": pb.name,
                "fault_type": pb.fault_type,
                "trigger_keywords": pb.trigger_keywords,
                "step_count": len(pb.steps),
            }
            for pb in self._playbooks.values()
        ]

    def coverage_stats(self) -> dict[str, Any]:
        """返回覆盖统计信息。"""
        by_type: dict[str, int] = {}
        for pb in self._playbooks.values():
            by_type[pb.fault_type] = by_type.get(pb.fault_type, 0) + 1
        return {
            "total_playbooks": len(self._playbooks),
            "by_fault_type": by_type,
        }


# 全局单例
registry = PlaybookRegistry()
