"""Authentication, authorization, and credential management."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import structlog
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from gateway.config import Settings, get_settings
from gateway.errors import AuthenticationError, PermissionDeniedError

logger = structlog.get_logger()

_bearer_scheme = HTTPBearer(auto_error=False)
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# HMAC key for API key hashing — derived from jwt_secret_key
_HMAC_KEY_LABEL = b"gridmind-api-key-hmac"


# ---------------------------------------------------------------------------
# Token payload
# ---------------------------------------------------------------------------

class TokenPayload(BaseModel):
    """Decoded JWT payload."""

    sub: str
    org_id: str
    role: str
    permissions: list[str] = []
    exp: datetime
    iat: datetime
    jti: str


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(
    user_id: str,
    org_id: str,
    role: str,
    permissions: list[str] | None = None,
    settings: Settings | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        user_id: Subject claim (user ID).
        org_id: Organization / tenant ID.
        role: User role name.
        permissions: Optional list of permission strings.
        settings: Optional settings override (for testing).

    Returns:
        Encoded JWT string.
    """
    cfg = settings or get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "permissions": permissions or [],
        "exp": now + timedelta(minutes=cfg.jwt_access_token_expire_minutes),
        "iat": now,
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, cfg.jwt_secret_key, algorithm=cfg.jwt_algorithm)


def create_refresh_token() -> tuple[str, str]:
    """Generate an opaque refresh token and its hash.

    Returns:
        Tuple of (raw_token, hashed_token). Store hashed_token in DB.
    """
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def verify_token(token: str, settings: Settings | None = None) -> TokenPayload:
    """Decode and validate a JWT access token.

    Args:
        token: Encoded JWT string.
        settings: Optional settings override.

    Returns:
        Parsed TokenPayload.

    Raises:
        AuthenticationError: If the token is invalid or expired.
    """
    cfg = settings or get_settings()
    try:
        payload = jwt.decode(token, cfg.jwt_secret_key, algorithms=[cfg.jwt_algorithm])
        return TokenPayload(**payload)
    except JWTError as exc:
        raise AuthenticationError(f"Invalid token: {exc}") from exc


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a password with bcrypt (cost 12).

    Args:
        password: Plaintext password.

    Returns:
        Bcrypt hash string.
    """
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Args:
        plain: Plaintext password.
        hashed: Bcrypt hash.

    Returns:
        True if the password matches.
    """
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# API Key helpers
# ---------------------------------------------------------------------------

def hash_api_key(key: str, settings: Settings | None = None) -> str:
    """Hash an API key with HMAC-SHA256.

    Args:
        key: Raw API key string.
        settings: Optional settings override.

    Returns:
        Hex-encoded HMAC digest.
    """
    cfg = settings or get_settings()
    return hmac.new(
        cfg.jwt_secret_key.encode() + _HMAC_KEY_LABEL,
        key.encode(),
        hashlib.sha256,
    ).hexdigest()


def generate_api_key(settings: Settings | None = None) -> tuple[str, str]:
    """Generate a new API key with gm_ prefix and its HMAC hash.

    Args:
        settings: Optional settings override.

    Returns:
        Tuple of (display_key, hashed_key). Show display_key once, store hashed_key.
    """
    raw = f"gm_{secrets.token_urlsafe(32)}"
    hashed = hash_api_key(raw, settings)
    return raw, hashed


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> TokenPayload:
    """FastAPI dependency: extract and validate JWT from Authorization header.

    Args:
        request: The incoming request.
        credentials: Bearer token credentials.

    Returns:
        Decoded TokenPayload.

    Raises:
        AuthenticationError: If no token or token is invalid.
    """
    if credentials is None:
        raise AuthenticationError("Missing authorization header.")
    token_payload = verify_token(credentials.credentials)
    # Store on request state for downstream use
    request.state.user_id = token_payload.sub
    request.state.org_id = token_payload.org_id
    request.state.role = token_payload.role
    return token_payload


def require_permission(permission: str):  # noqa: ANN201
    """FastAPI dependency factory: require a specific RBAC permission.

    Args:
        permission: Required permission string (e.g. "deployments:write").

    Returns:
        A dependency callable.
    """

    async def _check(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if permission not in user.permissions:
            raise PermissionDeniedError(f"Missing permission: {permission}")
        return user

    return _check


def require_role(*roles: str):  # noqa: ANN201
    """FastAPI dependency factory: require one of the specified roles.

    Args:
        roles: Allowed role names.

    Returns:
        A dependency callable.
    """

    async def _check(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if user.role not in roles:
            raise PermissionDeniedError(f"Required role: {', '.join(roles)}")
        return user

    return _check
