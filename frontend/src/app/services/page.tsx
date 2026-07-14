"use client";

import { useState, useEffect } from "react";
import { Server } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui";
import { ListItem, RowInfo } from "@/components/common";

interface ServiceInfo {
  name: string;
  owner_team: string;
  owner_contact: string;
  slo: { availability_999: string; p99_latency_ms: number };
  dependencies: string[];
  criticality: string;
  description: string;
}

const critVariant = (c: string): "err" | "warn" | "info" =>
  c === "P0" ? "err" : c === "P1" ? "warn" : "info";
const svcStatus = (c: string): "ok" | "warn" | "err" =>
  c === "P0" ? "err" : c === "P1" ? "warn" : "ok";

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setServices(data.services || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader icon={<Server className="w-5 h-5" />} title="服务目录" count={`${services.length} 个服务`} />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-border-standard rounded-md h-[64px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {services.map((svc) => (
            <ListItem key={svc.name} status={svcStatus(svc.criticality)} name={svc.name} description={`${svc.owner_team} · ${svc.description}`}>
              <RowInfo label="责任方" value={`${svc.owner_team} (${svc.owner_contact})`} />
              <RowInfo label="SLO" value={`可用性 ${svc.slo.availability_999} · P99 ≤ ${svc.slo.p99_latency_ms}ms`} />
              <RowInfo label="优先级" value={svc.criticality} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {svc.dependencies.map((dep) => (
                  <Badge key={dep}>{dep}</Badge>
                ))}
              </div>
            </ListItem>
          ))}
        </div>
      )}
    </div>
  );
}
