import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import type { PlatformSettings } from "@/types";

export const metadata: Metadata = {
  title: "Platform Settings",
};

const MOCK_SETTINGS: PlatformSettings = {
  jwtAlgorithm: "RS256",
  accessTokenExpiryMinutes: 15,
  refreshTokenExpiryDays: 7,
  globalRateLimitPerMinute: 600,
  maxRequestBodyKb: 1024,
  emailProvider: "AWS SES",
  smtpHost: "email-smtp.us-east-1.amazonaws.com",
  smtpPort: 587,
  vaultStatus: "connected",
  vaultVersion: "1.15.4",
  maintenanceMode: false,
  signupsEnabled: true,
  platformVersion: "1.2.0",
  environment: "production",
};

interface SettingRowProps {
  label: string;
  value: React.ReactNode;
  description?: string;
}

function SettingRow({ label, value, description }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-brand-border-subtle last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-brand-text-primary text-sm font-medium">{label}</p>
        {description && (
          <p className="text-brand-text-muted text-xs mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">{value}</div>
    </div>
  );
}

export default function SettingsPage() {
  const s = MOCK_SETTINGS;

  return (
    <>
      <TopBar
        title="Platform Settings"
        subtitle="Configuration, security, and infrastructure settings"
      />

      <div className="p-6 space-y-6">
        {/* Vault status */}
        <div
          className={[
            "rounded-xl p-4 border flex items-center gap-3",
            s.vaultStatus === "connected"
              ? "bg-brand-green/10 border-brand-green/30"
              : s.vaultStatus === "sealed"
              ? "bg-brand-amber/10 border-brand-amber/30"
              : "bg-brand-red/10 border-brand-red/30",
          ].join(" ")}
          role="status"
          aria-label={`Vault status: ${s.vaultStatus}`}
        >
          <span
            className={[
              "w-2.5 h-2.5 rounded-full flex-shrink-0",
              s.vaultStatus === "connected" ? "bg-brand-green" : s.vaultStatus === "sealed" ? "bg-brand-amber" : "bg-brand-red",
            ].join(" ")}
            aria-hidden="true"
          />
          <div>
            <p
              className={[
                "text-sm font-semibold capitalize",
                s.vaultStatus === "connected" ? "text-brand-green" : s.vaultStatus === "sealed" ? "text-brand-amber" : "text-brand-red",
              ].join(" ")}
            >
              HashiCorp Vault — {s.vaultStatus}
            </p>
            <p className="text-brand-text-muted text-xs">
              Version {s.vaultVersion} · All secrets healthy
            </p>
          </div>
        </div>

        {/* Platform status */}
        <section
          className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
          aria-labelledby="platform-status-heading"
        >
          <h2
            id="platform-status-heading"
            className="text-brand-text-primary text-sm font-semibold mb-4"
          >
            Platform Status
          </h2>

          <SettingRow
            label="Maintenance Mode"
            value={
              <span
                className={[
                  "inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold",
                  s.maintenanceMode
                    ? "bg-brand-amber/20 text-brand-amber border border-brand-amber/40"
                    : "bg-brand-green/20 text-brand-green border border-brand-green/40",
                ].join(" ")}
                aria-label={`Maintenance mode: ${s.maintenanceMode ? "enabled" : "disabled"}`}
              >
                {s.maintenanceMode ? "Enabled" : "Disabled"}
              </span>
            }
            description="When enabled, all customer-facing services return 503"
          />

          <SettingRow
            label="New Signups"
            value={
              <span
                className={[
                  "inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold",
                  s.signupsEnabled
                    ? "bg-brand-green/20 text-brand-green border border-brand-green/40"
                    : "bg-brand-red/20 text-brand-red border border-brand-red/40",
                ].join(" ")}
                aria-label={`Signups: ${s.signupsEnabled ? "enabled" : "disabled"}`}
              >
                {s.signupsEnabled ? "Open" : "Closed"}
              </span>
            }
            description="Controls whether new organizations can register"
          />

          <SettingRow
            label="Platform Version"
            value={
              <span className="text-brand-text-primary text-sm font-mono">
                v{s.platformVersion}
              </span>
            }
          />

          <SettingRow
            label="Environment"
            value={
              <span
                className={[
                  "inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase font-mono",
                  s.environment === "production"
                    ? "bg-brand-amber/20 text-brand-amber border border-brand-amber/40"
                    : "bg-brand-ocean/20 text-brand-ocean border border-brand-ocean/40",
                ].join(" ")}
              >
                {s.environment}
              </span>
            }
          />
        </section>

        {/* Security settings */}
        <section
          className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
          aria-labelledby="security-heading"
        >
          <h2
            id="security-heading"
            className="text-brand-text-primary text-sm font-semibold mb-4"
          >
            Security & Authentication
          </h2>

          <SettingRow
            label="JWT Algorithm"
            value={<span className="text-brand-text-primary text-sm font-mono">{s.jwtAlgorithm}</span>}
            description="RS256 uses asymmetric key pairs for production"
          />
          <SettingRow
            label="Access Token Expiry"
            value={<span className="text-brand-text-primary text-sm font-mono">{s.accessTokenExpiryMinutes}m</span>}
          />
          <SettingRow
            label="Refresh Token Expiry"
            value={<span className="text-brand-text-primary text-sm font-mono">{s.refreshTokenExpiryDays}d</span>}
          />
          <SettingRow
            label="Global Rate Limit"
            value={<span className="text-brand-text-primary text-sm font-mono">{s.globalRateLimitPerMinute} req/min</span>}
            description="Per-user per-endpoint limit"
          />
          <SettingRow
            label="Max Request Body"
            value={<span className="text-brand-text-primary text-sm font-mono">{s.maxRequestBodyKb}KB</span>}
          />
        </section>

        {/* Email config */}
        <section
          className="bg-brand-navy border border-brand-border-subtle rounded-xl p-5"
          aria-labelledby="email-heading"
        >
          <h2
            id="email-heading"
            className="text-brand-text-primary text-sm font-semibold mb-4"
          >
            Email Configuration
          </h2>

          <SettingRow
            label="Email Provider"
            value={<span className="text-brand-text-primary text-sm">{s.emailProvider}</span>}
          />
          <SettingRow
            label="SMTP Host"
            value={<span className="text-brand-text-secondary text-sm font-mono text-xs">{s.smtpHost}</span>}
          />
          <SettingRow
            label="SMTP Port"
            value={<span className="text-brand-text-primary text-sm font-mono">{s.smtpPort}</span>}
          />
        </section>

        {/* Read-only notice */}
        <div
          className="bg-brand-amber/5 border border-brand-amber/20 rounded-xl p-4"
          role="note"
          aria-label="Settings read-only notice"
        >
          <p className="text-brand-amber text-xs font-medium mb-1">
            Read-Only Display
          </p>
          <p className="text-brand-text-muted text-xs">
            Platform settings are managed via Terraform and HashiCorp Vault. Changes
            must be made through the infrastructure repository and CI/CD pipeline to
            ensure audit trail and rollback capability.
          </p>
        </div>
      </div>
    </>
  );
}
