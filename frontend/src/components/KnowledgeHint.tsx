"use client";

import { useState, useEffect } from "react";
import { History, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui";
import { searchKnowledge, type KnowledgeEntry } from "@/lib/knowledge";

const confVariant = (c: string): "ok" | "warn" | "err" =>
  c === "high" ? "ok" : c === "medium" ? "warn" : "err";

export function KnowledgeHint({
  message,
  onSelect,
}: {
  message: string;
  onSelect: (entry: KnowledgeEntry) => void;
}) {
  const [matches, setMatches] = useState<KnowledgeEntry[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (message.length < 5 || dismissed) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await searchKnowledge(message.slice(0, 50));
        setMatches(result.entries.slice(0, 3));
      } catch {
        setMatches([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [message, dismissed]);

  if (matches.length === 0 || dismissed) return null;

  return (
    <div className="animate-step-enter rounded-md overflow-hidden bg-purple-bg border border-purple/15">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-purple/10">
        <History className="w-4 h-4 text-purple" />
        <span className="text-small font-medium text-purple">命中历史排查模式</span>
        <div className="flex-1" />
        <button onClick={() => setDismissed(true)} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-4 py-2 space-y-1">
        {matches.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="w-full text-left flex items-center gap-2 py-2 transition-colors group"
          >
            <span className="text-caption flex-1 truncate text-text-secondary">
              {entry.symptom}
            </span>
            <Badge variant={confVariant(entry.confidence)}>{entry.confidence}</Badge>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary" />
          </button>
        ))}
      </div>
    </div>
  );
}
