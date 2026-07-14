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
  Copy,
  BookMarked,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { SSEEvent } from "@/types/events";

interface TimelineProps {
  events: SSEEvent[];
}

/** 探针图标映射 */
function ProbeIcon({ name }: { name: string }) {
  let icon = <Wrench className="w-4 h-4" />;
  let cls = "probe-shield";
  if (name.includes("mimir")) { icon = <Database className="w-4 h-4" />; cls = "probe-mimir"; }
  else if (name.includes("loki")) { icon = <FileText className="w-4 h-4" />; cls = "probe-loki"; }
  else if (name.includes("tempo")) { icon = <GitBranch className="w-4 h-4" />; cls = "probe-tempo"; }
  return (
    <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center shrink-0", cls)}>
      {icon}
    </div>
  );
}

function probeLabel(toolName: string): string {
  if (toolName.includes("mimir")) return "PromQL";
  if (toolName.includes("loki")) return "LogQL";
  if (toolName.includes("tempo")) return "TraceQL";
  return toolName;
}

function extractQuery(params: Record<string, unknown>): string {
  if (typeof params.query === "string") return params.query;
  return JSON.stringify(params, null, 2);
}

/** QL 语法高亮 */
function highlightQL(query: string): ReactElement {
  const tokens: { text: string; cls: string }[] = [];
  const regex = /(\b(?:rate|histogram_quantile|sum|avg|max|min|count|increase|irate|by|without|on|ignoring|group_left|group_right|offset|bool)\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_][a-zA-Z0-9_]*)|([+\-*/=~!<>|&^%])|(\[|\]|\{|\}|\(|\))/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(query)) !== null) {
    if (match.index > lastIdx) tokens.push({ text: query.slice(lastIdx, match.index), cls: "" });
    if (match[1]) tokens.push({ text: match[1], cls: "fn" });
    else if (match[2]) tokens.push({ text: match[2], cls: "str" });
    else if (match[3]) tokens.push({ text: match[3], cls: "num" });
    else if (match[4]) tokens.push({ text: match[4], cls: "kw" });
    else if (match[5]) tokens.push({ text: match[5], cls: "op" });
    else tokens.push({ text: match[0], cls: "" });
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < query.length) tokens.push({ text: query.slice(lastIdx), cls: "" });
  return (
    <code className="code-syntax">
      {tokens.map((t, i) => (<span key={i} className={t.cls}>{t.text}</span>))}
    </code>
  );
}

function extractResultSummary(data: Record<string, unknown> | null, toolName: string): { label: string; value: string; alert?: boolean }[] {
  if (!data) return [];
  const rows: { label: string; value: string; alert?: boolean }[] = [];
  if (toolName.includes("mimir")) {
    if (typeof data.value === "number") rows.push({ label: "查询值", value: String(data.value.toFixed(4)) });
    if (typeof data.error_rate === "number") rows.push({ label: "错误率", value: `${(data.error_rate * 100).toFixed(1)}%`, alert: data.error_rate > 0.05 });
    if (typeof data.p99_latency_ms === "number") rows.push({ label: "P99 延迟", value: `${data.p99_latency_ms}ms`, alert: data.p99_latency_ms > 1000 });
  }
  if (toolName.includes("loki")) {
    if (Array.isArray(data.logs)) rows.push({ label: "日志条数", value: String(data.logs.length) });
    if (typeof data.error_count === "number") rows.push({ label: "错误日志", value: String(data.error_count), alert: data.error_count > 0 });
  }
  if (toolName.includes("tempo")) {
    if (Array.isArray(data.spans)) rows.push({ label: "Span 数", value: String(data.spans.length) });
    if (typeof data.duration_ms === "number") rows.push({ label: "总耗时", value: `${data.duration_ms}ms`, alert: data.duration_ms > 1000 });
  }
  if (rows.length === 0) {
    const jsonStr = JSON.stringify(data, null, 2);
    rows.push({ label: "结果", value: jsonStr.length < 200 ? jsonStr : jsonStr.slice(0, 200) + "..." });
  }
  return rows;
}

