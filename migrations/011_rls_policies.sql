-- ============================================================================
-- Migration 011: row-level security policies
-- GridMind — Tenant data isolation enforced at the database layer
--
-- Every table that carries tenant-scoped data gets:
--   1. RLS enabled (ENABLE ROW LEVEL SECURITY)
--   2. A tenant-isolation policy for the gridmind_app role
--   3. A platform-admin bypass policy for gridmind_platform_admin
--
-- Tables without a direct tenant_id column (agent_state, approval_responses)
-- are protected through their parent table's FK-based join; they are given
-- policies that route through that relationship.
--
-- The billing tables use org_id as the FK name (not tenant_id) — policies
-- reference org_id directly so they match the actual column.
--
-- audit_log is append-only (immutable trigger in migration 006). Its RLS
-- policy permits SELECT + INSERT for gridmind_app; no UPDATE/DELETE rows
-- are needed because the immutability trigger already blocks them at the
-- trigger level, and migration 006 already revokes those privileges.
-- ============================================================================

-- ==== UP ====

-- ----------------------------------------------------------------------------
-- Helper: idempotent role creation
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE ROLE gridmind_app;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE ROLE gridmind_platform_admin;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Helper function: resolve current tenant from session-local GUC
-- Returns NULL (not an error) when the setting is absent so that superuser
-- and migration sessions are unaffected.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
    SELECT current_setting('app.current_tenant_id', true)::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Grant table-level privileges to gridmind_app
-- (SELECT/INSERT/UPDATE/DELETE on all tenant-scoped tables)
-- ----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON tenants             TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployments         TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_registry      TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_state         TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON events              TO gridmind_app;
GRANT SELECT, INSERT               ON audit_log             TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON incidents           TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_requests   TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON approval_responses  TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions       TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices            TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_records       TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_events      TO gridmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications       TO gridmind_app;

-- gridmind_platform_admin gets full access (no row filtering)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gridmind_platform_admin;

-- ----------------------------------------------------------------------------
-- 1. tenants
--    The tenants table itself: a tenant may only see its own row.
-- ----------------------------------------------------------------------------

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON tenants
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. deployments
-- ----------------------------------------------------------------------------

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON deployments
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON deployments
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. agent_registry
-- ----------------------------------------------------------------------------

ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON agent_registry
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON agent_registry
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. agent_state
--    No direct tenant_id column. Isolation is enforced through agent_registry.
--    Rows are visible only when the referenced agent_registry row belongs to
--    the current tenant.
-- ----------------------------------------------------------------------------

ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON agent_state
    FOR ALL
    TO gridmind_app
    USING (
        EXISTS (
            SELECT 1
            FROM agent_registry ar
            WHERE ar.agent_id = agent_state.agent_id
              AND ar.tenant_id = current_tenant_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM agent_registry ar
            WHERE ar.agent_id = agent_state.agent_id
              AND ar.tenant_id = current_tenant_id()
        )
    );

CREATE POLICY platform_admin_all ON agent_state
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. events  (partitioned table — policy applies to all partitions)
-- ----------------------------------------------------------------------------

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON events
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON events
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. audit_log  (partitioned, append-only)
--    gridmind_app may SELECT and INSERT only.
--    UPDATE/DELETE are already blocked by the immutability trigger and by
--    the REVOKE in migration 006; no WITH CHECK needed for those operations.
-- ----------------------------------------------------------------------------

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON audit_log
    FOR SELECT
    TO gridmind_app
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_insert ON audit_log
    FOR INSERT
    TO gridmind_app
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON audit_log
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 7. incidents
-- ----------------------------------------------------------------------------

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON incidents
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON incidents
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 8. approval_requests
-- ----------------------------------------------------------------------------

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON approval_requests
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON approval_requests
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 9. approval_responses
--    No direct tenant_id column. Isolation is enforced through approval_requests.
-- ----------------------------------------------------------------------------

ALTER TABLE approval_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_responses FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON approval_responses
    FOR ALL
    TO gridmind_app
    USING (
        EXISTS (
            SELECT 1
            FROM approval_requests ar
            WHERE ar.id = approval_responses.request_id
              AND ar.tenant_id = current_tenant_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM approval_requests ar
            WHERE ar.id = approval_responses.request_id
              AND ar.tenant_id = current_tenant_id()
        )
    );

