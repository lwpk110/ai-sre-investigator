"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Cpu, Check, DollarSign } from "lucide-react";

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  model: string;
  description: string;
  cost_per_1k_tokens: number;
  is_active: boolean;
}

export default function SettingsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setModels(data.models || []))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (id: string) => {
    setSelecting(id);
    try {
      const resp = await fetch(`/api/models/${id}/select`, { method: "POST" });
      if (resp.ok) {
        setModels((prev) => prev.map((m) => ({ ...m, is_active: m.id === id })));
      }
    } finally {
      setSelecting(null);
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
          <Cpu className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>模型设置</h2>
        </div>

        {loading ? (
          <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>加载中...</p>
        ) : (
          <div className="space-y-2">
            {models.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]"
                style={{
                  background: "var(--color-surface-1)",
                  border: m.is_active ? "1px solid rgba(94,138,255,0.3)" : "1px solid var(--color-border-subtle)",
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>{m.name}</span>
                    {m.is_active && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "var(--color-success)" }}>
                        <Check className="w-3 h-3" />
                        当前
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{m.description}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-mono" style={{ color: "var(--color-text-quaternary)" }}>{m.provider}</span>
                    <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: "var(--color-text-quaternary)" }}>
                      <DollarSign className="w-3 h-3" />
                      ${m.cost_per_1k_tokens}/1K tokens
                    </span>
                  </div>
                </div>
                {!m.is_active && (
                  <button
                    onClick={() => handleSelect(m.id)}
                    disabled={selecting !== null}
                    className="text-[12px] px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
                    style={{ background: "rgba(94,138,255,0.08)", color: "var(--color-accent)", border: "1px solid rgba(94,138,255,0.2)" }}
                  >
                    {selecting === m.id ? "切换中..." : "切换"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
