"""服务画像加载器（V2-F3 服务画像与归属模型）。

从静态 YAML 配置加载服务元数据（owner team / SLO / 依赖拓扑 / 关键等级）。
Agent 生成 RCA 时查询服务画像，自动归属责任方并注入 SLO 参考信息。
V1 阶段使用静态配置，V2 接 CMDB 后切换数据源即可。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel


class SLO(BaseModel):
    """服务等级目标。"""

    availability_999: str = ""
    p99_latency_ms: int = 0


class ServiceProfile(BaseModel):
    """单个服务画像。"""

    name: str
    owner_team: str = "Unknown"
    owner_contact: str = ""
    slo: SLO = SLO()
    dependencies: list[str] = []
    criticality: str = "P3"
    description: str = ""


class ServiceCatalog:
    """服务目录 — 从 YAML 加载，支持按名称/模糊匹配查询。

    初始化后只读，线程安全。
    """

    def __init__(self, config_path: Path | None = None) -> None:
        if config_path is None:
            config_path = (
                Path(__file__).parent.parent / "assets" / "service_catalog.yaml"
            )
        self._services: dict[str, ServiceProfile] = {}
        self._load(config_path)

    def _load(self, path: Path) -> None:
        """从 YAML 加载服务配置。"""
        if not path.exists():
            return
        with open(path, encoding="utf-8") as f:
            data: dict[str, Any] = yaml.safe_load(f)
        for svc in data.get("services", []):
            profile = ServiceProfile(
                name=svc["name"],
                owner_team=svc.get("owner_team", "Unknown"),
                owner_contact=svc.get("owner_contact", ""),
                slo=SLO(**svc.get("slo", {})),
                dependencies=svc.get("dependencies", []),
                criticality=svc.get("criticality", "P3"),
                description=svc.get("description", ""),
            )
            self._services[profile.name] = profile

    def get(self, name: str) -> ServiceProfile | None:
        """精确查询服务画像。"""
        return self._services.get(name)

    def find_by_keyword(self, keyword: str) -> list[ServiceProfile]:
        """模糊匹配：在服务名/描述/owner 中搜索关键词。"""
        kw = keyword.lower()
        results: list[ServiceProfile] = []
        for svc in self._services.values():
            if (
                kw in svc.name.lower()
                or kw in svc.description.lower()
                or kw in svc.owner_team.lower()
            ):
                results.append(svc)
        return results

    def all(self) -> list[ServiceProfile]:
        """返回全部服务画像。"""
        return list(self._services.values())


# 全局单例
catalog = ServiceCatalog()
