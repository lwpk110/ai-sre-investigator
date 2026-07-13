"use client";

import { Coins, Zap } from "lucide-react";
import type { BudgetInfo } from "@/types/events";

interface BudgetBarProps {
  budget: BudgetInfo | null;
}

export function BudgetBar({ budget }: BudgetBarProps) {
  if (!budget) return null;

  const tokenPct = Math.min(100, (budget.tokens_used / budget.tokens_max) * 100);
  const callPct = Math.min(100, (budget.calls_used / budget.calls_max) * 100);

  // 预算接近耗尽时变色
  const tokenColor = tokenPct > 80 ? "var(--color-error)" : tokenPct > 50 ? "var(--color-warning)" : "var(--color-accent)";
  const callColor = callPct > 80 ? "var(--color-error)" : callPct > 50 ? "var(--color-warning)" : "var(--color-accent)";

  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-[var(--radius-md)]"
      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
    >
      {/* Token 用量 */}
      <div className="flex items-center gap-2 flex-1">
        <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
              Token
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--color-text-secondary)" }}>
              {budget.tokens_used.toLocaleString()} / {budget.tokens_max.toLocaleString()}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${tokenPct}%`, background: tokenColor }} />
          </div>
        </div>
      </div>

      {/* 工具调用次数 */}
      <div className="flex items-center gap-2 flex-1">
        <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
              工具调用
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--color-text-secondary)" }}>
              {budget.calls_used} / {budget.calls_max}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${callPct}%`, background: callColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}
