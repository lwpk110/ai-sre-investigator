"use client";

import { useState, useEffect, useCallback } from "react";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui";
import { Toggle } from "@/components/common";

interface ToolInfo {
  name: string;
  description: string;
  enabled: boolean;
  version: string;
  category: string;
  ql_type: string;
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
          t.name === name ? { ...t, enabled: !currentEnabled } : t,
        ),
      );
    }
  };

  return (
    <div>
      <PageHeader icon={<Wrench className="w-5 h-5" />} title="工具管理" count={`${tools.length} 个工具`} />
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-border-standard rounded-md h-[64px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => (
            <div key={tool.name} className="flex items-center gap-3 px-4 py-3.5 bg-surface-1 border border-border-standard rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-text-primary">{tool.name}</span>
                  {tool.ql_type && <Badge variant="info">{tool.ql_type}</Badge>}
                </div>
                <span className="text-caption text-text-tertiary">{tool.description} · v{tool.version}</span>
              </div>
              <span className="text-caption text-text-tertiary font-mono mr-2">{tool.category}</span>
              <Toggle enabled={tool.enabled} onClick={() => toggleTool(tool.name, tool.enabled)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
