// =============================================================================
// GridMind Admin — Shared TypeScript Types
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (as const objects per STANDARDS.md)
// ---------------------------------------------------------------------------

export const AgentTier = {
  PERCEPTION: "perception",
  REASONING: "reasoning",
  EXECUTION: "execution",
  SELF_HEALING: "self_healing",
} as const;
export type AgentTier = (typeof AgentTier)[keyof typeof AgentTier];

export const AgentStatus = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  OFFLINE: "offline",
  STARTING: "starting",
  ERROR: "error",
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const AutonomyLevel = {
  AUTONOMOUS: "autonomous",
  SUPERVISED: "supervised",
  ADVISORY: "advisory",
} as const;
export type AutonomyLevel = (typeof AutonomyLevel)[keyof typeof AutonomyLevel];

export const TenantStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  TRIALING: "trialing",
  CANCELLED: "cancelled",
  PAST_DUE: "past_due",
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export const TenantTier = {
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;
export type TenantTier = (typeof TenantTier)[keyof typeof TenantTier];

export const IncidentSeverity = {
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
} as const;
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const IncidentStatus = {
  OPEN: "open",
  INVESTIGATING: "investigating",
  MITIGATING: "mitigating",
  RESOLVED: "resolved",
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const ApprovalStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const RiskLevel = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const DeploymentStatus = {
  PROVISIONING: "provisioning",
  RUNNING: "running",
  DEGRADED: "degraded",
  STOPPED: "stopped",
  FAILED: "failed",
  DELETING: "deleting",
} as const;
export type DeploymentStatus = (typeof DeploymentStatus)[keyof typeof DeploymentStatus];

export const DatabaseEngine = {
  POSTGRESQL: "postgresql",
  MYSQL: "mysql",
  REDIS: "redis",
  MONGODB: "mongodb",
} as const;
export type DatabaseEngine = (typeof DatabaseEngine)[keyof typeof DatabaseEngine];

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

export interface Agent {
  agentId: string;
  agentName: string;
  displayName: string;
  tier: AgentTier;
  status: AgentStatus;
  autonomyLevel: AutonomyLevel;
  model: string;
  visibility: "Customer" | "Internal";
  description: string;
  uptimeSeconds: number;
  tasksInFlight: number;
  tasksCompletedTotal: number;
  errorRatePercent: number;
  avgCycleMs: number;
  lastActionAt: string;
  lastHeartbeatAt: string;
  tenantId?: string;
}

export interface AgentMetric {
  timestamp: string;
  value: number;
  label: string;
}

export interface AgentAction {
  actionId: string;
  actionType: string;
  description: string;
  status: "success" | "failed" | "pending";
  riskLevel: RiskLevel;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  approvalId?: string;
}

export interface AgentLog {
  logId: string;
  level: "debug" | "info" | "warning" | "error";
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tenant Types
// ---------------------------------------------------------------------------

export interface Tenant {
  tenantId: string;
  orgName: string;
  email: string;
  status: TenantStatus;
  tier: TenantTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  mrr: number;
  deploymentCount: number;
  activeAgentCount: number;
  storageGb: number;
  storageGbLimit: number;
  createdAt: string;
  updatedAt: string;
  trialEndsAt?: string;
}

export interface TenantDetail extends Tenant {
  deployments: Deployment[];
  usageCurrentMonth: UsageSummary;
  adminUsers: TenantUser[];
}

export interface TenantUser {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UsageSummary {
  agentCyclesTotal: number;
  llmTokensTotal: number;
  storageGb: number;
  apiCallsTotal: number;
  costUsd: number;
}

// ---------------------------------------------------------------------------
// Deployment Types
// ---------------------------------------------------------------------------

export interface Deployment {
  deploymentId: string;
  tenantId: string;
  tenantName: string;
  name: string;
  engine: DatabaseEngine;
  status: DeploymentStatus;
  region: string;
  instanceType: string;
  versionTag: string;
  storageGb: number;
  connectionCount: number;
  qps: number;
  p95LatencyMs: number;
  cpuPercent: number;
  memoryPercent: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Incident Types
// ---------------------------------------------------------------------------

export interface Incident {
  incidentId: string;
  tenantId: string;
  tenantName: string;
  deploymentId?: string;
  deploymentName?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedAgentId?: string;
  assignedAgentName?: string;
  affectedComponents: string[];
  rootCause?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  durationMinutes?: number;
}

export interface IncidentTimelineEvent {
  eventId: string;
  incidentId: string;
  eventType: "detection" | "update" | "action" | "resolution" | "comment";
  description: string;
  agentName?: string;
  operatorId?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Approval Types
// ---------------------------------------------------------------------------

export interface Approval {
  approvalId: string;
  tenantId: string;
  tenantName: string;
  sourceAgentId: string;
  sourceAgentName: string;
  sourceAgentDisplayName: string;
  actionDescription: string;
  riskLevel: RiskLevel;
  context: Record<string, unknown>;
  status: ApprovalStatus;
  requestedAt: string;
  expiresAt: string;
  respondedAt?: string;
  respondedBy?: string;
  justification?: string;
  timeoutSeconds: number;
}

// ---------------------------------------------------------------------------
// Billing Types
// ---------------------------------------------------------------------------

export interface BillingOverview {
  mrrUsd: number;
  mrrGrowthPercent: number;
  arrUsd: number;
  totalTenants: number;
  activeTenants: number;
  avgRevenuePerTenant: number;
  grossMarginPercent: number;
  churnRatePercent: number;
}

export interface StripeSubscription {
  subscriptionId: string;
  tenantId: string;
  tenantName: string;
  planName: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  amountUsd: number;
  interval: "month" | "year";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  nextCursor?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
    requestId: string;
    timestamp: string;
  };
}

export interface FleetHealthSummary {
  totalAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  offlineAgents: number;
  openIncidents: number;
  pendingApprovals: number;
  p1Incidents: number;
}

// ---------------------------------------------------------------------------
// Cost Tracking Types
// ---------------------------------------------------------------------------

export const CostPeriod = {
  DAY: "24h",
  WEEK: "7d",
  MONTH: "30d",
} as const;
export type CostPeriod = (typeof CostPeriod)[keyof typeof CostPeriod];

export const ModelTier = {
  HAIKU: "claude-haiku-4-5",
  SONNET: "claude-sonnet-4-6",
  OPUS: "claude-opus-4-6",
} as const;
export type ModelTier = (typeof ModelTier)[keyof typeof ModelTier];

export interface AgentDecision {
  decisionId: string;
  agentName: string;
  agentDisplayName: string;
  model: ModelTier;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  timestamp: string;
  tenantId: string;
}

export interface CostSummary {
  totalCostUsd: number;
  totalDecisions: number;
  avgCostPerDecision: number;
  projectedMonthlyCostUsd: number;
  periodLabel: string;
}

export interface BudgetStatus {
  budgetUsd: number;
  spentUsd: number;
  percentUsed: number;
  remainingUsd: number;
  projectedOverage: boolean;
}

export interface DailyCost {
  date: string;
  label: string;
  haikuCostUsd: number;
  sonnetCostUsd: number;
  opusCostUsd: number;
  totalCostUsd: number;
  totalDecisions: number;
}

export interface AgentCostBreakdown {
  agentName: string;
  agentDisplayName: string;
  model: ModelTier;
  decisions: number;
  inputTokens: number;
  outputTokens: number;
  modelCostUsd: number;
  computeCostUsd: number;
  totalCostUsd: number;
  avgCostPerDecision: number;
}

// ---------------------------------------------------------------------------
// UI Types
// ---------------------------------------------------------------------------

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export type SortDirection = "asc" | "desc";

export interface TableSort {
  field: string;
  direction: SortDirection;
}

export interface FilterState {
  search: string;
  status?: string;
  tier?: string;
}
