## Requirements

### REQ-001: Create session
POST /api/chat SHALL accept {message: str} and return {session_id: str}. Creates a new investigation session.

### REQ-002: SSE stream
GET /api/session/{id}/stream SHALL return a text/event-stream of agent progress events until the session completes.

### REQ-003: Session status
GET /api/session/{id} SHALL return the current session state: status (pending|running|completed|partial|failed), step_count, budget_used.

### REQ-004: Error response
On internal errors, the API SHALL return JSON {error: str} with appropriate HTTP status, never a raw 500.

## Constraints
- FastAPI + sse-starlette
- ADR-005: Never throw 500 to client
