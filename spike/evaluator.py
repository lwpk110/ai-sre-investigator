"""Evaluate generated QL queries against expected ground truth.

Scoring rubric:
  - syntax_ok: Does the query look structurally valid for its QL type?
  - semantic_match: Does it use the right metrics/labels/keywords/time windows?
  - score: 0.0-1.0 weighted combination
  - grade: PERFECT / GOOD / PARTIAL / FAIL
"""
from __future__ import annotations
import re
from enum import Enum
from pydantic import BaseModel

from spike.dataset.samples import FaultSample, QLType
from spike.generator import GeneratedQL


class ScoreGrade(str, Enum):
    PERFECT = "perfect"   # score == 1.0
    GOOD = "good"         # score >= 0.7
    PARTIAL = "partial"   # score >= 0.3
    FAIL = "fail"         # score < 0.3


class EvaluationResult(BaseModel):
    sample_id: str
    ql_type: QLType
    score: float
    grade: ScoreGrade
    syntax_ok: bool
    semantic_match: bool
    notes: str = ""


# ---- Syntax validators (lightweight L1 checks) ----

def _check_promql_syntax(query: str) -> bool:
    """Lightweight PromQL syntax check: balanced parens/braces/brackets."""
    if not query.strip():
        return False
    # Must contain at least one metric-like token or function call
    if not re.search(r'[a-zA-Z_][a-zA-Z0-9_]*', query):
        return False
    # Check balanced delimiters
    pairs = {')': '(', '}': '{', ']': '['}
    stack = []
    for ch in query:
        if ch in '({[':
            stack.append(ch)
        elif ch in ')}]':
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return len(stack) == 0


def _check_logql_syntax(query: str) -> bool:
    """LogQL must start with a stream selector {label="value"}."""
    if not query.strip():
        return False
    return bool(re.match(r'\s*\{[^}]+\}', query.strip()))


def _check_traceql_syntax(query: str) -> bool:
    """TraceQL must start with { and contain a condition."""
    if not query.strip():
        return False
    return bool(re.match(r'\s*\{.*\}', query.strip()))


_SYNTAX_CHECKERS = {
    QLType.PROMQL: _check_promql_syntax,
    QLType.LOGQL: _check_logql_syntax,
    QLType.TRACEQL: _check_traceql_syntax,
}


def _check_syntax(query: str, ql_type: QLType) -> bool:
    return _SYNTAX_CHECKERS[ql_type](query)


# ---- Semantic comparison ----

def _extract_promql_components(query: str) -> dict:
    """Extract semantic components from a PromQL query."""
    metrics = set(re.findall(r'([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\{|\[|\s|$)', query))
    # Filter out function names (before parentheses with no brace)
    known_funcs = {'sum', 'rate', 'avg', 'max', 'min', 'histogram_quantile',
                   'increase', 'irate', 'count', 'by', 'without', 'le', 'or', 'and', 'unless'}
    metrics -= known_funcs
    labels = re.findall(r'(\w+)="([^"]*)"', query)
    durations = re.findall(r'\[(\d+[smhd])\]', query)
    return {
        "metrics": metrics,
        "labels": {k: v for k, v in labels},
        "durations": set(durations),
    }


def _extract_logql_components(query: str) -> dict:
    """Extract semantic components from a LogQL query."""
    stream_labels = re.findall(r'(\w+)="([^"]*)"', query)
    keywords = re.findall(r'\|=\s*"([^"]*)"', query)
    return {
        "stream_labels": {k: v for k, v in stream_labels},
        "keywords": set(kw.lower() for kw in keywords),
    }


def _extract_traceql_components(query: str) -> dict:
    """Extract semantic components from a TraceQL query."""
    service = re.search(r'service\.name\s*=\s*"([^"]*)"', query)
    duration = re.search(r'duration\s*>\s*(\d+(?:ms|s|m))', query)
    status = re.search(r'status\s*=\s*(\w+)', query)
    span_name = re.search(r'span\.name\s*=~?\s*"([^"]*)"', query)
    span_kind = re.search(r'span\.kind\s*=\s*(\w+)', query)
    return {
        "service": service.group(1) if service else None,
        "duration": duration.group(1) if duration else None,
        "status": status.group(1) if status else None,
        "span_name": span_name.group(1) if span_name else None,
        "span_kind": span_kind.group(1) if span_kind else None,
    }


