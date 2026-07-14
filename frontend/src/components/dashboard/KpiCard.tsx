import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** 图标颜色变体 — 对应原型 icon-ok / icon-info / icon-accent / icon-warn / icon-purple / icon-err */
type IconVariant = "ok" | "info" | "accent" | "warn" | "purple" | "err";

interface KpiCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** lucide 图标元素，调用方传入如 <RefreshCw size={16} /> */
  icon: ReactNode;
  /** 图标容器配色 */
  iconVariant: IconVariant;
  /** KPI 标签 */
  label: string;
  /** KPI 数值（已格式化的字符串，如 "67.3%" / "$42.50"） */
  value: string;
}

// lucide 图标使用 stroke="currentColor"，设置 text-* 即可染色
const iconVariantClasses: Record<IconVariant, string> = {
  ok: "bg-success-bg text-success",
  info: "bg-info-bg text-info",
  accent: "bg-accent-muted-bg text-accent",
  warn: "bg-warning-bg text-warning",
  purple: "bg-purple-bg text-purple",
  err: "bg-error-bg text-error",
};

export function KpiCard({
  icon,
  iconVariant,
  label,
  value,
  className,
  ...props
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-subtle rounded-md p-4",
        "transition-colors duration-100",
        "hover:border-border-emphasis hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
            iconVariantClasses[iconVariant],
          )}
        >
          {icon}
        </div>
        <span className="text-small text-text-tertiary font-medium">{label}</span>
      </div>
      <div className="font-mono text-data-large font-semibold text-text-primary tracking-tight leading-[1.2] tabular-nums">
        {value}
      </div>
    </div>
  );
}
