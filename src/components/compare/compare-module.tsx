"use client";

// ponytail: MLK — Parliament Comparison module.
// New feature (Phase 8 QA round): side-by-side comparison of any 2 of the 6
// parliaments across demographics, elections, DPT churn, and socioeconomics.
// Reads from /data/p{N}/dashboard-overview.json + /data/elections/melaka-elections.json
// + /data/dpt/spr-dpt-pameran-summary.json.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeftRight, Users, Vote, TrendingUp, Award, AlertTriangle, Download, Share2, Printer, Check, Twitter, MessageCircle } from "lucide-react";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { PARTY_COLORS, EVIDENCE_TIER_COLORS, ETHNICITY_COLORS } from "@/lib/party-colors";
import { CompareSkeleton } from "@/components/shared/skeletons";

interface Overview {
  parliament_code: string;
  parliament_name: string;
  district: string;
  total_voters: number;
  dun_count: number;
  dm_count: number;
  locality_count: number;
  male_voters: number;
  female_voters: number;
  senior_voters_56_plus: number;
  dominant_ethnicity_group: string;
  dominant_age_group: string;
  gender_balance_score: number;
  senior_dependency_percent: number;
  profile_completeness_score: number;
  average_cleansing_confidence: number | null;
  clean_records: number;
  clean_with_flags_records: number;
  evidence_tier: string;
}

interface ElectionsData {
  elections: Array<{
    id: string;
    name: string;
    date: string;
    parliament_results?: Array<{ parliament_code: string; winner: string; votes_pct: number; runner_up: string; margin_pct: number }>;
    parliament_summary?: Record<string, number> | null;
  }>;
}

interface DptSummary {
  per_parliament: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>;
}

function diffColor(a: number, b: number, higherIsBetter = true): string {
  const diff = b - a;
  if (Math.abs(diff) < 0.01) return "text-muted-foreground";
  if (higherIsBetter) return diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  return diff > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
}

