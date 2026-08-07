// src/lib/s2d-credential-vault.ts
// In-memory vault for S2D credentials — raw tokens NEVER returned to browser
// Per Phase 4 spec: PUT /api/s2d/credentials live-verifies token against provider
// (e.g. Apify GET https://api.apify.com/v2/users/me) before committing.

export interface VaultEntry {
  key: string;
  masked: string;
  verified: boolean;
  verifiedAt?: string;
  provider?: string;
  // Raw token is stored only server-side in memory (never serialized to client)
  _raw?: string;
}

const vault = new Map<string, VaultEntry>();

export function maskToken(token: string): string {
  if (!token) return "••••";
  if (token.length <= 8) return `${token.slice(0, 2)}***${token.slice(-2)}`;
  // Show first 4 and last 4 like apif***9x2a
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

export function setVaultEntry(key: string, token: string, opts: { verified?: boolean; provider?: string } = {}): VaultEntry {
  const entry: VaultEntry = {
    key,
    masked: maskToken(token),
    verified: opts.verified ?? false,
    verifiedAt: opts.verified ? new Date().toISOString() : undefined,
    provider: opts.provider,
    _raw: token,
  };
  vault.set(key, entry);
  return entry;
}

export function getVaultEntry(key: string): VaultEntry | undefined {
  return vault.get(key);
}

export function getMaskedVault(): Record<string, Omit<VaultEntry, "_raw">> {
  const out: Record<string, Omit<VaultEntry, "_raw">> = {};
  for (const [k, v] of vault.entries()) {
    const { _raw, ...masked } = v;
    out[k] = masked;
  }
  return out;
}

export function getRawToken(key: string): string | undefined {
  return vault.get(key)?._raw;
}

export function listVaultKeys(): string[] {
  return Array.from(vault.keys());
}
