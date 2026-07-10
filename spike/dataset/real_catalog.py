"""Real metric catalog from actual Tendata Mimir/Loki (OTel/Spring Boot/Micrometer).

Based on live data pulled 2026-07-09 from:
  Mimir: mimir-gateway.infra-monitoring.svc.tendata.kube1:80/prometheus
  Loki:  loki-gateway.infra-monitoring.svc.tendata.kube1:80

Key differences from synthetic catalog:
  - Metrics are Micrometer/OTel style, not raw Prometheus
  - Service identity is `application` label (Mimir) / `service_name` label (Loki)
  - 64 real tendata-* services
  - Histogram metrics use _bucket/_count/_sum suffixes
"""
from __future__ import annotations
from pydantic import BaseModel, Field

from spike.dataset.metric_catalog import MetricCatalog, ServiceMeta


# Real application metrics discovered in production
REAL_METRICS = [
    # HTTP (Micrometer histogram)
    "http_server_requests_bucket", "http_server_requests_count", "http_server_requests_sum", "http_server_requests_max",
    "http_client_requests_bucket", "http_client_requests_count", "http_client_requests_sum",
    # DB connection pool (HikariCP via OTel)
    "db_client_connections_usage", "db_client_connections_max", "db_client_connections_idle_min",
    "db_client_connections_pending_requests", "db_client_connections_timeouts",
    # Kafka consumer
    "kafka_consumer_assigned_partitions", "kafka_consumer_connection_count",
    "kafka_consumer_bytes_consumed_total", "kafka_consumer_commit_total",
    # JVM
    "jvm_gc_duration_bucket", "jvm_gc_duration_count", "jvm_gc_duration_sum",
    "jvm_gc_pause_bucket", "jvm_gc_pause_sum", "jvm_gc_live_data_size", "jvm_gc_max_data_size",
    "jvm_gc_memory_allocated", "jvm_gc_memory_promoted", "jvm_gc_overhead",
    "jvm_memory_used_bytes", "jvm_memory_committed_bytes", "jvm_memory_max_bytes",
    "jvm_threads_states_threads", "jvm_threads_live_threads", "jvm_threads_daemon_threads",
    "jvm_threads_peak_threads", "jvm_cpu_recent_utilization",
    # Spring framework
    "spring_kafka_listener_bucket", "spring_kafka_listener_count", "spring_kafka_listener_sum",
    "spring_data_repository_invocations_bucket", "spring_data_repository_invocations_count",
    # Custom business (crawler)
    "crawler_requests_total", "crawler_requests_success_total", "crawler_request_timeouts_total",
    "crawler_pages_parsed_success_total", "crawler_http_abnormal_status_total",
]

# Real label names per metric family
REAL_HTTP_LABELS = {"application", "method", "status", "outcome", "uri", "exception", "error", "instance", "job", "le"}
REAL_DB_LABELS = {"job", "instance", "pool_name", "state"}
REAL_KAFKA_LABELS = {"job", "instance", "client_id"}
REAL_JVM_LABELS = {"job", "instance", "area", "id", "cause", "action"}

# Real application names (subset of 64)
REAL_APPS = [
    "tendata-accounts-admin-service", "tendata-accounts-service", "tendata-ai-service",
    "tendata-audit-service", "tendata-auth-service", "tendata-bi-service",
    "tendata-bizr-service", "tendata-contact-service", "tendata-contactx-service",
    "tendata-corp-relation-service", "tendata-corp-service", "tendata-corp-updater-service",
    "tendata-crm-audit-service", "tendata-crm-auth-service", "tendata-crm-customer-service",
    "tendata-crm-leads-service", "tendata-crm-lucene-service", "tendata-crm-serve-service",
    "tendata-crm-service", "tendata-crm-stat-service", "tendata-customs-service",
    "tendata-datax-service", "tendata-dfs-service", "tendata-dmx-cms-service",
    "tendata-dmx-edm-service", "tendata-dmx-service", "tendata-drax-service",
    "tendata-ecos-service", "tendata-feedback-service", "tendata-globiz-codes-service",
    "tendata-globiz-corp-service", "tendata-gloco-service", "tendata-im-service",
    "tendata-insight-analysis-service", "tendata-insight-batch-service",
    "tendata-job-admin-service", "tendata-search-service", "tendata-translation-service",
]

