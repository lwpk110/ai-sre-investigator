"use client";

import { useState, type ReactElement } from "react";
import {
  Brain,
  Database,
  FileText,
  GitBranch,
  Wrench,
  CheckCircle,
  XCircle,
  ChevronDown,
  AlertCircle,
  Clock,
  ShieldCheck,
  Copy,
} from "lucide-react";
import type { SSEEvent } from "@/types/events";

interface TimelineProps {
  events: SSEEvent[];
}

/** 探针图标映射 - 复刻原型 probe-icon 配色 */
function ProbeIcon({ name }: { name: string }) {
  let icon = <Wrench className="w-4 h-4" />;
  let cls = "probe-shield";

  if (name.includes("mimir")) {
    icon = <Database className="w-4 h-4" />;
    cls = "probe-mimir";
  } else if (name.includes("loki")) {
    icon = <FileText className="w-4 h-4" />;
    cls = "probe-loki";
  } else if (name.includes("tempo")) {
    icon = <GitBranch className="w-4 h-4" />;
    cls = "probe-tempo";
  }

  return (
    <div
      className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 ${cls}`}
    >
      {icon}
    </div>
  );
}

/** 探针语言标签 */
function probeLabel(toolName: string): string {
  if (toolName.includes("mimir")) return "PromQL";
  if (toolName.includes("loki")) return "LogQL";
  if (toolName.includes("tempo")) return "TraceQL";
  return toolName;
}

/** 提取 QL 查询语句 */
function extractQuery(params: Record<string, unknown>): string {
  if (typeof params.query === "string") return params.query;
  return JSON.stringify(params, null, 2);
}

/** 简单的 QL 语法高亮 */
function highlightQL(query: string): ReactElement {
  // 匹配函数名、关键字、字符串、数字、运算符
  const tokens: { text: string; cls: string }[] = [];
  const regex =
    /(\b(?:rate|histogram_quantile|sum|avg|max|min|count|increase|irate|by|without|on|ignoring|group_left|group_right|offset|bool)\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_][a-zA-Z0-9_]*)|([+\-*/=~!<>|&^%])|(\[|\]|\{|\}|\(|\))/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(query)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ text: query.slice(lastIdx, match.index), cls: "" });
    }
    if (match[1]) tokens.push({ text: match[1], cls: "fn" });
    else if (match[2]) tokens.push({ text: match[2], cls: "str" });
    else if (match[3]) tokens.push({ text: match[3], cls: "num" });
    else if (match[4]) tokens.push({ text: match[4], cls: "kw" });
    else if (match[5]) tokens.push({ text: match[5], cls: "op" });
    else tokens.push({ text: match[0], cls: "" });
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < query.length) {
    tokens.push({ text: query.slice(lastIdx), cls: "" });
  }

  return (
    <code className="code-syntax">
      {tokens.map((t, i) => (
        <span key={i} className={t.cls}>
          {t.text}
        </span>
      ))}
    </code>
  );
}

/** 从 tool_result 数据中提取摘要 */
function extractResultSummary(
  data: Record<string, unknown> | null,
  toolName: string
): { label: string; value: string; alert?: boolean }[] {
  if (!data) return [];
  const rows: { label: string; value: string; alert?: boolean }[] = [];

  // Mimir 结果通常有 value / values
  if (toolName.includes("mimir")) {
    if (typeof data.value === "number") {
      rows.push({ label: "查询值", value: String(data.value.toFixed(4)) });
    }
    if (typeof data.error_rate === "number") {
      const alert = data.error_rate > 0.05;
      rows.push({ label: "错误率", value: `${(data.error_rate * 100).toFixed(1)}%`, alert });
    }
    if (typeof data.p99_latency_ms === "number") {
      const alert = data.p99_latency_ms > 1000;
      rows.push({ label: "P99 延迟", value: `${data.p99_latency_ms}ms`, alert });
    }
  }

  // Loki 结果
  if (toolName.includes("loki")) {
    if (Array.isArray(data.logs)) {
      rows.push({ label: "日志条数", value: String(data.logs.length) });
    }
    if (typeof data.error_count === "number") {
      rows.push({ label: "错误日志", value: String(data.error_count), alert: data.error_count > 0 });
    }
  }

  // Tempo 结果
  if (toolName.includes("tempo")) {
    if (Array.isArray(data.spans)) {
      rows.push({ label: "Span 数", value: String(data.spans.length) });
    }
    if (typeof data.duration_ms === "number") {
      const alert = data.duration_ms > 1000;
      rows.push({ label: "总耗时", value: `${data.duration_ms}ms`, alert });
    }
  }

  // 通用 fallback
  if (rows.length === 0) {
    const jsonStr = JSON.stringify(data, null, 2);
    if (jsonStr.length < 200) {
      rows.push({ label: "结果", value: jsonStr });
    } else {
      rows.push({ label: "结果", value: jsonStr.slice(0, 200) + "..." });
    }
  }

  return rows;
}

/** Timeline 步骤卡片 */
function StepCard({
  event,
  index,
  stepNum,
}: {
  event: SSEEvent;
  index: number;
  stepNum: string;
}) {
  const [expanded, setExpanded] = useState(true);

  // thinking 事件
  if (event.type === "thinking") {
    return (
      <div
        key={index}
        className="animate-step-enter flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-md)]"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="probe-brain w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 animate-status-pulse" />
        </div>
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
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <span className="text-[11px] font-mono w-5 text-center shrink-0" style={{ color: "var(--color-text-quaternary)" }}>
            {stepNum}
          </span>
          <ProbeIcon name={tool} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {tool}
            </div>
          </div>
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(56,189,248,0.1)", color: "var(--color-info)" }}
          >
            {probeLabel(tool)}
          </span>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            执行中...
          </span>
        </div>
        {/* QL 代码块 */}
        <div className="px-3.5 pb-3 pl-[52px]">
          <div
            className="rounded-[var(--radius-sm)] overflow-hidden"
            style={{ background: "#070912", border: "1px solid var(--color-border-subtle)" }}
          >
            <div
              className="flex items-center justify-between px-2.5 py-1.5 border-b"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <span
                className="text-[10px] font-mono uppercase"
                style={{ color: "var(--color-text-quaternary)", letterSpacing: "0.05em" }}
              >
                {probeLabel(tool)}
              </span>
              <button className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-text-quaternary)" }}>
                <Copy className="w-2.5 h-2.5" />
                复制
              </button>
            </div>
            <pre
              className="px-3 py-2.5 text-[12.5px] font-mono leading-[1.6] overflow-x-auto whitespace-pre"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {highlightQL(query)}
            </pre>
          </div>
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
    const summary = extractResultSummary(data, tool);

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
          className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-mono w-5 text-center shrink-0" style={{ color: "var(--color-text-quaternary)" }}>
            {stepNum}
          </span>
          <ProbeIcon name={tool} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {tool}
            </div>
          </div>
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
          <span className="text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
            {latency_ms}ms
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--color-text-quaternary)" }}
          />
        </button>
        {/* 可展开结果 */}
        {expanded && (
          <div className="px-3.5 pb-3 pl-[52px]">
            {success && summary.length > 0 ? (
              <div className="flex flex-col gap-2 mt-2.5">
                {summary.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)]"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <span className="text-[12px] shrink-0 min-w-[80px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {row.label}
                    </span>
                    <span
                      className="text-[13px] font-mono"
                      style={{
                        color: row.alert ? "var(--color-error)" : "var(--color-text-primary)",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : success && data ? (
              <pre
                className="font-mono text-[12px] leading-[1.6] p-3 rounded-[var(--radius-sm)] overflow-x-auto max-h-[240px] mt-2.5"
                style={{ background: "#070912", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
              >
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            ) : (
              <p className="text-[13px] font-mono mt-2.5" style={{ color: "var(--color-error)" }}>
                {error || "未知错误"}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // budget_update - 不在 timeline 中渲染
  if (event.type === "budget_update") return null;

  return null;
}

export function Timeline({ events }: TimelineProps) {
  const visibleEvents = events.filter((e) => e.type !== "budget_update");
  if (visibleEvents.length === 0) return null;

  let stepCounter = 0;

  return (
    <div className="space-y-2">
      {/* 面板头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          <Clock className="w-4 h-4" />
          推理时间线
          <span
            className="text-[11px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", color: "var(--color-success)" }}
          >
            {visibleEvents.filter((e) => e.type === "tool_result").length} / {visibleEvents.filter((e) => e.type === "tool_result").length} 完成
          </span>
        </div>
      </div>
      {/* 步骤卡片 */}
      {visibleEvents.map((event, index) => {
        if (event.type === "tool_call" || event.type === "tool_result") {
          stepCounter++;
          return (
            <StepCard
              key={index}
              event={event}
              index={index}
              stepNum={String(stepCounter).padStart(2, "0")}
            />
          );
        }
        return <StepCard key={index} event={event} index={index} stepNum="" />;
      })}
    </div>
  );
}
