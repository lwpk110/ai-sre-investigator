# AI SRE Investigator — Design Spec

> Human-readable design narrative for the stakeholder review deck. Machine-readable execution contract lives in `spec_lock.md`.

## I. Project Information

| Item | Value |
| ---- | ----- |
| **Project Name** | AI SRE Investigator Pitch Deck |
| **Canvas Format** | PPT 16:9 (1280x720) |
| **Page Count** | 12 |
| **Design Style** | B) General Consulting + custom — tech-infrastructure consulting aesthetic with schematic vector visuals |
| **Theme Art Direction** | `诊断台 · 排障链路` (Observability Diagnostic Console) |
| **Target Audience** | 工程负责人、SRE Lead、PM、内部评审委员（混技术 / 决策） |
| **Use Case** | 内部项目立项评审 / 阶段汇报 / 拉通共识 |
| **Created Date** | 2026-07-10 |

### Expectation Contract

| Item | Value |
| ---- | ----- |
| **Brief Mode** | `source-first` — 项目已有完整 PRD + 6 ADR + 技术方案，源材料充足，直接以 source-first 推进 |
| **Expectation Fit** | green / 88 / readyForProduction=true |
| **Source Adequacy** | substantive — PRD、6 个 ADR、tech-design、brainstorm、CLAUDE、README 全部解析完毕 |
| **Known User Intent** | 中文 PPT，图文并茂，正式可编辑，用于内部技术评审与立项沟通 |
| **Missing Signals** | 无明确受众细分与会议场景，按"内部立项评审"通用假设推进 |
| **Assumptions** | editable PPTX 默认；Microsoft YaHei 体例；vector-illustration + cool-corporate；纯 schematic SVG 不引入 AI 图像（更契合架构图与时间轴为主的技术 deck）；不计版权风险的项目自有内容 |
| **Codex Guided Intake State** | complete (source-first 自动通过) |
| **Next Question Group** | none |

## II. Canvas Specification

| Property | Value |
| -------- | ----- |
| **Format** | PPT 16:9 |
| **Dimensions** | 1280 x 720 px |
| **viewBox** | `0 0 1280 720` |
| **Margins** | left/right 56px, top 56px, bottom 48px |
| **Content Area** | 1168 x 616 (after safe margins) |
| **Header band** | 80px (page title only; cover/section opener overrides) |
| **Footer band** | 32px (page number + section marker) |

## III. Visual Theme

### Theme Style

- **Style**: B) General Consulting + custom tech-infra. 数据清晰优先 + 架构示意图 + 决策与权衡并重。
- **Theme**: Light theme（封面与少量 section divider 用深色）。
- **Tone**: 严肃 SRE 工具、可观测性平台、克制专业、底色稳。封面与 closing 章节会引入深色 `#0F2A44` 作主基调。
- **Visual Direction**: `custom`（在 `consulting_analysis` 基础上叠加 tech-infra motif）
- **Benchmark Sentence**: "Tech-infrastructure consulting deck with schematic architecture diagrams, timeline/chain motifs, and restrained navy-and-teal color discipline; no SaaS marketing gloss."
- **Top Aesthetic Risks**:
  1. 12 页全堆 card grid —— 必须用架构图 / 时间线 / 对比矩阵 / 风险 callout 切分节奏
  2. ADR 编号与技术细节变成纯文字墙 —— 必须把核心创新用结构图 + 一行结论呈现
  3. 装饰图标堆叠无意义 —— 只在确能传递语义的位置用图标
- **External Release Boundary**: 本 deck 面向内部，不含外部品牌资产；项目自有 ADR 编号、技术栈名称可放心使用
- **Visual Strategy Mode**: `hybrid-editable`，纯 schematic SVG 架构图 + 时间线，无 AI 生成图像
- **Raster Slide Mode**: `disabled_for_formal_body`（封面允许 background 几何色块，不放 raster）

### Theme Art Direction

> 来源是 SRE 可观测性平台 + 内部 AI 工具，给一个能贯穿全 deck 的诊断/排障意象。

