// src/instrumentation.ts
// PIP-MLK instrumentation hook — runs ONCE on Next.js server startup.
// Security-01: triggers the eager secrets validation in secrets-check.ts
// so missing/weak env vars are caught BEFORE the first request is served.

export async function register(): Promise<void> {
  // Dynamic import so the secrets check (and its console logging) never
  // leaks into the client bundle — instrumentation runs server-side only,
  // but the explicit dynamic import makes the boundary unambiguous.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupSecretsCheck } = await import("./lib/secrets-check");
    try {
      const report = runStartupSecretsCheck();
      if (!report.ok && process.env.NODE_ENV === "production") {
        // In production we want the process to fail fast so the orchestrator
        // (PM2 / systemd / Kubernetes) restarts it with proper env vars.
        // We log first so the operator sees the reason in logs.
        console.error(
          "[instrumentation] secrets validation failed — exiting. Set the missing env vars and restart.",
        );
        process.exit(1);
      }
    } catch (e) {
      console.error(
        "[instrumentation] secrets check threw —",
        e instanceof Error ? e.message : String(e),
      );
      // Don't exit — the app may still be usable with degraded functionality.
    }
  }
}
