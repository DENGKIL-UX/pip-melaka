"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, Target, Activity, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const forecastData = [
  { day: "Day -3", actual: 42, forecast: null, lower: null, upper: null },
  { day: "Day -2", actual: 58, forecast: null, lower: null, upper: null },
  { day: "Day -1", actual: 71, forecast: null, lower: null, upper: null },
  { day: "Today", actual: 71, forecast: 71, lower: 71, upper: 71 },
  { day: "Day +1", actual: null, forecast: 85, lower: 72, upper: 98 },
  { day: "Day +2", actual: null, forecast: 92, lower: 75, upper: 109 },
  { day: "Day +3", actual: null, forecast: 88, lower: 68, upper: 108 },
];

const narrativeForecast = [
  { narrative: "Senior healthcare", current_signals: 18, projected_72h: 32, confidence: 0.78, trend: "RISING" },
  { narrative: "Road infrastructure", current_signals: 9, projected_72h: 14, confidence: 0.65, trend: "RISING" },
  { narrative: "DPT voter-roll", current_signals: 12, projected_72h: 10, confidence: 0.72, trend: "FALLING" },
  { narrative: "Coastal development", current_signals: 6, projected_72h: 7, confidence: 0.81, trend: "STABLE" },
];

const escalationRisk = [
  // P134 verified DUNs (real demographic data)
  { locality: "N05 Taboh Naning", parliament: "P134", risk_score: 82, factors: "Senior dep 30.6% + negative sentiment 45% + rising narrative", verified: true },
  { locality: "N03 Ayer Limau", parliament: "P134", risk_score: 64, factors: "Senior dep 27.7% + mixed sentiment + DPT churn", verified: true },
  { locality: "N04 Lendu", parliament: "P134", risk_score: 45, factors: "Campus expansion debate + falling engagement", verified: true },
  { locality: "N01 Kuala Linggi", parliament: "P134", risk_score: 22, factors: "Positive sentiment + low signal volume", verified: true },
  { locality: "N02 Tanjung Bidara", parliament: "P134", risk_score: 35, factors: "Neutral sentiment + stable coastal narrative", verified: true },
  // P135-P139 estimated DUNs (projected risk based on demographics + DPT churn)
  { locality: "N15 Pengkalan Batu", parliament: "P137", risk_score: 71, factors: "Urban in-migration + high DPT churn + competitive margin", verified: false },
  { locality: "N16 Ayer Keroh", parliament: "P137", risk_score: 68, factors: "Urban mixed + institutional seats + sentiment volatility", verified: false },
  { locality: "N19 Kesidang", parliament: "P138", risk_score: 55, factors: "Urban Chinese-majority + DAP stronghold + generational shift", verified: false },
  { locality: "N24 Bemban", parliament: "P139", risk_score: 52, factors: "Rural Malay + PAS/PN inroads + DPT churn", verified: false },
  { locality: "N06 Rembia", parliament: "P135", risk_score: 48, factors: "Semi-urban + BN/PH marginal + demographic transition", verified: false },
  { locality: "N11 Sungai Udang", parliament: "P136", risk_score: 44, factors: "Military constituency + stable but shifting", verified: false },
  { locality: "N27 Merlimau", parliament: "P139", risk_score: 41, factors: "Rural Malay + PN growth + senior dependency", verified: false },
];

const TREND_ICONS: Record<string, React.ReactNode> = {
  RISING: <TrendingUp className="h-3 w-3 text-red-500" />,
  FALLING: <TrendingDown className="h-3 w-3 text-emerald-500" />,
  STABLE: <Minus className="h-3 w-3 text-muted-foreground" />,
};

