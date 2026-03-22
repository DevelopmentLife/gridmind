import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Organization } from "@/types";
import { auth as authApi, setApiTokens, setUnauthorizedHandler } from "@/lib/api";

interface AuthStore {
  user: User | null;
  org: Organization | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setTokens: (access: string, refresh: string) => void;
  hydrateFromStorage: () => void;

  // Derived
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      org: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const resp = await authApi.login({ email, password });
          setApiTokens(resp.accessToken, resp.refreshToken);
          set({
            user: resp.user,
            org: resp.org,
            accessToken: resp.accessToken,
            refreshToken: resp.refreshToken,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ isLoading: false, error: message, user: null, org: null });
          throw err;
        }
      },

      register: async (email, password, fullName, orgName) => {
        set({ isLoading: true, error: null });
        try {
          const resp = await authApi.register({ email, password, fullName, orgName });
          setApiTokens(resp.accessToken, resp.refreshToken);
          set({
            user: resp.user,
            org: resp.org,
            accessToken: resp.accessToken,
            refreshToken: resp.refreshToken,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Registration failed";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Best-effort logout
        } finally {
          setApiTokens(null, null);
          set({
            user: null,
            org: null,
            accessToken: null,
            refreshToken: null,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),

      setTokens: (access, refresh) => {
        setApiTokens(access, refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      hydrateFromStorage: () => {
        const state = get();
        if (state.accessToken && state.refreshToken) {
          setApiTokens(state.accessToken, state.refreshToken);
        }
        // Register unauthorized handler
        setUnauthorizedHandler(() => {
          setApiTokens(null, null);
          set({ user: null, org: null, accessToken: null, refreshToken: null });
        });
      },

      isAuthenticated: () => {
        return get().user !== null && get().accessToken !== null;
      },

      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user) return false;

        const rolePermissions: Record<string, string[]> = {
          org_owner: [
            "deployment:read",
            "deployment:write",
            "deployment:delete",
            "agents:read",
            "incidents:read",
            "incidents:write",
            "approvals:read",
            "approvals:write",
            "billing:read",
            "billing:write",
            "settings:read",
            "settings:write",
            "team:read",
            "team:write",
          ],
          org_admin: [
            "deployment:read",
            "deployment:write",
            "agents:read",
            "incidents:read",
            "incidents:write",
            "approvals:read",
            "approvals:write",
            "billing:read",
            "settings:read",
            "settings:write",
            "team:read",
          ],
          org_member: [
            "deployment:read",
            "agents:read",
            "incidents:read",
            "approvals:read",
            "approvals:write",
            "settings:read",
          ],
          org_viewer: ["deployment:read", "agents:read", "incidents:read"],
        };

        const perms = rolePermissions[user.role] ?? [];
        return perms.includes(permission);
      },
    }),
    {
      name: "gridmind-portal-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({
        user: state.user,
        org: state.org,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
