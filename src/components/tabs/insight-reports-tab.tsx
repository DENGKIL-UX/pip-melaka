"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Lightbulb, Clock } from "lucide-react";

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

      {/* §7.14: Insight Feed — chronological insight stream */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-mlk" /> Insight Feed — Auto-generated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { time: "2h ago", type: "sentiment", severity: "WARNING", text: "Negative sentiment in N05 Taboh Naning increased 20pp in 3 days — senior healthcare narrative trending on TikTok", color: "#f59e0b" },
              { time: "5h ago", type: "election", severity: "INFO", text: "PRN15 swing analysis: 11 DUN seats changed hands (PH→BN ×9, BN→PN ×1, PH→PN ×1). N06 Rembia is the most notable swing.", color: "#0ea5e9" },
              { time: "8h ago", type: "demographics", severity: "CRITICAL", text: "N01 Kuala Linggi senior dependency crossed 25% threshold (25.9%) — WARNING tier activated in risk engine", color: "#dc2626" },
              { time: "1d ago", type: "dpt", severity: "INFO", text: "P137 Hang Tuah Jaya shows highest net voter churn (+1,050) — urban in-migration pattern confirmed", color: "#0ea5e9" },
              { time: "2d ago", type: "governance", severity: "INFO", text: "Provenance gate 8 closed (sample audit passed). Gate 9 (raw SPR xlsx) remains open — pending PDPA agreement", color: "#0ea5e9" },
              { time: "3d ago", type: "scraper", severity: "WARNING", text: "Apify TikTok collection rate dropped 30% — possible API rate limit. Check APIFY_API_TOKEN validity", color: "#f59e0b" },
            ].map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-md border border-border/40 hover:bg-mlk/5 transition-colors">
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: insight.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[8px]" style={{ color: insight.color, borderColor: insight.color + "40" }}>{insight.severity}</Badge>
                    <span className="text-[9px] text-muted-foreground font-mono uppercase">{insight.type}</span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 ms-auto"><Clock className="w-2.5 h-2.5" />{insight.time}</span>
                  </div>
                  <div className="text-[11px] text-foreground">{insight.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">
            Auto-generated from S2D intelligence engine. Insights are classified by type and severity.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
