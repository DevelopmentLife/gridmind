"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { pricingPlans } from "@/data/pricing";

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://gridmind-user.vercel.app";

function resolveHref(href: string): string {
  if (href.startsWith("/")) return `${APP_URL}${href}`;
  return href;
}

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      className="border-t border-white/5 bg-slate-950 py-24 sm:py-32"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-sm text-amber">Pricing</span>
          <h2
            id="pricing-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Start with a 14-day free trial. No credit card required.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!annual ? "text-white" : "text-slate-500"}`}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual billing"
              onClick={() => setAnnual(!annual)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                annual ? "bg-primary" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                  annual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm ${annual ? "text-white" : "text-slate-500"}`}
            >
              Annual{" "}
              <span className="text-emerald">(Save ~17%)</span>
            </span>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-4">
          {pricingPlans.map((plan, index) => {
            const isEnterprise = plan.monthlyPrice === null;
            const displayPrice = annual ? plan.annualPrice : plan.monthlyPrice;
            const pricePeriod = annual ? "/yr" : "/mo";

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative flex flex-col rounded-xl border p-8 ${
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

                <h3 className="font-heading text-xl font-bold text-white">
                  {plan.name}
                </h3>

                <div className="mt-4">
                  {isEnterprise ? (
                    <p className="font-heading text-4xl font-bold text-white">
                      Custom
                    </p>
                  ) : (
                    <p className="flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-bold text-white">
                        ${displayPrice?.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-500">{pricePeriod}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded bg-slate-800 px-2 py-1">
                    {plan.deployments} deploys
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-1">
                    {plan.agents} agents
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-1">
                    {plan.teamMembers} members
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3" role="list">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
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
                      {feature}
                    </li>
                  ))}
                </ul>

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
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
