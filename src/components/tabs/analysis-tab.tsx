"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, PlusCircle, MinusCircle, Info, Star, WifiOff, Grid3x3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart } from "recharts";
import { DPT_FALLBACK } from "@/lib/fallback-data";
import { useI18n } from "@/lib/i18n";

interface DptData {
  evidence_tier: string;
  source: string;
  total_additions: number;
  total_deletions: number;
  total_net: number;
  months: string[];
  per_month: Array<{ month: string; additions: number; deletions: number; net: number; mom_delta: number }>;
  per_parliament: Array<{ parliament_code: string; parliament_name: string; additions: number; deletions: number; net: number }>;
  per_dun?: Array<{ parliament_code: string; parliament_name: string; dun_code: string; dun_name: string; additions: number; deletions: number; net: number; voters: number; verified: boolean }>;
  total_dun?: number;
}

function Kpi({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string; color: string }) {
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
  const { t } = useI18n();
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
          <span><strong className="text-mlk">{t("analysis.verifiedTier")}</strong> {data.source}. {t("analysis.sourceSummary").replace("{months}", String(data.months.length))}</span>
          {offline ? (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              <WifiOff className="h-2.5 w-2.5" /> {t("analysis.offlineData")}
            </span>
          ) : (
            <Badge variant="outline" className="ms-auto text-[9px] border-mlk/40 text-mlk flex items-center gap-1"><Star className="h-2.5 w-2.5" /> {t("analysis.uniqueFeature")}</Badge>
          )}
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi icon={PlusCircle} label={t("analysis.kpiAdditions")} value={`+${data.total_additions.toLocaleString()}`} color="#16a34a" />
        <Kpi icon={MinusCircle} label={t("analysis.kpiDeletions")} value={`−${data.total_deletions.toLocaleString()}`} color="#dc2626" />
        <Kpi icon={TrendingUp} label={t("analysis.kpiNet")} value={`+${data.total_net.toLocaleString()}`} color="#C77B2C" />
      </div>

      {/* 5-month trend HEADLINE */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-mlk" /> {t("analysis.trendTitle")}
            <Badge className="text-[9px] bg-mlk text-white border-transparent ms-1">{t("analysis.headline")}</Badge>
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
                <ReferenceLine y={1000} stroke="#C77B2C" strokeDasharray="4 4" label={{ value: t("analysis.refLine1000"), fontSize: 9, fill: "#C77B2C" }} />
                <Line type="monotone" dataKey="additions" name={t("analysis.legendAdditions")} stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="deletions" name={t("analysis.legendDeletions")} stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name={t("analysis.legendNet")} stroke="#C77B2C" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            {t("analysis.trendNote")
              .replace("{avg}", String(data.per_month.reduce((s, m) => s + m.mom_delta, 0) / data.per_month.length))
              .replace("{month}", data.per_month.reduce((a, b) => b.net < a.net ? b : a).month)
              .replace("{min}", String(Math.min(...data.per_month.map((m) => m.net))))}
          </div>
        </CardContent>
      </Card>

      {/* Per-parliament bar chart */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.parlChurnTitle")}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parlData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="additions" name={t("analysis.legendAdditions")} fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="deletions" name={t("analysis.legendDeletions")} fill="#dc2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="net" name={t("analysis.legendNet")} fill="#C77B2C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-parliament table */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("analysis.parlBreakdownTitle")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">{t("analysis.colParliament")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("analysis.colAdditions")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("analysis.colDeletions")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("analysis.colNet")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("analysis.colChurnRatio")}</TableHead>
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

      {/* Per-DUN churn table — NEW: DUN-level breakdown */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-mlk" /> {t("analysis.dunChurnTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.per_dun && data.per_dun.length > 0 ? (
            <>
              <div className="max-h-96 overflow-y-auto scrollbar-mlk">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">{t("analysis.colDun")}</TableHead>
                      <TableHead className="text-[10px]">{t("analysis.colParliament")}</TableHead>
                      <TableHead className="text-[10px] text-right">{t("analysis.colAdditions")}</TableHead>
                      <TableHead className="text-[10px] text-right">{t("analysis.colDeletions")}</TableHead>
                      <TableHead className="text-[10px] text-right">{t("analysis.colNet")}</TableHead>
                      <TableHead className="text-[10px] text-right">{t("analysis.colVoters")}</TableHead>
                      <TableHead className="text-[10px]">{t("analysis.colStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.per_dun.map((d) => (
                      <TableRow key={`${d.parliament_code}-${d.dun_code}`} className={d.verified ? "" : "opacity-70"}>
                        <TableCell className="text-[10px]">
                          <span className="font-medium">{d.dun_name}</span>{" "}
                          <span className="font-mono text-muted-foreground">N{d.dun_code}</span>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{d.parliament_name} P{d.parliament_code}</TableCell>
                        <TableCell className="text-[10px] text-right text-emerald-600">+{d.additions.toLocaleString()}</TableCell>
                        <TableCell className="text-[10px] text-right text-red-600">−{d.deletions.toLocaleString()}</TableCell>
                        <TableCell className="text-[10px] text-right text-mlk font-semibold">+{d.net.toLocaleString()}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{d.voters > 0 ? d.voters.toLocaleString() : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[9px] ${d.verified ? "border-emerald-500/40 text-emerald-600" : "border-amber-500/40 text-amber-600"}`}>
                            {d.verified ? t("analysis.badgeVerified") : t("analysis.badgeEst")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-[9px] text-muted-foreground mt-2 italic">
                {t("analysis.dunChurnNote")}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground p-4">{t("analysis.noDunData")}</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardContent className="p-3 text-[10px] text-muted-foreground flex items-start gap-2">
          <TrendingDown className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-mlk" />
          <div>
            <strong className="text-mlk">{t("analysis.whyMattersLabel")}</strong> {t("analysis.whyMattersBody").replace("{net}", String(data.per_parliament.find((p) => p.parliament_code === "137")?.net ?? 0))}
          </div>
        </CardContent>
      </Card>

      {/* §7.4: Forecast extension with 95% confidence interval shading */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-mlk" /> {t("analysis.forecastTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // Build forecast data from historical net churn
            const histData = data.per_month.map((m) => ({ month: m.month, actual: m.net }));
            const avgNet = histData.reduce((s, d) => s + d.actual, 0) / histData.length;
            const stdDev = Math.sqrt(histData.reduce((s, d) => s + (d.actual - avgNet) ** 2, 0) / histData.length);
            // Generate 6-month forecast
            const forecastData = Array.from({ length: 6 }, (_, i) => {
              const monthLabel = `F+${i + 1}`;
              const forecast = avgNet * (1 + (i * 0.02)); // slight upward trend
              const ci = stdDev * 1.96 * Math.sqrt(1 + i / histData.length); // widening CI
              return {
                month: monthLabel,
                forecast: Math.round(forecast),
                lower: Math.round(forecast - ci),
                upper: Math.round(forecast + ci),
              };
            });
            const combined = [...histData.map((d) => ({ ...d, forecast: null, lower: null, upper: null })), ...forecastData.map((d) => ({ ...d, actual: null }))];

            return (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={combined}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area dataKey="upper" stroke="none" fill="#C77B2C" fillOpacity={0.08} name={t("analysis.ciUpper")} />
                    <Area dataKey="lower" stroke="none" fill="#C77B2C" fillOpacity={0.08} name={t("analysis.ciLower")} />
                    {/* Actual line */}
                    <Line dataKey="actual" stroke="#C77B2C" strokeWidth={2} dot={{ r: 3 }} name={t("analysis.actualNet")} connectNulls={false} />
                    {/* Forecast line (dashed) */}
                    <Line dataKey="forecast" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name={t("analysis.forecast")} connectNulls={false} />
                    <ReferenceLine x="F+1" stroke="var(--border)" strokeDasharray="2 2" label={{ value: t("analysis.forecastArrow"), position: "top", fontSize: 9, fill: "var(--muted-foreground)" }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                  <div className="rounded-md border border-mlk/20 p-2 text-center">
                    <div className="text-muted-foreground">{t("analysis.statAvgMonthlyNet")}</div>
                    <div className="text-lg font-bold text-mlk">+{Math.round(avgNet).toLocaleString()}</div>
                  </div>
                  <div className="rounded-md border border-mlk/20 p-2 text-center">
                    <div className="text-muted-foreground">{t("analysis.statStdDev")}</div>
                    <div className="text-lg font-bold text-amber-600">±{Math.round(stdDev).toLocaleString()}</div>
                  </div>
                  <div className="rounded-md border border-mlk/20 p-2 text-center">
                    <div className="text-muted-foreground">{t("analysis.stat6moProjected")}</div>
                    <div className="text-lg font-bold text-emerald-600">+{Math.round(avgNet * 6).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground mt-2">
                  {t("analysis.forecastNote")}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
