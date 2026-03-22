"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import type { Tenant } from "@/types";

interface ImpersonateModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: (tenantId: string, reason: string, totpCode: string) => void;
  onClose: () => void;
}

export function ImpersonateModal({
  tenant,
  isOpen,
  isLoading = false,
  onConfirm,
  onClose,
}: ImpersonateModalProps) {
  const [reason, setReason] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [totpError, setTotpError] = useState<string | null>(null);

  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);

  // Focus reason field when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTotpCode("");
      setReasonError(null);
      setTotpError(null);
      setTimeout(() => reasonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const validate = (): boolean => {
    let valid = true;

    if (reason.trim().length < 10) {
      setReasonError("Reason must be at least 10 characters.");
      valid = false;
    } else {
      setReasonError(null);
    }

    if (!/^\d{6}$/.test(totpCode)) {
      setTotpError("Enter your 6-digit TOTP code.");
      valid = false;
    } else {
      setTotpError(null);
    }

    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!validate()) return;
    onConfirm(tenant.tenantId, reason.trim(), totpCode);
  };

  const handleTotpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTotpCode(val);
  };

  return (
    <AnimatePresence>
      {isOpen && tenant && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="impersonate-title"
            aria-describedby="impersonate-description"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-full max-w-md mx-4",
              "bg-brand-navy border border-brand-amber/40 rounded-xl shadow-glow-amber-intense",
              "p-6"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-brand-amber text-base"
                    aria-hidden="true"
                  >
                    ⚠
                  </span>
                  <h2
                    id="impersonate-title"
                    className="text-brand-text-primary font-semibold text-base"
                  >
                    Impersonate Tenant
                  </h2>
                </div>
                <p
                  id="impersonate-description"
                  className="text-brand-text-muted text-sm"
                >
                  You will act as{" "}
                  <strong className="text-brand-amber font-semibold">
                    {tenant.name}
                  </strong>{" "}
                  with full tenant access. This action is audit-logged.
                </p>
              </div>

              <button
                onClick={onClose}
                disabled={isLoading}
                className={clsx(
                  "p-1.5 rounded text-brand-text-muted hover:text-brand-text-secondary",
                  "hover:bg-brand-slate transition-colors ml-4 flex-shrink-0",
                  "focus:outline-none focus:ring-2 focus:ring-brand-amber/60"
                )}
                aria-label="Close impersonation dialog"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Tenant summary */}
            <div className="bg-brand-slate rounded-lg p-3 mb-5 border border-brand-border-subtle">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-brand-text-muted">Tenant</span>
                  <p className="text-brand-text-primary font-medium mt-0.5">
                    {tenant.name}
                  </p>
                </div>
                <div>
                  <span className="text-brand-text-muted">Owner</span>
                  <p className="text-brand-text-secondary mt-0.5 truncate">
                    {tenant.ownerEmail}
                  </p>
                </div>
                <div>
                  <span className="text-brand-text-muted">Tier</span>
                  <p className="text-brand-text-primary capitalize mt-0.5">
                    {tenant.tier}
                  </p>
                </div>
                <div>
                  <span className="text-brand-text-muted">Region</span>
                  <p className="text-brand-text-secondary font-mono mt-0.5">
                    {tenant.region}
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Reason */}
              <div className="mb-4">
                <label
                  htmlFor="impersonate-reason"
                  className="block text-sm font-medium text-brand-text-secondary mb-1.5"
                >
                  Reason for impersonation{" "}
                  <span className="text-brand-red" aria-label="required">
                    *
                  </span>
                </label>
                <textarea
                  id="impersonate-reason"
                  ref={reasonRef}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Customer support escalation — ticket #12345"
                  disabled={isLoading}
                  aria-invalid={reasonError !== null}
                  aria-describedby={
                    reasonError ? "reason-error" : undefined
                  }
                  className={clsx(
                    "w-full bg-brand-midnight border rounded-lg px-3 py-2 text-sm",
                    "text-brand-text-primary placeholder:text-brand-text-muted",
                    "transition-colors resize-none",
                    "focus:outline-none focus:ring-2",
                    reasonError
                      ? "border-brand-red/60 focus:ring-brand-red/40"
                      : "border-brand-border-default focus:ring-brand-amber/40 focus:border-brand-amber/60",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                />
                {reasonError && (
                  <p id="reason-error" className="text-brand-red text-xs mt-1" role="alert">
                    {reasonError}
                  </p>
                )}
              </div>

              {/* TOTP */}
              <div className="mb-6">
                <label
                  htmlFor="impersonate-totp"
                  className="block text-sm font-medium text-brand-text-secondary mb-1.5"
                >
                  2FA Verification Code{" "}
                  <span className="text-brand-red" aria-label="required">
                    *
                  </span>
                </label>
                <input
                  id="impersonate-totp"
                  ref={totpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={handleTotpChange}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                  aria-invalid={totpError !== null}
                  aria-describedby={totpError ? "totp-error" : undefined}
                  className={clsx(
                    "w-full bg-brand-midnight border rounded-lg px-3 py-2 text-sm font-mono",
                    "text-brand-text-primary placeholder:text-brand-text-muted",
                    "tracking-[0.4em] text-center transition-colors",
                    "focus:outline-none focus:ring-2",
                    totpError
                      ? "border-brand-red/60 focus:ring-brand-red/40"
                      : "border-brand-border-default focus:ring-brand-amber/40 focus:border-brand-amber/60",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                />
                {totpError && (
                  <p id="totp-error" className="text-brand-red text-xs mt-1" role="alert">
                    {totpError}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    "text-brand-text-secondary hover:text-brand-text-primary",
                    "bg-brand-slate hover:bg-brand-slate-light border border-brand-border-default",
                    "focus:outline-none focus:ring-2 focus:ring-brand-amber/40",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                    "bg-brand-amber text-brand-midnight",
                    "hover:bg-brand-amber-light shadow-glow-amber",
                    "focus:outline-none focus:ring-2 focus:ring-brand-amber/60 focus:ring-offset-1 focus:ring-offset-brand-navy",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-busy={isLoading}
                >
                  {isLoading ? "Verifying..." : "Confirm Impersonation"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
