# Implementation Tasks — MVP Core Loop

## T1: ToolSpec base + ToolResult models
**Module**: `backend/app/tools/base.py`
**TDD**: Yes — unit test schema conversion, ToolResult fields
**ADR**: ADR-003
- [x] Write tests: ToolResult validation, ToolSpec.to_openai_schema(), abstract execute()
- [x] Implement ToolSpec abstract base (Pydantic v2)
- [x] Implement ToolResult model (success, data, error, latency_ms, cached)
- [x] Implement to_openai_schema() conversion method
- [x] Verify: mypy --strict + ruff + pytest pass

## T2: QL validators (PromQL / LogQL / TraceQL)
**Module**: `backend/app/tools/ql/validators.py`
**TDD**: Yes — unit test valid/invalid QL strings for each language
**ADR**: ADR-004 (layer 3)
**Parallelizable**: Yes (independent from T1)
- [x] Write tests: valid PromQL passes, invalid PromQL rejected with details
- [x] Write tests: valid LogQL passes, invalid LogQL rejected
- [x] Write tests: valid TraceQL passes, invalid TraceQL rejected
- [x] Implement validate_promql()
- [x] Implement validate_logql()
- [x] Implement validate_tracel()
- [x] Implement validate_ql(tool_name, query) → ValidationResult

## T3: MimirTool (PromQL execution)
**Module**: `backend/app/tools/mimir.py`
**TDD**: Yes — unit test with httpx MockTransport
**ADR**: ADR-002, ADR-005
**Parallelizable**: Yes (depends only on T1)
**Depends**: T1
- [x] Write tests: successful query returns normalized data, timeout returns error, 5xx returns error
- [x] Implement MimirTool(ToolSpec) with async execute()
- [x] Implement HTTPX async GET with timeout
- [x] Implement response normalization
- [x] Verify never raises (returns ToolResult)

## T4: LokiTool (LogQL execution)
**Module**: `backend/app/tools/loki.py`
**TDD**: Yes — unit test with httpx MockTransport
**ADR**: ADR-002, ADR-005
**Parallelizable**: Yes
**Depends**: T1
- [x] Write tests: query returns log lines, max_lines enforced, timeout/5xx handled
- [x] Implement LokiTool(ToolSpec)
- [x] Implement log sampling (max_lines config)

## T5: TempoTool (TraceQL execution)
**Module**: `backend/app/tools/tempo.py`
**TDD**: Yes — unit test with httpx MockTransport
**ADR**: ADR-002, ADR-005
**Parallelizable**: Yes
**Depends**: T1
- [x] Write tests: query returns spans, span extraction correct, timeout/5xx handled
- [x] Implement TempoTool(ToolSpec)
- [x] Implement span data extraction

## T6: SafeToolExecutor (four-layer wrapper)
**Module**: `backend/app/agent/safe_executor.py`
**TDD**: Yes — unit test each layer, integration test full pipeline
**ADR**: ADR-004, ADR-005
**Depends**: T1, T2, T3 (or T4/T5 for integration)
- [x] Write tests: budget precheck blocks when exhausted
- [x] Write tests: cache hit returns cached result
- [x] Write tests: invalid QL blocked before execution
- [x] Write tests: self-heal retries on failure then gives up gracefully
- [x] Write tests: never raises to caller
- [x] Implement BudgetExhausted exception + BudgetTracker
- [x] Implement cache layer (cachetools.TTLCache)
- [x] Implement L3 validation dispatch
- [x] Implement L4 execute + self-heal loop
- [x] Integration test: full 4-layer pipeline with mocked tool

## T7: Agent tool-calling loop
**Module**: `backend/app/agent/loop.py`
**TDD**: Yes — integration test with mocked openai client
**ADR**: ADR-001, ADR-005
**Depends**: T6
- [x] Write tests: loop runs, calls tools, stops on finish_reason=stop
- [x] Write tests: budget exhaustion triggers partial RCA
- [x] Write tests: SSE events emitted for each step
- [x] Write tests: tool result fed back as tool role message
- [x] Implement run_loop() async generator yielding SSEEvent
- [x] Implement budget tracking within loop
- [x] Implement partial RCA generation on budget exhaustion

## T8: API routes + SSE streaming
**Module**: `backend/app/api/routes.py`
**TDD**: Yes — unit test with FastAPI TestClient
**ADR**: ADR-005
**Depends**: T7
- [x] Write tests: POST /api/chat creates session, returns session_id
- [x] Write tests: GET /api/session/{id}/stream returns SSE events
- [x] Write tests: GET /api/session/{id} returns status
- [x] Write tests: error response never 500
- [x] Implement POST /api/chat route
- [x] Implement GET /api/session/{id}/stream (sse-starlette EventSourceResponse)
- [x] Implement GET /api/session/{id} status route
- [x] Implement in-memory SessionStore

## T9: Integration smoke test
**Module**: `backend/tests/integration/test_full_loop.py`
**ADR**: ADR-001, ADR-004, ADR-005
**Depends**: T8
- [x] Write integration test: NL message → mock LLM → mock Mimir → RCA output
- [x] Test partial RCA path (budget exhaustion)
- [x] Test self-heal path (bad QL → correction → success)
- [x] Verify quality gate: ruff + mypy --strict + pytest --cov-fail-under=80
