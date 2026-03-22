import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatMrr,
  formatNumber,
  formatCompact,
  formatPercent,
  formatLatency,
  formatBytes,
  formatGb,
  formatDate,
  formatRelative,
  formatUptime,
  tenantStatusLabel,
  tenantStatusColor,
  tenantTierLabel,
  tenantTierColor,
  serviceStatusLabel,
  serviceStatusColor,
  agentStatusColor,
  agentTierLabel,
  agentTierColor,
  incidentSeverityLabel,
  incidentSeverityColor,
  incidentSeverityBg,
  incidentStatusLabel,
  incidentStatusColor,
  flagStatusLabel,
  flagStatusColor,
} from "@/lib/formatters";

describe("formatCurrency", () => {
  it("formats cents to dollars with no decimals by default", () => {
    expect(formatCurrency(120_000)).toBe("$1,200");
  });

  it("formats with decimals", () => {
    expect(formatCurrency(100_050, { decimals: 2 })).toBe("$1,000.50");
  });

  it("formats compact millions", () => {
    expect(formatCurrency(500_000_000, { compact: true })).toBe("$5.0M");
  });

  it("formats compact thousands", () => {
    expect(formatCurrency(500_000, { compact: true })).toBe("$5.0K");
  });

  it("formats small amount without compact suffix", () => {
    expect(formatCurrency(99_00, { compact: true })).toBe("$99");
  });
});

describe("formatMrr", () => {
  it("uses compact formatting", () => {
    expect(formatMrr(2_000_000_00)).toBe("$2.0M");
  });

  it("handles thousands", () => {
    expect(formatMrr(50_000_00)).toBe("$500.0K");
  });
});

