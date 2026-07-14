"use client";

import { Shield } from "lucide-react";
import type { BudgetInfo } from "@/types/events";
import { cn } from "@/lib/cn";

export function BudgetBar({ budget }: { budget: BudgetInfo }) {
  const tokenPct = budget.tokens_max > 0 ? (budget.tokens_used / budget.tokens_max) * 100 : 0;
  const callPct = budget.calls_max > 0 ? (budget.calls_used / budget.calls_max) * 100 : 0;
  const pct = Math.max(tokenPct, callPct);
  const fillWidth = `${Math.min(pct, 100)}%`;

  const fillClass = pct > 80 ? "bg-error" : pct > 60 ? "bg-warning" : "bg-accent";

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-surface-1 border border-border-subtle">
      <Shield className="w-[18px] h-[18px] shrink-0 text-accent" />
      <div className="flex-1">
        <div className="text-micro font-medium uppercase text-text-tertiary" style={{ letterSpacing: "0.04em" }}>
          SafeToolExecutor · 预算与缓存
        </div>
        <div className="h-1 rounded-full mt-1.5 overflow-hidden bg-white/[0.06]">
          <div className={cn("h-full rounded-full transition-all duration-300", fillClass)} style={{ width: fillWidth }} />
        </div>
      </div>
      <div className="text-caption font-mono text-right whitespace-nowrap text-text-secondary">
        <span className="text-text-tertiary">token</span>{" "}
        {budget.tokens_used.toLocaleString()} / {budget.tokens_max.toLocaleString()}
        <br />
        <span className="text-text-tertiary">queries</span>{" "}
        {budget.calls_used} / {budget.calls_max}
      </div>
    </div>
  );
}
