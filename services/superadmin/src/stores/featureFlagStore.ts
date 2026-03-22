// GridMind Superadmin — Feature flag management store

import { create } from "zustand";
import type { FeatureFlag } from "@/types";

interface FeatureFlagState {
  // Data
  flags: FeatureFlag[];
  selectedFlag: FeatureFlag | null;

  // UI state
  isLoading: boolean;
  isSaving: string | null; // flagId being saved
  error: string | null;
  searchQuery: string;

  // Actions
  setFlags: (flags: FeatureFlag[]) => void;
  setSelectedFlag: (flag: FeatureFlag | null) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (flagId: string | null) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  updateFlag: (updated: FeatureFlag) => void;
  addFlag: (flag: FeatureFlag) => void;

  // Derived
  getFilteredFlags: () => FeatureFlag[];
  getEnabledCount: () => number;
  getDisabledCount: () => number;
  getPartialCount: () => number;
  getFlagByName: (name: string) => FeatureFlag | undefined;
}

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  // Initial data
  flags: [],
  selectedFlag: null,

  // Initial UI state
  isLoading: false,
  isSaving: null,
  error: null,
  searchQuery: "",

  // Actions
  setFlags: (flags) => set({ flags }),
  setSelectedFlag: (flag) => set({ selectedFlag: flag }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSaving: (flagId) => set({ isSaving: flagId }),
  setError: (error) => set({ error }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  updateFlag: (updated) =>
    set((state) => ({
      flags: state.flags.map((f) =>
        f.flagId === updated.flagId ? updated : f
      ),
      selectedFlag:
        state.selectedFlag?.flagId === updated.flagId
          ? updated
          : state.selectedFlag,
    })),

  addFlag: (flag) =>
    set((state) => ({ flags: [...state.flags, flag] })),

  // Derived
  getFilteredFlags: () => {
    const { flags, searchQuery } = get();
    if (!searchQuery) return flags;
    const q = searchQuery.toLowerCase();
    return flags.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
    );
  },

  getEnabledCount: () =>
    get().flags.filter((f) => f.status === "enabled").length,

  getDisabledCount: () =>
    get().flags.filter((f) => f.status === "disabled").length,

  getPartialCount: () =>
    get().flags.filter((f) => f.status === "partial").length,

  getFlagByName: (name) =>
    get().flags.find((f) => f.name === name),
}));
