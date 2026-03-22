// =============================================================================
// GridMind Admin — Dashboard Page
// =============================================================================

"use client";

import Link from "next/link";

import { AgentTierBadge } from "@/components/AgentTierBadge";
import { IncidentBadge } from "@/components/IncidentBadge";
import { MetricsChart } from "@/components/MetricsChart";
import { StatusBadge, StatusDot } from "@/components/StatusBadge";
import {
  formatCurrency,
  formatPercent,
  formatQps,
  formatRelativeTime,
} from "@/lib/formatters";
import { useAgentStore } from "@/stores/agentStore";
import { useApprovalStore } from "@/stores/approvalStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useTenantStore } from "@/stores/tenantStore";

// Mock time-series data for charts
const QPS_DATA = [
  { label: "00:00", value: 12400 },
  { label: "04:00", value: 8200 },
  { label: "08:00", value: 24800 },
  { label: "10:00", value: 38900 },
  { label: "12:00", value: 45200 },
  { label: "14:00", value: 52100 },
  { label: "16:00", value: 48700 },
  { label: "18:00", value: 41200 },
  { label: "20:00", value: 32000 },
  { label: "22:00", value: 18400 },
  { label: "Now", value: 21300 },
];

const LATENCY_DATA = [
  { label: "00:00", value: 2.1 },
  { label: "04:00", value: 1.8 },
  { label: "08:00", value: 3.4 },
  { label: "10:00", value: 4.1 },
  { label: "12:00", value: 5.2 },
  { label: "14:00", value: 4.8 },
  { label: "16:00", value: 4.2 },
  { label: "18:00", value: 3.9 },
  { label: "20:00", value: 2.8 },
  { label: "22:00", value: 2.2 },
  { label: "Now", value: 2.6 },
];

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  href?: string;
  alert?: boolean;
}

