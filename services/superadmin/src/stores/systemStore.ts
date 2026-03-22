// GridMind Superadmin — System health store

import { create } from "zustand";
import type {
  DatabaseMetrics,
  NatsMetrics,
  RedisMetrics,
  ServiceStatus,
  SystemHealthSnapshot,
  SystemService,
} from "@/types";

interface SystemState {
  // Data
  snapshot: SystemHealthSnapshot | null;
  services: SystemService[];
  nats: NatsMetrics | null;
  database: DatabaseMetrics | null;
  redis: RedisMetrics | null;
  lastRefreshedAt: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  autoRefresh: boolean;

  // Actions
  setSnapshot: (snapshot: SystemHealthSnapshot) => void;
  setServices: (services: SystemService[]) => void;
  setNats: (nats: NatsMetrics) => void;
  setDatabase: (db: DatabaseMetrics) => void;
  setRedis: (redis: RedisMetrics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAutoRefresh: (enabled: boolean) => void;
  markRefreshed: () => void;

  // Derived
  getOverallStatus: () => ServiceStatus;
  getHealthyServiceCount: () => number;
  getDegradedServiceCount: () => number;
  getDownServiceCount: () => number;
  getServiceByName: (name: string) => SystemService | undefined;
  getDbConnectionPercent: () => number;
  getRedisMemoryPercent: () => number;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  // Initial data
  snapshot: null,
  services: [],
  nats: null,
  database: null,
  redis: null,
  lastRefreshedAt: null,

  // Initial UI state
  isLoading: false,
  error: null,
  autoRefresh: true,

  // Actions
  setSnapshot: (snapshot) =>
    set({
      snapshot,
      services: snapshot.services,
      nats: snapshot.nats,
      database: snapshot.database,
      redis: snapshot.redis,
      lastRefreshedAt: snapshot.collectedAt,
    }),

  setServices: (services) => set({ services }),
  setNats: (nats) => set({ nats }),
  setDatabase: (db) => set({ database: db }),
  setRedis: (redis) => set({ redis }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
  markRefreshed: () =>
    set({ lastRefreshedAt: new Date().toISOString() }),

  // Derived
  getOverallStatus: (): ServiceStatus => {
    const { services } = get();
    if (services.some((s) => s.status === "down")) return "down";
    if (services.some((s) => s.status === "degraded")) return "degraded";
    if (services.length === 0) return "unknown";
    return "healthy";
  },

  getHealthyServiceCount: () =>
    get().services.filter((s) => s.status === "healthy").length,

  getDegradedServiceCount: () =>
    get().services.filter((s) => s.status === "degraded").length,

  getDownServiceCount: () =>
    get().services.filter((s) => s.status === "down").length,

  getServiceByName: (name) =>
    get().services.find((s) => s.name === name),

  getDbConnectionPercent: () => {
    const { database } = get();
    if (!database || database.maxConnections === 0) return 0;
    return (database.activeConnections / database.maxConnections) * 100;
  },

  getRedisMemoryPercent: () => {
    const { redis } = get();
    if (!redis || redis.maxMemoryMb === 0) return 0;
    return (redis.usedMemoryMb / redis.maxMemoryMb) * 100;
  },
}));
