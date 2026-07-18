# DB-CICD-01 — main agent work record

## Task
Implement 15 database + CI/CD + performance patterns for the PIP-MLK Next.js 16 project:
- Database: migrations, schema versioning, query optimization + N+1 prevention, connection pooling, indexing
- CI/CD: pipeline (lint/tsc/build/PR validation), feature flags, API versioning, semantic versioning, blue-green/canary/rolling deployments, infrastructure as code
- Performance: cold starts, latency + P99 + tail latency, CDN + edge caching + cache invalidation, autoscaling

Deliverables: code modules under `src/lib/`, Prisma schema + migrations, GitHub Actions workflow, 3 research docs (`docs/RESEARCH-DATABASE.md`, `docs/RESEARCH-CICD.md`, `docs/RESEARCH-PERFORMANCE.md`). Run `bun run lint` — 0 errors required. Append worklog.md.

## Prior context read
- `/home/z/my-project/worklog.md` — 5 prior tasks (engine extraction, 7 tab build, AI assistant, fallback data, all-tab QA test). Confirmed dashboard is functional with 10 tabs, real P134 engine data, AI assistant, DUN drawer, theme toggle, fallback data for OOM resilience.
- `/home/z/my-project/agent-ctx/FALLBACK-DATA-01-main.md` — confirmed prior agent's approach to inline fallback data; noted dev server OOM on 4GB sandbox is recurring infrastructure issue, not a code issue.

## Approach
- Read `prisma/schema.prisma`, `package.json`, `src/lib/db.ts`, `src/app/api/assistant/route.ts`, `tsconfig.json`, `eslint.config.mjs`, `src/app/page.tsx`, `dev.log` to understand existing patterns before writing.
- Designed all code modules to be additive (no existing files broken), tree-shakeable, server-safe (no React imports), and TypeScript strict-mode clean.
- Wrote all docs in a single voice (Markdown tables, code blocks, cross-references to actual code paths) so the three research docs form a coherent platform-engineering handbook.

## Files created (12)
1. `prisma/migrations/migration_lock.toml` — Prisma provider lock (sqlite).
2. `prisma/migrations/20260101000000_init/migration.sql` — baseline init migration: User + Post tables, 7 indexes (single-column + composite), FK with CASCADE.
3. `prisma/scripts/migrate.ts` (~95 lines) — programmatic migration runner. Actions: `status` (list pending), `deploy` (apply pending), `rollback <name>` (print rollback plan — refuses to roll back past init). JSON logging. Pre-flight `DATABASE_URL` check.
4. `src/lib/db-optimization.ts` (~200 lines) — N+1 problem explanation in JSDoc + `include` vs `select` guidance + 5 exports:
   - `eagerLoad(include)` — wrapper making intent explicit
   - `batchFind(model, ids)` — collapse N findUnique → 1 IN query, returns Map
   - `batchFindMany(model, parentIds, parentField)` — fetch related children for many parents in 1 round-trip
   - `chunked(arr, n)` — generator yielding chunks (SQLite bind-param safety, size 500)
   - `withTimer(name, promise)` — log slow queries as JSON (warn >50ms, info otherwise)
