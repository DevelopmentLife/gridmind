# PRD: Email Verification & Account Creation Flow

## Metadata

| Field | Value |
|-------|-------|
| **PRD ID** | PRD-004 |
| **Status** | `ready` |
| **Author** | HERALD |
| **Created** | 2026-03-22 |
| **Priority** | `critical` |

---

## 1. Problem Statement

GridMind's registration flow creates user accounts but never verifies email ownership —
the verification email is a stub (`logger.info("verification_email_stub", ...)`). Unverified
users are stored with `status = pending_verification` but the login endpoint has no gate
checking that status, allowing them to access all dashboard routes immediately. Invite tokens
are raw UUIDs stored in plaintext (not hashed), which is a security gap. Password reset is
unbuilt. This means the platform has no enforceable identity assurance, no way to reclaim
accounts, and no secure invite mechanism.

## 2. Objective

Ship a complete, production-grade identity lifecycle: email verification required before
dashboard access, secure single-use tokens for verification / password reset / invites, a
mock email capture layer for dev/test, and a portal UI for all flows. Every token is
cryptographically random, SHA-256 hashed before storage, and time-limited.

## 3. Users & Personas

| Persona | Description | Key Need |
|---------|-------------|----------|
| New registrant | Just submitted the register form | Get a clear "check your email" screen with resend option |
| Invited team member | Received an invite email from org owner/admin | One-click to register with email pre-filled |
| Locked-out user | Forgot password or suspect breach | Self-service password reset with no account enumeration |
| Operator / developer | Building or testing the platform | Inspect captured emails without a real mail server |

