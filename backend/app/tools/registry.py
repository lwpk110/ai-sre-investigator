"""可插拔工具注册表（V3-F2）。

新增工具（Prometheus / Elasticsearch / Kubernetes / 云厂商 API）
只需注册 ToolSpec，无需改 Agent 核心。

注册表管理可用工具的启用/禁用状态，AgentLoop 只使用已启用的工具。
"""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Any

from app.tools.base import ToolSpec


@dataclass
class ToolInfo:
    """工具元信息（用于 API 响应和前端展示）。"""

    name: str
    description: str
    enabled: bool = True
    version: str = "1.0.0"
    category: str = "observability"
    ql_type: str = ""  # PromQL / LogQL / TraceQL / etc.


class ToolRegistry:
    """工具注册表 — 管理可用工具，支持注册/启用/禁用。

    线程安全：使用 Lock 保护状态变更。
    AgentLoop 通过 get_active_tools() 获取当前启用的工具列表。
    """

    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}
        self._info: dict[str, ToolInfo] = {}
        self._lock = Lock()

    def register(
        self,
        tool: ToolSpec,
        *,
        enabled: bool = True,
        version: str = "1.0.0",
        category: str = "observability",
        ql_type: str = "",
    ) -> None:
        """注册一个工具。如果已存在同名工具则覆盖。"""
        with self._lock:
            self._tools[tool.name] = tool
            self._info[tool.name] = ToolInfo(
                name=tool.name,
                description=tool.description,
                enabled=enabled,
                version=version,
                category=category,
                ql_type=ql_type,
            )

    def unregister(self, name: str) -> bool:
        """注销一个工具，返回是否成功。"""
        with self._lock:
            if name in self._tools:
                del self._tools[name]
                del self._info[name]
                return True
            return False

    def enable(self, name: str) -> bool:
        """启用工具，返回是否成功。"""
        with self._lock:
            if name in self._info:
                self._info[name].enabled = True
                return True
            return False

    def disable(self, name: str) -> bool:
        """禁用工具，返回是否成功。"""
        with self._lock:
            if name in self._info:
                self._info[name].enabled = False
                return True
            return False

    def get(self, name: str) -> ToolSpec | None:
        """获取工具实例（不考虑启用状态）。"""
        with self._lock:
            return self._tools.get(name)

    def get_active_tools(self) -> list[ToolSpec]:
        """获取所有已启用的工具实例列表。"""
        with self._lock:
            return [
                self._tools[name]
                for name, info in self._info.items()
                if info.enabled and name in self._tools
            ]

    def list_all(self) -> list[ToolInfo]:
        """列出全部工具信息。"""
        with self._lock:
            return list(self._info.values())

    def list_info_dict(self) -> list[dict[str, Any]]:
        """列出全部工具信息（字典格式，用于 API 响应）。"""
        with self._lock:
            return [
                {
                    "name": info.name,
                    "description": info.description,
                    "enabled": info.enabled,
                    "version": info.version,
                    "category": info.category,
                    "ql_type": info.ql_type,
                }
                for info in self._info.values()
            ]

    def is_enabled(self, name: str) -> bool:
        """检查工具是否已启用。"""
        with self._lock:
            info = self._info.get(name)
            return info.enabled if info else False


def create_default_registry() -> ToolRegistry:
    """创建并填充默认工具注册表。

    注册系统内置的 Mimir/Loki/Tempo 工具。
    """
    from app.tools.loki import LokiTool
    from app.tools.mimir import MimirTool
    from app.tools.tempo import TempoTool

    registry = ToolRegistry()
    registry.register(
        MimirTool(),
        version="1.0.0",
        category="metrics",
        ql_type="PromQL",
    )
    registry.register(
        LokiTool(),
        version="1.0.0",
        category="logs",
        ql_type="LogQL",
    )
    registry.register(
        TempoTool(),
        version="1.0.0",
        category="traces",
        ql_type="TraceQL",
    )
    return registry


# 全局单例
registry = create_default_registry()
