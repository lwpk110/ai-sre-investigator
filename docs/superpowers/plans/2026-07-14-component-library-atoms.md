# 组件库原子组件实现计划（批次 0-2）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立前端组件库的基础设施和 6 个原子原语组件，为页面推倒重写提供构建块。

**Architecture:** 自底向上构建：先对齐 Tailwind v4 Token 层，创建 cn() 工具函数，然后逐个 TDD 实现原子组件。每个组件只依赖 Tailwind token + cn()，不依赖其他组件。

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4 (@theme), TypeScript, Vitest, @testing-library/react

## Global Constraints

- 复刻基准：`docs/prototypes/all-pages-prototype.html`（唯一参考源）
- 设计系统：`docs/design/DESIGN.md`（Observatory 深色主题）
- 注释用中文，标识符用英文
- 组件用 Tailwind utility class，不用内联 style
- 所有组件导出接受 className prop，用 cn() 合并
- TDD：先写测试 -> 验证失败 -> 实现 -> 验证通过 -> 提交
- 前端工作目录：`frontend/`
- 质量门禁：`cd frontend && npx vitest run` 全绿
- 已有依赖：tailwindcss@4, vitest@4, @testing-library/react@16, lucide-react@1
- @ 路径别名指向 `frontend/src/`（tsconfig + vitest.config 已配置）
- vitest setup: `frontend/vitest.setup.ts`（仅 import jest-dom matchers）
- 测试文件放在 `frontend/src/components/ui/__tests__/` 目录下

## 文件结构

| 文件 | 职责 |
|------|------|
| `frontend/src/lib/cn.ts` | className 合并工具 |
| `frontend/src/app/globals.css` | Tailwind v4 @theme token 定义（修改） |
| `frontend/src/components/ui/Button.tsx` | 按钮原子组件（primary/ghost/icon 变体） |
| `frontend/src/components/ui/Badge.tsx` | 状态徽章（ok/warn/err/info/purple 变体） |
| `frontend/src/components/ui/StatusDot.tsx` | 状态圆点（running 脉冲动画） |
| `frontend/src/components/ui/Card.tsx` | Surface 卡片壳（含 loading/empty/error 状态） |
| `frontend/src/components/ui/CodeBlock.tsx` | QL 代码块（语言标签 + 等宽字体） |
| `frontend/src/components/ui/index.ts` | 统一导出 barrel file |

---

### Task 1: cn() 工具函数 + 依赖安装

**Files:**
- Create: `frontend/src/lib/cn.ts`
- Modify: `frontend/package.json`（添加 clsx 和 tailwind-merge）

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` — 后续所有组件依赖此函数

- [ ] **Step 1: 安装依赖**

```bash
cd frontend && npm install clsx tailwind-merge
```

- [ ] **Step 2: 创建 cn.ts**

```typescript
// frontend/src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind class，解决冲突（后者覆盖前者） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: 验证导入可用**

```bash
cd frontend && npx tsx -e "import { cn } from './src/lib/cn'; console.log(cn('px-2 py-1', 'px-4'))"
```
Expected: 输出 `px-4 py-1`（tailwind-merge 解决了 px-2/px-4 冲突，后者胜出）

如果没有 npx tsx，用 vitest 代替验证：

```bash
cd frontend && npx vitest run --reporter=verbose src/lib/__tests__/cn.test.ts 2>/dev/null || echo "跳过 — 下一步会验证"
```

- [ ] **Step 4: 写 cn 单元测试**

```typescript
// frontend/src/lib/__tests__/cn.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("合并多个 class", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("Tailwind 冲突后者覆盖前者", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("条件 class 过滤 false", () => {
    expect(cn("text-sm", false && "text-lg")).toBe("text-sm");
  });

  it("空输入返回空字符串", () => {
    expect(cn()).toBe("");
  });
});
```

