# AI SRE Investigator — UI 偏离审查与 UI/UX Agent 工作流定义

> 阶段：**Continuous Discovery（现有产品持续发现）**
> 技能：`brainstorm-ideas-existing`（Product Trio 三视角发散）
> 输入：`docs/design/DESIGN.md`、`docs/prototypes/`、`frontend/src/app/`、`frontend/src/components/`
> 方法：PM / Designer / Engineer 三视角各 5 个创意 → 综合 Top 5 排序 → UI/UX Agent 工作流定义

---

## 0. 偏离审查总结

### 审查范围

| 页面 | 路由 | 有原型？ | 代码行数 |
|------|------|----------|----------|
| 主排查页 | `/` | 有 (`mvp-prototype.html`) | 559 |
| 场景展示页 | `/scenarios` | 有 (`scenarios-prototype.html`) | 503 |
| 仪表盘 | `/dashboard` | **无** | 26 |
| 知识库 | `/knowledge` | **无** | 164 |
| 服务画像 | `/services` | **无** | 98 |
| 排查剧本 | `/playbooks` | **无** | 463 |
| 历史会话 | `/sessions` | **无** | 130 |
| 工具管理 | `/tools` | **无** | 133 |
| 系统设置 | `/settings` | **无** | 103 |

### 偏离发现

**严重偏离（系统性问题）：**

1. **全局导航壳层缺失** — `layout.tsx` 是裸壳（仅有 `<html><body>{children}</body>`），不含任何共享布局。260px 固定 Sidebar 是 DESIGN.md 的核心布局原则，但只存在于主页面手动引入。7 个子页面 + scenarios 页面（共 9 个页面中的 8 个）均缺失 Sidebar，全部退化为 `ArrowLeft + "返回排查"` 的临时导航模式。这是最严重的架构级偏离。

2. **布局宽度四分五裂** — DESIGN.md 规定内容区 `max-width: 780px`。实际代码：

   | 页面 | max-width | 是否符合标准 |
   |------|-----------|------------|
   | `/`（主页面） | 780px | 符合 |
   | `/scenarios` | 780px | 符合 |
   | `/knowledge` | 800px | 不符合 |
   | `/services` | 800px | 不符合 |
   | `/playbooks` | 860px | 不符合 |
   | `/sessions` | 800px | 不符合 |
   | `/tools` | 800px | 不符合 |
   | `/settings` | 800px | 不符合 |
   | `/dashboard` | 960px | 不符合 |

3. **7 个业务页面跳过 OD 原型设计直接编码** — Dashboard、Knowledge、Services、Playbooks、Sessions、Tools、Settings 均无对应原型文件，未经过设计审查阶段就直接实现为 React 页面。颜色 token 虽然正确传递，但组件级布局、交互细节、响应式行为未经设计验证。

**忠实复刻（无偏离）：**

4. **主排查页 `/`** — 完整实现原型设计：Sidebar + main-header + incident card + timeline + RCA panel + budget bar + chat input + demo guide。设计 token 全部正确。

**结论**：7/9 页面存在设计流程偏离（无原型直接编码），8/9 页面存在布局架构偏离（缺 Sidebar + 宽度不统一）。根因是缺乏强制性的"先原型后编码"流程门禁。

---

## 1. PM 视角：流程规范化 / 业务覆盖 / 交付可预测性

### PM-1 建立"原型先行"强制流程门禁（Prototype-First Gate）

**一句话**：任何新页面/重大组件改动必须先通过 OD MCP 产出原型组件并完成设计审查，否则进入编码阶段的 PR 被 CI 自动拦截。

**为什么**：当前 7 个页面跳过原型直接编码，导致布局碎片化（4 种宽度、8 个页面缺导航）。这不是个别开发者的疏忽，而是流程缺失——没有门禁，"先写代码"永远是最快的路径。引入强制性门禁，是把"设计驱动的工程"从口号变成可执行的流水线。

