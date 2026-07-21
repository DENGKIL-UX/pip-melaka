"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Heart, Users, DollarSign, Home, Scale, Info, WifiOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { DUN_FALLBACK, DOSM_FALLBACK } from "@/lib/fallback-data";

interface DunRecord {
  geography: { parliament_code: string; dun_code: string; dun_name: string };
  metrics: {
    total_voters: number; male_voters: number; female_voters: number;
    senior_dependency_percent: number; gender_balance_score: number;
    male_percent: number; female_percent: number;
  };
}
interface DosmData {
  state: { population: number; median_household_income: number; poverty_rate: number; gini_coefficient: number; unemployment_rate: number };
  districts: Array<{ name: string; population: number; median_income: number; poverty_rate: number; gini: number; unemployment: number }>;
}

function seniorColor(pct: number) {
  if (pct >= 30) return "#dc2626";
  if (pct >= 25) return "#d97706";
  return "#16a34a";
}
function seniorTier(pct: number): "critical" | "warning" | "clear" {
  if (pct >= 30) return "critical";
  if (pct >= 25) return "warning";
  return "clear";
}

export function RiskSocioeconomicTab() {
  const [duns, setDuns] = useState<DunRecord[] | null>(null);
  const [dosm, setDosm] = useState<DosmData | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/p134/dun-intelligence.jsonl").then((r) => r.text()).then((t) => t.trim().split("\n").map((l) => JSON.parse(l) as DunRecord)),
      fetch("/data/socioeconomic/melaka-dosm.json").then((r) => r.json()),
    ]).then(([d, s]) => { setDuns(d); setDosm(s as DosmData); }).catch(() => {
      // Dev server OOM / fetch failure — render inline fallback so the tab
      // ALWAYS shows content. Mirrors public/data/p134/dun-intelligence.jsonl
      // and public/data/socioeconomic/melaka-dosm.json.
      setDuns(DUN_FALLBACK as DunRecord[]);
      setDosm(DOSM_FALLBACK);
      setOffline(true);
    });
  }, []);

  if (!duns || !dosm) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="border-mlk/20"><CardContent className="p-4 h-32 animate-pulse bg-muted/40" /></Card>)}</div>;

  const critical = duns.filter((d) => d.metrics.senior_dependency_percent >= 30);
  const warning = duns.filter((d) => d.metrics.senior_dependency_percent >= 25 && d.metrics.senior_dependency_percent < 30);
  const clear = duns.filter((d) => d.metrics.senior_dependency_percent < 25);

  const radialData = duns.map((d) => ({
    name: d.geography.dun_name,
    pct: d.metrics.senior_dependency_percent,
    fill: seniorColor(d.metrics.senior_dependency_percent),
  }));
  const genderData = duns.map((d) => ({
    name: d.geography.dun_name,
    balance: d.metrics.gender_balance_score,
  }));

  return (
    <div className="space-y-4 fade-in-up">
      {offline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-xs">
            <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">Offline data mode.</span>
            <span className="text-muted-foreground">Live fetch failed (dev server may have restarted) — showing cached inline snapshot of P134 DUN + DOSM data.</span>
          </CardContent>
        </Card>
      )}

      {/* Risk KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-500/30 hover-lift"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-1"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Critical</span><ShieldAlert className="h-4 w-4 text-red-600" /></div>
          <div className="text-2xl font-bold text-red-600">{critical.length}</div>
          <div className="text-[10px] text-muted-foreground">Senior dep ≥30%</div>
        </CardContent></Card>
        <Card className="border-amber-500/30 hover-lift"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-1"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Warning</span><Heart className="h-4 w-4 text-amber-600" /></div>
          <div className="text-2xl font-bold text-amber-600">{warning.length}</div>
          <div className="text-[10px] text-muted-foreground">Senior dep ≥25%</div>
        </CardContent></Card>
        <Card className="border-emerald-500/30 hover-lift"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-1"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Clear</span><Users className="h-4 w-4 text-emerald-600" /></div>
          <div className="text-2xl font-bold text-emerald-600">{clear.length}</div>
          <div className="text-[10px] text-muted-foreground">Below threshold</div>
        </CardContent></Card>
      </div>

      {/* Radial + gender charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-mlk/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-mlk" /> Senior dep by DUN</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="20%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 40]} tick={{ fontSize: 9 }} />
                  <RadialBar background dataKey="pct" cornerRadius={6} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Senior dep"]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-mlk/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-mlk" /> Gender balance by DUN</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} domain={[80, 100]} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="balance" name="Gender balance" fill="#C77B2C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-muted-foreground text-center mt-1">100 = perfect male/female parity</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-DUN risk signals */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Per-DUN risk signals</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">DUN</TableHead>
                <TableHead className="text-[10px] text-right">Voters</TableHead>
                <TableHead className="text-[10px] text-right">Senior dep</TableHead>
                <TableHead className="text-[10px] text-right">Gender bal</TableHead>
                <TableHead className="text-[10px]">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duns.map((d) => {
                const tier = seniorTier(d.metrics.senior_dependency_percent);
                return (
                  <TableRow key={d.geography.dun_code}>
                    <TableCell className="text-[10px]">{d.geography.dun_name} <span className="font-mono text-muted-foreground">N{d.geography.dun_code}</span></TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{d.metrics.total_voters.toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] text-right" style={{ color: seniorColor(d.metrics.senior_dependency_percent) }}>{d.metrics.senior_dependency_percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-[10px] text-right">{d.metrics.gender_balance_score.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${tier === "critical" ? "border-red-500/40 text-red-600" : tier === "warning" ? "border-amber-500/40 text-amber-600" : "border-emerald-500/40 text-emerald-600"}`}>
                        {tier.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DOSM panel */}
      <Card className="border-mlk/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-mlk" /> DOSM socioeconomic panel</CardTitle></CardHeader>
        <CardContent>
          <div className="text-[10px] text-muted-foreground mb-3 flex items-center gap-2"><Info className="h-3 w-3 text-mlk" /> Verified tier · source: DOSM Census 2020 + HIES 2022.</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* State card */}
            <Card className="border-mlk/40 bg-mlk-radial">
              <CardContent className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-2">Melaka (state)</div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Home className="h-3 w-3" /> Population</span><span className="font-mono">{dosm.state.population.toLocaleString()}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Median income</span><span className="font-mono">RM{dosm.state.median_household_income.toLocaleString()}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Poverty</span><span className="font-mono">{dosm.state.poverty_rate}%</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" /> Gini</span><span className="font-mono">{dosm.state.gini_coefficient.toFixed(3)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Unemployment</span><span className="font-mono">{dosm.state.unemployment_rate}%</span></div>
                </div>
              </CardContent>
            </Card>
            {/* Districts */}
            {dosm.districts.map((d) => (
              <Card key={d.name} className="border-mlk/20 hover-lift">
                <CardContent className="p-3">
                  <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-2">{d.name}</div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Home className="h-3 w-3" /> Pop</span><span className="font-mono">{d.population.toLocaleString()}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Income</span><span className="font-mono">RM{d.median_income.toLocaleString()}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Poverty</span><span className={`font-mono ${d.poverty_rate >= 0.7 ? "text-amber-600" : ""}`}>{d.poverty_rate}%</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" /> Gini</span><span className={`font-mono ${d.gini >= 0.4 ? "text-amber-600" : ""}`}>{d.gini.toFixed(3)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Unemp</span><span className="font-mono">{d.unemployment}%</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3">
            <strong className="text-mlk">Note:</strong> Jasin district has highest poverty (0.8%) + highest Gini (0.405) — flagged as INFO signal in S2D console.
          </div>
        </CardContent>
      </Card>

      {/* §7.5: Risk Matrix — 5×5 probability×impact grid */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-mlk" /> Risk Matrix — DUN-level (5×5)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="p-1 text-muted-foreground text-left">Impact ↓ / Probability →</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">1<br/><span className="text-[8px]">Low</span></th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">2</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">3<br/><span className="text-[8px]">Med</span></th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">4</th>
                  <th className="p-1 text-center font-semibold text-muted-foreground">5<br/><span className="text-[8px]">High</span></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { impact: 5, label: "5 — Critical", color: "#dc2626" },
                  { impact: 4, label: "4 — High", color: "#ea580c" },
                  { impact: 3, label: "3 — Medium", color: "#f59e0b" },
                  { impact: 2, label: "2 — Low", color: "#84cc16" },
                  { impact: 1, label: "1 — Minimal", color: "#22c55e" },
                ].map((row) => (
                  <tr key={row.impact}>
                    <td className="p-1 font-semibold text-right" style={{ color: row.color }}>{row.label}</td>
                    {[1, 2, 3, 4, 5].map((prob) => {
                      const score = row.impact * prob;
                      const bg = score >= 15 ? "#dc262620" : score >= 10 ? "#ea580c20" : score >= 6 ? "#f59e0b20" : "#22c55e20";
                      // Find DUNs that fall in this cell
                      const dunsInCell = duns.filter((d) => {
                        const probScore = d.metrics.senior_dependency_percent >= 30 ? 5 : d.metrics.senior_dependency_percent >= 25 ? 4 : d.metrics.senior_dependency_percent >= 20 ? 3 : d.metrics.senior_dependency_percent >= 15 ? 2 : 1;
                        const impactScore = d.metrics.total_voters > 15000 ? 5 : d.metrics.total_voters > 10000 ? 4 : d.metrics.total_voters > 5000 ? 3 : 2;
                        return probScore === prob && impactScore === row.impact;
                      });
                      return (
                        <td key={prob} className="p-1 text-center border border-border/40" style={{ backgroundColor: bg }}>
                          {dunsInCell.length > 0 ? (
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {dunsInCell.map((d) => (
                                <span key={d.geography.dun_code} className="text-[8px] font-mono px-1 py-0.5 rounded bg-background/80" title={`N${d.geography.dun_code} ${d.geography.dun_name}`}>
                                  N{d.geography.dun_code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[8px] text-muted-foreground/30">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            Probability = senior dependency tier · Impact = voter density · Cells show DUN codes in that risk zone
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
