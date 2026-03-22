// =============================================================================
// GridMind Admin — Agent Fleet Page
// =============================================================================

"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { AgentCard } from "@/components/AgentCard";
import { AgentTierBadge } from "@/components/AgentTierBadge";
import { useAgentStore } from "@/stores/agentStore";
import { useUiStore } from "@/stores/uiStore";
import type { AgentTier } from "@/types";

const TIERS: AgentTier[] = ["perception", "reasoning", "execution", "self_healing"];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "healthy", label: "Healthy" },
  { value: "degraded", label: "Degraded" },
  { value: "offline", label: "Offline" },
];

function AgentFleetContent() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier") as AgentTier | null;

  const { filter, setFilter, getFilteredAgents, getAgentsByTier } = useAgentStore();
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "Agent Fleet", href: "/agents" }]);
    if (tierParam) {
      setFilter({ tier: tierParam });
    }
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, tierParam, setFilter]);

  const filteredAgents = getFilteredAgents();

  // Group by tier for display
  const groupedByTier = TIERS.reduce<Record<AgentTier, ReturnType<typeof getAgentsByTier>>>(
    (acc, tier) => {
      acc[tier] = filteredAgents.filter((a) => a.tier === tier);
      return acc;
    },
    {} as Record<AgentTier, ReturnType<typeof getAgentsByTier>>
  );

  const showGrouped = !filter.search && !filter.status && !filter.tier;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-primary">
            Agent Fleet
          </h1>
          <p className="text-brand-text-secondary text-sm mt-1">
            24 autonomous AI agents across 4 operational tiers
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {TIERS.map((tier) => {
            const tierAgents = getAgentsByTier(tier);
            const healthy = tierAgents.filter((a) => a.status === "healthy").length;
            return (
              <button
                key={tier}
                type="button"
                onClick={() =>
                  setFilter({ tier: filter.tier === tier ? "" : tier })
                }
                aria-pressed={filter.tier === tier}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-all ${
                  filter.tier === tier
                    ? "bg-brand-electric/10 border-brand-electric/40"
                    : "border-brand-border-default hover:border-brand-border-default hover:bg-brand-slate"
                }`}
              >
                <AgentTierBadge tier={tier} size="sm" />
                <span className="font-mono text-brand-text-secondary">
                  {healthy}/{tierAgents.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="search" aria-label="Filter agents">
        <input
          type="search"
          placeholder="Search agents..."
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          aria-label="Search agents by name or description"
          className="bg-brand-navy border border-brand-border-default rounded-md px-4 py-2 text-sm text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-electric min-w-[200px]"
        />
        <select
          value={filter.status ?? ""}
          onChange={(e) => setFilter({ status: e.target.value || undefined })}
          aria-label="Filter by status"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(filter.search || filter.status || filter.tier) && (
          <button
            type="button"
            onClick={() => setFilter({ search: "", status: undefined, tier: undefined })}
            className="text-sm text-brand-text-secondary hover:text-brand-text-primary transition-colors px-3 py-2"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-brand-text-muted self-center font-mono">
          {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Agent grid — grouped by tier or flat */}
      {showGrouped ? (
        <div className="space-y-8">
          {TIERS.map((tier) => {
            const tierAgents = groupedByTier[tier];
            if (!tierAgents || tierAgents.length === 0) return null;
            return (
              <section key={tier} aria-label={`${tier} tier agents`}>
                <div className="flex items-center gap-3 mb-4">
                  <AgentTierBadge tier={tier} />
                  <span className="text-brand-text-muted text-sm font-mono">
                    {tierAgents.filter((a) => a.status === "healthy").length}/
                    {tierAgents.length} healthy
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierAgents.map((agent) => (
                    <AgentCard key={agent.agentId} agent={agent} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div>
          {filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-brand-text-muted font-mono">
                No agents match the current filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard key={agent.agentId} agent={agent} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-brand-text-muted">Loading agents...</div>}>
      <AgentFleetContent />
    </Suspense>
  );
}
