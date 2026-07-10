"""Generate feasibility report from evaluation results."""
from __future__ import annotations
from enum import Enum
from pydantic import BaseModel

from spike.evaluator import EvaluationResult, ScoreGrade
from spike.dataset.samples import QLType


# Thresholds for GO/NO-GO decision
GO_THRESHOLD = 0.80          # >= 80% accuracy -> GO
NO_GO_THRESHOLD = 0.30       # < 30% -> NO-GO
# In between -> CONDITIONAL


class FeasibilityVerdict(str, Enum):
    GO = "GO"
    NO_GO = "NO-GO"
    CONDITIONAL = "CONDITIONAL"


class FeasibilityReport(BaseModel):
    model: str
    total_samples: int
    overall_accuracy: float
    syntax_pass_rate: float
    semantic_match_rate: float
    verdict: FeasibilityVerdict
    by_type: dict[QLType, dict]  # {ql_type: {accuracy, total, perfect, good, partial, fail}}
    results: list[EvaluationResult]

    def to_markdown(self) -> str:
        lines = [
            "# LLM QL 可行性 Spike 报告",
            "",
            f"**模型**: {self.model}",
            f"**样本数**: {self.total_samples}",
            f"**总体准确率**: {self.overall_accuracy:.1%}",
            f"**语法通过率**: {self.syntax_pass_rate:.1%}",
            f"**语义匹配率**: {self.semantic_match_rate:.1%}",
            f"**结论**: {self.verdict.value}",
            "",
            "## 分类型表现",
            "",
            "| 类型 | 样本数 | 准确率 | PERFECT | GOOD | PARTIAL | FAIL |",
            "|---|---|---|---|---|---|---|",
        ]
        type_names = {QLType.PROMQL: "PromQL", QLType.LOGQL: "LogQL", QLType.TRACEQL: "TraceQL"}
        for ql_type in [QLType.PROMQL, QLType.LOGQL, QLType.TRACEQL]:
            if ql_type in self.by_type:
                d = self.by_type[ql_type]
                lines.append(
                    f"| {type_names[ql_type]} | {d['total']} | {d['accuracy']:.1%} | "
                    f"{d['perfect']} | {d['good']} | {d['partial']} | {d['fail']} |"
                )

        lines += ["", "## 逐条结果", "", "| 样本 | 类型 | 评分 | 等级 | 语法 | 语义 | 备注 |", "|---|---|---|---|---|---|---|"]
        for r in self.results:
            lines.append(
                f"| {r.sample_id} | {r.ql_type.value} | {r.score:.1f} | {r.grade.value} | "
                f"{'✅' if r.syntax_ok else '❌'} | {'✅' if r.semantic_match else '❌'} | {r.notes} |"
            )

        lines += ["", "## 结论与建议", ""]
        if self.verdict == FeasibilityVerdict.GO:
            lines.append("✅ **GO**: LLM QL 生成能力达标，产品方向可行。建议进入编码阶段。")
        elif self.verdict == FeasibilityVerdict.CONDITIONAL:
            lines.append("⚠️ **CONDITIONAL**: 部分达标，需针对性优化（few-shot/元数据注入/剧本约束）后再决策。")
            lines.append("")
            lines.append("### 优化建议")
            lines.append("- 分析 FAIL/PARTIAL 样本的错误类型分布，针对性增强 prompt")
            lines.append("- 对低分类型增加 few-shot 示例")
            lines.append("- 考虑引入自修正闭环（ADR-004）提升最终成功率")
        else:
            lines.append("❌ **NO-GO**: LLM QL 生成能力不足，需重新评估产品方向或换用更强模型。")

        return "\n".join(lines)


def generate_report(results: list[EvaluationResult], model: str) -> FeasibilityReport:
    """Aggregate evaluation results into a feasibility report."""
    total = len(results)
    if total == 0:
        return FeasibilityReport(
            model=model, total_samples=0, overall_accuracy=0.0,
            syntax_pass_rate=0.0, semantic_match_rate=0.0,
            verdict=FeasibilityVerdict.NO_GO, by_type={}, results=[],
        )

    scores = [r.score for r in results]
    overall = sum(scores) / total
    syntax_rate = sum(1 for r in results if r.syntax_ok) / total
    semantic_rate = sum(1 for r in results if r.semantic_match) / total

    # Per-type breakdown
    by_type: dict[QLType, dict] = {}
    for ql_type in QLType:
        type_results = [r for r in results if r.ql_type == ql_type]
        if not type_results:
            continue
        type_scores = [r.score for r in type_results]
        by_type[ql_type] = {
            "accuracy": sum(type_scores) / len(type_scores),
            "total": len(type_results),
            "perfect": sum(1 for r in type_results if r.grade == ScoreGrade.PERFECT),
            "good": sum(1 for r in type_results if r.grade == ScoreGrade.GOOD),
            "partial": sum(1 for r in type_results if r.grade == ScoreGrade.PARTIAL),
            "fail": sum(1 for r in type_results if r.grade == ScoreGrade.FAIL),
        }

    # Verdict
    if overall >= GO_THRESHOLD:
        verdict = FeasibilityVerdict.GO
    elif overall < NO_GO_THRESHOLD:
        verdict = FeasibilityVerdict.NO_GO
    else:
        verdict = FeasibilityVerdict.CONDITIONAL

    return FeasibilityReport(
        model=model,
        total_samples=total,
        overall_accuracy=overall,
        syntax_pass_rate=syntax_rate,
        semantic_match_rate=semantic_rate,
        verdict=verdict,
        by_type=by_type,
        results=results,
    )
