"use client";

import { useState } from "react";
import {
  Database,
  FileText,
  GitBranch,
  Shield,
  Brain,
  Wrench,
  ChevronRight,
  Clock,
  Copy,
  AlertCircle,
  Lightbulb,
  Send,
  Download,
  Share2,
} from "lucide-react";
import { StructuredRCA } from "@/components/scenarios/StructuredRCA";
import { PageHeader } from "@/components/layout";
import { Badge, StatusDot } from "@/components/ui";
import { scenarios, type Scenario, type ScenarioStep, type ProbeType, type StepStatus } from "@/lib/scenario-data";

/** 探针图标映射 */
function ProbeIcon({ type }: { type: ProbeType }) {
  const icon = {
    mimir: <Database className="w-4 h-4" />,
    loki: <FileText className="w-4 h-4" />,
    tempo: <GitBranch className="w-4 h-4" />,
    shield: <Shield className="w-4 h-4" />,
    brain: <Brain className="w-4 h-4" />,
  }[type] ?? <Wrench className="w-4 h-4" />;
  return (
    <div className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 probe-${type}`}>
      {icon}
    </div>
  );
}

// 状态 → StatusDot 映射
const stepDotStatus = (s: StepStatus): "ok" | "warn" | "err" | "info" => {
  if (s === "ok") return "ok";
  if (s === "warn") return "warn";
  if (s === "err") return "err";
  return "info";
};

/** 简单 QL 高亮 */
function highlightQL(query: string) {
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([a-zA-Z_][a-zA-Z0-9_]*)|([+\-*/=~!<>|&^%])|(\[|\]|\{|\}|\(|\))/g;
  const parts: { text: string; cls: string }[] = [];
  let last = 0;
  let m;
  while ((m = regex.exec(query)) !== null) {
    if (m.index > last) parts.push({ text: query.slice(last, m.index), cls: "" });
    if (m[1]) parts.push({ text: m[1], cls: "str" });
    else if (m[2]) parts.push({ text: m[2], cls: "num" });
    else if (m[3]) parts.push({ text: m[3], cls: "kw" });
    else if (m[4]) parts.push({ text: m[4], cls: "op" });
    else parts.push({ text: m[0], cls: "" });
    last = regex.lastIndex;
  }
  if (last < query.length) parts.push({ text: query.slice(last), cls: "" });
  return (
    <code className="code-syntax">
      {parts.map((p, i) => (
        <span key={i} className={p.cls}>{p.text}</span>
      ))}
    </code>
  );
}

function fmtCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:11px;color:inherit;background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:3px">$1</code>');
}

function ThinkingDots() {
  return (
    <div className="thinking-dots">
      <div className="thinking-dot" />
      <div className="thinking-dot" />
      <div className="thinking-dot" />
    </div>
  );
}

/** 单个场景步骤卡片 */
function StepCard({ step }: { step: ScenarioStep }) {
  const [expanded, setExpanded] = useState(step.expanded ?? false);
  const isSkeleton = step.status === "running" && !step.qlQuery && !!step.skeleton;
  const showBody = expanded || step.status === "running";

  if (isSkeleton) {
    return (
      <div className="skeleton-card animate-step-enter">
        <div className="skeleton-thinking">
          <ThinkingDots />
          <span className="text-caption text-text-tertiary">{step.skeleton}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-subtle">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left">
        {step.num && <span className="text-micro font-mono w-5 text-center shrink-0 text-text-quaternary">{step.num}</span>}
        <ProbeIcon type={step.probe} />
        <div className="flex-1 min-w-0">
          {step.title && (
            <div className="text-body font-semibold flex items-center gap-2 flex-wrap text-text-primary">
              {step.title}
              {step.badge && (
                <Badge variant={step.badgeStyle === "info" ? "info" : "warn"}>{step.badge}</Badge>
              )}
            </div>
          )}
          {step.subtitle && (
            <div className="text-caption mt-0.5 truncate text-text-tertiary">{step.subtitle}</div>
          )}
        </div>
        {step.latency && (
          <span className="text-micro font-mono px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 bg-white/[0.04] text-text-tertiary">
            {step.status === "running" && <StatusDot status="running" className="!w-1.5 !h-1.5" />}
            {step.latency}
          </span>
        )}
        <StatusDot status={stepDotStatus(step.status)} />
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform text-text-quaternary ${expanded ? "rotate-90" : ""}`} />
      </button>

      {showBody && (
        <div className="px-3.5 pb-3 pl-[52px]">
          {step.heal && (
            <div className="heal-block">
              <div className="heal-row fail">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{step.heal.failText}</span>
              </div>
              <div className="heal-row fix">
                <Wrench className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{step.heal.fixText}</span>
              </div>
            </div>
          )}

          {step.qlQuery && (
            <div className="rounded-sm overflow-hidden mt-2.5 bg-code-bg border border-border-subtle">
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle">
                <span className="text-[10px] font-mono uppercase text-text-quaternary tracking-wide">{step.qlLang}</span>
                {step.qlStreaming ? (
                  <span className="text-[10px] font-mono text-info">streaming...</span>
                ) : (
                  <button className="flex items-center gap-1 text-[10px] text-text-quaternary">
                    <Copy className="w-2.5 h-2.5" /> 复制
                  </button>
                )}
              </div>
              <pre className="px-3 py-2.5 text-[12.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre text-text-secondary">
                {highlightQL(step.qlQuery)}
              </pre>
            </div>
          )}

          {step.status === "running" && step.skeleton && (
            <div className="skeleton-card mt-2.5 border-l-2 border-info">
              <div className="skeleton-thinking">
                <ThinkingDots />
                <span className="text-caption text-text-tertiary">{step.skeleton}</span>
              </div>
            </div>
          )}

          {step.sparkline && (
            <div className="mt-2.5 rounded-sm p-3 bg-white/[0.02] border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-micro font-medium uppercase tracking-wide text-text-tertiary">{step.sparkline.label}</span>
                <span className="text-[10px] font-mono text-text-quaternary">{step.sparkline.range}</span>
              </div>
              <div className="sparkline">
                {step.sparkline.bars.map((bar, i) => (
                  <div
                    key={i}
                    className={`spark-bar ${bar.variant === "baseline" ? "" : bar.variant}`}
                    style={{ height: `${bar.height}%`, ...(bar.variant === "baseline" ? { background: "var(--color-text-quaternary)", opacity: 0.4 } : {}) }}
                  />
                ))}
              </div>
              <div className="sparkline-axis">
                {step.sparkline.axis.map((label, i) => (<span key={i}>{label}</span>))}
              </div>
            </div>
          )}

          {step.logs && (
            <div className="mt-2.5 rounded-sm overflow-hidden bg-code-bg border border-border-subtle">
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border-subtle">
                <span className="text-[10px] font-mono uppercase text-text-quaternary">日志样本</span>
                <span className="text-[10px] font-mono text-text-tertiary">{step.logs.count}</span>
              </div>
              <div className="log-viewer-body">
                {step.logs.lines.map((line, i) => (
                  <div key={i} className="log-line">
                    <span className="log-ts">{line.ts}</span>
                    <span className={`log-level ${line.level}`}>{line.level}</span>
                    <span
                      className="log-msg"
                      dangerouslySetInnerHTML={{
                        __html: line.highlight ? `<span class="hl">${line.msg}</span>` : line.highlightWarn ? `<span class="hl-warn">${line.msg}</span>` : line.msg,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step.trace && (
            <div className="mt-2.5 rounded-sm p-3 bg-code-bg border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-micro font-mono text-text-secondary">TraceID: {step.trace.traceId}</span>
                <span className="text-micro font-mono text-text-tertiary">总耗时 {step.trace.totalDuration}</span>
              </div>
              <div className="trace-waterfall-body">
                {step.trace.spans.map((span, i) => (
                  <div key={i} className="trace-span-row">
                    <span className="trace-span-label">{span.label}</span>
                    <div className="trace-span-bar-container">
                      <div className={`trace-span-bar ${span.variant}`} style={{ width: `${Math.max(span.width, 2)}%`, marginLeft: `${span.marginLeft}%` }}>
                        {span.width > 10 ? span.duration : ""}
                      </div>
                    </div>
                    <span className="trace-span-duration">{span.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step.results && step.results.length > 0 && (
            <div className="flex flex-col gap-2 mt-2.5">
              {step.results.map((row, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm bg-white/[0.02] border border-border-subtle">
                  <span className="text-caption shrink-0 min-w-[80px] text-text-tertiary">{row.label}</span>
                  <span
                    className="text-small font-mono"
                    style={{ color: row.variant === "alert" ? "var(--color-error)" : row.variant === "warn" ? "var(--color-warning)" : row.variant === "ok" ? "var(--color-success)" : "var(--color-text-primary)" }}
                    dangerouslySetInnerHTML={{ __html: fmtCode(row.value) }}
                  />
                  {row.secondLabel && (
                    <>
                      <span className="text-caption shrink-0 text-text-tertiary">{row.secondLabel}</span>
                      <span
                        className="text-small font-mono"
                        style={{ color: row.secondVariant === "alert" ? "var(--color-error)" : row.secondVariant === "warn" ? "var(--color-warning)" : row.secondVariant === "ok" ? "var(--color-success)" : "var(--color-text-primary)" }}
                      >
                        {row.secondValue}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 部分 RCA 警告 */
function PartialRCABanner({ scenario }: { scenario: Scenario }) {
  if (!scenario.isPartial) return null;
  return (
    <div className="rounded-md px-4 py-3.5 flex items-start gap-3 bg-warning-bg border border-warning/25">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
      <div className="flex-1">
        <div className="text-small font-semibold mb-1 text-warning">部分证据缺失，RCA 置信度较低</div>
        <div className="text-small mb-2 text-text-secondary">以下查询未能获取数据，建议补充后重新排查：</div>
        <div className="flex flex-col gap-1.5">
          {scenario.missingQueries?.map((q, i) => (
            <div key={i} className="flex items-center gap-2 text-caption text-text-tertiary">
              <span className="w-1 h-1 rounded-full shrink-0 bg-warning" />
              <span dangerouslySetInnerHTML={{ __html: fmtCode(q) }} />
            </div>
          ))}
        </div>
        {scenario.partialSuggestions && scenario.partialSuggestions.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {scenario.partialSuggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-caption text-info">
                <Lightbulb className="w-3 h-3 shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 预算条 */
function BudgetBar({ scenario }: { scenario: Scenario }) {
  const pct = (scenario.budget.used / scenario.budget.max) * 100;
  const fillColor = pct > 80 ? "bg-error" : pct > 50 ? "bg-warning" : "bg-accent";
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-surface-1 border border-border-subtle">
      <Shield className="w-4 h-4 shrink-0 text-accent" />
      <div className="flex-1">
        <div className="text-micro font-medium uppercase tracking-wide text-text-tertiary">SafeToolExecutor · 查询预算</div>
        <div className="h-1 rounded-full mt-1.5 overflow-hidden bg-white/[0.06]">
          <div className={`h-full rounded-full transition-all ${fillColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-caption font-mono text-right whitespace-nowrap text-text-secondary">
        {scenario.budget.used} / {scenario.budget.max} 查询 · <span className="text-text-tertiary">{scenario.budget.tokenUsed.toLocaleString()} / {scenario.budget.tokenMax.toLocaleString()} token</span>
      </div>
    </div>
  );
}

/** 场景面板 */
function ScenarioPanel({ scenario }: { scenario: Scenario }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md px-4 py-3.5 bg-surface-1 border border-border-standard">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-micro font-semibold bg-surface-2 text-text-secondary">
            {scenario.author[0].toUpperCase()}
          </div>
          <span className="text-small font-medium text-text-primary">{scenario.author}</span>
          <span className="font-mono text-micro text-text-quaternary">{scenario.time}</span>
          {scenario.statusBadge && (
            <span className="flex items-center gap-1 ml-auto">
              <StatusDot status="running" />
              <span className="font-mono text-micro text-info">{scenario.statusBadge.text}</span>
            </span>
          )}
        </div>
        <p className="text-body leading-relaxed text-text-primary">{scenario.incidentText}</p>
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {scenario.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>

      <BudgetBar scenario={scenario} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-card-title font-semibold text-text-primary">
            <Clock className="w-4 h-4" />
            排查时间线
            <Badge variant={scenario.timelineBadge.variant === "warn" ? "warn" : scenario.timelineBadge.variant === "ok" ? "ok" : "info"}>
              {scenario.timelineBadge.text}
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          {scenario.steps.map((step, i) => (<StepCard key={i} step={step} />))}
        </div>
      </div>

      <PartialRCABanner scenario={scenario} />

      {scenario.rca && <StructuredRCA rca={scenario.rca} />}
    </div>
  );
}

/** 主页面 — 场景切换 + 内容区 */
export default function ScenariosPage() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const activeScenario = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

  const dotColorClass = (color: string): string =>
    ({ err: "bg-error", warn: "bg-warning", ok: "bg-success", info: "bg-info", accent: "bg-accent" })[color] ?? "bg-text-quaternary";

  return (
    <div>
      <PageHeader title="场景演示" />

      {/* 场景切换标签栏 */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex gap-1 flex-wrap">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`flex items-center gap-1.5 text-caption font-medium px-3 py-1.5 rounded-sm whitespace-nowrap transition-colors border ${
                s.id === activeId
                  ? "bg-accent-muted-bg text-accent border-accent/25"
                  : "text-text-tertiary border-border-subtle hover:border-border-standard"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass(s.dotColor)}`} />
              {s.tabLabel}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <button className="w-8 h-8 flex items-center justify-center rounded-sm transition-colors border border-border-standard text-text-tertiary hover:text-text-primary">
            <Download className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-sm transition-colors border border-border-standard text-text-tertiary hover:text-text-primary">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 场景内容 */}
      <ScenarioPanel key={activeScenario.id} scenario={activeScenario} />

      {/* 底部输入 */}
      <div className="mt-6">
        <div className="flex items-center gap-2 rounded-md px-3 py-2 bg-surface-1 border border-border-standard">
          <input
            type="text"
            placeholder="输入追问或新的故障描述..."
            className="flex-1 bg-transparent text-body outline-none text-text-primary"
          />
          <button className="w-8 h-8 flex items-center justify-center rounded-sm shrink-0 bg-accent text-white">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {["把 p99 拉长 3 小时", "展开 TraceID 4f8a2b 的下游", "对比上次类似故障", "导出 RCA 为 Markdown"].map((t) => (
            <button key={t} className="text-caption px-2.5 py-1 rounded-full transition-colors bg-surface-1 border border-border-subtle text-text-tertiary hover:border-border-standard">
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
