# 布局组件实现计划（批次 3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 layout 层的 3 个组件（NavList、PageHeader、AppShell），为 layout.tsx 全局改造和页面推倒重写提供骨架。

**Architecture:** layout 层依赖计划 A 的 ui/ 原子组件，封装页面级骨架。AppShell = Sidebar + Main，layout.tsx 嵌入 AppShell 实现全局导航和统一 780px 内容宽度。

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4 (@theme), TypeScript, Vitest, @testing-library/react

## Global Constraints

- 依赖计划 A 的产出：`cn()` from `@/lib/cn`，`Button/Badge/StatusDot/Card/CodeBlock` from `@/components/ui`
- 复刻基准：`docs/prototypes/all-pages-prototype.html`
- 原型 Sidebar 结构：logo + 搜索框 + nav 列表（7 项）+ footer 状态灯
- 原型 main 结构：max-width 780px 居中，padding 24px
- 原型 nav-item：13px / 500，active 态有 accent-muted 背景 + 左侧 2px accent 竖线
- 原型 page-header：20px icon + 20px h1 + spacer + count badge / 操作按钮
- 注释用中文，标识符用英文
- 组件用 Tailwind utility class
- TDD：先写测试 -> 验证失败 -> 实现 -> 验证通过 -> 提交

## 文件结构

| 文件 | 职责 |
|------|------|
| `frontend/src/components/layout/NavList.tsx` | 导航项列表（7 项 + active 高亮 + 左侧竖线） |
| `frontend/src/components/layout/PageHeader.tsx` | 页面标题栏（icon + h1 + 操作区） |
| `frontend/src/components/layout/AppShell.tsx` | 全局壳（Sidebar + Main，layout.tsx 嵌入） |
| `frontend/src/components/layout/index.ts` | barrel export |

---

### Task 1: layout/NavList — 导航项列表

**Files:**
- Create: `frontend/src/components/layout/NavList.tsx`
- Create: `frontend/src/components/layout/__tests__/NavList.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`，`lucide-react` 图标
- Produces: `<NavList items={[...]} activePath="/dashboard" />` — AppShell 内部使用

原型参考（第 253-263 行 nav-item 结构）：
- `.nav-item`: flex items-center gap-2.5 px-3 py-2 rounded-sm text-small font-medium cursor-pointer mb-0.5 transition-colors relative
- hover: bg-white/[0.04] text-text-primary
- active: bg-accent-muted-bg text-accent
- active::before: 左侧 2px accent 竖线（absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r）
- icon: w-4 h-4 shrink-0 opacity-80（active 态 opacity-100）

导航项定义（原型第 253-263 行）：

| 标签 | 路由 | Lucide 图标 |
|------|------|-------------|
| 仪表盘 | /dashboard | LayoutDashboard |
| 服务目录 | /services | Server |
| 工具管理 | /tools | Wrench |
| 知识库 | /knowledge | BookOpen |
| 剧本库 | /playbooks | BookMarked |
| 会话历史 | /sessions | History |
| 模型设置 | /settings | Settings |

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/layout/__tests__/NavList.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavList, type NavItem } from "../NavList";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

const testItems: NavItem[] = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/services", label: "服务目录", icon: "Server" },
  { href: "/tools", label: "工具管理", icon: "Wrench" },
];

describe("NavList", () => {
  it("渲染所有导航项", () => {
    render(<NavList items={testItems} />);
    expect(screen.getByText("仪表盘")).toBeInTheDocument();
    expect(screen.getByText("服务目录")).toBeInTheDocument();
    expect(screen.getByText("工具管理")).toBeInTheDocument();
  });

  it("当前路由项有 active class", () => {
    render(<NavList items={testItems} />);
    const activeLink = screen.getByText("仪表盘").closest("a");
    expect(activeLink?.className).toContain("bg-accent-muted-bg");
    expect(activeLink?.className).toContain("text-accent");
  });

  it("非当前路由项无 active class", () => {
    render(<NavList items={testItems} />);
    const inactiveLink = screen.getByText("服务目录").closest("a");
    expect(inactiveLink?.className).not.toContain("bg-accent-muted-bg");
  });

  it("每个导航项渲染为 Link", () => {
    render(<NavList items={testItems} />);
    const link = screen.getByText("仪表盘").closest("a");
    expect(link?.getAttribute("href")).toBe("/dashboard");
  });
});
```

注意：测试文件需要 `import React from "react"` 以支持 React.createElement。

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/layout/__tests__/NavList.test.tsx`
Expected: FAIL — Cannot find module '../NavList'

- [ ] **Step 3: 实现 NavList**

