import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import type { Agent } from "@/types";
import {
  agentStatusColor,
  agentTierColor,
  agentTierLabel,
  formatCompact,
  formatLatency,
  formatUptime,
} from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Agent Fleet",
};

const MOCK_AGENTS: Agent[] = [
  { agentId: "argus-1", agentName: "argus", displayName: "ARGUS", tier: "perception", status: "healthy", model: "claude-haiku-4-5", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 864000, tasksInFlight: 24, totalCyclesCompleted: 1_250_000, lastActionAt: new Date(Date.now() - 5_000).toISOString(), errorRate: 0.001, avgCycleMs: 120, autonomyLevel: "autonomous", visibility: "Customer" },
  { agentId: "oracle-1", agentName: "oracle", displayName: "ORACLE", tier: "perception", status: "healthy", model: "claude-haiku-4-5", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 720000, tasksInFlight: 18, totalCyclesCompleted: 980_000, lastActionAt: new Date(Date.now() - 8_000).toISOString(), errorRate: 0.002, avgCycleMs: 145, autonomyLevel: "autonomous", visibility: "Customer" },
  { agentId: "sherlock-1", agentName: "sherlock", displayName: "SHERLOCK", tier: "reasoning", status: "healthy", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 720000, tasksInFlight: 3, totalCyclesCompleted: 45_000, lastActionAt: new Date(Date.now() - 12_000).toISOString(), errorRate: 0.003, avgCycleMs: 890, autonomyLevel: "supervised", visibility: "Customer" },
  { agentId: "planner-1", agentName: "planner", displayName: "PLANNER", tier: "reasoning", status: "healthy", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 540000, tasksInFlight: 7, totalCyclesCompleted: 32_000, lastActionAt: new Date(Date.now() - 25_000).toISOString(), errorRate: 0.001, avgCycleMs: 1_200, autonomyLevel: "supervised", visibility: "Customer" },
  { agentId: "aegis-1", agentName: "aegis", displayName: "AEGIS", tier: "execution", status: "healthy", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 432000, tasksInFlight: 1, totalCyclesCompleted: 28_000, lastActionAt: new Date(Date.now() - 60_000).toISOString(), errorRate: 0.0, avgCycleMs: 2_100, autonomyLevel: "supervised", visibility: "Customer" },
  { agentId: "scaler-1", agentName: "scaler", displayName: "SCALER", tier: "execution", status: "degraded", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 86400, tasksInFlight: 0, totalCyclesCompleted: 5_200, lastActionAt: new Date(Date.now() - 300_000).toISOString(), errorRate: 0.08, avgCycleMs: 3_400, autonomyLevel: "supervised", visibility: "Customer" },
  { agentId: "healer-1", agentName: "healer", displayName: "HEALER", tier: "self_healing", status: "healthy", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 600000, tasksInFlight: 2, totalCyclesCompleted: 15_000, lastActionAt: new Date(Date.now() - 30_000).toISOString(), errorRate: 0.002, avgCycleMs: 4_500, autonomyLevel: "supervised", visibility: "Internal" },
  { agentId: "sentry-1", agentName: "sentry", displayName: "SENTRY", tier: "specialized", status: "healthy", model: "claude-opus-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 900000, tasksInFlight: 0, totalCyclesCompleted: 8_400, lastActionAt: new Date(Date.now() - 120_000).toISOString(), errorRate: 0.0, avgCycleMs: 12_000, autonomyLevel: "advisory", visibility: "Internal" },
];

const tierOrder = ["perception", "reasoning", "execution", "self_healing", "specialized"] as const;

export default function AgentsPage() {
  const byTier = tierOrder.reduce<Record<string, Agent[]>>((acc, tier) => {
    acc[tier] = MOCK_AGENTS.filter((a) => a.tier === tier);
    return acc;
  }, {});

  const healthyCount = MOCK_AGENTS.filter((a) => a.status === "healthy").length;
  const degradedCount = MOCK_AGENTS.filter((a) => a.status === "degraded").length;
  const offlineCount = MOCK_AGENTS.filter((a) => a.status === "offline").length;

  return (
    <>
      <TopBar
        title="Global Agent Fleet"
        subtitle={`${MOCK_AGENTS.length} agents across all namespaces`}
        actions={
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-brand-green">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green" aria-hidden="true" />
              {healthyCount} healthy
            </span>
            {degradedCount > 0 && (
              <span className="flex items-center gap-1.5 text-brand-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-amber" aria-hidden="true" />
                {degradedCount} degraded
              </span>
            )}
            {offlineCount > 0 && (
              <span className="flex items-center gap-1.5 text-brand-red">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red" aria-hidden="true" />
                {offlineCount} offline
              </span>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {tierOrder.map((tier) => {
          const agents = byTier[tier] ?? [];
          if (agents.length === 0) return null;

          return (
            <section key={tier} aria-labelledby={`tier-${tier}-heading`}>
              <h2
                id={`tier-${tier}-heading`}
                className={[
                  "text-xs font-semibold uppercase tracking-wide mb-3",
                  agentTierColor(tier),
                ].join(" ")}
              >
                {agentTierLabel(tier)} Tier
                <span className="text-brand-text-muted font-normal ml-2">
                  ({agents.length})
                </span>
              </h2>

              <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
                <table className="data-table" aria-label={`${agentTierLabel(tier)} agents`}>
                  <thead>
                    <tr>
                      <th scope="col" className="pl-4">Agent</th>
                      <th scope="col">Model</th>
                      <th scope="col">Status</th>
                      <th scope="col">Autonomy</th>
                      <th scope="col" className="text-right">Tasks</th>
                      <th scope="col" className="text-right">Cycles</th>
                      <th scope="col" className="text-right">Avg Cycle</th>
                      <th scope="col" className="text-right">Error %</th>
                      <th scope="col" className="text-right pr-4">Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr
                        key={agent.agentId}
                        className="border-b border-brand-border-subtle last:border-0 hover:bg-brand-slate/30"
                      >
                        <td className="pl-4 px-3 py-3">
                          <div>
                            <span className="text-brand-text-primary text-xs font-mono font-semibold">
                              {agent.displayName}
                            </span>
                            {agent.visibility === "Internal" && (
                              <span className="ml-1.5 text-2xs text-brand-text-muted">
                                (internal)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-brand-text-muted text-2xs font-mono">
                            {agent.model}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={[
                                "w-1.5 h-1.5 rounded-full",
                                agentStatusColor(agent.status),
                              ].join(" ")}
                              aria-hidden="true"
                            />
                            <span className="text-brand-text-secondary text-xs capitalize">
                              {agent.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-brand-text-muted text-xs capitalize">
                            {agent.autonomyLevel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-brand-text-secondary text-xs font-mono tabular-nums">
                            {agent.tasksInFlight}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-brand-text-secondary text-xs font-mono tabular-nums">
                            {formatCompact(agent.totalCyclesCompleted)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-brand-text-secondary text-xs font-mono tabular-nums">
                            {formatLatency(agent.avgCycleMs)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={[
                              "text-xs font-mono tabular-nums",
                              agent.errorRate < 0.01 ? "text-brand-green" : agent.errorRate < 0.05 ? "text-brand-amber" : "text-brand-red",
                            ].join(" ")}
                          >
                            {(agent.errorRate * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right pr-4">
                          <span className="text-brand-text-muted text-xs font-mono tabular-nums">
                            {formatUptime(agent.uptimeSeconds)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
