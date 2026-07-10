"""Natural-language fault descriptions with expected QL queries.

Each sample simulates a real user utterance and the ground-truth query
an SRE would write. Covers PromQL (Metrics), LogQL (Logs), TraceQL (Traces).
"""
from __future__ import annotations
from enum import Enum
from pydantic import BaseModel


class QLType(str, Enum):
    PROMQL = "promql"
    LOGQL = "logql"
    TRACEQL = "traceql"


class FaultSample(BaseModel):
    id: str
    natural_language: str
    expected_query: str
    ql_type: QLType
    service_name: str
    tags: list[str] = []


# ---- PromQL samples (Metrics) ----
_PROMQL = [
    FaultSample(
        id="prom-001",
        natural_language="payment-service 最近1小时的 500 错误率是多少？",
        expected_query='sum(rate(http_requests_total{service="payment-service",status="500"}[1h])) / sum(rate(http_requests_total{service="payment-service"}[1h]))',
        ql_type=QLType.PROMQL, service_name="payment-service",
        tags=["error_rate", "http_500"],
    ),
    FaultSample(
        id="prom-002",
        natural_language="order-service 过去30分钟的 p99 延迟",
        expected_query='histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service="order-service"}[30m])) by (le))',
        ql_type=QLType.PROMQL, service_name="order-service",
        tags=["latency", "p99"],
    ),
    FaultSample(
        id="prom-003",
        natural_language="gateway 的 envoy 上游请求积压在过去15分钟有溢出吗？",
        expected_query='rate(envoy_cluster_upstream_rq_pending_overflow{service="gateway"}[15m])',
        ql_type=QLType.PROMQL, service_name="gateway",
        tags=["overflow", "envoy"],
    ),
    FaultSample(
        id="prom-004",
        natural_language="inventory-service 当前数据库连接池使用量",
        expected_query='db_connections_in_use{service="inventory-service"}',
        ql_type=QLType.PROMQL, service_name="inventory-service",
        tags=["db", "connection_pool"],
    ),
    FaultSample(
        id="prom-005",
        natural_language="user-service 最近2小时认证失败次数趋势",
        expected_query='increase(auth_failure_total{service="user-service"}[2h])',
        ql_type=QLType.PROMQL, service_name="user-service",
        tags=["auth", "failure_count"],
    ),
    FaultSample(
        id="prom-006",
        natural_language="notification-service 的内存使用情况",
        expected_query='process_resident_memory_bytes{service="notification-service"}',
        ql_type=QLType.PROMQL, service_name="notification-service",
        tags=["memory"],
    ),
    FaultSample(
        id="prom-007",
        natural_language="payment-service 的 gRPC 调用错误率，最近1小时",
        expected_query='sum(rate(grpc_server_handled_total{service="payment-service",code=~"Aborted|Unavailable|Internal"}[1h])) / sum(rate(grpc_server_handled_total{service="payment-service"}[1h]))',
        ql_type=QLType.PROMQL, service_name="payment-service",
        tags=["grpc", "error_rate"],
    ),
    FaultSample(
        id="prom-008",
        natural_language="order-service 的 Kafka 消费延迟",
        expected_query='kafka_consumer_lag{service="order-service"}',
        ql_type=QLType.PROMQL, service_name="order-service",
        tags=["kafka", "consumer_lag"],
    ),
    FaultSample(
        id="prom-009",
        natural_language="所有服务过去5分钟的 5xx 错误率排名",
        expected_query='sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)',
        ql_type=QLType.PROMQL, service_name="*",
        tags=["error_rate", "ranking"],
    ),
    FaultSample(
        id="prom-010",
        natural_language="inventory-service Redis 命令平均耗时",
        expected_query='rate(redis_command_duration_seconds_sum{service="inventory-service"}[5m]) / rate(redis_command_duration_seconds_count{service="inventory-service"}[5m])',
        ql_type=QLType.PROMQL, service_name="inventory-service",
        tags=["redis", "latency"],
    ),
]

# ---- LogQL samples (Logs) ----
_LOGQL = [
    FaultSample(
        id="log-001",
        natural_language="payment-service 最近10分钟内的异常日志，关键词 Exception",
        expected_query='{service="payment-service"} |= "Exception" | json',
        ql_type=QLType.LOGQL, service_name="payment-service",
        tags=["exception", "error_log"],
    ),
    FaultSample(
        id="log-002",
        natural_language="order-service 过去30分钟包含 Timeout 的错误日志",
        expected_query='{service="order-service", level="error"} |= "Timeout"',
        ql_type=QLType.LOGQL, service_name="order-service",
        tags=["timeout", "error_log"],
    ),
    FaultSample(
        id="log-003",
        natural_language="gateway 最近1小时出现 connection refused 的日志",
        expected_query='{service="gateway"} |= "connection refused"',
        ql_type=QLType.LOGQL, service_name="gateway",
        tags=["connection_refused"],
    ),
    FaultSample(
        id="log-004",
        natural_language="inventory-service 数据库连接池耗尽的报错",
        expected_query='{service="inventory-service"} |= "connection pool exhausted" | json',
        ql_type=QLType.LOGQL, service_name="inventory-service",
        tags=["db", "pool_exhausted"],
    ),
    FaultSample(
        id="log-005",
        natural_language="user-service JWT 验证失败的日志，最近15分钟",
        expected_query='{service="user-service"} |= "JWT" |= "invalid"',
        ql_type=QLType.LOGQL, service_name="user-service",
        tags=["jwt", "auth_failure"],
    ),
    FaultSample(
        id="log-006",
        natural_language="notification-service 邮件发送失败的所有日志",
        expected_query='{service="notification-service"} |= "email" |= "failed"',
        ql_type=QLType.LOGQL, service_name="notification-service",
        tags=["email", "send_failed"],
    ),
    FaultSample(
        id="log-007",
        natural_language="payment-service 最近5分钟的 OOM 或 Out of memory 日志",
        expected_query='{service="payment-service"} |= "OOM" or {service="payment-service"} |= "Out of memory"',
        ql_type=QLType.LOGQL, service_name="payment-service",
        tags=["oom", "memory"],
    ),
]

# ---- TraceQL samples (Traces) ----
_TRACEQL = [
    FaultSample(
        id="trace-001",
        natural_language="payment-service 超过 500ms 的慢调用链路",
        expected_query='{ service.name = "payment-service" } && duration > 500ms',
        ql_type=QLType.TRACEQL, service_name="payment-service",
        tags=["slow_trace", "latency"],
    ),
    FaultSample(
        id="trace-002",
        natural_language="order-service 中有错误的链路",
        expected_query='{ service.name = "order-service" } && status = error',
        ql_type=QLType.TRACEQL, service_name="order-service",
        tags=["error_trace"],
    ),
    FaultSample(
        id="trace-003",
        natural_language="inventory-service 中 SQL 查询超过 1 秒的 span",
        expected_query='{ service.name = "inventory-service" } && span.name =~ ".*SQL.*" && duration > 1s',
        ql_type=QLType.TRACEQL, service_name="inventory-service",
        tags=["slow_sql", "db"],
    ),
    FaultSample(
        id="trace-004",
        natural_language="gateway 到上游调用失败的 trace",
        expected_query='{ service.name = "gateway" } && status = error && span.kind = client',
        ql_type=QLType.TRACEQL, service_name="gateway",
        tags=["upstream_failure"],
    ),
]

SAMPLES: list[FaultSample] = _PROMQL + _LOGQL + _TRACEQL
