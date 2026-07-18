/**
 * src/lib/db-optimization.ts
 * ---------------------------------------------------------------------------
 * PIP-MLK query-optimization helpers + N+1 prevention.
 *
 * See docs/RESEARCH-DATABASE.md §3 for the full write-up. This module ships:
 *
 *   1. N+1 example + explanation (in the JSDoc below)
 *   2. `include` vs `select` guidance (see eagerLoad helper)
 *   3. `batchFind` — a query-batching helper that collapses N point queries
 *      into a single `WHERE id IN (...)` round-trip. Use it whenever you
 *      find yourself writing `for (const x of xs) { await db.x.findUnique(...) }`.
 *   4. `chunked` — splits a large id list into chunked `IN` queries so we
 *      never blow past SQLite's `SQLITE_MAX_VARIABLE_NUMBER` (default 999).
 *
 * Everything here is tree-shakeable server-side only — do not import from
 * client components.
 * ---------------------------------------------------------------------------
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// 1. The N+1 problem — what it is and how it bites you
// ---------------------------------------------------------------------------
/**
 * THE N+1 PROBLEM
 *
 * Given: a list of N authors. For each author you want their posts.
 *
 *   ❌ BAD — N+1 queries (1 to fetch authors, N to fetch each author's posts):
 *
 *      const authors = await db.user.findMany({ take: 50 });
 *      for (const a of authors) {
 *        const posts = await db.post.findMany({ where: { authorId: a.id } });
 *        // ... use posts
 *      }
 *
 *   ✅ GOOD — 2 queries total (1 for authors, 1 for ALL their posts via `in`):
 *
 *      const authors = await db.user.findMany({
 *        take: 50,
 *        include: { posts: true },           // Prisma eager-loads in ONE follow-up query
 *      });
 *
 *   ✅ BEST — 1 query total (Prisma joins for you, db-side):
 *
 *      const authors = await db.user.findMany({
 *        take: 50,
 *        select: { id: true, name: true, posts: { select: { id: true, title: true } } },
 *      });
 *
 * Cost at N=50:
 *   N+1: 51 round-trips × ~2ms RTT = ~102ms latency floor, plus 51 query plans.
 *   Eager: 2 round-trips × ~2ms RTT = ~4ms latency floor.
 *
 * The N+1 version is invisible in local dev (everything is <1ms) and
 * catastrophic in production (network RTT dominates). Always use `include`
 * or `select` for related rows.
 */

// ---------------------------------------------------------------------------
// 2. `include` vs `select` — when to use which
// ---------------------------------------------------------------------------
/**
 * `include` — load WHOLE related rows. Use when the consumer needs every column.
 *
 *   await db.post.findMany({
 *     include: { author: true },             // returns full User object per post
 *   });
 *
 * `select` — load only the columns you name. Use when you know exactly which
 * fields the consumer needs. Smaller payloads → less DB I/O, less JSON
 * serialization, less memory, faster over the wire.
 *
 *   await db.post.findMany({
 *     select: {
 *       id: true,
 *       title: true,
 *       author: { select: { id: true, name: true } },   // only id + name from author
 *     },
 *   });
 *
 * Rule of thumb for PIP-MLK:
 *   - Inside API route handlers (which return JSON to the browser): always
 *     use `select` so we never leak sensitive columns or ship extra bytes.
 *   - Inside server-only jobs that consume the whole row: `include` is fine.
 */

/**
 * `eagerLoad` — a tiny wrapper that makes the "I need related rows" intent
 * explicit at the call site. Currently delegates to `include`; documented
 * here so the codebase has a single obvious entry point and future agents
 * know where to add field-projection logic.
 */
export function eagerLoad<TInclude extends Record<string, true>>(
  include: TInclude,
): { include: TInclude } {
  return { include };
}

