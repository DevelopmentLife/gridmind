# GridMind API Reference

**Version:** 0.1.0
**Base URL:** `https://api.gridmindai.dev`
**Content-Type:** `application/json`
**Auth:** `Authorization: Bearer {access_token}` (JWT RS256)

All timestamps are ISO 8601, UTC. Pagination uses cursor-based strategy returning `total_count`, `next_cursor`, `has_more`.

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description.",
    "details": [{ "field": "email", "issue": "Invalid format" }],
    "request_id": "req_abc123",
    "timestamp": "2026-03-21T14:30:00Z"
  }
}
```

---

## Authentication

Prefix: `/api/v1/auth`

### POST /api/v1/auth/token

Authenticate with email and password. Rate limited to 10/minute. Progressive lockout after 5 failures; account locked for 30 minutes after 10 consecutive failures.

**Auth required:** No

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

### POST /api/v1/auth/refresh

Rotate access token using a valid refresh token. Old refresh token is consumed; a new one is issued.

**Auth required:** No

**Request body:**
```json
{ "refresh_token": "eyJ..." }
```

**Response `200`:** Same as `/token`

---

### POST /api/v1/auth/logout

Revoke the refresh token, ending the session.

**Auth required:** No (refresh token in body)

**Request body:**
```json
{ "refresh_token": "eyJ..." }
```

**Response `204`:** No content

---

### POST /api/v1/auth/register

Create a new user account and organization. Validates password strength (8+ chars, uppercase, lowercase, digit). Rejects disposable email domains.

**Auth required:** No

**Request body:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass123!",
  "full_name": "Jane Smith",
  "org_name": "Acme Corp"
}
```

**Response `201`:**
```json
{
  "user_id": "uuid",
  "org_id": "uuid",
  "email": "user@company.com"
}
```

---

### POST /api/v1/auth/api-keys

Create a new API key. The raw key (`gm_` prefix) is returned only once; only a masked preview is stored.

**Auth required:** Yes

**Request body:**
```json
{
  "name": "My CI Key",
  "expires_at": "2027-01-01T00:00:00Z"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "name": "My CI Key",
  "key": "gm_abc123...",
  "created_at": "2026-03-21T00:00:00Z"
}
```

---

### GET /api/v1/auth/api-keys

List API keys for the current user. Keys are masked (last 4 chars shown).

**Auth required:** Yes

**Response `200`:** Array of:
```json
{
  "id": "uuid",
  "name": "My CI Key",
  "key_preview": "...a1b2",
  "created_at": "2026-03-21T00:00:00Z",
  "expires_at": null,
  "last_used_at": null
}
```

---

### DELETE /api/v1/auth/api-keys/{key_id}

Revoke an API key.

**Auth required:** Yes

**Response `204`:** No content

---

## Deployments

Prefix: `/api/v1/deployments`

### GET /api/v1/deployments

List deployments for the current tenant. Cursor-paginated.

**Auth required:** Yes (`deployments:read`)

**Query params:** `cursor` (string), `limit` (int, 1-100, default 20)

**Response `200`:**
```json
{
  "items": [{ "id": "uuid", "name": "prod-pg", "engine": "postgresql", "status": "active", ... }],
  "total_count": 3,
  "next_cursor": "uuid",
  "has_more": false
}
```

---

### POST /api/v1/deployments

Create a new deployment.

**Auth required:** Yes (`deployments:write`)

**Request body:**
```json
{
  "name": "prod-pg",
  "engine": "postgresql",
  "engine_version": "16.1",
  "region": "us-east-1",
  "instance_size": "db.r6g.large",
  "storage_gb": 100,
  "connection_string": "postgresql://...",
  "metadata": {}
}
```

**Response `201`:** Full `DeploymentResponse` object with `id`, `status: "provisioning"`, timestamps.

---

### GET /api/v1/deployments/{deployment_id}

Get deployment details.

**Auth required:** Yes (`deployments:read`)