## 4. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Registration accepts email, password, full_name, org_name; validates all inputs server-side; creates user with `status = pending_verification`; sends verification email | must-have |
| FR-002 | Password must be min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character (`!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?`) | must-have |
| FR-003 | The top 20 disposable email domains are blocked at registration | must-have |
| FR-004 | Email verification token is 32-byte cryptographically random hex, SHA-256 hashed before storage, 24-hour expiry, single-use | must-have |
| FR-005 | Clicking the verification link sets `status = active` and deletes the token row | must-have |
| FR-006 | Already-verified users clicking an old link see a friendly message and are redirected to dashboard | must-have |
| FR-007 | Unverified users attempting to log in receive HTTP 403 with error code `EMAIL_NOT_VERIFIED` plus a resend link | must-have |
| FR-008 | Unverified users can resend the verification email; rate limit 3 per hour per email; new token invalidates old token | must-have |
| FR-009 | Unverified users can only access `/verify-email` and `/check-email` portal routes; all `(authenticated)` routes redirect to `/check-email` | must-have |
| FR-010 | Password reset: user submits email, receives link if account exists (response is identical whether account exists or not) | must-have |
| FR-011 | Password reset token: 32-byte random, SHA-256 hashed, 1-hour expiry, single-use; after use, ALL sessions for that user are invalidated | must-have |
| FR-012 | Password reset rate limit: 3 requests per hour per email | must-have |
| FR-013 | Org invite token: 32-byte random, SHA-256 hashed, 7-day expiry, single-use; replaces current raw-UUID invite token | must-have |
| FR-014 | Invite-accept flow pre-fills email field (read-only) on register page and marks invited user `email_verified = true` / `status = active` on accept (no verification email needed) | must-have |
| FR-015 | Mock email service: when `RESEND_API_KEY` is absent or starts with `re_test_`, capture emails to Redis list `gridmind:dev:emails` (max 100, FIFO eviction) | must-have |
| FR-016 | `GET /dev/emails` endpoint returns captured emails; endpoint is only registered when `environment != production` | must-have |
| FR-017 | Portal `/dev/emails` page displays captured emails; only rendered when `NEXT_PUBLIC_DEV_EMAIL_VIEWER=true` | must-have |
| FR-018 | Resend verification: UI shows a countdown timer (60 seconds) after sending, disabling the button until the timer expires | should-have |
| FR-019 | Login page "Forgot password?" link navigates to `/forgot-password` page (link already exists in UI but page is missing) | must-have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Email send (Resend API call) must not block the HTTP response | async, fire-and-forget with structured error logging |
| NFR-002 | Token lookup (verify, reset, invite accept) P95 response time | < 200ms |
| NFR-003 | All token operations are idempotent — retrying within the same second produces same outcome | verified by test |
| NFR-004 | No timing oracle: token comparison uses `hmac.compare_digest` | enforced in code |
| NFR-005 | Accessibility: all new portal pages WCAG 2.1 AA | axe-core scan in CI |
| NFR-006 | Rate limit headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` returned on 429 | must |
| NFR-007 | Coverage: 85% line coverage on all changed services (gateway, portal) | CI gate |

---

## 5. Acceptance Criteria

| AC | Criteria | Test Type |
|----|----------|-----------|
| AC-001 | **Given** a new email + valid password, **When** POST /api/v1/auth/register, **Then** status 201, user row has `status = pending_verification`, one token row exists in `email_verification_tokens`, one email captured in dev email store | integration |
| AC-002 | **Given** a disposable email domain (e.g. `mailinator.com`), **When** POST /api/v1/auth/register, **Then** status 422 with code `VALIDATION_ERROR` and `field = email` | unit |
| AC-003 | **Given** password missing special char, **When** POST /api/v1/auth/register, **Then** status 422 with code `VALIDATION_ERROR` and `field = password` | unit |
| AC-004 | **Given** user with `status = pending_verification`, **When** POST /api/v1/auth/token, **Then** status 403 with code `EMAIL_NOT_VERIFIED` | integration |
| AC-005 | **Given** a valid unexpired verification token, **When** GET /api/v1/auth/verify-email?token={raw}, **Then** status 200, user `status = active`, token row deleted | integration |
| AC-006 | **Given** a used or expired verification token, **When** GET /api/v1/auth/verify-email?token={raw}, **Then** status 400 with code `INVALID_TOKEN` | unit |
| AC-007 | **Given** already-active user visiting /verify-email?token={any}, **When** token lookup finds user already active, **Then** status 200 with `already_verified: true` field | unit |
| AC-008 | **Given** verified user, **When** POST /api/v1/auth/token, **Then** status 200 with access and refresh tokens | integration |
| AC-009 | **Given** 3 resend requests within one hour for same email, **When** 4th request, **Then** status 429 with `Retry-After` header | unit |
| AC-010 | **Given** a resend request, **When** successful, **Then** previous token row for that user is deleted and new one inserted | integration |
| AC-011 | **Given** any email (registered or not), **When** POST /api/v1/auth/forgot-password, **Then** status 200 with identical response body regardless of whether email exists | unit |
| AC-012 | **Given** a valid unexpired password reset token, **When** POST /api/v1/auth/reset-password, **Then** status 200, password updated (bcrypt), all refresh tokens for user invalidated, token row deleted | integration |
| AC-013 | **Given** an expired or used password reset token, **When** POST /api/v1/auth/reset-password, **Then** status 400 with code `INVALID_TOKEN` | unit |
| AC-014 | **Given** an org owner/admin, **When** POST /api/v1/users/invite with an email, **Then** status 201, token stored hashed (SHA-256) in `invite_tokens` table, invite email captured | integration |
| AC-015 | **Given** a valid invite token, **When** POST /api/v1/users/invite/accept, **Then** status 201, user created with `status = active`, token deleted, membership row created | integration |
| AC-016 | **Given** `environment = production`, **When** GET /dev/emails, **Then** status 404 (route not registered) | integration |
| AC-017 | **Given** `RESEND_API_KEY` starts with `re_test_`, **When** any email is sent, **Then** no HTTP call to Resend, email JSON appended to Redis list `gridmind:dev:emails` | unit |
| AC-018 | **Given** an unauthenticated request, **When** navigating to any `(authenticated)` portal route, **Then** redirect to `/login` | e2e |
| AC-019 | **Given** authenticated user with `status = pending_verification`, **When** navigating to any `(authenticated)` portal route, **Then** redirect to `/check-email` | e2e |
| AC-020 | **Given** verified user, **When** navigating to `/check-email`, **Then** redirect to `/deployments` | e2e |

---

## 6. Scope

### In Scope

- New `email_verification_tokens` table (migration 012)
- New `password_reset_tokens` table (migration 012)
- Upgrade `invite_tokens` to hashed tokens (migration 012 alters `_invitations` in-memory store to use real DB table)
- New gateway endpoints: verify-email, resend-verification, forgot-password, reset-password, and `/dev/emails`
- Upgrade invite token generation in `users.py` to 32-byte random + SHA-256 hash
- Email service abstraction: `gateway/email.py` (Resend real + mock)
- Portal pages: `/check-email`, `/verify-email`, `/forgot-password`, `/reset-password`, `/invite/accept`, `/dev/emails`
- Authentication gate in `(authenticated)/layout.tsx` to check email verification status
- `authStore` additions: `emailVerified` field, `resendVerification()`, `forgotPassword()`, `resetPassword()` actions

### Out of Scope

- MFA / TOTP (tracked separately)
- Magic link (passwordless) login
- Social OAuth (Google, GitHub)
- Email template design system (plain HTML is acceptable for this PRD)
- Production email domain/DKIM/DMARC configuration (infrastructure concern)
- Admin-side user management UI changes
- SMS verification

---

## 7. Data Model

### New Table: `email_verification_tokens` (migration 012)

```sql
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_id        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash      VARCHAR(64)     NOT NULL UNIQUE,   -- SHA-256 hex of the raw token
    expires_at      TIMESTAMPTZ     NOT NULL,           -- created_at + 24h
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_evt_user_id ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_evt_token_hash ON email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS ix_evt_expires_at ON email_verification_tokens (expires_at);
```

**DOWN:** `DROP TABLE IF EXISTS email_verification_tokens;`

### New Table: `password_reset_tokens` (migration 012)

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash      VARCHAR(64)     NOT NULL UNIQUE,   -- SHA-256 hex of the raw token
    expires_at      TIMESTAMPTZ     NOT NULL,           -- created_at + 1h
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_prt_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_prt_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS ix_prt_expires_at ON password_reset_tokens (expires_at);
```

