"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDeploymentStore } from "@/stores/deploymentStore";
import { DeploymentCard } from "@/components/DeploymentCard";
import { EmptyState } from "@/components/EmptyState";
import type { Deployment } from "@/types";

// Mock data for demonstration (replaced by API data when available)
const MOCK_DEPLOYMENTS: Deployment[] = [
  {
    deploymentId: "deploy-001",
    name: "production-primary",
    engine: "postgresql",
    engineVersion: "16.2",
    status: "active",
    region: "us-east-1",
    instanceType: "db.r7g.2xlarge",
    metrics: { qps: 4823, p50LatencyMs: 1.8, p95LatencyMs: 12.4, p99LatencyMs: 48.0, activeConnections: 284, cpuPercent: 42, memoryPercent: 68, storageGb: 500, storageUsedGb: 187 },
    agentCount: 12,
    activeIncidents: 0,
    createdAt: "2025-11-01T09:00:00Z",
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    deploymentId: "deploy-002",
    name: "analytics-warehouse",
    engine: "postgresql",
    engineVersion: "16.2",
    status: "degraded",
    region: "us-east-1",
    instanceType: "db.r7g.4xlarge",
    metrics: { qps: 312, p50LatencyMs: 45.2, p95LatencyMs: 380.0, p99LatencyMs: 820.0, activeConnections: 94, cpuPercent: 87, memoryPercent: 91, storageGb: 2000, storageUsedGb: 1340 },
    agentCount: 12,
    activeIncidents: 1,
    createdAt: "2025-11-15T14:00:00Z",
    updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    deploymentId: "deploy-003",
    name: "session-cache",
    engine: "redis",
    engineVersion: "7.2",
    status: "active",
    region: "us-east-1",
    instanceType: "cache.r7g.large",
    metrics: { qps: 28400, p50LatencyMs: 0.3, p95LatencyMs: 1.1, p99LatencyMs: 2.4, activeConnections: 1842, cpuPercent: 18, memoryPercent: 54, storageGb: 32, storageUsedGb: 17 },
    agentCount: 8,
    activeIncidents: 0,
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: new Date(Date.now() - 30 * 1000).toISOString(),
  },
  {
    deploymentId: "deploy-004",
    name: "staging-db",
    engine: "mysql",
    engineVersion: "8.0",
    status: "active",
    region: "us-west-2",
    instanceType: "db.t4g.medium",
    metrics: { qps: 43, p50LatencyMs: 4.2, p95LatencyMs: 18.0, p99LatencyMs: 45.0, activeConnections: 12, cpuPercent: 8, memoryPercent: 34, storageGb: 100, storageUsedGb: 22 },
    agentCount: 6,
    activeIncidents: 0,
    createdAt: "2026-01-10T11:00:00Z",
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

const MOCK_SPARKLINES: Record<string, number[]> = {
  "deploy-001": [4200, 4500, 4100, 4800, 5200, 4900, 4823],
  "deploy-002": [450, 400, 380, 350, 320, 300, 312],
  "deploy-003": [24000, 26000, 28000, 29000, 27500, 28400, 28400],
  "deploy-004": [40, 45, 38, 42, 44, 43, 43],
};

export default function DeploymentsPage() {
  const router = useRouter();
  const { deployments, isLoading, error, fetchDeployments, upsertDeployment } = useDeploymentStore();

  useEffect(() => {
    // Seed mock data if store is empty (until API is connected)
    if (deployments.length === 0) {
      MOCK_DEPLOYMENTS.forEach(upsertDeployment);
    }
    void fetchDeployments().catch(() => {
      // API not yet available — mock data is already loaded
    });
  }, [deployments.length, fetchDeployments, upsertDeployment]);

  const activeDeployments = deployments.filter((d) => d.status !== "terminated");
  const healthyCount = deployments.filter((d) => d.status === "active").length;
  const degradedCount = deployments.filter((d) => d.status === "degraded" || d.status === "critical").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-brand-text-primary text-2xl font-bold">Deployments</h1>
          <p className="text-brand-text-muted text-sm mt-1">
            {activeDeployments.length} deployment{activeDeployments.length !== 1 ? "s" : ""} ·{" "}
            <span className="text-brand-green">{healthyCount} healthy</span>
            {degradedCount > 0 && (
              <>
                {" · "}
                <span className="text-brand-amber">{degradedCount} degraded</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/onboarding")}
          className="btn-primary flex items-center gap-2"
          aria-label="Add new deployment"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add deployment
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-brand-red/10 border border-brand-red/30 rounded-lg text-brand-red text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && deployments.length === 0 && (
        <div className="flex items-center justify-center py-20 text-brand-text-muted">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading deployments…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && deployments.length === 0 && (
        <EmptyState
          title="No deployments yet"
          message="Create your first deployment to start monitoring with AI agents."
          icon="🗄️"
          action={{ label: "Add deployment", onClick: () => router.push("/onboarding") }}
        />
      )}

      {/* Deployment grid */}
      {deployments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {deployments.map((deployment) => (
            <DeploymentCard
              key={deployment.deploymentId}
              deployment={deployment}
              onClick={(id) => router.push(`/deployments/${id}`)}
              sparklineData={MOCK_SPARKLINES[deployment.deploymentId]}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