**Response `200`:** `DeploymentResponse`

---

### PATCH /api/v1/deployments/{deployment_id}

Update an existing deployment. Partial update — only provided fields are changed.

**Auth required:** Yes (`deployments:write`)

**Request body:** Subset of deployment fields (name, metadata, etc.)

**Response `200`:** Updated `DeploymentResponse`

---

### DELETE /api/v1/deployments/{deployment_id}

Soft-delete a deployment. Sets status to `deleted`; data is retained.

**Auth required:** Yes (`deployments:write`)

**Response `204`:** No content

---

### GET /api/v1/deployments/{deployment_id}/health

Get current health status of a deployment.

**Auth required:** Yes (`deployments:read`)

**Response `200`:**
```json
{
  "deployment_id": "uuid",
  "status": "healthy",
  "uptime_seconds": 3600.0,
  "connections_active": 12,
  "connections_max": 100,
  "replication_lag_ms": 0.5,
  "last_check": "2026-03-21T14:30:00Z"
}
```

---

### GET /api/v1/deployments/{deployment_id}/metrics

Get resource utilization metrics for a deployment.

**Auth required:** Yes (`deployments:read`)

**Response `200`:**
```json
{
  "deployment_id": "uuid",
  "cpu_percent": 23.5,
  "memory_percent": 45.2,
  "storage_used_gb": 42.0,
  "storage_total_gb": 100.0,
  "iops_read": 150.0,
  "iops_write": 75.0,
  "queries_per_second": 120.0,
  "active_connections": 12,
  "collected_at": "2026-03-21T14:30:00Z"
}
```

---

### POST /api/v1/deployments/{deployment_id}/restart

Initiate a deployment restart. Asynchronous — returns `202 Accepted`.

**Auth required:** Yes (`deployments:write`)

**Response `202`:**
```json
{ "deployment_id": "uuid", "status": "restart_initiated" }
```

---

## Agents

Prefix: `/api/v1/agents`

### GET /api/v1/agents

List all agents for the current tenant. Returns current status for all 24 agents.

**Auth required:** Yes (`agents:read`)

**Query params:** `cursor`, `limit` (1-100, default 20)

**Response `200`:** Paginated list of `AgentResponse`:
```json
{
  "id": "agent-argus",
  "name": "argus",
  "display_name": "ARGUS",
  "tier": "perception",
  "autonomy_level": "autonomous",
  "model": "haiku-4.5",
  "status": "running",
  "tenant_id": "uuid",
  "last_heartbeat": "2026-03-21T14:30:00Z",
  "created_at": "2026-03-21T00:00:00Z"
}
```

---

### GET /api/v1/agents/{agent_id}

Get status and details for a specific agent.

**Auth required:** Yes (`agents:read`)

**Response `200`:** `AgentResponse`

---

### POST /api/v1/agents/{agent_id}/command

Send a command to an agent (published to NATS subject `gridmind.commands.{tenant_id}.{agent_id}`).

**Auth required:** Yes (`agents:write`)

**Request body:**
```json
{
  "command": "pause",
  "parameters": {}
}
```

**Response `200`:**
```json
{ "agent_id": "agent-argus", "command": "pause" }
```

---

### GET /api/v1/agents/approvals

List pending HITL approval requests for the tenant.

**Auth required:** Yes (`agents:read`)

**Query params:** `cursor`, `limit`

**Response `200`:** Paginated list of `ApprovalResponse` objects including `approval_id`, `agent_id`, `action_description`, `risk_level`, `status: "pending"`, `created_at`

---

### POST /api/v1/agents/approvals/{approval_id}/decide

Approve or reject a pending approval request.

**Auth required:** Yes (`agents:write`)

**Request body:**
```json
{
  "decision": "approve",
  "justification": "Reviewed and approved scaling plan."
}
```

**Response `200`:** `ApprovalResponse` with updated `status`, `decided_at`, `decided_by`

---

### GET /api/v1/agents/{agent_id}/timeline

