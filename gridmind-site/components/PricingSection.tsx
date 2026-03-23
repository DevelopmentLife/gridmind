"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { pricingPlans, VENDOR_COLORS, PRICING_MODEL_NOTE } from "@/data/pricing";

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://app.gridmindai.dev";

function resolveHref(href: string): string {
  if (href.startsWith("/")) return `${APP_URL}${href}`;
  return href;
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

const MODEL_TIER_COLOR: Record<string, string> = {
  "Claude Haiku 4.5": "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  "Claude Sonnet 4.6": "text-primary bg-primary/10 border-primary/20",
  "Claude Opus 4.6": "text-violet-400 bg-violet-400/10 border-violet-400/20",
  "Claude Haiku / Sonnet / Opus 4.x": "text-slate-300 bg-white/5 border-white/10",
};

export default function PricingSection() {
  const [expandedPlan, setExpandedPlan] = useState<string | null>("Growth");

  return (
    <section
      id="pricing"
      className="border-t border-white/5 bg-slate-950 py-24 sm:py-32"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="font-mono text-sm text-amber">Pricing</span>
          <h2
            id="pricing-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Pay for what your agents actually do
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Pricing scales with your AI agent usage — the decisions they make, the models they run,
            and the infrastructure they manage. No flat platform fee. No surprises.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            14-day trial on every plan · Cancel anytime · Credit card required
          </p>
        </div>

        {/* Plan cards */}
        <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-4">
          {pricingPlans.map((plan, index) => {
            const isEnterprise = plan.cta === "Contact Sales";
            const isExpanded = expandedPlan === plan.name;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative flex flex-col rounded-xl border ${
                  plan.highlighted
                    ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-white/10 bg-slate-900/50"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}

                <div className="p-8 flex flex-col flex-1">
                  {/* Plan name + tagline */}
                  <div>
                    <h3 className="font-heading text-xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Pricing model note */}
                  <div className="mt-5">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {isEnterprise
                        ? "Priced to your deployment scale and contract terms."
                        : "Priced on the AI decisions your agents make and the infrastructure they manage."}
                    </p>
                  </div>

                  {/* Usage stats */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Deployments</span>
                      <span className="font-mono text-slate-300">{plan.deployments}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Query volume</span>
                      <span className="font-mono text-slate-300">{plan.queryVolume}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Team members</span>
                      <span className="font-mono text-slate-300">{plan.teamMembers}</span>
                    </div>
                  </div>

                  {/* Vendor badges */}
                  <div className="mt-5">
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-600 mb-2">
                      Cloud providers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.vendorSupport.map((v) => (
                        <span
                          key={v.name}
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${
                            VENDOR_COLORS[v.name] ?? "text-slate-400 bg-slate-800 border-white/10"
                          }`}
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Agent models used */}
                  <div className="mt-5">
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-600 mb-2">
                      AI models
                    </p>
                    <div className="space-y-1.5">
                      {plan.agentCosts.map((c) => (
                        <div key={c.model} className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono font-semibold whitespace-nowrap ${
                              MODEL_TIER_COLOR[c.model] ?? "text-slate-400 bg-slate-800 border-white/10"
                            }`}
                          >
                            {c.model}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expand / collapse details */}
                  <button
                    type="button"
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.name)}
                    className="mt-4 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <svg
                      className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {isExpanded ? "Hide" : "Show"} provider & agent details
                  </button>

                  {/* Expanded detail panels */}
                  {isExpanded && (
                    <div className="mt-3 space-y-4">
                      {/* Agent cost breakdown */}
                      <div>
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-600 mb-2">
                          Agent decisions included
                        </p>
                        <div className="space-y-2">
                          {plan.agentCosts.map((c) => (
                            <div
                              key={c.model}
                              className="rounded-lg border border-white/5 bg-slate-950/60 p-3"
                            >
                              <span
                                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-mono font-semibold ${
                                  MODEL_TIER_COLOR[c.model] ?? "text-slate-400 bg-slate-800 border-white/10"
                                }`}
                              >
                                {c.model}
                              </span>
                              <p className="mt-1.5 text-xs text-slate-400">{c.role}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{c.includedDecisions}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Provider details */}
                      <div>
                        <p className="text-xs font-mono uppercase tracking-wider text-slate-600 mb-2">
                          Infrastructure support
                        </p>
                        <div className="space-y-2">
                          {plan.vendorSupport.map((v) => (
                            <div
                              key={v.name}
                              className="rounded-lg border border-white/5 bg-slate-950/60 p-3"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-bold ${
                                    VENDOR_COLORS[v.name] ?? "text-slate-400 bg-slate-800 border-white/10"
                                  }`}
                                >
                                  {v.name}
                                </span>
                                <span className="text-xs text-slate-300 font-medium truncate">
                                  {v.tier}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Storage: <span className="text-slate-400">{v.storageRange}</span>
                                {" · "}{v.note}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature list */}
                  <ul className="mt-6 flex-1 space-y-2.5" role="list">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-400"
                      >
                        <CheckIcon />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <a
                    href={resolveHref(plan.ctaHref)}
                    className={`mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-primary text-white hover:bg-primary-600"
                        : "border border-white/20 text-white hover:bg-white/5"
                    }`}
                  >
                    {plan.cta}
                  </a>
                  {!isEnterprise && (
                    <p className="mt-3 text-center text-xs text-slate-600">
                      14-day trial · Credit card required
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pricing model callout */}
        <div className="mx-auto mt-12 max-w-4xl rounded-xl border border-white/10 bg-slate-900/50 p-6">
          <div className="flex gap-4">
            <svg
              className="h-5 w-5 shrink-0 text-slate-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-white mb-1">How pricing works</p>
              <p className="text-sm text-slate-400 leading-relaxed">{PRICING_MODEL_NOTE}</p>
            </div>
          </div>
        </div>

        {/* Provider comparison table */}
        <div className="mx-auto mt-16 max-w-5xl">
          <h3 className="text-center font-heading text-lg font-semibold text-white mb-2">
            Supported cloud providers by plan
          </h3>
          <p className="text-center text-sm text-slate-500 mb-8">
            GridMind connects directly to your cloud account via read/write API credentials — no data leaves your VPC.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium w-36">Provider</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-semibold">Starter</th>
                  <th className="text-center py-3 px-4 text-primary font-semibold">Growth</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-semibold">Scale</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "AWS",
                    services: [
                      "RDS (MySQL, Postgres, MariaDB)",
                      "Aurora Serverless v2",
                      "Aurora Global + Multi-Region",
                      "Any RDS / Aurora / Redshift",
                    ],
                  },
                  {
                    name: "Google Cloud",
                    services: [
                      null,
                      "Cloud SQL Enterprise",
                      "AlloyDB / Enterprise Plus",
                      "Spanner / BigQuery / AlloyDB",
                    ],
                  },
                  {
                    name: "Azure",
                    services: [
                      null,
                      null,
                      "Azure Database (Flexible Server)",
                      "Any Azure Database service",
                    ],
                  },
                  {
                    name: "DigitalOcean",
                    services: [
                      "Managed Databases (Basic)",
                      "Managed Databases (Standard)",
                      "Managed Databases (Premium)",
                      "Custom + Reserved capacity",
                    ],
                  },
                ].map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${
                          VENDOR_COLORS[row.name] ?? "text-slate-400 bg-slate-800 border-white/10"
                        }`}
                      >
                        {row.name}
                      </span>
                    </td>
                    {row.services.map((service, i) => (
                      <td key={i} className="py-4 px-4 text-center">
                        {service ? (
                          <span className="text-xs text-slate-400">{service}</span>
                        ) : (
                          <span className="text-slate-700 text-lg" aria-label="Not available">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
