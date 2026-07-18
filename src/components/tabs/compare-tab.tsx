"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Copy, Twitter, MessageCircle, FileSpreadsheet, Users, Building2, TrendingUp, Trophy, WifiOff } from "lucide-react";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";
import { DUN_FALLBACK, DPT_FALLBACK } from "@/lib/fallback-data";

interface DunRecord {
  geography: { parliament_code: string; dun_code: string; dun_name: string };
  metrics: { total_voters: number; male_voters: number; female_voters: number; senior_voters_56_plus?: number; senior_dependency_percent: number; gender_balance_score: number; male_percent: number; female_percent: number; dominant_age_group: string; dominant_ethnicity_group: string };
}
interface DptData { per_parliament: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>; }

interface ParlAgg {
  code: string; name: string; voters: number; male: number; female: number; malePct: number; femalePct: number;
  seniorDep: number; genderBal: number; duns: number; age: string; ethnicity: string;
  dpt?: { additions: number; deletions: number; net: number };
  ge15Winner: "PH" | "BN" | "PN";
}

function StatRow({ label, a, b, highlight }: { label: string; a: string; b: string; highlight?: "a" | "b" }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className={`text-right font-mono ${highlight === "a" ? "text-mlk font-bold" : ""}`}>{a}</div>
      <div className={`text-right font-mono ${highlight === "b" ? "text-mlk font-bold" : ""}`}>{b}</div>
    </div>
  );
}

