import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "../Timeline";
import type { SSEEvent } from "@/types/events";

describe("Timeline", () => {
  it("空事件列表时不渲染", () => {
    const { container } = render(<Timeline events={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("渲染 thinking 事件", () => {
    const events: SSEEvent[] = [
      { type: "thinking", data: { text: "分析中..." } },
    ];
    render(<Timeline events={events} />);
    expect(screen.getByText("分析中...")).toBeInTheDocument();
  });

  it("渲染 error 事件", () => {
    const events: SSEEvent[] = [
      { type: "error", data: { message: "连接超时" } },
    ];
    render(<Timeline events={events} />);
    expect(screen.getByText("连接超时")).toBeInTheDocument();
  });

  it("渲染 tool_call 事件并显示探针名", () => {
    const events: SSEEvent[] = [
      {
        type: "tool_call",
        data: {
          tool: "mimir",
          params: { query: "rate(http_requests_total[5m])" },
        },
      },
    ];
    render(<Timeline events={events} />);
    expect(screen.getByText("mimir")).toBeInTheDocument();
  });

  it("渲染 tool_result 成功事件", () => {
    const events: SSEEvent[] = [
      {
        type: "tool_result",
        data: {
          tool: "loki",
          success: true,
          data: { lines: ["error: connection refused"], total: 1 },
          error: null,
          latency_ms: 42,
          cached: false,
        },
      },
    ];
    render(<Timeline events={events} />);
    expect(screen.getByText("loki")).toBeInTheDocument();
    expect(screen.getByText("42ms")).toBeInTheDocument();
  });

  it("渲染 playbook_hint 事件", () => {
    const events: SSEEvent[] = [
      {
        type: "playbook_hint",
        data: {
          playbook_id: "oom",
          playbook_name: "OOM 内存溢出排查",
          score: 0.75,
          matched_keywords: ["oom", "内存溢出"],
          steps: [
            { probe: "mimir", query_template: "up", purpose: "查内存" },
          ],
          common_root_causes: ["内存泄漏"],
        },
      },
    ];
    render(<Timeline events={events} />);
    expect(screen.getByText(/OOM 内存溢出排查/)).toBeInTheDocument();
  });

  it("tool_result 失败时显示错误信息", () => {
    const events: SSEEvent[] = [
      {
        type: "tool_result",
        data: {
          tool: "tempo",
          success: false,
          data: null,
          error: "查询语法错误",
          latency_ms: 10,
          cached: false,
        },
      },
    ];
    render(<Timeline events={events} />);
    // error 文本同时出现在 subtitle 和展开区域，用 getAllByText 匹配
    expect(screen.getAllByText("查询语法错误").length).toBeGreaterThan(0);
  });
});
