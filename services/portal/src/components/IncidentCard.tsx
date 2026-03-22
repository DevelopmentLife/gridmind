"use client";

import { motion } from "framer-motion";
import type { Incident } from "@/types";
import {
  formatRelativeTime,
  formatTimeRemaining,
  incidentSeverityBg,
  incidentStatusColor,
  incidentStatusLabel,
} from "@/lib/formatters";

interface IncidentCardProps {
  incident: Incident;
  onClick?: (incidentId: string) => void;
}

const SEVERITY_ICON: Record<string, string> = {
  low: "ℹ",
  medium: "⚠",
  high: "🔴",
  critical: "🚨",
};

export function IncidentCard({ incident, onClick }: IncidentCardProps) {
  const isActive = incident.status !== "resolved" && incident.status !== "closed";

  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(incident.incidentId)}
      className="w-full text-left bg-brand-navy border border-brand-border-default rounded-lg p-4 shadow-card hover:shadow-card-hover hover:border-brand-electric/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
      aria-label={`Incident: ${incident.title}, severity ${incident.severity}, status ${incident.status}`}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <span className="flex-shrink-0 text-base mt-0.5" aria-hidden="true">
          {SEVERITY_ICON[incident.severity] ?? "•"}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title + badges row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-brand-text-primary font-medium text-sm truncate">
              {incident.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${incidentSeverityBg(incident.severity)}`}
              >
                {incident.severity}
              </span>
            </div>
          </div>

          {/* Deployment + status */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-text-muted text-xs">{incident.deploymentName}</span>
            <span className="text-brand-text-muted text-xs">·</span>
            <span className={`text-xs font-medium ${incidentStatusColor(incident.status)}`}>
              {incidentStatusLabel(incident.status)}
            </span>
          </div>

          {/* Description */}
          <p className="text-brand-text-secondary text-xs line-clamp-2 mb-3">
            {incident.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-brand-text-muted">
            <div className="flex items-center gap-3">
              <span>Opened {formatRelativeTime(incident.openedAt)}</span>
              {incident.assignedAgent && (
                <>
                  <span>·</span>
                  <span>
                    Assigned to{" "}
                    <span className="text-brand-ocean font-medium">{incident.assignedAgent.toUpperCase()}</span>
                  </span>
                </>
              )}
            </div>
            {isActive && (
              <span className="text-brand-amber">
                {formatTimeRemaining(
                  new Date(new Date(incident.openedAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
                )}
              </span>
            )}
            {!isActive && incident.resolvedAt && (
              <span className="text-brand-green">
                Resolved {formatRelativeTime(incident.resolvedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
