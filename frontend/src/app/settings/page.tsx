"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ModelRow } from "@/components/settings";

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
      .then((r) => (r.ok ? r.json() : Promise.reject()))
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
    <div>
      <PageHeader icon={<SettingsIcon className="w-5 h-5" />} title="模型设置" />
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-border-standard rounded-md h-[96px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {models.map((m) => (
            <ModelRow
              key={m.id}
              name={m.name}
              description={m.description}
              active={m.is_active}
              onSelect={() => !m.is_active && handleSelect(m.id)}
              badge={m.is_active ? { label: "当前", variant: "ok" } : undefined}
              meta={[
                { text: m.provider },
                { icon: <DollarSign className="w-3 h-3" />, text: `$${m.cost_per_1k_tokens}/1K tokens` },
              ]}
            />
          ))}
          {selecting && (
            <p className="text-caption text-text-tertiary font-mono mt-2 text-center">切换中…</p>
          )}
        </div>
      )}
    </div>
  );
}