- **Art Direction Name**: `诊断台 · 排障链路`
- **Why It Fits The Source**: 项目本质是"自然语言 → 多步观测探针 → RCA 报告"，与"诊断台 + 排障链路"在视觉意象上天然一致：波形/Trace、查询链路、Triage 节奏。
- **Motif System**:
  1. timeline 节点链（Tool-Calling 步骤环）—— 重复出现在 P06/P07/P09
  2. 证据面板 / Evidence panel（白底带左侧色条）—— 出现在 P05/P08/P11
  3. 波形 / Trace 心电图式细线 —— 出现在 P01 cover 与 section divider
  4. chevron 查询变形（自然语言 → QL）—— 出现在 P03/P09
  5. 控制台栅格背景（12 列微网格淡线）—— 仅在 cover 与 section divider 出现
- **Scope**: `cover+section+tail`，正文页面保持克制（仅 motif #1/#2 用作结构提示）
- **Main Title Treatment**: 封面用 motif-integrated framing（标题压在 console panel 上 + 顶部 waveform），正文页用 restrained title lockup
- **Serious Context Exception**: 内部技术评审；不走 expressive 营销化风格，主题仅在封面与 closing 浓墨，正文克制
- **AI Visual Prompt Seed**: `Clean isometric diagnostic console with three vertical signal panels (metrics, logs, traces) and a horizontal timeline chain of four tool-call nodes; deep navy background (#0F2A44), teal accents (#00A6A6), thin waveform overlays, schematic vector style, no text`（仅作为封面构图灵感参考；本 deck 不调用 AI 生成）

### Brand / IP Assets

| Asset ID | Display Text / Mark | State | Source URL / Provenance | File Path | Target Pages | Release Boundary |
| -------- | ------------------- | ----- | ----------------------- | --------- | ------------ | ---------------- |
| ai-sre-investigator | AI SRE Investigator | text-lockup-fallback | 项目 README 自有名称 | (inline wordmark) | P01, P05, P12 | 无外部品牌风险 |
| mimir | Mimir | text-lockup-fallback | 项目 PRD/ADR 自有术语 | (inline wordmark) | P03, P05, P06, P09 | Grafana Labs 开源项目名，按引用使用 |
| loki | Loki | text-lockup-fallback | 项目 PRD/ADR 自有术语 | (inline wordmark) | P03, P05, P06, P09 | 同上 |
| tempo | Tempo | text-lockup-fallback | 项目 PRD/ADR 自有术语 | (inline wordmark) | P03, P05, P06, P09 | 同上 |

> 所有"产品名"为开源工具引用或项目自有名称，使用纯文字 lockup，无须外部授权。

### Color Scheme

> Cool-corporate 配深色 navy + teal accent，呼应"诊断台"主题。

| Role | HEX | Purpose |
| ---- | --- | ------- |
| **Background** | `#FFFFFF` | 正文页底色 |
| **Secondary bg** | `#F4F6FA` | 卡片底 / 区段底 |
| **Dark surface** | `#0F2A44` | 封面、section divider、closing |
| **Primary** | `#0F2A44` | 主标题色 / 强结构元素 |
| **Accent** | `#00A6A6` | 数据强调、tool-call 节点、链路主色 |
| **Secondary accent** | `#4A6FA5` | 次级强调、章节线 |
| **Body text** | `#1A2332` | 正文主色 |
| **Secondary text** | `#5A6B7E` | 副文、注释 |
| **Tertiary text** | `#8896A6` | footer、来源标注 |
| **Border/divider** | `#E2E8F0` | 卡片描边 |
| **Success** | `#2E7D32` | 成功 / 通过指标 |
| **Warning** | `#C62828` | 风险 / 失败指标 |
| **Node chip bg** | `#E6F4F4` | 节点标签底（teal 淡色） |

### Gradient Scheme

