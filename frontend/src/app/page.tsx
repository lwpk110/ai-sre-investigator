"use client";

import { useState, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInput } from "@/components/ChatInput";
import { Timeline } from "@/components/Timeline";
import { RCAPanel } from "@/components/RCAPanel";
import { BudgetBar } from "@/components/BudgetBar";
import { DemoGuide } from "@/components/DemoGuide";
import { HandoffCard } from "@/components/HandoffCard";
import { KnowledgeHint } from "@/components/KnowledgeHint";
import type { KnowledgeEntry } from "@/lib/knowledge";
import { createSession, followUp, streamSession } from "@/lib/api";
import type { Session, SSEEvent, BudgetInfo } from "@/types/events";
import { Search, Terminal } from "lucide-react";

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);
  const [handoffSession, setHandoffSession] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.session_id === activeSessionId);

  /**
   * 统一提交处理：区分新建会话和追问
   * - activeSession 已完成且有 RCA → 调用 follow-up 端点
   * - 否则 → 新建会话
   */
  const handleSubmit = useCallback(
    async (message: string) => {
      setInputValue("");
      abortRef.current = false;
      setIsStreaming(true);

      // 判断是否追问模式
      const current = sessions.find((s) => s.session_id === activeSessionId);
      const isFollowUp =
        current != null &&
        current.status === "completed" &&
        current.rca_report != null;

      if (isFollowUp && current) {
        await handleFollowUp(current, message);
        return;
      }

      await handleNewSession(message);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSessionId, sessions]
  );

  /** 新建排查会话 */
  const handleNewSession = useCallback(
    async (message: string) => {
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
        missing_queries: [],
        suggestions: [],
        followup_count: 0,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(tempId);

      try {
        const realSessionId = await createSession(message);

        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === tempId
              ? { ...s, session_id: realSessionId, status: "running" }
              : s
          )
        );
        setActiveSessionId(realSessionId);

        await streamSSE(realSessionId);
      } catch (err) {
        setIsStreaming(false);
        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === tempId
              ? {
                  ...s,
                  status: "error",
                  events: [
                    ...s.events,
                    {
                      type: "error",
                      data: {
                        message:
                          err instanceof Error ? err.message : "创建会话失败",
                      },
                    } as SSEEvent,
                  ],
                }
              : s
          )
        );
      }

      setIsStreaming(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** 追问：在已完成会话中继续提问 */
  const handleFollowUp = useCallback(
    async (session: Session, message: string) => {
      try {
        // 插入追问分隔标记
        const separatorEvent: SSEEvent = {
          type: "thinking",
          data: { text: `追问: ${message}` },
        } as SSEEvent;

        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === session.session_id
              ? {
                  ...s,
                  status: "running",
                  message,
                  // 重置 RCA 相关字段，等待新一轮结果
                  rca_report: null,
                  rca_confidence: null,
                  is_partial: false,
                  missing_queries: [],
                  suggestions: [],
                  followup_count: s.followup_count + 1,
                  events: [...s.events, separatorEvent],
                }
              : s
          )
        );

        // 调用后端追问端点
        await followUp(session.session_id, message);

        // 重新连接 SSE 流获取新的推理过程
        await streamSSE(session.session_id);
      } catch (err) {
        setIsStreaming(false);
        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === session.session_id
              ? {
                  ...s,
                  status: "error",
                  events: [
                    ...s.events,
                    {
                      type: "error",
                      data: {
                        message:
                          err instanceof Error ? err.message : "追问失败",
                      },
                    } as SSEEvent,
                  ],
                }
              : s
          )
        );
      }

      setIsStreaming(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** 连接 SSE 流并处理事件 */
  const streamSSE = useCallback(async (sessionId: string) => {
    await streamSession(
      sessionId,
      (event: SSEEvent) => {
        if (abortRef.current) return;

        setSessions((prev) =>
          prev.map((s) => {
            if (s.session_id !== sessionId) return s;

            const updated: Session = {
              ...s,
              events: [...s.events, event],
            };

            // RCA 完成事件
            if (event.type === "rca_complete") {
              updated.status = "completed";
              updated.rca_report = (event.data as { report: string }).report;
              updated.rca_confidence = (
                event.data as { confidence: "high" | "medium" | "low" }
              ).confidence;
              updated.is_partial = false;
            }

            // 部分 RCA
            if (event.type === "rca_partial") {
              const partialData = event.data as {
                report: string;
                missing: string[];
                suggestions?: string[];
              };
              updated.status = "completed";
              updated.rca_report = partialData.report;
              updated.rca_confidence = "low";
              updated.is_partial = true;
              updated.missing_queries = partialData.missing || [];
              updated.suggestions = partialData.suggestions || [];
            }

            // 错误事件
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
            s.session_id === sessionId
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
        setIsStreaming(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 新建排查 */
  const handleNew = useCallback(() => {
    setActiveSessionId(null);
    setInputValue("");
  }, []);

  /** 从 budget_update 事件中提取最新预算 */
  const latestBudget: BudgetInfo | null = (() => {
    if (!activeSession) return null;
    const budgetEvents = activeSession.events.filter(
      (e) => e.type === "budget_update"
    );
    if (budgetEvents.length === 0) return null;
    const last = budgetEvents[budgetEvents.length - 1];
    return last.data as unknown as BudgetInfo;
  })();

  // 是否有 RCA 报告
  const hasRCA = activeSession?.rca_report != null;

  // 判断是否处于追问模式（RCA 完成后输入框切换提示文案）
  const isFollowUpMode =
    activeSession != null &&
    activeSession.status === "completed" &&
    activeSession.rca_report != null;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--color-app-bg)" }}
    >
      {/* 侧边栏 */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onNew={handleNew}
      />

      {/* 主区域 */}
      <main
        className="flex-1 flex flex-col h-screen overflow-hidden"
        style={{ background: "var(--color-main-bg)" }}
      >
        {/* 内容滚动区域 */}
        <div className="flex-1 overflow-y-auto">
         <div className="max-w-[780px] mx-auto px-6 py-6 space-y-6">
            {/* 模拟故障上手引导（首次访问显示） */}
            {!activeSession && !isStreaming && (
              <DemoGuide onSelect={handleSubmit} onClose={() => {}} />
            )}

            {/* 空状态引导 */}
            {!activeSession && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div
                  className="w-14 h-14 flex items-center justify-center rounded-[var(--radius-md)]"
                  style={{
                    background: "var(--color-surface-1)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <Search
                    className="w-7 h-7"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <div className="text-center">
                  <h1
                    className="text-[20px] font-semibold mb-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    智能故障排查
                  </h1>
                  <p
                    className="text-[14px]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    用自然语言描述故障现象，Agent
                    自动查询 Mimir / Loki / Tempo 并生成 RCA 报告
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
                      <Terminal
                        className="w-3.5 h-3.5 inline mr-1.5 mb-0.5"
                        style={{ color: "var(--color-text-tertiary)" }}
                      />
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
                    style={{
                      background: "var(--color-accent)",
                      color: "#ffffff",
                    }}
                  >
                    ME
                  </div>
                  <div className="flex-1 pt-1">
                    <p
                      className="text-[14px] font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {activeSession.message}
                    </p>
                  </div>
                </div>

                {/* 预算进度条 */}
                {latestBudget && <BudgetBar budget={latestBudget} />}

                {/* Timeline */}
                {activeSession.events.length > 0 && (
                  <Timeline events={activeSession.events} />
                )}

                {/* RCA 报告 */}
                {hasRCA &&
                  activeSession.rca_report &&
                  activeSession.rca_confidence && (
                  <RCAPanel
                    report={activeSession.rca_report}
                    confidence={activeSession.rca_confidence}
                    isPartial={activeSession.is_partial}
                    missingQueries={activeSession.missing_queries}
                    suggestions={activeSession.suggestions}
                    onFollowUp={handleSubmit}
                  />
                  )}
              </>
            )}
          </div>
        </div>

        {/* 底部输入区域 */}
        <div
          className="shrink-0 px-6 pb-4 pt-2"
          style={{ background: "var(--color-main-bg)" }}
        >
          <div className="max-w-[780px] mx-auto">
            {/* V2-F1: 历史排查模式匹配提示 */}
            {!isStreaming && (
              <KnowledgeHint
                message={inputValue}
                onSelect={(entry) => {
                  setInputValue(entry.symptom);
                }}
              />
            )}
            <ChatInput
              onSubmit={handleSubmit}
              disabled={isStreaming}
              placeholder={
                isStreaming
                  ? "排查进行中..."
                  : isFollowUpMode
                  ? "继续追问，如：展开这个 TraceID 的下游 / 把 p99 拉长 3 小时"
                  : "描述故障现象，例如：payment-service 为什么大量 500？"
              }
            />
          </div>
        </div>
      </main>

      {/* SRE 交接卡弹窗（V2-F5） */}
      {handoffSession && activeSession && (
        <HandoffCard
          sessionId={handoffSession}
          symptom={activeSession.message}
          onClose={() => setHandoffSession(null)}
        />
      )}
    </div>
  );
}
