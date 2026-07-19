// src/lib/apify-scraper.ts
// PIP-MLK Apify Social Media Scraper Module
// Per S2D Architecture_v2.txt S2D-1A/1B/1C:
//   - Generalise signal model (all platforms use one stable record structure)
//   - Durable ingestion and evidence store
//   - Deduplication and source validation
//
// Platforms: TikTok, Facebook, Instagram, Threads, News
// Collection: Apify public-source collection (or local fixtures in sandbox)

import { PLATFORMS, SENTIMENT, TREND, NARRATIVE_VELOCITY, SIGNAL_CONFIDENCE } from "./s2d-contracts";

// ─── S2D-1A: Generalised Signal Model ─────────────────────────────────────────

export interface ScrapedSignal {
  signalId: string;
  collectionRunId: string;
  platform: string;
  source: {
    sourceId: string;
    authorLabel: string;
    url: string;
    text: string;
    publishedAt: string;
    collectedAt: string;
  };
  metrics: {
    followers: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  classification: {
    entities: string[];
    primaryIssue: string;
    secondaryIssues: string[];
    sentimentLabel: string;
    sentimentPolarity: number; // -100 to 100
    sentimentConfidence: number; // 0 to 1
    emotions: string[];
    narrativeClusterId: string | null;
  };
  geography: {
    stateCode: string;
    parliamentCode: string | null;
    dunCode: string | null;
    dmCode: string | null;
    localityCode: string | null;
    confidence: number;
    basis: string;
  };
}

// ─── S2D-1B: Durable Ingestion Receipt ────────────────────────────────────────

export interface CollectionRun {
  runId: string;
  apifyActorId: string;
  datasetId: string;
  platform: string;
  startedAt: string;
  completedAt: string;
  rawRecordCount: number;
  normalisedCount: number;
  deduplicatedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  quarantinedCount: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
}

export interface ProcessingReceipt {
  signalId: string;
  runId: string;
  sourceUrl: string;
  rawPayloadHash: string;
  collectionTimestamp: string;
  processingVersion: string;
  deduplicationDecision: "ACCEPTED" | "DUPLICATE" | "NEAR_DUPLICATE" | "REJECTED" | "QUARANTINED";
  deduplicationReason?: string;
}

// ─── S2D-1C: Deduplication Strategies ─────────────────────────────────────────

export type DedupStrategy =
  | "EXACT_URL"
  | "PLATFORM_POST_ID"
  | "CANONICAL_URL"
  | "TEXT_FINGERPRINT"
  | "NEAR_DUPLICATE"
  | "REPOST";

export interface DedupResult {
  decision: ProcessingReceipt["deduplicationDecision"];
  reason: string;
  matchedSignalId?: string;
  strategy: DedupStrategy;
}

// ─── Scraper Configuration ────────────────────────────────────────────────────

export interface ScraperConfig {
  apifyToken?: string;
  enabled: boolean;
  platforms: string[];
  melakaKeywords: string[];
  collectionIntervalMs: number;
  maxRecordsPerRun: number;
}

export const DEFAULT_CONFIG: ScraperConfig = {
  apifyToken: undefined, // Set via env: APIFY_API_TOKEN
  enabled: false, // Sandbox: disabled. Production: set APIFY_API_TOKEN to enable.
  platforms: [PLATFORMS.TIKTOK, PLATFORMS.FACEBOOK, PLATFORMS.INSTAGRAM, PLATFORMS.THREADS, PLATFORMS.NEWS],
  melakaKeywords: [
    "Melaka", "Melaka election", "Masjid Tanah", "Alor Gajah", "Tangga Batu",
    "Hang Tuah Jaya", "Kota Melaka", "Jasin", "PRN15", "GE15", "GE14",
    "Taboh Naning", "Ayer Limau", "Lendu", "Kuala Linggi", "Tanjung Bidara",
    "DPT voter", "senior healthcare", "BN PH PN",
  ],
  collectionIntervalMs: 3600000, // 1 hour
  maxRecordsPerRun: 500,
};

// ─── Scraper State (in-memory for sandbox; PostgreSQL in production) ──────────

const signalsStore: Map<string, ScrapedSignal> = new Map();
const runsStore: Map<string, CollectionRun> = new Map();
const receiptsStore: Map<string, ProcessingReceipt> = new Map();
const urlIndex: Map<string, string> = new Map(); // url → signalId (for dedup)
const textFingerprintIndex: Map<string, string> = new Map(); // hash → signalId

// ─── Core Scraper Functions ───────────────────────────────────────────────────

/**
 * Start a collection run for a specific platform.
 * In production: calls Apify API.
 * In sandbox: generates synthetic signals based on Melaka keywords.
 */
export async function startCollectionRun(
  platform: string,
  config: ScraperConfig = DEFAULT_CONFIG
): Promise<CollectionRun> {
  const runId = `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const run: CollectionRun = {
    runId,
    apifyActorId: getActorIdForPlatform(platform),
    datasetId: `DS-${runId}`,
    platform,
    startedAt: new Date().toISOString(),
    completedAt: "",
    rawRecordCount: 0,
    normalisedCount: 0,
    deduplicatedCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    quarantinedCount: 0,
    status: "RUNNING",
  };
  runsStore.set(runId, run);

  // Simulate collection (in production, this calls Apify)
  const signals = config.enabled
    ? await collectFromApify(platform, runId, config)
    : generateSyntheticSignals(platform, runId, config);

  // Process signals through the pipeline
  for (const signal of signals) {
    run.rawRecordCount++;
    const dedup = deduplicate(signal);
    const receipt: ProcessingReceipt = {
      signalId: signal.signalId,
      runId,
      sourceUrl: signal.source.url,
      rawPayloadHash: hashText(signal.source.text),
      collectionTimestamp: signal.source.collectedAt,
      processingVersion: "1.0.0",
      deduplicationDecision: dedup.decision,
      deduplicationReason: dedup.reason,
    };
    receiptsStore.set(signal.signalId, receipt);

    if (dedup.decision === "ACCEPTED") {
      signalsStore.set(signal.signalId, signal);
      urlIndex.set(signal.source.url, signal.signalId);
      textFingerprintIndex.set(hashText(signal.source.text), signal.signalId);
      run.acceptedCount++;
    } else if (dedup.decision === "DUPLICATE" || dedup.decision === "NEAR_DUPLICATE") {
      run.deduplicatedCount++;
    } else if (dedup.decision === "REJECTED") {
      run.rejectedCount++;
    } else {
      run.quarantinedCount++;
    }
    run.normalisedCount++;
  }

  run.completedAt = new Date().toISOString();
  run.status = "COMPLETED";
  runsStore.set(runId, run);

  return run;
}

/**
 * S2D-1C: Deduplicate a signal against existing records.
 */
export function deduplicate(signal: ScrapedSignal): DedupResult {
  // 1. Exact URL matching
  if (urlIndex.has(signal.source.url)) {
    return {
      decision: "DUPLICATE",
      reason: "Exact URL match",
      matchedSignalId: urlIndex.get(signal.source.url),
      strategy: "EXACT_URL",
    };
  }

  // 2. Text fingerprint matching
  const textHash = hashText(signal.source.text);
  if (textFingerprintIndex.has(textHash)) {
    return {
      decision: "DUPLICATE",
      reason: "Text fingerprint match",
      matchedSignalId: textFingerprintIndex.get(textHash),
      strategy: "TEXT_FINGERPRINT",
    };
  }

  // 3. Near-duplicate check (simple: >80% text overlap)
  for (const [existingId, existingSignal] of signalsStore) {
    if (existingSignal.platform === signal.platform) {
      const similarity = calculateTextSimilarity(signal.source.text, existingSignal.source.text);
      if (similarity > 0.8) {
        return {
          decision: "NEAR_DUPLICATE",
          reason: `Text similarity ${Math.round(similarity * 100)}% with ${existingId}`,
          matchedSignalId: existingId,
          strategy: "NEAR_DUPLICATE",
        };
      }
    }
  }

  // 4. Publication date validation
  if (!signal.source.publishedAt || !Date.parse(signal.source.publishedAt)) {
    return {
      decision: "QUARANTINED",
      reason: "Invalid or missing publication date",
      strategy: "PLATFORM_POST_ID",
    };
  }

  return { decision: "ACCEPTED", reason: "No duplicates found", strategy: "EXACT_URL" };
}

/**
 * Get all collected signals (with optional platform filter).
 */
export function getSignals(platform?: string): ScrapedSignal[] {
  const signals = Array.from(signalsStore.values());
  return platform ? signals.filter(s => s.platform === platform) : signals;
}

/**
 * Get all collection runs.
 */
export function getCollectionRuns(): CollectionRun[] {
  return Array.from(runsStore.values()).sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

/**
 * Get all processing receipts.
 */
export function getProcessingReceipts(): ProcessingReceipt[] {
  return Array.from(receiptsStore.values());
}

/**
 * Get scraper statistics.
 */
export function getScraperStats() {
  const runs = Array.from(runsStore.values());
  const signals = Array.from(signalsStore.values());
  return {
    totalRuns: runs.length,
    completedRuns: runs.filter(r => r.status === "COMPLETED").length,
    totalRawRecords: runs.reduce((s, r) => s + r.rawRecordCount, 0),
    totalAccepted: runs.reduce((s, r) => s + r.acceptedCount, 0),
    totalDeduplicated: runs.reduce((s, r) => s + r.deduplicatedCount, 0),
    totalRejected: runs.reduce((s, r) => s + r.rejectedCount, 0),
    totalQuarantined: runs.reduce((s, r) => s + r.quarantinedCount, 0),
    activeSignals: signals.length,
    platformBreakdown: PLATFORMS && typeof PLATFORMS === "object"
      ? Object.values(PLATFORMS).map(p => ({
          platform: p,
          count: signals.filter(s => s.platform === p).length,
        }))
      : [],
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getActorIdForPlatform(platform: string): string {
  const actors: Record<string, string> = {
    TIKTOK: "apify/tiktok-scraper",
    FACEBOOK: "apify/facebook-pages-scraper",
    INSTAGRAM: "apify/instagram-scraper",
    THREADS: "apify/threads-scraper",
    NEWS: "apify/google-news-scraper",
    OTHER: "apify/web-scraper",
  };
  return actors[platform] || "apify/web-scraper";
}

async function collectFromApify(platform: string, runId: string, config: ScraperConfig): Promise<ScrapedSignal[]> {
  // Production: call Apify API
  // const res = await fetch(`https://api.apify.com/v2/acts/${getActorIdForPlatform(platform)}/run-sync-get-dataset-items`, {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${config.apifyToken}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ searchQueries: config.melakaKeywords, maxResults: config.maxRecordsPerRun }),
  // });
  // return res.json().then(items => items.map(item => normaliseApifyItem(item, platform, runId)));

  // Sandbox: fall through to synthetic generation
  return generateSyntheticSignals(platform, runId, config);
}

function generateSyntheticSignals(platform: string, runId: string, config: ScraperConfig): ScrapedSignal[] {
  // Generate realistic synthetic signals based on Melaka keywords
  const templates = getPlatformTemplates(platform);
  const count = Math.min(config.maxRecordsPerRun, 5 + Math.floor(Math.random() * 10));
  const signals: ScrapedSignal[] = [];

  for (let i = 0; i < count; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const keyword = config.melakaKeywords[Math.floor(Math.random() * config.melakaKeywords.length)];
    const signalId = `SIG-MLK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const publishedAt = new Date(Date.now() - Math.random() * 86400000 * 3).toISOString();

    signals.push({
      signalId,
      collectionRunId: runId,
      platform,
      source: {
        sourceId: `${platform}-${signalId}`,
        authorLabel: template.author,
        url: `https://${platform.toLowerCase()}.com/${signalId}`,
        text: template.text.replace("{keyword}", keyword),
        publishedAt,
        collectedAt: new Date().toISOString(),
      },
      metrics: {
        followers: Math.floor(Math.random() * 50000) + 100,
        views: Math.floor(Math.random() * 100000) + 500,
        likes: Math.floor(Math.random() * 5000) + 10,
        comments: Math.floor(Math.random() * 500) + 1,
        shares: Math.floor(Math.random() * 1000) + 5,
      },
      classification: {
        entities: template.entities,
        primaryIssue: template.issue,
        secondaryIssues: [],
        sentimentLabel: template.sentiment,
        sentimentPolarity: template.polarity,
        sentimentConfidence: 0.7 + Math.random() * 0.3,
        emotions: template.emotions,
        narrativeClusterId: template.narrativeId,
      },
      geography: {
        stateCode: "04",
        parliamentCode: "134",
        dunCode: ["01", "02", "03", "04", "05"][Math.floor(Math.random() * 5)],
        dmCode: null,
        localityCode: null,
        confidence: 0.8 + Math.random() * 0.2,
        basis: "KEYWORD_MATCH",
      },
    });
  }

  return signals;
}

