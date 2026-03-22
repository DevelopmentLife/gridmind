import { create } from "zustand";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/types";
import { incidents as incidentsApi } from "@/lib/api";

interface IncidentFilter {
  status: IncidentStatus | "all";
  severity: IncidentSeverity | "all";
  deploymentId: string | null;
}

interface IncidentStore {
  incidents: Incident[];
  filter: IncidentFilter;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchIncidents: () => Promise<void>;
  fetchIncident: (id: string) => Promise<void>;
  acknowledgeIncident: (id: string) => Promise<void>;
  resolveIncident: (id: string, resolution: string) => Promise<void>;
  setFilter: (filter: Partial<IncidentFilter>) => void;
  upsertIncident: (incident: Incident) => void;
  setError: (error: string | null) => void;

  // Derived
  getIncident: (id: string) => Incident | undefined;
  getFilteredIncidents: () => Incident[];
  getOpenCount: () => number;
  getCriticalCount: () => number;
}

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  filter: {
    status: "all",
    severity: "all",
    deploymentId: null,
  },
  isLoading: false,
  error: null,

  fetchIncidents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filter } = get();
      const params: Record<string, string> = {};
      if (filter.status !== "all") params["status"] = filter.status;
      if (filter.severity !== "all") params["severity"] = filter.severity;
      if (filter.deploymentId) params["deploymentId"] = filter.deploymentId;
      const data = await incidentsApi.list(params);
      set({ incidents: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load incidents";
      set({ isLoading: false, error: message });
    }
  },

  fetchIncident: async (id) => {
    try {
      const data = await incidentsApi.get(id);
      set((state) => ({
        incidents: state.incidents.some((i) => i.incidentId === id)
          ? state.incidents.map((i) => (i.incidentId === id ? data : i))
          : [...state.incidents, data],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load incident";
      set({ error: message });
    }
  },

  acknowledgeIncident: async (id) => {
    try {
      const updated = await incidentsApi.acknowledge(id);
      set((state) => ({
        incidents: state.incidents.map((i) => (i.incidentId === id ? updated : i)),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to acknowledge incident";
      set({ error: message });
    }
  },

  resolveIncident: async (id, resolution) => {
    try {
      const updated = await incidentsApi.resolve(id, resolution);
      set((state) => ({
        incidents: state.incidents.map((i) => (i.incidentId === id ? updated : i)),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resolve incident";
      set({ error: message });
    }
  },

  setFilter: (partial) => {
    set((state) => ({ filter: { ...state.filter, ...partial } }));
  },

  upsertIncident: (incident) => {
    set((state) => ({
      incidents: state.incidents.some((i) => i.incidentId === incident.incidentId)
        ? state.incidents.map((i) => (i.incidentId === incident.incidentId ? incident : i))
        : [incident, ...state.incidents],
    }));
  },

  setError: (error) => set({ error }),

  getIncident: (id) => get().incidents.find((i) => i.incidentId === id),

  getFilteredIncidents: () => {
    const { incidents, filter } = get();
    return incidents.filter((i) => {
      if (filter.status !== "all" && i.status !== filter.status) return false;
      if (filter.severity !== "all" && i.severity !== filter.severity) return false;
      if (filter.deploymentId && i.deploymentId !== filter.deploymentId) return false;
      return true;
    });
  },

  getOpenCount: () =>
    get().incidents.filter((i) => i.status === "open" || i.status === "investigating").length,

  getCriticalCount: () =>
    get().incidents.filter((i) => i.severity === "critical" && i.status !== "resolved" && i.status !== "closed").length,
}));
