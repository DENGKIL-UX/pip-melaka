# PIP-MLK CI/CD Research — `docs/RESEARCH-CICD.md`

> Task ID: DB-CICD-01
> Scope: CI/CD pipeline, feature flags, API versioning, semantic versioning, deployment strategies, infrastructure as code.
> Truth Above All — every workflow, helper, and config below is checked into the repo.

---

## Table of contents

6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Feature Flags](#7-feature-flags)
8. [API Versioning](#8-api-versioning)
9. [Semantic Versioning](#9-semantic-versioning)
10. [Deployment Strategies (Blue-Green, Canary, Rolling)](#10-deployment-strategies)
11. [Infrastructure as Code](#11-infrastructure-as-code)

---

## 6. CI/CD Pipeline

### 6.1 Pipeline file

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) defines a single job `lint-typecheck-build` plus a dependent `pr-validation` job.

### 6.2 Stages

| Stage | Command | Purpose | Failure action |
|-------|---------|---------|----------------|
| Install | `bun install --frozen-lockfile` | Reproducible deps from `bun.lock` | Block merge |
| Lint | `bun run lint` | ESLint + Next.js core-web-vitals + TS rules | Block merge |
| Type check | `bunx tsc --noEmit` | Strict-mode TypeScript compilation (no JS emit) | Block merge |
| Prisma validate | `bunx prisma validate` | Schema syntactic check before generate | Block merge |
| Prisma generate | `bun run db:generate` | Regenerate `@prisma/client` so build can compile | Block merge |
| Build | `bun run build` | Next.js production build — catches RSC boundary violations, bad imports, missing `await` in async server components | Block merge |
| PR validation | (bash) | Verify `worklog.md` is updated; warn if `package.json` version unchanged while `src/` changed | Block merge / warn |

### 6.3 Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

- **Push to main** — runs the full pipeline after merge. Catches hotfixes that bypass PR review.
- **Pull request** — runs the full pipeline before merge. Status check is **required** (configured in GitHub branch protection).
- **Concurrency group** `ci-${{ github.workflow }}-${{ github.ref }}` cancels superseded runs on the same branch — saves CI minutes when a PR is force-pushed 3 times in a row.

### 6.4 Caching

- **Prisma engine cache** keyed on `prisma/schema.prisma` hash. Saves ~5s per run by skipping the Prisma engine download on schema-stable builds.
- **Bun install cache** — handled automatically by `oven-sh/setup-bun@v2`.

### 6.5 Required status checks (GitHub branch protection)

Configure under **Settings → Branches → Branch protection rules → main**:

- ✅ Require status checks to pass before merging
  - ✅ `lint · tsc · build`
  - ✅ `pr-validation`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Require linear history (merge via squash or rebase, never merge commit)

### 6.6 Secrets management

| Secret | Used by | Notes |
|--------|---------|-------|
| `DATABASE_URL` | Prisma (CI only — file path, not a real DB) | Set in repo variables, not secrets — it's a file path. |
| Production `DATABASE_URL` | Deploy workflow (future) | Stored as a GitHub secret, never logged. |
| `NEXT_PUBLIC_FEATURE_*` | Build-time flag inlining | Non-secret; set in repo variables. |

### 6.7 Pipeline extensions (future)

- **Preview deploys** — on PR open, deploy to a Cloudflare Workers preview URL with `X-Transform-Port`-routed API. Comment the URL on the PR.
- **E2E tests** — `agent-browser` smoke test against the preview deploy. Verifies the dashboard renders, all 10 tabs are non-empty, AI Assistant responds.
- **Bundle-size budget** — `@next/bundle-analyzer` report on every PR. Block if first-load JS exceeds 250KB on `/`.
- **Lighthouse CI** — block if Lighthouse performance < 80 on `/`.

---

## 7. Feature Flags

See [`src/lib/feature-flags.ts`](../src/lib/feature-flags.ts) for the live implementation.

### 7.1 Design

- **Static, build-time flags** — read from `process.env.NEXT_PUBLIC_FEATURE_*` at module load. Inlined into the client bundle by Next.js.
- **No UI for runtime toggling** — keeps the system dead-simple and audit-friendly. Changing a flag is a code change (env var update + redeploy).
- **Safe defaults** — every flag has a `DEFAULT_FLAGS` value, so unset env vars don't break the app.

### 7.2 API

```typescript
import { isFeatureEnabled, getFeatureFlags, describeFeatureFlags } from "@/lib/feature-flags";

// Boolean check — use this in 95% of cases
if (isFeatureEnabled("enableAIAssistant")) {
  renderAssistantPanel();
}

// All flags at once — for logging / seeding a store
const flags = getFeatureFlags();

// Flag provenance — for /api/health and the governance tab
const desc = describeFeatureFlags();
// → [{ flag: "enableAIAssistant", enabled: true, source: "env" }, ...]
```

### 7.3 Default flag inventory

| Flag | Default | What it gates |
|------|---------|---------------|
| `enableAIAssistant` | `true` | The floating "Ask AI" panel + `/api/assistant` route |
| `enable3DMap` | `true` | The Three.js 3D map tab |
| `enableS2DConsole` | `true` | The S2D Action Console tab + signal store |
| `enableCompare` | `true` | The Compare tab (side-by-side parliament comparison) |

### 7.4 Setting a flag

In `.env` (or `.env.local`):

```bash
# Disable the 3D map (heavy on low-end devices)
NEXT_PUBLIC_FEATURE_ENABLE3DMAP=false

# Disable the AI Assistant (e.g. during an LLM outage)
NEXT_PUBLIC_FEATURE_ENABLEAIASSISTANT=0
```

Accepted truthy values: `1`, `true`, `yes`, `on` (case-insensitive).
Accepted falsy values: `0`, `false`, `no`, `off` (case-insensitive).
Any other value → falls back to the default.

### 7.5 Client vs server

Because the flags use the `NEXT_PUBLIC_` prefix, the same `isFeatureEnabled` call works in:

- Server components (`"use server"` or no directive)
- Client components (`"use client"`)
- API routes (`src/app/api/.../route.ts`)
- Middleware (`src/middleware.ts`)

There is no separate "server-only flag" system — every flag is public-readable. If a flag must be secret (e.g. "is_admin_user"), it does NOT belong in this system; it belongs in auth claims.

### 7.6 Lifecycle

1. **Add a flag** — extend `FeatureFlag` union + `DEFAULT_FLAGS` in `feature-flags.ts`. Default to `false` for new features (dark-launch pattern).
2. **Wire the flag** — wrap the feature code with `if (isFeatureEnabled("enableX"))`.
3. **Enable in staging** — set the env var, redeploy.
4. **Enable in prod** — set the env var, redeploy. Monitor.
5. **Remove the flag** — once the feature is permanently on (or permanently off), delete the flag from `FeatureFlag`, `DEFAULT_FLAGS`, and all call sites. Keep the env var unset — old env vars are harmless.

### 7.7 Anti-patterns

- ❌ Using a flag for **user-specific** toggles (use auth claims instead).
- ❌ Using a flag for **A/B test** variants (use a proper experimentation platform — flags don't track assignments).
- ❌ Leaving dead flags in the codebase "for next time" — they accumulate and confuse readers. Remove them.

---

## 8. API Versioning

See [`src/lib/api-version.ts`](../src/lib/api-version.ts) for the live implementation.

### 8.1 Versioning model

PIP-MLK uses **URL path versioning** as the primary versioning scheme, with header + query overrides for flexibility:

| Mechanism | Example | Precedence |
|-----------|---------|------------|
| URL path (folder structure) | `/api/v1/assistant` | Implicit — set by the route folder |
| Accept header | `Accept: application/vnd.pip-mlk+v2` | 1 (highest) |
| Query string | `?api-version=v2` | 2 |
| `LATEST_VERSION` constant | — | 3 (fallback) |

URL path versioning is primary because it's:

- **Cache-friendly** — CDN keys on URL path, so `/api/v1/...` and `/api/v2/...` get independent cache entries.
- **Discoverable** — the version is visible in the URL, no need to inspect headers.
- **Tooling-friendly** — `curl`, Postman, and browser devtools all show the version in the URL bar.

### 8.2 Route layout

```
src/app/api/
├── v1/
│   ├── assistant/route.ts          # /api/v1/assistant
│   └── health/route.ts             # /api/v1/health
└── v2/                              # future
    └── assistant/route.ts          # /api/v2/assistant (breaking-change version)
```

Each route handler is wrapped with `withVersioning`:

```typescript
// src/app/api/v1/assistant/route.ts
import { withVersioning } from "@/lib/api-version";

export const POST = withVersioning("v1", async (req) => {
  // ... handler body
  return Response.json({ ok: true });
});
```

### 8.3 Version negotiation

`withVersioning` runs `negotiateVersion(req)` on every request, then:

1. **If the negotiated version is NOT in `API_VERSIONS`** → return HTTP 400 with a JSON body listing supported versions:
   ```json
   { "error": "Unsupported API version: v3", "supported": ["v1"], "latest": "v1" }
   ```

2. **If the negotiated version ≠ the handler's version** → still serve the handler, but add `X-API-Version-Note: served=v1 requested=v2` so the client can detect drift.

3. **Always** set `X-API-Version: <served>` on the response.

4. **If the served version is in `DEPRECATED_VERSIONS`** → set `Deprecation: true` and `Sunset: <RFC-7231 date>` (6 months out) so clients see the deprecation warning in their console.

### 8.4 What counts as a breaking change?

- Removing an endpoint
- Removing a field from a response
- Changing a field's type
- Changing the semantics of a field (e.g. `count` going from "voters" to "households")
- Changing the default behavior of an optional parameter
- Changing HTTP status codes for the same condition

Non-breaking (no new version needed):

- Adding a new endpoint
- Adding a new field to a response (clients ignore unknown fields)
- Adding a new optional parameter
- Improving performance
- Fixing bugs that change incorrect behavior

### 8.5 Deprecation workflow

1. **Mark the version deprecated** — add it to `DEPRECATED_VERSIONS` in `api-version.ts`.
2. **Emit headers** — `withVersioning` automatically sets `Deprecation: true` and `Sunset: <date>`.
3. **Notify clients** — announce deprecation in release notes, with the sunset date and migration guide.
4. **Wait ≥ 6 months** — the `Sunset` date is set 6 months out by default.
5. **Remove the version** — delete the route folder, remove from `API_VERSIONS`, update `LATEST_VERSION` if needed.

### 8.6 Health endpoint

`/api/v1/health` should report:

- `version` — the app version from `package.json`
- `api_versions` — `API_VERSIONS` array
- `latest` — `LATEST_VERSION`
- `feature_flags` — `describeFeatureFlags()` output

This gives ops a single endpoint to verify deploy health, API version, and feature-flag state.

---

## 9. Semantic Versioning

### 9.1 Policy

PIP-MLK follows **Semantic Versioning 2.0.0** (https://semver.org/).

Given `MAJOR.MINOR.PATCH`:

- **MAJOR** — incompatible API changes. Triggers an API version bump (`v1` → `v2`).
- **MINOR** — backward-compatible feature additions. Bumps `package.json` minor, may add a new migration (always backward-compatible per `docs/RESEARCH-DATABASE.md` §2.2).
- **PATCH** — backward-compatible bug fixes. No schema changes, no new endpoints.

### 9.2 Current version

`package.json` → `"version": "1.0.0"` (set by this task).

### 9.3 Pre-release tags

For work that is not yet GA:

| Tag | Meaning | Example |
|-----|---------|---------|
| `-alpha.<n>` | Internal smoke test, no SLA | `1.1.0-alpha.3` |
| `-beta.<n>` | External beta, opt-in, may break | `1.1.0-beta.1` |
| `-rc.<n>` | Release candidate, frozen scope, bugfix-only | `1.1.0-rc.2` |

Pre-release versions sort BEFORE the GA version they target: `1.1.0-rc.2 < 1.1.0`.

### 9.4 Version bumps in PRs

| Change | Bump |
|--------|------|
| Bug fix | PATCH (`1.0.0` → `1.0.1`) |
| New tab / new feature, backward-compatible | MINOR (`1.0.0` → `1.1.0`) |
| New DB migration (backward-compatible) | MINOR |
| Breaking API change (new API version) | MAJOR (`1.0.0` → `2.0.0`) |
| DB migration that drops a column | MAJOR (also requires deploy downtime or 2-phase rollout per §10) |
| Docs-only change | no bump |
| Refactor with no behavior change | no bump |

The CI `pr-validation` job warns if `src/` changed but `package.json` version didn't — see `.github/workflows/ci.yml`.

### 9.5 Release process

1. **PR merge** — `package.json` version is already bumped by the author.
2. **CI passes** on main.
3. **Tag** — `git tag -a v1.0.0 -m "PIP-MLK 1.0.0"` → `git push origin v1.0.0`.
4. **GitHub Release** — auto-generated from the tag, with the changelog section for this version.
5. **Deploy** — CI promotion to staging, then to prod (see §10, §11).

### 9.6 Changelog

Keep a `CHANGELOG.md` (future task) with one section per version:

```markdown
## [1.0.0] — 2026-01-01
### Added
- Initial release with 10 dashboard tabs, AI Assistant, 2D/3D maps, S2D console.
- Prisma schema v1 with User + Post models, 7 indexes.
- CI pipeline: lint + tsc + build + prisma validate.
- Feature flags: enableAIAssistant, enable3DMap, enableS2DConsole, enableCompare.
- API versioning: /api/v1/* with withVersioning middleware.
```

---

## 10. Deployment Strategies

PIP-MLK targets **Cloudflare Workers** as the long-term runtime, with Next.js standalone build as a fallback for Vercel/Node. The three deployment strategies below cover all release risk profiles.

### 10.1 Blue-Green deployment

**Use when**: you need instant rollback, and the new version is fully stateless (no schema migration, or the migration is backward-compatible per `docs/RESEARCH-DATABASE.md` §2.2).

**How it works**:

1. **Two environments** — `blue` (live, taking traffic) and `green` (idle).
2. **Deploy to green** — push the new version, run health checks against `/api/v1/health`.
3. **Switch traffic** — update the Cloudflare Workers route (or DNS) to point at green. Blue stays warm as the rollback target.
4. **Monitor** — watch error rate, P99 latency, health-check for ~10 minutes.
5. **Promote or rollback**:
   - If healthy → keep green live. Blue becomes the new idle target for the next deploy.
   - If unhealthy → flip traffic back to blue. Investigate green.

**Cloudflare Workers specifics**:

- Workers supports blue-green via **Gradual Deployments / Version Rollout** (Workers Versions UI or `wrangler versions deploy`).
- Each version is identified by a `version-id`. You can shift traffic 0% → 100% between two versions instantly.
- Health check: configure a Custom Domain with a `/api/v1/health` liveness probe.

**Rollback**:

```bash
# Roll back to the previous version
wrangler versions rollback --version-id <previous-version-id>
```

Takes effect globally within ~30 seconds (Cloudflare edge propagation).

### 10.2 Canary deployment

**Use when**: you want to validate the new version on real traffic before committing 100%.

**How it works**:

1. Deploy the new version alongside the live version (Cloudflare Workers Versions).
2. Shift **1%** of traffic to the new version.
3. Monitor error rate, P99, business metrics (e.g. dashboard tab loads) for ~10 minutes.
4. Ramp: 1% → 5% → 25% → 50% → 100%. Wait 10–30 minutes between ramps.
5. If any ramp shows regression, **roll back to 0%** immediately.

**Cloudflare Workers specifics**:

```bash
# Deploy a new version
wrangler versions deploy

# Shift 5% of traffic to the new version
wrangler versions traffic --version-id <new-version-id> --percent 5

# Promote to 100%
wrangler versions traffic --version-id <new-version-id> --percent 100
```

**Automation**: a future GitHub Actions job can automate the ramp:

```yaml
- name: Canary 1%
  run: wrangler versions traffic --version-id ${{ steps.deploy.outputs.id }} --percent 1
- name: Wait 10m
  run: sleep 600
- name: Check error rate
  run: bun run scripts/check-error-rate.ts --threshold 0.01
- name: Canary 25%
  if: success()
  run: wrangler versions traffic --version-id ${{ steps.deploy.outputs.id }} --percent 25
```

### 10.3 Rolling deployment

**Use when**: you have multiple long-running app instances (Node.js on ECS/Kubernetes, NOT serverless). Each instance is replaced one at a time.

**How it works**:

1. New version is rolled out to N instances, one instance at a time.
2. Each instance is drained (stop accepting new connections) → replaced → health-checked → returned to the pool.
3. If any instance fails health check, the rollout pauses (and ideally auto-rolls back).

**Cloudflare Workers caveat**: Workers is **serverless** — there are no "instances" to roll. Rolling deployment applies to the Node.js standalone build (`bun .next/standalone/server.js`) on ECS/K8s.

### 10.4 Health check integration

All three strategies depend on a reliable health check. PIP-MLK ships `/api/v1/health` (to be wired in a future task) returning:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "api_versions": ["v1"],
  "latest": "v1",
  "feature_flags": [
    { "flag": "enableAIAssistant", "enabled": true, "source": "default" }
  ],
  "db": "connected",
  "uptime_s": 432
}
```

Load balancer / Cloudflare Workers route health-check rules:

- **Liveness** — `/api/v1/health` returns 200 within 2s. If 3 consecutive checks fail, the instance is marked unhealthy and removed from rotation.
- **Readiness** — `/api/v1/health?deep=1` additionally checks `db` connectivity. Used during rolling deploys to wait for the new instance to be DB-ready before traffic shifts.
- **Startup** — `/api/v1/health?startup=1` checks only that the process is up (no DB check). Used by container orchestrators during the grace period.

### 10.5 Rollback decision matrix

| Symptom | Strategy | Rollback action |
|---------|----------|-----------------|
| Error rate > 1% in first 5 min | Canary / Blue-green | `wrangler versions rollback` (instant) |
| P99 latency > 2× baseline | Canary / Blue-green | `wrangler versions rollback` |
| DB migration broke reads | Forward-fix | Ship a NEW migration that reverses the change (per `docs/RESEARCH-DATABASE.md` §2.3 Strategy B) |
| DB migration broke writes | Snapshot restore | Restore pre-deploy snapshot + redeploy old version |
| Feature flag caused regression | Toggle | Flip `NEXT_PUBLIC_FEATURE_*` env var + redeploy |
| Config-only regression | Env update | Update env var, no redeploy needed (if flags) or redeploy (if build-time config) |

### 10.6 Schema-change deploy sequence

For migrations that are NOT backward-compatible (column drops, type changes), use the 2-phase deploy:

**Phase 1 — Compatibility window (1 release cycle)**

1. Ship schema change as ADD only (new column, new table).
2. Ship app code that writes to BOTH old and new columns (dual-write).
3. Ship a backfill job that populates the new column for existing rows.
4. Ship app code that READS from the new column (still writes to both).

**Phase 2 — Cleanup (next release cycle)**

5. Verify all reads use the new column.
6. Stop dual-writing.
7. Drop the old column (now safe — no code references it).

This avoids any deploy-time downtime and works across canary, blue-green, and rolling deploys.

---

## 11. Infrastructure as Code

### 11.1 Philosophy

All infrastructure is defined in version-controlled config files. No click-ops. The two pieces of IaC relevant to PIP-MLK are:

1. **Cloudflare Workers config** — `wrangler.jsonc` (or `wrangler.toml`) checked into the repo. Defines the Worker name, bindings, routes, env vars.
2. **Environment promotion** — `dev → staging → prod` pipeline driven by Git tags + GitHub Environments.

### 11.2 Terraform / Helm concepts (reference)

PIP-MLK does NOT use Terraform or Helm directly (Cloudflare Workers has no Helm charts), but the concepts inform how we structure `wrangler.jsonc`:

| Terraform / Helm concept | PIP-MLK equivalent |
|--------------------------|---------------------|
| `resource` block | `wrangler.jsonc` `name` + `routes` |
| `variable` block | `wrangler.jsonc` `vars` + GitHub repo variables |
| `env` block (Terraform workspace) | `wrangler.jsonc` `env.staging` / `env.prod` |
| `module` | reusable `wrangler.jsonc` shared across Worker projects |
| `state` file | Cloudflare's account-level API (source of truth) |
| `plan` | `wrangler deploy --dry-run` |
| `apply` | `wrangler deploy` |
| `destroy` | `wrangler delete` (rare — only for full teardown) |
| Helm `values.yaml` | `wrangler.jsonc` env-specific overrides |

**If PIP-MLK later moves to Kubernetes** (e.g. for a Node.js standalone build with Postgres), the IaC stack would be:

- **Terraform** — provisions the K8s cluster, RDS Postgres, S3 buckets, DNS.
- **Helm** — deploys the Next.js app into the cluster (chart under `charts/pip-mlk/`).
- **Argo CD** — GitOps: watches `charts/pip-mlk/values-prod.yaml`, auto-syncs to the cluster.

### 11.3 Cloudflare Workers configuration (`wrangler.jsonc`)

A representative `wrangler.jsonc` for PIP-MLK (not yet checked in — the project currently runs on the Next.js dev server; this is the production target):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pip-mlk",
  "main": ".next/standalone/server.js",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],

  // Environment-agnostic config
  "assets": {
    "directory": "./public",
    "binding": "ASSETS"
  },

  // Per-environment overrides
  "env": {
    "dev": {
      "name": "pip-mlk-dev",
      "vars": {
        "NEXT_PUBLIC_FEATURE_ENABLE3DMAP": "true",
        "NEXT_PUBLIC_FEATURE_ENABLEAIASSISTANT": "true"
      }
    },
    "staging": {
      "name": "pip-mlk-staging",
      "routes": ["pip-mlk-staging.example.com/*"],
      "vars": {
        "NEXT_PUBLIC_FEATURE_ENABLE3DMAP": "true",
        "NEXT_PUBLIC_FEATURE_ENABLEAIASSISTANT": "true"
      }
    },
    "prod": {
      "name": "pip-mlk-prod",
      "routes": ["pip-mlk.example.com/*"],
      "vars": {
        "NEXT_PUBLIC_FEATURE_ENABLE3DMAP": "true",
        "NEXT_PUBLIC_FEATURE_ENABLEAIASSISTANT": "true"
      }
    }
  },

  // Secrets — set via `wrangler secret put`, never in this file
  // DATABASE_URL, ZAI_API_KEY, etc.

  // Observability
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },

  // Limits
  "limits": {
    "cpu_ms": 50,           // P99 budget per request (see docs/RESEARCH-PERFORMANCE.md §2)
    "preview_sessions": 2
  }
}
```

**Secrets** are NEVER in `wrangler.jsonc` — use `wrangler secret put DATABASE_URL` per environment.

### 11.4 Environment promotion

The promotion path is `dev → staging → prod`. Promotion is always Git-driven:

```
feature branch  →  PR to main  →  main  →  staging tag  →  prod tag
   (dev)         (preview URL)   (dev)    (staging)        (prod)
```

| Environment | Trigger | Auto-deploy? | Manual approval? |
|-------------|---------|--------------|------------------|
| dev | Push to `main` | ✅ | ❌ |
| staging | Git tag `v*` pushed | ✅ | ❌ |
| prod | GitHub Release published | ❌ | ✅ (required) |

**GitHub Environments** (under Settings → Environments):

- `staging` — no protection rules, auto-deploys on tag.
- `prod` — required reviewers (1+), wait timer (5 min), branch limited to `main`.

### 11.5 Deploy workflow (future `.github/workflows/deploy.yml`)

```yaml
name: Deploy

on:
  push:
    tags: ["v*"]
  release:
    types: [published]

jobs:
  deploy-staging:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bunx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

  deploy-prod:
    if: github.event_name == 'release'
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: prod
      url: https://pip-mlk.example.com
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bunx wrangler deploy --env prod
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

  smoke-test-prod:
    needs: deploy-prod
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS https://pip-mlk.example.com/api/v1/health | jq -e '.status == "ok"'
```

### 11.6 IaC rules

- ✅ Every environment is reproducible from `wrangler.jsonc` + secrets.
- ✅ Secrets are set via `wrangler secret put`, never in the repo.
- ✅ Every `wrangler deploy` is preceded by `--dry-run` in CI.
- ✅ Every prod deploy is gated by a manual approval (GitHub Environment `prod`).
- ❌ Never click-ops a config change that isn't reflected in `wrangler.jsonc`.
- ❌ Never commit a secret to the repo — even temporarily. Use `wrangler secret put`.
- ❌ Never deploy to prod from a local machine — always via CI.

### 11.7 State drift detection

Once a week, run:

```bash
wrangler deployments list --env prod   # what's actually deployed?
git diff main -- wrangler.jsonc         # what does the repo say?
```

If they disagree, the repo wins — re-deploy from `main`. This is the IaC equivalent of `terraform plan` showing drift.

---

## Appendix — file inventory

| File | Purpose |
|------|---------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | CI pipeline (lint, tsc, build, prisma validate, PR validation) |
| [`src/lib/feature-flags.ts`](../src/lib/feature-flags.ts) | Runtime feature-toggle system (`isFeatureEnabled`, `getFeatureFlags`) |
| [`src/lib/api-version.ts`](../src/lib/api-version.ts) | API versioning + `withVersioning` middleware |
| [`package.json`](../package.json) | `version: 1.0.0` (SemVer baseline) |
| `wrangler.jsonc` (future) | Cloudflare Workers IaC config |
| `.github/workflows/deploy.yml` (future) | Environment promotion pipeline |
