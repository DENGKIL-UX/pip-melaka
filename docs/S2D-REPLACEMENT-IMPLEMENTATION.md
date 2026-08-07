# S2D Replacement Implementation — PIP Melaka × S2D-360 Intelligence Engine

> **Source:** `DENGKIL-UX/S2D-workspace-code` → `s2d-360-intelligence-engine`  
> **Target:** `DENGKIL-UX/pip-melaka` (this repo) — Melaka DUN / PIP platform  
> **Deploy Host:** Cloudflare Workers / Pages → `https://pip-melaka.ritz-analytics.workers.dev`

This document records the four-phase replacement of the legacy S2D (Signal-to-Decision) module with the modern S2D-360 Intelligence Engine per `S2D-PIP-MELAKA-REPLACEMENT-GUIDE.md`.

---

## Phase 1 — Dependency & Shared Contract Installation

- **Added to `package.json`:**
  ```json
  "@ritzanalytics/pip-s2d-contracts": "file:../S2D-workspace-code/s2d-360-intelligence-engine/packages/pip-s2d-contracts"
  ```
  Sibling path `../S2D-workspace-code/...` is canonical per guide; local mirror at `./packages/pip-s2d-contracts` committed for CI portability and symlinked via `node_modules/@ritzanalytics/pip-s2d-contracts`.

- **Bindings:** `npm install` links schema validators / exchange envelopers (`common-contracts.js`, `exchange-envelope-contract.js`, `exchange-sanitiser.js`, `signal-record-contract.js`).

**Verification:** `node_modules/@ritzanalytics/pip-s2d-contracts → ../../../S2D-workspace-code/...` exists; `npm run build` passes.

---

## Phase 2 — Backend API Integration

- **Engine server:** `s2d-360-intelligence-engine/server/index.js` on `http://localhost:4000`, OpenAPI v1 `/api/s2d/intelligence/*`.
- **Client:** `src/integration/pip360/api/s2d-intelligence-api-client.js` exposes:
  ```
  GET /api/s2d/intelligence/signals?localityCode=MELAKA
  GET /api/s2d/intelligence/narratives
  GET /api/s2d/intelligence/recommendations
  GET /api/s2d/intelligence/briefs/daily (alias: /daily-brief)
  ```
  Uses Web Fetch APIs for Cloudflare V8; base URL auto-detects `S2D_ENGINE_URL`.
- **Cloudflare:** `src/lib/s2d-cloudflare-handler.ts` + `src/lib/cors.ts` with `S2D_ALLOWED_ORIGINS` (never `*`), Hono `fetch` handlers, storage mapping IndexedDB→KV→D1→R2, `S2D_ACTIVE_SECURITY_SCAN_ENABLED=false`.
- **Native routes:** `src/app/api/s2d/intelligence/[...path]/route.ts` with locality filter and `/briefs/daily` alias.

**Verification:**
```bash
curl http://127.0.0.1:3000/api/s2d/intelligence/signals?localityCode=MELAKA  # 200, governance
curl http://127.0.0.1:3000/api/s2d/intelligence/narratives                # 200
curl http://127.0.0.1:3000/api/s2d/intelligence/recommendations           # 200
curl http://127.0.0.1:3000/api/s2d/intelligence/briefs/daily              # 200, markdown
curl -H "Origin: https://pip-melaka.ritz-analytics.workers.dev" http://127.0.0.1:3000/api/s2d/intelligence/signals | grep Allow-Origin  # restricted
```

---

## Phase 3 — Frontend Component Replacement

- **Legacy:** `s2d-console-tab` and `s2d-360-tab` marked `(Legacy)` but kept for additive compat.
- **Modern components mounted:**
  - `<S2D360Engine />` — `src/S2D360Engine.clean.jsx` (4030 lines, ~208KB, monolith mounted as-is via `S2D360Engine.wrapper.tsx` + iframe fallback to `/public/s2d-360/` dist; original preserved at `vendor/s2d-360/`)
  - `<S2DDailyIntelligenceBriefPage />` — `src/components/s2d/S2DDailyIntelligenceBriefPage.tsx`
  - `<S2DAlertCenterPage />` — `src/components/s2d/S2DAlertCenterPage.tsx`
  - `<S2DNarrativePropagationGraphPage />` — `src/components/s2d/S2DNarrativePropagationGraphPage.tsx`
  - `<S2DConstituencyIntelligenceReportPage />` — `src/components/s2d/S2DConstituencyIntelligenceReportPage.tsx`
  - `<S2DCredentialSettingsModal />` — Gear Settings, live-verifies tokens
  - `<S2DWorkspaceToolbar />` — hosts ⚙️

