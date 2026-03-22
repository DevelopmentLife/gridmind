// =============================================================================
// GridMind Admin — Incident Severity Badge Component
// =============================================================================

import type { IncidentSeverity } from "@/types";

interface IncidentBadgeProps {
  severity: IncidentSeverity;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SEVERITY_CONFIG: Record<
  IncidentSeverity,
  { label: string; description: string; badgeClass: string; pulseClass: string }
> = {
  P1: {
    label: "P1",
    description: "Critical — Service down or data loss",
    badgeClass: "bg-brand-red/20 text-brand-red border-brand-red/40",
    pulseClass: "animate-pulse",
  },
  P2: {
    label: "P2",
    description: "Major — Significant degradation",
    badgeClass: "bg-brand-amber/20 text-brand-amber border-brand-amber/40",
    pulseClass: "",
  },
  P3: {
    label: "P3",
    description: "Minor — Partial degradation",
    badgeClass: "bg-brand-ocean/20 text-brand-ocean border-brand-ocean/40",
    pulseClass: "",
  },
  P4: {
    label: "P4",
    description: "Informational — Monitoring required",
    badgeClass: "bg-brand-text-muted/20 text-brand-text-muted border-brand-text-muted/40",
    pulseClass: "",
  },
};

export function IncidentBadge({ severity, size = "md", className = "" }: IncidentBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  const sizeClass = {
    sm: "text-2xs px-1.5 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  }[size];

  const fontClass = {
    sm: "text-2xs",
    md: "text-xs",
    lg: "text-sm",
  }[size];

  return (
    <span
      role="img"
      aria-label={`Severity ${config.label}: ${config.description}`}
      title={config.description}
      className={`
        inline-flex items-center rounded border font-mono font-bold uppercase tracking-widest
        ${sizeClass} ${fontClass} ${config.badgeClass} ${config.pulseClass} ${className}
      `}
    >
      {config.label}
    </span>
  );
}
