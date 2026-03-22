import { create } from "zustand";
import type { Agent, AgentActivity, AgentStatus, AgentTier } from "@/types";
import { agents as agentsApi } from "@/lib/api";

interface AgentStore {
  agents: Agent[];
  activity: AgentActivity[];
  selectedAgentId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAgents: (deploymentId?: string) => Promise<void>;
  fetchActivity: (deploymentId?: string, limit?: number) => Promise<void>;
  selectAgent: (id: string | null) => void;
  upsertAgent: (agent: Agent) => void;
  appendActivity: (entry: AgentActivity) => void;
  setError: (error: string | null) => void;

  // Derived
  getAgent: (id: string) => Agent | undefined;
  getAgentsByTier: (tier: AgentTier) => Agent[];
  getAgentsByStatus: (status: AgentStatus) => Agent[];
  getHealthyCount: () => number;
  getProcessingCount: () => number;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  activity: [],
  selectedAgentId: null,
  isLoading: false,
  error: null,

  fetchAgents: async (deploymentId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await agentsApi.list(deploymentId);
      set({ agents: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load agents";
      set({ isLoading: false, error: message });
    }
  },

  fetchActivity: async (deploymentId, limit = 50) => {
    try {
      const data = await agentsApi.activity(deploymentId, limit);
      set({ activity: data });
    } catch {
      // Activity fetch failure is non-blocking
    }
  },

  selectAgent: (id) => set({ selectedAgentId: id }),

  upsertAgent: (agent) => {
    set((state) => ({
      agents: state.agents.some((a) => a.agentId === agent.agentId)
        ? state.agents.map((a) => (a.agentId === agent.agentId ? agent : a))
        : [...state.agents, agent],
    }));
  },

  appendActivity: (entry) => {
    set((state) => ({
      activity: [entry, ...state.activity].slice(0, 200),
    }));
  },

  setError: (error) => set({ error }),

  getAgent: (id) => get().agents.find((a) => a.agentId === id),

  getAgentsByTier: (tier) => get().agents.filter((a) => a.tier === tier),

  getAgentsByStatus: (status) => get().agents.filter((a) => a.status === status),

  getHealthyCount: () => get().agents.filter((a) => a.status === "healthy").length,

  getProcessingCount: () => get().agents.filter((a) => a.status === "processing").length,
}));
