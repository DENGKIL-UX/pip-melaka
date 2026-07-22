"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function InsightReportsTab() {
  const { t, locale } = useI18n();
  const date = new Date().toLocaleDateString(locale === "ms" ? "ms-MY" : "en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sentimentMovement = { BN: -3, PH: -1, PN: +4 };
  const topEconomicIssues = [t("insights.issue1"), t("insights.issue2"), t("insights.issue3")];
  const localityHotspots = [
    t("insights.hotspot1"), t("insights.hotspot2"), t("insights.hotspot3"),
    t("insights.hotspot4"), t("insights.hotspot5"), t("insights.hotspot6"),
  ];
  const recommendedActions = [t("insights.action1"), t("insights.action2"), t("insights.action3"), t("insights.action4")];

  const insights = [
    { time: t("insights.time2h"), type: "sentiment", severity: "WARNING", text: t("insights.insight1Text"), color: "#f59e0b" },
    { time: t("insights.time5h"), type: "election", severity: "INFO", text: t("insights.insight2Text"), color: "#0ea5e9" },
    { time: t("insights.time8h"), type: "demographics", severity: "CRITICAL", text: t("insights.insight3Text"), color: "#dc2626" },
    { time: t("insights.time1d"), type: "dpt", severity: "INFO", text: t("insights.insight4Text"), color: "#0ea5e9" },
    { time: t("insights.time2d"), type: "governance", severity: "INFO", text: t("insights.insight5Text"), color: "#0ea5e9" },
    { time: t("insights.time3d"), type: "scraper", severity: "WARNING", text: t("insights.insight6Text"), color: "#f59e0b" },
  ];

  return (
    <div className="space-y-4">
      {/* Daily Intelligence Brief (S2D-7A) */}
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">{t("insights.dailyBriefTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">{t("insights.confidence")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Executive Judgement */}
          <div className="rounded-md border border-mlk/30 bg-mlk/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-1">{t("insights.executiveJudgement")}</div>
            <div className="text-sm">{t("insights.executiveJudgementBody")}</div>
          </div>

          {/* Most important change + Highest risk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1"><TrendingUp className="h-3 w-3" /> {t("insights.mostImportantChange")}</div>
              <div className="text-xs">{t("insights.mostImportantChangeBody")}</div>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-red-600 mb-1"><AlertTriangle className="h-3 w-3" /> {t("insights.highestRiskNarrative")}</div>
              <div className="text-xs">{t("insights.highestRiskNarrativeBody")}</div>
            </div>
          </div>

          {/* Sentiment movement */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">{t("insights.bnSentiment")}</div>
              <div className="text-xl font-bold text-red-600">{sentimentMovement.BN > 0 ? "+" : ""}{sentimentMovement.BN}%</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">{t("insights.phSentiment")}</div>
              <div className="text-xl font-bold text-red-600">{sentimentMovement.PH > 0 ? "+" : ""}{sentimentMovement.PH}%</div>
            </div>
            <div className="rounded-md border p-3 text-center">
              <div className="text-[10px] text-muted-foreground">{t("insights.pnSentiment")}</div>
              <div className="text-xl font-bold text-emerald-600">{sentimentMovement.PN > 0 ? "+" : ""}{sentimentMovement.PN}%</div>
            </div>
          </div>

          {/* Issues + hotspots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t("insights.topEconomicIssues")}</div>
              <ul className="text-xs space-y-0.5">{topEconomicIssues.map((i, idx) => <li key={idx}>• {i}</li>)}</ul>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t("insights.localityHotspots")}</div>
              <ul className="text-xs space-y-0.5">{localityHotspots.map((l, idx) => <li key={idx}>• {l}</li>)}</ul>
            </div>
          </div>

          {/* Outlook */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-600 mb-1">{t("insights.outlook24h")}</div>
              <div className="text-xs">{t("insights.outlook24hBody")}</div>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="text-[10px] uppercase tracking-wide text-red-600 mb-1">{t("insights.outlook72h")}</div>
              <div className="text-xs">{t("insights.outlook72hBody")}</div>
            </div>
          </div>

          {/* Recommended actions */}
          <div className="rounded-md border border-mlk/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-mlk font-semibold mb-2">{t("insights.recommendedActions")}</div>
            <div className="space-y-1.5">
              {recommendedActions.map((a, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-mlk mt-0.5 flex-shrink-0" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground text-center">
            12 {t("insights.evidenceLinks")} · {t("insights.confidenceLabel")}: {t("insights.confidence")}
          </div>
        </CardContent>
      </Card>

      {/* §7.14: Insight Feed — chronological insight stream */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-mlk" /> {t("insights.feedTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.map((insight, i) => (
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
            {t("insights.feedDesc")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
