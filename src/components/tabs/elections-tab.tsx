"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Vote, Calendar, Trophy, WifiOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { PARLIAMENTS, getDunName } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";
import { ELECTIONS_FALLBACK } from "@/lib/fallback-data";

interface Election {
  id: string; name: string; date: string; headline_fact: string;
  parliament_summary: { PH: number; BN: number; PN: number; total: number } | null;
  dun_summary: { PH: number; BN: number; PN: number; total: number } | null;
  parliament_results: Array<{ parliament_code: string; winner: "PH" | "BN" | "PN"; votes_pct: number; runner_up: string; margin_pct: number }>;
  dun_results: Array<{ parliament_code: string; dun_code: string; winner: "PH" | "BN" | "PN"; vote_share: Record<string, number> }>;
}

function partyHex(p: string) { return PARTY_COLORS[p as keyof typeof PARTY_COLORS] ?? PARTY_COLORS.OTH; }

function SeatCount({ summary }: { summary: { PH: number; BN: number; PN: number; total: number } | null }) {
  if (!summary) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {(["BN", "PH", "PN"] as const).map((p) => summary[p] > 0 && (
        <span key={p} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: partyHex(p) }}>
          {p} {summary[p]}
        </span>
      ))}
      <span className="text-[10px] text-muted-foreground self-center">/ {summary.total}</span>
    </div>
  );
}

function ElectionView({ el }: { el: Election }) {
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

      {/* Results table */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-mlk" /> Results table</CardTitle></CardHeader>
        <CardContent>
          {showDunBars ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Parliament</TableHead>
                  <TableHead className="text-[10px]">DUN</TableHead>
                  <TableHead className="text-[10px]">Winner</TableHead>
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
                    <TableCell><span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: partyHex(d.winner) }}>{d.winner}</span></TableCell>
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
                  <TableHead className="text-[10px]">Winner</TableHead>
                  <TableHead className="text-[10px] text-right">Vote %</TableHead>
                  <TableHead className="text-[10px]">Runner-up</TableHead>
                  <TableHead className="text-[10px] text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {el.parliament_results.map((r) => (
                  <TableRow key={r.parliament_code}>
                    <TableCell className="text-[10px]">{PARLIAMENTS.find((p) => p.code === r.parliament_code)?.name ?? `P${r.parliament_code}`} <span className="font-mono text-muted-foreground">P{r.parliament_code}</span></TableCell>
                    <TableCell><span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: partyHex(r.winner) }}>{r.winner}</span></TableCell>
                    <TableCell className="text-[10px] text-right">{r.votes_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-[10px]">{r.runner_up}</TableCell>
                    <TableCell className="text-[10px] text-right">{r.margin_pct.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ElectionsTab() {
  const [data, setData] = useState<Election[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch("/data/elections/melaka-elections.json")
      .then((r) => r.json())
      .then((d) => setData(d.elections as Election[]))
      .catch(() => {
        // Dev server OOM / fetch failure — render inline fallback so the tab
        // ALWAYS shows content. Mirrors public/data/elections/melaka-elections.json.
        setData(ELECTIONS_FALLBACK as Election[]);
        setOffline(true);
      });
  }, []);

  if (!data) return <Card className="border-mlk/20"><CardContent className="p-8 animate-pulse bg-muted/30 text-muted-foreground text-sm">Loading elections…</CardContent></Card>;

  return (
    <div className="space-y-3 fade-in-up">
      <Card className="border-mlk/20">
        <CardContent className="p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Vote className="h-4 w-4 text-mlk flex-shrink-0" />
          <span>Verified tier · source: ElectionData.my (community-maintained, sourced from SPR gazettes). PRN15 is the headline: BN landslide 21/28 DUN.</span>
          {offline && (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              <WifiOff className="h-2.5 w-2.5" /> offline data
            </span>
          )}
        </CardContent>
      </Card>
      <Tabs defaultValue="PRN15">
        <TabsList className="w-full justify-start">
          {data.map((e) => <TabsTrigger key={e.id} value={e.id} className="text-xs">{e.id}</TabsTrigger>)}
        </TabsList>
        {data.map((e) => (
          <TabsContent key={e.id} value={e.id}><ElectionView el={e} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
