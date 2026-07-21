"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, CircleDot } from "lucide-react";
import { INCIDENT_STATUSES, INCIDENT_SEVERITIES, CHECKLIST_STATUSES } from "@/lib/s2d-contracts";
import { SEED_INCIDENTS } from "@/lib/s2d-seed-data";

const SEVERITY_COLORS: Record<string, string> = {
  INFO: "text-blue-600 border-blue-500/40",
  WARNING: "text-amber-600 border-amber-500/40",
  HIGH: "text-orange-600 border-orange-500/40",
  CRITICAL: "text-red-600 border-red-500/40",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/15 text-blue-600",
  INVESTIGATING: "bg-amber-500/15 text-amber-600",
  MITIGATION_IN_PROGRESS: "bg-purple-500/15 text-purple-600",
  READY_FOR_CLOSURE: "bg-emerald-500/15 text-emerald-600",
  CLOSED: "bg-muted/30 text-muted-foreground",
};

const CHECKLIST_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3 text-muted-foreground" />,
  IN_PROGRESS: <CircleDot className="h-3 w-3 text-amber-500" />,
  VERIFIED: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
};

export function IncidentCasebookTab() {
  const openCount = SEED_INCIDENTS.filter(i => i.status === INCIDENT_STATUSES.OPEN).length;
  const investigatingCount = SEED_INCIDENTS.filter(i => i.status === INCIDENT_STATUSES.INVESTIGATING).length;
  const mitigatingCount = SEED_INCIDENTS.filter(i => i.status === INCIDENT_STATUSES.MITIGATION_IN_PROGRESS).length;
  const closedCount = SEED_INCIDENTS.filter(i => i.status === INCIDENT_STATUSES.CLOSED).length;

  return (
    <div className="space-y-4">
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">Incident Casebook</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Case tracking · Checklist · Closure evidence · Severity classification</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-blue-600">{openCount}</div><div className="text-[10px] text-muted-foreground">Open</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-amber-600">{investigatingCount}</div><div className="text-[10px] text-muted-foreground">Investigating</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-purple-600">{mitigatingCount}</div><div className="text-[10px] text-muted-foreground">Mitigating</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{closedCount}</div><div className="text-[10px] text-muted-foreground">Closed</div></div>
          </div>

          {/* Incident cases */}
          <div className="space-y-3">
            {SEED_INCIDENTS.map((inc) => (
              <div key={inc.id} className="rounded-md border border-border/50 p-3 hover:border-mlk/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[9px] ${SEVERITY_COLORS[inc.severity] || ""}`}>{inc.severity}</Badge>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[inc.status] || ""}`}>{inc.status.replace(/_/g, " ")}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm font-medium">{inc.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{inc.description}</div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="mt-2 pt-2 border-t border-border/30">
                  <div className="text-[10px] text-muted-foreground uppercase mb-1">Closure Checklist</div>
                  <div className="space-y-1">
                    {inc.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        {CHECKLIST_ICONS[item.status] || <Clock className="h-3 w-3" />}
                        <span className={item.status === CHECKLIST_STATUSES.VERIFIED ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* §7.11: Severity Matrix — categorize by type/severity/location */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-mlk" /> Incident Severity Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="p-1 text-muted-foreground text-left">Severity ↓ / Type →</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">Sentiment</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">Demographic</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">Electoral</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">Technical</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { sev: "CRITICAL", color: "#dc2626", counts: [1, 0, 0, 0] },
                  { sev: "HIGH", color: "#ea580c", counts: [0, 1, 1, 0] },
                  { sev: "MEDIUM", color: "#f59e0b", counts: [2, 0, 0, 1] },
                  { sev: "LOW", color: "#84cc16", counts: [0, 0, 1, 0] },
                ].map((row) => (
                  <tr key={row.sev}>
                    <td className="p-1 font-semibold text-right" style={{ color: row.color }}>{row.sev}</td>
                    {row.counts.map((count, ci) => (
                      <td key={ci} className="p-1 text-center border border-border/40" style={{ backgroundColor: count > 0 ? `${row.color}15` : "transparent" }}>
                        {count > 0 ? <span className="text-[9px] font-mono font-bold" style={{ color: row.color }}>{count}</span> : <span className="text-[8px] text-muted-foreground/30">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">Matrix shows incident count by severity × type. Color intensity indicates risk density.</div>
        </CardContent>
      </Card>
    </div>
  );
}
