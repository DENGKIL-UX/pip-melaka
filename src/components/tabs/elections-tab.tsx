"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Vote, Calendar, Trophy, WifiOff, TrendingUp, TrendingDown, Minus, ArrowRight, Users2, Info, Grid3x3, History, User, Database, Search, Code, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine, LineChart, Line } from "recharts";
import { PARLIAMENTS, getDunName } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";
import { ELECTIONS_FALLBACK } from "@/lib/fallback-data";
import { PARTIES, COALITIONS, partyLogoUrl, coalitionLogoUrl, type PartyCode, type CoalitionCode } from "@/lib/party-metadata";
import { PartyLogo, CoalitionBadge } from "@/components/shared/party-logo";
import { Segmented } from "@/components/ui/segmented";
import { PartyTag, CheckableTag, StatusTag, CoalitionFilterBar } from "@/components/ui/party-tag";
import { CandidateHistoryDialog } from "@/components/shared/candidate-history-dialog";

interface Election {
  id: string; name: string; date: string; headline_fact: string;
  parliament_summary: { PH: number; BN: number; PN: number; total: number } | null;
  dun_summary: { PH: number; BN: number; PN: number; total: number } | null;
  parliament_results: Array<{
    parliament_code: string; winner: "PH" | "BN" | "PN";
    winner_party?: string; runner_up_party?: string | null;
    votes_pct: number; runner_up: string; margin_pct: number;
  }>;
  dun_results: Array<{
    parliament_code: string; dun_code: string; dun_name?: string; winner: "PH" | "BN" | "PN";
    winner_party?: string; winner_candidate?: string; winner_votes?: number;
    votes_pct?: number; runner_up?: string; runner_up_party?: string | null;
    runner_up_candidate?: string; runner_up_votes?: number;
    margin_pct?: number; vote_share: Record<string, number>;
  }>;
  party_breakdown?: Record<string, number>;
  current_dun_composition?: Array<{
    parliament_code: string; dun_code: string; winner: "PH" | "BN" | "PN";
    winner_party?: string; vote_share: Record<string, number>;
  }>;
  dun_context_note?: string;
}

function partyHex(p: string) { return PARTY_COLORS[p as keyof typeof PARTY_COLORS] ?? PARTY_COLORS.OTH; }

function SeatCount({ summary }: { summary: { PH: number; BN: number; PN: number; total: number } | null }) {
  if (!summary) return null;
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {(["BN", "PH", "PN"] as const).map((p) => summary[p] > 0 && (
        <PartyTag key={p} coalition={p as CoalitionCode} size="sm">
          {p} {summary[p]}
        </PartyTag>
      ))}
      <span className="text-[10px] text-muted-foreground">/ {summary.total}</span>
    </div>
  );
}

