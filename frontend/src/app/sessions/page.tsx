"use client";

import { useState, useEffect, useCallback } from "react";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ListItem } from "@/components/common";
import { EventRow } from "@/components/session";
import { CodeBlock } from "@/components/ui";

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

const sessionStatus = (s: string): "ok" | "warn" | "err" =>
  s === "completed" ? "ok" : s === "error" ? "err" : "warn";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (!replayCache[id]) {
      const resp = await fetch(`/api/sessions/${id}/replay`);
      if (resp.ok) {
        const data = await resp.json();
        setReplayCache((prev) => ({ ...prev, [id]: data }));
      }
    }
  };

  return (
    <div>
      <PageHeader icon={<History className="w-5 h-5" />} title="会话历史" count={`${sessions.length} 个会话`} />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-border-standard rounded-md h-[64px] animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-body text-text-tertiary">暂无历史会话</p>
      ) : (
        <div>
          {sessions.map((s) => {
            const replay = replayCache[s.session_id];
            return (
              <ListItem
                key={s.session_id}
                status={sessionStatus(s.status)}
                name={s.message}
                description={`${s.created_at?.slice(0, 19).replace("T", " ")} · ${s.status}`}
                defaultOpen={false}
              >
                {replay ? (
                  <>
                    <div className="mb-3">
                      <span className="text-caption text-text-tertiary font-medium mb-2 block">
                        事件重放 ({replay.events.length} 个事件)
                      </span>
                      <div className="space-y-0.5">
                        {replay.events.map((evt, i) => (
                          <EventRow key={i} type={evt.type as "tool_call" | "self_heal" | "analysis" | "rca"} code>
                            {JSON.stringify(evt.data).slice(0, 120)}
                          </EventRow>
                        ))}
                      </div>
                    </div>
                    {replay.rca_report && (
                      <CodeBlock label="RCA 报告" copyable>
                        {replay.rca_report}
                      </CodeBlock>
                    )}
                  </>
                ) : (
                  <p className="text-caption text-text-tertiary">加载重放数据中…</p>
                )}
              </ListItem>
            );
          })}
        </div>
      )}
    </div>
  );
}
