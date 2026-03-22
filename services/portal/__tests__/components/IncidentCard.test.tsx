import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncidentCard } from "@/components/IncidentCard";
import type { Incident } from "@/types";

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, onClick, className, "aria-label": ariaLabel, ...rest }: React.ComponentProps<"button">) => (
      <button onClick={onClick} className={className} aria-label={ariaLabel} {...rest}>
        {children}
      </button>
    ),
  },
}));

const MOCK_INCIDENT: Incident = {
  incidentId: "inc-001",
  title: "High P95 latency on analytics-warehouse",
  description: "Query latency has exceeded 350ms P95 threshold.",
  severity: "high",
  status: "investigating",
  deploymentId: "deploy-002",
  deploymentName: "analytics-warehouse",
  assignedAgent: "sherlock",
  rootCause: null,
  resolution: null,
  openedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  resolvedAt: null,
  updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  timeline: [],
};

describe("IncidentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders incident title", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    expect(screen.getByText("High P95 latency on analytics-warehouse")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    expect(screen.getByText(/Query latency has exceeded/)).toBeInTheDocument();
  });

  it("renders severity badge", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders status label", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    expect(screen.getByText("Investigating")).toBeInTheDocument();
  });

  it("renders deployment name", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    expect(screen.getByText("analytics-warehouse")).toBeInTheDocument();
  });

  it("renders assigned agent name", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    expect(screen.getByText("SHERLOCK")).toBeInTheDocument();
  });

  it("calls onClick with incident ID when clicked", () => {
    const onClick = vi.fn();
    render(<IncidentCard incident={MOCK_INCIDENT} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("inc-001");
  });

  it("has accessible aria-label", () => {
    render(<IncidentCard incident={MOCK_INCIDENT} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("High P95 latency");
  });

  it("shows Resolved text for resolved incidents", () => {
    const resolved: Incident = {
      ...MOCK_INCIDENT,
      status: "resolved",
      resolvedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    render(<IncidentCard incident={resolved} />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("renders critical severity badge with correct style", () => {
    const critical: Incident = { ...MOCK_INCIDENT, severity: "critical" };
    render(<IncidentCard incident={critical} />);
    const badge = screen.getByText("critical");
    expect(badge).toHaveClass("bg-brand-red/20");
  });

  it("renders low severity badge with correct style", () => {
    const low: Incident = { ...MOCK_INCIDENT, severity: "low" };
    render(<IncidentCard incident={low} />);
    const badge = screen.getByText("low");
    expect(badge).toHaveClass("bg-brand-slate");
  });
});
