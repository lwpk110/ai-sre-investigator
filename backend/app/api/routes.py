"""FastAPI 路由 + SSE 流 + 内存 SessionStore（T8, ADR-005）。

三个端点：
- POST /api/chat → 创建会话，返回 session_id
- GET /api/session/{id}/stream → SSE 事件流（sse-starlette）
- GET /api/session/{id} → 会话状态

所有错误返回 4xx，绝不返回 500（ADR-005）。
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.agent.budget import BudgetTracker
from app.agent.events import SSEEvent
from app.agent.loop import AgentLoop
from app.agent.safe_executor import SafeToolExecutor
from app.observability.metrics import collector as metrics_collector
from app.tools.base import ToolSpec
from app.tools.loki import LokiTool
from app.tools.mimir import MimirTool
from app.tools.tempo import TempoTool


class ChatRequest(BaseModel):
    """POST /api/chat 请求体。"""

    message: str


@dataclass
class Session:
    """会话状态（内存存储）。"""

    session_id: str
    message: str
    status: str = "created"  # created | running | completed | error
    tools: list[Any] = field(default_factory=list)
    budget: BudgetTracker = field(default_factory=BudgetTracker)
    executor: SafeToolExecutor | None = None
    agent: AgentLoop | None = None


class SessionStore:
    """内存会话存储。MVP 阶段不持久化。"""

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self, message: str) -> Session:
        """创建新会话。"""
        session_id = uuid.uuid4().hex
        session = Session(session_id=session_id, message=message)
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        """获取会话，不存在返回 None。"""
        return self._sessions.get(session_id)


def _build_default_tools() -> list[ToolSpec]:
    """构建默认工具集（Mimir/Loki/Tempo）。

    生产环境从 config 注入 httpx client；测试环境可覆盖。
    """
    return [
        MimirTool(),
        LokiTool(),
        TempoTool(),
    ]


def create_app(
    llm_client: Any | None = None,
    tools: list[ToolSpec] | None = None,
) -> FastAPI:
    """创建 FastAPI 应用实例。

    Args:
        llm_client: 可注入的 AsyncOpenAI client（测试用 mock）。
        tools: 可注入的工具列表（测试用 stub）。
    """
    app = FastAPI(title="AI SRE Investigator")
    store = SessionStore()

    # 如果没有注入工具，使用默认的 Mimir/Loki/Tempo
    effective_tools: list[ToolSpec] = (
        tools if tools is not None else _build_default_tools()
    )

    @app.post("/api/chat")
    async def create_session(req: ChatRequest) -> dict[str, str]:
        """创建排查会话，返回 session_id。"""
        if not req.message.strip():
            raise HTTPException(status_code=400, detail="message 不能为空")

        session = store.create(req.message)

        # 构建 agent（但不立即运行，等 stream 时启动）
        budget = BudgetTracker()
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=effective_tools,
            executor=executor,
            budget=budget,
            client=llm_client,
        )

        session.budget = budget
        session.executor = executor
        session.agent = agent
        session.tools = effective_tools
        session.status = "created"

        # 初始化自观测指标（E-5）
        metrics_collector.create_session(session.session_id)

        return {"session_id": session.session_id}

    @app.get("/api/session/{session_id}")
    async def get_session_status(session_id: str) -> dict[str, Any]:
        """获取会话状态。"""
        session = store.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="会话不存在")

        return {
            "session_id": session.session_id,
            "status": session.status,
            "tokens_used": session.budget.tokens_used,
            "tool_calls": session.budget.tool_calls,
        }

    @app.get("/api/session/{session_id}/stream")
    async def stream_session(session_id: str) -> EventSourceResponse:
        """SSE 流：推送 Agent 推理步骤和 RCA 结果。"""
        session = store.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="会话不存在")

        if session.agent is None:
            raise HTTPException(status_code=400, detail="会话未初始化")

        session.status = "running"

        async def event_generator() -> AsyncGenerator[dict[str, str], None]:
            """将 AgentLoop 的 SSEEvent 转换为 SSE 格式。"""
            try:
                metrics = metrics_collector.get_session(session.session_id)
                async for event in session.agent.run(session.message):  # type: ignore[union-attr]
                    # 更新自观测指标
                    if metrics:
                        if event.type == "budget_update":
                            metrics.tokens_used = event.data.get("tokens_used", 0)
                        elif event.type == "tool_result":
                            metrics.record_tool_call(
                                event.data.get("tool", "unknown"),
                                event.data.get("success", False),
                                event.data.get("latency_ms", 0),
                                event.data.get("cached", False),
                            )
                    yield {
                        "event": event.type,
                        "data": _serialize_event(event),
                    }
                session.status = "completed"
                metrics_collector.complete_session(session.session_id, "completed")
            except Exception:
                session.status = "error"
                metrics_collector.complete_session(session.session_id, "error")
                yield {
                    "event": "error",
                    "data": '{"type": "error", "data": {"message": "内部错误"}}',
                }

        return EventSourceResponse(event_generator())

    @app.get("/api/metrics")
    async def get_metrics() -> dict[str, object]:
        """全局自观测指标汇总。"""
        return metrics_collector.get_summary()

    @app.get("/api/metrics/{session_id}")
    async def get_session_metrics(session_id: str) -> dict[str, object]:
        """单会话自观测指标。"""
        session_metrics = metrics_collector.get_session(session_id)
        if session_metrics is None:
            raise HTTPException(status_code=404, detail="会话指标不存在")
        return session_metrics.to_dict()

    return app


def _serialize_event(event: SSEEvent) -> str:
    """将 SSEEvent 序列化为 JSON 字符串。"""
    import json

    payload = {"type": event.type, "data": event.data}
    return json.dumps(payload, ensure_ascii=False, default=str)
