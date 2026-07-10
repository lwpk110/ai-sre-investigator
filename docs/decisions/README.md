# Architecture Decision Records (ADRs)

本目录记录 AI SRE Investigator 的重大架构决策。ADR 捕获决策的**为什么**（上下文、约束、权衡、被拒方案），而非代码本身。

> 规范来源：`documentation-and-adrs` skill。模板见各 ADR 文件的 Status / Date / Context / Decision / Alternatives Considered / Consequences 结构。

## 索引

| 编号 | 标题 | 状态 | 主题 |
|---|---|---|---|
| [ADR-001](ADR-001-native-tool-calling-over-agent-frameworks.md) | 采用原生 Tool-Calling 而非 Agent 框架 | Accepted | 架构范式 |
| [ADR-002](ADR-002-read-only-investigation-scope.md) | 只读排查边界--不修改任何线上状态 | Accepted | 系统边界 |
| [ADR-003](ADR-003-toolspec-unified-contract-for-mcp.md) | ToolSpec 统一契约与可插拔注册表，为 MCP 演进铺路 | Accepted | 抽象设计 |
| [ADR-004](ADR-004-safetool-executor-four-layer-wrapper.md) | SafeToolExecutor 四层包装作为工具调度统一外壳 | Accepted | 可靠性 |
| [ADR-005](ADR-005-graceful-failure-partial-rca-no-500.md) | 优雅收尾--失败/预算耗尽生成部分 RCA，绝不抛 500 | Accepted | 可靠性 |
| [ADR-006](ADR-006-tech-stack-selection.md) | 技术栈选型 | Accepted | 技术栈 |

## 生命周期

```
PROPOSED -> ACCEPTED -> (SUPERSEDED 或 DEPRECATED)
```

- **不要删除旧 ADR**，它们承载历史上下文。
- 决策变更时，新建一份 ADR 引用并 supersede 旧的那份，旧 ADR 状态改为 `Superseded by ADR-XXX`。

## 何时写 ADR

- 选择框架/库/重大依赖
- 设计数据模型或 schema
- 选择 API 架构
- 任何"回退成本高"的决策

详见 `documentation-and-adrs` skill 的 SKILL.md。

## 关联文档

- `docs/PRD.md` -- 产品需求文档（决策的上游输入）
- `docs/brainstorm-ideas.md` -- 产品创意发散（Top 5 创意，部分已转化为 ADR）
- `docs/tech-design-ql-selfheal.md` -- ADR-004 的详细技术设计
