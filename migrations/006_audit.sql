-- ============================================================================
-- Migration 006: audit_log (append-only, partitioned by created_at monthly)
-- GridMind — Immutable audit trail for compliance
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGINT          GENERATED ALWAYS AS IDENTITY,
    tenant_id       UUID            NOT NULL,
    actor_id        UUID,
    actor_type      VARCHAR(50)     NOT NULL,
    action          VARCHAR(255)    NOT NULL,
    resource_type   VARCHAR(100)    NOT NULL,
    resource_id     VARCHAR(255)    NOT NULL,
    details         JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial monthly partitions
CREATE TABLE IF NOT EXISTS audit_log_y2026m01 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m02 PARTITION OF audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m03 PARTITION OF audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m04 PARTITION OF audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m05 PARTITION OF audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m06 PARTITION OF audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m09 PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m10 PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m11 PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS audit_log_y2026m12 PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS ix_audit_log_tenant_id ON audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS ix_audit_log_resource_type ON audit_log (resource_type);
CREATE INDEX IF NOT EXISTS ix_audit_log_created_at ON audit_log (created_at);

-- Immutability: block UPDATE, DELETE on audit_log (append-only compliance requirement)
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is immutable: % is not permitted on this table', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- Revoke destructive permissions from application role
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM gridmind_app;

-- ==== DOWN ====

-- DROP TRIGGER IF EXISTS enforce_audit_immutability ON audit_log;
-- DROP FUNCTION IF EXISTS audit_log_immutable();
-- DROP TABLE IF EXISTS audit_log;