**待验证假设**：OD 原型产出速度能否跟上 PM 新需求节奏？如果一次原型设计需要 30 分钟以上，团队会绕过门禁。

### PM-2 业务场景全覆盖的 UI 原型补齐计划

**一句话**：为已存在但缺原型的 7 个页面制定补齐计划，按业务优先级排序（Dashboard → Services → Tools → Knowledge → Playbooks → Sessions → Settings），每个页面走完整的"OD 原型 → 审查 → 复刻"流程。

**为什么**：7 个页面 = 7 个未经设计审查的业务流程。它们已在生产代码中运行，但布局与交互未经设计验证，积累了隐性设计债务。补齐计划是消除存量债务、恢复设计一致性的唯一途径。

**待验证假设**：这 7 个页面的业务逻辑是否会随 PRD 迭代而变化？如果会，补齐原型可能与未来需求冲突。

### PM-3 全局导航架构升级（Persistent Navigation）

**一句话**：将 Sidebar 提升到 `layout.tsx` 全局壳层，所有路由共享同一导航，消除"返回排查"的临时模式，使产品从"单页面 + 附属页"升级为"完整应用"。

**为什么**：当前架构是 MVP 快速验证阶段的产物——只有主页面是"真正的产品"，其余页面是附属。但 PRD 已扩展到 9 个功能领域，临时导航模式导致用户无法在功能间快速切换，严重影响体验。这是从 demo 到产品的必经一步。

**待验证假设**：Sidebar 的 9 个入口是否都保留？Dashboard 和 Settings 可能合并到更轻量的位置（如底部栏或顶部下拉）。

### PM-4 设计债务量化与可视化看板

**一句话**：建立一个设计债务看板（GitHub Project board），追踪每个页面的原型状态、偏离程度、复刻优先级，让设计债务像技术债务一样可见、可追踪、可分配。

**为什么**：当前设计债务是隐性的——没有人知道哪些页面偏离了、偏离多严重。一个看板把隐性债务显性化，是推动团队正视并偿还债务的第一步。与 GitHub Project 集成也符合项目"AI 原生工程化"的工具链策略。

**待验证假设**：团队是否会真的维护这个看板？如果没有流程强制更新，看板会快速过时。

### PM-5 UI/UX Agent 与 OpenSpec 流程的集成点

**一句话**：将"OD 原型设计"定义为 OpenSpec 工作流中 `design` 阶段的前置步骤——`propose → spec → **OD 原型** → design → tasks → TDD → verify`，使原型成为 OpenSpec artifact 的一部分，而非游离在流程之外。

**为什么**：当前 OpenSpec 的 design 阶段只有技术设计文档，没有 UI 原型。对于涉及前端的功能变更，跳过 UI 原型的 design 阶段是不完整的。将 OD 原型纳入 OpenSpec artifact，既补全了流程，又让原型与后续 tasks/TDD 有追溯关系。

**待验证假设**：不是所有 OpenSpec 变更都涉及 UI。需要明确哪些变更类型必须包含 OD 原型。

---

## 2. Designer 视角：设计一致性 / 原型文化 / 组件治理

### D-1 设计 Token 使用合规性自动化检查

**一句话**：在 CI 中加入 CSS 扫描脚本，检测是否有硬编码颜色值（非 CSS 变量）、违反 DESIGN.md 规定的字重/间距/圆角使用，作为代码审查的补充。

**为什么**：当前颜色 token 正确传递是个好迹象，但仅靠人工审查无法保证随着代码增长仍然合规。自动化检查是设计系统长期保持一致性的保障。DESIGN.md 的 Do's & Don'ts 清单天然适合转化为 lint 规则。

**待验证假设**：CSS 变量的使用模式是否足够规整，使得扫描脚本可行？Next.js + Tailwind 的 inline style 与 CSS 变量混合使用可能增加检测复杂度。

