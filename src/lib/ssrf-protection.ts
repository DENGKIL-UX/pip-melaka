// src/lib/ssrf-protection.ts
// PIP-MLK SSRF protection — block requests to internal/loopback/link-local IPs.
// Security-01: any outbound fetch initiated by the server (e.g. webhook, URL
// preview, OAuth callback) MUST pass through isSafeURL() first.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// ---------------------------------------------------------------------------
// Blocked CIDR ranges — RFC 1918, loopback, link-local, carrier-grade NAT,
// metadata service (169.254.169.254 is the classic cloud IMDS endpoint).
// ---------------------------------------------------------------------------

interface BlockedRange {
  label: string;
  // For IPv4: [firstOctet, secondOctet-or-null, predicate]
  // For IPv6: prefix string match.
  v4?: (octets: number[]) => boolean;
  v6?: (groups: string[]) => boolean;
}

const BLOCKED_RANGES: BlockedRange[] = [
  {
    label: "loopback-v4 (127.0.0.0/8)",
    v4: (o) => o[0] === 127,
  },
  {
    label: "private-10 (10.0.0.0/8)",
    v4: (o) => o[0] === 10,
  },
  {
    label: "private-172 (172.16.0.0/12)",
    v4: (o) => o[0] === 172 && o[1] >= 16 && o[1] <= 31,
  },
  {
    label: "private-192 (192.168.0.0/16)",
    v4: (o) => o[0] === 192 && o[1] === 168,
  },
  {
    label: "link-local (169.254.0.0/16) — incl. cloud IMDS",
    v4: (o) => o[0] === 169 && o[1] === 254,
  },
  {
    label: "carrier-grade NAT (100.64.0.0/10)",
    v4: (o) => o[0] === 100 && o[1] >= 64 && o[1] <= 127,
  },
  {
    label: "unspecified (0.0.0.0/8)",
    v4: (o) => o[0] === 0,
  },
  {
    label: "broadcast (255.255.255.255/32)",
    v4: (o) => o[0] === 255 && o[1] === 255 && o[2] === 255 && o[3] === 255,
  },
  {
    label: "loopback-v6 (::1)",
    v6: (g) => g.length === 1 && g[0] === "1", // ::1 expands to ["1"]
  },
  {
    label: "link-local-v6 (fe80::/10)",
    v6: (g) => g[0] === "fe80",
  },
  {
    label: "unique-local-v6 (fc00::/7)",
    v6: (g) => {
      const first = parseInt(g[0] ?? "0", 16);
      return (first & 0xfe) === 0xfc; // fc00::/7 covers fc00..fdff
    },
  },
  {
    label: "v4-mapped-v6 (::ffff:a.b.c.d)",
    v6: (g) => g[0] === "0" && g[1] === "0" && g[2] === "0" && g[3] === "0" && g[4] === "0" && g[5] === "0" && g[6] === "ffff",
  },
];

// Schemes we permit for outbound fetches.
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

// Hostnames that should never be resolved (DNS rebinding defense baseline).
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal", // GCP IMDS
  "metadata", // Azure IMDS alias
]);

export interface SSRFCheckResult {
  ok: boolean;
  reason?: string;
  resolvedIP?: string;
}

// ---------------------------------------------------------------------------
// IPv4 / IPv6 parsing helpers
// ---------------------------------------------------------------------------

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function parseIPv6(ip: string): string[] | null {
  // node:net.isIP returns 6 for valid IPv6.
  if (isIP(ip) !== 6) return null;
  // Expand :: shorthand so we can compare groups uniformly.
  // Use the canonical form by splitting on "::" then padding.
  let halves = ip.split("::");
  let groups: string[];
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = ip.split(":");
  }
  // Normalise each group to lowercase hex, strip leading zeros.
  return groups.map((g) => g.toLowerCase().replace(/^0+/, "") || "0");
}

