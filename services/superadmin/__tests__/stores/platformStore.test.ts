import { describe, it, expect, beforeEach } from "vitest";
import { usePlatformStore } from "@/stores/platformStore";
import type { PlatformMetrics, PlatformSettings, RevenueDataPoint, TierRevenue } from "@/types";

const MOCK_METRICS: PlatformMetrics = {
  totalTenants: 1247,
  activeTenants: 1089,
  trialTenants: 98,
  suspendedTenants: 12,
  mrr: 48_350_00, // $483,500 in cents
  arr: 580_200_00,
  churnRate: 2.1,
  netRevenueRetention: 118.4,
  avgRevenuePerTenant: 3_880_00,
  totalDeployments: 4823,
  totalAgentsRunning: 29_928,
  platformUptime: 99.97,
  openIncidents: 3,
  p1Incidents: 0,
};

const MOCK_SETTINGS: PlatformSettings = {
  jwtAlgorithm: "RS256",
  accessTokenExpiryMinutes: 15,
  refreshTokenExpiryDays: 7,
  globalRateLimitPerMinute: 600,
  maxRequestBodyKb: 1024,
  emailProvider: "AWS SES",
  smtpHost: "email-smtp.us-east-1.amazonaws.com",
  smtpPort: 587,
  vaultStatus: "connected",
  vaultVersion: "1.15.4",
  maintenanceMode: false,
  signupsEnabled: true,
  platformVersion: "1.2.0",
  environment: "production",
};

beforeEach(() => {
  usePlatformStore.setState({
    metrics: null,
    revenueHistory: [],
    tierBreakdown: [],
    settings: null,
    isLoadingMetrics: false,
    isLoadingRevenue: false,
    isLoadingSettings: false,
    metricsError: null,
    revenueError: null,
    settingsError: null,
  });
});