Get the activity timeline for a specific agent.

**Auth required:** Yes (`agents:read`)

**Query params:** `cursor`, `limit`

**Response `200`:** Paginated list of `TimelineEntry` objects

---

## Tenants

Prefix: `/api/v1/tenants`

### GET /api/v1/tenants

List all tenants. Restricted to `owner` and `admin` roles.

**Auth required:** Yes (role: `owner` or `admin`)

**Query params:** `cursor`, `limit`

**Response `200`:** Paginated list of `TenantResponse`

---

### POST /api/v1/tenants

Create a new tenant.

**Auth required:** Yes (role: `owner` or `admin`)

**Request body:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "plan": "growth",
  "metadata": {}
}
```

**Response `201`:** `TenantResponse` with `state: "onboarding"`

---

### GET /api/v1/tenants/{tenant_id}

Get tenant details.

**Auth required:** Yes (`tenants:read`)

**Response `200`:** `TenantResponse`

---

### PATCH /api/v1/tenants/{tenant_id}

Update tenant metadata or plan.

**Auth required:** Yes (role: `owner` or `admin`)

**Request body:** Partial — any updatable field

**Response `200`:** Updated `TenantResponse`

---

### POST /api/v1/tenants/{tenant_id}/lifecycle

Transition tenant lifecycle state. Valid transitions:

- `onboarding` → `trial` or `active`
- `trial` → `active` or `churned`
- `active` → `suspended` or `churned`
- `suspended` → `active` or `churned`

**Auth required:** Yes (role: `owner` or `admin`)

**Request body:**
```json
{ "target_state": "active" }
```

**Response `200`:** Updated `TenantResponse`

---

### GET /api/v1/tenants/{tenant_id}/usage

Get tenant usage statistics for the current billing period.

**Auth required:** Yes (`tenants:read`)

**Response `200`:**
```json
{
  "tenant_id": "uuid",
  "deployment_count": 3,
  "active_agents": 24,
  "total_queries": 125000,
  "total_events": 45000,
  "storage_used_gb": 42.5,
  "monthly_cost": 299.00,
  "period_start": "2026-03-01T00:00:00Z",
  "period_end": "2026-03-21T14:30:00Z"
}
```

---

## Billing

Prefix: `/api/v1/billing`

Stripe-backed. All operations are delegated to the Stripe API via the internal `StripeService`.

### POST /api/v1/billing/customers

Create a Stripe customer record for a tenant.

**Auth required:** Yes (`billing:write`)

**Request body:**
```json
{ "email": "billing@company.com", "name": "Acme Corp", "metadata": {} }
```

**Response `201`:** `CustomerResponse` with Stripe `customer_id`

---

### GET /api/v1/billing/customers/{customer_id}

Retrieve a Stripe customer.

**Auth required:** Yes (`billing:read`)

**Response `200`:** `CustomerResponse`

---

### POST /api/v1/billing/setup-intent

Create a Stripe SetupIntent for collecting payment method details (used in the frontend payment form).

**Auth required:** Yes (`billing:write`)

**Query params:** `customer_id` (required)

**Response `200`:** `SetupIntentResponse` with `client_secret` for Stripe.js

---

### POST /api/v1/billing/payment-methods/attach

Attach a payment method (collected via SetupIntent) to a customer.

**Auth required:** Yes (`billing:write`)

**Request body:**
```json
{ "payment_method_id": "pm_...", "customer_id": "cus_..." }
```

**Response `200`:** `PaymentMethodResponse`

---

### GET /api/v1/billing/payment-methods

List payment methods on file for a customer.

**Auth required:** Yes (`billing:read`)

**Query params:** `customer_id` (required)

**Response `200`:** Array of `PaymentMethodResponse`

---

### POST /api/v1/billing/subscriptions

Create a subscription for a customer.

**Auth required:** Yes (`billing:write`)

**Request body:**
```json
{ "customer_id": "cus_...", "price_id": "price_..." }
```

**Response `201`:** `SubscriptionResponse`

---

### PATCH /api/v1/billing/subscriptions/{subscription_id}

Update a subscription (e.g., plan change).

**Auth required:** Yes (`billing:write`)

**Request body:** Partial subscription fields

**Response `200`:** Updated `SubscriptionResponse`

---

### DELETE /api/v1/billing/subscriptions/{subscription_id}

Cancel a subscription. Stripe handles proration.

**Auth required:** Yes (`billing:write`)

**Response `200`:** Final `SubscriptionResponse` with `status: "canceled"`

---

### POST /api/v1/billing/usage-records

Report metered usage to Stripe (for usage-based billing).

**Auth required:** Yes (`billing:write`)

**Request body:**
```json
{
  "subscription_item_id": "si_...",
  "quantity": 1000,
  "timestamp": "2026-03-21T00:00:00Z"
}
```

**Response `201`:** `UsageRecordResponse`

---

### GET /api/v1/billing/invoices

List invoices for a customer.

**Auth required:** Yes (`billing:read`)

**Query params:** `customer_id` (required), `limit` (1-100, default 10)

**Response `200`:** Array of `InvoiceResponse`

---

### GET /api/v1/billing/invoices/{invoice_id}

Retrieve a specific invoice.

**Auth required:** Yes (`billing:read`)

**Response `200`:** `InvoiceResponse`

---

### POST /api/v1/billing/test-charge

Run a $0.01 test charge to verify a customer's card is valid.

**Auth required:** Yes (`billing:write`)

**Request body:**
```json
{ "customer_id": "cus_..." }
```

**Response `200`:** `TestChargeResponse` with `success`, `charge_id`

---

### POST /api/v1/billing/margin-calculator

Compute margin target and customer price from a monthly cost input.

**Auth required:** Yes (`billing:read`)

**Request body:**
```json
{ "monthly_cost": 150.00 }
```

**Response `200`:**
```json
{ "monthly_cost": 150.00, "customer_price": 225.00, "margin_percent": 33.3 }
```

---

### POST /api/v1/billing/webhook

Receive and process Stripe webhook events. Validates `Stripe-Signature` header (HMAC-SHA256).

**Auth required:** No (Stripe signature verification instead)

**Headers:** `Stripe-Signature: t=...,v1=...`

**Response `200`:** `{ "status": "received" }`

---

## Users

Prefix: `/api/v1/users`

### GET /api/v1/users

List users in the current organization.

**Auth required:** Yes (`users:read`)

**Query params:** `cursor`, `limit`

**Response `200`:** Paginated list of `UserResponse`

---

### GET /api/v1/users/me

Get the current authenticated user's profile.

**Auth required:** Yes

**Response `200`:** `UserResponse`

---

### GET /api/v1/users/{user_id}

Get a user by ID. Must belong to the same organization.

**Auth required:** Yes (`users:read`)

**Response `200`:** `UserResponse`

---

### PATCH /api/v1/users/{user_id}

Update a user (e.g., full_name, avatar_url).

**Auth required:** Yes (`users:write`)

**Request body:** Partial `UserUpdate`

**Response `200`:** Updated `UserResponse`

---

### DELETE /api/v1/users/{user_id}

Soft-delete a user (sets `is_active: false`). Restricted to `owner` and `admin`.

**Auth required:** Yes (role: `owner` or `admin`)

**Response `204`:** No content

---

### POST /api/v1/users/invite

Send an invitation email to a new team member.

**Auth required:** Yes (role: `owner` or `admin`)

**Request body:**
```json
{ "email": "newuser@company.com", "role": "member" }
```

**Response `201`:** `InviteResponse` with `id`, `status: "pending"`, `expires_at`

---

### POST /api/v1/users/invite/accept

Accept an invitation token and create a user account.

**Auth required:** No

**Request body:**
```json
{
  "token": "uuid-invite-token",
  "full_name": "New User",
  "password": "SecurePass123!"
}
```

**Response `201`:** `UserResponse` for the new account

---

### POST /api/v1/users/roles

Change a user's role. Restricted to `owner`.

**Auth required:** Yes (role: `owner`)

**Request body:**
```json
{ "user_id": "uuid", "new_role": "admin" }
```

**Response `200`:** Updated `UserResponse`

---

## Incidents

Prefix: `/api/v1/incidents`

### GET /api/v1/incidents

List incidents for the current tenant.

**Auth required:** Yes (`incidents:read`)

**Query params:** `cursor`, `limit`

**Response `200`:** Paginated list of `IncidentResponse`

---

### POST /api/v1/incidents

Create a new incident (manual creation; agents also create incidents automatically).

**Auth required:** Yes (`incidents:write`)

**Request body:**
```json
{
  "title": "High replication lag on prod-pg",
  "description": "Replication lag exceeded 5 seconds",
  "severity": "high",
  "deployment_id": "uuid",
  "metadata": {}
}
```

**Response `201`:** `IncidentResponse` with `status: "open"`. Initial timeline entry is created automatically.

---

### GET /api/v1/incidents/{incident_id}

Get incident details.

**Auth required:** Yes (`incidents:read`)

**Response `200`:** `IncidentResponse`

---

### PATCH /api/v1/incidents/{incident_id}

Update an incident (title, description, severity, status, etc.).

**Auth required:** Yes (`incidents:write`)

**Request body:** Partial `IncidentUpdate`

**Response `200`:** Updated `IncidentResponse`. Timeline entry added automatically.

---

### POST /api/v1/incidents/{incident_id}/resolve

Mark an incident as resolved. Sets `status: "resolved"` and records `resolved_at`.

**Auth required:** Yes (`incidents:write`)

**Response `200`:** Updated `IncidentResponse`

---

### GET /api/v1/incidents/{incident_id}/timeline

Get the full event timeline for an incident.

**Auth required:** Yes (`incidents:read`)

**Response `200`:** Array of `IncidentTimelineEntry` with `event_type`, `description`, `actor`, `timestamp`

---

### GET /api/v1/incidents/{incident_id}/analysis

Get SHERLOCK AI analysis for an incident (root cause hypotheses + recommendations).

**Auth required:** Yes (`incidents:read`)

**Response `200`:**
```json
{
  "incident_id": "uuid",
  "status": "completed",
  "root_cause": "...",
  "contributing_factors": ["...", "..."],
  "recommended_actions": ["...", "..."],
  "confidence": 0.87,
  "analyzed_at": "2026-03-21T14:30:00Z"
}
```

---

### POST /api/v1/incidents/{incident_id}/analysis/trigger

Trigger SHERLOCK to perform AI root-cause analysis. Asynchronous — returns `202 Accepted`.

**Auth required:** Yes (`incidents:write`)

**Response `202`:**
```json
{ "incident_id": "uuid", "status": "analysis_started" }
```

---

## Chat

Prefix: `/api/v1/chat`

### POST /api/v1/chat

Send a chat message to the GridMind AI assistant. Supports SSE streaming.

**Auth required:** Yes

**Request body:**
```json
{
  "message": "Why is my database slow?",
  "conversation_id": "uuid",
  "context": {},
  "stream": false
}
```

**Response `200` (non-streaming):**
```json
{
  "conversation_id": "uuid",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "...",
    "timestamp": "2026-03-21T14:30:00Z"
  }
}
```

**Response `200` (streaming, `stream: true`):** `text/event-stream` SSE:
```
data: {"id": "uuid", "delta": "word", "done": false}

