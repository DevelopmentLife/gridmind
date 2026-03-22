// =============================================================================
// GridMind Admin — Tenant Detail Page
// =============================================================================

"use client";

import { useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";

import { StatusBadge } from "@/components/StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatGb,
  formatRelativeTime,
} from "@/lib/formatters";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";
import { MOCK_DEPLOYMENTS } from "@/lib/mock-data";

const TIER_LABEL: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;

  const tenant = useTenantStore((s) => s.getTenantById(tenantId));
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    if (tenant) {
      setBreadcrumbs([
        { label: "Tenants", href: "/tenants" },
        { label: tenant.orgName },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, tenant]);

  if (!tenant) {
    notFound();
  }

  const tenantDeployments = MOCK_DEPLOYMENTS.filter(
    (d) => d.tenantId === tenantId
  );

  const storagePercent = Math.min(
    100,
    Math.round((tenant.storageGb / tenant.storageGbLimit) * 100)
  );

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="bg-brand-navy border border-brand-border-default rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-text-primary">
              {tenant.orgName}
            </h1>
            <p className="text-brand-text-secondary text-sm mt-0.5">
              {tenant.email}
            </p>
            <p className="text-brand-text-muted text-xs font-mono mt-1">
              {tenant.tenantId}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={tenant.status} />
            <span className="text-sm font-semibold text-brand-amber">
              {TIER_LABEL[tenant.tier] ?? tenant.tier}
            </span>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 pt-6 border-t border-brand-border-subtle">
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              MRR
            </p>
            <p className="font-mono font-bold text-xl text-brand-text-primary">
              {tenant.mrr > 0 ? formatCurrency(tenant.mrr) : "Trial"}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Deployments
            </p>
            <p className="font-mono font-bold text-xl text-brand-text-primary">
              {tenant.deploymentCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Active Agents
            </p>
            <p className="font-mono font-bold text-xl text-brand-text-primary">
              {tenant.activeAgentCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Storage Used
            </p>
            <p className="font-mono font-bold text-xl text-brand-text-primary">
              {formatGb(tenant.storageGb)}
            </p>
            <div
              role="progressbar"
              aria-valuenow={storagePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Storage: ${storagePercent}% of ${formatGb(tenant.storageGbLimit)}`}
              className="h-1 bg-brand-border-default rounded-full mt-2 overflow-hidden"
            >
              <div
                className={`h-full rounded-full ${
                  storagePercent >= 90
                    ? "bg-brand-red"
                    : storagePercent >= 75
                      ? "bg-brand-amber"
                      : "bg-brand-electric"
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-2xs text-brand-text-muted font-mono mt-1">
              of {formatGb(tenant.storageGbLimit)}
            </p>
          </div>
        </div>
      </div>

      {/* Deployments */}
      <section aria-label="Tenant deployments">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider">
            Deployments ({tenantDeployments.length})
          </h2>
          <Link
            href={`/deployments?tenantId=${tenantId}`}
            className="text-xs text-brand-electric hover:text-brand-ocean transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg divide-y divide-brand-border-subtle">
          {tenantDeployments.length === 0 ? (
            <p className="px-5 py-8 text-center text-brand-text-muted font-mono text-sm">
              No deployments found.
            </p>
          ) : (
            tenantDeployments.map((dep) => (
              <div key={dep.deploymentId} className="px-5 py-4 flex items-center gap-4">
                <StatusBadge status={dep.status} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text-primary">
                    {dep.name}
                  </p>
                  <p className="text-xs text-brand-text-muted font-mono">
                    {dep.engine} · {dep.instanceType} · {dep.region}
                  </p>
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="font-mono text-xs text-brand-text-muted">QPS</p>
                    <p className="font-mono text-sm text-brand-text-primary">
                      {dep.qps.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-brand-text-muted">P95</p>
                    <p className="font-mono text-sm text-brand-text-primary">
                      {dep.p95LatencyMs}ms
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-brand-text-muted">CPU</p>
                    <p
                      className={`font-mono text-sm ${
                        dep.cpuPercent >= 80 ? "text-brand-red" : "text-brand-text-primary"
                      }`}
                    >
                      {dep.cpuPercent}%
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Account details */}
      <section aria-label="Account information">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Account Information
        </h2>
        <dl className="bg-brand-navy border border-brand-border-default rounded-lg divide-y divide-brand-border-subtle">
          {[
            { label: "Tenant ID", value: tenant.tenantId },
            { label: "Stripe Customer", value: tenant.stripeCustomerId ?? "—" },
            {
              label: "Subscription",
              value: tenant.stripeSubscriptionId ?? "—",
            },
            { label: "Created", value: formatDate(tenant.createdAt) },
            {
              label: "Last Updated",
              value: formatRelativeTime(tenant.updatedAt),
            },
            ...(tenant.trialEndsAt
              ? [{ label: "Trial Ends", value: formatDate(tenant.trialEndsAt) }]
              : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center px-5 py-3">
              <dt className="text-xs text-brand-text-muted uppercase tracking-wider font-mono w-36 flex-shrink-0">
                {label}
              </dt>
              <dd className="font-mono text-sm text-brand-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Actions */}
      <section aria-label="Tenant actions">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {tenant.status === "active" ? (
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium bg-brand-red/10 text-brand-red border border-brand-red/30 rounded-md hover:bg-brand-red/20 transition-colors"
            >
              Suspend Tenant
            </button>
          ) : tenant.status === "suspended" ? (
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium bg-brand-green/10 text-brand-green border border-brand-green/30 rounded-md hover:bg-brand-green/20 transition-colors"
            >
              Unsuspend Tenant
            </button>
          ) : null}
          <Link
            href={`/billing?tenantId=${tenantId}`}
            className="px-4 py-2 text-sm font-medium bg-brand-slate text-brand-text-secondary border border-brand-border-default rounded-md hover:text-brand-text-primary hover:bg-brand-slate-light transition-colors"
          >
            View Billing
          </Link>
          <Link
            href={`/incidents?tenantId=${tenantId}`}
            className="px-4 py-2 text-sm font-medium bg-brand-slate text-brand-text-secondary border border-brand-border-default rounded-md hover:text-brand-text-primary hover:bg-brand-slate-light transition-colors"
          >
            View Incidents
          </Link>
        </div>
      </section>
    </div>
  );
}
