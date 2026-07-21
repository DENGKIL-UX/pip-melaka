"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Database, FileSpreadsheet, GitBranch, Eye, FileCheck2, Cpu, AlertTriangle, CheckCircle2, Circle, FileWarning, Info } from "lucide-react";

const GATES: Array<{ id: number; icon: React.ComponentType<{ className?: string }>; label: string; description: string; status: "CLOSED" | "OPEN" }> = [
  { id: 1, icon: FileSpreadsheet, label: "Source contract", description: "PIP voter source contract accepted (41-field pseudonymised schema).", status: "CLOSED" },
  { id: 2, icon: GitBranch, label: "Raw extract", description: "P134 voter JSONL extracted from engine archive (71,415 records).", status: "CLOSED" },
  { id: 3, icon: Cpu, label: "Profiler run", description: "pip-voter-data-profiler v1.1.0 executed, 41 fields detected.", status: "CLOSED" },
  { id: 4, icon: Lock, label: "Cleanser run", description: "pip-voter-data-cleanser v1.1.0 with PDPA HIGHLY_SENSITIVE_FIELDS applied.", status: "CLOSED" },
  { id: 5, icon: FileCheck2, label: "Transformer run", description: "pip-voter-intelligence-transformer v1.0.0; BANGSA→KAUM2→KAUM order fixed.", status: "CLOSED" },
  { id: 6, icon: Database, label: "P134 build", description: "5 DUN + 30 DM + 368 locality intelligence artifacts generated.", status: "CLOSED" },
  { id: 7, icon: FileCheck2, label: "Manifest verified", description: "Transformation manifest run_id PVT_20260708T072822499Z verified.", status: "CLOSED" },
  { id: 8, icon: Eye, label: "Sample audit", description: "Profile completeness 99.93%, 0 duplicates, 4 review-flags (manual clean).", status: "CLOSED" },
  { id: 9, icon: FileWarning, label: "Raw SPR voter xlsx", description: "Requires raw SPR voter xlsx for full per-record cross-verification. Pending PDPA data-sharing agreement.", status: "OPEN" },
];

const GAPS: Array<{ id: string; description: string; severity: "INFO" | "WARNING" }> = [
  { id: "G1", description: "P135–P139 demographics not built (raw voter rolls pending for 5 parliaments).", severity: "WARNING" },
  { id: "G2", description: "DPT Pameran PDFs parsed via OCR; ~2% manual re-keying for 30 PDFs (Jan–May 2026).", severity: "INFO" },
  { id: "G3", description: "Election results sourced from ElectionData.my (community-maintained); SPR gazette cross-check pending.", severity: "INFO" },
  { id: "G4", description: "Ethnicity aggregation is pseudonymised (BANGSA→OTHER). True ethnicity breakdown pending re-identification.", severity: "WARNING" },
  { id: "G5", description: "DOSM Census 2020 is 6 years stale; 2026 mid-census update not yet released.", severity: "INFO" },
  { id: "G6", description: "Real-time DPT feed not wired; monthly PDF cadence only.", severity: "INFO" },
  { id: "G7", description: "Map GeoJSON uses DOSM kawasanku 2026 redelineation — boundary changes pre-GE16 not reflected in pre-2026 election data.", severity: "WARNING" },
];

const PDPA_CHECKLIST: Array<{ item: string; compliant: boolean }> = [
  { item: "No raw IC numbers stored (only SHA-256 voter_id_hash)", compliant: true },
  { item: "POSKOD, BANGSA, AGAMA marked HIGHLY_SENSITIVE in cleanser", compliant: true },
  { item: "No voter-intelligence.jsonl (77MB PDPA-restricted) shipped to public/data", compliant: true },
  { item: "Aggregated minimum cell size: 30 (DUN-level only)", compliant: true },
  { item: "Build-time only engine — no /api/engine runtime route exposes raw records", compliant: true },
  { item: "S2D console reads engine outputs as context, not raw records", compliant: true },
  { item: "Data retention: build-time artifacts only, no persistent voter store", compliant: true },
];

