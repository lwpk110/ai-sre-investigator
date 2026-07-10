这是一份融合了最新业务痛点（“多对一”人力瓶颈、可观测性 QL 认知壁垒），并且在技术栈上严格剔除了冗杂的通用框架（如 LangChain），全面转向更轻量、原生的 AI 编程工具链生态（直接使用标准 Tool-Calling 或 MCP 协议）的终极版 PRD 与技术设计。

这份文档立意更高，不仅解决了“怎么做”的技术问题，更拔高了“为什么做”的组织与人效价值，你可以直接将其作为最终版本提交或投喂给 AI 辅助开发工具。

---

# AI SRE Investigator (MVP V1.0)

## 产品需求文档 (PRD) & 技术设计规范

## 1. 文档元数据

* **产品名称**：AI SRE Investigator (智能巡检助手)
* **当前版本**：V1.0 MVP
* **目标读者**：产品经理、架构师、Codex/Claude Code (全自动任务拆解与代码生成)
* **核心价值定位**：打破研发与 SRE 之间的“可观测性 QL 认知壁垒”，消除全员向 SRE 求助的“多对一”响应瓶颈，实现组织级降本增效。
* **核心演进方向**：从 MVP 的**确定性 Tool-Calling 状态环**，平滑演进到 **GOAP Agent / 完整 MCP (Model Context Protocol) 架构**。

---

## 2. 业务背景与核心痛点

当前私有数据中心已具备完善的 **Mimir (Metrics)、Loki (Logs)、Tempo (Traces)** 观测矩阵。但由于排查门槛极高，导致了严重的组织效能瓶颈：

1. **可观测性 QL 认知壁垒高**：绝大多数开发人员不懂且不熟悉复杂的 PromQL、LogQL 和 TraceQL 语法，排查高度依赖 SRE 预设的监控面板，一旦遇到深层问题便无从下手。
2. **“多对一”的人力响应灾难**：全公司的开发团队在遇到深层排查需求时，统一向极少数的 SRE 专家求助。SRE 团队每天疲于充当“人工查日志、写语句的客服”，承受极大的沟通与排查压力。
3. **排查耗时且缺乏标准沉淀**：人工跨系统（Mimir -> Loki -> Tempo）切换排查极度依赖个人“肌肉记忆”，且事后整理完整 RCA（根因分析）报告繁琐耗时，MTTR（平均修复时间）居高不下。

**产品目标**：通过 AI Agent，让开发人员用“大白话”即可调动所有底层可观测性平台，实现“自己的服务故障自己独立闭环”，彻底解放 SRE 生产力。

---

## 3. 系统边界与 MVP 范围

### 3.1 核心功能 (In Scope)

* **一语触发的 Chat 交互**：支持自然语言故障申告（如 `"payment-service 刚才为什么大量 500？"`）。
* **自动 QL 转化与执行**：Agent 自动将自然语言转化为精准的 PromQL/LogQL/Trace 查询并执行。
* **异步推理状态机与前端进度流**：展示 Agent 多步调用的思考和查询过程（Timeline）。
* **自动化 RCA 报告生成**：输出聚合了“指标、日志、链路证据链及根因推断”的结构化 Markdown 报告。

### 3.2 明确不包含 (Out of Scope)

* **不**直接修改集群或线上状态（无自愈、无扩缩容、不改配置）。
* **不**使用臃肿的过度封装框架。

---

## 4. 产品架构与原生 Tool-Calling 设计

为了确保最高效的执行流以及代码的极致可控性，**本方案坚决不使用一般性 Agent 框架，而是采用纯 Python + 标准 OpenAI 兼容 SDK 驱动的纯粹 Tool-Calling 闭环**。这为未来接入标准化 MCP 奠定基础。

```text
+-------------------------------------------------------------------------+
|                               Frontend (Next.js)                        |
|  [ Chat Input ]  ->  [ Execution Timeline ]  ->  [ RCA Report View ]    |
+-------------------------------------------------------------------------+
                                     |  (HTTP POST / SSE)
                                     v
+-------------------------------------------------------------------------+
|                         SRE Backend (FastAPI Core)                      |
|  +----------------------+  +---------------------+  +-----------------+ |
|  |   Session Manager    |  |  Tool-Calling Loop  |  |  RCA Generator  | |
|  +----------------------+  +---------------------+  +-----------------+ |
+-------------------------------------------------------------------------+
                                     | (Direct Tool/Function Invoke)
                                     v
+-------------------------------------------------------------------------+
|                    Native Agent Toolset (Mimir/Loki/Tempo)              |
+-------------------------------------------------------------------------+
          |                          |                          |
          v                          v                          v
    [Mimir API]                  [Loki API]                 [Tempo API]

```

