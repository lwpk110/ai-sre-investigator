"use client";

import { useState } from "react";
import {
  Activity,
  Plus,
  Search,
  Download,
  Share2,
  Shield,
  Database,
  FileText,
  GitBranch,
  Brain,
  Wrench,
  ChevronRight,
  Clock,
  Copy,
  AlertCircle,
  Lightbulb,
  Send,
} from "lucide-react";
import { StructuredRCA } from "@/components/scenarios/StructuredRCA";
import { scenarios, type Scenario, type ScenarioStep, type ProbeType } from "@/lib/scenario-data";

/** 探针图标映射 */
function ProbeIcon({ type }: { type: ProbeType }) {
  const cls = `probe-${type}`;
  const icon = {
    mimir: <Database className="w-4 h-4" />,
    loki: <FileText className="w-4 h-4" />,
    tempo: <GitBranch className="w-4 h-4" />,
    shield: <Shield className="w-4 h-4" />,
    brain: <Brain className="w-4 h-4" />,
  }[type] ?? <Wrench className="w-4 h-4" />;
  return (
    <div className={`w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 ${cls}`}>
      {icon}
    </div>
  );
}

function statusColor(status: string): string {
  return ({
    ok: "var(--color-success)",
    warn: "var(--color-warning)",
    info: "var(--color-info)",
    err: "var(--color-error)",
    running: "var(--color-info)",
  } as Record<string, string>)[status] ?? "var(--color-text-quaternary)";
}

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

/** 将 `code` 标记转为 HTML <code> */
function fmtCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:11px;color:inherit;background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:3px">$1</code>');
}

/** 骨架加载态 */
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
  const bc = statusColor(step.status);
  const pulse = step.status === "running" ? "animate-status-pulse" : "";

  if (isSkeleton) {
    return (
      <div className="skeleton-card animate-step-enter">
        <div className="skeleton-thinking">
          <ThinkingDots />
          <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{step.skeleton}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-step-enter rounded-[var(--radius-md)] overflow-hidden"
      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)", borderLeft: `2px solid ${bc}` }}
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left">
        {step.num && <span className="text-[11px] font-mono w-5 text-center shrink-0" style={{ color: "var(--color-text-quaternary)" }}>{step.num}</span>}
        <ProbeIcon type={step.probe} />
        <div className="flex-1 min-w-0">
          {step.title && (
            <div className="text-[14px] font-semibold flex items-center gap-2 flex-wrap" style={{ color: "var(--color-text-primary)" }}>
              {step.title}
              {step.badge && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                  style={step.badgeStyle === "info"
                    ? { background: "rgba(56,189,248,0.1)", color: "var(--color-info)" }
                    : { background: "rgba(245,158,11,0.1)", color: "var(--color-warning)" }}
                >
                  {step.badge}
                </span>
              )}
            </div>
          )}
          {step.subtitle && (
            <div className="text-[12px] mt-0.5 truncate" style={{ color: "var(--color-text-tertiary)" }}>{step.subtitle}</div>
          )}
        </div>
        {step.latency && (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1" style={{ background: "rgba(255,255,255,0.04)", color: step.status === "running" ? "var(--color-info)" : "var(--color-text-tertiary)" }}>
            {step.status === "running" && <span className="inline-block w-1.5 h-1.5 rounded-full animate-status-pulse" style={{ background: "var(--color-info)" }} />}
            {step.latency}
          </span>
        )}
        <div className={`w-2 h-2 rounded-full shrink-0 ${pulse}`} style={{ background: bc }} />
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} style={{ color: "var(--color-text-quaternary)" }} />
      </button>

      {(expanded || step.status === "running") && (
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
            <div className="rounded-[var(--radius-sm)] overflow-hidden mt-2.5" style={{ background: "#070912", border: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <span className="text-[10px] font-mono uppercase" style={{ color: "var(--color-text-quaternary)", letterSpacing: "0.05em" }}>{step.qlLang}</span>
                {step.qlStreaming ? (
                  <span className="text-[10px] font-mono" style={{ color: "var(--color-info)" }}>streaming...</span>
                ) : (
                  <button className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-text-quaternary)" }}>
                    <Copy className="w-2.5 h-2.5" /> 复制
                  </button>
                )}
              </div>
              <pre className="px-3 py-2.5 text-[12.5px] font-mono leading-[1.6] overflow-x-auto whitespace-pre" style={{ color: "var(--color-text-secondary)" }}>
                {highlightQL(step.qlQuery)}
              </pre>
            </div>
          )}

          {step.status === "running" && step.skeleton && (
            <div className="skeleton-card mt-2.5" style={{ borderLeft: "2px solid var(--color-info)" }}>
              <div className="skeleton-thinking">
                <ThinkingDots />
                <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{step.skeleton}</span>
              </div>
            </div>
          )}

          {step.sparkline && (
            <div className="mt-2.5 rounded-[var(--radius-sm)] p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{step.sparkline.label}</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--color-text-quaternary)" }}>{step.sparkline.range}</span>
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
            <div className="mt-2.5 rounded-[var(--radius-sm)] overflow-hidden" style={{ background: "#070912", border: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <span className="text-[10px] font-mono uppercase" style={{ color: "var(--color-text-quaternary)" }}>日志样本</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>{step.logs.count}</span>
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
            <div className="mt-2.5 rounded-[var(--radius-sm)] p-3" style={{ background: "#070912", border: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono" style={{ color: "var(--color-text-secondary)" }}>TraceID: {step.trace.traceId}</span>
                <span className="text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>总耗时 {step.trace.totalDuration}</span>
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
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-border-subtle)" }}>
                  <span className="text-[12px] shrink-0 min-w-[80px]" style={{ color: "var(--color-text-tertiary)" }}>{row.label}</span>
                  <span
                    className="text-[13px] font-mono"
                    style={{ color: row.variant === "alert" ? "var(--color-error)" : row.variant === "warn" ? "var(--color-warning)" : row.variant === "ok" ? "var(--color-success)" : "var(--color-text-primary)" }}
                    dangerouslySetInnerHTML={{ __html: fmtCode(row.value) }}
                  />
                  {row.secondLabel && (
                    <>
                      <span className="text-[12px] shrink-0" style={{ color: "var(--color-text-tertiary)" }}>{row.secondLabel}</span>
                      <span
                        className="text-[13px] font-mono"
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
    <div className="rounded-[var(--radius-md)] px-4 py-3.5 flex items-start gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
      <div className="flex-1">
        <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--color-warning)" }}>部分证据缺失，RCA 置信度较低</div>
        <div className="text-[13px] mb-2" style={{ color: "var(--color-text-secondary)" }}>以下查询未能获取数据，建议补充后重新排查：</div>
        <div className="flex flex-col gap-1.5">
          {scenario.missingQueries?.map((q, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--color-warning)" }} />
              <span dangerouslySetInnerHTML={{ __html: fmtCode(q) }} />
            </div>
          ))}
        </div>
        {scenario.partialSuggestions && scenario.partialSuggestions.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {scenario.partialSuggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-info)" }}>
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
  const fillColor = pct > 80 ? "var(--color-error)" : pct > 50 ? "var(--color-warning)" : "var(--color-accent)";
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)]" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}>
      <Shield className="w-4 h-4 shrink-0" style={{ color: "var(--color-accent)" }} />
      <div className="flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>SafeToolExecutor · 查询预算</div>
        <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: fillColor }} />
        </div>
      </div>
      <div className="text-[12px] font-mono text-right whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
        {scenario.budget.used} / {scenario.budget.max} 查询 · <span style={{ color: "var(--color-text-tertiary)" }}>{scenario.budget.tokenUsed.toLocaleString()} / {scenario.budget.tokenMax.toLocaleString()} token</span>
      </div>
    </div>
  );
}

