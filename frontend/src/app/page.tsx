"use client";

import { useState, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInput } from "@/components/ChatInput";
import { Timeline } from "@/components/Timeline";
import { RCAPanel } from "@/components/RCAPanel";
import { BudgetBar } from "@/components/BudgetBar";
import { createSession, streamSession } from "@/lib/api";
import type { Session, SSEEvent, BudgetInfo } from "@/types/events";
import { Search, Terminal } from "lucide-react";

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);

  const activeSession = sessions.find((s) => s.session_id === activeSessionId);

  /** 提交排查请求 */
  const handleSubmit = useCallback(async (message: string) => {
    setInputValue("");
    abortRef.current = false;
    setIsStreaming(true);

    // 创建临时会话（先显示 UI，再请求后端）
    const tempId = `temp-${Date.now()}`;
    const newSession: Session = {
      session_id: tempId,
      message,
      status: "created",
      created_at: Date.now(),
      events: [],
      rca_report: null,
      rca_confidence: null,
      is_partial: false,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(tempId);

    try {
      // 调用后端创建会话
      const realSessionId = await createSession(message);

      // 更新 session_id
      setSessions((prev) =>
        prev.map((s) => (s.session_id === tempId ? { ...s, session_id: realSessionId, status: "running" } : s))
      );
      setActiveSessionId(realSessionId);

      // 连接 SSE 流
      await streamSession(
        realSessionId,
        (event: SSEEvent) => {
          if (abortRef.current) return;

          setSessions((prev) =>
            prev.map((s) => {
              if (s.session_id !== realSessionId) return s;

              const updated: Session = {
                ...s,
                events: [...s.events, event],
              };

              // 处理 RCA 完成事件
              if (event.type === "rca_complete") {
                updated.status = "completed";
                updated.rca_report = (event.data as { report: string }).report;
                updated.rca_confidence = (event.data as { confidence: "high" | "medium" | "low" }).confidence;
              }

              // 处理部分 RCA
              if (event.type === "rca_partial") {
                updated.status = "completed";
                updated.rca_report = (event.data as { report: string }).report;
                updated.rca_confidence = "low";
                updated.is_partial = true;
              }

              // 处理错误
              if (event.type === "error") {
                updated.status = "error";
              }

              return updated;
            })
          );
        },
        (error: string) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.session_id === realSessionId
                ? {
                    ...s,
                    status: "error",
                    events: [
                      ...s.events,
                      { type: "error", data: { message: error } } as SSEEvent,
                    ],
                  }
                : s
            )
          );
        },
        () => {
          // 流关闭
          setIsStreaming(false);
        }
      );
    } catch (err) {
      setIsStreaming(false);
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === tempId || s.session_id === activeSessionId
            ? {
                ...s,
                status: "error",
                events: [
                  ...s.events,
                  {
                    type: "error",
                    data: { message: err instanceof Error ? err.message : "创建会话失败" },
                  } as SSEEvent,
                ],
              }
            : s
        )
      );
    }

    setIsStreaming(false);
  }, [activeSessionId]);

  /** 新建排查 */
  const handleNew = useCallback(() => {
    setActiveSessionId(null);
    setInputValue("");
  }, []);

  /** 从 budget_update 事件中提取最新预算 */
  const latestBudget: BudgetInfo | null = (() => {
    if (!activeSession) return null;
    const budgetEvents = activeSession.events.filter((e) => e.type === "budget_update");
    if (budgetEvents.length === 0) return null;
    const last = budgetEvents[budgetEvents.length - 1];
    return last.data as unknown as BudgetInfo;
  })();

  // 是否有 RCA 报告
  const hasRCA = activeSession?.rca_report != null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-app-bg)" }}>
      {/* 侧边栏 */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onNew={handleNew}
      />

      {/* 主区域 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden" style={{ background: "var(--color-main-bg)" }}>
        {/* 内容滚动区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[780px] mx-auto px-6 py-6 space-y-6">
            {/* 空状态引导 */}
            {!activeSession && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div
                  className="w-14 h-14 flex items-center justify-center rounded-[var(--radius-md)]"
                  style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <Search className="w-7 h-7" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="text-center">
                  <h1 className="text-[20px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                    智能故障排查
                  </h1>
                  <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
                    用自然语言描述故障现象，Agent 自动查询 Mimir / Loki / Tempo 并生成 RCA 报告
                  </p>
                </div>
                {/* 示例模板 */}
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "payment-service 为什么大量 500？",
                    "order-api 延迟突然升高，帮忙排查",
                    "user-service 最近 1 小时有 OOM 吗？",
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => handleSubmit(example)}
                      disabled={isStreaming}
                      className="text-[13px] px-3 py-2 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
                      style={{
                        background: "var(--color-surface-1)",
                        border: "1px solid var(--color-border-subtle)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <Terminal className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" style={{ color: "var(--color-text-tertiary)" }} />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 会话内容 */}
            {activeSession && (
              <>
                {/* 用户问题 */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-[12px] font-semibold"
                    style={{ background: "var(--color-accent)", color: "#ffffff" }}
                  >
                    ME
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {activeSession.message}
                    </p>
                  </div>
                </div>

                {/* 预算进度条 */}
                {latestBudget && <BudgetBar budget={latestBudget} />}

                {/* Timeline */}
                {activeSession.events.length > 0 && <Timeline events={activeSession.events} />}

                {/* RCA 报告 */}
                {hasRCA && activeSession.rca_report && activeSession.rca_confidence && (
                  <RCAPanel
                    report={activeSession.rca_report}
                    confidence={activeSession.rca_confidence}
                    isPartial={activeSession.is_partial}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 底部输入区域 */}
        <div className="shrink-0 px-6 pb-4 pt-2" style={{ background: "var(--color-main-bg)" }}>
          <div className="max-w-[780px] mx-auto">
            <ChatInput
              onSubmit={handleSubmit}
              disabled={isStreaming}
              placeholder={isStreaming ? "排查进行中..." : "描述故障现象，例如：payment-service 为什么大量 500？"}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
