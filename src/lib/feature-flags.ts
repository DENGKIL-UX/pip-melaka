/**
 * src/lib/feature-flags.ts
 * ---------------------------------------------------------------------------
 * PIP-MLK runtime feature-toggle system.
 *
 * See docs/RESEARCH-CICD.md §7 for the full feature-flag strategy. Flags are:
 *
 *   - Defined in code (DEFAULT_FLAGS) with a safe default
 *   - Overridable via environment variables (NEXT_PUBLIC_FEATURE_<FLAG>)
 *   - Read at runtime via isFeatureEnabled(flag) or getFeatureFlags()
 *   - Safe to call from both server and client (flags use NEXT_PUBLIC_ prefix
 *     so Next.js inlines them into the client bundle)
 *
 * Flag values:
 *   - "1", "true",  "yes", "on"  → enabled  (case-insensitive)
 *   - "0", "false", "no",  "off" → disabled (case-insensitive)
 *   - unset / anything else      → DEFAULT_FLAGS value
 *
 * Usage in a server component or API route:
 *   import { isFeatureEnabled } from "@/lib/feature-flags";
 *   if (isFeatureEnabled("enableAIAssistant")) { ... }
 *
 * Usage in a client component (works because NEXT_PUBLIC_ is inlined):
 *   "use client";
 *   import { isFeatureEnabled } from "@/lib/feature-flags";
 *   if (isFeatureEnabled("enable3DMap")) { ... }
 *
 * Usage in middleware / route guards:
 *   import { getFeatureFlags } from "@/lib/feature-flags";
 *   const flags = getFeatureFlags();
 *   if (!flags.enableS2DConsole) return new Response("Disabled", { status: 503 });
 * ---------------------------------------------------------------------------
 */

/** Canonical list of feature flags supported by the system. */
export type FeatureFlag =
  | "enableAIAssistant"
  | "enable3DMap"
  | "enableS2DConsole"
  | "enableCompare";

/** Safe defaults — what you get when the corresponding env var is unset. */
export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  enableAIAssistant: true,
  enable3DMap: true,
  enableS2DConsole: true,
  enableCompare: true,
};

const ENV_PREFIX = "NEXT_PUBLIC_FEATURE_";

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const FALSY = new Set(["0", "false", "no", "off"]);

/**
 * Read a single flag from the environment. Returns the default when the env
 * var is unset or unparseable.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const defaultValue = DEFAULT_FLAGS[flag];
  if (typeof process === "undefined" || !process.env) return defaultValue;

  const envKey = `${ENV_PREFIX}${flag.toUpperCase()}`;
  const raw = process.env[envKey];
  if (raw === undefined || raw === "") return defaultValue;

  const normalized = raw.trim().toLowerCase();
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return defaultValue;
}

/**
 * Read ALL flags at once. Useful for logging, middleware, or seeding a
 * Zustand store on the client.
 */
export function getFeatureFlags(): Record<FeatureFlag, boolean> {
  return {
    enableAIAssistant: isFeatureEnabled("enableAIAssistant"),
    enable3DMap: isFeatureEnabled("enable3DMap"),
    enableS2DConsole: isFeatureEnabled("enableS2DConsole"),
    enableCompare: isFeatureEnabled("enableCompare"),
  };
}

/**
 * `describeFeatureFlags` — returns the flag set with both the effective value
 * and the source ("env" | "default"). Used by the /api/health endpoint and
 * the governance tab to surface flag provenance.
 */
export function describeFeatureFlags(): Array<{ flag: FeatureFlag; enabled: boolean; source: "env" | "default" }> {
  const out: Array<{ flag: FeatureFlag; enabled: boolean; source: "env" | "default" }> = [];
  for (const flag of Object.keys(DEFAULT_FLAGS) as FeatureFlag[]) {
    const envKey = `${ENV_PREFIX}${flag.toUpperCase()}`;
    const raw = typeof process !== "undefined" && process.env ? process.env[envKey] : undefined;
    const fromEnv = raw !== undefined && raw !== "";
    out.push({
      flag,
      enabled: isFeatureEnabled(flag),
      source: fromEnv ? "env" : "default",
    });
  }
  return out;
}
