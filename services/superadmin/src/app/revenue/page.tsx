import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { RevenueMetric } from "@/components/RevenueMetric";
import type { RevenueDataPoint, TierRevenue } from "@/types";
import { formatCurrency, formatPercent, tenantTierColor, tenantTierLabel } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Revenue",
};

const MOCK_REVENUE_HISTORY: RevenueDataPoint[] = [
  { month: "2024-04", mrr: 3_120_000, arr: 37_440_000, newMrr: 420_000, churnedMrr: 80_000, expansionMrr: 180_000 },
  { month: "2024-05", mrr: 3_640_000, arr: 43_680_000, newMrr: 580_000, churnedMrr: 60_000, expansionMrr: 220_000 },
  { month: "2024-06", mrr: 4_200_000, arr: 50_400_000, newMrr: 640_000, churnedMrr: 80_000, expansionMrr: 300_000 },
  { month: "2024-07", mrr: 4_820_000, arr: 57_840_000, newMrr: 700_000, churnedMrr: 80_000, expansionMrr: 350_000 },
  { month: "2024-08", mrr: 5_480_000, arr: 65_760_000, newMrr: 760_000, churnedMrr: 100_000, expansionMrr: 400_000 },
  { month: "2024-09", mrr: 6_200_000, arr: 74_400_000, newMrr: 820_000, churnedMrr: 100_000, expansionMrr: 480_000 },
  { month: "2024-10", mrr: 7_020_000, arr: 84_240_000, newMrr: 920_000, churnedMrr: 100_000, expansionMrr: 560_000 },
  { month: "2024-11", mrr: 7_900_000, arr: 94_800_000, newMrr: 980_000, churnedMrr: 100_000, expansionMrr: 640_000 },
  { month: "2024-12", mrr: 8_820_000, arr: 105_840_000, newMrr: 1_020_000, churnedMrr: 100_000, expansionMrr: 700_000 },
  { month: "2025-01", mrr: 9_800_000, arr: 117_600_000, newMrr: 1_080_000, churnedMrr: 100_000, expansionMrr: 780_000 },
  { month: "2025-02", mrr: 10_840_000, arr: 130_080_000, newMrr: 1_140_000, churnedMrr: 100_000, expansionMrr: 860_000 },
  { month: "2025-03", mrr: 11_960_000, arr: 143_520_000, newMrr: 1_220_000, churnedMrr: 100_000, expansionMrr: 940_000 },
];

const MOCK_TIER_BREAKDOWN: TierRevenue[] = [
  { tier: "enterprise", tenantCount: 48, mrr: 7_200_000, percentage: 60.2 },
  { tier: "custom", tenantCount: 4, mrr: 2_000_000, percentage: 16.7 },
  { tier: "professional", tenantCount: 284, mrr: 2_256_000, percentage: 18.9 },
  { tier: "starter", tenantCount: 911, mrr: 504_000, percentage: 4.2 },
];

const MOCK_TOP_CUSTOMERS = [
  { name: "MegaCorp International", tier: "custom" as const, mrr: 5_000_000, arr: 60_000_000, growth: 12.5 },
  { name: "Acme Corporation", tier: "enterprise" as const, mrr: 1_200_000, arr: 14_400_000, growth: 8.3 },
  { name: "DataFlow Analytics", tier: "enterprise" as const, mrr: 890_000, arr: 10_680_000, growth: 15.2 },
  { name: "CloudBase Systems", tier: "enterprise" as const, mrr: 750_000, arr: 9_000_000, growth: 5.1 },
  { name: "ScaleUp Labs", tier: "enterprise" as const, mrr: 620_000, arr: 7_440_000, growth: 22.8 },
];

const currentMonth = MOCK_REVENUE_HISTORY[MOCK_REVENUE_HISTORY.length - 1]!;
const prevMonth = MOCK_REVENUE_HISTORY[MOCK_REVENUE_HISTORY.length - 2]!;
const mrrGrowth = ((currentMonth.mrr - prevMonth.mrr) / prevMonth.mrr) * 100;

const maxMrr = Math.max(...MOCK_REVENUE_HISTORY.map((d) => d.mrr));

