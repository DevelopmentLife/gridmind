"use client";

import clsx from "clsx";
import type { SystemService } from "@/types";
import {
  formatLatency,
  formatRelative,
  serviceStatusColor,
  serviceStatusLabel,
} from "@/lib/formatters";

interface SystemServiceCardProps {
  service: SystemService;
  "data-testid"?: string;
}

export function SystemServiceCard({
  service,
  "data-testid": testId,
}: SystemServiceCardProps) {
  const replicaHealthy =
    service.replicas > 0
      ? (service.healthyReplicas / service.replicas) * 100
      : 0;

  return (
    <div
      className={clsx(
        "bg-brand-navy border rounded-xl p-4 transition-colors",
        service.status === "healthy" && "border-brand-border-subtle hover:border-brand-green/30",
        service.status === "degraded" && "border-brand-amber/40 bg-brand-amber/5",
        service.status === "down" && "border-brand-red/40 bg-brand-red/5",
        service.status === "unknown" && "border-brand-border-subtle"
      )}
      data-testid={testId}
      aria-label={`Service ${service.displayName}: ${serviceStatusLabel(service.status)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status dot */}
          <span
            className={clsx(
              "w-2 h-2 rounded-full flex-shrink-0",
              serviceStatusColor(service.status),
              service.status === "healthy" && "shadow-glow-green",
              service.status === "down" && "shadow-glow-red"
            )}
            data-testid="status-indicator"
            aria-hidden="true"
          />

          <div className="min-w-0">
            <p className="text-brand-text-primary text-sm font-semibold truncate">
              {service.displayName}
            </p>
            <p className="text-brand-text-muted text-2xs font-mono truncate">
              {service.endpoint}
            </p>
          </div>
        </div>

        {/* Version badge */}
        <span className="flex-shrink-0 ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono bg-brand-slate text-brand-text-muted border border-brand-border-subtle">
          {service.version}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Status */}
        <div>
          <p className="text-brand-text-muted text-2xs mb-0.5">Status</p>
          <p
            className={clsx(
              "text-xs font-medium",
              service.status === "healthy" && "text-brand-green",
              service.status === "degraded" && "text-brand-amber",
              service.status === "down" && "text-brand-red",
              service.status === "unknown" && "text-brand-text-muted"
            )}
          >
            {serviceStatusLabel(service.status)}
          </p>
        </div>

        {/* Latency */}
        <div>
          <p className="text-brand-text-muted text-2xs mb-0.5">Latency</p>
          <p
            className={clsx(
              "text-xs font-mono font-medium tabular-nums",
              service.latencyMs < 200 ? "text-brand-green" : service.latencyMs < 500 ? "text-brand-amber" : "text-brand-red"
            )}
          >
            {formatLatency(service.latencyMs)}
          </p>
        </div>

        {/* Uptime */}
        <div>
          <p className="text-brand-text-muted text-2xs mb-0.5">Uptime</p>
          <p
            className={clsx(
              "text-xs font-mono font-medium tabular-nums",
              service.uptimePercent >= 99.9 ? "text-brand-green" : service.uptimePercent >= 99 ? "text-brand-amber" : "text-brand-red"
            )}
          >
            {service.uptimePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Replicas */}
      {service.replicas > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-2xs mb-1">
            <span className="text-brand-text-muted">
              Replicas ({service.healthyReplicas}/{service.replicas})
            </span>
            <span
              className={clsx(
                "font-medium",
                replicaHealthy === 100 ? "text-brand-green" : replicaHealthy >= 50 ? "text-brand-amber" : "text-brand-red"
              )}
            >
              {replicaHealthy.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-1 bg-brand-slate rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                replicaHealthy === 100 ? "bg-brand-green" : replicaHealthy >= 50 ? "bg-brand-amber" : "bg-brand-red"
              )}
              style={{ width: `${replicaHealthy}%` }}
              role="progressbar"
              aria-valuenow={replicaHealthy}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${service.displayName} replica health: ${replicaHealthy.toFixed(0)}%`}
            />
          </div>
        </div>
      )}

      {/* Last checked */}
      <p className="text-brand-text-muted text-2xs" suppressHydrationWarning>
        Checked{" "}
        <span title={service.lastCheckedAt}>
          {formatRelative(service.lastCheckedAt)}
        </span>
      </p>
    </div>
  );
}
