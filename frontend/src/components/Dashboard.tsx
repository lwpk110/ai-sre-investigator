"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Target,
  Zap,
  RefreshCw,
} from "lucide-react";

interface DashboardData {
  total_sessions: number;
  self_resolution_rate: number;
  avg_mttr_seconds: number;
  total_tokens: number;
  est_cost_usd: number;
  tool_calls_total: number;
  cache_hit_rate: number;
  heal_success_rate: number;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const resp = await fetch("/api/dashboard");
      if (resp.ok) {
        setData(await resp.json());
      }
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fmtDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    return `${(seconds / 60).toFixed(1)}min`;
  };

  const fmtPercent = (v: number): string => `${(v * 100).toFixed(1)}%`;

  const kpis = data
    ? [
        {
          icon: Target,
          label: "自闭环率",
          value: fmtPercent(data.self_resolution_rate),
          color: "var(--color-success)",
          bg: "rgba(16,185,129,0.08)",
        },
        {
          icon: Clock,
          label: "平均排查时长",
          value: fmtDuration(data.avg_mttr_seconds),
          color: "var(--color-info)",
          bg: "rgba(56,189,248,0.08)",
        },
        {
          icon: Activity,
          label: "总会话数",
          value: String(data.total_sessions),
          color: "var(--color-accent)",
          bg: "rgba(94,138,255,0.08)",
        },
        {
          icon: DollarSign,
          label: "估算成本",
          value: `$${data.est_cost_usd.toFixed(2)}`,
          color: "var(--color-warning)",
          bg: "rgba(245,158,11,0.08)",
        },
        {
          icon: Zap,
          label: "缓存命中率",
          value: fmtPercent(data.cache_hit_rate),
          color: "rgba(168,85,247,1)",
          bg: "rgba(168,85,247,0.08)",
        },
        {
          icon: TrendingUp,
          label: "自修正成功率",
          value: fmtPercent(data.heal_success_rate),
          color: "var(--color-error)",
          bg: "rgba(244,63,94,0.08)",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp
          className="w-5 h-5"
          style={{ color: "var(--color-accent)" }}
        />
        <h2
          className="text-[16px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          价值仪表盘
        </h2>
        <div className="flex-1" />
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
          style={{
            background: "var(--color-app-bg)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-[var(--radius-md)] p-4"
              style={{
                background: "var(--color-surface-1)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)]"
                  style={{ background: kpi.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {kpi.label}
                </span>
              </div>
              <span
                className="text-[22px] font-semibold"
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
