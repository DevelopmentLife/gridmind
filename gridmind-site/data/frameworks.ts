import { Framework } from "@/types";

export const frameworks: readonly Framework[] = [
  {
    name: "NullClaw",
    icon: "\u{1F9BE}",
    status: "available",
    description: "678KB native runtime, ~1MB RAM. Zero-dependency agent orchestration.",
  },
  {
    name: "LangChain / LangGraph",
    icon: "\u{1F517}",
    status: "available",
    description: "Full tool-use, memory, and graph workflow support",
  },
  {
    name: "Claude Code Agent Teams",
    icon: "\u{1F916}",
    status: "available",
    description: "Native ATLAS/HERALD/FORGE team deployment",
  },
  {
    name: "CrewAI",
    icon: "\u{1F465}",
    status: "coming_soon",
    description: "Role-based crew deployment with GridMind auto-scaling",
  },
  {
    name: "AutoGen",
    icon: "\u{1F504}",
    status: "coming_soon",
    description: "Multi-agent conversation with GridMind cost attribution",
  },
  {
    name: "OpenAI Agents SDK",
    icon: "\u{1F4A1}",
    status: "coming_soon",
    description: "Tool-use agents with model routing",
  },
  {
    name: "Custom / BYO Framework",
    icon: "\u{1F527}",
    status: "enterprise",
    description: "Bring your own runtime; GridMind wraps it",
  },
] as const;
