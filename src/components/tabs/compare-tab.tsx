"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Building2, Copy, FileSpreadsheet, Landmark, MapPin, TrendingUp, Trophy, Users, WifiOff } from "lucide-react";
import { WinnerDisplay, WinnerCompact } from "@/components/shared/winner-display";
import { CoalitionCode, PartyCode } from "@/lib/party-metadata";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { DUN_SUMMARY, type DunSummary } from "@/lib/dun-summary";
import { DUN_FALLBACK, DPT_FALLBACK } from "@/lib/fallback-data";
import { PARTY_COLORS } from "@/lib/party-colors";
import { useI18n } from "@/lib/i18n";

type ComparisonLevel = "parliament" | "dun";

interface DunRecord {
  geography: { parliament_code: string; dun_code: string; dun_name: string };
  metrics: {
    total_voters: number; male_voters: number; female_voters: number;
    senior_voters_56_plus?: number; senior_dependency_percent: number;
    gender_balance_score: number; male_percent: number; female_percent: number;
    dominant_age_group: string; dominant_ethnicity_group: string;
  };
}
interface DptData { per_parliament: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>; }

interface ComparisonRecord {
  id: string;
  label: string;
  subtitle: string;
  voters?: number;
  malePct?: number;
  femalePct?: number;
  seniorDep?: number;
  genderBal?: number;
  dptNet?: number;
  winner: CoalitionCode;
  winnerParty: PartyCode | string;
  candidate: string;
  margin: number;
  priorMargin: number;
  swing: boolean;
  dataAvailable: boolean;
}

