"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import NeuralMesh from "./NeuralMesh";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");

      if (!EMAIL_REGEX.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }

      setSubmitting(true);
      try {
        // In dev, mock the API call — just show success
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSubmitted(true);
        setEmail("");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [email]
  );

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center overflow-hidden bg-slate-950"
      aria-labelledby="hero-heading"
    >
      <NeuralMesh />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="mb-6 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-xs text-primary-300">
            Agentic Infrastructure Platform
          </span>
        </motion.div>

        <motion.h1
          id="hero-heading"
          className="mx-auto max-w-4xl font-heading text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Deploy AI agent teams at any scale.{" "}
          <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Zero infrastructure overhead.
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-8 max-w-2xl text-lg text-slate-400 sm:text-xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          GridMind provisions, routes, scales, and observes your AI agent fleet
          — so your team ships product instead of managing infrastructure.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border border-emerald/30 bg-emerald-500/10 px-6 py-3 text-sm text-emerald-400"
            >
              You are on the waitlist! We will be in touch soon.
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center gap-3 sm:flex-row"
              aria-label="Join waitlist"
            >
              <label htmlFor="hero-email" className="sr-only">
                Email address
              </label>
              <input
                id="hero-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="min-w-0 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-72"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-600 hover:shadow-primary/40 disabled:opacity-60"
              >
                {submitting ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-lg border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
          >
            See How It Works
          </a>
        </motion.div>

        <motion.p
          className="mt-4 text-sm text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          14-day free trial · No credit card required
        </motion.p>
      </div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}
