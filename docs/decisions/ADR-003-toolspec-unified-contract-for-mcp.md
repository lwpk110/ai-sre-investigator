# ADR-003: ToolSpec 统一契约与可插拔注册表，为 MCP 演进铺路

## Status
Accepted

## Date
2026-07-09

## Context
PRD 明确演进方向：从 MVP 的确定性 Tool-Calling 状态环，平滑迁移到完整 MCP (Model Context Protocol) / GOAP Agent 架构。当前有三个工具（Mimir/Loki/Tempo），未来会扩展（Prometheus、Elasticsearch、Kubernetes 等）。

若每个工具各自实现校验、执行、错误处理、Schema 定义，会出现：
- 重复代码与行为不一致。
- 新增工具成本高、易遗漏防护。
- 迁移 MCP 时需逐个改造，迁移债务大。

## Decision
**定义 `ToolSpec` 统一抽象基类，所有工具遵循同一契约：`name` / `ql_field` / `args_model`(Pydantic) / `validate()` / `execute()` / `to_structured_error()`。** 工具以可插拔方式注册到统一注册表，调度层（SafeToolExecutor，见 ADR-004）对所有工具透明地施加校验/缓存/预算。

`ToolSpec` 的 Schema 设计与 MCP server 的 tool schema 对齐，使未来"原生 Tool-Calling -> MCP"只需替换 transport 层，业务逻辑（validate/execute）不变。

## Alternatives Considered

### 每个工具独立实现，无统一抽象
- Pros：初期最快，无需设计基类。
- Cons：校验/错误格式/缓存行为各自为政，行为不一致；新增工具需复制粘贴防护逻辑，易遗漏；迁移 MCP 逐个改造，债务大。
- Rejected：与"为 MCP 演进铺路"目标冲突，短期省事长期还债。

### 现在就直接实现为 MCP server
- Pros：一步到位，长期方向正确。
- Cons：MCP 在私有可观测性场景生态未成熟；MVP 需快速验证，过早绑定协议风险高；MCP server 的运行模型与当前 FastAPI 单体集成需额外设计。
- Rejected（暂缓）：通过 `ToolSpec` 契约对齐 MCP schema，先以原生 Tool-Calling 跑通价值，再平滑替换 transport。见 ADR-001。

### 用字典/配置式注册而非类型化基类
- Pros：更轻量。
- Cons：失去类型安全与 IDE 支持；validate/execute 行为无法用类型约束保证一致。
- Rejected：与 PRD"Pydantic 严谨 Schema"原则不符。

## Consequences
- 正向：所有工具共享统一的校验/执行/错误契约，行为一致、可单测。
- 正向：新增工具只需继承 `ToolSpec` 实现两个方法 + 注册，防护逻辑（缓存/预算/自修正）自动复用。
- 正向：迁移 MCP 时业务逻辑零改动，只换 transport——迁移成本最小化。
- 负向：需前期设计基类与契约，增加少量抽象成本。
- 约束：`ToolSpec` 契约一旦被多个工具依赖，变更需向后兼容；契约演进需走 ADR。
