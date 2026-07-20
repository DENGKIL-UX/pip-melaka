/**
 * S2D Daily Sentiment Snapshot engine — ported from the S2D-360 Intelligence Engine.
 *
 * Calculates daily sentiment metrics from accepted public signals across
 * multiple geographic dimensions (State, Parliament, DUN, DM, Locality).
 *
 * Source: s2d-engine/src/intelligence/snapshots/s2d-daily-sentiment-snapshot.js
 * Ported to TypeScript for PIP-MLK's Next.js runtime.
 */

export const DAILY_SNAPSHOT_DIMENSIONS = Object.freeze([
  "STATE", "PARLIAMENT", "DUN", "DM", "LOCALITY",
  "POLITICAL_ENTITY", "ISSUE", "PLATFORM", "SOURCE_TYPE", "LANGUAGE",
]) as const;

export type SnapshotDimension = typeof DAILY_SNAPSHOT_DIMENSIONS[number];

const REQUIRED_METRICS = Object.freeze([
  "totalRecords", "acceptedEvidenceCount", "uniqueSourceCount",
  "positiveShare", "neutralShare", "negativeShare", "netSentiment",
  "conversationShare", "engagement", "velocity", "persistence",
  "crossPlatformSpread", "evidenceConfidence",
]);

function str(value: unknown, max = 220): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toDateToken(value: unknown): string {
  const token = str(value, 30).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(token) ? token : "";
}

function round(value: number, precision = 2): number | null {
  if (!Number.isFinite(Number(value))) return null;
  const power = 10 ** precision;
  return Math.round(Number(value) * power) / power;
}

function asPositiveNeutralNegative(label: unknown): "Positive" | "Negative" | "Neutral" | "" {
  const upper = str(label, 60).toUpperCase();
  if (upper === "POSITIVE") return "Positive";
  if (upper === "NEGATIVE") return "Negative";
  if (upper === "NEUTRAL") return "Neutral";
  return "";
}

interface SignalRecord {
  snapshotId?: string;
  canonicalSourceHash?: string;
  sourceRecordId?: string;
  locality?: {
    stateCode?: string;
    parliamentCode?: string;
    dunCode?: string;
    dmCode?: string;
    localityCode?: string;
    localityName?: string;
  };
  politicalEntity?: string;
  issue?: string;
  platform?: string;
  sourceType?: string;
  language?: string;
  sentimentLabel?: string;
  positiveShare?: number;
  neutralShare?: number;
  negativeShare?: number;
  engagementScore?: number;
  velocityScore?: number;
  persistenceScore?: number;
  crossPlatformSpread?: number;
  evidenceConfidence?: number;
  acceptedEvidence?: boolean;
  publicSource?: boolean;
  provenanceValid?: boolean;
  provenanceStatus?: string;
  humanReviewed?: boolean;
  reviewStatus?: string;
  snapshotDate?: string;
  sourcePublishedAt?: string;
  createdAt?: string;
  capturedAt?: string;
  timestamp?: string;
}

function extractDimensionValue(record: SignalRecord, dimensionType: string): string {
  const loc = record.locality || {};
  switch (dimensionType) {
    case "STATE": return str(loc.stateCode, 120) || "UNRESOLVED";
    case "PARLIAMENT": return str(loc.parliamentCode, 120) || "UNRESOLVED";
    case "DUN": return str(loc.dunCode, 120) || "UNRESOLVED";
    case "DM": return str(loc.dmCode, 120) || "UNRESOLVED";
    case "LOCALITY": return str(loc.localityCode, 120) || str(loc.localityName, 180) || "UNRESOLVED";
    case "POLITICAL_ENTITY": return str(record.politicalEntity, 220) || "UNRESOLVED";
    case "ISSUE": return str(record.issue, 220) || "UNRESOLVED";
    case "PLATFORM": return str(record.platform, 120) || "UNRESOLVED";
    case "SOURCE_TYPE": return str(record.sourceType, 120) || "UNRESOLVED";
    case "LANGUAGE": return str(record.language, 120) || "UNKNOWN";
    default: return "UNRESOLVED";
  }
}

export interface DailySnapshotMetrics {
  totalRecords: number;
  acceptedEvidenceCount: number;
  uniqueSourceCount: number;
  positiveShare: number;
  neutralShare: number;
  negativeShare: number;
  netSentiment: number;
  conversationShare: number;
  engagement: number;
  velocity: number;
  persistence: number;
  crossPlatformSpread: number;
  evidenceConfidence: number;
}

export interface DailySnapshotResult {
  schema: string;
  snapshotDate: string;
  generatedAt: string;
  dimension: string;
  dimensionValue: string;
  metrics: DailySnapshotMetrics;
  recordCount: number;
}

