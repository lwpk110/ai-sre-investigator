"""Loki 工具 — LogQL 查询执行（ADR-002 只读，ADR-005 优雅失败）。

通过 HTTPX async GET 向 Loki 发送 LogQL 查询，返回日志行列表。
支持 max_lines 限制返回行数，防止响应过大。
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from pydantic import BaseModel

from app.config import settings
from app.tools.base import ToolResult, ToolSpec

# 默认最大返回行数
DEFAULT_MAX_LINES = 100


class LokiParams(BaseModel):
    """Loki 查询参数。"""

    query: str
    start: str | None = None
    end: str | None = None
    limit: int = DEFAULT_MAX_LINES
    max_lines: int = DEFAULT_MAX_LINES


class LokiTool(ToolSpec):
    """LogQL 查询工具，对接 Loki /loki/api/v1/query_range。"""

    name: str = "loki"
    description: str = (
        "查询 Loki 日志。输入 LogQL 表达式，返回匹配的日志行。"
    )
    parameters: type = LokiParams

    base_url: str = settings.loki_url

    def __init__(self, client: httpx.AsyncClient | None = None, **data: Any) -> None:
        super().__init__(**data)
        self._client = client

    async def execute(self, params: BaseModel) -> ToolResult:
        assert isinstance(params, LokiParams)
        start = time.monotonic()

        client = self._client or httpx.AsyncClient(
            base_url=self.base_url, timeout=settings.http_timeout_seconds
        )
        own_client = self._client is None

        try:
            req_params: dict[str, str | int] = {
                "query": params.query,
                "limit": params.max_lines,
            }
            if params.start:
                req_params["start"] = params.start
            if params.end:
                req_params["end"] = params.end

            resp = await client.get("/loki/api/v1/query_range", params=req_params)

            if resp.status_code >= 500:
                return ToolResult(
                    success=False,
                    error=f"Loki 返回 HTTP {resp.status_code}",
                    latency_ms=int((time.monotonic() - start) * 1000),
                )

            resp.raise_for_status()
            body = resp.json()

            if body.get("status") != "success":
                return ToolResult(
                    success=False,
                    error=f"Loki 查询失败: {body.get('error', '未知错误')}",
                    latency_ms=int((time.monotonic() - start) * 1000),
                )

            # 从 streams 中提取日志行，限制 max_lines
            # Loki API 可能返回 dict.data.result 或直接 data 为 list
            raw_data = body.get("data", [])
            if isinstance(raw_data, dict):
                streams = raw_data.get("result", [])
            elif isinstance(raw_data, list):
                streams = raw_data
            else:
                streams = []
            lines: list[str] = []
            for stream in streams:
                for _ts, line in stream.get("values", []):
                    lines.append(line)
                    if len(lines) >= params.max_lines:
                        break
                if len(lines) >= params.max_lines:
                    break

            return ToolResult(
                success=True,
                data={"lines": lines, "total": len(lines)},
                latency_ms=int((time.monotonic() - start) * 1000),
            )

        except httpx.TimeoutException:
            return ToolResult(
                success=False,
                error=f"timeout: Loki 查询超时 ({settings.http_timeout_seconds}s)",
                latency_ms=int((time.monotonic() - start) * 1000),
            )
        except Exception as exc:
            return ToolResult(
                success=False,
                error=f"Loki 查询异常: {exc!s}",
                latency_ms=int((time.monotonic() - start) * 1000),
            )
        finally:
            if own_client:
                await client.aclose()