# Real Loki label names
REAL_LOKI_LABELS = {"service_name", "k8s_namespace_name", "k8s_container_name", "k8s_pod_name",
                    "deployment_environment", "service_namespace", "service_instance_id"}


class RealMetricCatalog(BaseModel):
    """Real catalog reflecting actual production observability data."""
    applications: list[str] = REAL_APPS
    metrics: list[str] = REAL_METRICS
    http_labels: set[str] = REAL_HTTP_LABELS
    db_labels: set[str] = REAL_DB_LABELS
    kafka_labels: set[str] = REAL_KAFKA_LABELS
    jvm_labels: set[str] = REAL_JVM_LABELS
    loki_labels: set[str] = REAL_LOKI_LABELS

    def to_prompt_summary(self) -> str:
        """Compact summary for LLM system prompt with REAL metric names."""
        lines = [
            "## 可用观测性数据（真实生产环境，OTel/Spring Boot/Micrometer 指标体系）",
            "",
            "### 服务列表（application label 值，共64个）",
        ]
        for i in range(0, min(len(self.applications), 20), 5):
            batch = self.applications[i:i+5]
            lines.append(f"  {', '.join(batch)}")
        lines.append(f"  ... 等 {len(self.applications)} 个 tendata-* 服务")
        lines.append("")
        lines.append("### Metric 名称与 label")
        lines.append("")
        lines.append("**HTTP 请求指标（Micrometer 直方图）**:")
        lines.append(f"  metrics: http_server_requests_{{bucket,count,sum,max}}")
        lines.append(f"  labels: {', '.join(sorted(self.http_labels))}")
        lines.append(f"  示例: http_server_requests_count{{application=\"tendata-crm-service\",method=\"POST\",status=\"500\",uri=\"/api/orders\"}}")
        lines.append("")
        lines.append("**DB 连接池指标（OTel/HikariCP）**:")
        lines.append(f"  metrics: db_client_connections_{{usage,max,idle_min,pending_requests,timeouts}}")
        lines.append(f"  labels: {', '.join(sorted(self.db_labels))}")
        lines.append(f"  注: usage 的 state=\"used\" 表示已用连接, state=\"idle\" 表示空闲")
        lines.append("")
        lines.append("**Kafka 消费者指标**:")
        lines.append(f"  metrics: kafka_consumer_{{assigned_partitions,connection_count,bytes_consumed_total,commit_total}}")
        lines.append(f"  labels: {', '.join(sorted(self.kafka_labels))}")
        lines.append("")
        lines.append("**JVM 指标**:")
        lines.append(f"  metrics: jvm_{{gc_duration_sum,memory_used_bytes,threads_states_threads,cpu_recent_utilization,...}}")
        lines.append(f"  labels: {', '.join(sorted(self.jvm_labels))}")
        lines.append("")
        lines.append("**Loki 日志 labels**:")
        lines.append(f"  labels: {', '.join(sorted(self.loki_labels))}")
        lines.append(f"  注: Loki 用 service_name 而非 application 标识服务")
        lines.append("")
        lines.append("**重要约定**:")
        lines.append("- 服务在 Mimir 指标中用 `application` label，在 Loki 日志中用 `service_name` label")
        lines.append("- HTTP 状态码在 `status` label，值为字符串如 \"200\" \"500\"")
        lines.append("- 直方图分位数用 `_bucket` + `histogram_quantile()` + `le` label")

        return "\n".join(lines)