function StatCard({ label, value, subtext, color = "text-brand-text-primary", href, alert }: StatCardProps) {
  const content = (
    <div
      className={`bg-brand-navy border rounded-lg p-5 ${
        alert
          ? "border-brand-red/40 shadow-glow-red"
          : "border-brand-border-default"
      }`}
    >
      <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-2">
        {label}
      </p>
      <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
      {subtext && (
        <p className="text-xs text-brand-text-muted mt-1">{subtext}</p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}

export default function DashboardPage() {
  const agents = useAgentStore((s) => s.agents);
  const fleetHealth = useAgentStore((s) => s.fleetHealth);
  const healthyCount = useAgentStore((s) => s.getHealthyCount());
  const degradedCount = useAgentStore((s) => s.getDegradedCount());
  const offlineCount = useAgentStore((s) => s.getOfflineCount());

  const incidents = useIncidentStore((s) => s.incidents);
  const openIncidents = useIncidentStore((s) => s.getOpenCount());
  const p1Count = useIncidentStore((s) => s.getP1Count());

  const pendingApprovals = useApprovalStore((s) => s.getPendingCount());

  const activeTenants = useTenantStore((s) => s.getActiveTenantCount());

  const recentIncidents = incidents.filter((i) => i.status !== "resolved").slice(0, 4);
  const recentAgents = agents.filter((a) => a.status !== "healthy").slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">
          Operations Dashboard
        </h1>
        <p className="text-brand-text-secondary text-sm mt-1">
          Fleet health overview — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Top-level stats */}
      <section aria-label="Fleet health summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Healthy Agents"
            value={`${healthyCount} / ${agents.length}`}
            subtext={`${degradedCount} degraded, ${offlineCount} offline`}
            color="text-brand-green"
            href="/agents"
          />
          <StatCard
            label="Open Incidents"
            value={openIncidents}
            subtext={p1Count > 0 ? `${p1Count} critical P1` : "No critical incidents"}
            color={p1Count > 0 ? "text-brand-red" : "text-brand-text-primary"}
            href="/incidents"
            alert={p1Count > 0}
          />
          <StatCard
            label="Pending Approvals"
            value={pendingApprovals}
            subtext="Awaiting operator review"
            color={pendingApprovals > 5 ? "text-brand-amber" : "text-brand-text-primary"}
            href="/approvals"
          />
          <StatCard
            label="Active Tenants"
            value={activeTenants}
            subtext="On paid subscriptions"
            href="/tenants"
          />
        </div>
      </section>

      {/* Charts row */}
      <section aria-label="Platform metrics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-brand-text-primary">
                Platform QPS
              </h2>
              <p className="text-2xl font-mono font-bold text-brand-electric mt-1">
                {formatQps(21300)}
              </p>
            </div>
            <span className="text-xs text-brand-green font-mono bg-brand-green/10 border border-brand-green/20 rounded px-2 py-1">
              ↑ 8.2%
            </span>
          </div>
          <MetricsChart
            data={QPS_DATA}
            height={90}
            color="#2563EB"
            label="Platform QPS over last 24 hours"
            formatValue={formatQps}
            showGrid
          />
        </div>

        <div className="bg-brand-navy border border-brand-border-default rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-brand-text-primary">
                P95 Latency
              </h2>
              <p className="text-2xl font-mono font-bold text-brand-ocean mt-1">
                2.6ms
              </p>
            </div>
            <span className="text-xs text-brand-green font-mono bg-brand-green/10 border border-brand-green/20 rounded px-2 py-1">
              ↓ 12%
            </span>
          </div>
          <MetricsChart
            data={LATENCY_DATA}
            height={90}
            color="#0EA5E9"
            label="P95 latency over last 24 hours (ms)"
            formatValue={(v) => `${v.toFixed(1)}ms`}
            showGrid
          />
        </div>
      </section>

      {/* Agent fleet by tier */}
      <section aria-label="Agent fleet status by tier">
        <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-4">
          Agent Fleet by Tier
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(["perception", "reasoning", "execution", "self_healing"] as const).map(
            (tier) => {
              const tierAgents = agents.filter((a) => a.tier === tier);
              const healthy = tierAgents.filter((a) => a.status === "healthy").length;
              const total = tierAgents.length;
              const allHealthy = healthy === total;

              return (
                <Link
                  key={tier}
                  href={`/agents?tier=${tier}`}
                  className="bg-brand-navy border border-brand-border-default rounded-lg p-4 hover:border-brand-electric/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <AgentTierBadge tier={tier} size="sm" />
                    <span
                      className={`font-mono text-xs font-bold ${
                        allHealthy ? "text-brand-green" : "text-brand-amber"
                      }`}
                    >
                      {healthy}/{total}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {tierAgents.slice(0, 3).map((agent) => (
                      <div
                        key={agent.agentId}
                        className="flex items-center gap-2"
                      >
                        <StatusDot status={agent.status} size="sm" />
                        <span className="font-mono text-xs text-brand-text-secondary">
                          {agent.displayName}
                        </span>
                      </div>
                    ))}
                    {tierAgents.length > 3 && (
                      <p className="text-2xs text-brand-text-muted pl-4">
                        +{tierAgents.length - 3} more
                      </p>
                    )}
                  </div>
                </Link>
              );
            }
          )}
        </div>
      </section>

      {/* Bottom row: recent incidents + unhealthy agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent open incidents */}
        <section aria-label="Recent open incidents">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider">
              Open Incidents
            </h2>
            <Link
              href="/incidents"
              className="text-xs text-brand-electric hover:text-brand-ocean transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentIncidents.length === 0 ? (
              <div className="bg-brand-navy border border-brand-border-default rounded-lg p-6 text-center">
                <p className="text-brand-green font-mono text-sm">
                  All clear — no open incidents
                </p>
              </div>
            ) : (
              recentIncidents.map((incident) => (
                <Link
                  key={incident.incidentId}
                  href={`/incidents/${incident.incidentId}`}
                  className="block bg-brand-navy border border-brand-border-default rounded-lg p-4 hover:border-brand-electric/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <IncidentBadge severity={incident.severity} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-text-primary font-medium truncate">
                        {incident.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={incident.status} size="sm" showDot={false} />
                        <span className="text-xs text-brand-text-muted">
                          {incident.tenantName}
                        </span>
                        <span className="text-xs text-brand-text-muted">
                          · {formatRelativeTime(incident.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Unhealthy agents */}
        <section aria-label="Agents needing attention">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider">
              Agents Needing Attention
            </h2>
            <Link
              href="/agents"
              className="text-xs text-brand-electric hover:text-brand-ocean transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentAgents.length === 0 ? (
              <div className="bg-brand-navy border border-brand-border-default rounded-lg p-6 text-center">
                <p className="text-brand-green font-mono text-sm">
                  All 24 agents are healthy
                </p>
              </div>
            ) : (
              recentAgents.map((agent) => (
                <Link
                  key={agent.agentId}
                  href={`/agents/${agent.agentId}`}
                  className="flex items-center gap-3 bg-brand-navy border border-brand-border-default rounded-lg p-4 hover:border-brand-electric/40 transition-colors"
                >
                  <StatusDot status={agent.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-sm text-brand-text-primary">
                      {agent.displayName}
                    </p>
                    <p className="text-xs text-brand-text-muted truncate">
                      {agent.description}
                    </p>
                  </div>
                  <AgentTierBadge tier={agent.tier} size="sm" />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* MRR quick stat */}
      <section
        aria-label="Revenue summary"
        className="bg-brand-navy border border-brand-border-default rounded-lg p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-text-muted uppercase tracking-wider font-mono mb-1">
              Monthly Recurring Revenue
            </p>
            <p className="text-3xl font-mono font-bold text-brand-text-primary">
              {formatCurrency(87420)}
            </p>
            <p className="text-sm text-brand-green mt-1 font-mono">
              ↑ {formatPercent(12.4)} MoM growth
            </p>
          </div>
          <Link
            href="/billing"
            className="text-sm text-brand-electric hover:text-brand-ocean transition-colors font-medium"
          >
            View billing →
          </Link>
        </div>
      </section>
    </div>
  );
}
