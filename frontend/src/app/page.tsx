"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { ChatInput } from "@/components/ChatInput";
import { Timeline } from "@/components/Timeline";
import { RCAPanel } from "@/components/RCAPanel";
import { BudgetBar } from "@/components/BudgetBar";
import { DemoGuide } from "@/components/DemoGuide";
import { KnowledgeHint } from "@/components/KnowledgeHint";
import { AppShell } from "@/components/layout";
import { Badge, StatusDot } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createSession, followUp, streamSession } from "@/lib/api";
import type { Session, SSEEvent, BudgetInfo } from "@/types/events";
import { Search, Terminal, Plus } from "lucide-react";

/** 从消息文本中提取标签（服务名 / HTTP 状态码 / 优先级） */
function extractTags(message: string): string[] {
  const tags: string[] = [];
  const svcMatch = message.match(/([\w-]+(?:-service|-api|-gateway))\b/i);
  if (svcMatch) tags.push(svcMatch[1]);
  const httpMatch = message.match(/(HTTP\s*5\d{2}|5\d{2})/i);
  if (httpMatch) tags.push("HTTP 5xx");
  if (/p0|p1|严重|紧急|大量/i.test(message)) tags.push("P1");
  return tags.length > 0 ? tags : ["general"];
}

/** 会话状态 → StatusDot 映射 */
function sessionDotStatus(s: Session["status"]): "ok" | "err" | "info" {
  if (s === "completed") return "ok";
  if (s === "error") return "err";
  return "info";
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(false);

  const activeSession = sessions.find((s) => s.session_id === activeSessionId);

  const handleSubmit = useCallback(
    async (message: string) => {
      setInputValue("");
      abortRef.current = false;
      setIsStreaming(true);

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
    [activeSessionId, sessions],
  );

  const handleNewSession = useCallback(async (message: string) => {
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
            : s,
        ),
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
                  { type: "error", data: { message: err instanceof Error ? err.message : "创建会话失败" } } as SSEEvent,
                ],
              }
            : s,
        ),
      );
    }
    setIsStreaming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFollowUp = useCallback(async (session: Session, message: string) => {
    try {
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
                rca_report: null,
                rca_confidence: null,
                is_partial: false,
                missing_queries: [],
                suggestions: [],
                followup_count: s.followup_count + 1,
                events: [...s.events, separatorEvent],
              }
            : s,
        ),
      );
      await followUp(session.session_id, message);
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
                  { type: "error", data: { message: err instanceof Error ? err.message : "追问失败" } } as SSEEvent,
                ],
              }
            : s,
        ),
      );
    }
    setIsStreaming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streamSSE = useCallback(async (sessionId: string) => {
    await streamSession(
      sessionId,
      (event: SSEEvent) => {
        if (abortRef.current) return;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.session_id !== sessionId) return s;
            const updated: Session = { ...s, events: [...s.events, event] };
            if (event.type === "rca_complete") {
              updated.status = "completed";
              updated.rca_report = (event.data as { report: string }).report;
              updated.rca_confidence = (event.data as { confidence: "high" | "medium" | "low" }).confidence;
              updated.is_partial = false;
            }
            if (event.type === "rca_partial") {
              const partialData = event.data as { report: string; missing: string[]; suggestions?: string[] };
              updated.status = "completed";
              updated.rca_report = partialData.report;
              updated.rca_confidence = "low";
              updated.is_partial = true;
              updated.missing_queries = partialData.missing || [];
              updated.suggestions = partialData.suggestions || [];
            }
            if (event.type === "error") {
              updated.status = "error";
            }
            return updated;
          }),
        );
      },
      (error: string) => {
        setSessions((prev) =>
          prev.map((s) =>
            s.session_id === sessionId
              ? { ...s, status: "error", events: [...s.events, { type: "error", data: { message: error } } as SSEEvent] }
              : s,
          ),
        );
      },
      () => setIsStreaming(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNew = useCallback(() => {
    setActiveSessionId(null);
    setInputValue("");
  }, []);

  const latestBudget: BudgetInfo | null = (() => {
    if (!activeSession) return null;
    const budgetEvents = activeSession.events.filter((e) => e.type === "budget_update");
    if (budgetEvents.length === 0) return null;
    return budgetEvents[budgetEvents.length - 1].data as unknown as BudgetInfo;
  })();

  const hasRCA = activeSession?.rca_report != null;
  const isFollowUpMode =
    activeSession != null &&
    activeSession.status === "completed" &&
    activeSession.rca_report != null;

  // 侧边栏底部：新建排查按钮 + 会话列表
  const sidebarBottom: ReactNode = (
    <div className="flex-1 overflow-y-auto border-t border-border-subtle">
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-small font-medium bg-accent-muted-bg text-accent hover:bg-accent/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建排查
        </button>
      </div>
      <div className="px-2 pb-2">
        {sessions.length === 0 ? (
          <p className="text-caption text-text-quaternary px-3 py-4 text-center">
            暂无排查记录
          </p>
        ) : (
          sessions.slice(0, 20).map((session) => (
            <button
              key={session.session_id}
              onClick={() => setActiveSessionId(session.session_id)}
              className={cn(
                "w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-sm transition-colors mb-0.5",
                session.session_id === activeSessionId
                  ? "bg-accent-muted-bg"
                  : "hover:bg-white/[0.04]",
              )}
            >
              <StatusDot status={sessionDotStatus(session.status)} className="mt-1.5" />
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-caption font-medium truncate",
                    session.session_id === activeSessionId ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  {session.message.slice(0, 28) || "新排查"}
                </div>
                <div className="text-micro text-text-quaternary font-mono mt-0.5">
                  {new Date(session.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <AppShell sidebarBottom={sidebarBottom}>
      <div className="flex flex-col h-screen">
        {/* 头部状态条 */}
        {activeSession && (
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border-subtle">
            <div className="text-card-title font-semibold truncate text-text-primary">
              {activeSession.message.slice(0, 60)}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusDot status={sessionDotStatus(activeSession.status)} />
              <span className="font-mono text-micro text-text-tertiary">
                {activeSession.status === "running" ? "排查中" : activeSession.status === "completed" ? "排查完成" : activeSession.status === "error" ? "排查失败" : "等待中"}
              </span>
            </div>
          </div>
        )}

        {/* 内容滚动区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[780px] mx-auto px-6 py-6 space-y-6">
            {!activeSession && !isStreaming && (
              <DemoGuide onSelect={handleSubmit} onClose={() => {}} />
            )}

            {!activeSession && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-14 h-14 flex items-center justify-center rounded-md bg-surface-1 border border-border-subtle">
                  <Search className="w-7 h-7 text-accent" />
                </div>
                <div className="text-center">
                  <h1 className="text-page-title font-semibold mb-2 text-text-primary">
                    智能故障排查
                  </h1>
                  <p className="text-body text-text-secondary">
                    用自然语言描述故障现象，Agent 自动查询 Mimir / Loki / Tempo 并生成 RCA 报告
                  </p>
                </div>
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
                      className="text-small px-3 py-2 rounded-sm transition-colors disabled:opacity-40 bg-surface-1 border border-border-subtle text-text-secondary hover:border-border-emphasis"
                    >
                      <Terminal className="w-3.5 h-3.5 inline mr-1.5 mb-0.5 text-text-tertiary" />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSession && (
              <>
                {/* 用户提问卡片 */}
                <div className="rounded-md px-4 py-3.5 bg-surface-1 border border-border-standard">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-micro font-semibold bg-surface-2 text-text-secondary">
                      L
                    </div>
                    <span className="text-small font-medium text-text-primary">luwei</span>
                    <span className="font-mono text-micro text-text-quaternary">
                      {new Date(activeSession.created_at).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-body leading-relaxed text-text-primary">
                    {activeSession.message}
                  </p>
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    {extractTags(activeSession.message).map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </div>

                {latestBudget && <BudgetBar budget={latestBudget} />}

                {activeSession.events.length > 0 && (
                  <Timeline events={activeSession.events} />
                )}

                {hasRCA && activeSession.rca_report && activeSession.rca_confidence && (
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
        <div className="shrink-0 px-6 pb-4 pt-2 bg-main-bg">
          <div className="max-w-[780px] mx-auto">
            {!isStreaming && (
              <KnowledgeHint
                message={inputValue}
                onSelect={(entry) => setInputValue(entry.symptom)}
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
      </div>
    </AppShell>
  );
}
