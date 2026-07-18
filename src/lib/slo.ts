// PIP-MLK SLOs / SLIs / Error Budgets
// ------------------------------------
// Service-Level Objectives for the PIP-MLK API surface, computed from the
// metrics module. Three SLIs are tracked:
//
//   1. Availability  — fraction of requests with status < 500 (target 99.9%)
//   2. Latency       — P99 latency in ms over the rolling window (target < 2s)
//   3. Error rate    — fraction of requests with status >= 500 (target < 0.1%)
//
// Error budget:
//   For a 99.9% availability SLO over a 30-day window, the budget is
//   0.1% * 30d = 43.2 minutes of allowed downtime (or equivalently, 0.1%
//   of requests may fail). We report budgetRemaining as a fraction (1.0 =
//   full budget left, 0.0 = budget exhausted, negative = overdrawn).
//
// The window for budget consumption is the rolling 5-minute window from
// the metrics module. A production deployment would typically compute the
// budget over a 30-day window; here we use the available window and note
// the caveat in the status report.

import { logger } from "@/lib/logger";
import { getMetrics } from "@/lib/metrics";

// ---------------------------------------------------------------------------
// SLO definitions.
// ---------------------------------------------------------------------------

export interface SloDefinition {
  name: string;
  description: string;
  target: number; // 0..1 for rates, ms for latency
  unit: "ratio" | "ms";
  /**
   * Returns true if the SLI is being met for the current measurement.
   * For ratios, "met" means observed >= target. For latency, "met" means
   * observed <= target.
   */
  isMet: (observed: number) => boolean;
}

export const SLO_AVAILABILITY: SloDefinition = {
  name: "availability",
  description: "Fraction of requests served with status < 500 (success).",
  target: 0.999,
  unit: "ratio",
  isMet: (observed) => observed >= 0.999,
};

export const SLO_LATENCY_P99: SloDefinition = {
  name: "latency_p99",
  description: "P99 request latency over the rolling window.",
  target: 2000,
  unit: "ms",
  isMet: (observed) => observed <= 2000,
};

export const SLO_ERROR_RATE: SloDefinition = {
  name: "error_rate",
  description: "Fraction of requests returning status >= 500.",
  target: 0.001, // 0.1%
  unit: "ratio",
  isMet: (observed) => observed <= 0.001,
};

export interface SloTarget {
  availability: number;
  latencyP99Ms: number;
  errorRate: number;
  /** 30-day window in seconds (informational). */
  windowSeconds: number;
}

export const SLO_TARGETS: SloTarget = {
  availability: 0.999,
  latencyP99Ms: 2000,
  errorRate: 0.001,
  windowSeconds: 30 * 24 * 60 * 60,
};

// ---------------------------------------------------------------------------
// SLO status types.
// ---------------------------------------------------------------------------

export type SloStatus = "met" | "at_risk" | "breached";

export interface SloIndicatorStatus {
  name: string;
  description: string;
  unit: "ratio" | "ms";
  target: number;
  observed: number;
  status: SloStatus;
  /** Headroom = (target - observed) for latency, (observed - target) for ratios. */
  headroom: number;
}

export interface ErrorBudgetStatus {
  /** Fraction of the budget remaining (1.0 = full, 0.0 = exhausted, <0 = overdrawn). */
  remaining: number;
  /** Allowed error rate per the availability SLO (1 - 0.999 = 0.001). */
  allowedErrorRate: number;
  /** Observed error rate over the rolling window. */
  observedErrorRate: number;
  /** Number of errors observed in the rolling window. */
  observedErrors: number;
  /** Number of requests in the rolling window. */
  observedRequests: number;
  /** True when the budget has been exhausted (remaining <= 0). */
  exhausted: boolean;
}

