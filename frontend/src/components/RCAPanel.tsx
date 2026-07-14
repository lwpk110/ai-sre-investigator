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
  Monitor,
  Clock,
  Search,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

const confidenceConfig = {
  high: { label: "高置信度", variant: "ok" as const, icon: FileCheck },
  medium: { label: "中置信度", variant: "warn" as const, icon: ShieldAlert },
  low: { label: "低置信度", variant: "err" as const, icon: AlertTriangle },
};

const navTabs = [
  { id: "overview", label: "服务与问题", icon: Monitor },
  { id: "timeline", label: "时间线", icon: Clock },
  { id: "evidence", label: "证据链", icon: Search },
  { id: "rootcause", label: "根因与建议", icon: Wrench },
];

export function RCAPanel({
  report,
  confidence,
  isPartial,
  missingQueries = [],
  suggestions = [],
  onFollowUp,
}: {
  report: string;
  confidence: "high" | "medium" | "low";
  isPartial: boolean;
  missingQueries?: string[];
  suggestions?: string[];
  onFollowUp?: (message: string) => void;
}) {
  const config = confidenceConfig[confidence];
  const Icon = config.icon;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleExportMarkdown = () => {
    const header =
      `# 根因分析报告\n\n> 置信度: ${config.label}` +
      (isPartial ? " | 部分报告" : "") +
      `\n> 生成时间: ${new Date().toLocaleString("zh-CN")}\n\n---\n\n`;
    const blob = new Blob([header + report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rca-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
    <div className="animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-standard">
      {/* 标题栏 */}
      <div className="flex items-start justify-between px-4 py-4 border-b border-border-subtle">
        <div>
          <div className="text-[18px] font-semibold text-text-primary" style={{ letterSpacing: "-0.01em" }}>
            根因分析报告
          </div>
          <div className="text-caption font-mono mt-1 text-text-tertiary">
            {new Date().toLocaleString("zh-CN")}
            {isPartial && " · 预算受限"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            title="复制链接"
            className={cn(
              "flex items-center gap-1 text-caption px-2 py-1 rounded-sm transition-colors border",
              copied ? "bg-success-bg text-success border-success/20" : "bg-app-bg text-text-secondary border-border-subtle",
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? "已复制" : "分享"}
          </button>
          <button
            onClick={handleExportMarkdown}
            title="导出 Markdown"
            className="flex items-center gap-1 text-caption px-2 py-1 rounded-sm transition-colors bg-app-bg text-text-secondary border border-border-subtle hover:border-border-standard"
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
          <Badge variant={config.variant} className="flex items-center gap-1.5 px-2.5 py-1 font-medium">
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </Badge>
          {isPartial && <Badge variant="err">部分报告</Badge>}
        </div>
      </div>

      {/* 分段导航 */}
      <div className="flex gap-0 px-4 border-b border-border-subtle overflow-x-auto">
        {navTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 text-caption font-medium px-3.5 py-2.5 whitespace-nowrap transition-colors border-b-2",
                isActive ? "text-accent border-accent" : "text-text-tertiary border-transparent",
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 部分 RCA 警告 */}
      {isPartial && missingQueries.length > 0 && (
        <div className="px-4 py-3 border-b border-border-subtle bg-error/[0.06]">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <div>
              <p className="text-small font-medium text-error">本报告因预算限制未能完成以下查询</p>
              <p className="text-caption mt-0.5 text-text-tertiary">以下信息缺失可能影响根因判断的准确性，可追问补充</p>
            </div>
          </div>
          <ul className="space-y-1 ml-6">
            {missingQueries.map((q, i) => (
              <li key={i} className="text-caption font-mono flex items-center gap-1.5 text-text-secondary">
                <span className="text-error">x</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 报告内容 */}
      <div className="px-5 py-5 prose-rca text-text-secondary">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </div>

      {/* 低置信度建议 */}
      {confidence === "low" && suggestions.length > 0 && (
        <div className="px-4 py-3 border-t border-border-subtle bg-warning/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            <span className="text-small font-medium text-warning">建议进一步排查</span>
          </div>
          <div className="flex flex-wrap gap-2 ml-6">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(s)}
                disabled={!onFollowUp}
                className="text-caption px-2.5 py-1.5 rounded-sm transition-colors disabled:opacity-50 bg-warning/[0.08] border border-warning/20 text-text-secondary hover:border-warning/40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 追问快捷按钮 */}
      {onFollowUp && !isPartial && (
        <div className="px-4 py-3 border-t border-border-subtle">
          <span className="text-caption block mb-2 text-text-tertiary">继续下钻</span>
          <div className="flex flex-wrap gap-2">
            {["把 p99 拉长 3 小时看看趋势", "查看相关服务的错误日志", "展开关键 TraceID 的下游调用"].map((t) => (
              <button
                key={t}
                onClick={() => onFollowUp(t)}
                className="text-caption px-2.5 py-1.5 rounded-sm transition-colors flex items-center gap-1 bg-app-bg border border-border-subtle text-text-secondary hover:border-border-standard"
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
