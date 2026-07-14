"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "ok" | "warn" | "err" | "info" | "purple";

interface ModelMetaItem {
  /** 可选图标 */
  icon?: ReactNode;
  text: string;
}

interface ModelRowProps {
  name: string;
  /** 可选标签（如 "推荐"、"推理增强"） */
  badge?: { label: string; variant: BadgeVariant };
  description: string;
  meta: ModelMetaItem[];
  /** 是否选中 */
  active?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ModelRow({
  name,
  badge,
  description,
  meta,
  active = false,
  onSelect,
  className,
}: ModelRowProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "bg-surface-1 border border-border-subtle rounded-md p-4 mb-2.5",
        "flex items-center gap-4 transition-colors cursor-pointer",
        "hover:border-border-emphasis",
        active && "border-accent/30 bg-accent/[0.03]",
        className,
      )}
    >
      {/* 单选圆圈 */}
      <div
        className={cn(
          "w-[18px] h-[18px] rounded-full border-2 shrink-0",
          "flex items-center justify-center transition-colors",
          active ? "border-accent" : "border-border-emphasis",
        )}
      >
        {active && <span className="w-2 h-2 rounded-full bg-accent" />}
      </div>
      {/* 模型信息 */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-body font-medium text-text-primary">{name}</span>
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
        </div>
        <p className="text-caption text-text-tertiary mb-1.5">{description}</p>
        <div className="flex items-center gap-3 text-micro font-mono text-text-quaternary">
          {meta.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-0.5">
              {item.icon}
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
