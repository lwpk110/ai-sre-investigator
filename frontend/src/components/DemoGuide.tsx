"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  AlertCircle,
  Gauge,
  Server,
  X,
  ArrowRight,
} from "lucide-react";

interface DemoGuideProps {
  /** 用户选择模拟故障时触发 */
  onSelect: (message: string) => void;
  /** 关闭引导 */
  onClose: () => void;
}

/** 模拟故障场景（复用 spike/dataset 真实数据样本） */
const demoScenarios = [
  {
    icon: AlertCircle,
    title: "HTTP 500 错误率飙升",
    message:
      "tendata-crm-customer-service 最近 1 小时的 500 错误率突然升高，帮忙排查根因",
    tag: "HTTP 500",
    color: "rgba(244,63,94,0.1)",
    tagColor: "var(--color-error)",
  },
  {
    icon: Gauge,
    title: "p99 延迟突增",
    message:
      "tendata-auth-service 过去 30 分钟 p99 延迟突然升高，用户反馈页面卡顿",
    tag: "延迟",
    color: "rgba(245,158,11,0.1)",
    tagColor: "var(--color-warning)",
  },
  {
    icon: Server,
    title: "数据库连接池打满",
    message:
      "tendata-corp-service 数据库连接池使用量持续接近上限，可能有连接泄漏",
    tag: "连接池",
    color: "rgba(56,189,248,0.1)",
    tagColor: "var(--color-info)",
  },
  {
    icon: Zap,
    title: "JVM GC 频繁暂停",
    message:
      "tendata-ai-service 最近 2 小时 JVM GC 暂停频繁，服务响应变慢",
    tag: "JVM GC",
    color: "rgba(168,85,247,0.1)",
    tagColor: "var(--color-accent)",
  },
];

const STORAGE_KEY = "observatory-demo-completed";

export function DemoGuide({ onSelect, onClose }: DemoGuideProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 首次访问时显示引导
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setVisible(true);
    }
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
    <div
      className="animate-step-enter rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border-standard)",
      }}
    >
      {/* 头部 */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <Zap
          className="w-4 h-4"
          style={{ color: "var(--color-accent)" }}
        />
        <span
          className="text-[15px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          快速上手 — 选择一个模拟故障
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 text-[12px] transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          跳过引导
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 说明 */}
      <div className="px-4 py-2.5">
        <p
          className="text-[13px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          2 分钟体验完整排查流程：自然语言提问 → Agent 自动查询 → 生成 RCA
          报告
        </p>
      </div>

      {/* 模拟故障卡片 */}
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {demoScenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.title}
              onClick={() => handleSelect(scenario.message)}
              className="text-left p-3 rounded-[var(--radius-sm)] transition-colors group"
              style={{
                background: scenario.color,
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon
                  className="w-4 h-4"
                  style={{ color: scenario.tagColor }}
                />
                <span
                  className="text-[13px] font-medium flex-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {scenario.title}
                </span>
                <span
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: scenario.color,
                    color: scenario.tagColor,
                  }}
                >
                  {scenario.tag}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p
                  className="text-[12px] flex-1 line-clamp-2"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {scenario.message}
                </p>
                <ArrowRight
                  className="w-3.5 h-3.5 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: scenario.tagColor }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
