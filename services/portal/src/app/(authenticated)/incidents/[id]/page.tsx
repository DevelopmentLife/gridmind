"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useIncidentStore } from "@/stores/incidentStore";
import {
  formatDateTime,
  formatRelativeTime,
  incidentSeverityBg,
  incidentStatusColor,
  incidentStatusLabel,
} from "@/lib/formatters";
import type { Incident } from "@/types";

const MOCK_INCIDENTS: Record<string, Incident> = {
  "inc-001": {
    incidentId: "inc-001",
    title: "High P95 latency on analytics-warehouse",
    description: "Query latency has exceeded 350ms P95 threshold for the past 15 minutes. ORACLE has identified 4 queries performing sequential scans on the events table (2.3B rows).",
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
    timeline: [
      { entryId: "t1", agentName: "argus", displayName: "ARGUS", action: "Anomaly detected", details: "P95 latency exceeded 350ms threshold — triggering incident creation", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), automated: true },
      { entryId: "t2", agentName: "oracle", displayName: "ORACLE", action: "Query analysis started", details: "Scanning query history for last 30 minutes — 4 long-running sequential scans found", timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(), automated: true },
      { entryId: "t3", agentName: "sherlock", displayName: "SHERLOCK", action: "Root cause investigation initiated", details: "Analyzing table statistics, index usage, and query plan history", timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), automated: true },
      { entryId: "t4", agentName: "sherlock", displayName: "SHERLOCK", action: "Hypothesis formed", details: "Index statistics stale on events(created_at) — last ANALYZE ran 8 days ago. Table has grown 40% since.", timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), automated: true },
      { entryId: "t5", agentName: "forge", displayName: "FORGE", action: "Remediation proposed", details: "ANALYZE events; followed by CREATE INDEX CONCURRENTLY idx_events_created ON events(created_at) WHERE deleted_at IS NULL", timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), automated: true },
    ],
  },
};

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params["id"] === "string" ? params["id"] : "";
  const { getIncident, fetchIncident, upsertIncident } = useIncidentStore();

  useEffect(() => {
    const existing = getIncident(id);
    if (!existing) {
      const mock = MOCK_INCIDENTS[id];
      if (mock) {
        upsertIncident(mock);
      } else {
        void fetchIncident(id);
      }
    }
  }, [id, getIncident, fetchIncident, upsertIncident]);

  const incident = getIncident(id) ?? MOCK_INCIDENTS[id];

  if (!incident) {
    return (
      <div className="p-6">
        <button type="button" onClick={() => router.back()} className="text-brand-text-muted hover:text-brand-text-secondary text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>
        <div className="text-brand-text-muted text-sm">Incident not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <button type="button" onClick={() => router.push("/incidents")} className="text-brand-text-muted hover:text-brand-text-secondary text-sm mb-4 flex items-center gap-1 transition-colors">
        ← Incidents
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium uppercase ${incidentSeverityBg(incident.severity)}`}>
            {incident.severity}
          </span>
          <span className={`mt-0.5 text-xs font-medium ${incidentStatusColor(incident.status)}`}>
            {incidentStatusLabel(incident.status)}
          </span>
        </div>
        <h1 className="text-brand-text-primary text-xl font-bold mb-1">{incident.title}</h1>
        <p className="text-brand-text-muted text-sm">
          {incident.deploymentName} · Opened {formatRelativeTime(incident.openedAt)}
          {incident.assignedAgent && ` · Assigned to ${incident.assignedAgent.toUpperCase()}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card">
            <h2 className="text-brand-text-primary font-semibold text-sm mb-3">Description</h2>
            <p className="text-brand-text-secondary text-sm leading-relaxed">{incident.description}</p>
          </div>

          {/* Root cause */}
          {incident.rootCause && (
            <div className="card border-brand-amber/20">
              <h2 className="text-brand-amber font-semibold text-sm mb-3">Root Cause</h2>
              <p className="text-brand-text-secondary text-sm leading-relaxed">{incident.rootCause}</p>
            </div>
          )}

          {/* Resolution */}
          {incident.resolution && (
            <div className="card border-brand-green/20">
              <h2 className="text-brand-green font-semibold text-sm mb-3">Resolution</h2>
              <p className="text-brand-text-secondary text-sm leading-relaxed">{incident.resolution}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Timeline</h2>
            {incident.timeline.length === 0 ? (
              <p className="text-brand-text-muted text-sm">No timeline entries yet.</p>
            ) : (
              <div className="space-y-4">
                {incident.timeline.map((entry, i) => (
                  <motion.div
                    key={entry.entryId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3"
                  >
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-electric mt-1" aria-hidden="true" />
                      {i < incident.timeline.length - 1 && (
                        <div className="w-px bg-brand-border-default flex-1 mt-1" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.displayName && (
                          <span className="text-brand-ocean font-semibold text-xs">{entry.displayName}</span>
                        )}
                        {entry.automated && (
                          <span className="text-2xs text-brand-text-muted bg-brand-slate px-1.5 py-0.5 rounded">automated</span>
                        )}
                        <span className="text-brand-text-muted text-2xs ml-auto">{formatRelativeTime(entry.timestamp)}</span>
                      </div>
                      <p className="text-brand-text-primary text-sm font-medium mb-0.5">{entry.action}</p>
                      <p className="text-brand-text-secondary text-xs">{entry.details}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-brand-text-muted text-xs font-semibold uppercase tracking-wide mb-3">Details</h2>
            <dl className="space-y-3">
              {[
                { label: "Deployment", value: incident.deploymentName },
                { label: "Opened", value: formatDateTime(incident.openedAt) },
                { label: "Updated", value: formatRelativeTime(incident.updatedAt) },
                ...(incident.resolvedAt ? [{ label: "Resolved", value: formatDateTime(incident.resolvedAt) }] : []),
                ...(incident.assignedAgent ? [{ label: "Agent", value: incident.assignedAgent.toUpperCase() }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-brand-text-muted text-xs mb-0.5">{label}</dt>
                  <dd className="text-brand-text-secondary text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
