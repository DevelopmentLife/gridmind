"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";

type Step = "account" | "org" | "deploy";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  orgName: string;
  dbEngine: string;
  dbRegion: string;
}

const STEPS: { key: Step; label: string; description: string }[] = [
  { key: "account", label: "Your account", description: "Create your login credentials" },
  { key: "org", label: "Your organization", description: "Name your team or company" },
  { key: "deploy", label: "First deployment", description: "Configure your first agent team" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<Step>("account");
  const [form, setForm] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    orgName: "",
    dbEngine: "postgresql",
    dbRegion: "us-east-1",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function setField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validateAccount(): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim()) errors["fullName"] = "Full name is required.";
    if (!form.email.trim()) {
      errors["email"] = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors["email"] = "Enter a valid email address.";
    }
    if (!form.password) {
      errors["password"] = "Password is required.";
    } else if (form.password.length < 8) {
      errors["password"] = "Password must be at least 8 characters.";
    } else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) {
      errors["password"] = "Password must contain at least one uppercase letter and one number.";
    }
    if (form.password !== form.confirmPassword) {
      errors["confirmPassword"] = "Passwords do not match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateOrg(): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.orgName.trim()) errors["orgName"] = "Organization name is required.";
    else if (form.orgName.trim().length < 2) errors["orgName"] = "Name must be at least 2 characters.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAccountNext(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (validateAccount()) setStep("org");
  }

  async function handleOrgNext(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (validateOrg()) setStep("deploy");
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await register(form.email, form.password, form.fullName, form.orgName);
      router.push("/onboarding");
    } catch {
      // Error shown from store
    }
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-brand-midnight flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-electric rounded-xl mb-4">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <h1 className="text-brand-text-primary text-2xl font-bold">Create your account</h1>
          <p className="text-brand-text-muted text-sm mt-2">Start managing your infrastructure with AI agents</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8" role="list" aria-label="Registration steps">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2" role="listitem">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < currentStepIndex
                    ? "bg-brand-green text-white"
                    : i === currentStepIndex
                      ? "bg-brand-electric text-white"
                      : "bg-brand-slate text-brand-text-muted"
                }`}
                aria-label={`Step ${i + 1}: ${s.label}${i < currentStepIndex ? " (completed)" : i === currentStepIndex ? " (current)" : ""}`}
              >
                {i < currentStepIndex ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-10 h-0.5 ${i < currentStepIndex ? "bg-brand-green/50" : "bg-brand-border-default"}`} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-brand-navy border border-brand-border-default rounded-xl p-6 shadow-card">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              role="alert"
              className="mb-4 px-3 py-2.5 bg-brand-red/10 border border-brand-red/30 rounded-md text-brand-red text-sm"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Account */}
            {step === "account" && (
              <motion.form
                key="account"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                onSubmit={handleAccountNext}
                noValidate
              >
                <h2 className="text-brand-text-primary font-semibold text-base mb-4">Your account</h2>
                <div className="mb-4">
                  <label htmlFor="fullName" className="label">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    className={`input ${fieldErrors["fullName"] ? "border-brand-red/50" : ""}`}
                    placeholder="Jane Smith"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors["fullName"])}
                    aria-describedby={fieldErrors["fullName"] ? "fullName-error" : undefined}
                  />
                  {fieldErrors["fullName"] && <p id="fullName-error" className="error-text" role="alert">{fieldErrors["fullName"]}</p>}
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className={`input ${fieldErrors["email"] ? "border-brand-red/50" : ""}`}
                    placeholder="jane@company.com"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors["email"])}
                    aria-describedby={fieldErrors["email"] ? "email-error" : undefined}
                  />
                  {fieldErrors["email"] && <p id="email-error" className="error-text" role="alert">{fieldErrors["email"]}</p>}
                </div>
                <div className="mb-4">
                  <label htmlFor="password" className="label">Password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    className={`input ${fieldErrors["password"] ? "border-brand-red/50" : ""}`}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors["password"])}
                    aria-describedby={fieldErrors["password"] ? "password-error" : undefined}
                  />
                  {fieldErrors["password"] && <p id="password-error" className="error-text" role="alert">{fieldErrors["password"]}</p>}
                </div>
                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="label">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    className={`input ${fieldErrors["confirmPassword"] ? "border-brand-red/50" : ""}`}
                    placeholder="••••••••"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors["confirmPassword"])}
                    aria-describedby={fieldErrors["confirmPassword"] ? "confirm-error" : undefined}
                  />
                  {fieldErrors["confirmPassword"] && <p id="confirm-error" className="error-text" role="alert">{fieldErrors["confirmPassword"]}</p>}
                </div>
                <button type="submit" className="btn-primary w-full">Continue →</button>
              </motion.form>
            )}

            {/* Step 2: Org */}
            {step === "org" && (
              <motion.form
                key="org"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                onSubmit={handleOrgNext}
                noValidate
              >
                <h2 className="text-brand-text-primary font-semibold text-base mb-4">Your organization</h2>
                <p className="text-brand-text-muted text-sm mb-4">
                  This is the name of your company or team. You can invite members after setup.
                </p>
                <div className="mb-6">
                  <label htmlFor="orgName" className="label">Organization name</label>
                  <input
                    id="orgName"
                    type="text"
                    value={form.orgName}
                    onChange={(e) => setField("orgName", e.target.value)}
                    className={`input ${fieldErrors["orgName"] ? "border-brand-red/50" : ""}`}
                    placeholder="Acme Corp"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors["orgName"])}
                    aria-describedby={fieldErrors["orgName"] ? "orgName-error" : undefined}
                  />
                  {fieldErrors["orgName"] && <p id="orgName-error" className="error-text" role="alert">{fieldErrors["orgName"]}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStep("account")} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="submit" className="btn-primary flex-1">Continue →</button>
                </div>
              </motion.form>
            )}

            {/* Step 3: First Deployment */}
            {step === "deploy" && (
              <motion.form
                key="deploy"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                onSubmit={handleFinalSubmit}
                noValidate
              >
                <h2 className="text-brand-text-primary font-semibold text-base mb-2">First deployment</h2>
                <p className="text-brand-text-muted text-sm mb-4">
                  You can add connection details after signing up. These choices help us set up your agent fleet.
                </p>
                <div className="mb-4">
                  <label htmlFor="dbEngine" className="label">Agent framework</label>
                  <select
                    id="dbEngine"
                    value={form.dbEngine}
                    onChange={(e) => setField("dbEngine", e.target.value)}
                    className="input"
                  >
                    <option value="postgresql">LangChain / LangGraph</option>
                    <option value="mysql">CrewAI</option>
                    <option value="redis">Claude Code Agent Teams</option>
                    <option value="mongodb">Custom / BYO Framework</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label htmlFor="dbRegion" className="label">Primary region</label>
                  <select
                    id="dbRegion"
                    value={form.dbRegion}
                    onChange={(e) => setField("dbRegion", e.target.value)}
                    className="input"
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">EU West (Ireland)</option>
                    <option value="eu-central-1">EU Central (Frankfurt)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                    <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStep("org")} className="btn-secondary flex-1">
                    ← Back
                  </button>
                  <button type="submit" disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating…
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-brand-text-muted text-sm mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-electric hover:underline focus:outline-none focus:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
