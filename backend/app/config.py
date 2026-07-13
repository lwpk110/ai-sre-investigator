"""Application configuration via pydantic-settings (ADR-006).

 Reads from environment / .env file. All observability endpoints and LLM
 credentials are injected here, never hardcoded elsewhere.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Observability backends ---
    mimir_url: str = "http://mimir-gateway.infra-monitoring.svc.tendata.kube1:80/prometheus"
    loki_url: str = "http://loki-gateway.infra-monitoring.svc.tendata.kube1"
    tempo_url: str = "http://tempo-gateway.infra-monitoring.svc.tendata.kube1"

    # --- LLM ---
    openai_api_key: str = ""
    openai_base_url: str = ""  # empty = default OpenAI; set for MiniMax/DeepSeek/etc
    llm_model: str = "MiniMax-M3"

    # --- Multi-model routing (V3-F3) ---
    # 可用模型列表（JSON 格式，从环境变量 MODEL_CONFIG 覆盖）
    model_config_json: str = ""

    # --- Budget (ADR-004 §5.2) ---
    max_tokens_per_session: int = 80_000
    max_tool_calls_per_session: int = 25
    max_session_seconds: int = 180

    # --- Cache (ADR-004 §5.1) ---
    cache_maxsize: int = 512
    cache_ttl_near_realtime: int = 30  # seconds, for queries touching last 5 min
    cache_ttl_historical: int = 600  # seconds, for older data

    # --- Self-heal (ADR-004 §4.3) ---
    max_self_heal_attempts: int = 3
    max_session_failures: int = 8

    # --- HTTP client (ADR-005: all calls need timeout) ---
    http_timeout_seconds: float = 30.0
    http_max_retries: int = 2


settings = Settings()
