"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

const dailyBrief = {
  date: new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  executive_judgement: "Negative sentiment rising in P134 Taboh Naning (N05). Senior healthcare narrative gaining velocity across TikTok and Threads. Immediate response recommended.",
  most_important_change: "Negative sentiment increased from 25% → 45% over 3 days. Signal volume up 69% (42 → 71).",
  highest_risk_narrative: "Senior healthcare access crisis — 30.6% senior dependency + viral social media allegations.",
  main_opportunity: "Positive community event in Kuala Linggi — amplification opportunity for verified information.",
  sentiment_movement: { BN: -3, PH: -1, PN: +4 },
  top_economic_issues: ["Healthcare funding", "Road infrastructure", "Coastal development"],
  youth_themes: ["Campus expansion debate (Lendu)", "TikTok healthcare narratives"],
  locality_hotspots: [
    "N05 Taboh Naning (22 signals) — P134 verified",
    "N03 Ayer Limau (15 signals) — P134 verified",
    "N04 Lendu (14 signals) — P134 verified",
    "N15 Pengkalan Batu (12 signals) — P137 estimated",
    "N19 Kesidang (10 signals) — P138 estimated",
    "N24 Bemban (8 signals) — P139 estimated",
  ],
  outlook_24h: "Signal volume projected to reach 85. Senior healthcare narrative likely to persist.",
  outlook_72h: "If untreated, narrative may spread to 3+ localities. Risk of mainstream media pickup.",
  recommended_actions: [
    "Draft clarification on healthcare funding allocation (evidence: RM 2.3M allocated 2025)",
    "Schedule community engagement in Taboh Naning within 48 hours",
    "Amplify Kuala Linggi positive event on official channels",
    "Monitor road infrastructure narrative — do not amplify if engagement < 5K",
  ],
  confidence: "MEDIUM (65%) — based on 71 signals across 5 localities. Limited cross-platform verification.",
  evidence_links: 12,
};

const weeklyTrend = [
  { day: "Mon", signals: 28, negative_pct: 20 },
  { day: "Tue", signals: 35, negative_pct: 22 },
  { day: "Wed", signals: 42, negative_pct: 25 },
  { day: "Thu", signals: 50, negative_pct: 30 },
  { day: "Fri", signals: 58, negative_pct: 37 },
  { day: "Sat", signals: 65, negative_pct: 41 },
  { day: "Sun", signals: 71, negative_pct: 45 },
];

export function InsightReportsTab() {
  return (
    <div className="space-y-4">
      {/* Daily Intelligence Brief (S2D-7A) */}
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">Daily Intelligence Brief (S2D-7A)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{dailyBrief.date}</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">{dailyBrief.confidence}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Executive Judgement */}
          <div className="rounded-md border border-mlk/30 bg-mlk/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1">Executive Judgement</div>
            <div className="text-sm">{dailyBrief.executive_judgement}</div>
          </div>

          {/* Most important change + Highest risk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1"><TrendingUp className="h-3 w-3" /> Most Important Change</div>
              <div className="text-xs">{dailyBrief.most_important_change}</div>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-red-600 mb-1"><AlertTriangle className="h-3 w-3" /> Highest-Risk Narrative</div>
              <div className="text-xs">{dailyBrief.highest_risk_narrative}</div>
            </div>
          </div>

          {/* Sentiment movement */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">BN Sentiment</div>
              <div className="text-xl font-bold text-red-600">{dailyBrief.sentiment_movement.BN > 0 ? "+" : ""}{dailyBrief.sentiment_movement.BN}%</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">PH Sentiment</div>
              <div className="text-xl font-bold text-red-600">{dailyBrief.sentiment_movement.PH > 0 ? "+" : ""}{dailyBrief.sentiment_movement.PH}%</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">PN Sentiment</div>
              <div className="text-xl font-bold text-emerald-600">{dailyBrief.sentiment_movement.PN > 0 ? "+" : ""}{dailyBrief.sentiment_movement.PN}%</div>
            </div>
          </div>

          {/* Issues + hotspots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Top Economic Issues</div>
              <ul className="text-xs space-y-0.5">{dailyBrief.top_economic_issues.map((i, idx) => <li key={idx}>• {i}</li>)}</ul>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Locality Hotspots</div>
              <ul className="text-xs space-y-0.5">{dailyBrief.locality_hotspots.map((l, idx) => <li key={idx}>• {l}</li>)}</ul>
            </div>
          </div>

          {/* Outlook */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-600 mb-1">24-Hour Outlook</div>
              <div className="text-xs">{dailyBrief.outlook_24h}</div>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="text-[10px] uppercase tracking-wide text-red-600 mb-1">72-Hour Outlook</div>
              <div className="text-xs">{dailyBrief.outlook_72h}</div>
            </div>
          </div>

          {/* Recommended actions */}
          <div className="rounded-md border border-mlk/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-2">Recommended Actions</div>
            <div className="space-y-1.5">
              {dailyBrief.recommended_actions.map((a, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-mlk mt-0.5 flex-shrink-0" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground text-center">
            {dailyBrief.evidence_links} evidence links · Confidence: {dailyBrief.confidence}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