const marginBand = (margin: number) => {
  if (margin < 5) return { label: "Marginal", className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300" };
  if (margin < 10) return { label: "Competitive", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" };
  return { label: "Safe", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
};

function MetricRow({ label, values, formatter = (value) => String(value) }: { label: string; values: Array<number | undefined>; formatter?: (value: number) => string }) {
  return (
    <div className="grid grid-cols-4 gap-2 border-b border-border/30 py-2 text-xs last:border-0">
      <div className="text-muted-foreground">{label}</div>
      {values.map((value, index) => <div key={index} className="text-right font-mono">{value === undefined ? <span className="text-muted-foreground">—</span> : formatter(value)}</div>)}
    </div>
  );
}

function SeatHeader({ record }: { record: ComparisonRecord }) {
  const band = marginBand(record.margin);
  return (
    <div className="min-w-0 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <span className="truncate font-semibold text-mlk" title={record.label}>{record.label}</span>
      </div>
      <div className="truncate text-[10px] text-muted-foreground" title={record.subtitle}>{record.subtitle}</div>
      <div className="mt-1">
        <WinnerCompact 
          winner={record.winner} 
          winnerParty={record.winnerParty as PartyCode} 
          size="xs" 
        />
      </div>
      <Badge variant="outline" className={`mt-1 text-[8px] ${band.className}`}>{band.label} · {record.margin.toFixed(1)}pp</Badge>
    </div>
  );
}

export function CompareTab() {
  const { t } = useI18n();
  const [level, setLevel] = useState<ComparisonLevel>("parliament");
  const [duns, setDuns] = useState<DunRecord[]>([]);
  const [dpt, setDpt] = useState<DptData | null>(null);
  const [offline, setOffline] = useState(false);
  const [selected, setSelected] = useState(["134", "137", "139"]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/p134/dun-intelligence.jsonl")
        .then((response) => {
          if (!response.ok) throw new Error("DUN data unavailable");
          return response.text();
        })
        .then((text) => text.trim().split("\n").map((line) => JSON.parse(line) as DunRecord)),
      fetch("/data/dpt/spr-dpt-pameran-summary.json")
        .then((response) => {
          if (!response.ok) throw new Error("DPT data unavailable");
          return response.json() as Promise<DptData>;
        }),
    ]).then(([d, dp]) => { setDuns(d); setDpt(dp); }).catch(() => {
      setDuns(DUN_FALLBACK as unknown as DunRecord[]);
      setDpt(DPT_FALLBACK as DptData);
      setOffline(true);
    });
  }, []);



  const parliamentRecords = useMemo(() => PARLIAMENTS.map((parliament): ComparisonRecord => {
    const rows = duns.filter((d) => d.geography.parliament_code === parliament.code);
    const voters = rows.length ? rows.reduce((sum, d) => sum + d.metrics.total_voters, 0) : undefined;
    const male = rows.length ? rows.reduce((sum, d) => sum + d.metrics.male_voters, 0) : 0;
    const female = rows.length ? rows.reduce((sum, d) => sum + d.metrics.female_voters, 0) : 0;
    const latestSeats = DUN_SUMMARY.filter((d) => d.parliamentCode === parliament.code);
    const margin = latestSeats.reduce((sum, d) => sum + d.prn15.marginPct, 0) / latestSeats.length;
    const oldMargin = latestSeats.reduce((sum, d) => sum + d.ge14.marginPct, 0) / latestSeats.length;
    const winningCoalition = parliament.ge15Winner;
    return {
      id: parliament.code, label: `P${parliament.code} · ${parliament.name}`, subtitle: `${parliament.dunCount} DUN · ${parliament.district}`,
      voters, malePct: voters ? male / voters * 100 : undefined, femalePct: voters ? female / voters * 100 : undefined,
      seniorDep: rows.length ? rows.reduce((sum, d) => sum + d.metrics.senior_dependency_percent, 0) / rows.length : undefined,
      genderBal: rows.length ? rows.reduce((sum, d) => sum + d.metrics.gender_balance_score, 0) / rows.length : undefined,
      dptNet: dpt?.per_parliament.find((item) => item.parliament_code === parliament.code)?.net,
      winner: winningCoalition, winnerParty: winningCoalition, candidate: "GE15 parliamentary result", margin, priorMargin: oldMargin,
      swing: latestSeats.some((d) => d.swing), dataAvailable: rows.length > 0,
    };
  }), [duns, dpt]);

  const dunRecords = useMemo(() => DUN_SUMMARY.map((dun: DunSummary): ComparisonRecord => {
    const intelligence = duns.find((row) => row.geography.dun_code === dun.dunCode);
    const metrics = intelligence?.metrics;
    return {
      id: dun.dunCode, label: `${dun.dunCodeLabel} · ${dun.dunName}`, subtitle: `P${dun.parliamentCode} ${dun.parliamentName} · ${dun.district}`,
      voters: metrics?.total_voters, malePct: metrics?.male_percent, femalePct: metrics?.female_percent,
      seniorDep: metrics?.senior_dependency_percent, genderBal: metrics?.gender_balance_score,
      winner: dun.prn15.coalition, winnerParty: dun.prn15.party, candidate: dun.incumbentCandidate,
      margin: dun.prn15.marginPct, priorMargin: dun.ge14.marginPct, swing: dun.swing, dataAvailable: Boolean(metrics),
    };
  }), [duns]);

  const options = level === "parliament" ? parliamentRecords : dunRecords;
  const records = selected.map((id) => options.find((item) => item.id === id)).filter(Boolean) as ComparisonRecord[];
  const setSeat = (index: number, value: string) => setSelected((previous) => previous.map((item, itemIndex) => itemIndex === index ? value : item));
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2200); };

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("compareLevel", level);
    url.searchParams.set("compare", selected.join("-"));
    navigator.clipboard?.writeText(url.toString());
    showToast("Comparison link copied");
  };
  const downloadCsv = () => {
    const rows = [
      ["metric", ...records.map((record) => record.label)],
      ["latest winner", ...records.map((record) => `${record.winner} · ${record.winnerParty}`)],
      ["PRN15 margin (pp)", ...records.map((record) => record.margin.toFixed(1))],
      ["GE14 margin (pp)", ...records.map((record) => record.priorMargin.toFixed(1))],
      ["swing", ...records.map((record) => record.swing ? "Yes" : "No")],
      ["verified voters", ...records.map((record) => record.voters ?? "")],
      ["senior dependency (%)", ...records.map((record) => record.seniorDep?.toFixed(1) ?? "")],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = `${level}-comparison.csv`; link.click(); URL.revokeObjectURL(url);
    showToast("Comparison CSV downloaded");
  };

  return (
    <div className="space-y-4 fade-in-up">
      <Card className="border-mlk/20"><CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-mlk" />
        <span>{level === "parliament" ? t("compare.intro") : "Compare three DUN seats using PRN15 and GE14 election results. Voter-demographic metrics appear only where verified DUN intelligence is available."}</span>
        {offline && <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] text-amber-700 dark:text-amber-300"><WifiOff className="h-2.5 w-2.5" /> {t("compare.offlineData")}</span>}
      </CardContent></Card>

      <Segmented value={level} onChange={(value) => { setLevel(value); setSelected(value === "parliament" ? ["134", "137", "139"] : ["01", "11", "21"]); }} options={[
        { value: "parliament", label: "Parliament" }, { value: "dun", label: "DUN" },
      ]} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {selected.map((value, index) => <div key={`${level}-${index}`}>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{level === "dun" ? `DUN ${String.fromCharCode(65 + index)}` : `Parliament ${String.fromCharCode(65 + index)}`}</label>
          <Select value={value} onValueChange={(next) => setSeat(index, next)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{options.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>)}
      </div>

      <Card className="border-mlk/30"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Landmark className="h-4 w-4 text-mlk" /> Side-by-side {level === "dun" ? "DUN" : "Parliament"} comparison</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-4 gap-2 border-b border-mlk/20 pb-3 text-[10px] uppercase tracking-wide text-muted-foreground"><div>Metric</div>{records.map((record) => <SeatHeader key={record.id} record={record} />)}</div>
        <div className="grid grid-cols-4 gap-2 border-b border-border/30 py-2 text-xs"><div className="text-muted-foreground">Latest winner</div>{records.map((record) => (
          <div key={record.id} className="text-right">
            <WinnerCompact 
              winner={record.winner} 
              winnerParty={record.winnerParty as PartyCode} 
              size="xs" 
            />
            <div className="truncate text-[10px] text-muted-foreground mt-0.5" title={record.candidate}>
              {record.candidate}
            </div>
          </div>
        ))}</div>
        <MetricRow label="Latest margin" values={records.map((record) => record.margin)} formatter={(value) => `${value.toFixed(1)}pp`} />
        <MetricRow label="GE14 margin" values={records.map((record) => record.priorMargin)} formatter={(value) => `${value.toFixed(1)}pp`} />
        <div className="grid grid-cols-4 gap-2 border-b border-border/30 py-2 text-xs"><div className="text-muted-foreground">Seat changed hands</div>{records.map((record) => <div key={record.id} className="text-right">{record.swing ? <span className="font-medium text-amber-600 dark:text-amber-300">Yes</span> : "No"}</div>)}</div>
        <MetricRow label="Verified voters" values={records.map((record) => record.voters)} formatter={(value) => value.toLocaleString()} />
        <div className="grid grid-cols-4 gap-2 border-b border-border/30 py-2 text-xs"><div className="text-muted-foreground">Male / female</div>{records.map((record) => <div key={record.id} className="text-right font-mono">{record.malePct === undefined || record.femalePct === undefined ? <span className="text-muted-foreground">—</span> : `${record.malePct.toFixed(1)}% / ${record.femalePct.toFixed(1)}%`}</div>)}</div>
        <MetricRow label="Senior dependency" values={records.map((record) => record.seniorDep)} formatter={(value) => `${value.toFixed(1)}%`} />
        <MetricRow label="Gender balance" values={records.map((record) => record.genderBal)} formatter={(value) => value.toFixed(1)} />
        {level === "parliament" && <MetricRow label="DPT net change" values={records.map((record) => record.dptNet)} formatter={(value) => `${value > 0 ? "+" : ""}${value.toLocaleString()}`} />}
      </CardContent></Card>

      {level === "dun" && records.some((record) => !record.dataAvailable) && <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="flex gap-2 p-3 text-xs text-muted-foreground"><Users className="h-4 w-4 shrink-0 text-amber-600" /> Election comparisons are complete for all 28 DUNs. Demographic metrics marked “—” have not yet been verified outside the current P134 DUN intelligence coverage.</CardContent></Card>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{records.map((record) => { const band = marginBand(record.margin); return <Card key={record.id} className="border-mlk/20"><CardContent className="p-4"><div className="mb-2 flex items-start justify-between gap-2"><div><div className="font-semibold text-sm">{record.label}</div><div className="text-[10px] text-muted-foreground">{record.subtitle}</div></div><Trophy className="h-4 w-4 shrink-0 text-mlk" /></div>

        {/* NEW: Rich winner display with logo (consistent with Elections tab) */}
        <div className="mb-3">
          <WinnerDisplay 
            winner={record.winner} 
            winnerParty={record.winnerParty as PartyCode} 
            candidate={record.candidate} 
            size="sm" 
            showLogo 
            showCandidate 
          />
        </div>

        <div className="flex items-center justify-between"><Badge variant="outline" className={band.className}>{band.label}</Badge><span className="font-mono text-lg font-bold">{record.margin.toFixed(1)}pp</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(record.margin / 30 * 100, 100)}%`, backgroundColor: record.margin < 5 ? "#dc2626" : record.margin < 10 ? "#d97706" : "#16a34a" }} /></div><div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><TrendingUp className="h-3 w-3" /> GE14 → latest: {record.priorMargin.toFixed(1)}pp → {record.margin.toFixed(1)}pp</div></CardContent></Card>; })}</div>

      <Card className="border-mlk/20"><CardContent className="flex flex-wrap gap-2 p-3"><Button size="sm" variant="outline" className="border-mlk/30" onClick={copyLink}><Copy className="me-1 h-3.5 w-3.5" /> Copy comparison link</Button><Button size="sm" variant="outline" className="border-mlk/30" onClick={downloadCsv}><FileSpreadsheet className="me-1 h-3.5 w-3.5" /> Export CSV</Button>{toast && <span className="self-center text-xs text-emerald-600">{toast}</span>}</CardContent></Card>
    </div>
  );
}
