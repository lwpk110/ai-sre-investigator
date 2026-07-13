"""Unit tests for ToolSpec base and ToolResult models (T1, ADR-003)."""

import pytest
from pydantic import BaseModel

from app.tools.base import ToolResult, ToolSpec


class TestToolResult:
    """Test ToolResult model fields and validation."""

    def test_success_result_minimal(self):
        r = ToolResult(success=True)
        assert r.success is True
        assert r.data is None
        assert r.error is None
        assert r.latency_ms >= 0
        assert r.cached is False

    def test_success_result_with_data(self):
        r = ToolResult(success=True, data={"metric": "cpu", "value": 42.5})
        assert r.data == {"metric": "cpu", "value": 42.5}

    def test_error_result(self):
        r = ToolResult(success=False, error="timeout after 30s")
        assert r.success is False
        assert r.error == "timeout after 30s"

    def test_cached_flag(self):
        r = ToolResult(success=True, data={"x": 1}, cached=True)
        assert r.cached is True

    def test_latency_recorded(self):
        r = ToolResult(success=True, latency_ms=150)
        assert r.latency_ms == 150


class _DummyParams(BaseModel):
    query: str


class _DummyTool(ToolSpec):
    name: str = "dummy"
    description: str = "A test tool"
    parameters: type = _DummyParams

    async def execute(self, params: _DummyParams) -> ToolResult:
        return ToolResult(success=True, data={"echo": params.query})


class TestToolSpec:
    """Test ToolSpec abstract base and schema conversion."""

    def test_cannot_instantiate_abstract(self):
        with pytest.raises(TypeError):
            ToolSpec()  # type: ignore[abstract]

    def test_concrete_tool_fields(self):
        t = _DummyTool()
        assert t.name == "dummy"
        assert t.description == "A test tool"

    def test_to_openai_schema_structure(self):
        t = _DummyTool()
        schema = t.to_openai_schema()
        assert schema["type"] == "function"
        assert schema["function"]["name"] == "dummy"
        assert schema["function"]["description"] == "A test tool"
        assert schema["function"]["parameters"]["type"] == "object"
        assert "query" in schema["function"]["parameters"]["properties"]

    def test_to_openai_schema_required_fields(self):
        t = _DummyTool()
        schema = t.to_openai_schema()
        assert "query" in schema["function"]["parameters"]["required"]

    async def test_execute_returns_tool_result(self):
        t = _DummyTool()
        result = await t.execute(_DummyParams(query="hello"))
        assert isinstance(result, ToolResult)
        assert result.success is True
        assert result.data == {"echo": "hello"}
