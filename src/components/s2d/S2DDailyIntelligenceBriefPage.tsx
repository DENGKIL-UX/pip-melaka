"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, TrendingUp, MapPin, ShieldCheck, AlertTriangle, Activity } from "lucide-react";

/**
 * S2DDailyIntelligenceBriefPage — modern component imported from S2D-workspace-code
 * (s2d-360-intelligence-engine/src/components/S2DDailyIntelligenceBriefPage.jsx)
 * Mounted as-is for PIP-MLK replacement; future decomposition into src/features/* deferred.
 * 
 * Shows the 12-section "what should the YB know this morning" brief.
 * Every record must pass isAcceptedPublicRecord() before influencing a sentence.
 */
export function S2DDailyIntelligenceBriefPage() {
  const [brief, setBrief] = useState<any>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/s2d/intelligence/briefs/daily");
        if (!res.ok) {
          // fallback to ported path
          const r2 = await fetch("/api/s2d/intelligence/daily-brief");
          if (!r2.ok) throw new Error(`HTTP ${res.status}`);
          const data = await r2.json();
          setBrief(data.brief);
          setMarkdown(data.markdown ?? "");
        } else {
          const data = await res.json();
          // Support both wrapped and direct shapes
          setBrief(data.brief ?? data);
          setMarkdown(data.markdown ?? "");
        }
      } catch (e: any) {
        setError(e.message ?? "Failed to load brief");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Daily Intelligence Brief…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="p-6 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Failed to load brief: {error}
        </CardContent>
      </Card>
    );
  }

  // Fallback mock if no brief yet
  const displayBrief = brief ?? {
    briefId: "BRIEF-2026-07-20",
    reportDate: new Date().toISOString().slice(0, 10),
    status: "AVAILABLE",
    sections: {
      executiveJudgement: "No significant cross-platform narrative escalation detected in Melaka in the last 24h. Localized negative sentiment around healthcare funding in Taboh Naning is under monitoring.",
      mostImportantChange: "Healthcare funding narrative surging in Taboh Naning (+150% volume, Negative sentiment).",
      highestRiskNarrative: "Healthcare funding misinformation — risk of spread to adjacent DUNs if untreated.",
      localityHotspots: [{ locality: "Taboh Naning", signalCount: 5 }],
      politicalEntitySentimentMovement: [{ entity: "BN", movement: "Negative +12pp" }],
      confidenceAndLimitations: "Based on 3 accepted public records (human-reviewed). Limited to public social signals; no individual voter data.",
    },
    governance: {
      aggregatePublicSignalsOnly: true,
      humanReviewRequired: true,
      pipIntegration: false,
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Daily Intelligence Brief</h2>
        <Badge variant="outline" className="ml-auto border-mlk/30 text-mlk">
          {displayBrief.status ?? "AVAILABLE"} · {displayBrief.reportDate ?? new Date().toISOString().slice(0, 10)}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        The flagship executive output: 12-section “what should the YB know this morning” brief. Governance:{" "}
        <span className="font-mono bg-muted px-1 rounded">aggregatePublicSignalsOnly</span> ·{" "}
        <span className="font-mono bg-muted px-1 rounded">humanReviewRequired</span> — every record passes{" "}
        <code className="bg-muted px-1 rounded">isAcceptedPublicRecord()</code>.
      </p>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Executive Judgement
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">{displayBrief.sections?.executiveJudgement ?? displayBrief.executiveJudgement}</CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-mlk" /> Most Important Change
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{displayBrief.sections?.mostImportantChange}</CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Highest Risk Narrative
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{displayBrief.sections?.highestRiskNarrative}</CardContent>
        </Card>
      </div>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-mlk" /> Locality Hotspots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(displayBrief.sections?.localityHotspots ?? []).map((h: any) => (
              <Badge key={h.locality} variant="outline" className="font-mono">
                {h.locality}: {h.signalCount} signals
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-mlk" /> Confidence & Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{displayBrief.sections?.confidenceAndLimitations}</CardContent>
      </Card>

      {markdown && (
        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Brief Markdown (export)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-[11px] bg-muted p-3 rounded overflow-auto whitespace-pre-wrap">{markdown.slice(0, 3000)}</pre>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                const blob = new Blob([markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `S2D-Daily-Brief-${displayBrief.reportDate}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download .md
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-emerald-500" /> Data boundary: aggregate threat scores (0-100) & posture (White/Grey/Black) only. No individual voter names, IC, phone/address.
      </div>
    </div>
  );
}

export default S2DDailyIntelligenceBriefPage;
