import { describe, it, expect, beforeEach } from "vitest";

import { useCostStore } from "@/stores/costStore";

describe("costStore", () => {
  beforeEach(() => {
    // Reset to initial state
    useCostStore.getState().setPeriod("24h");
    useCostStore.getState().setBudget(250);
  });

  describe("setPeriod", () => {
    it("updates period to 7d", () => {
      useCostStore.getState().setPeriod("7d");
      expect(useCostStore.getState().period).toBe("7d");
    });

    it("updates period to 30d", () => {
      useCostStore.getState().setPeriod("30d");
      expect(useCostStore.getState().period).toBe("30d");
    });

    it("recalculates summary when period changes", () => {
      const before = useCostStore.getState().summary.totalCostUsd;
      useCostStore.getState().setPeriod("7d");
      const after = useCostStore.getState().summary.totalCostUsd;
      // 7d sum should be larger than 1d
      expect(after).toBeGreaterThan(before);
    });

    it("updates summary periodLabel for 24h", () => {
      useCostStore.getState().setPeriod("24h");
      expect(useCostStore.getState().summary.periodLabel).toBe("Today");
    });

    it("updates summary periodLabel for 7d", () => {
      useCostStore.getState().setPeriod("7d");
      expect(useCostStore.getState().summary.periodLabel).toBe("Last 7 days");
    });

    it("updates summary periodLabel for 30d", () => {
      useCostStore.getState().setPeriod("30d");
      expect(useCostStore.getState().summary.periodLabel).toBe("Last 30 days");
    });
  });

  describe("getTotalCost", () => {
    it("returns a positive number", () => {
      const total = useCostStore.getState().getTotalCost();
      expect(total).toBeGreaterThan(0);
    });

    it("matches summary totalCostUsd", () => {
      const total = useCostStore.getState().getTotalCost();
      expect(total).toBe(useCostStore.getState().summary.totalCostUsd);
    });
  });

  describe("getTopAgentByCost", () => {
    it("returns the agent with highest total cost", () => {
      const top = useCostStore.getState().getTopAgentByCost();
      expect(top).not.toBeNull();
      // FORGE uses Opus — most expensive
      expect(top?.agentDisplayName).toBe("FORGE");
    });

    it("returns an AgentCostBreakdown with expected fields", () => {
      const top = useCostStore.getState().getTopAgentByCost();
      expect(top).toHaveProperty("agentName");
      expect(top).toHaveProperty("model");
      expect(top).toHaveProperty("totalCostUsd");
      expect(top).toHaveProperty("decisions");
    });
  });

  describe("getModelDistribution", () => {
    it("returns percentages that sum to approximately 100", () => {
      const dist = useCostStore.getState().getModelDistribution();
      const sum = dist.haiku + dist.sonnet + dist.opus;
      expect(sum).toBeCloseTo(100, 0);
    });

    it("returns positive values for all model tiers", () => {
      const dist = useCostStore.getState().getModelDistribution();
      expect(dist.haiku).toBeGreaterThan(0);
      expect(dist.sonnet).toBeGreaterThan(0);
      expect(dist.opus).toBeGreaterThan(0);
    });

    it("opus has higher percentage than haiku due to cost", () => {
      const dist = useCostStore.getState().getModelDistribution();
      // Opus is more expensive per-decision so should be higher cost share
      expect(dist.opus).toBeGreaterThan(dist.haiku);
    });
  });

  describe("setBudget", () => {
    it("updates budget amount", () => {
      useCostStore.getState().setBudget(500);
      expect(useCostStore.getState().budget.budgetUsd).toBe(500);
    });

    it("recalculates percentUsed when budget changes", () => {
      useCostStore.getState().setBudget(10);
      const budget = useCostStore.getState().budget;
      // With $10 budget and ~$7-8 daily costs, should be high percentage
      expect(budget.percentUsed).toBeGreaterThan(50);
    });

    it("budget with large amount shows low percentage", () => {
      useCostStore.getState().setBudget(10000);
      const budget = useCostStore.getState().budget;
      expect(budget.percentUsed).toBeLessThan(10);
    });
  });

  describe("budget thresholds", () => {
    it("green zone: percentUsed < 50 with high budget", () => {
      useCostStore.getState().setBudget(10000);
      const budget = useCostStore.getState().budget;
      expect(budget.percentUsed).toBeLessThan(50);
    });

    it("amber zone: percentUsed 50-80 with moderate budget", () => {
      // Set budget so spent is ~50-80%
      const spent = useCostStore.getState().summary.totalCostUsd;
      const budgetForAmber = spent / 0.65; // ~65%
      useCostStore.getState().setBudget(budgetForAmber);
      const budget = useCostStore.getState().budget;
      expect(budget.percentUsed).toBeGreaterThanOrEqual(50);
      expect(budget.percentUsed).toBeLessThan(80);
    });

    it("red zone: percentUsed >= 80 with tight budget", () => {
      const spent = useCostStore.getState().summary.totalCostUsd;
      const budgetForRed = spent / 0.9; // ~90%
      useCostStore.getState().setBudget(budgetForRed);
      const budget = useCostStore.getState().budget;
      expect(budget.percentUsed).toBeGreaterThanOrEqual(80);
    });
  });

  describe("initial state", () => {
    it("has mock decisions loaded", () => {
      expect(useCostStore.getState().decisions.length).toBeGreaterThan(0);
    });

    it("has agent costs loaded", () => {
      expect(useCostStore.getState().agentCosts.length).toBe(9);
    });

    it("has daily costs loaded", () => {
      expect(useCostStore.getState().dailyCosts.length).toBeGreaterThan(0);
    });

    it("is not loading initially", () => {
      expect(useCostStore.getState().isLoading).toBe(false);
    });
  });
});
