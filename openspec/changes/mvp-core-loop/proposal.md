## Why

The project has validated QL generation accuracy (PromQL 93%, syntax 100%) in a spike, but has zero backend implementation. The core value proposition — "natural language → accurate QL → useful RCA" — has never run end-to-end. This change delivers the MVP closed loop: a user types a fault description, the Agent translates it into PromQL/LogQL/TraceQL, executes queries against Mimir/Loki/Tempo via SafeToolExecutor, and produces a structured RCA report.

## What Changes

This is a greenfield implementation of the entire backend MVP. All modules are new:

1. **ToolSpec base + Mimir/Loki/Tempo tool clients** — Pydantic v2 models for tool definition, HTTPX async clients with timeout, read-only execution.
2. **QL validators** — syntax pre-check for PromQL/LogQL/TraceQL before execution (self-heal layer 3).
3. **SafeToolExecutor** — four-layer wrapper: budget precheck → cache → QL validate → self-heal retry.
4. **Agent tool-calling loop** — openai SDK native `tool_calls`, multi-step reasoning, budget tracking.
5. **API layer** — FastAPI routes: `POST /api/chat` (create session), `GET /api/session/{id}/stream` (SSE progress).
6. **Session/state management** — in-memory session store, SSE event stream.

## Capabilities

### New Capabilities
- `toolspec-base`: ToolSpec abstract base + ToolResult models, tool registration, LLM JSON schema conversion
- `mimir-tool`: PromQL query execution against Mimir with timeout, result normalization
- `loki-tool`: LogQL query execution against Loki with timeout, log sampling
- `tempo-tool`: TraceQL query execution against Tempo with timeout, span extraction
- `ql-validators`: Syntax validation for PromQL/LogQL/TraceQL before execution
- `safe-executor`: Four-layer SafeToolExecutor wrapping all tool calls
- `agent-loop`: Tool-calling loop using openai SDK native, budget tracking, SSE event emission
- `api-routes`: FastAPI HTTP routes for session creation and SSE streaming

### Modified Capabilities

## Impact

- **New code**: `backend/app/tools/`, `backend/app/agent/`, `backend/app/api/` — all greenfield
- **Dependencies**: openai SDK, httpx, fastapi, pydantic v2 (already in pyproject.toml)
- **ADRs**: Implements ADR-001 (native tool calling), ADR-002 (read-only), ADR-003 (ToolSpec), ADR-004 (SafeToolExecutor), ADR-005 (graceful failure)
- **Non-goals**: No frontend, no persistence (in-memory only), no auth, no knowledge base
