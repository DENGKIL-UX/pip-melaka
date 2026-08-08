import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * @deprecated LOCAL-DEV ONLY.
 *
 * Do NOT import this module from `src/app/api/**` or any `src/lib/**` module
 * that is bundled into the Cloudflare Worker. Prisma's query engine cannot
 * run on the Workers runtime (used by the PIP Melaka production deploy on
 * `pip-melaka.ritz-analytics.workers.dev`), and the production hot path is
 * backed by Cloudflare D1 (aggregate tables) + R2 (tiles/snapshots) rather
 * than Prisma.
 *
 * This module is retained only for local ingestion/scripting until D1 is the
 * sole database for analytics. It will be removed in a post-v0 cleanup PR.
 * See docs/PIP-MELAKA-ETHNIC-ANALYTICS-WEBMCP-ROADMAP.md §1.1 and
 * docs/CLOUDFLARE-FREE-TIER-ARCHITECTURE.md §7.
 *
 * Lazily-instantiated Prisma client.
 *
 * Prisma is only consumed by the health / readiness probes — the main app
 * reads from static JSON data files under `public/data/`. We MUST NOT throw
 * at module-import time if the Prisma engine is unavailable (engine binary
 * not generated, no `DATABASE_URL`, running on a worker runtime, etc.).
 * Throwing on import turns a recoverable "database is down" condition into a
 * hard HTTP 500 that defeats the entire purpose of a health check.
 *
 * Instead we defer `new PrismaClient()` to first property access via a Proxy.
 * If construction fails (returns `undefined`), the proxy throws a clear
 * error on use — which the health probe's `try/catch` around `db.$queryRaw`
 * catches and reports as `database: fail` (HTTP 503), never a 500.
 */
function createClient(): PrismaClient | undefined {
  try {
    return new PrismaClient({ log: ['query'] })
  } catch {
    // Engine not generated / unavailable — defer the decision to the caller.
    return undefined
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    // Cache a successfully-constructed client on globalThis; retry on each
    // access while it remains unavailable.
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient()
    }
    const client = globalForPrisma.prisma
    if (!client) {
      throw new Error(
        'Prisma client is not available. Run `prisma generate`, ensure ' +
          'DATABASE_URL is set, or operate in static-data mode.',
      )
    }
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})
