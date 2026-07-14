"use client";

import { useState, useEffect } from "react";
import { Zap, AlertCircle, Gauge, Server, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui";

const demoScenarios = [
  {
    icon: AlertCircle,
    title: "HTTP 500 错误率飙升",
    message: "tendata-crm-customer-service 最近 1 小时的 500 错误率突然升高，帮忙排查根因",
    tag: "HTTP 500",
    variant: "err" as const,
    bgClass: "bg-error-bg",
  },
  {
    icon: Gauge,
    title: "p99 延迟突增",
    message: "tendata-auth-service 过去 30 分钟 p99 延迟突然升高，用户反馈页面卡顿",
    tag: "延迟",
    variant: "warn" as const,
    bgClass: "bg-warning-bg",
  },
  {
    icon: Server,
    title: "数据库连接池打满",
    message: "tendata-corp-service 数据库连接池使用量持续接近上限，可能有连接泄漏",
    tag: "连接池",
    variant: "info" as const,
    bgClass: "bg-info-bg",
  },
  {
    icon: Zap,
    title: "JVM GC 频繁暂停",
    message: "tendata-ai-service 最近 2 小时 JVM GC 暂停频繁，服务响应变慢",
    tag: "JVM GC",
    variant: "purple" as const,
    bgClass: "bg-purple-bg",
  },
];

const STORAGE_KEY = "observatory-demo-completed";

export function DemoGuide({ onSelect, onClose }: { onSelect: (message: string) => void; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const handleSelect = (message: string) => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onSelect(message);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="animate-step-enter rounded-md overflow-hidden bg-surface-1 border border-border-standard">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <Zap className="w-4 h-4 text-accent" />
        <span className="text-card-title font-semibold text-text-primary">快速上手 — 选择一个模拟故障</span>
        <div className="flex-1" />
        <button onClick={handleSkip} className="flex items-center gap-1 text-caption text-text-tertiary hover:text-text-primary transition-colors">
          跳过引导
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-4 py-2.5">
        <p className="text-small text-text-secondary">2 分钟体验完整排查流程：自然语言提问 → Agent 自动查询 → 生成 RCA 报告</p>
      </div>
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {demoScenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.title}
              onClick={() => handleSelect(scenario.message)}
              className={`text-left p-3 rounded-sm transition-colors group border border-border-subtle hover:border-border-emphasis ${scenario.bgClass}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4`} style={{ color: `var(--color-${scenario.variant === "err" ? "error" : scenario.variant === "warn" ? "warning" : scenario.variant === "info" ? "info" : "purple"})` }} />
                <span className="text-small font-medium flex-1 text-text-primary">{scenario.title}</span>
                <Badge variant={scenario.variant}>{scenario.tag}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-caption flex-1 line-clamp-2 text-text-tertiary">{scenario.message}</p>
                <ArrowRight className="w-3.5 h-3.5 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: `var(--color-${scenario.variant === "err" ? "error" : scenario.variant === "warn" ? "warning" : scenario.variant === "info" ? "info" : "purple"})` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
