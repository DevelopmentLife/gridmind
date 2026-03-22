-- ============================================================================
-- Migration 003: deployments
-- GridMind — Managed database deployments per tenant
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS deployments (
    deployment_id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name                        VARCHAR(255)    NOT NULL,
    engine                      VARCHAR(50)     NOT NULL DEFAULT 'postgresql',
    version                     VARCHAR(50)     NOT NULL,
    status                      VARCHAR(50)     NOT NULL DEFAULT 'provisioning',
    region                      VARCHAR(50)     NOT NULL,
    instance_type               VARCHAR(50)     NOT NULL,
    node_count                  INTEGER         NOT NULL DEFAULT 1,
    storage_gb                  INTEGER         NOT NULL,
    connection_string_encrypted VARCHAR(1024),
    config                      JSONB,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_deployments_engine CHECK (
        engine IN ('postgresql')
    ),
    CONSTRAINT ck_deployments_status CHECK (
        status IN ('provisioning','active','maintenance','degraded',
                   'failed','decommissioning','decommissioned')
    )
);

CREATE INDEX IF NOT EXISTS ix_deployments_tenant_id ON deployments (tenant_id);
CREATE INDEX IF NOT EXISTS ix_deployments_status ON deployments (status);

CREATE OR REPLACE TRIGGER trg_deployments_updated_at
    BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==== DOWN ====

-- DROP TABLE IF EXISTS deployments;