data: {"id": "uuid", "delta": "", "done": true}
```

---

### GET /api/v1/chat/conversations

List chat conversations for the current user.

**Auth required:** Yes

**Query params:** `cursor`, `limit`

**Response `200`:** Paginated list of `ConversationSummary` (id, title, message_count, created_at, updated_at)

---

### GET /api/v1/chat/conversations/{conversation_id}

Get a conversation with its full message history.

**Auth required:** Yes

**Response `200`:** `ConversationResponse` with `messages` array

---

### DELETE /api/v1/chat/conversations/{conversation_id}

Delete a conversation and all its messages.

**Auth required:** Yes

**Response `204`:** No content

---

## Onboarding

Prefix: `/api/v1/onboarding`

Manages the 7-phase guided onboarding flow (driven by HARBOR agent). Phases: `welcome` → `connect_database` → `configure_agents` → `verify_monitoring` → `complete`.

### POST /api/v1/onboarding

Start a new onboarding session.

**Auth required:** Yes

**Request body:**
```json
{ "deployment_id": "uuid" }
```

**Response `201`:**
```json
{
  "session_id": "uuid",
  "tenant_id": "uuid",
  "current_phase": "welcome",
  "completed_phases": [],
  "started_at": "2026-03-21T00:00:00Z"
}
```

---

### GET /api/v1/onboarding/{session_id}

Get the current status of an onboarding session.

**Auth required:** Yes

**Response `200`:** `OnboardingStatus`

---

### POST /api/v1/onboarding/{session_id}/transition

Advance the onboarding session to the next phase. Only sequential forward transitions are permitted.

**Auth required:** Yes

**Request body:**
```json
{ "target_phase": "connect_database" }
```

**Response `200`:** Updated `OnboardingStatus`

---

### POST /api/v1/onboarding/{session_id}/abandon

Abandon an onboarding session. Abandoned sessions cannot be transitioned.

**Auth required:** Yes

**Response `200`:** Updated `OnboardingStatus` with `abandoned: true`

---

### GET /api/v1/onboarding/{session_id}/checklist

Get the task checklist for the current phase, including completion state and progress percentage.

**Auth required:** Yes

**Response `200`:**
```json
{
  "session_id": "uuid",
  "phase": "connect_database",
  "items": [
    { "id": "db-1", "label": "Provide database connection string", "completed": false, "required": true },
    { "id": "db-2", "label": "Verify connectivity", "completed": false, "required": true },
    { "id": "db-3", "label": "Configure SSL/TLS", "completed": false, "required": false }
  ],
  "progress_percent": 0.0
}
```

---

## System Endpoints

### GET /health

Liveness probe. Always returns `200 OK`.

**Response `200`:** `{ "status": "ok" }`

---

### GET /readyz

Readiness probe. Checks PostgreSQL, Redis, and NATS connectivity.

**Response `200`:**
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "nats": "unchecked"
  }
}
```

