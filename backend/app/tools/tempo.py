"""Tempo 工具 — TraceQL 查询执行（ADR-002 只读，ADR-005 优雅失败）。

通过 HTTPX async GET 向 Tempo 发送 TraceQL 查询，提取 Span 数据。
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from pydantic import BaseModel

from app.config import settings
from app.tools.base import ToolResult, ToolSpec


class TempoParams(BaseModel):
    """Tempo 查询参数。"""

    query: str
    start: str | None = None
    end: str | None = None
    limit: int = 20


class TempoTool(ToolSpec):
    """TraceQL 查询工具，对接 Tempo /api/search。"""

    name: str = "tempo"
    description: str = (
        "查询 Tempo 分布式链路。输入 TraceQL 表达式，返回匹配的 Trace 和 Span。"
    )
    parameters: type = TempoParams

    base_url: str = settings.tempo_url

    def __init__(self, client: httpx.AsyncClient | None = None, **data: Any) -> None:
        super().__init__(**data)
        self._client = client

    async def execute(self, params: BaseModel) -> ToolResult:
        assert isinstance(params, TempoParams)
        start = time.monotonic()

        client = self._client or httpx.AsyncClient(
            base_url=self.base_url, timeout=settings.http_timeout_seconds
        )
        own_client = self._client is None

        try:
            req_params: dict[str, str | int] = {"q": params.query}
            if params.start:
                req_params["start"] = params.start
            if params.end:
                req_params["end"] = params.end
            req_params["limit"] = params.limit

            resp = await client.get("/api/search", params=req_params)

            if resp.status_code >= 500:
                return ToolResult(
                    success=False,
                    error=f"Tempo 返回 HTTP {resp.status_code}",
                    latency_ms=int((time.monotonic() - start) * 1000),
                )

            resp.raise_for_status()
            body = resp.json()

            # 从 traces 中提取 span 数据
            traces = body.get("traces", [])
            spans: list[dict[str, Any]] = []
            for trace in traces:
                trace_id = trace.get("traceID", "")
                for span in trace.get("spans", []):
                    # Tempo span duration 单位是微秒，转毫秒
                    duration_us = span.get("duration", 0)
                    spans.append({
                        "trace_id": trace_id,
                        "operation": span.get("operationName", ""),
                        "service": span.get("serviceName", ""),
                        "duration_ms": duration_us // 1000,
                        "status_code": span.get("statusCode", 0),
                    })

            return ToolResult(
                success=True,
                data={"spans": spans, "total": len(spans)},
                latency_ms=int((time.monotonic() - start) * 1000),
            )

        except httpx.TimeoutException:
            return ToolResult(
                success=False,
                error=f"timeout: Tempo 查询超时 ({settings.http_timeout_seconds}s)",
                latency_ms=int((time.monotonic() - start) * 1000),
            )
        except Exception as exc:
            return ToolResult(
                success=False,
                error=f"Tempo 查询异常: {exc!s}",
                latency_ms=int((time.monotonic() - start) * 1000),
            )
        finally:
            if own_client:
                await client.aclose()
