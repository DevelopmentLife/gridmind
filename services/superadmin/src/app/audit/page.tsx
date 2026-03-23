"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { AuditLogRow } from "@/components/AuditLogRow";
import type { AuditLogEntry } from "@/types";
import clsx from "clsx";

const MOCK_AUDIT: AuditLogEntry[] = [
  { auditId: "aud-001", tenantId: "t-001", tenantName: "Acme Corporation", agentId: "sherlock-1", agentName: "sherlock", actionType: "agent.investigation.started", actorType: "agent", actorId: "sherlock-1", actorEmail: null, resourceType: "deployment", resourceId: "dep-001", details: { trigger: "latency_spike", severity: "p2", confidence: 0.94 }, ipAddress: null, timestamp: new Date(Date.now() - 600_000).toISOString(), severity: "warning" },
  { auditId: "aud-002", tenantId: null, tenantName: null, agentId: null, agentName: null, actionType: "platform.admin.login", actorType: "human", actorId: "usr-cto-001", actorEmail: "cto@gridmindai.dev", resourceType: null, resourceId: null, details: { ip: "203.0.113.42", mfa: true }, ipAddress: "203.0.113.42", timestamp: new Date(Date.now() - 1_800_000).toISOString(), severity: "info" },
  { auditId: "aud-003", tenantId: "t-005", tenantName: "CloudNine Systems", agentId: null, agentName: null, actionType: "tenant.suspended", actorType: "human", actorId: "usr-cto-001", actorEmail: "cto@gridmindai.dev", resourceType: "tenant", resourceId: "t-005", details: { reason: "Payment failure — invoice overdue 30 days", invoice_id: "inv-old-123" }, ipAddress: "203.0.113.42", timestamp: new Date(Date.now() - 7_200_000).toISOString(), severity: "critical" },
  { auditId: "aud-004", tenantId: "t-001", tenantName: "Acme Corporation", agentId: "aegis-1", agentName: "aegis", actionType: "agent.action.executed", actorType: "agent", actorId: "aegis-1", actorEmail: null, resourceType: "deployment", resourceId: "dep-001", details: { action: "create_index", table: "orders", index: "idx_orders_created_at", estimated_duration_ms: 45000 }, ipAddress: null, timestamp: new Date(Date.now() - 14_400_000).toISOString(), severity: "info" },
  { auditId: "aud-005", tenantId: "t-006", tenantName: "MegaCorp International", agentId: null, agentName: null, actionType: "tenant.impersonation.started", actorType: "human", actorId: "usr-cto-001", actorEmail: "cto@gridmindai.dev", resourceType: "tenant", resourceId: "t-006", details: { reason: "Enterprise support escalation — ticket #ENG-4821", session_id: "imp-sess-xyz", expires_at: new Date(Date.now() + 3_600_000).toISOString() }, ipAddress: "203.0.113.42", timestamp: new Date(Date.now() - 28_800_000).toISOString(), severity: "critical" },
  { auditId: "aud-006", tenantId: null, tenantName: null, agentId: null, agentName: null, actionType: "feature_flag.updated", actorType: "human", actorId: "usr-eng-002", actorEmail: "eng@gridmindai.dev", resourceType: "feature_flag", resourceId: "ff-003", details: { flag: "enterprise_rbac_v2", from_status: "partial", to_status: "enabled", rollout_pct: 100 }, ipAddress: "203.0.113.10", timestamp: new Date(Date.now() - 86_400_000).toISOString(), severity: "info" },
  { auditId: "aud-007", tenantId: "t-003", tenantName: "DataFlow Analytics", agentId: "healer-1", agentName: "healer", actionType: "agent.self_healing.triggered", actorType: "agent", actorId: "healer-1", actorEmail: null, resourceType: "deployment", resourceId: "dep-005", details: { issue: "redis_oom_risk", action: "eviction_policy_adjusted", new_policy: "allkeys-lru" }, ipAddress: null, timestamp: new Date(Date.now() - 172_800_000).toISOString(), severity: "warning" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All severities" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
] as const;

const ACTOR_OPTIONS = [
  { value: "", label: "All actors" },
  { value: "agent", label: "Agent" },
  { value: "human", label: "Human" },
  { value: "system", label: "System" },
] as const;

export default function AuditPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AuditLogEntry["severity"] | "">("");
  const [actorFilter, setActorFilter] = useState<AuditLogEntry["actorType"] | "">("");
  const [search, setSearch] = useState("");

  const filtered = MOCK_AUDIT.filter((e) => {
    if (severityFilter && e.severity !== severityFilter) return false;
    if (actorFilter && e.actorType !== actorFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.actionType.toLowerCase().includes(q) ||
        (e.tenantName?.toLowerCase().includes(q) ?? false) ||
        (e.agentName?.toLowerCase().includes(q) ?? false) ||
        (e.actorEmail?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const criticalCount = MOCK_AUDIT.filter((e) => e.severity === "critical").length;
  const warningCount = MOCK_AUDIT.filter((e) => e.severity === "warning").length;

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <TopBar
        title="Audit Log"
        subtitle={`${MOCK_AUDIT.length} entries · ${criticalCount} critical · ${warningCount} warnings`}
      />

      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted w-3.5 h-3.5"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search actions, tenants, agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={clsx(
                "w-full bg-brand-navy border border-brand-border-default rounded-lg",
                "pl-9 pr-3 py-2 text-sm text-brand-text-primary placeholder:text-brand-text-muted",
                "focus:outline-none focus:ring-2 focus:ring-brand-amber/40 focus:border-brand-amber/60 transition-colors"
              )}
              aria-label="Search audit log"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AuditLogEntry["severity"] | "")}
            className={clsx(
              "bg-brand-navy border border-brand-border-default rounded-lg",
              "px-3 py-2 text-sm text-brand-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-amber/40 transition-colors"
            )}
            aria-label="Filter by severity"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value as AuditLogEntry["actorType"] | "")}
            className={clsx(
              "bg-brand-navy border border-brand-border-default rounded-lg",
              "px-3 py-2 text-sm text-brand-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-amber/40 transition-colors"
            )}
            aria-label="Filter by actor type"
          >
            {ACTOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <span className="text-brand-text-muted text-xs ml-auto">
            {filtered.length} entries
          </span>
        </div>

        {/* Column headers */}
        <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-brand-border-subtle">
            <div className="w-32 text-brand-text-muted text-2xs uppercase tracking-wide">Time</div>
            <div className="w-20 text-brand-text-muted text-2xs uppercase tracking-wide">Severity</div>
            <div className="w-36 text-brand-text-muted text-2xs uppercase tracking-wide">Actor</div>
            <div className="w-36 text-brand-text-muted text-2xs uppercase tracking-wide">Tenant</div>
            <div className="w-28 text-brand-text-muted text-2xs uppercase tracking-wide">Agent</div>
            <div className="flex-1 text-brand-text-muted text-2xs uppercase tracking-wide">Action</div>
            <div className="w-4" aria-hidden="true" />
          </div>

          <div role="log" aria-label="Audit log entries" aria-live="polite">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-brand-text-muted text-sm">
                No audit entries match your filters.
              </div>
            ) : (
              filtered.map((entry) => (
                <AuditLogRow
                  key={entry.auditId}
                  entry={entry}
                  isExpanded={expandedId === entry.auditId}
                  onToggleExpand={handleToggleExpand}
                  data-testid={`audit-row-${entry.auditId}`}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
