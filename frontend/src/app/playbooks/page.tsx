"use client";

import { useState, useEffect, useCallback } from "react";
import { BookMarked } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui";
import { ListItem } from "@/components/common";
import { MatchPanel, PlaybookStep } from "@/components/playbook";

interface PlaybookSummary {
  id: string;
  name: string;
  fault_type: string;
  trigger_keywords: string[];
  step_count: number;
}

interface PlaybookStepData {
  probe: string;
  query_template: string;
  purpose: string;
  evidence_key: string;
}

interface PlaybookDetail {
  id: string;
  name: string;
  fault_type: string;
  trigger_keywords: string[];
  description: string;
  steps: PlaybookStepData[];
  common_root_causes: string[];
  confidence_threshold: string;
}

const probeConfig: Record<string, { variant: "warn" | "ok" | "default"; qlLabel: string }> = {
  mimir: { variant: "warn", qlLabel: "PromQL" },
  loki: { variant: "ok", qlLabel: "LogQL" },
  tempo: { variant: "default", qlLabel: "TraceQL" },
};

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, PlaybookDetail>>({});

  const fetchPlaybooks = useCallback(async () => {
    try {
      const resp = await fetch("/api/playbooks");
      if (resp.ok) {
        const data = await resp.json();
        setPlaybooks(data.playbooks);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      const resp = await fetch(`/api/playbooks/${id}`);
      if (resp.ok) {
        const detail = await resp.json();
        setDetailCache((prev) => ({ ...prev, [id]: detail }));
      }
    }
  };

  const handleMatch = async (query: string) => {
    const resp = await fetch(`/api/playbooks/match?q=${encodeURIComponent(query)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.matches?.[0]) {
        setExpandedId(data.matches[0].playbook_id);
      }
    }
  };

  return (
    <div>
      <PageHeader icon={<BookMarked className="w-5 h-5" />} title="剧本库" count={`${playbooks.length} 个剧本`} />
      <MatchPanel onMatch={handleMatch} placeholder="输入故障描述，如「内存溢出 OOM 服务重启」" />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-border-standard rounded-md h-[64px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {playbooks.map((pb) => {
            const detail = detailCache[pb.id];
            return (
              <ListItem
                key={pb.id}
                status="ok"
                name={pb.name}
                description={`${pb.step_count} 步 · ${pb.fault_type}`}
                defaultOpen={expandedId === pb.id}
              >
                {detail ? (
                  <>
                    <p className="text-small text-text-secondary mb-3">{detail.description}</p>
                    <div className="mb-3">
                      <span className="text-caption text-text-tertiary font-medium mb-2 block uppercase tracking-wide">
                        排查步骤
                      </span>
                      <div className="space-y-1">
                        {detail.steps.map((step, idx) => {
                          const pc = probeConfig[step.probe] ?? { variant: "default" as const, qlLabel: step.probe };
                          return (
                            <PlaybookStep
                              key={idx}
                              stepNumber={idx + 1}
                              toolLabel={step.probe}
                              toolVariant={pc.variant}
                              label={step.purpose}
                              purpose={step.evidence_key}
                              query={step.query_template}
                              queryLabel={pc.qlLabel}
                            />
                          );
                        })}
                      </div>
                    </div>
                    {detail.common_root_causes.length > 0 && (
                      <div>
                        <span className="text-caption text-text-tertiary font-medium mb-2 block uppercase tracking-wide">
                          常见根因
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.common_root_causes.map((cause, idx) => (
                            <Badge key={idx} variant="warn">{cause}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-caption text-text-tertiary">加载详情中…</p>
                )}
              </ListItem>
            );
          })}
        </div>
      )}
    </div>
  );
}
