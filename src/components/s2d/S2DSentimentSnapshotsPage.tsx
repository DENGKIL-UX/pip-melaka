"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";

/**
 * S2DSentimentSnapshotsPage — ported from S2D-workspace-code
 * s2d-360-intelligence-engine/src/components/S2DDailySentimentSnapshotsPage.jsx
 * Shows daily sentiment metrics across dimensions (State, DUN, Political Entity, Issue, Platform)
 * Powered by /api/s2d/intelligence/sentiment-snapshots (buildDailySentimentSnapshot)
 */
export function S2DSentimentSnapshotsPage() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/s2d/intelligence/sentiment-snapshots");
        const data = await res.json();
        setSnapshots(data.snapshots ?? []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load snapshots");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="h-[300px] flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Sentiment Snapshots…</div>;
  if (error) return <Card className="border-red-500/30"><CardContent className="p-6 text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Daily Sentiment Snapshots</h2>
        <Badge variant="outline" className="ml-auto border-mlk/30 text-mlk">{snapshots.length} dimensions</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Aggregated sentiment metrics — <code className="bg-muted px-1 rounded">positiveShare / neutralShare / negativeShare / netSentiment</code> · engagement · velocity · persistence. Aggregate-only, human-reviewed evidence only.
      </p>
      {snapshots.length === 0 ? (
        <Card className="border-mlk/20"><CardContent className="p-8 text-center text-sm text-muted-foreground">No snapshots for today — ingesting public signals…</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {snapshots.map((s, i) => (
            <Card key={i} className="border-mlk/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-mlk" /> {s.dimension}: {s.dimensionValue}
                  <Badge variant="outline" className="ml-auto text-[10px]">{s.snapshotDate}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-emerald-500/10 p-2 text-center"><div className="font-bold text-emerald-700">{Math.round((s.metrics?.positiveShare ?? 0) * 100)}%</div><div className="text-[10px] text-muted-foreground">Positive</div></div>
                  <div className="rounded bg-zinc-500/10 p-2 text-center"><div className="font-bold">{Math.round((s.metrics?.neutralShare ?? 0) * 100)}%</div><div className="text-[10px] text-muted-foreground">Neutral</div></div>
                  <div className="rounded bg-red-500/10 p-2 text-center"><div className="font-bold text-red-700">{Math.round((s.metrics?.negativeShare ?? 0) * 100)}%</div><div className="text-[10px] text-muted-foreground">Negative</div></div>
                </div>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span>Engagement <strong className="text-foreground">{s.metrics?.engagement?.toFixed?.(1) ?? s.metrics?.engagement ?? "—"}</strong></span>
                  <span>· Velocity <strong className="text-foreground">{s.metrics?.velocity?.toFixed?.(1) ?? s.metrics?.velocity ?? "—"}</strong></span>
                  <span>· Confidence <strong className="text-foreground">{s.metrics?.evidenceConfidence ?? "—"}</strong></span>
                </div>
                <div className="text-[11px] text-muted-foreground">n={s.recordCount} · netSentiment {s.metrics?.netSentiment?.toFixed?.(2) ?? "—"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Source: <code className="bg-muted px-1 rounded">s2d-daily-sentiment-snapshot-service</code> — aggregateOnly · humanReviewRequired</div>
    </div>
  );
}
export default S2DSentimentSnapshotsPage;
