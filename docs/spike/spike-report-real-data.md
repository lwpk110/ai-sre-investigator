# LLM QL 可行性 Spike 报告（真实生产数据）

**模型**: MiniMax-M3
**样本数**: 21
**总体准确率**: 76.7%
**语法通过率**: 100.0%
**语义匹配率**: 66.7%
**结论**: CONDITIONAL

## 分类型表现

| 类型 | 样本数 | 准确率 | PERFECT | GOOD | PARTIAL | FAIL |
|---|---|---|---|---|---|---|
| PromQL | 10 | 93.0% | 9 | 0 | 1 | 0 |
| LogQL | 7 | 70.0% | 4 | 0 | 3 | 0 |
| TraceQL | 4 | 47.5% | 1 | 0 | 3 | 0 |

## 逐条结果

| 样本 | 类型 | 评分 | 等级 | 语法 | 语义 | 备注 |
|---|---|---|---|---|---|---|
| real-prom-001 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-002 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-003 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-004 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-005 | promql | 0.3 | partial | ✅ | ❌ | missing metrics: {'jvm_gc_pause_sum'}; extra metrics: {'jvm_gc_duration_sum'} |
| real-prom-006 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-007 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-008 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-009 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-prom-010 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-log-001 | logql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-log-002 | logql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-log-003 | logql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-log-004 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'connection', 'exhausted'} |
| real-log-005 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'failed', 'auth'} |
| real-log-006 | logql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-log-007 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'sqlexception'} |
| real-trace-001 | traceql | 1.0 | perfect | ✅ | ✅ | exact match |
| real-trace-002 | traceql | 0.3 | partial | ✅ | ❌ | status: expected 'error', got 'None' |
| real-trace-003 | traceql | 0.3 | partial | ✅ | ❌ | span_name: expected '.*SQL.*', got 'SELECT.*' |
| real-trace-004 | traceql | 0.3 | partial | ✅ | ❌ | span_kind: expected 'client', got 'None' |

## 结论与建议

⚠️ **CONDITIONAL**: 部分达标，需针对性优化（few-shot/元数据注入/剧本约束）后再决策。

### 优化建议
- 分析 FAIL/PARTIAL 样本的错误类型分布，针对性增强 prompt
- 对低分类型增加 few-shot 示例
- 考虑引入自修正闭环（ADR-004）提升最终成功率