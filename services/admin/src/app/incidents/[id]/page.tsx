// =============================================================================
// GridMind Admin — Incident Detail Page
// =============================================================================

"use client";

import { useEffect } from "react";
import { useParams, notFound } from "next/navigation";

import { IncidentBadge } from "@/components/IncidentBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatDurationMinutes, formatRelativeTime } from "@/lib/formatters";
import { useIncidentStore } from "@/stores/incidentStore";
import { useUiStore } from "@/stores/uiStore";

const MOCK_TIMELINE = [
  {
    eventId: "ev-001",
    eventType: "detection" as const,
    description: "ARGUS detected CPU utilization crossing 80% threshold on dataflow-prod",
    agentName: "ARGUS",
    timestamp: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    eventId: "ev-002",
    eventType: "update" as const,
    description: "SHERLOCK assigned for root cause analysis",
    agentName: "SHERLOCK",
    timestamp: new Date(Date.now() - 1750_000).toISOString(),
  },
  {
    eventId: "ev-003",
    eventType: "action" as const,
    description: "SHERLOCK requested approval to restart connection pool",
    agentName: "SHERLOCK",
    timestamp: new Date(Date.now() - 600_000).toISOString(),
  },
  {
    eventId: "ev-004",
    eventType: "update" as const,
    description: "Incident escalated to P1 due to sustained CPU above 85%",
    timestamp: new Date(Date.now() - 300_000).toISOString(),
  },
];

const TIMELINE_ICONS: Record<string, string> = {
  detection: "⚡",
  update: "📋",
  action: "🔧",
  resolution: "✅",
  comment: "💬",
};

const TIMELINE_COLORS: Record<string, string> = {
  detection: "border-brand-amber text-brand-amber",
  update: "border-brand-ocean text-brand-ocean",
  action: "border-brand-electric text-brand-electric",
  resolution: "border-brand-green text-brand-green",
  comment: "border-brand-text-muted text-brand-text-muted",
};

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;

  const incident = useIncidentStore((s) => s.getIncidentById(incidentId));
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    if (incident) {
      setBreadcrumbs([
        { label: "Incidents", href: "/incidents" },
        { label: `${incident.severity} — ${incident.title.slice(0, 40)}` },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, incident]);

  if (!incident) {
    notFound();
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="bg-brand-navy border border-brand-border-default rounded-lg p-6">
        <div className="flex flex-wrap items-start gap-3 mb-4">
          <IncidentBadge severity={incident.severity} size="lg" />
          <StatusBadge status={incident.status} />
          <h1 className="text-xl font-bold text-brand-text-primary flex-1 min-w-[240px]">
            {incident.title}
          </h1>
        </div>

        <p className="text-brand-text-secondary text-sm leading-relaxed mb-6">
          {incident.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5 border-t border-brand-border-subtle">
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Tenant
            </p>
            <p className="text-sm font-medium text-brand-text-primary">
              {incident.tenantName}
            </p>
          </div>
          {incident.deploymentName && (
            <div>
              <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
                Deployment
              </p>
              <p className="text-sm font-medium text-brand-text-primary">
                {incident.deploymentName}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Duration
            </p>
            <p className="font-mono text-sm text-brand-text-primary">
              {incident.durationMinutes
                ? formatDurationMinutes(incident.durationMinutes)
                : "Ongoing"}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Detected
            </p>
            <p className="text-sm text-brand-text-primary">
              {formatRelativeTime(incident.createdAt)}
            </p>
          </div>
        </div>

        {/* Assigned agent */}
        {incident.assignedAgentName && (
          <div className="mt-4 pt-4 border-t border-brand-border-subtle flex items-center gap-2">
            <span className="text-xs text-brand-text-muted uppercase tracking-wider font-mono">
              Assigned to:
            </span>
            <span className="font-mono font-semibold text-brand-cyan text-sm">
              {incident.assignedAgentName}
            </span>
          </div>
        )}
      </div>

      {/* Root cause & resolution */}
      {(incident.rootCause || incident.resolution) && (
        <section aria-label="Analysis">
          <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
            Analysis
          </h2>
          <div className="bg-brand-navy border border-brand-border-default rounded-lg divide-y divide-brand-border-subtle">
            {incident.rootCause && (
              <div className="px-5 py-4">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
                  Root Cause
                </p>
                <p className="text-sm text-brand-text-primary">{incident.rootCause}</p>
              </div>
            )}
            {incident.resolution && (
              <div className="px-5 py-4">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
                  Resolution
                </p>
                <p className="text-sm text-brand-text-primary">{incident.resolution}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Affected components */}
      {incident.affectedComponents.length > 0 && (
        <section aria-label="Affected components">
          <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-3">
            Affected Components
          </h2>
          <div className="flex flex-wrap gap-2">
            {incident.affectedComponents.map((comp) => (
              <span
                key={comp}
                className="font-mono text-xs bg-brand-navy border border-brand-border-default text-brand-text-secondary px-3 py-1 rounded"
              >
                {comp}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section aria-label="Incident timeline">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Timeline
        </h2>
        <ol className="relative space-y-4" aria-label="Incident events in chronological order">
          {/* Vertical line */}
          <div
            aria-hidden="true"
            className="absolute left-[18px] top-0 bottom-0 w-px bg-brand-border-default"
          />
          {MOCK_TIMELINE.map((event) => {
            const colorClass = TIMELINE_COLORS[event.eventType] ?? TIMELINE_COLORS["update"];
            return (
              <li key={event.eventId} className="relative pl-10">
                {/* Icon */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 w-9 h-9 flex items-center justify-center rounded-full bg-brand-navy border-2 text-sm ${colorClass}`}
                >
                  {TIMELINE_ICONS[event.eventType] ?? "·"}
                </span>

                <div className="bg-brand-navy border border-brand-border-default rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {event.agentName && (
                        <span className="font-mono text-xs font-bold text-brand-cyan">
                          {event.agentName}
                        </span>
                      )}
                      <span className={`text-2xs uppercase font-mono font-semibold ${colorClass?.split(" ")[1] ?? ""}`}>
                        {event.eventType}
                      </span>
                    </div>
                    <time
                      dateTime={event.timestamp}
                      className="text-xs text-brand-text-muted font-mono"
                    >
                      {formatDateTime(event.timestamp)}
                    </time>
                  </div>
                  <p className="text-sm text-brand-text-primary">{event.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Actions */}
      {incident.status !== "resolved" && (
        <section aria-label="Incident actions">
          <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
            Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium bg-brand-green/10 text-brand-green border border-brand-green/30 rounded-md hover:bg-brand-green/20 transition-colors"
            >
              Mark Resolved
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium bg-brand-slate text-brand-text-secondary border border-brand-border-default rounded-md hover:text-brand-text-primary transition-colors"
            >
              Add Comment
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium bg-brand-slate text-brand-text-secondary border border-brand-border-default rounded-md hover:text-brand-text-primary transition-colors"
            >
              Escalate
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
