"use client";

import { Shield } from "lucide-react";
import type { BudgetInfo } from "@/types/events";

interface BudgetBarProps {
  budget: BudgetInfo;
}

export function BudgetBar({ budget }: BudgetBarProps) {
  const tokenPct = budget.tokens_max > 0 ? (budget.tokens_used / budget.tokens_max) * 100 : 0;
  const callPct = budget.calls_max > 0 ? (budget.calls_used / budget.calls_max) * 100 : 0;
  const pct = Math.max(tokenPct, callPct);
  const fillWidth = `${Math.min(pct, 100)}%`;

  // 预算接近耗尽时变色
  const fillColor = pct > 80 ? "var(--color-error)" : pct > 60 ? "var(--color-warning)" : "var(--color-accent)";

  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)]"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <Shield className="w-[18px] h-[18px] shrink-0" style={{ color: "var(--color-accent)" }} />
      <div className="flex-1">
        <div
          className="text-[11px] font-medium uppercase"
          style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.04em" }}
        >
          SafeToolExecutor · 预算与缓存
        </div>
        <div
          className="h-1 rounded-full mt-1.5 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: fillWidth, background: fillColor }}
          />
        </div>
      </div>
      <div
        className="text-[12px] font-mono text-right whitespace-nowrap"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span style={{ color: "var(--color-text-tertiary)" }}>token</span>{" "}
        {budget.tokens_used.toLocaleString()} / {budget.tokens_max.toLocaleString()}
        <br />
        <span style={{ color: "var(--color-text-tertiary)" }}>queries</span>{" "}
        {budget.calls_used} / {budget.calls_max}
      </div>
    </div>
  );
}
