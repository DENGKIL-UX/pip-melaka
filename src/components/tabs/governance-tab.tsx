"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Database, FileSpreadsheet, GitBranch, Eye, FileCheck2, Cpu, AlertTriangle, CheckCircle2, Circle, FileWarning, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GATES: Array<{ id: number; icon: React.ComponentType<{ className?: string }>; labelKey: string; descKey: string; status: "CLOSED" | "OPEN" }> = [
  { id: 1, icon: FileSpreadsheet, labelKey: "governance.gate1Label", descKey: "governance.gate1Desc", status: "CLOSED" },
  { id: 2, icon: GitBranch, labelKey: "governance.gate2Label", descKey: "governance.gate2Desc", status: "CLOSED" },
  { id: 3, icon: Cpu, labelKey: "governance.gate3Label", descKey: "governance.gate3Desc", status: "CLOSED" },
  { id: 4, icon: Lock, labelKey: "governance.gate4Label", descKey: "governance.gate4Desc", status: "CLOSED" },
  { id: 5, icon: FileCheck2, labelKey: "governance.gate5Label", descKey: "governance.gate5Desc", status: "CLOSED" },
  { id: 6, icon: Database, labelKey: "governance.gate6Label", descKey: "governance.gate6Desc", status: "CLOSED" },
  { id: 7, icon: FileCheck2, labelKey: "governance.gate7Label", descKey: "governance.gate7Desc", status: "CLOSED" },
  { id: 8, icon: Eye, labelKey: "governance.gate8Label", descKey: "governance.gate8Desc", status: "CLOSED" },
  { id: 9, icon: FileWarning, labelKey: "governance.gate9Label", descKey: "governance.gate9Desc", status: "OPEN" },
];

const GAPS: Array<{ id: string; descKey: string; severity: "INFO" | "WARNING" }> = [
  { id: "G1", descKey: "governance.gap1", severity: "WARNING" },
  { id: "G2", descKey: "governance.gap2", severity: "INFO" },
  { id: "G3", descKey: "governance.gap3", severity: "INFO" },
  { id: "G4", descKey: "governance.gap4", severity: "WARNING" },
  { id: "G5", descKey: "governance.gap5", severity: "INFO" },
  { id: "G6", descKey: "governance.gap6", severity: "INFO" },
  { id: "G7", descKey: "governance.gap7", severity: "WARNING" },
];

const PDPA_CHECKLIST: Array<{ itemKey: string; compliant: boolean }> = [
  { itemKey: "governance.pdpaItem1", compliant: true },
  { itemKey: "governance.pdpaItem2", compliant: true },
  { itemKey: "governance.pdpaItem3", compliant: true },
  { itemKey: "governance.pdpaItem4", compliant: true },
  { itemKey: "governance.pdpaItem5", compliant: true },
  { itemKey: "governance.pdpaItem6", compliant: true },
  { itemKey: "governance.pdpaItem7", compliant: true },
];

export function GovernanceTab() {
  const { t } = useI18n();
  const closedCount = GATES.filter((g) => g.status === "CLOSED").length;
  return (
    <div className="space-y-4 fade-in-up">
      {/* Pipeline Provenance */}
      <Card className="border-mlk/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-mlk" /> {t("governance.pipelineTitle")}
            <Badge className="ms-2 text-[9px] bg-mlk text-white border-transparent">{t("governance.gatesClosed").replace("{closed}", String(closedCount)).replace("{total}", String(GATES.length))}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {GATES.map((g) => {
              const Icon = g.icon;
              const closed = g.status === "CLOSED";
              return (
                <div key={g.id} className={`rounded-md border p-3 flex items-start gap-2 ${closed ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${closed ? "text-emerald-600" : "text-amber-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">G{g.id}</span>
                      <span className="text-xs font-semibold">{t(g.labelKey)}</span>
                      <Badge variant="outline" className={`ms-auto text-[8px] py-0 h-4 ${closed ? "border-emerald-500/40 text-emerald-600" : "border-amber-500/40 text-amber-600"}`}>
                        {closed ? (<><CheckCircle2 className="h-2 w-2 me-0.5" />{t("governance.closed")}</>) : (<><Circle className="h-2 w-2 me-0.5" />{t("governance.open")}</>)}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{t(g.descKey)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Gate 9 explanation */}
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t("governance.gate9Title")}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("governance.gate9DescP1")} <strong className="text-mlk">{t("governance.proxyTier")}</strong> {t("governance.gate9DescP2")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Honest Gaps Register */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-mlk" /> {t("governance.gapsTitle").replace("{n}", String(GAPS.length))}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-mlk pr-1">
            {GAPS.map((g) => (
              <div key={g.id} className={`rounded-md border p-2 flex items-start gap-2 ${g.severity === "WARNING" ? "border-amber-500/30 bg-amber-500/5" : "border-border/40"}`}>
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5">{g.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] leading-snug">{t(g.descKey)}</div>
                </div>
                <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${g.severity === "WARNING" ? "border-amber-500/40 text-amber-600" : "border-blue-500/40 text-blue-600"}`}>{t(g.severity === "WARNING" ? "governance.severityWarning" : "governance.severityInfo")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PDPA Compliance Checklist */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-mlk" /> {t("governance.pdpaTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PDPA_CHECKLIST.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] p-2 rounded-md border border-emerald-500/20 bg-emerald-500/5">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                <span>{t(c.itemKey)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-mlk" />
            <span>{t("governance.pdpaNote")}</span>
          </div>
        </CardContent>
      </Card>

      {/* §7.17: Data Lineage Visualization — DAG showing data flow */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-mlk" /> {t("governance.lineageTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {[
              { stageKey: "governance.lineage1Stage", descKey: "governance.lineage1Desc", status: "pending", icon: FileWarning },
              { stageKey: "governance.lineage2Stage", descKey: "governance.lineage2Desc", status: "done", icon: Cpu },
              { stageKey: "governance.lineage3Stage", descKey: "governance.lineage3Desc", status: "done", icon: Lock },
              { stageKey: "governance.lineage4Stage", descKey: "governance.lineage4Desc", status: "done", icon: FileCheck2 },
              { stageKey: "governance.lineage5Stage", descKey: "governance.lineage5Desc", status: "done", icon: Database },
              { stageKey: "governance.lineage6Stage", descKey: "governance.lineage6Desc", status: "done", icon: FileCheck2 },
              { stageKey: "governance.lineage7Stage", descKey: "governance.lineage7Desc", status: "done", icon: Eye },
            ].map((node, i) => {
              const Icon = node.icon;
              const isDone = node.status === "done";
              return (
                <div key={i} className="flex items-center gap-3">
                  {/* Connector line */}
                  {i > 0 && <div className={`w-0.5 h-4 ml-[15px] ${isDone ? "bg-emerald-500/40" : "bg-amber-500/40"}`} />}
                  {/* Node */}
                  <div className="flex items-center gap-2 flex-1 p-2 rounded-md border" style={{
                    borderColor: isDone ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                    backgroundColor: isDone ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)",
                  }}>
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isDone ? "text-emerald-600" : "text-amber-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{t(node.stageKey)}</div>
                      <div className="text-[10px] text-muted-foreground">{t(node.descKey)}</div>
                    </div>
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-2">
            <Info className="h-3 w-3 text-mlk" />
            <span>{t("governance.lineageNote")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