### D-2 建立"原型即契约"（Prototype as Contract）机制

**一句话**：OD 产出的原型组件被视为实现契约——复刻后的业务 UI 必须在布局、间距、字号、颜色、交互状态上与原型一致，偏差需要记录在设计审查中。

**为什么**：原型如果不具有约束力，就只是"参考"。当前 7 个页面的偏离正是因为没有"契约"概念——开发者把原型当建议而非规范。建立契约机制，让原型从"灵感参考"升级为"验收标准"。

**待验证假设**：原型与最终实现之间允许的偏差范围是多少？像素级一致不现实，需要定义合理的容差。

### D-3 组件库统一治理（Component Library Governance）

**一句话**：审计 `frontend/src/components/` 的 9 个组件，提取可复用的基础组件（Card、Button、Badge、CodeBlock、StatusDot、PageHeader、BackLink），建立统一的组件库，使所有页面共享同一套 UI 原语。

**为什么**：当前组件是为主页面定制的（BudgetBar、ChatInput、HandoffCard、RCAPanel），缺少通用层。7 个子页面各自重复实现卡片、返回链接、列表项，导致样式不一致。提取通用组件是消除重复、保证一致性的结构性手段。

**待验证假设**：提取通用组件的重构成本与收益比是否合理？如果页面未来会大幅变化，过早抽象可能徒增复杂度。

### D-4 OD MCP 与 DESIGN.md 的双向同步

**一句话**：确保 UI/UX Agent 在通过 OD MCP 设计原型时，自动引用 DESIGN.md 的 token 定义，且每次原型产出后反向更新 DESIGN.md 中新增的组件规范，保持设计系统与实际产出同步演进。

**为什么**：DESIGN.md 是 source of truth，但如果 UI Agent 设计时不去读它，就形同虚设。双向同步确保每次设计都基于最新规范，同时设计产出反哺规范演进。这也是 OD MCP 真正发挥价值的前提。

**待验证假设**：OD MCP 是否支持引用外部设计 token 文件？如果不支持，需要人工桥接。

### D-5 响应式行为验证纳入原型审查

**一句话**：每个 OD 原型必须包含 3 个断点的设计稿（移动 <768px、平板 768-1024px、桌面 1024px+），复刻后的实现需通过 Playwright 截图验证响应式行为。

**为什么**：DESIGN.md 明确定义了响应式行为（移动端 sidebar 折叠为 drawer、输入框固定底部），但当前实现没有验证响应式。7 个子页面的响应式行为完全未测试。原型阶段纳入响应式，是把验证前移、降低返工成本。

**待验证假设**：移动端是否是当前优先级？SRE 工具主要在桌面端使用，移动端可能只需"可用"而非"优秀"。

---

## 3. Engineer 视角：自动化复刻 / 工具链 / 质量门禁

### E-1 OD 原型 → React/Tailwind 代码的自动化复刻管线

**一句话**：调研 OD MCP 的输出格式（HTML/CSS），建立从 OD 原型到 React 组件 + Tailwind class 的转换规范和辅助工具，降低复刻过程中的人为偏差。

**为什么**：复刻是当前流程的薄弱环节——原型是 HTML，业务 UI 是 React/Tailwind，两者之间存在映射鸿沟。没有规范的映射规则，每次复刻都是"重新解读"，偏差不可避免。建立映射规范（CSS 变量 → Tailwind arbitrary value、HTML 结构 → JSX 组件拆分），让复刻过程可重复、可审计。

**待验证假设**：OD 原型的 HTML 结构是否足够规整，使得自动化转换可行？如果每次原型结构差异很大，只能做半自动。

### E-2 视觉回归检测集成（Visual Regression in CI）

**一句话**：使用 Playwright 对每个页面截取基准快照，CI 中对比每次 PR 的截图差异，像素级偏差超过阈值则标记为视觉回归，要求人工确认。

