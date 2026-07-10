# 技术方案 #4：QL 预校验 + 失败自修正 + 缓存/预算

> 对应创意：`E-1 + E-2`（brainstorm Top #4）
> 优先级：**V1.0 必做**（PRD 容错红线的工程化落地）
> 范围：增强 `agent/loop.py` 的 Tool-Calling 循环，不改变 PRD 既有架构与目录结构

---

## 1. 背景与目标

PRD 第 7 节红线要求："所有 HTTPX 请求必须有 timeout，5xx 时必须 try-catch 并向大模型返回结构化失败原因，绝不能向前端抛 500 导致 Agent 中断。"

但仅有"不崩"不够。真实环境存在两类高频问题：

1. **LLM 生成的 QL 本身有错**（语法错、metric/label 不存在、时间窗口过大）。若直接执行，要么后端报错中断，要么返回无意义结果让 LLM 误判根因。
2. **观测后端查询又慢又重**。Mimir/Loki 大范围查询单次可达数十秒，一次排查内重复查询会拖垮后端或烧爆成本；失控的 tool-call 循环会无限消耗 token。

**目标**：把红线从"不中断"升级为"**自愈 + 可控**"——QL 执行前校验、失败自动回灌修正、查询缓存去重、会话级预算约束、预算耗尽优雅收尾。

**对应假设**（来自 brainstorm，本文档同步给出度量埋点以验证）：
- H1：LLM 拿到结构化错误后单轮自修正成功率 ≥ 70%。
- H2：单次排查内查询去重率足够，缓存收益 > 复杂度成本。

---

## 2. 整体设计：在 Tool-Calling 循环中插入四层包装

在 PRD 的 `agent/loop.py` 调度每个 tool 时，统一经过一个 **`SafeToolExecutor`** 包装层，串起四道关卡：

```text
LLM tool_call
   │
   ▼
┌─────────────────────────────────────────────────────┐
│ SafeToolExecutor.dispatch(tool_name, args)          │
│                                                     │
│  ① 预算预检   (budget precheck)                     │
│  ② 缓存命中? ──是──> 直接返回缓存结果                │
│  ③ QL 预校验  (L1 语法 / L2 作用域)                 │
│       │ 校验失败                                    │
│       ▼                                             │
│  ④ 失败自修正循环 (回灌结构化错误 -> LLM 重生成)     │
│       │ 通过校验                                    │
│       ▼                                             │
│  ⑤ 执行 (带 timeout / 重试退避)                     │
│  ⑥ 缓存写入 + 预算扣减 + 埋点                       │
└─────────────────────────────────────────────────────┘
   │
   ▼
结构化结果回灌到 LLM 上下文
```

四层职责分离，互不耦合，可独立测试与替换。这也为 **E-3 可插拔工具注册表**铺路——所有 tool 共享同一套执行外壳。

---

## 3. QL 预校验（Pre-validate）

### 3.1 两级校验

| 级别 | 内容 | 依赖 | 开销 |
|---|---|---|---|
| L1 语法 | QL 文法合法性（括号/算子/流水线） | 本地轻量 parser | 极低，同步本地 |
| L2 作用域 | metric/label 是否真实存在 | 服务元数据缓存（见 3.2） | 低，查本地缓存 |

L1 必做；L2 在元数据缓存就绪后开启，缓存未命中时降级为"跳过 L2，直接执行由后端裁决"。

### 3.2 服务元数据缓存（支撑 L2）

启动时（或首次访问时懒加载）从各后端拉取可用元数据并本地缓存 + TTL 刷新：

- **Mimir**：`GET /api/v1/label/__name__/values` -> 可用 metric 名；`GET /api/v1/labels` -> 可用 label key。
- **Loki**：`GET /labels` -> 可用 stream label key。
- **Tempo**：TraceQL 无强标签目录，L2 跳过，仅做 L1。

缓存结构示例：
```python
class MetricCatalog(BaseModel):
    metrics: set[str]            # http_requests_total, ...
    labels_by_metric: dict[str, set[str]]  # {"http_requests_total": {"service","status"}}
    fetched_at: float
    ttl_seconds: float = 300
```

> 这份元数据目录本身也是 PRD 未覆盖但落地必备的资产：LLM 生成 QL 时若能拿到"可用 metric 列表"作为提示，可显著降低首次错误率（见 §6 system prompt 增强）。

### 3.3 各 QL 校验实现选型