```tsx
// frontend/src/components/layout/NavList.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Wrench,
  BookOpen,
  BookMarked,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** 图标名 -> Lucide 组件映射 */
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Server,
  Wrench,
  BookOpen,
  BookMarked,
  History,
  Settings,
};

/** 默认导航项（与原型一致） */
export const defaultNavItems: NavItem[] = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/services", label: "服务目录", icon: "Server" },
  { href: "/tools", label: "工具管理", icon: "Wrench" },
  { href: "/knowledge", label: "知识库", icon: "BookOpen" },
  { href: "/playbooks", label: "剧本库", icon: "BookMarked" },
  { href: "/sessions", label: "会话历史", icon: "History" },
  { href: "/settings", label: "模型设置", icon: "Settings" },
];

interface NavListProps {
  items?: NavItem[];
}

export function NavList({ items = defaultNavItems }: NavListProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon] ?? LayoutDashboard;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 mb-0.5 rounded-sm text-small font-medium cursor-pointer transition-colors relative",
              isActive
                ? "bg-accent-muted-bg text-accent"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent" />
            )}
            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-80")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/layout/__tests__/NavList.test.tsx`
Expected: 4 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/layout/NavList.tsx src/components/layout/__tests__/NavList.test.tsx
git commit -m "feat: 添加 NavList 布局组件（7 项导航 + active 高亮）"
```

---

### Task 2: layout/PageHeader — 页面标题栏

**Files:**
- Create: `frontend/src/components/layout/PageHeader.tsx`
- Create: `frontend/src/components/layout/__tests__/PageHeader.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`
- Produces: `<PageHeader icon={...} title="..." count="12 个服务" actions={...}>` — 各页面使用

原型参考（第 101-105 行 page-header）：
- `.page-header`: flex items-center gap-2.5 mb-5
- icon: w-5 h-5 text-text-secondary
- h1: text-page-title font-semibold text-text-primary
- `.spacer`: flex-1
- `.count`: text-caption font-mono text-text-tertiary bg-surface-1 px-2 py-0.5 rounded-full border border-border-subtle

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/layout/__tests__/PageHeader.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Server } from "lucide-react";
import { PageHeader } from "../PageHeader";

describe("PageHeader", () => {
  it("渲染标题", () => {
    render(<PageHeader icon={<Server />} title="服务目录" />);
    expect(screen.getByText("服务目录")).toBeInTheDocument();
  });

  it("标题是 h1 且有正确 class", () => {
    render(<PageHeader icon={<Server />} title="测试" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("text-page-title");
    expect(h1.className).toContain("font-semibold");
  });

  it("渲染 count 计数标签", () => {
    render(<PageHeader icon={<Server />} title="服务" count="12 个服务" />);
    expect(screen.getByText("12 个服务")).toBeInTheDocument();
  });

  it("渲染 actions 操作区", () => {
    render(
      <PageHeader icon={<Server />} title="服务" actions={<button>刷新</button>} />
    );
    expect(screen.getByText("刷新")).toBeInTheDocument();
  });

  it("count 和 actions 同时存在时都渲染", () => {
    render(
      <PageHeader
        icon={<Server />}
        title="服务"
        count="12"
        actions={<button>操作</button>}
      />
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("操作")).toBeInTheDocument();
  });

  it("className prop 可合并", () => {
    const { container } = render(<PageHeader icon={<Server />} title="测试" className="mt-4" />);
    expect((container.firstChild as HTMLElement).className).toContain("mt-4");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/layout/__tests__/PageHeader.test.tsx`
Expected: FAIL — Cannot find module '../PageHeader'

- [ ] **Step 3: 实现 PageHeader**

```tsx
// frontend/src/components/layout/PageHeader.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageHeaderProps {
  /** 标题前的图标 */
  icon?: ReactNode;
  /** 页面标题 */
  title: string;
  /** 右侧计数标签（如"12 个服务"） */
  count?: string;
  /** 右侧操作区（如刷新按钮） */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ icon, title, count, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2.5 mb-5", className)}>
      {icon && <span className="w-5 h-5 text-text-secondary shrink-0">{icon}</span>}
      <h1 className="text-page-title font-semibold text-text-primary">{title}</h1>
      <div className="flex-1" />
      {count && (
        <span className="font-mono text-caption text-text-tertiary bg-surface-1 px-2 py-0.5 rounded-full border border-border-subtle">
          {count}
        </span>
      )}
      {actions}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/layout/__tests__/PageHeader.test.tsx`
Expected: 6 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/layout/PageHeader.tsx src/components/layout/__tests__/PageHeader.test.tsx
git commit -m "feat: 添加 PageHeader 布局组件（标题 + 计数 + 操作区）"
```

---

### Task 3: layout/AppShell — 全局壳

**Files:**
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/__tests__/AppShell.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`，`NavList` from `@/components/layout/NavList`，`lucide-react` 图标
- Produces: `<AppShell sidebarBottom={...}>{children}</AppShell>` — layout.tsx 嵌入

