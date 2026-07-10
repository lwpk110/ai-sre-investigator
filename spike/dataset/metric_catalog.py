"""Synthetic metric catalog simulating real Mimir/Loki/Tempo metadata."""
from __future__ import annotations
from pydantic import BaseModel, Field


class ServiceMeta(BaseModel):
    """Metadata for a single service as exposed by observability backends."""
    name: str
    metrics: list[str] = Field(default_factory=list)
    labels: set[str] = Field(default_factory=set)
    log_streams: list[str] = Field(default_factory=list)  # Loki stream labels


class MetricCatalog(BaseModel):
    """Simulated catalog of available metrics, labels, and log streams."""
    services: dict[str, ServiceMeta] = Field(default_factory=dict)

    @classmethod
    def default(cls) -> MetricCatalog:
        """A realistic catalog covering 6 services with common metric patterns."""
        return cls(services={
            "payment-service": ServiceMeta(
                name="payment-service",
                metrics=[
                    "http_requests_total", "http_request_duration_seconds",
                    "grpc_server_handled_total", "go_goroutines",
                    "process_resident_memory_bytes", "payment_error_total",
                ],
                labels={"service", "status", "code", "method", "endpoint", "instance"},
                log_streams=['{service="payment-service", level="error"}',
                             '{service="payment-service", level="warn"}'],
            ),
            "order-service": ServiceMeta(
                name="order-service",
                metrics=[
                    "http_requests_total", "http_request_duration_seconds",
                    "order_creation_total", "order_failed_total",
                    "kafka_consumer_lag", "go_goroutines",
                ],
                labels={"service", "status", "code", "topic", "instance"},
                log_streams=['{service="order-service", level="error"}'],
            ),
            "gateway": ServiceMeta(
                name="gateway",
                metrics=[
                    "http_requests_total", "http_request_duration_seconds",
                    "envoy_cluster_upstream_rq_total",
                    "envoy_cluster_upstream_rq_pending_overflow",
                ],
                labels={"service", "status", "code", "upstream_cluster", "instance"},
                log_streams=['{service="gateway", level="error"}'],
            ),
            "inventory-service": ServiceMeta(
                name="inventory-service",
                metrics=[
                    "http_requests_total", "http_request_duration_seconds",
                    "db_connections_in_use", "db_query_duration_seconds",
                    "redis_command_duration_seconds",
                ],
                labels={"service", "status", "code", "db", "command", "instance"},
                log_streams=['{service="inventory-service", level="error"}'],
            ),
            "user-service": ServiceMeta(
                name="user-service",
                metrics=[
                    "http_requests_total", "http_request_duration_seconds",
                    "auth_failure_total", "jwt_validation_duration_seconds",
                    "go_goroutines",
                ],
                labels={"service", "status", "code", "reason", "instance"},
                log_streams=['{service="user-service", level="error"}'],
            ),
            "notification-service": ServiceMeta(
                name="notification-service",
                metrics=[
                    "http_requests_total", "http_request_duration_seconds",
                    "email_send_total", "email_send_failed_total",
                    "sms_queue_length",
                ],
                labels={"service", "status", "code", "channel", "instance"},
                log_streams=['{service="notification-service", level="error"}'],
            ),
        })

    def to_prompt_summary(self) -> str:
        """Compact text summary for injecting into LLM system prompt."""
        lines = ["Available services and their metrics:"]
        for svc in self.services.values():
            lines.append(f"\n  {svc.name}:")
            lines.append(f"    metrics: {', '.join(svc.metrics)}")
            lines.append(f"    labels: {', '.join(sorted(svc.labels))}")
            if svc.log_streams:
                lines.append(f"    log_streams: {'; '.join(svc.log_streams)}")
        return "\n".join(lines)
