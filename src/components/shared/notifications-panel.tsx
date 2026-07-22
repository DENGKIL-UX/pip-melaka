"use client";

// ponytail: MLK — Notifications/Alerts panel.
// New feature (round 2): bell icon in the dashboard header that shows a badge
// count + dropdown of real-time risk threshold alerts. Scans all 6 parliaments'
// DUN aggregates for: high senior dependency, low gender balance, low profile
// completeness, high DPT net additions. Click an alert → jump to the DUN.

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";

interface RiskAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  parliament: string;
  dun?: string;
  dunName?: string;
  metric: string;
  value: number;
  threshold: number;
}

interface DUNAggregate {
  geography: { parliament_code?: string; dun_code?: string; dun_name?: string };
  metrics: {
    total_voters: number;
    senior_dependency_percent: number;
    gender_balance_score: number;
    profile_completeness_score: number;
    dominant_ethnicity_group: string;
  };
}

const CRITICAL_THRESHOLDS = {
  senior_dependency: 30, // % > 30 = critical
  gender_balance: 90, // score < 90 = critical
  completeness: 95, // % < 95 = critical
  dpt_net: 500, // net > 500/month = critical
};

const WARNING_THRESHOLDS = {
  senior_dependency: 25,
  gender_balance: 95,
  completeness: 97,
  dpt_net: 300,
};

// Cache key + TTL for the alerts scan (avoids 6 JSONL fetches on every dashboard mount).
const ALERTS_CACHE_KEY = "pip-mlk-alerts-cache";
const ALERTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedAlerts {
  ts: number;
  alerts: RiskAlert[];
}

function readCachedAlerts(): RiskAlert[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ALERTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAlerts;
    if (!parsed || typeof parsed.ts !== "number" || !Array.isArray(parsed.alerts)) return null;
    if (Date.now() - parsed.ts > ALERTS_CACHE_TTL_MS) return null;
    return parsed.alerts;
  } catch {
    return null;
  }
}

