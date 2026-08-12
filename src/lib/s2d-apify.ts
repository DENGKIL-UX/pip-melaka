export const S2D_SCRAPE_PLATFORMS = ["tiktok", "facebook", "instagram", "threads", "x"] as const;
export type S2dScrapePlatform = typeof S2D_SCRAPE_PLATFORMS[number];

export const S2D_APPROVED_RECORD_CAP = 20;
/** Official REST base. Docs: https://docs.apify.com/api/v2 */
const APIFY_BASE = "https://api.apify.com/v2";
type RuntimeEnv = Record<string, string | undefined>;

/** Personal tokens from Console → Settings → API & Integrations start with this prefix. */
export const APIFY_TOKEN_PREFIX = "apify_api_";

/**
 * Resolve the Apify personal API token. Official env name is APIFY_TOKEN
 * (docs.apify.com/api/v2/getting-started). Older PIP copy used APIFY_API_TOKEN.
 */
export function resolveApifyToken(env: RuntimeEnv = process.env): string | undefined {
  const candidates = [env.APIFY_TOKEN, env.APIFY_API_TOKEN];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function isApifyTokenFormat(token: string): boolean {
  const value = token.trim();
  return value.startsWith(APIFY_TOKEN_PREFIX) && value.length >= 20 && /^[A-Za-z0-9_.-]+$/.test(value);
}

/**
 * Actor IDs in REST paths are either the internal id or `username~actor-name`.
 * Slash form (`username/actor-name`) is a store URL, not a path segment.
 * Do not encode `~` — `%7E` 404s on some Apify edge routes.
 */
export function normalizeApifyActorId(actorId: string): string {
  const trimmed = actorId.trim();
  if (!trimmed) return trimmed;
  const slashForm = trimmed.replace(/^https?:\/\/apify\.com\//i, "");
  return slashForm.replace("/", "~");
}

function encodeActorPathSegment(actorId: string): string {
  const normalized = normalizeApifyActorId(actorId);
  return encodeURIComponent(normalized).replace(/%7E/gi, "~");
}

async function readApifyError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: { type?: string; message?: string } };
    const message = body?.error?.message || body?.error?.type;
    if (message) return `Apify HTTP ${response.status}: ${message}`;
  } catch {
    // ignore non-JSON error bodies
  }
  if (response.status === 401) return "Apify rejected the token (HTTP 401). Create a new token in Console → Settings → API & Integrations.";
  if (response.status === 403) return "Apify denied access (HTTP 403). Token may lack permission or the Actor is private.";
  if (response.status === 402) return "Apify billing/usage limit reached (HTTP 402).";
  return `Apify actor request failed (HTTP ${response.status})`;
}

export interface S2dApifyPlan {
  platform: S2dScrapePlatform;
  actorId: string;
  actorInput: Record<string, unknown>;
  requestedMaximum: number;
}

export interface S2dApifyRunResult {
  platform: S2dScrapePlatform;
  actorId: string;
  items: unknown[];
  requestedMaximum: number;
  providerReturned: number;
  retained: number;
  excessDiscarded: number;
}

function uniqueTerms(keywords: string[], query = ""): string[] {
  const queryTerms = query.split(",").map((term) => term.trim()).filter(Boolean);
  return [...new Set([...keywords.map((term) => term.trim()), ...queryTerms].filter(Boolean))].slice(0, 20);
}

function oldestDate(dateFilter: string | undefined): string | undefined {
  const days = dateFilter === "Last 24h" ? 1
    : dateFilter === "Last Week" ? 7
      : dateFilter === "Last Month" ? 30
        : dateFilter === "Last 3 Months" ? 90
          : 0;
  return days ? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) : undefined;
}

function configuredFacebookPages(env: RuntimeEnv): string[] {
  return (env.S2D_FACEBOOK_SOURCE_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        return parsed.protocol === "https:" && (host === "facebook.com" || host.endsWith(".facebook.com"));
      } catch {
        return false;
      }
    });
}

function resolveActor(platform: S2dScrapePlatform, env: RuntimeEnv): string {
  const raw = platform === "tiktok" ? (env.S2D_APIFY_ACTOR_TIKTOK || "clockworks~tiktok-scraper")
    : platform === "instagram" ? (env.S2D_APIFY_ACTOR_INSTAGRAM || "apify~instagram-scraper")
    : platform === "facebook" ? (env.S2D_APIFY_ACTOR_FACEBOOK || "apify~facebook-posts-scraper")
    : platform === "x" ? (env.S2D_APIFY_ACTOR_X || env.APIFY_X_ACTOR || "apidojo~tweet-scraper")
    : (env.S2D_APIFY_ACTOR_THREADS || env.APIFY_THREADS_ACTOR || "");
  return raw ? normalizeApifyActorId(raw) : "";
}

