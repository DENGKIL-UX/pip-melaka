// src/lib/s2d-cloudflare-handler.ts
// Cloudflare Workers / Hono adapter for the S2D Intelligence API
//
// The S2D engine is served by its Express server (s2d-360-intelligence-engine/server/index.js)
// on http://localhost:4000 with OpenAPI v1 routes under /api/s2d/intelligence/*.
// For Cloudflare deployment, re-mount the Express JSON handlers as Hono / Web Fetch handlers
// (Cloudflare Workers support fetch/Headers/Request/Response/Web Crypto).
//
// This module provides:
//  1. A fetch-compatible handler that can be used in Workers
//  2. CORS enforcement via S2D_ALLOWED_ORIGINS (never '*')
//  3. Workers storage mapping notes (IndexedDB -> KV/D1/R2)
//
// Usage with Hono (Workers):
//   import { Hono } from 'hono';
//   import { mountS2dIntelligenceRoutes, s2dCorsMiddleware } from '@/lib/s2d-cloudflare-handler';
//
//   const app = new Hono();
//   app.use('/api/s2d/*', s2dCorsMiddleware());
//   mountS2dIntelligenceRoutes(app);
//   export default app;
//
// Usage with raw fetch handler (no Hono):
//   import { createS2dWorkerFetch } from '@/lib/s2d-cloudflare-handler';
//   export default { fetch: createS2dWorkerFetch() };

export const S2D_ALLOWED_ORIGINS = [
  'https://pip-melaka.ritz-analytics.workers.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
] as const;

export type S2dHandler = (req: Request) => Promise<Response>;

interface S2dRoute {
  method: string;
  path: string;
  handler: S2dHandler;
}

// In-memory mock for Workers KV fallback — in production, replace with KV/D1 bindings
const KV_FALLBACK = new Map<string, string>();

/**
 * CORS middleware for S2D intelligence routes.
 * Enforces whitelist, not '*', per security checklist.
 */
export function s2dCorsMiddleware(allowedOrigins: readonly string[] = S2D_ALLOWED_ORIGINS) {
  return async (c: any, next: () => Promise<void>) => {
    const origin = c.req?.header?.('origin') ?? c.headers?.get?.('origin');
    const isAllowed = origin ? (allowedOrigins as readonly string[]).includes(origin) : false;

    // Preflight
    if (c.req?.method === 'OPTIONS' || c.method === 'OPTIONS') {
      if (!isAllowed) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }

    await next();

    // Stamp CORS headers on actual response
    if (isAllowed && c.res) {
      c.res.headers.set('Access-Control-Allow-Origin', origin);
      c.res.headers.set('Access-Control-Allow-Credentials', 'true');
      c.res.headers.set('Vary', 'Origin');
    } else if (isAllowed && c instanceof Response) {
      const headers = new Headers(c.headers);
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      return new Response(c.body, { status: c.status, headers });
    }
  };
}

/**
 * Build a fetch-compatible handler for the S2D intelligence endpoints.
 * Uses Web Fetch APIs only (Workers V8 isolates — no Node http).
 */
