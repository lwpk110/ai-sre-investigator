"use client";

import {
  Plus,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader,
  BarChart3,
  Wrench,
} from "lucide-react";
import type { Session } from "@/types/events";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

/** 会话状态图标 */
function StatusIcon({ status }: { status: Session["status"] }) {
  switch (status) {
    case "running":
      return <Loader className="w-3 h-3 text-info animate-status-pulse" />;
    case "completed":
      return <CheckCircle className="w-3 h-3 text-success" />;
    case "error":
      return <AlertTriangle className="w-3 h-3 text-error" />;
    default:
      return <Clock className="w-3 h-3 text-text-tertiary" />;
  }
}

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function Sidebar({ sessions, activeSessionId, onSelect, onNew }: SidebarProps) {
  return (
    <aside className="w-[260px] shrink-0 h-screen flex flex-col" style={{ background: "var(--color-sidebar-bg)" }}>
      {/* Logo 区域 */}
      <div className="px-4 py-4 flex items-center gap-2 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <Activity className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
        <span className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Observatory
        </span>
      </div>

      {/* 新建会话 */}
      <div className="px-3 py-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors"
          style={{
            background: "rgba(94,138,255,0.08)",
            color: "var(--color-accent)",
            border: "1px solid rgba(94,138,255,0.2)",
          }}
        >
          <Plus className="w-4 h-4" />
          新建排查
        </button>
      </div>

      {/* 仪表盘入口 */}
      <div className="px-3 pb-2">
        <a
          href="/dashboard"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] transition-colors"
          style={{
            color: "var(--color-text-secondary)",
          }}
        >
          <BarChart3 className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
          价值仪表盘
        </a>
      </div>

      {/* 工具管理入口 */}
      <div className="px-3 pb-2">
        <a
          href="/tools"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] transition-colors"
          style={{
            color: "var(--color-text-secondary)",
          }}
        >
          <Wrench className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
          工具管理
        </a>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
              暂无排查记录
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--color-text-quaternary)" }}>
              输入问题开始排查
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() => onSelect(session.session_id)}
                className="w-full text-left px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors group"
                style={{
                  background:
                    session.session_id === activeSessionId
                      ? "rgba(94,138,255,0.08)"
                      : "transparent",
                  borderLeft:
                    session.session_id === activeSessionId
                      ? "2px solid var(--color-accent)"
                      : "2px solid transparent",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon status={session.status} />
                  <span
                    className="text-[13px] font-medium truncate flex-1"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {session.message.slice(0, 30) || "新排查"}
                  </span>
                </div>
                <span
                  className="text-[11px] font-normal"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {formatTime(session.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
