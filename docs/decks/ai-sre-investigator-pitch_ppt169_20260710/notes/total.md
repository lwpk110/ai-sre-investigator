# Speaker Notes — AI SRE Investigator Pitch Deck

> 内部立项评审 · 18-22 分钟 · 结论先行 · 引用 ADR 与可执行下一步

## P01 · Cover
- 一句话定位：用自然语言调动 Mimir/Loki/Tempo，自动生成结构化 RCA。
- 三件可观察的事：① 让一线开发独立闭环 ② 解放 SRE 生产力 ③ 为 MCP 演进铺路。
- 来源：PRD §2、README。
- 引导下一张：接下来用一句话讲清楚为什么这件事必须做。

## P02 · TL;DR
- 核心判断：把"全员找 SRE"变成"开发自己闭环"。
- 三个数字：80% 开发不熟 QL、1:N 挤兑、0 RCA 沉淀。
- 三条结论：自然语言到 RCA、只读+四层包装、原生 Tool-Calling。
- 引用：PRD §2 / ADR-001 / 002 / 003 / 004 / 005。
- 引导下一张：用一张对比图把痛点讲清楚。

## P03 · 痛点
- 三大痛点：QL 认知壁垒、多对一挤兑、RCA 沉淀缺失。
- 组织代价：MTTR 高、SRE 流失、复盘缺证据链、处置能力被锁死。
- 主桥：自然语言 → 自动 QL → 多步证据链 → 结构化 RCA · 一次排查产生的 RCA 同时是组织级资产。
- 引用：PRD §2、brainstorm §0。

## P04 · 价值主张
- Hero：让开发用"大白话"调动所有观测后端。
- 三个支撑：独立闭环、沉淀组织资产、解放 SRE。
- 边界声明：只读排查，绝不修改线上状态。
- 引用：PRD §2、brainstorm PM-1 / D-5、ADR-002。

## P05 · 架构总览
- 三层：Frontend（Next.js）/ Backend（FastAPI + 原生 Tool-Calling）/ Toolset（Mimir/Loki/Tempo）。
- Backend 核心模块：Session Manager、Tool-Calling Loop、RCA Generator、SafeToolExecutor。
- Toolset 统一契约 + 可插拔注册表，对齐 MCP。
- ADR 索引：一页串起 6 个 ADR。
- 引用：PRD §4、README 架构图、ADR-001/002/003/004/005/006。

## P06 · 核心创新 ① 原生 Tool-Calling
- 四步闭环：自然语言 → Tool Schema → 解析 tool_calls → 停止调用。
- 为什么拒绝框架：推理流可见、可约束、可调试；执行效率最优；为 MCP/GOAP 演进铺路。
- 引用：ADR-001、PRD §4/§7。

## P07 · 核心创新 ② ToolSpec + SafeToolExecutor
- 四道关卡：预算预检 / 查询缓存 / QL 预校验 / 失败自修正。
- 设计意义：四关透明生效、新工具零成本继承、把红线从"不崩"升级为"自愈+可控"。
- 引用：ADR-003/004、tech-design-ql-selfheal。

## P08 · 核心创新 ③ 优雅收尾
- 三类典型失败：QL 自修正耗尽、后端 5xx/超时、预算耗尽。
- 我们的处置：不崩、不静默、不臆测；用已收集证据生成"部分 RCA"；顶部显式标注证据缺口。
- 闭环：配合 D-5 诚实不确定性 + PM-2 置信度升级机制。
- 引用：ADR-005、brainstorm D-5 / PM-2。

## P09 · 端到端演示
- 场景：payment-service 刚才为什么大量 500？
- 六步链路：用户提问 → 查 Mimir（5xx）→ 锁定异常窗 → 查 Loki（堆栈）→ 查 Tempo（慢 Trace）→ 结构化 RCA。
- 报告结构：服务与问题 / 时间线 / 证据 / 根因+修复建议。
- 示例数据为示意，来源：PRD §5/§7 Task 3。

## P10 · 技术栈
- Backend：Python 3.12 + FastAPI + Pydantic v2 + HTTPX + openai SDK。
- Frontend：Next.js App Router + Tailwind + React Markdown + SSE 客户端。
- 四特质：异步优先、强类型、无状态云原生、Pydantic Schema → tools。
- 引用：ADR-006、PRD §6。

## P11 · Roadmap & 风险
- 四阶段：V1.0（本季度）→ V1.1（次季度）→ V2.0（半年+）→ 远期。
- 远期前置：置信度体系 + 人工闸门 + ADR-005（先读得准，再写得对）。
- 假设：H1 自修正成功率 ≥70%、H2 缓存收益 > 复杂度成本。
- 风险：LLM QL 错误率、观测后端 5xx、组织信任建立曲线。
- 成功标准：自闭环率、MTTR-Invest、SRE 被打扰次数。
- 引用：tech-design-ql-selfheal §1、brainstorm Top 5。

## P12 · Closing
- Hero：让每个开发都能独立闭环自己的故障。
- 副标：SRE 不再是"查日志客服"，而是平台工程师。
- 三个期望：阅读材料、立项目标、共同评审。
- 收尾语：我们不是替代 SRE，而是把 SRE 拉回最有杠杆的岗位。
