// Server-only, process-local S2D credential vault.
// Raw values are never serialized by this module. Environment secrets remain
// the durable production source; dynamic entries are intentionally ephemeral
// and may disappear when a Worker isolate is recycled.

export type VerificationMode = "LIVE_PROVIDER" | "LOCAL_CRYPTO" | "FORMAT_ONLY";

export interface VaultEntry {
  key: string;
  masked: string;
  verified: boolean;
  verifiedAt?: string;
  provider?: string;
  verificationMode?: VerificationMode;
  source: "environment" | "dynamic.vault";
  _raw?: string;
}

export const S2D_CREDENTIAL_KEYS = [
  "APIFY_TOKEN",
  "S2D_ALERT_WHATSAPP_TOKEN",
  "S2D_ALERT_EMAIL_TOKEN",
  "S2D_BURP_DAST_API_KEY",
  "S2D_BURP_DAST_GRAPHQL_URL",
  "S2D_NETWORK_EVIDENCE_PRIVACY_KEY",
  "S2D_APIFY_WEBHOOK_SHARED_SECRET",
  "TIKTOK_API_KEY",
] as const;

export type S2dCredentialKey = typeof S2D_CREDENTIAL_KEYS[number];

const PROVIDERS: Record<S2dCredentialKey, string> = {
  APIFY_TOKEN: "Apify",
  S2D_ALERT_WHATSAPP_TOKEN: "WhatsApp Cloud API",
  S2D_ALERT_EMAIL_TOKEN: "Email provider",
  S2D_BURP_DAST_API_KEY: "Burp DAST",
  S2D_BURP_DAST_GRAPHQL_URL: "Burp DAST",
  S2D_NETWORK_EVIDENCE_PRIVACY_KEY: "Network evidence HMAC",
  S2D_APIFY_WEBHOOK_SHARED_SECRET: "Apify webhook HMAC",
  TIKTOK_API_KEY: "TikTok",
};

const vault = new Map<S2dCredentialKey, VaultEntry>();

export function maskToken(token: string): string {
  if (!token) return "••••";
  if (token.length <= 8) return `${token.slice(0, 2)}***${token.slice(-2)}`;
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

export function setVaultEntry(
  key: S2dCredentialKey,
  token: string,
  opts: { verified: boolean; provider?: string; verificationMode: VerificationMode },
): VaultEntry {
  const entry: VaultEntry = {
    key,
    masked: maskToken(token),
    verified: opts.verified,
    verifiedAt: opts.verified ? new Date().toISOString() : undefined,
    provider: opts.provider ?? PROVIDERS[key],
    verificationMode: opts.verificationMode,
    source: "dynamic.vault",
    _raw: token,
  };
  vault.set(key, entry);
  return entry;
}

export function getVaultEntry(key: S2dCredentialKey): VaultEntry | undefined {
  return vault.get(key);
}

export function getMaskedVault(): Partial<Record<S2dCredentialKey, Omit<VaultEntry, "_raw">>> {
  const out: Partial<Record<S2dCredentialKey, Omit<VaultEntry, "_raw">>> = {};

  for (const key of S2D_CREDENTIAL_KEYS) {
    const dynamicEntry = vault.get(key);
    if (dynamicEntry) {
      const { _raw: _discarded, ...masked } = dynamicEntry;
      out[key] = masked;
      continue;
    }

    const environmentValue = key === "APIFY_TOKEN"
      ? (process.env.APIFY_TOKEN?.trim() || process.env.APIFY_API_TOKEN?.trim())
      : process.env[key]?.trim();
    if (environmentValue) {
      out[key] = {
        key,
        masked: maskToken(environmentValue),
        verified: false,
        provider: PROVIDERS[key],
        source: "environment",
      };
    }
  }
  return out;
}

export function getRawToken(key: S2dCredentialKey): string | undefined {
  const dynamic = vault.get(key)?._raw?.trim();
  if (dynamic) return dynamic;
  const environmentValue = process.env[key]?.trim();
  if (environmentValue) return environmentValue;
  // Official Apify env is APIFY_TOKEN; older PIP docs/UI used APIFY_API_TOKEN.
  if (key === "APIFY_TOKEN") {
    return process.env.APIFY_API_TOKEN?.trim() || undefined;
  }
  return undefined;
}

export function listVaultKeys(): S2dCredentialKey[] {
  return S2D_CREDENTIAL_KEYS.filter((key) => Boolean(getRawToken(key)));
}
