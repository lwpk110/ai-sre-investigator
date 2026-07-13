"""Mimir 工具 — PromQL 查询执行（ADR-002 只读，ADR-005 优雅失败）。

通过 HTTPX async GET 向 Mimir 发送 PromQL 查询，所有网络异常和 5xx
都转为 ToolResult(success=False)，绝不向上抛出。
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from pydantic import BaseModel

from app.config import settings
from app.tools.base import ToolResult, ToolSpec


class MimirParams(BaseModel):
    """Mimir 查询参数。"""

    query: str
    start: str | None = None
    end: str | None = None
    step: str | None = None


class MimirTool(ToolSpec):
    """PromQL 查询工具，对接 Mimir /api/v1/query。"""

    name: str = "mimir"
    description: str = (
        "查询 Mimir/Prometheus 指标。输入 PromQL 表达式，返回时间序列数据。"
    )
    parameters: type = MimirParams

    # 允许外部注入 client（测试用 MockTransport）
    base_url: str = settings.mimir_url

    def __init__(self, client: httpx.AsyncClient | None = None, **data: Any) -> None:
        super().__init__(**data)
        self._client = client

    async def execute(self, params: BaseModel) -> ToolResult:
        assert isinstance(params, MimirParams)
        start = time.monotonic()

        client = self._client or httpx.AsyncClient(
            base_url=self.base_url, timeout=settings.http_timeout_seconds
        )
        own_client = self._client is None

        try:
            req_params: dict[str, str] = {"query": params.query}
            if params.start:
                req_params["start"] = params.start
            if params.end:
                req_params["end"] = params.end
            if params.step:
                req_params["step"] = params.step

            resp = await client.get("/api/v1/query", params=req_params)

            if resp.status_code >= 500:
                return ToolResult(
                    success=False,
                    error=f"Mimir 返回 HTTP {resp.status_code}",
                    latency_ms=int((time.monotonic() - start) * 1000),
                )

            resp.raise_for_status()
            body = resp.json()

            if body.get("status") != "success":
                return ToolResult(
                    success=False,
                    error=f"Mimir 查询失败: {body.get('error', '未知错误')}",
                    latency_ms=int((time.monotonic() - start) * 1000),
                )

            data = body.get("data", {})
            return ToolResult(
                success=True,
                data={
                    "resultType": data.get("resultType", ""),
                    "result": data.get("result", []),
                },
                latency_ms=int((time.monotonic() - start) * 1000),
            )

        except httpx.TimeoutException:
            return ToolResult(
                success=False,
                error=f"timeout: Mimir 查询超时 ({settings.http_timeout_seconds}s)",
                latency_ms=int((time.monotonic() - start) * 1000),
            )
        except Exception as exc:
            return ToolResult(
                success=False,
                error=f"Mimir 查询异常: {exc!s}",
                latency_ms=int((time.monotonic() - start) * 1000),
            )
        finally:
            if own_client:
                await client.aclose()
