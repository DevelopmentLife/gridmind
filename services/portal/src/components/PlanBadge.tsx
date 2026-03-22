"use client";

import type { PlanTier } from "@/types";
import { planBg, planLabel } from "@/lib/formatters";

interface PlanBadgeProps {
  plan: PlanTier;
  size?: "sm" | "md" | "lg";
}

export function PlanBadge({ plan, size = "md" }: PlanBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-2xs",
    md: "px-2 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center rounded font-semibold uppercase tracking-wide ${planBg(plan)} ${sizeClasses[size]}`}
      aria-label={`Plan: ${planLabel(plan)}`}
    >
      {planLabel(plan)}
    </span>
  );
}
