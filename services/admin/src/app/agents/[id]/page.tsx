// =============================================================================
// GridMind Admin — Agent Detail Page
// =============================================================================

"use client";

import { useEffect } from "react";
import { useParams, notFound } from "next/navigation";

import { AgentTierBadge } from "@/components/AgentTierBadge";
import { MetricsChart } from "@/components/MetricsChart";
import { StatusBadge, StatusDot } from "@/components/StatusBadge";
import { formatDateTime, formatRelativeTime, formatUptime } from "@/lib/formatters";
import { useAgentStore } from "@/stores/agentStore";
import { useUiStore } from "@/stores/uiStore";

// Mock time-series for agent detail
function generateAgentMetrics(baseValue: number, points = 20) {
  return Array.from({ length: points }, (_, i) => ({
    label: `T-${points - i}`,
    value: baseValue + (Math.random() - 0.5) * baseValue * 0.3,
  }));
}

const MOCK_ACTIONS = [
  {
    actionId: "act-001",
    actionType: "index_analysis",
    description: "Analyzed slow query log — identified 3 missing indexes",
    status: "success" as const,
    riskLevel: "low" as const,
    startedAt: new Date(Date.now() - 1800_000).toISOString(),
    completedAt: new Date(Date.now() - 1795_000).toISOString(),
    durationMs: 5000,
  },
  {
    actionId: "act-002",
    actionType: "workload_profile",
    description: "Published workload profile — QPS: 8420, P95: 4.2ms",
    status: "success" as const,
    riskLevel: "low" as const,
    startedAt: new Date(Date.now() - 3600_000).toISOString(),
    completedAt: new Date(Date.now() - 3599_000).toISOString(),
    durationMs: 850,
  },
  {
    actionId: "act-003",
    actionType: "anomaly_detection",
    description: "Detected unusual connection spike — published alert event",
    status: "success" as const,
    riskLevel: "medium" as const,
    startedAt: new Date(Date.now() - 7200_000).toISOString(),
    completedAt: new Date(Date.now() - 7199_000).toISOString(),
    durationMs: 1200,
  },
];

const MOCK_LOGS = [
  {
    logId: "log-001",
    level: "info" as const,
    message: "Cycle completed — published workload_profile event",
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    logId: "log-002",
    level: "info" as const,
    message: "Connected to NATS JetStream stream: gridmind-events",
    timestamp: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    logId: "log-003",
    level: "warning" as const,
    message: "LLM response latency elevated: 3200ms (threshold: 3000ms)",
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    logId: "log-004",
    level: "info" as const,
    message: "Checkpoint saved to PostgreSQL",
    timestamp: new Date(Date.now() - 7200_000).toISOString(),
  },
];

const LOG_LEVEL_CLASS: Record<string, string> = {
  debug: "text-brand-text-muted",
  info: "text-brand-text-secondary",
  warning: "text-brand-amber",
  error: "text-brand-red",
};

