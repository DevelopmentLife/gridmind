// GridMind Superadmin — Platform-wide type definitions

// ─── Enums ───────────────────────────────────────────────────────────────────

export const TenantTier = {
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
  CUSTOM: "custom",
} as const;
export type TenantTier = (typeof TenantTier)[keyof typeof TenantTier];

export const TenantStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CHURNED: "churned",
  TRIAL: "trial",
  ONBOARDING: "onboarding",
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const ServiceStatus = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  DOWN: "down",
  UNKNOWN: "unknown",
} as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export const AgentTier = {
  PERCEPTION: "perception",
  REASONING: "reasoning",
  EXECUTION: "execution",
  SELF_HEALING: "self_healing",
  SPECIALIZED: "specialized",
} as const;
export type AgentTier = (typeof AgentTier)[keyof typeof AgentTier];

export const AgentStatus = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  OFFLINE: "offline",
  STARTING: "starting",
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const IncidentSeverity = {
  P1: "p1",
  P2: "p2",
  P3: "p3",
  P4: "p4",
} as const;
export type IncidentSeverity =
  (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const IncidentStatus = {
  OPEN: "open",
  INVESTIGATING: "investigating",
  MITIGATED: "mitigated",
  RESOLVED: "resolved",
} as const;
export type IncidentStatus =
  (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const FlagStatus = {
  ENABLED: "enabled",
  DISABLED: "disabled",
  PARTIAL: "partial",
} as const;
export type FlagStatus = (typeof FlagStatus)[keyof typeof FlagStatus];

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface Tenant {
  tenantId: string;
  name: string;
  slug: string;
  tier: TenantTier;
  status: TenantStatus;
  mrr: number;
  arr: number;
  deploymentCount: number;
  agentCount: number;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  region: string;
  activeIncidents: number;
}

export interface TenantDetail extends Tenant {
  deployments: Deployment[];
  usageSummary: UsageSummary;
  billingHistory: BillingRecord[];
  members: TeamMember[];
}

export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
  lastActiveAt: string;
}

// ─── Deployment ───────────────────────────────────────────────────────────────

export interface Deployment {
  deploymentId: string;
  tenantId: string;
  name: string;
  engine: "postgresql" | "mysql" | "redis" | "mongodb";
  status: "healthy" | "degraded" | "down" | "provisioning";
  region: string;
  instanceType: string;
  createdAt: string;
  lastCheckedAt: string;
  qps: number;
  connectionCount: number;
  storageGb: number;
}

// ─── Revenue & Billing ────────────────────────────────────────────────────────

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  mrr: number;
  arr: number;
  churnRate: number;
  netRevenueRetention: number;
  avgRevenuePerTenant: number;
  totalDeployments: number;
  totalAgentsRunning: number;
  platformUptime: number;
  openIncidents: number;
  p1Incidents: number;
}

export interface RevenueDataPoint {
  month: string;
  mrr: number;
  arr: number;
  newMrr: number;
  churnedMrr: number;
  expansionMrr: number;
}

export interface TierRevenue {
  tier: TenantTier;
  tenantCount: number;
  mrr: number;
  percentage: number;
}

export interface BillingRecord {
  invoiceId: string;
  tenantId: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  period: string;
  paidAt: string | null;
  createdAt: string;
}

export interface UsageSummary {
  cpuHours: number;
  storageGb: number;
  apiCalls: number;
  agentCycles: number;
  period: string;
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export interface Agent {
  agentId: string;
  agentName: string;
  displayName: string;
  tier: AgentTier;
  status: AgentStatus;
  model: string;
  tenantId: string;
  tenantName: string;
  uptimeSeconds: number;
  tasksInFlight: number;
  totalCyclesCompleted: number;
  lastActionAt: string;
  errorRate: number;
  avgCycleMs: number;
  autonomyLevel: "autonomous" | "supervised" | "advisory";
  visibility: "Customer" | "Internal";
}

export interface AgentFleetSummary {
  totalAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  offlineAgents: number;
  byTier: Record<AgentTier, number>;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface Incident {
  incidentId: string;
  tenantId: string;
  tenantName: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedDeploymentId: string | null;
  assignedAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  timeToResolutionMs: number | null;
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export interface FeatureFlag {
  flagId: string;
  name: string;
  description: string;
  status: FlagStatus;
  rolloutPercentage: number;
  enabledTenants: string[];
  disabledTenants: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  tags: string[];
}

export interface FlagTenantOverride {
  tenantId: string;
  tenantName: string;
  override: "enabled" | "disabled";
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface SystemService {
  serviceId: string;
  name: string;
  displayName: string;
  status: ServiceStatus;
  latencyMs: number;
  uptimePercent: number;
  lastCheckedAt: string;
  version: string;
  replicas: number;
  healthyReplicas: number;
  endpoint: string;
}

export interface NatsMetrics {
  connections: number;
  subscriptions: number;
  messagesPerSec: number;
  bytesPerSec: number;
  jetStreamStreams: number;
  jetStreamConsumers: number;
  pendingMessages: number;
}

export interface DatabaseMetrics {
  activeConnections: number;
  maxConnections: number;
  queryLatencyP50Ms: number;
  queryLatencyP99Ms: number;
  replicationLagMs: number;
  sizeGb: number;
  tablesCount: number;
  slowQueriesCount: number;
}

export interface RedisMetrics {
  connectedClients: number;
  usedMemoryMb: number;
  maxMemoryMb: number;
  hitRate: number;
  opsPerSec: number;
  evictedKeys: number;
}

export interface SystemHealthSnapshot {
  services: SystemService[];
  nats: NatsMetrics;
  database: DatabaseMetrics;
  redis: RedisMetrics;
  collectedAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  auditId: string;
  tenantId: string | null;
  tenantName: string | null;
  agentId: string | null;
  agentName: string | null;
  actionType: string;
  actorType: "agent" | "human" | "system";
  actorId: string;
  actorEmail: string | null;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

export interface AuditFilter {
  tenantId: string | null;
  agentName: string | null;
  actionType: string | null;
  severity: AuditLogEntry["severity"] | null;
  startDate: string | null;
  endDate: string | null;
  search: string;
}

// ─── Platform Settings ────────────────────────────────────────────────────────

export interface PlatformSettings {
  jwtAlgorithm: string;
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  globalRateLimitPerMinute: number;
  maxRequestBodyKb: number;
  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  vaultStatus: "connected" | "sealed" | "disconnected";
  vaultVersion: string;
  maintenanceMode: boolean;
  signupsEnabled: boolean;
  platformVersion: string;
  environment: "production" | "staging" | "development";
}

// ─── Impersonation ────────────────────────────────────────────────────────────

export interface ImpersonationRequest {
  tenantId: string;
  tenantName: string;
  reason: string;
  totpCode: string;
}

export interface ImpersonationSession {
  sessionId: string;
  tenantId: string;
  tenantName: string;
  startedAt: string;
  expiresAt: string;
  initiatedBy: string;
  reason: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface FilterState {
  search: string;
  page: number;
  limit: number;
}
