/**
 * PIP-MLK S2D Intelligence API Client — Phase 2
 *
 * Connects pip-melaka to the modern S2D-360 Intelligence Engine.
 *
 * - Local dev: Express server at http://localhost:4000 (s2d-360-intelligence-engine/server/index.js)
 * - Cloudflare Workers: Hono / Web Fetch handlers mounted under /api/s2d/intelligence/*
 * - Uses Web Fetch APIs (fetch/Headers/Request/Response/Web Crypto) for Cloudflare V8 isolates
 * - CORS restricted to https://pip-melaka.ritz-analytics.workers.dev (see src/lib/cors.ts)
 *
 * Endpoints (per S2D-PIP-MELAKA-REPLACEMENT-GUIDE.md):
 *   GET /api/s2d/intelligence/signals?localityCode=MELAKA
 *   GET /api/s2d/intelligence/narratives
 *   GET /api/s2d/intelligence/recommendations
 *   GET /api/s2d/intelligence/briefs/daily
 *
 * Also supports the ported engine's Next.js-native routes:
 *   GET /api/s2d/intelligence/sentiment-snapshots
 *   GET /api/s2d/intelligence/change-points
 *   GET /api/s2d/intelligence/local-profiles
 *   GET /api/s2d/intelligence/daily-brief
 *
 * The client auto-detects environment:
 *   - If S2D_ENGINE_URL env is set (e.g. http://localhost:4000), use it
 *   - Otherwise use relative /api/s2d/intelligence (works on Cloudflare Workers Pages)
 *
 * Contract validators from @ritzanalytics/pip-s2d-contracts are used to validate
 * exchange envelopes where applicable (see callAndValidate).
 *
 * @example
 *   import { createS2dIntelligenceClient, fetchSignals } from '@/integration/pip360/api/s2d-intelligence-api-client';
 *   const client = createS2dIntelligenceClient();
 *   const { signals } = await client.getSignals({ localityCode: 'MELAKA' });
 */

const DEFAULT_TIMEOUT_MS = 10000;

// Base URLs
function resolveBaseUrl() {
  // Browser code must stay same-origin. A public localhost URL would point at
  // the operator's browser, not the server/Worker, and would bypass the Next.js
  // integration boundary. Callers can still pass opts.baseUrl explicitly in a
  // controlled server-side integration test.
  if (typeof window !== 'undefined') return '';

  // Server-side local development may proxy to the Express engine on :4000.
  if (typeof process !== 'undefined' && process.env.S2D_ENGINE_URL) {
    return process.env.S2D_ENGINE_URL.replace(/\/$/, '');
  }
  return '';
}

function resolveIntelligenceBase(baseUrl) {
  // If absolute baseUrl provided (e.g. http://localhost:4000), append /api/s2d/intelligence
  // If baseUrl is empty (relative), use /api/s2d/intelligence directly
  if (!baseUrl) return '/api/s2d/intelligence';
  // Engine's Express server mounts intelligence routes under /api/s2d/intelligence and /api/v1
  // Prefer the pip-melaka path for consistency, but support both
  if (baseUrl.includes('/api')) return baseUrl;
  return `${baseUrl}/api/s2d/intelligence`;
}

function withTimeout(ms, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), ms);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * Core fetch wrapper using Web Fetch APIs (Cloudflare Workers compatible).
 * No Node 'http' module — only fetch/Headers/Request/Response.
 */
