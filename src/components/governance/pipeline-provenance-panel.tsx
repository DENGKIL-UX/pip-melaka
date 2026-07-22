"use client";

// ponytail: MLK — Pipeline Provenance panel (Governance tab).
//
// Implements WORKLOAD.md Phase 7 §7.8 + Phase 8 §8.5 + DESIGN.md §5.3 +
// ENGINE-INTEGRATION.md §9 (9-gate provenance protocol).
//
// STATIC DISPLAY — NOT a focus-trapped dialog (per DESIGN.md §8.2). Users
// navigate with normal Tab/Shift+Tab. No dialog semantics, no aria-modal, no
// focus-restoration on close.
//
// Renders all 9 gates' status as read-only cards:
//   Gate 1: source_archive_sha256  — first 16 chars + verified badge
//   Gate 2: script_versions        — profiler/cleanser/transformer/orchestrator
//   Gate 3: runtime                — Node/Python/pandas/openpyxl
//   Gate 4: entry_points           — 3 CLI invocations (collapsed <pre>)
//   Gate 5: salt_rotated + salt_sha256 — rotated + first 16 chars of salt hash
//   Gate 6: ethnicity_bug_fixed    — ✅ + the diff
//   Gate 7: privacy_regression_fixed — ✅ + 7 added fields list
//   Gate 8: orchestrator_present   — ✅ + path (196 lines)
//   Gate 9: audit_passed           — ⏳ pending + note about raw xlsx
//
// Top summary banner: 8/9 gates closed + overall verified: false (red badge)
// + the gate 9 caveat.
//
// Source JSON is a static server-side import (`src/data/pipeline-provenance.json`).

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import provenance from "@/data/pipeline-provenance.json";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-1";

// Expected source-archive SHA-256 (per ENGINE-INTEGRATION.md §9 gate 1 spec).
const EXPECTED_ARCHIVE_SHA =
  "65623e788d1de0c2678e0f964fbbb35fcad762440000fd2f17573b68da64c69b";

interface GateCardProps {
  /** Gate number 1-9. */
  number: number;
  /** Short gate name e.g. "Archive SHA-256". */
  title: string;
  /** ✅ closed or ⏳ pending. */
  closed: boolean;
  /** Long-form description / what this gate verifies. */
  description: string;
  /** Optional small status badge label override (default "Closed"/"Pending"). */
  statusLabel?: string;
  /** Card body — typically a <pre> or list. */
  children?: React.ReactNode;
}

