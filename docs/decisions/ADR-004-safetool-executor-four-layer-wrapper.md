# ADR-004: SafeToolExecutor 四层包装作为工具调度统一外壳

## Status
Accepted

## Date
2026-07-09

## Context
原生 Tool-Calling 循环（ADR-001）若直接调用工具，存在三类生产风险：
1. LLM 生成的 QL 本身有错（语法/作用域），直接执行会触发后端报错或返回无意义结果误导根因推断。
2. 观测后端查询又慢又重，重复查询会拖垮后端或烧爆成本。
3. 失控的 tool-call 循环会无限消耗 token 与时间。

PRD 红线要求"5xx 必须 try-catch 并回灌原因，绝不向前端抛 500 导致 Agent 中断"。但仅"不崩"不足以支撑可靠生产排查。

## Decision
**在 `agent/loop.py` 调度每个工具处插入 `SafeToolExecutor` 统一包装层，串起四道关卡，对所有 `ToolSpec`（ADR-003）透明生效：**

1. **预算预检**：会话级 token / tool 次数 / 耗时三类预算，超限不再发起新 tool。
2. **查询缓存**：按 (tool, 归一化query, 时间桶, service) 缓存成功结果，TTL 按窗口新鲜度分级（近实时 30s / 历史 10min）。
3. **QL 预校验**：L1 语法（本地 parser）+ L2 作用域（MetricCatalog 元数据缓存），失败转第 4 步。
4. **失败自修正循环**：结构化错误回灌 LLM 重生成，单 tool 最多 3 次；执行带 timeout + 指数退避重试。

详见 `docs/tech-design-ql-selfheal.md`。

## Alternatives Considered

### 仅实现 PRD 红线（try-catch + 回灌），不做预校验/缓存/预算
- Pros：实现最简，满足"不中断"。
- Cons：QL 首次错误率高，频繁中断或返回无意义结果；重复查询拖垮后端；失控循环烧爆成本。生产可用性不足。
- Rejected：把红线从"不崩"升级为"自愈 + 可控"是产品能上生产的前置工程门槛。

### 把校验/缓存/预算逻辑散落到每个工具实现里
- Pros：无需统一外壳。
- Cons：行为不一致、重复代码、易遗漏防护、难测试；与 ADR-003 的统一契约目标冲突。
- Rejected：违反 DRY 与一致性，且新增工具防护无法自动复用。

### 用框架中间件（如 LangChain callback）实现
- Pros：框架原生支持。
- Cons：与 ADR-001（原生、无框架）冲突。
- Rejected。

## Consequences
- 正向：所有工具自动获得预校验/自修正/缓存/预算防护，行为一致。
- 正向：缓存避免重复查询打观测后端；预算防失控；自修正提升首次成功率。
- 正向：`ToolCallMetric` 埋点天然成为 dogfooding 首批数据源（brainstorm E-5）。
- 负向：四层包装增加单次调用的代码路径复杂度，需充分单测与集成测试覆盖。
- 约束：缓存 key 归一化与时间桶策略需谨慎设计，否则命中率低或数据过时；预算阈值需基于真实负载调优。
- 待验证假设：H1 自修正成功率 ≥70%；H2 缓存收益 > 复杂度成本（见技术设计 §1）。
