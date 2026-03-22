import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import type { Incident } from "@/types";
import {
  formatDatetime,
  formatRelative,
  incidentSeverityBg,
  incidentSeverityLabel,
  incidentStatusColor,
  incidentStatusLabel,
} from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Incidents",
};

const MOCK_INCIDENTS: Incident[] = [
  { incidentId: "inc-001", tenantId: "t-001", tenantName: "Acme Corporation", title: "Elevated P99 query latency on production PostgreSQL cluster", description: "P99 latency exceeding 500ms SLO threshold. Root cause under investigation.", severity: "p2", status: "investigating", affectedDeploymentId: "dep-001", assignedAgentId: "sherlock-1", createdAt: new Date(Date.now() - 3_600_000).toISOString(), updatedAt: new Date(Date.now() - 600_000).toISOString(), resolvedAt: null, timeToResolutionMs: null },
  { incidentId: "inc-002", tenantId: "t-002", tenantName: "TechStart Ltd", title: "Connection pool nearing maximum capacity", description: "Connection count at 92% of maximum. Risk of connection exhaustion.", severity: "p3", status: "open", affectedDeploymentId: "dep-003", assignedAgentId: null, createdAt: new Date(Date.now() - 1_800_000).toISOString(), updatedAt: new Date(Date.now() - 900_000).toISOString(), resolvedAt: null, timeToResolutionMs: null },
  { incidentId: "inc-003", tenantId: "t-003", tenantName: "DataFlow Analytics", title: "Redis memory utilization exceeded 85%", description: "Cache eviction started. Monitoring for impact on hit rates.", severity: "p3", status: "open", affectedDeploymentId: "dep-005", assignedAgentId: null, createdAt: new Date(Date.now() - 7_200_000).toISOString(), updatedAt: new Date(Date.now() - 3_600_000).toISOString(), resolvedAt: null, timeToResolutionMs: null },
  { incidentId: "inc-004", tenantId: "t-001", tenantName: "Acme Corporation", title: "Auto-vacuum not completing on users table", description: "Table bloat accumulating. AEGIS has been notified for schema maintenance.", severity: "p4", status: "open", affectedDeploymentId: "dep-001", assignedAgentId: "aegis-1", createdAt: new Date(Date.now() - 14_400_000).toISOString(), updatedAt: new Date(Date.now() - 7_200_000).toISOString(), resolvedAt: null, timeToResolutionMs: null },
  { incidentId: "inc-005", tenantId: "t-004", tenantName: "Startup Alpha", title: "Deployment provisioning timeout", description: "Initial deployment setup exceeded 15-minute SLA. Retry succeeded.", severity: "p2", status: "resolved", affectedDeploymentId: "dep-010", assignedAgentId: "healer-1", createdAt: new Date(Date.now() - 86_400_000).toISOString(), updatedAt: new Date(Date.now() - 72_000_000).toISOString(), resolvedAt: new Date(Date.now() - 72_000_000).toISOString(), timeToResolutionMs: 14_400_000 },
];

const SEVERITY_ORDER = ["p1", "p2", "p3", "p4"] as const;

