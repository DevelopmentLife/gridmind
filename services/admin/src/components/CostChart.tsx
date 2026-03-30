// =============================================================================
// GridMind Admin — Stacked Area Cost Chart (SVG)
// =============================================================================

"use client";

import { useMemo } from "react";

import type { DailyCost } from "@/types";

interface CostChartProps {
  data: DailyCost[];
  height?: number;
  className?: string;
}

const MODEL_COLORS = {
  haiku: "#06B6D4",
  sonnet: "#2563EB",
  opus: "#8B5CF6",
} as const;

export function CostChart({ data, height = 160, className = "" }: CostChartProps) {
  const width = 400;
  const paddingX = 10;
  const paddingY = 10;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const { haikuPath, sonnetPath, opusPath, maxTotal, labels } = useMemo(() => {
    if (data.length === 0) {
      return { haikuPath: "", sonnetPath: "", opusPath: "", maxTotal: 0, labels: [] };
    }

    const maxTotal = Math.max(...data.map((d) => d.totalCostUsd)) * 1.1 || 1;
    const labels = data.map((d) => d.label);

    function xPos(i: number): number {
      return paddingX + (i / Math.max(data.length - 1, 1)) * chartWidth;
    }

    function yPos(value: number): number {
      return paddingY + ((maxTotal - value) / maxTotal) * chartHeight;
    }

    const baseline = paddingY + chartHeight;

    // Build stacked areas from bottom: haiku, then sonnet on top, then opus on top
    function buildAreaPath(
      getTop: (d: DailyCost) => number,
      getBottom: (d: DailyCost) => number,
    ): string {
      if (data.length === 0) return "";
      const topPoints = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)},${yPos(getTop(d))}`);
      const bottomPoints = [...data]
        .reverse()
        .map((d, i) => `${i === 0 ? "L" : "L"} ${xPos(data.length - 1 - i)},${yPos(getBottom(d))}`);
      return `${topPoints.join(" ")} ${bottomPoints.join(" ")} Z`;
    }

    // Stacked: haiku is bottom layer
    const haikuPath = buildAreaPath(
      (d) => d.haikuCostUsd,
      () => 0,
    );

    // Sonnet stacked on haiku
    const sonnetPath = buildAreaPath(
      (d) => d.haikuCostUsd + d.sonnetCostUsd,
      (d) => d.haikuCostUsd,
    );

    // Opus stacked on sonnet + haiku
    const opusPath = buildAreaPath(
      (d) => d.totalCostUsd,
      (d) => d.haikuCostUsd + d.sonnetCostUsd,
    );

    return { haikuPath, sonnetPath, opusPath, maxTotal, labels };
  }, [data, chartWidth, chartHeight]);

  if (data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Cost chart — no data"
        className={`flex items-center justify-center text-brand-text-muted text-xs font-mono ${className}`}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label="Cost over time stacked area chart"
        role="img"
        className="w-full"
        style={{ height }}
      >
        {/* Grid lines */}
        <g aria-hidden="true">
          {[0.25, 0.5, 0.75].map((fraction) => {
            const y = paddingY + fraction * chartHeight;
            return (
              <line
                key={fraction}
                x1={paddingX}
                y1={y}
                x2={paddingX + chartWidth}
                y2={y}
                stroke="#1E2A3A"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Stacked areas */}
        <path d={haikuPath} fill={MODEL_COLORS.haiku} fillOpacity="0.35" />
        <path d={sonnetPath} fill={MODEL_COLORS.sonnet} fillOpacity="0.35" />
        <path d={opusPath} fill={MODEL_COLORS.opus} fillOpacity="0.35" />
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-1">
        {labels.filter((_, i) => i === 0 || i === labels.length - 1 || i === Math.floor(labels.length / 2)).map((label) => (
          <span key={label} className="text-2xs text-brand-text-muted font-mono">
            {label}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {[
          { label: "Haiku", color: MODEL_COLORS.haiku },
          { label: "Sonnet", color: MODEL_COLORS.sonnet },
          { label: "Opus", color: MODEL_COLORS.opus },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-2xs text-brand-text-muted font-mono">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
