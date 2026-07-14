import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "ok" | "warn" | "err" | "info" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.05] text-text-secondary",
  ok: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  err: "bg-error-bg text-error",
  info: "bg-info-bg text-info",
  purple: "bg-purple-bg text-purple",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-micro font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