/** 场景面板 */
function ScenarioPanel({ scenario }: { scenario: Scenario }) {
  const badgeBg = ({ ok: "rgba(16,185,129,0.1)", warn: "rgba(245,158,11,0.1)", info: "rgba(56,189,248,0.1)" } as const)[scenario.timelineBadge.variant];
  const badgeColor = ({ ok: "var(--color-success)", warn: "var(--color-warning)", info: "var(--color-info)" } as const)[scenario.timelineBadge.variant];
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-md)] px-4 py-3.5" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-standard)" }}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: "#2d3348", color: "var(--color-text-secondary)" }}>
            {scenario.author[0].toUpperCase()}
          </div>
          <span className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>{scenario.author}</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--color-text-quaternary)" }}>{scenario.time}</span>
          {scenario.statusBadge && (
            <span className="flex items-center gap-1 ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.1)", color: "var(--color-info)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-status-pulse" style={{ background: "var(--color-info)" }} />
              {scenario.statusBadge.text}
            </span>
          )}
        </div>
        <p className="text-[14px] leading-[1.5]" style={{ color: "var(--color-text-primary)" }}>{scenario.incidentText}</p>
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {scenario.tags.map((tag) => (
            <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-tertiary)" }}>{tag}</span>
          ))}
        </div>
      </div>

      <BudgetBar scenario={scenario} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            <Clock className="w-4 h-4" />
            排查时间线
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: badgeBg, color: badgeColor }}>{scenario.timelineBadge.text}</span>
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

