"""QL syntax validators for PromQL / LogQL / TraceQL (ADR-004 layer 3).

These run before tool execution to catch syntax errors cheaply (<5ms, no
network). Invalid QL is fed back to the LLM by SafeToolExecutor for self-heal.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ValidationResult:
    """Result of a QL syntax validation check."""

    valid: bool
    error: str = ""


# --- PromQL ---


def validate_promql(query: str) -> ValidationResult:
    """Validate PromQL syntax using structural heuristics.

    Not a full parser — catches common LLM mistakes: unbalanced brackets,
    SQL-like statements, empty queries.
    """
    q = query.strip()
    if not q:
        return ValidationResult(False, "empty query")

    # Reject SQL-like patterns
    if re.match(r"(?i)^\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s", q):
        return ValidationResult(False, "looks like SQL, not PromQL")

    # Check bracket balance
    if not _brackets_balanced(q):
        return ValidationResult(False, "unbalanced brackets/braces/parens")

    return ValidationResult(True)


# --- LogQL ---


def validate_logql(query: str) -> ValidationResult:
    """Validate LogQL syntax: stream selectors, pipe filters, metric queries."""
    q = query.strip()
    if not q:
        return ValidationResult(False, "empty query")

    # Reject SQL
    if re.match(r"(?i)^\s*(SELECT|INSERT|UPDATE|DELETE)\s", q):
        return ValidationResult(False, "looks like SQL, not LogQL")

    # Must start with { or aggregation function
    valid_starts = ("{", "rate(", "count(", "sum(", "avg(", "max(", "min(")
    if not q.startswith(valid_starts):
        return ValidationResult(
            False, "must start with stream selector {} or aggregation function"
        )

    # Check bracket balance
    if not _brackets_balanced(q):
        return ValidationResult(False, "unbalanced brackets/braces/quotes")

    return ValidationResult(True)


# --- TraceQL ---


def validate_tracel(query: str) -> ValidationResult:
    """Validate TraceQL syntax: attribute comparisons within braces."""
    q = query.strip()
    if not q:
        return ValidationResult(False, "empty query")

    # Reject SQL
    if re.match(r"(?i)^\s*(SELECT|INSERT|UPDATE|DELETE)\s", q):
        return ValidationResult(False, "looks like SQL, not TraceQL")

    # Must start with { for span filter
    if not q.startswith("{"):
        return ValidationResult(False, "must start with { } span filter")

    # Check bracket balance
    if not _brackets_balanced(q):
        return ValidationResult(False, "unbalanced brackets/braces/parens")

    return ValidationResult(True)


# --- Dispatcher ---


def validate_ql(tool_name: str, query: str) -> ValidationResult:
    """Dispatch validation based on tool name.

    Unknown tools pass validation (skip — SafeToolExecutor handles raw errors).
    """
    validators = {
        "mimir": validate_promql,
        "loki": validate_logql,
        "tempo": validate_tracel,
    }
    validator = validators.get(tool_name.lower())
    if validator is None:
        return ValidationResult(True)
    return validator(query)


# --- Helpers ---


def _brackets_balanced(s: str) -> bool:
    """Check that brackets, braces, parens, and double-quotes are balanced."""
    # Quotes must be even count
    if s.count('"') % 2 != 0:
        return False

    stack: list[str] = []
    opening = "([{"
    closing = ")]}"
    match = dict(zip(closing, opening, strict=True))

    in_string = False
    for ch in s:
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in opening:
            stack.append(ch)
        elif ch in closing:
            if not stack or stack[-1] != match[ch]:
                return False
            stack.pop()

    return len(stack) == 0
