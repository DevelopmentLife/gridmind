"""Route module — imports all API routers."""

from __future__ import annotations

from gateway.routes.agents import router as agents_router
from gateway.routes.auth import router as auth_router
from gateway.routes.billing import router as billing_router
from gateway.routes.chat import router as chat_router
from gateway.routes.deployments import router as deployments_router
from gateway.routes.incidents import router as incidents_router
from gateway.routes.onboarding import router as onboarding_router
from gateway.routes.tenants import router as tenants_router
from gateway.routes.users import router as users_router

all_routers = [
    auth_router,
    deployments_router,
    agents_router,
    tenants_router,
    billing_router,
    users_router,
    incidents_router,
    chat_router,
    onboarding_router,
]

__all__ = ["all_routers"]
