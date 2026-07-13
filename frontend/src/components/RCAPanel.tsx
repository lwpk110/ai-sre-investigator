"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileCheck, AlertTriangle, ShieldAlert } from "lucide-react";

interface RCAPanelProps {
  report: string;
  confidence: "high" | "medium" | "low";
  isPartial: boolean;
}

/** 置信度配置 */
const confidenceConfig = {
  high: {
    label: "高置信度",
    color: "var(--color-success)",
    bg: "rgba(16,185,129,0.1)",
    icon: FileCheck,
  },
  medium: {
    label: "中置信度",
    color: "var(--color-warning)",
    bg: "rgba(245,158,11,0.1)",
    icon: ShieldAlert,
  },
  low: {
    label: "低置信度",
    color: "var(--color-error)",
    bg: "rgba(244,63,94,0.1)",
    icon: AlertTriangle,
  },
};

export function RCAPanel({ report, confidence, isPartial }: RCAPanelProps) {
  const config = confidenceConfig[confidence];
  const Icon = config.icon;

  return (
    <div
      className="animate-step-enter rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border-standard)",
        borderLeft: `2px solid ${config.color}`,
      }}
    >
      {/* 头部 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          根因分析报告
        </span>
        <div className="flex-1" />
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{ background: config.bg, color: config.color }}
        >
          {config.label}
        </span>
        {isPartial && (
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(244,63,94,0.1)", color: "var(--color-error)" }}
          >
            部分报告
          </span>
        )}
      </div>

      {/* Markdown 报告内容 */}
      <div className="px-5 py-4 prose-rca" style={{ color: "var(--color-text-secondary)" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </div>
    </div>
  );
}
