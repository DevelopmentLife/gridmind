"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDeploymentStore } from "@/stores/deploymentStore";
import { useAgentStore } from "@/stores/agentStore";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { MetricSparkline } from "@/components/MetricSparkline";
import {
  deploymentStatusDot,
  deploymentStatusLabel,
  engineLabel,
  formatGb,
  formatLatency,
  formatNumber,
  formatPercent,
  formatQps,
} from "@/lib/formatters";
import type { AgentActivity } from "@/types";

const MOCK_ACTIVITY: AgentActivity[] = [
  { activityId: "a1", agentName: "argus", displayName: "ARGUS", action: "Profiled workload spike", details: "QPS increased 23% over baseline — classifying as OLTP read-heavy burst", severity: "warning", timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
  { activityId: "a2", agentName: "oracle", displayName: "ORACLE", action: "Identified slow agent task", details: "Task routing regression on users JOIN orders — missing composite index", severity: "warning", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
  { activityId: "a3", agentName: "aegis", displayName: "AEGIS", action: "Security scan completed", details: "No anomalies detected. 0 unauthorized connection attempts.", severity: "success", timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
  { activityId: "a4", agentName: "forge", displayName: "FORGE", action: "Index recommendation ready", details: "CREATE INDEX CONCURRENTLY idx_orders_user_created ON orders(user_id, created_at)", severity: "info", timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
  { activityId: "a5", agentName: "convoy", displayName: "CONVOY", action: "Backup completed", details: "Full snapshot backup successful — 187GB to S3, verified integrity", severity: "success", timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
];

const MOCK_QPS_SPARKLINE = [3800, 4200, 4500, 4100, 4800, 5200, 4900, 4823];
const MOCK_LATENCY_SPARKLINE = [10, 11, 14, 12, 13, 12, 12, 12];
const MOCK_CONN_SPARKLINE = [240, 260, 270, 280, 275, 284, 284, 284];

export default function DeploymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params["id"] === "string" ? params["id"] : "";
  const { getDeployment, fetchDeployment } = useDeploymentStore();
  const { activity, fetchActivity, appendActivity } = useAgentStore();

  useEffect(() => {
    void fetchDeployment(id);
    void fetchActivity(id).catch(() => {
      MOCK_ACTIVITY.forEach(appendActivity);
    });
  }, [id, fetchDeployment, fetchActivity, appendActivity]);

  const deployment = getDeployment(id);

  if (!deployment) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-brand-text-muted hover:text-brand-text-secondary text-sm transition-colors mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="flex items-center justify-center py-20 text-brand-text-muted text-sm">
          Loading deployment…
        </div>
      </div>
    );
  }

  const m = deployment.metrics;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => router.push("/deployments")}
        className="text-brand-text-muted hover:text-brand-text-secondary text-sm transition-colors mb-4 flex items-center gap-1"
      >
        ← Deployments
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`w-3 h-3 rounded-full ${deploymentStatusDot(deployment.status)}`}
              aria-hidden="true"
            />
            <h1 className="text-brand-text-primary text-2xl font-bold">{deployment.name}</h1>
          </div>
          <p className="text-brand-text-muted text-sm">
            {engineLabel(deployment.engine)} {deployment.engineVersion} · {deployment.region} · {deployment.instanceType} · {deploymentStatusLabel(deployment.status)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {deployment.activeIncidents > 0 && (
            <button
              type="button"
              onClick={() => router.push("/incidents")}
              className="px-3 py-1.5 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/30 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            >
              {deployment.activeIncidents} active incident{deployment.activeIncidents !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Metrics cards */}
      {m && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Tasks/sec", value: formatQps(m.qps), sparkline: MOCK_QPS_SPARKLINE, color: "#2563EB" },
            { label: "P95 latency", value: formatLatency(m.p95LatencyMs), sparkline: MOCK_LATENCY_SPARKLINE, color: "#0EA5E9" },
            { label: "Connections", value: formatNumber(m.activeConnections), sparkline: MOCK_CONN_SPARKLINE, color: "#10B981" },
            { label: "CPU usage", value: formatPercent(m.cpuPercent), sparkline: [35, 38, 42, 44, 40, 43, 42], color: m.cpuPercent > 80 ? "#EF4444" : "#F59E0B" },
          ].map(({ label, value, sparkline, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <p className="text-brand-text-muted text-xs mb-1">{label}</p>
              <p className="text-brand-text-primary font-mono text-xl font-semibold mb-3">{value}</p>
              <MetricSparkline data={sparkline} color={color} height={36} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Storage row */}
      {m && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-brand-text-muted text-xs">Storage usage</span>
            <span className="text-brand-text-secondary text-xs font-mono">
              {formatGb(m.storageUsedGb)} / {formatGb(m.storageGb)}
            </span>
          </div>
          <div className="h-2 bg-brand-slate rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                m.storageUsedGb / m.storageGb > 0.9 ? "bg-brand-red" :
                m.storageUsedGb / m.storageGb > 0.75 ? "bg-brand-amber" : "bg-brand-electric"
              }`}
              style={{ width: `${Math.round((m.storageUsedGb / m.storageGb) * 100)}%` }}
              role="progressbar"
              aria-valuenow={Math.round((m.storageUsedGb / m.storageGb) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Storage ${Math.round((m.storageUsedGb / m.storageGb) * 100)}% used`}
            />
          </div>
          <p className="text-brand-text-muted text-2xs mt-1">
            Memory: {formatPercent(m.memoryPercent)} · P99: {formatLatency(m.p99LatencyMs)}
          </p>
        </div>
      )}

      {/* Activity feed */}
      <div className="card">
        <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Agent activity</h2>
        <AgentActivityFeed
          activities={activity.length > 0 ? activity : MOCK_ACTIVITY}
          maxItems={30}
          className="max-h-96 -mx-5 -mb-5 rounded-b-lg"
        />
      </div>
    </div>
  );
}
