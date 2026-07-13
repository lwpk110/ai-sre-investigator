"""工具注册表测试（V3-F2）。"""

from __future__ import annotations

from pydantic import BaseModel

from app.tools.base import ToolResult, ToolSpec
from app.tools.registry import ToolRegistry, create_default_registry


class _TestParams(BaseModel):
    query: str = "test"


class _TestTool(ToolSpec):
    name: str = "test_tool"
    description: str = "测试工具"
    parameters: type = _TestParams

    async def execute(self, params: BaseModel) -> ToolResult:
        return ToolResult(success=True, data={"echo": params.query})


class TestToolRegistry:
    def test_register_and_get(self):
        reg = ToolRegistry()
        tool = _TestTool()
        reg.register(tool, category="metrics", ql_type="PromQL")
        assert reg.get("test_tool") is not None
        assert reg.is_enabled("test_tool")

    def test_unregister(self):
        reg = ToolRegistry()
        reg.register(_TestTool())
        assert reg.unregister("test_tool") is True
        assert reg.get("test_tool") is None

    def test_disable_enable(self):
        reg = ToolRegistry()
        reg.register(_TestTool())
        assert reg.disable("test_tool") is True
        assert not reg.is_enabled("test_tool")
        active = reg.get_active_tools()
        assert len(active) == 0
        assert reg.enable("test_tool") is True
        assert len(reg.get_active_tools()) == 1

    def test_list_all(self):
        reg = ToolRegistry()
        reg.register(_TestTool(), version="2.0.0", category="logs")
        infos = reg.list_all()
        assert len(infos) == 1
        assert infos[0].name == "test_tool"
        assert infos[0].version == "2.0.0"
        assert infos[0].category == "logs"

    def test_list_info_dict(self):
        reg = ToolRegistry()
        reg.register(_TestTool(), category="traces", ql_type="TraceQL")
        dicts = reg.list_info_dict()
        assert len(dicts) == 1
        assert dicts[0]["ql_type"] == "TraceQL"
        assert "enabled" in dicts[0]

    def test_default_registry(self):
        reg = create_default_registry()
        tools = reg.get_active_tools()
        assert len(tools) == 3
        names = [t.name for t in tools]
        assert "mimir" in names
        assert "loki" in names
        assert "tempo" in names
