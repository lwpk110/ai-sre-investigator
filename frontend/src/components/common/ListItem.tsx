import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type ListItemStatus = "ok" | "warn" | "err";

interface ListItemProps {
  /** 健康状态 */
  status: ListItemStatus;
  /** 资源名称 */
  name: string;
  /** 描述行（副本数 · 健康状态等） */
  description: string;
  /** 展开后内容 */
  children?: ReactNode;
  /** 初始是否展开 */
  defaultOpen?: boolean;
  className?: string;
}

// 状态点配色 + 发光效果
const statusDotClasses: Record<ListItemStatus, string> = {
  ok: "bg-success shadow-[0_0_6px_var(--color-success)]",
  warn: "bg-warning shadow-[0_0_6px_var(--color-warning)]",
  err: "bg-error shadow-[0_0_6px_var(--color-error)]",
};

export function ListItem({
  status,
  name,
  description,
  children,
  defaultOpen = false,
  className,
}: ListItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-standard rounded-md mb-2 overflow-hidden",
        "transition-colors duration-100 hover:border-border-emphasis",
        className,
      )}
    >
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={cn("w-2 h-2 rounded-full shrink-0", statusDotClasses[status])}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-text-primary">{name}</span>
          <span className="text-caption text-text-tertiary font-mono">{description}</span>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            "ml-auto shrink-0 text-text-tertiary transition-transform duration-150",
            open && "rotate-90",
          )}
        />
      </div>
      {open && children && (
        <div className="border-t border-border-subtle p-4 bg-main-bg">
          {children}
        </div>
      )}
    </div>
  );
}
