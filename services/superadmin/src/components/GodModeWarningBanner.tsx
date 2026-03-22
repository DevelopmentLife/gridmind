"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GodModeWarningBannerProps {
  environment?: string;
  version?: string;
}

export function GodModeWarningBanner({
  environment = "production",
  version = "0.1.0",
}: GodModeWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Banner cannot be permanently dismissed — reappears on next page navigation
  // This is intentional: always remind operators they are in god-mode

  const isProduction = environment === "production";

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={[
            "relative z-50 border-b",
            isProduction
              ? "bg-brand-amber/10 border-brand-amber/40 shadow-glow-amber"
              : "bg-brand-ocean/10 border-brand-ocean/40",
          ].join(" ")}
          role="alert"
          aria-label="Superadmin god-mode warning"
        >
          <div className="flex items-center justify-between px-4 py-2 max-w-screen-2xl mx-auto">
            {/* Left: warning icon + message */}
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={[
                  "flex-shrink-0 text-base font-bold",
                  isProduction ? "text-brand-amber" : "text-brand-ocean",
                ].join(" ")}
                aria-hidden="true"
              >
                {isProduction ? "⚠" : "ℹ"}
              </span>

              <span
                className={[
                  "text-xs font-semibold uppercase tracking-widest",
                  isProduction ? "text-brand-amber" : "text-brand-ocean",
                ].join(" ")}
              >
                SUPERADMIN
              </span>

              <span className="text-brand-text-secondary text-xs hidden sm:inline">
                —
              </span>

              <span className="text-brand-text-secondary text-xs hidden sm:inline truncate">
                {isProduction
                  ? "Elevated platform privileges active. Actions affect ALL tenants."
                  : `${environment.toUpperCase()} environment — elevated privileges active.`}
              </span>
            </div>

            {/* Right: env badge + version + dismiss */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <span
                className={[
                  "inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-bold uppercase",
                  isProduction
                    ? "bg-brand-red/20 text-brand-red border border-brand-red/40"
                    : "bg-brand-ocean/20 text-brand-ocean border border-brand-ocean/40",
                ].join(" ")}
              >
                {environment}
              </span>

              <span className="text-brand-text-muted text-2xs font-mono hidden md:inline">
                v{version}
              </span>

              <button
                onClick={() => setDismissed(true)}
                className={[
                  "text-brand-text-muted hover:text-brand-text-secondary transition-colors",
                  "rounded p-0.5 focus:outline-none focus:ring-2",
                  isProduction
                    ? "focus:ring-brand-amber/60"
                    : "focus:ring-brand-ocean/60",
                ].join(" ")}
                aria-label="Dismiss warning banner"
                title="Dismiss (reappears on next navigation)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 1l12 12M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
