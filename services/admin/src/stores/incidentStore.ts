// =============================================================================
// GridMind Admin — Incident Store
// =============================================================================

import { create } from "zustand";

import type { FilterState, Incident, IncidentSeverity, IncidentStatus } from "@/types";

interface IncidentState {
  incidents: Incident[];
  selectedIncidentId: string | null;
  isLoading: boolean;
  error: string | null;
  filter: FilterState & { severity?: IncidentSeverity; incidentStatus?: IncidentStatus };
  totalCount: number;

  // Actions
  setIncidents: (incidents: Incident[], total?: number) => void;
  selectIncident: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (
    filter: Partial<
      FilterState & { severity?: IncidentSeverity; incidentStatus?: IncidentStatus }
    >
  ) => void;
  resolveIncident: (incidentId: string, resolution: string) => void;

  // Derived
  getIncidentById: (id: string) => Incident | undefined;
  getFilteredIncidents: () => Incident[];
  getOpenCount: () => number;
  getP1Count: () => number;
  getCountBySeverity: (severity: IncidentSeverity) => number;
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  selectedIncidentId: null,
  isLoading: false,
  error: null,
  filter: { search: "" },
  totalCount: 0,

  setIncidents: (incidents, total) =>
    set({ incidents, totalCount: total ?? incidents.length }),

  selectIncident: (id) => set({ selectedIncidentId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  resolveIncident: (incidentId, resolution) =>
    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.incidentId === incidentId
          ? {
              ...inc,
              status: "resolved" as IncidentStatus,
              resolution,
              resolvedAt: new Date().toISOString(),
            }
          : inc
      ),
    })),

  getIncidentById: (id) =>
    get().incidents.find((i) => i.incidentId === id),

  getFilteredIncidents: () => {
    const { incidents, filter } = get();
    return incidents.filter((inc) => {
      const matchesSearch =
        !filter.search ||
        inc.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        inc.tenantName.toLowerCase().includes(filter.search.toLowerCase());

      const matchesSeverity =
        !filter.severity || inc.severity === filter.severity;

      const matchesStatus =
        !filter.incidentStatus || inc.status === filter.incidentStatus;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  },

  getOpenCount: () =>
    get().incidents.filter((i) => i.status !== "resolved").length,

  getP1Count: () =>
    get().incidents.filter(
      (i) => i.severity === "P1" && i.status !== "resolved"
    ).length,

  getCountBySeverity: (severity) =>
    get().incidents.filter((i) => i.severity === severity).length,
}));
