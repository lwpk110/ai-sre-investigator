## Requirements

### REQ-001: Budget precheck (L1)
SafeToolExecutor SHALL check token budget and call count before each tool execution. If exhausted, raise BudgetExhausted exception.

### REQ-002: Cache layer (L2)
SafeToolExecutor SHALL cache ToolResult by hash of (tool.name + params). Cache hit returns ToolResult with cached=True.

### REQ-003: QL validation (L3)
SafeToolExecutor SHALL run the appropriate QL validator before execution. Invalid QL skips execution and feeds error to self-heal.

### REQ-004: Self-heal retry (L4)
On tool execution failure (network, 5xx, invalid QL), SafeToolExecutor SHALL feed the error back to the LLM for correction, up to max_self_heal_attempts. After max attempts, return ToolResult(success=False).

### REQ-005: Never raise to client
SafeToolExecutor SHALL never raise exceptions to the agent loop — all failures return ToolResult(success=False).

## Constraints
- ADR-004: Four-layer pipeline
- ADR-005: Graceful failure
- Cache config from settings (cache_maxsize, cache_ttl_near_realtime, cache_ttl_historical)
