"""Root Settings class and nested sub-settings for the GridMind platform.

All settings are loaded from environment variables with the ``GRIDMIND_`` prefix.
Nested models use their own sub-prefix (e.g. ``GRIDMIND_NATS_URL``).
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings


class NATSSettings(BaseSettings):
    """NATS JetStream connection settings."""

    model_config = {"env_prefix": "GRIDMIND_NATS_"}

    url: str = "nats://localhost:4222"
    stream_name: str = "GRIDMIND_EVENTS"
    max_age_hours: int = 72


class PostgresSettings(BaseSettings):
    """PostgreSQL connection pool settings."""

    model_config = {"env_prefix": "GRIDMIND_PG_"}

    url: str = "postgresql://localhost:5432/gridmind"
    pool_size: int = 20
    max_overflow: int = 10


class RedisSettings(BaseSettings):
    """Redis connection settings."""

    model_config = {"env_prefix": "GRIDMIND_REDIS_"}

    url: str = "redis://localhost:6379/0"
    max_connections: int = 50


class VaultSettings(BaseSettings):
    """HashiCorp Vault settings."""

    model_config = {"env_prefix": "GRIDMIND_VAULT_"}

    addr: str = "http://localhost:8200"
    token: str | None = None


class AnthropicSettings(BaseSettings):
    """Anthropic Claude API settings."""

    model_config = {"env_prefix": "GRIDMIND_ANTHROPIC_"}

    api_key: str | None = None
    default_model: str = "claude-sonnet-4-6"


class StripeSettings(BaseSettings):
    """Stripe payment processing settings."""

    model_config = {"env_prefix": "GRIDMIND_STRIPE_"}

    secret_key: str | None = None
    webhook_secret: str | None = None
    publishable_key: str | None = None


class ObservabilitySettings(BaseSettings):
    """Prometheus and logging settings."""

    model_config = {"env_prefix": "GRIDMIND_OBS_"}

    prometheus_port: int = 9090
    log_level: str = "info"
    json_logs: bool = True


class SecuritySettings(BaseSettings):
    """JWT, password hashing, and token settings."""

    model_config = {"env_prefix": "GRIDMIND_SECURITY_"}

    jwt_secret: str | None = None
    jwt_algorithm: str = "RS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = 12


class AgentSettings(BaseSettings):
    """Agent runtime behaviour settings."""

    model_config = {"env_prefix": "GRIDMIND_AGENT_"}

    heartbeat_interval: int = 10
    approval_timeout: int = 300


class Settings(BaseSettings):
    """Root configuration for the GridMind platform.

    Aggregates all sub-settings and feature flags. Environment variables
    are read with the ``GRIDMIND_`` prefix for top-level flags.
    """

    model_config = {"env_prefix": "GRIDMIND_"}

    # Nested settings
    nats: NATSSettings = Field(default_factory=NATSSettings)
    postgres: PostgresSettings = Field(default_factory=PostgresSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    vault: VaultSettings = Field(default_factory=VaultSettings)
    anthropic: AnthropicSettings = Field(default_factory=AnthropicSettings)
    stripe: StripeSettings = Field(default_factory=StripeSettings)
    observability: ObservabilitySettings = Field(default_factory=ObservabilitySettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    agent: AgentSettings = Field(default_factory=AgentSettings)

    # Feature flags
    enable_auto_scaling: bool = False
    enable_auto_remediation: bool = False
    enable_predictive_scaling: bool = False
    enable_cost_optimisation: bool = False
    enable_multi_region: bool = False
