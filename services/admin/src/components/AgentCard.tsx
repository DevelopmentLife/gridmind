// =============================================================================
// GridMind Admin — Agent Card Component
// =============================================================================

"use client";

import { AgentTierBadge } from "@/components/AgentTierBadge";
import { StatusDot } from "@/components/StatusBadge";
import { formatRelativeTime, formatUptime } from "@/lib/formatters";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  onClick?: (agentId: string) => void;
  className?: string;
}

const MODEL_LABELS: Record<string, string> = {
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-opus-4-6": "Opus 4.6",
  deterministic: "Deterministic",
};

export function AgentCard({ agent, onClick, className = "" }: AgentCardProps) {
  const handleClick = () => onClick?.(agent.agentId);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(agent.agentId);
    }
  };

  const modelLabel = MODEL_LABELS[agent.model] ?? agent.model;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Agent ${agent.displayName}, ${agent.tier} tier, ${agent.status}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative bg-brand-navy border border-brand-border-default rounded-lg p-4
        cursor-pointer select-none
        transition-all duration-200
        hover:border-brand-electric/50 hover:shadow-card-hover hover:bg-brand-slate
        focus:outline-none focus:ring-2 focus:ring-brand-electric focus:ring-offset-2 focus:ring-offset-brand-midnight
        ${agent.status === "offline" ? "opacity-60" : ""}
        ${className}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot
            status={agent.status}
            size="md"
            data-testid="status-indicator"
          />
          <span className="font-mono font-semibold text-brand-text-primary tracking-wider text-sm">
            {agent.displayName}
          </span>
        </div>
        <AgentTierBadge tier={agent.tier} size="sm" />
      </div>

      {/* Description */}
      <p className="text-xs text-brand-text-secondary mb-4 leading-relaxed line-clamp-2">
        {agent.description}
      </p>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-2xs text-brand-text-muted uppercase tracking-wider mb-0.5">
            Tasks In Flight
          </p>
          <p className="font-mono text-sm font-semibold text-brand-text-primary">
            {agent.tasksInFlight}
          </p>
        </div>
        <div>
          <p className="text-2xs text-brand-text-muted uppercase tracking-wider mb-0.5">
            Error Rate
          </p>
          <p
            className={`font-mono text-sm font-semibold ${
              agent.errorRatePercent > 5
                ? "text-brand-red"
                : agent.errorRatePercent > 2
                  ? "text-brand-amber"
                  : "text-brand-text-primary"
            }`}
          >
            {agent.errorRatePercent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-2xs text-brand-text-muted uppercase tracking-wider mb-0.5">
            Uptime
          </p>
          <p className="font-mono text-sm text-brand-text-secondary">
            {agent.status === "offline" ? "—" : formatUptime(agent.uptimeSeconds)}
          </p>
        </div>
        <div>
          <p className="text-2xs text-brand-text-muted uppercase tracking-wider mb-0.5">
            Avg Cycle
          </p>
          <p className="font-mono text-sm text-brand-text-secondary">
            {agent.status === "offline" ? "—" : `${agent.avgCycleMs}ms`}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-brand-border-subtle">
        <span className="text-2xs text-brand-text-muted font-mono bg-brand-midnight px-2 py-0.5 rounded">
          {modelLabel}
        </span>
        <span className="text-2xs text-brand-text-muted">
          {agent.status === "offline"
            ? "Offline"
            : `Last action ${formatRelativeTime(agent.lastActionAt)}`}
        </span>
      </div>

      {/* Autonomy indicator */}
      {agent.autonomyLevel === "supervised" && (
        <div
          aria-label="Supervised autonomy — requires human approval for actions"
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand-amber"
          title="Supervised"
        />
      )}
    </article>
  );
}
