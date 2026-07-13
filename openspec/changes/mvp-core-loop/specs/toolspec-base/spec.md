## Requirements

### REQ-001: ToolSpec abstract base
The system SHALL provide an abstract ToolSpec class that all tools extend, defining name, description, and a Pydantic v2 parameters model.

### REQ-002: ToolResult model
The system SHALL provide a ToolResult Pydantic v2 model with fields: success (bool), data (dict|None), error (str|None), latency_ms (int), cached (bool).

### REQ-003: OpenAI schema conversion
ToolSpec SHALL provide a method to convert itself to OpenAI tool-calling JSON schema format using model_json_schema().

### REQ-004: Async execution
ToolSpec.execute() SHALL be async and return ToolResult.

## Constraints
- ADR-003: All tools extend ToolSpec
- ADR-002: Read-only — execute() must never modify external state
- Pydantic v2 only (no v1 compat)
