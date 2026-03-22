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
          electric: "#2563EB",
          ocean: "#0EA5E9",
          cyan: "#06B6D4",
          midnight: "#0A0E14",
          navy: "#111820",
          green: "#10B981",
          red: "#EF4444",
          amber: "#F59E0B",
          purple: "#8B5CF6",
          slate: "#1E2A3A",
          "slate-light": "#2A3A4E",
          "text-primary": "#F1F5F9",
          "text-secondary": "#94A3B8",
          "text-muted": "#64748B",
          "border-subtle": "#1E2A3A",
          "border-default": "#2A3A4E",
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
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "spin-slow": "spin 2s linear infinite",
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
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.24)",
        "card-hover":
          "0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(37, 99, 235, 0.3)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.2)",
        "glow-red": "0 0 20px rgba(239, 68, 68, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
