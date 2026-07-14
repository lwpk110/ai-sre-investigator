# 原型复刻设计：组件库先行 + 页面推倒重写

> 日期：2026-07-14
> 状态：待审查
> 参考源：`docs/prototypes/all-pages-prototype.html`（唯一复刻基准）
> 设计系统：`docs/design/DESIGN.md`（Observatory 深色主题，source of truth）
> 前端技术栈：Next.js App Router + React 19 + Tailwind CSS v4 + TypeScript

## 1. 背景与问题

现有前端 9 个页面存在系统性偏离原型的问题（详见 `docs/ui-deviation-audit.md`）：

- 8/9 页面缺少全局 Sidebar 导航（`layout.tsx` 是裸壳，只渲染 `{children}`）
- 布局宽度出现 4 种变体（780px / 800px / 960px / 无约束），与 DESIGN.md 规定的 780px 不一致
- 7/9 页面无原型对照，凭空编码
- 全程内联 `style={{}}`，没有共享组件层，样式无法统一管理
- 每页用 `<Link href="/">返回排查</Link>` 代替全局导航，是错误模式

结论：现有页面的架构根基偏离原型，逐页"迁移"的工作量等同于推倒重写，且要背负旧模式包袱。因此采用**推倒重写**策略。

## 2. 整体策略：组件库先行（方式 A）

```
Token 对齐 -> 原子组件 (ui/) -> 布局组件 (layout/) -> 业务组件重构 (domain/) -> 页面推倒重写
```

每一层只依赖下层，由底向上构建。每批组件完成后用原型截图做视觉验证。

## 3. Token 层对齐

### 3.1 现状

`globals.css` 使用 Tailwind v4 的 `@theme` 指令，已映射了 DESIGN.md 的颜色 / 字体 / 圆角 token。但缺少三个维度：

- **间距系统**：DESIGN.md 规定 base unit 4px，scale 为 4/8/12/16/20/24/32/40/48，当前未声明
- **字体尺寸层级**：DESIGN.md 定义了 9 级排版（Page title 20px 到 Micro 11px），当前无对应 token
- **状态色背景变体**：原型大量使用 rgba(status_color, 0.10) 背景色，当前只有前景色

### 3.2 补充内容

在 `@theme` 块中追加：

```css
/* 间距系统 (4px base) */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-base: 16px;
--spacing-lg: 20px;
--spacing-xl: 24px;
--spacing-2xl: 32px;
--spacing-3xl: 40px;
--spacing-4xl: 48px;

/* 字体尺寸层级 */
--text-page-title: 20px;
--text-card-title: 15px;
--text-body: 14px;
--text-small: 13px;
--text-caption: 12px;
--text-micro: 11px;
--text-data-large: 24px;

/* 状态色背景变体 (10% opacity) */
--color-success-bg: rgba(16, 185, 129, 0.10);
--color-warning-bg: rgba(245, 158, 11, 0.10);
--color-error-bg: rgba(244, 63, 94, 0.10);
--color-info-bg: rgba(56, 189, 248, 0.10);
--color-purple: #a855f7;
--color-purple-bg: rgba(168, 85, 247, 0.10);
```

### 3.3 迁移策略

- 新组件统一用 Tailwind class（bg-surface-1、text-text-secondary、border-border-subtle），不再用内联 style
- 现有组件在重构对应页面时顺带迁移，不做一次性大爆炸式改写

## 4. 组件分层架构

### 4.1 目录结构

```
frontend/src/
lib/
  cn.ts                    -- className 合并工具 (clsx + tailwind-merge)
mocks/                      -- 与原型一致的 mock 数据 (JSON)
  services.json / tools.json / knowledge.json / playbooks.json / sessions.json / dashboard.json
components/
  ui/                       -- 原子原语，无业务语义，纯设计系统实现
    Button.tsx              -- primary / ghost / icon 三变体
    Badge.tsx               -- 状态色变体 (ok/warn/err/info/purple)
    StatusDot.tsx           -- 8px 圆点 + running 脉冲动画
    Card.tsx                -- Surface 卡片壳 (含 loading/empty/error 变体)
    CodeBlock.tsx           -- QL 代码块 (mono + 语言标签 + copy 按钮)
    DataTable.tsx           -- 密集数据表格 (含 loading/empty 变体)
  layout/                   -- 布局复合组件，页面骨架
    AppShell.tsx            -- Sidebar + Main 全局壳，layout.tsx 嵌入
    PageHeader.tsx          -- 页面标题 + 描述 + 操作区
    NavList.tsx             -- 导航项列表 (从 Sidebar 抽取)
  domain/                   -- 业务组件，保留业务逻辑，重写渲染层
    Sidebar.tsx / Timeline.tsx / RCAPanel.tsx / ChatInput.tsx / BudgetBar.tsx ...
hooks/                      -- 数据获取逻辑提取 (从 page.tsx 抽出)
  useServices.ts / useTools.ts ...
app/
  layout.tsx                -- 改造为 <AppShell> 全局壳
  */page.tsx                -- 逐页推倒重写
```

### 4.2 依赖规则

- `ui/` 不依赖任何 `layout/` 或 `domain/` 组件，只依赖 Tailwind token + cn()
- `layout/` 依赖 `ui/` 原语，不依赖 `domain/`
- `domain/` 可以引用 `ui/` 和 `layout/`，但反过来不行
- `hooks/` 不依赖组件层，只负责数据获取与状态管理
- 所有原子组件接受 className prop 用于外部覆盖，用 cn() 合并

### 4.3 cn() 工具函数

新增依赖：clsx + tailwind-merge

