## Requirements

### REQ-001: LogQL execution
LokiTool SHALL execute LogQL queries against the configured Loki URL via HTTPX async GET with timeout.

### REQ-002: Log sampling
LokiTool SHALL limit returned log lines to a configurable max (default 100) to control response size.

### REQ-003: Timeout and error handling
Same as mimir-tool REQ-003 and REQ-004.

## Constraints
- ADR-005: Timeout + 5xx handling
- ADR-002: Read-only
