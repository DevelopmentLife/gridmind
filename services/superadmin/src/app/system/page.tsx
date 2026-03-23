import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { SystemServiceCard } from "@/components/SystemServiceCard";
import type { SystemHealthSnapshot } from "@/types";
import { formatBytes, formatLatency, formatNumber, formatPercent } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "System Health",
};

const MOCK_SNAPSHOT: SystemHealthSnapshot = {
  collectedAt: new Date(Date.now() - 30_000).toISOString(),
  services: [
    { serviceId: "svc-gateway", name: "gateway", displayName: "API Gateway", status: "healthy", latencyMs: 24, uptimePercent: 99.98, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.2.0", replicas: 3, healthyReplicas: 3, endpoint: "api.gridmindai.dev" },
    { serviceId: "svc-cortex", name: "cortex", displayName: "Cortex Runtime", status: "healthy", latencyMs: 12, uptimePercent: 99.97, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.2.0", replicas: 6, healthyReplicas: 6, endpoint: "cortex.internal:9090" },
    { serviceId: "svc-admin", name: "admin", displayName: "Admin Dashboard", status: "healthy", latencyMs: 45, uptimePercent: 99.95, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.2.0", replicas: 2, healthyReplicas: 2, endpoint: "admin.gridmindai.dev" },
    { serviceId: "svc-portal", name: "portal", displayName: "Customer Portal", status: "healthy", latencyMs: 38, uptimePercent: 99.97, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.2.0", replicas: 4, healthyReplicas: 4, endpoint: "app.gridmindai.dev" },
    { serviceId: "svc-vault", name: "vault", displayName: "HashiCorp Vault", status: "healthy", latencyMs: 6, uptimePercent: 100, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "1.15.4", replicas: 3, healthyReplicas: 3, endpoint: "vault.internal:8200" },
    { serviceId: "svc-nats", name: "nats", displayName: "NATS JetStream", status: "healthy", latencyMs: 3, uptimePercent: 100, lastCheckedAt: new Date(Date.now() - 30_000).toISOString(), version: "2.10.4", replicas: 3, healthyReplicas: 3, endpoint: "nats.internal:4222" },
  ],
  nats: {
    connections: 1847,
    subscriptions: 28_920,
    messagesPerSec: 48_200,
    bytesPerSec: 12_400_000,
    jetStreamStreams: 24,
    jetStreamConsumers: 1_247,
    pendingMessages: 84,
  },
  database: {
    activeConnections: 842,
    maxConnections: 2000,
    queryLatencyP50Ms: 4.2,
    queryLatencyP99Ms: 48,
    replicationLagMs: 12,
    sizeGb: 2840,
    tablesCount: 48,
    slowQueriesCount: 2,
  },
  redis: {
    connectedClients: 312,
    usedMemoryMb: 6_840,
    maxMemoryMb: 16_384,
    hitRate: 94.8,
    opsPerSec: 182_000,
    evictedKeys: 0,
  },
};

export default function SystemPage() {
  const { services, nats, database, redis } = MOCK_SNAPSHOT;
  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const dbConnectionPct = (database.activeConnections / database.maxConnections) * 100;
  const redisMemoryPct = (redis.usedMemoryMb / redis.maxMemoryMb) * 100;

  return (
    <>
      <TopBar
        title="System Health"
        subtitle={`${healthyCount}/${services.length} services healthy`}
      />

      <div className="p-6 space-y-6">
        {/* Services grid */}
        <section aria-labelledby="services-heading">
          <h2
            id="services-heading"
            className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
          >
            Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <SystemServiceCard key={svc.serviceId} service={svc} />
            ))}
          </div>
        </section>

        {/* Infrastructure metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NATS */}
          <section
            className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
            aria-labelledby="nats-heading"
          >
            <h2
              id="nats-heading"
              className="text-brand-text-primary text-sm font-semibold mb-4"
            >
              NATS JetStream
            </h2>
            <dl className="space-y-2.5">
              {[
                { label: "Connections", value: formatNumber(nats.connections) },
                { label: "Subscriptions", value: formatNumber(nats.subscriptions) },
                { label: "Messages/sec", value: formatNumber(nats.messagesPerSec) },
                { label: "Throughput", value: formatBytes(nats.bytesPerSec) + "/s" },
                { label: "Streams", value: String(nats.jetStreamStreams) },
                { label: "Consumers", value: formatNumber(nats.jetStreamConsumers) },
                { label: "Pending", value: formatNumber(nats.pendingMessages) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-brand-text-muted text-xs">{label}</dt>
                  <dd className="text-brand-text-primary text-xs font-mono font-medium tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* PostgreSQL */}
          <section
            className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
            aria-labelledby="db-heading"
          >
            <h2
              id="db-heading"
              className="text-brand-text-primary text-sm font-semibold mb-4"
            >
              PostgreSQL (Aurora)
            </h2>
            <dl className="space-y-2.5">
              {[
                { label: "Active Connections", value: `${database.activeConnections} / ${database.maxConnections}` },
                { label: "Connection Usage", value: formatPercent(dbConnectionPct), highlight: dbConnectionPct > 80 ? "amber" : "green" },
                { label: "Query P50", value: formatLatency(database.queryLatencyP50Ms) },
                { label: "Query P99", value: formatLatency(database.queryLatencyP99Ms), highlight: database.queryLatencyP99Ms > 100 ? "amber" : "green" },
                { label: "Replication Lag", value: formatLatency(database.replicationLagMs) },
                { label: "Total Size", value: `${database.sizeGb}GB` },
                { label: "Tables", value: String(database.tablesCount) },
                { label: "Slow Queries", value: String(database.slowQueriesCount), highlight: database.slowQueriesCount > 0 ? "amber" : "green" },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-brand-text-muted text-xs">{label}</dt>
                  <dd
                    className={[
                      "text-xs font-mono font-medium tabular-nums",
                      highlight === "amber"
                        ? "text-brand-amber"
                        : highlight === "green"
                        ? "text-brand-green"
                        : "text-brand-text-primary",
                    ].join(" ")}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Redis */}
          <section
            className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
            aria-labelledby="redis-heading"
          >
            <h2
              id="redis-heading"
              className="text-brand-text-primary text-sm font-semibold mb-4"
            >
              Redis (ElastiCache)
            </h2>
            <dl className="space-y-2.5">
              {[
                { label: "Connected Clients", value: String(redis.connectedClients) },
                { label: "Memory Used", value: `${redis.usedMemoryMb}MB / ${redis.maxMemoryMb}MB` },
                { label: "Memory Usage", value: formatPercent(redisMemoryPct), highlight: redisMemoryPct > 80 ? "amber" : "green" },
                { label: "Hit Rate", value: formatPercent(redis.hitRate), highlight: redis.hitRate > 90 ? "green" : "amber" },
                { label: "Ops/sec", value: formatNumber(redis.opsPerSec) },
                { label: "Evicted Keys", value: String(redis.evictedKeys), highlight: redis.evictedKeys > 0 ? "amber" : "green" },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-brand-text-muted text-xs">{label}</dt>
                  <dd
                    className={[
                      "text-xs font-mono font-medium tabular-nums",
                      highlight === "amber"
                        ? "text-brand-amber"
                        : highlight === "green"
                        ? "text-brand-green"
                        : "text-brand-text-primary",
                    ].join(" ")}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
