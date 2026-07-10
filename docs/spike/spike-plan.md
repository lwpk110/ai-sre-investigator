# LLM QL 可行性 Spike 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 验证 LLM 能否把自然语言故障描述准确转化为 PromQL/LogQL/TraceQL，产出 GO/NO-GO 可行性报告。

**Architecture:** 构建一个独立 spike 工程：合成数据集（metric 目录 + 故障描述 + 期望 QL）→ LLM 生成器（OpenAI 兼容，支持云端 API 与本地 Ollama）→ 自动评分器（语法正确性 + 语义等价性）→ 报告生成器。不依赖真实观测后端，用合成数据验证 LLM 的 QL 生成能力这一产品命门假设。

**Tech Stack:** Python 3.12, openai SDK, Pydantic v2, pytest, ollama (本地模型备选)

## Global Constraints
- Python 3.12+，不引入 LangChain（遵循 ADR-001）
- 所有 LLM 调用用 openai 官方 SDK（兼容 Ollama 的 OpenAI 兼容端点）
- 用 Pydantic v2 定义数据结构
- 遵循 TDD：先写测试，再写实现

---

### Task 1: 合成数据集 -- metric 目录与故障样本

**Files:**
- Create: `spike/dataset/metric_catalog.py` -- 模拟 Mimir/Loki/Tempo 真实元数据
- Create: `spike/dataset/samples.py` -- 20+ 自然语言故障描述 + 期望 QL
- Create: `spike/dataset/__init__.py`
- Test: `spike/tests/test_dataset.py`

**Interfaces:**
- Produces: `MetricCatalog` (Pydantic model), `SAMPLES` (list of `FaultSample`)

- [ ] Step 1: 写测试验证数据集结构完整
- [ ] Step 2: 实现 metric_catalog.py（真实感 metric/label 目录）
- [ ] Step 3: 实现 samples.py（覆盖 Metrics/Logs/Traces 三类的 20+ 样本）
- [ ] Step 4: 运行测试确认通过
- [ ] Step 5: Commit

### Task 2: QL 生成器 -- 调用 LLM 生成查询

**Files:**
- Create: `spike/generator.py` -- LLM 调用 + prompt 构造
- Test: `spike/tests/test_generator.py`

**Interfaces:**
- Consumes: `MetricCatalog`, `FaultSample`
- Produces: `generate_ql(sample, catalog, client) -> GeneratedQL`

- [ ] Step 1: 写测试（mock LLM 响应，验证 prompt 构造与解析）
- [ ] Step 2: 实现 generator.py
- [ ] Step 3: 运行测试确认通过
- [ ] Step 4: Commit

### Task 3: 自动评分器 -- 评估生成 QL 质量

**Files:**
- Create: `spike/evaluator.py` -- 语法校验 + 语义评分
- Test: `spike/tests/test_evaluator.py`

**Interfaces:**
- Consumes: `GeneratedQL`, `FaultSample` (含 expected QL)
- Produces: `EvaluationResult` (score, syntax_ok, semantic_match, error_type)

- [ ] Step 1: 写测试（各类 QL 的正确/错误评分用例）
- [ ] Step 2: 实现 evaluator.py
- [ ] Step 3: 运行测试确认通过
- [ ] Step 4: Commit

### Task 4: 报告生成器 -- 汇总可行性结论

**Files:**
- Create: `spike/report.py` -- 聚合评分输出报告
- Test: `spike/tests/test_report.py`

**Interfaces:**
- Consumes: `list[EvaluationResult]`
- Produces: 可行性报告 Markdown

- [ ] Step 1: 写测试（验证报告结构与 GO/NO-GO 阈值判定）
- [ ] Step 2: 实现 report.py
- [ ] Step 3: 运行测试确认通过
- [ ] Step 4: Commit

### Task 5: 主运行器 -- 端到端执行

**Files:**
- Create: `spike/run.py` -- 串联数据集→生成→评分→报告
- Create: `spike/__init__.py`

- [ ] Step 1: 实现端到端运行入口
- [ ] Step 2: 手动验证全链路（用 Ollama 或 API key）
- [ ] Step 3: Commit

### Task 6: 运行 Spike 并产出报告

- [ ] Step 1: 用本地 Ollama 模型运行
- [ ] Step 2: 分析结果，产出可行性报告
- [ ] Step 3: 保存报告到 docs/
