"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";

interface KnowledgeEntry {
  id: number;
  symptom: string;
  service_name: string;
  root_cause: string;
  confidence: string;
  tags: string;
  created_at: string;
  report?: string;
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, KnowledgeEntry>>({});

  const fetchEntries = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/knowledge?q=${encodeURIComponent(q)}`
        : "/api/knowledge?limit=50";
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSearch = () => fetchEntries(searchQuery);

  const handleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailCache[id]) {
      const resp = await fetch(`/api/knowledge/${id}`);
      if (resp.ok) {
        const detail = await resp.json();
        setDetailCache((prev) => ({ ...prev, [id]: detail }));
      }
    }
  };

  const confidenceColor = (c: string) =>
    c === "high" ? "var(--color-success)" : c === "medium" ? "var(--color-warning)" : "var(--color-error)";
  const confidenceBg = (c: string) =>
    c === "high" ? "rgba(16,185,129,0.1)" : c === "medium" ? "rgba(245,158,11,0.1)" : "rgba(244,63,94,0.1)";

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-app-bg)" }}>
      <div className="max-w-[800px] mx-auto space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
          <ArrowLeft className="w-4 h-4" />
          返回排查
        </Link>

        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            RCA 知识库
          </h2>
          <span className="text-[12px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
            共 {total} 条
          </span>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-quaternary)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="按服务名或症状关键词搜索..."
            className="w-full rounded-[var(--radius-md)] py-2.5 pl-9 pr-3 text-[13px] outline-none"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          />
        </div>

        {/* 列表 */}
        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>加载中...</p>
        ) : entries.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>暂无知识条目</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[var(--radius-md)] overflow-hidden"
                style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border-subtle)" }}
              >
                <button
                  onClick={() => handleExpand(entry.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {entry.symptom}
                    </div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--color-text-quaternary)" }}>
                      {entry.service_name || "未知服务"} · {entry.created_at?.slice(0, 10)}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: confidenceBg(entry.confidence), color: confidenceColor(entry.confidence) }}
                  >
                    {entry.confidence}
                  </span>
                  {expandedId === entry.id ? (
                    <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-tertiary)" }} />
                  )}
                </button>
                {expandedId === entry.id && detailCache[entry.id] && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                    {detailCache[entry.id].root_cause && (
                      <div className="mt-3">
                        <span className="text-[12px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>根因</span>
                        <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>{detailCache[entry.id].root_cause}</p>
                      </div>
                    )}
                    {detailCache[entry.id].report && (
                      <div className="mt-3">
                        <span className="text-[12px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>完整报告</span>
                        <pre className="text-[12px] font-mono mt-1 p-3 rounded-[var(--radius-sm)] overflow-x-auto whitespace-pre-wrap" style={{ background: "#070912", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>
                          {detailCache[entry.id].report}
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
