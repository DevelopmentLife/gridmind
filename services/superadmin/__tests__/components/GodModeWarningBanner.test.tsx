import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GodModeWarningBanner } from "@/components/GodModeWarningBanner";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("GodModeWarningBanner", () => {
  it("renders the SUPERADMIN label", () => {
    render(<GodModeWarningBanner />);
    expect(screen.getByText("SUPERADMIN")).toBeInTheDocument();
  });

  it("has correct aria role=alert", () => {
    render(<GodModeWarningBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("displays production environment badge by default", () => {
    render(<GodModeWarningBanner environment="production" />);
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("displays staging environment badge", () => {
    render(<GodModeWarningBanner environment="staging" />);
    expect(screen.getByText("staging")).toBeInTheDocument();
  });

  it("renders version string", () => {
    render(<GodModeWarningBanner version="1.2.3" />);
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
  });

  it("renders the production elevated privileges message", () => {
    render(<GodModeWarningBanner environment="production" />);
    expect(
      screen.getByText(/Elevated platform privileges active/i)
    ).toBeInTheDocument();
  });

  it("renders non-production environment message", () => {
    render(<GodModeWarningBanner environment="staging" />);
    expect(
      screen.getByText(/STAGING environment/i)
    ).toBeInTheDocument();
  });

  it("shows dismiss button with correct aria-label", () => {
    render(<GodModeWarningBanner />);
    const dismissBtn = screen.getByRole("button", {
      name: /dismiss warning banner/i,
    });
    expect(dismissBtn).toBeInTheDocument();
  });

  it("hides banner when dismiss button is clicked", () => {
    render(<GodModeWarningBanner />);
    const dismissBtn = screen.getByRole("button", {
      name: /dismiss warning banner/i,
    });
    fireEvent.click(dismissBtn);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("applies amber border styling for production", () => {
    render(<GodModeWarningBanner environment="production" />);
    const banner = screen.getByRole("alert");
    expect(banner.className).toContain("border-brand-amber");
  });

  it("applies ocean border styling for staging", () => {
    render(<GodModeWarningBanner environment="staging" />);
    const banner = screen.getByRole("alert");
    expect(banner.className).toContain("border-brand-ocean");
  });

  it("uses amber warning icon for production", () => {
    render(<GodModeWarningBanner environment="production" />);
    expect(screen.getByText("⚠")).toBeInTheDocument();
  });

  it("uses info icon for non-production", () => {
    render(<GodModeWarningBanner environment="staging" />);
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });
});
