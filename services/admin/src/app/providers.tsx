// =============================================================================
// GridMind Admin — Client Providers (data bootstrap)
// =============================================================================

"use client";

import { useEffect } from "react";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  MOCK_AGENTS,
  MOCK_APPROVALS,
  MOCK_FLEET_HEALTH,
  MOCK_INCIDENTS,
  MOCK_TENANTS,
} from "@/lib/mock-data";
import { useAgentStore } from "@/stores/agentStore";
import { useApprovalStore } from "@/stores/approvalStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";

function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen bg-brand-midnight overflow-hidden">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-0"}`}
      >
        <TopBar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function DataBootstrap() {
  const setAgents = useAgentStore((s) => s.setAgents);
  const setFleetHealth = useAgentStore((s) => s.setFleetHealth);
  const setTenants = useTenantStore((s) => s.setTenants);
  const setIncidents = useIncidentStore((s) => s.setIncidents);
  const setApprovals = useApprovalStore((s) => s.setApprovals);

  useEffect(() => {
    // Bootstrap with mock data (replace with real API calls in production)
    setAgents(MOCK_AGENTS);
    setFleetHealth(MOCK_FLEET_HEALTH);
    setTenants(MOCK_TENANTS);
    setIncidents(MOCK_INCIDENTS);
    setApprovals(MOCK_APPROVALS);
  }, [setAgents, setFleetHealth, setTenants, setIncidents, setApprovals]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DataBootstrap />
      <AppShell>{children}</AppShell>
    </>
  );
}