```xml
<linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#0F2A44"/>
  <stop offset="100%" stop-color="#4A6FA5"/>
</linearGradient>

<radialGradient id="bgDecor" cx="80%" cy="20%" r="55%">
  <stop offset="0%" stop-color="#00A6A6" stop-opacity="0.18"/>
  <stop offset="100%" stop-color="#00A6A6" stop-opacity="0"/>
</radialGradient>
```

> 仅在 P01 封面与 P12 closing 使用。`stop-opacity` 而非 `rgba`。

## IV. Typography System

### Font Plan

- **Typography direction**: Microsoft YaHei 办公体例；正文 / 标题同族，靠 weight + size + 间距拉开层级。封面主标题可用加粗 contrast。

**Role breakdown**

| Role | Chinese | English | Fallback tail |
| ---- | ------- | ------- | ------------- |
| **Title** | `"Microsoft YaHei"` | `Arial` | `sans-serif` |
| **Body** | `"Microsoft YaHei"` | `Arial` | `sans-serif` |
| **Emphasis** | `"Microsoft YaHei"` | `Arial` | `sans-serif` |
| **Code** | — | `Consolas` | `monospace` |

**Per-role font stacks**

- Title: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`
- Body: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`
- Emphasis: same as Body
- Code: `Consolas, "Courier New", monospace`

### Font Size Hierarchy

- **Baseline**: Body = 20px（formal report 页默认 20-22；正文中等密度）

| Purpose | Ratio to body | px @ body=20 | Weight |
| ------- | ------------- | ------------ | ------ |
| Cover hero title | 3.5x | 70 | Heavy |
| Section title | 2.5x | 50 | Bold |
| Page title | 1.85x | 37 | Bold |
| Card title / subtitle | 1.25x | 25 | SemiBold |
| Body | 1x | 20 | Regular |
| Annotation / caption | 0.75x | 15 | Regular |
| Footer / page number | 0.6x | 12 | Regular |

> 正文密度偏高，18-22px 之间；card body 取 18-20，列表短行 18。

### Scale Guardrail

| Check | Current Project |
| ----- | --------------- |
| Body baseline | 20px |
| Min body | 18px |
| Page title / body ratio | 1.85x |
| Card title / body ratio | 1.25x |
| Smallest primary-content text | 18px |
| Smallest secondary text | 12-15px |
| Exception handling | 控制列表项 < 6；超 6 改 timeline / table |

## V. Layout Principles

### Page Structure

- **Header**: 80px，包含页眉标签 + 页面标题；cover/closing 例外
- **Content area**: 1168x540 的内容区，按 12 列网格或不对称 split
- **Footer**: 32px，左侧来源标注（项目自有），右侧页码
- **Section divider**: P03/P08 使用 80% 宽高对比块而非全屏 divider，避免无意义全幅色块

### Single-slide Delivery Rules

- 一页一个判断：标题承载判断，正文给出依据。
- 每个内容页至少 1 个 dominant 视觉（架构图 / 时间线 / 风险 callout / 大数字）。
- 列表项最多 5 条 / 页；超过改 timeline 或 table。
- 卡片仅在确需"对等并列"时使用，避免每段文字都套卡片。
- 标题与正文层级比 ≥ 1.6x；避免"小 PPT"综合症。

### Layout Pattern Library

| Pattern | Used on | Notes |
| ------- | ------- | ----- |
| Single column centered | P01 cover | 标题 + motif-integrated framing |
| Asymmetric 4:8 split | P02 TL;DR / P04 价值主张 | 左侧大判断 + 右侧 3 条要点 |
| Symmetric 2-column contrast | P03 痛点 | "今天 vs 未来" 双栏对比 |
| 3-column block | P04 价值闭环 | 三个对等角色 |
| Schematic architecture | P05 / P07 / P09 | 三层架构 + 链路 + 时间线 |
| Horizontal process | P06 / P07 | 4-5 步骤的水平流向 |
| Risk callout | P08 | 半幅左侧风险 + 半幅右侧对照处理 |
| Comparison table | P10 / P11 | 网格 + takeaway |
| Closing statement | P12 | 大字 + 项目色块 |

