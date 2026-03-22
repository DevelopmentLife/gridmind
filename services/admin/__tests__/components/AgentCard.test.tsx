import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AgentCard } from "@/components/AgentCard";
import type { Agent } from "@/types";

const mockAgent: Agent = {
  agentId: "argus-001",
  agentName: "argus",
  displayName: "ARGUS",
  tier: "perception",
  status: "healthy",
  autonomyLevel: "autonomous",
  model: "claude-haiku-4-5",
  visibility: "Customer",
  description: "Workload profiler — monitors QPS, latency, and connection patterns.",
  uptimeSeconds: 86400 * 7,
  tasksInFlight: 3,
  tasksCompletedTotal: 14522,
  errorRatePercent: 0.2,
  avgCycleMs: 850,
  lastActionAt: new Date(Date.now() - 60_000).toISOString(),
  lastHeartbeatAt: new Date(Date.now() - 10_000).toISOString(),
};

describe("AgentCard", () => {
  it("renders agent display name", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("ARGUS")).toBeInTheDocument();
  });

  it("renders agent description", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(
      screen.getByText(/Workload profiler/i)
    ).toBeInTheDocument();
  });

  it("renders tasks in flight", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows healthy status indicator", () => {
    render(<AgentCard agent={mockAgent} />);
    const indicator = screen.getByTestId("status-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain("bg-brand-green");
  });

  it("shows perception tier badge", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("Perception")).toBeInTheDocument();
  });

  it("shows model label", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText("Haiku 4.5")).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<AgentCard agent={mockAgent} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("argus-001");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Enter key is pressed", () => {
    const onClick = vi.fn();
    render(<AgentCard agent={mockAgent} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledWith("argus-001");
  });

  it("calls onClick when Space key is pressed", () => {
    const onClick = vi.fn();
    render(<AgentCard agent={mockAgent} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(onClick).toHaveBeenCalledWith("argus-001");
  });

  it("does not crash when onClick is not provided", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(() =>
      fireEvent.click(screen.getByRole("button"))
    ).not.toThrow();
  });

  it("applies reduced opacity for offline agents", () => {
    const offlineAgent: Agent = {
      ...mockAgent,
      status: "offline",
      tasksInFlight: 0,
      uptimeSeconds: 0,
    };
    render(<AgentCard agent={offlineAgent} />);
    const article = screen.getByRole("button");
    expect(article.className).toContain("opacity-60");
  });

  it("has correct aria-label with agent name, tier, and status", () => {
    render(<AgentCard agent={mockAgent} />);
    const article = screen.getByRole("button");
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("ARGUS"));
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("perception"));
    expect(article).toHaveAttribute("aria-label", expect.stringContaining("healthy"));
  });

  it("is keyboard focusable with tabIndex=0", () => {
    render(<AgentCard agent={mockAgent} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });

  it("shows error rate in red when above 5%", () => {
    const highErrorAgent: Agent = {
      ...mockAgent,
      errorRatePercent: 8.0,
    };
    render(<AgentCard agent={highErrorAgent} />);
    const errorRateEl = screen.getByText("8.0%");
    expect(errorRateEl.className).toContain("text-brand-red");
  });

  it("shows error rate in amber when between 2-5%", () => {
    const midErrorAgent: Agent = {
      ...mockAgent,
      errorRatePercent: 3.0,
    };
    render(<AgentCard agent={midErrorAgent} />);
    const errorRateEl = screen.getByText("3.0%");
    expect(errorRateEl.className).toContain("text-brand-amber");
  });

  it("does not show supervised indicator for autonomous agents", () => {
    const { container } = render(<AgentCard agent={mockAgent} />);
    // The amber dot for supervised is shown conditionally
    const supervisedDot = container.querySelector('[aria-label="Supervised autonomy — requires human approval for actions"]');
    expect(supervisedDot).not.toBeInTheDocument();
  });

  it("shows supervised indicator for supervised agents", () => {
    const supervisedAgent: Agent = {
      ...mockAgent,
      autonomyLevel: "supervised",
    };
    render(<AgentCard agent={supervisedAgent} />);
    expect(
      screen.getByLabelText(/Supervised autonomy/i)
    ).toBeInTheDocument();
  });

  it("applies additional className", () => {
    render(<AgentCard agent={mockAgent} className="custom-class" />);
    expect(screen.getByRole("button").className).toContain("custom-class");
  });
});
