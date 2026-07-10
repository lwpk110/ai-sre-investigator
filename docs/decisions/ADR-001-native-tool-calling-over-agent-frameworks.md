# ADR-001: 采用原生 Tool-Calling 而非 Agent 框架

## Status
Accepted

## Date
2026-07-09

## Context
AI SRE Investigator 的核心是让 Agent 把自然语言转化为 PromQL/LogQL/TraceQL 并跨 Mimir/Loki/Tempo 多步排查。我们需要选择 Agent 推理与函数调用的实现方式。

关键约束：
- **极致可控性**：生产 SRE 场景对推理流的可见、可调试、可约束要求极高。
- **执行效率**：排查是多步长链路，框架抽象层会引入延迟与不可控开销。
- **演进方向**：PRD 明确未来要平滑迁移到 MCP (Model Context Protocol) / GOAP Agent，当前实现需为此铺路而非制造迁移债务。
- **团队认知**：SRE/后端团队精通 Python 与 HTTP，对繁重的 Agent 抽象学习曲线敏感。

## Decision
**采用纯 Python + 标准 OpenAI 兼容 SDK 驱动的原生 Tool-Calling 闭环，坚决不引入 LangChain 等过度封装框架。**

具体含义：直接使用 `openai` 官方 SDK 的 `tool_calls` 机制，在 `agent/loop.py` 自行实现"接收自然语言 -> 把工具 schema 传给 LLM -> 解析 `tool_calls` -> 本地执行函数 -> 结果拼回上下文再次请求"的核心循环。

## Alternatives Considered

### LangChain / LangGraph
- Pros：生态成熟，预置大量工具与 chain 抽象，上手快。
- Cons：抽象层层堆叠，推理流黑盒化，调试与定制困难；版本迭代频繁导致接口不稳定；对生产可控性是负资产。
- Rejected：SRE 场景要求每一步推理可观测、可约束，黑盒框架与"极致可控"约束直接冲突。

### AutoGen / 多 Agent 编排框架
- Pros：天然支持多 Agent 协作与角色分工。
- Cons：MVP 阶段单 Agent + 多 Tool 已能覆盖排查闭环，多 Agent 编排属过度设计；编排框架同样引入抽象债务。
- Rejected：当前规模不需要多 Agent，复杂度不匹配。

### 直接用 MCP（现在就上）
- Pros：标准化协议，长期方向正确。
- Cons：MCP 生态与工具链在私有数据中心可观测性场景尚未成熟；MVP 需快速验证价值，过早绑定协议有风险。
- Rejected（暂缓）：通过 ADR-003 的 `ToolSpec` 统一契约为未来 MCP 迁移预留接口，而非现在直接上 MCP。见 ADR-003。

## Consequences
- 正向：推理循环完全透明、可单步调试、可自由插入校验/缓存/预算（见 ADR-004）；代码量小、依赖少、易审查。
- 正向：迁移 MCP 时只需替换 transport 层，业务逻辑不受影响（前提是 ADR-003 的抽象落地）。
- 负向：Tool-Calling 循环、上下文管理、错误回灌等需自行实现，初期工程量略高于"套框架"。
- 负向：失去框架预置工具生态，需自建 Mimir/Loki/Tempo 客户端（见 ADR-006 技术栈）。
- 约束：循环必须自带防失控机制（预算/重试上限），否则原生循环可能无限消耗 token——由 ADR-004 的 SafeToolExecutor 解决。
