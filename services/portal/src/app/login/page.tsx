"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated, hydrateFromStorage } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    hydrateFromStorage();
    if (isAuthenticated()) {
      router.replace("/deployments");
    }
  }, [hydrateFromStorage, isAuthenticated, router]);

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors["email"] = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors["email"] = "Enter a valid email address.";
    }
    if (!password) {
      errors["password"] = "Password is required.";
    } else if (password.length < 8) {
      errors["password"] = "Password must be at least 8 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    try {
      await login(email, password);
      router.push("/deployments");
    } catch {
      // Error is set in authStore
    }
  }

  return (
    <div className="min-h-screen bg-brand-midnight flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-electric rounded-xl mb-4">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <h1 className="text-brand-text-primary text-2xl font-bold">Welcome back</h1>
          <p className="text-brand-text-muted text-sm mt-2">
            Sign in to your GridMind portal
          </p>
        </div>

        {/* Form */}
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

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input ${fieldErrors["email"] ? "border-brand-red/50 focus:ring-brand-red/30" : ""}`}
                placeholder="you@example.com"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors["email"])}
                aria-describedby={fieldErrors["email"] ? "email-error" : undefined}
              />
              {fieldErrors["email"] && (
                <p id="email-error" className="error-text" role="alert">
                  {fieldErrors["email"]}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-electric hover:underline focus:outline-none focus:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input ${fieldErrors["password"] ? "border-brand-red/50 focus:ring-brand-red/30" : ""}`}
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors["password"])}
                aria-describedby={fieldErrors["password"] ? "password-error" : undefined}
              />
              {fieldErrors["password"] && (
                <p id="password-error" className="error-text" role="alert">
                  {fieldErrors["password"]}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-brand-text-muted text-sm mt-5">
            No account?{" "}
            <Link
              href="/register"
              className="text-brand-electric hover:underline focus:outline-none focus:underline"
            >
              Create one free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
