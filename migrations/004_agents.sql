-- ============================================================================
-- Migration 004: agent_registry and agent_state
-- GridMind — AI agent registration and runtime state
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS agent_registry (
    agent_id    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_type  VARCHAR(100)    NOT NULL,
    version     VARCHAR(50)     NOT NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'stopped',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_agent_registry_status CHECK (
        status IN ('running','degraded','stopped','dead','restarting')
    )
);

CREATE INDEX IF NOT EXISTS ix_agent_registry_tenant_id ON agent_registry (tenant_id);
CREATE INDEX IF NOT EXISTS ix_agent_registry_status ON agent_registry (status);

CREATE OR REPLACE TRIGGER trg_agent_registry_updated_at
    BEFORE UPDATE ON agent_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent state: one row per agent, overwritten every heartbeat

CREATE TABLE IF NOT EXISTS agent_state (
    agent_id            UUID            PRIMARY KEY REFERENCES agent_registry(agent_id) ON DELETE CASCADE,
    status              VARCHAR(50)     NOT NULL DEFAULT 'stopped',
    cpu_pct             DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    memory_pct          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tasks_in_flight     INTEGER         NOT NULL DEFAULT 0,
    last_heartbeat_at   TIMESTAMPTZ,
    error_count         INTEGER         NOT NULL DEFAULT 0,
    uptime_seconds      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_agent_state_status CHECK (
        status IN ('running','degraded','stopped','dead','restarting')
    )
);

CREATE OR REPLACE TRIGGER trg_agent_state_updated_at
    BEFORE UPDATE ON agent_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==== DOWN ====

-- DROP TABLE IF EXISTS agent_state;
-- DROP TABLE IF EXISTS agent_registry;
