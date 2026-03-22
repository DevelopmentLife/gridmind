import type {
  AgentStatus,
  AgentTier,
  ApprovalRisk,
  DeploymentStatus,
  IncidentSeverity,
  IncidentStatus,
  PlanTier,
} from "@/types";

// ─── Date & time ──────────────────────────────────────────────────────────────

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoString);
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(isoString));
}

export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(isoString));
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatTimeRemaining(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = then - now;

  if (diffMs <= 0) return "expired";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s remaining`;
  if (diffMin < 60) return `${diffMin}m remaining`;
  return `${diffHr}h ${diffMin % 60}m remaining`;
}

// ─── Numbers & metrics ────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatQps(qps: number): string {
  return `${formatNumber(qps)} QPS`;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
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

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

// ─── Status labels & colors ───────────────────────────────────────────────────

export function deploymentStatusLabel(status: DeploymentStatus): string {
  const labels: Record<DeploymentStatus, string> = {
    provisioning: "Provisioning",
    active: "Active",
    degraded: "Degraded",
    critical: "Critical",
    maintenance: "Maintenance",
    terminated: "Terminated",
  };
  return labels[status];
}

export function deploymentStatusColor(status: DeploymentStatus): string {
  const colors: Record<DeploymentStatus, string> = {
    provisioning: "text-brand-ocean",
    active: "text-brand-green",
    degraded: "text-brand-amber",
    critical: "text-brand-red",
    maintenance: "text-brand-text-secondary",
    terminated: "text-brand-text-muted",
  };
  return colors[status];
}

export function deploymentStatusDot(status: DeploymentStatus): string {
  const colors: Record<DeploymentStatus, string> = {
    provisioning: "bg-brand-ocean animate-pulse",
    active: "bg-brand-green",
    degraded: "bg-brand-amber",
    critical: "bg-brand-red animate-pulse",
    maintenance: "bg-brand-text-secondary",
    terminated: "bg-brand-text-muted",
  };
  return colors[status];
}

export function agentStatusColor(status: AgentStatus): string {
  const colors: Record<AgentStatus, string> = {
    healthy: "text-brand-green",
    degraded: "text-brand-amber",
    error: "text-brand-red",
    idle: "text-brand-text-muted",
    processing: "text-brand-ocean",
  };
  return colors[status];
}

export function agentStatusDot(status: AgentStatus): string {
  const colors: Record<AgentStatus, string> = {
    healthy: "bg-brand-green",
    degraded: "bg-brand-amber",
    error: "bg-brand-red animate-pulse",
    idle: "bg-brand-text-muted",
    processing: "bg-brand-ocean animate-pulse",
  };
  return colors[status];
}

export function incidentSeverityColor(severity: IncidentSeverity): string {
  const colors: Record<IncidentSeverity, string> = {
    low: "text-brand-text-secondary",
    medium: "text-brand-amber",
    high: "text-brand-red",
    critical: "text-brand-red",
  };
  return colors[severity];
}

export function incidentSeverityBg(severity: IncidentSeverity): string {
  const colors: Record<IncidentSeverity, string> = {
    low: "bg-brand-slate text-brand-text-secondary",
    medium: "bg-brand-amber/10 text-brand-amber",
    high: "bg-brand-red/10 text-brand-red",
    critical: "bg-brand-red/20 text-brand-red",
  };
  return colors[severity];
}

export function incidentStatusLabel(status: IncidentStatus): string {
  const labels: Record<IncidentStatus, string> = {
    open: "Open",
    investigating: "Investigating",
    mitigating: "Mitigating",
    resolved: "Resolved",
    closed: "Closed",
  };
  return labels[status];
}

export function incidentStatusColor(status: IncidentStatus): string {
  const colors: Record<IncidentStatus, string> = {
    open: "text-brand-red",
    investigating: "text-brand-amber",
    mitigating: "text-brand-ocean",
    resolved: "text-brand-green",
    closed: "text-brand-text-muted",
  };
  return colors[status];
}

export function approvalRiskColor(risk: ApprovalRisk): string {
  const colors: Record<ApprovalRisk, string> = {
    low: "text-brand-green",
    medium: "text-brand-amber",
    high: "text-brand-red",
    critical: "text-brand-red",
  };
  return colors[risk];
}

export function approvalRiskBg(risk: ApprovalRisk): string {
  const colors: Record<ApprovalRisk, string> = {
    low: "bg-brand-green/10 text-brand-green",
    medium: "bg-brand-amber/10 text-brand-amber",
    high: "bg-brand-red/10 text-brand-red",
    critical: "bg-brand-red/20 text-brand-red border border-brand-red/30",
  };
  return colors[risk];
}

export function agentTierColor(tier: AgentTier): string {
  const colors: Record<AgentTier, string> = {
    perception: "text-brand-cyan",
    reasoning: "text-brand-ocean",
    execution: "text-brand-green",
    self_healing: "text-brand-red",
    specialized: "text-brand-purple",
  };
  return colors[tier];
}

export function planLabel(plan: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    starter: "Starter",
    growth: "Growth",
    scale: "Scale",
    enterprise: "Enterprise",
  };
  return labels[plan];
}

export function planColor(plan: PlanTier): string {
  const colors: Record<PlanTier, string> = {
    starter: "text-brand-text-secondary",
    growth: "text-brand-ocean",
    scale: "text-brand-electric",
    enterprise: "text-brand-amber",
  };
  return colors[plan];
}

export function planBg(plan: PlanTier): string {
  const colors: Record<PlanTier, string> = {
    starter: "bg-brand-slate text-brand-text-secondary",
    growth: "bg-brand-ocean/10 text-brand-ocean",
    scale: "bg-brand-electric/10 text-brand-electric",
    enterprise: "bg-brand-amber/10 text-brand-amber",
  };
  return colors[plan];
}

// ─── Engine badges ────────────────────────────────────────────────────────────

export function engineLabel(engine: string): string {
  const labels: Record<string, string> = {
    postgresql: "PostgreSQL",
    mysql: "MySQL",
    redis: "Redis",
    mongodb: "MongoDB",
  };
  return labels[engine] ?? engine;
}

export function engineColor(engine: string): string {
  const colors: Record<string, string> = {
    postgresql: "bg-blue-900/40 text-blue-300",
    mysql: "bg-orange-900/40 text-orange-300",
    redis: "bg-red-900/40 text-red-300",
    mongodb: "bg-green-900/40 text-green-300",
  };
  return colors[engine] ?? "bg-brand-slate text-brand-text-secondary";
}

// ─── Truncation ───────────────────────────────────────────────────────────────

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 1)}…`;
}

export function maskApiKey(prefix: string): string {
  return `${prefix}${"•".repeat(32)}`;
}