**为什么**：布局碎片化的根因之一是"改了一处不知道影响了哪里"。视觉回归检测提供客观证据，让偏离在 PR 阶段而非上线后被发现。项目已有 Playwright 环境（截图目录 `/tmp/sre_screenshots/` 存在），扩展为回归检测成本低。

**待验证假设**：深色主题下的截图在不同 CI 环境是否稳定？字体渲染差异可能导致大量 false positive。

### E-3 设计审查 gate 的技术实现

**一句话**：在 GitHub PR 模板和 CI 流程中实现设计审查 gate：涉及 `frontend/` 变更的 PR 必须关联 OD 原型 artifact 编号，CI 检查 `docs/prototypes/` 下是否存在对应原型文件，否则拦截。

**为什么**：PM-1 的"原型先行门禁"需要技术实现才能落地。一个不依赖自觉的 CI gate，是确保流程被遵守的保障。GitHub Actions + PR 模板 + 文件存在性检查，是一套低成本、高可靠的技术方案。

**待验证假设**：纯后端或纯文档变更是否会误触 gate？需要在 gate 逻辑中精确判断"涉及 UI 变更"的条件。

### E-4 全局 Layout 壳层重构（Shared Layout Shell）

**一句话**：重构 `layout.tsx`，引入 `Sidebar + main content area` 的全局壳层，所有路由共享；子页面不再各自渲染背景和返回链接，而是作为 main content area 的内容注入。

**为什么**：这是修复布局偏离的技术核心。当前 `layout.tsx` 是裸壳导致每个页面自行处理布局。引入共享壳层后，宽度一致性、Sidebar 一致性、背景一致性都从架构层面保证，不再依赖每个页面自觉。

**待验证假设**：全屏场景（如 Dashboard 可能需要更多空间）是否与固定 780px 内容区冲突？可能需要部分页面支持自定义 max-width。

### E-5 组件复用率度量与重复代码检测

**一句话**：引入工具（如 custom eslint rule 或 `jscpd`）检测 `frontend/src/app/` 各页面中的重复代码模式（如重复的卡片结构、返回链接、列表项），量化组件复用率，驱动通用组件提取。

**为什么**：D-3 的组件库治理需要数据支撑——知道重复在哪里、重复多少，才能精准提取。重复检测工具能客观暴露当前 7 个页面的重复模式，为组件抽象提供优先级排序。

**待验证假设**：重复检测的噪声是否可控？页面间的"结构相似但不完全相同"可能产生大量低价值命中。

---

## 4. 综合 Top 5 排序

**排序权重**：① 修复偏离的直接影响力 → ② 流程改进的战略价值 → ③ 可行性与落地速度。

| 排名 | 创意 | 来源 | 选它的一句话理由 |
|------|------|------|-----------------|
| 1 | **全局 Layout 壳层重构** | Engineer (E-4) | 8/9 页面缺 Sidebar + 宽度四分五裂，这是偏离的架构根因，重构壳层一次修复系统性问题 |
| 2 | **全局导航架构升级** | PM (PM-3) | 从"单页面 + 附属页"升级为"完整应用"，是产品从 demo 到 production 的心智和体验转变 |
| 3 | **建立"原型先行"强制流程门禁** | PM (PM-1) | 7 个页面跳过原型的根因是流程缺失，门禁让"设计驱动"从口号变成可执行流水线 |
| 4 | **组件库统一治理** | Designer (D-3) | 7 个子页面重复实现卡片/链接/列表项，提取通用组件消除重复并保证一致性 |
| 5 | **7 页面 UI 原型补齐计划** | PM (PM-2) | 消除存量设计债务，让现有功能回到设计系统轨道上 |

---

## 5. UI/UX Agent 工作流定义

### 5.1 流程概览