---

### GET /metrics

Prometheus scrape endpoint. Returns metrics in Prometheus text format.

**Content-Type:** `text/plain; version=0.0.4`

---

## WebSocket Channels

All WebSocket endpoints authenticate via JWT: pass `?token={access_token}` as a query parameter, or set `Authorization: Bearer {token}` header. Closes with code `4001` on auth failure, `4003` on tenant mismatch.

### WS /ws/{tenant_id}/agents

Real-time agent heartbeats and status updates for a tenant. Server pushes `AgentStatus` objects as agents emit heartbeats.

**Use case:** Fleet overview dashboard; live agent health indicators.

---

### WS /ws/{tenant_id}/metrics

Aggregated metrics stream for a tenant's deployments. Server pushes periodic `MetricsBatch` objects (CPU, memory, QPS, connections).

**Use case:** Real-time metrics charts and sparklines.

---

### WS /ws/{tenant_id}/notifications

Alerts, incidents, and system messages. Server pushes `Notification` objects when incidents are created or escalated.

**Use case:** Alert banner, notification bell, incident sidebar.

---

### WS /ws/{tenant_id}/approvals

HITL approval request push and inline decision capability. Server pushes `ApprovalRequest` objects when a SUPERVISED agent needs human authorization. Clients can send approval decisions inline over the socket.

**Use case:** Approval queue panel; real-time approval prompts.
