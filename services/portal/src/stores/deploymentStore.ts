import { create } from "zustand";
import type { Deployment, DeploymentMetrics, SparklinePoint } from "@/types";
import { deployments as deploymentsApi } from "@/lib/api";

interface DeploymentStore {
  deployments: Deployment[];
  selectedDeploymentId: string | null;
  metrics: Record<string, DeploymentMetrics>;
  sparklines: Record<string, SparklinePoint[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDeployments: () => Promise<void>;
  fetchDeployment: (id: string) => Promise<void>;
  fetchMetrics: (id: string) => Promise<void>;
  fetchSparkline: (id: string, metric: string) => Promise<void>;
  selectDeployment: (id: string | null) => void;
  setError: (error: string | null) => void;
  upsertDeployment: (deployment: Deployment) => void;

  // Derived
  getDeployment: (id: string) => Deployment | undefined;
  getHealthyCount: () => number;
  getDegradedCount: () => number;
  getCriticalCount: () => number;
  getActiveCount: () => number;
}

export const useDeploymentStore = create<DeploymentStore>((set, get) => ({
  deployments: [],
  selectedDeploymentId: null,
  metrics: {},
  sparklines: {},
  isLoading: false,
  error: null,

  fetchDeployments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await deploymentsApi.list();
      set({ deployments: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load deployments";
      set({ isLoading: false, error: message });
    }
  },

  fetchDeployment: async (id) => {
    try {
      const data = await deploymentsApi.get(id);
      set((state) => ({
        deployments: state.deployments.some((d) => d.deploymentId === id)
          ? state.deployments.map((d) => (d.deploymentId === id ? data : d))
          : [...state.deployments, data],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load deployment";
      set({ error: message });
    }
  },

  fetchMetrics: async (id) => {
    try {
      const data = await deploymentsApi.getMetrics(id);
      set((state) => ({ metrics: { ...state.metrics, [id]: data } }));
    } catch {
      // Metrics fetch failure is non-blocking
    }
  },

  fetchSparkline: async (id, metric) => {
    try {
      const data = await deploymentsApi.getSparkline(id, metric);
      const key = `${id}:${metric}`;
      set((state) => ({ sparklines: { ...state.sparklines, [key]: data } }));
    } catch {
      // Sparkline fetch failure is non-blocking
    }
  },

  selectDeployment: (id) => set({ selectedDeploymentId: id }),

  setError: (error) => set({ error }),

  upsertDeployment: (deployment) => {
    set((state) => ({
      deployments: state.deployments.some((d) => d.deploymentId === deployment.deploymentId)
        ? state.deployments.map((d) =>
            d.deploymentId === deployment.deploymentId ? deployment : d,
          )
        : [...state.deployments, deployment],
    }));
  },

  getDeployment: (id) => get().deployments.find((d) => d.deploymentId === id),

  getHealthyCount: () => get().deployments.filter((d) => d.status === "active").length,

  getDegradedCount: () => get().deployments.filter((d) => d.status === "degraded").length,

  getCriticalCount: () => get().deployments.filter((d) => d.status === "critical").length,

  getActiveCount: () =>
    get().deployments.filter((d) => d.status !== "terminated").length,
}));
