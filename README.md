# AI SRE Investigator

让开发人员用"大白话"即可调动底层可观测性平台（Mimir / Loki / Tempo），实现"自己的服务故障自己独立闭环"，打破研发与 SRE 之间的可观测性 QL 认知壁垒，消除全员向 SRE 求助的"多对一"响应瓶颈。

> 状态：MVP ~ V3 全阶段已实现 — 后端 148 tests passed，覆盖率 86%；前端 9 路由全量复刻原型；CI/CD + Docker 就绪

## Quick Start

### 后端（FastAPI）

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload    # http://localhost:8000
pytest                            # 148 tests
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

## 功能概览

| 阶段 | 功能 | 状态 |
|------|------|------|
| MVP | 自然语言申告 + QL 转化 + SSE 推理流 + RCA 报告 + SafeToolExecutor | 已完成 |
| V1.5 | 证据下钻 Timeline + 对话式追问 + 置信度标注 + 部分 RCA + 模拟引导 + 一键分享 | 已完成 |
| V2 | RCA 知识库 + 黄金路径剧本库 + 服务画像 + 价值仪表盘 + 交接卡 | 已完成 |
| V3 | 可插拔工具注册表 + 多模型路由 + 会话持久化 + 自观测指标 | 已完成 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | 创建排查会话，返回 `session_id` |
| POST | `/api/session/{id}/follow-up` | 对话式追问 |
| GET | `/api/session/{id}` | 查询会话状态 |
| POST | `/api/session/{id}/handoff` | 生成交接卡 |
| GET | `/api/session/{id}/stream` | SSE 事件流（thinking/tool_call/tool_result/budget_update/rca/playbook_hint） |
| GET | `/api/metrics` | 全局自观测指标汇总 |
| GET | `/api/metrics/{id}` | 单会话自观测指标 |
| GET | `/api/dashboard` | 价值仪表盘 KPI |
| GET | `/api/services` | 服务目录列表 |
| GET | `/api/services/{name}` | 服务画像详情 |
| GET | `/api/knowledge` | RCA 知识库搜索 |
| GET | `/api/knowledge/{id}` | 知识库条目详情 |
| GET | `/api/tools` | 工具注册表列表 |
| POST | `/api/tools/{name}/enable` | 启用工具 |
| POST | `/api/tools/{name}/disable` | 禁用工具 |
| GET | `/api/playbooks` | 剧本库摘要列表 |
| GET | `/api/playbooks/{id}` | 剧本详情 |
| GET | `/api/playbooks/match?q=...` | 剧本匹配 |
| GET | `/api/playbooks/stats` | 剧本覆盖统计 |
| GET | `/api/sessions` | 历史会话列表 |
| GET | `/api/sessions/{id}/replay` | 会话事件回放 |
| GET | `/api/models` | 可用模型列表 |
| POST | `/api/models/{id}/select` | 切换模型 |

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
                                  ├── Playbook Engine     ──> 黄金路径自动匹配
                                  └── RCA Generator              │
                                       ├── Knowledge Store       │
                                       └── Service Catalog       │
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

## 目录结构

```text
backend/app/
├── main.py              # FastAPI 入口
├── api/routes.py        # 23 个 API 端点
├── agent/
│   ├── loop.py          # 原生 Tool-Calling 循环
│   ├── safe_executor.py # 四层包装（ADR-004）
│   ├── budget.py        # 预算追踪
│   └── events.py        # SSE 事件类型
├── tools/
│   ├── base.py          # ToolSpec 基类（ADR-003）
│   ├── registry.py      # 可插拔工具注册表（V3-F2）
│   ├── ql/              # 三类 QL 校验器
│   └── mimir.py|loki.py|tempo.py
├── knowledge/store.py   # RCA 知识库（V2-F1）
├── playbooks/           # 黄金路径剧本库（V2-F2）
├── services/            # 服务画像（V2-F3）
├── llm/                 # 多模型路由（V3-F3）
├── persistence/         # 会话持久化（V3-F4）
└── observability/metrics.py
frontend/                # 极简交互界面
```

## Contributing

- 重大架构变更须新建 ADR（见 [docs/decisions/README.md](docs/decisions/README.md)）。
- 遵循 [AGENTS.md](AGENTS.md) 中的项目约定。
