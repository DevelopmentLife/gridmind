-- ============================================================================
-- Migration 009: approval_requests and approval_responses
-- GridMind — Human-in-the-loop approval gates for agent actions
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS approval_requests (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id            VARCHAR(255)    NOT NULL,
    action_description  TEXT            NOT NULL,
    risk_level          VARCHAR(50)     NOT NULL,
    status              VARCHAR(50)     NOT NULL DEFAULT 'pending',
    decided_by          UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    decided_at          TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ     NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_approval_requests_risk_level CHECK (
        risk_level IN ('low','medium','high','critical')
    ),
    CONSTRAINT ck_approval_requests_status CHECK (
        status IN ('pending','approved','rejected','expired','auto_approved')
    )
);

CREATE INDEX IF NOT EXISTS ix_approval_requests_tenant_id ON approval_requests (tenant_id);
CREATE INDEX IF NOT EXISTS ix_approval_requests_status ON approval_requests (status);
CREATE INDEX IF NOT EXISTS ix_approval_requests_decided_by ON approval_requests (decided_by);

CREATE TABLE IF NOT EXISTS approval_responses (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID            NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    decision    VARCHAR(50)     NOT NULL,
    reason      TEXT,
    decided_by  UUID            NOT NULL REFERENCES users(user_id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_approval_responses_decision CHECK (
        decision IN ('approve','reject')
    )
);

CREATE INDEX IF NOT EXISTS ix_approval_responses_request_id ON approval_responses (request_id);
CREATE INDEX IF NOT EXISTS ix_approval_responses_decided_by ON approval_responses (decided_by);

-- ==== DOWN ====

-- DROP TABLE IF EXISTS approval_responses;
-- DROP TABLE IF EXISTS approval_requests;
