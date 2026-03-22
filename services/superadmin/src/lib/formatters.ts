// GridMind Superadmin — Formatting utilities

import type {
  AgentStatus,
  AgentTier,
  FlagStatus,
  IncidentSeverity,
  IncidentStatus,
  ServiceStatus,
  TenantStatus,
  TenantTier,
} from "@/types";

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(
  cents: number,
  options: { decimals?: number; compact?: boolean } = {}
): string {
  const { decimals = 0, compact = false } = options;
  const dollars = cents / 100;

  if (compact) {
    if (dollars >= 1_000_000) {
      return `$${(dollars / 1_000_000).toFixed(1)}M`;
    }
    if (dollars >= 1_000) {
      return `$${(dollars / 1_000).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(dollars);
}

export function formatMrr(cents: number): string {
  return formatCurrency(cents, { compact: true });
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function formatNumber(n: number, decimals: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPercent(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

export function formatGb(gb: number): string {
  if (gb < 1) return `${(gb * 1024).toFixed(0)}MB`;
  return `${gb.toFixed(1)}GB`;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatDatetime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(iso);
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Status labels & colors ───────────────────────────────────────────────────

export function tenantStatusLabel(status: TenantStatus): string {
  const labels: Record<TenantStatus, string> = {
    active: "Active",
    suspended: "Suspended",
    churned: "Churned",
    trial: "Trial",
    onboarding: "Onboarding",
  };
  return labels[status] ?? status;
}

export function tenantStatusColor(status: TenantStatus): string {
  const colors: Record<TenantStatus, string> = {
    active: "text-brand-green",
    suspended: "text-brand-amber",
    churned: "text-brand-red",
    trial: "text-brand-ocean",
    onboarding: "text-brand-cyan",
  };
  return colors[status] ?? "text-brand-text-muted";
}

export function tenantTierLabel(tier: TenantTier): string {
  const labels: Record<TenantTier, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
    custom: "Custom",
  };
  return labels[tier] ?? tier;
}

export function tenantTierColor(tier: TenantTier): string {
  const colors: Record<TenantTier, string> = {
    starter: "text-brand-text-secondary",
    professional: "text-brand-ocean",
    enterprise: "text-brand-electric",
    custom: "text-brand-amber",
  };
  return colors[tier] ?? "text-brand-text-secondary";
}

export function serviceStatusLabel(status: ServiceStatus): string {
  const labels: Record<ServiceStatus, string> = {
    healthy: "Healthy",
    degraded: "Degraded",
    down: "Down",
    unknown: "Unknown",
  };
  return labels[status] ?? status;
}

export function serviceStatusColor(status: ServiceStatus): string {
  const colors: Record<ServiceStatus, string> = {
    healthy: "bg-brand-green",
    degraded: "bg-brand-amber",
    down: "bg-brand-red",
    unknown: "bg-brand-text-muted",
  };
  return colors[status] ?? "bg-brand-text-muted";
}

export function agentStatusColor(status: AgentStatus): string {
  const colors: Record<AgentStatus, string> = {
    healthy: "bg-brand-green",
    degraded: "bg-brand-amber",
    offline: "bg-brand-red",
    starting: "bg-brand-ocean",
  };
  return colors[status] ?? "bg-brand-text-muted";
}

export function agentTierLabel(tier: AgentTier): string {
  const labels: Record<AgentTier, string> = {
    perception: "Perception",
    reasoning: "Reasoning",
    execution: "Execution",
    self_healing: "Self-Healing",
    specialized: "Specialized",
  };
  return labels[tier] ?? tier;
}

export function agentTierColor(tier: AgentTier): string {
  const colors: Record<AgentTier, string> = {
    perception: "text-brand-cyan",
    reasoning: "text-brand-ocean",
    execution: "text-brand-green",
    self_healing: "text-brand-red",
    specialized: "text-brand-purple",
  };
  return colors[tier] ?? "text-brand-text-secondary";
}

export function incidentSeverityLabel(severity: IncidentSeverity): string {
  const labels: Record<IncidentSeverity, string> = {
    p1: "P1 — Critical",
    p2: "P2 — High",
    p3: "P3 — Medium",
    p4: "P4 — Low",
  };
  return labels[severity] ?? severity;
}

export function incidentSeverityColor(severity: IncidentSeverity): string {
  const colors: Record<IncidentSeverity, string> = {
    p1: "text-brand-red",
    p2: "text-brand-amber",
    p3: "text-brand-ocean",
    p4: "text-brand-text-secondary",
  };
  return colors[severity] ?? "text-brand-text-secondary";
}

export function incidentSeverityBg(severity: IncidentSeverity): string {
  const colors: Record<IncidentSeverity, string> = {
    p1: "bg-brand-red/20 border-brand-red/40",
    p2: "bg-brand-amber/20 border-brand-amber/40",
    p3: "bg-brand-ocean/20 border-brand-ocean/40",
    p4: "bg-brand-slate border-brand-border-default",
  };
  return colors[severity] ?? "bg-brand-slate border-brand-border-default";
}

export function incidentStatusLabel(status: IncidentStatus): string {
  const labels: Record<IncidentStatus, string> = {
    open: "Open",
    investigating: "Investigating",
    mitigated: "Mitigated",
    resolved: "Resolved",
  };
  return labels[status] ?? status;
}

export function incidentStatusColor(status: IncidentStatus): string {
  const colors: Record<IncidentStatus, string> = {
    open: "text-brand-red",
    investigating: "text-brand-amber",
    mitigated: "text-brand-ocean",
    resolved: "text-brand-green",
  };
  return colors[status] ?? "text-brand-text-secondary";
}

export function flagStatusLabel(status: FlagStatus): string {
  const labels: Record<FlagStatus, string> = {
    enabled: "Enabled",
    disabled: "Disabled",
    partial: "Partial Rollout",
  };
  return labels[status] ?? status;
}

export function flagStatusColor(status: FlagStatus): string {
  const colors: Record<FlagStatus, string> = {
    enabled: "text-brand-green",
    disabled: "text-brand-text-muted",
    partial: "text-brand-amber",
  };
  return colors[status] ?? "text-brand-text-secondary";
}
