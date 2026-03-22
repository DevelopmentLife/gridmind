"""Auth routes — login, register, refresh, logout, API keys."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Request

from gateway.auth import (
    TokenPayload,
    create_access_token,
    create_refresh_token,
    generate_api_key,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from gateway.config import get_settings
from gateway.errors import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    RateLimitedError,
    ValidationError,
)
from gateway.schemas.auth import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from gateway.schemas.common import PaginatedResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# In-memory stores (replaced by DB in production)
# ---------------------------------------------------------------------------
_users: dict[str, dict] = {}  # email -> user record
_refresh_tokens: dict[str, dict] = {}  # hashed_token -> {user_id, org_id, role, expires_at}
_login_attempts: dict[str, dict] = {}  # email -> {count, locked_until}
_api_keys: dict[str, dict] = {}  # key_id -> {name, hashed_key, user_id, org_id, ...}

# Disposable email domains for registration validation
_DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "trashmail.com",
}


def _check_password_strength(password: str) -> list[dict[str, str]]:
    """Validate password strength requirements."""
    issues: list[dict[str, str]] = []
    if len(password) < 8:
        issues.append({"field": "password", "issue": "Must be at least 8 characters"})
    if not any(c.isupper() for c in password):
        issues.append({"field": "password", "issue": "Must contain an uppercase letter"})
    if not any(c.islower() for c in password):
        issues.append({"field": "password", "issue": "Must contain a lowercase letter"})
    if not any(c.isdigit() for c in password):
        issues.append({"field": "password", "issue": "Must contain a digit"})
    return issues


# ---------------------------------------------------------------------------
# POST /api/v1/auth/token — Login
# ---------------------------------------------------------------------------

@router.post("/token", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request) -> TokenResponse:
    """Authenticate with email and password, receive JWT + refresh token.

    Rate limited to 10/minute. Progressive lockout after 5 failures,
    account lock after 10 consecutive failures.
    """
    email = body.email.lower()
    now = datetime.now(UTC)

    # Check lockout
    attempts = _login_attempts.get(email, {"count": 0, "locked_until": None})
    if attempts.get("locked_until") and now < attempts["locked_until"]:
        raise RateLimitedError("Account temporarily locked. Try again later.")

    # Find user
    user = _users.get(email)
    if not user or not verify_password(body.password, user["password_hash"]):
        # Increment failure count
        attempts["count"] = attempts.get("count", 0) + 1
        if attempts["count"] >= 10:
            attempts["locked_until"] = now + timedelta(minutes=30)
            logger.warning("account_locked", email=email)
        elif attempts["count"] >= 5:
            attempts["locked_until"] = now + timedelta(minutes=attempts["count"] - 4)
            logger.warning("progressive_lockout", email=email, count=attempts["count"])
        _login_attempts[email] = attempts
        raise AuthenticationError("Invalid email or password.")

    # Reset attempts on success
    _login_attempts.pop(email, None)

    # Issue tokens
    settings = get_settings()
    access_token = create_access_token(
        user_id=user["id"],
        org_id=user["org_id"],
        role=user["role"],
        permissions=user.get("permissions", []),
    )
    refresh_raw, refresh_hashed = create_refresh_token()
    _refresh_tokens[refresh_hashed] = {
        "user_id": user["id"],
        "org_id": user["org_id"],
        "role": user["role"],
        "expires_at": now + timedelta(days=settings.jwt_refresh_token_expire_days),
    }

    logger.info("user_login", user_id=user["id"], org_id=user["org_id"])

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_raw,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh — Rotate access token
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest) -> TokenResponse:
    """Rotate access token using a valid refresh token."""
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    session = _refresh_tokens.pop(token_hash, None)

    if not session:
        raise AuthenticationError("Invalid refresh token.")

    now = datetime.now(UTC)
    if now > session["expires_at"]:
        raise AuthenticationError("Refresh token expired.")

    settings = get_settings()
    access_token = create_access_token(
        user_id=session["user_id"],
        org_id=session["org_id"],
        role=session["role"],
    )
    new_refresh_raw, new_refresh_hashed = create_refresh_token()
    _refresh_tokens[new_refresh_hashed] = {
        **session,
        "expires_at": now + timedelta(days=settings.jwt_refresh_token_expire_days),
    }

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_raw,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/logout — Revoke session
# ---------------------------------------------------------------------------

@router.post("/logout", status_code=204)
async def logout(body: RefreshRequest) -> None:
    """Revoke the refresh token, ending the session."""
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    _refresh_tokens.pop(token_hash, None)
    logger.info("user_logout")


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register — Create account
# ---------------------------------------------------------------------------

@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest) -> RegisterResponse:
    """Create a new user account and organization."""
    email = body.email.lower()

    # Check disposable email
    domain = email.split("@")[1]
    if domain in _DISPOSABLE_DOMAINS:
        raise ValidationError("Disposable email addresses are not allowed.", [
            {"field": "email", "issue": f"Domain '{domain}' is not accepted"}
        ])

    # Check if email already registered
    if email in _users:
        raise ConflictError("An account with this email already exists.")

    # Validate password strength
    pw_issues = _check_password_strength(body.password)
    if pw_issues:
        raise ValidationError("Password does not meet requirements.", pw_issues)

    # Create user + org
    user_id = str(uuid4())
    org_id = str(uuid4())
    _users[email] = {
        "id": user_id,
        "email": email,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "org_id": org_id,
        "role": "owner",
        "permissions": [
            "deployments:read", "deployments:write",
            "agents:read", "agents:write",
            "tenants:read", "tenants:write",
            "billing:read", "billing:write",
            "users:read", "users:write",
            "incidents:read", "incidents:write",
        ],
        "is_active": True,
        "email_verified": False,
        "created_at": datetime.now(UTC).isoformat(),
    }

    logger.info("user_registered", user_id=user_id, org_id=org_id, email=email)

    # Stub: send verification email
    logger.info("verification_email_stub", email=email, message="Would send verification email")

    return RegisterResponse(
        user_id=user_id,
        org_id=org_id,
        email=email,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/api-keys — Create API key
# ---------------------------------------------------------------------------

@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_api_key(
    body: ApiKeyCreate,
    user: TokenPayload = Depends(get_current_user),
) -> ApiKeyCreatedResponse:
    """Create a new API key (gm_ prefix, HMAC hashed for storage)."""
    raw_key, hashed_key = generate_api_key()
    key_id = str(uuid4())
    now = datetime.now(UTC)

    _api_keys[key_id] = {
        "id": key_id,
        "name": body.name,
        "hashed_key": hashed_key,
        "user_id": user.sub,
        "org_id": user.org_id,
        "created_at": now,
        "expires_at": body.expires_at,
        "last_used_at": None,
    }

    logger.info("api_key_created", key_id=key_id, user_id=user.sub)

    return ApiKeyCreatedResponse(
        id=key_id,
        name=body.name,
        key=raw_key,
        created_at=now,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/auth/api-keys — List keys (masked)
# ---------------------------------------------------------------------------

@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: TokenPayload = Depends(get_current_user),
) -> list[ApiKeyResponse]:
    """List API keys for the current user (masked, last 4 chars shown)."""
    return [
        ApiKeyResponse(
            id=k["id"],
            name=k["name"],
            key_preview=f"...{k['hashed_key'][-4:]}",
            created_at=k["created_at"],
            expires_at=k.get("expires_at"),
            last_used_at=k.get("last_used_at"),
        )
        for k in _api_keys.values()
        if k["user_id"] == user.sub
    ]


# ---------------------------------------------------------------------------
# DELETE /api/v1/auth/api-keys/{key_id} — Revoke key
# ---------------------------------------------------------------------------

@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: str,
    user: TokenPayload = Depends(get_current_user),
) -> None:
    """Revoke an API key."""
    key = _api_keys.get(key_id)
    if not key or key["user_id"] != user.sub:
        raise NotFoundError("API key not found.")
    del _api_keys[key_id]
    logger.info("api_key_revoked", key_id=key_id, user_id=user.sub)