describe("formatNumber", () => {
  it("formats with thousands separator", () => {
    expect(formatNumber(1_247)).toBe("1,247");
  });

  it("formats with decimals", () => {
    expect(formatNumber(3.14159, 2)).toBe("3.14");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatCompact", () => {
  it("formats millions", () => {
    expect(formatCompact(2_500_000)).toBe("2.5M");
  });

  it("formats thousands", () => {
    expect(formatCompact(4_800)).toBe("4.8K");
  });

  it("returns string for small numbers", () => {
    expect(formatCompact(42)).toBe("42");
  });
});

describe("formatPercent", () => {
  it("formats with one decimal by default", () => {
    expect(formatPercent(99.97)).toBe("99.97%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercent(2.1, 1)).toBe("2.1%");
  });

  it("formats zero percent", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatLatency", () => {
  it("formats microseconds", () => {
    expect(formatLatency(0.5)).toBe("500μs");
  });

  it("formats milliseconds", () => {
    expect(formatLatency(24)).toBe("24ms");
  });

  it("formats seconds", () => {
    expect(formatLatency(1500)).toBe("1.50s");
  });

  it("formats exactly 1ms", () => {
    expect(formatLatency(1)).toBe("1ms");
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.00GB");
  });
});

describe("formatGb", () => {
  it("formats GB for values >= 1", () => {
    expect(formatGb(2.5)).toBe("2.5GB");
  });

  it("formats MB for values < 1", () => {
    expect(formatGb(0.5)).toBe("512MB");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2024-01-15T10:00:00Z");
    // Just verify it contains the year — locale-specific
    expect(result).toContain("2024");
  });
});

describe("formatRelative", () => {
  it("shows seconds ago for very recent", () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelative(recent)).toBe("30s ago");
  });

  it("shows minutes ago", () => {
    const mins = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelative(mins)).toBe("5m ago");
  });

  it("shows hours ago", () => {
    const hours = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(formatRelative(hours)).toBe("3h ago");
  });

  it("shows days ago", () => {
    const days = new Date(Date.now() - 15 * 86_400_000).toISOString();
    expect(formatRelative(days)).toBe("15d ago");
  });

  it("falls back to date format for old dates", () => {
    const old = "2024-01-01T00:00:00Z";
    const result = formatRelative(old);
    expect(result).toContain("2024");
  });
});

describe("formatUptime", () => {
  it("formats days and hours", () => {
    expect(formatUptime(90000)).toBe("1d 1h");
  });

  it("formats hours and minutes", () => {
    expect(formatUptime(3661)).toBe("1h 1m");
  });

  it("formats minutes only", () => {
    expect(formatUptime(120)).toBe("2m");
  });

  it("formats zero as 0m", () => {
    expect(formatUptime(0)).toBe("0m");
  });
});

describe("tenantStatusLabel", () => {
  it.each([
    ["active", "Active"],
    ["suspended", "Suspended"],
    ["churned", "Churned"],
    ["trial", "Trial"],
    ["onboarding", "Onboarding"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(tenantStatusLabel(status)).toBe(expected);
  });
});

describe("tenantStatusColor", () => {
  it("returns green for active", () => {
    expect(tenantStatusColor("active")).toBe("text-brand-green");
  });

  it("returns amber for suspended", () => {
    expect(tenantStatusColor("suspended")).toBe("text-brand-amber");
  });

  it("returns red for churned", () => {
    expect(tenantStatusColor("churned")).toBe("text-brand-red");
  });

  it("returns ocean for trial", () => {
    expect(tenantStatusColor("trial")).toBe("text-brand-ocean");
  });

  it("returns cyan for onboarding", () => {
    expect(tenantStatusColor("onboarding")).toBe("text-brand-cyan");
  });
});

describe("tenantTierLabel", () => {
  it.each([
    ["starter", "Starter"],
    ["professional", "Professional"],
    ["enterprise", "Enterprise"],
    ["custom", "Custom"],
  ] as const)("maps %s to %s", (tier, expected) => {
    expect(tenantTierLabel(tier)).toBe(expected);
  });
});

describe("tenantTierColor", () => {
  it("returns electric for enterprise", () => {
    expect(tenantTierColor("enterprise")).toBe("text-brand-electric");
  });

  it("returns amber for custom", () => {
    expect(tenantTierColor("custom")).toBe("text-brand-amber");
  });

  it("returns ocean for professional", () => {
    expect(tenantTierColor("professional")).toBe("text-brand-ocean");
  });
});

describe("serviceStatusLabel", () => {
  it.each([
    ["healthy", "Healthy"],
    ["degraded", "Degraded"],
    ["down", "Down"],
    ["unknown", "Unknown"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(serviceStatusLabel(status)).toBe(expected);
  });
});

describe("serviceStatusColor", () => {
  it("returns green for healthy", () => {
    expect(serviceStatusColor("healthy")).toBe("bg-brand-green");
  });

  it("returns amber for degraded", () => {
    expect(serviceStatusColor("degraded")).toBe("bg-brand-amber");
  });

  it("returns red for down", () => {
    expect(serviceStatusColor("down")).toBe("bg-brand-red");
  });

  it("returns muted for unknown", () => {
    expect(serviceStatusColor("unknown")).toBe("bg-brand-text-muted");
  });
});

describe("agentStatusColor", () => {
  it("returns green for healthy", () => {
    expect(agentStatusColor("healthy")).toBe("bg-brand-green");
  });

  it("returns amber for degraded", () => {
    expect(agentStatusColor("degraded")).toBe("bg-brand-amber");
  });

  it("returns red for offline", () => {
    expect(agentStatusColor("offline")).toBe("bg-brand-red");
  });

  it("returns ocean for starting", () => {
    expect(agentStatusColor("starting")).toBe("bg-brand-ocean");
  });
});

describe("agentTierLabel", () => {
  it.each([
    ["perception", "Perception"],
    ["reasoning", "Reasoning"],
    ["execution", "Execution"],
    ["self_healing", "Self-Healing"],
    ["specialized", "Specialized"],
  ] as const)("maps %s to %s", (tier, expected) => {
    expect(agentTierLabel(tier)).toBe(expected);
  });
});

describe("agentTierColor", () => {
  it("returns cyan for perception", () => {
    expect(agentTierColor("perception")).toBe("text-brand-cyan");
  });

  it("returns green for execution", () => {
    expect(agentTierColor("execution")).toBe("text-brand-green");
  });

  it("returns red for self_healing", () => {
    expect(agentTierColor("self_healing")).toBe("text-brand-red");
  });
});

describe("incidentSeverityLabel", () => {
  it.each([
    ["p1", "P1 — Critical"],
    ["p2", "P2 — High"],
    ["p3", "P3 — Medium"],
    ["p4", "P4 — Low"],
  ] as const)("maps %s to %s", (sev, expected) => {
    expect(incidentSeverityLabel(sev)).toBe(expected);
  });
});

describe("incidentSeverityColor", () => {
  it("returns red for p1", () => {
    expect(incidentSeverityColor("p1")).toBe("text-brand-red");
  });

  it("returns amber for p2", () => {
    expect(incidentSeverityColor("p2")).toBe("text-brand-amber");
  });

  it("returns ocean for p3", () => {
    expect(incidentSeverityColor("p3")).toBe("text-brand-ocean");
  });

  it("returns muted for p4", () => {
    expect(incidentSeverityColor("p4")).toBe("text-brand-text-secondary");
  });
});

describe("incidentSeverityBg", () => {
  it("contains red for p1", () => {
    expect(incidentSeverityBg("p1")).toContain("brand-red");
  });

  it("contains amber for p2", () => {
    expect(incidentSeverityBg("p2")).toContain("brand-amber");
  });

  it("contains slate for p4", () => {
    expect(incidentSeverityBg("p4")).toContain("brand-slate");
  });
});

describe("incidentStatusLabel", () => {
  it.each([
    ["open", "Open"],
    ["investigating", "Investigating"],
    ["mitigated", "Mitigated"],
    ["resolved", "Resolved"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(incidentStatusLabel(status)).toBe(expected);
  });
});

describe("incidentStatusColor", () => {
  it("returns red for open", () => {
    expect(incidentStatusColor("open")).toBe("text-brand-red");
  });

  it("returns green for resolved", () => {
    expect(incidentStatusColor("resolved")).toBe("text-brand-green");
  });
});

describe("flagStatusLabel", () => {
  it.each([
    ["enabled", "Enabled"],
    ["disabled", "Disabled"],
    ["partial", "Partial Rollout"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(flagStatusLabel(status)).toBe(expected);
  });
});

describe("flagStatusColor", () => {
  it("returns green for enabled", () => {
    expect(flagStatusColor("enabled")).toBe("text-brand-green");
  });

  it("returns muted for disabled", () => {
    expect(flagStatusColor("disabled")).toBe("text-brand-text-muted");
  });

  it("returns amber for partial", () => {
    expect(flagStatusColor("partial")).toBe("text-brand-amber");
  });
});
