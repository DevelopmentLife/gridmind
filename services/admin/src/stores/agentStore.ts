// =============================================================================
// GridMind Admin — Agent Fleet Store
// =============================================================================

import { create } from "zustand";

import type { Agent, AgentStatus, AgentTier, FilterState, FleetHealthSummary } from "@/types";

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  isLoading: boolean;
  error: string | null;
  filter: FilterState;
  fleetHealth: FleetHealthSummary | null;

  // Actions
  setAgents: (agents: Agent[]) => void;
  selectAgent: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  setFleetHealth: (health: FleetHealthSummary) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  incrementTasksInFlight: (agentId: string) => void;
  decrementTasksInFlight: (agentId: string) => void;

  // Derived
  getAgentById: (id: string) => Agent | undefined;
  getAgentsByTier: (tier: AgentTier) => Agent[];
  getFilteredAgents: () => Agent[];
  getHealthyCount: () => number;
  getDegradedCount: () => number;
  getOfflineCount: () => number;
  getHealthyCountByTier: (tier: AgentTier) => number;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgentId: null,
  isLoading: false,
  error: null,
  filter: { search: "" },
  fleetHealth: null,

  setAgents: (agents) => set({ agents }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  setFleetHealth: (fleetHealth) => set({ fleetHealth }),

  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.agentId === agentId ? { ...a, status } : a
      ),
    })),

  incrementTasksInFlight: (agentId) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.agentId === agentId
          ? { ...a, tasksInFlight: a.tasksInFlight + 1 }
          : a
      ),
    })),

  decrementTasksInFlight: (agentId) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.agentId === agentId
          ? { ...a, tasksInFlight: Math.max(0, a.tasksInFlight - 1) }
          : a
      ),
    })),

  getAgentById: (id) => get().agents.find((a) => a.agentId === id),

  getAgentsByTier: (tier) =>
    get().agents.filter((a) => a.tier === tier),

  getFilteredAgents: () => {
    const { agents, filter } = get();
    return agents.filter((agent) => {
      const matchesSearch =
        !filter.search ||
        agent.displayName.toLowerCase().includes(filter.search.toLowerCase()) ||
        agent.agentName.toLowerCase().includes(filter.search.toLowerCase()) ||
        agent.description.toLowerCase().includes(filter.search.toLowerCase());

      const matchesStatus = !filter.status || agent.status === filter.status;
      const matchesTier = !filter.tier || agent.tier === filter.tier;

      return matchesSearch && matchesStatus && matchesTier;
    });
  },

  getHealthyCount: () =>
    get().agents.filter((a) => a.status === "healthy").length,

  getDegradedCount: () =>
    get().agents.filter((a) => a.status === "degraded").length,

  getOfflineCount: () =>
    get().agents.filter((a) => a.status === "offline").length,

  getHealthyCountByTier: (tier) =>
    get().agents.filter((a) => a.tier === tier && a.status === "healthy").length,
}));
