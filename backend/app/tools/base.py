"""ToolSpec abstract base + ToolResult models (ADR-003).

All tools in the system extend ToolSpec. The SafeToolExecutor wraps execute()
with budget, cache, validation, and self-heal layers (ADR-004).
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, ConfigDict


class ToolResult(BaseModel):
    """Standard result from any tool execution.

    Attributes:
        success: Whether execution succeeded.
        data: Normalized result data on success.
        error: Error message on failure (None on success).
        latency_ms: Execution time in milliseconds.
        cached: Whether this result came from cache (SafeToolExecutor L2).
    """

    model_config = ConfigDict(frozen=False)

    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None
    latency_ms: int = 0
    cached: bool = False


class ToolSpec(ABC, BaseModel):
    """Abstract base for all observability tools.

    Each concrete tool defines its parameters as a Pydantic v2 model and
    implements async execute(). The SafeToolExecutor wraps all calls.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str
    description: str
    parameters: type[BaseModel]

    @abstractmethod
    async def execute(self, params: BaseModel) -> ToolResult:
        """Execute the tool and return a ToolResult.

        Must never raise — all errors return ToolResult(success=False).
        (ADR-005: graceful failure)
        """
        ...

    def to_openai_schema(self) -> dict[str, Any]:
        """Convert this tool to OpenAI tool-calling JSON schema format.

        Uses the parameters model's JSON schema for the function arguments.
        """
        params_schema = self.parameters.model_json_schema()
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": params_schema,
            },
        }


class _Timer:
    """Context manager for measuring execution latency."""

    def __init__(self) -> None:
        self.ms: int = 0

    def __enter__(self) -> _Timer:
        self._start = time.monotonic()
        return self

    def __exit__(self, *exc: object) -> None:
        self.ms = int((time.monotonic() - self._start) * 1000)
