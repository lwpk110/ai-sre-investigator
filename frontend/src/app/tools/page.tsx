"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Database, FileText, GitBranch, Wrench, Check, X } from "lucide-react";
import Link from "next/link";

interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
  version: string;
  category: string;
  ql_type: string;
}

function CategoryIcon({ category }: { category: string }) {
  if (category === "metrics") return <Database className="w-4 h-4" />;
  if (category === "logs") return <FileText className="w-4 h-4" />;
  if (category === "traces") return <GitBranch className="w-4 h-4" />;
  return <Wrench className="w-4 h-4" />;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTools = useCallback(async () => {
    try {
      const resp = await fetch("/api/tools");
      if (resp.ok) {
        const data = await resp.json();
        setTools(data.tools);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const toggleTool = async (name: string, currentEnabled: boolean) => {
    const action = currentEnabled ? "disable" : "enable";
    const resp = await fetch(`/api/tools/${name}/${action}`, { method: "POST" });
    if (resp.ok) {
      setTools((prev) =>
        prev.map((t) =>
          t.name === name ? { ...t, enabled: !currentEnabled } : t
        )
      );
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-app-bg)" }}>
      <div className="max-w-[800px] mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          返回排查
        </Link>

        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            工具管理
          </h2>
        </div>

        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
            加载中...
          </p>
        ) : (
          <div className="space-y-2">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]"
                style={{
                  background: "var(--color-surface-1)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div style={{ color: "var(--color-accent)" }}>
                  <CategoryIcon category={tool.category} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {tool.name}
                    </span>
                    {tool.ql_type && (
                      <span
                        className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(56,189,248,0.1)", color: "var(--color-info)" }}
                      >
                        {tool.ql_type}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {tool.description} · v{tool.version}
                  </span>
                </div>
                <button
                  onClick={() => toggleTool(tool.name, tool.enabled)}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors"
                  style={{
                    background: tool.enabled
                      ? "rgba(16,185,129,0.1)"
                      : "var(--color-app-bg)",
                    color: tool.enabled
                      ? "var(--color-success)"
                      : "var(--color-text-tertiary)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {tool.enabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  {tool.enabled ? "已启用" : "已禁用"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