/** 主页面 */
export default function ScenariosPage() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const activeScenario = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

  const dotColor = (color: string): string => ({
    err: "var(--color-error)", warn: "var(--color-warning)", ok: "var(--color-success)", info: "var(--color-info)", accent: "var(--color-accent)",
  } as Record<string, string>)[color] ?? "var(--color-text-quaternary)";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-app-bg)" }}>
      {/* 侧边栏 */}
      <aside className="w-[260px] shrink-0 h-screen flex flex-col" style={{ background: "var(--color-sidebar-bg)", borderRight: "1px solid var(--color-border-subtle)" }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] shrink-0" style={{ background: "var(--color-accent)" }}>
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>AI SRE</div>
              <div className="text-[10px] font-medium uppercase" style={{ color: "var(--color-text-quaternary)", letterSpacing: "0.04em" }}>Investigator</div>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-quaternary)" }} />
            <input type="text" placeholder="搜索会话..." className="w-full rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2.5 text-[13px] outline-none" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }} />
          </div>
        </div>
        <div className="px-4 py-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium" style={{ background: "var(--color-accent)", color: "#fff" }}>
            <Plus className="w-4 h-4" /> 新建排查
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="text-[10px] font-medium px-2 pt-2 pb-1 uppercase" style={{ color: "var(--color-text-quaternary)", letterSpacing: "0.06em" }}>今天</div>
          {scenarios.slice(0, 4).map((s) => (
            <button key={s.id} onClick={() => setActiveId(s.id)} className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] transition-colors mb-0.5" style={{ background: s.id === activeId ? "rgba(94,138,255,0.12)" : "transparent" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[6px]" style={{ background: dotColor(s.dotColor) }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate" style={{ color: s.id === activeId ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{s.incidentText.slice(0, 24)}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--color-text-quaternary)" }}>{s.time} · {s.timelineBadge.text}</div>
              </div>
            </button>
          ))}
          <div className="text-[10px] font-medium px-2 pt-2 pb-1 uppercase" style={{ color: "var(--color-text-quaternary)", letterSpacing: "0.06em" }}>昨天</div>
          {scenarios.slice(4).map((s) => (
            <button key={s.id} onClick={() => setActiveId(s.id)} className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] transition-colors mb-0.5" style={{ background: s.id === activeId ? "rgba(94,138,255,0.12)" : "transparent" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-[6px]" style={{ background: dotColor(s.dotColor) }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate" style={{ color: s.id === activeId ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{s.incidentText.slice(0, 24)}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--color-text-quaternary)" }}>{s.time} · {s.timelineBadge.text}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="w-7 h-7 rounded-full shrink-0" style={{ background: "linear-gradient(135deg, #5e8aff, #7c3aed)" }} />
          <div className="flex-1">
            <div className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>luwei</div>
            <div className="text-[10px]" style={{ color: "var(--color-text-quaternary)" }}>SRE Engineer</div>
          </div>
        </div>
      </aside>

      {/* 主区域 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden" style={{ background: "var(--color-main-bg)" }}>
        {/* 场景切换栏 */}
        <div className="shrink-0 flex items-center justify-between px-6 py-2.5 border-b gap-4" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="flex gap-1 flex-wrap">
            {scenarios.map((s) => (
              <button key={s.id} onClick={() => setActiveId(s.id)} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] whitespace-nowrap transition-all" style={{ background: s.id === activeId ? "rgba(94,138,255,0.12)" : "transparent", color: s.id === activeId ? "var(--color-accent)" : "var(--color-text-tertiary)", border: `1px solid ${s.id === activeId ? "rgba(94,138,255,0.25)" : "var(--color-border-subtle)"}` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor(s.dotColor) }} />
                {s.tabLabel}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <button className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors" style={{ border: "1px solid var(--color-border-standard)", color: "var(--color-text-tertiary)" }}>
              <Download className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors" style={{ border: "1px solid var(--color-border-standard)", color: "var(--color-text-tertiary)" }}>
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[780px] mx-auto px-6 py-6">
            <ScenarioPanel key={activeScenario.id} scenario={activeScenario} />
          </div>
        </div>

        {/* 底部输入 */}
        <div className="shrink-0 px-6 pb-4 pt-2" style={{ background: "var(--color-main-bg)" }}>
          <div className="max-w-[780px] mx-auto">
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-standard)" }}>
              <input type="text" placeholder="输入追问或新的故障描述..." className="flex-1 bg-transparent text-[14px] outline-none" style={{ color: "var(--color-text-primary)" }} />
              <button className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] shrink-0" style={{ background: "var(--color-accent)", color: "#fff" }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["把 p99 拉长 3 小时", "展开 TraceID 4f8a2b 的下游", "对比上次类似故障", "导出 RCA 为 Markdown"].map((t) => (
                <button key={t} className="text-[12px] px-2.5 py-1 rounded-full transition-colors" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
