import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface BriefCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片标题，默认 "最新简报" */
  title?: string;
  /** 简报条目列表 */
  items: string[];
}

export function BriefCard({
  title = "最新简报",
  items,
  className,
  ...props
}: BriefCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-subtle rounded-md p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-small font-semibold text-text-secondary">{title}</span>
        <span className="text-micro text-text-quaternary font-mono">
          {items.length} 条
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((text, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
            <span className="text-small text-text-secondary leading-[1.5]">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
