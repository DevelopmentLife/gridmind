import { describe, it, expect, beforeEach } from "vitest";

import { useAgentStore } from "@/stores/agentStore";
import type { Agent, FleetHealthSummary } from "@/types";

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  agentId: "argus-001",
  agentName: "argus",
  displayName: "ARGUS",
  tier: "perception",
  status: "healthy",
  autonomyLevel: "autonomous",
  model: "claude-haiku-4-5",
  visibility: "Customer",
  description: "Workload profiler.",
  uptimeSeconds: 86400,
  tasksInFlight: 2,
  tasksCompletedTotal: 1000,
  errorRatePercent: 0.1,
  avgCycleMs: 850,
  lastActionAt: new Date().toISOString(),
  lastHeartbeatAt: new Date().toISOString(),
  ...overrides,
});

const mockHealth: FleetHealthSummary = {
  totalAgents: 24,
  healthyAgents: 20,
  degradedAgents: 3,
  offlineAgents: 1,
  openIncidents: 4,
  pendingApprovals: 7,
  p1Incidents: 1,
};

describe("agentStore", () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: [],
      selectedAgentId: null,
      isLoading: false,
      error: null,
      filter: { search: "" },
      fleetHealth: null,
    });
  });

  describe("setAgents", () => {
    it("updates the agents list", () => {
      const agents = [makeAgent(), makeAgent({ agentId: "oracle-001", agentName: "oracle" })];
      useAgentStore.getState().setAgents(agents);
      expect(useAgentStore.getState().agents).toHaveLength(2);
    });

    it("replaces existing agents", () => {
      useAgentStore.getState().setAgents([makeAgent()]);
      useAgentStore.getState().setAgents([makeAgent({ agentId: "new-001" }), makeAgent({ agentId: "new-002" })]);
      expect(useAgentStore.getState().agents).toHaveLength(2);
    });
  });

  describe("selectAgent", () => {
    it("sets selectedAgentId", () => {
      useAgentStore.getState().selectAgent("argus-001");
      expect(useAgentStore.getState().selectedAgentId).toBe("argus-001");
    });

    it("clears selectedAgentId when null is passed", () => {
      useAgentStore.getState().selectAgent("argus-001");
      useAgentStore.getState().selectAgent(null);
      expect(useAgentStore.getState().selectedAgentId).toBeNull();
    });
  });

  describe("setLoading", () => {
    it("sets isLoading to true", () => {
      useAgentStore.getState().setLoading(true);
      expect(useAgentStore.getState().isLoading).toBe(true);
    });

    it("sets isLoading to false", () => {
      useAgentStore.getState().setLoading(true);
      useAgentStore.getState().setLoading(false);
      expect(useAgentStore.getState().isLoading).toBe(false);
    });
  });

  describe("setError", () => {
    it("sets error message", () => {
      useAgentStore.getState().setError("Connection failed");
      expect(useAgentStore.getState().error).toBe("Connection failed");
    });

    it("clears error when null is passed", () => {
      useAgentStore.getState().setError("Connection failed");
      useAgentStore.getState().setError(null);
      expect(useAgentStore.getState().error).toBeNull();
    });
  });

  describe("setFilter", () => {
    it("updates search filter", () => {
      useAgentStore.getState().setFilter({ search: "argus" });
      expect(useAgentStore.getState().filter.search).toBe("argus");
    });

    it("merges partial filter updates", () => {
      useAgentStore.getState().setFilter({ search: "argus" });
      useAgentStore.getState().setFilter({ status: "healthy" });
      expect(useAgentStore.getState().filter.search).toBe("argus");
      expect(useAgentStore.getState().filter.status).toBe("healthy");
    });
  });

  describe("setFleetHealth", () => {
    it("sets fleet health summary", () => {
      useAgentStore.getState().setFleetHealth(mockHealth);
      expect(useAgentStore.getState().fleetHealth).toEqual(mockHealth);
    });
  });

  describe("updateAgentStatus", () => {
    it("updates status for the matching agent", () => {
      useAgentStore.getState().setAgents([makeAgent()]);
      useAgentStore.getState().updateAgentStatus("argus-001", "degraded");
      expect(useAgentStore.getState().agents[0]?.status).toBe("degraded");
    });

    it("does not affect other agents", () => {
      useAgentStore.getState().setAgents([
        makeAgent({ agentId: "argus-001" }),
        makeAgent({ agentId: "oracle-001" }),
      ]);
      useAgentStore.getState().updateAgentStatus("argus-001", "offline");
      expect(useAgentStore.getState().agents[1]?.status).toBe("healthy");
    });
  });

  describe("incrementTasksInFlight", () => {
    it("increments tasksInFlight by 1", () => {
      useAgentStore.getState().setAgents([makeAgent({ tasksInFlight: 2 })]);
      useAgentStore.getState().incrementTasksInFlight("argus-001");
      expect(useAgentStore.getState().agents[0]?.tasksInFlight).toBe(3);
    });
  });

  describe("decrementTasksInFlight", () => {
    it("decrements tasksInFlight by 1", () => {
      useAgentStore.getState().setAgents([makeAgent({ tasksInFlight: 3 })]);
      useAgentStore.getState().decrementTasksInFlight("argus-001");
      expect(useAgentStore.getState().agents[0]?.tasksInFlight).toBe(2);
    });

    it("does not go below 0", () => {
      useAgentStore.getState().setAgents([makeAgent({ tasksInFlight: 0 })]);
      useAgentStore.getState().decrementTasksInFlight("argus-001");
      expect(useAgentStore.getState().agents[0]?.tasksInFlight).toBe(0);
    });
  });

  describe("getAgentById", () => {
    it("returns the agent with matching id", () => {
      useAgentStore.getState().setAgents([makeAgent()]);
      const found = useAgentStore.getState().getAgentById("argus-001");
      expect(found?.agentName).toBe("argus");
    });

    it("returns undefined for unknown id", () => {
      useAgentStore.getState().setAgents([makeAgent()]);
      const found = useAgentStore.getState().getAgentById("nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("getAgentsByTier", () => {
    it("filters agents by tier", () => {
      useAgentStore.getState().setAgents([
        makeAgent({ agentId: "a1", tier: "perception" }),
        makeAgent({ agentId: "a2", tier: "reasoning" }),
        makeAgent({ agentId: "a3", tier: "perception" }),
      ]);
      const perception = useAgentStore.getState().getAgentsByTier("perception");
      expect(perception).toHaveLength(2);
    });

    it("returns empty array for tier with no agents", () => {
      useAgentStore.getState().setAgents([makeAgent({ tier: "perception" })]);
      const selfHealing = useAgentStore.getState().getAgentsByTier("self_healing");
      expect(selfHealing).toHaveLength(0);
    });
  });

  describe("getFilteredAgents", () => {
    beforeEach(() => {
      useAgentStore.getState().setAgents([
        makeAgent({ agentId: "a1", displayName: "ARGUS", tier: "perception", status: "healthy" }),
        makeAgent({ agentId: "a2", displayName: "SHERLOCK", tier: "reasoning", status: "degraded" }),
        makeAgent({ agentId: "a3", displayName: "FORGE-AGENT", tier: "execution", status: "healthy" }),
      ]);
    });

    it("returns all agents when no filter is set", () => {
      const result = useAgentStore.getState().getFilteredAgents();
      expect(result).toHaveLength(3);
    });

    it("filters by search on displayName", () => {
      useAgentStore.getState().setFilter({ search: "SHERLOCK" });
      const result = useAgentStore.getState().getFilteredAgents();
      expect(result).toHaveLength(1);
      expect(result[0]?.displayName).toBe("SHERLOCK");
    });

    it("filters by status", () => {
      useAgentStore.getState().setFilter({ status: "degraded" });
      const result = useAgentStore.getState().getFilteredAgents();
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("degraded");
    });

    it("filters by tier", () => {
      useAgentStore.getState().setFilter({ tier: "execution" });
      const result = useAgentStore.getState().getFilteredAgents();
      expect(result).toHaveLength(1);
      expect(result[0]?.tier).toBe("execution");
    });

    it("applies combined filters", () => {
      useAgentStore.getState().setFilter({ tier: "perception", status: "healthy" });
      const result = useAgentStore.getState().getFilteredAgents();
      expect(result).toHaveLength(1);
      expect(result[0]?.displayName).toBe("ARGUS");
    });
  });

  describe("health count selectors", () => {
    beforeEach(() => {
      useAgentStore.getState().setAgents([
        makeAgent({ agentId: "a1", status: "healthy" }),
        makeAgent({ agentId: "a2", status: "healthy" }),
        makeAgent({ agentId: "a3", status: "degraded" }),
        makeAgent({ agentId: "a4", status: "offline" }),
      ]);
    });

    it("getHealthyCount returns correct count", () => {
      expect(useAgentStore.getState().getHealthyCount()).toBe(2);
    });

    it("getDegradedCount returns correct count", () => {
      expect(useAgentStore.getState().getDegradedCount()).toBe(1);
    });

    it("getOfflineCount returns correct count", () => {
      expect(useAgentStore.getState().getOfflineCount()).toBe(1);
    });
  });
});
