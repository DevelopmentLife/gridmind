// =============================================================================
// GridMind Admin — Cost Tracking Zustand Store
// =============================================================================

import { create } from "zustand";

import type {
  AgentCostBreakdown,
  AgentDecision,
  BudgetStatus,
  CostPeriod,
  CostSummary,
  DailyCost,
} from "@/types";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_AGENT_COSTS: AgentCostBreakdown[] = [
  {
    agentName: "argus",
    agentDisplayName: "ARGUS",
    model: "claude-haiku-4-5",
    decisions: 840,
    inputTokens: 420000,
    outputTokens: 126000,
    modelCostUsd: 0.42,
    computeCostUsd: 0.08,
    totalCostUsd: 0.50,
    avgCostPerDecision: 0.0006,
  },
  {
    agentName: "oracle",
    agentDisplayName: "ORACLE",
    model: "claude-haiku-4-5",
    decisions: 620,
    inputTokens: 310000,
    outputTokens: 93000,
    modelCostUsd: 0.31,
    computeCostUsd: 0.06,
    totalCostUsd: 0.37,
    avgCostPerDecision: 0.0006,
  },
  {
    agentName: "herald",
    agentDisplayName: "HERALD",
    model: "claude-haiku-4-5",
    decisions: 480,
    inputTokens: 240000,
    outputTokens: 72000,
    modelCostUsd: 0.24,
    computeCostUsd: 0.05,
    totalCostUsd: 0.29,
    avgCostPerDecision: 0.0006,
  },
  {
    agentName: "titan",
    agentDisplayName: "TITAN",
    model: "claude-sonnet-4-6",
    decisions: 210,
    inputTokens: 525000,
    outputTokens: 157500,
    modelCostUsd: 0.95,
    computeCostUsd: 0.15,
    totalCostUsd: 1.10,
    avgCostPerDecision: 0.0052,
  },
  {
    agentName: "prism",
    agentDisplayName: "PRISM",
    model: "claude-sonnet-4-6",
    decisions: 180,
    inputTokens: 450000,
    outputTokens: 135000,
    modelCostUsd: 0.81,
    computeCostUsd: 0.13,
    totalCostUsd: 0.94,
    avgCostPerDecision: 0.0052,
  },
  {
    agentName: "sherlock",
    agentDisplayName: "SHERLOCK",
    model: "claude-sonnet-4-6",
    decisions: 150,
    inputTokens: 375000,
    outputTokens: 112500,
    modelCostUsd: 0.68,
    computeCostUsd: 0.11,
    totalCostUsd: 0.79,
    avgCostPerDecision: 0.0053,
  },
  {
    agentName: "aegis",
    agentDisplayName: "AEGIS",
    model: "claude-sonnet-4-6",
    decisions: 120,
    inputTokens: 300000,
    outputTokens: 90000,
    modelCostUsd: 0.54,
    computeCostUsd: 0.09,
    totalCostUsd: 0.63,
    avgCostPerDecision: 0.0053,
  },
  {
    agentName: "forge",
    agentDisplayName: "FORGE",
    model: "claude-opus-4-6",
    decisions: 12,
    inputTokens: 180000,
    outputTokens: 60000,
    modelCostUsd: 1.80,
    computeCostUsd: 0.20,
    totalCostUsd: 2.00,
    avgCostPerDecision: 0.1667,
  },
  {
    agentName: "sentinel",
    agentDisplayName: "SENTINEL",
    model: "claude-opus-4-6",
    decisions: 8,
    inputTokens: 120000,
    outputTokens: 40000,
    modelCostUsd: 1.20,
    computeCostUsd: 0.13,
    totalCostUsd: 1.33,
    avgCostPerDecision: 0.1663,
  },
];

