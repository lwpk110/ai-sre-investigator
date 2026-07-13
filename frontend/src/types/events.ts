// SSE 事件类型定义 — 与后端 backend/app/agent/events.py 对齐

export type SSEEventType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "heal_attempt"
  | "budget_update"
  | "rca_partial"
  | "rca_complete"
  | "error";

export interface BaseSSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
}

export interface ThinkingEvent extends BaseSSEEvent {
  type: "thinking";
  data: { text: string };
}

export interface ToolCallEvent extends BaseSSEEvent {
  type: "tool_call";
  data: { tool: string; params: Record<string, unknown> };
}

export interface ToolResultEvent extends BaseSSEEvent {
  type: "tool_result";
  data: {
    tool: string;
    success: boolean;
    data: Record<string, unknown> | null;
    error: string | null;
    latency_ms: number;
    cached: boolean;
  };
}

export interface BudgetUpdateEvent extends BaseSSEEvent {
  type: "budget_update";
  data: {
    tokens_used: number;
    tokens_max: number;
    calls_used: number;
    calls_max: number;
  };
}

export interface RCACompleteEvent extends BaseSSEEvent {
  type: "rca_complete";
  data: { report: string; confidence: "high" | "medium" | "low" };
}

export interface RCAPartialEvent extends BaseSSEEvent {
  type: "rca_partial";
  data: {
    report: string;
    missing: string[];
    confidence: "low";
    suggestions?: string[];
  };
}

export interface ErrorEvent extends BaseSSEEvent {
  type: "error";
  data: { message: string };
}

export type SSEEvent =
  | ThinkingEvent
  | ToolCallEvent
  | ToolResultEvent
  | BudgetUpdateEvent
  | RCACompleteEvent
  | RCAPartialEvent
  | ErrorEvent;

// 会话状态
export type SessionStatus = "created" | "running" | "completed" | "error";

export interface Session {
  session_id: string;
  message: string;
  status: SessionStatus;
  created_at: number;
  events: SSEEvent[];
  rca_report: string | null;
  rca_confidence: "high" | "medium" | "low" | null;
  is_partial: boolean;
  missing_queries: string[];
  suggestions: string[];
  followup_count: number;
}

// 预算信息
export interface BudgetInfo {
  tokens_used: number;
  tokens_max: number;
  calls_used: number;
  calls_max: number;
}