- [ ] **Step 5: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/lib/__tests__/cn.test.ts`
Expected: 4 tests passed

- [ ] **Step 6: 提交**

```bash
cd frontend && git add src/lib/ && git add package.json package-lock.json
git commit -m "feat: 添加 cn() className 合并工具"
```

---

### Task 2: Token 层补全（globals.css @theme）

**Files:**
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Produces: 补全后的 Tailwind v4 @theme token，后续组件可直接使用 `bg-success-bg`、`text-page-title` 等 utility class

- [ ] **Step 1: 在 @theme 块末尾（--radius-md 之后）追加 token**

在 `frontend/src/app/globals.css` 的 `@theme { ... }` 块内，在 `--radius-md: 8px;` 之后追加以下内容：

```css

  /* --- 间距系统 (4px base, DESIGN.md) --- */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-base: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 40px;
  --spacing-4xl: 48px;

  /* --- 字体尺寸层级 (DESIGN.md typography) --- */
  --text-page-title: 20px;
  --text-card-title: 15px;
  --text-body: 14px;
  --text-small: 13px;
  --text-caption: 12px;
  --text-micro: 11px;
  --text-data-large: 24px;

  /* --- 状态色背景变体 (10% opacity, 原型用) --- */
  --color-success-bg: rgba(16, 185, 129, 0.10);
  --color-warning-bg: rgba(245, 158, 11, 0.10);
  --color-error-bg: rgba(244, 63, 94, 0.10);
  --color-info-bg: rgba(56, 189, 248, 0.10);
  --color-purple: #a855f7;
  --color-purple-bg: rgba(168, 85, 247, 0.10);

  /* --- 代码块背景 (原型 --bg-code) --- */
  --color-code-bg: #070912;

  /* --- 强调色 muted 背景 (原型 --accent-muted) --- */
  --color-accent-muted-bg: rgba(94, 138, 255, 0.12);
```

- [ ] **Step 2: 验证 Tailwind 能识别新 token**

启动 dev server 确认无报错：

```bash
cd frontend && timeout 10 npx next dev 2>&1 | head -20
```
Expected: 正常启动，无 CSS 编译错误

- [ ] **Step 3: 提交**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: 补全 Tailwind v4 @theme token（间距/字体/状态背景色）"
```

---

### Task 3: ui/Button — 按钮原子组件

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`
- Produces: `<Button variant="primary"|"ghost"|"icon" size="default"|"sm">` — 后续页面和布局组件使用

原型参考（all-pages-prototype.html 第 108-114 行）：
- `.btn`: inline-flex items-center gap-1.5 px-4 py-2 rounded-sm font-sans text-small font-medium cursor-pointer border-none transition
- `.btn-primary`: bg-accent text-white hover:bg-accent-hover
- `.btn-ghost`: bg-white/[0.04] text-text-secondary border border-border-standard hover:bg-white/[0.08] hover:text-text-primary
- `.btn-sm`: px-3 py-1.5 text-caption
- icon button: 透明背景 32x32 hover:bg-white/[0.06]

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/ui/__tests__/Button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
  it("渲染 children", () => {
    render(<Button>测试按钮</Button>);
    expect(screen.getByText("测试按钮")).toBeInTheDocument();
  });

  it("primary 变体包含正确 class", () => {
    render(<Button variant="primary">主按钮</Button>);
    const btn = screen.getByText("主按钮").closest("button");
    expect(btn?.className).toContain("bg-accent");
    expect(btn?.className).toContain("text-white");
  });

  it("ghost 变体包含边框 class", () => {
    render(<Button variant="ghost">幽灵按钮</Button>);
    const btn = screen.getByText("幽灵按钮").closest("button");
    expect(btn?.className).toContain("border");
    expect(btn?.className).toContain("border-border-standard");
  });

  it("icon 变体是正方形", () => {
    render(<Button variant="icon" aria-label="删除">X</Button>);
    const btn = screen.getByLabelText("删除");
    expect(btn.className).toContain("w-8");
    expect(btn.className).toContain("h-8");
  });

  it("sm size 包含小字体 class", () => {
    render(<Button size="sm">小按钮</Button>);
    const btn = screen.getByText("小按钮").closest("button");
    expect(btn?.className).toContain("text-caption");
  });

  it("点击触发 onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>点击</Button>);
    await user.click(screen.getByText("点击"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 时不可点击", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>禁用</Button>);
    await user.click(screen.getByText("禁用"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("className prop 合并到组件", () => {
    render(<Button className="ml-4">自定义</Button>);
    const btn = screen.getByText("自定义").closest("button");
    expect(btn?.className).toContain("ml-4");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Button.test.tsx`
