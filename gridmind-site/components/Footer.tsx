"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Agents", href: "#agents" },
    { label: "Pricing", href: "#pricing" },
    { label: "Engines", href: "#engines" },
    { label: "Docs", href: "https://docs.gridmindai.dev" },
    { label: "Blog", href: "https://blog.gridmindai.dev" },
    { label: "Status", href: "https://status.gridmindai.dev" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "mailto:hello@gridmindai.dev" },
  ],
} as const;

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (email.trim()) {
        setSubmitted(true);
        setEmail("");
      }
    },
    [email]
  );

  return (
    <footer
      className="border-t border-white/10 bg-slate-950"
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand + newsletter */}
          <div className="lg:col-span-2">
            <Link href="/" className="font-heading text-xl font-bold text-white">
              Grid<span className="text-primary">Mind</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-slate-500">
              AI-native database operations. 24 autonomous agents that monitor,
              optimize, scale, and secure your databases.
            </p>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-white">
                Stay up to date
              </h3>
              {submitted ? (
                <p className="mt-3 text-sm text-emerald">
                  Thanks for subscribing!
                </p>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="mt-3 flex gap-2"
                  aria-label="Newsletter signup"
                >
                  <label htmlFor="footer-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white">{category}</h3>
              <ul className="mt-4 space-y-3" role="list">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-slate-600">
            &copy; 2026 GridMind. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
