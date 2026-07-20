/**
 * S2D Local Signal Profile — ported from the S2D-360 Intelligence Engine.
 *
 * Builds locality-level signal profiles from accepted public records.
 * Aggregates by DUN/parliament/locality to show signal density,
 * top narratives, and sentiment distribution per area.
 *
 * Source: s2d-engine/src/intelligence/locality/s2d-local-signal-profile.js
 * Ported to TypeScript for PIP-MLK's Next.js runtime.
 */

export interface LocalSignalRecord {
  locality?: {
    localityName?: string;
    localityCode?: string;
    dunCode?: string;
    dunName?: string;
    parliamentCode?: string;
    parliamentName?: string;
    stateCode?: string;
  };
  narrativeCluster?: string;
  sentimentLabel?: string;
  platform?: string;
  issue?: string;
  acceptedEvidence?: boolean;
  publicSource?: boolean;
  humanReviewed?: boolean;
  reviewStatus?: string;
}

export interface LocalSignalProfile {
  locality: string;
  dunCode: string;
  parliamentCode: string;
  totalSignals: number;
  acceptedSignals: number;
  topNarratives: Array<{ narrative: string; count: number }>;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  platformBreakdown: Array<{ platform: string; count: number }>;
  topIssues: Array<{ issue: string; count: number }>;
  signalDensity: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

function str(value: unknown, max = 220): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function buildLocalSignalProfiles(records: LocalSignalRecord[]): LocalSignalProfile[] {
  const groups: Record<string, LocalSignalRecord[]> = {};

  for (const rec of records) {
    const loc = rec.locality || {};
    const key = str(loc.dunCode || loc.parliamentCode || loc.localityCode || loc.localityName, 120);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(rec);
  }

  return Object.entries(groups).map(([key, groupRecords]) => {
    const first = groupRecords[0];
    const loc = first?.locality || {};

    const acceptedRecords = groupRecords.filter((r) =>
      r.acceptedEvidence === true &&
      r.publicSource !== false &&
      (r.humanReviewed === true || r.reviewStatus === "HUMAN_REVIEWED" || r.reviewStatus === "ADJUDICATED")
    );

    // Top narratives
    const narrativeCounts: Record<string, number> = {};
    for (const rec of acceptedRecords) {
      const narrative = str(rec.narrativeCluster, 220);
      if (narrative) narrativeCounts[narrative] = (narrativeCounts[narrative] || 0) + 1;
    }
    const topNarratives = Object.entries(narrativeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([narrative, count]) => ({ narrative, count }));

    // Sentiment distribution
    let positive = 0, neutral = 0, negative = 0;
    for (const rec of acceptedRecords) {
      const label = str(rec.sentimentLabel, 60).toUpperCase();
      if (label === "POSITIVE") positive++;
      else if (label === "NEGATIVE") negative++;
      else neutral++;
    }
    const total = acceptedRecords.length || 1;
    const sentimentDistribution = {
      positive: Math.round((positive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      negative: Math.round((negative / total) * 100),
    };

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    for (const rec of acceptedRecords) {
      const platform = str(rec.platform, 120) || "UNKNOWN";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }
    const platformBreakdown = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([platform, count]) => ({ platform, count }));

    // Top issues
    const issueCounts: Record<string, number> = {};
    for (const rec of acceptedRecords) {
      const issue = str(rec.issue, 220);
      if (issue) issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }
    const topIssues = Object.entries(issueCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));

    // Signal density
    let signalDensity: LocalSignalProfile["signalDensity"] = "NONE";
    if (acceptedRecords.length >= 20) signalDensity = "HIGH";
    else if (acceptedRecords.length >= 5) signalDensity = "MEDIUM";
    else if (acceptedRecords.length >= 1) signalDensity = "LOW";

    return {
      locality: str(loc.localityName || loc.dunName || loc.parliamentName, 180) || key,
      dunCode: str(loc.dunCode, 10),
      parliamentCode: str(loc.parliamentCode, 10),
      totalSignals: groupRecords.length,
      acceptedSignals: acceptedRecords.length,
      topNarratives,
      sentimentDistribution,
      platformBreakdown,
      topIssues,
      signalDensity,
    };
  }).sort((a, b) => b.acceptedSignals - a.acceptedSignals);
}
