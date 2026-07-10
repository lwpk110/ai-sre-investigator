"""Spike runner v2: uses enhanced prompt with few-shot examples."""
from __future__ import annotations
import asyncio
import os
import sys
from openai import AsyncOpenAI

from spike.dataset.metric_catalog import MetricCatalog
from spike.dataset.samples import SAMPLES
from spike.generator_v2 import generate_ql_v2
from spike.evaluator import evaluate, EvaluationResult, ScoreGrade
from spike.report import generate_report


async def run_spike_v2(model: str | None = None, output_path: str = "docs/spike-report-v2.md") -> None:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    base_url = os.environ.get("OPENAI_BASE_URL")
    model = model or os.environ.get("SPIKE_MODEL", "MiniMax-M3")

    if not api_key:
        print("ERROR: OPENAI_API_KEY not set"); sys.exit(1)

    client_kwargs = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = AsyncOpenAI(**client_kwargs)

    catalog = MetricCatalog.default()
    print(f"Spike v2 (optimized prompt) starting: {len(SAMPLES)} samples, model={model}")

    results = []
    for i, sample in enumerate(SAMPLES, 1):
        print(f"  [{i}/{len(SAMPLES)}] {sample.id} ({sample.ql_type.value}) ... ", end="", flush=True)
        try:
            generated = await generate_ql_v2(sample, catalog, client, model=model)
            result = evaluate(generated, sample)
            results.append(result)
            status = "✅" if result.semantic_match else ("⚠️" if result.syntax_ok else "❌")
            print(f"{status} score={result.score:.1f}")
        except Exception as e:
            results.append(EvaluationResult(
                sample_id=sample.id, ql_type=sample.ql_type, score=0.0,
                grade=ScoreGrade.FAIL, syntax_ok=False, semantic_match=False,
                notes=f"LLM call error: {type(e).__name__}: {e}",
            ))
            print(f"💥 error: {type(e).__name__}")

    report = generate_report(results, model=model)
    md = report.to_markdown()
    # Tag as v2
    md = md.replace("# LLM QL 可行性 Spike 报告", "# LLM QL 可行性 Spike 报告 (v2 优化轮)")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"\n{'='*60}")
    print(f"Verdict: {report.verdict.value}")
    print(f"Overall accuracy: {report.overall_accuracy:.1%}")
    print(f"Syntax pass rate: {report.syntax_pass_rate:.1%}")
    print(f"Semantic match rate: {report.semantic_match_rate:.1%}")
    print(f"{'='*60}")
    print(f"Report saved to {output_path}")


if __name__ == "__main__":
    asyncio.run(run_spike_v2())
