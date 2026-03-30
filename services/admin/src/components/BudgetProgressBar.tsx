// =============================================================================
// GridMind Admin — Budget Progress Bar Component
// =============================================================================

"use client";

import { useMemo } from "react";

import { formatCurrency } from "@/lib/formatters";
import type { BudgetStatus } from "@/types";

interface BudgetProgressBarProps {
  budget: BudgetStatus;
  className?: string;
}

export function BudgetProgressBar({ budget, className = "" }: BudgetProgressBarProps) {
  const { color, zone } = useMemo(() => {
    if (budget.percentUsed >= 80) return { color: "bg-brand-red", zone: "critical" as const };
    if (budget.percentUsed >= 50) return { color: "bg-brand-amber", zone: "warning" as const };
    return { color: "bg-brand-green", zone: "healthy" as const };
  }, [budget.percentUsed]);

  const clampedPercent = Math.min(budget.percentUsed, 100);

  return (
    <div className={className} role="meter" aria-valuenow={budget.percentUsed} aria-valuemin={0} aria-valuemax={100} aria-label="Budget usage">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-brand-text-primary">Budget Status</span>
        <span
          data-testid="budget-amount"
          className={`text-sm font-mono font-semibold ${
            zone === "critical" ? "text-brand-red" : zone === "warning" ? "text-brand-amber" : "text-brand-green"
          }`}
        >
          {formatCurrency(budget.spentUsd)} / {formatCurrency(budget.budgetUsd)}
        </span>
      </div>

      {/* Progress track */}
      <div className="relative h-3 bg-brand-slate rounded-full overflow-hidden" data-testid="budget-track">
        {/* Threshold markers */}
        <div
          className="absolute top-0 bottom-0 w-px bg-brand-amber/40 z-10"
          style={{ left: "50%" }}
          aria-hidden="true"
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-brand-red/40 z-10"
          style={{ left: "80%" }}
          aria-hidden="true"
        />

        {/* Fill */}
        <div
          data-testid="budget-fill"
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-2xs text-brand-text-muted font-mono">
          {budget.percentUsed.toFixed(1)}% used
        </span>
        <span className="text-2xs text-brand-text-muted font-mono">
          {formatCurrency(budget.remainingUsd)} remaining
        </span>
      </div>

      {budget.projectedOverage && (
        <p className="mt-2 text-xs text-brand-amber flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Projected to exceed monthly budget
        </p>
      )}
    </div>
  );
}
