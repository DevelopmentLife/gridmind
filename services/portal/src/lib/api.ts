import type {
  ApiError,
  AuthTokens,
  User,
  Organization,
  Deployment,
  DeploymentMetrics,
  SparklinePoint,
  DatabaseEngine,
  Agent,
  AgentActivity,
  Incident,
  Approval,
  BillingInfo,
  PlanTier,
  ApiKey,
  TeamMember,
  NotificationPreferences,
  ChatConversation,
} from "@/types";

const API_BASE_URL = process.env["NEXT_PUBLIC_GATEWAY_URL"] ?? "http://localhost:8000";

// ─── Token storage (memory-based; authStore is source of truth) ───────────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setApiTokens(access: string | null, refresh: string | null): void {
  _accessToken = access;
  _refreshToken = refresh;
}

export function setUnauthorizedHandler(handler: () => void): void {
  _onUnauthorized = handler;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  skipAuth?: boolean;
}

class ApiClientError extends Error {
  constructor(
    public readonly apiError: ApiError,
    public readonly statusCode: number,
  ) {
    super(apiError.message);
    this.name = "ApiClientError";
  }
}

async function refreshTokens(): Promise<string | null> {
  if (!_refreshToken) return null;

  const resp = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: _refreshToken }),
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as AuthTokens;
  _accessToken = data.accessToken;
  _refreshToken = data.refreshToken;
  return data.accessToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, skipAuth = false } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth && _accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let resp = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

  // Attempt token refresh on 401
  if (resp.status === 401 && !skipAuth && _refreshToken) {
    const newToken = await refreshTokens();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      resp = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });
    }
  }

  if (resp.status === 401) {
    _onUnauthorized?.();
    const err: ApiError = {
      code: "UNAUTHORIZED",
      message: "Session expired. Please log in again.",
      requestId: "",
      timestamp: new Date().toISOString(),
    };
    throw new ApiClientError(err, 401);
  }

  if (!resp.ok) {
    let err: ApiError;
    try {
      err = (await resp.json()) as ApiError;
    } catch {
      err = {
        code: "UNKNOWN_ERROR",
        message: `Request failed with status ${resp.status}`,
        requestId: "",
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiClientError(err, resp.status);
  }

  if (resp.status === 204) {
    return undefined as T;
  }

  return resp.json() as Promise<T>;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  org: Organization;
}

export const auth = {
  login: (payload: LoginPayload) =>
    request<LoginResponse>("/api/v1/auth/token", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  register: (payload: RegisterPayload) =>
    request<LoginResponse>("/api/v1/auth/register", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  logout: () =>
    request<void>("/api/v1/auth/logout", { method: "POST" }),

  forgotPassword: (email: string) =>
    request<void>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email },
      skipAuth: true,
    }),

  resetPassword: (token: string, password: string) =>
    request<void>("/api/v1/auth/reset-password", {
      method: "POST",
      body: { token, password },
      skipAuth: true,
    }),

  me: () => request<{ user: User; org: Organization }>("/api/v1/auth/me"),
};

// ─── Deployments endpoints ────────────────────────────────────────────────────

export const deployments = {
  list: () =>
    request<Deployment[]>("/api/v1/deployments"),

  get: (id: string) =>
    request<Deployment>(`/api/v1/deployments/${id}`),

  getMetrics: (id: string) =>
    request<DeploymentMetrics>(`/api/v1/deployments/${id}/metrics`),

  getSparkline: (id: string, metric: string) =>
    request<SparklinePoint[]>(`/api/v1/deployments/${id}/metrics/${metric}/sparkline`),

  create: (payload: {
    name: string;
    engine: DatabaseEngine;
    region: string;
    instanceType: string;
  }) =>
    request<Deployment>("/api/v1/deployments", {
      method: "POST",
      body: payload,
    }),

  delete: (id: string) =>
    request<void>(`/api/v1/deployments/${id}`, { method: "DELETE" }),
};

// ─── Agents endpoints ─────────────────────────────────────────────────────────

export const agents = {
  list: (deploymentId?: string) => {
    const qs = deploymentId ? `?deployment_id=${deploymentId}` : "";
    return request<Agent[]>(`/api/v1/agents${qs}`);
  },

  get: (id: string) =>
    request<Agent>(`/api/v1/agents/${id}`),

  activity: (deploymentId?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (deploymentId) params.set("deployment_id", deploymentId);
    return request<AgentActivity[]>(`/api/v1/agents/activity?${params.toString()}`);
  },
};

