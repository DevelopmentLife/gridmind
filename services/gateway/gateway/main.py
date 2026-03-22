"""FastAPI application factory for the GridMind Gateway."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.responses import Response

from gateway.config import get_settings
from gateway.database import close_db_pool, close_redis, init_db_pool, init_redis
from gateway.errors import GridMindError, error_response, gridmind_error_handler
from gateway.middleware import RequestLoggingMiddleware, TenantIsolationMiddleware
from gateway.routes import all_routers
from gateway.websocket import router as ws_router

logger = structlog.get_logger()


def _configure_structlog() -> None:
    """Configure structlog for JSON-formatted structured logging."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer()
            if get_settings().debug
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            structlog.get_level_from_name(get_settings().log_level),
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI app with all routes, middleware, and lifecycle hooks.
    """
    settings = get_settings()
    _configure_structlog()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        """Application startup and shutdown lifecycle."""
        logger.info("gateway_starting", environment=settings.environment)

        # Connect to infrastructure
        try:
            await init_db_pool(
                settings.database_url,
                min_size=settings.db_pool_min_size,
                max_size=settings.db_pool_max_size,
            )
        except Exception:
            logger.warning("database_connection_skipped", reason="Could not connect to database")

        try:
            await init_redis(settings.redis_url)
        except Exception:
            logger.warning("redis_connection_skipped", reason="Could not connect to Redis")

        # NATS connection would be initialized here
        logger.info("gateway_started")

        yield

        # Shutdown
        logger.info("gateway_shutting_down")
        await close_db_pool()
        await close_redis()
        logger.info("gateway_stopped")

    app = FastAPI(
        title="GridMind Gateway",
        description="AI-native agentic database operations platform API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # --- Rate limiter ---
    limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_default])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # --- Exception handlers ---
    app.add_exception_handler(GridMindError, gridmind_error_handler)  # type: ignore[arg-type]

    # --- Middleware (order matters: last added = first executed) ---
    app.add_middleware(TenantIsolationMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- System endpoints ---

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        """Liveness probe — always returns OK."""
        return {"status": "ok"}

    @app.get("/readyz", tags=["system"])
    async def readyz() -> dict[str, str | dict[str, str]]:
        """Readiness probe — checks DB, Redis, NATS connectivity."""
        checks: dict[str, str] = {}

        try:
            from gateway.database import get_db_pool
            pool = get_db_pool()
            async with pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "unavailable"

        try:
            from gateway.database import get_redis
            redis = get_redis()
            await redis.ping()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "unavailable"

        # NATS check placeholder
        checks["nats"] = "unchecked"

        all_ok = all(v == "ok" for v in checks.values() if v != "unchecked")
        return {"status": "ready" if all_ok else "degraded", "checks": checks}

    @app.get("/metrics", tags=["system"])
    async def metrics() -> Response:
        """Prometheus scrape endpoint."""
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST,
        )

    # --- Include route routers ---
    for r in all_routers:
        app.include_router(r)

    # --- WebSocket router ---
    app.include_router(ws_router)

    return app


# Module-level app instance for uvicorn direct usage
app = create_app()
