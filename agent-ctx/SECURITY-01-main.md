# Agent Work Record — SECURITY-01

**Task ID**: SECURITY-01
**Agent**: main
**Date**: 2025-01-XX
**Status**: ✅ Complete

## Summary

Implemented a comprehensive defense-in-depth security stack for the PIP-MLK Next.js 16 dashboard. Created 9 new `src/lib/` modules, a Next.js middleware chokepoint, an instrumentation startup hook, comprehensive research documentation, and 2 new ESLint rules. Retrofitted existing API routes with CORS. Migrated the resilience-layer assistant route from the legacy `rateLimit(req, opts)` signature to the new `rateLimit({ identifier, route, limit, windowSeconds })` API while preserving `assessBackpressure` + `withInflight` backwards-compat exports.

## Files created

- `src/lib/cors.ts` (~125 lines) — Origin allowlist + `withCORS()` HOF
- `src/lib/csrf.ts` (~150 lines) — Double-submit cookie + HMAC-signed tokens
- `src/lib/ssrf-protection.ts` (~225 lines) — `isSafeURL()` + `safeFetch()` with redirect re-validation
- `src/lib/secrets.ts` (~150 lines) — `getSecret()` + `validateSecrets()` + `redactSecrets()`
- `src/lib/secrets-check.ts` (~75 lines) — Startup validation, eager-boot on import
- `src/lib/security-headers.ts` (~115 lines) — 9 headers + dynamic CSP (dev vs prod)
- `src/lib/jwt.ts` (~200 lines) — HMAC-SHA256 JWT with access (15m) + refresh (7d) rotation
- `src/lib/rate-limiter.ts` (~225 lines, MODIFIED) — Fixed-window limiter + preserved `assessBackpressure`/`withInflight`
- `src/middleware.ts` (~115 lines) — Edge-safe Next.js middleware (security headers + CORS + rate limit)
- `src/instrumentation.ts` (~30 lines) — Next.js 16 startup hook for secrets validation
- `docs/RESEARCH-SECURITY.md` (~640 lines) — 12-section research doc + audit checklist

## Files modified

- `src/app/api/route.ts` — Wrapped GET with `withCORS()`
- `src/app/api/assistant/route.ts` — Wrapped POST + GET with `withCORS()`; migrated `rateLimit()` to new API
- `eslint.config.mjs` — Added `no-restricted-syntax` (SQL guardrails) + `react/no-danger: "warn"`

## Key design decisions

1. **CORS `withCORS` generic uses `TCtx = RouteContext` default** — Initial impl used `TArgs extends RouteContext | void = void` which broke Next.js 16's `RouteHandlerConfig` validator (it passes `{ params: Promise<{}> }` to the handler, not `void`). Fixed by defaulting to the canonical context shape.
2. **CSRF uses HMAC-signed tokens, not just random nonces** — Double-submit alone is vulnerable to cookie-planting attacks (attacker sets their own cookie + header from a same-site subdomain). HMAC-binding to a server secret defeats this.
3. **JWT implemented with `node:crypto`, not `jose`/`jsonwebtoken`** — Zero new deps, fully auditable line-by-line, and sufficient for the HS256 use case. `jose` is available as a transitive dep via `next-auth` but depending on transitive deps is fragile.
4. **Rate limiter is in-memory** — Fine for single-instance dev sandbox. API designed so the `Map` can be swapped for Redis without changing call sites.
5. **`withCORS` wraps OUTERMOST in the assistant route** — `withCORS(withIdempotency(handlePost))` so even 429 rate-limit / backpressure rejections get CORS + security headers (otherwise the browser blocks the error response from being read by the client).
6. **Middleware excludes `/data/` from matcher** — Static JSON/JSONL files served as-is by Caddy/Next, no need for CORS or rate limit overhead.
7. **`react/no-danger` is `warn`, not `error`** — shadcn/ui's chart.tsx legitimately uses `dangerouslySetInnerHTML` for SVG styles. Warning flags it for review without breaking the build.

## Verification

- `bun run lint`: **0 errors, 1 warning** ✅ (warning is intentional `react/no-danger` on shadcn `chart.tsx:83`)
- `bunx tsc --noEmit --skipLibCheck`: **0 errors in any SECURITY-01 file** ✅ (all remaining TS errors are pre-existing in `examples/`, `skills/`, `analysis-tab.tsx`, `compare-tab.tsx`, `map-2d-tab.tsx`, `map-3d-tab.tsx`, `db-optimization.ts`, `websocket-server.ts`)
- Edge-runtime safety: middleware imports only `security-headers`, `cors`, `rate-limiter` — all edge-safe (no `node:*` imports)
- Backwards compat: `assessBackpressure` + `withInflight` preserved in `rate-limiter.ts`; assistant route's `circuit-breaker` + `idempotency` imports still resolve

## Unresolved / future work

1. Set `JWT_SECRET` + `CSRF_SECRET` in `.env` (currently only `DATABASE_URL` is set — dev logs a WARN but continues)
2. Tighten production CSP to nonce-based (drop `'unsafe-inline'` on `script-src`)
3. Swap in-memory rate limiter for Redis in multi-node deploys
4. Add JWT refresh-token `jti` revocation table for replay detection
5. Custom HTTP agent to fully defeat DNS-rebinding in SSRF protection
6. Silently per-file `eslint-disable react/no-danger` on `src/components/ui/chart.tsx` if warning becomes noisy
