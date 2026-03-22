"use client";

interface MetricSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function MetricSparkline({
  data,
  color = "#2563EB",
  height = 32,
  strokeWidth = 1.5,
  className = "",
}: MetricSparklineProps) {
  if (data.length < 2) return null;

  const width = 100;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + ((1 - (value - min) / range) * (height - padding * 2));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const polyline = points.join(" ");

  // Build fill path (close below the sparkline)
  const firstX = padding.toFixed(2);
  const lastX = (padding + (width - padding * 2)).toFixed(2);
  const bottom = (height - padding).toFixed(2);

  const fillPath = `M${firstX},${bottom} L${points.join(" L")} L${lastX},${bottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label="Metric trend sparkline"
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={fillPath}
        fill={`url(#sparkGrad-${color.replace("#", "")})`}
      />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
