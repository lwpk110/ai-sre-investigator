"use client";

import { useState } from "react";
import {
  Brain,
  Wrench,
  CheckCircle,
  XCircle,
  ChevronDown,
  Database,
  FileText,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import type { SSEEvent } from "@/types/events";

interface TimelineProps {
  events: SSEEvent[];
}

/** 探针图标映射 */
function ProbeIcon({ name }: { name: string }) {
  if (name.includes("mimir")) return <Database className="w-4 h-4" />;
  if (name.includes("loki")) return <FileText className="w-4 h-4" />;
  if (name.includes("tempo")) return <GitBranch className="w-4 h-4" />;
  return <Wrench className="w-4 h-4" />;
}

/** 提取 QL 查询语句 */
function extractQuery(params: Record<string, unknown>): string {
  if (typeof params.query === "string") return params.query;
  return JSON.stringify(params, null, 2);
}

/** 探针语言标签 */
function probeLabel(toolName: string): string {
  if (toolName.includes("mimir")) return "PromQL";
  if (toolName.includes("loki")) return "LogQL";
  if (toolName.includes("tempo")) return "TraceQL";
  return toolName;
}

/** Timeline 步骤卡片 */
function StepCard({ event, index }: { event: SSEEvent; index: number }) {
  const [expanded, setExpanded] = useState(true);

  // thinking 事件 — 简化渲染
  if (event.type === "thinking") {
    return (
      <div
        key={index}
        className="animate-step-enter flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)]"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
      >
        <Brain className="w-4 h-4 shrink-0 animate-status-pulse" style={{ color: "var(--color-info)" }} />
        <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          {event.data.text}
        </span>
      </div>
    );
  }

  // error 事件
  if (event.type === "error") {
    return (
      <div
        key={index}
        className="animate-step-enter rounded-[var(--radius-md)] p-4"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-standard)",
          borderLeft: "2px solid var(--color-error)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4" style={{ color: "var(--color-error)" }} />
          <span className="text-[14px] font-medium" style={{ color: "var(--color-error)" }}>
            错误
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          {(event.data as { message: string }).message}
        </p>
      </div>
    );
  }

  // tool_call 事件
  if (event.type === "tool_call") {
    const { tool, params } = event.data as { tool: string; params: Record<string, unknown> };
    const query = extractQuery(params);
    return (
      <div
        key={index}
        className="animate-step-enter rounded-[var(--radius-md)] overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-subtle)",
          borderLeft: "2px solid var(--color-info)",
        }}
      >
        {/* 头部 */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div style={{ color: "var(--color-info)" }}>
            <ProbeIcon name={tool} />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {tool}
          </span>
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(56,189,248,0.1)", color: "var(--color-info)" }}
          >
            {probeLabel(tool)}
          </span>
          <div className="flex-1" />
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            执行中...
          </span>
        </div>
        {/* QL 代码块 */}
        <div className="px-4 pb-3">
          <pre
            className="font-mono text-[13px] leading-[1.6] p-3 rounded-[var(--radius-sm)] overflow-x-auto"
            style={{ background: "var(--color-app-bg)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          >
            <code>{query}</code>
          </pre>
        </div>
      </div>
    );
  }

  // tool_result 事件
  if (event.type === "tool_result") {
    const { tool, success, data, error, latency_ms, cached } = event.data as {
      tool: string;
      success: boolean;
      data: Record<string, unknown> | null;
      error: string | null;
      latency_ms: number;
      cached: boolean;
    };
    const borderColor = success ? "var(--color-success)" : "var(--color-error)";

    return (
      <div
        key={index}
        className="animate-step-enter rounded-[var(--radius-md)] overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-subtle)",
          borderLeft: `2px solid ${borderColor}`,
        }}
      >
        {/* 头部 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
        >
          <div style={{ color: borderColor }}>
            {success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </div>
          <span className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {tool}
          </span>
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded-full"
            style={{
              background: success ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
              color: borderColor,
            }}
          >
            {success ? "成功" : "失败"}
          </span>
          {cached && (
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.1)", color: "var(--color-warning)" }}
            >
              缓存
            </span>
          )}
          {/* 耗时标签 */}
          <span className="text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
            {latency_ms}ms
          </span>
          <div className="flex-1" />
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--color-text-tertiary)" }}
          />
        </button>
        {/* 可展开结果 */}
        {expanded && (
          <div className="px-4 pb-3">
            {success && data ? (
              <pre
                className="font-mono text-[12px] leading-[1.6] p-3 rounded-[var(--radius-sm)] overflow-x-auto max-h-[240px]"
                style={{ background: "var(--color-app-bg)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
              >
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            ) : (
              <p className="text-[13px] font-mono" style={{ color: "var(--color-error)" }}>
                {error || "未知错误"}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // budget_update — 不在 timeline 中渲染（由 BudgetBar 处理）
  if (event.type === "budget_update") return null;

  return null;
}

export function Timeline({ events }: TimelineProps) {
  // 过滤掉 budget_update 事件（由 BudgetBar 渲染）
  const visibleEvents = events.filter((e) => e.type !== "budget_update");

  if (visibleEvents.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleEvents.map((event, index) => (
        <StepCard key={index} event={event} index={index} />
      ))}
    </div>
  );
}