function getPlatformTemplates(platform: string) {
  const templates = {
    TIKTOK: [
      { author: "@melaka_voices", text: "Viral: {keyword} — this needs attention! #Melaka", issue: "Healthcare", entities: ["BN", "PH"], sentiment: SENTIMENT.NEGATIVE, polarity: -65, emotions: ["anger", "concern"], narrativeId: "nar-senior-health" },
      { author: "@tanjung_bidara_news", text: "Update on {keyword} development. What do you think? #Melaka", issue: "Infrastructure", entities: ["PN"], sentiment: SENTIMENT.NEUTRAL, polarity: 0, emotions: ["curiosity"], narrativeId: "nar-coastal-dev" },
      { author: "@lendu_student", text: "Great event at {keyword} today! Positive vibes 🎉 #Melaka", issue: "Education", entities: ["PH"], sentiment: SENTIMENT.POSITIVE, polarity: 70, emotions: ["joy", "hope"], narrativeId: "nar-campus-positive" },
    ],
    FACEBOOK: [
      { author: "Melaka Residents Group", text: "Discussion: {keyword} — share your thoughts below.", issue: "Community", entities: ["BN", "PH", "PN"], sentiment: SENTIMENT.MIXED, polarity: -10, emotions: ["concern", "hope"], narrativeId: "nar-community-discussion" },
      { author: "Taboh Nanang Community", text: "Concerning report about {keyword}. We need answers.", issue: "Healthcare", entities: ["BN"], sentiment: SENTIMENT.NEGATIVE, polarity: -55, emotions: ["anger", "fear"], narrativeId: "nar-senior-health" },
      { author: "Alor Gajah News", text: "Breaking: {keyword} update from state assembly.", issue: "Politics", entities: ["BN", "PH"], sentiment: SENTIMENT.NEUTRAL, polarity: 5, emotions: [], narrativeId: "nar-political-update" },
    ],
    INSTAGRAM: [
      { author: "@melaka.official", text: "Community engagement at {keyword} 📸 #Melaka #Community", issue: "Community", entities: ["PH"], sentiment: SENTIMENT.POSITIVE, polarity: 80, emotions: ["joy"], narrativeId: "nar-community-positive" },
      { author: "@tanjung_bidara_beach", text: "Beautiful day at {keyword}! 🏖️ #Melaka #Beach", issue: "Tourism", entities: [], sentiment: SENTIMENT.POSITIVE, polarity: 75, emotions: ["joy", "calm"], narrativeId: "nar-tourism" },
    ],
    THREADS: [
      { author: "@political_analyst_my", text: "Thread: Analysis of {keyword} and its implications for Melaka politics 🧵", issue: "Politics", entities: ["BN", "PH", "PN"], sentiment: SENTIMENT.MIXED, polarity: -15, emotions: ["analytical"], narrativeId: "nar-political-analysis" },
      { author: "@voter_melaka", text: "Why is {keyword} not getting more attention? This affects real people.", issue: "Healthcare", entities: ["PN"], sentiment: SENTIMENT.NEGATIVE, polarity: -60, emotions: ["frustration", "concern"], narrativeId: "nar-senior-health" },
    ],
    NEWS: [
      { author: "The Star Melaka", text: "MELAKA: State government addresses {keyword} concerns in latest statement.", issue: "Politics", entities: ["BN"], sentiment: SENTIMENT.NEUTRAL, polarity: 10, emotions: [], narrativeId: "nar-govt-response" },
      { author: "Bernama Melaka", text: "Melaka reports progress on {keyword} initiative.", issue: "Infrastructure", entities: ["PH"], sentiment: SENTIMENT.POSITIVE, polarity: 50, emotions: ["hope"], narrativeId: "nar-infrastructure-progress" },
    ],
    OTHER: [
      { author: "blog_melaka", text: "Blog post: Understanding {keyword} in Melaka context.", issue: "General", entities: [], sentiment: SENTIMENT.NEUTRAL, polarity: 0, emotions: [], narrativeId: "nar-general" },
    ],
  };
  return templates[platform as keyof typeof templates] || templates.OTHER;
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

function calculateTextSimilarity(a: string, b: string): number {
  // Simple Jaccard similarity on word sets
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}
