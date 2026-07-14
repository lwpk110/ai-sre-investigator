"use client";

import { useState } from "react";
import { Monitor, GitBranch, Search, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RCAMetrics } from "@/lib/scenario-data";

/** 严重度 → badge 变体 */
const sevVariant = (s: string): "err" | "warn" | "info" =>
  s.startsWith("P0") || s.startsWith("P1") ? "err" : s.startsWith("P2") ? "warn" : "info";

const confVariant = (c: string): "ok" | "warn" | "err" =>
  c === "high" ? "ok" : c === "medium" ? "warn" : "err";
const confLabel = (c: string) => c === "high" ? "高" : c === "medium" ? "中" : "低";

/** 结构化 RCA 报告 — 复刻 scenarios 原型 rca-report 区块 */
export function StructuredRCA({ rca }: { rca: RCAMetrics }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["服务与问题", "证据链", "根因分析", "修复建议"];

  return (
    <div className="rounded-md overflow-hidden bg-surface-1 border border-border-standard">
      {/* 头部 */}
      <div className="flex items-start justify-between px-4 py-3.5 border-b border-border-subtle">
        <div>
          <div className="text-card-title font-semibold text-text-primary">
            {rca.title}
          </div>
          <div className="font-mono text-micro mt-1 text-text-quaternary">
            {rca.subtitle}
          </div>
        </div>
        <Badge variant={sevVariant(rca.severity)} className="font-semibold">
          {rca.severity}
        </Badge>
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
              <Monitor className="w-4 h-4 text-accent" />
              <h3 className="text-body font-semibold text-text-primary">
                服务与问题概述
              </h3>
            </div>
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
              <GitBranch className="w-4 h-4 text-accent" />
              <h3 className="text-body font-semibold text-text-primary">
                证据链
              </h3>
              <Badge variant={confVariant(rca.confidence)}>
                置信度: {confLabel(rca.confidence)}
              </Badge>
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
              <Search className="w-4 h-4 text-accent" />
              <h3 className="text-body font-semibold text-text-primary">
                根因分析
              </h3>
              <Badge variant={confVariant(rca.confidence)}>
                置信度: {confLabel(rca.confidence)}
              </Badge>
            </div>
            {rca.rootCause.map((p, i) => (
              <p
                key={i}
                className="text-body leading-relaxed mb-2 text-text-secondary"
                dangerouslySetInnerHTML={{ __html: highlightCode(p) }}
              />
            ))}
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-accent" />
              <h3 className="text-body font-semibold text-text-primary">
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

function highlightCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>');
}
