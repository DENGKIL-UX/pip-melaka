"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Vote, Building2, MapPin, Layers, ShieldCheck, TrendingUp, Map as MapIcon, Box, ArrowLeftRight, Activity, Info, WifiOff } from "lucide-react";
import { PARLIAMENTS, TOTAL_VOTERS_P134, TOTAL_DUN } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { OVERVIEW_FALLBACK, ELECTIONS_SUMMARY_FALLBACK } from "@/lib/fallback-data";

interface OverviewData {
  overview: {
    metrics: {
      total_voters: number;
      male_voters: number;
      female_voters: number;
      senior_dependency_percent: number;
      gender_balance_score: number;
      profile_completeness_score: number;
    };
  };
  geography_counts: { parliaments: number; duns: number; dms: number; localities: number };
}

interface ElectionSummary { id: string; name: string; date: string; headline_fact: string;
  parliament_summary: { PH: number; BN: number; PN: number; total: number } | null;
  dun_summary: { PH: number; BN: number; PN: number; total: number } | null; }

interface DptSummary { total_additions: number; total_deletions: number; total_net: number; }

function PartyBadge({ party }: { party: "PH" | "BN" | "PN" }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
      style={{ backgroundColor: PARTY_COLORS[party] }}
    >
      {party}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`hover-lift ${accent ? "border-mlk/40" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent ? "text-mlk" : "text-muted-foreground"}`} />
        </div>
        <div className={`text-xl font-bold ${accent ? "text-mlk" : ""}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [dpt, setDpt] = useState<DptSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ov, el, dp] = await Promise.all([
          fetch("/data/p134/dashboard-overview.json").then((r) => r.json()),
          fetch("/data/elections/melaka-elections.json").then((r) => r.json()),
          fetch("/data/dpt/spr-dpt-pameran-summary.json").then((r) => r.json()),
        ]);
        setOverview(ov as OverviewData);
        setElections((el.elections ?? []) as ElectionSummary[]);
        setDpt({ total_additions: dp.total_additions, total_deletions: dp.total_deletions, total_net: dp.total_net });
      } catch {
        // Dev server OOM / fetch failure — render inline fallback so the tab
        // ALWAYS shows content. Same data as public/data/*.json.
        setOverview(OVERVIEW_FALLBACK);
        setElections(ELECTIONS_SUMMARY_FALLBACK);
        setDpt({ total_additions: 8420, total_deletions: 3180, total_net: 5240 });
        setOffline(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-mlk/20"><CardContent className="p-4 h-24 animate-pulse bg-muted/40" /></Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    // Should never happen — fallback always sets data. Defensive guard.
    return <Card className="border-mlk/20"><CardContent className="p-4 text-sm text-muted-foreground">No data</CardContent></Card>;
  }

  const m = overview.overview.metrics;
  const gc = overview.geography_counts;

  return (
    <div className="space-y-4 fade-in-up">
      {/* Offline banner — shown only when fetch failed and fallback is rendered */}
      {offline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-xs">
            <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">Offline data mode.</span>
            <span className="text-muted-foreground">Live fetch failed (dev server may have restarted) — showing cached inline snapshot of the last verified P134 / SPR / DOSM build.</span>
          </CardContent>
        </Card>
      )}

      {/* Honesty banner */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-mlk flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-mlk">Proxy evidence tier · 8 of 9 provenance gates closed</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Demographics verified against engine-built P134 (71,415 voters). Gate 9 (raw SPR voter xlsx) remains open — see Governance tab.
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-mlk/40 text-mlk" onClick={() => setActiveTab("governance")}>
            <ShieldCheck className="h-3.5 w-3.5 me-1" /> View provenance
          </Button>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={Users} label="Voters" value={m.total_voters.toLocaleString()} sub="P134 verified" accent />
        <KpiCard icon={Vote} label="Parliaments" value={String(gc.parliaments)} sub="P134–P139" />
        <KpiCard icon={Building2} label="DUN" value={`${gc.duns} / ${TOTAL_DUN}`} sub="P134 sampled" />
        <KpiCard icon={Layers} label="DM" value={String(gc.dms)} sub="Daerah Mengundi" />
        <KpiCard icon={MapPin} label="Localities" value={String(gc.localities)} sub="P134 localities" />
      </div>

      {/* Elections + DPT churn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-mlk/20 hover-lift">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Vote className="h-4 w-4 text-mlk" /> Election history</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {elections.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-medium">{e.id} <span className="text-muted-foreground">· {e.date}</span></div>
                  <div className="text-[10px] text-muted-foreground truncate">{e.headline_fact}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {e.parliament_summary && (<>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.BN, borderColor: PARTY_COLORS.BN }}>{e.parliament_summary.BN}B</Badge>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PH, borderColor: PARTY_COLORS.PH }}>{e.parliament_summary.PH}P</Badge>
                    {e.parliament_summary.PN > 0 && <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PN, borderColor: PARTY_COLORS.PN }}>{e.parliament_summary.PN}N</Badge>}
                  </>)}
                  {e.dun_summary && (<>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.BN, borderColor: PARTY_COLORS.BN }}>{e.dun_summary.BN}B</Badge>
                    <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PH, borderColor: PARTY_COLORS.PH }}>{e.dun_summary.PH}P</Badge>
                    {e.dun_summary.PN > 0 && <Badge variant="outline" className="text-[9px]" style={{ color: PARTY_COLORS.PN, borderColor: PARTY_COLORS.PN }}>{e.dun_summary.PN}N</Badge>}
                  </>)}
                </div>
              </div>
            ))}
            <Button size="sm" variant="ghost" className="text-mlk text-xs w-full" onClick={() => setActiveTab("elections")}>Open Elections →</Button>
          </CardContent>
        </Card>

        <Card className="border-mlk/20 hover-lift">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-mlk" /> DPT churn (Jan–May 2026)</CardTitle></CardHeader>
          <CardContent>
            {dpt && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border border-emerald-500/30 p-2">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{dpt.total_additions.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Additions</div>
                </div>
                <div className="rounded-md border border-red-500/30 p-2">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">−{dpt.total_deletions.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Deletions</div>
                </div>
                <div className="rounded-md border border-mlk/40 p-2">
                  <div className="text-lg font-bold text-mlk">+{dpt.total_net.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Net</div>
                </div>
              </div>
            )}
            <Button size="sm" variant="ghost" className="text-mlk text-xs w-full mt-2" onClick={() => setActiveTab("analysis")}>Open DPT Analysis →</Button>
          </CardContent>
        </Card>
      </div>

      {/* Parliament cards */}
      <div>
        <div className="text-sm font-semibold mb-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-mlk" /> Parliament seats (GE15 winners)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PARLIAMENTS.map((p) => (
            <Card key={p.code} className="border-mlk/20 hover-lift">
              <CardContent className="p-3">
                <div className="text-[10px] text-muted-foreground font-mono">P{p.code}</div>
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground mb-2">{p.district} · {p.dunCount} DUN</div>
                <div className="flex items-center justify-between">
                  <PartyBadge party={p.ge15Winner} />
                  <span className="text-[10px] text-muted-foreground">GE15</span>
                </div>
                {p.totalVoters > 0 && <div className="text-[10px] text-muted-foreground mt-1">{p.totalVoters.toLocaleString()} voters</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { tab: "map-2d" as const, label: "2D Map", icon: MapIcon },
          { tab: "map-3d" as const, label: "3D Map", icon: Box },
          { tab: "compare" as const, label: "Compare", icon: ArrowLeftRight },
          { tab: "s2d" as const, label: "S2D Console", icon: Activity },
        ].map(({ tab, label, icon: Icon }) => (
          <Button key={tab} variant="outline" className="border-mlk/30 hover:bg-mlk/10 hover:text-mlk h-auto py-3 flex flex-col gap-1" onClick={() => setActiveTab(tab)}>
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      <Card className="border-mlk/20">
        <CardContent className="p-3 text-[11px] text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-mlk" />
          <div>
            <strong className="text-mlk">Engine provenance:</strong> Demographics from P134 transformer run
            (clean: {m.profile_completeness_score.toFixed(2)}% completeness, gender balance {m.gender_balance_score.toFixed(1)}).
            Senior dependency {m.senior_dependency_percent.toFixed(1)}% — see <button className="text-mlk underline" onClick={() => setActiveTab("risk")}>Risk tab</button> for DUN-level signals.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
