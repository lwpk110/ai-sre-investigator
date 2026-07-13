"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader,
  Search,
  Settings,
  LayoutDashboard,
  Wrench,
  BookOpen,
  Server,
  History,
} from "lucide-react";
import type { Session } from "@/types/events";

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

/** 会话状态图标和圆点 */
function StatusDot({ status }: { status: Session["status"] }) {
  const color =
    status === "running"
      ? "var(--color-info)"
      : status === "completed"
      ? "var(--color-success)"
      : status === "error"
      ? "var(--color-error)"
      : "var(--color-text-quaternary)";
  const pulse = status === "running" ? "animate-status-pulse" : "";
  return (
    <div
      className={`w-[6px] h-[6px] rounded-full shrink-0 mt-[6px] ${pulse}`}
      style={{ background: color }}
    />
  );
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

/** 按日期分组会话 */
function groupByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const today: Session[] = [];
  const yesterday: Session[] = [];
  const earlier: Session[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (const s of sessions) {
    if (s.created_at >= todayStart) {
      today.push(s);
    } else if (s.created_at >= todayStart - 86_400_000) {
      yesterday.push(s);
    } else {
      earlier.push(s);
    }
  }

  const groups: { label: string; items: Session[] }[] = [];
  if (today.length) groups.push({ label: "今天", items: today });
  if (yesterday.length) groups.push({ label: "昨天", items: yesterday });
  if (earlier.length) groups.push({ label: "更早", items: earlier });
  return groups;
}

/** 导航项 */
function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors"
      style={{
        background: active ? "var(--color-accent-muted)" : "transparent",
        color: active ? "var(--color-accent)" : "var(--color-text-tertiary)",
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

export function Sidebar({ sessions, activeSessionId, onSelect, onNew }: SidebarProps) {
  const pathname = usePathname();
  const groups = groupByDate(sessions);

  return (
    <aside
      className="w-[260px] shrink-0 h-screen flex flex-col"
      style={{ background: "var(--color-sidebar-bg)", borderRight: "1px solid var(--color-border-subtle)" }}
    >
      {/* Logo 区域 */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] shrink-0"
            style={{ background: "var(--color-accent)" }}
          >
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
              SRE Investigator
            </div>
            <div className="text-[10px] font-medium" style={{ color: "var(--color-text-quaternary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              v0.1.0 - internal
            </div>
          </div>
        </div>
        {/* 搜索框 */}
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-quaternary)" }}
          />
          <input
            type="text"
            placeholder="搜索历史排查..."
            className="w-full rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2.5 text-[13px] outline-none transition-colors"
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border-subtle)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>
      </div>

      {/* 新建排查 */}
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

      {/* 导航链接 */}
      <div className="px-2 pb-2 space-y-0.5">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="价值仪表盘" active={pathname === "/dashboard"} />
        <NavItem href="/tools" icon={Wrench} label="工具管理" active={pathname === "/tools"} />
        <NavItem href="/knowledge" icon={BookOpen} label="知识库" active={pathname === "/knowledge"} />
        <NavItem href="/services" icon={Server} label="服务目录" active={pathname === "/services"} />
        <NavItem href="/sessions" icon={History} label="会话历史" active={pathname === "/sessions"} />
        <NavItem href="/settings" icon={Settings} label="模型设置" active={pathname === "/settings"} />
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
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
          groups.map((group) => (
            <div key={group.label}>
              <div
                className="text-[10px] font-medium px-2 pt-2 pb-1"
                style={{ color: "var(--color-text-quaternary)", textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                {group.label}
              </div>
              {group.items.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => onSelect(session.session_id)}
                  className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] transition-colors mb-0.5"
                  style={{
                    background:
                      session.session_id === activeSessionId
                        ? "rgba(94,138,255,0.12)"
                        : "transparent",
                  }}
                >
                  <StatusDot status={session.status} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[12px] font-medium truncate"
                      style={{
                        color:
                          session.session_id === activeSessionId
                            ? "var(--color-text-primary)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {session.message.slice(0, 30) || "新排查"}
                    </div>
                    <div
                      className="text-[10px] font-mono mt-0.5"
                      style={{ color: "var(--color-text-quaternary)" }}
                    >
                      {formatTime(session.created_at)} ·{" "}
                      {session.status === "completed"
                        ? session.is_partial
                          ? "部分 RCA"
                          : "已完成"
                        : session.status === "running"
                        ? "排查中"
                        : session.status === "error"
                        ? "错误"
                        : "已创建"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* 用户信息 */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-t"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div
          className="w-7 h-7 rounded-full shrink-0"
          style={{ background: "linear-gradient(135deg, #5e8aff, #7c3aed)" }}
        />
        <div className="flex-1">
          <div className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            luwei
          </div>
          <div className="text-[10px]" style={{ color: "var(--color-text-quaternary)" }}>
            Developer · payment-team
          </div>
        </div>
      </div>
    </aside>
  );
}
