import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import * as apiModule from "@/lib/api";

vi.mock("@/lib/api", () => ({
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
  setApiTokens: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    constructor(public readonly apiError: { code: string; message: string; requestId: string; timestamp: string }, public readonly statusCode: number) {
      super(apiError.message);
    }
  },
}));

const MOCK_USER = {
  userId: "user-001",
  email: "jane@acme.com",
  fullName: "Jane Smith",
  avatarUrl: null,
  role: "org_owner" as const,
  createdAt: "2025-11-01T09:00:00Z",
};

const MOCK_ORG = {
  orgId: "org-001",
  name: "Acme Corp",
  slug: "acme-corp",
  plan: "growth" as const,
  stripeCustomerId: "cus_abc123",
  createdAt: "2025-11-01T09:00:00Z",
};

const MOCK_LOGIN_RESPONSE = {
  accessToken: "access_token_abc",
  refreshToken: "refresh_token_xyz",
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  user: MOCK_USER,
  org: MOCK_ORG,
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      org: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts unauthenticated", () => {
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it("isAuthenticated returns false when no user", () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });

  describe("login", () => {
    it("sets user and tokens on successful login", async () => {
      vi.mocked(apiModule.auth.login).mockResolvedValue(MOCK_LOGIN_RESPONSE);

      await useAuthStore.getState().login("jane@acme.com", "Password1");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(MOCK_USER);
      expect(state.org).toEqual(MOCK_ORG);
      expect(state.accessToken).toBe("access_token_abc");
      expect(state.refreshToken).toBe("refresh_token_xyz");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("calls setApiTokens with correct tokens", async () => {
      vi.mocked(apiModule.auth.login).mockResolvedValue(MOCK_LOGIN_RESPONSE);

      await useAuthStore.getState().login("jane@acme.com", "Password1");

      expect(apiModule.setApiTokens).toHaveBeenCalledWith("access_token_abc", "refresh_token_xyz");
    });

    it("isAuthenticated returns true after login", async () => {
      vi.mocked(apiModule.auth.login).mockResolvedValue(MOCK_LOGIN_RESPONSE);
      await useAuthStore.getState().login("jane@acme.com", "Password1");
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });

    it("sets error and clears user on failed login", async () => {
      vi.mocked(apiModule.auth.login).mockRejectedValue(new Error("Invalid credentials"));

      await expect(
        useAuthStore.getState().login("jane@acme.com", "wrongpassword"),
      ).rejects.toThrow("Invalid credentials");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.error).toBe("Invalid credentials");
      expect(state.isLoading).toBe(false);
    });

    it("sets isLoading during login", async () => {
      let resolveLogin!: (v: typeof MOCK_LOGIN_RESPONSE) => void;
      vi.mocked(apiModule.auth.login).mockReturnValue(
        new Promise((r) => { resolveLogin = r; }),
      );

      const loginPromise = useAuthStore.getState().login("jane@acme.com", "Password1");
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogin(MOCK_LOGIN_RESPONSE);
      await loginPromise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("register", () => {
    it("sets user and tokens on successful registration", async () => {
      vi.mocked(apiModule.auth.register).mockResolvedValue(MOCK_LOGIN_RESPONSE);

      await useAuthStore.getState().register("jane@acme.com", "Password1", "Jane Smith", "Acme Corp");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(MOCK_USER);
      expect(state.accessToken).toBe("access_token_abc");
    });

    it("sets error on failed registration", async () => {
      vi.mocked(apiModule.auth.register).mockRejectedValue(new Error("Email already in use"));

      await expect(
        useAuthStore.getState().register("jane@acme.com", "Password1", "Jane Smith", "Acme Corp"),
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toBe("Email already in use");
    });
  });

  describe("logout", () => {
    it("clears user and tokens on logout", async () => {
      useAuthStore.setState({ user: MOCK_USER, org: MOCK_ORG, accessToken: "abc", refreshToken: "xyz" });
      vi.mocked(apiModule.auth.logout).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.org).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it("clears tokens even if API call fails", async () => {
      useAuthStore.setState({ user: MOCK_USER, org: MOCK_ORG, accessToken: "abc", refreshToken: "xyz" });
      vi.mocked(apiModule.auth.logout).mockRejectedValue(new Error("Network error"));

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe("clearError", () => {
    it("clears error state", () => {
      useAuthStore.setState({ error: "Some error" });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("hasPermission", () => {
    it("org_owner has billing:write permission", () => {
      useAuthStore.setState({ user: MOCK_USER });
      expect(useAuthStore.getState().hasPermission("billing:write")).toBe(true);
    });

    it("org_viewer does not have billing:write permission", () => {
      useAuthStore.setState({ user: { ...MOCK_USER, role: "org_viewer" } });
      expect(useAuthStore.getState().hasPermission("billing:write")).toBe(false);
    });

    it("org_viewer has deployment:read permission", () => {
      useAuthStore.setState({ user: { ...MOCK_USER, role: "org_viewer" } });
      expect(useAuthStore.getState().hasPermission("deployment:read")).toBe(true);
    });

    it("returns false when no user", () => {
      useAuthStore.setState({ user: null });
      expect(useAuthStore.getState().hasPermission("deployment:read")).toBe(false);
    });

    it("org_member has approvals:write permission", () => {
      useAuthStore.setState({ user: { ...MOCK_USER, role: "org_member" } });
      expect(useAuthStore.getState().hasPermission("approvals:write")).toBe(true);
    });

    it("org_member does not have billing:write permission", () => {
      useAuthStore.setState({ user: { ...MOCK_USER, role: "org_member" } });
      expect(useAuthStore.getState().hasPermission("billing:write")).toBe(false);
    });
  });
});
