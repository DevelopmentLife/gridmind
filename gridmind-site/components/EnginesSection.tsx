"use client";

import { motion } from "framer-motion";
import { engines } from "@/data/engines";

export default function EnginesSection() {
  return (
    <section
      id="engines"
      className="border-t border-white/5 bg-slate-950 py-24 sm:py-32"
      aria-labelledby="engines-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-sm text-emerald">Database Engines</span>
          <h2
            id="engines-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Built for the Engines You Use
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Starting with PostgreSQL, with support for 6 more engines on the
            roadmap.
          </p>
        </div>

        <motion.div
          className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {engines.map((engine, index) => {
            const isAvailable = engine.status === "available";

            return (
              <motion.div
                key={engine.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`relative rounded-xl border p-6 transition-colors ${
                  isAvailable
                    ? "border-emerald/30 bg-emerald-500/5 hover:border-emerald/50"
                    : "border-white/10 bg-slate-900/50 hover:border-white/20"
                }`}
              >
                {isAvailable && (
                  <span className="absolute -top-3 right-4 rounded-full bg-emerald px-3 py-0.5 text-xs font-semibold text-white">
                    Available Now
                  </span>
                )}
                {!isAvailable && (
                  <span className="absolute -top-3 right-4 rounded-full bg-slate-700 px-3 py-0.5 text-xs font-medium text-slate-300">
                    Coming Soon
                  </span>
                )}

                <span className="text-3xl" role="img" aria-label={engine.name}>
                  {engine.icon}
                </span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white">
                  {engine.name}
                </h3>

                <ul className="mt-4 space-y-2" role="list">
                  {engine.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-slate-400"
                    >
                      <svg
                        className={`h-4 w-4 shrink-0 ${isAvailable ? "text-emerald" : "text-slate-600"}`}
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
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
