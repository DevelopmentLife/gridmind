// =============================================================================
// GridMind Admin — Formatting Utilities
// =============================================================================

/**
 * Format a number as USD currency.
 */
export function formatCurrency(
  amount: number,
  options?: { compact?: boolean }
): string {
  if (options?.compact) {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with commas (e.g., 1,234,567).
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format bytes into human-readable storage string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeI = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(1024, safeI)).toFixed(1)} ${units[safeI] ?? "B"}`;
}

/**
 * Format gigabytes with unit label.
 */
export function formatGb(gb: number): string {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(1)} TB`;
  }
  return `${gb.toFixed(1)} GB`;
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format latency in milliseconds.
 */
export function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format uptime seconds into human-readable duration.
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

/**
 * Format duration in minutes into human-readable string.
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format an ISO timestamp as a relative time string (e.g., "2 minutes ago").
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(isoTimestamp);
}

/**
 * Format an ISO timestamp as a short date string (e.g., "Mar 21, 2026").
 */
export function formatDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoTimestamp));
}

/**
 * Format an ISO timestamp as a date + time string.
 */
export function formatDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoTimestamp));
}

/**
 * Truncate a string to maxLength characters, appending "..." if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Convert snake_case to Title Case.
 */
export function toTitleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format QPS (queries per second).
 */
export function formatQps(qps: number): string {
  if (qps >= 1000) return `${(qps / 1000).toFixed(1)}K qps`;
  return `${qps.toFixed(0)} qps`;
}

/**
 * Calculate time remaining until a future ISO timestamp.
 */
export function formatTimeRemaining(isoTimestamp: string): string {
  const now = Date.now();
  const target = new Date(isoTimestamp).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) return "expired";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
  return `${diffHour}h ${diffMin % 60}m`;
}
