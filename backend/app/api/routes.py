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
from app.services.service_profile import catalog as service_catalog
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
    # 对话式追问：存储用户消息和 RCA 结果的交替历史
    history: list[dict[str, str]] = field(default_factory=list)


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

    @app.post("/api/session/{session_id}/follow-up")
    async def follow_up(session_id: str, req: ChatRequest) -> dict[str, Any]:
        """对话式追问：在已有会话中继续提问。

        复用已有会话的工具集和预算，将追问消息追加到历史。
        客户端再次连接 SSE 流获取新的推理过程。
        """
        if not req.message.strip():
            raise HTTPException(status_code=400, detail="message 不能为空")

        session = store.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="会话不存在")

        # 将上一次的 RCA 结果存入历史
        if session.agent is not None and session.status in ("completed",):
            session.history.append({"role": "user", "content": session.message})
            session.history.append(
                {"role": "rca", "content": "上一次 RCA 结果已提供给 Agent"}
            )

        # 更新会话消息为追问消息
        session.message = req.message
        session.status = "created"

        # 重建 agent（复用 tools 和 client，新建 budget 和 executor）
        budget = BudgetTracker()
        executor = SafeToolExecutor(budget=budget)
        agent = AgentLoop(
            tools=session.tools,
            executor=executor,
            budget=budget,
            client=llm_client,
        )

        session.budget = budget
        session.executor = executor
        session.agent = agent

        return {"session_id": session.session_id, "follow_up": True}

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
                # 追问时传入历史上下文（如果有）
                prior = session.history if session.history else None
                async for event in session.agent.run(  # type: ignore[union-attr]
                    session.message,
                    prior_context=prior,
                ):
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

    @app.get("/api/services")
    async def list_services() -> dict[str, Any]:
        """列出全部服务画像（V2-F3）。"""
        return {
            "services": [
                {
                    "name": s.name,
                    "owner_team": s.owner_team,
                    "owner_contact": s.owner_contact,
                    "slo": s.slo.model_dump(),
                    "dependencies": s.dependencies,
                    "criticality": s.criticality,
                    "description": s.description,
                }
                for s in service_catalog.all()
            ]
        }

    @app.get("/api/services/{service_name}")
    async def get_service(service_name: str) -> dict[str, Any]:
        """查询单个服务画像（V2-F3）。"""
        profile = service_catalog.get(service_name)
        if profile is None:
            # 尝试模糊匹配
            results = service_catalog.find_by_keyword(service_name)
            if results:
                profile = results[0]
            else:
                raise HTTPException(status_code=404, detail="服务不存在")
        return {
            "name": profile.name,
            "owner_team": profile.owner_team,
            "owner_contact": profile.owner_contact,
            "slo": profile.slo.model_dump(),
            "dependencies": profile.dependencies,
            "criticality": profile.criticality,
            "description": profile.description,
        }

    return app


def _serialize_event(event: SSEEvent) -> str:
    """将 SSEEvent 序列化为 JSON 字符串。"""
    import json

    payload = {"type": event.type, "data": event.data}
    return json.dumps(payload, ensure_ascii=False, default=str)
