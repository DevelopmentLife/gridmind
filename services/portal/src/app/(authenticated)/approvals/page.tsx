"use client";

import { useEffect } from "react";
import { useApprovalStore } from "@/stores/approvalStore";
import { ApprovalCard } from "@/components/ApprovalCard";
import { EmptyState } from "@/components/EmptyState";
import type { Approval } from "@/types";

const MOCK_APPROVALS: Approval[] = [
  {
    approvalId: "apr-001",
    agentName: "titan",
    displayName: "TITAN",
    deploymentId: "deploy-001",
    deploymentName: "production-primary",
    action: "Scale connection pool from 1000 → 1500 connections (pgBouncer max_client_conn)",
    rationale: "Current connection utilization is at 95% (950/1000). New connections are queuing with 200ms+ wait times. Scaling the pool will relieve connection pressure without requiring a restart.",
    riskLevel: "high",
    status: "pending",
    requestedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 296 * 1000).toISOString(),
    respondedAt: null,
    respondedBy: null,
  },
  {
    approvalId: "apr-002",
    agentName: "forge",
    displayName: "FORGE",
    deploymentId: "deploy-002",
    deploymentName: "analytics-warehouse",
    action: "CREATE INDEX CONCURRENTLY idx_events_created ON events(created_at) WHERE deleted_at IS NULL",
    rationale: "4 queries are performing sequential scans on the events table (2.3B rows). A partial index on created_at will reduce scan time by an estimated 85%. CONCURRENTLY means no table lock.",
    riskLevel: "low",
    status: "pending",
    requestedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 288 * 1000).toISOString(),
    respondedAt: null,
    respondedBy: null,
  },
  {
    approvalId: "apr-003",
    agentName: "titan",
    displayName: "TITAN",
    deploymentId: "deploy-002",
    deploymentName: "analytics-warehouse",
    action: "Upgrade read replica from db.r7g.2xlarge → db.r7g.4xlarge (2x CPU/Memory)",
    rationale: "Analytics queries are saturating replica CPU at 87%. P95 latency on read replica has risen to 380ms from a baseline of 45ms. Rightsizing will restore performance SLOs.",
    riskLevel: "critical",
    status: "pending",
    requestedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 298 * 1000).toISOString(),
    respondedAt: null,
    respondedBy: null,
  },
  {
    approvalId: "apr-004",
    agentName: "forge",
    displayName: "FORGE",
    deploymentId: "deploy-001",
    deploymentName: "production-primary",
    action: "CREATE INDEX CONCURRENTLY idx_orders_user_created ON orders(user_id, created_at DESC)",
    rationale: "High-frequency query fetching recent orders per user performs index scan on user_id but sorts in memory. Composite index will eliminate sort and reduce P95 from 8ms to under 1ms.",
    riskLevel: "low",
    status: "approved",
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    respondedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    respondedBy: "jane@acme.com",
  },
];

export default function ApprovalsPage() {
  const { approvals, isLoading, upsertApproval, getPendingApprovals, getPendingCount, getCriticalCount } = useApprovalStore();

  useEffect(() => {
    if (approvals.length === 0) {
      MOCK_APPROVALS.forEach(upsertApproval);
    }
  }, [approvals.length, upsertApproval]);

  const pending = getPendingApprovals();
  const resolved = approvals.filter((a) => a.status !== "pending");
  const pendingCount = getPendingCount();
  const criticalCount = getCriticalCount();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-brand-text-primary text-2xl font-bold">Approvals</h1>
        <p className="text-brand-text-muted text-sm mt-1">
          {pendingCount > 0 ? (
            <>
              <span className="text-brand-amber">{pendingCount} awaiting response</span>
              {criticalCount > 0 && (
                <> · <span className="text-brand-red">{criticalCount} critical risk</span></>
              )}
            </>
          ) : (
            <span className="text-brand-green">No pending approvals</span>
          )}
        </p>
      </div>

      {isLoading && approvals.length === 0 && (
        <div className="flex items-center justify-center py-20 text-brand-text-muted text-sm">Loading approvals…</div>
      )}

      {!isLoading && approvals.length === 0 && (
        <EmptyState
          title="No approvals"
          message="Agent requests requiring human sign-off will appear here."
          icon="✅"
        />
      )}

      {/* Pending approvals */}
      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="mb-8">
          <h2 id="pending-heading" className="text-brand-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
            Pending ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((approval) => (
              <ApprovalCard key={approval.approvalId} approval={approval} />
            ))}
          </div>
        </section>
      )}

      {/* Resolved approvals */}
      {resolved.length > 0 && (
        <section aria-labelledby="resolved-heading">
          <h2 id="resolved-heading" className="text-brand-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
            Recently resolved ({resolved.length})
          </h2>
          <div className="space-y-4">
            {resolved.map((approval) => (
              <ApprovalCard key={approval.approvalId} approval={approval} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