export default function RevenuePage() {
  return (
    <>
      <TopBar
        title="Revenue"
        subtitle="MRR, ARR, churn, and tier breakdown"
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RevenueMetric
            label="Current MRR"
            value={formatCurrency(currentMonth.mrr, { compact: true })}
            trend={mrrGrowth}
            trendLabel="MoM"
            data-testid="metric-current-mrr"
          />
          <RevenueMetric
            label="ARR (Annualized)"
            value={formatCurrency(currentMonth.arr, { compact: true })}
          />
          <RevenueMetric
            label="New MRR"
            value={formatCurrency(currentMonth.newMrr, { compact: true })}
            trend={7.4}
            trendLabel="vs last month"
          />
          <RevenueMetric
            label="Churned MRR"
            value={formatCurrency(currentMonth.churnedMrr, { compact: true })}
            trend={0}
            trendLabel="flat"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MRR Trend chart (visual bar chart) */}
          <section className="lg:col-span-2" aria-labelledby="mrr-chart-heading">
            <h2
              id="mrr-chart-heading"
              className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
            >
              MRR Growth (12 Months)
            </h2>
            <div
              className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
              role="img"
              aria-label="MRR bar chart showing 12-month growth"
            >
              <div className="flex items-end gap-2 h-40">
                {MOCK_REVENUE_HISTORY.map((point) => {
                  const heightPct = (point.mrr / maxMrr) * 100;
                  return (
                    <div
                      key={point.month}
                      className="flex-1 flex flex-col items-center justify-end gap-1 group"
                    >
                      <div
                        className="w-full rounded-t bg-brand-amber/70 group-hover:bg-brand-amber transition-colors relative"
                        style={{ height: `${heightPct}%` }}
                        title={`${point.month}: ${formatCurrency(point.mrr, { compact: true })}`}
                      />
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex gap-2 mt-2">
                {MOCK_REVENUE_HISTORY.map((point) => (
                  <div key={point.month} className="flex-1 text-center">
                    <span className="text-brand-text-muted text-2xs font-mono">
                      {point.month.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Tier breakdown */}
          <section aria-labelledby="tier-breakdown-heading">
            <h2
              id="tier-breakdown-heading"
              className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
            >
              Revenue by Tier
            </h2>
            <div className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5 space-y-4">
              {MOCK_TIER_BREAKDOWN.map((t) => (
                <div key={t.tier}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "text-xs font-medium",
                          tenantTierColor(t.tier),
                        ].join(" ")}
                      >
                        {tenantTierLabel(t.tier)}
                      </span>
                      <span className="text-brand-text-muted text-2xs">
                        {t.tenantCount} tenants
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-brand-text-primary text-xs font-mono font-medium">
                        {formatCurrency(t.mrr, { compact: true })}
                      </span>
                      <span className="text-brand-text-muted text-2xs ml-1.5">
                        {formatPercent(t.percentage)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-brand-slate rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-amber rounded-full transition-all"
                      style={{ width: `${t.percentage}%` }}
                      role="progressbar"
                      aria-valuenow={t.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${tenantTierLabel(t.tier)}: ${formatPercent(t.percentage)} of revenue`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Top customers */}
        <section aria-labelledby="top-customers-heading">
          <h2
            id="top-customers-heading"
            className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
          >
            Top Customers by MRR
          </h2>
          <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
            <table className="data-table" aria-label="Top customers by MRR">
              <thead>
                <tr>
                  <th scope="col" className="pl-4">Customer</th>
                  <th scope="col">Tier</th>
                  <th scope="col" className="text-right">MRR</th>
                  <th scope="col" className="text-right pr-4">ARR</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TOP_CUSTOMERS.map((customer, idx) => (
                  <tr
                    key={customer.name}
                    className="border-b border-brand-border-subtle last:border-0 hover:bg-brand-slate/30"
                  >
                    <td className="pl-4 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-brand-text-muted text-xs font-mono w-4">
                          {idx + 1}
                        </span>
                        <span className="text-brand-text-primary text-sm font-medium">
                          {customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={[
                          "text-xs font-medium capitalize",
                          tenantTierColor(customer.tier),
                        ].join(" ")}
                      >
                        {tenantTierLabel(customer.tier)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-brand-text-primary text-sm font-mono font-medium tabular-nums">
                        {formatCurrency(customer.mrr, { compact: true })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right pr-4">
                      <span className="text-brand-text-secondary text-sm font-mono tabular-nums">
                        {formatCurrency(customer.arr, { compact: true })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
