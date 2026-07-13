"use client";

import { useState } from "react";
import { Monitor, GitBranch, Search, CheckCircle, AlertTriangle } from "lucide-react";
import type { RCAMetrics } from "@/lib/scenario-data";

/** 严重度徽章配色 */
const sevConfig: Record<string, { bg: string; color: string }> = {
  P0: { bg: "rgba(244,63,94,0.15)", color: "var(--color-error)" },
  P1: { bg: "rgba(244,63,94,0.12)", color: "var(--color-error)" },
  P2: { bg: "rgba(245,158,11,0.12)", color: "var(--color-warning)" },
  P3: { bg: "rgba(56,189,248,0.12)", color: "var(--color-info)" },
};

/** 结构化 RCA 报告 — 复刻 scenarios 原型 rca-report 区块 */
export function StructuredRCA({ rca }: { rca: RCAMetrics }) {
  const [activeTab, setActiveTab] = useState(0);
  const sev = sevConfig[rca.severity] ?? sevConfig.P2;

  const tabs = ["服务与问题", "证据链", "根因分析", "修复建议"];

  return (
    <div
      className="rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border-standard)",
      }}
    >
      {/* 头部 */}
      <div
        className="flex items-start justify-between px-4 py-3.5 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div>
          <div className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {rca.title}
          </div>
          <div className="text-[11px] font-mono mt-1" style={{ color: "var(--color-text-quaternary)" }}>
            {rca.subtitle}
          </div>
        </div>
        <span
          className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: sev.bg, color: sev.color }}
        >
          {rca.severity}
        </span>
      </div>

      {/* 导航标签 */}
      <div className="rca-nav px-2">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`rca-nav-item ${activeTab === i ? "active" : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="px-4 pb-4">
        {activeTab === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                服务与问题概述
              </h3>
            </div>
            {/* 指标网格 */}
            <div className="metric-grid">
              {rca.metrics.map((m, i) => (
                <div key={i} className="metric-card">
                  <div className="metric-label">{m.label}</div>
                  <div className={`metric-value ${m.alert ? "alert" : ""}`}>{m.value}</div>
                  <div className={`metric-delta ${m.deltaUp ? "up" : ""}`}>{m.delta}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                证据链
              </h3>
              <span className={`confidence-badge ${rca.confidence}`}>
                置信度: {rca.confidence === "high" ? "高" : rca.confidence === "medium" ? "中" : "低"}
              </span>
            </div>
            <div className="evidence-list">
              {rca.evidence.map((e, i) => (
                <div key={i} className="evidence-item">
                  <span className="evidence-num">{e.num}</span>
                  <span className="evidence-text" dangerouslySetInnerHTML={{ __html: highlightCode(e.text) }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                根因分析
              </h3>
              <span className={`confidence-badge ${rca.confidence}`}>
                置信度: {rca.confidence === "high" ? "高" : rca.confidence === "medium" ? "中" : "低"}
              </span>
            </div>
            {rca.rootCause.map((p, i) => (
              <p
                key={i}
                className="text-[14px] leading-[1.6] mb-2"
                style={{ color: "var(--color-text-secondary)" }}
                dangerouslySetInnerHTML={{ __html: highlightCode(p) }}
              />
            ))}
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                修复建议
              </h3>
            </div>
            <div className="rec-list">
              {rca.recommendations.map((r, i) => {
                const cls = r.priority.startsWith("P0") ? "p0" : r.priority.startsWith("P1") ? "p1" : "p2";
                return (
                  <div key={i} className="rec-item">
                    <span className={`rec-priority ${cls}`}>{r.priority}</span>
                    <span className="rec-text" dangerouslySetInnerHTML={{ __html: highlightCode(r.text) }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 将文本中的 `code` 标记转为 <code> 高亮 */
function highlightCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>');
}
