export const S2D_SCRAPE_PLATFORMS = ["tiktok", "facebook", "instagram", "threads", "x"] as const;
export type S2dScrapePlatform = typeof S2D_SCRAPE_PLATFORMS[number];

export const S2D_APPROVED_RECORD_CAP = 20;
const APIFY_BASE = "https://api.apify.com/v2";

type RuntimeEnv = Record<string, string | undefined>;

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
  if (platform === "tiktok") return env.S2D_APIFY_ACTOR_TIKTOK || "clockworks~tiktok-scraper";
  if (platform === "instagram") return env.S2D_APIFY_ACTOR_INSTAGRAM || "apify~instagram-scraper";
  if (platform === "facebook") return env.S2D_APIFY_ACTOR_FACEBOOK || "apify~facebook-posts-scraper";
  if (platform === "x") return env.S2D_APIFY_ACTOR_X || env.APIFY_X_ACTOR || "apidojo~tweet-scraper";
  return env.S2D_APIFY_ACTOR_THREADS || env.APIFY_THREADS_ACTOR || "";
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
    actorInput = params.scanType === "Post URL"
      ? { directUrls: terms, resultsLimit: requestedMaximum, proxy: proxyConfiguration }
      : {
          search: terms[0]?.replace(/^#/, "") || "Melaka",
          searchType: params.scanType === "Profile / Page" ? "user" : "hashtag",
          resultsType: "posts",
          resultsLimit: requestedMaximum,
          proxy: proxyConfiguration,
        };
  } else if (platform === "facebook") {
    const sourcePages = configuredFacebookPages(env);
    if (!sourcePages.length) {
      throw Object.assign(new Error("No curated Melaka Facebook sources configured in S2D_FACEBOOK_SOURCE_URLS"), { code: "S2D_FACEBOOK_SOURCES_REQUIRED" });
    }
    actorInput = {
      startUrls: sourcePages.map((url) => ({ url })),
      resultsLimit: requestedMaximum,
      proxy: proxyConfiguration,
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
  const providerTimeoutSeconds = Math.max(5, Math.min(55, Math.floor(timeoutMs / 1000) - 2));
  const url = `${APIFY_BASE}/acts/${encodeURIComponent(plan.actorId)}/run-sync-get-dataset-items?clean=true&limit=${plan.requestedMaximum}&timeout=${providerTimeoutSeconds}`;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(plan.actorInput),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw Object.assign(new Error(`Apify actor request failed (HTTP ${response.status})`), { code: "S2D_APIFY_PROVIDER_ERROR" });

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
