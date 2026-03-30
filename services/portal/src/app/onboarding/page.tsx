"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OnboardingStep } from "@/components/OnboardingStep";

const STEPS = [
  {
    key: "connect",
    title: "Connect your infrastructure",
    description: "Provide connection credentials so our agents can begin monitoring.",
  },
  {
    key: "deploy",
    title: "Deploy AI agents",
    description: "Your fleet of 12 AI agents will be provisioned and begin monitoring within minutes.",
  },
  {
    key: "verify",
    title: "Verify health check",
    description: "Confirm that agents are running and your infrastructure is healthy.",
  },
];

type StepKey = "connect" | "deploy" | "verify";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepKey>("connect");
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [connectionString, setConnectionString] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [verifySuccess, setVerifySuccess] = useState(false);

  function completeStep(key: StepKey) {
    setCompletedSteps((prev) => new Set([...prev, key]));
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnectionError("");
    if (!connectionString.trim()) {
      setConnectionError("Connection string is required.");
      return;
    }
    if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("mysql://") && !connectionString.startsWith("redis://") && !connectionString.startsWith("mongodb://")) {
      setConnectionError("Must be a valid connection URI (postgresql://, mysql://, redis://, mongodb://).");
      return;
    }
    completeStep("connect");
    setCurrentStep("deploy");
  }

  async function handleDeploy() {
    setIsDeploying(true);
    setDeployProgress(0);
    // Simulate agent deployment progress
    const interval = setInterval(() => {
      setDeployProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDeploying(false);
          completeStep("deploy");
          setCurrentStep("verify");
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  }

  async function handleVerify() {
    setIsVerifying(true);
    // Simulate health check
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsVerifying(false);
    setVerifySuccess(true);
    completeStep("verify");
  }

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="min-h-screen bg-brand-midnight flex">
      {/* Left panel — steps */}
      <div className="w-80 flex-shrink-0 bg-brand-navy border-r border-brand-border-default p-8 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-brand-text-primary font-bold">GridMind</span>
          </div>
          <p className="text-brand-text-muted text-xs">Setup wizard</p>
        </div>
        <div className="space-y-3 flex-1">
          {STEPS.map((s, i) => (
            <OnboardingStep
              key={s.key}
              stepNumber={i + 1}
              totalSteps={STEPS.length}
              title={s.title}
              description={s.description}
              isActive={currentStep === s.key}
              isCompleted={completedSteps.has(s.key as StepKey)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push("/deployments")}
          className="text-brand-text-muted hover:text-brand-text-secondary text-sm transition-colors focus:outline-none text-left mt-8"
        >
          Skip setup →
        </button>
      </div>

      {/* Right panel — content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-xl"
        >
          {/* Step 1: Connect */}
          {currentStep === "connect" && (
            <div>
              <h2 className="text-brand-text-primary text-2xl font-bold mb-2">Connect your infrastructure</h2>
              <p className="text-brand-text-muted text-sm mb-6">
                GridMind agents need access to your infrastructure. We recommend creating a dedicated monitoring user.
              </p>
              <form onSubmit={handleConnect} noValidate>
                <div className="mb-4">
                  <label htmlFor="connectionString" className="label">Connection string</label>
                  <input
                    id="connectionString"
                    type="text"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    className={`input font-mono text-sm ${connectionError ? "border-brand-red/50" : ""}`}
                    placeholder="postgresql://monitor:password@host:5432/mydb"
                    aria-required="true"
                    aria-invalid={Boolean(connectionError)}
                    aria-describedby={connectionError ? "conn-error" : undefined}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  {connectionError && <p id="conn-error" className="error-text" role="alert">{connectionError}</p>}
                </div>
                <div className="bg-brand-slate/50 border border-brand-border-subtle rounded-lg p-4 mb-6">
                  <p className="text-brand-text-secondary text-xs font-medium mb-2">Required permissions</p>
                  <ul className="space-y-1 text-brand-text-muted text-xs">
                    <li>• SELECT on all tables (for agent analysis)</li>
                    <li>• pg_stat_statements access (for agent intelligence)</li>
                    <li>• pg_monitor role (for performance metrics)</li>
                  </ul>
                </div>
                <button type="submit" className="btn-primary">Connect infrastructure →</button>
              </form>
            </div>
          )}

          {/* Step 2: Deploy agents */}
          {currentStep === "deploy" && (
            <div>
              <h2 className="text-brand-text-primary text-2xl font-bold mb-2">Deploy your agents</h2>
              <p className="text-brand-text-muted text-sm mb-6">
                12 AI agents specialized for your infrastructure will be provisioned. This takes about 30 seconds.
              </p>
              {!completedSteps.has("deploy") && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {["ARGUS", "ORACLE", "TITAN", "SHERLOCK", "AEGIS", "FORGE", "CONVOY", "VAULT", "TUNER", "HARBOR", "HERALD", "PRISM"].map((name) => (
                      <div key={name} className="flex items-center gap-2 p-3 bg-brand-navy border border-brand-border-subtle rounded-lg">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDeploying && deployProgress > 50 ? "bg-brand-green animate-pulse" : "bg-brand-slate-light"}`} aria-hidden="true" />
                        <span className="text-brand-text-secondary text-xs font-mono">{name}</span>
                      </div>
                    ))}
                  </div>
                  {isDeploying && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-xs text-brand-text-muted mb-1">
                        <span>Provisioning agents…</span>
                        <span>{deployProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-brand-slate rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-brand-electric rounded-full"
                          animate={{ width: `${deployProgress}%` }}
                          transition={{ duration: 0.2 }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  )}
                  {!isDeploying && (
                    <button type="button" onClick={handleDeploy} className="btn-primary">
                      Deploy 12 agents →
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Verify */}
          {currentStep === "verify" && (
            <div>
              <h2 className="text-brand-text-primary text-2xl font-bold mb-2">Verify health check</h2>
              <p className="text-brand-text-muted text-sm mb-6">
                Confirm your agents are running and can reach your infrastructure.
              </p>
              {!verifySuccess ? (
                <>
                  <div className="bg-brand-slate/50 border border-brand-border-subtle rounded-lg p-5 mb-6">
                    <div className="space-y-3 text-sm">
                      {[
                        "Agent runtime connected",
                        "Infrastructure connection reachable",
                        "Metrics collection active",
                        "Event mesh subscribed",
                      ].map((check) => (
                        <div key={check} className="flex items-center gap-2 text-brand-text-secondary">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isVerifying || verifySuccess ? "bg-brand-green" : "bg-brand-slate-light"}`} aria-hidden="true">
                            {(isVerifying || verifySuccess) && "✓"}
                          </span>
                          {check}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={handleVerify} disabled={isVerifying} className="btn-primary flex items-center gap-2">
                    {isVerifying ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Running checks…
                      </>
                    ) : (
                      "Run health check"
                    )}
                  </button>
                </>
              ) : (
                <div>
                  <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl p-6 mb-6 text-center">
                    <div className="text-4xl mb-3" aria-hidden="true">✅</div>
                    <h3 className="text-brand-green font-bold text-lg mb-1">All systems operational</h3>
                    <p className="text-brand-text-muted text-sm">Your agents are live and monitoring your infrastructure.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/deployments")}
                    className="btn-primary w-full"
                  >
                    Go to dashboard →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step counter */}
          <p className="text-brand-text-muted text-xs mt-6">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
