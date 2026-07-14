"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { KpiCard, TrendChart, BriefCard } from "@/components/dashboard";

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

const mockBriefs = [
  "prod-api-5f2c 内存泄漏触发 OOM，已自动回滚至 v2.3.1",
  "Redis 集群 redis-03 延迟飙升至 340ms，热缓存重建完成",
  "支付网关超时率 0.3% → 2.1%，根因 DB 连接池耗尽",
  "CDN 边缘节点 sjc02 回源率异常，已切换备份源站",
];

const mockTrend = [
  { value: 12, date: "07/08" },
  { value: 19, date: "07/09" },
  { value: 8, date: "07/10" },
  { value: 25, date: "07/11" },
  { value: 16, date: "07/12" },
  { value: 22, date: "07/13" },
  { value: 14, date: "07/14" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/dashboard");
      if (resp.ok) setData(await resp.json());
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fmtDuration = (s: number): string =>
    s < 60 ? `${s.toFixed(0)}s` : `${(s / 60).toFixed(1)} min`;
  const fmtPercent = (v: number): string => `${(v * 100).toFixed(1)}%`;

  const kpis = data
    ? [
        { iconVariant: "ok" as const, icon: "🎯", label: "自闭环率", value: fmtPercent(data.self_resolution_rate) },
        { iconVariant: "info" as const, icon: "🕐", label: "平均排查时长", value: fmtDuration(data.avg_mttr_seconds) },
        { iconVariant: "accent" as const, icon: "💬", label: "总会话数", value: data.total_sessions.toLocaleString() },
        { iconVariant: "warn" as const, icon: "💲", label: "估算成本", value: `$${data.est_cost_usd.toFixed(2)}` },
        { iconVariant: "purple" as const, icon: "⚡", label: "缓存命中率", value: fmtPercent(data.cache_hit_rate) },
        { iconVariant: "err" as const, icon: "🔧", label: "自修正成功率", value: fmtPercent(data.heal_success_rate) },
      ]
    : [];

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard className="w-5 h-5" />}
        title="价值仪表盘"
        actions={
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-3 mb-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-1 border border-border-subtle rounded-md p-4 animate-pulse h-[88px]" />
            ))
          : kpis.map((kpi) => (
              <KpiCard
                key={kpi.label}
                icon={<span className="text-base">{kpi.icon}</span>}
                iconVariant={kpi.iconVariant}
                label={kpi.label}
                value={kpi.value}
              />
            ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TrendChart title="会话趋势" meta="近 7 天" data={mockTrend} />
        <BriefCard items={mockBriefs} />
      </div>
    </div>
  );
}