原型参考：
- `.app`: flex h-screen
- `.sidebar`: w-[260px] shrink-0 bg-sidebar-bg border-r border-border-subtle flex flex-col
- sidebar-logo: px-4 py-4 flex items-center gap-2.5 border-b，logo icon 28x28 rounded-sm bg-accent，logo text b(14px/600 text-1) + span(9px/500 text-3 uppercase)
- sidebar-search: px-3 py-3，input bg-surface-1 border border-border-subtle rounded-sm pl-8 text-small
- sidebar-footer: px-4 py-3 border-t，8px dot bg-success + "Agent 在线" text-caption text-text-tertiary
- `.main`: flex-1 bg-main-bg overflow-y-auto
- `.main-content`: max-w-[780px] mx-auto p-6

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/layout/__tests__/AppShell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "../AppShell";

vi.mock("../NavList", () => ({
  NavList: () => <nav data-testid="navlist">nav</nav>,
  defaultNavItems: [],
}));

describe("AppShell", () => {
  it("渲染 children 到 main 区域", () => {
    render(
      <AppShell>
        <div data-testid="page-content">页面内容</div>
      </AppShell>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("渲染 sidebar 区域", () => {
    render(<AppShell>内容</AppShell>);
    expect(screen.getByText("SRE Investigator")).toBeInTheDocument();
    expect(screen.getByTestId("navlist")).toBeInTheDocument();
  });

  it("main 区域有 780px 最大宽度", () => {
    const { container } = render(<AppShell>内容</AppShell>);
    const mainContent = container.querySelector('[data-testid="main-content"]') as HTMLElement;
    expect(mainContent).toBeTruthy();
    expect(mainContent.className).toContain("max-w-[780px]");
    expect(mainContent.className).toContain("mx-auto");
  });

  it("sidebar 有 260px 宽度", () => {
    const { container } = render(<AppShell>内容</AppShell>);
    const sidebar = container.querySelector('[data-testid="app-sidebar"]') as HTMLElement;
    expect(sidebar).toBeTruthy();
    expect(sidebar.className).toContain("w-[260px]");
  });

  it("footer 显示 Agent 在线状态", () => {
    render(<AppShell>内容</AppShell>);
    expect(screen.getByText("Agent 在线")).toBeInTheDocument();
  });

  it("sidebarBottom 自定义内容渲染", () => {
    render(
      <AppShell sidebarBottom={<div data-testid="custom-bottom">自定义底部</div>}>
        内容
      </AppShell>
    );
    expect(screen.getByTestId("custom-bottom")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/layout/__tests__/AppShell.test.tsx`
Expected: FAIL — Cannot find module '../AppShell'

- [ ] **Step 3: 实现 AppShell**

```tsx
// frontend/src/components/layout/AppShell.tsx
import type { ReactNode } from "react";
import { Activity, Search } from "lucide-react";
import { cn } from "@/lib/cn";
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/layout/__tests__/AppShell.test.tsx`
Expected: 6 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/layout/AppShell.tsx src/components/layout/__tests__/AppShell.test.tsx
git commit -m "feat: 添加 AppShell 全局壳组件（Sidebar + 780px Main）"
```

---

### Task 4: Barrel Export + 全量测试验证

**Files:**
- Create: `frontend/src/components/layout/index.ts`

**Interfaces:**
- Produces: `import { NavList, PageHeader, AppShell } from "@/components/layout"`

- [ ] **Step 1: 创建 barrel file**

```typescript
// frontend/src/components/layout/index.ts
export { NavList, defaultNavItems, type NavItem } from "./NavList";
export { PageHeader } from "./PageHeader";
export { AppShell } from "./AppShell";
```

- [ ] **Step 2: 运行全量测试**

Run: `cd frontend && npx vitest run`
Expected: 所有测试通过（ui/ 组件 + layout/ 组件 + 现有组件测试）

- [ ] **Step 3: TypeScript 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
cd frontend && git add src/components/layout/index.ts
git commit -m "feat: 添加 layout 组件 barrel export"
```

---

## Self-Review 结果

**1. Spec 覆盖率：**
- layout/AppShell（spec 4.1）-> Task 3 覆盖
- layout/PageHeader（spec 4.1）-> Task 2 覆盖
- layout/NavList（spec 4.1）-> Task 1 覆盖
- AppShell sidebarBottom prop 支持 Sidebar 会话列表注入（spec 5.1 全局改造）
- 780px 内容宽度（spec 3.x / 5.1）-> AppShell main-content max-w-[780px]

**2. 占位符扫描：** 无 TBD/TODO，所有步骤包含完整代码。

**3. 类型一致性：**
- `NavItem` 接口（href/label/icon: string）在 NavList 和 AppShell 中一致
- `defaultNavItems` 在 NavList 导出，AppShell 通过 NavList 默认使用
- AppShellProps.sidebarBottom?: ReactNode 用于注入会话列表（后续页面推倒时使用）
- `cn()` 调用方式与计划 A 一致