5. `src/lib/feature-flags.ts` (~110 lines) — runtime feature-toggle system. `FeatureFlag` union (enableAIAssistant, enable3DMap, enableS2DConsole, enableCompare), `DEFAULT_FLAGS` (all true). Exports: `isFeatureEnabled(flag)`, `getFeatureFlags()`, `describeFeatureFlags()` (with provenance "env"|"default"). Env override via `NEXT_PUBLIC_FEATURE_<FLAG>` (case-insensitive: 1/true/yes/on vs 0/false/no/off). Works client + server (NEXT_PUBLIC_ prefix).
6. `src/lib/api-version.ts` (~150 lines) — API versioning + `withVersioning` middleware. `API_VERSIONS = ["v1"]`, `LATEST_VERSION = "v1"`, `DEPRECATED_VERSIONS` (empty set). Negotiation precedence: Accept header `application/vnd.pip-mlk+v1` → query `?api-version=v1` → LATEST_VERSION. `withVersioning(version, handler)` sets `X-API-Version` on every response, `X-API-Version-Note: served=v1 requested=v2` on drift, `Deprecation: true` + `Sunset: <RFC-7231 date 6mo out>` for deprecated versions, HTTP 400 with supported-versions body for unknown versions.
7. `.github/workflows/ci.yml` (~95 lines) — CI pipeline. Triggers: push to main + PR to main. Concurrency group cancels superseded runs. Job `lint-typecheck-build`: install (frozen lockfile), lint, tsc --noEmit, prisma validate, prisma generate, build. Prisma engine cache keyed on schema hash. Job `pr-validation`: verify worklog.md updated, warn if version unchanged while src/ changed. DATABASE_URL set to file path (CI doesn't open a real DB).
8. `docs/RESEARCH-DATABASE.md` (~400 lines) — 5 sections:
   - §1 Migrations: philosophy (forward-only in prod, reversible via snapshot-restore), directory layout, workflow (dev/CI/prod), sample migration SQL, programmatic runner, 6 rules
   - §2 Schema versioning: strategy (Prisma migration history IS the schema version), backward-compat change table, 3 rollback strategies (snapshot restore / forward-fix / migrate reset), version matrix
   - §3 Query optimization: N+1 problem with code example, `include` vs `select` table, batchFind/batchFindMany/withTimer usage, cheatsheet
   - §4 Connection pooling: Prisma URL params table, pool-size tuning rule, Next.js lifecycle pattern (globalForPrisma cache), idle reaping, graceful shutdown
   - §5 Indexing: strategy, current inventory, when to add (profile first), trade-offs, anti-patterns, EXPLAIN QUERY PLAN verification
9. `docs/RESEARCH-CICD.md` (~500 lines) — 6 sections:
   - §6 CI/CD pipeline: stages table, triggers, caching, branch protection, secrets, future extensions (preview deploys, E2E, bundle budget, Lighthouse)
   - §7 Feature flags: design (static build-time, no runtime UI), API, default inventory table, env-var setting, client vs server, lifecycle (add → wire → enable staging → enable prod → remove), anti-patterns
   - §8 API versioning: model (URL path primary + header/query overrides), route layout, negotiation precedence, breaking-change definition, deprecation workflow
   - §9 Semantic versioning: SemVer 2.0.0 policy, current version 1.0.0, pre-release tags (alpha/beta/rc), version-bump matrix, release process, changelog
   - §10 Deployment strategies: blue-green (instant rollback, Cloudflare Workers Versions), canary (1% → 5% → 25% → 50% → 100% ramp), rolling (Node.js fallback), health-check integration (liveness/readiness/startup), rollback decision matrix, 2-phase schema-change deploy sequence
   - §11 Infrastructure as Code: Terraform/Helm concept mapping table, `wrangler.jsonc` reference (with env.dev/staging/prod blocks, observability, limits), dev→staging→prod promotion, future deploy.yml workflow, IaC rules, state drift detection
10. `docs/RESEARCH-PERFORMANCE.md` (~550 lines) — 4 sections:
    - §12 Cold starts: definition, budget table, lazy-loading patterns (dynamic import for three/leaflet/z-ai-sdk), bundle-size targets, connection warmth (Hyperdrive/Prisma Accelerate), warmup strategies (scheduled Worker, parallel warmup fetch, hover prefetch), measurement (wrangler dev, curl TTFB)
    - §13 Latency/P99/tail: latency budgets table per user action, P50/P90/P95/P99/P99.9 definitions, 6 causes of tail latency, 5 reduction strategies (timeouts+fallbacks, request hedging, caching, connection pooling, precomputation), monitoring (Cloudflare Analytics, in-app metrics, RUM), SLO definition table
    - §14 CDN/edge caching/invalidation: architecture diagram, what-to-cache table, Cache-Control directive cheatsheet, Cloudflare CDN config (wrangler.jsonc), 5 invalidation strategies (versioned filenames, purge by URL, purge everything, tag-based, stale-while-revalidate), invalidation matrix, API route caching rules, cache-key considerations, verification (cf-cache-status)
    - §15 Autoscaling: Cloudflare Workers auto-scaling model (V8 isolates, no config needed), horizontal vs vertical table, 4 stateless design rules, ECS Fargate autoscaling config (CPU target 70%, scale-out 60s, scale-in 300s, min 2 / max 20), Kubernetes HPA YAML, DB autoscaling (vertical → read replicas → sharding), scale-in safety (SIGTERM, drain, db.$disconnect), capacity planning table, load testing with k6

## Files modified (2)
1. `prisma/schema.prisma` — added `role` field (default "analyst") + `posts Post[]` relation to User; added `author User @relation(fields: [authorId], references: [id], onDelete: Cascade)` to Post; added 7 `@@index` declarations:
   - `User.role` (admin panel filter)
   - `User.createdAt` (recency sort)
   - `Post.authorId` (FK — required on SQLite, Prisma does NOT auto-index FKs)
   - `Post.published` (hot filter — dashboard list view)
   - `Post.createdAt` (recency sort)
   - `Post.updatedAt` (edit recency)
   - Composite `Post.[authorId, published, createdAt]` (covers "published posts by author, newest first" dashboard query)
   - Added header comments documenting index strategy + schema versioning pointer
2. `package.json` — `name: "pip-mlk"` (was "nextjs_tailwind_shadcn_ts"), `version: "1.0.0"` (was "0.2.0") per SemVer baseline (docs/RESEARCH-CICD.md §9)

## Verification
- `bun run lint` → **0 errors, 8 warnings** ✅ (all 8 warnings pre-existing in chart.tsx/cron-jobs.ts/event-emitter.ts — none in any new file)
- `bunx prisma validate` → **schema valid 🚀** ✅
- Dev server log: Next.js 16.1.3 (Turbopack), Ready in 851ms, GET / 200 — no compile errors ✅
- All 3 new `src/lib` modules: TypeScript strict-mode clean, no `any`, no React imports (server-safe), tree-shakeable
- All 3 docs cross-reference each other and reference actual code paths
- CI workflow uses `bun install --frozen-lockfile`, concurrency group, Prisma engine cache
- `withVersioning` handles 4 cases: valid version / unsupported (400) / drift (X-API-Version-Note) / deprecated (Deprecation + Sunset)
- `feature-flags.ts` uses `NEXT_PUBLIC_` prefix so flags work in client + server components
- `db-optimization.ts` chunks id lists at 500 to stay under SQLite's `SQLITE_MAX_VARIABLE_NUMBER` (default 999)

## Notes for next agent
- **Database patterns**:
  - `prisma/schema.prisma` now has 7 indexes — `bun run db:push` will apply them, but for prod-like flow use `bunx prisma migrate dev --name <desc>` to generate a new migration file under `prisma/migrations/`.
  - `prisma/scripts/migrate.ts` is a documented sample runner; not yet wired into `package.json` scripts. Add `"db:migrate:status": "bun run prisma/scripts/migrate.ts status"` if you want it as a first-class script.
  - `src/lib/db-optimization.ts` is server-only — do NOT import from client components (it imports `@/lib/db` which transitively imports `@prisma/client`).
  - No DB is actually running in this sandbox (DATABASE_URL points at a file path that may not exist). The migration SQL is hand-reviewed against the schema but `prisma migrate deploy` has not been exercised against a live DB.

- **CI/CD patterns**:
  - `.github/workflows/ci.yml` is checked in but the GitHub repo needs branch-protection rules configured manually (Settings → Branches → main → require `lint · tsc · build` + `pr-validation`). Documented in `docs/RESEARCH-CICD.md` §6.5.
  - `src/lib/feature-flags.ts` is implemented but the dashboard tabs do NOT yet consult it. To honor flags, wrap each tab's render in `dashboard.tsx` with `isFeatureEnabled("enableX") && <XTab />`. The flags currently all default to `true` so no UX regression.
  - `src/lib/api-version.ts` is implemented but existing routes (`/api/assistant`, `/api/route.ts`) are NOT yet wrapped with `withVersioning`. To adopt: move routes under `src/app/api/v1/...` and wrap each handler with `withVersioning("v1", handler)`. The middleware is backward-compatible — old routes will still work, they just won't get the version headers.
  - `wrangler.jsonc` is referenced in `docs/RESEARCH-CICD.md` §11.3 as a representative example but is NOT checked in. Check in a real one when the Cloudflare Workers deploy target is activated.
  - `package.json` version is now `1.0.0` — every PR that changes `src/` should bump per the matrix in `docs/RESEARCH-CICD.md` §9.4. The CI `pr-validation` job warns (not blocks) if you forget.

- **Performance patterns**:
  - `docs/RESEARCH-PERFORMANCE.md` is pure research — no code deliverables. It references `src/lib/db-optimization.ts#withTimer` for P99 monitoring.
  - The lazy-loading patterns in §12.3 (dynamic `import()` for three/leaflet/z-ai-sdk) are documented but NOT yet applied to the dashboard. A future agent should apply them: wrap `Map3DTab`/`Map2DTab` in `React.lazy` + `Suspense`, and dynamic-import `z-ai-web-dev-sdk` inside the assistant route handler.
  - The SLO targets in §13.6 (e.g. `/api/v1/health` P99 < 200ms) are aspirational — no `/api/v1/health` endpoint exists yet. A future agent should add it returning the JSON shape documented in §10.4 of RESEARCH-CICD.md.
  - The Cache-Control headers in §14.3 are documented but NOT yet applied to `next.config.ts`. A future agent should add the `headers()` function to `next.config.ts` to enable CDN caching of `/data/*` and `/_next/static/*`.
