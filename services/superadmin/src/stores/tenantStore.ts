// GridMind Superadmin — Tenant management store

import { create } from "zustand";
import type {
  ImpersonationSession,
  Tenant,
  TenantDetail,
  TenantStatus,
  TenantTier,
} from "@/types";

interface TenantFilterState {
  search: string;
  tier: TenantTier | null;
  status: TenantStatus | null;
  cursor: string | null;
  limit: number;
}

interface TenantState {
  // Data
  tenants: Tenant[];
  selectedTenant: TenantDetail | null;
  totalCount: number;
  nextCursor: string | null;
  impersonationSession: ImpersonationSession | null;

  // Filter / pagination
  filter: TenantFilterState;

  // UI state
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  isImpersonating: boolean;
  listError: string | null;
  detailError: string | null;

  // Actions
  setTenants: (tenants: Tenant[], totalCount: number, nextCursor: string | null) => void;
  appendTenants: (tenants: Tenant[], nextCursor: string | null) => void;
  setSelectedTenant: (tenant: TenantDetail | null) => void;
  setFilter: (filter: Partial<TenantFilterState>) => void;
  resetFilter: () => void;
  setLoadingList: (loading: boolean) => void;
  setLoadingDetail: (loading: boolean) => void;
  setImpersonating: (loading: boolean) => void;
  setListError: (error: string | null) => void;
  setDetailError: (error: string | null) => void;
  setImpersonationSession: (session: ImpersonationSession | null) => void;
  updateTenantInList: (updated: Tenant) => void;

  // Derived
  getFilteredTenants: () => Tenant[];
  getTenantById: (id: string) => Tenant | undefined;
  getActiveCount: () => number;
  getTrialCount: () => number;
}

const DEFAULT_FILTER: TenantFilterState = {
  search: "",
  tier: null,
  status: null,
  cursor: null,
  limit: 25,
};

export const useTenantStore = create<TenantState>((set, get) => ({
  // Initial data
  tenants: [],
  selectedTenant: null,
  totalCount: 0,
  nextCursor: null,
  impersonationSession: null,

  // Initial filter
  filter: { ...DEFAULT_FILTER },

  // Initial UI state
  isLoadingList: false,
  isLoadingDetail: false,
  isImpersonating: false,
  listError: null,
  detailError: null,

  // Actions
  setTenants: (tenants, totalCount, nextCursor) =>
    set({ tenants, totalCount, nextCursor }),

  appendTenants: (newTenants, nextCursor) =>
    set((state) => ({
      tenants: [...state.tenants, ...newTenants],
      nextCursor,
    })),

  setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),

  setFilter: (partial) =>
    set((state) => ({ filter: { ...state.filter, ...partial, cursor: null } })),

  resetFilter: () => set({ filter: { ...DEFAULT_FILTER } }),

  setLoadingList: (loading) => set({ isLoadingList: loading }),
  setLoadingDetail: (loading) => set({ isLoadingDetail: loading }),
  setImpersonating: (loading) => set({ isImpersonating: loading }),
  setListError: (error) => set({ listError: error }),
  setDetailError: (error) => set({ detailError: error }),
  setImpersonationSession: (session) => set({ impersonationSession: session }),

  updateTenantInList: (updated) =>
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.tenantId === updated.tenantId ? updated : t
      ),
    })),

  // Derived
  getFilteredTenants: () => {
    const { tenants, filter } = get();
    return tenants.filter((t) => {
      if (filter.tier && t.tier !== filter.tier) return false;
      if (filter.status && t.status !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.ownerEmail.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },

  getTenantById: (id) => get().tenants.find((t) => t.tenantId === id),

  getActiveCount: () =>
    get().tenants.filter((t) => t.status === "active").length,

  getTrialCount: () =>
    get().tenants.filter((t) => t.status === "trial").length,
}));
