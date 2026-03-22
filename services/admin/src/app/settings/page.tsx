// =============================================================================
// GridMind Admin — Platform Settings Page
// =============================================================================

"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-brand-border-subtle last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-brand-text-primary">{label}</p>
        <p className="text-xs text-brand-text-secondary mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric focus:ring-offset-2 focus:ring-offset-brand-midnight ${
        enabled ? "bg-brand-electric" : "bg-brand-border-default"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const setBreadcrumbs = useUiStore((s) => s.setBreadcrumbs);

  useEffect(() => {
    setBreadcrumbs([{ label: "Settings" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">
          Platform Settings
        </h1>
        <p className="text-brand-text-secondary text-sm mt-1">
          Global platform configuration for GridMind operators
        </p>
      </div>

      {/* Agent Behaviour */}
      <section>
        <h2 className="text-xs font-semibold text-brand-text-muted uppercase tracking-widest font-mono mb-4">
          Agent Behaviour
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg px-5">
          <SettingRow
            label="Global autonomous mode"
            description="Allow AUTONOMOUS agents to execute without any approval gate. Applies across all tenants."
          >
            <Toggle enabled={true} label="Toggle global autonomous mode" />
          </SettingRow>
          <SettingRow
            label="Approval timeout (seconds)"
            description="Time before an unresponded approval request is auto-denied."
          >
            <input
              type="number"
              defaultValue={300}
              min={60}
              max={3600}
              aria-label="Approval timeout in seconds"
              className="w-24 bg-brand-midnight border border-brand-border-default rounded px-3 py-1.5 text-sm font-mono text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric text-right"
            />
          </SettingRow>
          <SettingRow
            label="LLM circuit breaker"
            description="Pause all LLM calls if API error rate exceeds threshold in a 5-minute window."
          >
            <Toggle enabled={true} label="Toggle LLM circuit breaker" />
          </SettingRow>
          <SettingRow
            label="Agent heartbeat interval (seconds)"
            description="How frequently agents publish heartbeat events to NATS."
          >
            <input
              type="number"
              defaultValue={10}
              min={5}
              max={60}
              aria-label="Heartbeat interval in seconds"
              className="w-24 bg-brand-midnight border border-brand-border-default rounded px-3 py-1.5 text-sm font-mono text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric text-right"
            />
          </SettingRow>
        </div>
      </section>

      {/* Alerting */}
      <section>
        <h2 className="text-xs font-semibold text-brand-text-muted uppercase tracking-widest font-mono mb-4">
          Alerting
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg px-5">
          <SettingRow
            label="P1 incident PagerDuty integration"
            description="Automatically page on-call when a P1 incident is opened."
          >
            <Toggle enabled={true} label="Toggle PagerDuty P1 paging" />
          </SettingRow>
          <SettingRow
            label="Slack notifications"
            description="Send incident and approval notifications to the configured Slack channel."
          >
            <Toggle enabled={true} label="Toggle Slack notifications" />
          </SettingRow>
          <SettingRow
            label="Email digest"
            description="Send daily summary email to operators with fleet health and open incidents."
          >
            <Toggle enabled={false} label="Toggle email digest" />
          </SettingRow>
        </div>
      </section>

      {/* Security */}
      <section>
        <h2 className="text-xs font-semibold text-brand-text-muted uppercase tracking-widest font-mono mb-4">
          Security
        </h2>
        <div className="bg-brand-navy border border-brand-border-default rounded-lg px-5">
          <SettingRow
            label="Audit log retention"
            description="How long to retain audit log entries in PostgreSQL."
          >
            <select
              defaultValue="365"
              aria-label="Audit log retention period"
              className="bg-brand-midnight border border-brand-border-default rounded px-3 py-1.5 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
            >
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="730">2 years</option>
              <option value="0">Indefinite</option>
            </select>
          </SettingRow>
          <SettingRow
            label="Session timeout"
            description="Inactive operator sessions are terminated after this period."
          >
            <select
              defaultValue="480"
              aria-label="Session timeout"
              className="bg-brand-midnight border border-brand-border-default rounded px-3 py-1.5 text-sm text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-electric"
            >
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
              <option value="480">8 hours</option>
              <option value="1440">24 hours</option>
            </select>
          </SettingRow>
          <SettingRow
            label="Two-factor authentication"
            description="Require 2FA for all operator accounts accessing this console."
          >
            <Toggle enabled={true} label="Toggle mandatory 2FA" />
          </SettingRow>
        </div>
      </section>

      {/* Platform info */}
      <section aria-label="Platform information">
        <h2 className="text-xs font-semibold text-brand-text-muted uppercase tracking-widest font-mono mb-4">
          Platform Information
        </h2>
        <dl className="bg-brand-navy border border-brand-border-default rounded-lg divide-y divide-brand-border-subtle">
          {[
            { label: "Admin version", value: "0.1.0" },
            { label: "Gateway version", value: "0.1.0" },
            { label: "Cortex version", value: "0.1.0" },
            { label: "NATS JetStream", value: "2.10.x (dual-cluster)" },
            { label: "PostgreSQL", value: "16.2 (AWS Aurora)" },
            { label: "Redis", value: "7.2 (ElastiCache)" },
            { label: "Environment", value: "Production" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center px-5 py-3">
              <dt className="text-xs text-brand-text-muted uppercase tracking-wider font-mono w-40 flex-shrink-0">
                {label}
              </dt>
              <dd className="font-mono text-sm text-brand-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="px-6 py-2.5 text-sm font-semibold bg-brand-electric text-white rounded-md hover:bg-brand-electric/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric focus:ring-offset-2 focus:ring-offset-brand-midnight"
        >
          Save Changes
        </button>
        <button
          type="button"
          className="px-6 py-2.5 text-sm text-brand-text-secondary hover:text-brand-text-primary transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