**DOWN:** `DROP TABLE IF EXISTS password_reset_tokens;`

### Existing Table: `users` — no schema changes needed

`status` column already has `pending_verification` and `active` values in the CHECK constraint. No ALTER required.

### Existing In-Memory: `_invitations` in `users.py`

The in-memory `_invitations` dict is sufficient for the current greenfield state. The invite token generation must be upgraded from `str(uuid4())` to a 32-byte random token with SHA-256 hash. The `token` field in the dict stores the hash; the raw token is returned once in the response for email construction. Migration 012 does NOT need a DB table for invitations yet — the stub store upgrade is sufficient until the DB layer is wired.

### Updated `_DISPOSABLE_DOMAINS` in `auth.py`

Replace the current 7-domain set with the full 20+ domain blocklist (see FR-003 technical detail below).

---

## 8. API Endpoints

### New Endpoints (all under `/api/v1/auth`)

| Method | Path | Purpose | Auth | Rate Limit |
|--------|------|---------|------|------------|
| GET | `/api/v1/auth/verify-email` | Verify email with token from link | None | None (token is the credential) |
| POST | `/api/v1/auth/resend-verification` | Resend verification email | None (email in body) | 3/hour per email |
| POST | `/api/v1/auth/forgot-password` | Request password reset email | None | 3/hour per email |
| POST | `/api/v1/auth/reset-password` | Submit new password with reset token | None | 5/hour per IP |
| GET | `/dev/emails` | List captured dev emails | None (dev/staging only) | None |
| DELETE | `/dev/emails` | Clear captured dev emails | None (dev/staging only) | None |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/v1/auth/token` | Add `status = pending_verification` → 403 `EMAIL_NOT_VERIFIED` check before issuing tokens |
| POST | `/api/v1/auth/register` | Replace stub with real email send; add special char to password validation |
| POST | `/api/v1/users/invite` | Replace `str(uuid4())` token with hashed 32-byte random token |
| POST | `/api/v1/users/invite/accept` | Compare raw token against stored hash using `hmac.compare_digest` |

### Request / Response Schemas

#### GET `/api/v1/auth/verify-email?token={raw_token_hex}`

Response 200:
```json
{
  "verified": true,
  "already_verified": false,
  "message": "Email verified. You can now sign in."
}
```

Response 400:
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "This verification link is invalid or has expired.",
    "details": [],
    "request_id": "req_abc123",
    "timestamp": "2026-03-22T10:00:00Z"
  }
}
```