const MOCK_DAILY_COSTS: DailyCost[] = [
  { date: "2026-03-22", label: "Mar 22", haikuCostUsd: 1.05, sonnetCostUsd: 3.20, opusCostUsd: 2.80, totalCostUsd: 7.05, totalDecisions: 2480 },
  { date: "2026-03-23", label: "Mar 23", haikuCostUsd: 0.98, sonnetCostUsd: 2.95, opusCostUsd: 3.10, totalCostUsd: 7.03, totalDecisions: 2390 },
  { date: "2026-03-24", label: "Mar 24", haikuCostUsd: 1.12, sonnetCostUsd: 3.40, opusCostUsd: 2.50, totalCostUsd: 7.02, totalDecisions: 2620 },
  { date: "2026-03-25", label: "Mar 25", haikuCostUsd: 1.20, sonnetCostUsd: 3.10, opusCostUsd: 3.40, totalCostUsd: 7.70, totalDecisions: 2710 },
  { date: "2026-03-26", label: "Mar 26", haikuCostUsd: 0.92, sonnetCostUsd: 2.80, opusCostUsd: 2.90, totalCostUsd: 6.62, totalDecisions: 2350 },
  { date: "2026-03-27", label: "Mar 27", haikuCostUsd: 1.08, sonnetCostUsd: 3.50, opusCostUsd: 3.20, totalCostUsd: 7.78, totalDecisions: 2580 },
  { date: "2026-03-28", label: "Mar 28", haikuCostUsd: 1.16, sonnetCostUsd: 3.46, opusCostUsd: 3.33, totalCostUsd: 7.95, totalDecisions: 2620 },
];

