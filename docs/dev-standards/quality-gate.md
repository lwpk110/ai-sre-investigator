# QA 质量门禁 (Quality Gate)

> 定义代码从"写完"到"可合并"必须通过的检查。
> 门禁分三层:本地(写时)、提交时(pre-commit)、CI(合并前)。

---

## 门禁概览

| 检查项 | 工具 | 本地 | pre-commit | CI | 失败后果 |
|--------|------|:----:|:----------:|:--:|----------|
| 代码风格 | `ruff check` | 手动 | 强制 | 强制 | 阻断提交 |
| 导入排序 | `ruff check --select I` | 手动 | 强制 | 强制 | 阻断提交 |
| 类型检查 | `mypy --strict` | 手动 | 跳过(慢) | 强制 | 阻断合并 |
| 单元测试 | `pytest tests/unit` | 手动 | 强制(快速) | 强制(全量) | 阻断提交 / 合并 |
| 集成测试 | `pytest tests/integration` | 手动 | 跳过(慢) | 强制 | 阻断合并 |
| 覆盖率 | `pytest --cov` | 跳过 | 跳过 | 强制 | < 80% 阻断合并 |
| ADR 合规 | 人工 / `openspec verify` | 手动 | 跳过 | 强制 | 阻断合并 |
| 安全扫描 | `ruff` + 手动审查 | 跳过 | 跳过 | 定期 | 告警 |

---

## 第一层:写代码时(IDE / 手动)

### 快速验证(每次改完代码跑)

```bash
cd backend
ruff check app/                    # 风格 + 导入(< 1 秒)
pytest tests/unit -x -q            # 单元测试,遇错即停(< 5 秒)
```

### 完整验证(提交前自检)

```bash
cd backend
ruff check app/ tests/
mypy app/
pytest -q                          # 全量测试(含集成)
```

---

## 第二层:pre-commit hook(提交时)

安装后,每次 `git commit` 自动执行,失败则阻断提交。

### 安装

```bash
# 方式一:用项目内置 hook(推荐)
git config core.hooksPath .githooks

# 方式二:用 pre-commit 框架
pip install pre-commit
pre-commit install
```

### 执行内容

1. **ruff**:风格检查 + 自动修复可修的(`ruff check --fix`)
2. **ruff format**:格式化(如果配置了)
3. **pytest fast**:只跑 `tests/unit/`,失败即阻断(< 10 秒)

> mypy 和集成测试不放进 pre-commit(太慢),交给 CI。

---

## 第三层:CI(合并前)

以下检查必须全绿才能合并 PR:

1. `ruff check app/ tests/` — 零错误
2. `mypy --strict app/` — 零错误
3. `pytest tests/unit/ -v` — 全绿
4. `pytest tests/integration/ -v` — 全绿
5. `pytest --cov=app --cov-fail-under=80` — 覆盖率 ≥ 80%
6. `openspec validate <change>` — 变更格式校验

---

## ruff 配置(pyproject.toml 已定义)

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "F",    # pyflakes
    "I",    # isort
    "UP",   # pyupgrade
    "B",    # flake8-bugbear
    "SIM",  # flake8-simplify
]
```

## mypy 配置(pyproject.toml 已定义)

```toml
[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

---

## 覆盖率规则

- **整体 ≥ 80%**:CI 阻断低于此值的 PR。
- **关键模块 ≥ 90%**:`tools/ql/`(校验器)、`agent/safe_executor.py`(四层包装)。
- 不追求 100%:`api/` 路由层、`config.py` 等薄层允许较低覆盖率。
- 测试质量优先于覆盖率:高覆盖率但测 mock 行为的测试没有价值。

---

## AI Agent 的 QA 职责

AI agent(包括 Codex/Claude Code)在每次提交前必须自检:

1. 写完代码后跑 `ruff check` + `pytest tests/unit -x`
2. 修完所有错误再交付
3. 如果跳过了 TDD(配置文件等例外),在 PR/commit message 中说明
4. 如果改动涉及 ADR 定义的红线(只读、不抛 500、不引框架),必须先确认有对应 ADR 支持

这等效于一个内置的 QA agent:不是事后审查,而是写代码时就执行门禁标准。
