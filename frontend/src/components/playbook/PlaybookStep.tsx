import { Badge } from "@/components/ui";
import { CodeBlock } from "@/components/ui";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "ok" | "warn" | "err" | "info" | "purple";

interface PlaybookStepProps {
  stepNumber: number;
  toolLabel: string;
  toolVariant: BadgeVariant;
  label: string;
  purpose: string;
  /** 探针查询语句，提供则渲染 CodeBlock */
  query?: string;
  /** 查询语言标签，如 PromQL / LogQL / TraceQL */
  queryLabel?: string;
  className?: string;
}

export function PlaybookStep({
  stepNumber,
  toolLabel,
  toolVariant,
  label,
  purpose,
  query,
  queryLabel,
  className,
}: PlaybookStepProps) {
  return (
    <div className={cn("flex gap-3 mb-3.5 last:mb-0", className)}>
      <div className="w-[22px] h-[22px] rounded-full bg-surface-2 border border-border-standard flex items-center justify-center text-micro font-medium text-text-secondary font-mono shrink-0">
        {stepNumber}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant={toolVariant}>{toolLabel}</Badge>
          <span className="text-caption text-text-tertiary">{label}</span>
        </div>
        <p className="text-small text-text-secondary mb-1.5">{purpose}</p>
        {query && (
          <CodeBlock label={queryLabel} copyable>
            {query}
          </CodeBlock>
        )}
      </div>
    </div>
  );
}