function diffStr(a: number, b: number, unit = "", dp = 1): string {
  const diff = b - a;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(dp)}${unit}`;
}

function StatRow({
  label, valueA, valueB, unit, dp = 0, higherIsBetter = true, fmt = (v: number) => v.toLocaleString(),
}: {
  label: string; valueA: number; valueB: number; unit?: string; dp?: number; higherIsBetter?: boolean;
  fmt?: (v: number) => string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-1.5 border-b border-border/30 last:border-0">
      <div className="text-end font-mono text-sm">
        {fmt(valueA)}{unit && <span className="text-[10px] text-muted-foreground ms-0.5">{unit}</span>}
      </div>
      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`text-[10px] font-mono ${diffColor(valueA, valueB, higherIsBetter)}`}>
          {diffStr(valueA, valueB, unit, dp)}
        </span>
      </div>
      <div className="text-start font-mono text-sm">
        {fmt(valueB)}{unit && <span className="text-[10px] text-muted-foreground ms-0.5">{unit}</span>}
      </div>
    </div>
  );
}

export function CompareModule({ className }: { className?: string }) {
  // Initialize from URL params ?a=134&b=136 if present
  const [parlA, setParlA] = useState(() => {
    if (typeof window === "undefined") return "134";
    const params = new URLSearchParams(window.location.search);
    const a = params.get("a");
    return a && PARLIAMENTS.some((p) => p.code === a) ? a : "134";
  });
  const [parlB, setParlB] = useState(() => {
    if (typeof window === "undefined") return "136";
    const params = new URLSearchParams(window.location.search);
    const b = params.get("b");
    return b && PARLIAMENTS.some((p) => p.code === b) && b !== parlA ? b : "136";
  });
  const [overviewA, setOverviewA] = useState<Overview | null>(null);
  const [overviewB, setOverviewB] = useState<Overview | null>(null);
  const [elections, setElections] = useState<ElectionsData | null>(null);
  const [dpt, setDpt] = useState<DptSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const [aRes, bRes, elRes, dptRes] = await Promise.all([
          fetch(`/data/p${parlA}/dashboard-overview.json`),
          fetch(`/data/p${parlB}/dashboard-overview.json`),
          fetch(`/data/elections/melaka-elections.json`),
          fetch(`/data/dpt/spr-dpt-pameran-summary.json`),
        ]);
        setOverviewA(aRes.ok ? await aRes.json() : null);
        setOverviewB(bRes.ok ? await bRes.json() : null);
        setElections(elRes.ok ? await elRes.json() : null);
        setDpt(dptRes.ok ? await dptRes.json() : null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [parlA, parlB]);

  const ge15A = elections?.elections?.find((e) => e.id === "GE15")?.parliament_results?.find((r) => r.parliament_code === parlA);
  const ge15B = elections?.elections?.find((e) => e.id === "GE15")?.parliament_results?.find((r) => r.parliament_code === parlB);
  const ge14A = elections?.elections?.find((e) => e.id === "GE14")?.parliament_results?.find((r) => r.parliament_code === parlA);
  const ge14B = elections?.elections?.find((e) => e.id === "GE14")?.parliament_results?.find((r) => r.parliament_code === parlB);
  const dptA = dpt?.per_parliament?.find((p) => p.parliament_code === parlA);
  const dptB = dpt?.per_parliament?.find((p) => p.parliament_code === parlB);

  const aMeta = PARLIAMENTS.find((p) => p.code === parlA);
  const bMeta = PARLIAMENTS.find((p) => p.code === parlB);

  return (
    <div className={className}>
      {loading ? (
        <CompareSkeleton />
      ) : (
      <Card className="border-mlk/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-mlk" aria-hidden="true" />
            Parliament Comparison
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Side-by-side comparison of any 2 of the 6 Melaka parliaments. Pick two from the dropdowns below.
          </p>
        </CardHeader>
        <CardContent>
          {/* Selectors */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Parliament A</label>
              <Select value={parlA} onValueChange={setParlA}>
                <SelectTrigger className="w-full" aria-label="Select parliament A"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARLIAMENTS.map((p) => (
                    <SelectItem key={p.code} value={p.code} disabled={p.code === parlB}>
                      P{p.code} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pb-2">
              <ArrowLeftRight className="h-4 w-4 text-mlk" aria-hidden="true" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Parliament B</label>
              <Select value={parlB} onValueChange={setParlB}>
                <SelectTrigger className="w-full" aria-label="Select parliament B"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARLIAMENTS.map((p) => (
                    <SelectItem key={p.code} value={p.code} disabled={p.code === parlA}>
                      P{p.code} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="mb-4 bg-mlk/20" />

          {/* Headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-3">
            <div className="text-end">
              <div className="font-mono text-mlk text-sm">P{parlA}</div>
              <div className="font-semibold text-sm">{aMeta?.name}</div>
              <div className="text-[10px] text-muted-foreground">{aMeta?.district} · {aMeta?.dunCount} DUN</div>
            </div>
            <div className="flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wider">
              vs
            </div>
            <div className="text-start">
              <div className="font-mono text-mlk text-sm">P{parlB}</div>
              <div className="font-semibold text-sm">{bMeta?.name}</div>
              <div className="text-[10px] text-muted-foreground">{bMeta?.district} · {bMeta?.dunCount} DUN</div>
            </div>
          </div>

          {/* Election winners row */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-3">
            <div className="flex justify-end gap-1">
              {ge14A && (
                <Badge variant="outline" className="text-[10px]" style={{ color: PARTY_COLORS[ge14A.winner as keyof typeof PARTY_COLORS] ?? "#6B7280", borderColor: "currentColor" }}>
                  GE14: {ge14A.winner}
                </Badge>
              )}
              {ge15A && (
                <Badge variant="outline" className="text-[10px]" style={{ color: PARTY_COLORS[ge15A.winner as keyof typeof PARTY_COLORS] ?? "#6B7280", borderColor: "currentColor" }}>
                  GE15: {ge15A.winner}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-center text-[10px] text-muted-foreground">
              <Vote className="h-3 w-3" aria-hidden="true" />
            </div>
            <div className="flex gap-1">
              {ge14B && (
                <Badge variant="outline" className="text-[10px]" style={{ color: PARTY_COLORS[ge14B.winner as keyof typeof PARTY_COLORS] ?? "#6B7280", borderColor: "currentColor" }}>
                  GE14: {ge14B.winner}
                </Badge>
              )}
              {ge15B && (
                <Badge variant="outline" className="text-[10px]" style={{ color: PARTY_COLORS[ge15B.winner as keyof typeof PARTY_COLORS] ?? "#6B7280", borderColor: "currentColor" }}>
                  GE15: {ge15B.winner}
                </Badge>
              )}
            </div>
          </div>

          {/* Demographics */}
          {overviewA && overviewB && (
            <section className="mb-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-mlk uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> Demographics
              </h3>
              <div className="rounded-md border border-mlk/10 p-2">
                <StatRow label="Voters" valueA={overviewA.total_voters} valueB={overviewB.total_voters} />
                <StatRow label="DUNs" valueA={overviewA.dun_count} valueB={overviewB.dun_count} />
                <StatRow label="DMs" valueA={overviewA.dm_count} valueB={overviewB.dm_count} />
                <StatRow label="Localities" valueA={overviewA.locality_count} valueB={overviewB.locality_count} />
                <StatRow label="Male %" valueA={overviewA.male_voters / overviewA.total_voters * 100} valueB={overviewB.male_voters / overviewB.total_voters * 100} unit="%" dp={1} fmt={(v) => v.toFixed(1)} />
                <StatRow label="Female %" valueA={overviewA.female_voters / overviewA.total_voters * 100} valueB={overviewB.female_voters / overviewB.total_voters * 100} unit="%" dp={1} fmt={(v) => v.toFixed(1)} />
                <StatRow label="Senior %" valueA={overviewA.senior_dependency_percent} valueB={overviewB.senior_dependency_percent} unit="%" dp={1} fmt={(v) => v.toFixed(1)} higherIsBetter={false} />
                <StatRow label="Gender bal" valueA={overviewA.gender_balance_score} valueB={overviewB.gender_balance_score} dp={1} fmt={(v) => v.toFixed(1)} />
                <StatRow label="Completeness" valueA={overviewA.profile_completeness_score} valueB={overviewB.profile_completeness_score} unit="%" dp={2} fmt={(v) => v.toFixed(2)} />
              </div>
            </section>
          )}

          {/* DPT churn */}
          {dptA && dptB && (
            <section className="mb-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-mlk uppercase tracking-wide">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> DPT churn (5 months)
              </h3>
              <div className="rounded-md border border-mlk/10 p-2">
                <StatRow label="Additions" valueA={dptA.additions} valueB={dptB.additions} />
                <StatRow label="Deletions" valueA={dptA.deletions} valueB={dptB.deletions} higherIsBetter={false} />
                <StatRow label="Net" valueA={dptA.net} valueB={dptB.net} />
              </div>
            </section>
          )}

          {/* Dominant groups */}
          {overviewA && overviewB && (
            <section className="mb-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-mlk uppercase tracking-wide">
                <Award className="h-3.5 w-3.5" aria-hidden="true" /> Dominant groups
              </h3>
              <div className="rounded-md border border-mlk/10 p-2 space-y-1.5 text-xs">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                  <div className="text-end font-mono" style={{ color: ETHNICITY_COLORS[overviewA.dominant_ethnicity_group] ?? "#6B7280" }}>
                    {overviewA.dominant_ethnicity_group}
                  </div>
                  <div className="text-center text-muted-foreground uppercase tracking-wide text-[10px]">Ethnicity</div>
                  <div className="text-start font-mono" style={{ color: ETHNICITY_COLORS[overviewB.dominant_ethnicity_group] ?? "#6B7280" }}>
                    {overviewB.dominant_ethnicity_group}
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                  <div className="text-end font-mono">{overviewA.dominant_age_group.replace(/_/g, " ")}</div>
                  <div className="text-center text-muted-foreground uppercase tracking-wide text-[10px]">Age</div>
                  <div className="text-start font-mono">{overviewB.dominant_age_group.replace(/_/g, " ")}</div>
                </div>
              </div>
            </section>
          )}

          {/* Winner */}
          {overviewA && overviewB && (
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-mlk uppercase tracking-wide">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Verdict
              </h3>
              <div className="rounded-md border border-mlk/20 p-3 bg-mlk/5 text-xs text-center">
                {(() => {
                  const aVoters = overviewA.total_voters;
                  const bVoters = overviewB.total_voters;
                  const bigger = aVoters > bVoters ? parlA : parlB;
                  const smaller = aVoters > bVoters ? parlB : parlA;
                  const diff = Math.abs(aVoters - bVoters);
                  const pct = (diff / Math.max(aVoters, bVoters)) * 100;
                  return (
                    <>
                      <p>
                        <span className="font-mono text-mlk">P{bigger}</span> has{" "}
                        <strong>{diff.toLocaleString()} more voters</strong> ({pct.toFixed(1)}%) than{" "}
                        <span className="font-mono text-mlk">P{smaller}</span>.
                      </p>
                      {ge15A && ge15B && ge15A.winner !== ge15B.winner && (
                        <p className="mt-1.5 text-muted-foreground">
                          They also diverged in GE15: P{parlA} → {ge15A.winner}, P{parlB} → {ge15B.winner}.
                        </p>
                      )}
                      {ge15A && ge15B && ge15A.winner === ge15B.winner && (
                        <p className="mt-1.5 text-muted-foreground">
                          Both went to {ge15A.winner} in GE15.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setParlA(parlB); setParlB(parlA); }}
                  className="text-mlk border-mlk/40 hover:bg-mlk/10"
                  aria-label="Swap A and B"
                >
                  <ArrowLeftRight className="h-3 w-3 me-1" aria-hidden="true" /> Swap A ↔ B
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Copy shareable URL to clipboard with visual feedback
                    const url = new URL(window.location.href);
                    url.searchParams.set("a", parlA);
                    url.searchParams.set("b", parlB);
                    try {
                      navigator.clipboard?.writeText(url.toString());
                      setUrlCopied(true);
                      setTimeout(() => setUrlCopied(false), 1500);
                    } catch {
                      // clipboard blocked — silently ignore
                    }
                  }}
                  className="text-mlk border-mlk/40 hover:bg-mlk/10"
                  aria-label="Copy shareable URL"
                >
                  {urlCopied ? (
                    <><Check className="h-3 w-3 me-1 text-emerald-500" aria-hidden="true" /> Copied!</>
                  ) : (
                    <><Share2 className="h-3 w-3 me-1" aria-hidden="true" /> Copy URL</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!overviewA || !overviewB) return;
                    const text = `PIP-MLK Compare: P${parlA} ${aMeta?.name ?? ""} vs P${parlB} ${bMeta?.name ?? ""} — ${overviewB.total_voters - overviewA.total_voters >= 0 ? "+" : ""}${(overviewB.total_voters - overviewA.total_voters).toLocaleString()} voters difference. Truth Above All.`;
                    const url = new URL(window.location.href);
                    url.searchParams.set("a", parlA);
                    url.searchParams.set("b", parlB);
                    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url.toString())}`;
                    window.open(tweetUrl, "_blank", "noopener,noreferrer,width=600,height=500");
                  }}
                  className="text-mlk border-mlk/40 hover:bg-mlk/10"
                  aria-label="Share comparison on Twitter/X"
                  title="Share on Twitter/X"
                >
                  <Twitter className="h-3 w-3 me-1" aria-hidden="true" /> Tweet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!overviewA || !overviewB) return;
                    const text = `PIP-MLK Compare: P${parlA} ${aMeta?.name ?? ""} vs P${parlB} ${bMeta?.name ?? ""} — voters: ${overviewA.total_voters.toLocaleString()} vs ${overviewB.total_voters.toLocaleString()}. Truth Above All.`;
                    const url = new URL(window.location.href);
                    url.searchParams.set("a", parlA);
                    url.searchParams.set("b", parlB);
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url.toString())}`;
                    window.open(waUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="text-mlk border-mlk/40 hover:bg-mlk/10"
                  aria-label="Share comparison on WhatsApp"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="h-3 w-3 me-1" aria-hidden="true" /> WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!overviewA || !overviewB) return;
                    const rows = [
                      ["Metric", `P${parlA} ${aMeta?.name ?? ""}`, `P${parlB} ${bMeta?.name ?? ""}`, "Diff"],
                      ["District", aMeta?.district ?? "", bMeta?.district ?? "", ""],
                      ["DUN count", String(overviewA.dun_count), String(overviewB.dun_count), String(overviewB.dun_count - overviewA.dun_count)],
                      ["Total voters", String(overviewA.total_voters), String(overviewB.total_voters), String(overviewB.total_voters - overviewA.total_voters)],
                      ["Male voters", String(overviewA.male_voters), String(overviewB.male_voters), String(overviewB.male_voters - overviewA.male_voters)],
                      ["Female voters", String(overviewA.female_voters), String(overviewB.female_voters), String(overviewB.female_voters - overviewA.female_voters)],
                      ["Senior voters 56+", String(overviewA.senior_voters_56_plus), String(overviewB.senior_voters_56_plus), String(overviewB.senior_voters_56_plus - overviewA.senior_voters_56_plus)],
                      ["Senior dependency %", overviewA.senior_dependency_percent.toFixed(2), overviewB.senior_dependency_percent.toFixed(2), (overviewB.senior_dependency_percent - overviewA.senior_dependency_percent).toFixed(2)],
                      ["Gender balance score", overviewA.gender_balance_score.toFixed(2), overviewB.gender_balance_score.toFixed(2), (overviewB.gender_balance_score - overviewA.gender_balance_score).toFixed(2)],
                      ["Profile completeness %", overviewA.profile_completeness_score.toFixed(4), overviewB.profile_completeness_score.toFixed(4), ""],
                      ["Dominant ethnicity", overviewA.dominant_ethnicity_group, overviewB.dominant_ethnicity_group, ""],
                      ["Dominant age group", overviewA.dominant_age_group, overviewB.dominant_age_group, ""],
                      ["GE14 winner", ge14A?.winner ?? "", ge14B?.winner ?? "", ""],
                      ["GE15 winner", ge15A?.winner ?? "", ge15B?.winner ?? "", ""],
                      ["DPT additions (5mo)", String(dptA?.additions ?? 0), String(dptB?.additions ?? 0), String((dptB?.additions ?? 0) - (dptA?.additions ?? 0))],
                      ["DPT deletions (5mo)", String(dptA?.deletions ?? 0), String(dptB?.deletions ?? 0), String((dptB?.deletions ?? 0) - (dptA?.deletions ?? 0))],
                      ["DPT net (5mo)", String(dptA?.net ?? 0), String(dptB?.net ?? 0), String((dptB?.net ?? 0) - (dptA?.net ?? 0))],
                    ];
                    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `pip-mlk-compare-P${parlA}-vs-P${parlB}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-mlk border-mlk/40 hover:bg-mlk/10"
                  aria-label="Export comparison as CSV"
                >
                  <Download className="h-3 w-3 me-1" aria-hidden="true" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-mlk border-mlk/40 hover:bg-mlk/10"
                  aria-label="Print comparison"
                >
                  <Printer className="h-3 w-3 me-1" aria-hidden="true" /> Print
                </Button>
              </div>
            </section>
          )}

          {/* Methodology */}
          {overviewA && overviewB && (
            <section className="mt-6">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-mlk uppercase tracking-wide">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Methodology & Evidence Tiers
              </h3>
              <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs space-y-2">
                <p>
                  <strong>Diff computation:</strong> Diff = Parliament B − Parliament A. Positive values (green) mean B is higher; negative (red) means B is lower.
                  For metrics where lower is better (senior dependency, deletions), the color logic is inverted.
                </p>
                <p>
                  <strong>Evidence tiers:</strong> Demographics data is tagged{" "}
                  <span className="font-mono text-amber-600 dark:text-amber-400">Proxy</span> until the 9-gate engine pipeline provenance protocol closes (currently 8/9 — gate 9 audit pending user-provided raw voter xlsx). Election results from ElectionData.my are{" "}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Verified</span>. DPT data from SPR Pameran PDFs is{" "}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Verified</span>.
                </p>
                <p>
                  <strong>Sources:</strong> Demographics from build-time engine pipeline (5 aggregate JSONLs per parliament). Elections from ElectionData.my (community-maintained, sourced from SPR gazettes). DPT from SPR DPT Pameran PDFs (Jan–May 2026, 30 PDFs total).
                </p>
                <p className="text-muted-foreground">
                  <strong>Note:</strong> Profile completeness is stored as a 0–1 fraction in the engine JSONL (e.g. 0.995 = 99.5%). The CSV export preserves the raw value; the dashboard displays it as a percentage.
                </p>
              </div>
            </section>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
