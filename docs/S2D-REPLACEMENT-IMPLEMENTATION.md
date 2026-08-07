# S2D-360 Replacement — PIP Melaka Implementation Record

> **Upstream audited:** `DENGKIL-UX/S2D-workspace-code` commit `5d9f83bbedaaf0c0733ad61c18fa4752ea56fe71` (2026-08-07)
> **Engine:** `s2d-360-intelligence-engine` v1.0.0
> **Host:** `DENGKIL-UX/pip-melaka` / Cloudflare OpenNext
> **Last senior audit:** 2026-08-07

This record describes what is actually deployed by PIP Melaka. It intentionally distinguishes implemented controls from configuration-dependent production readiness.

## Phase 1 — Shared contracts

- `@ritzanalytics/pip-s2d-contracts` is bound to the CI-portable local mirror at `file:./packages/pip-s2d-contracts`.
- All 59 package files are byte-equivalent to upstream after CRLF/LF normalization.
- The nine versioned exchange entities and the exchange sanitizer are present.
- `GET /api/s2d/intelligence/signals` applies `sanitizeForSharedAggregateExchange` and the three post-sanitization assertions. The import is fail-closed; there is no unsanitized fallback.

## Phase 2 — API integration

Implemented Next.js/OpenNext route handlers:

- `GET /api/s2d/intelligence/signals?localityCode=MELAKA`
- `GET /api/s2d/intelligence/narratives`
- `GET /api/s2d/intelligence/recommendations`
- `GET /api/s2d/intelligence/briefs/daily` and `/daily-brief`
- `GET /api/s2d/intelligence/sentiment-snapshots`
- `GET /api/s2d/intelligence/change-points`
- `GET /api/s2d/intelligence/local-profiles`
- `GET /api/s2d/intelligence/forecasts`
- `POST /api/s2d/intelligence/validate-context`

Browser clients always use same-origin relative URLs. `S2D_ENGINE_URL=http://localhost:4000` is server-side development configuration only; a `NEXT_PUBLIC_*` localhost URL is deliberately not supported.

OpenNext compiles the App Router handlers into the Cloudflare Worker. `src/lib/s2d-cloudflare-handler.ts` remains a reference Fetch/Hono adapter, not a second production router. Output tracing for `/api/demographics` is explicitly scoped to `public/data`; this reduced the generated OpenNext artifact from 304 MB to 41 MB and stopped `upload/` archives and engine source copies from being embedded in the server function.

The iframe also contains upstream operations workspaces whose standalone server APIs (`collection-executions`, `dataset-retrievals`, `account-intelligence`, `network-intelligence`, `infrastructure-intelligence`, scheduling/reconciliation, etc.) have **not** been ported into this Worker. Their local/read-only UI can load, but backend mutations require the separately deployed authorized S2D Node service. This replacement does not present those controls as Cloudflare-native.

## Phase 3 — current upstream frontend

- The audited upstream monolith is 5,185 lines / 276,640 bytes and exposes 63 navigation workspaces across eight sections.
- `vendor/s2d-360/S2D360Engine.clean.jsx` and `public/s2d-360/S2D360Engine.clean.jsx` match upstream SHA-256 `e5be44dec458c9807ccb4056ef0c6976d1b2620158fc025cb8c625e46b4895e1`.
- The actual runtime bundle was rebuilt from upstream with Vite base `/s2d-360/` and is loaded by `S2D360Engine.wrapper.tsx` in a same-origin sandboxed iframe.
- All hard-coded `/assets/*` references were rebased to `/s2d-360/assets/*`; the accepted-corpus and logo requests no longer resolve to the wrong host path.
- The runtime build removes the optional Excel export path and therefore excludes upstream `xlsx@0.18.5`, which has prototype-pollution and ReDoS advisories. CSV and print/PDF export remain. The preserved source files stay byte-identical to upstream for auditability. This transformation is reproducible with `npm run build:s2d-runtime` and always restores the sibling checkout in a `finally` block.
- The newly exposed Account, Network, Linked Infrastructure, Infrastructure, Authorized Security Posture, and Authorized Network Evidence pages are in the runtime bundle, not only in an audit copy.
- Security/network pages receive truthful zero-state Edge fixtures (`NOT_RUN`, active scanning disabled). They do not imply that Nmap, Burp, or TShark ran on Cloudflare.
- Modern native pages remain mounted: Daily Brief, Alerts, Propagation Graph, Constituency Report, Sentiment Snapshots, Local Profiles, and Forecasting.
- The old tabs remain additive for rollback. This is an intentional deviation from the guide's destructive “remove legacy” step.

## Phase 4 — credentials and scraping

### Authentication

Production mutation/read access uses exact constant-time comparison against server-side `S2D_AUTH_TOKEN`. A long random bearer string or the mere presence of a NextAuth-looking cookie is not accepted. Role headers are trusted only after token authentication.

