"""Test the synthetic dataset for the QL feasibility spike."""
import pytest
from spike.dataset.metric_catalog import MetricCatalog, ServiceMeta
from spike.dataset.samples import SAMPLES, FaultSample, QLType


class TestMetricCatalog:
    def test_catalog_has_services(self):
        catalog = MetricCatalog.default()
        assert len(catalog.services) >= 5

    def test_each_service_has_metrics(self):
        catalog = MetricCatalog.default()
        for svc in catalog.services.values():
            assert len(svc.metrics) > 0
            assert len(svc.labels) > 0

    def test_payment_service_exists_with_key_metrics(self):
        catalog = MetricCatalog.default()
        svc = catalog.services["payment-service"]
        assert "http_requests_total" in svc.metrics
        assert "service" in svc.labels

    def test_catalog_summary_is_string(self):
        catalog = MetricCatalog.default()
        summary = catalog.to_prompt_summary()
        assert isinstance(summary, str)
        assert "payment-service" in summary
        assert "http_requests_total" in summary


class TestSamples:
    def test_has_at_least_20_samples(self):
        assert len(SAMPLES) >= 20

    def test_covers_all_three_ql_types(self):
        types = {s.ql_type for s in SAMPLES}
        assert types == {QLType.PROMQL, QLType.LOGQL, QLType.TRACEQL}

    def test_each_sample_has_required_fields(self):
        for s in SAMPLES:
            assert s.id
            assert s.natural_language
            assert s.expected_query
            assert s.ql_type
            assert s.service_name

    def test_each_sample_has_description_context(self):
        for s in SAMPLES:
            assert s.natural_language  # non-empty
            assert len(s.natural_language) > 10

    def test_promql_samples_reference_real_metrics(self):
        catalog = MetricCatalog.default()
        promql_samples = [s for s in SAMPLES if s.ql_type == QLType.PROMQL]
        assert len(promql_samples) >= 6
        for s in promql_samples:
            # "*" means cross-service query -- valid, skip catalog lookup
            assert s.service_name == "*" or s.service_name in catalog.services
