// =============================================================================
// GridMind Admin — Simple SVG Line Chart Component
// =============================================================================

"use client";

import { useMemo } from "react";

interface DataPoint {
  label: string;
  value: number;
  timestamp?: string;
}

interface MetricsChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fillColor?: string;
  label?: string;
  formatValue?: (value: number) => string;
  showGrid?: boolean;
  showDots?: boolean;
  className?: string;
}

export function MetricsChart({
  data,
  height = 80,
  color = "#2563EB",
  fillColor,
  label,
  formatValue = (v) => v.toFixed(0),
  showGrid = true,
  showDots = false,
  className = "",
}: MetricsChartProps) {
  const width = 300;
  const paddingX = 8;
  const paddingY = 8;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const { points, pathD, fillD, minVal, maxVal } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], pathD: "", fillD: "", minVal: 0, maxVal: 0 };
    }

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => {
      const x = paddingX + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const y = paddingY + ((maxVal - d.value) / range) * chartHeight;
      return { x, y, ...d };
    });

    // Build smooth SVG path using cubic bezier curves
    let pathD = "";
    if (points.length > 0) {
      const firstPoint = points[0];
      if (firstPoint) {
        pathD = `M ${firstPoint.x},${firstPoint.y}`;
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          if (prev && curr) {
            const cpx = (prev.x + curr.x) / 2;
            pathD += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
          }
        }
      }
    }

    // Build fill path (close to bottom)
    const lastPoint = points[points.length - 1];
    const firstPointFill = points[0];
    const fillD =
      points.length > 0 && lastPoint && firstPointFill
        ? `${pathD} L ${lastPoint.x},${paddingY + chartHeight} L ${firstPointFill.x},${paddingY + chartHeight} Z`
        : "";

    return { points, pathD, fillD, minVal, maxVal };
  }, [data, chartWidth, chartHeight]);

  const gradientId = `chart-gradient-${label?.replace(/\s+/g, "-") ?? "default"}`;
  const fillOpacity = fillColor ? "0.15" : "0.08";

  if (data.length === 0) {
    return (
      <div
        role="img"
        aria-label={`${label ?? "Metrics"} chart — no data`}
        className={`flex items-center justify-center text-brand-text-muted text-xs font-mono ${className}`}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} aria-label={label}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor ?? color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={fillColor ?? color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && (
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
        )}

        {/* Fill area */}
        {fillD && (
          <path
            d={fillD}
            fill={`url(#${gradientId})`}
            aria-hidden="true"
          />
        )}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />

        {/* Dots */}
        {showDots &&
          points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              aria-hidden="true"
            />
          ))}
      </svg>

      {/* Min/max labels */}
      {data.length > 1 && (
        <div className="flex justify-between mt-1">
          <span className="font-mono text-2xs text-brand-text-muted">
            {formatValue(minVal)}
          </span>
          <span className="font-mono text-2xs text-brand-text-muted">
            {formatValue(maxVal)}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline — ultra-compact inline chart
// ---------------------------------------------------------------------------

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#2563EB",
  label,
}: SparklineProps) {
  const pathD = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const xStep = width / (data.length - 1);
    const pad = 2;

    return data
      .map((val, i) => {
        const x = i * xStep;
        const y = pad + ((max - val) / range) * (height - pad * 2);
        return `${i === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  }, [data, width, height]);

  return (
    <svg
      width={width}
      height={height}
      aria-label={label}
      role={label ? "img" : undefined}
      aria-hidden={!label}
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
