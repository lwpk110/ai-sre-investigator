import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  /** 标题前的图标 */
  icon?: ReactNode;
  /** 页面标题 */
  title: string;
  /** 右侧计数标签（如"12 个服务"） */
  count?: string;
  /** 右侧操作区（如刷新按钮） */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ icon, title, count, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2.5 mb-5", className)}>
      {icon && <span className="w-5 h-5 text-text-secondary shrink-0">{icon}</span>}
      <h1 className="text-page-title font-semibold text-text-primary">{title}</h1>
      <div className="flex-1" />
      {count && (
        <span className="font-mono text-caption text-text-tertiary bg-surface-1 px-2 py-0.5 rounded-full border border-border-subtle">
          {count}
        </span>
      )}
      {actions}
    </div>
  );
}
