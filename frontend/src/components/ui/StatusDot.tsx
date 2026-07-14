import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type StatusType = "ok" | "warn" | "err" | "info" | "running";

interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
}

const statusClasses: Record<StatusType, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  err: "bg-error",
  info: "bg-info",
  running: "bg-info animate-status-pulse",
};

export function StatusDot({ status, className, ...props }: StatusDotProps) {
  return (
    <span
      className={cn("w-2 h-2 rounded-full shrink-0", statusClasses[status], className)}
      {...props}
    />
  );
}
