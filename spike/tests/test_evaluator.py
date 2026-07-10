"""Test the QL evaluator that scores generated queries."""
import pytest
from spike.dataset.samples import QLType
from spike.generator import GeneratedQL
from spike.dataset.samples import SAMPLES
from spike.evaluator import evaluate, EvaluationResult, ScoreGrade


class TestPromQLEvaluation:
    def test_exact_match_gets_full_score(self):
        sample = SAMPLES[0]  # prom-001
        gen = GeneratedQL(sample_id=sample.id, query=sample.expected_query, ql_type=QLType.PROMQL, model="test")
        result = evaluate(gen, sample)
        assert result.score == 1.0
        assert result.syntax_ok
        assert result.semantic_match
        assert result.grade == ScoreGrade.PERFECT

    def test_wrong_metric_name_fails_semantic(self):
        sample = SAMPLES[0]
        gen = GeneratedQL(
            sample_id=sample.id,
            query='sum(rate(wrong_metric_name{service="payment-service"}[1h]))',
            ql_type=QLType.PROMQL, model="test",
        )
        result = evaluate(gen, sample)
        assert not result.semantic_match
        assert result.score < 0.5

    def test_missing_label_match(self):
        sample = SAMPLES[0]
        # Missing status="500" filter -- semantically wrong
        gen = GeneratedQL(
            sample_id=sample.id,
            query='sum(rate(http_requests_total{service="payment-service"}[1h]))',
            ql_type=QLType.PROMQL, model="test",
        )
        result = evaluate(gen, sample)
        assert not result.semantic_match
        assert result.score < 0.8

    def test_different_time_window(self):
        sample = SAMPLES[0]  # expects [1h]
        gen = GeneratedQL(
            sample_id=sample.id,
            query='sum(rate(http_requests_total{service="payment-service",status="500"}[30m])) / sum(rate(http_requests_total{service="payment-service"}[30m]))',
            ql_type=QLType.PROMQL, model="test",
        )
        result = evaluate(gen, sample)
        assert not result.semantic_match
        assert "time window" in result.notes.lower() or "duration" in result.notes.lower()


class TestLogQLEvaluation:
    def test_exact_match(self):
        sample = next(s for s in SAMPLES if s.id == "log-001")
        gen = GeneratedQL(sample_id=sample.id, query=sample.expected_query, ql_type=QLType.LOGQL, model="test")
        result = evaluate(gen, sample)
        assert result.score == 1.0

    def test_wrong_keyword(self):
        sample = next(s for s in SAMPLES if s.id == "log-001")  # expects "Exception"
        gen = GeneratedQL(
            sample_id=sample.id,
            query='{service="payment-service"} |= "Error" | json',
            ql_type=QLType.LOGQL, model="test",
        )
        result = evaluate(gen, sample)
        assert not result.semantic_match


class TestTraceQLEvaluation:
    def test_exact_match(self):
        sample = next(s for s in SAMPLES if s.id == "trace-001")
        gen = GeneratedQL(sample_id=sample.id, query=sample.expected_query, ql_type=QLType.TRACEQL, model="test")
        result = evaluate(gen, sample)
        assert result.score == 1.0

    def test_wrong_duration(self):
        sample = next(s for s in SAMPLES if s.id == "trace-001")  # expects 500ms
        gen = GeneratedQL(
            sample_id=sample.id,
            query='{ service.name = "payment-service" } && duration > 1s',
            ql_type=QLType.TRACEQL, model="test",
        )
        result = evaluate(gen, sample)
        assert not result.semantic_match


class TestSyntaxCheck:
    def test_empty_query_fails_syntax(self):
        sample = SAMPLES[0]
        gen = GeneratedQL(sample_id=sample.id, query="", ql_type=QLType.PROMQL, model="test")
        result = evaluate(gen, sample)
        assert not result.syntax_ok
        assert result.score == 0.0

    def test_garbage_fails_syntax(self):
        sample = SAMPLES[0]
        gen = GeneratedQL(sample_id=sample.id, query="这不是一个查询", ql_type=QLType.PROMQL, model="test")
        result = evaluate(gen, sample)
        assert not result.syntax_ok
        assert result.score == 0.0
