"""Spike runner with REAL production data (OTel/Micrometer metrics + real service names)."""
from __future__ import annotations
import asyncio
import os
import sys
from openai import AsyncOpenAI

from spike.dataset.real_catalog import RealMetricCatalog
from spike.dataset.real_samples import REAL_SAMPLES
from spike.generator import GeneratedQL, parse_llm_response
from spike.dataset.samples import FaultSample, QLType
from spike.evaluator import evaluate, EvaluationResult, ScoreGrade
from spike.report import generate_report


def build_real_system_prompt(catalog: RealMetricCatalog) -> str:
    """System prompt with REAL OTel/Micrometer metric metadata."""
    return f"""你是一位资深 SRE 专家，精通可观测性查询语言。

你的任务：根据用户的自然语言故障描述，生成一条精确的查询语句。

{catalog.to_prompt_summary()}

## 规则（必须严格遵守）

### 1. 查询语言选择
- "指标/错误率/延迟/CPU/内存/QPS/GC/连接池/Kafka" -> PromQL
- "日志/报错/异常/关键词/Exception/堆栈" -> LogQL
- "链路/trace/慢调用/span" -> TraceQL

### 2. PromQL 规则
- **指标名用真实的 Micrometer/OTel 名称**！
  HTTP: http_server_requests_count / http_server_requests_bucket（不是 http_requests_total）
  DB: db_client_connections_usage（不是 db_connections_in_use）
- **服务用 `application` label**（不是 service）！
  正确：http_server_requests_count{{application="tendata-crm-service"}}
  错误：http_requests_total{{service="tendata-crm-service"}}
- **分位数用 `_bucket` 后缀**：
  histogram_quantile(0.99, sum(rate(http_server_requests_bucket{{...}}[...])) by (le))
- **时间窗口从描述提取**：最近1小时=[1h]，过去30分钟=[30m]
- **counter 类用 rate()**：http_server_requests_count 必须用 rate() 包裹

### 3. LogQL 规则
- stream selector 用 **`service_name`** label（不是 service）！
  正确：{{service_name="tendata-crm-service"}} |= "Exception"
  错误：{{service="tendata-crm-service"}} |= "Exception"
- 关键词用原始字符串，不改写

### 4. TraceQL 规则
- 用 {{ service.name = "xxx" }} 格式
- 必须包含所有相关条件

### 5. 输出格式
只输出查询语句，用代码块包裹。

## 示例

用户: tendata-crm-customer-service 最近1小时的 500 错误率
```promql
sum(rate(http_server_requests_count{{application="tendata-crm-customer-service",status="500"}}[1h])) / sum(rate(http_server_requests_count{{application="tendata-crm-customer-service"}}[1h]))
```

用户: tendata-auth-service 过去30分钟的 p99 延迟
```promql
histogram_quantile(0.99, sum(rate(http_server_requests_bucket{{application="tendata-auth-service"}}[30m])) by (le))
```

用户: tendata-corp-service 当前数据库连接池使用量
```promql
db_client_connections_usage{{job="tendata-corp-service",state="used"}}
```

用户: tendata-crm-service 最近10分钟包含 Exception 的错误日志
```logql
{{service_name="tendata-crm-service"}} |= "Exception"
```

用户: tendata-crm-customer-service 超过 500ms 的慢调用链路
```traceql
{{ service.name = "tendata-crm-customer-service" }} && duration > 500ms
```"""


async def generate_ql_real(
    sample: FaultSample,
    catalog: RealMetricCatalog,
    client,
    model: str,
) -> GeneratedQL:
    """Call LLM with REAL data system prompt."""
    system_prompt = build_real_system_prompt(catalog)
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
        sample_id=sample.id, query=query, ql_type=sample.ql_type,
        model=model, raw_response=raw,
    )


async def run_spike_real(model: str | None = None, output_path: str = "docs/spike-report-real.md") -> None:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    base_url = os.environ.get("OPENAI_BASE_URL")
    model = model or os.environ.get("SPIKE_MODEL", "MiniMax-M3")

    if not api_key:
        print("ERROR: OPENAI_API_KEY not set"); sys.exit(1)

    client_kwargs = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = AsyncOpenAI(**client_kwargs)

    catalog = RealMetricCatalog()
    print(f"REAL spike starting: {len(REAL_SAMPLES)} samples, model={model}")

    results = []
    for i, sample in enumerate(REAL_SAMPLES, 1):
        print(f"  [{i}/{len(REAL_SAMPLES)}] {sample.id} ({sample.ql_type.value}) ... ", end="", flush=True)
        try:
            generated = await generate_ql_real(sample, catalog, client, model=model)
            result = evaluate(generated, sample)
            results.append(result)
            status = "✅" if result.semantic_match else ("⚠️" if result.syntax_ok else "❌")
            print(f"{status} score={result.score:.1f}")
        except Exception as e:
            results.append(EvaluationResult(
                sample_id=sample.id, ql_type=sample.ql_type, score=0.0,
                grade=ScoreGrade.FAIL, syntax_ok=False, semantic_match=False,
                notes=f"LLM error: {type(e).__name__}: {e}",
            ))
            print(f"💥 error: {type(e).__name__}")

    report = generate_report(results, model=model)
    md = report.to_markdown()
    md = md.replace("# LLM QL 可行性 Spike 报告",
                    "# LLM QL 可行性 Spike 报告（真实生产数据）")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"\n{'='*60}")
    print(f"Verdict: {report.verdict.value}")
    print(f"Overall accuracy: {report.overall_accuracy:.1%}")
    print(f"Semantic match: {report.semantic_match_rate:.1%}")
    print(f"{'='*60}")
    print(f"Report: {output_path}")


if __name__ == "__main__":
    asyncio.run(run_spike_real())
