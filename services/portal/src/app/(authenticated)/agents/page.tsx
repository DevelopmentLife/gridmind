"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/stores/agentStore";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { EmptyState } from "@/components/EmptyState";
import {
  agentStatusDot,
  agentTierColor,
  formatUptime,
} from "@/lib/formatters";
import type { Agent, AgentActivity } from "@/types";

const MOCK_AGENTS: Agent[] = [
  { agentId: "argus-1", agentName: "argus", displayName: "ARGUS", description: "Workload profiling — classifies QPS, latency patterns, and connection behavior", tier: "perception", model: "claude-haiku-4-5", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 8432, lastActionAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "oracle-1", agentName: "oracle", displayName: "ORACLE", description: "Predictive scaling — forecasts compute needs and cost with 1h-to-7-day horizon", tier: "reasoning", model: "claude-sonnet-4-6", status: "processing", uptimeSeconds: 172800, tasksInFlight: 2, tasksCompleted: 1205, lastActionAt: new Date(Date.now() - 30 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "titan-1", agentName: "titan", displayName: "TITAN", description: "Auto-scaling — adjusts instance size and connection pools in response to load", tier: "execution", model: "claude-sonnet-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 47, lastActionAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "sherlock-1", agentName: "sherlock", displayName: "SHERLOCK", description: "Root cause analysis — investigates incidents and produces diagnosis reports", tier: "reasoning", model: "claude-opus-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 1, tasksCompleted: 23, lastActionAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "aegis-1", agentName: "aegis", displayName: "AEGIS", description: "Security guardian — monitors access patterns, detects anomalies, enforces policies", tier: "perception", model: "claude-sonnet-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 5621, lastActionAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "forge-1", agentName: "forge", displayName: "FORGE", description: "Infrastructure provisioner — spins up agent infrastructure on any cloud via IaC", tier: "execution", model: "claude-sonnet-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 89, lastActionAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "convoy-1", agentName: "convoy", displayName: "CONVOY", description: "Deployment manager — zero-downtime agent team deployments, upgrades, and canary rollbacks", tier: "execution", model: "deterministic", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 364, lastActionAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "vault-1", agentName: "vault", displayName: "VAULT", description: "Encryption manager — manages TLS certificates, key rotation, and at-rest encryption", tier: "execution", model: "deterministic", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 12, lastActionAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "tuner-1", agentName: "tuner", displayName: "TUNER", description: "Model optimizer — selects optimal models and tunes prompts per agent role to reduce cost", tier: "execution", model: "claude-sonnet-4-6", status: "idle", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 7, lastActionAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "harbor-1", agentName: "harbor", displayName: "HARBOR", description: "Disaster recovery — manages failover, point-in-time recovery, and DR testing", tier: "self_healing", model: "claude-sonnet-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 3, lastActionAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "herald-1", agentName: "herald", displayName: "HERALD", description: "Capacity planner — forecasts resource requirements and triggers preemptive scaling", tier: "reasoning", model: "claude-sonnet-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 156, lastActionAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
  { agentId: "prism-1", agentName: "prism_agent", displayName: "PRISM", description: "Cost optimizer — identifies waste, rightsizes resources, and minimizes cloud spend", tier: "reasoning", model: "claude-sonnet-4-6", status: "healthy", uptimeSeconds: 172800, tasksInFlight: 0, tasksCompleted: 42, lastActionAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), deploymentId: "deploy-001" },
];

const MOCK_ACTIVITY: AgentActivity[] = [
  { activityId: "a1", agentName: "oracle", displayName: "ORACLE", action: "Analyzing agent task latency", details: "Found 3 agent tasks exceeding 100ms threshold — generating recommendations", severity: "info", timestamp: new Date(Date.now() - 30 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
  { activityId: "a2", agentName: "sherlock", displayName: "SHERLOCK", action: "Investigating anomaly", details: "Lock contention spike detected — tracing to session 284019", severity: "warning", timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
  { activityId: "a3", agentName: "argus", displayName: "ARGUS", action: "Workload profile updated", details: "Read/write ratio: 78%/22% · Dominant pattern: OLTP point reads", severity: "info", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), deploymentId: "deploy-001", deploymentName: "production-primary" },
];

const TIER_ORDER = ["perception", "reasoning", "execution", "self_healing", "specialized"] as const;

export default function AgentsPage() {
  const { agents, activity, isLoading, upsertAgent, appendActivity } = useAgentStore();

  useEffect(() => {
    if (agents.length === 0) {
      MOCK_AGENTS.forEach(upsertAgent);
    }
    if (activity.length === 0) {
      MOCK_ACTIVITY.forEach(appendActivity);
    }
  }, [agents.length, activity.length, upsertAgent, appendActivity]);

  const healthyCount = agents.filter((a) => a.status === "healthy").length;
  const processingCount = agents.filter((a) => a.status === "processing").length;

  const agentsByTier = TIER_ORDER.reduce<Record<string, Agent[]>>((acc, tier) => {
    const filtered = agents.filter((a) => a.tier === tier);
    if (filtered.length > 0) acc[tier] = filtered;
    return acc;
  }, {});

  const tierLabels: Record<string, string> = {
    perception: "Perception",
    reasoning: "Reasoning",
    execution: "Execution",
    self_healing: "Self-Healing",
    specialized: "Specialized",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-brand-text-primary text-2xl font-bold">AI Agents</h1>
        <p className="text-brand-text-muted text-sm mt-1">
          {agents.length} active agents ·{" "}
          <span className="text-brand-green">{healthyCount} healthy</span>
          {processingCount > 0 && (
            <>
              {" · "}
              <span className="text-brand-ocean">{processingCount} processing</span>
            </>
          )}
        </p>
      </div>

      {isLoading && agents.length === 0 && (
        <div className="flex items-center justify-center py-20 text-brand-text-muted text-sm">Loading agents…</div>
      )}

      {!isLoading && agents.length === 0 && (
        <EmptyState title="No agents active" message="Create a deployment to activate your agent fleet." icon="🤖" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent tiers */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(agentsByTier).map(([tier, tierAgents]) => (
            <div key={tier}>
              <h2 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${agentTierColor(tier as Agent["tier"])}`}>
                {tierLabels[tier] ?? tier}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tierAgents.map((agent) => (
                  <motion.div
                    key={agent.agentId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-navy border border-brand-border-default rounded-lg p-4 shadow-card"
                    role="article"
                    aria-label={`${agent.displayName} agent, status ${agent.status}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${agentStatusDot(agent.status)}`}
                          aria-hidden="true"
                          data-testid="status-indicator"
                        />
                        <span className="text-brand-text-primary font-semibold text-sm font-mono">
                          {agent.displayName}
                        </span>
                      </div>
                      {agent.tasksInFlight > 0 && (
                        <span className="text-2xs text-brand-ocean bg-brand-ocean/10 px-1.5 py-0.5 rounded font-medium">
                          {agent.tasksInFlight} in flight
                        </span>
                      )}
                    </div>
                    <p className="text-brand-text-muted text-xs leading-relaxed line-clamp-2 mb-3">
                      {agent.description}
                    </p>
                    <div className="flex items-center justify-between text-2xs text-brand-text-muted">
                      <span>{formatUptime(agent.uptimeSeconds)} uptime</span>
                      <span>{agent.tasksCompleted.toLocaleString()} tasks</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div className="card flex flex-col h-fit">
          <h2 className="text-brand-text-primary font-semibold text-sm mb-4">Live activity</h2>
          <AgentActivityFeed
            activities={activity.length > 0 ? activity : MOCK_ACTIVITY}
            className="max-h-[500px] -mx-5 -mb-5"
          />
        </div>
      </div>
    </div>
  );
}
