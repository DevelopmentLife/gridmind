-- ============================================================================
-- Migration 001: tenants
-- GridMind — Tenant organizations table
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name        VARCHAR(255)    NOT NULL,
    slug            VARCHAR(255)    NOT NULL UNIQUE,
    status          VARCHAR(50)     NOT NULL DEFAULT 'provisioning',
    tier            VARCHAR(50)     NOT NULL DEFAULT 'STARTER',
    billing_model   VARCHAR(50)     NOT NULL DEFAULT 'BYOC',
    stripe_customer_id VARCHAR(255),
    health_score    DOUBLE PRECISION,
    churn_risk      DOUBLE PRECISION,
    trial_ends_at   TIMESTAMPTZ,
    settings        JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_tenants_status CHECK (
        status IN ('provisioning','trial','active','suspended',
                   'deactivating','deactivated','archived')
    ),
    CONSTRAINT ck_tenants_tier CHECK (
        tier IN ('STARTER','GROWTH','SCALE','ENTERPRISE','STRATEGIC')
    ),
    CONSTRAINT ck_tenants_billing_model CHECK (
        billing_model IN ('BYOC','DEDICATED','ENTERPRISE_LICENSE')
    )
);

CREATE INDEX IF NOT EXISTS ix_tenants_slug ON tenants (slug);
CREATE INDEX IF NOT EXISTS ix_tenants_status ON tenants (status);

-- Trigger to auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==== DOWN ====

-- DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
-- DROP TABLE IF EXISTS tenants;
