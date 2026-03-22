// GridMind Superadmin — API client for gateway communication

import type {
  Agent,
  AgentFleetSummary,
  AuditFilter,
  AuditLogEntry,
  BillingRecord,
  DatabaseMetrics,
  FeatureFlag,
  FlagTenantOverride,
  ImpersonationRequest,
  ImpersonationSession,
  Incident,
  NatsMetrics,
  PaginatedResponse,
  PlatformMetrics,
  PlatformSettings,
  RedisMetrics,
  RevenueDataPoint,
  SystemHealthSnapshot,
  Tenant,
  TenantDetail,
  TierRevenue,
} from "@/types";

const GATEWAY_URL =
  process.env["NEXT_PUBLIC_GATEWAY_URL"] ?? "http://localhost:8000";

// ─── HTTP client ──────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("sa_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let code = "UNKNOWN_ERROR";
    let message = `HTTP ${response.status}`;
    let requestId: string | undefined;

    try {
      const body = (await response.json()) as ErrorBody;
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      requestId = body.error?.request_id;
    } catch {
      // ignore parse errors
    }

    throw new ApiError(response.status, code, message, requestId);
  }

  return response.json() as Promise<T>;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

// ─── Platform metrics ─────────────────────────────────────────────────────────

export const platformApi = {
  getMetrics: (): Promise<PlatformMetrics> =>
    get("/api/v1/platform/metrics"),

  getRevenueHistory: (months: number = 12): Promise<RevenueDataPoint[]> =>
    get(`/api/v1/platform/revenue?months=${months}`),

  getTierBreakdown: (): Promise<TierRevenue[]> =>
    get("/api/v1/platform/revenue/tiers"),

  getSettings: (): Promise<PlatformSettings> =>
    get("/api/v1/platform/settings"),

  updateSettings: (settings: Partial<PlatformSettings>): Promise<PlatformSettings> =>
    patch("/api/v1/platform/settings", settings),
};

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenantsApi = {
  list: (params?: {
    search?: string;
    tier?: string;
    status?: string;
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<Tenant>> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.tier) qs.set("tier", params.tier);
    if (params?.status) qs.set("status", params.status);
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get(`/api/v1/tenants${query ? `?${query}` : ""}`);
  },

  getById: (tenantId: string): Promise<TenantDetail> =>
    get(`/api/v1/tenants/${tenantId}`),

  suspend: (tenantId: string, reason: string): Promise<Tenant> =>
    post(`/api/v1/tenants/${tenantId}/suspend`, { reason }),

  reactivate: (tenantId: string): Promise<Tenant> =>
    post(`/api/v1/tenants/${tenantId}/reactivate`),

  getBillingHistory: (tenantId: string): Promise<BillingRecord[]> =>
    get(`/api/v1/tenants/${tenantId}/billing`),

  impersonate: (
    req: ImpersonationRequest
  ): Promise<ImpersonationSession> =>
    post(`/api/v1/tenants/${req.tenantId}/impersonate`, req),

  endImpersonation: (sessionId: string): Promise<void> =>
    del(`/api/v1/impersonation/${sessionId}`),
};

// ─── Agents ──────────────────────────────────────────────────────────────────

export const agentsApi = {
  listAll: (params?: {
    tenantId?: string;
    tier?: string;
    status?: string;
  }): Promise<Agent[]> => {
    const qs = new URLSearchParams();
    if (params?.tenantId) qs.set("tenant_id", params.tenantId);
    if (params?.tier) qs.set("tier", params.tier);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return get(`/api/v1/agents${query ? `?${query}` : ""}`);
  },

  getFleetSummary: (): Promise<AgentFleetSummary> =>
    get("/api/v1/agents/fleet/summary"),

  restart: (agentId: string): Promise<void> =>
    post(`/api/v1/agents/${agentId}/restart`),
};

// ─── Incidents ────────────────────────────────────────────────────────────────

export const incidentsApi = {
  listAll: (params?: {
    tenantId?: string;
    severity?: string;
    status?: string;
  }): Promise<PaginatedResponse<Incident>> => {
    const qs = new URLSearchParams();
    if (params?.tenantId) qs.set("tenant_id", params.tenantId);
    if (params?.severity) qs.set("severity", params.severity);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return get(`/api/v1/incidents${query ? `?${query}` : ""}`);
  },

  getById: (incidentId: string): Promise<Incident> =>
    get(`/api/v1/incidents/${incidentId}`),

  escalate: (incidentId: string, notes: string): Promise<Incident> =>
    post(`/api/v1/incidents/${incidentId}/escalate`, { notes }),

  resolve: (incidentId: string, resolution: string): Promise<Incident> =>
    post(`/api/v1/incidents/${incidentId}/resolve`, { resolution }),
};

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const featureFlagsApi = {
  list: (): Promise<FeatureFlag[]> =>
    get("/api/v1/feature-flags"),

  getById: (flagId: string): Promise<FeatureFlag> =>
    get(`/api/v1/feature-flags/${flagId}`),

  toggle: (flagId: string, enabled: boolean): Promise<FeatureFlag> =>
    patch(`/api/v1/feature-flags/${flagId}`, { enabled }),

  setRollout: (flagId: string, percentage: number): Promise<FeatureFlag> =>
    patch(`/api/v1/feature-flags/${flagId}`, { rollout_percentage: percentage }),

  setTenantOverride: (
    flagId: string,
    override: FlagTenantOverride
  ): Promise<FeatureFlag> =>
    post(`/api/v1/feature-flags/${flagId}/overrides`, override),

  removeTenantOverride: (flagId: string, tenantId: string): Promise<FeatureFlag> =>
    del(`/api/v1/feature-flags/${flagId}/overrides/${tenantId}`),

  create: (
    flag: Omit<FeatureFlag, "flagId" | "createdAt" | "updatedAt" | "updatedBy">
  ): Promise<FeatureFlag> =>
    post("/api/v1/feature-flags", flag),
};

// ─── System Health ────────────────────────────────────────────────────────────

export const systemApi = {
  getHealth: (): Promise<SystemHealthSnapshot> =>
    get("/api/v1/system/health"),

  getNatsMetrics: (): Promise<NatsMetrics> =>
    get("/api/v1/system/nats"),

  getDatabaseMetrics: (): Promise<DatabaseMetrics> =>
    get("/api/v1/system/database"),

  getRedisMetrics: (): Promise<RedisMetrics> =>
    get("/api/v1/system/redis"),
};

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (
    filter: Partial<AuditFilter> & { cursor?: string; limit?: number }
  ): Promise<PaginatedResponse<AuditLogEntry>> => {
    const qs = new URLSearchParams();
    if (filter.tenantId) qs.set("tenant_id", filter.tenantId);
    if (filter.agentName) qs.set("agent_name", filter.agentName);
    if (filter.actionType) qs.set("action_type", filter.actionType);
    if (filter.severity) qs.set("severity", filter.severity);
    if (filter.startDate) qs.set("start_date", filter.startDate);
    if (filter.endDate) qs.set("end_date", filter.endDate);
    if (filter.search) qs.set("search", filter.search);
    if (filter.cursor) qs.set("cursor", filter.cursor);
    if (filter.limit) qs.set("limit", String(filter.limit));
    const query = qs.toString();
    return get(`/api/v1/audit${query ? `?${query}` : ""}`);
  },
};

export { ApiError };
