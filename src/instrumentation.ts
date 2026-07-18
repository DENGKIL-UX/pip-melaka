// src/instrumentation.ts
// PIP-MLK instrumentation hook — runs ONCE on Next.js server startup.
// Security-01: triggers the eager secrets validation in secrets-check.ts
// so missing/weak env vars are caught BEFORE the first request is served.
//
// ponytail: MLK — Cloudflare Workers cannot process.exit(1). If secrets
// are missing, we log a warning and continue with degraded functionality.
// The app still works — JWT/CSRF features just won't be available.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runStartupSecretsCheck } = await import("./lib/secrets-check");
      const report = runStartupSecretsCheck();
      if (!report.ok) {
        console.warn(
          "[instrumentation] secrets validation: some env vars missing. JWT/CSRF features will be degraded. Set JWT_SECRET, CSRF_SECRET, PIP_VOTER_HASH_SALT for full functionality.",
        );
      }
    } catch (e) {
      console.warn(
        "[instrumentation] secrets check threw —",
        e instanceof Error ? e.message : String(e),
      );
    }
  }
}