#### POST `/api/v1/auth/resend-verification`

Request:
```json
{ "email": "user@example.com" }
```

Response 200 (always, even if email not found — no account enumeration):
```json
{ "message": "If this email is registered and unverified, a new verification link has been sent." }
```

Response 429:
Standard error envelope with `code: RATE_LIMITED` and `Retry-After: 3600` header.

#### POST `/api/v1/auth/forgot-password`

Request:
```json
{ "email": "user@example.com" }
```

Response 200 (always):
```json
{ "message": "If an account with this email exists, a password reset link has been sent." }
```

#### POST `/api/v1/auth/reset-password`

Request:
```json
{
  "token": "raw_64_char_hex_string",
  "new_password": "NewSecurePass1!"
}
```

Response 200:
```json
{ "message": "Password updated. All existing sessions have been signed out." }
```

Response 400:
Standard error envelope with `code: INVALID_TOKEN`.

#### GET `/dev/emails`

Response 200:
```json
{
  "emails": [
    {
      "to": "user@example.com",
      "subject": "Verify your GridMind email",
      "html": "<p>...</p>",
      "sent_at": "2026-03-22T10:00:00Z"
    }
  ],
  "count": 1
}
```

#### POST `/api/v1/auth/token` — Modified Error

New 403 response when `status = pending_verification`:
```json
{
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address before signing in.",
    "details": [{ "field": "email", "issue": "Email not verified" }],
    "request_id": "req_abc123",
    "timestamp": "2026-03-22T10:00:00Z"
  }
}
```

---

## 9. Technical Design

### 9.1 Token Generation Pattern

Used for all three token types (verification, password reset, invite):

```python
import hashlib
import secrets

def generate_secure_token() -> tuple[str, str]:
    """Generate a cryptographically secure token.

    Returns:
        (raw_hex, sha256_hash) — raw_hex is sent to the user via email,
        sha256_hash is stored in the database.
    """
    raw = secrets.token_hex(32)   # 64-character hex string, 256 bits entropy
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed
```

Token lookup always uses `hmac.compare_digest(stored_hash, hashlib.sha256(raw.encode()).hexdigest())` to prevent timing attacks.

### 9.2 Email Service Abstraction — `gateway/email.py`

```python
# Module: gateway/email.py
# Two implementations sharing one interface:
#   ResendEmailClient   — calls Resend HTTP API
#   MockEmailClient     — appends to Redis list gridmind:dev:emails

class EmailClient(Protocol):
    async def send(self, to: str, subject: str, html: str) -> None: ...

def get_email_client(settings: Settings, redis: Redis) -> EmailClient:
    key = settings.resend_api_key or ""
    if not key or key.startswith("re_test_"):
        return MockEmailClient(redis)
    return ResendEmailClient(api_key=key)
```

The `send()` method is always awaited but runs fire-and-forget from the route handler using `asyncio.create_task()` so email delivery does not block the HTTP response. Errors from `send()` are caught inside the task and logged with structlog at `ERROR` level — they never propagate to the caller.

The config must add:
```python
resend_api_key: str | None = None  # replaces sendgrid_api_key
portal_base_url: str = "http://localhost:3001"  # used to construct email links
```

`sendgrid_api_key` in `config.py` is removed and replaced with `resend_api_key`.

### 9.3 Mock Email Client

```
Redis list key : gridmind:dev:emails
Max entries    : 100 (LTRIM after LPUSH to cap at 100)
Entry format   : JSON string {"to", "subject", "html", "sent_at"}
Direction      : LPUSH (newest first), GET returns LRANGE 0 99
```

### 9.4 Disposable Email Domain Blocklist (FR-003)

Replace the existing 7-domain `_DISPOSABLE_DOMAINS` set in `auth.py` with:

