import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HandoffCard } from "../HandoffCard";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("HandoffCard", () => {
  it("加载时显示加载态", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(
      <HandoffCard sessionId="s1" symptom="OOM" onClose={() => {}} />
    );
    expect(screen.getByText("正在生成交接卡...")).toBeInTheDocument();
  });

  it("成功加载后显示交接卡内容", async () => {
    const mockData = {
      session_id: "s1",
      symptom: "payment-service OOM",
      evidence_chain: [{ role: "mimir", summary: "内存使用率 95%" }],
      confidence: "low",
      missing: ["需确认根因"],
      suggestions: ["检查部署变更"],
      ownership: { "payment-service": "Backend (P1)" },
      markdown: "## 交接卡",
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <HandoffCard sessionId="s1" symptom="OOM" onClose={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText("payment-service OOM")).toBeInTheDocument();
    });
    expect(screen.getByText("Backend (P1)")).toBeInTheDocument();
    expect(screen.getByText("内存使用率 95%")).toBeInTheDocument();
  });

  it("加载失败显示错误信息", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("会话未完成"),
    });

    render(
      <HandoffCard sessionId="s1" symptom="OOM" onClose={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText(/生成交接卡失败/)).toBeInTheDocument();
    });
  });

  it("渲染复制和导出按钮", async () => {
    const mockData = {
      session_id: "s1",
      symptom: "OOM",
      evidence_chain: [],
      confidence: "low",
      missing: [],
      suggestions: [],
      ownership: {},
      markdown: "## 交接卡",
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <HandoffCard sessionId="s1" symptom="OOM" onClose={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText("复制")).toBeInTheDocument();
      expect(screen.getByText("导出")).toBeInTheDocument();
    });
  });
});
