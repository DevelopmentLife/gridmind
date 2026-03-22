// =============================================================================
// GridMind Admin — Billing Overview Page
// =============================================================================

"use client";

import { useEffect } from "react";

import { MetricsChart } from "@/components/MetricsChart";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/formatters";
import {
  MOCK_BILLING_OVERVIEW,
  MOCK_SUBSCRIPTIONS,
} from "@/lib/mock-data";
import { useUiStore } from "@/stores/uiStore";

const MRR_DATA = [
  { label: "Oct", value: 52000 },
  { label: "Nov", value: 59000 },
  { label: "Dec", value: 66400 },
  { label: "Jan", value: 71200 },
  { label: "Feb", value: 77800 },
  { label: "Mar", value: 87420 },
];

const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  active: "text-brand-green",
  trialing: "text-brand-cyan",
  past_due: "text-brand-amber",
  canceled: "text-brand-text-muted",
  unpaid: "text-brand-red",
};

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: { value: number; label: string };
}

function StatCard({ label, value, subtext, trend }: StatCardProps) {
  return (
    <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
      <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
        {label}
      </p>
      <p className="text-3xl font-mono font-bold text-brand-text-primary">{value}</p>
      {trend && (
        <p
          className={`text-sm font-mono mt-1 ${
            trend.value >= 0 ? "text-brand-green" : "text-brand-red"
          }`}
        >
          {trend.value >= 0 ? "↑" : "↓"} {formatPercent(Math.abs(trend.value))} {trend.label}
        </p>
      )}
      {subtext && <p className="text-xs text-brand-text-muted mt-1">{subtext}</p>}
    </div>
  );
}

export default function BillingPage() {
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "Billing" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const overview = MOCK_BILLING_OVERVIEW;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">
          Billing Overview
        </h1>
        <p className="text-brand-text-secondary text-sm mt-1">
          Revenue metrics and subscription management
        </p>
      </div>

      {/* Key metrics */}
      <section aria-label="Revenue metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={formatCurrency(overview.mrrUsd)}
          trend={{ value: overview.mrrGrowthPercent, label: "MoM" }}
        />
        <StatCard
          label="ARR"
          value={formatCurrency(overview.arrUsd)}
          subtext="Annualized run rate"
        />
        <StatCard
          label="Gross Margin"
          value={formatPercent(overview.grossMarginPercent)}
          subtext="After infrastructure costs"
        />
        <StatCard
          label="Churn Rate"
          value={formatPercent(overview.churnRatePercent)}
          subtext="Monthly revenue churn"
        />
      </section>

      {/* MRR chart */}
      <section className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-brand-text-primary">
              MRR Growth
            </h2>
            <p className="text-xs text-brand-text-muted mt-0.5">
              Last 6 months
            </p>
          </div>
          <span className="font-mono text-brand-green text-sm bg-brand-green/10 border border-brand-green/20 rounded px-2 py-1">
            ↑ {formatPercent(overview.mrrGrowthPercent)} MoM
          </span>
        </div>
        <MetricsChart
          data={MRR_DATA}
          height={100}
          color="#2563EB"
          fillColor="#2563EB"
          label="MRR growth over 6 months"
          formatValue={(v) => formatCurrency(v, { compact: true })}
          showGrid
          showDots
        />
        <div className="flex justify-between mt-2">
          {MRR_DATA.map((d) => (
            <span key={d.label} className="text-2xs text-brand-text-muted font-mono">
              {d.label}
            </span>
          ))}
        </div>
      </section>

      {/* Tenant + revenue summary */}
      <section
        aria-label="Tenant revenue summary"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
            Total Tenants
          </p>
          <p className="text-2xl font-mono font-bold text-brand-text-primary">
            {overview.totalTenants}
          </p>
          <p className="text-sm text-brand-text-secondary mt-1">
            {overview.activeTenants} active
          </p>
        </div>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
            ARPU
          </p>
          <p className="text-2xl font-mono font-bold text-brand-text-primary">
            {formatCurrency(overview.avgRevenuePerTenant)}
          </p>
          <p className="text-sm text-brand-text-secondary mt-1">
            per active tenant / month
          </p>
        </div>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
            Net Revenue Retention
          </p>
          <p className="text-2xl font-mono font-bold text-brand-green">
            {formatPercent(100 + overview.mrrGrowthPercent - overview.churnRatePercent)}
          </p>
          <p className="text-sm text-brand-text-secondary mt-1">
            expansion minus churn
          </p>
        </div>
      </section>

      {/* Subscriptions table */}
      <section aria-label="Active subscriptions">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Subscriptions
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg overflow-hidden">
          <table className="w-full text-left" aria-label="Stripe subscriptions">
            <thead>
              <tr className="border-b border-brand-border-subtle">
                {["Tenant", "Plan", "Status", "Amount", "Period", "Renews"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_SUBSCRIPTIONS.map((sub) => (
                <tr
                  key={sub.subscriptionId}
                  className="border-b border-brand-border-subtle hover:bg-brand-slate/40 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-brand-text-primary">
                      {sub.tenantName}
                    </p>
                    <p className="text-xs text-brand-text-muted font-mono">
                      {sub.subscriptionId}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-brand-text-secondary">{sub.planName}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={sub.status} size="sm" />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm text-brand-text-primary">
                      {formatCurrency(sub.amountUsd)}
                      <span className="text-brand-text-muted text-xs">
                        /{sub.interval}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-brand-text-muted">
                      {formatDate(sub.currentPeriodStart)} —{" "}
                      {formatDate(sub.currentPeriodEnd)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-xs font-mono ${
                        sub.cancelAtPeriodEnd
                          ? "text-brand-red"
                          : "text-brand-text-secondary"
                      }`}
                    >
                      {sub.cancelAtPeriodEnd
                        ? "Cancels"
                        : "Renews"}{" "}
                      {formatDate(sub.currentPeriodEnd)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
