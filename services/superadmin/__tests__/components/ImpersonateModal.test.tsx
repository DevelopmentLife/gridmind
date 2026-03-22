import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ImpersonateModal } from "@/components/ImpersonateModal";
import type { Tenant } from "@/types";

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

const MOCK_TENANT: Tenant = {
  tenantId: "t-test-001",
  name: "Acme Corp",
  slug: "acme-corp",
  tier: "enterprise",
  status: "active",
  mrr: 120_000,
  arr: 1_440_000,
  deploymentCount: 5,
  agentCount: 120,
  ownerEmail: "cto@acme.com",
  ownerName: "Jane Doe",
  createdAt: "2024-01-15T10:00:00Z",
  trialEndsAt: null,
  stripeCustomerId: "cus_test",
  region: "us-east-1",
  activeIncidents: 0,
};

describe("ImpersonateModal", () => {
  it("renders nothing when isOpen=false", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true with tenant", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows tenant name in dialog", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows tenant details grid", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("cto@acme.com")).toBeInTheDocument();
    expect(screen.getByText("enterprise")).toBeInTheDocument();
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
  });

  it("has reason textarea with required label", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(
      screen.getByLabelText(/reason for impersonation/i)
    ).toBeInTheDocument();
  });

  it("has TOTP input with required label", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(
      screen.getByLabelText(/2FA Verification Code/i)
    ).toBeInTheDocument();
  });

  it("shows error when reason is too short on submit", async () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Confirm Impersonation"));
    await waitFor(() => {
      expect(
        screen.getByText(/Reason must be at least 10 characters/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error when TOTP is not 6 digits", async () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const reasonInput = screen.getByLabelText(/reason for impersonation/i);
    fireEvent.change(reasonInput, {
      target: { value: "Valid reason for impersonation" },
    });
    const totpInput = screen.getByLabelText(/2FA Verification Code/i);
    fireEvent.change(totpInput, { target: { value: "123" } });
    fireEvent.click(screen.getByText("Confirm Impersonation"));
    await waitFor(() => {
      expect(
        screen.getByText(/Enter your 6-digit TOTP code/i)
      ).toBeInTheDocument();
    });
  });

  it("calls onConfirm with correct arguments when form is valid", async () => {
    const onConfirm = vi.fn();
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );
    const reasonInput = screen.getByLabelText(/reason for impersonation/i);
    fireEvent.change(reasonInput, {
      target: { value: "Support escalation for customer ticket #12345" },
    });
    const totpInput = screen.getByLabelText(/2FA Verification Code/i);
    fireEvent.change(totpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Confirm Impersonation"));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        "t-test-001",
        "Support escalation for customer ticket #12345",
        "123456"
      );
    });
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close icon button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /close impersonation dialog/i })
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows loading state on confirm button when isLoading=true", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        isLoading={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  it("disables cancel and close buttons when isLoading=true", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        isLoading={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Cancel")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /close impersonation dialog/i })
    ).toBeDisabled();
  });

  it("only allows numeric characters in TOTP input", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const totpInput = screen.getByLabelText(
      /2FA Verification Code/i
    ) as HTMLInputElement;
    fireEvent.change(totpInput, { target: { value: "abc123def" } });
    expect(totpInput.value).toBe("123");
  });

  it("truncates TOTP to 6 digits", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const totpInput = screen.getByLabelText(
      /2FA Verification Code/i
    ) as HTMLInputElement;
    fireEvent.change(totpInput, { target: { value: "1234567890" } });
    expect(totpInput.value).toBe("123456");
  });

  it("shows audit-logged warning in description", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/audit-logged/i)).toBeInTheDocument();
  });

  it("has aria-modal attribute on dialog", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby pointing to title", () => {
    render(
      <ImpersonateModal
        tenant={MOCK_TENANT}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "impersonate-title");
  });

  it("renders nothing when tenant is null even if isOpen=true", () => {
    render(
      <ImpersonateModal
        tenant={null}
        isOpen={true}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
