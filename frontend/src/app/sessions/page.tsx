"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, History, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Clock, Loader } from "lucide-react";

interface SessionListItem {
  session_id: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ReplayData {
  events: { type: string; data: Record<string, unknown> }[];
  rca_report: string | null;
  rca_confidence: string | null;
  is_partial: boolean;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-3 h-3" style={{ color: "var(--color-success)" }} />;
  if (status === "error") return <AlertTriangle className="w-3 h-3" style={{ color: "var(--color-error)" }} />;
  if (status === "running") return <Loader className="w-3 h-3 animate-status-pulse" style={{ color: "var(--color-info)" }} />;
  return <Clock className="w-3 h-3" style={{ color: "var(--color-text-quaternary)" }} />;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replayCache, setReplayCache] = useState<Record<string, ReplayData>>({});

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/sessions");
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!replayCache[id]) {
      const resp = await fetch(`/api/sessions/${id}/replay`);
      if (resp.ok) {
        const data = await resp.json();
        setReplayCache((prev) => ({ ...prev, [id]: data }));
      }
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-app-bg)" }}>
      <div className="max-w-[800px] mx-auto space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" />
          返回排查
        </Link>

        <div className="flex items-center gap-2">
          <History className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>会话历史</h2>
          <span className="text-[12px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>{sessions.length} 个会话</span>
        </div>

        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>加载中...</p>
        ) : sessions.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>暂无历史会话</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.session_id} className="rounded-[var(--radius-md)] overflow-hidden" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}>
                <button
                  onClick={() => handleExpand(s.session_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <StatusIcon status={s.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{s.message}</div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--color-text-quaternary)" }}>
                      {s.created_at?.slice(0, 19).replace("T", " ")} · {s.status}
                    </div>
                  </div>
                  {expandedId === s.session_id ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />}
                </button>
                {expandedId === s.session_id && replayCache[s.session_id] && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[12px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>事件重放 ({replayCache[s.session_id].events.length} 个事件)</span>
                      {replayCache[s.session_id].events.map((evt, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-app-bg)", color: "var(--color-text-quaternary)" }}>{evt.type}</span>
                          <span className="truncate">{JSON.stringify(evt.data).slice(0, 100)}</span>
                        </div>
                      ))}
                    </div>
                    {replayCache[s.session_id].rca_report && (
                      <div className="mt-3">
                        <span className="text-[12px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>RCA 报告</span>
                        <pre className="text-[12px] font-mono mt-1 p-3 rounded-[var(--radius-sm)] overflow-x-auto whitespace-pre-wrap" style={{ background: "#070912", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
                          {replayCache[s.session_id].rca_report}
                        </pre>
                      </div>
                    )}
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
