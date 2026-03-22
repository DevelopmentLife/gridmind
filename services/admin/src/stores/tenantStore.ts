// =============================================================================
// GridMind Admin — Tenant Store
// =============================================================================

import { create } from "zustand";

import type { FilterState, Tenant, TenantStatus, TenantTier } from "@/types";

interface TenantState {
  tenants: Tenant[];
  selectedTenantId: string | null;
  isLoading: boolean;
  error: string | null;
  filter: FilterState & { tier?: TenantTier };
  totalCount: number;
  currentPage: number;
  pageSize: number;

  // Actions
  setTenants: (tenants: Tenant[], total?: number) => void;
  selectTenant: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<FilterState & { tier?: TenantTier }>) => void;
  setPage: (page: number) => void;
  updateTenantStatus: (tenantId: string, status: TenantStatus) => void;

  // Derived
  getTenantById: (id: string) => Tenant | undefined;
  getFilteredTenants: () => Tenant[];
  getActiveTenantCount: () => number;
  getTenantsByTier: (tier: TenantTier) => Tenant[];
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  selectedTenantId: null,
  isLoading: false,
  error: null,
  filter: { search: "" },
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,

  setTenants: (tenants, total) =>
    set({ tenants, totalCount: total ?? tenants.length }),

  selectTenant: (id) => set({ selectedTenantId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
      currentPage: 1, // reset to page 1 on filter change
    })),
  setPage: (currentPage) => set({ currentPage }),

  updateTenantStatus: (tenantId, status) =>
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.tenantId === tenantId ? { ...t, status } : t
      ),
    })),

  getTenantById: (id) =>
    get().tenants.find((t) => t.tenantId === id),

  getFilteredTenants: () => {
    const { tenants, filter } = get();
    return tenants.filter((tenant) => {
      const matchesSearch =
        !filter.search ||
        tenant.orgName.toLowerCase().includes(filter.search.toLowerCase()) ||
        tenant.email.toLowerCase().includes(filter.search.toLowerCase());

      const matchesStatus =
        !filter.status || tenant.status === filter.status;

      const matchesTier =
        !filter.tier || tenant.tier === filter.tier;

      return matchesSearch && matchesStatus && matchesTier;
    });
  },

  getActiveTenantCount: () =>
    get().tenants.filter((t) => t.status === "active").length,

  getTenantsByTier: (tier) =>
    get().tenants.filter((t) => t.tier === tier),
}));
