"use client";

import { motion } from "framer-motion";
import { agents } from "@/data/agents";
import { TIER_LABELS, TIER_COLORS } from "@/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function AgentShowcase() {
  return (
    <section
      id="agents"
      className="bg-slate-950 py-24 sm:py-32"
      aria-labelledby="agents-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-sm text-primary">Agent Swarm</span>
          <h2
            id="agents-heading"
            className="mt-2 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            12 Customer-Facing AI Agents
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Each agent is a specialized autonomous system that perceives,
            reasons, and acts on your agent infrastructure.
          </p>
        </div>

        <motion.div
          className="mx-auto mt-16 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {agents.map((agent) => {
            const tierColor = TIER_COLORS[agent.tier];
            const tierLabel = TIER_LABELS[agent.tier];

            return (
              <motion.article
                key={agent.name}
                variants={cardVariants}
                className="group relative rounded-xl border border-white/10 bg-slate-900/50 p-6 transition-colors hover:border-white/20 hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl" role="img" aria-label={agent.displayName}>
                    {agent.icon}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono text-xs font-medium"
                    style={{
                      color: tierColor,
                      backgroundColor: `${tierColor}15`,
                      border: `1px solid ${tierColor}30`,
                    }}
                  >
                    {tierLabel}
                  </span>
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold tracking-wider text-white">
                  {agent.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {agent.description}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
