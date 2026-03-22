"""Cortex runtime configuration via pydantic-settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class CortexConfig(BaseSettings):
    """Configuration for the Cortex agent runtime.

    All settings can be overridden via environment variables prefixed with GRIDMIND_.
    """

    nats_url: str = "nats://localhost:4222"
    database_url: str = "postgresql://gridmind:gridmind@localhost:5432/gridmind"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"
    anthropic_api_key: str | None = None
    vault_addr: str | None = None
    heartbeat_interval: int = 10
    approval_timeout: int = 300
    log_level: str = "info"
    prometheus_port: int = 9090

    model_config = {"env_prefix": "GRIDMIND_"}
