"""User routes — CRUD + invite, accept, role change."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query

from gateway.auth import TokenPayload, get_current_user, hash_password, require_permission, require_role
from gateway.errors import ConflictError, NotFoundError, ValidationError
from gateway.schemas.common import PaginatedResponse
from gateway.schemas.users import (
    InviteAcceptRequest,
    InviteRequest,
    InviteResponse,
    RoleChange,
    UserResponse,
    UserRole,
    UserUpdate,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/users", tags=["users"])

# In-memory stores
_users: dict[str, dict] = {}
_invitations: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# GET /api/v1/users — List
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedResponse)
async def list_users(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user: TokenPayload = Depends(require_permission("users:read")),
) -> PaginatedResponse:
    """List users in the current organization."""
    org_users = [u for u in _users.values() if u.get("org_id") == user.org_id]
    return PaginatedResponse(
        items=[UserResponse(**u) for u in org_users[:limit]],
        total_count=len(org_users),
        has_more=len(org_users) > limit,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/users/me — Current user profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
async def get_current_profile(
    user: TokenPayload = Depends(get_current_user),
) -> UserResponse:
    """Get the current user's profile."""
    profile = _users.get(user.sub)
    if not profile:
        # Return a synthetic profile from the token
        now = datetime.now(UTC)
        return UserResponse(
            id=user.sub,
            email="user@example.com",
            full_name="Current User",
            role=UserRole(user.role) if user.role in UserRole.__members__.values() else UserRole.MEMBER,
            org_id=user.org_id,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
    return UserResponse(**profile)


# ---------------------------------------------------------------------------
# GET /api/v1/users/{id} — Get user
# ---------------------------------------------------------------------------

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    user: TokenPayload = Depends(require_permission("users:read")),
) -> UserResponse:
    """Get a user by ID."""
    target = _users.get(user_id)
    if not target or target.get("org_id") != user.org_id:
        raise NotFoundError("User not found.")
    return UserResponse(**target)


# ---------------------------------------------------------------------------
# PATCH /api/v1/users/{id} — Update
# ---------------------------------------------------------------------------

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    user: TokenPayload = Depends(require_permission("users:write")),
) -> UserResponse:
    """Update a user."""
    target = _users.get(user_id)
    if not target or target.get("org_id") != user.org_id:
        raise NotFoundError("User not found.")

    update_data = body.model_dump(exclude_unset=True)
    target.update(update_data)
    target["updated_at"] = datetime.now(UTC)
    logger.info("user_updated", target_user_id=user_id)
    return UserResponse(**target)


# ---------------------------------------------------------------------------
# DELETE /api/v1/users/{id} — Soft delete
# ---------------------------------------------------------------------------

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    user: TokenPayload = Depends(require_role("owner", "admin")),
) -> None:
    """Soft-delete a user."""
    target = _users.get(user_id)
    if not target or target.get("org_id") != user.org_id:
        raise NotFoundError("User not found.")
    target["is_active"] = False
    target["updated_at"] = datetime.now(UTC)
    logger.info("user_deleted", target_user_id=user_id)


# ---------------------------------------------------------------------------
# POST /api/v1/users/invite — Send invitation
# ---------------------------------------------------------------------------

@router.post("/invite", response_model=InviteResponse, status_code=201)
async def send_invitation(
    body: InviteRequest,
    user: TokenPayload = Depends(require_role("owner", "admin")),
) -> InviteResponse:
    """Send an invitation to join the organization."""
    # Check if already invited
    for inv in _invitations.values():
        if inv["email"] == body.email and inv["status"] == "pending":
            raise ConflictError("An invitation for this email is already pending.")

    now = datetime.now(UTC)
    invite_id = str(uuid4())
    token = str(uuid4())

    invitation = {
        "id": invite_id,
        "email": body.email,
        "role": body.role,
        "status": "pending",
        "token": token,
        "invited_by": user.sub,
        "org_id": user.org_id,
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    }
    _invitations[invite_id] = invitation

    # Stub: send invitation email
    logger.info("invitation_sent", email=body.email, invite_id=invite_id)

    return InviteResponse(**invitation)


# ---------------------------------------------------------------------------
# POST /api/v1/users/invite/accept — Accept invitation
# ---------------------------------------------------------------------------

@router.post("/invite/accept", response_model=UserResponse, status_code=201)
async def accept_invitation(body: InviteAcceptRequest) -> UserResponse:
    """Accept an invitation and create a user account."""
    # Find invitation by token
    invitation = None
    for inv in _invitations.values():
        if inv.get("token") == body.token and inv["status"] == "pending":
            invitation = inv
            break

    if not invitation:
        raise NotFoundError("Invalid or expired invitation.")

    now = datetime.now(UTC)
    if now > invitation["expires_at"]:
        invitation["status"] = "expired"
        raise NotFoundError("Invitation has expired.")

    user_id = str(uuid4())
    user_record = {
        "id": user_id,
        "email": invitation["email"],
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "role": invitation["role"],
        "org_id": invitation["org_id"],
        "is_active": True,
        "email_verified": True,
        "avatar_url": None,
        "last_login_at": None,
        "created_at": now,
        "updated_at": now,
    }
    _users[user_id] = user_record
    invitation["status"] = "accepted"

    logger.info("invitation_accepted", user_id=user_id, email=invitation["email"])
    return UserResponse(**user_record)


# ---------------------------------------------------------------------------
# POST /api/v1/users/roles — Change role
# ---------------------------------------------------------------------------

@router.post("/roles", response_model=UserResponse)
async def change_role(
    body: RoleChange,
    user: TokenPayload = Depends(require_role("owner")),
) -> UserResponse:
    """Change a user's role (owner only)."""
    target = _users.get(body.user_id)
    if not target or target.get("org_id") != user.org_id:
        raise NotFoundError("User not found.")

    target["role"] = body.new_role
    target["updated_at"] = datetime.now(UTC)
    logger.info("role_changed", target_user_id=body.user_id, new_role=body.new_role)
    return UserResponse(**target)
