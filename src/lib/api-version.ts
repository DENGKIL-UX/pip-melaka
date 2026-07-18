/**
 * src/lib/api-version.ts
 * ---------------------------------------------------------------------------
 * PIP-MLK API versioning + version-negotiation middleware.
 *
 * See docs/RESEARCH-CICD.md §8 for the full API-versioning strategy.
 *
 * Versioning model:
 *
 *   - URL path versioning:        /api/v1/assistant, /api/v2/assistant
 *   - Optional header override:   Accept: application/vnd.pip-mlk+v2
 *   - Optional query override:    ?api-version=v2
 *
 * Negotiation precedence (highest first):
 *   1. Path version (the `v1` in `/api/v1/...`) — implicit, set by route folder
 *   2. Accept-header version                      — explicit, per request
 *   3. Query-string version                       — explicit, per request
 *   4. LATEST_VERSION                             — implicit fallback
 *
 * `withVersioning` wraps a Next.js Route Handler so that:
 *   - Every response gets `X-API-Version: <version>` set
 *   - Unsupported versions get HTTP 400 with a clear body
 *   - Deprecation headers (`Sunset`, `Deprecation`) are emitted for old versions
 *
 * Usage in a v1 route:
 *   // src/app/api/v1/assistant/route.ts
 *   import { withVersioning } from "@/lib/api-version";
 *   export const POST = withVersioning("v1", async (req) => {
 *     return Response.json({ ok: true });
 *   });
 * ---------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from "next/server";

/** All API versions currently supported by the platform. */
export const API_VERSIONS = ["v1"] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];

/** The newest version — used as the fallback when no version is requested. */
export const LATEST_VERSION: ApiVersion = "v1";

/** Versions considered deprecated — they still work but emit Sunset/Deprecation. */
export const DEPRECATED_VERSIONS: ReadonlySet<ApiVersion> = new Set<ApiVersion>([]);

/** Context handed to a versioned handler. */
export type VersionedContext = {
  version: ApiVersion;
  params: Record<string, string | string[]>;
};

/** A versioned Next.js Route Handler. */
export type VersionedHandler = (
  req: NextRequest,
  ctx: VersionedContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Parse a version string ("v1", "1", "V1") into a normalized `ApiVersion` or
 * `null` if it is not in API_VERSIONS.
 */
export function parseVersion(raw: string | null | undefined): ApiVersion | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  const normalized = trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
  return (API_VERSIONS as readonly string[]).includes(normalized)
    ? (normalized as ApiVersion)
    : null;
}

/**
 * Negotiate the version for a single request. Precedence: Accept header →
 * query string → LATEST_VERSION.
 */
export function negotiateVersion(req: NextRequest): ApiVersion {
  // 1. Accept header: application/vnd.pip-mlk+v1
  const accept = req.headers.get("accept") ?? "";
  const acceptMatch = accept.match(/application\/vnd\.pip-mlk\+(v\d+)/i);
  if (acceptMatch) {
    const v = parseVersion(acceptMatch[1]);
    if (v) return v;
  }

  // 2. Query string: ?api-version=v1
  const q = req.nextUrl.searchParams.get("api-version");
  if (q) {
    const v = parseVersion(q);
    if (v) return v;
  }

  // 3. Fallback
  return LATEST_VERSION;
}

/**
 * `withVersioning` — wrap a Route Handler with version negotiation + headers.
 *
 * Behavior:
 *   - The handler is associated with a specific `version` (the folder it
 *     lives in, e.g. src/app/api/v1/.../route.ts).
 *   - If the request negotiates a DIFFERENT version, we still serve the
 *     handler's version but tag the response with `X-API-Version-Note: served=v1 requested=v2`
 *     so clients can detect drift.
 *   - If the request asks for a version that is not in API_VERSIONS, we
 *     return HTTP 400 with a JSON body listing the supported versions.
 *   - If the served version is in DEPRECATED_VERSIONS, we emit `Deprecation: true`
 *     and `Sunset: <RFC-7231 date>` so clients see the deprecation warning.
 */
export function withVersioning(
  version: ApiVersion,
  handler: VersionedHandler,
): (req: NextRequest, ctx?: { params: Record<string, string | string[]> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    const requested = negotiateVersion(req);

    if (!API_VERSIONS.includes(requested)) {
      return NextResponse.json(
        {
          error: `Unsupported API version: "${requested}"`,
          supported: API_VERSIONS,
          latest: LATEST_VERSION,
        },
        { status: 400 },
      );
    }

    const res = await handler(req, {
      version,
      params: ctx?.params ?? {},
    });

    // Always tag the response with the served version.
    res.headers.set("X-API-Version", version);
    if (requested !== version) {
      res.headers.set("X-API-Version-Note", `served=${version} requested=${requested}`);
    }

    // Deprecation signals for old versions.
    if (DEPRECATED_VERSIONS.has(version)) {
      res.headers.set("Deprecation", "true");
      // Sunset date — 6 months from now, RFC-7231 format (YYYY-MM-DD).
      const sunset = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6);
      res.headers.set("Sunset", sunset.toISOString().slice(0, 10));
    }

    return res;
  };
}
