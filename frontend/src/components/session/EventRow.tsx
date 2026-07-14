import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EventType = "tool_call" | "self_heal" | "analysis" | "rca";
type BadgeVariant = "ok" | "warn" | "err" | "info" | "purple";

interface EventRowProps {
  /** 事件类型，决定 badge 标签和颜色 */
  type: EventType;
  /** 是否渲染为代码块样式 */
  code?: boolean;
  children: ReactNode;
  className?: string;
}

// 事件类型 → badge 配置
const eventBadge: Record<EventType, { variant: BadgeVariant }> = {
  tool_call: { variant: "info" },
  self_heal: { variant: "warn" },
  analysis: { variant: "ok" },
  rca: { variant: "purple" },
};

const badgeVariantClasses: Record<BadgeVariant, string> = {
  ok: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  err: "bg-error-bg text-error",
  info: "bg-info-bg text-info",
  purple: "bg-purple-bg text-purple",
};

export function EventRow({ type, code = false, children, className }: EventRowProps) {
  const { variant } = eventBadge[type];

  return (
    <div className={cn("flex items-start gap-2.5 mb-2.5 last:mb-0", className)}>
      <span
        className={cn(
          "font-mono text-[10px] font-medium py-0.5 px-1.5 rounded-sm shrink-0 mt-px",
          badgeVariantClasses[variant],
        )}
      >
        {type}
      </span>
      {code ? (
        <div className="bg-code-bg border border-border-subtle rounded-sm py-2 px-2.5 flex-1 font-mono text-[11.5px] leading-[1.5] text-text-secondary overflow-x-auto">
          {children}
        </div>
      ) : (
        <div className="flex-1 text-[12.5px] text-text-secondary leading-[1.5] pt-px">
          {children}
        </div>
      )}
    </div>
  );
}
