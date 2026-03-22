-- ============================================================================
-- Migration 010: notifications and campaigns
-- GridMind — Communication delivery and campaign management
-- ============================================================================

-- ==== UP ====

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID            NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id     UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    channel     VARCHAR(50)     NOT NULL,
    template_id VARCHAR(255)    NOT NULL,
    subject     VARCHAR(500)    NOT NULL,
    body        TEXT            NOT NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'pending',
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_notifications_channel CHECK (
        channel IN ('email','slack','pagerduty','push')
    ),
    CONSTRAINT ck_notifications_status CHECK (
        status IN ('pending','sent','failed','delivered')
    )
);

CREATE INDEX IF NOT EXISTS ix_notifications_tenant_id ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_status ON notifications (status);

CREATE TABLE IF NOT EXISTS campaigns (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    trigger_type VARCHAR(100)   NOT NULL,
    template_id VARCHAR(255)    NOT NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_campaigns_status CHECK (
        status IN ('active','paused','completed')
    )
);

CREATE INDEX IF NOT EXISTS ix_campaigns_status ON campaigns (status);

CREATE OR REPLACE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==== DOWN ====

-- DROP TABLE IF EXISTS campaigns;
-- DROP TABLE IF EXISTS notifications;
