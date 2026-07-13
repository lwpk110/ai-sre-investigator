# Repository Guidelines

Contributor guide for **AI SRE Investigator**, a natural-language-driven SRE tool that queries Mimir/Loki/Tempo and produces RCA reports. The repo is currently in the **design phase**; conventions below are established, while build commands will be added as code lands.

## Project Structure & Module Organization

```text
docs/                 # PRD, brainstorm, technical designs
docs/decisions/       # ADRs (architecture decision records)
backend/app/          # FastAPI service (planned)
  ├── agent/          # Tool-Calling loop, SafeToolExecutor, prompts
  ├── tools/          # ToolSpec base + Mimir/Loki/Tempo clients, QL validators
  ├── api/            # HTTP routes
  └── observability/  # Metrics
frontend/             # Next.js UI (planned)
CLAUDE.md             # Agent + contributor red-line rules (read before coding)
```

## Read Before Coding

1. [docs/PRD.md](docs/PRD.md) — requirements and red lines.
2. [docs/decisions/](docs/decisions/) — ADRs. **Do not violate existing ADRs; changes require a new superseding ADR.**

## Red-Line Rules

- No agent frameworks (e.g., LangChain). Use the `openai` SDK native Tool-Calling only (ADR-001).
- All HTTPX calls need `timeout`; 5xx is caught and fed back to the LLM — never throw 500 to the client (ADR-005).
- All tools extend `ToolSpec` and route through `SafeToolExecutor` (ADR-003/004).
- Read-only: never modify live state (ADR-002).

## Build, Test, and Development Commands

Code is not yet implemented. Planned stack: Python 3.12 + FastAPI + Pydantic v2 + HTTPX (`backend/`), Next.js App Router + Tailwind (`frontend/`).

```bash
# Backend (planned)
cd backend && uvicorn app.main:app --reload    # run dev server
pytest                                          # run all tests
pytest tests/unit/ -x                           # fast unit tests only
mypy app                                        # type-check (strict)
ruff check app/ tests/                          # lint + import order
git config core.hooksPath .githooks             # install pre-commit hook (once)

# Frontend (planned)
cd frontend && npm run dev                      # dev server
npm run lint
```

## 语言策略

所有文档、注释、GitHub Issue/PR/工单、OpenSpec artifact、对话均以**中文**为主。

- **中文**：代码注释、提交信息描述、文档、GitHub 工单、设计文档
- **英文**：代码标识符（变量名/函数名/类名）、QL 查询语句（PromQL/LogQL/TraceQL）、技术术语原文（SSE、HTTPX、Pydantic 等）
- **Commit message**：保持 Conventional Commits 英文前缀（`feat`/`fix`/`docs`/`refactor`）+ 中文描述

## Coding Style & Naming Conventions

- Python: async-first (`async/await`), strict typing enforced via `mypy`.
- Define all tool parameters as Pydantic v2 models (converted to LLM `tools` schemas).
- 注释解释 *为什么*（why），不解释 *是什么*（what）。不要留注释掉的代码，不要留过期 TODO。

## Testing Guidelines

- **TDD is mandatory** for all feature work and bug fixes. See [docs/dev-standards/tdd-workflow.md](docs/dev-standards/tdd-workflow.md).
- Unit-test QL validators, cache keys, and budget logic.
- Integration-test the self-heal loop, chaos paths (5xx/timeout/429), and graceful budget exhaustion.
- Tests must not require live observability backends — mock them.
- Quality gate: `ruff check` + `mypy --strict` + `pytest --cov-fail-under=80`. See [docs/dev-standards/quality-gate.md](docs/dev-standards/quality-gate.md).

## OpenSpec Spec-Driven Development

- Non-trivial feature changes go through OpenSpec: `propose → spec → design → tasks → TDD → verify → archive`.
- Use the 10 OpenSpec Codex skills (`/opsx:propose`, `/opsx:apply`, `/opsx:verify`, etc.).
- See [docs/dev-standards/openspec-workflow.md](docs/dev-standards/openspec-workflow.md) for the full workflow.
- Bug fixes and config changes can skip OpenSpec (TDD covers them directly).

## Coding Standards

- Clean Architecture layers: `api/ → agent/ → tools/ → config/`. Dependencies point inward only.
- Installed skills `clean-code` and `clean-architecture` (wondelai/skills v1.4.0) auto-activate during coding and review.
- Full type annotations, `mypy --strict` zero errors.
- async-first, Pydantic v2 for all schemas.
- See [docs/dev-standards/development-guide.md](docs/dev-standards/development-guide.md) for the complete guide.

## Commit & Pull Request Guidelines

No Git history exists yet. Once versioning begins, follow **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`). PRs must reference the relevant ADR or issue and describe the rationale for any architectural change.