export interface SloReport {
  capturedAt: string;
  availability: SloIndicatorStatus;
  latency: SloIndicatorStatus;
  errorRate: SloIndicatorStatus;
  budgetRemaining: number;
  budget: ErrorBudgetStatus;
  overall: SloStatus;
  /** Notes / caveats about the measurement window. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

/**
 * Classifies an SLI's status against its target. "at_risk" is the band
 * within 10% of the target (e.g. availability in [89.9%, 99.9%] for a
 * 99.9% target — meaning we're meeting the SLO but only barely).
 */
function classifySli(def: SloDefinition, observed: number): SloStatus {
  if (def.unit === "ms") {
    // Latency: lower is better. Breached when observed > target.
    if (observed > def.target) return "breached";
    if (observed > def.target * 0.9) return "at_risk";
    return "met";
  }
  // Ratio: for availability, higher is better. For error_rate, lower is better.
  // We treat "ratio" generally: the SLI's `isMet` decides met vs breached.
  if (def.isMet(observed)) {
    // Met — but is it at-risk (within 10% of target)?
    if (def.name === "availability") {
      // At risk if within 0.1% absolute of target.
      if (observed < def.target + 0.001 && observed >= def.target - 0.0001) {
        return "at_risk";
      }
      return "met";
    }
    if (def.name === "error_rate") {
      // At risk if within 50% relative of target (e.g. 0.0005 vs 0.001).
      if (observed > def.target * 0.5) return "at_risk";
      return "met";
    }
    return "met";
  }
  return "breached";
}

function classifyOverall(report: Omit<SloReport, "overall">): SloStatus {
  const statuses = [report.availability.status, report.latency.status, report.errorRate.status];
  if (statuses.some((s) => s === "breached")) return "breached";
  if (statuses.some((s) => s === "at_risk")) return "at_risk";
  return "met";
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

/**
 * Computes the current SLO status report from the metrics module.
 * `getSloStatus()` is the single entry point; it always returns a fully
 * populated report (zero-valued when no requests have been observed).
 */
export function getSloStatus(): SloReport {
  const m = getMetrics();

  // --- Availability ---
  const availabilityObserved =
    m.requestCount > 0 ? (m.requestCount - m.errorCount) / m.requestCount : 1;
  const availability: SloIndicatorStatus = {
    name: SLO_AVAILABILITY.name,
    description: SLO_AVAILABILITY.description,
    unit: SLO_AVAILABILITY.unit,
    target: SLO_AVAILABILITY.target,
    observed: availabilityObserved,
    status: m.requestCount === 0 ? "met" : classifySli(SLO_AVAILABILITY, availabilityObserved),
    headroom: availabilityObserved - SLO_AVAILABILITY.target,
  };

  // --- Latency P99 (rolling window; falls back to histogram if window empty) ---
  const latencyObserved = m.window.p99Ms > 0 ? m.window.p99Ms : m.latency.p99Ms;
  const latency: SloIndicatorStatus = {
    name: SLO_LATENCY_P99.name,
    description: SLO_LATENCY_P99.description,
    unit: SLO_LATENCY_P99.unit,
    target: SLO_LATENCY_P99.target,
    observed: latencyObserved,
    status: m.requestCount === 0 ? "met" : classifySli(SLO_LATENCY_P99, latencyObserved),
    headroom: SLO_LATENCY_P99.target - latencyObserved,
  };

  // --- Error rate (rolling window; falls back to global if empty) ---
  const errorRateObserved = m.window.requestCount > 0 ? m.window.errorRate : m.errorRate;
  const errorRate: SloIndicatorStatus = {
    name: SLO_ERROR_RATE.name,
    description: SLO_ERROR_RATE.description,
    unit: SLO_ERROR_RATE.unit,
    target: SLO_ERROR_RATE.target,
    observed: errorRateObserved,
    status: m.requestCount === 0 ? "met" : classifySli(SLO_ERROR_RATE, errorRateObserved),
    headroom: SLO_ERROR_RATE.target - errorRateObserved,
  };

  // --- Error budget ---
  // Budget is defined by the availability SLO: 1 - 0.999 = 0.001 = 0.1% allowed.
  const allowedErrorRate = 1 - SLO_AVAILABILITY.target;
  const observedErrorRate = errorRateObserved;
  const observedErrors = m.window.errorCount;
  const observedRequests = m.window.requestCount;

  // remaining = (allowed - observed) / allowed
  //   1.0 → full budget; 0.0 → exhausted; <0 → overdrawn.
  const budgetRemaining =
    allowedErrorRate > 0
      ? (allowedErrorRate - observedErrorRate) / allowedErrorRate
      : 0;
  const budget: ErrorBudgetStatus = {
    remaining: budgetRemaining,
    allowedErrorRate,
    observedErrorRate,
    observedErrors,
    observedRequests,
    exhausted: budgetRemaining <= 0,
  };

  const notes: string[] = [];
  if (observedRequests === 0) {
    notes.push("No requests in the rolling window — SLOs reported as met with no data.");
  }
  if (observedRequests < 100) {
    notes.push(
      `Only ${observedRequests} requests in the rolling window — SLI readings are statistically weak.`,
    );
  }
  notes.push(
    "Budget consumption is computed over the 5-min rolling window, not the canonical 30-day window. For production SLO tracking, persist the metrics and compute over 30d.",
  );

  const partial: Omit<SloReport, "overall"> = {
    capturedAt: m.capturedAt,
    availability,
    latency,
    errorRate,
    budgetRemaining,
    budget,
    notes,
  };

  const overall = classifyOverall(partial);

  logger.debug("slo.computed", {
    overall,
    availability: availability.status,
    latency: latency.status,
    errorRate: errorRate.status,
    budgetRemaining,
  });

  return { ...partial, overall };
}

/**
 * Convenience: returns true when any SLO is currently breached.
 */
export function isSloBreached(): boolean {
  return getSloStatus().overall === "breached";
}
