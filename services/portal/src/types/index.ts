// ─── Auth & User ─────────────────────────────────────────────────────────────

export interface User {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "org_owner" | "org_admin" | "org_member" | "org_viewer";
  createdAt: string;
}

export interface Organization {
  orgId: string;
  name: string;
  slug: string;
  plan: PlanTier;
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  org: Organization | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export type PlanTier = "starter" | "growth" | "scale" | "enterprise";

export interface PlanFeatures {
  maxDeployments: number;
  maxAgents: number;
  retentionDays: number;
  supportLevel: "community" | "email" | "priority" | "dedicated";
}

// ─── Deployments ─────────────────────────────────────────────────────────────

export type DatabaseEngine = "postgresql" | "mysql" | "redis" | "mongodb";
export type DeploymentStatus =
  | "provisioning"
  | "active"
  | "degraded"
  | "critical"
  | "maintenance"
  | "terminated";

export interface DeploymentMetrics {
  qps: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  activeConnections: number;
  cpuPercent: number;
  memoryPercent: number;
  storageGb: number;
  storageUsedGb: number;
}

export interface Deployment {
  deploymentId: string;
  name: string;
  engine: DatabaseEngine;
  engineVersion: string;
  status: DeploymentStatus;
  region: string;
  instanceType: string;
  metrics: DeploymentMetrics | null;
  agentCount: number;
  activeIncidents: number;
  createdAt: string;
  updatedAt: string;
}

export interface SparklinePoint {
  timestamp: string;
  value: number;
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export type AgentTier = "perception" | "reasoning" | "execution" | "self_healing" | "specialized";
export type AgentStatus = "healthy" | "degraded" | "error" | "idle" | "processing";
export type AgentModel = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-6" | "deterministic";

export interface Agent {
  agentId: string;
  agentName: string;
  displayName: string;
  description: string;
  tier: AgentTier;
  model: AgentModel;
  status: AgentStatus;
  uptimeSeconds: number;
  tasksInFlight: number;
  tasksCompleted: number;
  lastActionAt: string | null;
  deploymentId: string | null;
}

export interface AgentActivity {
  activityId: string;
  agentName: string;
  displayName: string;
  action: string;
  details: string;
  severity: ActivitySeverity;
  timestamp: string;
  deploymentId: string | null;
  deploymentName: string | null;
}

export type ActivitySeverity = "info" | "success" | "warning" | "error";

// ─── Incidents ────────────────────────────────────────────────────────────────

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "mitigating" | "resolved" | "closed";

export interface IncidentTimelineEntry {
  entryId: string;
  agentName: string | null;
  displayName: string | null;
  action: string;
  details: string;
  timestamp: string;
  automated: boolean;
}

export interface Incident {
  incidentId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  deploymentId: string;
  deploymentName: string;
  assignedAgent: string | null;
  rootCause: string | null;
  resolution: string | null;
  openedAt: string;
  resolvedAt: string | null;
  updatedAt: string;
  timeline: IncidentTimelineEntry[];
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export type ApprovalRisk = "low" | "medium" | "high" | "critical";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface Approval {
  approvalId: string;
  agentName: string;
  displayName: string;
  deploymentId: string;
  deploymentName: string;
  action: string;
  rationale: string;
  riskLevel: ApprovalRisk;
  status: ApprovalStatus;
  requestedAt: string;
  expiresAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface Invoice {
  invoiceId: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  periodStart: string;
  periodEnd: string;
  pdfUrl: string | null;
  createdAt: string;
}

export interface UsageRecord {
  metric: string;
  used: number;
  limit: number;
  unit: string;
}

export interface BillingInfo {
  plan: PlanTier;
  status: "active" | "trialing" | "past_due" | "cancelled";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  usage: UsageRecord[];
  invoices: Invoice[];
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  keyId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface TeamMember {
  userId: string;
  email: string;
  fullName: string;
  role: User["role"];
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface NotificationPreferences {
  incidentAlerts: boolean;
  approvalRequests: boolean;
  agentHealthAlerts: boolean;
  billingAlerts: boolean;
  weeklyDigest: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  messageId: string;
  role: ChatMessageRole;
  content: string;
  streaming: boolean;
  timestamp: string;
}

export interface ChatConversation {
  conversationId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; issue: string }>;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface ModalState {
  isOpen: boolean;
  type: "confirm" | "approve" | "reject" | "create-api-key" | null;
  payload: Record<string, unknown> | null;
}
