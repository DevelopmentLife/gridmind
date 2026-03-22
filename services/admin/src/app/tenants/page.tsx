// =============================================================================
// GridMind Admin — Tenant List Page
// =============================================================================

"use client";

import { useEffect } from "react";

import { TenantRow } from "@/components/TenantRow";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past Due" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
];

const TIER_OPTIONS = [
  { value: "", label: "All Tiers" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

export default function TenantsPage() {
  const {
    tenants,
    filter,
    setFilter,
    getFilteredTenants,
    selectedTenantId,
    selectTenant,
  } = useTenantStore();

  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "Tenants" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const filtered = getFilteredTenants();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-primary">Tenants</h1>
          <p className="text-brand-text-secondary text-sm mt-1">
            {tenants.length} total tenants
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="search" aria-label="Filter tenants">
        <input
          type="search"
          placeholder="Search tenants..."
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          aria-label="Search tenants by name or email"
          className="bg-brand-navy border border-brand-border-default rounded-md px-4 py-2 text-sm text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-electric min-w-[200px]"
        />
        <select
          value={filter.status ?? ""}
          onChange={(e) => setFilter({ status: e.target.value || undefined })}
          aria-label="Filter by status"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filter.tier ?? ""}
          onChange={(e) =>
            setFilter({
              tier: (e.target.value || undefined) as typeof filter.tier,
            })
          }
          aria-label="Filter by tier"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {TIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(filter.search || filter.status || filter.tier) && (
          <button
            type="button"
            onClick={() =>
              setFilter({ search: "", status: undefined, tier: undefined })
            }
            className="text-sm text-brand-text-secondary hover:text-brand-text-primary transition-colors px-3 py-2"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-brand-text-muted self-center font-mono">
          {filtered.length} tenant{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-brand-navy border border-brand-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full text-left"
            aria-label="Tenant list"
          >
            <thead>
              <tr className="border-b border-brand-border-subtle">
                {[
                  "Organization",
                  "Status",
                  "Tier",
                  "MRR",
                  "Deployments",
                  "Storage",
                  "Created",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-brand-text-muted font-mono text-sm"
                  >
                    No tenants match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((tenant) => (
                  <TenantRow
                    key={tenant.tenantId}
                    tenant={tenant}
                    isSelected={selectedTenantId === tenant.tenantId}
                    onSelect={selectTenant}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
