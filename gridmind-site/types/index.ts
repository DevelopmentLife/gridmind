export const AGENT_TIERS = {
  PERCEPTION: "perception",
  REASONING: "reasoning",
  EXECUTION: "execution",
  SELF_HEALING: "self_healing",
  SPECIALIZED: "specialized",
} as const;

export type AgentTier = (typeof AGENT_TIERS)[keyof typeof AGENT_TIERS];

export const TIER_COLORS = {
  perception: "#3B82F6",
  reasoning: "#8B5CF6",
  execution: "#10B981",
  self_healing: "#F59E0B",
  specialized: "#06B6D4",
} as const;

export const TIER_LABELS = {
  perception: "Perception",
  reasoning: "Reasoning",
  execution: "Execution",
  self_healing: "Self-Healing",
  specialized: "Specialized",
} as const;

export interface Agent {
  readonly name: string;
  readonly displayName: string;
  readonly icon: string;
  readonly description: string;
  readonly tier: AgentTier;
}

export interface PricingVendor {
  readonly name: string;
  readonly tier: string; // e.g. "RDS / Managed DB", "Aurora / Cloud SQL"
  readonly storageRange: string;
  readonly note: string;
}

export interface AgentCostLine {
  readonly model: string;            // e.g. "Claude Haiku 4.5"
  readonly role: string;             // e.g. "Perception agents (12)"
  readonly includedDecisions: string; // e.g. "Up to 50K decisions / mo"
}

export interface PricingPlan {
  readonly name: string;
  readonly tagline: string;
  readonly deployments: string;
  readonly agents: string;
  readonly teamMembers: string;
  readonly highlighted: boolean;
  readonly features: readonly string[];
  readonly vendorSupport: readonly PricingVendor[];
  readonly agentCosts: readonly AgentCostLine[];
  readonly queryVolume: string;
  readonly cta: string;
  readonly ctaHref: string;
}

export const ENGINE_STATUS = {
  AVAILABLE: "available",
  COMING_SOON: "coming_soon",
} as const;

export type EngineStatus = (typeof ENGINE_STATUS)[keyof typeof ENGINE_STATUS];

export interface Engine {
  readonly name: string;
  readonly icon: string;
  readonly status: EngineStatus;
  readonly features: readonly string[];
}
