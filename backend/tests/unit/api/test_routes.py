"""API 路由单元测试（T8, ADR-005）。

使用 FastAPI TestClient 测试三个端点：
- POST /api/chat → 创建会话，返回 session_id
- GET /api/session/{id}/stream → SSE 事件流
- GET /api/session/{id} → 会话状态

核心断言：错误响应绝不返回 500（ADR-005）。
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock


def _make_tool_call_mock(tc_id: str, name: str, arguments: str) -> MagicMock:
    """构造一个 mock tool_call 对象。"""
    mock_tc = MagicMock()
    mock_tc.id = tc_id
    mock_tc.type = "function"
    mock_tc.function = MagicMock()
    mock_tc.function.name = name
    mock_tc.function.arguments = arguments
    return mock_tc


def _mock_llm_responses() -> list[MagicMock]:
    """构造两轮 mock LLM 响应：第一轮调用工具，第二轮完成 RCA。"""
    # 第一轮：LLM 请求调用 mimir
    tc_msg = MagicMock()
    tc_msg.content = None
    tc_msg.tool_calls = [_make_tool_call_mock("c1", "mimir", '{"query": "up"}')]

    choice1 = MagicMock()
    choice1.message = tc_msg
    choice1.finish_reason = "tool_calls"

    resp1 = MagicMock()
    resp1.choices = [choice1]
    resp1.usage = MagicMock(total_tokens=500)

    # 第二轮：LLM 返回最终 RCA
    final_msg = MagicMock()
    final_msg.content = "## RCA 报告\n原因是内存不足。"
    final_msg.tool_calls = None

    choice2 = MagicMock()
    choice2.message = final_msg
    choice2.finish_reason = "stop"

    resp2 = MagicMock()
    resp2.choices = [choice2]
    resp2.usage = MagicMock(total_tokens=300)

    return [resp1, resp2]


def _create_app_with_mock():
    """创建带 mock LLM client 的 app 实例，用于测试。"""
    from app.api.routes import create_app

    responses = _mock_llm_responses()
    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=responses)

    app = create_app(llm_client=mock_client)
    return app


class TestCreateSession:
    """POST /api/chat 创建会话。"""

    def test_create_session_returns_id(self):
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.post("/api/chat", json={"message": "payment-service 为什么 500"})
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert len(data["session_id"]) > 0

    def test_create_session_missing_message(self):
        """缺少 message 字段返回 422，不是 500。"""
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.post("/api/chat", json={})
        assert resp.status_code == 422

    def test_create_session_empty_message(self):
        """空 message 返回 400，不是 500。"""
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.post("/api/chat", json={"message": ""})
        assert resp.status_code in (400, 422)


class TestSessionStatus:
    """GET /api/session/{id} 返回会话状态。"""

    def test_get_session_status(self):
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        # 先创建会话
        resp = client.post("/api/chat", json={"message": "排查问题"})
        session_id = resp.json()["session_id"]

        # 查询状态
        status_resp = client.get(f"/api/session/{session_id}")
        assert status_resp.status_code == 200
        data = status_resp.json()
        assert data["session_id"] == session_id
        assert "status" in data

    def test_get_nonexistent_session(self):
        """查询不存在的会话返回 404，不是 500。"""
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.get("/api/session/nonexistent-id")
        assert resp.status_code == 404


class TestSSEStream:
    """GET /api/session/{id}/stream 返回 SSE 事件流。"""

    def test_stream_returns_sse_events(self):
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        # 先创建会话
        resp = client.post("/api/chat", json={"message": "排查问题"})
        session_id = resp.json()["session_id"]

        # 读取 SSE 流
        with client.stream("GET", f"/api/session/{session_id}/stream") as stream:
            assert stream.status_code == 200
            events = []
            for line in stream.iter_lines():
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        # 应该有多个事件
        assert len(events) > 0
        event_types = [e.get("type") for e in events]
        # 至少包含 thinking 或 rca_complete
        assert "thinking" in event_types or "rca_complete" in event_types

    def test_stream_nonexistent_session(self):
        """流式查询不存在的会话返回 404，不是 500。"""
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.get("/api/session/nonexistent-id/stream")
        assert resp.status_code == 404


class TestNeverReturns500:
    """ADR-005: 错误响应绝不返回 500。"""

    def test_invalid_session_id_no_500(self):
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.get("/api/session/!!!invalid!!!/stream")
        assert resp.status_code != 500

    def test_missing_body_no_500(self):
        from fastapi.testclient import TestClient

        app = _create_app_with_mock()
        client = TestClient(app)

        resp = client.post("/api/chat")
        assert resp.status_code != 500
