"""Enhanced QL generator v2 with few-shot examples and stronger constraints.

Optimizations based on MiniMax-M3 error analysis:
1. Histogram bucket rule: p99/p95 latency -> use _bucket suffix metric
2. Time window extraction: explicitly extract from natural language
3. LogQL keyword matching: use exact keywords from the question
4. TraceQL completeness: always include all relevant conditions
5. Few-shot examples for each weak QL type
"""
from __future__ import annotations
import re
from pydantic import BaseModel

from spike.dataset.metric_catalog import MetricCatalog
from spike.dataset.samples import FaultSample, QLType
from spike.generator import GeneratedQL, parse_llm_response


def build_system_prompt_v2(catalog: MetricCatalog) -> str:
    """Enhanced system prompt with few-shot and explicit rules."""
    return f"""你是一位资深 SRE 专家，精通可观测性查询语言。

你的任务：根据用户的自然语言故障描述，生成一条精确的查询语句。

## 可用观测性元数据
{catalog.to_prompt_summary()}

## 关键规则（必须严格遵守）

### 1. 查询语言选择
- "指标/错误率/延迟/CPU/内存/趋势/QPS" -> PromQL
- "日志/报错/异常/关键词/堆栈/Exception" -> LogQL
- "链路/trace/慢调用/span" -> TraceQL

### 2. PromQL 规则
- **直方图分位数**：p99/p95/p90 延迟必须用 `_bucket` 后缀的 metric！
  正确：histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{{...}}[...])) by (le))
  错误：histogram_quantile(0.99, sum(rate(http_request_duration_seconds{{...}}[...])) by (le))
- **时间窗口**：必须从用户描述中精确提取时间范围！
  "最近1小时" -> [1h]，"过去30分钟" -> [30m]，"最近2小时" -> [2h]，"过去5分钟" -> [5m]
- **counter 类指标**（_total 后缀）必须用 rate() 或 increase() 包裹，不能直接查
- 只使用元数据中存在的 metric 名和 label 名
- 查询当前瞬时值（如"当前内存""当前连接数"）不要加时间窗口 []，直接查指标

### 3. LogQL 规则
- stream selector 必须用 {{service="xxx"}} 格式
- **关键词匹配**：必须使用用户描述中的原始关键词，不要改写或翻译！
  用户说 "Exception" -> |= "Exception"（不是 |= "异常"）
  用户说 "Timeout" -> |= "Timeout"
  用户说 "connection refused" -> |= "connection refused"
  用户说 "OOM" -> |= "OOM"，用户说 "Out of memory" -> |= "Out of memory"
- 多个关键词用多个 |= 连接
- 可加 | json 解析 JSON 日志

### 4. TraceQL 规则
- 格式：{{ service.name = "xxx" }} && 条件
- **必须包含所有相关条件**，不要遗漏：
  - 慢调用：duration > Xms
  - 错误链路：status = error
  - 慢SQL：span.name =~ ".*SQL.*" && duration > Xs
  - 上游调用失败：status = error && span.kind = client
- duration 单位：毫秒用 ms，秒用 s（500ms, 1s）

### 5. 输出格式
只输出查询语句本身，用代码块包裹，不要任何解释。

## 示例

用户: payment-service 最近1小时的 500 错误率
```promql
sum(rate(http_requests_total{{service="payment-service",status="500"}}[1h])) / sum(rate(http_requests_total{{service="payment-service"}}[1h]))
```

用户: order-service 过去30分钟的 p99 延迟
```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{{service="order-service"}}[30m])) by (le))
```

用户: payment-service 最近10分钟内的异常日志，关键词 Exception
```logql
{{service="payment-service"}} |= "Exception" | json
```

用户: order-service 过去30分钟包含 Timeout 的错误日志
```logql
{{service="order-service", level="error"}} |= "Timeout"
```

用户: payment-service 超过 500ms 的慢调用链路
```traceql
{{ service.name = "payment-service" }} && duration > 500ms
```

用户: order-service 中有错误的链路
```traceql
{{ service.name = "order-service" }} && status = error
```

用户: inventory-service 中 SQL 查询超过 1 秒的 span
```traceql
{{ service.name = "inventory-service" }} && span.name =~ ".*SQL.*" && duration > 1s
```"""


async def generate_ql_v2(
    sample: FaultSample,
    catalog: MetricCatalog,
    client,
    model: str = "MiniMax-M3",
) -> GeneratedQL:
    """Call LLM with enhanced v2 prompt."""
    system_prompt = build_system_prompt_v2(catalog)
    user_msg = f"服务: {sample.service_name}\n问题: {sample.natural_language}"

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
    )

    raw = response.choices[0].message.content
    query = parse_llm_response(raw, sample.ql_type)

    return GeneratedQL(
        sample_id=sample.id,
        query=query,
        ql_type=sample.ql_type,
        model=model,
        raw_response=raw,
    )
