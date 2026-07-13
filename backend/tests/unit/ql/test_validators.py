"""Unit tests for QL syntax validators (T2, ADR-004 layer 3)."""


from app.tools.ql.validators import (
    validate_logql,
    validate_promql,
    validate_ql,
    validate_tracel,
)


class TestPromQLValidator:
    def test_valid_simple(self):
        assert validate_promql("up").valid is True

    def test_valid_rate(self):
        q = 'rate(http_requests_total{service="api"}[5m])'
        assert validate_promql(q).valid is True

    def test_valid_histogram_quantile(self):
        q = 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))'
        assert validate_promql(q).valid is True

    def test_valid_sum_by(self):
        q = 'sum(rate(http_requests_total[5m])) by (service)'
        assert validate_promql(q).valid is True

    def test_invalid_unbalanced_parens(self):
        r = validate_promql("rate(http_requests_total[5m]")
        assert r.valid is False
        assert any(w in r.error.lower() for w in ("paren", "bracket", "unbalanced"))

    def test_invalid_empty(self):
        assert validate_promql("").valid is False

    def test_invalid_sql(self):
        r = validate_promql("SELECT * FROM metrics")
        assert r.valid is False


class TestLogQLValidator:
    def test_valid_stream_selector(self):
        q = '{service="payment-service"} |= "ERROR"'
        assert validate_logql(q).valid is True

    def test_valid_json_parser(self):
        q = '{app="nginx"} | json | level="error"'
        assert validate_logql(q).valid is True

    def test_valid_rate(self):
        q = 'rate({service="api"}[5m])'
        assert validate_logql(q).valid is True

    def test_invalid_missing_braces(self):
        r = validate_logql('service="api" |= "error"')
        assert r.valid is False

    def test_invalid_empty(self):
        assert validate_logql("").valid is False

    def test_invalid_sql(self):
        r = validate_logql("SELECT * FROM logs")
        assert r.valid is False


class TestTraceQLValidator:
    def test_valid_resource_attr(self):
        q = '{ resource.service.name = "payment-service" }'
        assert validate_tracel(q).valid is True

    def test_valid_with_status(self):
        q = '{ resource.service.name = "api" && span.http.status_code >= 500 }'
        assert validate_tracel(q).valid is True

    def test_valid_count(self):
        q = '{ span.db.system = "redis" } | count() > 10'
        assert validate_tracel(q).valid is True

    def test_invalid_no_braces(self):
        r = validate_tracel('resource.service.name = "api"')
        assert r.valid is False

    def test_invalid_empty(self):
        assert validate_tracel("").valid is False


class TestValidateQL:
    def test_dispatch_mimir(self):
        r = validate_ql("mimir", 'rate(up[5m])')
        assert r.valid is True

    def test_dispatch_loki(self):
        r = validate_ql("loki", '{service="x"} |= "err"')
        assert r.valid is True

    def test_dispatch_tempo(self):
        r = validate_ql("tempo", '{ resource.service.name = "x" }')
        assert r.valid is True

    def test_unknown_tool_passes(self):
        r = validate_ql("unknown_tool", "anything")
        assert r.valid is True  # unknown tools skip validation