| QL | L1 校验方式 | 备注 |
|---|---|---|
| PromQL | `promql-parser`（纯 Python AST）或自写 lexer | 避免 prometheus client 重依赖 |
| LogQL | 复用 loki 官方 `logql` 语法校验或自写 stream selector/pipeline parser | stream selector `{...}` + `\|=` pipeline |
| TraceQL | 轻量正则 + token 校验 | Tempo TraceQL 语法较新，生态库少，自写最稳 |

> 选型原则与 PRD 一致：轻量、原生、不引臃肿框架。每类 QL 的校验器实现为纯函数 `(query: str, catalog) -> ValidationResult`，便于单测。

---

## 4. 失败自修正循环（Self-heal Loop）

### 4.1 错误分类与处置

| error_type | 触发 | 处置（回灌给 LLM 的内容） |
|---|---|---|
| `SYNTAX_ERROR` | L1/L2 校验失败 | 原始 QL + 错误位置/信息 + "请修正语法" |
| `SCOPE_ERROR` | metric/label 不存在 | 原 QL + 可用 metric/label 列表提示 + "请从中选择" |
| `BACKEND_5XX` | 后端 5xx | 重试（指数退避，最多 2 次）后仍失败 -> 回灌"后端暂不可用，原因:..." |
| `BACKEND_TIMEOUT` | 超时 | 回灌"查询超时，建议缩小时间窗口/范围后重试" |
| `RATE_LIMITED` | 429 | 退避重试 1 次 -> 回灌 |

### 4.2 回灌消息格式（结构化，供 LLM 解析）

回灌的不是裸字符串，而是结构化 JSON，放入 tool 结果的 `content`：

```json
{
  "status": "error",
  "tool": "query_mimir",
  "query": "rate(http_requests_total{services=\"payment\"}[5m])",
  "error_type": "SCOPE_ERROR",
  "message": "label 'services' not found",
  "hint": "available labels: service, status, code",
  "retry_allowed": true,
  "attempt": 1,
  "max_attempts": 3
}
```

结构化的好处：LLM 能稳定识别"这是需要我修正的信号"而非误当成有效证据；同时前端 Timeline 可据此渲染"⚠️ 查询失败并自修正中"的可视状态（对接 D-1 信任体验）。

### 4.3 循环控制（防失控）

- **单次 tool 调用**：最多修正 `max_attempts=3` 次。超过则该 tool 返回 `status: failed` 的最终原因，让 LLM 在 RCA 中**如实标注证据缺失**（对接 D-5 诚实不确定性）。
- **整会话**：累计 `tool_failure` 计数，超阈值（如 8 次）触发"降低激进度"——提示 LLM 优先用已得证据收尾。
- 任何回灌都计入预算（见 §5），避免"自修正"本身成为成本黑洞。

### 4.4 自修正循环伪代码

```python
async def dispatch_with_selfheal(spec: ToolSpec, args: dict, ctx: CallContext) -> ToolResult:
    for attempt in range(1, ctx.max_attempts + 1):
        ql = args.get(spec.ql_field)          # "query" / "query_keyword"
        vr = spec.validate(ql, ctx.catalog)   # L1 + L2
        if not vr.ok:
            if attempt < ctx.max_attempts:
                # 回灌结构化错误，让 LLM 重新生成 args，再回到本函数
                ctx.enqueue_llm_correction(vr.to_structured_error(attempt))
                args = await ctx.await_regenerated_args()
                continue
            return ToolResult.failed(vr.to_structured_error(attempt))

        result = await spec.execute(args, ctx)   # 带 timeout/重试（§4.1）
        if result.ok:
            return result
        if result.retryable and attempt < ctx.max_attempts:
            ctx.enqueue_llm_correction(result.to_structured_error(attempt))
            args = await ctx.await_regenerated_args()
            continue
        return result
    return ToolResult.failed("exhausted_attempts")
```

> 说明：`await_regenerated_args()` 表示把结构化错误塞回 LLM 上下文、重新请求一次 `tool_calls`，解析新参数。这与 PRD 的 loop 主循环天然兼容——自修正即"局部多跑几轮 tool_call"。

---

## 5. 缓存与预算控制

### 5.1 查询缓存

**缓存 key**（归一化以提升命中）：
```python
def cache_key(tool: str, args: dict) -> str:
    q = normalize_ws(args.get("query") or args.get("query_keyword") or "")
    # 时间窗口对齐到 30s 桶，避免微秒级差异导致失效
    bucket = align_time_bucket(args.get("start_time"), args.get("end_time"), args.get("duration"))
    return sha1(f"{tool}|{q}|{bucket}|{args.get('service_name','')}")
```

