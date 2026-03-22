-- ============================================================================
-- Migration 005: events (partitioned by created_at range monthly)
-- GridMind — NATS event persistence for replay and audit
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS events (
    event_id        UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    event_type      VARCHAR(255)    NOT NULL,
    agent_id        VARCHAR(255)    NOT NULL,
    correlation_id  VARCHAR(255),
    payload         JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    PRIMARY KEY (event_id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial monthly partitions (extend as needed)
CREATE TABLE IF NOT EXISTS events_y2026m01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS events_y2026m02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS events_y2026m03 PARTITION OF events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS events_y2026m04 PARTITION OF events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS events_y2026m05 PARTITION OF events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS events_y2026m06 PARTITION OF events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS events_y2026m07 PARTITION OF events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS events_y2026m08 PARTITION OF events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS events_y2026m09 PARTITION OF events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS events_y2026m10 PARTITION OF events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS events_y2026m11 PARTITION OF events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS events_y2026m12 PARTITION OF events
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS ix_events_tenant_id ON events (tenant_id);
CREATE INDEX IF NOT EXISTS ix_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS ix_events_created_at ON events (created_at);

-- ==== DOWN ====

-- DROP TABLE IF EXISTS events;