export default function IncidentsPage() {
  const openIncidents = MOCK_INCIDENTS.filter((i) => i.status !== "resolved");
  const resolvedIncidents = MOCK_INCIDENTS.filter((i) => i.status === "resolved");

  return (
    <>
      <TopBar
        title="Platform Incidents"
        subtitle={`${openIncidents.length} open · ${resolvedIncidents.length} resolved`}
        actions={
          <div className="flex items-center gap-3 text-xs">
            {SEVERITY_ORDER.map((sev) => {
              const count = openIncidents.filter((i) => i.severity === sev).length;
              if (count === 0) return null;
              return (
                <span
                  key={sev}
                  className={[
                    "inline-flex items-center px-2 py-0.5 rounded border",
                    sev === "p1"
                      ? "text-brand-red bg-brand-red/10 border-brand-red/40"
                      : sev === "p2"
                      ? "text-brand-amber bg-brand-amber/10 border-brand-amber/40"
                      : "text-brand-text-muted bg-brand-slate border-brand-border-subtle",
                  ].join(" ")}
                >
                  {sev.toUpperCase()}: {count}
                </span>
              );
            })}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Open incidents */}
        {openIncidents.length > 0 && (
          <section aria-labelledby="open-incidents-heading">
            <h2
              id="open-incidents-heading"
              className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
            >
              Open Incidents ({openIncidents.length})
            </h2>
            <div className="space-y-3">
              {openIncidents.map((incident) => (
                <article
                  key={incident.incidentId}
                  className={[
                    "bg-brand-navy rounded-xl p-5 border",
                    incidentSeverityBg(incident.severity),
                  ].join(" ")}
                  aria-label={`Incident ${incident.severity.toUpperCase()}: ${incident.title}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase border",
                          incident.severity === "p1"
                            ? "text-brand-red bg-brand-red/10 border-brand-red/40"
                            : incident.severity === "p2"
                            ? "text-brand-amber bg-brand-amber/10 border-brand-amber/40"
                            : incident.severity === "p3"
                            ? "text-brand-ocean bg-brand-ocean/10 border-brand-ocean/40"
                            : "text-brand-text-muted bg-brand-slate border-brand-border-subtle",
                        ].join(" ")}
                      >
                        {incidentSeverityLabel(incident.severity)}
                      </span>
                      <span
                        className={[
                          "text-xs font-medium capitalize",
                          incidentStatusColor(incident.status),
                        ].join(" ")}
                      >
                        {incidentStatusLabel(incident.status)}
                      </span>
                    </div>
                    <time
                      className="text-brand-text-muted text-xs flex-shrink-0"
                      dateTime={incident.createdAt}
                      suppressHydrationWarning
                    >
                      {formatRelative(incident.createdAt)}
                    </time>
                  </div>

                  <h3 className="text-brand-text-primary text-sm font-semibold mb-1.5">
                    {incident.title}
                  </h3>

                  <p className="text-brand-text-muted text-xs leading-relaxed mb-3">
                    {incident.description}
                  </p>

                  <div className="flex items-center gap-4 text-2xs text-brand-text-muted">
                    <span>
                      Tenant:{" "}
                      <span className="text-brand-text-secondary">
                        {incident.tenantName}
                      </span>
                    </span>
                    {incident.assignedAgentId && (
                      <span>
                        Agent:{" "}
                        <span className="text-brand-cyan font-mono uppercase">
                          {incident.assignedAgentId.split("-")[0]}
                        </span>
                      </span>
                    )}
                    {incident.affectedDeploymentId && (
                      <span>
                        Deploy:{" "}
                        <span className="font-mono text-brand-text-secondary">
                          {incident.affectedDeploymentId}
                        </span>
                      </span>
                    )}
                    <span>
                      Updated:{" "}
                      <span suppressHydrationWarning>
                        {formatRelative(incident.updatedAt)}
                      </span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Resolved incidents */}
        {resolvedIncidents.length > 0 && (
          <section aria-labelledby="resolved-incidents-heading">
            <h2
              id="resolved-incidents-heading"
              className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
            >
              Recently Resolved
            </h2>
            <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
              <table className="data-table" aria-label="Resolved incidents">
                <thead>
                  <tr>
                    <th scope="col" className="pl-4">Incident</th>
                    <th scope="col">Tenant</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="pr-4">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedIncidents.map((incident) => (
                    <tr
                      key={incident.incidentId}
                      className="border-b border-brand-border-subtle last:border-0"
                    >
                      <td className="pl-4 px-3 py-3">
                        <span className="text-brand-text-secondary text-xs line-clamp-1">
                          {incident.title}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-brand-text-muted text-xs">
                          {incident.tenantName}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-brand-text-muted text-xs uppercase">
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-brand-green text-xs">Resolved</span>
                      </td>
                      <td className="px-3 py-3 pr-4">
                        <span
                          className="text-brand-text-muted text-xs"
                          suppressHydrationWarning
                        >
                          {incident.resolvedAt
                            ? formatRelative(incident.resolvedAt)
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
