// =============================================================================
// GridMind Admin — Agent Tier Badge Component
// =============================================================================

import type { AgentTier } from "@/types";

interface AgentTierBadgeProps {
  tier: AgentTier;
  size?: "sm" | "md";
  className?: string;
}

const TIER_CONFIG: Record<
  AgentTier,
  { label: string; badgeClass: string; dotClass: string }
> = {
  perception: {
    label: "Perception",
    badgeClass: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20",
    dotClass: "bg-brand-cyan",
  },
  reasoning: {
    label: "Reasoning",
    badgeClass: "bg-brand-electric/10 text-brand-electric border-brand-electric/20",
    dotClass: "bg-brand-electric",
  },
  execution: {
    label: "Execution",
    badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",
    dotClass: "bg-brand-green",
  },
  self_healing: {
    label: "Self-Healing",
    badgeClass: "bg-brand-red/10 text-brand-red border-brand-red/20",
    dotClass: "bg-brand-red",
  },
};

export function AgentTierBadge({ tier, size = "md", className = "" }: AgentTierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeClass = size === "sm" ? "text-2xs px-1.5 py-0.5" : "text-xs px-2 py-1";
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      role="img"
      aria-label={`Tier: ${config.label}`}
      className={`inline-flex items-center gap-1.5 rounded border font-medium font-mono uppercase tracking-wider ${sizeClass} ${config.badgeClass} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`rounded-full flex-shrink-0 ${dotSize} ${config.dotClass}`}
      />
      {config.label}
    </span>
  );
}

/**
 * Returns the color hex for a given tier (for dynamic styling).
 */
export function getTierColor(tier: AgentTier): string {
  const colors: Record<AgentTier, string> = {
    perception: "#06B6D4",
    reasoning: "#2563EB",
    execution: "#10B981",
    self_healing: "#EF4444",
  };
  return colors[tier];
}
