import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { RevenueMetric } from "@/components/RevenueMetric";
import type {
  Agent,
  Incident,
  PlatformMetrics,
  SystemService,
} from "@/types";
import {
  formatCompact,
  formatLatency,
  formatPercent,
  serviceStatusColor,
  serviceStatusLabel,
} from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Platform Dashboard",
};

// ─── Mock data (replace with real API calls in production) ───────────────────

const MOCK_METRICS: PlatformMetrics = {
  totalTenants: 1247,
  activeTenants: 1089,
  trialTenants: 98,
  suspendedTenants: 12,
  mrr: 48_350_00, // cents
  arr: 580_200_00,
  churnRate: 2.1,
  netRevenueRetention: 118.4,
  avgRevenuePerTenant: 3880_00,
  totalDeployments: 4823,
  totalAgentsRunning: 29_928,
  platformUptime: 99.97,
  openIncidents: 3,
  p1Incidents: 0,
};

const MOCK_SERVICES: SystemService[] = [
  {
    serviceId: "svc-gateway",
    name: "gateway",
    displayName: "API Gateway",
    status: "healthy",
    latencyMs: 24,
    uptimePercent: 99.98,
    lastCheckedAt: new Date(Date.now() - 30_000).toISOString(),
    version: "1.2.0",
    replicas: 3,
    healthyReplicas: 3,
    endpoint: "api.gridmindai.dev",
  },
  {
    serviceId: "svc-cortex",
    name: "cortex",
    displayName: "Cortex (Agents)",
    status: "healthy",
    latencyMs: 12,
    uptimePercent: 99.97,
    lastCheckedAt: new Date(Date.now() - 30_000).toISOString(),
    version: "1.2.0",
    replicas: 6,
    healthyReplicas: 6,
    endpoint: "cortex.internal",
  },
  {
    serviceId: "svc-nats",
    name: "nats",
    displayName: "NATS JetStream",
    status: "healthy",
    latencyMs: 3,
    uptimePercent: 100,
    lastCheckedAt: new Date(Date.now() - 30_000).toISOString(),
    version: "2.10.4",
    replicas: 3,
    healthyReplicas: 3,
    endpoint: "nats.internal:4222",
  },
  {
    serviceId: "svc-db",
    name: "database",
    displayName: "PostgreSQL (Aurora)",
    status: "healthy",
    latencyMs: 8,
    uptimePercent: 99.99,
    lastCheckedAt: new Date(Date.now() - 30_000).toISOString(),
    version: "16.2",
    replicas: 2,
    healthyReplicas: 2,
    endpoint: "aurora.cluster.internal",
  },
];

const MOCK_INCIDENTS: Incident[] = [
  {
    incidentId: "inc-001",
    tenantId: "tenant-abc",
    tenantName: "Acme Corp",
    title: "Elevated query latency on PostgreSQL cluster",
    description: "P99 latency exceeding 500ms threshold for Acme Corp deployment",
    severity: "p2",
    status: "investigating",
    affectedDeploymentId: "deploy-xyz",
    assignedAgentId: "sherlock-abc",
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() - 600_000).toISOString(),
    resolvedAt: null,
    timeToResolutionMs: null,
  },
  {
    incidentId: "inc-002",
    tenantId: "tenant-def",
    tenantName: "TechStart Ltd",
    title: "Connection pool exhaustion warning",
    description: "Connection pool approaching max limits",
    severity: "p3",
    status: "open",
    affectedDeploymentId: "deploy-uvw",
    assignedAgentId: null,
    createdAt: new Date(Date.now() - 1_800_000).toISOString(),
    updatedAt: new Date(Date.now() - 900_000).toISOString(),
    resolvedAt: null,
    timeToResolutionMs: null,
  },
];

