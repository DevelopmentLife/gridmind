"use client";

import { useEffect } from "react";

import {
  agentsApi,
  platformApi,
  tenantsApi,
} from "@/lib/api";
import { useDemoStore } from "@/stores/demoStore";
import { usePlatformStore } from "@/stores/platformStore";
import { useSystemStore } from "@/stores/systemStore";
import { useTenantStore } from "@/stores/tenantStore";
import type {
  PlatformMetrics,
  RevenueDataPoint,
  SystemHealthSnapshot,
  TierRevenue,
} from "@/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_METRICS: PlatformMetrics = {
  totalTenants: 1247,
  activeTenants: 1089,
  trialTenants: 98,
  suspendedTenants: 12,
  mrr: 48_350_00,
  arr: 580_200_00,
  churnRate: 2.1,
  netRevenueRetention: 118.4,
  avgRevenuePerTenant: 3880_00,
  totalDeployments: 4823,
  totalAgentsRunning: 29_928,
  platformUptime: 99.97,
  openIncidents: 3,
  p1Incidents: 0,
};

const MOCK_REVENUE_HISTORY: RevenueDataPoint[] = [
  { month: "Mar 2025", mrr: 31_200_00, arr: 374_400_00, newMrr: 4_800_00, churnedMrr: 1_100_00, expansionMrr: 2_200_00 },
  { month: "Apr 2025", mrr: 34_800_00, arr: 417_600_00, newMrr: 5_200_00, churnedMrr: 900_00, expansionMrr: 1_900_00 },
  { month: "May 2025", mrr: 38_100_00, arr: 457_200_00, newMrr: 5_800_00, churnedMrr: 1_200_00, expansionMrr: 2_400_00 },
  { month: "Jun 2025", mrr: 41_500_00, arr: 498_000_00, newMrr: 6_100_00, churnedMrr: 800_00, expansionMrr: 2_800_00 },
  { month: "Jul 2025", mrr: 43_200_00, arr: 518_400_00, newMrr: 5_400_00, churnedMrr: 1_400_00, expansionMrr: 2_100_00 },
  { month: "Aug 2025", mrr: 45_800_00, arr: 549_600_00, newMrr: 6_800_00, churnedMrr: 900_00, expansionMrr: 2_600_00 },
  { month: "Sep 2025", mrr: 47_100_00, arr: 565_200_00, newMrr: 5_900_00, churnedMrr: 1_100_00, expansionMrr: 2_300_00 },
  { month: "Oct 2025", mrr: 48_350_00, arr: 580_200_00, newMrr: 6_200_00, churnedMrr: 800_00, expansionMrr: 2_700_00 },
];

const MOCK_TIER_BREAKDOWN: TierRevenue[] = [
  { tier: "starter", tenantCount: 612, mrr: 18_299_00, percentage: 37.8 },
  { tier: "professional", tenantCount: 389, mrr: 31_071_00, percentage: 42.4 },
  { tier: "enterprise", tenantCount: 88, mrr: 17_589_00, percentage: 14.0 },
  { tier: "custom", tenantCount: 0, mrr: 5_610_00, percentage: 5.8 },
];

const MOCK_SYSTEM_SNAPSHOT: SystemHealthSnapshot = {
  collectedAt: new Date().toISOString(),
  services: [
    { serviceId: "svc-gateway", name: "gateway", displayName: "API Gateway", status: "healthy", latencyMs: 24, uptimePercent: 99.98, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.2.0", replicas: 3, healthyReplicas: 3, endpoint: "api.gridmindai.dev" },
    { serviceId: "svc-cortex", name: "cortex", displayName: "Cortex (Agents)", status: "healthy", latencyMs: 12, uptimePercent: 99.97, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.2.0", replicas: 6, healthyReplicas: 6, endpoint: "cortex.internal" },
    { serviceId: "svc-nats", name: "nats", displayName: "NATS JetStream", status: "healthy", latencyMs: 3, uptimePercent: 100, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "2.10.4", replicas: 3, healthyReplicas: 3, endpoint: "nats.internal:4222" },
    { serviceId: "svc-postgres", name: "postgres", displayName: "PostgreSQL (Aurora)", status: "healthy", latencyMs: 8, uptimePercent: 99.99, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "16.1", replicas: 2, healthyReplicas: 2, endpoint: "aurora.internal" },
    { serviceId: "svc-redis", name: "redis", displayName: "Redis (ElastiCache)", status: "healthy", latencyMs: 2, uptimePercent: 100, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "7.2.3", replicas: 2, healthyReplicas: 2, endpoint: "redis.internal:6379" },
    { serviceId: "svc-vault", name: "vault", displayName: "HashiCorp Vault", status: "healthy", latencyMs: 15, uptimePercent: 99.95, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.15.6", replicas: 3, healthyReplicas: 3, endpoint: "vault.internal:8200" },
  ],
  nats: {
    connections: 248,
    subscriptions: 1842,
    messagesPerSec: 3_420,
    bytesPerSec: 2_180_000,
    jetStreamStreams: 12,
    jetStreamConsumers: 86,
    pendingMessages: 0,
  },
  database: {
    activeConnections: 184,
    maxConnections: 500,
    queryLatencyP50Ms: 4.2,
    queryLatencyP99Ms: 28.1,
    replicationLagMs: 12,
    sizeGb: 284.6,
    tablesCount: 48,
    slowQueriesCount: 2,
  },
  redis: {
    connectedClients: 94,
    usedMemoryMb: 1_840,
    maxMemoryMb: 8_192,
    hitRate: 98.7,
    opsPerSec: 12_400,
    evictedKeys: 0,
  },
};

// ─── DataBootstrap ────────────────────────────────────────────────────────────

function DataBootstrap() {
  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const setMetrics = usePlatformStore((s) => s.setMetrics);
  const setRevenueHistory = usePlatformStore((s) => s.setRevenueHistory);
  const setTierBreakdown = usePlatformStore((s) => s.setTierBreakdown);
  const setSnapshot = useSystemStore((s) => s.setSnapshot);
  const setTenants = useTenantStore((s) => s.setTenants);

  useEffect(() => {
    if (isDemoMode) {
      setMetrics(MOCK_METRICS);
      setRevenueHistory(MOCK_REVENUE_HISTORY);
      setTierBreakdown(MOCK_TIER_BREAKDOWN);
      setSnapshot(MOCK_SYSTEM_SNAPSHOT);
      return;
    }

    // Live mode — read-only API calls
    void platformApi.getMetrics().then(setMetrics).catch(console.error);
    void platformApi.getRevenueHistory().then(setRevenueHistory).catch(console.error);
    void platformApi.getTierBreakdown().then(setTierBreakdown).catch(console.error);
    void tenantsApi
      .list({ limit: 100 })
      .then((r) => setTenants(r.data, r.totalCount, r.nextCursor))
      .catch(console.error);
    void agentsApi.listAll().catch(console.error);
  }, [isDemoMode, setMetrics, setRevenueHistory, setTierBreakdown, setSnapshot, setTenants]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DataBootstrap />
      {children}
    </>
  );
}