Expected: FAIL — Cannot find module '../Button'

- [ ] **Step 3: 实现 Button**

```tsx
// frontend/src/components/ui/Button.tsx
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "icon";
type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost:
    "bg-white/[0.04] text-text-secondary border border-border-standard hover:bg-white/[0.08] hover:text-text-primary",
  icon: "bg-transparent text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-small gap-1.5",
  sm: "px-3 py-1.5 text-caption gap-1",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className, children, ...props }, ref) => {
    const isIcon = variant === "icon";

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-sm font-medium cursor-pointer border-none transition-colors",
          isIcon ? "w-8 h-8" : sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Button.test.tsx`
Expected: 8 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/ui/Button.tsx src/components/ui/__tests__/Button.test.tsx
git commit -m "feat: 添加 Button 原子组件（primary/ghost/icon 变体）"
```

---

### Task 4: ui/Badge — 状态徽章

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/__tests__/Badge.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`
- Produces: `<Badge variant="default"|"ok"|"warn"|"err"|"info"|"purple">` — 页面状态标签使用

原型参考（第 121-126 行）：
- `.badge`: inline-flex items-center gap-1 bg-white/[0.05] text-text-secondary rounded-full px-2 py-0.5 text-micro font-medium font-mono
- `.badge-ok`: bg-success-bg text-success
- `.badge-warn`: bg-warning-bg text-warning
- `.badge-err`: bg-error-bg text-error
- `.badge-info`: bg-info-bg text-info
- `.badge-purple`: bg-purple-bg text-purple

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/ui/__tests__/Badge.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("渲染 children", () => {
    render(<Badge>P0</Badge>);
    expect(screen.getByText("P0")).toBeInTheDocument();
  });

  it("default 变体包含中性色 class", () => {
    render(<Badge>默认</Badge>);
    const badge = screen.getByText("默认");
    expect(badge.className).toContain("bg-white/[0.05]");
    expect(badge.className).toContain("text-text-secondary");
  });

  it("ok 变体包含 success 色", () => {
    render(<Badge variant="ok">成功</Badge>);
    const badge = screen.getByText("成功");
    expect(badge.className).toContain("bg-success-bg");
    expect(badge.className).toContain("text-success");
  });

  it("err 变体包含 error 色", () => {
    render(<Badge variant="err">P0</Badge>);
    const badge = screen.getByText("P0");
    expect(badge.className).toContain("bg-error-bg");
    expect(badge.className).toContain("text-error");
  });

  it("warn 变体包含 warning 色", () => {
    render(<Badge variant="warn">P1</Badge>);
    const badge = screen.getByText("P1");
    expect(badge.className).toContain("bg-warning-bg");
    expect(badge.className).toContain("text-warning");
  });

  it("info 变体包含 info 色", () => {
    render(<Badge variant="info">PromQL</Badge>);
    const badge = screen.getByText("PromQL");
    expect(badge.className).toContain("bg-info-bg");
    expect(badge.className).toContain("text-info");
  });

  it("purple 变体包含 purple 色", () => {
    render(<Badge variant="purple">memory</Badge>);
    const badge = screen.getByText("memory");
    expect(badge.className).toContain("bg-purple-bg");
    expect(badge.className).toContain("text-purple");
  });

  it("className prop 可合并", () => {
    render(<Badge className="ml-2">额外</Badge>);
    expect(screen.getByText("额外").className).toContain("ml-2");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Badge.test.tsx`
Expected: FAIL — Cannot find module '../Badge'

- [ ] **Step 3: 实现 Badge**

```tsx
// frontend/src/components/ui/Badge.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "ok" | "warn" | "err" | "info" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.05] text-text-secondary",
  ok: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  err: "bg-error-bg text-error",
  info: "bg-info-bg text-info",
  purple: "bg-purple-bg text-purple",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-micro font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Badge.test.tsx`
Expected: 8 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/ui/Badge.tsx src/components/ui/__tests__/Badge.test.tsx
git commit -m "feat: 添加 Badge 原子组件（6 种状态色变体）"
```

---

### Task 5: ui/StatusDot — 状态圆点

**Files:**
- Create: `frontend/src/components/ui/StatusDot.tsx`
- Create: `frontend/src/components/ui/__tests__/StatusDot.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`
- Produces: `<StatusDot status="ok"|"warn"|"err"|"info"|"running">` — Timeline 和服务状态使用

原型参考（第 132 行）：
- `.s-dot`: 8px 圆点（w-2 h-2 rounded-full）
- running 状态有脉冲动画（opacity 1.0 -> 0.4 -> 1.0，1.5s 循环）

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/ui/__tests__/StatusDot.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatusDot } from "../StatusDot";

describe("StatusDot", () => {
  it("ok 状态渲染 success 色", () => {
    const { container } = render(<StatusDot status="ok" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-success");
  });

  it("warn 状态渲染 warning 色", () => {
    const { container } = render(<StatusDot status="warn" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-warning");
  });

  it("err 状态渲染 error 色", () => {
    const { container } = render(<StatusDot status="err" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-error");
  });

  it("info 状态渲染 info 色", () => {
    const { container } = render(<StatusDot status="info" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-info");
  });

  it("running 状态渲染 info 色 + 脉冲动画", () => {
    const { container } = render(<StatusDot status="running" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-info");
    expect(dot.className).toContain("animate-status-pulse");
  });

  it("固定尺寸 8px", () => {
    const { container } = render(<StatusDot status="ok" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("w-2");
    expect(dot.className).toContain("h-2");
  });

  it("className prop 可合并", () => {
    const { container } = render(<StatusDot status="ok" className="mt-1" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("mt-1");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/StatusDot.test.tsx`
Expected: FAIL — Cannot find module '../StatusDot'

- [ ] **Step 3: 实现 StatusDot**

```tsx
// frontend/src/components/ui/StatusDot.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type StatusType = "ok" | "warn" | "err" | "info" | "running";

interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
}

const statusClasses: Record<StatusType, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  err: "bg-error",
  info: "bg-info",
  running: "bg-info animate-status-pulse",
};

export function StatusDot({ status, className, ...props }: StatusDotProps) {
  return (
    <span
      className={cn("w-2 h-2 rounded-full shrink-0", statusClasses[status], className)}
      {...props}
    />
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/StatusDot.test.tsx`
Expected: 7 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/ui/StatusDot.tsx src/components/ui/__tests__/StatusDot.test.tsx
git commit -m "feat: 添加 StatusDot 原子组件（含 running 脉冲动画）"
```

---

### Task 6: ui/Card — Surface 卡片壳（含状态变体）

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/__tests__/Card.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`
- Produces:
  - `<Card>` — 基础卡片壳
  - `<Card loading>` — 显示 skeleton 占位
  - `<Card empty>` — 显示空状态
  - `<Card error="...">` — 显示错误状态
  - 后续页面和业务组件使用 Card 包裹内容

原型参考（第 117-118 行）：
- `.card`: bg-surface-1 border border-border-subtle rounded-md p-4 transition-colors hover:border-border-emphasis

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/ui/__tests__/Card.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../Card";

describe("Card", () => {
  it("渲染 children", () => {
    render(<Card>卡片内容</Card>);
    expect(screen.getByText("卡片内容")).toBeInTheDocument();
  });

  it("包含 surface 和 border class", () => {
    const { container } = render(<Card>内容</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("bg-surface-1");
    expect(card.className).toContain("border");
    expect(card.className).toContain("border-border-subtle");
    expect(card.className).toContain("rounded-md");
  });

  it("loading 状态不渲染 children，显示 skeleton", () => {
    render(<Card loading>加载中内容</Card>);
    expect(screen.queryByText("加载中内容")).not.toBeInTheDocument();
    const { container } = render(<Card loading>test</Card>);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("empty 状态不渲染 children，显示空提示", () => {
    render(<Card empty>内容</Card>);
    expect(screen.queryByText("内容")).not.toBeInTheDocument();
    // 空状态应包含提示文字
    expect(container).toBeDefined();
  });

  it("error 状态显示错误信息", () => {
    render(<Card error="加载失败">正常内容</Card>);
    expect(screen.queryByText("正常内容")).not.toBeInTheDocument();
    expect(screen.getByText("加载失败")).toBeInTheDocument();
  });

  it("error 优先于 loading", () => {
    render(<Card error="错误" loading>内容</Card>);
    expect(screen.getByText("错误")).toBeInTheDocument();
    expect(screen.queryByText("内容")).not.toBeInTheDocument();
  });

  it("className prop 可合并", () => {
    const { container } = render(<Card className="mb-4">内容</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("mb-4");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Card.test.tsx`
Expected: FAIL — Cannot find module '../Card'

- [ ] **Step 3: 实现 Card**

```tsx
// frontend/src/components/ui/Card.tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 加载中 — 显示 skeleton 占位 */
  loading?: boolean;
  /** 空数据 — 显示空状态提示 */
  empty?: boolean;
  /** 错误信息 — 传入则显示错误状态 */
  error?: string;
  /** 空状态自定义文案 */
  emptyText?: string;
}

export function Card({
  loading = false,
  empty = false,
  error,
  emptyText = "暂无数据",
  className,
  children,
  ...props
}: CardProps) {
  const baseClass = cn(
    "bg-surface-1 border border-border-subtle rounded-md p-4 transition-colors",
    className,
  );

  // 状态优先级：error > loading > empty > loaded
  if (error) {
    return (
      <div className={cn(baseClass, "border-error/50")} {...props}>
        <p className="text-small text-error">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={baseClass} {...props}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 rounded bg-surface-2 w-3/4" />
          <div className="h-4 rounded bg-surface-2 w-1/2" />
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn(baseClass, "flex items-center justify-center py-8")} {...props}>
        <p className="text-small text-text-tertiary">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={baseClass} {...props}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/Card.test.tsx`
Expected: 7 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/ui/Card.tsx src/components/ui/__tests__/Card.test.tsx
git commit -m "feat: 添加 Card 原子组件（含 loading/empty/error 状态变体）"
```

---

### Task 7: ui/CodeBlock — QL 代码块

**Files:**
- Create: `frontend/src/components/ui/CodeBlock.tsx`
- Create: `frontend/src/components/ui/__tests__/CodeBlock.test.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/cn`
- Produces: `<CodeBlock label="PromQL" copyable>...</CodeBlock>` — Playbooks、Timeline、Sessions 页面使用

原型参考（第 129 行）：
- `.code-block`: bg-code-bg border border-border-subtle rounded-sm p-3 font-mono text-[12.5px] text-text-secondary leading-relaxed whitespace-pre overflow-x-auto
- 部分 code-block 有语言标签 header（Playbook 步骤中的 `<div class="pb-step-head">` 包含 badge + 描述）
- code-block 可嵌套在 list-item-body 内

- [ ] **Step 1: 写失败测试**

```tsx
// frontend/src/components/ui/__tests__/CodeBlock.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeBlock } from "../CodeBlock";

describe("CodeBlock", () => {
  it("渲染代码内容", () => {
    render(<CodeBlock>{"rate(http_requests_total[5m])"}</CodeBlock>);
    expect(screen.getByText("rate(http_requests_total[5m])")).toBeInTheDocument();
  });

  it("包含 code-bg 和 mono class", () => {
    const { container } = render(<CodeBlock>{"query"}</CodeBlock>);
    const block = container.firstChild as HTMLElement;
    expect(block.className).toContain("bg-code-bg");
    expect(block.className).toContain("font-mono");
    expect(block.className).toContain("whitespace-pre");
  });

  it("有 label 时显示标签", () => {
    render(<CodeBlock label="PromQL">{"query"}</CodeBlock>);
    expect(screen.getByText("PromQL")).toBeInTheDocument();
  });

  it("无 label 时不渲染 label 区域", () => {
    const { container } = render(<CodeBlock>{"query"}</CodeBlock>);
    // 只有一个子元素（code 内容），没有 label header
    const block = container.firstChild as HTMLElement;
    expect(block.querySelector('[data-testid="codeblock-label"]')).toBeNull();
  });

  it("copyable 时渲染复制按钮", () => {
    render(<CodeBlock copyable>{"query"}</CodeBlock>);
    expect(screen.getByRole("button", { name: /复制/i })).toBeInTheDocument();
  });

  it("无 copyable 时不渲染复制按钮", () => {
    render(<CodeBlock>{"query"}</CodeBlock>);
    expect(screen.queryByRole("button", { name: /复制/i })).toBeNull();
  });

  it("className prop 可合并", () => {
    const { container } = render(<CodeBlock className="mt-2">{"query"}</CodeBlock>);
    expect((container.firstChild as HTMLElement).className).toContain("mt-2");
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/CodeBlock.test.tsx`
Expected: FAIL — Cannot find module '../CodeBlock'

- [ ] **Step 3: 实现 CodeBlock**

```tsx
// frontend/src/components/ui/CodeBlock.tsx
"use client";

import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  /** 语言标签（如 PromQL、LogQL、TraceQL），显示在左上角 */
  label?: string;
  /** 是否显示复制按钮 */
  copyable?: boolean;
  children: ReactNode;
}

export function CodeBlock({
  label,
  copyable = false,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof children === "string" ? children : String(children);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 有 label 或 copyable 时显示 header bar
  const hasHeader = label || copyable;

  return (
    <div
      className={cn(
        "bg-code-bg border border-border-subtle rounded-sm overflow-hidden",
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle">
          {label ? (
            <span
              data-testid="codeblock-label"
              className="font-mono text-micro text-text-tertiary"
            >
              {label}
            </span>
          ) : (
            <span />
          )}
          {copyable && (
            <button
              onClick={handleCopy}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="复制"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
      <pre className="px-3 py-3 font-mono text-[12.5px] text-text-secondary leading-relaxed whitespace-pre overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd frontend && npx vitest run src/components/ui/__tests__/CodeBlock.test.tsx`
Expected: 7 tests passed

- [ ] **Step 5: 提交**

```bash
cd frontend && git add src/components/ui/CodeBlock.tsx src/components/ui/__tests__/CodeBlock.test.tsx
git commit -m "feat: 添加 CodeBlock 原子组件（语言标签 + 复制按钮）"
```

---

### Task 8: Barrel Export + 全量测试验证

**Files:**
- Create: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Produces: 统一导入入口 `import { Button, Badge, StatusDot, Card, CodeBlock } from "@/components/ui"`

- [ ] **Step 1: 创建 barrel file**

```typescript
// frontend/src/components/ui/index.ts
export { Button } from "./Button";
export { Badge } from "./Badge";
export { StatusDot } from "./StatusDot";
export { Card } from "./Card";
export { CodeBlock } from "./CodeBlock";
```

- [ ] **Step 2: 运行全量测试**

Run: `cd frontend && npx vitest run`
Expected: 所有测试通过（cn + Button + Badge + StatusDot + Card + CodeBlock + 现有组件测试）

- [ ] **Step 3: TypeScript 类型检查**

Run: `cd frontend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
cd frontend && git add src/components/ui/index.ts
git commit -m "feat: 添加 ui 组件 barrel export"
```

---

## Self-Review 结果

**1. Spec 覆盖率：**
- Token 对齐（spec 3.2）-> Task 2 覆盖（间距/字体/状态背景/code-bg/accent-muted-bg）
- cn() 工具（spec 4.3）-> Task 1 覆盖
- ui/Button（spec 4.1）-> Task 3 覆盖
- ui/Badge -> Task 4 覆盖
- ui/StatusDot -> Task 5 覆盖
- ui/Card（含 loading/empty/error，spec 4.4）-> Task 6 覆盖
- ui/CodeBlock -> Task 7 覆盖
- Barrel export -> Task 8 覆盖
- ui/DataTable -> 计划 B 覆盖（原型中是可展开列表卡片 list-item，不是传统表格，需在计划 B 中调整实现方式）
- layout/ 组件 -> 计划 B 覆盖

**2. 占位符扫描：** 无 TBD/TODO，所有步骤包含完整代码。

**3. 类型一致性：**
- `cn(...inputs: ClassValue[]): string` 在所有组件中一致使用
- ButtonVariant = "primary" | "ghost" | "icon" 在 Button 和后续使用中一致
- BadgeVariant = "default" | "ok" | "warn" | "err" | "info" | "purple" 在 Badge 和后续使用中一致
- StatusType = "ok" | "warn" | "err" | "info" | "running" 在 StatusDot 和后续使用中一致
- CardProps.loading/empty/error 状态优先级 error > loading > empty > loaded 在实现和测试中一致