```python
_DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "trashmail.com", "10minutemail.com",
    "dispostable.com", "fakeinbox.com", "spamgourmet.com", "maildrop.cc",
    "getairmail.com", "mailnull.com", "spamfree24.org", "discard.email",
    "mailexpire.com", "spamgob.com", "trashmail.at", "getnada.com",
}
```

### 9.5 Password Strength — Add Special Character Requirement

Current `_check_password_strength` in `auth.py` checks uppercase, lowercase, digit. Add:

```python
_SPECIAL_CHARS = set("!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?")
if not any(c in _SPECIAL_CHARS for c in password):
    issues.append({"field": "password", "issue": "Must contain a special character"})
```

Update the frontend `validateAccount()` in `register/page.tsx` to match: regex pattern becomes
`/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\\/?])/`.

### 9.6 Authentication Gate — Verified Status Check in Login

In `auth.py` `login()` handler, after user lookup and password verification, add before token issuance:

```python
if user["status"] == "pending_verification":
    raise PermissionDeniedError("EMAIL_NOT_VERIFIED")
    # Note: use a new EmailNotVerifiedError subclass of GridMindError
    # with code="EMAIL_NOT_VERIFIED" and status_code=403
```

New error class in `errors.py`:

```python
class EmailNotVerifiedError(GridMindError):
    """403 — Email address has not been verified."""

    def __init__(self) -> None:
        super().__init__(
            "EMAIL_NOT_VERIFIED",
            "Please verify your email address before signing in.",
            403,
            [{"field": "email", "issue": "Email not verified"}],
        )
```

### 9.7 Rate Limiting Implementation

Rate limits are tracked in Redis using sliding window counters:

```
Key pattern : gridmind:ratelimit:{action}:{identifier}
TTL         : 3600 seconds (1 hour window)
Value       : integer counter (INCR)
```

Actions:
- `email_verify_resend:{email}` — max 3 per hour
- `password_reset_request:{email}` — max 3 per hour
- `password_reset_submit:{ip}` — max 5 per hour

Helper:

```python
async def check_rate_limit(redis: Redis, key: str, limit: int, window: int = 3600) -> None:
    """Raise RateLimitedError if the key has exceeded limit within window seconds."""
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    if count > limit:
        ttl = await redis.ttl(key)
        raise RateLimitedError(f"Too many requests. Try again in {ttl} seconds.")
```

`Retry-After` header value = Redis TTL of the rate limit key. This must be added to the error response for 429s.

### 9.8 Portal Route Changes

#### New pages

| Route | File | Purpose |
|-------|------|---------|
| `/check-email` | `portal/src/app/check-email/page.tsx` | Shown after registration; resend button with 60s countdown |
| `/verify-email` | `portal/src/app/verify-email/page.tsx` | Token processing page; auto-submits on load; shows success/error |
| `/forgot-password` | `portal/src/app/forgot-password/page.tsx` | Email input form |
| `/reset-password` | `portal/src/app/reset-password/page.tsx` | New password form; reads `?token=` from URL |
| `/invite/accept` | `portal/src/app/invite/accept/page.tsx` | Invite acceptance; reads `?token=` and `?email=` from URL; email field pre-filled and read-only |
| `/dev/emails` | `portal/src/app/dev/emails/page.tsx` | Dev email viewer; only rendered when `NEXT_PUBLIC_DEV_EMAIL_VIEWER=true` |

#### Modified `(authenticated)/layout.tsx`

Add email verification gate. After the `isAuthenticated()` check, check the `emailVerified` field from the auth store. If `false`, call `router.replace("/check-email")`.

```typescript
// In AuthenticatedLayout useEffect:
hydrateFromStorage();
if (!isAuthenticated()) {
  router.replace("/login");
  return;
}
if (!isEmailVerified()) {          // new check
  router.replace("/check-email");
  return;
}
```

`isEmailVerified()` reads from `authStore` which stores `email_verified: boolean` from the login response. The login endpoint must include `email_verified` in the `TokenResponse`. Since verified users are the only ones who receive tokens (after FR-007 gate), `email_verified` is always `true` in the token response — but the store field is needed for the register-then-redirect flow where the user has a token-equivalent session indicator.

