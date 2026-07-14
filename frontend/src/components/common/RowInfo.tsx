import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RowInfoProps {
  /** 可选图标 */
  icon?: ReactNode;
  /** 字段标签 */
  label: string;
  /** 字段值 */
  value: string;
  className?: string;
}

export function RowInfo({ icon, label, value, className }: RowInfoProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-2.5 last:mb-0", className)}>
      {icon && <span className="text-text-tertiary shrink-0">{icon}</span>}
      <span className="text-caption text-text-tertiary min-w-[56px]">{label}</span>
      <span className="font-mono text-[12.5px] text-text-secondary">{value}</span>
    </div>
  );
}