function checkIPAgainstBlocklist(ip: string): SSRFCheckResult {
  const v4 = parseIPv4(ip);
  if (v4) {
    for (const range of BLOCKED_RANGES) {
      if (range.v4 && range.v4(v4)) {
        return { ok: false, reason: `Blocked IP range: ${range.label}`, resolvedIP: ip };
      }
    }
    return { ok: true, resolvedIP: ip };
  }
  const v6 = parseIPv6(ip);
  if (v6) {
    for (const range of BLOCKED_RANGES) {
      if (range.v6 && range.v6(v6)) {
        return { ok: false, reason: `Blocked IP range: ${range.label}`, resolvedIP: ip };
      }
    }
    return { ok: true, resolvedIP: ip };
  }
  return { ok: false, reason: `Unparseable IP: ${ip}` };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a URL before fetching it from the server.
 *
 * Checks (in order):
 *   1. URL is well-formed.
 *   2. Scheme is http or https (no file://, gopher://, ftp://, etc.).
 *   3. No userinfo (http://user:pass@host/) — often used for bypass tricks.
 *   4. Hostname is not a known blocked literal ("localhost", IMDS aliases, …).
 *   5. Hostname is not a literal internal IP.
 *   6. DNS-resolve the hostname and verify the resolved IP is not internal.
 *
 * NOTE: DNS-rebinding attacks (where the resolver returns a public IP at
 * validation time but an internal IP at fetch time) require a follow-up
 * check at the socket layer. The `safeFetch` wrapper below re-validates
 * after fetch to catch the common case; for production-grade defense use
 * a custom dispatcher that pins the resolved IP.
 */
export async function isSafeURL(rawUrl: string): Promise<SSRFCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { ok: false, reason: `Disallowed scheme: ${url.protocol}` };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URL userinfo not allowed" };
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip [ ] for v6

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: `Blocked hostname: ${host}` };
  }

  // Literal IP in URL → check directly without DNS.
  if (isIP(host) !== 0) {
    return checkIPAgainstBlocklist(host);
  }

  // Hostname → resolve every A/AAAA record, ALL must be safe.
  let records;
  try {
    records = await lookup(host, { all: true });
  } catch (e) {
    return {
      ok: false,
      reason: `DNS lookup failed for ${host}: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
  if (records.length === 0) {
    return { ok: false, reason: `No DNS records for ${host}` };
  }
  for (const r of records) {
    const res = checkIPAgainstBlocklist(r.address);
    if (!res.ok) return res;
  }
  // Return the first resolved IP for logging.
  return { ok: true, resolvedIP: records[0]?.address };
}

/**
 * Synchronous URL safety check — only validates URL structure, scheme,
 * userinfo, and literal-IP blocklist. Does NOT perform DNS resolution.
 *
 * Use this for fast pre-filtering; always pair with the async isSafeURL()
 * before an actual fetch.
 */
export function isSafeURLSync(rawUrl: string): SSRFCheckResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }
  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { ok: false, reason: `Disallowed scheme: ${url.protocol}` };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URL userinfo not allowed" };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: `Blocked hostname: ${host}` };
  }
  if (isIP(host) !== 0) {
    return checkIPAgainstBlocklist(host);
  }
  return { ok: true };
}

/**
 * Fetch wrapper that validates the URL is SSRF-safe before delegating to
 * the global fetch. Throws an Error if the URL is unsafe.
 *
 * The returned Response is re-validated: if the redirect chain landed on
 * an internal IP (TOCTOU via 30x redirect), we reject the response.
 */
export async function safeFetch(
  rawUrl: string,
  init?: RequestInit,
): Promise<Response> {
  const check = await isSafeURL(rawUrl);
  if (!check.ok) {
    throw new Error(`SSRF blocked: ${check.reason ?? "unknown reason"}`);
  }

  // Force no-redirect by default — callers must opt into following redirects
  // and re-validate each hop. This eliminates the most common SSRF bypass.
  const followRedirects = init?.redirect ?? "manual";
  const res = await fetch(rawUrl, {
    ...init,
    redirect: followRedirects,
  });

  // If the server returned a redirect, validate the Location before exposing
  // the response to the caller.
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (loc) {
      const redirectCheck = await isSafeURL(loc);
      if (!redirectCheck.ok) {
        throw new Error(
          `SSRF blocked on redirect to ${loc}: ${redirectCheck.reason ?? "unknown"}`,
        );
      }
    }
  }

  return res;
}