const ACTION_STATUS_CLASS: Record<string, string> = {
  success: "text-brand-green",
  failed: "text-brand-red",
  pending: "text-brand-amber",
};

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const agent = useAgentStore((s) => s.getAgentById(agentId));
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    if (agent) {
      setBreadcrumbs([
        { label: "Agent Fleet", href: "/agents" },
        { label: agent.displayName },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, agent]);

  if (!agent) {
    notFound();
  }

  const cycleData = generateAgentMetrics(agent.avgCycleMs, 20);
  const errorData = generateAgentMetrics(agent.errorRatePercent, 20);

  const MODEL_LABELS: Record<string, string> = {
    "claude-haiku-4-5": "Claude Haiku 4.5",
    "claude-sonnet-4-6": "Claude Sonnet 4.6",
    "claude-opus-4-6": "Claude Opus 4.6",
    deterministic: "Deterministic",
  };

  return (
    <div className="p-6 space-y-8">
      {/* Agent header */}
      <div className="bg-brand-navy border border-brand-border-default rounded-lg p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-3">
            <StatusDot status={agent.status} size="lg" />
            <div>
              <h1 className="text-2xl font-mono font-bold text-brand-text-primary tracking-wider">
                {agent.displayName}
              </h1>
              <p className="text-brand-text-secondary text-sm mt-0.5">
                {agent.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            <StatusBadge status={agent.status} />
            <AgentTierBadge tier={agent.tier} />
            <span className="text-xs font-mono bg-brand-midnight text-brand-text-secondary px-3 py-1 rounded border border-brand-border-subtle">
              {MODEL_LABELS[agent.model] ?? agent.model}
            </span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 pt-6 border-t border-brand-border-subtle">
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Uptime
            </p>
            <p className="font-mono font-semibold text-brand-text-primary">
              {agent.status === "offline" ? "Offline" : formatUptime(agent.uptimeSeconds)}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Tasks in Flight
            </p>
            <p className="font-mono font-semibold text-brand-text-primary">
              {agent.tasksInFlight}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Total Completed
            </p>
            <p className="font-mono font-semibold text-brand-text-primary">
              {agent.tasksCompletedTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Last Heartbeat
            </p>
            <p className="font-mono text-sm text-brand-text-secondary">
              {formatRelativeTime(agent.lastHeartbeatAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics charts */}
      <section aria-label="Agent performance metrics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <h2 className="text-sm font-semibold text-brand-text-primary mb-1">
            Cycle Duration
          </h2>
          <p className="font-mono text-xl font-bold text-brand-electric mb-4">
            {agent.avgCycleMs}ms avg
          </p>
          <MetricsChart
            data={cycleData}
            height={80}
            color="#2563EB"
            label="Cycle duration over time (ms)"
            formatValue={(v) => `${v.toFixed(0)}ms`}
            showGrid
          />
        </div>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <h2 className="text-sm font-semibold text-brand-text-primary mb-1">
            Error Rate
          </h2>
          <p
            className={`font-mono text-xl font-bold mb-4 ${
              agent.errorRatePercent > 5
                ? "text-brand-red"
                : agent.errorRatePercent > 2
                  ? "text-brand-amber"
                  : "text-brand-green"
            }`}
          >
            {agent.errorRatePercent.toFixed(1)}%
          </p>
          <MetricsChart
            data={errorData}
            height={80}
            color={agent.errorRatePercent > 5 ? "#EF4444" : "#10B981"}
            label="Error rate over time (%)"
            formatValue={(v) => `${v.toFixed(1)}%`}
            showGrid
          />
        </div>
      </section>

      {/* Recent actions */}
      <section aria-label="Recent agent actions">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Recent Actions
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg divide-y divide-brand-border-subtle">
          {MOCK_ACTIONS.map((action) => (
            <div key={action.actionId} className="px-5 py-4 flex items-start gap-4">
              <span
                className={`font-mono text-xs font-semibold uppercase flex-shrink-0 ${ACTION_STATUS_CLASS[action.status] ?? "text-brand-text-muted"}`}
              >
                {action.status}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-brand-text-primary">{action.description}</p>
                <p className="text-xs text-brand-text-muted mt-0.5 font-mono">
                  {action.actionType} · {action.durationMs}ms · {formatDateTime(action.startedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Logs */}
      <section aria-label="Agent logs">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Recent Logs
        </h2>
        <div
          className="bg-brand-midnight border border-brand-border-default rounded-lg font-mono text-xs p-4 space-y-2 max-h-64 overflow-y-auto"
          role="log"
          aria-label="Agent log output"
          aria-live="polite"
        >
          {MOCK_LOGS.map((log) => (
            <div key={log.logId} className="flex gap-3">
              <span className="text-brand-text-muted flex-shrink-0">
                {new Date(log.timestamp).toISOString().substring(11, 19)}
              </span>
              <span
                className={`flex-shrink-0 uppercase font-semibold ${LOG_LEVEL_CLASS[log.level] ?? "text-brand-text-secondary"}`}
              >
                [{log.level}]
              </span>
              <span className="text-brand-text-secondary">{log.message}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Agent metadata */}
      <section aria-label="Agent configuration">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Configuration
        </h2>
        <dl className="bg-brand-navy border border-brand-border-default rounded-lg divide-y divide-brand-border-subtle">
          {[
            { label: "Agent ID", value: agent.agentId },
            { label: "Agent Name", value: agent.agentName },
            { label: "Display Name", value: agent.displayName },
            { label: "Tier", value: agent.tier },
            { label: "Autonomy Level", value: agent.autonomyLevel },
            { label: "Model", value: MODEL_LABELS[agent.model] ?? agent.model },
            { label: "Visibility", value: agent.visibility },
            {
              label: "Last Action",
              value: formatDateTime(agent.lastActionAt),
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center px-5 py-3">
              <dt className="text-xs text-brand-text-muted uppercase tracking-wider font-mono w-36 flex-shrink-0">
                {label}
              </dt>
              <dd className="font-mono text-sm text-brand-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