export function calculateDailySnapshotMetrics(params: {
  records: SignalRecord[];
  totalEligibleForDate?: number;
  previousDayTotalRecords?: number | null;
}): DailySnapshotMetrics {
  const { records = [], totalEligibleForDate = 0, previousDayTotalRecords = null } = params;

  const acceptedRecords = records.filter((r) =>
    r.acceptedEvidence === true &&
    r.publicSource !== false &&
    (r.provenanceValid === true || r.provenanceStatus === "VERIFIED") &&
    (r.humanReviewed === true || r.reviewStatus === "HUMAN_REVIEWED" || r.reviewStatus === "ADJUDICATED")
  );

  const total = acceptedRecords.length;
  if (total === 0) {
    return {
      totalRecords: totalEligibleForDate,
      acceptedEvidenceCount: 0,
      uniqueSourceCount: 0,
      positiveShare: 0,
      neutralShare: 0,
      negativeShare: 0,
      netSentiment: 0,
      conversationShare: 0,
      engagement: 0,
      velocity: 0,
      persistence: 0,
      crossPlatformSpread: 0,
      evidenceConfidence: 0,
    };
  }

  const uniqueSources = new Set<string>();
  let positive = 0, neutral = 0, negative = 0;
  let totalEngagement = 0, totalVelocity = 0, totalPersistence = 0;
  let totalCrossPlatform = 0, totalConfidence = 0;

  for (const rec of acceptedRecords) {
    const sourceKey = str(rec.snapshotId, 220) || str(rec.canonicalSourceHash, 220) || str(rec.sourceRecordId, 220);
    if (sourceKey) uniqueSources.add(sourceKey);

    const label = asPositiveNeutralNegative(rec.sentimentLabel);
    if (label === "Positive") positive++;
    else if (label === "Negative") negative++;
    else neutral++;

    totalEngagement += Number(rec.engagementScore) || 0;
    totalVelocity += Number(rec.velocityScore) || 0;
    totalPersistence += Number(rec.persistenceScore) || 0;
    totalCrossPlatform += Number(rec.crossPlatformSpread) || 0;
    totalConfidence += Number(rec.evidenceConfidence) || 0;
  }

  const positiveShare = round(positive / total, 4) || 0;
  const negativeShare = round(negative / total, 4) || 0;
  const neutralShare = round(neutral / total, 4) || 0;
  const netSentiment = round(positiveShare - negativeShare, 4) || 0;

  const velocity = previousDayTotalRecords != null && previousDayTotalRecords > 0
    ? round(((total - previousDayTotalRecords) / previousDayTotalRecords) * 100, 2) || 0
    : 0;

  return {
    totalRecords: totalEligibleForDate || total,
    acceptedEvidenceCount: total,
    uniqueSourceCount: uniqueSources.size,
    positiveShare,
    neutralShare,
    negativeShare,
    netSentiment,
    conversationShare: round(total / Math.max(totalEligibleForDate, total), 4) || 0,
    engagement: round(totalEngagement / total, 2) || 0,
    velocity,
    persistence: round(totalPersistence / total, 2) || 0,
    crossPlatformSpread: round(totalCrossPlatform / total, 2) || 0,
    evidenceConfidence: round(totalConfidence / total, 4) || 0,
  };
}

export function buildDailySentimentSnapshot(params: {
  reportDate: string;
  records: SignalRecord[];
  totalEligibleForDate?: number;
  previousDayTotalRecords?: number | null;
  dimensions?: readonly SnapshotDimension[];
}): DailySnapshotResult[] {
  const {
    reportDate,
    records,
    totalEligibleForDate = 0,
    previousDayTotalRecords = null,
    dimensions = DAILY_SNAPSHOT_DIMENSIONS,
  } = params;

  const results: DailySnapshotResult[] = [];

  for (const dim of dimensions) {
    const groups: Record<string, SignalRecord[]> = {};
    for (const rec of records) {
      const dimValue = extractDimensionValue(rec, dim);
      if (!groups[dimValue]) groups[dimValue] = [];
      groups[dimValue].push(rec);
    }

    for (const [dimValue, groupRecords] of Object.entries(groups)) {
      const metrics = calculateDailySnapshotMetrics({
        records: groupRecords,
        totalEligibleForDate,
        previousDayTotalRecords,
      });

      results.push({
        schema: "s2d.daily-sentiment-snapshot.v1",
        snapshotDate: reportDate,
        generatedAt: new Date().toISOString(),
        dimension: dim,
        dimensionValue: dimValue,
        metrics,
        recordCount: groupRecords.length,
      });
    }
  }

  return results;
}
