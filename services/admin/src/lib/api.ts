// =============================================================================
// GridMind Admin — Typed API Client
// =============================================================================

import type {
  Agent,
  AgentAction,
  AgentLog,
  Approval,
  BillingOverview,
  Deployment,
  FleetHealthSummary,
  Incident,
  IncidentTimelineEvent,
  PaginatedResponse,
  StripeSubscription,
  Tenant,
  TenantDetail,
} from "@/types";

const GATEWAY_URL =
  process.env["NEXT_PUBLIC_GATEWAY_URL"] ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Auth token management
// ---------------------------------------------------------------------------

let _accessToken: string | null = null;

export function setAccessToken(token: string): void {
  _accessToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("gm_admin_token", token);
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window !== "undefined") {
    _accessToken = localStorage.getItem("gm_admin_token");
  }
  return _accessToken;
}

export function clearAccessToken(): void {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("gm_admin_token");
  }
}

// ---------------------------------------------------------------------------
// Base fetch wrapper
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params, skipAuth = false } = options;

  // Build URL with query params
  const url = new URL(`${GATEWAY_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (!token) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("No access token");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — redirect to login
  if (response.status === 401) {
    clearAccessToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  // Parse JSON response
  const data: unknown = await response.json();

  if (!response.ok) {
    const errorData = data as { error?: { message?: string } };
    throw new Error(
      errorData?.error?.message ?? `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export const authApi = {
  login: (body: LoginRequest) =>
    request<TokenResponse>("/api/v1/auth/token", {
      method: "POST",
      body,
      skipAuth: true,
    }),

  refresh: (refreshToken: string) =>
    request<TokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      skipAuth: true,
    }),

  logout: () =>
    request<void>("/api/v1/auth/logout", { method: "POST" }),
};

// ---------------------------------------------------------------------------
// Fleet / Agents endpoints
// ---------------------------------------------------------------------------

export const agentsApi = {
  getFleetHealth: () =>
    request<FleetHealthSummary>("/api/v1/agents/health"),

  listAgents: (params?: { tenantId?: string; tier?: string; status?: string }) =>
    request<PaginatedResponse<Agent>>("/api/v1/agents", { params }),

  getAgent: (agentId: string) =>
    request<Agent>(`/api/v1/agents/${agentId}`),

  getAgentActions: (agentId: string, params?: { limit?: number }) =>
    request<PaginatedResponse<AgentAction>>(`/api/v1/agents/${agentId}/actions`, {
      params,
    }),

  getAgentLogs: (agentId: string, params?: { limit?: number; level?: string }) =>
    request<PaginatedResponse<AgentLog>>(`/api/v1/agents/${agentId}/logs`, {
      params,
    }),

  restartAgent: (agentId: string) =>
    request<void>(`/api/v1/agents/${agentId}/restart`, { method: "POST" }),
};

// ---------------------------------------------------------------------------
// Tenants endpoints
// ---------------------------------------------------------------------------

export interface TenantsListParams {
  [key: string]: string | number | boolean | undefined;
  search?: string;
  status?: string;
  tier?: string;
  page?: number;
  pageSize?: number;
}

export const tenantsApi = {
  listTenants: (params?: TenantsListParams) =>
    request<PaginatedResponse<Tenant>>("/api/v1/tenants", { params }),

  getTenant: (tenantId: string) =>
    request<TenantDetail>(`/api/v1/tenants/${tenantId}`),

  suspendTenant: (tenantId: string) =>
    request<Tenant>(`/api/v1/tenants/${tenantId}/suspend`, { method: "POST" }),

  unsuspendTenant: (tenantId: string) =>
    request<Tenant>(`/api/v1/tenants/${tenantId}/unsuspend`, { method: "POST" }),

  deleteTenant: (tenantId: string) =>
    request<void>(`/api/v1/tenants/${tenantId}`, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Deployments endpoints
// ---------------------------------------------------------------------------

export interface DeploymentsListParams {
  [key: string]: string | number | boolean | undefined;
  search?: string;
  tenantId?: string;
  status?: string;
  engine?: string;
  page?: number;
  pageSize?: number;
}

export const deploymentsApi = {
  listDeployments: (params?: DeploymentsListParams) =>
    request<PaginatedResponse<Deployment>>("/api/v1/deployments", { params }),

  getDeployment: (deploymentId: string) =>
    request<Deployment>(`/api/v1/deployments/${deploymentId}`),
};

// ---------------------------------------------------------------------------
// Incidents endpoints
// ---------------------------------------------------------------------------

export interface IncidentsListParams {
  [key: string]: string | number | boolean | undefined;
  search?: string;
  severity?: string;
  status?: string;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

export const incidentsApi = {
  listIncidents: (params?: IncidentsListParams) =>
    request<PaginatedResponse<Incident>>("/api/v1/incidents", { params }),

  getIncident: (incidentId: string) =>
    request<Incident>(`/api/v1/incidents/${incidentId}`),

  getIncidentTimeline: (incidentId: string) =>
    request<PaginatedResponse<IncidentTimelineEvent>>(
      `/api/v1/incidents/${incidentId}/timeline`
    ),

  resolveIncident: (incidentId: string, resolution: string) =>
    request<Incident>(`/api/v1/incidents/${incidentId}/resolve`, {
      method: "POST",
      body: { resolution },
    }),
};

// ---------------------------------------------------------------------------
// Approvals endpoints
// ---------------------------------------------------------------------------

export const approvalsApi = {
  listApprovals: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<PaginatedResponse<Approval>>("/api/v1/approvals", { params }),

  getApproval: (approvalId: string) =>
    request<Approval>(`/api/v1/approvals/${approvalId}`),

  approveApproval: (approvalId: string, justification?: string) =>
    request<Approval>(`/api/v1/approvals/${approvalId}/approve`, {
      method: "POST",
      body: { justification: justification ?? "Approved by operator" },
    }),

  rejectApproval: (approvalId: string, justification: string) =>
    request<Approval>(`/api/v1/approvals/${approvalId}/reject`, {
      method: "POST",
      body: { justification },
    }),
};

// ---------------------------------------------------------------------------
// Billing endpoints
// ---------------------------------------------------------------------------

export const billingApi = {
  getOverview: () =>
    request<BillingOverview>("/api/v1/billing/overview"),

  listSubscriptions: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<PaginatedResponse<StripeSubscription>>("/api/v1/billing/subscriptions", {
      params,
    }),
};