const MOCK_TOP_AGENTS: Agent[] = [
  { agentId: "argus-1", agentName: "argus", displayName: "ARGUS", tier: "perception", status: "healthy", model: "claude-haiku-4-5", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 864000, tasksInFlight: 24, totalCyclesCompleted: 125000, lastActionAt: new Date(Date.now() - 5000).toISOString(), errorRate: 0.001, avgCycleMs: 120, autonomyLevel: "autonomous", visibility: "Customer" },
  { agentId: "sherlock-1", agentName: "sherlock", displayName: "SHERLOCK", tier: "reasoning", status: "healthy", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 720000, tasksInFlight: 3, totalCyclesCompleted: 45000, lastActionAt: new Date(Date.now() - 12000).toISOString(), errorRate: 0.003, avgCycleMs: 890, autonomyLevel: "supervised", visibility: "Customer" },
  { agentId: "aegis-1", agentName: "aegis", displayName: "AEGIS", tier: "execution", status: "healthy", model: "claude-sonnet-4-6", tenantId: "platform", tenantName: "Platform", uptimeSeconds: 432000, tasksInFlight: 1, totalCyclesCompleted: 28000, lastActionAt: new Date(Date.now() - 60000).toISOString(), errorRate: 0.0, avgCycleMs: 2100, autonomyLevel: "supervised", visibility: "Customer" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const metrics = MOCK_METRICS;

  return (
    <>
      <TopBar
        title="Platform Dashboard"
        subtitle="Real-time overview of all tenants, revenue, and infrastructure"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Revenue KPIs */}
        <section aria-labelledby="kpi-heading">
          <h2
            id="kpi-heading"
            className="text-brand-text-muted text-xs font-medium uppercase tracking-wide mb-3"
          >
            Revenue & Growth
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueMetric
              label="MRR"
              value={`$${(metrics.mrr / 100 / 1000).toFixed(1)}K`}
              trend={8.2}
              trendLabel="vs last month"
              data-testid="metric-mrr"
            />
            <RevenueMetric
              label="ARR"
              value={`$${(metrics.arr / 100 / 1_000_000).toFixed(2)}M`}
              trend={8.2}
              trendLabel="annualized"
              data-testid="metric-arr"
            />
            <RevenueMetric
              label="Net Revenue Retention"
              value={formatPercent(metrics.netRevenueRetention)}
              trend={2.1}
              trendLabel="vs last quarter"
              data-testid="metric-nrr"
            />
            <RevenueMetric
              label="Monthly Churn"
              value={formatPercent(metrics.churnRate)}
              trend={-0.3}
              trendLabel="vs last month"
              data-testid="metric-churn"
            />
          </div>
        </section>

        {/* Platform KPIs */}
        <section aria-labelledby="platform-kpi-heading">
          <h2
            id="platform-kpi-heading"
            className="text-brand-text-muted text-xs font-medium uppercase tracking-wide mb-3"
          >
            Platform Scale
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueMetric
              label="Total Tenants"
              value={formatCompact(metrics.totalTenants)}
              subvalue={`${metrics.activeTenants} active`}
              sublabel=""
            />
            <RevenueMetric
              label="Deployments"
              value={formatCompact(metrics.totalDeployments)}
            />
            <RevenueMetric
              label="Agents Running"
              value={formatCompact(metrics.totalAgentsRunning)}
            />
            <RevenueMetric
              label="Platform Uptime"
              value={formatPercent(metrics.platformUptime, 2)}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Status */}
          <section
            className="lg:col-span-2"
            aria-labelledby="system-status-heading"
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                id="system-status-heading"
                className="text-brand-text-muted text-xs font-medium uppercase tracking-wide"
              >
                System Status
              </h2>
              <a
                href="/system"
                className="text-brand-amber text-xs hover:text-brand-amber-light transition-colors focus:outline-none focus:underline"
              >
                View all →
              </a>
            </div>

            <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
              {MOCK_SERVICES.map((svc, idx) => (
                <div
                  key={svc.serviceId}
                  className={[
                    "flex items-center gap-4 px-4 py-3",
                    idx !== MOCK_SERVICES.length - 1 &&
                      "border-b border-brand-border-subtle",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={[
                      "w-2 h-2 rounded-full flex-shrink-0",
                      serviceStatusColor(svc.status),
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span className="text-brand-text-primary text-sm font-medium flex-1">
                    {svc.displayName}
                  </span>
                  <span
                    className={[
                      "text-xs",
                      svc.status === "healthy"
                        ? "text-brand-green"
                        : svc.status === "degraded"
                        ? "text-brand-amber"
                        : "text-brand-red",
                    ].join(" ")}
                  >
                    {serviceStatusLabel(svc.status)}
                  </span>
                  <span className="text-brand-text-muted text-xs font-mono w-16 text-right">
                    {formatLatency(svc.latencyMs)}
                  </span>
                  <span className="text-brand-text-muted text-xs font-mono w-16 text-right">
                    {svc.uptimePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Open Incidents */}
          <section aria-labelledby="incidents-heading">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="incidents-heading"
                className="text-brand-text-muted text-xs font-medium uppercase tracking-wide"
              >
                Open Incidents
              </h2>
              <a
                href="/incidents"
                className="text-brand-amber text-xs hover:text-brand-amber-light transition-colors focus:outline-none focus:underline"
              >
                View all →
              </a>
            </div>

            {metrics.openIncidents === 0 ? (
              <div className="bg-brand-navy border border-brand-border-subtle rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <span
                  className="text-brand-green text-2xl mb-2"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <p className="text-brand-text-secondary text-sm">
                  All clear — no open incidents
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {MOCK_INCIDENTS.map((inc) => (
                  <a
                    key={inc.incidentId}
                    href={`/incidents`}
                    className={[
                      "block bg-brand-navy border rounded-xl p-4 transition-colors",
                      "hover:border-brand-amber/40 focus:outline-none focus:ring-2 focus:ring-brand-amber/40",
                      inc.severity === "p1" || inc.severity === "p2"
                        ? "border-brand-red/40"
                        : "border-brand-border-subtle",
                    ].join(" ")}
                    aria-label={`Incident: ${inc.title}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={[
                          "text-2xs font-bold uppercase px-1.5 py-0.5 rounded border",
                          inc.severity === "p1"
                            ? "text-brand-red bg-brand-red/10 border-brand-red/40"
                            : inc.severity === "p2"
                            ? "text-brand-amber bg-brand-amber/10 border-brand-amber/40"
                            : "text-brand-text-muted bg-brand-slate border-brand-border-subtle",
                        ].join(" ")}
                      >
                        {inc.severity.toUpperCase()}
                      </span>
                      <span className="text-brand-text-muted text-2xs capitalize">
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-brand-text-secondary text-xs leading-relaxed line-clamp-2">
                      {inc.title}
                    </p>
                    <p className="text-brand-text-muted text-2xs mt-1.5">
                      {inc.tenantName}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Active Agents Snapshot */}
        <section aria-labelledby="agents-snapshot-heading">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="agents-snapshot-heading"
              className="text-brand-text-muted text-xs font-medium uppercase tracking-wide"
            >
              Agent Fleet Snapshot
            </h2>
            <a
              href="/agents"
              className="text-brand-amber text-xs hover:text-brand-amber-light transition-colors focus:outline-none focus:underline"
            >
              View fleet →
            </a>
          </div>

          <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
            <table className="data-table" aria-label="Agent fleet snapshot">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Tier</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Tasks</th>
                  <th scope="col" className="text-right">Cycles</th>
                  <th scope="col" className="text-right">Avg Cycle</th>
                  <th scope="col" className="text-right">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TOP_AGENTS.map((agent) => (
                  <tr
                    key={agent.agentId}
                    className="border-b border-brand-border-subtle last:border-0 hover:bg-brand-slate/30"
                  >
                    <td className="px-3 py-3">
                      <span className="text-brand-text-primary text-xs font-mono font-semibold">
                        {agent.displayName}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-brand-text-muted text-xs capitalize">
                        {agent.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={[
                            "w-1.5 h-1.5 rounded-full",
                            agent.status === "healthy"
                              ? "bg-brand-green"
                              : agent.status === "degraded"
                              ? "bg-brand-amber"
                              : "bg-brand-red",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                        <span className="text-brand-text-secondary text-xs capitalize">
                          {agent.status}
                        </span>
                      </div>
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
                          agent.errorRate < 0.01
                            ? "text-brand-green"
                            : agent.errorRate < 0.05
                            ? "text-brand-amber"
                            : "text-brand-red",
                        ].join(" ")}
                      >
                        {(agent.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
