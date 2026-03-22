"use client";

import { motion } from "framer-motion";
import type { Deployment } from "@/types";
import {
  deploymentStatusDot,
  deploymentStatusLabel,
  engineColor,
  engineLabel,
  formatLatency,
  formatNumber,
  formatRelativeTime,
} from "@/lib/formatters";
import { MetricSparkline } from "./MetricSparkline";

interface DeploymentCardProps {
  deployment: Deployment;
  onClick?: (deploymentId: string) => void;
  sparklineData?: number[];
}

export function DeploymentCard({ deployment, onClick, sparklineData }: DeploymentCardProps) {
  const metrics = deployment.metrics;

  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(deployment.deploymentId)}
      className="w-full text-left bg-brand-navy border border-brand-border-default rounded-lg p-5 shadow-card hover:shadow-card-hover hover:border-brand-electric/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
      aria-label={`Deployment ${deployment.name}, status ${deploymentStatusLabel(deployment.status)}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Status dot */}
          <span
            data-testid="status-indicator"
            className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${deploymentStatusDot(deployment.status)}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-brand-text-primary font-semibold text-sm truncate">
              {deployment.name}
            </h3>
            <p className="text-brand-text-muted text-xs mt-0.5">
              {deployment.region} · {deployment.instanceType}
            </p>
          </div>
        </div>
        <span
          className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${engineColor(deployment.engine)}`}
        >
          {engineLabel(deployment.engine)} {deployment.engineVersion}
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-brand-text-muted text-2xs uppercase tracking-wide mb-1">QPS</p>
          <p className="text-brand-text-primary font-mono text-sm font-medium">
            {metrics ? formatNumber(metrics.qps) : "—"}
          </p>
        </div>
        <div>
          <p className="text-brand-text-muted text-2xs uppercase tracking-wide mb-1">P95</p>
          <p className="text-brand-text-primary font-mono text-sm font-medium">
            {metrics ? formatLatency(metrics.p95LatencyMs) : "—"}
          </p>
        </div>
        <div>
          <p className="text-brand-text-muted text-2xs uppercase tracking-wide mb-1">Conns</p>
          <p className="text-brand-text-primary font-mono text-sm font-medium">
            {metrics ? formatNumber(metrics.activeConnections) : "—"}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mb-4" aria-hidden="true">
          <MetricSparkline data={sparklineData} color="#2563EB" height={28} />
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between text-xs text-brand-text-muted border-t border-brand-border-subtle pt-3">
        <div className="flex items-center gap-3">
          <span>
            {deployment.agentCount} agent{deployment.agentCount !== 1 ? "s" : ""}
          </span>
          {deployment.activeIncidents > 0 && (
            <span className="text-brand-red font-medium">
              {deployment.activeIncidents} incident{deployment.activeIncidents !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span>{formatRelativeTime(deployment.updatedAt)}</span>
      </div>
    </motion.button>
  );
}
