"use client";

import { useState, useEffect } from "react";
import { History, ChevronRight, X } from "lucide-react";
import { searchKnowledge, type KnowledgeEntry } from "@/lib/knowledge";

interface KnowledgeHintProps {
  /** 当前输入的消息 */
  message: string;
  /** 点击历史 RCA 时的回调 */
  onSelect: (entry: KnowledgeEntry) => void;
}

export function KnowledgeHint({ message, onSelect }: KnowledgeHintProps) {
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
    <div
      className="animate-step-enter rounded-[var(--radius-md)] overflow-hidden"
      style={{
        background: "rgba(168,85,247,0.04)",
        border: "1px solid rgba(168,85,247,0.15)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(168,85,247,0.1)" }}
      >
        <History
          className="w-4 h-4"
          style={{ color: "rgba(168,85,247,1)" }}
        />
        <span
          className="text-[13px] font-medium"
          style={{ color: "rgba(168,85,247,1)" }}
        >
          命中历史排查模式
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setDismissed(true)}
          style={{ color: "var(--color-text-tertiary)" }}
        >
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
            <span
              className="text-[12px] flex-1 truncate"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {entry.symptom}
            </span>
            <span
              className="text-[11px] font-mono px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background:
                  entry.confidence === "high"
                    ? "rgba(16,185,129,0.1)"
                    : entry.confidence === "medium"
                    ? "rgba(245,158,11,0.1)"
                    : "rgba(244,63,94,0.1)",
                color:
                  entry.confidence === "high"
                    ? "var(--color-success)"
                    : entry.confidence === "medium"
                    ? "var(--color-warning)"
                    : "var(--color-error)",
              }}
            >
              {entry.confidence}
            </span>
            <ChevronRight
              className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-tertiary)" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