// ---------------------------------------------------------------------------
// 3. `batchFind` — collapse N point queries into one `WHERE id IN (...)`
// ---------------------------------------------------------------------------
/**
 * `batchFind` — fetch many rows by id in a single round-trip.
 *
 * Use this when you have an array of ids and would otherwise be tempted to
 * write `for (const id of ids) await db.x.findUnique({ where: { id } })`.
 *
 * Returns a Map<id, row> so callers can look up rows without scanning.
 * Rows that don't exist are simply absent from the map.
 *
 * Internally chunks the id list to stay under SQLite's bind-parameter limit
 * (default 999) — see `chunked` below.
 */
export async function batchFind<T extends { id: string }>(
  model: "user" | "post",
  ids: string[],
): Promise<Map<string, T>> {
  const result = new Map<string, T>();
  if (ids.length === 0) return result;

  const uniqueIds = Array.from(new Set(ids));
  for (const chunk of chunked(uniqueIds, 500)) {
    const rows = await db[model].findMany({
      where: { id: { in: chunk } },
    });
    for (const row of rows as T[]) {
      result.set(row.id, row);
    }
  }
  return result;
}

/**
 * `batchFindMany` — fetch related child rows for many parent ids in a single
 * round-trip. E.g. "give me all posts for these 50 author ids".
 *
 * Returns a Map<parentId, child[]> (empty array if the parent has no children).
 *
 * This is the general-purpose N+1 killer: any time you'd write a loop of
 * `findMany({ where: { parentId } })` calls, use this instead.
 */
export async function batchFindMany<TParent extends string, TChild extends { authorId?: string; id: string }>(
  model: "post",
  parentIds: string[],
  parentField: keyof TChild & string = "authorId" as keyof TChild & string,
): Promise<Map<TParent, TChild[]>> {
  const grouped = new Map<TParent, TChild[]>();
  for (const pid of parentIds) grouped.set(pid as TParent, []);
  if (parentIds.length === 0) return grouped;

  const uniqueIds = Array.from(new Set(parentIds));
  for (const chunk of chunked(uniqueIds, 500)) {
    const rows = await db[model].findMany({
      where: { [parentField]: { in: chunk } } as never,
    });
    for (const row of rows as TChild[]) {
      const pid = (row as Record<string, unknown>)[parentField] as TParent | undefined;
      if (pid === undefined) continue;
      const bucket = grouped.get(pid);
      if (bucket) bucket.push(row);
    }
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// 4. `chunked` — split a list into chunks of size n
// ---------------------------------------------------------------------------
/**
 * `chunked` — yield chunks of size `n` from an array. Used to keep `IN`
 * queries under SQLite's SQLITE_MAX_VARIABLE_NUMBER (default 999, set to
 * 32766 on newer builds — we use 500 to be safe across builds).
 *
 *   for (const c of chunked(ids, 500)) { await db.x.findMany({ where: { id: { in: c } } }); }
 */
export function* chunked<T>(arr: T[], n: number): Generator<T[]> {
  if (n <= 0) throw new Error(`chunked: size must be > 0, got ${n}`);
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

// ---------------------------------------------------------------------------
// 5. `withTimer` — log slow queries for P99/tail-latency tracking
// ---------------------------------------------------------------------------
/**
 * `withTimer` — wrap a Prisma query, log its duration, and return the result.
 * Used by the performance-budget harness (see docs/RESEARCH-PERFORMANCE.md §2).
 *
 *   const users = await withTimer("findMany.users", db.user.findMany({ ... }));
 *
 * Logs JSON to stdout so the dev server log is grep-able for slow queries:
 *   {"level":"info","metric":"db.query","name":"findMany.users","ms":42}
 */
export async function withTimer<T>(name: string, promise: Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    return await promise;
  } finally {
    const ms = Date.now() - t0;
    if (ms > 50) {
      // Only log slow queries — <50ms is below the P99 budget.
      console.log(JSON.stringify({ level: "warn", metric: "db.query.slow", name, ms }));
    } else {
      console.log(JSON.stringify({ level: "info", metric: "db.query", name, ms }));
    }
  }
}
