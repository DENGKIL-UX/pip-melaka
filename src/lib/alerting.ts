// PIP-MLK Alerting
// -----------------
// Threshold-based alerting on top of the metrics module. Two pre-configured
// alerts (defined per the task spec):
//
//   1. HighErrorRate — fires when the rolling 5-min error rate exceeds 5%.
//   2. HighLatencyP99 — fires when the rolling 5-min P99 latency exceeds 2s.
//
// When `checkAlerts()` is called, each rule evaluates the current metrics
// snapshot. If a rule is currently firing, an alert is created (or its
// `lastSeenAt` is refreshed) in an in-memory store. Alerts auto-expire
// (TTL = 1 hour) once the underlying condition stops firing.
//
// A separate "manual" alert API (raiseAlert / resolveAlert) is provided so
// other modules (e.g. the SLO module) can publish alerts without going
// through the threshold rules.

import { logger } from "@/lib/logger";
import { getMetrics } from "@/lib/metrics";

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  firstSeenAt: number;
  lastSeenAt: number;
  expiresAt: number;
  context?: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  severity: AlertSeverity;
  threshold: number;
  evaluate: (metrics: ReturnType<typeof getMetrics>) => {
    firing: boolean;
    value: number;
    message: string;
    context?: Record<string, unknown>;
  };
}

export interface AlertCheckResult {
  checkedAt: string;
  firing: number;
  resolved: number;
  active: Alert[];
}

// ---------------------------------------------------------------------------
// Threshold rules.
// ---------------------------------------------------------------------------

const DEFAULT_ERROR_RATE_THRESHOLD = 0.05; // 5%
const DEFAULT_P99_LATENCY_MS_THRESHOLD = 2000; // 2s