```
PM 新需求 / 新业务场景
        |
        v
+-----------------------------+
|  Step 1: OpenSpec propose    |  PM 提交需求，触发 OpenSpec 变更
|  (propose -> spec)           |
+--------------+--------------+
               |
               v
+-----------------------------+
|  Step 2: UI/UX Agent 设计    |  UI Agent 介入，通过 OD MCP 设计原型
|  1. 读取 DESIGN.md 设计 token |
|  2. OD MCP 产出原型组件       |
|  3. 保存到 docs/prototypes/   |
|  4. 反向更新 DESIGN.md        |
+--------------+--------------+
               |
               v
+-----------------------------+
|  Step 3: 设计审查 Gate       |  审查原型是否符合设计系统
|  1. Token 合规性检查          |  审查原型与业务需求是否匹配
|  2. 布局一致性检查            |  不通过 -> 回到 Step 2 修改
|  3. 响应式设计验证            |
|  4. 业务场景覆盖确认          |
+--------------+--------------+
               | 通过
               v
+-----------------------------+
|  Step 4: OpenSpec design     |  原型作为 OpenSpec artifact 归档
|  + tasks 阶段                |  生成实现 tasks（含复刻规范）
+--------------+--------------+
               |
               v
+-----------------------------+
|  Step 5: TDD 驱动复刻开发     |  Engineer 按原型契约复刻到业务 UI
|  1. 按原型拆分组件             |  CI gate 验证原型文件存在
|  2. 复刻原型到 React/Tailwind  |  视觉回归检测对比截图
|  3. 测试驱动验证交互           |
+--------------+--------------+
               |
               v
+-----------------------------+
|  Step 6: OpenSpec verify     |  验证实现与原型一致性
|  + 设计验收                   |  归档变更
+-----------------------------+
```

### 5.2 UI/UX Agent 职责边界

**UI/UX Agent 负责什么：**
- 接收 PM 的业务场景需求（通过 OpenSpec propose artifact）
- 读取 DESIGN.md 获取设计 token 和组件规范
- 通过 OD MCP 设计交互原型（含 3 个响应式断点）
- 将原型保存到 `docs/prototypes/` 目录
- 反向更新 DESIGN.md 中新增的组件规范
- 参与设计审查 Gate

**UI/UX Agent 不负责什么：**
- 不编写业务 React 代码（那是 Engineer 的职责）
- 不做技术架构决策（那是 ADR 的范畴）
- 不定义业务逻辑（那是 PM/PRD 的范畴）

### 5.3 OD MCP 集成方式

```
DESIGN.md (设计 token, source of truth)
    ^  双向同步
OD MCP  -->  原型组件 (HTML/CSS)
    |
    v
docs/prototypes/{feature-name}-prototype.html
    |
    v
设计审查 Gate (Token 合规 + 布局一致 + 响应式)
    | (通过)
    v
React/Tailwind 复刻 (Engineer)
```

**OD MCP 调用规范：**
- UI Agent 在调用 OD MCP 前，必须先读取 DESIGN.md 的 token 定义
- OD 产出的原型必须使用 DESIGN.md 中定义的 CSS 变量（`var(--color-*)`），不允许硬编码颜色
- 每个原型文件命名规范：`{feature-name}-prototype.html`
- 原型必须包含移动端（<768px）和桌面端（>1024px）两个断点的布局

### 5.4 设计审查 Gate 标准

| 检查项 | 标准 | 拦截条件 |
|--------|------|----------|
| Token 合规 | 所有颜色使用 CSS 变量 | 出现硬编码 hex 值 |
| 布局宽度 | 内容区 780px（桌面端） | 非 780px（除非有 ADR 说明） |
| Sidebar | 页面包含 260px 固定 Sidebar | 缺失 Sidebar（除非有 ADR 说明） |
| 字体 | Inter (UI) + JetBrains Mono (数据/代码) | 使用其他字体 |
| 响应式 | 包含 <768px 断点设计 | 只有一个断点 |
| 状态语义 | 绿/琥珀/玫瑰/蓝用于操作语义 | 状态颜色用于装饰 |