export function CompareTab() {
  const [duns, setDuns] = useState<DunRecord[]>([]);
  const [dpt, setDpt] = useState<DptData | null>(null);
  const [offline, setOffline] = useState(false);
  const [codeA, setCodeA] = useState<string>("134");
  const [codeB, setCodeB] = useState<string>("137");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/p134/dun-intelligence.jsonl").then((r) => r.text()).then((t) => t.trim().split("\n").map((l) => JSON.parse(l) as DunRecord)),
      fetch("/data/dpt/spr-dpt-pameran-summary.json").then((r) => r.json()),
    ]).then(([d, dp]) => { setDuns(d); setDpt(dp); }).catch(() => {
      // Dev server OOM / fetch failure — render inline fallback so the tab
      // ALWAYS shows content. Mirrors public/data/p134/dun-intelligence.jsonl
      // and public/data/dpt/spr-dpt-pameran-summary.json.
      setDuns(DUN_FALLBACK as unknown as DunRecord[]);
      setDpt(DPT_FALLBACK as DptData);
      setOffline(true);
    });
  }, []);

  // Aggregate by parliament from P134 DUN data. P135-P139 fallback to PARLIAMENTS constants (no raw voter rolls yet).
  const aggByCode = useMemo(() => {
    const map = new Map<string, ParlAgg>();
    PARLIAMENTS.forEach((p) => {
      const dunRows = duns.filter((d) => d.geography.parliament_code === p.code);
      const voters = dunRows.length > 0 ? dunRows.reduce((s, d) => s + d.metrics.total_voters, 0) : p.totalVoters;
      const male = dunRows.reduce((s, d) => s + d.metrics.male_voters, 0);
      const female = dunRows.reduce((s, d) => s + d.metrics.female_voters, 0);
      const sen = dunRows.length > 0 ? dunRows.reduce((s, d) => s + (d.metrics.senior_voters_56_plus ?? Math.round(d.metrics.total_voters * d.metrics.senior_dependency_percent / 100)), 0) / Math.max(voters, 1) * 100 : 26.8;
      const malePct = voters > 0 ? male / voters * 100 : 48.77;
      const femalePct = voters > 0 ? female / voters * 100 : 51.23;
      map.set(p.code, {
        code: p.code, name: p.name, voters, male, female, malePct, femalePct,
        seniorDep: sen, genderBal: dunRows.length > 0 ? dunRows.reduce((s, d) => s + d.metrics.gender_balance_score, 0) / dunRows.length : 97.5,
        duns: p.dunCount, age: dunRows[0]?.metrics.dominant_age_group ?? "n/a", ethnicity: dunRows[0]?.metrics.dominant_ethnicity_group ?? "n/a",
        dpt: dpt?.per_parliament.find((x) => x.parliament_code === p.code),
        ge15Winner: p.ge15Winner,
      });
    });
    return map;
  }, [duns, dpt]);

  const a = aggByCode.get(codeA);
  const b = aggByCode.get(codeB);
  if (!a || !b) return <Card className="border-mlk/20"><CardContent className="p-4 text-sm text-muted-foreground">Loading…</CardContent></Card>;

  const voterDiff = a.voters - b.voters;
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const onCopyUrl = () => {
    const url = `${window.location.origin}/?compare=${codeA}-${codeB}`;
    navigator.clipboard?.writeText(url);
    showToast("URL copied");
  };
  const onTweet = () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`PIP-MLK compare: ${a.name} vs ${b.name}`)}&url=${encodeURIComponent(window.location.href)}`, "_blank"); };
  const onWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`PIP-MLK compare ${a.name} vs ${b.name}: ${window.location.href}`)}`, "_blank"); };
  const onCsv = () => {
    const rows = [["metric", a.name, b.name], ["voters", a.voters, b.voters], ["male %", a.malePct.toFixed(1), b.malePct.toFixed(1)], ["female %", a.femalePct.toFixed(1), b.femalePct.toFixed(1)], ["senior dep", a.seniorDep.toFixed(1), b.seniorDep.toFixed(1)], ["gender bal", a.genderBal.toFixed(1), b.genderBal.toFixed(1)], ["DPT net", a.dpt?.net ?? 0, b.dpt?.net ?? 0]];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `compare-${a.code}-vs-${b.code}.csv`; link.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded");
  };

  return (
    <div className="space-y-4 fade-in-up">
      <Card className="border-mlk/20">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeftRight className="h-4 w-4 text-mlk flex-shrink-0" />
          <span>Compare two parliaments side by side. P134 has full engine data; P135–P139 use summary fallbacks pending raw SPR rolls.</span>
          {offline && (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              <WifiOff className="h-2.5 w-2.5" /> offline data
            </span>
          )}
        </CardContent>
      </Card>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Parliament A</label>
          <Select value={codeA} onValueChange={setCodeA}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{PARLIAMENTS.map((p) => <SelectItem key={p.code} value={p.code}>P{p.code} · {p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Parliament B</label>
          <Select value={codeB} onValueChange={setCodeB}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{PARLIAMENTS.map((p) => <SelectItem key={p.code} value={p.code}>P{p.code} · {p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Side-by-side */}
      <Card className="border-mlk/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-mlk" /> Side-by-side</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 py-2 border-b border-mlk/20 text-[10px] uppercase tracking-wide text-muted-foreground">
            <div>Metric</div>
            <div className="text-right text-mlk font-semibold">P{a.code} {a.name}</div>
            <div className="text-right text-mlk font-semibold">P{b.code} {b.name}</div>
          </div>
          <StatRow label="Total voters" a={a.voters.toLocaleString()} b={b.voters.toLocaleString()} highlight={a.voters > b.voters ? "a" : "b"} />
          <StatRow label="DUN count" a={String(a.duns)} b={String(b.duns)} />
          <StatRow label="Male %" a={`${a.malePct.toFixed(1)}%`} b={`${b.malePct.toFixed(1)}%`} />
          <StatRow label="Female %" a={`${a.femalePct.toFixed(1)}%`} b={`${b.femalePct.toFixed(1)}%`} />
          <StatRow label="Senior dep" a={`${a.seniorDep.toFixed(1)}%`} b={`${b.seniorDep.toFixed(1)}%`} highlight={a.seniorDep < b.seniorDep ? "a" : "b"} />
          <StatRow label="Gender balance" a={a.genderBal.toFixed(1)} b={b.genderBal.toFixed(1)} highlight={a.genderBal > b.genderBal ? "a" : "b"} />
          <StatRow label="DPT additions" a={`+${a.dpt?.additions ?? 0}`} b={`+${b.dpt?.additions ?? 0}`} />
          <StatRow label="DPT deletions" a={`−${a.dpt?.deletions ?? 0}`} b={`−${b.dpt?.deletions ?? 0}`} />
          <StatRow label="DPT net" a={`+${a.dpt?.net ?? 0}`} b={`+${b.dpt?.net ?? 0}`} highlight={(a.dpt?.net ?? 0) > (b.dpt?.net ?? 0) ? "a" : "b"} />
          <StatRow label="Dominant age" a={a.age} b={b.age} />
          <StatRow label="Dominant ethnicity" a={a.ethnicity} b={b.ethnicity} />
          <div className="grid grid-cols-3 gap-2 py-2 text-xs">
            <div className="text-muted-foreground">GE15 winner</div>
            <div className="text-right"><span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: PARTY_COLORS[a.ge15Winner] }}>{a.ge15Winner}</span></div>
            <div className="text-right"><span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: PARTY_COLORS[b.ge15Winner] }}>{b.ge15Winner}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Verdict */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-mlk" /> Verdict</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border border-border/40 p-3">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" /> Voter diff</div>
              <div className="text-lg font-bold text-mlk">{voterDiff > 0 ? "+" : ""}{voterDiff.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">{voterDiff > 0 ? `${a.name} larger` : voterDiff < 0 ? `${b.name} larger` : "equal"}</div>
            </div>
            <div className="rounded-md border border-border/40 p-3">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> DPT net diff</div>
              <div className="text-lg font-bold text-mlk">{((a.dpt?.net ?? 0) - (b.dpt?.net ?? 0)).toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">{(a.dpt?.net ?? 0) > (b.dpt?.net ?? 0) ? `${a.name} faster growth` : "comparable"}</div>
            </div>
            <div className="rounded-md border border-border/40 p-3">
              <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Senior dep risk</div>
              <div className="text-lg font-bold" style={{ color: a.seniorDep >= 30 || b.seniorDep >= 30 ? "#dc2626" : "#16a34a" }}>
                {a.seniorDep >= 30 || b.seniorDep >= 30 ? "CRITICAL" : "OK"}
              </div>
              <div className="text-[10px] text-muted-foreground">{a.seniorDep > b.seniorDep ? `${a.name} older` : `${b.name} older`}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share buttons */}
      <Card className="border-mlk/20">
        <CardContent className="p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Share comparison</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-mlk/30 hover:bg-mlk/10 hover:text-mlk" onClick={onCopyUrl}><Copy className="h-3.5 w-3.5 me-1" /> Copy URL</Button>
            <Button size="sm" variant="outline" className="border-mlk/30 hover:bg-mlk/10 hover:text-mlk" onClick={onTweet}><Twitter className="h-3.5 w-3.5 me-1" /> Tweet</Button>
            <Button size="sm" variant="outline" className="border-mlk/30 hover:bg-mlk/10 hover:text-mlk" onClick={onWhatsApp}><MessageCircle className="h-3.5 w-3.5 me-1" /> WhatsApp</Button>
            <Button size="sm" variant="outline" className="border-mlk/30 hover:bg-mlk/10 hover:text-mlk" onClick={onCsv}><FileSpreadsheet className="h-3.5 w-3.5 me-1" /> CSV</Button>
          </div>
          {toast && <div className="text-[10px] text-emerald-600 mt-2">{toast}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
