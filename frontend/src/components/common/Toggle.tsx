import { cn } from "@/lib/cn";

interface ToggleProps {
  enabled: boolean;
  onClick?: () => void;
  className?: string;
}

export function Toggle({ enabled, onClick, className }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "font-mono text-micro font-medium cursor-pointer",
        "border transition-all duration-100",
        enabled
          ? "bg-success-bg text-success border-success/20"
          : "bg-white/[0.04] text-text-quaternary border-border-subtle",
        className,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          enabled ? "bg-success" : "bg-text-quaternary",
        )}
      />
      {enabled ? "ENABLED" : "DISABLED"}
    </button>
  );
}
