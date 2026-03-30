"""Waitlist route — public email signup for pre-launch capture."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta

import structlog
from fastapi import APIRouter, Request, status

from gateway.errors import RateLimitedError, ValidationError
from gateway.schemas.waitlist import WaitlistSignupRequest, WaitlistSignupResponse

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/waitlist", tags=["waitlist"])

# ---------------------------------------------------------------------------
# In-memory stores (replaced by DB in production)
# ---------------------------------------------------------------------------
_waitlist: dict[str, dict[str, object]] = {}  # email -> signup record
_rate_limits: dict[str, list[datetime]] = defaultdict(list)  # ip -> timestamps

# Disposable email domains — reject signups from throwaway addresses.
_DISPOSABLE_DOMAINS: frozenset[str] = frozenset({
    "mailinator.com",
    "guerrillamail.com",
    "tempmail.com",
    "throwaway.email",
    "yopmail.com",
    "sharklasers.com",
    "trashmail.com",
    "10minutemail.com",
    "guerrillamailblock.com",
    "dispostable.com",
    "maildrop.cc",
    "temp-mail.org",
})

# Rate-limit window: 5 requests per 60 seconds per IP.
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = timedelta(minutes=1)


def _get_client_ip(request: Request) -> str:
    """Extract the client IP from the request.

    Checks ``X-Forwarded-For`` first (set by load balancers), then falls
    back to the direct client address.

    Args:
        request: The incoming Starlette/FastAPI request.

    Returns:
        Client IP string.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    """Enforce per-IP rate limiting.

    Raises:
        RateLimitedError: When the IP has exceeded the allowed request count
            within the sliding window.
    """
    now = datetime.now(UTC)
    cutoff = now - _RATE_LIMIT_WINDOW

    # Prune expired entries
    _rate_limits[ip] = [ts for ts in _rate_limits[ip] if ts > cutoff]

    if len(_rate_limits[ip]) >= _RATE_LIMIT_MAX:
        raise RateLimitedError("Too many requests. Please try again later.")

    _rate_limits[ip].append(now)


def _is_disposable_email(email: str) -> bool:
    """Return True if the email domain is on the disposable blocklist.

    Args:
        email: Normalised (lowered) email address.

    Returns:
        True when the domain is disposable.
    """
    domain = email.rsplit("@", 1)[-1]
    return domain in _DISPOSABLE_DOMAINS


# ---------------------------------------------------------------------------
# POST /api/v1/waitlist
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=WaitlistSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def waitlist_signup(
    body: WaitlistSignupRequest,
    request: Request,
) -> WaitlistSignupResponse:
    """Add an email to the pre-launch waitlist.

    This endpoint is public (no authentication required).  For privacy it
    always returns 201 regardless of whether the email already exists so
    that callers cannot enumerate registered addresses.

    Rate limited to 5 requests per minute per IP.
    """
    ip = _get_client_ip(request)
    _check_rate_limit(ip)

    email = body.email.lower()

    # Block disposable email domains
    if _is_disposable_email(email):
        raise ValidationError(
            "Please use a valid email address.",
            [{"field": "email", "issue": "Disposable email addresses are not accepted."}],
        )

    # Idempotent insert — duplicates are silently ignored.
    if email in _waitlist:
        logger.info("waitlist_duplicate", email=email)
    else:
        _waitlist[email] = {
            "email": email,
            "source": body.source,
            "referral_code": body.referral_code,
            "ip_address": ip,
            "user_agent": request.headers.get("user-agent", ""),
            "created_at": datetime.now(UTC).isoformat(),
        }
        logger.info("waitlist_signup", email=email, source=body.source)

    position = len(_waitlist)

    return WaitlistSignupResponse(
        message="You're on the list!",
        position=position,
    )
