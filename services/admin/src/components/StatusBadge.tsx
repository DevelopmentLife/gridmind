// =============================================================================
// GridMind Admin — Generic Status Badge Component
// =============================================================================

import type { AgentStatus, DeploymentStatus, TenantStatus } from "@/types";

type StatusVariant = AgentStatus | TenantStatus | DeploymentStatus | string;

interface StatusBadgeProps {
  status: StatusVariant;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; badgeClass: string }
> = {
  // Agent statuses
  healthy: {
    label: "Healthy",
    dotClass: "bg-brand-green",
    badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-brand-amber",
    badgeClass: "bg-brand-amber/10 text-brand-amber border-brand-amber/20",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-brand-red",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
  },
  starting: {
    label: "Starting",
    dotClass: "bg-brand-ocean animate-pulse",
    badgeClass: "bg-brand-ocean/10 text-brand-ocean border-brand-ocean/20",
  },
  error: {
    label: "Error",
    dotClass: "bg-brand-red",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
  },

  // Tenant statuses
  active: {
    label: "Active",
    dotClass: "bg-brand-green",
    badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",
  },
  suspended: {
    label: "Suspended",
    dotClass: "bg-brand-red",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
  },
  trialing: {
    label: "Trialing",
    dotClass: "bg-brand-cyan",
    badgeClass: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20",
  },
  cancelled: {
    label: "Cancelled",
    dotClass: "bg-brand-text-muted",
    badgeClass: "bg-brand-text-muted/10 text-brand-text-muted border-brand-text-muted/20",
  },
  past_due: {
    label: "Past Due",
    dotClass: "bg-brand-amber animate-pulse",
    badgeClass: "bg-brand-amber/10 text-brand-amber border-brand-amber/20",
  },

  // Deployment statuses
  provisioning: {
    label: "Provisioning",
    dotClass: "bg-brand-ocean animate-pulse",
    badgeClass: "bg-brand-ocean/10 text-brand-ocean border-brand-ocean/20",
  },
  running: {
    label: "Running",
    dotClass: "bg-brand-green",
    badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",
  },
  stopped: {
    label: "Stopped",
    dotClass: "bg-brand-text-muted",
    badgeClass: "bg-brand-text-muted/10 text-brand-text-muted border-brand-text-muted/20",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-brand-red",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
  },
  deleting: {
    label: "Deleting",
    dotClass: "bg-brand-red animate-pulse",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
  },
};

const DEFAULT_CONFIG = {
  label: "Unknown",
  dotClass: "bg-brand-text-muted",
  badgeClass: "bg-brand-text-muted/10 text-brand-text-muted border-brand-text-muted/20",
};

export function StatusBadge({
  status,
  size = "md",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
  const sizeClass = size === "sm" ? "text-2xs px-1.5 py-0.5" : "text-xs px-2 py-1";
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={`inline-flex items-center gap-1.5 rounded border font-medium font-mono uppercase tracking-wider ${sizeClass} ${config.badgeClass} ${className}`}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={`rounded-full flex-shrink-0 ${dotSize} ${config.dotClass}`}
        />
      )}
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Standalone status indicator dot (no label)
// ---------------------------------------------------------------------------

interface StatusDotProps {
  status: StatusVariant;
  size?: "sm" | "md" | "lg";
  "data-testid"?: string;
}

export function StatusDot({ status, size = "md", "data-testid": testId }: StatusDotProps) {
  const config = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
  const sizeClass = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  }[size];

  return (
    <span
      role="status"
      aria-label={config.label}
      data-testid={testId}
      className={`inline-block rounded-full flex-shrink-0 ${sizeClass} ${config.dotClass}`}
    />
  );
}
