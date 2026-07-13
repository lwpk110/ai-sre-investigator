"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Server, ChevronDown, ChevronRight, Shield, Users, Network } from "lucide-react";

interface ServiceInfo {
  name: string;
  owner_team: string;
  owner_contact: string;
  slo: { availability_999: string; p99_latency_ms: number };
  dependencies: string[];
  criticality: string;
  description: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setServices(data.services || []))
      .finally(() => setLoading(false));
  }, []);

  const critColor = (c: string) =>
    c === "P0" ? "var(--color-error)" : c === "P1" ? "var(--color-warning)" : "var(--color-info)";
  const critBg = (c: string) =>
    c === "P0" ? "rgba(244,63,94,0.1)" : c === "P1" ? "rgba(245,158,11,0.1)" : "rgba(56,189,248,0.1)";

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-app-bg)" }}>
      <div className="max-w-[800px] mx-auto space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" />
          返回排查
        </Link>

        <div className="flex items-center gap-2">
          <Server className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>服务目录</h2>
          <span className="text-[12px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>{services.length} 个服务</span>
        </div>

        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>加载中...</p>
        ) : (
          <div className="space-y-2">
            {services.map((svc) => (
              <div key={svc.name} className="rounded-[var(--radius-md)] overflow-hidden" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}>
                <button
                  onClick={() => setExpandedName(expandedName === svc.name ? null : svc.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <Server className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>{svc.name}</div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--color-text-quaternary)" }}>{svc.owner_team} · {svc.description}</div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full shrink-0" style={{ background: critBg(svc.criticality), color: critColor(svc.criticality) }}>{svc.criticality}</span>
                  <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--color-text-tertiary)" }}>SLO {svc.slo.p99_latency_ms}ms</span>
                  {expandedName === svc.name ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />}
                </button>
                {expandedName === svc.name && (
                  <div className="px-4 pb-4 border-t space-y-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-center gap-2 mt-3">
                      <Users className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>责任方</span>
                      <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{svc.owner_team}</span>
                      <span className="text-[12px] font-mono" style={{ color: "var(--color-text-quaternary)" }}>{svc.owner_contact}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
                      <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>SLO</span>
                      <span className="text-[13px] font-mono" style={{ color: "var(--color-text-secondary)" }}>可用性 {svc.slo.availability_999} · P99 ≤ {svc.slo.p99_latency_ms}ms</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Network className="w-3.5 h-3.5 mt-0.5" style={{ color: "var(--color-accent)" }} />
                      <span className="text-[12px] shrink-0" style={{ color: "var(--color-text-tertiary)" }}>依赖</span>
                      <div className="flex flex-wrap gap-1.5">
                        {svc.dependencies.map((dep) => (
                          <span key={dep} className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-secondary)" }}>{dep}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
