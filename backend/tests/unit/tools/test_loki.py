"""Unit tests for LokiTool — LogQL execution (T4, ADR-002/005)."""

import httpx

from app.tools.base import ToolResult
from app.tools.loki import LokiParams, LokiTool


def _mock_transport(handler):
    return httpx.MockTransport(handler)


class TestLokiTool:
    async def test_successful_query(self):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={
                "status": "success",
                "data": [{
                    "values": [
                        ["1719800000000000000", "ERROR connection refused"],
                        ["1719800000000000001", "WARN pool exhausted"],
                    ],
                }],
            })

        tool = LokiTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(LokiParams(query='{service="api"} |= "ERROR"'))
        assert result.success is True
        assert "lines" in result.data
        assert len(result.data["lines"]) == 2

    async def test_max_lines_enforced(self):
        lines = [[str(1719800000000000000 + i), f"line {i}"] for i in range(200)]

        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={
                "status": "success", "data": [{"values": lines}],
            })

        tool = LokiTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(LokiParams(
            query='{service="api"}', max_lines=50
        ))
        assert result.success is True
        assert len(result.data["lines"]) == 50

    async def test_timeout_returns_error(self):
        def handler(req: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("timed out")

        tool = LokiTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=0.01
        ))
        result = await tool.execute(LokiParams(query='{service="api"}'))
        assert result.success is False
        assert "timeout" in result.error.lower()

    async def test_500_returns_error(self):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="error")

        tool = LokiTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(LokiParams(query='{service="api"}'))
        assert isinstance(result, ToolResult)
        assert result.success is False
