"""Real-world fault samples using actual Tendata metric names and labels.

These samples use REAL OTel/Micrometer metric names, REAL service names,
and REAL label conventions discovered from the production Mimir/Loki.
"""
from __future__ import annotations
from spike.dataset.samples import FaultSample, QLType


REAL_SAMPLES: list[FaultSample] = [
    # ---- PromQL: HTTP error rate / latency ----
    FaultSample(
        id="real-prom-001",
        natural_language="tendata-crm-customer-service 最近1小时的 500 错误率是多少？",
        expected_query='sum(rate(http_server_requests_count{application="tendata-crm-customer-service",status="500"}[1h])) / sum(rate(http_server_requests_count{application="tendata-crm-customer-service"}[1h]))',
        ql_type=QLType.PROMQL, service_name="tendata-crm-customer-service",
        tags=["error_rate", "http_500"],
    ),
    FaultSample(
        id="real-prom-002",
        natural_language="tendata-auth-service 过去30分钟的 p99 延迟",
        expected_query='histogram_quantile(0.99, sum(rate(http_server_requests_bucket{application="tendata-auth-service"}[30m])) by (le))',
        ql_type=QLType.PROMQL, service_name="tendata-auth-service",
        tags=["latency", "p99"],
    ),
    FaultSample(
        id="real-prom-003",
        natural_language="tendata-corp-service 当前数据库连接池使用量",
        expected_query='db_client_connections_usage{job="tendata-corp-service",state="used"}',
        ql_type=QLType.PROMQL, service_name="tendata-corp-service",
        tags=["db", "connection_pool"],
    ),
    FaultSample(
        id="real-prom-004",
        natural_language="tendata-im-service 的 Kafka 消费者连接数",
        expected_query='kafka_consumer_connection_count{job="tendata-im-service"}',
        ql_type=QLType.PROMQL, service_name="tendata-im-service",
        tags=["kafka", "consumer"],
    ),
    FaultSample(
        id="real-prom-005",
        natural_language="tendata-ai-service 最近2小时的 JVM GC 暂停总耗时",
        expected_query='increase(jvm_gc_pause_sum{job="tendata-ai-service"}[2h])',
        ql_type=QLType.PROMQL, service_name="tendata-ai-service",
        tags=["jvm", "gc"],
    ),
    FaultSample(
        id="real-prom-006",
        natural_language="tendata-bi-service 当前 JVM 内存使用量",
        expected_query='jvm_memory_used_bytes{job="tendata-bi-service"}',
        ql_type=QLType.PROMQL, service_name="tendata-bi-service",
        tags=["jvm", "memory"],
    ),
    FaultSample(
        id="real-prom-007",
        natural_language="tendata-contact-service 最近1小时的 4xx 客户端错误率",
        expected_query='sum(rate(http_server_requests_count{application="tendata-contact-service",status=~"4.."}[1h])) / sum(rate(http_server_requests_count{application="tendata-contact-service"}[1h]))',
        ql_type=QLType.PROMQL, service_name="tendata-contact-service",
        tags=["error_rate", "4xx"],
    ),
    FaultSample(
        id="real-prom-008",
        natural_language="tendata-search-service 过去5分钟的 HTTP 请求 QPS",
        expected_query='sum(rate(http_server_requests_count{application="tendata-search-service"}[5m]))',
        ql_type=QLType.PROMQL, service_name="tendata-search-service",
        tags=["qps", "rate"],
    ),
    FaultSample(
        id="real-prom-009",
        natural_language="所有服务过去5分钟的 5xx 错误率排名",
        expected_query='sum(rate(http_server_requests_count{status=~"5.."}[5m])) by (application) / sum(rate(http_server_requests_count[5m])) by (application)',
        ql_type=QLType.PROMQL, service_name="*",
        tags=["error_rate", "ranking"],
    ),
    FaultSample(
        id="real-prom-010",
        natural_language="tendata-datax-service 的数据库连接池等待请求数",
        expected_query='db_client_connections_pending_requests{job="tendata-datax-service"}',
        ql_type=QLType.PROMQL, service_name="tendata-datax-service",
        tags=["db", "pool_pending"],
    ),

    # ---- LogQL: Error logs ----
    FaultSample(
        id="real-log-001",
        natural_language="tendata-crm-service 最近10分钟包含 Exception 的错误日志",
        expected_query='{service_name="tendata-crm-service"} |= "Exception"',
        ql_type=QLType.LOGQL, service_name="tendata-crm-service",
        tags=["exception", "error_log"],
    ),
    FaultSample(
        id="real-log-002",
        natural_language="tendata-bizr-service 过去30分钟包含 Timeout 的日志",
        expected_query='{service_name="tendata-bizr-service"} |= "Timeout"',
        ql_type=QLType.LOGQL, service_name="tendata-bizr-service",
        tags=["timeout", "error_log"],
    ),
    FaultSample(
        id="real-log-003",
        natural_language="tendata-dmx-service 最近1小时出现 NullPointerException 的日志",
        expected_query='{service_name="tendata-dmx-service"} |= "NullPointerException"',
        ql_type=QLType.LOGQL, service_name="tendata-dmx-service",
        tags=["npe", "java_exception"],
    ),
    FaultSample(
        id="real-log-004",
        natural_language="tendata-audit-service 数据库连接池耗尽的报错日志",
        expected_query='{service_name="tendata-audit-service"} |= "connection" |= "exhausted"',
        ql_type=QLType.LOGQL, service_name="tendata-audit-service",
        tags=["db", "pool_exhausted"],
    ),
    FaultSample(
        id="real-log-005",
        natural_language="tendata-crm-auth-service 认证失败的错误日志，最近15分钟",
        expected_query='{service_name="tendata-crm-auth-service"} |= "auth" |= "failed"',
        ql_type=QLType.LOGQL, service_name="tendata-crm-auth-service",
        tags=["auth_failure"],
    ),
    FaultSample(
        id="real-log-006",
        natural_language="tendata-insight-batch-service 包含 OutOfMemoryError 的日志",
        expected_query='{service_name="tendata-insight-batch-service"} |= "OutOfMemoryError"',
        ql_type=QLType.LOGQL, service_name="tendata-insight-batch-service",
        tags=["oom", "memory"],
    ),
    FaultSample(
        id="real-log-007",
        natural_language="tendata-translation-service 最近5分钟的 SQL 异常日志",
        expected_query='{service_name="tendata-translation-service"} |= "SQLException"',
        ql_type=QLType.LOGQL, service_name="tendata-translation-service",
        tags=["sql_exception"],
    ),

    # ---- TraceQL: Slow traces / error traces ----
    FaultSample(
        id="real-trace-001",
        natural_language="tendata-crm-customer-service 超过 500ms 的慢调用链路",
        expected_query='{ service.name = "tendata-crm-customer-service" } && duration > 500ms',
        ql_type=QLType.TRACEQL, service_name="tendata-crm-customer-service",
        tags=["slow_trace"],
    ),
    FaultSample(
        id="real-trace-002",
        natural_language="tendata-corp-relation-service 中有错误的链路",
        expected_query='{ service.name = "tendata-corp-relation-service" } && status = error',
        ql_type=QLType.TRACEQL, service_name="tendata-corp-relation-service",
        tags=["error_trace"],
    ),
    FaultSample(
        id="real-trace-003",
        natural_language="tendata-customs-service 中数据库查询超过 1 秒的 span",
        expected_query='{ service.name = "tendata-customs-service" } && span.name =~ ".*SQL.*" && duration > 1s',
        ql_type=QLType.TRACEQL, service_name="tendata-customs-service",
        tags=["slow_sql"],
    ),
    FaultSample(
        id="real-trace-004",
        natural_language="tendata-drax-service 的错误 HTTP 调用 trace",
        expected_query='{ service.name = "tendata-drax-service" } && status = error && span.kind = client',
        ql_type=QLType.TRACEQL, service_name="tendata-drax-service",
        tags=["http_error", "client"],
    ),
]
