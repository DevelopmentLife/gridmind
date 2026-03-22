import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDeploymentStore } from "@/stores/deploymentStore";
import * as apiModule from "@/lib/api";
import type { Deployment, DeploymentMetrics } from "@/types";

vi.mock("@/lib/api", () => ({
  deployments: {
    list: vi.fn(),
    get: vi.fn(),
    getMetrics: vi.fn(),
    getSparkline: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_DEPLOYMENT: Deployment = {
  deploymentId: "deploy-001",
  name: "production-primary",
  engine: "postgresql",
  engineVersion: "16.2",
  status: "active",
  region: "us-east-1",
  instanceType: "db.r7g.2xlarge",
  metrics: null,
  agentCount: 12,
  activeIncidents: 0,
  createdAt: "2025-11-01T09:00:00Z",
  updatedAt: new Date().toISOString(),
};

const MOCK_METRICS: DeploymentMetrics = {
  qps: 4823,
  p50LatencyMs: 1.8,
  p95LatencyMs: 12.4,
  p99LatencyMs: 48.0,
  activeConnections: 284,
  cpuPercent: 42,
  memoryPercent: 68,
  storageGb: 500,
  storageUsedGb: 187,
};

describe("deploymentStore", () => {
  beforeEach(() => {
    useDeploymentStore.setState({
      deployments: [],
      selectedDeploymentId: null,
      metrics: {},
      sparklines: {},
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("fetchDeployments", () => {
    it("fetches and stores deployments", async () => {
      vi.mocked(apiModule.deployments.list).mockResolvedValue([MOCK_DEPLOYMENT]);

      await useDeploymentStore.getState().fetchDeployments();

      expect(useDeploymentStore.getState().deployments).toHaveLength(1);
      expect(useDeploymentStore.getState().deployments[0]).toEqual(MOCK_DEPLOYMENT);
      expect(useDeploymentStore.getState().isLoading).toBe(false);
    });

    it("sets error on failure", async () => {
      vi.mocked(apiModule.deployments.list).mockRejectedValue(new Error("Network error"));

      await useDeploymentStore.getState().fetchDeployments();

      expect(useDeploymentStore.getState().error).toBe("Network error");
      expect(useDeploymentStore.getState().isLoading).toBe(false);
    });

    it("sets isLoading true during fetch", async () => {
      let resolve!: (v: Deployment[]) => void;
      vi.mocked(apiModule.deployments.list).mockReturnValue(new Promise((r) => { resolve = r; }));

      const promise = useDeploymentStore.getState().fetchDeployments();
      expect(useDeploymentStore.getState().isLoading).toBe(true);

      resolve([MOCK_DEPLOYMENT]);
      await promise;
      expect(useDeploymentStore.getState().isLoading).toBe(false);
    });
  });

  describe("upsertDeployment", () => {
    it("inserts new deployment", () => {
      useDeploymentStore.getState().upsertDeployment(MOCK_DEPLOYMENT);
      expect(useDeploymentStore.getState().deployments).toHaveLength(1);
    });

    it("updates existing deployment by ID", () => {
      useDeploymentStore.setState({ deployments: [MOCK_DEPLOYMENT] });
      const updated: Deployment = { ...MOCK_DEPLOYMENT, status: "degraded" };
      useDeploymentStore.getState().upsertDeployment(updated);

      const state = useDeploymentStore.getState();
      expect(state.deployments).toHaveLength(1);
      expect(state.deployments[0]?.status).toBe("degraded");
    });
  });

  describe("selectDeployment", () => {
    it("sets selectedDeploymentId", () => {
      useDeploymentStore.getState().selectDeployment("deploy-001");
      expect(useDeploymentStore.getState().selectedDeploymentId).toBe("deploy-001");
    });

    it("clears selection with null", () => {
      useDeploymentStore.setState({ selectedDeploymentId: "deploy-001" });
      useDeploymentStore.getState().selectDeployment(null);
      expect(useDeploymentStore.getState().selectedDeploymentId).toBeNull();
    });
  });

  describe("fetchMetrics", () => {
    it("fetches and stores metrics keyed by deployment ID", async () => {
      vi.mocked(apiModule.deployments.getMetrics).mockResolvedValue(MOCK_METRICS);

      await useDeploymentStore.getState().fetchMetrics("deploy-001");

      expect(useDeploymentStore.getState().metrics["deploy-001"]).toEqual(MOCK_METRICS);
    });

    it("does not throw on metrics fetch failure", async () => {
      vi.mocked(apiModule.deployments.getMetrics).mockRejectedValue(new Error("Not available"));
      await expect(useDeploymentStore.getState().fetchMetrics("deploy-001")).resolves.toBeUndefined();
    });
  });

  describe("derived counts", () => {
    it("getHealthyCount returns count of active deployments", () => {
      useDeploymentStore.setState({
        deployments: [
          { ...MOCK_DEPLOYMENT, deploymentId: "1", status: "active" },
          { ...MOCK_DEPLOYMENT, deploymentId: "2", status: "active" },
          { ...MOCK_DEPLOYMENT, deploymentId: "3", status: "degraded" },
        ],
      });
      expect(useDeploymentStore.getState().getHealthyCount()).toBe(2);
    });

    it("getDegradedCount returns count of degraded deployments", () => {
      useDeploymentStore.setState({
        deployments: [
          { ...MOCK_DEPLOYMENT, deploymentId: "1", status: "active" },
          { ...MOCK_DEPLOYMENT, deploymentId: "2", status: "degraded" },
          { ...MOCK_DEPLOYMENT, deploymentId: "3", status: "critical" },
        ],
      });
      expect(useDeploymentStore.getState().getDegradedCount()).toBe(1);
    });

    it("getCriticalCount returns count of critical deployments", () => {
      useDeploymentStore.setState({
        deployments: [
          { ...MOCK_DEPLOYMENT, deploymentId: "1", status: "critical" },
          { ...MOCK_DEPLOYMENT, deploymentId: "2", status: "active" },
        ],
      });
      expect(useDeploymentStore.getState().getCriticalCount()).toBe(1);
    });

    it("getActiveCount excludes terminated deployments", () => {
      useDeploymentStore.setState({
        deployments: [
          { ...MOCK_DEPLOYMENT, deploymentId: "1", status: "active" },
          { ...MOCK_DEPLOYMENT, deploymentId: "2", status: "terminated" },
          { ...MOCK_DEPLOYMENT, deploymentId: "3", status: "degraded" },
        ],
      });
      expect(useDeploymentStore.getState().getActiveCount()).toBe(2);
    });

    it("getDeployment returns deployment by ID", () => {
      useDeploymentStore.setState({ deployments: [MOCK_DEPLOYMENT] });
      const result = useDeploymentStore.getState().getDeployment("deploy-001");
      expect(result).toEqual(MOCK_DEPLOYMENT);
    });

    it("getDeployment returns undefined for unknown ID", () => {
      useDeploymentStore.setState({ deployments: [MOCK_DEPLOYMENT] });
      const result = useDeploymentStore.getState().getDeployment("unknown");
      expect(result).toBeUndefined();
    });
  });
});
