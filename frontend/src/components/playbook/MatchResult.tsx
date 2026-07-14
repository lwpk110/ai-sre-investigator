import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

/** 与 Badge variant 保持一致 */
type BadgeVariant = "default" | "ok" | "warn" | "err" | "info" | "purple";

interface MatchKeyword {
  label: string;
  variant: BadgeVariant;
}

interface MatchResultProps {
  priorityLabel: string;
  priorityVariant: BadgeVariant;
  name: string;
  steps: number;
  matchPercent: number;
  description: string;
  keywords: MatchKeyword[];
  className?: string;
}

export function MatchResult({
  priorityLabel,
  priorityVariant,
  name,
  steps,
  matchPercent,
  description,
  keywords,
  className,
}: MatchResultProps) {
  return (
    <div
      className={cn(
        "bg-app-bg border border-border-subtle rounded-md py-3.5 px-4 mb-4",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Badge variant={priorityVariant}>{priorityLabel}</Badge>
        <span className="text-body font-medium text-text-primary">{name}</span>
        <span className="ml-auto text-micro text-text-quaternary font-mono">
          {steps} steps · {matchPercent}% match
        </span>
      </div>
      <p className="text-caption text-text-tertiary mb-2">{description}</p>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <Badge key={kw.label} variant={kw.variant}>
            {kw.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