_EXTRACTORS = {
    QLType.PROMQL: _extract_promql_components,
    QLType.LOGQL: _extract_logql_components,
    QLType.TRACEQL: _extract_traceql_components,
}


def _compare_promql(generated: dict, expected: dict) -> tuple[bool, str]:
    """Compare PromQL semantic components."""
    notes = []
    # Check metrics overlap
    gen_metrics = generated["metrics"]
    exp_metrics = expected["metrics"]
    if gen_metrics != exp_metrics:
        missing = exp_metrics - gen_metrics
        extra = gen_metrics - exp_metrics
        if missing:
            notes.append(f"missing metrics: {missing}")
        if extra:
            notes.append(f"extra metrics: {extra}")

    # Check label values (especially service and status)
    for key in ["service", "status", "code"]:
        exp_val = expected["labels"].get(key)
        gen_val = generated["labels"].get(key)
        if exp_val and exp_val != gen_val:
            notes.append(f"label {key}: expected '{exp_val}', got '{gen_val}'")

    # Check time window
    if generated["durations"] != expected["durations"]:
        notes.append(f"time window mismatch: expected {expected['durations']}, got {generated['durations']}")

    match = len(notes) == 0
    return match, "; ".join(notes) if notes else "exact match"


def _compare_logql(generated: dict, expected: dict) -> tuple[bool, str]:
    """Compare LogQL semantic components."""
    notes = []
    # Check service in stream selector
    gen_svc = generated["stream_labels"].get("service")
    exp_svc = expected["stream_labels"].get("service")
    if gen_svc != exp_svc:
        notes.append(f"service: expected '{exp_svc}', got '{gen_svc}'")

    # Check keywords (case-insensitive)
    gen_kw = generated["keywords"]
    exp_kw = expected["keywords"]
    if gen_kw != exp_kw:
        missing = exp_kw - gen_kw
        if missing:
            notes.append(f"missing keywords: {missing}")

    match = len(notes) == 0
    return match, "; ".join(notes) if notes else "exact match"


def _compare_traceql(generated: dict, expected: dict) -> tuple[bool, str]:
    """Compare TraceQL semantic components."""
    notes = []
    for key in ["service", "duration", "status", "span_name", "span_kind"]:
        if expected.get(key) and expected[key] != generated.get(key):
            notes.append(f"{key}: expected '{expected[key]}', got '{generated.get(key)}'")

    match = len(notes) == 0
    return match, "; ".join(notes) if notes else "exact match"


_COMPARATORS = {
    QLType.PROMQL: _compare_promql,
    QLType.LOGQL: _compare_logql,
    QLType.TRACEQL: _compare_traceql,
}


def _grade_for_score(score: float) -> ScoreGrade:
    if score >= 1.0:
        return ScoreGrade.PERFECT
    elif score >= 0.7:
        return ScoreGrade.GOOD
    elif score >= 0.3:
        return ScoreGrade.PARTIAL
    return ScoreGrade.FAIL


def evaluate(generated: GeneratedQL, sample: FaultSample) -> EvaluationResult:
    """Evaluate a generated query against the expected ground truth."""
    ql_type = generated.ql_type

    # Step 1: Syntax check
    syntax_ok = _check_syntax(generated.query, ql_type)
    if not syntax_ok:
        return EvaluationResult(
            sample_id=generated.sample_id,
            ql_type=ql_type,
            score=0.0,
            grade=ScoreGrade.FAIL,
            syntax_ok=False,
            semantic_match=False,
            notes=f"syntax check failed for {ql_type.value}",
        )

    # Step 2: Semantic comparison
    extractor = _EXTRACTORS[ql_type]
    comparator = _COMPARATORS[ql_type]

    gen_components = extractor(generated.query)
    exp_components = extractor(sample.expected_query)
    semantic_match, notes = comparator(gen_components, exp_components)

    # Step 3: Score
    if semantic_match:
        score = 1.0
    elif syntax_ok:
        # Partial credit for valid syntax but wrong semantics
        score = 0.3
    else:
        score = 0.0

    return EvaluationResult(
        sample_id=generated.sample_id,
        ql_type=ql_type,
        score=score,
        grade=_grade_for_score(score),
        syntax_ok=True,
        semantic_match=semantic_match,
        notes=notes,
    )