```typescript
// lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind class，解决冲突（后者覆盖前者） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 4.4 组件状态规范

原子组件 Card 和 DataTable 内置四种状态：

| 状态 | 视觉 | 实现方式 |
|------|------|---------|
| **loaded** | 正常内容渲染 | 默认 children |
| **loading** | Skeleton 占位（surface-2 色块 + 脉冲动画） | loading prop 为 true 时渲染 skeleton |
| **empty** | 空状态提示（图标 + 文字） | empty prop 为 true 时渲染占位 |
| **error** | 错误状态（红色边框 + 错误信息） | error prop 传入时渲染错误提示 |

状态优先级：error > loading > empty > loaded。

## 5. 页面推倒重写策略

### 5.1 全局改造（最先执行）

- `layout.tsx` 从裸壳改为 `<AppShell>` 包裹
- AppShell 包含全局 Sidebar + main 区域（max-w-[780px] mx-auto）
- 改造后所有页面自动获得 Sidebar + 统一内容宽度，不再需要每页自己写容器

### 5.2 页面分类

| 类别 | 页面 | 当前行数 | 策略 |
|------|------|---------|------|
| **直接推倒** | dashboard(26)、services(98)、tools(133)、knowledge(164)、sessions(130)、settings(103) | 26-164 | 删掉旧 page.tsx，按原型从零重写 |
| **保留逻辑、重写渲染** | 根排查页(559)、playbooks(463)、scenarios(503) | 463-559 | 提取接口和数据逻辑到 hooks/，重写 JSX |

### 5.3 执行优先级

| 批次 | 页面 | 原型核心内容 | 复用组件 |
|------|------|-------------|---------|
| P0 | Dashboard /dashboard | KPI 卡片 + 趋势区 | Card、Badge、DataTable |
| P0 | Services /services | 服务目录表格 + 状态列 | DataTable、StatusDot、Badge |
| P0 | Tools /tools | 工具表格 + 启用/禁用 | DataTable、Badge、Button |
| P1 | Knowledge /knowledge | 知识条目卡片列表 | Card、Badge、Button |
| P1 | Playbooks /playbooks | 触发条件 + 步骤 | Card、CodeBlock、Badge |
| P1 | Sessions /sessions | 会话列表 + 详情 | Card、StatusDot、Badge |
| P2 | Settings /settings | 表单控件 | Button、Card、Badge |
| P2 | 主排查页 / | ChatInput + Timeline + RCAPanel + BudgetBar | 全量组件 |

### 5.4 每页标准流程

1. 打开 all-pages-prototype.html 对应 tab，截图作为视觉基准
2. 从 mocks/ 导入数据，用 ui/ + layout/ 组件拼装页面 JSX
3. Playwright 截图对比，确认视觉一致（布局、间距、色板、字体）
4. 补充/更新页面级测试

## 6. Mock 数据层

### 6.1 目的

推倒重写时需要数据验证视觉效果，但后端 API 尚未实现。在 frontend/src/mocks/ 放置与原型 HTML 展示内容一致的 JSON 数据。

### 6.2 规范

- 文件名与 API 路径对应（/api/services -> mocks/services.json）
- 数据内容从 all-pages-prototype.html 中提取，保持一致
- 组件开发时直接 import mock 数据，不依赖 API
- 后期接入真实后端时，将 import 替换为 fetch 调用即可

## 7. 视觉验证方式

使用 Playwright 对每个完成页面截图，与原型对应 tab 截图做并排人工比对：

- 验证维度：布局结构、间距、色板、字体、状态色语义
- 截图保存路径：/tmp/replication_*.png（React 页面）vs /tmp/proto_*.png（原型）
- 不追求像素级一致，但要求结构忠实、视觉风格统一

## 8. 原型文件管理

| 文件 | 角色 | 说明 |
|------|------|------|
| `all-pages-prototype.html` | **唯一复刻基准** | 7 页合一，902 行，所有页面以此为准 |
| `mvp-prototype.html` | 参考 | 主排查页早期单页原型，可用于细节参考 |
| `scenarios-prototype.html` | 参考 | 场景页早期单页原型，可用于细节参考 |

在 docs/prototypes/README.md 中标注角色，避免复刻时选错参考源。

## 9. 与 OpenSpec 衔接

每个页面推倒重写作为一个独立变更走 OpenSpec 流程：

```
propose -> spec -> design -> tasks -> TDD -> verify -> archive
```

- 全局 layout.tsx 改造为独立 change（影响所有页面）
- 每个页面推倒重写为独立 change
- 组件库批次（ui/ + layout/）可作为 1-2 个 change

## 10. TDD 策略

- **原子组件**：先写测试（渲染、变体、className 合并、交互回调），再实现
- **布局组件**：测试 focus 在结构（children 渲染、slot 正确性）
- **业务组件**：保留现有测试，重构后确保不回归
- **页面**：页面级测试验证数据渲染、交互行为
- 质量门禁：前端 vitest run 全绿

## 11. 开发批次总览

| 批次 | 内容 | 产出 |
|------|------|------|
| 0 | Token 补全 + cn() 工具 + mock 数据 | globals.css 更新、lib/cn.ts、mocks/*.json |
| 1 | 原子组件批次一 | ui/Button、ui/Badge、ui/StatusDot |
| 2 | 原子组件批次二 | ui/Card、ui/CodeBlock、ui/DataTable |
| 3 | 布局组件 | layout/AppShell、layout/PageHeader、layout/NavList |
| 4 | layout.tsx 改造 | 全局 Sidebar + 统一 780px |
| 5 | P0 页面推倒 | Dashboard、Services、Tools |
| 6 | P1 页面推倒 | Knowledge、Playbooks、Sessions |
| 7 | P2 页面推倒 | Settings、主排查页 |
