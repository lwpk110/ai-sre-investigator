"""FastAPI 路由 + SSE 流 + 内存 SessionStore（T8, ADR-005）。

三个端点：
- POST /api/chat → 创建会话，返回 session_id
- GET /api/session/{id}/stream → SSE 事件流（sse-starlette）
- GET /api/session/{id} → 会话状态

所有错误返回 4xx，绝不返回 500（ADR-005）。
"""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.agent.budget import BudgetTracker
from app.agent.events import SSEEvent, playbook_hint
from app.agent.loop import AgentLoop
from app.agent.safe_executor import SafeToolExecutor
from app.knowledge.store import store as knowledge_store
from app.llm.model_registry import model_registry
from app.observability.metrics import collector as metrics_collector
from app.persistence.session_store import SessionSnapshot, persistence
from app.playbooks.registry import registry as playbook_registry
from app.services.service_profile import catalog as service_catalog
from app.tools.base import ToolSpec
from app.tools.loki import LokiTool
from app.tools.mimir import MimirTool
from app.tools.registry import registry as tool_registry
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

    # 如果没有注入工具，使用 registry 中已启用的工具（V3-F2）
    effective_tools: list[ToolSpec] = (
        tools if tools is not None else tool_registry.get_active_tools()
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

        # V3-F4: 会话持久化
        persistence.save(
            SessionSnapshot(
                session_id=session.session_id,
                message=session.message,
                status="created",
                created_at=datetime.now().isoformat(),
            )
        )

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

    @app.post("/api/session/{session_id}/handoff")
    async def generate_handoff(session_id: str) -> dict[str, Any]:
        """生成 SRE 交接卡（V2-F5）。

        低置信度或证据缺失时，自动生成结构化交接卡，
        包含症状摘要、已查证据链、置信度、缺失信息和建议下一步。
        """
        session = store.get(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.status not in ("completed",):
            raise HTTPException(
                status_code=400, detail="会话尚未完成，无法生成交接卡"
            )

        # 从会话历史中提取证据链
        evidence_chain: list[dict[str, str]] = []
        if session.history:
            for item in session.history:
                evidence_chain.append(
                    {"role": item.get("role", ""), "summary": item.get("content", "")}
                )

        # 从服务画像查询归属信息
        ownership: dict[str, str] = {}
        for svc in service_catalog.find_by_keyword(session.message):
            ownership[svc.name] = (
                f"{svc.owner_team} ({svc.criticality}) — {svc.owner_contact}"
            )
            break

        return {
            "session_id": session.session_id,
            "symptom": session.message,
            "evidence_chain": evidence_chain,
            "confidence": "low",
            "missing": ["需 SRE 人工确认根因"],
            "suggestions": [
                "检查服务部署变更记录",
                "查看基础设施层告警",
                "联系服务负责人确认",
            ],
            "ownership": ownership,
            "timestamp": session.budget.tokens_used,
            "markdown": _generate_handoff_markdown(
                session.message, evidence_chain, ownership
            ),
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
                collected_events: list[dict[str, Any]] = []

                # V2-F2: 剧本自动匹配 — 申告时推荐黄金路径
                pb_matches = playbook_registry.match(session.message, limit=1)
                if pb_matches:
                    best = pb_matches[0]
                    pb = best.playbook
                    hint_event = playbook_hint(
                        playbook_id=pb.id,
                        playbook_name=pb.name,
                        score=best.score,
                        matched_keywords=best.matched_keywords,
                        steps=[
                            {
                                "probe": s.probe,
                                "query_template": s.query_template,
                                "purpose": s.purpose,
                            }
                            for s in pb.steps
                        ],
                        common_root_causes=pb.common_root_causes,
                    )
                    collected_events.append(
                        {"type": hint_event.type, "data": hint_event.data}
                    )
                    yield {
                        "event": hint_event.type,
                        "data": _serialize_event(hint_event),
                    }

                final_report: str | None = None
                final_confidence: str | None = None
                final_partial = False
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
                    # V3-F4: 收集事件用于持久化
                    collected_events.append(
                        {"type": event.type, "data": event.data}
                    )
                    if event.type in ("rca_complete", "rca_partial"):
                        final_report = event.data.get("report")
                        final_confidence = event.data.get("confidence")
                        final_partial = event.type == "rca_partial"
                    yield {
                        "event": event.type,
                        "data": _serialize_event(event),
                    }
                session.status = "completed"
                metrics_collector.complete_session(session.session_id, "completed")
                # V3-F4: 持久化最终状态（含事件历史和 RCA）
                persistence.save(
                    SessionSnapshot(
                        session_id=session.session_id,
                        message=session.message,
                        status="completed",
                        events_json=json.dumps(
                            collected_events, ensure_ascii=False, default=str
                        ),
                        rca_report=final_report,
                        rca_confidence=final_confidence,
                        is_partial=final_partial,
                    )
                )
            except Exception:
                session.status = "error"
                metrics_collector.complete_session(session.session_id, "error")
                persistence.save(
                    SessionSnapshot(
                        session_id=session.session_id,
                        message=session.message,
                        status="error",
                        events_json=json.dumps(
                            collected_events, ensure_ascii=False, default=str
                        ),
                    )
                )
                yield {
                    "event": "error",
                    "data": '{"type": "error", "data": {"message": "内部错误"}}',
                }

        return EventSourceResponse(event_generator())

    @app.get("/api/metrics")
    async def get_metrics() -> dict[str, object]:
        """全局自观测指标汇总。"""
        return metrics_collector.get_summary()

    @app.get("/api/dashboard")
    async def get_dashboard() -> dict[str, object]:
        """价值仪表盘 KPI 数据（V2-F4）。"""
        return metrics_collector.get_dashboard()

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

    @app.get("/api/knowledge")
    async def list_knowledge(q: str | None = None, limit: int = 20) -> dict[str, Any]:
        """知识库列表 / 搜索（V2-F1）。

        - 不带参数: 返回最近 RCA 条目
        - 带 q 参数: 按服务名/症状关键词搜索相似 RCA
        """
        if q:
            entries = knowledge_store.search_by_symptom(q, limit=limit)
        else:
            entries = knowledge_store.get_all(limit=limit)
        return {
            "total": knowledge_store.count(),
            "entries": [
                {
                    "id": e.id,
                    "symptom": e.symptom,
                    "service_name": e.service_name,
                    "root_cause": e.root_cause,
                    "confidence": e.confidence,
                    "tags": e.tags,
                    "created_at": e.created_at,
                }
                for e in entries
            ],
        }

    @app.get("/api/knowledge/{entry_id}")
    async def get_knowledge(entry_id: int) -> dict[str, Any]:
        """查询知识库单条详情（V2-F1）。"""
        entry = knowledge_store.get_by_id(entry_id)
        if entry is None:
            raise HTTPException(status_code=404, detail="知识条目不存在")
        return {
            "id": entry.id,
            "symptom": entry.symptom,
            "service_name": entry.service_name,
            "query_path": entry.query_path,
            "root_cause": entry.root_cause,
            "confidence": entry.confidence,
            "report": entry.report,
            "tags": entry.tags,
            "created_at": entry.created_at,
        }

    @app.get("/api/tools")
    async def list_tools() -> dict[str, Any]:
        """列出全部已注册工具（V3-F2）。"""
        return {"tools": tool_registry.list_info_dict()}

    @app.get("/api/sessions")
    async def list_sessions(limit: int = 50) -> dict[str, Any]:
        """列出历史会话（V3-F4，从持久化层读取）。"""
        snapshots = persistence.list_recent(limit=limit)
        return {
            "sessions": [
                {
                    "session_id": s.session_id,
                    "message": s.message,
                    "status": s.status,
                    "created_at": s.created_at,
                    "updated_at": s.updated_at,
                    "rca_report": s.rca_report,
                    "rca_confidence": s.rca_confidence,
                    "is_partial": s.is_partial,
                }
                for s in snapshots
            ]
        }

    @app.get("/api/sessions/{session_id}/replay")
    async def replay_session(session_id: str) -> dict[str, Any]:
        """获取持久化会话的完整事件历史（V3-F4）。"""
        snapshot = persistence.get(session_id)
        if snapshot is None:
            raise HTTPException(status_code=404, detail="会话不存在")
        import json as _json
        events = _json.loads(snapshot.events_json) if snapshot.events_json else []
        return {
            "session_id": snapshot.session_id,
            "message": snapshot.message,
            "status": snapshot.status,
            "events": events,
            "rca_report": snapshot.rca_report,
            "rca_confidence": snapshot.rca_confidence,
            "is_partial": snapshot.is_partial,
        }

    @app.post("/api/tools/{tool_name}/enable")
    async def enable_tool(tool_name: str) -> dict[str, str]:
        """启用工具（V3-F2）。"""
        if not tool_registry.enable(tool_name):
            raise HTTPException(status_code=404, detail="工具不存在")
        return {"tool": tool_name, "status": "enabled"}

    @app.post("/api/tools/{tool_name}/disable")
    async def disable_tool(tool_name: str) -> dict[str, str]:
        """禁用工具（V3-F2）。"""
        if not tool_registry.disable(tool_name):
            raise HTTPException(status_code=404, detail="工具不存在")
        return {"tool": tool_name, "status": "disabled"}

    @app.get("/api/models")
    async def list_models() -> dict[str, Any]:
        """列出全部可用模型（V3-F3）。"""
        return {"models": model_registry.list_all()}

    @app.post("/api/models/{model_id}/select")
    async def select_model(model_id: str) -> dict[str, str]:
        """选择当前使用的模型（V3-F3）。"""
        if not model_registry.select(model_id):
            raise HTTPException(status_code=404, detail="模型不存在")
        return {"model": model_id, "status": "selected"}

    @app.get("/api/playbooks")
    async def list_playbooks() -> dict[str, Any]:
        """列出全部排查剧本摘要（V2-F2）。"""
        return {"playbooks": playbook_registry.summary()}

    @app.get("/api/playbooks/stats")
    async def playbook_stats() -> dict[str, Any]:
        """剧本覆盖统计（V2-F2）。"""
        return playbook_registry.coverage_stats()

    @app.get("/api/playbooks/match")
    async def match_playbooks(q: str) -> dict[str, Any]:
        """根据用户申告文本匹配剧本（V2-F2）。"""
        matches = playbook_registry.match(q)
        return {
            "query": q,
            "matches": [
                {
                    "playbook_id": m.playbook.id,
                    "playbook_name": m.playbook.name,
                    "score": round(m.score, 3),
                    "matched_keywords": m.matched_keywords,
                }
                for m in matches
            ],
        }

    @app.get("/api/playbooks/{playbook_id}")
    async def get_playbook(playbook_id: str) -> dict[str, Any]:
        """获取剧本完整详情（V2-F2）。"""
        pb = playbook_registry.get(playbook_id)
        if pb is None:
            raise HTTPException(status_code=404, detail="剧本不存在")
        return {
            "id": pb.id,
            "name": pb.name,
            "fault_type": pb.fault_type,
            "trigger_keywords": pb.trigger_keywords,
            "description": pb.description,
            "steps": [
                {
                    "probe": s.probe,
                    "query_template": s.query_template,
                    "purpose": s.purpose,
                    "evidence_key": s.evidence_key,
                }
                for s in pb.steps
            ],
            "common_root_causes": pb.common_root_causes,
            "confidence_threshold": pb.confidence_threshold,
        }

    return app


def _serialize_event(event: SSEEvent) -> str:
    """将 SSEEvent 序列化为 JSON 字符串。"""
    import json

    payload = {"type": event.type, "data": event.data}
    return json.dumps(payload, ensure_ascii=False, default=str)



def _generate_handoff_markdown(
    symptom: str,
    evidence_chain: list[dict[str, str]],
    ownership: dict[str, str],
) -> str:
    """生成交接卡 Markdown（V2-F5），可直接粘贴到 Slack/钉钉。"""
    lines: list[str] = [
        "## SRE 交接卡",
        "",
        f"**症状**: {symptom}",
        "",
    ]
    if ownership:
        for _svc, owner in ownership.items():
            lines.append(f"**责任方**: {owner}")
    lines.extend([
        "",
        "### 已查证据链",
        "",
    ])
    if evidence_chain:
        for item in evidence_chain:
            lines.append(f"- [{item['role']}] {item['summary']}")
    else:
        lines.append("- （Agent 排查过程中的证据已记录）")
    lines.extend([
        "",
        "### 待确认",
        "- 需 SRE 人工确认根因",
        "- 检查近期部署变更",
        "- 查看基础设施告警",
        "",
        "---",
        "_此交接卡由 AI SRE Investigator 自动生成_",
    ])
    return "\n".join(lines)
