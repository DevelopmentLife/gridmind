#!/usr/bin/env bash
# migrations/apply.sh — Sequential migration runner for GridMind PostgreSQL.
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/gridmind" ./migrations/apply.sh
#
# Runs migrations 001-011 in order against the target database.
# Exits immediately on any failure (set -euo pipefail).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable is required." >&2
    exit 1
fi

MIGRATIONS=(
    "001_tenants.sql"
    "002_users_and_roles.sql"
    "003_deployments.sql"
    "004_agents.sql"
    "005_events.sql"
    "006_audit.sql"
    "007_billing.sql"
    "008_incidents.sql"
    "009_approvals.sql"
    "010_communications.sql"
    "011_rls_policies.sql"
    "012_waitlist.sql"
    "013_cost_attribution.sql"
)

echo "=== GridMind Database Migrations ==="
echo "Target: ${DATABASE_URL%%@*}@***"
echo ""

for migration in "${MIGRATIONS[@]}"; do
    filepath="${SCRIPT_DIR}/${migration}"
    if [ ! -f "$filepath" ]; then
        echo "ERROR: Migration file not found: ${filepath}" >&2
        exit 1
    fi
    echo "Applying ${migration}..."
    psql "${DATABASE_URL}" -f "$filepath" --set ON_ERROR_STOP=1
    echo "  Done."
done

echo ""
echo "=== All migrations applied successfully ==="
