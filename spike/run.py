"""End-to-end spike runner: dataset -> generate -> evaluate -> report.

Configuration via environment variables (code never touches plaintext keys):
  OPENAI_API_KEY   - Your API key (required)
  OPENAI_BASE_URL  - Override for OpenAI-compatible providers (optional)
                     e.g. https://dashscope.aliyuncs.com/compatible-mode/v1
                          https://api.deepseek.com
                          https://openrouter.ai/api/v1
  SPIKE_MODEL      - Model name (default: gpt-4o-mini)

Usage:
  export OPENAI_API_KEY="sk-xxx"
  export OPENAI_BASE_URL="https://api.deepseek.com"   # optional
  export SPIKE_MODEL="deepseek-chat"                   # optional
  python -m spike.run
"""
from __future__ import annotations
import asyncio
import os
import sys
from openai import AsyncOpenAI

from spike.dataset.metric_catalog import MetricCatalog
from spike.dataset.samples import SAMPLES
from spike.generator import generate_ql
from spike.evaluator import evaluate
from spike.report import generate_report


async def run_spike(model: str | None = None, output_path: str = "docs/spike-report.md") -> None:
    """Run the full feasibility spike pipeline."""
    # Resolve config from environment
    api_key = os.environ.get("OPENAI_API_KEY", "")
    base_url = os.environ.get("OPENAI_BASE_URL")
    model = model or os.environ.get("SPIKE_MODEL", "gpt-4o-mini")

    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not set.")
        print()
        print("Configure your provider:")
        print("  # OpenAI")
        print('  export OPENAI_API_KEY="sk-xxx"')
        print('  export SPIKE_MODEL="gpt-4o-mini"')
        print()
        print("  # DeepSeek")
        print('  export OPENAI_API_KEY="sk-xxx"')
        print('  export OPENAI_BASE_URL="https://api.deepseek.com"')
        print('  export SPIKE_MODEL="deepseek-chat"')
        print()
        print("  # DashScope (Qwen)")
        print('  export OPENAI_API_KEY="sk-xxx"')
        print('  export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"')
        print('  export SPIKE_MODEL="qwen-plus"')
        sys.exit(1)

    # Build client (supports any OpenAI-compatible provider via base_url)
    client_kwargs = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = AsyncOpenAI(**client_kwargs)

    catalog = MetricCatalog.default()
    print(f"Spike starting: {len(SAMPLES)} samples, model={model}")
    if base_url:
        print(f"  base_url={base_url}")

    results = []
    for i, sample in enumerate(SAMPLES, 1):
        print(f"  [{i}/{len(SAMPLES)}] {sample.id} ({sample.ql_type.value}) ... ", end="", flush=True)
        try:
            generated = await generate_ql(sample, catalog, client, model=model)
            result = evaluate(generated, sample)
            results.append(result)
            status = "✅" if result.semantic_match else ("⚠️" if result.syntax_ok else "❌")
            print(f"{status} score={result.score:.1f}")
        except Exception as e:
            # Record failure without crashing the whole spike
            from spike.evaluator import EvaluationResult, ScoreGrade
            results.append(EvaluationResult(
                sample_id=sample.id, ql_type=sample.ql_type, score=0.0,
                grade=ScoreGrade.FAIL, syntax_ok=False, semantic_match=False,
                notes=f"LLM call error: {type(e).__name__}: {e}",
            ))
            print(f"💥 error: {type(e).__name__}")

    # Generate report
    report = generate_report(results, model=model)
    md = report.to_markdown()

    # Save report
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
    asyncio.run(run_spike())