function extractTimeSeries(data: Record<string, unknown> | null): number[] | null {
  if (!data) return null;
  const result = data.result;
  if (!Array.isArray(result) || result.length === 0) return null;
  const firstSeries = result[0] as Record<string, unknown>;
  const values = firstSeries.values;
  if (!Array.isArray(values) || values.length < 2) return null;
  return values.map((v: unknown) => parseFloat((v as [number, string])[1])).filter((n: number) => !isNaN(n));
}

/** 指标 sparkline */
function SparklineChart({ points }: { points: number[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const avg = points.reduce((a, b) => a + b, 0) / points.length;
  const display = points.slice(-32);
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide text-text-quaternary">指标趋势</span>
        <span className="text-[11px] font-mono text-info">峰值 {max.toFixed(2)}</span>
        <span className="text-[11px] font-mono text-text-tertiary">均值 {avg.toFixed(2)}</span>
      </div>
      <div className="sparkline">
        {display.map((val, i) => {
          const ratio = (val - min) / range;
          const isSpike = val > avg * 1.5 || val === max;
          return <div key={i} className={cn("spark-bar", isSpike && "spike")} style={{ height: `${Math.max(ratio * 100, 8)}%` }} title={val.toFixed(4)} />;
        })}
      </div>
    </div>
  );
}

/** 日志查看器 */
function LogViewer({ lines }: { lines: string[] }) {
  const display = lines.slice(0, 50);
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide text-text-quaternary">日志样本</span>
        <span className="text-[11px] font-mono text-text-tertiary">{lines.length} 行{lines.length > 50 ? "（显示前 50 行）" : ""}</span>
      </div>
      <div className="rounded-sm overflow-hidden max-h-[200px] overflow-y-auto bg-code-bg border border-border-subtle">
        {display.map((line, i) => {
          const isError = /(error|exception|fatal|panic|oom|killed|timeout|refused)/i.test(line);
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 px-2.5 py-1 text-[11.5px] font-mono leading-[1.5]",
                i < display.length - 1 && "border-b border-border-subtle",
                isError ? "bg-error/[0.06]" : "bg-transparent",
              )}
            >
              <span className="shrink-0 text-text-quaternary">{i + 1}</span>
              <span className={cn(isError ? "text-error font-medium" : "text-text-secondary font-normal")}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Trace 瀑布图 */
function TraceWaterfall({ spans }: { spans: { trace_id: string; operation: string; duration_ms: number }[] }) {
  const display = spans.slice(0, 10);
  const maxDuration = Math.max(...display.map((s) => s.duration_ms), 1);
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide text-text-quaternary">链路瀑布</span>
        <span className="text-[11px] font-mono text-text-tertiary">{spans.length} 个 Span</span>
      </div>
      <div className="space-y-1">
        {display.map((span, i) => {
          const ratio = span.duration_ms / maxDuration;
          const isSlow = span.duration_ms > 1000;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono shrink-0 truncate text-text-secondary max-w-[200px]">
                {span.operation || span.trace_id.slice(0, 8)}
              </span>
              <div className="flex-1 flex items-center gap-1.5">
                <div
                  className={cn("h-3 rounded-sm transition-all opacity-80", isSlow ? "bg-error" : "bg-accent")}
                  style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                />
                <span className={cn("text-[10px] font-mono shrink-0", isSlow ? "text-error" : "text-text-tertiary")}>
                  {span.duration_ms}ms
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceVisualization({ tool, data }: { tool: string; data: Record<string, unknown> | null }) {
  if (!data) return null;
  if (tool.includes("mimir")) {
    const ts = extractTimeSeries(data);
    if (ts && ts.length >= 2) return <SparklineChart points={ts} />;
  }
  if (tool.includes("loki")) {
    const lines = (data.lines ?? data.logs) as string[] | undefined;
    if (Array.isArray(lines) && lines.length > 0) return <LogViewer lines={lines} />;
  }
  if (tool.includes("tempo")) {
    const spans = data.spans as { trace_id: string; operation: string; duration_ms: number }[] | undefined;
    if (Array.isArray(spans) && spans.length > 0) return <TraceWaterfall spans={spans} />;
  }
  return null;
}

/** Timeline 步骤卡片 */
function StepCard({ event, index, stepNum }: { event: SSEEvent; index: number; stepNum: string }) {
  const [expanded, setExpanded] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const isExpanded = !userToggled ? true : expanded;

  // thinking 事件
  if (event.type === "thinking") {
    return (
      <div key={index} className="animate-step-enter flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-surface-1 border border-border-subtle">
        <div className="probe-brain w-7 h-7 rounded-sm flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 animate-status-pulse" />
        </div>
        <span className="text-small text-text-secondary">{event.data.text}</span>
      </div>
    );
  }

  // error 事件
  if (event.type === "error") {
    return (
      <div key={index} className="animate-step-enter rounded-md p-4 bg-surface-1 border border-border-standard border-l-2 border-l-error">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-error" />
          <span className="text-body font-medium text-error">错误</span>
        </div>
        <p className="text-small text-text-secondary">{(event.data as { message: string }).message}</p>
      </div>
    );
  }

  // playbook_hint 事件
  if (event.type === "playbook_hint") {
    const { playbook_name, score, matched_keywords, steps, common_root_causes } = event.data as {
      playbook_name: string; score: number; matched_keywords: string[];
      steps: { probe: string; query_template: string; purpose: string }[]; common_root_causes: string[];
    };
    const pct = Math.round(score * 100);
    return (
      <div key={index} className="animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-subtle border-l-2 border-l-accent">
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 bg-accent-muted-bg">
            <BookMarked className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-small font-medium text-text-primary">命中剧本：{playbook_name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn("h-1 rounded-full", pct > 60 ? "bg-success" : "bg-warning")} style={{ width: `${Math.max(pct, 6)}%`, maxWidth: "80px" }} />
              <span className="text-[10px] font-mono text-text-tertiary">{pct}%</span>
              <div className="flex gap-1">
                {matched_keywords.slice(0, 3).map((kw) => (
                  <span key={kw} className="text-[9px] font-mono px-1 py-0.5 rounded bg-app-bg text-text-tertiary">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-3.5 pb-3 pl-[52px] space-y-1.5">
          {steps.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-text-tertiary">
              <span className="font-mono shrink-0">{i + 1}.</span>
              <span className="text-info">{s.probe}</span>
              <span className="truncate">{s.purpose}</span>
            </div>
          ))}
          {common_root_causes.length > 0 && (
            <div className="text-[10px] pt-1 text-text-quaternary">常见根因：{common_root_causes[0]}</div>
          )}
        </div>
      </div>
    );
  }

  // tool_call 事件
  if (event.type === "tool_call") {
    const { tool, params } = event.data as { tool: string; params: Record<string, unknown> };
    const query = extractQuery(params);
    return (
      <div key={index} className="animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-subtle border-l-2 border-l-info">
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <span className="text-[11px] font-mono w-5 text-center shrink-0 text-text-quaternary">{stepNum}</span>
          <ProbeIcon name={tool} />
          <div className="flex-1 min-w-0">
            <div className="text-body font-semibold text-text-primary">{tool}</div>
            <div className="text-caption mt-0.5 truncate text-text-tertiary">{probeLabel(tool)} 查询执行中...</div>
          </div>
          <div className="w-2 h-2 rounded-full shrink-0 animate-status-pulse bg-info" />
        </div>
        <div className="px-3.5 pb-3 pl-[52px]">
          <div className="rounded-sm overflow-hidden bg-code-bg border border-border-subtle">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle">
              <span className="text-[10px] font-mono uppercase text-text-quaternary" style={{ letterSpacing: "0.05em" }}>{probeLabel(tool)}</span>
              <button className="flex items-center gap-1 text-[10px] text-text-quaternary">
                <Copy className="w-2.5 h-2.5" /> 复制
              </button>
            </div>
            <pre className="px-3 py-2.5 text-[12.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre text-text-secondary">
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
      tool: string; success: boolean; data: Record<string, unknown> | null;
      error: string | null; latency_ms: number; cached: boolean;
    };
    const summary = extractResultSummary(data, tool);
    return (
      <div key={index} className={cn(
        "animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-subtle border-l-2",
        success ? "border-l-success" : "border-l-error",
      )}>
        <button onClick={() => { setUserToggled(true); setExpanded(!expanded); }} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left">
          <span className="text-[11px] font-mono w-5 text-center shrink-0 text-text-quaternary">{stepNum}</span>
          <ProbeIcon name={tool} />
          <div className="flex-1 min-w-0">
            <div className="text-body font-semibold text-text-primary">{tool}</div>
            {success && summary.length > 0 && (
              <div className="text-caption mt-0.5 truncate text-text-tertiary">
                {summary[0].label}: {summary[0].value}{summary.length > 1 && ` · ${summary[1].label}: ${summary[1].value}`}
              </div>
            )}
            {!success && error && (
              <div className="text-caption mt-0.5 truncate text-error">{error.slice(0, 80)}</div>
            )}
          </div>
          <Badge variant={success ? "ok" : "err"}>{success ? "成功" : "失败"}</Badge>
          {cached && <Badge variant="warn">缓存</Badge>}
          <span className="text-[11px] font-mono text-text-tertiary">{latency_ms}ms</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0 text-text-quaternary", isExpanded && "rotate-180")} />
        </button>
        {isExpanded && (
          <div className="px-3.5 pb-3 pl-[52px]">
            {success && summary.length > 0 ? (
              <>
                <div className="flex flex-col gap-2 mt-2.5">
                  {summary.map((row, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm bg-white/[0.02] border border-border-subtle">
                      <span className="text-caption shrink-0 min-w-[80px] text-text-tertiary">{row.label}</span>
                      <span className={cn("text-small font-mono", row.alert ? "text-error" : "text-text-primary")}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <EvidenceVisualization tool={tool} data={data} />
              </>
            ) : success && data ? (
              <pre className="font-mono text-[12px] leading-relaxed p-3 rounded-sm overflow-x-auto max-h-[240px] mt-2.5 bg-code-bg border border-border-subtle text-text-secondary">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            ) : (
              <p className="text-small font-mono mt-2.5 text-error">{error || "未知错误"}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (event.type === "budget_update") return null;

  // heal_attempt 事件
  if (event.type === "heal_attempt") {
    const { original_query, error, healed_query, success } = event.data as {
      tool: string; original_query: string; error: string; healed_query: string; success: boolean;
    };
    return (
      <div key={index} className="animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-subtle border-l-2 border-l-warning">
        <div className="heal-block" style={{ margin: 0 }}>
          <div className="heal-row fail">
            <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <div className="flex-1">
              <span className="font-medium">查询失败，触发自修正</span>
              <code className="font-mono text-[11px] opacity-80 block mt-0.5 break-all">{original_query.slice(0, 120)}</code>
              <span className="text-[11px] opacity-70 block mt-0.5">{error}</span>
            </div>
          </div>
          <div className="heal-row fix">
            <Wrench className="w-3.5 h-3.5 shrink-0 mt-px" />
            <div className="flex-1">
              <span className="font-medium">{success ? "自动修正成功，重试通过" : "修正重试中..."}</span>
              <code className="font-mono text-[11px] opacity-80 block mt-0.5 break-all">{healed_query.slice(0, 120)}</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function Timeline({ events }: TimelineProps) {
  const visibleEvents = events.filter((e) => e.type !== "budget_update");
  if (visibleEvents.length === 0) return null;

  let stepCounter = 0;
  const [forceExpand, setForceExpand] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-card-title font-semibold text-text-primary">
          <Clock className="w-4 h-4" />
          推理时间线
          <Badge variant="ok">
            {visibleEvents.filter((e) => e.type === "tool_result").length} / {visibleEvents.filter((e) => e.type === "tool_result").length} 完成
          </Badge>
        </div>
        {visibleEvents.some((e) => e.type === "tool_result") && (
          <button
            onClick={() => setForceExpand(!forceExpand)}
            className="text-caption font-medium px-2 py-1 rounded transition-colors hover:text-text-primary text-text-tertiary"
          >
            {forceExpand ? "全部收起" : "全部展开"}
          </button>
        )}
      </div>
      {visibleEvents.map((event, index) => {
        if (event.type === "tool_call" || event.type === "tool_result") {
          stepCounter++;
          return <StepCard key={index} event={event} index={index} stepNum={String(stepCounter).padStart(2, "0")} />;
        }
        return <StepCard key={index} event={event} index={index} stepNum="" />;
      })}
    </div>
  );
}