export function GovernanceTab() {
  const closedCount = GATES.filter((g) => g.status === "CLOSED").length;
  return (
    <div className="space-y-4 fade-in-up">
      {/* Pipeline Provenance */}
      <Card className="border-mlk/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-mlk" /> Pipeline provenance
            <Badge className="ms-2 text-[9px] bg-mlk text-white border-transparent">{closedCount}/{GATES.length} CLOSED</Badge>
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
                      <span className="text-xs font-semibold">{g.label}</span>
                      <Badge variant="outline" className={`ms-auto text-[8px] py-0 h-4 ${closed ? "border-emerald-500/40 text-emerald-600" : "border-amber-500/40 text-amber-600"}`}>
                        {closed ? (<><CheckCircle2 className="h-2 w-2 me-0.5" />CLOSED</>) : (<><Circle className="h-2 w-2 me-0.5" />OPEN</>)}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{g.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Gate 9 explanation */}
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Gate 9 — open</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Closing Gate 9 requires the raw SPR voter xlsx (per-record cross-verification against the engine-built JSONL).
              This is blocked by a PDPA Akta 709 data-sharing agreement with SPR. Until closed, all demographics are
              <strong className="text-mlk"> Proxy tier</strong> — verified at aggregate level, not per-record.
              Other PIP modules (P135–P139) also depend on Gate 9 closure for full build-out.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Honest Gaps Register */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-mlk" /> Honest gaps register ({GAPS.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-mlk pr-1">
            {GAPS.map((g) => (
              <div key={g.id} className={`rounded-md border p-2 flex items-start gap-2 ${g.severity === "WARNING" ? "border-amber-500/30 bg-amber-500/5" : "border-border/40"}`}>
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5">{g.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] leading-snug">{g.description}</div>
                </div>
                <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${g.severity === "WARNING" ? "border-amber-500/40 text-amber-600" : "border-blue-500/40 text-blue-600"}`}>{g.severity}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PDPA Compliance Checklist */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-mlk" /> PDPA Akta 709 compliance checklist</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PDPA_CHECKLIST.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] p-2 rounded-md border border-emerald-500/20 bg-emerald-500/5">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
                <span>{c.item}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-mlk" />
            <span>Personal Data Protection Act 2010 (Act 709) · Section 6 (consent), Section 7 (notice), Section 11 (disclosure). Build-time only — no runtime PII exposure.</span>
          </div>
        </CardContent>
      </Card>

      {/* §7.17: Data Lineage Visualization — DAG showing data flow */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-mlk" /> Data Lineage — Source to Display</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {[
              { stage: "SPR Voter Rolls", desc: "Raw xlsx from Suruhanjaya Pilihan Raya", status: "pending", icon: FileWarning },
              { stage: "Engine: Profiler v1.1", desc: "41-field schema detection, pseudonymisation", status: "done", icon: Cpu },
              { stage: "Engine: Cleanser v1.1", desc: "PDPA HIGHLY_SENSITIVE_FIELDS scrub", status: "done", icon: Lock },
              { stage: "Engine: Transformer v1.0", desc: "Aggregation to DUN/DM/Locality level", status: "done", icon: FileCheck2 },
              { stage: "Build: JSONL Artifacts", desc: "71,415 records → 5 DUN intelligence files", status: "done", icon: Database },
              { stage: "Build: Dashboard JSON", desc: "Static JSON served from /data/", status: "done", icon: FileCheck2 },
              { stage: "Runtime: Client Display", desc: "Aggregate-only, no PII at runtime", status: "done", icon: Eye },
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
                      <div className="text-xs font-semibold">{node.stage}</div>
                      <div className="text-[10px] text-muted-foreground">{node.desc}</div>
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
            <span>Data flows left-to-right: SPR → Engine → Build → Runtime. Gate 9 (raw SPR xlsx) is the only open step.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
