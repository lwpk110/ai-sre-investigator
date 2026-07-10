# 开发规范 (Development Guide)

> 本文件是 AI SRE Investigator 的编码与架构红线。所有人类贡献者和 AI agent 在写代码前必读。
> 与 CLAUDE.md / AGENTS.md 并列,本文件聚焦"怎么写代码",ADR 聚焦"为什么这样设计"。
>
> **已安装技能驱动**：本文档基于两个社区技能：
>- `clean-code`（wondelai/skills v1.4.0, 3.3K+ installs）— 命名、函数、错误处理、测试质量评分体系
>- `clean-architecture`（wondelai/skills v1.4.0, 3.6K+ installs）— 依赖规则、实体/用例、适配器/框架、SOLID
>
> AI agent 在编码和 review 时应自动激活这两个技能。本文档是其与项目 ADR 的适配层。

---

## 1. Clean Architecture 分层

项目按依赖方向分层,**外层依赖内层,内层不知道外层存在**。

```text
┌─────────────────────────────────────────────────────┐
  api/          ← HTTP 路由 (FastAPI router)
                   只做请求解析、响应序列化,不含业务逻辑
├─────────────────────────────────────────────────────┤
  agent/        ← 应用编排层 (Tool-Calling Loop, RCA Generator)
                   编排工具调用,管理会话状态与预算
├─────────────────────────────────────────────────────┤
  tools/        ← 工具抽象层 (ToolSpec 基类 + 三探针)
                   定义统一契约:validate / execute / to_structured_error
├─────────────────────────────────────────────────────┤
  config / observability  ← 基础设施层 (配置、埋点)
└─────────────────────────────────────────────────────┘
         依赖方向: 上 → 下 (外层依赖内层,禁止反向)
```

**硬规则**:
- `api/` 不直接调用 `httpx` 或观测后端,必须通过 `agent/` 或 `tools/`。
- `tools/` 不导入 `FastAPI` 或 `api/` 的任何东西。
- `agent/` 不知道具体工具的实现细节,只通过 `ToolSpec` 抽象交互。
- 跨层通信一律用 Pydantic 模型或 dataclass,不用裸 dict。

---

## 2. Clean Code 原则

### 2.1 命名

| 场景 | 规则 | 示例 |
|------|------|------|
| 函数/变量 | snake_case,动词开头 | `query_metrics`, `result` |
| 类 | PascalCase | `SafeToolExecutor`, `MetricCatalog` |
| 常量 | UPPER_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| 私有 | 前缀 `_` | `_normalize_query`, `_exec_with_retry` |
| Pydantic 字段 | snake_case,语义清晰 | `service_name`, `metric_type` |
| 异步函数 | `async def` 开头 | `async def execute(...)` |

**禁止**:单字母变量(循环计数器 `i` 除外)、缩写(`cfg` 可以,`c` 不行)、匈牙利记号。

### 2.2 函数

- **单一职责**:一个函数只做一件事。函数名能完整描述它做的事。
- **短小**:目标 ≤ 30 行。超过就拆。纯数据转换函数可以适当放宽。
- **参数 ≤ 4 个**:超过用 dataclass / Pydantic 模型打包。
- **无副作用优先**:能返回值就不修改外部状态。需要副作用时显式标注(返回值或类型签名)。
- **提前返回 (guard clause)**:用 `if not valid: return` 替代深层嵌套。

```python
# 好:guard clause,扁平
async def dispatch(self, spec: ToolSpec, args: dict, ctx: CallContext) -> ToolResult:
    if ctx.budget_exhausted():
        return self._graceful_finalize(ctx)
    if cached := self._cache.get(self._cache_key(spec.name, args)):
        return cached
    # ... 主逻辑

# 坏:嵌套地狱
async def dispatch(self, spec, args, ctx):
    if not ctx.budget_exhausted():
        if not self._cache.get(...):
            # ... 5 层缩进
```

### 2.3 注释

