"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { TenantTableRow } from "@/components/TenantTableRow";
import { ImpersonateModal } from "@/components/ImpersonateModal";
import type { Tenant, TenantStatus, TenantTier } from "@/types";
import { tenantTierLabel } from "@/lib/formatters";
import clsx from "clsx";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TENANTS: Tenant[] = [
  { tenantId: "t-001", name: "Acme Corporation", slug: "acme-corp", tier: "enterprise", status: "active", mrr: 1_200_000, arr: 14_400_000, deploymentCount: 12, agentCount: 288, ownerEmail: "cto@acme.com", ownerName: "Jane Smith", createdAt: "2024-01-15T10:00:00Z", trialEndsAt: null, stripeCustomerId: "cus_acme", region: "us-east-1", activeIncidents: 1 },
  { tenantId: "t-002", name: "TechStart Ltd", slug: "techstart", tier: "professional", status: "active", mrr: 149_00, arr: 178_800, deploymentCount: 3, agentCount: 72, ownerEmail: "founder@techstart.io", ownerName: "Bob Johnson", createdAt: "2024-03-22T08:30:00Z", trialEndsAt: null, stripeCustomerId: "cus_techstart", region: "eu-west-1", activeIncidents: 1 },
  { tenantId: "t-003", name: "DataFlow Analytics", slug: "dataflow", tier: "enterprise", status: "active", mrr: 890_00, arr: 1_068_000, deploymentCount: 8, agentCount: 192, ownerEmail: "admin@dataflow.ai", ownerName: "Sarah Chen", createdAt: "2023-11-08T14:20:00Z", trialEndsAt: null, stripeCustomerId: "cus_dataflow", region: "us-west-2", activeIncidents: 0 },
  { tenantId: "t-004", name: "Startup Alpha", slug: "startup-alpha", tier: "starter", status: "trial", mrr: 0, arr: 0, deploymentCount: 1, agentCount: 24, ownerEmail: "ceo@startup-alpha.com", ownerName: "Mike Davis", createdAt: "2025-03-01T09:00:00Z", trialEndsAt: "2025-03-31T09:00:00Z", stripeCustomerId: null, region: "us-east-1", activeIncidents: 0 },
  { tenantId: "t-005", name: "CloudNine Systems", slug: "cloudnine", tier: "professional", status: "suspended", mrr: 149_00, arr: 178_800, deploymentCount: 2, agentCount: 48, ownerEmail: "billing@cloudnine.io", ownerName: "Lisa Wang", createdAt: "2024-06-10T11:45:00Z", trialEndsAt: null, stripeCustomerId: "cus_cloudnine", region: "ap-southeast-1", activeIncidents: 0 },
  { tenantId: "t-006", name: "MegaCorp International", slug: "megacorp", tier: "custom", status: "active", mrr: 5_000_000, arr: 60_000_000, deploymentCount: 45, agentCount: 1080, ownerEmail: "it@megacorp.com", ownerName: "Robert Brown", createdAt: "2023-08-01T00:00:00Z", trialEndsAt: null, stripeCustomerId: "cus_megacorp", region: "us-east-1", activeIncidents: 0 },
];

const TIER_OPTIONS: Array<{ value: TenantTier | ""; label: string }> = [
  { value: "", label: "All tiers" },
  { value: "starter", label: tenantTierLabel("starter") },
  { value: "professional", label: tenantTierLabel("professional") },
  { value: "enterprise", label: tenantTierLabel("enterprise") },
  { value: "custom", label: tenantTierLabel("custom") },
];

const STATUS_OPTIONS: Array<{ value: TenantStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
  { value: "churned", label: "Churned" },
  { value: "onboarding", label: "Onboarding" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TenantTier | "">("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "">("");
  const [impersonatingTenant, setImpersonatingTenant] =
    useState<Tenant | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const filteredTenants = MOCK_TENANTS.filter((t) => {
    if (tierFilter && t.tier !== tierFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleImpersonate = (
    _tenantId: string,
    _reason: string,
    _totpCode: string
  ) => {
    setIsImpersonating(true);
    // In production: call tenantsApi.impersonate({ tenantId, reason, totpCode })
    setTimeout(() => {
      setIsImpersonating(false);
      setImpersonatingTenant(null);
    }, 1500);
  };

  return (
    <>
      <TopBar
        title="Tenants"
        subtitle={`${MOCK_TENANTS.length.toLocaleString()} total tenants`}
        actions={
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-green text-xs font-medium">
              {MOCK_TENANTS.filter((t) => t.status === "active").length} active
            </span>
            <span className="text-brand-text-muted">·</span>
            <span className="text-brand-ocean text-xs font-medium">
              {MOCK_TENANTS.filter((t) => t.status === "trial").length} trial
            </span>
          </div>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted w-3.5 h-3.5"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={clsx(
                "w-full bg-brand-navy border border-brand-border-default rounded-lg",
                "pl-9 pr-3 py-2 text-sm text-brand-text-primary placeholder:text-brand-text-muted",
                "focus:outline-none focus:ring-2 focus:ring-brand-amber/40 focus:border-brand-amber/60",
                "transition-colors"
              )}
              aria-label="Search tenants by name, email, or slug"
            />
          </div>

          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as TenantTier | "")}
            className={clsx(
              "bg-brand-navy border border-brand-border-default rounded-lg",
              "px-3 py-2 text-sm text-brand-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-amber/40",
              "transition-colors"
            )}
            aria-label="Filter by tier"
          >
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TenantStatus | "")}
            className={clsx(
              "bg-brand-navy border border-brand-border-default rounded-lg",
              "px-3 py-2 text-sm text-brand-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-amber/40",
              "transition-colors"
            )}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Result count */}
          <span className="text-brand-text-muted text-xs ml-auto">
            {filteredTenants.length} result{filteredTenants.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
          <table className="data-table" aria-label="Tenants list">
            <thead>
              <tr>
                <th scope="col" className="pl-4">Tenant</th>
                <th scope="col">Tier</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">MRR</th>
                <th scope="col" className="text-right">Deployments</th>
                <th scope="col">Region</th>
                <th scope="col">Created</th>
                <th scope="col" className="text-center">Incidents</th>
                <th scope="col" className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-brand-text-muted text-sm"
                  >
                    No tenants match your filters.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <TenantTableRow
                    key={tenant.tenantId}
                    tenant={tenant}
                    onSelect={(id) => router.push(`/tenants/${id}`)}
                    onImpersonate={(t) => setImpersonatingTenant(t)}
                    data-testid={`tenant-row-${tenant.tenantId}`}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Impersonate modal */}
      <ImpersonateModal
        tenant={impersonatingTenant}
        isOpen={impersonatingTenant !== null}
        isLoading={isImpersonating}
        onConfirm={handleImpersonate}
        onClose={() => setImpersonatingTenant(null)}
      />
    </>
  );
}