---

## 5. 详细数据流与底层工具抽象 (Tool Specs)

Agent 需要清晰的工具定义，系统将向大模型暴露以下严格定义的 Schema。

### 5.1 Mimir Tool (指标探针)

* **目的**：将自然语言转化为 PromQL，或使用预置模板查询错误率/延迟。
* **接口参数**：`service_name` (str), `metric_type` (Enum: error_rate, latency, cpu, memory), `duration` (str, default: "1h")
* **返回**：当前指标值、是否越过阈值、波峰发生的确切时间戳。

### 5.2 Loki Tool (日志探针)

* **目的**：在锁定异常时间范围后，提取真实报错堆栈。
* **接口参数**：`service_name` (str), `query_keyword` (str, e.g., "Exception", "Timeout"), `start_time` (timestamp), `end_time` (timestamp)
* **返回**：命中的异常日志 Top 5 样本及总错误条数。

### 5.3 Tempo Tool (链路探针)

* **目的**：通过服务名或报错日志中的 TraceID，下钻到慢 Span。
* **接口参数**：`service_name` (str), `min_duration_ms` (int)
* **返回**：最慢的关联 TraceID、具体阻塞的 Span 名称（如某条慢 SQL）及耗时。

---

## 6. 技术栈与目录结构

**核心约束：保持轻量、无状态、云原生。**

* **Backend**: Python 3.12, FastAPI, Pydantic v2, HTTPX, `openai` (官方原生 SDK)。
* **Frontend**: Next.js (App Router), Tailwind CSS, React Markdown。

```text
sre-investigator/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── api/
│   │   │   └── chat.py             # 路由: 创建会话 & 轮询状态
│   │   ├── agent/
│   │   │   ├── loop.py             # 核心: 原生 Tool-Calling 循环 (无第三方框架封装)
│   │   │   └── prompts.py          # 系统 Prompt: SRE 专家人设设定
│   │   ├── tools/
│   │   │   ├── mimir.py            # Mimir HTTP Client
│   │   │   ├── loki.py             # Loki HTTP Client
│   │   │   └── tempo.py            # Tempo HTTP Client
│   │   └── config.py               # Pydantic Settings
│   └── requirements.txt
└── frontend/                       # 极简交互界面

```

---

## 7. Codex / Claude Code 启动指令

> **提示**：直接将以下指令内容粘贴给 AI 编码助手，即可开启“无干预”的全自动化代码生成。

```markdown
你是具备 10 年经验的资深 SRE 平台架构师与 Python 开发专家。请根据《AI SRE Investigator PRD V1.0》独立完成核心后端开发。

### 开发核心红线原则 (MUST DO)
1. **纯原生架构**：绝对禁止引入臃肿的封装框架。所有 Agent 推理和函数调用必须直接使用 `openai` 官方 Python SDK 进行原生的 Tool-Calling。
2. **容错与防御**：所有对 Mimir/Loki/Tempo 的 HTTPX 请求必须有 `timeout`，发生 5xx 时必须 `try-catch` 并向大模型返回结构化的失败原因，绝不能直接向前端抛出 500 导致 Agent 中断。

### 核心任务拆解
**Task 1: 环境与配置基座**
使用 `pydantic-settings` 建立配置类，读取 `MIMIR_URL`, `LOKI_URL`, `TEMPO_URL`, `LLM_API_KEY` 等环境变量。

**Task 2: 观测性工具层 (Tools)**
在 `tools/` 目录下实现 `query_mimir`, `search_loki`, `search_tempo` 三个纯 Python 异步函数，并使用 Pydantic 为其定义严谨的参数 Schema，用于后续转化为大模型的 `tools` 列表。

**Task 3: Agent Tool-Calling 循环层**
在 `agent/loop.py` 中实现核心循环：
- 接收自然语言。
- 将 Task 2 的函数作为 tools 传递给 LLM。
- 解析 LLM 的 `tool_calls` 返回，执行本地函数，将结果拼接到上下文中再次请求 LLM。
- 直到 LLM 停止调用工具，利用最终上下文，严格按照如下 Markdown 结构生成 RCA：
  # Incident Report
  ## 服务与问题
  ## 时间线
  ## 证据 (Metrics/Logs/Trace)
  ## 根因与修复建议

**Task 4: FastAPI 接口暴露**
提供 `POST /api/chat` (接收问题返回 session_id) 和 `GET /api/session/{id}` (返回时间线状态和最终报告)。

请确认理解，并优先输出 `backend/app/config.py` 及 `backend/app/tools/` 下的客户端基础代码。

```