**Design decision:** Rather than including `email_verified` in the JWT (which would require token re-issue on verification), the portal calls `GET /api/v1/users/me` on app init and stores `email_verified` from the profile response. The authenticated layout waits for that call before rendering. If the API returns `email_verified: false`, redirect to `/check-email`.

Update `UserResponse` schema to include `email_verified: bool`.
Update `GET /api/v1/users/me` to return `email_verified` from the user record.

#### Modified `register/page.tsx`

After successful registration (currently `router.push("/onboarding")`), change to `router.push("/check-email")`.

#### Modified `login/page.tsx`

After a 403 `EMAIL_NOT_VERIFIED` error response, show a dedicated error state with a "Resend verification email" button that calls `POST /api/v1/auth/resend-verification`.

---

## 10. Email Templates

All templates are minimal HTML strings defined as Python constants in `gateway/email_templates.py`. They follow GridMind's dark brand (inline styles only for email client compatibility).

### 10.1 Email Verification Template

**Subject:** `Verify your GridMind email address`

**Key elements:**
- GridMind "G" logo block (table-based, `#2563EB` background)
- Heading: "Confirm your email address"
- Body: "Click the button below to verify your email and activate your GridMind account."
- CTA button: `Verify email address` → `{portal_base_url}/verify-email?token={raw_token}`
- Expiry notice: "This link expires in 24 hours."
- Fallback URL: raw URL in monospace below the button
- Footer: "If you did not create a GridMind account, you can safely ignore this email."

### 10.2 Password Reset Template

**Subject:** `Reset your GridMind password`

**Key elements:**
- Heading: "Reset your password"
- Body: "We received a request to reset the password for your GridMind account."
- CTA button: `Reset password` → `{portal_base_url}/reset-password?token={raw_token}`
- Expiry notice: "This link expires in 1 hour."
- Security note: "If you did not request a password reset, your account is safe — you can ignore this email."

### 10.3 Org Member Invite Template

**Subject:** `{inviter_name} invited you to join {org_name} on GridMind`

**Key elements:**
- Heading: "You've been invited"
- Body: "{inviter_name} has invited you to join {org_name} on GridMind as {role}."
- CTA button: `Accept invitation` → `{portal_base_url}/invite/accept?token={raw_token}&email={encoded_email}`
- Expiry notice: "This invitation expires in 7 days."

---

## 11. Security Considerations

- **Token entropy:** 32 bytes from `secrets.token_hex()` = 256 bits. Collision probability negligible.
- **Hash storage:** SHA-256 of the raw token stored in DB. Even if the tokens table is breached, raw tokens cannot be recovered. (SHA-256 is appropriate here because tokens are already high-entropy random values, not passwords.)
- **Timing attacks:** All token comparisons use `hmac.compare_digest`. No early-exit string comparison.
- **Account enumeration:** `resend-verification` and `forgot-password` always return HTTP 200 with identical response body regardless of whether the email exists. Structured logging internally records hits/misses.
- **Token reuse:** Tokens are deleted from the DB on first successful use. A second use returns `INVALID_TOKEN`.
- **Old token invalidation:** On resend-verification, DELETE all existing tokens for the user before inserting new one. On forgot-password, same pattern.
- **Session invalidation on password reset:** After password change, DELETE all rows from `_refresh_tokens` (in-memory) or the `refresh_tokens` table (when DB is wired) where `user_id` matches.
- **Invite token upgrade:** Current `str(uuid4())` invite tokens stored in plaintext are replaced. The `token` column in `_invitations` stores the SHA-256 hash. The route handler returns the raw token once in the response (which is logged in dev email capture — fine for dev; in production, it is only transmitted via email, never returned to the caller).
- **Dev endpoint lockdown:** `GET /dev/emails` router is only registered via `app.include_router(dev_router)` inside a `if settings.environment != "production":` guard. There is no runtime flag that can re-enable it in production.
- **SENTRY review required:** All token issuance, comparison, and deletion paths.

---

## 12. Dependencies

### Internal

