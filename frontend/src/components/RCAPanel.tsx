"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileCheck,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  ChevronRight,
  Share2,
  Download,
  Check,
} from "lucide-react";

interface RCAPanelProps {
  report: string;
  confidence: "high" | "medium" | "low";
  isPartial: boolean;
  /** 部分 RCA 中缺失的查询列表 */
  missingQueries?: string[];
  /** 低置信度时的建议下一步操作 */
  suggestions?: string[];
  /** 追问回调：点击建议或追问按钮时触发 */
  onFollowUp?: (message: string) => void;
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

/** 追问快捷按钮的上下文模板 */
const followUpTemplates = [
  "把 p99 拉长 3 小时看看趋势",
  "查看相关服务的错误日志",
  "展开关键 TraceID 的下游调用",
];

export function RCAPanel({
  report,
  confidence,
  isPartial,
  missingQueries = [],
  suggestions = [],
  onFollowUp,
}: RCAPanelProps) {
  const config = confidenceConfig[confidence];
  const Icon = config.icon;
  const [copied, setCopied] = useState(false);

  /** 导出 RCA 为 Markdown 文件 */
  const handleExportMarkdown = () => {
    const header =
      `# 根因分析报告\n\n> 置信度: ${config.label}` +
      (isPartial ? " | 部分报告" : "") +
      `\n> 生成时间: ${new Date().toLocaleString("zh-CN")}\n\n---\n\n`;
    const blob = new Blob([header + report], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rca-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** 复制分享链接到剪贴板 */
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案：用 textarea + execCommand
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span
          className="text-[15px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          根因分析报告
        </span>
        <div className="flex-1" />
        {/* 分享按钮 */}
        <button
          onClick={handleShare}
          title="复制链接"
          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-[var(--radius-sm)] transition-colors"
          style={{
            background: copied
              ? "rgba(16,185,129,0.1)"
              : "var(--color-app-bg)",
            color: copied
              ? "var(--color-success)"
              : "var(--color-text-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          {copied ? "已复制" : "分享"}
        </button>
        {/* 导出 Markdown 按钮 */}
        <button
          onClick={handleExportMarkdown}
          title="导出 Markdown"
          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-[var(--radius-sm)] transition-colors"
          style={{
            background: "var(--color-app-bg)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <Download className="w-3.5 h-3.5" />
          导出
        </button>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{ background: config.bg, color: config.color }}
        >
          {config.label}
        </span>
        {isPartial && (
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(244,63,94,0.1)",
              color: "var(--color-error)",
            }}
          >
            部分报告
          </span>
        )}
      </div>

      {/* 部分 RCA 警告横幅 */}
      {isPartial && missingQueries.length > 0 && (
        <div
          className="px-4 py-3 border-b"
          style={{
            background: "rgba(244,63,94,0.06)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "var(--color-error)" }}
            />
            <div>
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--color-error)" }}
              >
                本报告因预算限制未能完成以下查询
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                以下信息缺失可能影响根因判断的准确性，可追问补充
              </p>
            </div>
          </div>
          <ul className="space-y-1 ml-6">
            {missingQueries.map((q, i) => (
              <li
                key={i}
                className="text-[12px] font-mono flex items-center gap-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span style={{ color: "var(--color-error)" }}>x</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Markdown 报告内容 */}
      <div
        className="px-5 py-4 prose-rca"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </div>

      {/* 低置信度建议 */}
      {confidence === "low" && suggestions.length > 0 && (
        <div
          className="px-4 py-3 border-t"
          style={{
            background: "rgba(245,158,11,0.06)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb
              className="w-4 h-4"
              style={{ color: "var(--color-warning)" }}
            />
            <span
              className="text-[13px] font-medium"
              style={{ color: "var(--color-warning)" }}
            >
              建议进一步排查
            </span>
          </div>
          <div className="flex flex-wrap gap-2 ml-6">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(s)}
                disabled={!onFollowUp}
                className="text-[12px] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 追问快捷按钮 */}
      {onFollowUp && !isPartial && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <span
            className="text-[12px] block mb-2"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            继续下钻
          </span>
          <div className="flex flex-wrap gap-2">
            {followUpTemplates.map((t) => (
              <button
                key={t}
                onClick={() => onFollowUp(t)}
                className="text-[12px] px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors flex items-center gap-1"
                style={{
                  background: "var(--color-app-bg)",
                  border: "1px solid var(--color-border-subtle)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {t}
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