describe("platformStore", () => {
  describe("setMetrics", () => {
    it("stores metrics in state", () => {
      usePlatformStore.getState().setMetrics(MOCK_METRICS);
      expect(usePlatformStore.getState().metrics).toEqual(MOCK_METRICS);
    });

    it("overwrites previous metrics", () => {
      usePlatformStore.getState().setMetrics(MOCK_METRICS);
      const updated = { ...MOCK_METRICS, totalTenants: 2000 };
      usePlatformStore.getState().setMetrics(updated);
      expect(usePlatformStore.getState().metrics?.totalTenants).toBe(2000);
    });
  });

  describe("setRevenueHistory", () => {
    it("stores revenue history", () => {
      const data: RevenueDataPoint[] = [
        { month: "2025-01", mrr: 1_000_000, arr: 12_000_000, newMrr: 100_000, churnedMrr: 50_000, expansionMrr: 80_000 },
      ];
      usePlatformStore.getState().setRevenueHistory(data);
      expect(usePlatformStore.getState().revenueHistory).toHaveLength(1);
    });
  });

  describe("setTierBreakdown", () => {
    it("stores tier breakdown", () => {
      const data: TierRevenue[] = [
        { tier: "enterprise", tenantCount: 48, mrr: 7_200_000, percentage: 60 },
      ];
      usePlatformStore.getState().setTierBreakdown(data);
      expect(usePlatformStore.getState().tierBreakdown).toHaveLength(1);
    });
  });

  describe("setSettings", () => {
    it("stores settings", () => {
      usePlatformStore.getState().setSettings(MOCK_SETTINGS);
      expect(usePlatformStore.getState().settings).toEqual(MOCK_SETTINGS);
    });
  });

  describe("loading state", () => {
    it("setLoadingMetrics toggles isLoadingMetrics", () => {
      usePlatformStore.getState().setLoadingMetrics(true);
      expect(usePlatformStore.getState().isLoadingMetrics).toBe(true);
      usePlatformStore.getState().setLoadingMetrics(false);
      expect(usePlatformStore.getState().isLoadingMetrics).toBe(false);
    });

    it("setLoadingRevenue toggles isLoadingRevenue", () => {
      usePlatformStore.getState().setLoadingRevenue(true);
      expect(usePlatformStore.getState().isLoadingRevenue).toBe(true);
    });

    it("setLoadingSettings toggles isLoadingSettings", () => {
      usePlatformStore.getState().setLoadingSettings(true);
      expect(usePlatformStore.getState().isLoadingSettings).toBe(true);
    });
  });

  describe("error state", () => {
    it("setMetricsError stores error message", () => {
      usePlatformStore.getState().setMetricsError("Network error");
      expect(usePlatformStore.getState().metricsError).toBe("Network error");
    });

    it("setMetricsError can clear error with null", () => {
      usePlatformStore.getState().setMetricsError("Error");
      usePlatformStore.getState().setMetricsError(null);
      expect(usePlatformStore.getState().metricsError).toBeNull();
    });

    it("setRevenueError stores error", () => {
      usePlatformStore.getState().setRevenueError("Fetch failed");
      expect(usePlatformStore.getState().revenueError).toBe("Fetch failed");
    });

    it("setSettingsError stores error", () => {
      usePlatformStore.getState().setSettingsError("Unauthorized");
      expect(usePlatformStore.getState().settingsError).toBe("Unauthorized");
    });
  });

  describe("updateSettings", () => {
    it("merges partial settings update", () => {
      usePlatformStore.getState().setSettings(MOCK_SETTINGS);
      usePlatformStore.getState().updateSettings({ maintenanceMode: true });
      expect(usePlatformStore.getState().settings?.maintenanceMode).toBe(true);
      // Other fields preserved
      expect(usePlatformStore.getState().settings?.jwtAlgorithm).toBe("RS256");
    });

    it("does nothing if settings is null", () => {
      // settings is null by default — should not throw
      expect(() =>
        usePlatformStore.getState().updateSettings({ maintenanceMode: true })
      ).not.toThrow();
      expect(usePlatformStore.getState().settings).toBeNull();
    });
  });

  describe("getMrrFormatted", () => {
    it("returns $0 when metrics is null", () => {
      expect(usePlatformStore.getState().getMrrFormatted()).toBe("$0");
    });

    it("formats MRR in millions", () => {
      usePlatformStore.getState().setMetrics({ ...MOCK_METRICS, mrr: 200_000_00 });
      const result = usePlatformStore.getState().getMrrFormatted();
      expect(result).toBe("$2.0M");
    });

    it("formats MRR in thousands", () => {
      usePlatformStore.getState().setMetrics({ ...MOCK_METRICS, mrr: 50_000 }); // $500
      const result = usePlatformStore.getState().getMrrFormatted();
      // $500 — not K or M
      expect(result).toBe("$500");
    });

    it("formats MRR in K", () => {
      usePlatformStore.getState().setMetrics({ ...MOCK_METRICS, mrr: 500_000 }); // $5000
      const result = usePlatformStore.getState().getMrrFormatted();
      expect(result).toBe("$5.0K");
    });
  });

  describe("getArrFormatted", () => {
    it("returns $0 when metrics is null", () => {
      expect(usePlatformStore.getState().getArrFormatted()).toBe("$0");
    });

    it("formats ARR correctly", () => {
      usePlatformStore.getState().setMetrics({ ...MOCK_METRICS, arr: 1_000_000_00 }); // $10M
      const result = usePlatformStore.getState().getArrFormatted();
      expect(result).toBe("$10.0M");
    });
  });

  describe("getChurnRateFormatted", () => {
    it("returns 0% when metrics is null", () => {
      expect(usePlatformStore.getState().getChurnRateFormatted()).toBe("0%");
    });

    it("formats churn rate with one decimal", () => {
      usePlatformStore.getState().setMetrics({ ...MOCK_METRICS, churnRate: 2.1 });
      expect(usePlatformStore.getState().getChurnRateFormatted()).toBe("2.1%");
    });
  });

  describe("getHealthyServicesCount", () => {
    it("returns 0 by default", () => {
      expect(usePlatformStore.getState().getHealthyServicesCount()).toBe(0);
    });
  });
});