function writeCachedAlerts(alerts: RiskAlert[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedAlerts = { ts: Date.now(), alerts };
    localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be full or blocked — silently ignore.
  }
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [fromCache, setFromCache] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setSelectedParliament, setSelectedDun, setActiveTab } = useDashboardStore();

  // Fetch all DUN aggregates + DPT data, scan for alerts.
  // Results are cached in localStorage for 5 minutes to avoid re-fetching
  // 6 JSONL files on every dashboard mount.
  useEffect(() => {
    (async () => {
      // Try cache first for instant paint.
      const cached = readCachedAlerts();
      if (cached) {
        setAlerts(cached);
        setLoading(false);
        setFromCache(true);
        // Still refresh in the background (stale-while-revalidate pattern).
      }

      try {
        const allAlerts: RiskAlert[] = [];

        // Fetch DUN aggregates for all 6 parliaments
        const dunResults = await Promise.all(
          PARLIAMENTS.map(async (p) => {
            try {
              const res = await fetch(`/data/p${p.code}/dun-intelligence.jsonl`);
              if (!res.ok) return [];
              const text = await res.text();
              return text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as DUNAggregate);
            } catch {
              return [];
            }
          })
        );

        for (const duns of dunResults) {
          for (const dun of duns) {
            const parlCode = dun.geography?.parliament_code ?? "";
            const dunCode = dun.geography?.dun_code ?? "";
            const dunName = dun.geography?.dun_name ?? "";
            const m = dun.metrics;

            // Senior dependency
            if (m.senior_dependency_percent >= CRITICAL_THRESHOLDS.senior_dependency) {
              allAlerts.push({
                id: `senior-crit-${parlCode}-${dunCode}`,
                severity: "critical",
                title: `Critical: Senior dependency in N${dunCode} ${dunName}`,
                detail: `${m.senior_dependency_percent.toFixed(1)}% of voters are 56+ (threshold: ${CRITICAL_THRESHOLDS.senior_dependency}%). Aging-population risk.`,
                parliament: parlCode, dun: dunCode, dunName,
                metric: "senior_dependency_percent", value: m.senior_dependency_percent, threshold: CRITICAL_THRESHOLDS.senior_dependency,
              });
            } else if (m.senior_dependency_percent >= WARNING_THRESHOLDS.senior_dependency) {
              allAlerts.push({
                id: `senior-warn-${parlCode}-${dunCode}`,
                severity: "warning",
                title: `Warning: Senior dependency in N${dunCode} ${dunName}`,
                detail: `${m.senior_dependency_percent.toFixed(1)}% of voters are 56+ (warning: ${WARNING_THRESHOLDS.senior_dependency}%).`,
                parliament: parlCode, dun: dunCode, dunName,
                metric: "senior_dependency_percent", value: m.senior_dependency_percent, threshold: WARNING_THRESHOLDS.senior_dependency,
              });
            }

            // Gender balance (lower is worse)
            if (m.gender_balance_score < CRITICAL_THRESHOLDS.gender_balance) {
              allAlerts.push({
                id: `gender-crit-${parlCode}-${dunCode}`,
                severity: "critical",
                title: `Critical: Gender imbalance in N${dunCode} ${dunName}`,
                detail: `Gender balance score ${m.gender_balance_score.toFixed(1)} (threshold: <${CRITICAL_THRESHOLDS.gender_balance}).`,
                parliament: parlCode, dun: dunCode, dunName,
                metric: "gender_balance_score", value: m.gender_balance_score, threshold: CRITICAL_THRESHOLDS.gender_balance,
              });
            }

            // Profile completeness (lower is worse). Value may be 0-1 fraction or 0-100 %.
            const completenessPct = m.profile_completeness_score > 1
              ? m.profile_completeness_score
              : m.profile_completeness_score * 100;
            if (completenessPct < CRITICAL_THRESHOLDS.completeness) {
              allAlerts.push({
                id: `complet-crit-${parlCode}-${dunCode}`,
                severity: "critical",
                title: `Critical: Low data quality in N${dunCode} ${dunName}`,
                detail: `Profile completeness ${completenessPct.toFixed(2)}% (threshold: <${CRITICAL_THRESHOLDS.completeness}%).`,
                parliament: parlCode, dun: dunCode, dunName,
                metric: "profile_completeness_score", value: completenessPct, threshold: CRITICAL_THRESHOLDS.completeness,
              });
            }
          }
        }

        // Fetch DPT summary for high-churn parliaments
        try {
          const dptRes = await fetch(`/data/dpt/spr-dpt-pameran-summary.json`);
          if (dptRes.ok) {
            const dpt = await dptRes.json();
            for (const p of dpt.per_parliament ?? []) {
              if (p.net >= CRITICAL_THRESHOLDS.dpt_net * 5) { // 5 months total
                allAlerts.push({
                  id: `dpt-crit-${p.parliament_code}`,
                  severity: "critical",
                  title: `Critical: High DPT churn in P${p.parliament_code} ${p.parliament_name}`,
                  detail: `5-month net additions: +${p.net} (threshold: +${CRITICAL_THRESHOLDS.dpt_net * 5}). Voter-roll churn risk.`,
                  parliament: p.parliament_code,
                  metric: "dpt_net", value: p.net, threshold: CRITICAL_THRESHOLDS.dpt_net * 5,
                });
              } else if (p.net >= WARNING_THRESHOLDS.dpt_net * 5) {
                allAlerts.push({
                  id: `dpt-warn-${p.parliament_code}`,
                  severity: "warning",
                  title: `Warning: Elevated DPT churn in P${p.parliament_code} ${p.parliament_name}`,
                  detail: `5-month net additions: +${p.net}.`,
                  parliament: p.parliament_code,
                  metric: "dpt_net", value: p.net, threshold: WARNING_THRESHOLDS.dpt_net * 5,
                });
              }
            }
          }
        } catch {
          // ignore
        }

        // Sort: critical first, then warning, then info
        allAlerts.sort((a, b) => {
          const order = { critical: 0, warning: 1, info: 2 };
          return order[a.severity] - order[b.severity];
        });

        setAlerts(allAlerts);
        writeCachedAlerts(allAlerts);
        setFromCache(false);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));
  const criticalCount = visibleAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length;

  const handleAlertClick = (alert: RiskAlert) => {
    setSelectedParliament(alert.parliament);
    if (alert.dun && alert.dunName) {
      setSelectedDun({ parliament: alert.parliament, dun: alert.dun, name: alert.dunName });
    }
    setActiveTab(alert.metric === "dpt_net" ? "analysis" : "demographics");
    setOpen(false);
  };

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed((prev) => new Set([...prev, id]));
  };

  const dismissAll = () => {
    setDismissed(new Set(alerts.map((a) => a.id)));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications: ${criticalCount} critical, ${warningCount} warning${visibleAlerts.length === 0 ? ", no alerts" : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {visibleAlerts.length > 0 && (
          <span
            className={`absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${
              criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-amber-500"
            }`}
            aria-hidden="true"
          >
            {visibleAlerts.length}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute end-0 mt-2 w-80 sm:w-96 rounded-lg border border-mlk/30 bg-card shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-mlk/10 via-mlk/5 to-transparent">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-mlk" aria-hidden="true" />
              <span className="text-sm font-semibold">Risk Alerts</span>
              {visibleAlerts.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {criticalCount} crit · {warningCount} warn
                </Badge>
              )}
              {fromCache && (
                <Badge variant="outline" className="text-[9px] border-mlk/30 text-mlk/80" title="Showing cached alerts — refreshing in background">
                  cached
                </Badge>
              )}
            </div>
            {visibleAlerts.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={dismissAll} aria-label="Dismiss all alerts">
                Dismiss all
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-mlk">
            {loading ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-mlk border-t-transparent mb-2" aria-hidden="true" />
                <div className="text-xs text-muted-foreground">Scanning 6 parliaments for risk signals…</div>
              </div>
            ) : visibleAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" aria-hidden="true" />
                <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All clear</div>
                <div className="text-xs text-muted-foreground mt-1">No risk thresholds breached across 28 DUNs.</div>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-border/50">
                {visibleAlerts.map((alert) => (
                  <li key={alert.id}>
                    <button
                      onClick={() => handleAlertClick(alert)}
                      className="w-full text-start p-3 hover:bg-mlk/5 transition-colors group"
                      aria-label={`${alert.severity} alert: ${alert.title}. Click to jump to ${alert.dunName ? `N${alert.dun} ${alert.dunName}` : `P${alert.parliament}`}.`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex-shrink-0 p-1 rounded-full mt-0.5 ${
                            alert.severity === "critical"
                              ? "bg-red-500/15 text-red-500"
                              : alert.severity === "warning"
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-blue-500/15 text-blue-500"
                          }`}
                          aria-hidden="true"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium leading-snug">{alert.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{alert.detail}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 font-mono">
                              P{alert.parliament}
                            </Badge>
                            {alert.dun && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 font-mono">
                                N{alert.dun}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[9px] py-0 px-1 h-4 ${
                                alert.severity === "critical"
                                  ? "text-red-600 dark:text-red-400 border-red-500/40"
                                  : "text-amber-600 dark:text-amber-400 border-amber-500/40"
                              }`}
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <button
                          onClick={(e) => dismissAlert(alert.id, e)}
                          className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Dismiss this alert"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-muted/30 text-center">
            <span className="text-[10px] text-muted-foreground">
              Scans 28 DUNs for: senior dep &gt;30%, gender bal &lt;90, completeness &lt;95%, DPT net &gt;1500
            </span>
            <div className="text-[9px] text-muted-foreground/70 mt-0.5">
              Cached 5 min in localStorage · {alerts.length} alerts scanned
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
