"""服务画像测试（V2-F3）。

验证 YAML 加载、精确查询、模糊匹配、RCA 归属注入。
"""

from __future__ import annotations

from app.services.service_profile import ServiceCatalog


def test_catalog_loads_services():
    """YAML 配置正确加载服务列表。"""
    catalog = ServiceCatalog()
    services = catalog.all()
    assert len(services) >= 5
    names = [s.name for s in services]
    assert "tendata-crm-customer-service" in names


def test_exact_lookup():
    """精确查询服务画像。"""
    catalog = ServiceCatalog()
    profile = catalog.get("tendata-auth-service")
    assert profile is not None
    assert profile.owner_team == "Platform"
    assert profile.criticality == "P0"


def test_fuzzy_search():
    """模糊匹配关键词。"""
    catalog = ServiceCatalog()
    results = catalog.find_by_keyword("crm")
    assert len(results) >= 1
    assert any("tendata-crm" in s.name for s in results)


def test_nonexistent_service():
    """查询不存在的服务返回 None。"""
    catalog = ServiceCatalog()
    assert catalog.get("nonexistent-service") is None


def test_service_profile_has_slo():
    """服务画像包含 SLO 信息。"""
    catalog = ServiceCatalog()
    profile = catalog.get("tendata-corp-service")
    assert profile is not None
    assert profile.slo.p99_latency_ms > 0
    assert profile.slo.availability_999 != ""


def test_service_has_dependencies():
    """服务画像包含依赖拓扑。"""
    catalog = ServiceCatalog()
    profile = catalog.get("tendata-crm-customer-service")
    assert profile is not None
    assert len(profile.dependencies) >= 2