**存储**：MVP 用进程内 `dict + TTL`（`cachetools.TTLCache`）；预留接口，二期换 Redis 支持多副本。

**TTL 策略**（按时间窗口新鲜度）：
- 查询窗口含"最近 5 分钟"：TTL 30s（近实时数据易变）。
- 纯历史窗口（结束时间 > 5min 前）：TTL 10min（历史不变）。

**只缓存成功结果**；失败结果不缓存，但记录"已知坏查询"短时去重（避免对同一坏 QL 反复校验/执行），TTL 60s。

**写入/读取走 SafeToolExecutor**，对 tool 实现透明。

### 5.2 会话级预算

三类预算，会话级累计，`config.py` 可配：

| 预算 | 默认 | 含义 |
|---|---|---|
| `max_tokens_per_session` | 80_000 | 累计 LLM token |
| `max_tool_calls_per_session` | 25 | tool 调用总次数（含自修正重试） |
| `max_session_seconds` | 180 | 会话 wall-clock 上限 |

**预算预检**（§2 ①）：每次 dispatch 前检查；任一超限即不再发起新 tool，进入收尾。

**优雅收尾**（关键，对接 D-5）：
- 不抛异常、不 500。
- 用当前已收集的证据调用 LLM 生成"部分 RCA"。
- RCA 顶部显式标注：`⚠️ 本报告因预算/时间限制未能完成以下查询：[...]，结论基于部分证据。`
- 这条标注本身也是建立信任的设计：诚实地告诉用户"我没查完"，而不是假装查完了给错答案。

### 5.3 埋点（度量假设验证 + 喂给 E-5 自观测）

每次 dispatch 记录一条结构化日志/指标：

```python
@dataclass
class ToolCallMetric:
    session_id: str
    tool: str
    attempt: int
    outcome: str          # success | cache_hit | syntax_error | scope_error | backend_error | timeout | budget_exhausted
    self_healed: bool     # 是否经过自修正后成功
    latency_ms: int
    cache_key: str | None
```

聚合指标（验证假设）：
- H1 自修正：`ql_first_error_rate` = 首次校验失败率；`self_heal_success_rate` = 校验失败后最终成功 / 校验失败总数。
- H2 缓存：`cache_hit_rate`；`duplicate_query_ratio` = 去重命中 / 总调用。

这些指标天然可被自家 Mimir/Loki 采集——即 **E-5 dogfooding** 的首批数据源。

---

## 6. 与 PRD 现有架构的集成点

基于 PRD 第 6 节目录，新增/改动如下（**不破坏既有结构**）：

```text
backend/app/
├── config.py                # [+]: cache_ttl_*, max_*_budget 配置项
├── agent/
│   ├── loop.py              # [改]: tool dispatch 经 SafeToolExecutor 包装
│   └── safe_executor.py     # [+]: SafeToolExecutor（四层包装）
├── tools/
│   ├── base.py              # [+]: ToolSpec 抽象基类（validate/execute/ql_field），为 E-3 铺路
│   ├── catalog.py           # [+]: MetricCatalog 元数据缓存（L2 依赖）
│   ├── ql/
│   │   ├── promql.py        # [+]: validate_promql()
│   │   ├── logql.py         # [+]: validate_logql()
│   │   └── traceql.py       # [+]: validate_traceql()
│   ├── mimir.py             # [改]: 继承 ToolSpec，实现 validate + execute
│   ├── loki.py              # [改]: 同上
│   └── tempo.py             # [改]: 同上
└── observability/
    └── metrics.py           # [+]: ToolCallMetric 埋点
```

**system prompt 增强**（`prompts.py`）：把当前可用 metric/label 目录的摘要注入 prompt，从源头降低首次错误率：
```
你可以查询以下指标: http_requests_total, grpc_* , go_* ...
可用 label: service, status, code, instance
当查询失败时，你会收到结构化错误 JSON，请据此修正查询，最多重试 3 次。
若证据不足，请在报告中明确标注，不要臆测。
```

---

## 7. 关键代码骨架

### 7.1 ToolSpec 基类（统一校验/执行契约）

