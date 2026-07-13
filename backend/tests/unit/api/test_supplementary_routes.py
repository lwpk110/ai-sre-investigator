"""补充 API 路由测试 — 覆盖 metrics/dashboard/services/knowledge/sessions/models 端点。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.routes import create_app


class TestMetricsEndpoints:
    """自观测指标和仪表盘端点。"""

    def test_get_metrics(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_sessions" in data

    def test_get_dashboard(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "self_resolution_rate" in data
        assert "est_cost_usd" in data

    def test_get_session_metrics_not_found(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/metrics/nonexistent-session")
        assert resp.status_code == 404


class TestServicesEndpoints:
    """服务画像端点。"""

    def test_list_services(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/services")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["services"]) >= 5

    def test_get_service_exact(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/services/tendata-auth-service")
        assert resp.status_code == 200
        data = resp.json()
        assert data["owner_team"] == "Platform"
        assert data["criticality"] == "P0"

    def test_get_service_fuzzy(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/services/crm")
        assert resp.status_code == 200

    def test_get_service_not_found(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/services/nonexistent-service-xyz")
        assert resp.status_code == 404


class TestKnowledgeEndpoints:
    """知识库端点。"""

    def test_list_knowledge_empty(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/knowledge")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert isinstance(data["entries"], list)

    def test_knowledge_not_found(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/knowledge/99999")
        assert resp.status_code == 404


class TestSessionsEndpoints:
    """历史会话和回放端点。"""

    def test_list_sessions(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/sessions")
        assert resp.status_code == 200
        data = resp.json()
        assert "sessions" in data

    def test_replay_session_not_found(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/sessions/nonexistent-session/replay")
        assert resp.status_code == 404


class TestModelsEndpoints:
    """多模型路由端点。"""

    def test_list_models(self):
        app = create_app()
        client = TestClient(app)
        resp = client.get("/api/models")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["models"]) >= 1

    def test_select_model(self):
        app = create_app()
        client = TestClient(app)
        models = client.get("/api/models").json()["models"]
        if models:
            model_id = models[0]["id"]
            resp = client.post(f"/api/models/{model_id}/select")
            assert resp.status_code == 200

    def test_select_model_not_found(self):
        app = create_app()
        client = TestClient(app)
        resp = client.post("/api/models/nonexistent-model/select")
        assert resp.status_code == 404


class TestToolsToggleEndpoints:
    """工具启用/禁用端点。"""

    def test_enable_tool(self):
        app = create_app()
        client = TestClient(app)
        tools = client.get("/api/tools").json()["tools"]
        if tools:
            name = tools[0]["name"]
            resp = client.post(f"/api/tools/{name}/enable")
            assert resp.status_code == 200

    def test_enable_tool_not_found(self):
        app = create_app()
        client = TestClient(app)
        resp = client.post("/api/tools/nonexistent-tool/enable")
        assert resp.status_code == 404

    def test_disable_tool(self):
        app = create_app()
        client = TestClient(app)
        tools = client.get("/api/tools").json()["tools"]
        if tools:
            name = tools[0]["name"]
            resp = client.post(f"/api/tools/{name}/disable")
            assert resp.status_code == 200
