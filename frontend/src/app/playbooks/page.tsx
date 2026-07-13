"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  BookMarked,
  Search,
  Database,
  FileText,
  GitBranch,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Target,
} from "lucide-react";
import Link from "next/link";

interface PlaybookSummary {
  id: string;
  name: string;
  fault_type: string;
  trigger_keywords: string[];
  step_count: number;
}

interface PlaybookStep {
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
  steps: PlaybookStep[];
  common_root_causes: string[];
  confidence_threshold: string;
}

interface MatchResult {
  playbook_id: string;
  playbook_name: string;
  score: number;
  matched_keywords: string[];
}

const FAULT_TYPE_LABELS: Record<string, string> = {
  memory: "内存",
  connection: "连接",
  latency: "延迟",
  performance: "性能",
  throttling: "限流",
};

function ProbeIcon({ probe }: { probe: string }) {
  if (probe === "mimir") return <Database className="w-3.5 h-3.5" />;
  if (probe === "loki") return <FileText className="w-3.5 h-3.5" />;
  if (probe === "tempo") return <GitBranch className="w-3.5 h-3.5" />;
  return null;
}

const PROBE_COLORS: Record<string, string> = {
  mimir: "#f59e0b",
  loki: "#10b981",
  tempo: "#5e8aff",
};

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlaybookDetail | null>(null);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

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
      setDetail(null);
      return;
    }
    setExpandedId(id);
    const resp = await fetch(`/api/playbooks/${id}`);
    if (resp.ok) {
      setDetail(await resp.json());
    }
  };

  const runMatch = async () => {
    if (!matchQuery.trim()) return;
    setMatchLoading(true);
    try {
      const resp = await fetch(
        `/api/playbooks/match?q=${encodeURIComponent(matchQuery)}`
      );
      if (resp.ok) {
        const data = await resp.json();
        setMatchResults(data.matches);
      }
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--color-app-bg)" }}
    >
      <div className="max-w-[860px] mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          返回排查
        </Link>

        <div className="flex items-center gap-2">
          <BookMarked
            className="w-5 h-5"
            style={{ color: "var(--color-accent)" }}
          />
          <h2
            className="text-[16px] font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            剧本库
          </h2>
          <span
            className="text-[12px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(94,138,255,0.1)",
              color: "var(--color-accent)",
            }}
          >
            {playbooks.length} 个剧本
          </span>
        </div>

        {/* 剧本匹配测试 */}
        <div
          className="p-4 rounded-[var(--radius-md)]"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target
              className="w-4 h-4"
              style={{ color: "var(--color-info)" }}
            />
            <span
              className="text-[13px] font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              剧本匹配测试
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={matchQuery}
              onChange={(e) => setMatchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runMatch()}
              placeholder="输入故障描述，如「内存溢出 OOM 服务重启」"
              className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] outline-none transition-colors"
              style={{
                background: "var(--color-app-bg)",
                border: "1px solid var(--color-border-standard)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              onClick={runMatch}
              disabled={matchLoading || !matchQuery.trim()}
              className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
              style={{
                background: "var(--color-accent)",
                color: "#fff",
              }}
            >
              <Search className="w-3.5 h-3.5" />
              匹配
            </button>
          </div>
          {matchResults.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {matchResults.map((m) => (
                <button
                  key={m.playbook_id}
                  onClick={() => toggleExpand(m.playbook_id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] transition-colors text-left"
                  style={{
                    background: "var(--color-app-bg)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {m.playbook_name}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.max(m.score * 100, 8)}%`,
                        background:
                          m.score > 0.6
                            ? "var(--color-success)"
                            : m.score > 0.3
                              ? "var(--color-warning)"
                              : "var(--color-error)",
                      }}
                    />
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {(m.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.matched_keywords.map((kw) => (
                      <span
                        key={kw}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(56,189,248,0.1)",
                          color: "var(--color-info)",
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
          {matchResults.length === 0 && matchQuery && !matchLoading && (
            <p
              className="mt-3 text-[12px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              未匹配到任何剧本
            </p>
          )}
        </div>

        {/* 剧本列表 */}
        {loading ? (
          <p
            className="text-[14px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            加载中...
          </p>
        ) : (
          <div className="space-y-2">
            {playbooks.map((pb) => (
              <div
                key={pb.id}
                className="rounded-[var(--radius-md)] overflow-hidden"
                style={{
                  background: "var(--color-surface-1)",
                  border:
                    expandedId === pb.id
                      ? "1px solid var(--color-accent-muted)"
                      : "1px solid var(--color-border-subtle)",
                }}
              >
                {/* 剧本头部 */}
                <button
                  onClick={() => toggleExpand(pb.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                >
                  {expandedId === pb.id ? (
                    <ChevronDown
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--color-text-tertiary)" }}
                    />
                  ) : (
                    <ChevronRight
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--color-text-tertiary)" }}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[14px] font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {pb.name}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(94,138,255,0.1)",
                          color: "var(--color-accent)",
                        }}
                      >
                        {FAULT_TYPE_LABELS[pb.fault_type] || pb.fault_type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pb.trigger_keywords.slice(0, 5).map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--color-app-bg)",
                            color: "var(--color-text-tertiary)",
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className="text-[11px] shrink-0"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {pb.step_count} 步
                  </span>
                </button>

                {/* 剧本详情 */}
                {expandedId === pb.id && detail && (
                  <div
                    className="px-4 pb-4 space-y-4"
                    style={{ borderTop: "1px solid var(--color-border-subtle)" }}
                  >
                    <p
                      className="text-[13px] pt-3"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {detail.description}
                    </p>

                    {/* 排查步骤 */}
                    <div>
                      <h4
                        className="text-[12px] font-semibold mb-2 uppercase tracking-wide"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        排查步骤
                      </h4>
                      <div className="space-y-2">
                        {detail.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3 p-2.5 rounded-[var(--radius-sm)]"
                            style={{ background: "var(--color-app-bg)" }}
                          >
                            <div
                              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono"
                              style={{
                                background: "var(--color-surface-2)",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded"
                                  style={{
                                    color: PROBE_COLORS[step.probe],
                                    background: `${PROBE_COLORS[step.probe]}15`,
                                  }}
                                >
                                  <ProbeIcon probe={step.probe} />
                                  {step.probe}
                                </span>
                                <span
                                  className="text-[12px]"
                                  style={{ color: "var(--color-text-secondary)" }}
                                >
                                  {step.purpose}
                                </span>
                              </div>
                              <pre
                                className="text-[11px] font-mono p-2 rounded overflow-x-auto"
                                style={{
                                  background: "var(--color-surface-2)",
                                  color: "var(--color-text-tertiary)",
                                }}
                              >
                                <code>{step.query_template}</code>
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 常见根因 */}
                    <div>
                      <h4
                        className="flex items-center gap-1.5 text-[12px] font-semibold mb-2 uppercase tracking-wide"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        <AlertTriangle
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--color-warning)" }}
                        />
                        常见根因
                      </h4>
                      <div className="space-y-1">
                        {detail.common_root_causes.map((cause, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-[12px]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            <span
                              className="shrink-0 mt-1.5 w-1 h-1 rounded-full"
                              style={{ background: "var(--color-warning)" }}
                            />
                            {cause}
                          </div>
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
