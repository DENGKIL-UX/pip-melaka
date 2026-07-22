"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ShieldAlert, Heart, Info, WifiOff, Pyramid } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, RadarChart, Radar, PolarGrid, PolarRadiusAxis } from "recharts";
import { getDunName } from "@/lib/melaka-constants";
import { MLK_ACCENT } from "@/lib/party-colors";
import { DUN_FALLBACK } from "@/lib/fallback-data";
import { useI18n } from "@/lib/i18n";

type SeniorTier = "critical" | "warning" | "clear";

// i18n key maps for the three senior-dependency risk tiers.
// `*Upper` variants render the uppercase badge text used inside the
// RiskSignal cards; lowercase variants render the inline table badge and the
// summary count badges. Mirrors the typed-key-map pattern established in
// s2d-console-tab.tsx (SEVERITY_I18N_KEY / STATUS_I18N_KEY).
const TIER_UPPER_I18N_KEY: Record<SeniorTier, string> = {
  critical: "demo.criticalUpper",
  warning: "demo.warningUpper",
  clear: "demo.clearUpper",
};
const TIER_LOWER_I18N_KEY: Record<SeniorTier, string> = {
  critical: "demo.critical",
  warning: "demo.warning",
  clear: "demo.clear",
};

interface DunRecord {
  geography: { parliament_code: string; dun_code: string; dun_name: string };
  metrics: {
    total_voters: number; male_voters: number; female_voters: number;
    senior_voters_56_plus: number; senior_dependency_percent: number; gender_balance_score: number;
    male_percent: number; female_percent: number;
    dominant_age_group: string; dominant_ethnicity_group: string;
  };
  distributions?: {
    age_band_counts?: Record<string, number>;
    ethnicity_counts?: Record<string, number>;
    profession_group_counts?: Record<string, number>;
  };
}

// Age-band display labels + ordering for population pyramid
const AGE_BANDS: Array<{ key: string; label: string }> = [
  { key: "18_20", label: "18–20" },
  { key: "21_29", label: "21–29" },
  { key: "30_39", label: "30–39" },
  { key: "40_49", label: "40–49" },
  { key: "50_55", label: "50–55" },
  { key: "56_64", label: "56–64" },
  { key: "65_PLUS", label: "65+" },
];

function seniorColor(pct: number) {
  if (pct >= 30) return "#dc2626"; // red — critical
  if (pct >= 25) return "#d97706"; // amber — warning
  return "#16a34a"; // green — clear
}

function seniorTier(pct: number): SeniorTier {
  if (pct >= 30) return "critical";
  if (pct >= 25) return "warning";
  return "clear";
}

function RiskSignal({ d }: { d: DunRecord }) {
  const { t } = useI18n();
  const tier = seniorTier(d.metrics.senior_dependency_percent);
  if (tier === "clear") return null;
  const Icon = tier === "critical" ? ShieldAlert : Heart;
  return (
    <div className={`rounded-md border p-2 text-xs flex items-start gap-2 ${tier === "critical" ? "border-red-500/40 bg-red-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
      <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tier === "critical" ? "text-red-600" : "text-amber-600"}`} />
      <div>
        <span className="font-medium">{d.geography.dun_name} (N{d.geography.dun_code})</span>{" "}
        <span className="text-muted-foreground">{t("demo.seniorDepFull")} {d.metrics.senior_dependency_percent.toFixed(1)}%</span>
        <Badge variant="outline" className={`ms-1 text-[9px] ${tier === "critical" ? "border-red-500/40 text-red-600" : "border-amber-500/40 text-amber-600"}`}>
          {t(TIER_UPPER_I18N_KEY[tier])}
        </Badge>
      </div>
    </div>
  );
}

