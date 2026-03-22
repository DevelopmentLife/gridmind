"""Gateway configuration via pydantic-settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Gateway configuration loaded from environment variables.

    All settings use the GRIDMIND_ prefix. For example, the database_url
    setting is loaded from GRIDMIND_DATABASE_URL.
    """

    model_config = {"env_prefix": "GRIDMIND_"}

    # --- Database ---
    database_url: str = "postgresql://gridmind:gridmind@localhost:5432/gridmind"
    db_pool_min_size: int = 5
    db_pool_max_size: int = 20

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- NATS ---
    nats_url: str = "nats://localhost:4222"

    # --- JWT ---
    jwt_secret_key: str = "dev-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # --- CORS ---
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://app.gridmind.ai",
    ]

    # --- Stripe ---
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    # --- SendGrid ---
    sendgrid_api_key: str | None = None

    # --- reCAPTCHA ---
    recaptcha_secret: str | None = None
    recaptcha_enabled: bool = False

    # --- Rate Limiting ---
    rate_limit_default: str = "100/minute"
    rate_limit_auth: str = "10/minute"

    # --- Environment ---
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"


_settings: Settings | None = None


def get_settings() -> Settings:
    """Return the singleton Settings instance."""
    global _settings  # noqa: PLW0603
    if _settings is None:
        _settings = Settings()
    return _settings
