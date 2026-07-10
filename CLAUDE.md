# CLAUDE.md - AI SRE Investigator 项目约定

> 本文件供 AI agent（Codex / Claude Code 等）遵循，确保 agent 按项目既定决策与规范工作。

## 项目简介

AI SRE Investigator：用自然语言驱动 Mimir/Loki/Tempo 可观测性平台，自动生成 RCA 报告。详见 [README.md](README.md)。

## 必读文档（动手前必看）

- [docs/PRD.md](docs/PRD.md) -- 产品需求与红线
- [docs/decisions/](docs/decisions/) -- 架构决策记录（ADR）。**禁止违反已有 ADR；若需变更须新建 ADR**
- [docs/dev-standards/](docs/dev-standards/) -- 开发规范（编码、TDD、OpenSpec、质量门禁）

## 红线原则（MUST DO）

来自 PRD §7 与 ADR-001/004/005，违反即返工：

1. **纯原生架构**：绝对禁止引入 LangChain 等臃肿封装框架。Agent 推理与函数调用必须直接用 `openai` 官方 SDK 原生 Tool-Calling（ADR-001）。
2. **容错与防御**：所有对 Mimir/Loki/Tempo 的 HTTPX 请求必须有 `timeout`；5xx 必须 try-catch 并向大模型回灌结构化失败原因，**绝不向前端抛 500 导致 Agent 中断**（ADR-005）。
3. **工具统一契约**：所有工具继承 `ToolSpec` 基类，走 `SafeToolExecutor` 四层包装（预检/缓存/校验/自修正），不得绕过（ADR-003/004）。
4. **只读边界**：Agent 仅查询，绝不修改线上状态（无自愈/扩缩容/改配置）（ADR-002）。
5. **优雅收尾**：失败或预算耗尽时生成"部分 RCA"并标注证据缺口，不臆测、不静默（ADR-005）。

## 代码规范

- Python 3.12 + Pydantic v2 + FastAPI + HTTPX（ADR-006）。
- 所有工具参数用 Pydantic 严谨定义 Schema，用于转化为 LLM `tools` 列表。
- 异步优先（async/await），HTTPX async 调用观测后端。
- 强类型，开启类型检查。

## 文档与决策

- 重大架构变更须新建 ADR，引用并 supersede 旧 ADR，**不删除旧 ADR**。
- ADR 模板：Status / Date / Context / Decision / Alternatives Considered / Consequences。
- 注释写"为什么"而非"是什么"；不保留注释掉的代码；不留下陈旧 TODO。

## 测试要求

- **TDD 强制**：先写失败测试，再写实现。详见 [docs/dev-standards/tdd-workflow.md](docs/dev-standards/tdd-workflow.md)。
- 工具校验器、缓存 key、预算扣减须有单测。
- 自修正闭环、混沌（5xx/超时/429）、预算耗尽优雅收尾须有集成测试。
- 不得引入需真实观测后端才能跑的单测（用 mock）。
- 质量门禁：`ruff check` + `mypy --strict` + `pytest --cov-fail-under=80`。详见 [docs/dev-standards/quality-gate.md](docs/dev-standards/quality-gate.md)。

## OpenSpec 规范驱动开发

- 非平凡功能变更走 OpenSpec 流程：`propose → spec → design → tasks → TDD 实现 → verify → archive`。
- 详见 [docs/dev-standards/openspec-workflow.md](docs/dev-standards/openspec-workflow.md)。
- 可跳过 OpenSpec 的场景：bug 修复（TDD 直接覆盖）、文档更新、配置调整。

## 编码规范

- Clean Architecture 分层：api/ → agent/ → tools/ → config/。依赖只向内。
- 详见 [docs/dev-standards/development-guide.md](docs/dev-standards/development-guide.md)。
  - 编码时自动激活已安装的 `clean-code` 和 `clean-architecture` 技能（wondelai/skills v1.4.0）。
  - 全量类型标注，`mypy --strict` 零错误。
  - async-first，HTTPX async，禁止阻塞 I/O。
  - Conventional Commits：`feat:` / `fix:` / `docs:` / `refactor:` / `test:`。