- Credential read/write: authenticated; write requires `SECURITY_APPROVER`.
- Scraper execution: authenticated; requires `SECURITY_APPROVER` or `S2D_ANALYST_WRITE`.
- Development bypass exists only when `NODE_ENV !== production`.
- Gear Settings has a non-persistent operator-token field for production API access.

### Credential vault

- Eight credential keys are supported.
- Responses expose masked metadata only.
- Provider/error text is redacted, request bodies are capped, strict Zod schemas are used, and prototype-pollution keys are rejected recursively.
- Apify, WhatsApp, SendGrid, and Burp key checks are live provider checks.
- Network/webhook HMAC keys use a labelled local cryptographic self-test.
- TikTok is labelled `FORMAT_ONLY` unless `S2D_TIKTOK_CREDENTIAL_TEST_URL` is configured.
- Apify tokens are sent in the `Authorization` header, never in a query string.

Dynamic vault entries are **process-local and ephemeral**. Wrangler secrets are the durable production source. A Worker cold start may discard dynamic entries; the UI and API state this explicitly.

### Apify scraper

`POST /api/scrape/run` now performs controlled synchronous Apify execution rather than returning a fictitious `QUEUED` run:

- 20-record cap per platform;
- server-side credential only;
- approved server-side actor mapping;
- provider and retention caps;
- partial failures reported as HTTP 207;
- no client-selected actor or source URL;
- current upstream request fields are validated.

TikTok, Instagram, and X have reviewed defaults. Threads requires `S2D_APIFY_ACTOR_THREADS`. Facebook requires curated Melaka page URLs in `S2D_FACEBOOK_SOURCE_URLS`; it fails closed rather than falling back to the upstream Johor registry.

## PIP aggregate-context boundary

- Case/separator-insensitive identity, targeting, and election-prediction key detection is active.
- The prior lowercase comparison bug that missed camelCase keys such as `firstName` and `phoneNumber` is fixed.
- Wrong/missing schema, malformed geography shares, missing provenance, and `aggregateOnly !== true` fail closed.
- Canonical Melaka geography mapping is enforced. P135/N08 is Machap Jaya; P136/N12 is Pantai Kundor.
- DUN/parliament mismatches return `400 GEOGRAPHY_MISMATCH`.
- P134 parliament context is a weighted aggregation of N01–N05, not N01 relabelled as parliament data.

Only P134 / N01–N05 currently have verified aggregate values. P135–P139 / N06–N28 correctly return 404.

## CORS and edge controls

- Explicit origins only; `*` is discarded even if supplied by environment.
- Disallowed explicit origins are rejected with 403 **before** route side effects.
- Same-origin and server-to-server requests without an Origin header remain supported.
- OPTIONS handlers exist for intelligence, credentials, scraper, and aggregate-context routes.
- Active Linux-binary security scans remain disabled in Workers.

## Verification

```bash
npm run test:s2d       # 7/7 focused hardening tests
npm run lint           # 0 errors (repository warnings remain)
npm run typecheck      # 0 errors
npm run build          # Next.js production build passes
npm run build:cf       # OpenNext Worker bundle passes
bash scripts/verify-no-pdpa-files.sh
```

Live route checks performed in development and production-mode test processes:

- MELAKA signals: 8, canonical areas, `governance.sanitised=true`;
- P134 aggregate: 84,000 population / 71,415 electors, validation `ACCEPTED`;
- wrong DUN/parliament join: 400;
- untrusted CORS origin: 403;
- prototype-pollution payload: 400;
- no auth / arbitrary long bearer in production: 401 / 401;
- valid operator token: 200;
- `OPERATIONS` role on scrape: 403;
- static engine bundle and fixtures: 200.

## Production checklist (operator-owned)

- [ ] Set `S2D_AUTH_TOKEN` with `npx wrangler secret put S2D_AUTH_TOKEN`.
- [ ] Set provider secrets actually used in production; do not rely on dynamic-vault persistence.
- [ ] Configure approved Threads actor and curated Melaka Facebook sources before enabling those connectors.
- [ ] Keep `S2D_ACTIVE_SECURITY_SCAN_ENABLED=false` on Workers.
- [ ] Add verified aggregate sources for P135–P139 before advertising statewide PIP context.
- [ ] Deploy and connect an authorized S2D Node service before enabling iframe operations that require non-ported APIs.
- [x] Cloudflare/OpenNext Worker bundle builds locally.
- [ ] Run deployed smoke tests after production secrets/configuration are supplied.

## Upstream caveats found during re-research

The audited upstream Vite build passes. Its root `node --test` result is **45 pass / 2 fail**, where both failures are missing generated/untracked corpus artifacts. Upstream `npm audit` reports four high-severity dependency findings (`xlsx`, `postcss`, and the `concurrently` → `shell-quote` chain). PIP Melaka does not install the upstream Node dependency tree, and its hardened browser bundle excludes `xlsx`; the upstream repository should still remediate all four before a standalone engine deployment.
