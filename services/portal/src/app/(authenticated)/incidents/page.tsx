"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIncidentStore } from "@/stores/incidentStore";
import { IncidentCard } from "@/components/IncidentCard";
import { EmptyState } from "@/components/EmptyState";
import type { Incident } from "@/types";

const MOCK_INCIDENTS: Incident[] = [
  {
    incidentId: "inc-001",
    title: "High P95 latency on analytics-warehouse",
    description: "Query latency has exceeded 350ms P95 threshold for the past 15 minutes. ORACLE has identified 4 queries performing sequential scans on the events table (2.3B rows). SHERLOCK is investigating root cause.",
    severity: "high",
    status: "investigating",
    deploymentId: "deploy-002",
    deploymentName: "analytics-warehouse",
    assignedAgent: "sherlock",
    rootCause: null,
    resolution: null,
    openedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    resolvedAt: null,
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    timeline: [],
  },
  {
    incidentId: "inc-002",
    title: "Connection pool exhaustion detected",
    description: "Active connections reached 95% of max_connections (950/1000). New connections are being queued. TITAN has requested approval to increase connection pool size.",
    severity: "critical",
    status: "mitigating",
    deploymentId: "deploy-001",
    deploymentName: "production-primary",
    assignedAgent: "titan",
    rootCause: "Unexpected traffic spike from batch job running outside maintenance window",
    resolution: null,
    openedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    resolvedAt: null,
    updatedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    timeline: [],
  },
  {
    incidentId: "inc-003",
    title: "Replication lag exceeded 30s",
    description: "Read replica fell behind primary by 34 seconds during bulk load operation. TITAN increased replica instance size and lag has returned to normal.",
    severity: "medium",
    status: "resolved",
    deploymentId: "deploy-001",
    deploymentName: "production-primary",
    assignedAgent: "titan",
    rootCause: "Bulk INSERT of 50M rows caused WAL replay backlog on read replica",
    resolution: "Upgraded read replica to db.r7g.4xlarge. Replication lag normalized to < 1s.",
    openedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    timeline: [],
  },
];

const SEVERITY_OPTIONS = ["all", "critical", "high", "medium", "low"] as const;
const STATUS_OPTIONS = ["all", "open", "investigating", "mitigating", "resolved", "closed"] as const;

export default function IncidentsPage() {
  const router = useRouter();
  const {
    incidents,
    isLoading,
    filter,
    setFilter,
    upsertIncident,
    getFilteredIncidents,
    getOpenCount,
  } = useIncidentStore();

  useEffect(() => {
    if (incidents.length === 0) {
      MOCK_INCIDENTS.forEach(upsertIncident);
    }
  }, [incidents.length, upsertIncident]);

  const filtered = getFilteredIncidents();
  const openCount = getOpenCount();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-brand-text-primary text-2xl font-bold">Incidents</h1>
        <p className="text-brand-text-muted text-sm mt-1">
          {incidents.length} total ·{" "}
          {openCount > 0 ? (
            <span className="text-brand-red">{openCount} active</span>
          ) : (
            <span className="text-brand-green">All clear</span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div>
          <label htmlFor="severity-filter" className="sr-only">Filter by severity</label>
          <select
            id="severity-filter"
            value={filter.severity}
            onChange={(e) => setFilter({ severity: e.target.value as typeof filter.severity })}
            className="input py-1.5 text-sm w-auto"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All severities" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select
            id="status-filter"
            value={filter.status}
            onChange={(e) => setFilter({ status: e.target.value as typeof filter.status })}
            className="input py-1.5 text-sm w-auto"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        {(filter.severity !== "all" || filter.status !== "all") && (
          <button
            type="button"
            onClick={() => setFilter({ severity: "all", status: "all" })}
            className="text-brand-text-muted hover:text-brand-text-secondary text-sm transition-colors focus:outline-none"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && incidents.length === 0 && (
        <div className="flex items-center justify-center py-20 text-brand-text-muted text-sm">Loading incidents…</div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title={filter.severity !== "all" || filter.status !== "all" ? "No matching incidents" : "No incidents"}
          message={
            filter.severity !== "all" || filter.status !== "all"
              ? "Try adjusting your filters."
              : "Your deployments are running smoothly. Any issues will appear here."
          }
          icon="✅"
        />
      )}

      {/* Incident list */}
      <div className="space-y-3">
        {filtered.map((incident) => (
          <IncidentCard
            key={incident.incidentId}
            incident={incident}
            onClick={(id) => router.push(`/incidents/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}