export function getDefaultAlertRules(): AlertRule[] {
  return [
    {
      id: "high-error-rate",
      name: "HighErrorRate",
      severity: "critical",
      threshold: DEFAULT_ERROR_RATE_THRESHOLD,
      evaluate: (m) => {
        const firing =
          m.window.requestCount >= 10 && m.window.errorRate > DEFAULT_ERROR_RATE_THRESHOLD;
        const windowSeconds = Math.max(1, Math.round(m.window.durationMs / 1000));
        return {
          firing,
          value: m.window.errorRate,
          message: `Error rate ${(m.window.errorRate * 100).toFixed(2)}% over the last ${windowSeconds}s exceeds ${DEFAULT_ERROR_RATE_THRESHOLD * 100}% threshold`,
          context: {
            windowRequests: m.window.requestCount,
            windowErrors: m.window.errorCount,
          },
        };
      },
    },
    {
      id: "high-latency-p99",
      name: "HighLatencyP99",
      severity: "warning",
      threshold: DEFAULT_P99_LATENCY_MS_THRESHOLD,
      evaluate: (m) => {
        const firing =
          m.window.requestCount >= 10 && m.window.p99Ms > DEFAULT_P99_LATENCY_MS_THRESHOLD;
        const windowSeconds = Math.max(1, Math.round(m.window.durationMs / 1000));
        return {
          firing,
          value: m.window.p99Ms,
          message: `P99 latency ${m.window.p99Ms.toFixed(0)}ms over the last ${windowSeconds}s exceeds ${DEFAULT_P99_LATENCY_MS_THRESHOLD}ms threshold`,
          context: {
            windowRequests: m.window.requestCount,
            p95Ms: m.latency.p95Ms,
            avgMs: m.latency.avgMs,
          },
        };
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// In-memory alert store with 1h TTL.
// ---------------------------------------------------------------------------

const ALERT_TTL_MS = 60 * 60 * 1000;
const alertStore = new Map<string, Alert>();
let customRules: AlertRule[] = [];

/**
 * Registers additional alert rules (merged with defaults on next check).
 * Useful for SLO-derived rules or domain-specific checks.
 */
export function registerAlertRule(rule: AlertRule): void {
  customRules.push(rule);
  logger.info("alerting.rule.registered", { ruleId: rule.id, ruleName: rule.name });
}

/**
 * Manually raises (or refreshes) an alert by ID. Used by modules that need
 * to publish a stateful condition outside the threshold rules.
 */
export function raiseAlert(
  id: string,
  fields: {
    name: string;
    severity: AlertSeverity;
    message: string;
    value: number;
    threshold: number;
    context?: Record<string, unknown>;
  },
): Alert {
  const now = Date.now();
  const existing = alertStore.get(id);
  const alert: Alert = {
    id,
    name: fields.name,
    severity: fields.severity,
    message: fields.message,
    value: fields.value,
    threshold: fields.threshold,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    expiresAt: now + ALERT_TTL_MS,
    context: fields.context,
  };
  alertStore.set(id, alert);
  if (!existing) {
    logger.warn(`alert.raised: ${alert.name}`, {
      alertId: alert.id,
      value: alert.value,
      threshold: alert.threshold,
    });
  }
  return alert;
}

/**
 * Manually resolves (clears) an alert by ID. No-op if not present.
 */
export function resolveAlert(id: string): void {
  const existing = alertStore.get(id);
  if (existing) {
    alertStore.delete(id);
    logger.info("alert.resolved", { alertId: id, alertName: existing.name });
  }
}

function pruneExpired(now: number): number {
  let pruned = 0;
  for (const [id, alert] of alertStore.entries()) {
    if (alert.expiresAt < now) {
      alertStore.delete(id);
      pruned++;
      logger.info("alert.expired", { alertId: id, alertName: alert.name });
    }
  }
  return pruned;
}

// ---------------------------------------------------------------------------
// Public API: checkAlerts + getActiveAlerts.
// ---------------------------------------------------------------------------

/**
 * Evaluates all registered alert rules against the current metrics snapshot
 * and updates the alert store. Returns a summary of what fired / resolved.
 *
 * - For each firing rule, the corresponding alert is created or refreshed
 *   (lastSeenAt + expiresAt rolled forward by the TTL).
 * - For each non-firing rule whose alert was previously active, the alert
 *   is left in the store but its expiry is NOT refreshed — it will age out
 *   within the TTL window. This gives operators a chance to see the recent
 *   firing history.
 */
export function checkAlerts(): AlertCheckResult {
  const now = Date.now();
  const metrics = getMetrics();
  const rules = [...getDefaultAlertRules(), ...customRules];

  let firing = 0;
  for (const rule of rules) {
    const result = rule.evaluate(metrics);
    if (result.firing) {
      firing++;
      raiseAlert(rule.id, {
        name: rule.name,
        severity: rule.severity,
        message: result.message,
        value: result.value,
        threshold: rule.threshold,
        context: result.context,
      });
    }
  }

  const resolved = pruneExpired(now);
  return {
    checkedAt: new Date(now).toISOString(),
    firing,
    resolved,
    active: getActiveAlerts(),
  };
}

/**
 * Returns all currently-active alerts (not yet expired), sorted by
 * severity (critical first) then by lastSeenAt descending.
 */
export function getActiveAlerts(): Alert[] {
  const now = Date.now();
  const severityRank: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return Array.from(alertStore.values())
    .filter((a) => a.expiresAt >= now)
    .sort((a, b) => {
      const sev = severityRank[a.severity] - severityRank[b.severity];
      if (sev !== 0) return sev;
      return b.lastSeenAt - a.lastSeenAt;
    });
}

/**
 * Returns the alert for a given ID, or null if not active.
 */
export function getAlert(id: string): Alert | null {
  const alert = alertStore.get(id);
  if (!alert) return null;
  if (alert.expiresAt < Date.now()) {
    alertStore.delete(id);
    return null;
  }
  return alert;
}

/**
 * Clears all alerts from the store. Mainly useful for tests.
 */
export function clearAlerts(): void {
  alertStore.clear();
  customRules = [];
}
