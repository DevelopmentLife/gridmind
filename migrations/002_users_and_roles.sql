-- ============================================================================
-- Migration 002: users and memberships (roles)
-- GridMind — User accounts and organization membership
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS users (
    user_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(320)    NOT NULL UNIQUE,
    password_hash       VARCHAR(255)    NOT NULL,
    full_name           VARCHAR(255)    NOT NULL,
    status              VARCHAR(50)     NOT NULL DEFAULT 'pending_verification',
    mfa_enabled         BOOLEAN         NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted VARCHAR(512),
    last_login_at       TIMESTAMPTZ,
    failed_login_count  INTEGER         NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT ck_users_status CHECK (
        status IN ('pending_verification','active','suspended','locked','deleted')
    )
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_status ON users (status);

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Memberships: many-to-many users <-> tenants with RBAC role

CREATE TABLE IF NOT EXISTS memberships (
    user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, organization_id),

    CONSTRAINT ck_memberships_role CHECK (
        role IN ('org_owner','org_admin','operator','developer',
                 'viewer','billing_admin','api_service')
    )
);

CREATE INDEX IF NOT EXISTS ix_memberships_user_id ON memberships (user_id);
CREATE INDEX IF NOT EXISTS ix_memberships_organization_id ON memberships (organization_id);

CREATE OR REPLACE TRIGGER trg_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==== DOWN ====

-- DROP TABLE IF EXISTS memberships;
-- DROP TABLE IF EXISTS users;
