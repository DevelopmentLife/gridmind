"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentActivity } from "@/types";
import { formatRelativeTime } from "@/lib/formatters";

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  maxItems?: number;
  autoScroll?: boolean;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-brand-text-secondary",
  success: "text-brand-green",
  warning: "text-brand-amber",
  error: "text-brand-red",
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-brand-text-muted",
  success: "bg-brand-green",
  warning: "bg-brand-amber",
  error: "bg-brand-red",
};

export function AgentActivityFeed({
  activities,
  maxItems = 50,
  autoScroll = true,
  className = "",
}: AgentActivityFeedProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visible = activities.slice(0, maxItems);

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activities.length, autoScroll]);

  if (visible.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 text-brand-text-muted text-sm ${className}`}
      >
        <p>No agent activity yet.</p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-y-auto ${className}`}
      role="log"
      aria-label="Agent activity feed"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {visible.map((activity) => (
          <motion.div
            key={activity.activityId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 px-4 py-3 border-b border-brand-border-subtle hover:bg-brand-slate/20 transition-colors"
          >
            {/* Severity dot */}
            <div className="flex-shrink-0 mt-1.5">
              <span
                className={`block w-2 h-2 rounded-full ${SEVERITY_DOT[activity.severity] ?? "bg-brand-text-muted"}`}
                aria-hidden="true"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-brand-ocean font-medium text-xs">
                  {activity.displayName}
                </span>
                <span
                  className={`text-xs ${SEVERITY_COLORS[activity.severity] ?? "text-brand-text-secondary"}`}
                >
                  {activity.action}
                </span>
              </div>
              {activity.details && (
                <p className="text-brand-text-muted text-xs mt-0.5 truncate">{activity.details}</p>
              )}
              {activity.deploymentName && (
                <p className="text-brand-text-muted text-2xs mt-0.5">
                  {activity.deploymentName}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <span className="flex-shrink-0 text-brand-text-muted text-2xs">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}