export function buildS2dApifyPlan(params: {
  platform: S2dScrapePlatform;
  keywords?: string[];
  query?: string;
  limit?: number;
  dateFilter?: string;
  scanType?: string;
  proxy?: boolean;
  env?: RuntimeEnv;
}): S2dApifyPlan {
  const env = params.env ?? process.env;
  const platform = params.platform;
  const actorId = resolveActor(platform, env);
  if (!actorId) throw Object.assign(new Error(`No approved Apify actor configured for ${platform}`), { code: "S2D_ACTOR_NOT_CONFIGURED" });

  const requestedMaximum = Math.min(S2D_APPROVED_RECORD_CAP, Math.max(1, Math.trunc(params.limit ?? 10)));
  const terms = uniqueTerms(params.keywords ?? [], params.query).length
    ? uniqueTerms(params.keywords ?? [], params.query)
    : ["Melaka"];
  const from = oldestDate(params.dateFilter);
  const useResidential = params.proxy === true && env.S2D_APIFY_RESIDENTIAL_PROXY_ENABLED === "true";
  const proxyConfiguration = useResidential
    ? { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"], apifyProxyCountry: "MY" }
    : { useApifyProxy: true };

  let actorInput: Record<string, unknown>;
  if (platform === "tiktok") {
    actorInput = {
      resultsPerPage: requestedMaximum,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      proxyConfiguration,
      ...(from ? { oldestPostDateUnified: from } : {}),
    };
    if (params.scanType === "Hashtag") actorInput.hashtags = terms.map((term) => term.replace(/^#/, ""));
    else if (params.scanType === "Profile / Page") actorInput.profiles = terms;
    else if (params.scanType === "Post URL") actorInput.postURLs = terms;
    else actorInput.searchQueries = terms;
  } else if (platform === "instagram") {
    // apify/instagram-scraper: proxyConfiguration (not `proxy`) per Actor README.
    actorInput = params.scanType === "Post URL"
      ? { directUrls: terms, resultsType: "posts", resultsLimit: requestedMaximum, proxyConfiguration }
      : {
          search: terms[0]?.replace(/^#/, "") || "Melaka",
          searchType: params.scanType === "Profile / Page" ? "user" : "hashtag",
          resultsType: "posts",
          resultsLimit: requestedMaximum,
          proxyConfiguration,
        };
  } else if (platform === "facebook") {
    const sourcePages = configuredFacebookPages(env);
    if (!sourcePages.length) {
      throw Object.assign(new Error("No curated Melaka Facebook sources configured in S2D_FACEBOOK_SOURCE_URLS"), { code: "S2D_FACEBOOK_SOURCES_REQUIRED" });
    }
    actorInput = {
      startUrls: sourcePages.map((url) => ({ url })),
      resultsLimit: requestedMaximum,
      proxyConfiguration,
    };
  } else if (platform === "threads") {
    actorInput = {
      mode: "search",
      searchQueries: terms,
      maxPosts: requestedMaximum,
      ...(from ? { postedAfter: `${from}T00:00:00.000Z` } : {}),
    };
  } else {
    actorInput = {
      searchQueries: terms,
      maxItems: requestedMaximum,
      ...(from ? { startDate: `${from}T00:00:00.000Z` } : {}),
    };
  }

  return { platform, actorId, actorInput, requestedMaximum };
}

export async function runS2dApifyPlan(
  plan: S2dApifyPlan,
  token: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<S2dApifyRunResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const providerTimeoutSeconds = Math.max(5, Math.min(300, Math.floor(timeoutMs / 1000) - 2));
  const actorSegment = encodeActorPathSegment(plan.actorId);
  // Official path: POST /v2/actors/:actorId/run-sync-get-dataset-items
  // Auth: Authorization: Bearer <APIFY_TOKEN> — never ?token= (leaks in logs).
  const url = `${APIFY_BASE}/actors/${actorSegment}/run-sync-get-dataset-items?clean=true&limit=${plan.requestedMaximum}&maxItems=${plan.requestedMaximum}&timeout=${providerTimeoutSeconds}`;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(plan.actorInput),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await readApifyError(response);
      const status = response.status;
      const code = status === 401 || status === 403 ? "S2D_APIFY_TOKEN_REJECTED" : "S2D_APIFY_PROVIDER_ERROR";
      throw Object.assign(new Error(detail || `Apify actor request failed (HTTP ${status})`), { code, status });
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) throw Object.assign(new Error("Apify actor returned an invalid dataset payload"), { code: "S2D_APIFY_PROVIDER_ERROR" });
    const cleanItems = payload.filter((item) => item && typeof item === "object" && !(item as Record<string, unknown>).error);
    const items = cleanItems.slice(0, plan.requestedMaximum);
    return {
      platform: plan.platform,
      actorId: plan.actorId,
      items,
      requestedMaximum: plan.requestedMaximum,
      providerReturned: cleanItems.length,
      retained: items.length,
      excessDiscarded: Math.max(0, cleanItems.length - items.length),
    };
  } finally {
    clearTimeout(timer);
  }
}
