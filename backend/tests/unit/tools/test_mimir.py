"""Unit tests for MimirTool — PromQL execution (T3, ADR-002/005)."""

import httpx
import pytest

from app.tools.base import ToolResult
from app.tools.mimir import MimirParams, MimirTool


def _mock_transport(handler):
    return httpx.MockTransport(handler)


class TestMimirTool:
    async def test_successful_query(self):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={
                "status": "success",
                "data": {
                    "resultType": "vector",
                    "result": [{
                        "metric": {"service": "payment-service"},
                        "value": [1719800000, "12.3"],
                    }],
                },
            })

        tool = MimirTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(MimirParams(query='rate(http_requests_total[5m])'))
        assert result.success is True
        assert "result" in result.data
        assert result.data["resultType"] == "vector"
        assert len(result.data["result"]) == 1

    async def test_timeout_returns_error(self):
        def handler(req: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("timed out")

        tool = MimirTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=0.01
        ))
        result = await tool.execute(MimirParams(query="up"))
        assert result.success is False
        assert "timeout" in result.error.lower()

    async def test_500_returns_error(self):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="Internal Server Error")

        tool = MimirTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(MimirParams(query="up"))
        assert result.success is False
        assert "500" in result.error

    async def test_never_raises(self):
        def handler(req: httpx.Request) -> httpx.Response:
            raise ConnectionError("network down")

        tool = MimirTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(MimirParams(query="up"))
        assert isinstance(result, ToolResult)
        assert result.success is False

    def test_openai_schema(self):
        tool = MimirTool()
        schema = tool.to_openai_schema()
        assert schema["function"]["name"] == "mimir"
        assert "query" in schema["function"]["parameters"]["properties"]
