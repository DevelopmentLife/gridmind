import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          // Primary accent for superadmin: Amber (god-mode distinction)
          primary: "#F59E0B",
          amber: "#F59E0B",
          "amber-dark": "#D97706",
          "amber-light": "#FCD34D",
          // Secondary (Electric Blue, used as secondary only)
          electric: "#2563EB",
          ocean: "#0EA5E9",
          cyan: "#06B6D4",
          // Backgrounds
          midnight: "#0A0E14",
          navy: "#111820",
          // Status
          green: "#10B981",
          red: "#EF4444",
          purple: "#8B5CF6",
          // Surface layers
          slate: "#1E2A3A",
          "slate-light": "#2A3A4E",
          // Typography
          "text-primary": "#F1F5F9",
          "text-secondary": "#94A3B8",
          "text-muted": "#64748B",
          // Borders
          "border-subtle": "#1E2A3A",
          "border-default": "#2A3A4E",
          "border-amber": "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "amber-gradient":
          "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "amber-pulse": "amberPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        amberPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)" },
          "50%": { boxShadow: "0 0 24px rgba(245, 158, 11, 0.8)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.24)",
        "card-hover":
          "0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(37, 99, 235, 0.3)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.2)",
        "glow-red": "0 0 20px rgba(239, 68, 68, 0.2)",
        "glow-amber": "0 0 20px rgba(245, 158, 11, 0.4)",
        "glow-amber-intense": "0 0 40px rgba(245, 158, 11, 0.6)",
      },
      borderColor: {
        amber: "#F59E0B",
      },
    },
  },
  plugins: [],
};

export default config;
