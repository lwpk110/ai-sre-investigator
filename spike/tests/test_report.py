"""Test the feasibility report generator."""
import pytest
from spike.evaluator import EvaluationResult, ScoreGrade
from spike.dataset.samples import QLType
from spike.report import generate_report, FeasibilityVerdict


def _make_result(sample_id, ql_type, score, grade, syntax_ok=True, semantic_match=False, notes=""):
    return EvaluationResult(
        sample_id=sample_id, ql_type=ql_type, score=score, grade=grade,
        syntax_ok=syntax_ok, semantic_match=semantic_match, notes=notes,
    )


class TestGenerateReport:
    def test_all_perfect_yields_go_verdict(self):
        results = [
            _make_result("s1", QLType.PROMQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
            _make_result("s2", QLType.LOGQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
            _make_result("s3", QLType.TRACEQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
        ]
        report = generate_report(results, model="test-model")
        assert report.verdict == FeasibilityVerdict.GO
        assert report.overall_accuracy == 1.0

    def test_all_fail_yields_no_go_verdict(self):
        results = [
            _make_result("s1", QLType.PROMQL, 0.0, ScoreGrade.FAIL, syntax_ok=False),
            _make_result("s2", QLType.LOGQL, 0.0, ScoreGrade.FAIL, syntax_ok=False),
        ]
        report = generate_report(results, model="test-model")
        assert report.verdict == FeasibilityVerdict.NO_GO
        assert report.overall_accuracy == 0.0

    def test_partial_yields_conditional_verdict(self):
        results = [
            _make_result("s1", QLType.PROMQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
            _make_result("s2", QLType.PROMQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
            _make_result("s3", QLType.LOGQL, 0.3, ScoreGrade.PARTIAL),
            _make_result("s4", QLType.LOGQL, 0.0, ScoreGrade.FAIL, syntax_ok=False),
        ]
        report = generate_report(results, model="test-model")
        assert report.verdict == FeasibilityVerdict.CONDITIONAL
        assert 0.3 < report.overall_accuracy < 0.8

    def test_report_has_per_type_breakdown(self):
        results = [
            _make_result("s1", QLType.PROMQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
            _make_result("s2", QLType.LOGQL, 0.0, ScoreGrade.FAIL, syntax_ok=False),
            _make_result("s3", QLType.TRACEQL, 1.0, ScoreGrade.PERFECT, semantic_match=True),
        ]
        report = generate_report(results, model="test-model")
        assert QLType.PROMQL in report.by_type
        assert QLType.LOGQL in report.by_type
        assert QLType.TRACEQL in report.by_type
        assert report.by_type[QLType.PROMQL]["accuracy"] == 1.0
        assert report.by_type[QLType.LOGQL]["accuracy"] == 0.0

    def test_report_markdown_is_string(self):
        results = [_make_result("s1", QLType.PROMQL, 1.0, ScoreGrade.PERFECT, semantic_match=True)]
        report = generate_report(results, model="test-model")
        md = report.to_markdown()
        assert isinstance(md, str)
        assert "GO" in md or "NO-GO" in md or "CONDITIONAL" in md
