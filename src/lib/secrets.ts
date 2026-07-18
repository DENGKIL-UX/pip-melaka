// src/lib/secrets.ts
// PIP-MLK Secrets Management — typed access to env vars with startup validation.
// Security-01: every secret lives in process.env, is validated exactly once
// at boot, and is NEVER logged or serialised into a response.

// ---------------------------------------------------------------------------
// Secret registry — the single source of truth for what env vars the app needs.
// ---------------------------------------------------------------------------

export type SecretRequirement = {
  name: string;
  required: boolean;
  /** Hint shown only in dev-mode logs (never the value itself). */
  hint: string;
  /** Minimum length — anything shorter is treated as missing. */
  minLength?: number;
};

export const SECRET_REGISTRY: SecretRequirement[] = [
  {
    name: "DATABASE_URL",
    required: true,
    hint: "SQLite path or DB URL, e.g. file:./db/custom.db",
    minLength: 5,
  },
  {
    name: "JWT_SECRET",
    required: true,
    hint: "32+ random chars — `openssl rand -hex 32`",
    minLength: 32,
  },
  {
    name: "CSRF_SECRET",
    required: true,
    hint: "32+ random chars — `openssl rand -hex 32`",
    minLength: 32,
  },
  {
    name: "NEXTAUTH_SECRET",
    required: false,
    hint: "Required if NextAuth is enabled",
    minLength: 32,
  },
  {
    name: "NEXT_PUBLIC_APP_ORIGIN",
    required: false,
    hint: "Production origin, e.g. https://pip-mlk.example.gov.my",
  },
];

// ---------------------------------------------------------------------------
// getSecret — the ONLY way to read an env var. Throws on missing required
// secrets so failures are loud at the call site rather than silent in a log.
// ---------------------------------------------------------------------------

export class MissingSecretError extends Error {
  constructor(name: string) {
    super(`Missing required secret: ${name}`);
    this.name = "MissingSecretError";
  }
}

export function getSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new MissingSecretError(name);
  }
  return value;
}

/**
 * Like getSecret but returns undefined instead of throwing. Use for optional
 * secrets where the caller has its own fallback path.
 */
export function getOptionalSecret(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") return undefined;
  return value;
}

// ---------------------------------------------------------------------------
// validateSecrets — run once at startup. Returns a report; does NOT throw.
// The caller (secrets-check.ts) decides whether to crash the process.
// ---------------------------------------------------------------------------

export interface SecretValidationReport {
  ok: boolean;
  checkedAt: string;
  missing: string[];
  tooShort: string[];
  present: string[];
}

export function validateSecrets(): SecretValidationReport {
  const missing: string[] = [];
  const tooShort: string[] = [];
  const present: string[] = [];

  for (const req of SECRET_REGISTRY) {
    const value = process.env[req.name];
    if (!value || value.trim() === "") {
      if (req.required) missing.push(req.name);
      continue;
    }
    if (req.minLength && value.length < req.minLength) {
      tooShort.push(`${req.name} (<${req.minLength} chars)`);
      continue;
    }
    present.push(req.name);
  }

  return {
    ok: missing.length === 0 && tooShort.length === 0,
    checkedAt: new Date().toISOString(),
    missing,
    tooShort,
    present,
  };
}

// ---------------------------------------------------------------------------
// redactSecrets — utility for safe logging. Replaces any value from
// process.env that matches a known secret with `[REDACTED:<name>]`.
// ---------------------------------------------------------------------------

const SECRET_VALUE_PATTERNS: Array<{ name: string; re: RegExp }> = [];

function buildSecretRedactionPatterns(): void {
  for (const req of SECRET_REGISTRY) {
    const v = process.env[req.name];
    if (v && v.length >= 4) {
      // Escape regex special chars in the value.
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      SECRET_VALUE_PATTERNS.push({ name: req.name, re: new RegExp(escaped, "g") });
    }
  }
}

/**
 * Strip any known secret value from a string before logging it.
 * Idempotent — safe to call multiple times.
 */
export function redactSecrets(input: string): string {
  if (SECRET_VALUE_PATTERNS.length === 0) buildSecretRedactionPatterns();
  let out = input;
  for (const { name, re } of SECRET_VALUE_PATTERNS) {
    out = out.replace(re, `[REDACTED:${name}]`);
  }
  return out;
}
