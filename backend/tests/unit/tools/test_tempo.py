"""Unit tests for TempoTool — TraceQL execution (T5, ADR-002/005)."""

import httpx

from app.tools.base import ToolResult
from app.tools.tempo import TempoParams, TempoTool


def _mock_transport(handler):
    return httpx.MockTransport(handler)


class TestTempoTool:
    async def test_successful_query(self):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={
                "traces": [{
                    "traceID": "abc123",
                    "spans": [{
                        "operationName": "GET /api/orders",
                        "duration": 2800000,
                        "serviceName": "payment-service",
                        "statusCode": 500,
                    }],
                }],
            })

        tool = TempoTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(TempoParams(
            query='{ resource.service.name = "payment-service" }'
        ))
        assert result.success is True
        assert "spans" in result.data
        assert len(result.data["spans"]) == 1
        assert result.data["spans"][0]["service"] == "payment-service"
        assert result.data["spans"][0]["duration_ms"] == 2800

    async def test_timeout_returns_error(self):
        def handler(req: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("timed out")

        tool = TempoTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=0.01
        ))
        result = await tool.execute(TempoParams(query="{}"))
        assert result.success is False
        assert "timeout" in result.error.lower()

    async def test_500_returns_error(self):
        def handler(req: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="error")

        tool = TempoTool(client=httpx.AsyncClient(
            transport=_mock_transport(handler), base_url="http://mock", timeout=5.0
        ))
        result = await tool.execute(TempoParams(query="{}"))
        assert isinstance(result, ToolResult)
        assert result.success is False
