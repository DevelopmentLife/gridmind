// GridMind Superadmin — Platform metrics store

import { create } from "zustand";
import type {
  PlatformMetrics,
  PlatformSettings,
  RevenueDataPoint,
  TierRevenue,
} from "@/types";

interface PlatformState {
  // Data
  metrics: PlatformMetrics | null;
  revenueHistory: RevenueDataPoint[];
  tierBreakdown: TierRevenue[];
  settings: PlatformSettings | null;

  // UI state
  isLoadingMetrics: boolean;
  isLoadingRevenue: boolean;
  isLoadingSettings: boolean;
  metricsError: string | null;
  revenueError: string | null;
  settingsError: string | null;

  // Actions
  setMetrics: (metrics: PlatformMetrics) => void;
  setRevenueHistory: (data: RevenueDataPoint[]) => void;
  setTierBreakdown: (data: TierRevenue[]) => void;
  setSettings: (settings: PlatformSettings) => void;
  setLoadingMetrics: (loading: boolean) => void;
  setLoadingRevenue: (loading: boolean) => void;
  setLoadingSettings: (loading: boolean) => void;
  setMetricsError: (error: string | null) => void;
  setRevenueError: (error: string | null) => void;
  setSettingsError: (error: string | null) => void;
  updateSettings: (partial: Partial<PlatformSettings>) => void;

  // Derived selectors
  getMrrFormatted: () => string;
  getArrFormatted: () => string;
  getChurnRateFormatted: () => string;
  getHealthyServicesCount: () => number;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  // Initial data state
  metrics: null,
  revenueHistory: [],
  tierBreakdown: [],
  settings: null,

  // Initial UI state
  isLoadingMetrics: false,
  isLoadingRevenue: false,
  isLoadingSettings: false,
  metricsError: null,
  revenueError: null,
  settingsError: null,

  // Actions
  setMetrics: (metrics) => set({ metrics }),
  setRevenueHistory: (data) => set({ revenueHistory: data }),
  setTierBreakdown: (data) => set({ tierBreakdown: data }),
  setSettings: (settings) => set({ settings }),
  setLoadingMetrics: (loading) => set({ isLoadingMetrics: loading }),
  setLoadingRevenue: (loading) => set({ isLoadingRevenue: loading }),
  setLoadingSettings: (loading) => set({ isLoadingSettings: loading }),
  setMetricsError: (error) => set({ metricsError: error }),
  setRevenueError: (error) => set({ revenueError: error }),
  setSettingsError: (error) => set({ settingsError: error }),

  updateSettings: (partial) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, ...partial } });
  },

  // Derived selectors
  getMrrFormatted: () => {
    const metrics = get().metrics;
    if (!metrics) return "$0";
    const dollars = metrics.mrr / 100;
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
    if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
    return `$${dollars.toFixed(0)}`;
  },

  getArrFormatted: () => {
    const metrics = get().metrics;
    if (!metrics) return "$0";
    const dollars = metrics.arr / 100;
    if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
    if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
    return `$${dollars.toFixed(0)}`;
  },

  getChurnRateFormatted: () => {
    const metrics = get().metrics;
    if (!metrics) return "0%";
    return `${metrics.churnRate.toFixed(1)}%`;
  },

  getHealthyServicesCount: () => {
    // Placeholder — populated by systemStore in real usage
    return 0;
  },
}));
