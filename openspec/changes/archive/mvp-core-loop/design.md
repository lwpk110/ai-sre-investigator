## Context

Spike validated PromQL generation at 93% accuracy and 100% syntax pass rate using the openai SDK native tool-calling. ADRs 001-006 define architecture constraints. No backend code exists beyond `config.py` and empty `__init__.py` files. This design covers the MVP closed-loop: NL input → QL generation → tool execution → RCA output.

## Goals / Non-Goals

**Goals:**
- Run the full NL → QL → execute → RCA loop end-to-end with mocked backends
- All tools route through SafeToolExecutor (budget → cache → validate → self-heal)
- SSE streaming of agent reasoning steps to the client
- Partial RCA on budget exhaustion (ADR-005)
- TDD: every module has unit tests, integration tests mock all backends

**Non-Goals:**
- Frontend (Next.js deferred)
- Persistent storage (in-memory session store only)
- Authentication / authorization
- Knowledge base / pattern matching
- Caching of QL results across sessions

## Decisions

### D1: ToolSpec as Pydantic v2 models (ADR-003)

```python
class ToolSpec(ABC, BaseModel):
    name: str
    description: str
    parameters: Type[BaseModel]  # converted to LLM JSON schema

    @abstractmethod
    async def execute(self, params: BaseModel) -> ToolResult: ...
```

Each concrete tool (MimirTool, LokiTool, TempoTool) extends ToolSpec. The SafeToolExecutor wraps `execute()` with four layers. The agent loop receives `ToolSpec` instances and converts them to OpenAI `tools` JSON schema via `model_json_schema()`.

### D2: SafeToolExecutor four-layer pipeline (ADR-004)

```
call(tool, params)
  → L1: Budget precheck (token + call count, throw BudgetExhausted)
  → L2: Cache lookup (hash of tool.name + params, return cached ToolResult)
  → L3: QL validate (syntax check, reject invalid before network call)
  → L4: Execute + self-heal (try → on failure, feed error to LLM for fix → retry)
```

On L4 failure after max_self_heal_attempts, return `ToolResult(success=False, error=...)` — never raise.

### D3: Agent loop with openai SDK native (ADR-001)

```python
async def run_loop(messages, tools, executor):
    while budget_remaining:
        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            tools=[t.to_openai_schema() for t in tools],
        )
        if response.choices[0].finish_reason == "stop":
            break  # RCA complete
        for tool_call in response.choices[0].message.tool_calls:
            yield SSEEvent(type="tool_call", data=...)
            result = await executor.call(tool, params)
            yield SSEEvent(type="tool_result", data=...)
            messages.append(tool_result_message)
```

### D4: SSE streaming via sse-starlette

Each agent step (tool call, tool result, reasoning, RCA generation) emits an SSE event. Client subscribes via `GET /api/session/{id}/stream`. Events: `thinking`, `tool_call`, `tool_result`, `heal_attempt`, `budget_update`, `rca_partial`, `rca_complete`, `error`.

### D5: Graceful failure (ADR-005)

All HTTPX calls use `timeout=settings.http_timeout_seconds`. On 5xx or timeout, the error is wrapped in `ToolResult(success=False, error=str)` and fed back to the LLM as a tool result — the agent can adapt and try a different query. Budget exhaustion triggers partial RCA generation with existing evidence.

## Risks / Trade-offs

- **LLM model dependency**: The loop depends on the configured model's tool-calling quality. MiniMax-M3 is configured but untested for tool-calling. Mitigation: self-heal layer catches bad QL.
- **In-memory session store**: Sessions lost on restart. Acceptable for MVP.
- **No rate limiting**: Agent could hammer backends. Mitigation: budget precheck limits total calls.
- **Mock-only testing**: Real Mimir/Loki/Tempo not available in CI. Acceptable — integration tests use httpx.MockTransport.