const MOCK_RECENT_DECISIONS: AgentDecision[] = Array.from({ length: 20 }, (_, i) => {
  const agents = [
    { name: "argus", display: "ARGUS", model: "claude-haiku-4-5" as const },
    { name: "titan", display: "TITAN", model: "claude-sonnet-4-6" as const },
    { name: "oracle", display: "ORACLE", model: "claude-haiku-4-5" as const },
    { name: "sherlock", display: "SHERLOCK", model: "claude-sonnet-4-6" as const },
    { name: "forge", display: "FORGE", model: "claude-opus-4-6" as const },
    { name: "herald", display: "HERALD", model: "claude-haiku-4-5" as const },
    { name: "aegis", display: "AEGIS", model: "claude-sonnet-4-6" as const },
    { name: "prism", display: "PRISM", model: "claude-sonnet-4-6" as const },
    { name: "sentinel", display: "SENTINEL", model: "claude-opus-4-6" as const },
  ];
  const agent = agents[i % agents.length]!;
  const costMap: Record<string, number> = {
    "claude-haiku-4-5": 0.0006,
    "claude-sonnet-4-6": 0.005,
    "claude-opus-4-6": 0.16,
  };
  const tokenMultiplier = agent.model === "claude-opus-4-6" ? 15000 : agent.model === "claude-sonnet-4-6" ? 2500 : 500;
  return {
    decisionId: `dec-${String(i + 1).padStart(4, "0")}`,
    agentName: agent.name,
    agentDisplayName: agent.display,
    model: agent.model,
    inputTokens: tokenMultiplier + Math.floor(Math.random() * 500),
    outputTokens: Math.floor(tokenMultiplier * 0.3) + Math.floor(Math.random() * 200),
    costUsd: costMap[agent.model] ?? 0.001,
    durationMs: 200 + Math.floor(Math.random() * 3000),
    timestamp: new Date(Date.now() - i * 180000).toISOString(),
    tenantId: "tenant-001",
  };
});

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface CostState {
  decisions: AgentDecision[];
  agentCosts: AgentCostBreakdown[];
  dailyCosts: DailyCost[];
  summary: CostSummary;
  budget: BudgetStatus;
  period: CostPeriod;
  isLoading: boolean;

  // Actions
  setPeriod: (period: CostPeriod) => void;
  fetchCostData: () => void;
  setBudget: (budgetUsd: number) => void;

  // Derived
  getTotalCost: () => number;
  getTopAgentByCost: () => AgentCostBreakdown | null;
  getModelDistribution: () => { haiku: number; sonnet: number; opus: number };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function computeSummary(period: CostPeriod, dailyCosts: DailyCost[]): CostSummary {
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  const relevantDays = dailyCosts.slice(-Math.min(days, dailyCosts.length));
  const totalCost = relevantDays.reduce((sum, d) => sum + d.totalCostUsd, 0);
  const totalDecisions = relevantDays.reduce((sum, d) => sum + d.totalDecisions, 0);
  const avgPerDecision = totalDecisions > 0 ? totalCost / totalDecisions : 0;
  const dailyAvg = relevantDays.length > 0 ? totalCost / relevantDays.length : 0;

  return {
    totalCostUsd: totalCost,
    totalDecisions,
    avgCostPerDecision: avgPerDecision,
    projectedMonthlyCostUsd: dailyAvg * 30,
    periodLabel: period === "24h" ? "Today" : period === "7d" ? "Last 7 days" : "Last 30 days",
  };
}

function computeBudget(spentUsd: number, budgetUsd: number, projectedMonthly: number): BudgetStatus {
  const percentUsed = budgetUsd > 0 ? (spentUsd / budgetUsd) * 100 : 0;
  return {
    budgetUsd,
    spentUsd,
    percentUsed,
    remainingUsd: Math.max(0, budgetUsd - spentUsd),
    projectedOverage: projectedMonthly > budgetUsd,
  };
}

const initialSummary = computeSummary("24h", MOCK_DAILY_COSTS);
const initialBudget = computeBudget(initialSummary.totalCostUsd, 250, initialSummary.projectedMonthlyCostUsd);

export const useCostStore = create<CostState>((set, get) => ({
  decisions: MOCK_RECENT_DECISIONS,
  agentCosts: MOCK_AGENT_COSTS,
  dailyCosts: MOCK_DAILY_COSTS,
  summary: initialSummary,
  budget: initialBudget,
  period: "24h",
  isLoading: false,

  setPeriod: (period) => {
    const summary = computeSummary(period, get().dailyCosts);
    const budget = computeBudget(summary.totalCostUsd, get().budget.budgetUsd, summary.projectedMonthlyCostUsd);
    set({ period, summary, budget });
  },

  fetchCostData: () => {
    set({ isLoading: true });
    // In production this would call the API. Using mock data for now.
    setTimeout(() => {
      const { period, budget } = get();
      const summary = computeSummary(period, MOCK_DAILY_COSTS);
      const budgetStatus = computeBudget(summary.totalCostUsd, budget.budgetUsd, summary.projectedMonthlyCostUsd);
      set({
        decisions: MOCK_RECENT_DECISIONS,
        agentCosts: MOCK_AGENT_COSTS,
        dailyCosts: MOCK_DAILY_COSTS,
        summary,
        budget: budgetStatus,
        isLoading: false,
      });
    }, 300);
  },

  setBudget: (budgetUsd) => {
    const { summary } = get();
    const budget = computeBudget(summary.totalCostUsd, budgetUsd, summary.projectedMonthlyCostUsd);
    set({ budget });
  },

  getTotalCost: () => get().summary.totalCostUsd,

  getTopAgentByCost: () => {
    const costs = get().agentCosts;
    if (costs.length === 0) return null;
    return costs.reduce((top, agent) => (agent.totalCostUsd > top.totalCostUsd ? agent : top), costs[0]!);
  },

  getModelDistribution: () => {
    const costs = get().agentCosts;
    const totals = costs.reduce(
      (acc, agent) => {
        if (agent.model === "claude-haiku-4-5") acc.haiku += agent.totalCostUsd;
        else if (agent.model === "claude-sonnet-4-6") acc.sonnet += agent.totalCostUsd;
        else if (agent.model === "claude-opus-4-6") acc.opus += agent.totalCostUsd;
        return acc;
      },
      { haiku: 0, sonnet: 0, opus: 0 },
    );
    const total = totals.haiku + totals.sonnet + totals.opus;
    if (total === 0) return { haiku: 0, sonnet: 0, opus: 0 };
    return {
      haiku: (totals.haiku / total) * 100,
      sonnet: (totals.sonnet / total) * 100,
      opus: (totals.opus / total) * 100,
    };
  },
}));
