# LLM QL 可行性 Spike 报告

**模型**: MiniMax-M3
**样本数**: 21
**总体准确率**: 61.9%
**语法通过率**: 95.2%
**语义匹配率**: 47.6%
**结论**: CONDITIONAL

## 分类型表现

| 类型 | 样本数 | 准确率 | PERFECT | GOOD | PARTIAL | FAIL |
|---|---|---|---|---|---|---|
| PromQL | 10 | 79.0% | 7 | 0 | 3 | 0 |
| LogQL | 7 | 45.7% | 2 | 0 | 4 | 1 |
| TraceQL | 4 | 47.5% | 1 | 0 | 3 | 0 |

## 逐条结果

| 样本 | 类型 | 评分 | 等级 | 语法 | 语义 | 备注 |
|---|---|---|---|---|---|---|
| prom-001 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| prom-002 | promql | 0.3 | partial | ✅ | ❌ | missing metrics: {'http_request_duration_seconds_bucket'}; extra metrics: {'http_request_duration_seconds'} |
| prom-003 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| prom-004 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| prom-005 | promql | 0.3 | partial | ✅ | ❌ | time window mismatch: expected {'2h'}, got {'5m'} |
| prom-006 | promql | 0.3 | partial | ✅ | ❌ | missing metrics: {'process_resident_memory_bytes'}; extra metrics: {'sms_queue_length'}; time window mismatch: expected set(), got {'1h'} |
| prom-007 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| prom-008 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| prom-009 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| prom-010 | promql | 1.0 | perfect | ✅ | ✅ | exact match |
| log-001 | logql | 1.0 | perfect | ✅ | ✅ | exact match |
| log-002 | logql | 0.0 | fail | ❌ | ❌ | syntax check failed for logql |
| log-003 | logql | 1.0 | perfect | ✅ | ✅ | exact match |
| log-004 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'connection pool exhausted'} |
| log-005 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'invalid'} |
| log-006 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'email', 'failed'} |
| log-007 | logql | 0.3 | partial | ✅ | ❌ | missing keywords: {'out of memory', 'oom'} |
| trace-001 | traceql | 1.0 | perfect | ✅ | ✅ | exact match |
| trace-002 | traceql | 0.3 | partial | ✅ | ❌ | status: expected 'error', got 'None' |
| trace-003 | traceql | 0.3 | partial | ✅ | ❌ | span_name: expected '.*SQL.*', got 'None' |
| trace-004 | traceql | 0.3 | partial | ✅ | ❌ | status: expected 'error', got 'None'; span_kind: expected 'client', got 'None' |

## 结论与建议

⚠️ **CONDITIONAL**: 部分达标，需针对性优化（few-shot/元数据注入/剧本约束）后再决策。

### 优化建议
- 分析 FAIL/PARTIAL 样本的错误类型分布，针对性增强 prompt
- 对低分类型增加 few-shot 示例
- 考虑引入自修正闭环（ADR-004）提升最终成功率