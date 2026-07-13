# AI SRE Investigator

让开发人员用"大白话"即可调动底层可观测性平台（Mimir / Loki / Tempo），实现"自己的服务故障自己独立闭环"，打破研发与 SRE 之间的可观测性 QL 认知壁垒，消除全员向 SRE 求助的"多对一"响应瓶颈。

> 状态：MVP V1.0 已实现 — 后端核心循环 + 前端交互界面完成，83 tests passed，覆盖率 90.65%

## Quick Start

### 后端（FastAPI）

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload    # http://localhost:8000
pytest                            # 83 tests
ruff check app/ tests/            # lint
mypy app/                         # type-check (strict)
```

### 前端（Next.js）

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
npm run build                    # production build
```

前端 dev server 通过 `next.config.ts` 的 `rewrites` 代理 `/api/*` 到后端 `localhost:8000`。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | 创建排查会话，返回 `session_id` |
| GET | `/api/session/{id}` | 查询会话状态 |
| GET | `/api/session/{id}/stream` | SSE 事件流（thinking/tool_call/tool_result/budget_update/rca） |
| GET | `/api/metrics` | 全局自观测指标汇总 |
| GET | `/api/metrics/{id}` | 单会话自观测指标 |

## 文档导航

### 设计与需求

| 文档 | 说明 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 产品需求文档与技术设计规范（V1.0 MVP） |
| [docs/feature-blueprint.md](docs/feature-blueprint.md) | **完整功能蓝图**：MVP→V1.5→V2→V3 四阶段功能矩阵 + UI 页面映射 |
| [docs/brainstorm-ideas.md](docs/brainstorm-ideas.md) | 产品创意发散（PM/Designer/Engineer 三视角，Top 5 创意） |
| [docs/discovery-gaps.md](docs/discovery-gaps.md) | 前期调研缺口分析（Top 5 待验证假设） |
| [docs/decisions/](docs/decisions/) | 架构决策记录（ADR-001 ~ ADR-006） |

### 技术设计

| 文档 | 说明 |
|---|---|
| [docs/tech-design-ql-selfheal.md](docs/tech-design-ql-selfheal.md) | QL 预校验 + 失败自修正 + 缓存/预算 技术方案 |

### 开发规范

| 文档 | 说明 |
|---|---|
| [docs/dev-standards/development-guide.md](docs/dev-standards/development-guide.md) | Clean Code + Clean Architecture 编码规范 |
| [docs/dev-standards/openspec-workflow.md](docs/dev-standards/openspec-workflow.md) | OpenSpec 规范驱动开发工作流（10 个 Codex skill） |
| [docs/dev-standards/tdd-workflow.md](docs/dev-standards/tdd-workflow.md) | TDD red-green-refactor 工作流 |
| [docs/dev-standards/quality-gate.md](docs/dev-standards/quality-gate.md) | QA 质量门禁（ruff + mypy + pytest + 覆盖率） |

### 可行性验证（Spike）

| 文档 | 说明 |
|---|---|
| [docs/feasibility-report.md](docs/feasibility-report.md) | **最终结论：LLM QL 生成能力可行性验证通过（GO）** |
| [docs/spike/](docs/spike/) | Spike 各轮报告与实验计划（合成数据 + 真实生产数据） |

### 演示文稿

| 文档 | 说明 |
|---|---|
| [docs/decks/](docs/decks/) | 产品 PPT（杂志风网页版 + SVG 导出 PPTX） |

## 架构概览

```text
Frontend (Next.js) ──HTTP/SSE──> FastAPI Core
                                  ├── Session Manager
                                  ├── Tool-Calling Loop  ──> SafeToolExecutor (校验/缓存/预算/自修正)
                                  └── RCA Generator              │
                                                                 ▼
                                          Native Agent Toolset (Mimir / Loki / Tempo)
```

**核心设计决策**（详见 [docs/decisions/](docs/decisions/)）：
- 原生 Tool-Calling，不引入 Agent 框架（ADR-001）
- 只读排查，不改线上状态（ADR-002）
- ToolSpec 统一契约为 MCP 演进铺路（ADR-003）
- SafeToolExecutor 四层包装保障可靠性（ADR-004）
- 失败优雅收尾，绝不抛 500（ADR-005）

## 技术栈

- **Backend**：Python 3.12, FastAPI, Pydantic v2, HTTPX, `openai` SDK（见 ADR-006）
- **Frontend**：Next.js (App Router), Tailwind CSS, React Markdown（见 ADR-006）

## 目录结构（规划）

```text
backend/app/
├── main.py              # FastAPI 入口
├── api/chat.py          # 路由: 创建会话 & 轮询状态
├── agent/
│   ├── loop.py          # 原生 Tool-Calling 循环
│   ├── safe_executor.py # 四层包装（ADR-004）
│   └── prompts.py       # SRE 专家人设 prompt
├── tools/
│   ├── base.py          # ToolSpec 基类（ADR-003）
│   ├── catalog.py       # 元数据缓存
│   ├── ql/              # 三类 QL 校验器
│   └── mimir.py|loki.py|tempo.py
└── observability/metrics.py
frontend/                # 极简交互界面
```

## Contributing

- 重大架构变更须新建 ADR（见 [docs/decisions/README.md](docs/decisions/README.md)）。
- 遵循 [CLAUDE.md](CLAUDE.md) 中的项目约定。
