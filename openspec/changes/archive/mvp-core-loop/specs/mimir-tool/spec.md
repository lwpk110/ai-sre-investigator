## Requirements

### REQ-001: PromQL execution
MimirTool SHALL execute PromQL queries against the configured Mimir URL via HTTPX async GET with timeout.

### REQ-002: Result normalization
MimirTool SHALL normalize the Mimir API response into a ToolResult.data dict containing metric values, timestamps, and labels.

### REQ-003: Timeout handling
MimirTool SHALL use settings.http_timeout_seconds for all HTTPX calls. On timeout, return ToolResult(success=False, error="timeout").

### REQ-004: 5xx error handling
On HTTP 5xx, MimirTool SHALL return ToolResult(success=False, error=...) rather than raising.

## Constraints
- ADR-005: All HTTPX calls need timeout, 5xx caught not thrown
- ADR-002: Read-only GET only
