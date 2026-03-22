"use client";

import { useAuthStore } from "@/stores/authStore";
import { PlanBadge } from "@/components/PlanBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";
import type { BillingInfo } from "@/types";

const MOCK_BILLING: BillingInfo = {
  plan: "growth",
  status: "active",
  currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  usage: [
    { metric: "Deployments", used: 4, limit: 10, unit: "" },
    { metric: "AI Agent decisions", used: 128432, limit: 500000, unit: "" },
    { metric: "Data monitored", used: 2.3, limit: 10, unit: "TB" },
    { metric: "Team members", used: 3, limit: 10, unit: "" },
  ],
  invoices: [
    { invoiceId: "inv-003", amount: 19900, currency: "USD", status: "paid", periodStart: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), periodEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), pdfUrl: "#", createdAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString() },
    { invoiceId: "inv-002", amount: 19900, currency: "USD", status: "paid", periodStart: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), periodEnd: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), pdfUrl: "#", createdAt: new Date(Date.now() - 74 * 24 * 60 * 60 * 1000).toISOString() },
    { invoiceId: "inv-001", amount: 19900, currency: "USD", status: "paid", periodStart: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000).toISOString(), periodEnd: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), pdfUrl: "#", createdAt: new Date(Date.now() - 104 * 24 * 60 * 60 * 1000).toISOString() },
  ],
};

const PLAN_PRICES: Record<string, string> = {
  starter: "$49/mo",
  growth: "$199/mo",
  scale: "$599/mo",
  enterprise: "Custom",
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["3 deployments", "6 agents", "7-day retention", "Community support"],
  growth: ["10 deployments", "12 agents", "30-day retention", "Email support"],
  scale: ["Unlimited deployments", "24 agents", "90-day retention", "Priority support"],
  enterprise: ["Unlimited everything", "Custom agents", "1-year retention", "Dedicated CSM"],
};

export default function BillingPage() {
  const { org } = useAuthStore();
  const billing = MOCK_BILLING;
  const plan = org?.plan ?? billing.plan;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-brand-text-primary text-2xl font-bold">Billing</h1>
        <p className="text-brand-text-muted text-sm mt-1">Manage your plan and usage</p>
      </div>

      {/* Current plan */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <PlanBadge plan={plan} size="lg" />
              <span className="text-brand-text-primary font-bold text-xl">{PLAN_PRICES[plan]}</span>
            </div>
            <p className="text-brand-text-muted text-sm">
              Current period: {formatDate(billing.currentPeriodStart)} – {formatDate(billing.currentPeriodEnd)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${billing.status === "active" ? "bg-brand-green/10 text-brand-green" : "bg-brand-amber/10 text-brand-amber"}`}
            >
              {billing.status}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLAN_FEATURES[plan]?.map((feature) => (
            <div key={feature} className="flex items-center gap-1.5 text-brand-text-secondary text-xs">
              <span className="text-brand-green" aria-hidden="true">✓</span>
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Usage */}
      <div className="card mb-6">
        <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Usage this period</h2>
        <div className="space-y-4">
          {billing.usage.map((item) => {
            const pct = (item.used / item.limit) * 100;
            return (
              <div key={item.metric}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-brand-text-secondary text-sm">{item.metric}</span>
                  <span className="text-brand-text-muted text-xs font-mono">
                    {typeof item.used === "number" && item.used < 10 ? item.used.toFixed(1) : item.used.toLocaleString()}
                    {item.unit && ` ${item.unit}`}
                    {" / "}
                    {item.limit.toLocaleString()}
                    {item.unit && ` ${item.unit}`}
                    {" "}
                    <span className={pct > 80 ? "text-brand-amber" : "text-brand-text-muted"}>
                      ({formatPercent(pct, 0)})
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-brand-slate rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 90 ? "bg-brand-red" : pct > 75 ? "bg-brand-amber" : "bg-brand-electric"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.metric} ${Math.round(pct)}% used`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade CTA */}
      {plan !== "enterprise" && (
        <div className="card border-brand-electric/20 mb-6">
          <h2 className="text-brand-text-primary font-semibold text-sm mb-2">Upgrade your plan</h2>
          <p className="text-brand-text-muted text-sm mb-4">
            Get more deployments, agents, and extended data retention.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["growth", "scale", "enterprise"] as const)
              .filter((p) => p !== plan)
              .map((p) => (
                <div key={p} className="border border-brand-border-default rounded-lg p-4 hover:border-brand-electric/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <PlanBadge plan={p} />
                    <span className="text-brand-text-secondary text-sm font-bold">{PLAN_PRICES[p]}</span>
                  </div>
                  <ul className="space-y-1 mb-3">
                    {PLAN_FEATURES[p]?.slice(0, 2).map((f) => (
                      <li key={f} className="text-brand-text-muted text-xs">{f}</li>
                    ))}
                  </ul>
                  <button type="button" className="btn-primary w-full text-xs py-1.5">
                    Upgrade
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="card">
        <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Invoice history</h2>
        {billing.invoices.length === 0 ? (
          <p className="text-brand-text-muted text-sm">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {billing.invoices.map((inv) => (
              <div
                key={inv.invoiceId}
                className="flex items-center justify-between py-2.5 border-b border-brand-border-subtle last:border-0"
              >
                <div>
                  <p className="text-brand-text-secondary text-sm">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-brand-text-primary font-medium text-sm font-mono">
                    {formatCurrency(inv.amount, inv.currency)}
                  </span>
                  <span
                    className={`text-xs font-medium ${inv.status === "paid" ? "text-brand-green" : "text-brand-amber"}`}
                  >
                    {inv.status}
                  </span>
                  {inv.pdfUrl && (
                    <a
                      href={inv.pdfUrl}
                      className="text-brand-electric text-xs hover:underline focus:outline-none focus:underline"
                      aria-label={`Download invoice for ${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`}
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
