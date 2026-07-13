## Requirements

### REQ-001: PromQL validation
The system SHALL validate PromQL syntax before execution using a lightweight parser. Invalid syntax returns ValidationError with details.

### REQ-002: LogQL validation
The system SHALL validate LogQL syntax — check for balanced braces, valid operators, presence of stream selector.

### REQ-003: TraceQL validation
The system SHALL validate TraceQL syntax — check for valid attribute comparisons and logical operators.

### REQ-004: Non-blocking validation
Validation failures SHALL return a structured error (not raise) so SafeToolExecutor can feed it to the LLM for self-heal.

## Constraints
- ADR-004: Layer 3 of SafeToolExecutor
- Validation must be fast (<5ms, no network calls)
