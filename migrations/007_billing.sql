-- ============================================================================
-- Migration 007: billing tables
-- GridMind — Plans, subscriptions, invoices, usage records, payment events
-- ============================================================================

-- ==== UP ====

-- Plans: seeded with Starter/Growth/Scale/Enterprise rows

CREATE TABLE IF NOT EXISTS plans (
    id                  SERIAL          PRIMARY KEY,
    name                VARCHAR(100)    NOT NULL UNIQUE,
    stripe_price_id     VARCHAR(255),
    monthly_price_cents INTEGER         NOT NULL,
    annual_price_cents  INTEGER         NOT NULL,
    max_deployments     INTEGER         NOT NULL,
    max_agents          INTEGER         NOT NULL,
    max_team_members    INTEGER         NOT NULL,
    features            JSONB
);

-- Seed default plans
INSERT INTO plans (name, monthly_price_cents, annual_price_cents, max_deployments, max_agents, max_team_members, features)
VALUES
    ('Starter',    29900,   299000,  3,  12, 5,  '{"support": "email"}'),
    ('Growth',     79900,   799000,  10, 24, 15, '{"support": "email+chat"}'),
    ('Scale',      199900,  1999000, 50, 24, -1, '{"support": "priority", "sso": true}'),
    ('Enterprise', 0,       0,       -1, 24, -1, '{"support": "dedicated", "sso": true, "custom": true}')
ON CONFLICT (name) DO NOTHING;

-- Subscriptions

CREATE TABLE IF NOT EXISTS subscriptions (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    plan_id                 INTEGER         NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    stripe_subscription_id  VARCHAR(255),
    status                  VARCHAR(50)     NOT NULL DEFAULT 'trialing',
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_subscriptions_status CHECK (
        status IN ('trialing','active','past_due','suspended','canceled')
    )
);

CREATE INDEX IF NOT EXISTS ix_subscriptions_org_id ON subscriptions (org_id);
CREATE INDEX IF NOT EXISTS ix_subscriptions_plan_id ON subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS ix_subscriptions_status ON subscriptions (status);

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invoices

CREATE TABLE IF NOT EXISTS invoices (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    stripe_invoice_id   VARCHAR(255),
    amount_due_cents    INTEGER         NOT NULL,
    amount_paid_cents   INTEGER         NOT NULL DEFAULT 0,
    status              VARCHAR(50)     NOT NULL,
    period_start        TIMESTAMPTZ     NOT NULL,
    period_end          TIMESTAMPTZ     NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_invoices_org_id ON invoices (org_id);
CREATE INDEX IF NOT EXISTS ix_invoices_status ON invoices (status);

-- Usage records

CREATE TABLE IF NOT EXISTS usage_records (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID                NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    deployment_id   UUID                NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
    metric          VARCHAR(100)        NOT NULL,
    quantity        DOUBLE PRECISION    NOT NULL,
    recorded_at     TIMESTAMPTZ         NOT NULL,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_usage_records_org_id ON usage_records (org_id);
CREATE INDEX IF NOT EXISTS ix_usage_records_deployment_id ON usage_records (deployment_id);
CREATE INDEX IF NOT EXISTS ix_usage_records_recorded_at ON usage_records (recorded_at);

-- Payment events

CREATE TABLE IF NOT EXISTS payment_events (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    stripe_event_id VARCHAR(255),
    event_type      VARCHAR(100)    NOT NULL,
    amount_cents    INTEGER         NOT NULL DEFAULT 0,
    status          VARCHAR(50)     NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payment_events_org_id ON payment_events (org_id);
CREATE INDEX IF NOT EXISTS ix_payment_events_event_type ON payment_events (event_type);

-- ==== DOWN ====

-- DROP TABLE IF EXISTS payment_events;
-- DROP TABLE IF EXISTS usage_records;
-- DROP TABLE IF EXISTS invoices;
-- DROP TABLE IF EXISTS subscriptions;
-- DROP TABLE IF EXISTS plans;