export function PredictiveTab() {
  return (
    <div className="space-y-4">
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">S2D Predictive Intelligence — Forecasting (Phase S2D-5)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Signal behaviour forecasting · 72-hour projection · Escalation risk scoring</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px] text-amber-600 border-amber-500/40">Indicative</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Signal volume forecast */}
          <Card className="border-mlk/10 mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Signal Volume Forecast (7 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                  <ReferenceLine x="Today" stroke="#C77B2C" strokeDasharray="5 5" label={{ value: "Now", fill: "#C77B2C", fontSize: 10 }} />
                  <Line type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={3} name="Actual" dot={{ r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke="#C77B2C" strokeWidth={2} strokeDasharray="5 5" name="Forecast" dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="upper" stroke="#C77B2C" strokeWidth={1} strokeOpacity={0.3} name="Upper bound" dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="lower" stroke="#C77B2C" strokeWidth={1} strokeOpacity={0.3} name="Lower bound" dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Narrative forecast */}
          <Card className="border-mlk/10 mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Narrative Forecast (72-hour projection)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-mlk">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-start p-2">Narrative</th><th className="text-end p-2">Current Signals</th><th className="text-end p-2">Projected 72h</th><th className="text-end p-2">Confidence</th><th className="text-center p-2">Trend</th></tr></thead>
                  <tbody>
                    {narrativeForecast.map(n => (
                      <tr key={n.narrative} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="p-2 font-medium">{n.narrative}</td>
                        <td className="p-2 text-end font-mono">{n.current_signals}</td>
                        <td className="p-2 text-end font-mono text-mlk">{n.projected_72h}</td>
                        <td className="p-2 text-end font-mono">{(n.confidence * 100).toFixed(0)}%</td>
                        <td className="p-2 text-center">{TREND_ICONS[n.trend]} {n.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Escalation risk scoring — §7.13 S2D-6B
              FIX: previously used nested <Bar> inside <Bar> (anti-pattern) which
              caused Recharts to render ONE bar series with default black fill.
              Correct pattern: single <Bar> with <Cell> children for per-bar colors. */}
          <Card className="border-mlk/10">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-mlk" /> Escalation Risk Score by Locality (S2D-6B)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={escalationRisk} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="locality" tick={{ fontSize: 9 }} width={100} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--card-foreground)" }} />
                  <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                    {escalationRisk.map((entry, idx) => (
                      <Cell key={idx} fill={entry.risk_score >= 75 ? "#EF4444" : entry.risk_score >= 50 ? "#F59E0B" : "#10B981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2 max-h-48 overflow-y-auto scrollbar-mlk">
                {escalationRisk.map(r => (
                  <div key={r.locality} className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono font-bold flex-shrink-0" style={{ color: r.risk_score >= 75 ? "#EF4444" : r.risk_score >= 50 ? "#F59E0B" : "#10B981" }}>{r.risk_score}</span>
                    <span className="font-mono text-muted-foreground flex-shrink-0">{r.parliament}</span>
                    <span className="text-muted-foreground flex-1 min-w-0 truncate">{r.locality}: {r.factors}</span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.verified ? "bg-emerald-500" : "bg-amber-500"}`} title={r.verified ? "Verified" : "Estimated"} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-3 text-[10px] text-muted-foreground text-center">
            Per S2D Architecture S2D-5/6: Forecast targets = signal volume, narrative velocity, escalation risk.
            Response Need = Public impact × 20% + Forecasted escalation × 20% + Narrative velocity × 15% + Evidence confidence × 15%.
          </div>
        </CardContent>
      </Card>

      {/* §7.13: Prediction Dashboard — model performance + feature importance */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-mlk" /> Prediction Dashboard — Model Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Model accuracy tracking */}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Historical Accuracy (last 5 elections)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[
                  { election: "GE12", predicted: "BN", actual: "BN", correct: true },
                  { election: "GE13", predicted: "BN", actual: "BN", correct: true },
                  { election: "GE14", predicted: "BN", actual: "PH", correct: false },
                  { election: "PRN15", predicted: "BN", actual: "BN", correct: true },
                  { election: "GE15", predicted: "PH", actual: "PN", correct: false },
                ].map((d, i) => ({ name: d.election, accuracy: d.correct ? 100 : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Line dataKey="accuracy" stroke="#C77B2C" strokeWidth={2} dot={{ r: 4, fill: (d) => d.payload.accuracy === 100 ? "#10B981" : "#EF4444" }} />
                  <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "60% threshold", fontSize: 8, fill: "#f59e0b" }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                <div className="rounded-md border p-1.5 text-center">
                  <div className="text-muted-foreground">Correct</div>
                  <div className="text-lg font-bold text-emerald-600">3/5</div>
                </div>
                <div className="rounded-md border p-1.5 text-center">
                  <div className="text-muted-foreground">Accuracy</div>
                  <div className="text-lg font-bold text-mlk">60%</div>
                </div>
                <div className="rounded-md border p-1.5 text-center">
                  <div className="text-muted-foreground">Brier score</div>
                  <div className="text-lg font-bold text-amber-600">0.24</div>
                </div>
              </div>
            </div>

            {/* Feature importance */}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Feature Importance (what drives predictions)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { feature: "Margin", importance: 28 },
                  { feature: "Swing", importance: 22 },
                  { feature: "Senior dep", importance: 18 },
                  { feature: "Turnout", importance: 14 },
                  { feature: "Sentiment", importance: 10 },
                  { feature: "DPT churn", importance: 8 },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <YAxis dataKey="feature" type="category" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="importance" fill="#C77B2C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-[9px] text-muted-foreground mt-1">
                Higher importance = stronger predictor. Margin and swing are the top factors.
              </div>
            </div>
          </div>

          {/* Prediction calibration */}
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Calibration — Predicted vs Actual outcomes
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[
                { range: "0-20%", predicted: 5, actual: 2, color: "#10B981" },
                { range: "20-40%", predicted: 8, actual: 6, color: "#84cc16" },
                { range: "40-60%", predicted: 6, actual: 7, color: "#f59e0b" },
                { range: "60-80%", predicted: 5, actual: 6, color: "#f97316" },
                { range: "80-100%", predicted: 4, actual: 7, color: "#ef4444" },
              ].map((bin, i) => (
                <div key={i} className="text-center">
                  <div className="text-[8px] text-muted-foreground mb-1">{bin.range}</div>
                  <div className="flex items-end justify-center gap-0.5 h-12">
                    <div className="w-3 rounded-t" style={{ height: `${bin.predicted * 8}%`, backgroundColor: bin.color, opacity: 0.5 }} title={`Predicted: ${bin.predicted}`} />
                    <div className="w-3 rounded-t" style={{ height: `${bin.actual * 8}%`, backgroundColor: bin.color }} title={`Actual: ${bin.actual}`} />
                  </div>
                  <div className="text-[8px] text-muted-foreground mt-1">{bin.predicted}/{bin.actual}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted-foreground/30" /> Predicted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-mlk" /> Actual</span>
            </div>
          </div>

          <div className="text-[9px] text-muted-foreground mt-3">
            Predictions are based on simplified swing models. Not political forecasts. Brier score measures prediction quality (0=perfect, 1=worst).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
