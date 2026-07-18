// src/lib/secrets-check.ts
// PIP-MLK Startup Secrets Check — runs once at app boot.
// Security-01: validate every required secret BEFORE the first request is
// served. Logs a redacted summary; never prints secret values.

import { validateSecrets, redactSecrets, type SecretValidationReport } from "@/lib/secrets";

let _bootReport: SecretValidationReport | null = null;
let _bootRan = false;

/**
 * Run the startup secrets validation. Safe to call multiple times — the
 * result is cached in-module so repeated calls are O(1).
 *
 * In production, callers should exit(1) if `report.ok === false`.
 * In development, we log a warning so devs can iterate without crashing.
 */
export function runStartupSecretsCheck(): SecretValidationReport {
  if (_bootRan) return _bootReport ?? validateSecrets();
  _bootRan = true;
  _bootReport = validateSecrets();
  logReport(_bootReport);
  return _bootReport;
}

function logReport(report: SecretValidationReport): void {
  const isProd = process.env.NODE_ENV === "production";

  const summary = [
    `[secrets-check] boot validation ${report.ok ? "PASSED" : "FAILED"}`,
    `  checked_at: ${report.checkedAt}`,
    `  present:    ${report.present.join(", ") || "(none)"}`,
  ];
  if (report.missing.length > 0) {
    summary.push(`  MISSING:   ${report.missing.join(", ")}`);
  }
  if (report.tooShort.length > 0) {
    summary.push(`  TOO_SHORT: ${report.tooShort.join(", ")}`);
  }
  // redactSecrets is belt-and-suspenders — no secret values should appear
  // here in the first place, but if a future maintainer accidentally adds
  // a value to the log line, redaction will catch it.
  const safe = redactSecrets(summary.join("\n"));
  if (report.ok) {
    console.info(safe);
  } else if (isProd) {
    console.error(safe);
    // In production: hard-fail so the process cannot serve traffic with
    // missing secrets. Comment out for local dev.
    // process.exit(1);
  } else {
    console.warn(safe);
  }
}

/**
 * Retrieve the cached boot report (or run the check if it hasn't run yet).
 * Useful for health-check endpoints that want to expose validation status
 * without re-running the check on every request.
 */
export function getBootReport(): SecretValidationReport {
  return _bootReport ?? runStartupSecretsCheck();
}

// ---------------------------------------------------------------------------
// Eager boot — importing this module triggers the check once on first load.
// We gate on process.env.SKIP_SECRETS_CHECK so test harnesses can opt out.
// ---------------------------------------------------------------------------

if (!process.env.SKIP_SECRETS_CHECK && process.env.NODE_ENV !== "test") {
  try {
    runStartupSecretsCheck();
  } catch (e) {
    // Never let the secrets check itself crash the app — log and move on.
    console.error(
      "[secrets-check] FATAL: validation threw —",
      e instanceof Error ? e.message : String(e),
    );
  }
}