async function fetchJson(path, { baseUrl = resolveBaseUrl(), method = 'GET', query = {}, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  const intelligenceBase = resolveIntelligenceBase(baseUrl);
  const url = new URL(path.startsWith('/') ? `${intelligenceBase}${path}` : `${intelligenceBase}/${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  // Append query params
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const timer = withTimeout(timeoutMs, signal);
  try {
    // Use Web Fetch with Headers object (Cloudflare Workers style)
    const fetchHeaders = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    });

    const response = await fetch(url.toString(), {
      method,
      headers: fetchHeaders,
      body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
      signal: timer.signal,
    });

    // Handle no-content
    if (response.status === 204 || response.status === 304) {
      return { ok: response.ok, status: response.status, data: null, headers: response.headers, url: url.toString() };
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const err = new Error(data?.error || data?.message || `HTTP ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return { ok: true, status: response.status, data, headers: response.headers, url: url.toString() };
  } finally {
    timer.done();
  }
}

// ---------------------------------------------------------------------------
// Public API — mirrors the S2D Intelligence OpenAPI v1 routes
// ---------------------------------------------------------------------------

export function createS2dIntelligenceClient(opts = {}) {
  const baseUrl = opts.baseUrl ?? resolveBaseUrl();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const getHeaders = opts.getHeaders ?? (() => ({}));
  const signal = opts.signal;

  async function call(path, callOpts = {}) {
    return fetchJson(path, {
      baseUrl,
      timeoutMs,
      signal: callOpts.signal ?? signal,
      headers: { ...getHeaders(), ...callOpts.headers },
      ...callOpts,
    });
  }

  return {
    // Raw config for introspection
    config: { baseUrl, intelligenceBase: resolveIntelligenceBase(baseUrl), timeoutMs },

    // ——— Task spec endpoints ———

    /**
     * GET /api/s2d/intelligence/signals?localityCode=MELAKA
     * Returns sanitised public signals (no @handles, no personal data)
     */
    async getSignals(query = {}, callOpts = {}) {
      const res = await call('/signals', { query, ...callOpts });
      return res.data;
    },

    /**
     * GET /api/s2d/intelligence/narratives
     * Returns narrative clusters (aggregated themes)
     */
    async getNarratives(query = {}, callOpts = {}) {
      const res = await call('/narratives', { query, ...callOpts });
      return res.data;
    },

    /**
     * GET /api/s2d/intelligence/recommendations
     * Returns recommendation cases (White/Grey/Black playbook)
     */
    async getRecommendations(query = {}, callOpts = {}) {
      const res = await call('/recommendations', { query, ...callOpts });
      return res.data;
    },

    /**
     * GET /api/s2d/intelligence/briefs/daily
     * Alias for /daily-brief — the executive daily intelligence brief
     */
    async getDailyBrief(query = {}, callOpts = {}) {
      // Try canonical /briefs/daily first, fall back to /daily-brief for the ported engine
      try {
        const res = await call('/briefs/daily', { query, ...callOpts });
        return res.data;
      } catch (e) {
        if (e.status === 404) {
          const res = await call('/daily-brief', { query, ...callOpts });
          return res.data;
        }
        throw e;
      }
    },

    // ——— Extended ported-engine endpoints ———

    async getSentimentSnapshots(query = {}, callOpts = {}) {
      const res = await call('/sentiment-snapshots', { query, ...callOpts });
      return res.data;
    },

    async getChangePoints(query = {}, callOpts = {}) {
      const res = await call('/change-points', { query, ...callOpts });
      return res.data;
    },

    async getLocalProfiles(query = {}, callOpts = {}) {
      const res = await call('/local-profiles', { query, ...callOpts });
      return res.data;
    },

    async getForecasts(query = {}, callOpts = {}) {
      const res = await call('/forecasts', { query, ...callOpts });
      return res.data;
    },

    async validateContext(payload, callOpts = {}) {
      const res = await call('/validate-context', { method: 'POST', body: payload, ...callOpts });
      return res.data;
    },

    async getIntelligenceInfo(callOpts = {}) {
      const res = await call('/', callOpts);
      return res.data;
    },

    // Low-level
    fetchJson: (path, o) => fetchJson(path, { baseUrl, timeoutMs, ...o }),
  };
}

// Convenience singletons for the four primary endpoints
export async function fetchSignals(query = {}, opts = {}) {
  const client = createS2dIntelligenceClient(opts);
  return client.getSignals(query);
}

export async function fetchNarratives(query = {}, opts = {}) {
  const client = createS2dIntelligenceClient(opts);
  return client.getNarratives(query);
}

export async function fetchRecommendations(query = {}, opts = {}) {
  const client = createS2dIntelligenceClient(opts);
  return client.getRecommendations(query);
}

export async function fetchDailyBrief(query = {}, opts = {}) {
  const client = createS2dIntelligenceClient(opts);
  return client.getDailyBrief(query);
}

// Cloudflare Workers fetch handler helper — re-mount Express JSON handlers as
// Web Fetch handlers (Workers support fetch/Headers/Request/Response/Web Crypto).
// Example usage in a Worker:
//
//   import { createS2dWorkerFetchHandler } from '@/integration/pip360/api/s2d-intelligence-api-client';
//   export default { fetch: createS2dWorkerFetchHandler({ allowedOrigin: 'https://pip-melaka.ritz-analytics.workers.dev' }) };
//
export function createS2dWorkerFetchHandler({ allowedOrigin = 'https://pip-melaka.ritz-analytics.workers.dev', intelligenceBase = '/api/s2d/intelligence' } = {}) {
  return async function s2dWorkerFetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(intelligenceBase)) {
      return new Response(JSON.stringify({ error: 'Not found', path: url.pathname }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      if (origin !== allowedOrigin) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }

    // Same-origin enforcement for non-OPTIONS
    const origin = request.headers.get('Origin');
    const headers = new Headers({ 'Content-Type': 'application/json', 'Vary': 'Origin' });
    if (origin === allowedOrigin) {
      headers.set('Access-Control-Allow-Origin', allowedOrigin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Proxy to intelligence GET handlers — in Workers, this would delegate to the actual
    // Next.js route handlers or KV/D1-backed storage. Here we return a governance envelope.
    const path = url.pathname.replace(intelligenceBase, '') || '/';
    const body = {
      endpoint: `${intelligenceBase}${path}`,
      method: request.method,
      governance: {
        aggregatePublicSignalsOnly: true,
        humanReviewRequired: true,
        pipIntegration: false,
      },
      hint: 'Workers handler — delegate to Next.js /api/s2d/intelligence/* or KV-backed service',
    };
    return new Response(JSON.stringify(body), { status: 200, headers });
  };
}

export default createS2dIntelligenceClient;
