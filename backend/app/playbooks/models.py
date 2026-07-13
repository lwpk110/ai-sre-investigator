"""黄金路径剧本库数据模型（V2-F2）。

每个剧本描述一种高频故障的标准排查路径：
触发条件 -> 标准查询 -> 判定证据 -> 常见根因。
"""

from __future__ import annotations

from pydantic import BaseModel


class PlaybookStep(BaseModel):
    """剧本单步排查指令。"""

    probe: str  # mimir / loki / tempo
    query_template: str  # QL 查询模板，支持 {service} 等变量占位
    purpose: str  # 本步骤目的说明
    evidence_key: str = ""  # 判定证据关键指标名（可选）


class Playbook(BaseModel):
    """黄金路径排查剧本。"""

    id: str
    name: str
    fault_type: str
    trigger_keywords: list[str]
    description: str
    steps: list[PlaybookStep]
    common_root_causes: list[str]
    confidence_threshold: str = "medium"


class PlaybookMatch(BaseModel):
    """剧本匹配结果。"""

    playbook: Playbook
    score: float  # 匹配置信度 0.0-1.0
    matched_keywords: list[str]
