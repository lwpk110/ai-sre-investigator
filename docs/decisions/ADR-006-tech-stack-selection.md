# ADR-006: 技术栈选型

## Status
Accepted

## Date
2026-07-09

## Context
MVP 需为 Agent 排查闭环（自然语言 -> QL -> 多步证据 -> RCA）选择前后端技术栈。关键约束：
- 与 ADR-001 原生 Tool-Calling 一致：轻量、原生、无臃肿框架。
- 无状态、云原生、易部署到私有数据中心。
- 强类型与 Schema 严谨（PRD 要求 Pydantic 严谨定义工具参数）。
- 前端需支持 SSE 流式与 Markdown 报告渲染。

## Decision
- **Backend**：Python 3.12 + FastAPI + Pydantic v2 + HTTPX + `openai` 官方 SDK。
- **Frontend**：Next.js (App Router) + Tailwind CSS + React Markdown。

## Alternatives Considered

### Backend

#### LangChain 内置 agent + tools
- Pros：开箱即用。
- Cons：与 ADR-001 冲突（拒绝框架）。
- Rejected。

#### Flask 而非 FastAPI
- Pros：更轻量、生态老。
- Cons：无原生 async、无自动 OpenAPI、Pydantic 集成弱；HTTPX 异步调用观测后端与 SSE 流式需 async 支撑。
- Rejected：FastAPI 的 async + Pydantic v2 + 自动文档更契合异步多工具调用与 Schema 严谨要求。

#### requests 而非 HTTPX
- Pros：认知度高。
- Cons：同步阻塞，与 FastAPI async 调用多个观测后端不匹配，并发性能差。
- Rejected：HTTPX 原生 async，适合并行打 Mimir/Loki/Tempo。

### Frontend

#### 纯 Vite + React 而非 Next.js
- Pros：更轻量。
- Cons：App Router 的路由/SSR 生态对内部工具够用且省心；本期无 SSR 强需求但 Next.js 工程化省心。
- Rejected（取舍）：Next.js 工程化与生态对内部工具性价比更高。

#### Vue/Svelte
- Pros：各有优势。
- Cons：团队 React 生态更熟，Tailwind + React Markdown 集成成熟。
- Rejected：降低团队认知成本。

## Consequences
- 正向：FastAPI async + HTTPX 适合并行调用多个观测后端；Pydantic v2 强类型直接转化为 LLM tools schema 与 ADR-003 的 ToolSpec 契约。
- 正向：`openai` 官方 SDK 原生支持 Tool-Calling，与 ADR-001 一致，无中间层。
- 正向：Next.js + React Markdown 适合渲染流式 Timeline 与结构化 RCA 报告。
- 负向：前后端分栈，需维护两套依赖与构建。
- 约束：Python 3.12 与 Pydantic v2 需统一团队环境版本，避免 v1/v2 API 差异踩坑。
