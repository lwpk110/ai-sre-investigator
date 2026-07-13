## Requirements

### REQ-001: TraceQL execution
TempoTool SHALL execute TraceQL queries against the configured Tempo URL via HTTPX async GET with timeout.

### REQ-002: Span extraction
TempoTool SHALL extract span data (operation name, duration, service, status) from traces into ToolResult.data.

### REQ-003: Timeout and error handling
Same as mimir-tool REQ-003 and REQ-004.

## Constraints
- ADR-005: Timeout + 5xx handling
- ADR-002: Read-only
