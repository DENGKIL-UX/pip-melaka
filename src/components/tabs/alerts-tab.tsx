"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, X, Settings, Zap, Shield } from "lucide-react";
import { ALERT_SEVERITIES, ALERT_CODES, type OperationalAlert } from "@/lib/s2d-contracts";
import { SEED_ALERTS } from "@/lib/s2d-seed-data";
import { useI18n } from "@/lib/i18n";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  CRITICAL: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
  WARNING: { color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
  INFO: { color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30", icon: <Bell className="h-4 w-4 text-blue-500" /> },
};

// §7.15: Alert Rules — static configuration table. `rule` field is a SQL-like
// expression (technical token, kept untranslated). `nameKey`/`actionKey` point
// to translation keys for the human-readable label + action.
const ALERT_RULES = [
  { nameKey: "alerts.rule.seniorDep", rule: "senior_dependency_percent >= 30", actionKey: "alerts.rule.seniorDepAction", enabled: true, icon: Shield, triggered: 1 },
  { nameKey: "alerts.rule.sentimentDrop", rule: "negative_sentiment > 40% AND delta > 15pp in 3d", actionKey: "alerts.rule.sentimentDropAction", enabled: true, icon: AlertTriangle, triggered: 2 },
  { nameKey: "alerts.rule.dptChurn", rule: "net_churn > avg + 2σ", actionKey: "alerts.rule.dptChurnAction", enabled: true, icon: Zap, triggered: 0 },
  { nameKey: "alerts.rule.electionChange", rule: "winner != prev_winner", actionKey: "alerts.rule.electionChangeAction", enabled: true, icon: Bell, triggered: 11 },
  { nameKey: "alerts.rule.apifyRate", rule: "collection_rate < 70% of expected", actionKey: "alerts.rule.apifyRateAction", enabled: false, icon: Settings, triggered: 0 },
];

export function AlertsTab() {
  const { t } = useI18n();
  const activeAlerts = SEED_ALERTS.filter(a => a.status === "ACTIVE");
  const acknowledgedAlerts = SEED_ALERTS.filter(a => a.status === "ACKNOWLEDGED");
  const criticalCount = activeAlerts.filter(a => a.severity === ALERT_SEVERITIES.CRITICAL).length;
  const warningCount = activeAlerts.filter(a => a.severity === ALERT_SEVERITIES.WARNING).length;

  return (
    <div className="space-y-3">
    <Card className="border-mlk/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-mlk" />
          <div>
            <CardTitle className="text-base">{t("alerts.title")}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{t("alerts.desc")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-red-600">{criticalCount}</div><div className="text-[10px] text-muted-foreground">{t("alerts.kpiCritical")}</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-amber-600">{warningCount}</div><div className="text-[10px] text-muted-foreground">{t("alerts.kpiWarning")}</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-blue-600">{activeAlerts.length}</div><div className="text-[10px] text-muted-foreground">{t("alerts.kpiActive")}</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{acknowledgedAlerts.length}</div><div className="text-[10px] text-muted-foreground">{t("alerts.kpiAcknowledged")}</div></div>
        </div>

        {/* Active alerts */}
        <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase">{t("alerts.activeAlerts").replace("{count}", String(activeAlerts.length))}</div>
        <div className="space-y-2 mb-4">
          {activeAlerts.map(alert => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
            return (
              <div key={alert.id} className={`rounded-md border p-3 ${config.bg}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${config.color}`}>{alert.title}</span>
                      <Badge variant="outline" className={`text-[9px] ${config.color} border-current`}>{t(`alerts.severity.${alert.severity}`, alert.severity)}</Badge>
                      <Badge variant="outline" className="text-[8px] font-mono">{alert.code.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{alert.message}</div>
                    <div className="text-[9px] text-muted-foreground/70 mt-1">{t("alerts.createdPrefix").replace("{date}", new Date(alert.created_at).toLocaleString("en-MY"))}</div>
                  </div>
                  <button className="p-1 rounded hover:bg-muted/50" aria-label={t("alerts.ackButton")}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Acknowledged alerts */}
        {acknowledgedAlerts.length > 0 && (
          <>
            <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase">{t("alerts.ackAlerts").replace("{count}", String(acknowledgedAlerts.length))}</div>
            <div className="space-y-2">
              {acknowledgedAlerts.map(alert => {
                const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
                return (
                  <div key={alert.id} className="rounded-md border border-border/30 p-3 opacity-60">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{alert.title}</span>
                          <Badge variant="outline" className="text-[9px]">{t(`alerts.severity.${alert.severity}`, alert.severity)}</Badge>
                          <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-600">{t("alerts.acknowledgedBadge")}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{alert.message}</div>
                        <div className="text-[9px] text-muted-foreground/70 mt-1">{t("alerts.ackPrefix").replace("{date}", alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleString("en-MY") : "")}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Alert codes reference */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">{t("alerts.monitoredCodes")}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {Object.values(ALERT_CODES).map(code => (
              <div key={code} className="text-[9px] font-mono text-muted-foreground p-1 rounded border border-border/20">
                {code.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

      {/* §7.15: Alert Rules Engine — configurable thresholds */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-mlk" /> {t("alerts.rulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ALERT_RULES.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md border border-border/40 hover:bg-mlk/5 transition-colors">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${rule.enabled ? "text-mlk" : "text-muted-foreground/50"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{t(rule.nameKey)}</span>
                      {rule.enabled ? (
                        <Badge variant="outline" className="text-[8px] border-emerald-500/40 text-emerald-600">{t("alerts.activeBadge")}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px] border-muted-foreground/40 text-muted-foreground">{t("alerts.disabledBadge")}</Badge>
                      )}
                      {rule.triggered > 0 && (
                        <Badge variant="outline" className="text-[8px] border-mlk/40 text-mlk">{t("alerts.triggeredBadge").replace("{count}", String(rule.triggered))}</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{rule.rule}</div>
                    <div className="text-[9px] text-muted-foreground">→ {t(rule.actionKey)}</div>
                  </div>
                  <button className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${rule.enabled ? "bg-mlk" : "bg-muted"}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            {t("alerts.rulesNote")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
