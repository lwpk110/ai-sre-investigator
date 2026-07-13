"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  AlertCircle,
  Copy,
  Check,
  Download,
} from "lucide-react";

interface HandoffCardProps {
  sessionId: string;
  symptom: string;
  onClose: () => void;
}

interface HandoffData {
  session_id: string;
  symptom: string;
  evidence_chain: { role: string; summary: string }[];
  confidence: string;
  missing: string[];
  suggestions: string[];
  ownership: Record<string, string>;
  markdown: string;
}

export function HandoffCard({ sessionId, symptom, onClose }: HandoffCardProps) {
  const [data, setData] = useState<HandoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHandoff = async () => {
      try {
        const resp = await fetch(`/api/session/${sessionId}/handoff`, {
          method: "POST",
        });
        if (!resp.ok) {
          const text = await resp.text();
          setError(`生成交接卡失败 (${resp.status}): ${text}`);
          return;
        }
        const result = await resp.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setLoading(false);
      }
    };
    fetchHandoff();
  }, [sessionId]);

  const handleCopyMarkdown = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const textarea = document.createElement("textarea");
      textarea.value = data.markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportMarkdown = () => {
    if (!data) return;
    const blob = new Blob([data.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handoff-${sessionId.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] max-h-[80vh] overflow-y-auto rounded-[var(--radius-md)]"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-standard)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center gap-2 px-5 py-4 border-b sticky top-0 z-10"
          style={{
            background: "var(--color-surface-1)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <UserCheck
            className="w-5 h-5"
            style={{ color: "var(--color-warning)" }}
          />
          <span
            className="text-[16px] font-semibold flex-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            SRE 交接卡
          </span>
          <button
            onClick={handleCopyMarkdown}
            disabled={!data}
            className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
            style={{
              background: copied
                ? "rgba(16,185,129,0.1)"
                : "var(--color-app-bg)",
              color: copied
                ? "var(--color-success)"
                : "var(--color-text-secondary)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "已复制" : "复制"}
          </button>
          <button
            onClick={handleExportMarkdown}
            disabled={!data}
            className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
            style={{
              background: "var(--color-app-bg)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
          <button
            onClick={onClose}
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4">
          {loading && (
            <p
              className="text-[14px]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              正在生成交接卡...
            </p>
          )}

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-[var(--radius-sm)]"
              style={{
                background: "rgba(244,63,94,0.06)",
                color: "var(--color-error)",
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-[13px]">{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {/* 症状 */}
              <div>
                <span
                  className="text-[12px] font-medium block mb-1"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  症状
                </span>
                <p
                  className="text-[14px]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {data.symptom}
                </p>
              </div>

              {/* 责任方 */}
              {Object.keys(data.ownership).length > 0 && (
                <div>
                  <span
                    className="text-[12px] font-medium block mb-1"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    责任方
                  </span>
                  {Object.entries(data.ownership).map(([svc, owner]) => (
                    <span
                      key={svc}
                      className="inline-block text-[12px] px-2.5 py-1 rounded-full mr-2"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        color: "var(--color-warning)",
                      }}
                    >
                      {owner}
                    </span>
                  ))}
                </div>
              )}

              {/* 证据链 */}
              {data.evidence_chain.length > 0 && (
                <div>
                  <span
                    className="text-[12px] font-medium block mb-1"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    已查证据链
                  </span>
                  <ul className="space-y-1">
                    {data.evidence_chain.map((item, i) => (
                      <li
                        key={i}
                        className="text-[13px]"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <span
                          className="font-mono text-[11px] px-1.5 py-0.5 rounded mr-2"
                          style={{
                            background: "var(--color-app-bg)",
                            color: "var(--color-text-tertiary)",
                          }}
                        >
                          {item.role}
                        </span>
                        {item.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 待确认 */}
              <div>
                <span
                  className="text-[12px] font-medium block mb-1"
                  style={{ color: "var(--color-error)" }}
                >
                  待 SRE 确认
                </span>
                <ul className="space-y-1">
                  {data.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="text-[13px] flex items-center gap-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <span style={{ color: "var(--color-warning)" }}>-</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