## VI. Icon Usage Spec

- **Library**: `chunk-filled` — 直角几何感、稳重，适合 SRE 工具的技术气质
- **Stroke width**: N/A (fill-based)
- **Inventory** (与 spec_lock 一致):

| Concept | Icon | Pages |
| ------- | ---- | ----- |
| AI Agent | `robot` | P01, P02, P06, P12 |
| 排查/搜索 | `magnifying-glass` | P03, P04, P08 |
| 查询 / QL | `code-block` | P03, P06, P09 |
| 指标后端 | `database` | P05, P07 |
| 日志/链路后端 | `server` | P05 |
| 观测信号 | `waveform` | P01, P09 |
| 速度 | `bolt` | P02, P04 |
| 配置 / 执行 | `cog` | P07, P11 |
| 趋势 / 指标 | `chart-line` | P03, P10 |
| 团队 / 多人 | `users` | P02, P04 |
| 只读边界 | `shield-check` | P02, P08 |
| 风险 | `octagon-exclamation` | P08 |
| 通过 | `circle-checkmark` | P06, P07 |
| 时间 / 预算 | `clock` | P07, P11 |
| 决策分支 | `git-branch` | P07 |
| 目标 | `target` | P02, P04 |
| 关键洞察 | `lightbulb` | P02, P10 |
| 链路 / 架构 | `share-nodes` | P05 |
| 锁 / 边界 | `lock-closed` | P02, P08 |

> 不混用其他图标库；不重新绘制图标，全部以 `<use data-icon="chunk-filled/<name>">` 引用。

## VII. Visualization Reference List

> 本 deck 数据可视化页面较少，主要是架构示意、时间线、对比表。架构图与时间线走 schematic SVG（自绘），对比表走 SVG 表格（非 chart）。

| Page | Visualization | Reference template path | Summary-quote (verbatim) | Usage |
| ---- | ------------- | ----------------------- | ------------------------ | ----- |
| P05 | 三层架构示意图 | `no-template-match` — schematic architecture | 自绘三层 + 标注带 | 让读者 3 秒 get "Frontend / Backend / 观测后端" 的物理拓扑 |
| P06 | Tool-Calling 闭环示意 | `no-template-match` — process chain | 自绘 4 节点链 | 呈现"自然语言 → tool → tool → RCA" |
| P07 | SafeToolExecutor 四层包装 | `no-template-match` — 4 层 stacked | 自绘 4 行 wrapper | 把 ADR-004 落地 |
| P08 | 优雅失败处理对照 | `no-template-match` — risk_callout | 自绘对比块 | 把 ADR-005 落地 |
| P09 | 端到端排查链路 | `no-template-match` — horizontal timeline | 自绘 6 步时间线 | 让 Demo 流程直观可读 |
| P11 | Roadmap 时间线 + Owner | `no-template-match` — Gantt-like | 自绘分阶段色带 | 演示阶段与责任方 |

Runners-up considered:
- `templates/charts/process_flow.svg` | rejected for P06/P09: 通用流程图节点圆角风格偏轻，与本 deck"诊断台"基调不一致
- `templates/charts/timeline_horizontal.svg` | rejected for P11: Roadmap 需要"按阶段着色 + Owner 标签"，通用 timeline 不够
- `templates/charts/chevron_process.svg` | rejected for P06: chevron 太重，会盖过文字判断

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Status | Description |
| -------- | ---------- | ----- | ------- | ------ | ----------- |
| (无) | — | — | — | — | 本 deck 采用纯 schematic SVG，无 raster，无 AI 生成图 |

> 所有视觉（架构图 / 时间线 / motif）均在 SVG 内自绘，避免 AI 生成图像与项目主题错位。

## IX. Content Outline

> 12 页叙事弧：`封面 → Why now → 痛点 → 价值主张 → 架构总览 → 核心创新 ×3 → 端到端演示 → 技术栈 → 路线图 → 收尾`。

