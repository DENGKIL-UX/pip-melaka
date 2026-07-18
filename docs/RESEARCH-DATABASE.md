# PIP-MLK Database Research — `docs/RESEARCH-DATABASE.md`

> Task ID: DB-CICD-01
> Scope: migrations, schema versioning, query optimization, connection pooling, indexing.
> Truth Above All — every recommendation below is wired into actual code under `prisma/` and `src/lib/`.

---

## Table of contents

1. [Database Migrations](#1-database-migrations)
2. [Schema Versioning](#2-schema-versioning)
3. [Query Optimization + N+1 Prevention](#3-query-optimization--n1-prevention)
4. [Connection Pooling](#4-connection-pooling)
5. [Database Indexing](#5-database-indexing)

---

## 1. Database Migrations

### 1.1 Philosophy

Prisma migrations are **versioned SQL files** checked into the repo. They are:

- **Forward-only in production** — `prisma migrate deploy` applies pending migrations; never runs `migrate reset` in prod.
- **Reversible only via snapshot-restore** in production (see §2.3 Rollback strategy). Prisma does not generate `DOWN` migrations because relational rollbacks are unsafe in the presence of data mutations.
- **Linear history** — every PR that changes `prisma/schema.prisma` must add exactly one new migration directory under `prisma/migrations/`.

### 1.2 Directory layout

```
prisma/
├── schema.prisma                              # the single source of truth
├── migrations/
│   ├── migration_lock.toml                    # provider lock (sqlite)
│   ├── 20260101000000_init/
│   │   └── migration.sql                      # baseline migration (init)
│   └── 20260201000000_add_post_status/
│       └── migration.sql                      # example follow-up migration
└── scripts/
    └── migrate.ts                             # programmatic runner (status/deploy/rollback)
```

### 1.3 Workflow

#### Local development (every engineer)

```bash
# 1. Edit prisma/schema.prisma — add a field, model, index, etc.

# 2. Generate a migration from the schema diff
bunx prisma migrate dev --name add_post_status
# → creates prisma/migrations/<timestamp>_add_post_status/migration.sql
# → applies it to the local SQLite DB
# → regenerates @prisma/client

# 3. Commit schema.prisma + the new migration directory together
git add prisma/schema.prisma prisma/migrations/
git commit -m "db: add post.status (PIP-MLK-XXX)"
```

#### CI pipeline (`.github/workflows/ci.yml`)

```yaml
- name: Prisma validate
  run: bunx prisma validate          # schema syntactically valid?

- name: Prisma generate
  run: bun run db:generate           # @prisma/client matches schema
```

CI does **not** run `migrate dev` (that would create migrations on the runner). It validates the schema and regenerates the client so the build step can compile.

#### Production / staging deploy

```bash
# Apply pending migrations on deploy (forward-only, safe to re-run)
bunx prisma migrate deploy
```

`migrate deploy` is **idempotent** — it checks the `_prisma_migrations` table and only applies migrations that haven't run yet.

### 1.4 Sample migration

The baseline migration is checked in at
[`prisma/migrations/20260101000000_init/migration.sql`](../prisma/migrations/20260101000000_init/migration.sql).
It creates the `User` and `Post` tables plus all single-column and composite indexes documented in §5.

A typical follow-up migration (e.g. adding a `status` column) looks like:

```sql
-- prisma/migrations/20260201000000_add_post_status/migration.sql
ALTER TABLE "Post" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
CREATE INDEX "Post_status_idx" ON "Post"("status");
```

### 1.5 Programmatic migration runner

[`prisma/scripts/migrate.ts`](../prisma/scripts/migrate.ts) is a documented sample
runner that wraps the `prisma` CLI with:

- JSON logging for machine-parsable CI output
- Pre-flight `DATABASE_URL` check
- Rollback guard (refuses to roll back past the init migration)

```bash
bun run prisma/scripts/migrate.ts status            # show pending migrations
bun run prisma/scripts/migrate.ts deploy            # apply pending migrations
bun run prisma/scripts/migrate.ts rollback <name>   # print rollback plan
```

### 1.6 Rules

- **Never edit a migration that has shipped to prod.** Always add a new one.
- **Never delete the `migration_lock.toml`.** Prisma uses it to detect provider drift.
- **Never run `prisma migrate reset` against a non-local DB.** It drops all data.
- **Always commit `schema.prisma` and the new migration directory in the same commit.** Splitting them across commits breaks bisect.

---

## 2. Schema Versioning

### 2.1 Strategy

PIP-MLK uses **Prisma's built-in migration history** as the canonical schema version.

- **Schema version** = the set of migrations applied to a database, recorded in the `_prisma_migrations` table.
- **Application version** = the `version` field in `package.json` (currently `1.0.0`, see `docs/RESEARCH-CICD.md` §9).
- Each release is tagged `v<major>.<minor>.<patch>` AND references the migration SHA it shipped with.

This means: any deployed app version implies an exact database schema version. There is no separate `schema_version` table — that would be a second source of truth.

### 2.2 Backward-compatible schema changes

A schema change is **backward-compatible** if the OLD application binary can run against the NEW database, and the NEW application binary can run against the OLD database. Concretely:

| Change | Backward-compatible? | Notes |
|--------|---------------------|-------|
| Add a nullable column | ✅ | Old app ignores it; new app reads `null`. |
| Add a column with a default | ✅ | Old app ignores it; new app reads the default. |
| Add a NOT-NULL column without default | ❌ | Old inserts fail. Use a default + backfill migration. |
| Add a new model / table | ✅ | Old app never references it. |
| Add an index | ✅ | Pure performance. |
| Drop an index | ✅ | Pure performance. |
| Drop a column | ⚠️ | Compatible ONLY if the old app no longer reads/writes it. Do it in 2 phases: (1) deploy app code that stops using the column, (2) ship the DROP migration. |
| Rename a column | ❌ | Do as ADD + backfill + DROP across 2 releases. |
| Change a column type | ❌ | Do as ADD + backfill + DROP across 2 releases. |

### 2.3 Migration rollback strategy

Prisma does not generate `DOWN` migrations. The PIP-MLK rollback strategy is:

#### Strategy A — Restore from snapshot (preferred for prod)

1. **Before every deploy**, take a SQLite file snapshot:
   ```bash
   cp prisma/dev.db prisma/dev.db.pre-deploy-$(date +%s)
   ```
   (For managed Postgres/MySQL, use `pg_dump` / `mysqldump`.)
2. **Apply migrations** with `prisma migrate deploy`.
3. **If rollback is needed**:
   - Restore the snapshot.
   - Truncate the `prisma/migrations/` directory in the deploy artifact back to the target migration (the programmatic runner at `prisma/scripts/migrate.ts rollback <name>` prints this exact plan).
   - Redeploy.

#### Strategy B — Forward-fix (preferred for staging/dev)

If the bad migration is data-shape only (no destructive column drops), write a **new** migration that undoes the change:

```sql
-- prisma/migrations/20260301000000_undone_bad_status/migration.sql
-- Forward-fix for 20260201000000_add_post_status: drop the column.
ALTER TABLE "Post" DROP COLUMN "status";
DROP INDEX "Post_status_idx";
```

Forward-fix is preferred because it preserves the linear migration history and works in environments where snapshot-restore is not possible (e.g. Cloudflare D1, Neon branches).

#### Strategy C — `migrate reset` (local dev ONLY)

```bash
bun run db:reset    # drops + recreates the DB, replays all migrations
```

Never run this against staging or prod. The CI workflow refuses to run it.

### 2.4 Version matrix

| App version | Schema baseline | New migrations in this release |
|-------------|-----------------|--------------------------------|
| 1.0.0       | `20260101000000_init` | (initial release) |

Append a row to this table in every PR that ships a new migration.

---

## 3. Query Optimization + N+1 Prevention

See [`src/lib/db-optimization.ts`](../src/lib/db-optimization.ts) for the live implementation. The helpers below are tree-shakeable and server-only.

### 3.1 The N+1 problem

```typescript
// ❌ N+1: 1 query for authors + N queries for posts = N+1 round-trips
const authors = await db.user.findMany({ take: 50 });
for (const a of authors) {
  const posts = await db.post.findMany({ where: { authorId: a.id } });
}

// ✅ 2 queries total: 1 for authors + 1 for ALL their posts
const authors = await db.user.findMany({
  take: 50,
  include: { posts: true },
});
```

At N=50 with a 2ms network RTT, the N+1 version has a **102ms latency floor** just from round-trips. The eager version has a **4ms floor**. On a serverless platform where cold-start DB connections can be 20–50ms, the N+1 version becomes a 1-second request.

### 3.2 `include` vs `select`

| | `include` | `select` |
|---|-----------|----------|
| Returns | All columns of related rows | Only the columns you name |
| Payload size | Large | Small |
| Use when | You need every column (server-side job) | You know the exact shape the consumer needs (API route) |
| Leaks sensitive columns? | Possible | Impossible (you must explicitly name a column to return it) |

**PIP-MLK rule**: inside API route handlers, **always** use `select`. Inside server-only jobs that consume the whole row, `include` is fine.

```typescript
// API route — use select, return only what the client needs
const posts = await db.post.findMany({
  where: { published: true },
  select: {
    id: true,
    title: true,
    author: { select: { id: true, name: true } },
  },
});

// Server-only job — include is fine
const posts = await db.post.findMany({
  include: { author: true },
});
```

### 3.3 `batchFind` — collapse N point queries into one `IN (...)`

When you have an array of ids, never loop `findUnique`. Use `batchFind`:

```typescript
import { batchFind } from "@/lib/db-optimization";

const authorIds = posts.map((p) => p.authorId);          // 50 ids
const authors = await batchFind<User>("user", authorIds); // 1 query

for (const p of posts) {
  const author = authors.get(p.authorId);                 // O(1) lookup
}
```

Internally `batchFind` chunks the id list (size 500) to stay under SQLite's `SQLITE_MAX_VARIABLE_NUMBER` (default 999).

### 3.4 `batchFindMany` — fetch related children for many parents

The general-purpose N+1 killer. Use whenever you'd write a loop of `findMany({ where: { parentId } })`:

```typescript
import { batchFindMany } from "@/lib/db-optimization";

const authorIds = authors.map((a) => a.id);
const postsByAuthor = await batchFindMany<Post>("post", authorIds);

for (const a of authors) {
  const posts = postsByAuthor.get(a.id) ?? [];
}
```

### 3.5 `withTimer` — log slow queries

Wrap any Prisma call to log its duration as JSON:

```typescript
import { withTimer } from "@/lib/db-optimization";

const users = await withTimer("findMany.users", db.user.findMany({ take: 50 }));
```

Queries slower than 50ms are logged at `warn` level; faster queries at `info`. The output is grep-able for P99/tail-latency tracking (see `docs/RESEARCH-PERFORMANCE.md` §2).

### 3.6 Cheatsheet

| Smell | Fix |
|-------|-----|
| `for (const x of xs) { await db.x.findUnique(...) }` | `batchFind` |
| `for (const x of xs) { await db.x.findMany(...) }` | `batchFindMany` |
| `findMany` without `select` in an API route | Add `select` |
| `findMany` with `include` in an API route | Switch to `select` |
| Same query called in a loop | Hoist + cache outside the loop |
| `count` + `findMany` to get a page | Use `_count` in a single `aggregate` |

---

## 4. Connection Pooling

### 4.1 Prisma architecture

Prisma Client does **not** implement its own connection pool — it delegates to the database driver, which maintains the pool. For SQLite (the current PIP-MLK provider), the "pool" is effectively the file handle plus WAL-mode readers, so the knobs below are Postgres/MySQL-oriented. They are documented so the same patterns apply when PIP-MLK graduates to a managed Postgres (Neon, Supabase, RDS) without rewriting application code.

### 4.2 Connection URL parameters

For Postgres, append pool parameters to `DATABASE_URL`:

```
postgresql://user:pass@host:5432/db?schema=public&pool_timeout=30&connection_limit=10&connect_timeout=30
```

| Parameter | Default | PIP-MLK recommended | Notes |
|-----------|---------|---------------------|-------|
| `connection_limit` | num_cpus × 2 + 1 | `10` per app instance | Set explicitly; the default over-subscribes on small instances. |
| `pool_timeout` | 10s | `30` | How long to wait for a free connection before erroring. |
| `connect_timeout` | 5s | `30` | Cold-start tolerance — Neon/Serverless DBs can take >5s to accept a connection. |
| `socket_timeout` | 0 (off) | `30` | Kill stuck queries. |
| `pgbouncer` | off | `true` in serverless | Required on Neon/Supabase pooler endpoints. |

### 4.3 Pool-size tuning

**Rule of thumb**: `connection_limit = (max_concurrent_requests_per_instance) + 2`.

- Next.js serverless functions on Cloudflare Workers/Vercel: each isolate is single-threaded, so 1–2 connections per isolate is plenty. Use PgBouncer (transaction-mode) so multiple isolates share a small pool of real DB connections.
- Long-running Node.js server (PM2 / container): `num_cpus × 2 + 1` is the Prisma default and is usually correct.
- **Total pool ceiling**: sum across all instances must stay below the DB's `max_connections`. For Neon free tier (100 conns) with 5 app instances, set `connection_limit=15` (75 total, 25% headroom).

### 4.4 Connection lifecycle in Next.js

`src/lib/db.ts` already implements the standard pattern:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

Why this pattern:

- **Dev (Next.js HMR)**: Without the `globalForPrisma` cache, every HMR reload creates a new `PrismaClient`, exhausting the DB connection pool in minutes. The cache ensures one client per Node.js process.
- **Prod (serverless)**: Each isolate gets its own client. The `globalForPrisma` cache prevents duplicate clients if the isolate is reused. The cache is intentionally **not** set in production so workers exit cleanly between invocations.
- **`log: ["query"]`**: dev-only query logging. In prod, drop to `log: ["error"]` and rely on the `withTimer` helper (§3.5) for slow-query detection.

### 4.5 Idle-connection reaping

Prisma does not reap idle connections on its own — the DB driver does. To force reaping on long-lived processes:

```typescript
setInterval(async () => {
  await db.$queryRaw`SELECT 1`;          // keepalive
}, 60_000);
```

For serverless, this is unnecessary — the isolate dies between requests.

### 4.6 Disconnect on shutdown

```typescript
// In a top-level graceful-shutdown handler
process.on("beforeExit", async () => { await db.$disconnect(); });
process.on("SIGTERM", async () => { await db.$disconnect(); process.exit(0); });
```

This is critical for long-running Node.js servers (Docker, Kubernetes) — without it, the DB pool leaks connections across deploys until the DB refuses new connections.

---

## 5. Database Indexing

### 5.1 Strategy

PIP-MLK indexes are driven by **queries the app actually runs**, not by guessing. The current `prisma/schema.prisma` ships indexes for:

1. **Foreign keys** — Prisma does NOT auto-index FKs on SQLite. Every `authorId`-style column gets a `@@index`.
2. **Hot filter columns** — `published` (every dashboard list view filters `WHERE published = true`).
3. **Sort columns** — `createdAt`, `updatedAt` (every list view sorts by recency).
4. **Composite** — `[authorId, published, createdAt]` covers the dashboard query "published posts by author, newest first" in a single index seek.
5. **Unique constraints** — `User.email` is `@unique`, which Prisma implements as a unique index.

### 5.2 Current index inventory

From `prisma/schema.prisma`:

```prisma
model User {
  // ...
  @@index([role])                    // admin panel role filter
  @@index([createdAt])               // recency sort
}

model Post {
  // ...
  @@index([authorId])                // FK — required on SQLite
  @@index([published])               // hot filter
  @@index([createdAt])               // recency sort
  @@index([updatedAt])               // recency sort (edits)
  @@index([authorId, published, createdAt])  // composite for dashboard list view
}
```

### 5.3 When to add a new index

1. **Profile first.** Use `withTimer` (§3.5) to find slow queries, then `EXPLAIN QUERY PLAN` (SQLite) / `EXPLAIN ANALYZE` (Postgres) to see if it's a missing index.
2. **Add the index in `schema.prisma`** (declarative — Prisma generates the migration).
3. **Generate the migration**: `bunx prisma migrate dev --name add_<column>_idx`.
4. **Verify** the planner uses the new index: `EXPLAIN QUERY PLAN SELECT ... ` should show `USING INDEX <name>` instead of `SCAN TABLE`.

### 5.4 Index trade-offs

- **Read speed-up** vs **write cost** — every index adds an entry to maintain on INSERT/UPDATE/DELETE. A table with 10 indexes writes 11 rows on every INSERT. Don't index "just in case".
- **Disk space** — indexes on high-cardinality text columns can be larger than the table. Monitor with `PRAGMA stat1` (SQLite) or `pgstattuple` (Postgres).
- **Composite vs single** — a composite index `[a, b, c]` can serve queries on `a`, `a+b`, `a+b+c` but NOT `b`, `c`, or `b+c` alone. Order columns by selectivity (most-selective first) for best pruning.

### 5.5 Anti-patterns to avoid

- ❌ Indexing every column "for safety" — kills write throughput.
- ❌ Indexing a boolean column alone (e.g. `published`) — low cardinality, planner often ignores it. Put it SECOND in a composite: `[authorId, published]`.
- ❌ Indexing a column you never filter or sort on.
- ❌ Adding an index without regenerating the migration — `prisma db push` skips migration history; always use `prisma migrate dev`.

### 5.6 Verification query

After adding an index, verify it's actually used:

```sql
-- SQLite
EXPLAIN QUERY PLAN
SELECT id, title FROM Post
WHERE authorId = 'abc' AND published = 1
ORDER BY createdAt DESC
LIMIT 20;
-- Expected: "SEARCH Post USING INDEX Post_authorId_published_createdAt_idx ..."
```

If you see `SCAN Post`, the index is not being used — check column order or run `ANALYZE` to refresh planner statistics.
