"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { ALERT_SEVERITIES, ALERT_CODES, type OperationalAlert } from "@/lib/s2d-contracts";
import { SEED_ALERTS } from "@/lib/s2d-seed-data";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  CRITICAL: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
  WARNING: { color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
  INFO: { color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30", icon: <Bell className="h-4 w-4 text-blue-500" /> },
};

export function AlertsTab() {
  const activeAlerts = SEED_ALERTS.filter(a => a.status === "ACTIVE");
  const acknowledgedAlerts = SEED_ALERTS.filter(a => a.status === "ACKNOWLEDGED");
  const criticalCount = activeAlerts.filter(a => a.severity === ALERT_SEVERITIES.CRITICAL).length;
  const warningCount = activeAlerts.filter(a => a.severity === ALERT_SEVERITIES.WARNING).length;

  return (
    <Card className="border-mlk/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-mlk" />
          <div>
            <CardTitle className="text-base">Operational Alerts — Live System Monitoring</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Per archive: pip-operational-alert-contract.js · 11 alert codes · 3 severities</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-red-600">{criticalCount}</div><div className="text-[10px] text-muted-foreground">Critical</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-amber-600">{warningCount}</div><div className="text-[10px] text-muted-foreground">Warning</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-blue-600">{activeAlerts.length}</div><div className="text-[10px] text-muted-foreground">Active</div></div>
          <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{acknowledgedAlerts.length}</div><div className="text-[10px] text-muted-foreground">Acknowledged</div></div>
        </div>

        {/* Active alerts */}
        <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase">Active Alerts ({activeAlerts.length})</div>
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
                      <Badge variant="outline" className={`text-[9px] ${config.color} border-current`}>{alert.severity}</Badge>
                      <Badge variant="outline" className="text-[8px] font-mono">{alert.code.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{alert.message}</div>
                    <div className="text-[9px] text-muted-foreground/70 mt-1">Created {new Date(alert.created_at).toLocaleString("en-MY")}</div>
                  </div>
                  <button className="p-1 rounded hover:bg-muted/50" aria-label="Acknowledge alert">
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
            <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase">Acknowledged ({acknowledgedAlerts.length})</div>
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
                          <Badge variant="outline" className="text-[9px]">{alert.severity}</Badge>
                          <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-600">ACKNOWLEDGED</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{alert.message}</div>
                        <div className="text-[9px] text-muted-foreground/70 mt-1">Acknowledged {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleString("en-MY") : ""}</div>
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
          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Monitored Alert Codes (11)</div>
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
  );
}
