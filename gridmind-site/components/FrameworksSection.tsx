"use client";

import { motion } from "framer-motion";
import { frameworks } from "@/data/frameworks";

export default function FrameworksSection() {
  return (
    <section
      id="frameworks"
      className="border-t border-white/5 bg-slate-950 py-24 sm:py-32"
      aria-labelledby="frameworks-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-sm text-emerald">Frameworks</span>
          <h2
            id="frameworks-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Built for the Frameworks You Build With
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Native support for NullClaw, with connectors for every major agent
            framework
          </p>
        </div>

        <motion.div
          className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          {frameworks.map((framework, index) => {
            const isAvailable = framework.status === "available";
            const isEnterprise = framework.status === "enterprise";
            const isPrimary = framework.name === "NullClaw";

            return (
              <motion.div
                key={framework.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`relative rounded-xl border p-6 transition-colors ${
                  isPrimary
                    ? "border-emerald/30 bg-emerald-500/5 hover:border-emerald/50"
                    : isEnterprise
                      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                      : "border-white/10 bg-slate-900/50 hover:border-white/20"
                }`}
              >
                {isAvailable && (
                  <span className="absolute -top-3 right-4 rounded-full bg-emerald px-3 py-0.5 text-xs font-semibold text-white">
                    Available Now
                  </span>
                )}
                {isEnterprise && (
                  <span className="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-white">
                    Enterprise
                  </span>
                )}
                {!isAvailable && !isEnterprise && (
                  <span className="absolute -top-3 right-4 rounded-full bg-slate-700 px-3 py-0.5 text-xs font-medium text-slate-300">
                    Coming Soon
                  </span>
                )}

                <span className="text-3xl" role="img" aria-label={framework.name}>
                  {framework.icon}
                </span>
                <h3 className="mt-3 font-heading text-lg font-bold text-white">
                  {framework.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {framework.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
