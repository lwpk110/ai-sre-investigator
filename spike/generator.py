"""LLM-based QL generator: converts natural language to PromQL/LogQL/TraceQL."""
from __future__ import annotations
import re
from pydantic import BaseModel

from spike.dataset.metric_catalog import MetricCatalog
from spike.dataset.samples import FaultSample, QLType


class GeneratedQL(BaseModel):
    sample_id: str
    query: str
    ql_type: QLType
    model: str
    raw_response: str = ""


def build_system_prompt(catalog: MetricCatalog) -> str:
    """Build the SRE-expert system prompt with metric catalog context."""
    return f"""你是一位资深 SRE 专家，精通可观测性查询语言。

你的任务：根据用户的自然语言故障描述，生成一条精确的查询语句。

可用观测性元数据：
{catalog.to_prompt_summary()}

规则：
1. 根据问题判断需要哪种查询语言：
   - 涉及"指标/错误率/延迟/CPU/内存/趋势"等 -> 生成 PromQL
   - 涉及"日志/报错/异常/关键词/堆栈"等 -> 生成 LogQL
   - 涉及"链路/trace/慢调用/span"等 -> 生成 TraceQL
2. 只使用上述元数据中存在的 metric 名和 label 名。
3. 时间窗口用方括号表示，如 [1h]、[30m]、[5m]。
4. LogQL 的 stream selector 必须用 {{service="xxx"}} 格式。
5. TraceQL 用 {{ service.name = "xxx" }} 格式。
6. 只输出查询语句本身，用 ```promql / ```logql / ```traceql 代码块包裹，不要解释。

示例：
用户: payment-service 最近1小时的 500 错误率
输出:
```promql
sum(rate(http_requests_total{{service="payment-service",status="500"}}[1h])) / sum(rate(http_requests_total{{service="payment-service"}}[1h]))
```"""


def _extract_code_block(text: str) -> str | None:
    """Extract content from a markdown code block."""
    match = re.search(r'```(?:promql|logql|traceql|ql)?\s*\n(.*?)```', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None


def parse_llm_response(response: str, ql_type: QLType) -> str:
    """Parse the LLM response to extract the QL query."""
    # Try code block first
    extracted = _extract_code_block(response)
    if extracted:
        return extracted

    # Fallback: treat entire response as query (strip whitespace)
    lines = [l.strip() for l in response.strip().splitlines() if l.strip()]
    # Filter out obvious non-query lines
    query_lines = [l for l in lines if not l.startswith(("用户", "输出", "Here", "这是", "希望"))]
    return "\n".join(query_lines).strip() if query_lines else response.strip()


async def generate_ql(
    sample: FaultSample,
    catalog: MetricCatalog,
    client,
    model: str = "gpt-4o-mini",
) -> GeneratedQL:
    """Call the LLM to generate a QL query from a natural language fault description."""
    system_prompt = build_system_prompt(catalog)
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
