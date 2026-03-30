// =============================================================================
// GridMind Admin — Deployments List Page
// =============================================================================

"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatPercent, formatQps } from "@/lib/formatters";
import { MOCK_DEPLOYMENTS } from "@/lib/mock-data";
import { useUiStore } from "@/stores/uiStore";
import type { Deployment } from "@/types";

const ENGINE_LABEL: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  redis: "Redis",
  mongodb: "MongoDB",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "running", label: "Running" },
  { value: "degraded", label: "Degraded" },
  { value: "provisioning", label: "Provisioning" },
  { value: "stopped", label: "Stopped" },
  { value: "failed", label: "Failed" },
];

const ENGINE_OPTIONS = [
  { value: "", label: "All Engines" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "redis", label: "Redis" },
  { value: "mongodb", label: "MongoDB" },
];

function DeploymentRow({ dep }: { dep: Deployment }) {
  return (
    <tr className="border-b border-brand-border-subtle hover:bg-brand-slate/40 transition-colors">
      <td className="px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-brand-text-primary">{dep.name}</p>
          <p className="text-xs text-brand-text-muted font-mono mt-0.5">
            {dep.deploymentId}
          </p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-brand-text-secondary">{dep.tenantName}</p>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={dep.status} size="sm" />
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs font-mono text-brand-text-secondary">
          {ENGINE_LABEL[dep.engine] ?? dep.engine}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs font-mono text-brand-text-secondary">
          {dep.region}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <p className="font-mono text-sm text-brand-text-primary">
          {formatQps(dep.qps)}
        </p>
        <p className="font-mono text-xs text-brand-text-muted">
          {dep.p95LatencyMs}ms p95
        </p>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xs text-brand-text-muted font-mono uppercase">CPU</p>
            <p
              className={`font-mono text-sm ${
                dep.cpuPercent >= 80
                  ? "text-brand-red"
                  : dep.cpuPercent >= 60
                    ? "text-brand-amber"
                    : "text-brand-green"
              }`}
            >
              {formatPercent(dep.cpuPercent, 0)}
            </p>
          </div>
          <div>
            <p className="text-2xs text-brand-text-muted font-mono uppercase">Mem</p>
            <p
              className={`font-mono text-sm ${
                dep.memoryPercent >= 85
                  ? "text-brand-red"
                  : dep.memoryPercent >= 70
                    ? "text-brand-amber"
                    : "text-brand-green"
              }`}
            >
              {formatPercent(dep.memoryPercent, 0)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs text-brand-text-muted">
          {formatDateTime(dep.updatedAt)}
        </span>
      </td>
    </tr>
  );
}

export default function DeploymentsPage() {
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [engineFilter, setEngineFilter] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Deployments" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const filtered = MOCK_DEPLOYMENTS.filter((dep) => {
    const matchesSearch =
      !search ||
      dep.name.toLowerCase().includes(search.toLowerCase()) ||
      dep.tenantName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || dep.status === statusFilter;
    const matchesEngine = !engineFilter || dep.engine === engineFilter;
    return matchesSearch && matchesStatus && matchesEngine;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">Deployments</h1>
        <p className="text-brand-text-secondary text-sm mt-1">
          All agent team deployments across all tenants
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="search" aria-label="Filter deployments">
        <input
          type="search"
          placeholder="Search deployments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search deployments"
          className="bg-brand-navy border border-brand-border-default rounded-md px-4 py-2 text-sm text-brand-text-primary placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-electric min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={engineFilter}
          onChange={(e) => setEngineFilter(e.target.value)}
          aria-label="Filter by engine"
          className="bg-brand-navy border border-brand-border-default rounded-md px-3 py-2 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
        >
          {ENGINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {(search || statusFilter || engineFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatusFilter(""); setEngineFilter(""); }}
            className="text-sm text-brand-text-secondary hover:text-brand-text-primary transition-colors px-3 py-2"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-brand-text-muted self-center font-mono">
          {filtered.length} deployment{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-brand-navy border border-brand-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Deployments list">
            <thead>
              <tr className="border-b border-brand-border-subtle">
                {["Name", "Tenant", "Status", "Engine", "Region", "QPS / Latency", "Resources", "Updated"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-2xs text-brand-text-muted uppercase tracking-wider font-mono font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-brand-text-muted font-mono text-sm">
                    No deployments match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((dep) => <DeploymentRow key={dep.deploymentId} dep={dep} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
