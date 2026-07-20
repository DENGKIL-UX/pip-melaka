/**
 * S2D Change-Point Detector — ported from the S2D-360 Intelligence Engine.
 *
 * Detects statistically significant changes in signal patterns between
 * time periods. Uses a simple threshold-based approach suitable for
 * the PIP-MLK runtime (no external ML libraries required).
 *
 * Source: s2d-engine/src/intelligence/diagnostics/s2d-change-point-detector.js
 * Ported to TypeScript for PIP-MLK's Next.js runtime.
 */

export interface ChangePointInput {
  narrative: string;
  currentPeriod: { startDate: string; endDate: string; recordCount: number; sentimentScore: number };
  previousPeriod: { startDate: string; endDate: string; recordCount: number; sentimentScore: number };
  locality?: string;
}

export interface ChangePointResult {
  narrative: string;
  type: "SURGE" | "DROP" | "SENTIMENT_SHIFT" | "VOLUME_CHANGE" | "NO_CHANGE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severityScore: number;
  description: string;
  locality: string;
  currentCount: number;
  previousCount: number;
  countDelta: number;
  countDeltaPercent: number;
  sentimentDelta: number;
  detectedAt: string;
}

const SEVERITY_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 20,
};

export function detectChangePoints(inputs: ChangePointInput[]): ChangePointResult[] {
  const results: ChangePointResult[] = [];

  for (const input of inputs) {
    const { narrative, currentPeriod, previousPeriod, locality = "UNRESOLVED" } = input;

    const countDelta = currentPeriod.recordCount - previousPeriod.recordCount;
    const countDeltaPercent = previousPeriod.recordCount > 0
      ? (countDelta / previousPeriod.recordCount) * 100
      : 0;

    const sentimentDelta = currentPeriod.sentimentScore - previousPeriod.sentimentScore;

    // Determine change type
    let type: ChangePointResult["type"] = "NO_CHANGE";
    let severityScore = 0;
    let description = "No significant change detected.";

    if (countDeltaPercent > 50) {
      type = "SURGE";
      severityScore = Math.min(100, Math.abs(countDeltaPercent));
      description = `Signal volume surged by ${countDeltaPercent.toFixed(1)}% (${previousPeriod.recordCount} → ${currentPeriod.recordCount} records).`;
    } else if (countDeltaPercent < -50) {
      type = "DROP";
      severityScore = Math.min(100, Math.abs(countDeltaPercent));
      description = `Signal volume dropped by ${Math.abs(countDeltaPercent).toFixed(1)}% (${previousPeriod.recordCount} → ${currentPeriod.recordCount} records).`;
    } else if (Math.abs(sentimentDelta) > 0.2) {
      type = "SENTIMENT_SHIFT";
      severityScore = Math.min(100, Math.abs(sentimentDelta) * 200);
      description = `Sentiment shifted by ${(sentimentDelta * 100).toFixed(1)}% (${(previousPeriod.sentimentScore * 100).toFixed(1)}% → ${(currentPeriod.sentimentScore * 100).toFixed(1)}%).`;
    } else if (Math.abs(countDeltaPercent) > 25) {
      type = "VOLUME_CHANGE";
      severityScore = Math.min(60, Math.abs(countDeltaPercent) * 0.8);
      description = `Signal volume changed by ${countDeltaPercent.toFixed(1)}% (${previousPeriod.recordCount} → ${currentPeriod.recordCount} records).`;
    }

    if (type === "NO_CHANGE") continue;

    // Determine severity
    let severity: ChangePointResult["severity"] = "LOW";
    if (severityScore >= SEVERITY_THRESHOLDS.CRITICAL) severity = "CRITICAL";
    else if (severityScore >= SEVERITY_THRESHOLDS.HIGH) severity = "HIGH";
    else if (severityScore >= SEVERITY_THRESHOLDS.MEDIUM) severity = "MEDIUM";

    results.push({
      narrative,
      type,
      severity,
      severityScore: Math.round(severityScore),
      description,
      locality,
      currentCount: currentPeriod.recordCount,
      previousCount: previousPeriod.recordCount,
      countDelta,
      countDeltaPercent: Math.round(countDeltaPercent * 10) / 10,
      sentimentDelta: Math.round(sentimentDelta * 1000) / 1000,
      detectedAt: new Date().toISOString(),
    });
  }

  // Sort by severity score (highest first)
  return results.sort((a, b) => b.severityScore - a.severityScore);
}
