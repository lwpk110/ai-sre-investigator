"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/cn";

interface MatchPanelProps {
  /** 输入框初始值 */
  defaultValue?: string;
  /** 自定义 placeholder */
  placeholder?: string;
  /** 点击匹配按钮时回调，传入当前输入值 */
  onMatch?: (value: string) => void;
  className?: string;
}

const DEFAULT_PLACEHOLDER = "输入症状关键词，如 OOMKill、延迟飙升、5xx 告警…";

export function MatchPanel({
  defaultValue = "",
  placeholder = DEFAULT_PLACEHOLDER,
  onMatch,
  className,
}: MatchPanelProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-subtle rounded-md p-4 mb-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck size={16} className="text-accent" />
        <span className="text-small font-semibold text-text-primary">剧本匹配</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-app-bg border border-border-subtle rounded-sm py-2 px-3 text-small text-text-secondary font-sans outline-none transition-colors focus:border-accent"
        />
        <button
          type="button"
          onClick={() => onMatch?.(value)}
          className="bg-accent text-white rounded-sm py-2 px-4 text-caption font-medium font-mono whitespace-nowrap transition-colors hover:bg-accent-hover cursor-pointer"
        >
          匹配
        </button>
      </div>
    </div>
  );
}
