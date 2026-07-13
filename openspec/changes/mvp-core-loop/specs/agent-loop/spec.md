## Requirements

### REQ-001: Native tool-calling loop
The agent loop SHALL use openai SDK chat.completions.create with tools parameter (not function_call). Loop continues until finish_reason="stop" or budget exhausted.

### REQ-002: SSE event emission
Each step of the loop SHALL emit an SSE event: thinking, tool_call, tool_result, heal_attempt, budget_update.

### REQ-003: Budget tracking
The loop SHALL track cumulative tokens and tool calls, stopping when either limit is reached.

### REQ-004: Partial RCA on budget exhaustion
When budget is exhausted mid-loop, the loop SHALL generate a partial RCA from accumulated evidence with a warning about missing data.

### REQ-005: Tool result feedback
Each ToolResult (success or failure) SHALL be appended to the message history as a tool role message, so the LLM can adapt.

## Constraints
- ADR-001: openai SDK native only, no agent frameworks
- ADR-005: Graceful failure, partial RCA
