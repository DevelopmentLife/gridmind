-- 012_waitlist.sql — Waitlist signup capture for pre-launch email collection.
--
-- This table is NOT tenant-scoped (no tenant_id) because signups happen
-- before users have accounts.  No RLS required.

-- ==== UP ====

CREATE TABLE IF NOT EXISTS waitlist_signups (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    source          VARCHAR(100)    NOT NULL DEFAULT 'homepage',
    referral_code   VARCHAR(50),
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_waitlist_signups_email ON waitlist_signups (email);
CREATE INDEX IF NOT EXISTS ix_waitlist_signups_created_at ON waitlist_signups (created_at);

-- ==== DOWN ====
-- DROP TABLE IF EXISTS waitlist_signups;
