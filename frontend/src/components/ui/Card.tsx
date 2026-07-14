import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 加载中 — 显示 skeleton 占位 */
  loading?: boolean;
  /** 空数据 — 显示空状态提示 */
  empty?: boolean;
  /** 错误信息 — 传入则显示错误状态 */
  error?: string;
  /** 空状态自定义文案 */
  emptyText?: string;
}

export function Card({
  loading = false,
  empty = false,
  error,
  emptyText = "暂无数据",
  className,
  children,
  ...props
}: CardProps) {
  const baseClass = cn(
    "bg-surface-1 border border-border-subtle rounded-md p-4 transition-colors",
    className,
  );

  // 状态优先级：error > loading > empty > loaded
  if (error) {
    return (
      <div className={cn(baseClass, "border-error/50")} {...props}>
        <p className="text-small text-error">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={baseClass} {...props}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 rounded bg-surface-2 w-3/4" />
          <div className="h-4 rounded bg-surface-2 w-1/2" />
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn(baseClass, "flex items-center justify-center py-8")} {...props}>
        <p className="text-small text-text-tertiary">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={baseClass} {...props}>
      {children}
    </div>
  );
}