### 5.5 与 OpenSpec 流程的集成

```
标准 OpenSpec 流程:
  propose -> spec -> design -> tasks -> TDD -> verify -> archive

UI 涉及时的增强流程:
  propose -> spec -> * OD 原型设计 * -> design -> tasks -> TDD -> verify -> archive
                        ^
                   UI/UX Agent 介入
```

**集成规则：**
- OpenSpec `propose` 阶段标记 `involves_ui: true` 的变更，必须在 `design` 阶段前完成 OD 原型
- 原型文件作为 OpenSpec artifact 归档在变更目录中
- `tasks` 阶段的实现任务必须引用原型文件作为实现契约
- `verify` 阶段验证实现与原型的一致性

### 5.6 CI Gate 实现要点

**PR 涉及 `frontend/` 变更时，CI 检查：**
1. PR 描述中是否关联了 OpenSpec 变更编号
2. 该变更是否有对应的 `docs/prototypes/` 原型文件
3. 视觉回归检测是否通过（截图对比）
4. CSS 变量合规性扫描是否通过

**技术实现：** GitHub Actions workflow + 自定义检查脚本 + Playwright 截图对比。

---

## 6. 实施建议与下一步行动

### 立即行动（本周）

1. **全局 Layout 壳层重构（Top 1）** — 将 Sidebar 提升到 `layout.tsx`，建立全局导航壳层，统一所有页面布局
2. **布局宽度统一** — 所有页面内容区统一为 780px，移除 800px/860px/960px 的变体
3. **建立 `docs/prototypes/` 索引** — 列出已有原型和缺失原型的页面

### 短期（1-2 周）

4. **为 Dashboard 创建 OD 原型** — 作为第一个走完整"OD → 审查 → 复刻"流程的页面，验证流程可行性
5. **提取通用组件（Card、PageHeader、BackLink）** — 为后续页面复刻提供基础
6. **在 PR 模板中加入原型关联字段**

### 中期（2-4 周）

7. **CI Gate 实现** — 原型存在性检查 + CSS 变量合规扫描
8. **逐页补齐原型** — 按 Dashboard → Services → Tools → Knowledge → Playbooks → Sessions → Settings 顺序
9. **视觉回归检测基线建立**

### 长期

10. **UI/UX Agent 正式角色定义** — 写入开发规范文档
11. **OD → React 复刻规范文档** — 建立映射规则
12. **设计债务看板上线** — GitHub Project 追踪所有偏离

---

## 附：审查证据

**布局宽度证据（`frontend/src/app/` 下 `rg "max-w-\["` 输出）：**
- `dashboard/page.tsx:13` → `max-w-[960px]`
- `knowledge/page.tsx:43` → `max-w-[800px]`
- `services/page.tsx:57` → `max-w-[800px]`
- `playbooks/page.tsx:131` → `max-w-[860px]`
- `sessions/page.tsx:69` → `max-w-[800px]`
- `tools/page.tsx:36` → `max-w-[800px]`
- `settings/page.tsx:71` → `max-w-[800px]`
- `scenarios/page.tsx:479` → `max-w-[780px]`（符合标准）

**Sidebar 缺失证据（`rg -c "Sidebar"` 逐页结果）：**
- `dashboard/page.tsx` = 0
- `knowledge/page.tsx` = 0
- `services/page.tsx` = 0
- `playbooks/page.tsx` = 0
- `sessions/page.tsx` = 0
- `tools/page.tsx` = 0
- `settings/page.tsx` = 0
- `scenarios/page.tsx` = 0
- `page.tsx`（主页面）= 2（唯一包含 Sidebar 的页面）

**全局 Layout 缺失证据：**
`layout.tsx` 仅包含 `<html><body>{children}</body></html>`，无共享布局组件。

**DESIGN.md 规范引用：**
> Section 5 Layout Principles: sidebar 260px fixed | main area flex-1. Content max-width 780px.