function GateCard({
  number,
  title,
  closed,
  description,
  statusLabel,
  children,
}: GateCardProps) {
  return (
    <Card
      role="group"
      aria-label={`Gate ${number}: ${title} — ${closed ? "closed" : "pending"}`}
      className={cn(
        "border-slate-200 dark:border-slate-800",
        closed ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-hidden
            >
              {number}
            </span>
            <div>
              <CardTitle className="text-sm font-semibold leading-tight">
                {title}
              </CardTitle>
              <CardDescription className="mt-0.5 text-[11px]">
                {description}
              </CardDescription>
            </div>
          </div>
          <Badge
            className={cn(
              "border-transparent text-[10px] text-white",
              closed ? "bg-emerald-600" : "bg-amber-500"
            )}
            aria-label={`Gate ${number} status: ${statusLabel ?? (closed ? "closed" : "pending")}`}
          >
            {closed ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            ) : (
              <Clock className="h-3 w-3" aria-hidden />
            )}
            {statusLabel ?? (closed ? "Closed" : "Pending")}
          </Badge>
        </div>
      </CardHeader>
      {children ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}

function PreBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre
        className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        aria-label={label}
      >
        {children}
      </pre>
    </div>
  );
}

export interface PipelineProvenancePanelProps {
  className?: string;
}

export function PipelineProvenancePanel({
  className,
}: PipelineProvenancePanelProps) {
  const p = provenance as typeof import("@/data/pipeline-provenance.json");
  const archiveSha = p.source_archive_sha256;
  const archiveShort = archiveSha.slice(0, 16) + "…";
  const archiveMatches = archiveSha === EXPECTED_ARCHIVE_SHA;

  const saltSha = p.salt_sha256;
  const saltShort = saltSha.slice(0, 16) + "…";

  const gates = p.gates_summary;
  const closedCount = gates.closed;
  const totalCount = gates.total;
  const verified = p.verified;

  // The 7 added fields for gate 7 — per the JSON's privacy_regression_fix_location.
  const privacyAddedFields = [
    "NO_RUMAH",
    "ALAMAT1",
    "ALAMAT2",
    "ALAMAT3",
    "POSKOD",
    "BANGSA",
    "AGAMA",
  ];

  return (
    <Card
      className={cn("border-slate-200 dark:border-slate-800", className)}
      role="region"
      aria-label="Pipeline provenance panel — 9-gate static display"
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#C77B2C]" aria-hidden />
          <div>
            <CardTitle className="text-base sm:text-lg">
              Pipeline Provenance · 9-Gate Protocol
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Static display (not a focus-trapped dialog). Per ENGINE-INTEGRATION.md
              §9 + DESIGN.md §5.3. The engine is build-time only — there is NO{" "}
              <code>/api/engine</code> route.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary banner */}
        <div
          role="status"
          aria-label={`Pipeline provenance: ${closedCount} of ${totalCount} gates closed. Overall verified: ${verified ? "true" : "false"}.`}
          className={cn(
            "mb-4 flex flex-wrap items-center gap-3 rounded-md border p-3",
            verified
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-red-500/40 bg-red-500/10"
          )}
        >
          <div className="flex items-center gap-2">
            {verified ? (
              <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-700 dark:text-red-300" aria-hidden />
            )}
            <span className="text-sm font-semibold">
              {closedCount} / {totalCount} gates closed
            </span>
          </div>
          <Badge
            className={cn(
              "border-transparent text-[10px] text-white",
              verified ? "bg-emerald-600" : "bg-red-600"
            )}
            aria-label={`Overall verified: ${verified}`}
          >
            verified: {String(verified)}
          </Badge>
          {p.generated_at ? (
            <span className="text-[11px] text-muted-foreground">
              last regenerated {new Date(p.generated_at).toLocaleString()}
            </span>
          ) : null}
          <p className="basis-full text-[11px] text-muted-foreground">
            {verified
              ? "All 9 provenance gates pass — engine outputs ship as Verified evidence tier."
              : "Gate 9 (audit against ground-truth raw xlsx) is pending. All engine outputs ship as Proxy evidence tier until then — per ENGINE-INTEGRATION.md §6.5 rule 3."}
          </p>
        </div>

        {/* 9 gate cards */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Gate 1 — Archive SHA-256 */}
          <GateCard
            number={1}
            title="Source archive SHA-256"
            closed={gates.gate_1_archive_sha256}
            description="Source xlsx archive hash matches expected value."
          >
            <PreBlock label="source_archive_sha256 (first 16 chars)">
              {archiveShort}
              {"\n"}
              {archiveMatches
                ? "// matches expected hash ✅"
                : "// MISMATCH — expected " + EXPECTED_ARCHIVE_SHA.slice(0, 16) + "…"}
            </PreBlock>
          </GateCard>

          {/* Gate 2 — Script versions */}
          <GateCard
            number={2}
            title="Engine script versions"
            closed={gates.gate_2_script_versions}
            description="profiler / cleanser / transformer / orchestrator versions recorded."
          >
            <PreBlock label="script_versions">
              {`profiler:      ${p.script_versions.profiler}`}
              {"\n"}
              {`cleanser:      ${p.script_versions.cleanser}`}
              {"\n"}
              {`transformer:   ${p.script_versions.transformer}`}
              {"\n"}
              {`orchestrator:  ${p.script_versions.orchestrator}`}
            </PreBlock>
          </GateCard>

          {/* Gate 3 — Runtime */}
          <GateCard
            number={3}
            title="Runtime recorded"
            closed={gates.gate_3_runtime}
            description="Node + Python + pandas + openpyxl versions captured."
          >
            <PreBlock label="runtime">
              {`node:      ${p.runtime.node}`}
              {"\n"}
              {`python:    ${p.runtime.python}`}
              {"\n"}
              {`pandas:    ${p.runtime.pandas}`}
              {"\n"}
              {`openpyxl:  ${p.runtime.openpyxl}`}
            </PreBlock>
          </GateCard>

          {/* Gate 4 — Entry points */}
          <GateCard
            number={4}
            title="Entry points (3 CLI invocations)"
            closed={gates.gate_4_entry_points}
            description="Profiler / cleanser / transformer CLI invocations recorded."
          >
            <Accordion type="single" collapsible>
              <AccordionItem value="entry-points" className="border-b-0">
                <AccordionTrigger
                  className={cn(
                    "min-h-[44px] rounded-md px-2 text-xs hover:no-underline",
                    FOCUS_RING
                  )}
                  aria-label="Expand entry points list"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    Show 3 CLI invocations
                    <ChevronDown
                      className="ml-1 h-3 w-3 text-muted-foreground"
                      aria-hidden
                    />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <PreBlock label="entry_points">
                    {p.entry_points.join("\n\n")}
                  </PreBlock>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </GateCard>

          {/* Gate 5 — Salt rotation */}
          <GateCard
            number={5}
            title="Hash salt rotated"
            closed={gates.gate_5_salt_rotated}
            description="Old exposed salt (9fad3e8f…) is dead; new salt stored as Cloudflare secret."
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Badge
                  className="border-transparent bg-emerald-600 text-[10px] text-white"
                  aria-label="Salt rotated"
                >
                  <CheckCircle2 className="h-3 w-3" aria-hidden /> rotated
                </Badge>
                <Badge
                  className="border-transparent bg-emerald-700 text-[10px] text-white"
                  aria-label="Exposed salt dead"
                >
                  <Lock className="h-3 w-3" aria-hidden /> exposed salt dead
                </Badge>
              </div>
              <PreBlock label="salt_sha256 (first 16 chars)">
                {saltShort}
                {"\n// sha256(new salt) — secret itself is in Cloudflare, not in repo"}
              </PreBlock>
            </div>
          </GateCard>

          {/* Gate 6 — Ethnicity bug fix */}
          <GateCard
            number={6}
            title="Ethnicity bug fixed"
            closed={gates.gate_6_ethnicity_bug_fixed}
            description="Transformer normalizeEthnicity() field list reordered (Bug A)."
          >
            <div className="flex items-center gap-2 text-xs">
              <Badge
                className="border-transparent bg-emerald-600 text-[10px] text-white"
                aria-label="Bug fixed"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden /> ✅ Fixed
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                transformer v1.0 line 170
              </span>
            </div>
            <Separator className="my-2" />
            <PreBlock label="diff — field list reorder">
              {`- normalizeEthnicity(record, ["KAUM2", "KAUM", "BANGSA"])`}
              {"\n"}
              {`+ normalizeEthnicity(record, ["BANGSA", "KAUM2", "KAUM"])`}
            </PreBlock>
          </GateCard>

          {/* Gate 7 — Privacy regression fix */}
          <GateCard
            number={7}
            title="Privacy regression fixed"
            closed={gates.gate_7_privacy_regression_fixed}
            description="Cleanser PRIVACY_REMOVED_FIELDS extended with 7 fields (Bug B)."
          >
            <div className="flex items-center gap-2 text-xs">
              <Badge
                className="border-transparent bg-emerald-600 text-[10px] text-white"
                aria-label="Privacy regression fixed"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden /> ✅ Fixed
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                count 8 → 15
              </span>
            </div>
            <Separator className="my-2" />
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              7 added fields
            </p>
            <ul
              className="flex flex-wrap gap-1"
              aria-label="7 added privacy fields"
            >
              {privacyAddedFields.map((f) => (
                <li key={f}>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
                  >
                    {f}
                  </Badge>
                </li>
              ))}
            </ul>
          </GateCard>

          {/* Gate 8 — Orchestrator present */}
          <GateCard
            number={8}
            title="Orchestrator present"
            closed={gates.gate_8_orchestrator_present}
            description="End-to-end pipeline driver script exists and runs for P134."
          >
            <div className="flex items-center gap-2 text-xs">
              <Badge
                className="border-transparent bg-emerald-600 text-[10px] text-white"
                aria-label="Orchestrator present"
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden /> ✅ Present
              </Badge>
              <span className="font-mono text-[11px] text-muted-foreground">
                {p.orchestrator_path} ({p.orchestrator_lines} lines)
              </span>
            </div>
          </GateCard>

          {/* Gate 9 — Audit passed */}
          <GateCard
            number={9}
            title="Audit ≥3 pipeline outputs"
            closed={gates.gate_9_audit_passed}
            statusLabel="Pending"
            description="Ground-truth verification of 3+ locality records against raw SPR voter xlsx."
          >
            <div className="flex items-center gap-2 text-xs">
              <Badge
                className="border-transparent bg-amber-500 text-[10px] text-white"
                aria-label="Audit pending"
              >
                <Clock className="h-3 w-3" aria-hidden /> ⏳ Pending
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                0 samples audited
              </span>
            </div>
            <Separator className="my-2" />
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden />
              {p.audit_note}
            </p>
          </GateCard>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Source: <code>src/data/pipeline-provenance.json</code>. Generated by{" "}
          {p.generated_by}. Per DESIGN.md §8.2, this panel is a static display —
          normal Tab/Shift+Tab navigation, no focus trap, no dialog semantics.
        </p>
      </CardContent>
    </Card>
  );
}

export default PipelineProvenancePanel;