### P01 — Cover (anchor / breathing)
- **Layout**: cover_brand, hero-left-visual
- **Title**: `AI SRE Investigator`  (hero 70px, navy + teal)
- **Subtitle**: `自然语言驱动的可观测性 RCA 助手` (24px, secondary text)
- **Caption**: `MVP V1.0 内部立项评审 · 2026-07-10`
- **Visual**: 深色 navy 底 + 三条波形 motif + 控制台栅格淡线 + robot icon (64px, teal)
- **Key callout**: 左下角小字 `Mimir · Loki · Tempo`
- **Speaker note focus**: 项目一句话定位 + 一句话价值主张

### P02 — TL;DR / Why this now (anchor / dense)
- **Layout**: asymmetric 4:8 split, left-rule-panel
- **Page title (37px)**: `一句话：把"全员找 SRE"变成"开发自己闭环"`
- **Left rule panel (4 cols)**: 数字 callout
  - 80% 开发不懂 PromQL/LogQL/TraceQL
  - 1 个 SRE 服务 N 个团队 → 多对一挤兑
  - 0 RCA 沉淀 → MTTR 居高不下
- **Right (8 cols)**: 三条核心论断
  1. 自然语言 → 自动 QL 转化 → 多步证据 → 结构化 RCA
  2. 只读边界 + SafeToolExecutor 四层包装，让"读得准"先于"写得对"
  3. 原生 Tool-Calling，无框架抽象债务，平滑演进 MCP/GOAP
- **Visual elements**: robot, magnifying-glass, shield-check icons

### P03 — 痛点：可观测性 QL 认知壁垒 + 多对一灾难 (dense)
- **Layout**: symmetric 2-column contrast
- **Page title**: `痛点：可观测性 QL 的认知壁垒 + "多对一"人力灾难`
- **Left (今天)**: 三条痛点 + chart-line icon
  1. 开发不熟 PromQL/LogQL/TraceQL，依赖 SRE 预设面板
  2. 全公司向极少数 SRE 求助 → SRE 疲于充当"查日志客服"
  3. 跨系统排查靠肌肉记忆，事后 RCA 沉淀缺失
- **Right (代价)**: 风险 callout (octagon-exclamation)
  - MTTR 居高不下
  - SRE 长期过载，On-call 流失
  - 故障复盘缺乏统一证据链
- **Bottom strip**: chevron: `自然语言 → QL → 证据链`（motif #4 示意）

### P04 — 价值主张：让开发"自己独立闭环" (breathing)
- **Layout**: single dominant statement + 3-column support
- **Hero statement (50px)**: `让开发用"大白话"调动所有观测后端`
- **Three blocks (25px card title + 18px body)**:
  1. `独立闭环` — 自己的服务故障自己查
  2. `沉淀组织资产` — 每次 RCA 都进入知识库
  3. `解放 SRE` — 把 SRE 从"查日志客服"拉回真正的平台工程
- **Bottom rule line**: "只读边界 / 绝不改线上状态" (shield-check icon)

### P05 — 架构总览：三层 + 原生 Tool-Calling (dense)
- **Layout**: 3-row schematic architecture diagram
- **Page title**: `架构总览：原生 Tool-Calling 闭环，三层解耦`
- **Three layers (top → bottom)**:
  1. Frontend (Next.js): Chat Input · Timeline · RCA View
  2. Backend (FastAPI): Session Manager · Tool-Calling Loop · RCA Generator · SafeToolExecutor
  3. Native Agent Toolset: Mimir · Loki · Tempo
- **Visual**: 三层 stack 卡片 + 连接箭头 + 数据流文字标签
- **Bottom strip**: 一行 ADR 索引：`ADR-001 · 002 · 003 · 004 · 005 · 006`

