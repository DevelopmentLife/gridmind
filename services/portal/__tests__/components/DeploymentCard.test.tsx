import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeploymentCard } from "@/components/DeploymentCard";
import type { Deployment } from "@/types";

// Framer Motion stub (avoids jsdom animation issues)
vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, onClick, className, "aria-label": ariaLabel, ...rest }: React.ComponentProps<"button">) => (
      <button onClick={onClick} className={className} aria-label={ariaLabel} {...rest}>
        {children}
      </button>
    ),
  },
}));

const MOCK_DEPLOYMENT: Deployment = {
  deploymentId: "deploy-001",
  name: "production-primary",
  engine: "postgresql",
  engineVersion: "16.2",
  status: "active",
  region: "us-east-1",
  instanceType: "db.r7g.2xlarge",
  metrics: {
    qps: 4823,
    p50LatencyMs: 1.8,
    p95LatencyMs: 12.4,
    p99LatencyMs: 48.0,
    activeConnections: 284,
    cpuPercent: 42,
    memoryPercent: 68,
    storageGb: 500,
    storageUsedGb: 187,
  },
  agentCount: 12,
  activeIncidents: 0,
  createdAt: "2025-11-01T09:00:00Z",
  updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
};

describe("DeploymentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders deployment name", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    expect(screen.getByText("production-primary")).toBeInTheDocument();
  });

  it("renders engine badge with version", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    expect(screen.getByText("PostgreSQL 16.2")).toBeInTheDocument();
  });

  it("renders region and instance type", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    expect(screen.getByText(/us-east-1/)).toBeInTheDocument();
    expect(screen.getByText(/db\.r7g\.2xlarge/)).toBeInTheDocument();
  });

  it("shows green status dot for active deployment", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    const dot = screen.getByTestId("status-indicator");
    expect(dot).toHaveClass("bg-brand-green");
  });

  it("shows amber status dot for degraded deployment", () => {
    const degraded: Deployment = { ...MOCK_DEPLOYMENT, status: "degraded" };
    render(<DeploymentCard deployment={degraded} />);
    const dot = screen.getByTestId("status-indicator");
    expect(dot).toHaveClass("bg-brand-amber");
  });

  it("shows red status dot for critical deployment", () => {
    const critical: Deployment = { ...MOCK_DEPLOYMENT, status: "critical" };
    render(<DeploymentCard deployment={critical} />);
    const dot = screen.getByTestId("status-indicator");
    expect(dot).toHaveClass("bg-brand-red");
  });

  it("renders QPS metric", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    expect(screen.getByText("4.8K")).toBeInTheDocument();
  });

  it("renders agent count", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    expect(screen.getByText(/12 agents/)).toBeInTheDocument();
  });

  it("shows active incidents count when > 0", () => {
    const withIncidents: Deployment = { ...MOCK_DEPLOYMENT, activeIncidents: 2 };
    render(<DeploymentCard deployment={withIncidents} />);
    expect(screen.getByText(/2 incidents/)).toBeInTheDocument();
  });

  it("does not show incidents text when 0", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    expect(screen.queryByText(/incident/)).not.toBeInTheDocument();
  });

  it("calls onClick with deployment ID when clicked", () => {
    const onClick = vi.fn();
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("deploy-001");
  });

  it("renders without metrics gracefully", () => {
    const noMetrics: Deployment = { ...MOCK_DEPLOYMENT, metrics: null };
    render(<DeploymentCard deployment={noMetrics} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("has accessible aria-label", () => {
    render(<DeploymentCard deployment={MOCK_DEPLOYMENT} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label");
    expect(btn.getAttribute("aria-label")).toContain("production-primary");
  });
});