CREATE POLICY platform_admin_all ON approval_responses
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 10. subscriptions  (FK column is org_id, not tenant_id)
-- ----------------------------------------------------------------------------

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON subscriptions
    FOR ALL
    TO gridmind_app
    USING (org_id = current_tenant_id())
    WITH CHECK (org_id = current_tenant_id());

CREATE POLICY platform_admin_all ON subscriptions
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 11. invoices  (FK column is org_id)
-- ----------------------------------------------------------------------------

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON invoices
    FOR ALL
    TO gridmind_app
    USING (org_id = current_tenant_id())
    WITH CHECK (org_id = current_tenant_id());

CREATE POLICY platform_admin_all ON invoices
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 12. usage_records  (FK column is org_id)
-- ----------------------------------------------------------------------------

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON usage_records
    FOR ALL
    TO gridmind_app
    USING (org_id = current_tenant_id())
    WITH CHECK (org_id = current_tenant_id());

CREATE POLICY platform_admin_all ON usage_records
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 13. payment_events  (FK column is org_id)
-- ----------------------------------------------------------------------------

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON payment_events
    FOR ALL
    TO gridmind_app
    USING (org_id = current_tenant_id())
    WITH CHECK (org_id = current_tenant_id());

CREATE POLICY platform_admin_all ON payment_events
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 14. notifications
-- ----------------------------------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON notifications
    FOR ALL
    TO gridmind_app
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY platform_admin_all ON notifications
    FOR ALL
    TO gridmind_platform_admin
    USING (true)
    WITH CHECK (true);

-- ==== DOWN ====

-- -- Drop all RLS policies and disable RLS on every table
-- -- Run in reverse dependency order to avoid FK conflicts.

-- DROP POLICY IF EXISTS platform_admin_all   ON notifications;
-- DROP POLICY IF EXISTS tenant_isolation      ON notifications;
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON payment_events;
-- DROP POLICY IF EXISTS tenant_isolation      ON payment_events;
-- ALTER TABLE payment_events DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON usage_records;
-- DROP POLICY IF EXISTS tenant_isolation      ON usage_records;
-- ALTER TABLE usage_records DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON invoices;
-- DROP POLICY IF EXISTS tenant_isolation      ON invoices;
-- ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON subscriptions;
-- DROP POLICY IF EXISTS tenant_isolation      ON subscriptions;
-- ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all      ON approval_responses;
-- DROP POLICY IF EXISTS tenant_isolation         ON approval_responses;
-- ALTER TABLE approval_responses DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON approval_requests;
-- DROP POLICY IF EXISTS tenant_isolation      ON approval_requests;
-- ALTER TABLE approval_requests DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON incidents;
-- DROP POLICY IF EXISTS tenant_isolation      ON incidents;
-- ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all         ON audit_log;
-- DROP POLICY IF EXISTS tenant_isolation_insert     ON audit_log;
-- DROP POLICY IF EXISTS tenant_isolation_select     ON audit_log;
-- ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON events;
-- DROP POLICY IF EXISTS tenant_isolation      ON events;
-- ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON agent_state;
-- DROP POLICY IF EXISTS tenant_isolation      ON agent_state;
-- ALTER TABLE agent_state DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON agent_registry;
-- DROP POLICY IF EXISTS tenant_isolation      ON agent_registry;
-- ALTER TABLE agent_registry DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON deployments;
-- DROP POLICY IF EXISTS tenant_isolation      ON deployments;
-- ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS platform_admin_all   ON tenants;
-- DROP POLICY IF EXISTS tenant_isolation      ON tenants;
-- ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- DROP FUNCTION IF EXISTS current_tenant_id();

-- REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM gridmind_platform_admin;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON notifications    FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON payment_events  FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON usage_records   FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON invoices        FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON subscriptions   FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON approval_responses FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON approval_requests  FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON incidents       FROM gridmind_app;
-- REVOKE SELECT, INSERT               ON audit_log         FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON events          FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON agent_state     FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON agent_registry  FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON deployments     FROM gridmind_app;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON tenants         FROM gridmind_app;
-- -- Note: roles themselves are not dropped here as they may be used by other objects.
-- -- To drop roles: DROP ROLE IF EXISTS gridmind_app; DROP ROLE IF EXISTS gridmind_platform_admin;