```python
# tools/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel

class ValidationResult(BaseModel):
    ok: bool
    error_type: str | None = None
    message: str | None = None
    hint: str | None = None

class ToolSpec(ABC):
    name: str
    ql_field: str               # "query" | "query_keyword"
    args_model: type[BaseModel]  # Pydantic schema -> 转 LLM tools 定义

    @abstractmethod
    def validate(self, ql: str, catalog: "MetricCatalog") -> ValidationResult: ...

    @abstractmethod
    async def execute(self, args: dict, ctx: "CallContext") -> "ToolResult": ...

    def to_structured_error(self, vr: ValidationResult, attempt: int) -> dict:
        return {
            "status": "error", "tool": self.name,
            "error_type": vr.error_type, "message": vr.message,
            "hint": vr.hint, "retry_allowed": attempt < 3, "attempt": attempt,
        }
```

### 7.2 SafeToolExecutor（四层包装主入口）

```python
# agent/safe_executor.py
from cachetools import TTLCache

class SafeToolExecutor:
    def __init__(self, cfg, catalog):
        self.cfg = cfg
        self.catalog = catalog
        self.cache = TTLCache(maxsize=512, ttl=cfg.cache_ttl_default)

    async def dispatch(self, spec: ToolSpec, args: dict, ctx) -> dict:
        # ① 预算预检
        if ctx.budget_exhausted():
            return self._graceful_finalize(ctx)

        key = cache_key(spec.name, args)
        if key in self.cache:                      # ② 缓存命中
            ctx.record(outcome="cache_hit"); return self.cache[key]

        ql = args.get(spec.ql_field, "")
        vr = spec.validate(ql, self.catalog)       # ③ 预校验
        if not vr.ok:
            return self._selfheal(spec, args, ctx, vr)  # ④ 自修正

        result = await self._exec_with_retry(spec, args, ctx)  # ⑤ 执行
        if result.ok:
            self.cache[key] = result.payload       # ⑥ 缓存写入
        ctx.record(outcome=result.outcome, latency=result.latency)
        ctx.spend_budget(tokens=result.tokens, calls=1, seconds=result.latency_s)
        return result.payload
```

（`_selfheal`、`_exec_with_retry`、`_graceful_finalize` 见 §4.4 与 §5.2 描述，省略实现细节。）

---

## 8. 测试策略

| 层次 | 内容 |
|---|---|
| 单测 | 三类 QL 校验器：合法/非法/边界用例各 ≥10；`cache_key` 归一化与时间桶对齐；预算扣减与耗尽判定 |
| 单测 | `ValidationResult.to_structured_error` 结构稳定（LLM 可解析契约） |
| 集成 | 自修正闭环：mock LLM 先返回错误 QL、再返回正确 QL，断言最终成功且 `self_healed=True`；mock LLM 始终错误，断言 3 次后 `failed` 且 RCA 标注证据缺失 |
| 混沌 | mock 后端 5xx/超时/429，验证退避重试与回灌；验证不向前端抛 500（PRD 红线） |
| 预算 | 构造长会话，断言超预算后优雅收尾、RCA 含"未完成查询"标注 |
| 缓存 | 同一 (query,time) 二次调用命中缓存；近实时窗口 TTL 短于历史窗口 |

---

## 9. 与其他创意的协同

- **D-1 证据可下钻 Timeline**：结构化错误（§4.2）让前端能渲染"失败→自修正→成功"的子步骤，强化信任。
- **D-5 诚实不确定性**：预算耗尽（§5.2）与自修正失败（§4.3）都强制在 RCA 标注，正是"不臆测"的工程落地。
- **E-3 工具注册表**：`ToolSpec` 基类（§7.1）即注册表的统一契约，本方案为 E-3 预先打好地基。
- **E-5 自观测**：`ToolCallMetric`（§5.3）是 dogfooding 的首批指标源。
- **PM-2 置信度升级**：可基于"自修正次数/证据完备度/预算是否耗尽"计算粗置信度，作为 MVP 期置信度信号的来源之一。

---

## 10. 落地里程碑（建议）

1. **Step 1**：`ToolSpec` 基类 + 三类 QL 的 L1 语法校验器 + 单测。（纯本地、无后端依赖，可先行）
2. **Step 2**：`SafeToolExecutor` 骨架 + 缓存 + 预算 + 优雅收尾，串入 `loop.py`。
3. **Step 3**：自修正闭环（结构化错误回灌 + `await_regenerated_args`）。
4. **Step 4**：`MetricCatalog`（L2 作用域校验）+ system prompt 注入元数据。
5. **Step 5**：`ToolCallMetric` 埋点 + 看板（喂 Mimir）。

Step 1~2 即可满足 PRD 红线"不中断"；Step 3~4 才是"自愈"价值的兑现；Step 5 用于持续验证 H1/H2 并驱动调优。
