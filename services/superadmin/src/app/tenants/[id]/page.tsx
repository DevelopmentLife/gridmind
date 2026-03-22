import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import type { TenantDetail } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatRelative,
  tenantStatusColor,
  tenantStatusLabel,
  tenantTierColor,
  tenantTierLabel,
} from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Tenant Detail",
};

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

// Mock data for demonstration
function getMockTenantDetail(id: string): TenantDetail {
  return {
    tenantId: id,
    name: "Acme Corporation",
    slug: "acme-corp",
    tier: "enterprise",
    status: "active",
    mrr: 1_200_000,
    arr: 14_400_000,
    deploymentCount: 12,
    agentCount: 288,
    ownerEmail: "cto@acme.com",
    ownerName: "Jane Smith",
    createdAt: "2024-01-15T10:00:00Z",
    trialEndsAt: null,
    stripeCustomerId: "cus_acme",
    region: "us-east-1",
    activeIncidents: 1,
    deployments: [
      {
        deploymentId: "dep-001",
        tenantId: id,
        name: "Production PostgreSQL",
        engine: "postgresql",
        status: "healthy",
        region: "us-east-1",
        instanceType: "db.r6g.2xlarge",
        createdAt: "2024-01-16T12:00:00Z",
        lastCheckedAt: new Date(Date.now() - 60_000).toISOString(),
        qps: 1240,
        connectionCount: 145,
        storageGb: 820,
      },
      {
        deploymentId: "dep-002",
        tenantId: id,
        name: "Analytics Redis",
        engine: "redis",
        status: "healthy",
        region: "us-east-1",
        instanceType: "cache.r6g.xlarge",
        createdAt: "2024-02-01T08:00:00Z",
        lastCheckedAt: new Date(Date.now() - 45_000).toISOString(),
        qps: 8920,
        connectionCount: 38,
        storageGb: 64,
      },
    ],
    usageSummary: {
      cpuHours: 4320,
      storageGb: 884,
      apiCalls: 2_450_000,
      agentCycles: 1_890_000,
      period: "2025-03",
    },
    billingHistory: [
      {
        invoiceId: "inv-001",
        tenantId: id,
        amount: 1_200_000,
        status: "paid",
        period: "2025-02",
        paidAt: "2025-03-01T09:00:00Z",
        createdAt: "2025-03-01T00:00:00Z",
      },
      {
        invoiceId: "inv-002",
        tenantId: id,
        amount: 1_200_000,
        status: "paid",
        period: "2025-01",
        paidAt: "2025-02-01T09:00:00Z",
        createdAt: "2025-02-01T00:00:00Z",
      },
    ],
    members: [
      {
        userId: "usr-001",
        email: "cto@acme.com",
        name: "Jane Smith",
        role: "org_owner",
        joinedAt: "2024-01-15T10:00:00Z",
        lastActiveAt: new Date(Date.now() - 3_600_000).toISOString(),
      },
      {
        userId: "usr-002",
        email: "dba@acme.com",
        name: "Tom Lee",
        role: "org_admin",
        joinedAt: "2024-01-20T14:00:00Z",
        lastActiveAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ],
  };
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;
  const tenant = getMockTenantDetail(id);

  return (
    <>
      <TopBar
        title={tenant.name}
        subtitle={`${tenant.slug} · ${tenantTierLabel(tenant.tier)} · ${tenant.region}`}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                "bg-brand-slate border border-brand-border-default",
                tenantTierColor(tenant.tier),
              ].join(" ")}
            >
              {tenantTierLabel(tenant.tier)}
            </span>
            <span
              className={[
                "text-sm",
                tenantStatusColor(tenant.status),
              ].join(" ")}
            >
              {tenantStatusLabel(tenant.status)}
            </span>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "MRR", value: formatCurrency(tenant.mrr), sub: formatCurrency(tenant.arr) + " ARR" },
            { label: "Deployments", value: String(tenant.deploymentCount), sub: `${tenant.agentCount} agents` },
            { label: "Owner", value: tenant.ownerName, sub: tenant.ownerEmail },
            { label: "Member since", value: formatDate(tenant.createdAt), sub: formatRelative(tenant.createdAt) },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-brand-navy border border-brand-border-subtle rounded-xl p-4"
            >
              <p className="text-brand-text-muted text-xs uppercase tracking-wide mb-1.5">
                {card.label}
              </p>
              <p className="text-brand-text-primary font-semibold text-sm">
                {card.value}
              </p>
              <p className="text-brand-text-muted text-xs mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deployments */}
          <section aria-labelledby="deployments-heading">
            <h2
              id="deployments-heading"
              className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
            >
              Deployments
            </h2>
            <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
              {tenant.deployments.map((dep, idx) => (
                <div
                  key={dep.deploymentId}
                  className={[
                    "px-4 py-3",
                    idx !== tenant.deployments.length - 1 &&
                      "border-b border-brand-border-subtle",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "w-1.5 h-1.5 rounded-full",
                          dep.status === "healthy" ? "bg-brand-green" : "bg-brand-amber",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <span className="text-brand-text-primary text-sm font-medium">
                        {dep.name}
                      </span>
                    </div>
                    <span className="text-brand-text-muted text-xs font-mono capitalize">
                      {dep.engine}
                    </span>
                  </div>
                  <div className="flex gap-4 text-2xs text-brand-text-muted">
                    <span>{dep.instanceType}</span>
                    <span>{dep.qps.toLocaleString()} QPS</span>
                    <span>{dep.connectionCount} conns</span>
                    <span>{dep.storageGb}GB</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Team members */}
          <section aria-labelledby="members-heading">
            <h2
              id="members-heading"
              className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
            >
              Team Members
            </h2>
            <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
              {tenant.members.map((member, idx) => (
                <div
                  key={member.userId}
                  className={[
                    "px-4 py-3",
                    idx !== tenant.members.length - 1 &&
                      "border-b border-brand-border-subtle",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-text-primary text-sm font-medium">
                        {member.name}
                      </p>
                      <p className="text-brand-text-muted text-xs">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-2xs bg-brand-slate text-brand-text-secondary border border-brand-border-subtle capitalize">
                        {member.role.replace("_", " ")}
                      </span>
                      <p
                        className="text-brand-text-muted text-2xs mt-1"
                        suppressHydrationWarning
                      >
                        Active {formatRelative(member.lastActiveAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Billing history */}
        <section aria-labelledby="billing-heading">
          <h2
            id="billing-heading"
            className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
          >
            Billing History
          </h2>
          <div className="bg-brand-navy border border-brand-border-subtle rounded-xl overflow-hidden">
            <table className="data-table" aria-label="Tenant billing history">
              <thead>
                <tr>
                  <th scope="col" className="pl-4">Invoice</th>
                  <th scope="col">Period</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col" className="pr-4">Paid</th>
                </tr>
              </thead>
              <tbody>
                {tenant.billingHistory.map((inv) => (
                  <tr
                    key={inv.invoiceId}
                    className="border-b border-brand-border-subtle last:border-0"
                  >
                    <td className="pl-4 px-3 py-3">
                      <span className="text-brand-text-secondary text-xs font-mono">
                        {inv.invoiceId}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-brand-text-secondary text-xs">
                        {inv.period}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={[
                          "text-xs font-medium capitalize",
                          inv.status === "paid" ? "text-brand-green" : "text-brand-amber",
                        ].join(" ")}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-brand-text-primary text-xs font-mono tabular-nums">
                        {formatCurrency(inv.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-3 pr-4">
                      <span className="text-brand-text-muted text-xs">
                        {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Usage summary */}
        <section aria-labelledby="usage-heading">
          <h2
            id="usage-heading"
            className="text-brand-text-muted text-xs uppercase tracking-wide mb-3"
          >
            Usage ({tenant.usageSummary.period})
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "CPU Hours", value: tenant.usageSummary.cpuHours.toLocaleString() },
              { label: "Storage", value: `${tenant.usageSummary.storageGb}GB` },
              { label: "API Calls", value: (tenant.usageSummary.apiCalls / 1_000_000).toFixed(2) + "M" },
              { label: "Agent Cycles", value: (tenant.usageSummary.agentCycles / 1_000_000).toFixed(2) + "M" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-brand-navy border border-brand-border-subtle rounded-xl p-4"
              >
                <p className="text-brand-text-muted text-xs uppercase tracking-wide mb-1.5">
                  {item.label}
                </p>
                <p className="text-brand-text-primary font-mono font-semibold text-lg tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