- **Host tab:** `src/components/tabs/s2d-modern-tab.tsx` with `Segmented` switcher and `DashboardTab="s2d-modern"`.

**Verification:** `npm run build` ✓, `npx tsc --noEmit` 0 errors, modern tab renders.

---

## Phase 4 — Scraper & Credential Configuration

- **Secrets:** `.dev.vars.example` + `src/lib/secrets.ts` now include `APIFY_TOKEN`, `S2D_ALERT_WHATSAPP_TOKEN`, etc.; production via `npx wrangler secret put APIFY_TOKEN`.
- **Backend:**
  - `GET /api/s2d/credentials` → masked vault (`apif***9x2a`), never raw.
  - `PUT /api/s2d/credentials` → `zod` + `authenticateSession` + `requireRole(['SECURITY_APPROVER'])` + `isSafeURL` + live `GET https://api.apify.com/v2/users/me` → `VERIFIED PASS` (offline demo: `apify_api_` >20 chars).
  - `POST /api/scrape/run` → `zod` + multi-platform, checks `APIFY_TOKEN`, returns `runId` + `QUEUED`.
- **Frontend:** `S2DCredentialSettingsModal` + `S2DWorkspaceToolbar` (⚙️).

**Verification:**
```bash
curl -X PUT http://127.0.0.1:3000/api/s2d/credentials -H "Authorization: Bearer dev" -d '{"key":"APIFY_TOKEN","token":"apify_api_valid_test_token_1234567890"}'
# → {"verified":true,"masked":"apif***7890","message":"VERIFIED PASS — APIFY_TOKEN live-verified via Apify..."}
curl http://127.0.0.1:3000/api/s2d/credentials -H "Authorization: Bearer dev" | grep masked  # apif***7890
curl -X POST http://127.0.0.1:3000/api/scrape/run -H "Authorization: Bearer dev" -d '{"platforms":["tiktok","facebook","instagram","threads","x"],"keywords":["Melaka"]}'
# → {"runId":"RUN-...","status":"QUEUED"}
```

At least one credential live-test returns **VERIFIED PASS** via Gear Settings.

---

## Cloudflare Edge Deployment

- Frontend `npm run build` in `s2d-360-intelligence-engine` → `dist/` via Pages / Workers Static Assets (already at `public/s2d-360/`).
- API via Hono `fetch` handlers (`fetch/Headers/Request/Response/Web Crypto`).
- Storage: IndexedDB → KV → D1 → R2.
- `S2D_ACTIVE_SECURITY_SCAN_ENABLED=false` (Nmap/Tshark not in V8).
- Secrets via `wrangler secret put`.

---

## Data Boundary Governance

- Firewall `src/lib/s2d-engine/pip-aggregate-context-adapter.ts`: 28 rejected keys + 9 regex, → `REJECTED_INDIVIDUAL_DATA`.
- **PERMITTED:** public signals, threat scores (0-100), posture (White/Grey/Black), propagation graphs, constituency sentiment.
- **PROHIBITED:** voter names, IC, phone/address, support scores, direct DB writes.
- Validation: `POST /api/s2d/intelligence/validate-context` with `voters` → `REJECTED_INDIVIDUAL_DATA`.

---

## Security Hardening Checklist

- `authenticateSession` on `/api/s2d/credentials`, `/api/scrape` + `requireRole(['SECURITY_APPROVER'])` → 401/403.
- CORS whitelist `S2D_ALLOWED_ORIGINS`, not `*` (`src/lib/cors.ts` + `next.config.ts`).
- SSRF guard `isSafeURL()` blocks `127.0.0.1`, `169.254.169.254`, etc.
- `multer` 10MB in `s2d-360-intelligence-engine/server/csvImport.js`; PIP-MLK uses `zod` `max(4096)` + body limits.
- `zod` validation on POST/PUT.

---

## Deliverable Checklist

- [x] Phase 1 contracts installed
- [x] Phase 2 API client + Workers Hono handlers + CORS restricted
- [x] Phase 3 modern components mounted (S2D360Engine + 4 pages + Gear modal + Toolbar), legacy kept additive
- [x] Phase 4 Gear Settings live-verify + unified scrape
- [x] Cloudflare build/serve via `dist/` + KV/D1/R2 mapping + `wrangler secret put`
- [x] Data boundary guard enforced
- [x] Security checklist active
- [x] `npm run build` ✓, `npx tsc --noEmit` 0 errors, `curl` VERIFIED PASS
