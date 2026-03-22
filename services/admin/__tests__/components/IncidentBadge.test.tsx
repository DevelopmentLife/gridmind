import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { IncidentBadge } from "@/components/IncidentBadge";

describe("IncidentBadge", () => {
  it("renders P1 severity badge", () => {
    render(<IncidentBadge severity="P1" />);
    expect(screen.getByRole("img")).toHaveTextContent("P1");
  });

  it("renders P2 severity badge", () => {
    render(<IncidentBadge severity="P2" />);
    expect(screen.getByRole("img")).toHaveTextContent("P2");
  });

  it("renders P3 severity badge", () => {
    render(<IncidentBadge severity="P3" />);
    expect(screen.getByRole("img")).toHaveTextContent("P3");
  });

  it("renders P4 severity badge", () => {
    render(<IncidentBadge severity="P4" />);
    expect(screen.getByRole("img")).toHaveTextContent("P4");
  });

  it("P1 badge has red color class", () => {
    render(<IncidentBadge severity="P1" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("text-brand-red");
  });

  it("P2 badge has amber color class", () => {
    render(<IncidentBadge severity="P2" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("text-brand-amber");
  });

  it("P3 badge has ocean color class", () => {
    render(<IncidentBadge severity="P3" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("text-brand-ocean");
  });

  it("P1 badge has pulse animation", () => {
    render(<IncidentBadge severity="P1" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("animate-pulse");
  });

  it("P2 badge does not have pulse animation", () => {
    render(<IncidentBadge severity="P2" />);
    const badge = screen.getByRole("img");
    expect(badge.className).not.toContain("animate-pulse");
  });

  it("has accessible aria-label with severity description", () => {
    render(<IncidentBadge severity="P1" />);
    const badge = screen.getByRole("img");
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("P1"));
  });

  it("has accessible title attribute with description", () => {
    render(<IncidentBadge severity="P1" />);
    const badge = screen.getByRole("img");
    expect(badge).toHaveAttribute("title", expect.stringContaining("Critical"));
  });

  it("applies sm size class", () => {
    render(<IncidentBadge severity="P1" size="sm" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("text-2xs");
  });

  it("applies lg size class", () => {
    render(<IncidentBadge severity="P1" size="lg" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("text-sm");
  });

  it("applies additional className", () => {
    render(<IncidentBadge severity="P1" className="custom-class" />);
    const badge = screen.getByRole("img");
    expect(badge.className).toContain("custom-class");
  });
});
