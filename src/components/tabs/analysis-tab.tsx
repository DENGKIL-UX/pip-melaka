"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, PlusCircle, MinusCircle, Info, Star, WifiOff } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { DPT_FALLBACK } from "@/lib/fallback-data";

interface DptData {
  evidence_tier: string;
  source: string;
  total_additions: number;
  total_deletions: number;
  total_net: number;
  months: string[];
  per_month: Array<{ month: string; additions: number; deletions: number; net: number; mom_delta: number }>;
  per_parliament: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>;
}

function Kpi({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <Card className="border-mlk/20 hover-lift">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function AnalysisTab() {
  const [data, setData] = useState<DptData | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch("/data/dpt/spr-dpt-pameran-summary.json")
      .then((r) => r.json())
      .then((d) => setData(d as DptData))
      .catch(() => {
        // Dev server OOM / fetch failure — render inline fallback so the tab
        // ALWAYS shows content. Mirrors public/data/dpt/spr-dpt-pameran-summary.json.
        setData(DPT_FALLBACK as DptData);
        setOffline(true);
      });
  }, []);

  if (!data) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="border-mlk/20"><CardContent className="p-4 h-32 animate-pulse bg-muted/40" /></Card>)}</div>;

  const monthData = data.per_month.map((m) => ({ ...m, label: m.month.slice(5) }));
  const parlData = data.per_parliament.map((p) => ({ ...p, name: p.parliament_name }));

  return (
    <div className="space-y-4 fade-in-up">
      <Card className="border-mlk/20">
        <CardContent className="p-3 flex items-center gap-2 text-xs">
          <Info className="h-4 w-4 text-mlk" />
          <span><strong className="text-mlk">Verified tier.</strong> {data.source}. {data.months.length} months of SPR DPT Pameran PDFs (Jan–May 2026).</span>
          {offline ? (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              <WifiOff className="h-2.5 w-2.5" /> offline data
            </span>
          ) : (
            <Badge variant="outline" className="ms-auto text-[9px] border-mlk/40 text-mlk flex items-center gap-1"><Star className="h-2.5 w-2.5" /> Melaka unique feature</Badge>
          )}
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi icon={PlusCircle} label="Additions (5 mo)" value={`+${data.total_additions.toLocaleString()}`} color="#16a34a" />
        <Kpi icon={MinusCircle} label="Deletions (5 mo)" value={`−${data.total_deletions.toLocaleString()}`} color="#dc2626" />
        <Kpi icon={TrendingUp} label="Net change" value={`+${data.total_net.toLocaleString()}`} color="#C77B2C" />
      </div>

      {/* 5-month trend HEADLINE */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-mlk" /> 5-month DPT trend
            <Badge className="text-[9px] bg-mlk text-white border-transparent ms-1">HEADLINE</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={1000} stroke="#C77B2C" strokeDasharray="4 4" label={{ value: "1,000 net", fontSize: 9, fill: "#C77B2C" }} />
                <Line type="monotone" dataKey="additions" name="Additions" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="deletions" name="Deletions" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#C77B2C" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Net additions remain positive across all 5 months — average MoM delta {data.per_month.reduce((s, m) => s + m.mom_delta, 0) / data.per_month.length}/mo.
            Lowest net month: {data.per_month.reduce((a, b) => b.net < a.net ? b : a).month} ({Math.min(...data.per_month.map((m) => m.net))} net).
          </div>
        </CardContent>
      </Card>

      {/* Per-parliament bar chart */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Per-parliament churn</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parlData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="additions" name="Additions" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="deletions" name="Deletions" fill="#dc2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="net" name="Net" fill="#C77B2C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-parliament table */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Per-parliament breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Parliament</TableHead>
                <TableHead className="text-[10px] text-right">Additions</TableHead>
                <TableHead className="text-[10px] text-right">Deletions</TableHead>
                <TableHead className="text-[10px] text-right">Net</TableHead>
                <TableHead className="text-[10px] text-right">Churn ratio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.per_parliament.map((p) => {
                const ratio = (p.additions / Math.max(p.deletions, 1)).toFixed(2);
                return (
                  <TableRow key={p.parliament_code}>
                    <TableCell className="text-[10px]">{p.parliament_name} <span className="font-mono text-muted-foreground">P{p.parliament_code}</span></TableCell>
                    <TableCell className="text-[10px] text-right text-emerald-600">+{p.additions.toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] text-right text-red-600">−{p.deletions.toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] text-right text-mlk font-semibold">+{p.net.toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{ratio}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardContent className="p-3 text-[10px] text-muted-foreground flex items-start gap-2">
          <TrendingDown className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-mlk" />
          <div>
            <strong className="text-mlk">Why this matters:</strong> Continuous positive net churn in P137 Hang Tuah Jaya (highest net {data.per_parliament.find((p) => p.parliament_code === "137")?.net}) suggests
            urban in-migration; combined with the PRN15 BN landslide, indicates shifting voter base requiring re-canvass before GE16.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