### P06 — 核心创新 ①：原生 Tool-Calling 闭环 (dense)
- **Layout**: horizontal 4-step process chain
- **Page title**: `创新 ① 原生 Tool-Calling 闭环（ADR-001）`
- **Step chain**:
  1. 自然语言输入
  2. Tool schema → LLM
  3. 解析 tool_calls → 本地执行
  4. 结果回灌 → 直到 LLM 停止调用工具
- **Side panel (right)**: 关键判断
  - `拒绝 LangChain 等框架`
  - 推理流可见、可约束、可调试
  - 与 MCP/GOAP 演进路径对齐
- **Visual**: 4 个圆角方块 + 箭头连接 + robot icon 起点

### P07 — 核心创新 ②：ToolSpec + SafeToolExecutor (dense)
- **Layout**: 4-row stacked wrapper + side comparison
- **Page title**: `创新 ② ToolSpec 统一契约 + SafeToolExecutor 四层包装（ADR-003/004）`
- **Four rows**:
  1. 预算预检 (clock icon)
  2. 查询缓存
  3. QL 预校验 (L1 语法 + L2 作用域)
  4. 失败自修正（最多 3 次回灌 LLM 重生成）
- **Side panel**:
  - 任意 tool 都透明走这四关
  - 工具注册可插拔，新增 Prometheus/ES/k8s 不破坏契约

### P08 — 核心创新 ③：优雅收尾，绝不抛 500 (breathing)
- **Layout**: risk callout (left) + 处理对照 (right)
- **Page title**: `创新 ③ 优雅收尾：失败也交付"部分 RCA"（ADR-005）`
- **Left (风险)**: 三种典型崩溃场景 (octagon-exclamation)
  - QL 自修正耗尽
  - 后端持续 5xx
  - 预算耗尽 / 超时
- **Right (处理)**: 我们的处置
  - 不抛 500，不静默
  - 用已收集证据生成"部分 RCA"
  - 顶部显式标注：`⚠ 证据缺口 + 已查项`
  - 拒绝"假装查完实则臆测"

### P09 — 端到端 Demo 链路 (dense)
- **Layout**: horizontal 6-step timeline
- **Page title**: `端到端：`payment-service 刚才为什么大量 500？``
- **Six steps**:
  1. 用户提问
  2. LLM 决定查 Mimir（错误率）
  3. 异常时间窗确认
  4. Loki 拉错误堆栈
  5. Tempo 下钻慢 TraceID
  6. 结构化 RCA 报告输出
- **Bottom**: 报告结构示例（4 块 Markdown 标题：服务与问题 / 时间线 / 证据 / 根因与建议）
- **Visual**: 6 个圆点 timeline + waveform 装饰

### P10 — 技术栈 (dense)
- **Layout**: 2-row comparison table
- **Page title**: `技术栈：轻量、原生、可演进（ADR-006）`
- **Two columns**:
  - Backend: Python 3.12 · FastAPI · Pydantic v2 · HTTPX · `openai` SDK
  - Frontend: Next.js (App Router) · Tailwind · React Markdown
- **Four callout badges** (上方或下方):
  - 异步优先
  - 强类型
  - 无状态 / 云原生
  - Pydantic Schema → LLM tools schema

### P11 — Roadmap & Risks (dense)
- **Layout**: 4-phase timeline + risk list
- **Page title**: `Roadmap 与风险`
- **Timeline (4 phases)**:
  - V1.0 MVP（本季度）：原生 Tool-Calling + SafeToolExecutor + 三工具
  - V1.1（次季度）：RCA 知识库 · 黄金路径剧本 · 证据可下钻 Timeline
  - V2.0（半年+）：置信度升级机制 · MCP/GOAP 迁移 · 多源工具
  - 远期：处置类操作（前提：ADR-005 置信度体系 + 人工闸门就位）
- **Risk list (right side)**:
  - LLM 生成 QL 首次错误率 → SafeToolExecutor 兜底
  - 观测后端 5xx → 退避 + 部分 RCA
  - 组织信任建立曲线 → 模拟故障上手引导