- 注释写**为什么**,不写**是什么**。
- 删掉注释后代码不能自解释 → 改代码(重命名、拆函数),而不是加注释。
- 禁止注释掉的代码、`TODO` 不带 issue 编号、`FIXME` 不带修复计划。

### 2.4 错误处理

遵循 ADR-005:**绝不向前端抛 500**。

- 工具执行失败 → 返回 `ToolResult.failed(structured_error)`,不 raise。
- HTTPX 5xx / timeout → try-catch,退避重试,最终回灌结构化错误给 LLM。
- 预算耗尽 → 优雅收尾,生成部分 RCA。
- 唯一允许 raise 的场景:编程错误(类型错误、配置缺失)——这些是 bug,应该暴露。

```python
# 好:业务错误用返回值,不 raise
async def execute(self, args: dict, ctx: CallContext) -> ToolResult:
    try:
        resp = await self._client.get(url, timeout=ctx.timeout)
        resp.raise_for_status()
    except httpx.TimeoutException:
        return ToolResult.failed(StructuredError(
            error_type="BACKEND_TIMEOUT",
            message="查询超时,建议缩小时间窗口",
        ))
    except httpx.HTTPStatusError as e:
        return ToolResult.failed(StructuredError(
            error_type="BACKEND_5XX",
            message=f"后端返回 {e.response.status_code}",
        ))
```

---

## 3. 类型安全

- **全量类型标注**:所有函数签名、变量声明(非平凡赋值)必须有类型。
- `mypy --strict` 零错误是合并门禁。
- 用 `from __future__ import annotations` 延迟求值(项目 Python 3.12)。
- 优先 `X | None` 而非 `Optional[X]`;优先 `list[X]` 而非 `List[X]`。
- Pydantic v2 模型:字段必须标注类型,用 `Field()` 设默认值和约束。

---

## 4. 异步规范

- **async-first**:所有 I/O 操作(HTTP、LLM 调用)必须是 `async def`。
- HTTPX 用 `httpx.AsyncClient`,不用 `requests`。
- 禁止 `asyncio.run()` 嵌套、禁止在 async 函数里用阻塞 I/O。
- 并发调用多个无依赖工具时用 `asyncio.gather`。
- 不要为同步逻辑(纯计算、数据转换)加 async。

---

## 5. Pydantic v2 规范

所有工具参数、API 请求/响应、配置项都用 Pydantic v2 模型。

```python
from pydantic import BaseModel, Field
from enum import Enum

class MetricType(str, Enum):
    error_rate = "error_rate"
    latency = "latency"

class MimirQueryArgs(BaseModel):
    service_name: str = Field(..., min_length=1, description="目标服务名")
    metric_type: MetricType
    duration: str = Field("1h", description="查询时间窗口")

    @property
    def ql_field(self) -> str:
        return "query"
```

- `Field(...)` 表示必填,`Field("default")` 表示有默认值。
- `description` 必填:它会被转成 LLM 的 tool schema,直接喂给模型。
- Enum 继承 `str` 以兼容 JSON 序列化。

---

## 6. 文件组织

- 一个类/模块一个职责,文件名与主类/主功能对应。
- `__init__.py` 只做 re-export,不含逻辑。
- 测试文件与源文件同名:`tools/mimir.py` → `tests/unit/tools/test_mimir.py`。
- 禁止 `utils.py` 万能文件:按职责拆分(`ql/parsers.py`, `ql/normalizers.py`)。

---

## 7. 依赖管理

- 禁止引入 LangChain 等 Agent 框架(ADR-001)。
- 新增第三方依赖前,在 PR 中说明理由,优先用标准库。
- 依赖锁定在 `pyproject.toml`,不用 `requirements.txt`(spike 除外)。
- 所有 HTTPX 调用必须有 `timeout`(ADR-005)。

---

## 8. Git 规范

- **Conventional Commits**:`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`。
- 一个 commit 一个逻辑变更,不混合功能开发和格式化。
- 分支命名:`feat/<scope>` / `fix/<scope>` / `docs/<topic>`。
- PR 必须关联 OpenSpec change 或 ADR,描述架构变更的理由。
