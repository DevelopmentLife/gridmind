// GridMind Superadmin — Audit log store

import { create } from "zustand";
import type { AuditFilter, AuditLogEntry } from "@/types";

interface AuditState {
  // Data
  entries: AuditLogEntry[];
  totalCount: number;
  nextCursor: string | null;

  // Filter state
  filter: AuditFilter;

  // UI state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  expandedEntryId: string | null;

  // Actions
  setEntries: (
    entries: AuditLogEntry[],
    totalCount: number,
    nextCursor: string | null
  ) => void;
  appendEntries: (
    entries: AuditLogEntry[],
    nextCursor: string | null
  ) => void;
  setFilter: (filter: Partial<AuditFilter>) => void;
  resetFilter: () => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setExpandedEntry: (id: string | null) => void;

  // Derived
  getEntriesBySeverity: (
    severity: AuditLogEntry["severity"]
  ) => AuditLogEntry[];
  getCriticalCount: () => number;
  getFilteredCount: () => number;
}

const DEFAULT_FILTER: AuditFilter = {
  tenantId: null,
  agentName: null,
  actionType: null,
  severity: null,
  startDate: null,
  endDate: null,
  search: "",
};

export const useAuditStore = create<AuditState>((set, get) => ({
  // Initial data
  entries: [],
  totalCount: 0,
  nextCursor: null,

  // Initial filter
  filter: { ...DEFAULT_FILTER },

  // Initial UI state
  isLoading: false,
  isLoadingMore: false,
  error: null,
  expandedEntryId: null,

  // Actions
  setEntries: (entries, totalCount, nextCursor) =>
    set({ entries, totalCount, nextCursor }),

  appendEntries: (newEntries, nextCursor) =>
    set((state) => ({
      entries: [...state.entries, ...newEntries],
      nextCursor,
    })),

  setFilter: (partial) =>
    set((state) => ({
      filter: { ...state.filter, ...partial },
      // Reset entries when filter changes
      entries: [],
      nextCursor: null,
    })),

  resetFilter: () =>
    set({
      filter: { ...DEFAULT_FILTER },
      entries: [],
      nextCursor: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
  setError: (error) => set({ error }),
  setExpandedEntry: (id) => set({ expandedEntryId: id }),

  // Derived
  getEntriesBySeverity: (severity) =>
    get().entries.filter((e) => e.severity === severity),

  getCriticalCount: () =>
    get().entries.filter((e) => e.severity === "critical").length,

  getFilteredCount: () => get().entries.length,
}));
