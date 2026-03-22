"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

interface RevenueMetricProps {
  label: string;
  value: string;
  trend?: number; // percentage change, positive = up, negative = down
  trendLabel?: string;
  subvalue?: string;
  sublabel?: string;
  className?: string;
  "data-testid"?: string;
}

export function RevenueMetric({
  label,
  value,
  trend,
  trendLabel,
  subvalue,
  sublabel,
  className,
  "data-testid": testId,
}: RevenueMetricProps) {
  const hasTrend = trend !== undefined;
  const trendUp = hasTrend && trend > 0;
  const trendDown = hasTrend && trend < 0;
  const trendFlat = hasTrend && trend === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "bg-brand-navy border border-brand-border-subtle rounded-xl p-5",
        "hover:border-brand-amber/30 transition-colors",
        className
      )}
      data-testid={testId}
    >
      {/* Label */}
      <p className="text-brand-text-muted text-xs font-medium uppercase tracking-wide mb-2">
        {label}
      </p>

      {/* Main value */}
      <p className="text-brand-text-primary font-bold text-3xl font-mono tabular-nums leading-none mb-1">
        {value}
      </p>

      {/* Trend */}
      {hasTrend && (
        <div
          className={clsx(
            "flex items-center gap-1.5 text-sm font-medium mt-2",
            trendUp && "text-brand-green",
            trendDown && "text-brand-red",
            trendFlat && "text-brand-text-muted"
          )}
          aria-label={`Trend: ${trendUp ? "up" : trendDown ? "down" : "flat"} ${Math.abs(trend)}%`}
        >
          {/* Arrow */}
          {trendUp && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {trendDown && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {trendFlat && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          <span>
            {trendFlat ? "0%" : `${trendUp ? "+" : ""}${trend.toFixed(1)}%`}
          </span>
          {trendLabel && (
            <span className="text-brand-text-muted text-xs font-normal">
              {trendLabel}
            </span>
          )}
        </div>
      )}

      {/* Sub-value */}
      {subvalue && (
        <div className="mt-3 pt-3 border-t border-brand-border-subtle">
          <span className="text-brand-text-muted text-xs">
            {sublabel && `${sublabel}: `}
          </span>
          <span className="text-brand-text-secondary text-sm font-mono font-medium">
            {subvalue}
          </span>
        </div>
      )}
    </motion.div>
  );
}
