-- ============================================================================
-- Migration 008: incidents
-- GridMind — Operational incident tracking per deployment
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS incidents (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    deployment_id   UUID            NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
    title           VARCHAR(500)    NOT NULL,
    description     TEXT            NOT NULL,
    severity        VARCHAR(10)     NOT NULL,
    status          VARCHAR(50)     NOT NULL DEFAULT 'detected',
    root_cause      TEXT,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_incidents_severity CHECK (
        severity IN ('P1','P2','P3','P4')
    ),
    CONSTRAINT ck_incidents_status CHECK (
        status IN ('detected','investigating','mitigating','resolved','postmortem')
    )
);

CREATE INDEX IF NOT EXISTS ix_incidents_tenant_id ON incidents (tenant_id);
CREATE INDEX IF NOT EXISTS ix_incidents_deployment_id ON incidents (deployment_id);
CREATE INDEX IF NOT EXISTS ix_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS ix_incidents_status ON incidents (status);

CREATE OR REPLACE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==== DOWN ====

-- DROP TABLE IF EXISTS incidents;