function marginTier(margin: number): { label: "MARGINAL" | "COMPETITIVE" | "SAFE"; color: string; bg: string } {
  if (margin < 5) return { label: "MARGINAL", color: "#dc2626", bg: "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300" };
  if (margin < 10) return { label: "COMPETITIVE", color: "#d97706", bg: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300" };
  return { label: "SAFE", color: "#16a34a", bg: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" };
}

/**
 * PartyBreakdownCard — shows which PARTIES won seats, grouped by coalition.
 *
 * This is the key enhancement: previously the tab only showed coalition-level
 * results (BN/PH/PN). Now it shows the component parties (UMNO, DAP, PAS, etc.)
 * with their ElectionData.my logos, grouped under their parent coalition.
 */
function PartyBreakdownCard({ el }: { el: Election }) {
  const breakdown = el.party_breakdown ?? {};
  const hasPartyData = Object.keys(breakdown).length > 0;

  if (!hasPartyData) {
    return (
      <Card className="border-mlk/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          No party-level breakdown available for this election.
        </CardContent>
      </Card>
    );
  }

  // Group parties by coalition
  const coalitions: CoalitionCode[] = ["BN", "PH", "PN", "BEBAS"];
  const totalSeats = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <Card className="border-mlk/20 bg-mlk-radial">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users2 className="h-4 w-4 text-mlk" />
          Party breakdown — component parties that won seats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {coalitions.map((coal) => {
          const coalMeta = COALITIONS[coal];
          const memberParties = coalMeta.memberParties;
          // Show parties from this coalition that actually won seats
          const wonParties = memberParties.filter((p) => breakdown[p] > 0);
          if (wonParties.length === 0) return null;

          const coalSeats = wonParties.reduce((s, p) => s + (breakdown[p] ?? 0), 0);
          const coalPct = totalSeats > 0 ? (coalSeats / totalSeats) * 100 : 0;

          return (
            <div key={coal} className="rounded-lg border border-mlk/10 bg-card/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CoalitionBadge coalition={coal} size="sm" showLogo />
                  <span className="text-xs text-muted-foreground">{coalMeta.fullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{coalSeats}</span>
                  <span className="text-[10px] text-muted-foreground">seats · {coalPct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {wonParties.map((partyCode) => {
                  const partyMeta = PARTIES[partyCode];
                  const seats = breakdown[partyCode] ?? 0;
                  const seatPct = coalSeats > 0 ? (seats / coalSeats) * 100 : 0;
                  return (
                    <div
                      key={partyCode}
                      className="flex items-center gap-2 rounded-md border border-border/40 bg-background/60 p-2"
                    >
                      <PartyLogo party={partyCode} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{partyMeta.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{partyMeta.fullName}</div>
                      </div>
                      <div className="text-end">
                        <div className="font-mono text-sm font-bold">{seats}</div>
                        <div className="text-[8px] text-muted-foreground">{seatPct.toFixed(0)}% of {coal}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="text-[9px] text-muted-foreground italic flex items-start gap-1">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <span>
            Real per-candidate data from ElectionData.MY data lake (<code className="font-mono">lake.electiondata.my/results_headline/</code>).
            Party and coalition UIDs are verbatim from the MECo dataset (Thevananthan, T. 2025).
            Logos from <code className="font-mono">electiondata.my/parties/&#123;uid&#125;/png</code>.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compute DUN margin from vote_share (for GE14 DUN results that don't have margin_pct).
 * margin = (winner_vote_share - runner_up_vote_share) * 100
 */
function computeDunMargin(vote_share: Record<string, number>): number {
  const sorted = Object.entries(vote_share)
    .filter(([k]) => k !== "OTH" && k !== "ALONE")
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length < 2) return sorted[0]?.[1] ? sorted[0][1] * 100 : 0;
  return (sorted[0][1] - sorted[1][1]) * 100;
}

/**
 * Get the winner's vote % from vote_share (largest share).
 */
function winnerVotePct(vote_share: Record<string, number>): number {
  const sorted = Object.entries(vote_share)
    .filter(([k]) => k !== "OTH" && k !== "ALONE")
    .sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[1] ? sorted[0][1] * 100 : 0;
}

function SwingAnalysis({ elections, onSelectCandidate }: { elections: Election[]; onSelectCandidate: (name: string) => void }) {
  const [view, setView] = useState<"parliament" | "dun">("parliament");
  const ge14 = elections.find((e) => e.id === "GE14");
  const ge15 = elections.find((e) => e.id === "GE15");
  const prn15 = elections.find((e) => e.id === "PRN15");

  // === Parliament swing (GE14 → GE15) ===
  const parlRows = (() => {
    if (!ge14 || !ge15 || ge14.parliament_results.length === 0 || ge15.parliament_results.length === 0) return [];
    return PARLIAMENTS.map((p) => {
      const r14 = ge14.parliament_results.find((r) => r.parliament_code === p.code);
      const r15 = ge15.parliament_results.find((r) => r.parliament_code === p.code);
      if (!r14 || !r15) return null;
      const winnerChanged = r14.winner !== r15.winner;
      const marginDelta = r15.margin_pct - r14.margin_pct;
      const tier = marginTier(r15.margin_pct);
      return {
        code: p.code,
        name: p.name,
        winner14: r14.winner,
        winner15: r15.winner,
        winnerParty14: r14.winner_party,
        winnerParty15: r15.winner_party,
        winnerCandidate14: (r14 as { winner_candidate?: string }).winner_candidate,
        winnerCandidate15: (r15 as { winner_candidate?: string }).winner_candidate,
        winnerChanged,
        votes14: r14.votes_pct,
        votes15: r15.votes_pct,
        margin14: r14.margin_pct,
        margin15: r15.margin_pct,
        marginDelta,
        tier,
      };
    }).filter(Boolean) as Array<{
      code: string; name: string; winner14: string; winner15: string;
      winnerParty14?: string; winnerParty15?: string;
      winnerCandidate14?: string; winnerCandidate15?: string;
      winnerChanged: boolean;
      votes14: number; votes15: number; margin14: number; margin15: number; marginDelta: number;
      tier: { label: string; color: string; bg: string };
    }>;
  })();

  // === DUN swing (GE14 DUN → PRN15 DUN) ===
  const dunRows = (() => {
    if (!ge14 || !prn15 || ge14.dun_results.length === 0 || prn15.dun_results.length === 0) return [];
    return PARLIAMENTS.flatMap((p) =>
      p.dunCodes.map((dc) => {
        const r14 = ge14.dun_results.find((d) => d.dun_code === dc);
        const r15 = prn15.dun_results.find((d) => d.dun_code === dc);
        if (!r14 || !r15) return null;
        const winnerChanged = r14.winner !== r15.winner;
        const margin14 = r14.margin_pct ?? computeDunMargin(r14.vote_share);
        const margin15 = r15.margin_pct ?? computeDunMargin(r15.vote_share);
        const marginDelta = margin15 - margin14;
        const tier = marginTier(margin15);
        return {
          parliamentCode: p.code,
          dunCode: dc,
          dunName: r14.dun_name ?? getDunName(p.code, dc),
          winner14: r14.winner,
          winner15: r15.winner,
          winnerParty14: r14.winner_party,
          winnerParty15: r15.winner_party,
          winnerCandidate14: r14.winner_candidate,
          winnerCandidate15: r15.winner_candidate,
          winnerChanged,
          votes14: r14.votes_pct ?? winnerVotePct(r14.vote_share),
          votes15: r15.votes_pct ?? winnerVotePct(r15.vote_share),
          margin14,
          margin15,
          marginDelta,
          tier,
        };
      })
    ).filter(Boolean) as Array<{
      parliamentCode: string; dunCode: string; dunName: string;
      winner14: string; winner15: string;
      winnerParty14?: string; winnerParty15?: string;
      winnerCandidate14?: string; winnerCandidate15?: string;
      winnerChanged: boolean;
      votes14: number; votes15: number; margin14: number; margin15: number; marginDelta: number;
      tier: { label: string; color: string; bg: string };
    }>;
  })();

  const rows = view === "parliament" ? parlRows : dunRows;
  const totalSeats = view === "parliament" ? 6 : 28;
  const fromLabel = view === "parliament" ? "GE14 (2018)" : "GE14 DUN (2018)";
  const toLabel = view === "parliament" ? "GE15 (2022)" : "PRN15 (2021)";

  const dumbbellData = rows.map((r) => ({
    name: view === "parliament" ? r.name : r.dunName,
    ge14: r.votes14,
    ge15: r.votes15,
    winner15: r.winner15,
  }));

  const scatterData = rows.map((r) => ({
    name: view === "parliament" ? `P${r.code} ${r.name}` : `N${r.dunCode} ${r.dunName}`,
    x: r.margin14,
    y: r.margin15,
    z: 100,
    fill: partyHex(r.winner15),
  }));

  const flips = rows.filter((r) => r.winnerChanged);
  const marginalCount = rows.filter((r) => r.tier.label === "MARGINAL").length;
  const competitiveCount = rows.filter((r) => r.tier.label === "COMPETITIVE").length;
  const safeCount = rows.filter((r) => r.tier.label === "SAFE").length;

  const headlineText = view === "parliament"
    ? "Between GE14 and GE15, Melaka's 6 parliamentary seats swung dramatically from PH (4 seats) to a PN/PH tie (3 each). BN collapsed from 2 seats to 0."
    : "Between GE14 (2018 state) and PRN15 (2021 snap election), Melaka's 28 DUN seats swung heavily back to BN. BN went from 13 to 21 seats — a landslide recovery. PH collapsed from 15 to 5. PN entered with 2 seats.";

  return (
    <div className="space-y-3 fade-in-up">
      {/* View toggle — Segmented control */}
      <Segmented
        value={view}
        onChange={(v) => setView(v)}
        options={[
          { value: "parliament" as const, label: "Parliament (6 seats)" },
          { value: "dun" as const, label: "DUN (28 seats)" },
        ]}
      />

      <Card className="border-mlk/30 bg-mlk-radial">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-mlk" />
            <span className="text-xs font-mono text-muted-foreground">{fromLabel} → {toLabel}</span>
            <Badge className="text-[9px] bg-mlk text-white border-transparent ms-auto">{view === "parliament" ? "PARLIAMENT SWING" : "DUN SWING"}</Badge>
          </div>
          <div className="text-sm font-medium leading-snug mb-3">
            {headlineText}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border border-mlk/20 bg-background/60 p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Seat Flips</div>
              <div className="text-lg font-bold text-mlk">{flips.length}<span className="text-[10px] text-muted-foreground"> / {totalSeats}</span></div>
              <div className="text-[9px] text-muted-foreground">winner changed</div>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Marginal</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-300">{marginalCount}<span className="text-[10px] text-muted-foreground"> / {totalSeats}</span></div>
              <div className="text-[9px] text-muted-foreground">margin &lt;5%</div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Competitive</div>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{competitiveCount}<span className="text-[10px] text-muted-foreground"> / {totalSeats}</span></div>
              <div className="text-[9px] text-muted-foreground">margin 5–10%</div>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Safe</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{safeCount}<span className="text-[10px] text-muted-foreground"> / {totalSeats}</span></div>
              <div className="text-[9px] text-muted-foreground">margin &gt;10%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-mlk" /> Vote % shift: {fromLabel} → {toLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 24, bottom: 28, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={`${fromLabel} margin %`}
                  domain={[0, view === "parliament" ? 14 : 50]}
                  tick={{ fontSize: 10 }}
                  label={{ value: `${fromLabel} margin %`, position: "insideBottom", offset: -16, style: { fontSize: 10, fill: "currentColor" } }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={`${toLabel} margin %`}
                  domain={[0, view === "parliament" ? 10 : 50]}
                  tick={{ fontSize: 10 }}
                  label={{ value: `${toLabel} margin %`, angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "currentColor" } }}
                />
                <ZAxis type="number" dataKey="z" range={[view === "parliament" ? 200 : 80, view === "parliament" ? 200 : 80]} />
                <ReferenceLine y={5} stroke="#dc2626" strokeDasharray="4 2" strokeOpacity={0.4} label={{ value: "marginal", fontSize: 9, fill: "#dc2626", position: "insideTopRight" }} />
                <ReferenceLine x={5} stroke="#dc2626" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ fontSize: 11 }}
                  formatter={(v: number, k: string) => [`${v.toFixed(1)}%`, k === "x" ? `${fromLabel} margin` : k === "y" ? `${toLabel} margin` : k]}
                  labelFormatter={() => ""}
                />
                <Scatter data={scatterData} fill="#C77B2C">
                  {scatterData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[9px] text-muted-foreground text-center mt-1">
            Each dot = 1 {view === "parliament" ? "parliament" : "DUN"} · colour = {toLabel} winner · top-left = safe in both elections · bottom-right = tightened
          </div>
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Winner&apos;s vote % — {fromLabel} vs {toLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={view === "dun" ? "h-96" : "h-64"}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dumbbellData} margin={{ top: 4, right: 8, bottom: view === "dun" ? 60 : 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: view === "dun" ? 8 : 10 }} angle={view === "dun" ? -60 : -20} textAnchor="end" height={view === "dun" ? 80 : 50} interval={0} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, view === "dun" ? 80 : 60]} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="ge14" name={`${fromLabel} %`} fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ge15" name={`${toLabel} %`} radius={[3, 3, 0, 0]}>
                  {dumbbellData.map((d, i) => <Cell key={i} fill={partyHex(d.winner15)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-mlk" /> Seat-by-seat swing ({view === "parliament" ? "6 parliament" : "28 DUN"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={view === "dun" ? "max-h-[500px] overflow-y-auto scrollbar-mlk" : ""}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">{view === "parliament" ? "Parliament" : "DUN"}</TableHead>
                  <TableHead className="text-[10px]">{fromLabel} Winner</TableHead>
                  <TableHead className="text-[10px] text-center">→</TableHead>
                  <TableHead className="text-[10px]">{toLabel} Winner</TableHead>
                  <TableHead className="text-[10px] text-right">{fromLabel} margin</TableHead>
                  <TableHead className="text-[10px] text-right">{toLabel} margin</TableHead>
                  <TableHead className="text-[10px] text-right">Δ margin</TableHead>
                  <TableHead className="text-[10px]">{toLabel} tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const deltaSign = r.marginDelta > 0.1 ? "+" : "";
                  const DeltaIcon = Math.abs(r.marginDelta) < 0.1 ? Minus : r.marginDelta > 0 ? TrendingUp : TrendingDown;
                  const deltaColor = Math.abs(r.marginDelta) < 0.1 ? "text-muted-foreground" : r.marginDelta > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300";
                  const rowKey = view === "parliament" ? (r as { code: string }).code : (r as { dunCode: string }).dunCode;
                  const winnerCandidate15 = view === "parliament" ? (r as { winnerCandidate15?: string }).winnerCandidate15 : (r as { winnerCandidate15?: string }).winnerCandidate15;
                  return (
                    <TableRow key={rowKey} className={r.winnerChanged ? "bg-mlk/5" : ""}>
                      <TableCell className="text-[10px]">
                        {view === "parliament" ? (
                          <><span className="font-medium">{(r as { name: string }).name}</span> <span className="font-mono text-muted-foreground">P{(r as { code: string }).code}</span></>
                        ) : (
                          <><span className="font-medium">{(r as { dunName: string }).dunName}</span> <span className="font-mono text-muted-foreground">N{(r as { dunCode: string }).dunCode} · P{(r as { parliamentCode: string }).parliamentCode}</span></>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PartyTag coalition={r.winner14 as CoalitionCode} size="xs" />
                          {r.winnerParty14 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                              <PartyLogo party={r.winnerParty14 as PartyCode} size="xs" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.winnerChanged ? (
                          <ArrowRight className="h-3 w-3 text-mlk mx-auto" aria-label="winner changed" />
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground mx-auto" aria-label="no change" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PartyTag coalition={r.winner15 as CoalitionCode} size="xs" />
                          {r.winnerParty15 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                              <PartyLogo party={r.winnerParty15 as PartyCode} size="xs" />
                            </span>
                          )}
                          {winnerCandidate15 && (
                            <button
                              className="text-[8px] text-mlk hover:underline focus-mlk rounded"
                              onClick={() => onSelectCandidate(winnerCandidate15)}
                              title="View full election history"
                            >
                              <User className="h-2 w-2 inline" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{r.margin14.toFixed(1)}%</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{r.margin15.toFixed(1)}%</TableCell>
                      <TableCell className={`text-[10px] text-right font-mono ${deltaColor}`}>
                        <DeltaIcon className="h-3 w-3 inline me-1" />{deltaSign}{r.marginDelta.toFixed(1)}pp
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] ${r.tier.bg}`}>{r.tier.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2 italic">
            Δ margin = {toLabel} margin − {fromLabel} margin (percentage points). Negative = seat tightened. Rows highlighted in amber = winner flipped between elections.
            {view === "dun" && " GE14 DUN margins computed from vote_share (real ElectionData.MY data)."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * HistoricalTrendsCard — shows coalition vote % trends across multiple elections.
 *
 * Uses the ElectionData.MY REST API (via pre-fetched coalition-trends.json)
 * to show how BN/PH/PN vote share has changed over time (GE11→GE15 for
 * parliament, SE11→SE15 for DUN).
 */
function HistoricalTrendsCard() {
  const [trends, setTrends] = useState<{ parlimen: Record<string, Array<{ election: string; date: string; seats_won: number; seats_total: number; votes_perc: number }>>; dun: Record<string, Array<{ election: string; date: string; seats_won: number; seats_total: number; votes_perc: number }>> } | null>(null);

  useEffect(() => {
    fetch("/data/elections/coalition-trends.json")
      .then((r) => r.json())
      .then((d) => setTrends(d.trends))
      .catch(() => {});
  }, []);

  if (!trends) return null;

  // Build chart data for parliament (reverse chronological → chronological)
  const parlElections = trends.parlimen.BN?.map((b) => b.election).reverse() ?? [];
  const parlData = parlElections.map((el) => {
    const entry: Record<string, number | string> = { election: el.replace("GE-", "GE") };
    ["BN", "PH", "PN"].forEach((coal) => {
      const found = trends.parlimen[coal]?.find((t) => t.election === el);
      if (found) entry[coal] = found.votes_perc;
    });
    return entry;
  }).filter((d) => d.BN !== undefined || d.PH !== undefined);

  const dunElections = trends.dun.BN?.map((b) => b.election).reverse() ?? [];
  const dunData = dunElections.map((el) => {
    const entry: Record<string, number | string> = { election: el.replace("SE-", "SE") };
    ["BN", "PH", "PN"].forEach((coal) => {
      const found = trends.dun[coal]?.find((t) => t.election === el);
      if (found) entry[coal] = found.votes_perc;
    });
    return entry;
  }).filter((d) => d.BN !== undefined || d.PH !== undefined);

  if (parlData.length === 0 && dunData.length === 0) return null;

  return (
    <Card className="border-mlk/20 bg-mlk-radial">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-mlk" /> Historical coalition trends (Melaka)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parlData.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Parliament vote % (GE11–GE15)</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parlData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="election" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 80]} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line type="monotone" dataKey="BN" stroke={PARTY_COLORS.BN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="PH" stroke={PARTY_COLORS.PH} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="PN" stroke={PARTY_COLORS.PN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {dunData.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">DUN vote % (SE11–SE15)</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dunData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="election" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 80]} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line type="monotone" dataKey="BN" stroke={PARTY_COLORS.BN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="PH" stroke={PARTY_COLORS.PH} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="PN" stroke={PARTY_COLORS.PN} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="text-[9px] text-muted-foreground italic flex items-start gap-1">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-mlk" />
          <span>
            Real coalition vote-share trends from ElectionData.MY REST API (api.electiondata.my/v1/parties/results).
            BN dominated 2004 (71.6% parl, 69.3% DUN) but collapsed to 29.6% by GE15. PH peaked in GE14 (52.9%) then fell to 38.7%.
            PN first contested Melaka in SE15/GE15.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ElectionView({ el, onSelectCandidate }: { el: Election; onSelectCandidate: (name: string) => void }) {
  const isPRN = el.id === "PRN15";
  const parlData = el.parliament_results.map((r) => {
    const p = PARLIAMENTS.find((x) => x.code === r.parliament_code);
    return { name: p?.name ?? `P${r.parliament_code}`, code: r.parliament_code, votes: r.votes_pct, winner: r.winner, fill: partyHex(r.winner) };
  });
  const dunByParl = PARLIAMENTS.map((p) => {
    const duns = el.dun_results.filter((d) => d.parliament_code === p.code);
    const counts: Record<string, number> = { BN: 0, PH: 0, PN: 0 };
    duns.forEach((d) => { counts[d.winner] = (counts[d.winner] ?? 0) + 1; });
    return { name: p.name, code: p.code, ...counts };
  });
  const showDunBars = el.dun_results.length > 0 && el.parliament_results.length === 0;

  return (
    <div className="space-y-3">
      {/* Headline */}
      <Card className={`border-mlk/30 ${isPRN ? "bg-mlk-radial" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-mlk" />
            <span className="text-xs font-mono text-muted-foreground">{el.date}</span>
            {isPRN && <Badge className="text-[9px] bg-mlk text-white border-transparent">HEADLINE</Badge>}
          </div>
          <div className="text-sm font-medium leading-snug">{el.headline_fact}</div>
          <div className="mt-2 flex flex-wrap gap-3 items-center">
            {el.parliament_summary && (<div><div className="text-[10px] text-muted-foreground mb-1">Parliament seats</div><SeatCount summary={el.parliament_summary} /></div>)}
            {el.dun_summary && (<div><div className="text-[10px] text-muted-foreground mb-1">DUN seats</div><SeatCount summary={el.dun_summary} /></div>)}
          </div>
        </CardContent>
      </Card>

      {/* Party breakdown card — NEW: shows component parties with logos */}
      <PartyBreakdownCard el={el} />

      {/* DUN context card — for GE15 (parliament-only election), show current DUN composition from PRN15 */}
      {el.current_dun_composition && el.current_dun_composition.length > 0 && (
        <Card className="border-mlk/20 bg-mlk-radial">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-mlk" /> Current DUN composition (from PRN15 2021)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {el.dun_context_note && (
              <div className="text-[10px] text-muted-foreground italic mb-3 flex items-start gap-1">
                <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-mlk" />
                <span>{el.dun_context_note}</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {el.current_dun_composition.map((d) => {
                const dunName = getDunName(d.parliament_code, d.dun_code);
                return (
                  <div
                    key={`${d.parliament_code}-${d.dun_code}`}
                    className="rounded-md border border-border/40 bg-background/60 p-1.5"
                    title={`${dunName} (N${d.dun_code}) — ${d.winner}${d.winner_party ? ` / ${d.winner_party}` : ""}`}
                  >
                    <div className="text-[8px] font-mono text-muted-foreground">N{d.dun_code} · P{d.parliament_code}</div>
                    <div className="text-[10px] font-semibold truncate">{dunName}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <PartyTag coalition={d.winner as CoalitionCode} size="xs" />
                      {d.winner_party && (
                        <span className="text-[8px] text-muted-foreground truncate">{d.winner_party}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* DUN summary by coalition */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {(() => {
                const counts: Record<string, number> = { BN: 0, PH: 0, PN: 0 };
                el.current_dun_composition!.forEach((d) => { counts[d.winner] = (counts[d.winner] ?? 0) + 1; });
                return (["BN", "PH", "PN"] as const).map((c) => counts[c] > 0 && (
                  <PartyTag key={c} coalition={c as CoalitionCode} size="sm">
                    {c} {counts[c]}
                  </PartyTag>
                ));
              })()}
              <span className="text-[10px] text-muted-foreground self-center">/ {el.current_dun_composition.length} DUN</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{el.parliament_results.length > 0 ? "Parliament vote %" : "DUN seats by parliament"}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {el.parliament_results.length > 0 ? (
                <BarChart data={parlData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 60]} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="votes" name="Vote %" radius={[4, 4, 0, 0]}>
                    {parlData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={dunByParl} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="BN" stackId="a" fill={PARTY_COLORS.BN} />
                  <Bar dataKey="PH" stackId="a" fill={PARTY_COLORS.PH} />
                  <Bar dataKey="PN" stackId="a" fill={PARTY_COLORS.PN} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Results table — now includes party column + clickable candidate names */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-mlk" /> Results table <span className="text-[9px] text-muted-foreground font-normal">· Click winner name for full election history</span></CardTitle></CardHeader>
        <CardContent>
          {showDunBars ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Parliament</TableHead>
                  <TableHead className="text-[10px]">DUN</TableHead>
                  <TableHead className="text-[10px]">Winner (Coalition)</TableHead>
                  <TableHead className="text-[10px]">Party</TableHead>
                  <TableHead className="text-[10px] text-right">BN</TableHead>
                  <TableHead className="text-[10px] text-right">PH</TableHead>
                  <TableHead className="text-[10px] text-right">PN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {el.dun_results.map((d) => (
                  <TableRow key={`${d.parliament_code}-${d.dun_code}`}>
                    <TableCell className="text-[10px] font-mono">P{d.parliament_code}</TableCell>
                    <TableCell className="text-[10px]">{getDunName(d.parliament_code, d.dun_code)} <span className="text-muted-foreground font-mono">N{d.dun_code}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PartyTag coalition={d.winner as CoalitionCode} size="xs" />
                        {d.winner_candidate && (
                          <button
                            className="text-[9px] text-mlk hover:underline flex items-center gap-0.5 focus-mlk rounded"
                            onClick={() => onSelectCandidate(d.winner_candidate!)}
                            title="View full election history"
                          >
                            <User className="h-2.5 w-2.5" />
                            {d.winner_candidate.length > 20 ? d.winner_candidate.substring(0, 18) + "…" : d.winner_candidate}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.winner_party && <PartyLogo party={d.winner_party as PartyCode} size="xs" showLabel />}
                    </TableCell>
                    <TableCell className="text-[10px] text-right">{((d.vote_share.BN ?? 0) * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-[10px] text-right">{((d.vote_share.PH ?? 0) * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-[10px] text-right">{((d.vote_share.PN ?? 0) * 100).toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Parliament</TableHead>
                  <TableHead className="text-[10px]">Winner (Coalition)</TableHead>
                  <TableHead className="text-[10px]">Party</TableHead>
                  <TableHead className="text-[10px] text-right">Vote %</TableHead>
                  <TableHead className="text-[10px]">Runner-up</TableHead>
                  <TableHead className="text-[10px] text-right">Margin</TableHead>
                  <TableHead className="text-[10px]">Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {el.parliament_results.map((r) => {
                  const tier = marginTier(r.margin_pct);
                  return (
                    <TableRow key={r.parliament_code}>
                      <TableCell className="text-[10px]">{PARLIAMENTS.find((p) => p.code === r.parliament_code)?.name ?? `P${r.parliament_code}`} <span className="font-mono text-muted-foreground">P{r.parliament_code}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <PartyTag coalition={r.winner as CoalitionCode} size="xs" />
                          {r.winner_candidate && (
                            <button
                              className="text-[9px] text-mlk hover:underline flex items-center gap-0.5 focus-mlk rounded"
                              onClick={() => onSelectCandidate(r.winner_candidate!)}
                              title="View full election history"
                            >
                              <User className="h-2.5 w-2.5" />
                              {r.winner_candidate.length > 20 ? r.winner_candidate.substring(0, 18) + "…" : r.winner_candidate}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.winner_party && <PartyLogo party={r.winner_party as PartyCode} size="xs" showLabel />}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">{r.votes_pct.toFixed(1)}%</TableCell>
                      <TableCell className="text-[10px]">{r.runner_up}</TableCell>
                      <TableCell className="text-[10px] text-right font-mono">{r.margin_pct.toFixed(1)}%</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[9px] ${tier.bg}`}>{tier.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * DataQueryCard — Natural language to SQL to DuckDB query interface.
 *
 * User types a question → CF Workers AI generates SQL → DuckDB executes
 * against election data → results displayed in a table + SQL shown.
 */
function DataQueryCard() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    question: string;
    generated_sql: string;
    rows: Array<Record<string, unknown>>;
    columns: string[];
    row_count: number;
    error?: string;
  } | null>(null);

  const SUGGESTED_QUERIES = [
    "How many DUN seats did BN win in PRN15?",
    "Which parliament had the smallest margin in GE15?",
    "Which candidates won in both GE14 and GE15?",
    "What is the average BN vote percentage in DUN seats for PRN15?",
    "Which party won the most seats across all elections?",
    "List all DUN seats where PN won in PRN15",
    "What was the total votes for the winner in P138 Kota Melaka in GE15?",
    "Which parliament had the highest margin of victory in GE14?",
  ];

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({
        question: q,
        generated_sql: "",
        rows: [],
        columns: [],
        row_count: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-mlk/20 bg-mlk-radial">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-mlk" /> Natural Language Data Query
          <Badge className="text-[9px] bg-mlk text-white border-transparent ms-1">DuckDB + CF AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-[10px] text-muted-foreground">
          Ask any question about Melaka election data in plain English. CF Workers AI (Llama 3.1 8B) generates SQL,
          DuckDB executes it against real ElectionData.MY results (12 parliament + 56 DUN records).
        </div>

        {/* Suggested queries */}
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuestion(q); ask(q); }}
              className="text-[9px] px-2 py-1 rounded-full border border-mlk/30 text-foreground hover:bg-mlk/10 hover:text-mlk hover:border-mlk transition-colors"
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); ask(question); }}
          className="flex items-center gap-1.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask: Which DUN did PH win by the smallest margin?"
              className="w-full h-9 pl-8 pr-3 text-xs rounded-md bg-background border border-mlk/20 focus:border-mlk focus:outline-none focus:ring-1 focus:ring-mlk/40 placeholder:text-muted-foreground"
              disabled={loading}
              aria-label="Natural language query"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="h-9 px-3 rounded-md bg-mlk text-white text-xs font-medium hover:bg-mlk/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Query
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-2">
            {/* Generated SQL */}
            {result.generated_sql && (
              <div className="rounded-md border border-mlk/20 bg-background/60 p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Code className="h-3 w-3 text-mlk" />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Generated SQL</span>
                </div>
                <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap break-words">{result.generated_sql}</pre>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/5 p-2 text-[10px] text-red-600 dark:text-red-300">
                <strong>Error:</strong> {result.error}
              </div>
            )}

            {/* Results table */}
            {result.rows.length > 0 && (
              <div className="rounded-md border border-mlk/20 overflow-hidden">
                <div className="bg-mlk/5 px-2 py-1 text-[9px] text-muted-foreground flex items-center justify-between">
                  <span>{result.row_count} row{result.row_count !== 1 ? "s" : ""} returned</span>
                  <span className="font-mono">DuckDB in-memory</span>
                </div>
                <div className="max-h-80 overflow-auto scrollbar-mlk">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.columns.map((col) => (
                          <TableHead key={col} className="text-[9px] font-semibold">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, i) => (
                        <TableRow key={i}>
                          {result.columns.map((col) => (
                            <TableCell key={col} className="text-[9px] font-mono">
                              {String(row[col] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {result.rows.length === 0 && !result.error && (
              <div className="text-[10px] text-muted-foreground text-center py-2">
                Query returned 0 rows.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ElectionsTab() {
  const [data, setData] = useState<Election[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    fetch("/data/elections/melaka-elections.json")
      .then((r) => r.json())
      .then((d) => setData(d.elections as Election[]))
      .catch(() => {
        setData(ELECTIONS_FALLBACK as Election[]);
        setOffline(true);
      });
  }, []);

  const handleSelectCandidate = (name: string) => {
    setSelectedCandidate(name);
    setHistoryOpen(true);
  };

  if (!data) return <Card className="border-mlk/20"><CardContent className="p-8 animate-pulse bg-muted/30 text-muted-foreground text-sm">Loading elections…</CardContent></Card>;

  return (
    <div className="space-y-3 fade-in-up">
      <Card className="border-mlk/20">
        <CardContent className="p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Vote className="h-4 w-4 text-mlk flex-shrink-0" />
          <span>Verified tier · source: ElectionData.my data lake + REST API. Real per-candidate data from lake.electiondata.my. Click any winner name for full election history (party switches visible).</span>
          {offline && (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              <WifiOff className="h-2.5 w-2.5" /> offline data
            </span>
          )}
        </CardContent>
      </Card>

      {/* Historical trends card — always visible at top */}
      <HistoricalTrendsCard />

      <Tabs defaultValue="PRN15">
        <TabsList className="w-full justify-start">
          {data.map((e) => <TabsTrigger key={e.id} value={e.id} className="text-xs">{e.id}</TabsTrigger>)}
          <TabsTrigger value="swing" className="text-xs text-mlk data-[state=active]:bg-mlk data-[state=active]:text-white">Swing Analysis</TabsTrigger>
          <TabsTrigger value="query" className="text-xs text-mlk data-[state=active]:bg-mlk data-[state=active]:text-white">Data Query</TabsTrigger>
        </TabsList>
        {data.map((e) => (
          <TabsContent key={e.id} value={e.id}><ElectionView el={e} onSelectCandidate={handleSelectCandidate} /></TabsContent>
        ))}
        <TabsContent value="swing"><SwingAnalysis elections={data} onSelectCandidate={handleSelectCandidate} /></TabsContent>
        <TabsContent value="query"><DataQueryCard /></TabsContent>
      </Tabs>

      {/* Candidate history dialog */}
      <CandidateHistoryDialog
        candidateName={selectedCandidate}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
