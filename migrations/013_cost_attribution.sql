-- Migration 013: Cost Attribution — agent_decisions (partitioned) and cost_rollups.
-- UP

-- ==========================================================================
-- agent_decisions — partitioned by created_at (monthly, 2026)
-- ==========================================================================

CREATE TABLE agent_decisions (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    deployment_id   UUID            NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
    agent_name      VARCHAR(100)    NOT NULL,
    decision_type   VARCHAR(100)    NOT NULL,
    model_used      VARCHAR(100)    NOT NULL,
    input_tokens    INTEGER         NOT NULL DEFAULT 0,
    output_tokens   INTEGER         NOT NULL DEFAULT 0,
    model_cost_usd  NUMERIC(12, 8)  NOT NULL DEFAULT 0.0,
    compute_ms      INTEGER         NOT NULL DEFAULT 0,
    compute_cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0.0,
    tool_calls      INTEGER         NOT NULL DEFAULT 0,
    tool_cost_usd   NUMERIC(12, 8)  NOT NULL DEFAULT 0.0,
    total_cost_usd  NUMERIC(12, 8)  GENERATED ALWAYS AS (
        model_cost_usd + compute_cost_usd + tool_cost_usd
    ) STORED,
    session_id      UUID            NULL,
    correlation_id  UUID            NULL,
    metadata        JSONB           NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 12 monthly partitions for 2026
CREATE TABLE agent_decisions_2026_01 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE agent_decisions_2026_02 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE agent_decisions_2026_03 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE agent_decisions_2026_04 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE agent_decisions_2026_05 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE agent_decisions_2026_06 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE agent_decisions_2026_07 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE agent_decisions_2026_08 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE agent_decisions_2026_09 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE agent_decisions_2026_10 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE agent_decisions_2026_11 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE agent_decisions_2026_12 PARTITION OF agent_decisions
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Indexes on the parent table (propagate to partitions automatically)
CREATE INDEX ix_agent_decisions_tenant_id ON agent_decisions (tenant_id);
CREATE INDEX ix_agent_decisions_deployment_id ON agent_decisions (deployment_id);
CREATE INDEX ix_agent_decisions_agent_name ON agent_decisions (agent_name);
CREATE INDEX ix_agent_decisions_model_used ON agent_decisions (model_used);
CREATE INDEX ix_agent_decisions_created_at ON agent_decisions (created_at);
CREATE INDEX ix_agent_decisions_session_id ON agent_decisions (session_id) WHERE session_id IS NOT NULL;

-- RLS
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_agent_decisions ON agent_decisions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ==========================================================================
-- cost_rollups — aggregated cost data per period
-- ==========================================================================

CREATE TABLE cost_rollups (
    id              UUID            NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id       UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    deployment_id   UUID            NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
    agent_name      VARCHAR(100)    NOT NULL,
    period_start    TIMESTAMPTZ     NOT NULL,
    period_end      TIMESTAMPTZ     NOT NULL,
    period_type     VARCHAR(20)     NOT NULL,
    total_decisions INTEGER         NOT NULL DEFAULT 0,
    total_tokens    BIGINT          NOT NULL DEFAULT 0,
    total_cost_usd  NUMERIC(12, 8)  NOT NULL DEFAULT 0.0,
    model_breakdown JSONB           NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT ck_cost_rollups_period_type
        CHECK (period_type IN ('hourly', 'daily', 'monthly')),
    CONSTRAINT uq_cost_rollups_unique_period
        UNIQUE (tenant_id, deployment_id, agent_name, period_start, period_type)
);

CREATE INDEX ix_cost_rollups_tenant_id ON cost_rollups (tenant_id);
CREATE INDEX ix_cost_rollups_deployment_id ON cost_rollups (deployment_id);
CREATE INDEX ix_cost_rollups_period_start ON cost_rollups (period_start);
CREATE INDEX ix_cost_rollups_period_type ON cost_rollups (period_type);

-- RLS
ALTER TABLE cost_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_cost_rollups ON cost_rollups
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);


-- ==========================================================================
-- DOWN
-- ==========================================================================
-- To reverse this migration, run:
--
-- DROP TABLE IF EXISTS cost_rollups CASCADE;
-- DROP TABLE IF EXISTS agent_decisions CASCADE;
