import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { StatusBadge, StatusDot } from "@/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders healthy status with correct label", () => {
    render(<StatusBadge status="healthy" />);
    expect(screen.getByRole("status")).toHaveTextContent("Healthy");
  });

  it("renders degraded status with correct label", () => {
    render(<StatusBadge status="degraded" />);
    expect(screen.getByRole("status")).toHaveTextContent("Degraded");
  });

  it("renders offline status", () => {
    render(<StatusBadge status="offline" />);
    expect(screen.getByRole("status")).toHaveTextContent("Offline");
  });

  it("renders active tenant status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByRole("status")).toHaveTextContent("Active");
  });

  it("renders past_due status", () => {
    render(<StatusBadge status="past_due" />);
    expect(screen.getByRole("status")).toHaveTextContent("Past Due");
  });

  it("renders trialing status", () => {
    render(<StatusBadge status="trialing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Trialing");
  });

  it("renders suspended status", () => {
    render(<StatusBadge status="suspended" />);
    expect(screen.getByRole("status")).toHaveTextContent("Suspended");
  });

  it("includes aria-label with full status description", () => {
    render(<StatusBadge status="healthy" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Status: Healthy");
  });

  it("hides dot when showDot is false", () => {
    const { container } = render(<StatusBadge status="healthy" showDot={false} />);
    const dot = container.querySelector(".rounded-full");
    expect(dot).not.toBeInTheDocument();
  });

  it("shows dot by default", () => {
    const { container } = render(<StatusBadge status="healthy" />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it("applies sm size class", () => {
    render(<StatusBadge status="healthy" size="sm" />);
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("text-2xs");
  });

  it("applies md size class by default", () => {
    render(<StatusBadge status="healthy" />);
    const badge = screen.getByRole("status");
    expect(badge.className).toContain("text-xs");
  });

  it("renders unknown status with fallback", () => {
    render(<StatusBadge status="unknown_status_xyz" />);
    expect(screen.getByRole("status")).toHaveTextContent("Unknown");
  });

  it("applies additional className", () => {
    render(<StatusBadge status="healthy" className="test-class" />);
    expect(screen.getByRole("status").className).toContain("test-class");
  });
});

describe("StatusDot", () => {
  it("renders with aria-label for screen readers", () => {
    render(<StatusDot status="healthy" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Healthy");
  });

  it("renders with data-testid when provided", () => {
    render(<StatusDot status="healthy" data-testid="status-indicator" />);
    expect(screen.getByTestId("status-indicator")).toBeInTheDocument();
  });

  it("applies green color class for healthy status", () => {
    render(<StatusDot status="healthy" data-testid="dot" />);
    const dot = screen.getByTestId("dot");
    expect(dot.className).toContain("bg-brand-green");
  });

  it("applies red color class for offline status", () => {
    render(<StatusDot status="offline" data-testid="dot" />);
    const dot = screen.getByTestId("dot");
    expect(dot.className).toContain("bg-brand-red");
  });

  it("applies amber color class for degraded status", () => {
    render(<StatusDot status="degraded" data-testid="dot" />);
    const dot = screen.getByTestId("dot");
    expect(dot.className).toContain("bg-brand-amber");
  });

  it("applies sm size class", () => {
    render(<StatusDot status="healthy" size="sm" data-testid="dot" />);
    const dot = screen.getByTestId("dot");
    expect(dot.className).toContain("w-1.5");
  });

  it("applies lg size class", () => {
    render(<StatusDot status="healthy" size="lg" data-testid="dot" />);
    const dot = screen.getByTestId("dot");
    expect(dot.className).toContain("w-3.5");
  });
});
