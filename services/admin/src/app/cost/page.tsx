// =============================================================================
// GridMind Admin — Cost Tracking Dashboard
// =============================================================================

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { CostChart } from "@/components/CostChart";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/formatters";
import { useCostStore } from "@/stores/costStore";
import { useUiStore } from "@/stores/uiStore";
import type { AgentCostBreakdown, CostPeriod } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { value: CostPeriod; label: string }[] = [
  { value: "24h", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const MODEL_COLORS: Record<string, string> = {
  "claude-haiku-4-5": "#06B6D4",
  "claude-sonnet-4-6": "#2563EB",
  "claude-opus-4-6": "#8B5CF6",
};

const MODEL_LABEL: Record<string, string> = {
  "claude-haiku-4-5": "Haiku",
  "claude-sonnet-4-6": "Sonnet",
  "claude-opus-4-6": "Opus",
};

type SortField = "agentDisplayName" | "decisions" | "totalCostUsd" | "avgCostPerDecision";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Page animation
// ---------------------------------------------------------------------------

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostDashboardPage() {
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  const period = useCostStore((s) => s.period);
  const summary = useCostStore((s) => s.summary);
  const budget = useCostStore((s) => s.budget);
  const agentCosts = useCostStore((s) => s.agentCosts);
  const dailyCosts = useCostStore((s) => s.dailyCosts);
  const decisions = useCostStore((s) => s.decisions);
  const setPeriod = useCostStore((s) => s.setPeriod);
  const getModelDistribution = useCostStore((s) => s.getModelDistribution);

  const [sortField, setSortField] = useState<SortField>("totalCostUsd");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    setBreadcrumbs([{ label: "Cost" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortedAgents = [...agentCosts].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const numA = Number(aVal);
    const numB = Number(bVal);
    return sortDir === "asc" ? numA - numB : numB - numA;
  });

  const distribution = getModelDistribution();

  return (
    <motion.div
      className="p-6 space-y-8"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      style={{ willChange: "opacity, transform" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-primary">Cost Tracking</h1>
          <p className="text-brand-text-secondary text-sm mt-1">
            AI agent decision costs and model usage
          </p>
        </div>
        <div className="flex items-center gap-1 bg-brand-navy border border-brand-border-default rounded-lg p-1" role="radiogroup" aria-label="Time period">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={period === opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.value
                  ? "bg-brand-electric text-white"
                  : "text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-slate"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <section aria-label="Cost summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Cost"
          value={`$${summary.totalCostUsd.toFixed(2)}`}
          subtext={summary.periodLabel}
          color="text-brand-text-primary"
        />
        <SummaryCard
          label="Avg Cost / Decision"
          value={`$${summary.avgCostPerDecision.toFixed(4)}`}
          subtext="Across all agents"
        />
        <SummaryCard
          label="Total Decisions"
          value={formatNumber(summary.totalDecisions)}
          subtext={summary.periodLabel}
          color="text-brand-electric"
        />
        <SummaryCard
          label="Projected Monthly"
          value={formatCurrency(summary.projectedMonthlyCostUsd)}
          subtext="At current rate"
          color={budget.projectedOverage ? "text-brand-amber" : "text-brand-green"}
        />
      </section>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost over time */}
        <section className="lg:col-span-2 bg-brand-navy border border-brand-border-default rounded-lg p-5" aria-label="Cost over time">
          <h2 className="text-sm font-semibold text-brand-text-primary mb-4">Cost Over Time</h2>
          <CostChart data={dailyCosts} height={180} />
        </section>

        {/* Model distribution + Budget */}
        <div className="space-y-6">
          <section className="bg-brand-navy border border-brand-border-default rounded-lg p-5" aria-label="Model distribution">
            <h2 className="text-sm font-semibold text-brand-text-primary mb-4">Model Distribution</h2>
            {/* Horizontal stacked bar */}
            <div className="h-4 rounded-full overflow-hidden flex" aria-hidden="true">
              <div style={{ width: `${distribution.haiku}%`, backgroundColor: MODEL_COLORS["claude-haiku-4-5"] }} />
              <div style={{ width: `${distribution.sonnet}%`, backgroundColor: MODEL_COLORS["claude-sonnet-4-6"] }} />
              <div style={{ width: `${distribution.opus}%`, backgroundColor: MODEL_COLORS["claude-opus-4-6"] }} />
            </div>
            <div className="flex items-center justify-between mt-3">
              {[
                { label: "Haiku", pct: distribution.haiku, color: MODEL_COLORS["claude-haiku-4-5"] },
                { label: "Sonnet", pct: distribution.sonnet, color: MODEL_COLORS["claude-sonnet-4-6"] },
                { label: "Opus", pct: distribution.opus, color: MODEL_COLORS["claude-opus-4-6"] },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <span className="text-2xs text-brand-text-muted font-mono">
                    {item.label} {item.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-brand-navy border border-brand-border-default rounded-lg p-5" aria-label="Budget status">
            <BudgetProgressBar budget={budget} />
          </section>
        </div>
      </div>

      {/* Agent cost table */}
      <section aria-label="Agent cost breakdown">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Agent Cost Breakdown
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" aria-label="Agent costs">
              <thead>
                <tr className="border-b border-brand-border-subtle">
                  <SortableHeader label="Agent" field="agentDisplayName" current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Decisions" field="decisions" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                  <th scope="col" className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold text-right">
                    Input Tokens
                  </th>
                  <th scope="col" className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold text-right">
                    Output Tokens
                  </th>
                  <th scope="col" className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold">
                    Model
                  </th>
                  <SortableHeader label="Total Cost" field="totalCostUsd" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                  <SortableHeader label="Avg / Decision" field="avgCostPerDecision" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent) => (
                  <AgentCostRow key={agent.agentName} agent={agent} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent decisions */}
      <section aria-label="Recent decisions">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Recent Decisions
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" aria-label="Recent agent decisions">
              <thead>
                <tr className="border-b border-brand-border-subtle">
                  {["Time", "Agent", "Model", "Input Tokens", "Output Tokens", "Cost", "Duration"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.slice(0, 20).map((d) => (
                  <tr key={d.decisionId} className="border-b border-brand-border-subtle hover:bg-brand-slate/40 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-brand-text-muted font-mono">
                      {formatRelativeTime(d.timestamp)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-brand-text-primary font-mono font-semibold">
                      {d.agentDisplayName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-mono font-semibold"
                        style={{ color: MODEL_COLORS[d.model], backgroundColor: `${MODEL_COLORS[d.model]}15`, borderColor: `${MODEL_COLORS[d.model]}30`, borderWidth: 1 }}
                      >
                        {MODEL_LABEL[d.model] ?? d.model}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-brand-text-secondary font-mono text-right">
                      {formatNumber(d.inputTokens)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-brand-text-secondary font-mono text-right">
                      {formatNumber(d.outputTokens)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-brand-text-primary font-mono font-semibold text-right">
                      ${d.costUsd.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-brand-text-muted font-mono">
                      {d.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, subtext, color = "text-brand-text-primary" }: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
      <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      {subtext && <p className="text-xs text-brand-text-muted mt-1">{subtext}</p>}
    </div>
  );
}

function SortableHeader({ label, field, current, dir, onSort, align }: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  align?: "right";
}) {
  const isActive = current === field;
  return (
    <th scope="col" className={`px-4 py-3 text-2xs uppercase tracking-wider font-mono font-semibold ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive ? "text-brand-electric" : "text-brand-text-muted hover:text-brand-text-secondary"
        }`}
      >
        {label}
        {isActive && (
          <svg className={`w-3 h-3 ${dir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
    </th>
  );
}

function AgentCostRow({ agent }: { agent: AgentCostBreakdown }) {
  return (
    <tr className="border-b border-brand-border-subtle hover:bg-brand-slate/40 transition-colors">
      <td className="px-4 py-3">
        <span className="text-sm font-mono font-semibold text-brand-text-primary">{agent.agentDisplayName}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-mono text-brand-text-secondary">{formatNumber(agent.decisions)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs font-mono text-brand-text-muted">{formatNumber(agent.inputTokens)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs font-mono text-brand-text-muted">{formatNumber(agent.outputTokens)}</span>
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-mono font-semibold"
          style={{
            color: MODEL_COLORS[agent.model],
            backgroundColor: `${MODEL_COLORS[agent.model]}15`,
            borderColor: `${MODEL_COLORS[agent.model]}30`,
            borderWidth: 1,
          }}
        >
          {MODEL_LABEL[agent.model] ?? agent.model}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-mono font-semibold text-brand-text-primary">${agent.totalCostUsd.toFixed(2)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs font-mono text-brand-text-muted">${agent.avgCostPerDecision.toFixed(4)}</span>
      </td>
    </tr>
  );
}