- `services/gateway/gateway/config.py` — add `resend_api_key`, `portal_base_url`; remove `sendgrid_api_key`
- `services/gateway/gateway/errors.py` — add `EmailNotVerifiedError`
- `services/gateway/gateway/routes/auth.py` — modify register, login; add verify-email, resend-verification, forgot-password, reset-password
- `services/gateway/gateway/routes/users.py` — upgrade invite token generation and comparison
- `services/gateway/gateway/schemas/auth.py` — add schemas for new endpoints
- `services/gateway/gateway/schemas/users.py` — ensure `InviteResponse` returns raw token for email construction
- `shared/models/user.py` — no changes needed (status enum already correct)
- `migrations/012_email_tokens.sql` — new migration (UP + DOWN)
- `services/portal/src/stores/authStore.ts` — add `emailVerified`, resend/forgot/reset actions, update `/users/me` call
- `services/portal/src/app/(authenticated)/layout.tsx` — add email verification gate
- `services/portal/src/app/register/page.tsx` — fix redirect from `/onboarding` to `/check-email`; update password regex
- `services/portal/src/app/login/page.tsx` — handle `EMAIL_NOT_VERIFIED` error with resend button

### External

- **Resend** (`resend` Python SDK or direct HTTP) — transactional email in production
- **Redis** — rate limiting counters + mock email capture (already in stack)
- **PostgreSQL** — token storage (already in stack)

---

## 13. Test Plan Summary

### Gateway (pytest)

| Test File | What it covers |
|-----------|---------------|
| `tests/test_auth_verification.py` | verify-email endpoint (valid, expired, used, already-active) |
| `tests/test_auth_resend.py` | resend-verification (success, rate limit, unknown email) |
| `tests/test_auth_password_reset.py` | forgot-password (always 200), reset-password (valid, expired, reused, weak pw) |
| `tests/test_auth_login_gate.py` | Login with pending_verification user → 403 EMAIL_NOT_VERIFIED |
| `tests/test_auth_register.py` | Registration with disposable domain, missing special char, duplicate email |
| `tests/test_email_service.py` | MockEmailClient captures to Redis; ResendEmailClient calls Resend API |
| `tests/test_dev_emails.py` | /dev/emails endpoint returns captured emails; blocked in prod |
| `tests/test_users_invite.py` | Invite token is hashed; accept with valid/expired/used token |

### Portal (vitest)

| Test File | What it covers |
|-----------|---------------|
| `__tests__/app/check-email.test.tsx` | Resend button renders, countdown timer, disabled during cooldown |
| `__tests__/app/verify-email.test.tsx` | Auto-submission on load, success state, error state |
| `__tests__/app/forgot-password.test.tsx` | Form submission, success message |
| `__tests__/app/reset-password.test.tsx` | Token from URL, password strength validation, success/error |
| `__tests__/app/invite-accept.test.tsx` | Email pre-filled and read-only, form submission |
| `__tests__/stores/authStore.test.ts` | emailVerified state, resendVerification(), forgotPassword(), resetPassword() |
| `__tests__/layout/authenticated.test.tsx` | Redirects to /check-email when emailVerified = false |

---

## 14. Definition of Done

- [ ] All FR-001 through FR-019 implemented
- [ ] All AC-001 through AC-020 passing
- [ ] Migration 012 has tested UP and DOWN
- [ ] Gateway unit + integration tests at ≥ 85% coverage
- [ ] Portal vitest at ≥ 85% coverage
- [ ] `EmailNotVerifiedError` added to `errors.py`
- [ ] `sendgrid_api_key` removed from `config.py` and replaced with `resend_api_key`
- [ ] `/dev/emails` route guard verified: not accessible when `environment = production`
- [ ] Invite token generation upgraded in `users.py`
- [ ] SENTRY review complete — zero CRITICAL/HIGH findings
- [ ] All new portal pages pass axe-core accessibility scan
- [ ] API docs updated (OpenAPI tags and descriptions)
- [ ] SCRIBE updates changelog
- [ ] Deployed to staging + smoke tested (register → verify → login → dashboard)
- [ ] Deployed to production (canary)
