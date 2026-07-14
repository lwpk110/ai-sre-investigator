import type { ReactNode } from "react";
import { Activity, Search } from "lucide-react";
import { NavList } from "./NavList";

interface AppShellProps {
  children: ReactNode;
  /** Sidebar 底部自定义内容（如会话列表），替代默认 footer */
  sidebarBottom?: ReactNode;
}

export function AppShell({ children, sidebarBottom }: AppShellProps) {
  return (
    <div className="flex h-screen">
      <aside
        data-testid="app-sidebar"
        className="w-[260px] shrink-0 bg-sidebar-bg border-r border-border-subtle flex flex-col"
      >
        {/* Logo 区域 */}
        <div className="px-4 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-accent shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <b className="text-body font-semibold text-text-primary">SRE Investigator</b>
              <span className="text-[9px] font-medium text-text-tertiary tracking-wider uppercase">
                v0.1.0 - internal
              </span>
            </div>
          </div>
          {/* 搜索框 */}
          <div className="relative mt-3">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-quaternary pointer-events-none" />
            <input
              type="text"
              placeholder="搜索服务、症状..."
              className="w-full bg-surface-1 border border-border-subtle rounded-sm pl-8 pr-2.5 py-2 text-small text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* 导航 */}
        <NavList />

        {/* 底部区域 */}
        {sidebarBottom ?? (
          <div className="px-4 py-3 border-t border-border-subtle flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-caption text-text-tertiary">Agent 在线</span>
          </div>
        )}
      </aside>

      {/* ---- Main ---- */}
      <main className="flex-1 bg-main-bg overflow-y-auto">
        <div data-testid="main-content" className="max-w-[780px] mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
