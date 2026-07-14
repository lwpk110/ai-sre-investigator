"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge, CodeBlock } from "@/components/ui";
import { SearchBar, ListItem } from "@/components/common";

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

const confVariant = (c: string): "ok" | "warn" | "err" =>
  c === "high" ? "ok" : c === "medium" ? "warn" : "err";

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailCache, setDetailCache] = useState<Record<number, KnowledgeEntry>>({});

  const fetchEntries = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/knowledge?q=${encodeURIComponent(q)}` : "/api/knowledge?limit=50";
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

  return (
    <div>
      <PageHeader icon={<BookOpen className="w-5 h-5" />} title="知识库" count={`共 ${total} 条`} />
      <div className="mb-4">
        <SearchBar
          value={searchQuery}
          placeholder="按服务名或症状关键词搜索…"
          onChange={setSearchQuery}
          matchCount={loading ? undefined : entries.length}
          matchHint={searchQuery ? "已筛选" : "全部记录"}
        />
        <button
          onClick={() => fetchEntries(searchQuery)}
          className="mt-2 text-caption text-accent hover:text-accent-hover transition-colors"
        >
          搜索
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-border-standard rounded-md h-[64px] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-body text-text-tertiary">暂无知识条目</p>
      ) : (
        <div>
          {entries.map((entry) => (
            <ListItem
              key={entry.id}
              status="ok"
              name={entry.symptom}
              description={`${entry.service_name || "未知服务"} · ${entry.created_at?.slice(0, 10)}`}
            >
              {entry.root_cause && (
                <p className="text-small text-text-secondary mb-2">
                  <Badge variant={confVariant(entry.confidence)} className="mr-2">
                    {entry.confidence}
                  </Badge>
                  {entry.root_cause}
                </p>
              )}
              {detailCache[entry.id]?.report && (
                <CodeBlock label="完整报告" copyable>
                  {detailCache[entry.id]!.report!}
                </CodeBlock>
              )}
            </ListItem>
          ))}
        </div>
      )}
    </div>
  );
}