export function createS2dWorkerFetch(opts: { allowedOrigins?: readonly string[]; basePath?: string } = {}): (request: Request, env?: any, ctx?: any) => Promise<Response> {
  const allowedOrigins = opts.allowedOrigins ?? S2D_ALLOWED_ORIGINS;
  const basePath = opts.basePath ?? '/api/s2d/intelligence';

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const isAllowed = origin ? (allowedOrigins as readonly string[]).includes(origin) : origin === null; // same-origin (no Origin header) is allowed
    const corsHeaders: Record<string, string> = {};
    if (origin && (allowedOrigins as readonly string[]).includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
      corsHeaders['Vary'] = 'Origin';
    }

    if (!url.pathname.startsWith(basePath)) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method === 'OPTIONS') {
      if (origin && !(allowedOrigins as readonly string[]).includes(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }

    // Only enforce CORS for cross-origin; same-origin without Origin header passes
    if (origin && !isAllowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const path = url.pathname.replace(basePath, '') || '/';
    const method = request.method;

    // Mock intelligence payloads — in production, these read from KV / D1 / R2
    // Storage mapping per Cloudflare guide:
    //   client cache  -> IndexedDB (browser)
    //   server JSON   -> Cloudflare KV
    //   audit logs    -> D1
    //   PCAP/artifacts-> R2
    if (path === '/' || path === '') {
      return new Response(
        JSON.stringify({
          endpoint: basePath,
          description: 'S2D Intelligence API — Cloudflare Workers (Hono / Web Fetch)',
          runtime: 'Cloudflare Workers V8',
          cors: { allowedOrigins },
          storage: { clientCache: 'IndexedDB', serverJson: 'KV', auditLogs: 'D1', artifacts: 'R2' },
          governance: { aggregatePublicSignalsOnly: true, humanReviewRequired: true },
          routes: ['GET /signals', 'GET /narratives', 'GET /recommendations', 'GET /briefs/daily'],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (path === '/signals' && method === 'GET') {
      const localityCode = url.searchParams.get('localityCode') ?? 'MELAKA';
      return new Response(JSON.stringify({ signals: [{ signalId: 'SIG-MOCK-001', localityCode, sentiment: 'NEGATIVE' }], count: 1, source: 'KV' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (path === '/narratives' && method === 'GET') {
      return new Response(JSON.stringify({ narratives: [{ narrativeId: 'NAR-001', title: 'Healthcare funding' }], count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (path === '/recommendations' && method === 'GET') {
      return new Response(JSON.stringify({ recommendations: [{ recommendationId: 'REC-001', type: 'WHITE' }], count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if ((path === '/briefs/daily' || path === '/daily-brief') && method === 'GET') {
      return new Response(JSON.stringify({ brief: { briefId: 'BRIEF-001', reportDate: new Date().toISOString().slice(0, 10) } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown route', path, method }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  };
}

/**
 * Mount helper for Hono apps (if hono is installed).
 * Gracefully no-ops if hono is not present.
 */
export function mountS2dIntelligenceRoutes(app: any, basePath: string = '/api/s2d/intelligence') {
  if (!app || typeof app.get !== 'function') return;
  const handler = createS2dWorkerFetch({ basePath });
  app.get(`${basePath}/`, async (c: any) => {
    const res = await handler(c.req.raw as Request);
    return c.body(await res.text(), res.status as any, Object.fromEntries(res.headers.entries()));
  });
  app.get(`${basePath}/signals`, async (c: any) => {
    const res = await handler(c.req.raw as Request);
    return c.body(await res.text(), res.status as any, Object.fromEntries(res.headers.entries()));
  });
  app.get(`${basePath}/narratives`, async (c: any) => {
    const res = await handler(c.req.raw as Request);
    return c.body(await res.text(), res.status as any, Object.fromEntries(res.headers.entries()));
  });
  app.get(`${basePath}/recommendations`, async (c: any) => {
    const res = await handler(c.req.raw as Request);
    return c.body(await res.text(), res.status as any, Object.fromEntries(res.headers.entries()));
  });
  app.get(`${basePath}/briefs/daily`, async (c: any) => {
    const res = await handler(c.req.raw as Request);
    return c.body(await res.text(), res.status as any, Object.fromEntries(res.headers.entries()));
  });
}

// Edge fixture / audit-mode note — Nmap/Tshark spawn does NOT exist in Cloudflare V8 isolates.
// Use Edge Fixture / Audit Mode by default (S2D_ACTIVE_SECURITY_SCAN_ENABLED=false)
// OR proxy active scans to a dedicated Node container.
export const S2D_EDGE_SECURITY_NOTE = {
  nmapTsharkInWorkers: false,
  defaultMode: 'EDGE_FIXTURE_AUDIT',
  activeScanSupported: false,
  activeScanProxy: 'Dedicated Node container (not Workers)',
  envFlag: 'S2D_ACTIVE_SECURITY_SCAN_ENABLED=false',
};

export default createS2dWorkerFetch;