### P12 — Closing (anchor / breathing)
- **Layout**: closing_commitment
- **Hero statement (60px)**: `让每个开发都能独立闭环自己的故障`
- **Sub-statement (28px)**: `SRE 不再是查日志客服，而是平台工程师`
- **Three signposts** (bottom strip):
  - 阅读材料：PRD + 6 ADR + tech-design-ql-selfheal
  - 立项目标：MVP V1.0 内完成原生闭环与可靠性护栏
  - 期待：SRE 团队 / 工程负责人共同评审

## X. Speaker Notes Requirements

- **File naming**: `notes/01_cover.md`, `notes/02_tldr.md`, ..., `notes/12_closing.md`
- **Total presentation duration**: 18-22 分钟（评审会议常规时长）
- **Notes style**: 正式汇报（formal），结论先行，给出 ADR 引用与可执行下一步
- **Structure per page**: 1 句 hook → 关键判断 → 数据/事实依据 → ADR 引用 → 引导下一步
- `total.md` master 文档用 `#` 标题；split 文件不含 `#` 标题行

## XI. Technical Constraints Reminder

- 所有 SVG 用纯 schematic，viewBox `0 0 1280 720`
- 字体：`"Microsoft YaHei", "PingFang SC", Arial, sans-serif`，code 用 `Consolas`
- 颜色仅取自 `spec_lock.colors`，HEX only，`stop-opacity` 而非 `rgba`
- 图标仅来自 `chunk-filled` 库
- 禁止 `<style>` / `<foreignObject>` / `<symbol>` / `<mask>` / `@font-face` / `<animate>`
- 容器使用 group + 描边，不引入 group opacity
- 不使用 `<g opacity>`；透明度设置在子元素 `fill-opacity` / `stroke-opacity`
- 同一逻辑行用单 `<text>` + `<tspan>`；多行用 outer `<tspan x dy>`
- 不堆叠三个连续相同 `layout_family` 内容页



## XII. Visual-Completion Contract

> Each page must satisfy the per-page role / weight / recipe / layer / raster / anti-pattern contract. Spec lock is the execution truth; this section is a human-readable mirror.

### Page Role / Visual Weight Contract

| Page | Role | Visual Weight | Layout Family | page_recipe_id | visual_layer | raster_policy | anti_patterns |
| ---- | ---- | ------------- | ------------- | --------------- | ------------ | ------------- | ------------- |
| P01 | anchor | hero | cover_brand | cover_brand.hero_left_visual | schematic-motif | allowed-cover | fake-logo;missing-motif |
| P02 | context | high | statement_plus_evidence | statement_plus_evidence.left_rule_panel | none | prohibited-formal-body | vague-context |
| P03 | evidence | medium | comparison_matrix | comparison_matrix.two_column_delta | none | prohibited-formal-body | same-density-both-sides |
| P04 | anchor | hero | hero_statement | hero_statement.three_support_blocks | subtle-rule-line | prohibited-formal-body | cluttered-support |
| P05 | process | high | architecture_schematic | architecture_schematic.three_layer_stack | schematic-architecture | prohibited-formal-body | disconnected-layers |
| P06 | process | high | process_chain | process_chain.horizontal_steps | schematic-process | prohibited-formal-body | no-flow-direction |
| P07 | process | high | process_stack | process_stack.four_layer_wrapper | schematic-stack | prohibited-formal-body | same-icon-every-row |
| P08 | risk | medium | risk_callout | risk_callout.qa_stack | none | prohibited-formal-body | buried-risk |
| P09 | evidence | high | timeline_demo | timeline_demo.six_step_chain | schematic-timeline | prohibited-formal-body | skipped-step |
| P10 | context | medium | stack_table | stack_table.two_column_grid | none | prohibited-formal-body | vague-stack |
| P11 | action | medium | roadmap_timeline | roadmap_timeline.phase_strip | schematic-gantt | prohibited-formal-body | optimistic-timeline |
| P12 | closing | hero | closing_commitment | closing_commitment.brand_tail | schematic-motif-tail | allowed-section-tail | empty-thank-you |
