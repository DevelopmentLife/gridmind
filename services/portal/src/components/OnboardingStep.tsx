"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface OnboardingStepProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick?: () => void;
}

export function OnboardingStep({
  stepNumber,
  totalSteps,
  title,
  description,
  isActive,
  isCompleted,
  onClick,
}: OnboardingStepProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isCompleted && !isActive}
      className={clsx(
        "w-full text-left flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-electric/50",
        isActive && "border-brand-electric bg-brand-electric/5",
        isCompleted && !isActive && "border-brand-green/30 bg-brand-green/5 cursor-pointer",
        !isActive && !isCompleted && "border-brand-border-subtle opacity-50 cursor-not-allowed",
      )}
      aria-current={isActive ? "step" : undefined}
      aria-label={`Step ${stepNumber} of ${totalSteps}: ${title}${isCompleted ? " (completed)" : ""}${isActive ? " (current)" : ""}`}
    >
      {/* Step indicator */}
      <div
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
          isActive && "bg-brand-electric text-white",
          isCompleted && !isActive && "bg-brand-green text-white",
          !isActive && !isCompleted && "bg-brand-slate text-brand-text-muted",
        )}
        aria-hidden="true"
      >
        {isCompleted && !isActive ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          stepNumber
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={clsx(
              "font-semibold text-sm",
              isActive ? "text-brand-text-primary" : "text-brand-text-secondary",
            )}
          >
            {title}
          </h3>
          <span className="text-brand-text-muted text-xs flex-shrink-0">
            {stepNumber}/{totalSteps}
          </span>
        </div>
        <p
          className={clsx(
            "text-xs mt-1 leading-relaxed",
            isActive ? "text-brand-text-secondary" : "text-brand-text-muted",
          )}
        >
          {description}
        </p>
        {isActive && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            className="h-0.5 bg-brand-electric/30 rounded-full mt-3"
            transition={{ duration: 0.4 }}
            aria-hidden="true"
          />
        )}
      </div>
    </button>
  );
}
