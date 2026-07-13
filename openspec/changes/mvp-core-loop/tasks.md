# Implementation Tasks — MVP Core Loop

## T1: ToolSpec base + ToolResult models
**Module**: `backend/app/tools/base.py`
**TDD**: Yes — unit test schema conversion, ToolResult fields
**ADR**: ADR-003
- [ ] Write tests: ToolResult validation, ToolSpec.to_openai_schema(), abstract execute()
- [ ] Implement ToolSpec abstract base (Pydantic v2)
- [ ] Implement ToolResult model (success, data, error, latency_ms, cached)
- [ ] Implement to_openai_schema() conversion method
- [ ] Verify: mypy --strict + ruff + pytest pass

## T2: QL validators (PromQL / LogQL / TraceQL)
**Module**: `backend/app/tools/ql/validators.py`
**TDD**: Yes — unit test valid/invalid QL strings for each language
**ADR**: ADR-004 (layer 3)
**Parallelizable**: Yes (independent from T1)
- [ ] Write tests: valid PromQL passes, invalid PromQL rejected with details
- [ ] Write tests: valid LogQL passes, invalid LogQL rejected
- [ ] Write tests: valid TraceQL passes, invalid TraceQL rejected
- [ ] Implement validate_promql()
- [ ] Implement validate_logql()
- [ ] Implement validate_tracel()
- [ ] Implement validate_ql(tool_name, query) → ValidationResult

## T3: MimirTool (PromQL execution)
**Module**: `backend/app/tools/mimir.py`
**TDD**: Yes — unit test with httpx MockTransport
**ADR**: ADR-002, ADR-005
**Parallelizable**: Yes (depends only on T1)
**Depends**: T1
- [ ] Write tests: successful query returns normalized data, timeout returns error, 5xx returns error
- [ ] Implement MimirTool(ToolSpec) with async execute()
- [ ] Implement HTTPX async GET with timeout
- [ ] Implement response normalization
- [ ] Verify never raises (returns ToolResult)

## T4: LokiTool (LogQL execution)
**Module**: `backend/app/tools/loki.py`
**TDD**: Yes — unit test with httpx MockTransport
**ADR**: ADR-002, ADR-005
**Parallelizable**: Yes
**Depends**: T1
- [ ] Write tests: query returns log lines, max_lines enforced, timeout/5xx handled
- [ ] Implement LokiTool(ToolSpec)
- [ ] Implement log sampling (max_lines config)

## T5: TempoTool (TraceQL execution)
**Module**: `backend/app/tools/tempo.py`
**TDD**: Yes — unit test with httpx MockTransport
**ADR**: ADR-002, ADR-005
**Parallelizable**: Yes
**Depends**: T1
- [ ] Write tests: query returns spans, span extraction correct, timeout/5xx handled
- [ ] Implement TempoTool(ToolSpec)
- [ ] Implement span data extraction

## T6: SafeToolExecutor (four-layer wrapper)
**Module**: `backend/app/agent/safe_executor.py`
**TDD**: Yes — unit test each layer, integration test full pipeline
**ADR**: ADR-004, ADR-005
**Depends**: T1, T2, T3 (or T4/T5 for integration)
- [ ] Write tests: budget precheck blocks when exhausted
- [ ] Write tests: cache hit returns cached result
- [ ] Write tests: invalid QL blocked before execution
- [ ] Write tests: self-heal retries on failure then gives up gracefully
- [ ] Write tests: never raises to caller
- [ ] Implement BudgetExhausted exception + BudgetTracker
- [ ] Implement cache layer (cachetools.TTLCache)
- [ ] Implement L3 validation dispatch
- [ ] Implement L4 execute + self-heal loop
- [ ] Integration test: full 4-layer pipeline with mocked tool

## T7: Agent tool-calling loop
**Module**: `backend/app/agent/loop.py`
**TDD**: Yes — integration test with mocked openai client
**ADR**: ADR-001, ADR-005
**Depends**: T6
- [ ] Write tests: loop runs, calls tools, stops on finish_reason=stop
- [ ] Write tests: budget exhaustion triggers partial RCA
- [ ] Write tests: SSE events emitted for each step
- [ ] Write tests: tool result fed back as tool role message
- [ ] Implement run_loop() async generator yielding SSEEvent
- [ ] Implement budget tracking within loop
- [ ] Implement partial RCA generation on budget exhaustion

## T8: API routes + SSE streaming
**Module**: `backend/app/api/routes.py`
**TDD**: Yes — unit test with FastAPI TestClient
**ADR**: ADR-005
**Depends**: T7
- [ ] Write tests: POST /api/chat creates session, returns session_id
- [ ] Write tests: GET /api/session/{id}/stream returns SSE events
- [ ] Write tests: GET /api/session/{id} returns status
- [ ] Write tests: error response never 500
- [ ] Implement POST /api/chat route
- [ ] Implement GET /api/session/{id}/stream (sse-starlette EventSourceResponse)
- [ ] Implement GET /api/session/{id} status route
- [ ] Implement in-memory SessionStore

## T9: Integration smoke test
**Module**: `backend/tests/integration/test_full_loop.py`
**ADR**: ADR-001, ADR-004, ADR-005
**Depends**: T8
- [ ] Write integration test: NL message → mock LLM → mock Mimir → RCA output
- [ ] Test partial RCA path (budget exhaustion)
- [ ] Test self-heal path (bad QL → correction → success)
- [ ] Verify quality gate: ruff + mypy --strict + pytest --cov-fail-under=80