export function DemographicsTab() {
  const { t } = useI18n();
  const [duns, setDuns] = useState<DunRecord[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch("/data/p134/dun-intelligence.jsonl")
      .then((r) => r.text())
      .then((txt) => {
        const lines = txt.trim().split("\n");
        setDuns(lines.map((l) => JSON.parse(l) as DunRecord));
      })
      .catch(() => {
        // Dev server OOM / fetch failure — render inline fallback so the tab
        // ALWAYS shows content. Mirrors public/data/p134/dun-intelligence.jsonl.
        setDuns(DUN_FALLBACK as DunRecord[]);
        setOffline(true);
      });
  }, []);

  if (!duns) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="border-mlk/20"><CardContent className="p-4 h-32 animate-pulse bg-muted/40" /></Card>)}
      </div>
    );
  }

  const genderData = duns.map((d) => ({
    name: d.geography.dun_name,
    male: d.metrics.male_percent,
    female: d.metrics.female_percent,
  }));
  const radialData = duns.map((d) => ({
    name: d.geography.dun_name,
    pct: d.metrics.senior_dependency_percent,
    fill: seniorColor(d.metrics.senior_dependency_percent),
  }));
  const criticalCount = duns.filter((d) => d.metrics.senior_dependency_percent >= 30).length;
  const warningCount = duns.filter((d) => d.metrics.senior_dependency_percent >= 25 && d.metrics.senior_dependency_percent < 30).length;
  const totalVoters = duns.reduce((s, d) => s + d.metrics.total_voters, 0);

  // Build aggregated population pyramid across all DUNs.
  // The engine outputs age_band_counts (gender-agnostic). We split each band
  // by the overall male/female ratio of the DUN to produce a synthetic pyramid.
  // This is explicitly labeled as "estimated" — the underlying engine data is
  // age × DUN, not age × gender (PDPA: no per-voter gender+age cross-tab).
  const pyramidData = AGE_BANDS.map(({ key, label }) => {
    let totalInBand = 0;
    let malePool = 0;
    let femalePool = 0;
    duns.forEach((d) => {
      const band = d.distributions?.age_band_counts?.[key] ?? 0;
      totalInBand += band;
      malePool += d.metrics.male_voters;
      femalePool += d.metrics.female_voters;
    });
    const ratio = malePool + femalePool > 0 ? malePool / (malePool + femalePool) : 0.5;
    const male = Math.round(totalInBand * ratio);
    const female = Math.round(totalInBand * (1 - ratio));
    return { label, male: -male, female, total: male + female };
  }).reverse(); // reverse so 18-20 is at the bottom of the pyramid

  const totalMaleVoters = duns.reduce((s, d) => s + d.metrics.male_voters, 0);
  const totalFemaleVoters = duns.reduce((s, d) => s + d.metrics.female_voters, 0);
  const youthVoters = pyramidData.filter((p) => p.label === "18–20" || p.label === "21–29").reduce((s, p) => s + p.total, 0);
  const seniorVoters = pyramidData.filter((p) => p.label === "56–64" || p.label === "65+").reduce((s, p) => s + p.total, 0);
  const youthPct = totalVoters > 0 ? (youthVoters / totalVoters) * 100 : 0;
  const seniorPct = totalVoters > 0 ? (seniorVoters / totalVoters) * 100 : 0;

  return (
    <div className="space-y-4 fade-in-up">
      <Card className="border-mlk/20">
        <CardContent className="p-3 flex items-center gap-2 text-xs">
          <Info className="h-4 w-4 text-mlk" />
          <span><strong className="text-mlk">{t("demo.proxyBannerTitle")}</strong> {t("demo.proxyBannerBody")}</span>
          {offline ? (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">
              <WifiOff className="h-2.5 w-2.5" /> {t("demo.offlineData")}
            </span>
          ) : (
            <Badge variant="outline" className="ms-auto text-[9px] border-mlk/40 text-mlk">{t("demo.dunVotersSummary").replace("{duns}", String(duns.length)).replace("{voters}", totalVoters.toLocaleString())}</Badge>
          )}
        </CardContent>
      </Card>

      {/* Gender + Senior dep charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-mlk/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-mlk" /> {t("demo.genderSplitByDun")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 60]} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="male" name={t("demo.malePct")} fill="#0F7DC2" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="female" name={t("demo.femalePct")} fill="#E22926" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-mlk/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-mlk" /> {t("demo.seniorDepByDun")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="20%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 40]} tick={{ fontSize: 9 }} />
                  <RadialBar background dataKey="pct" cornerRadius={6} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v.toFixed(1)}%`, t("demo.seniorDep")]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-muted-foreground flex gap-3 justify-center mt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> {t("demo.ge30Critical")}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600" /> {t("demo.ge25Warning")}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> {t("demo.lt25Clear")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Population pyramid */}
      <Card className="border-mlk/20 bg-mlk-radial">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Pyramid className="h-4 w-4 text-mlk" /> {t("demo.populationPyramid")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pyramidData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v: number) => Math.abs(v).toLocaleString()}
                    domain={[-Math.max(...pyramidData.map((p) => Math.abs(p.male))) * 1.1, Math.max(...pyramidData.map((p) => p.female)) * 1.1]}
                  />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={50} />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    formatter={(v: number, k: string) => [Math.abs(v).toLocaleString(), k === "male" ? t("demo.maleEst") : t("demo.femaleEst")]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => (v === "male" ? t("demo.maleEst") : t("demo.femaleEst"))} />
                  <Bar dataKey="male" name={t("demo.maleEst")} fill="#0F7DC2" radius={[0, 0, 0, 3]} />
                  <Bar dataKey="female" name={t("demo.femaleEst")} fill="#E22926" radius={[0, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <div className="rounded-lg border border-mlk/20 bg-background/60 p-3">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{t("demo.totalVoters")}</div>
                <div className="text-xl font-bold text-mlk">{totalVoters.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">{t("demo.acrossDuns").replace("{n}", String(duns.length))}</div>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{t("demo.maleFemale")}</div>
                <div className="text-sm font-semibold">
                  <span className="text-blue-600 dark:text-blue-300">{totalMaleVoters.toLocaleString()}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-600 dark:text-red-300">{totalFemaleVoters.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {totalVoters > 0 ? ((totalMaleVoters / totalVoters) * 100).toFixed(1) : "0"}% / {totalVoters > 0 ? ((totalFemaleVoters / totalVoters) * 100).toFixed(1) : "0"}%
                </div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{t("demo.youth1829")}</div>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{youthVoters.toLocaleString()} <span className="text-[10px] text-muted-foreground">({youthPct.toFixed(1)}%)</span></div>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{t("demo.senior56plus")}</div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">{seniorVoters.toLocaleString()} <span className="text-[10px] text-muted-foreground">({seniorPct.toFixed(1)}%)</span></div>
              </div>
            </div>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2 italic">
            {t("demo.pyramidNoteP1")}<code className="font-mono">{t("demo.pyramidNoteCode")}</code>{t("demo.pyramidNoteP2")}
          </div>
        </CardContent>
      </Card>

      {/* Per-DUN table */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("demo.perDunDemographics")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">{t("demo.colDun")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("demo.colVoters")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("demo.colMale")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("demo.colFemale")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("demo.colSeniorDep")}</TableHead>
                <TableHead className="text-[10px] text-right">{t("demo.colGenderBal")}</TableHead>
                <TableHead className="text-[10px]">{t("demo.colAgeGroup")}</TableHead>
                <TableHead className="text-[10px]">{t("demo.colEthnicity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duns.map((d) => {
                const tier = seniorTier(d.metrics.senior_dependency_percent);
                return (
                  <TableRow key={`${d.geography.parliament_code}-${d.geography.dun_code}`}>
                    <TableCell className="text-[10px]">{d.geography.dun_name} <span className="font-mono text-muted-foreground">N{d.geography.dun_code}</span></TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{d.metrics.total_voters.toLocaleString()}</TableCell>
                    <TableCell className="text-[10px] text-right">{d.metrics.male_percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-[10px] text-right">{d.metrics.female_percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-[10px] text-right">
                      <span style={{ color: seniorColor(d.metrics.senior_dependency_percent) }} className="font-semibold">
                        {d.metrics.senior_dependency_percent.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-right">{d.metrics.gender_balance_score.toFixed(1)}</TableCell>
                    <TableCell className="text-[10px] font-mono">{d.metrics.dominant_age_group}</TableCell>
                    <TableCell className="text-[10px]">{d.metrics.dominant_ethnicity_group}</TableCell>
                    {tier !== "clear" && <TableCell><Badge variant="outline" className={`text-[9px] ${tier === "critical" ? "border-red-500/40 text-red-600" : "border-amber-500/40 text-amber-600"}`}>{t(TIER_LOWER_I18N_KEY[tier])}</Badge></TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Risk signals */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-mlk" /> {t("demo.riskSignals")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2 mb-2">
            <Badge variant="outline" className="border-red-500/40 text-red-600 text-[10px]">{t("demo.criticalCount").replace("{n}", String(criticalCount))}</Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[10px]">{t("demo.warningCount").replace("{n}", String(warningCount))}</Badge>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px]">{t("demo.clearCount").replace("{n}", String(duns.length - criticalCount - warningCount))}</Badge>
          </div>
          {duns.map((d) => <RiskSignal key={d.geography.dun_code} d={d} />)}
          <p className="text-[10px] text-muted-foreground mt-2" style={{ color: MLK_ACCENT }}>
            {t("demo.thresholdNote")}
          </p>
        </CardContent>
      </Card>

      {/* §7.3: Radar Chart — multi-dimensional DUN comparison */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-mlk" /> {t("demo.radarTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={duns.slice(0, 5).map((d) => ({
              dun: `N${d.geography.dun_code}`,
              "Senior Dep": d.metrics.senior_dependency_percent,
              "Gender Bal": d.metrics.gender_balance_score,
              "Male %": d.metrics.male_percent,
              "Female %": d.metrics.female_percent,
              "Voter Density": Math.min(d.metrics.total_voters / 200, 100),
            }))}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="dun" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <PolarRadiusAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} angle={90} domain={[0, 100]} />
              <Radar name={t("demo.radarSeniorDep")} dataKey="Senior Dep" stroke="#dc2626" fill="#dc2626" fillOpacity={0.15} />
              <Radar name={t("demo.radarGenderBal")} dataKey="Gender Bal" stroke="#C77B2C" fill="#C77B2C" fillOpacity={0.15} />
              <Radar name={t("demo.radarVoterDensity")} dataKey="Voter Density" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="text-[9px] text-muted-foreground mt-2">
            {t("demo.radarNote")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
