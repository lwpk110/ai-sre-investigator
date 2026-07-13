// API 客户端 — 与后端 FastAPI 路由通信

import type { SSEEvent, BudgetInfo } from "@/types/events";

/** 创建排查会话 */
export async function createSession(message: string): Promise<string> {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`创建会话失败 (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  return data.session_id as string;
}

/** 获取会话状态 */
export async function getSessionStatus(
  sessionId: string
): Promise<{ status: string; tokens_used: number; tool_calls: number } | null> {
  const resp = await fetch(`/api/session/${sessionId}`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`获取状态失败 (${resp.status})`);
  return resp.json();
}

/**
 * 连接 SSE 流，回调处理每个事件
 * 使用 fetch + ReadableStream 而非 EventSource（兼容性更好）
 */
export async function streamSession(
  sessionId: string,
  onEvent: (event: SSEEvent) => void,
  onError: (error: string) => void,
  onClose: () => void
): Promise<void> {
  try {
    const resp = await fetch(`/api/session/${sessionId}/stream`, {
      headers: { Accept: "text/event-stream" },
    });

    if (!resp.ok) {
      onError(`连接失败 (${resp.status})`);
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      onError("无法读取响应流");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 格式: event: xxx\ndata: xxx\n\n
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          currentData = line.slice(5).trim();
        } else if (line === "" && currentData) {
          // 空行 = 事件边界
          try {
            const parsed = JSON.parse(currentData);
            onEvent(parsed as SSEEvent);
          } catch {
            // 忽略解析失败的事件
          }
          currentEvent = "";
          currentData = "";
        }
      }
    }

    onClose();
  } catch (err) {
    onError(err instanceof Error ? err.message : "未知错误");
  }
}
