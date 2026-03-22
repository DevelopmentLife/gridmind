// =============================================================================
// GridMind Admin — Incidents List Page
// =============================================================================

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { IncidentBadge } from "@/components/IncidentBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDurationMinutes, formatRelativeTime } from "@/lib/formatters";
import { useIncidentStore } from "@/stores/incidentStore";
import { useUiStore } from "@/stores/uiStore";

const SEVERITY_OPTIONS = [
  { value: "", label: "All Severities" },
  { value: "P1", label: "P1 — Critical" },
  { value: "P2", label: "P2 — Major" },
  { value: "P3", label: "P3 — Minor" },
  { value: "P4", label: "P4 — Info" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "mitigating", label: "Mitigating" },
  { value: "resolved", label: "Resolved" },
];

export default function IncidentsPage() {
  const { filter, setFilter, getFilteredIncidents, getP1Count } = useIncidentStore();
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "Incidents" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const filtered = getFilteredIncidents();
  const p1Count = getP1Count();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-primary">Incidents</h1>
          <p className="text-brand-text-secondary text-sm mt-1">
            Active and historical incidents across all tenants
          </p>
        </div>
        {p1Count > 0 && (
          <div
            role="alert"
            className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/40 rounded-lg px-4 py-2"
          >
            <span className="w-2 h-2 bg-brand-red rounded-full animate-pulse" aria-hidden="true" />
            <span className="text-sm font-semibold text-brand-red">
              {p1Count} active P1 incident{p1Count > 1 ? "s" : ""} — immediate attention required
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="search" aria-label="Filter incidents">
        <input
          type="search"
          placeholder="Search incidents..."
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          aria-label="Search incidents"
          className="bg-brand-navy border border-brand-border-default rounded-md px-4 py-2 text-sm text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-electric min-w-[200px]"
        />
        <select
          value={filter.severity ?? ""}
          onChange={(e) =>
            setFilter({ severity: (e.target.value || undefined) as typeof filter.severity })
          }
          aria-label="Filter by severity"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filter.incidentStatus ?? ""}
          onChange={(e) =>
            setFilter({ incidentStatus: (e.target.value || undefined) as typeof filter.incidentStatus })
          }
          aria-label="Filter by status"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {(filter.search || filter.severity || filter.incidentStatus) && (
          <button
            type="button"
            onClick={() => setFilter({ search: "", severity: undefined, incidentStatus: undefined })}
            className="text-sm text-brand-text-secondary hover:text-brand-text-primary transition-colors px-3 py-2"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-brand-text-muted self-center font-mono">
          {filtered.length} incident{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Incident list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-brand-navy border border-brand-border-default rounded-lg p-12 text-center">
            <p className="text-brand-text-muted font-mono text-sm">
              No incidents match the current filters.
            </p>
          </div>
        ) : (
          filtered.map((incident) => (
            <Link
              key={incident.incidentId}
              href={`/incidents/${incident.incidentId}`}
              className="block bg-brand-navy border border-brand-border-default rounded-lg p-5 hover:border-brand-electric/40 transition-colors"
            >
              <div className="flex flex-wrap items-start gap-3 mb-3">
                <IncidentBadge severity={incident.severity} />
                <StatusBadge status={incident.status} size="sm" />
                <h2 className="text-sm font-semibold text-brand-text-primary flex-1 min-w-[200px]">
                  {incident.title}
                </h2>
                <span className="text-xs text-brand-text-muted font-mono">
                  {formatRelativeTime(incident.createdAt)}
                </span>
              </div>

              <p className="text-xs text-brand-text-secondary line-clamp-2 mb-3">
                {incident.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-brand-text-muted">
                <span>{incident.tenantName}</span>
                {incident.deploymentName && (
                  <span>· {incident.deploymentName}</span>
                )}
                {incident.assignedAgentName && (
                  <span className="font-mono text-brand-cyan">
                    Assigned to {incident.assignedAgentName}
                  </span>
                )}
                {incident.durationMinutes && (
                  <span className="ml-auto">
                    Duration: {formatDurationMinutes(incident.durationMinutes)}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