// ─── Incidents endpoints ──────────────────────────────────────────────────────

export const incidents = {
  list: (params?: { status?: string; severity?: string; deploymentId?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request<Incident[]>(`/api/v1/incidents${qs}`);
  },

  get: (id: string) =>
    request<Incident>(`/api/v1/incidents/${id}`),

  acknowledge: (id: string) =>
    request<Incident>(`/api/v1/incidents/${id}/acknowledge`, { method: "POST" }),

  resolve: (id: string, resolution: string) =>
    request<Incident>(`/api/v1/incidents/${id}/resolve`, {
      method: "POST",
      body: { resolution },
    }),
};

// ─── Approvals endpoints ──────────────────────────────────────────────────────

export const approvals = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    return request<Approval[]>(`/api/v1/approvals${qs}`);
  },

  get: (id: string) =>
    request<Approval>(`/api/v1/approvals/${id}`),

  approve: (id: string, justification?: string) =>
    request<Approval>(`/api/v1/approvals/${id}/approve`, {
      method: "POST",
      body: { justification },
    }),

  reject: (id: string, reason: string) =>
    request<Approval>(`/api/v1/approvals/${id}/reject`, {
      method: "POST",
      body: { reason },
    }),
};

// ─── Billing endpoints ────────────────────────────────────────────────────────

export const billing = {
  info: () =>
    request<BillingInfo>("/api/v1/billing"),

  createPortalSession: () =>
    request<{ url: string }>("/api/v1/billing/portal-session", { method: "POST" }),

  createCheckout: (planTier: PlanTier) =>
    request<{ url: string }>("/api/v1/billing/checkout", {
      method: "POST",
      body: { plan_tier: planTier },
    }),
};

// ─── Settings endpoints ───────────────────────────────────────────────────────

export const settings = {
  apiKeys: {
    list: () => request<ApiKey[]>("/api/v1/api-keys"),
    create: (name: string) =>
      request<{ key: string; apiKey: ApiKey }>("/api/v1/api-keys", {
        method: "POST",
        body: { name },
      }),
    revoke: (id: string) =>
      request<void>(`/api/v1/api-keys/${id}`, { method: "DELETE" }),
  },

  team: {
    list: () => request<TeamMember[]>("/api/v1/users"),
    invite: (email: string, role: User["role"]) =>
      request<void>("/api/v1/users/invite", { method: "POST", body: { email, role } }),
    remove: (userId: string) =>
      request<void>(`/api/v1/users/${userId}`, { method: "DELETE" }),
  },

  profile: {
    update: (payload: { fullName?: string; email?: string }) =>
      request<User>("/api/v1/users/me", { method: "PATCH", body: payload }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<void>("/api/v1/users/me/password", {
        method: "POST",
        body: { current_password: currentPassword, new_password: newPassword },
      }),
  },

  notifications: {
    get: () => request<NotificationPreferences>("/api/v1/users/me/notifications"),
    update: (prefs: Partial<NotificationPreferences>) =>
      request<NotificationPreferences>("/api/v1/users/me/notifications", {
        method: "PATCH",
        body: prefs,
      }),
  },
};

// ─── Chat endpoints ───────────────────────────────────────────────────────────

export const chat = {
  history: (conversationId?: string) => {
    const qs = conversationId ? `?conversation_id=${conversationId}` : "";
    return request<ChatConversation[]>(`/api/v1/chat${qs}`);
  },

  /**
   * Opens an SSE stream for chat. Returns an EventSource-like ReadableStream reader.
   * The caller is responsible for handling tokens and closing.
   */
  stream: async (
    message: string,
    conversationId: string | null,
    onToken: (token: string) => void,
    onDone: (conversationId: string) => void,
    onError: (err: string) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (_accessToken) {
      headers["Authorization"] = `Bearer ${_accessToken}`;
    }

    const resp = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, conversation_id: conversationId }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      onError(`Chat stream failed with status ${resp.status}`);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data) as {
              type: "token" | "done" | "error";
              content?: string;
              conversation_id?: string;
              error?: string;
            };
            if (parsed.type === "token" && parsed.content) {
              onToken(parsed.content);
            } else if (parsed.type === "done" && parsed.conversation_id) {
              onDone(parsed.conversation_id);
            } else if (parsed.type === "error" && parsed.error) {
              onError(parsed.error);
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }
    }
  },
};

export { ApiClientError };
