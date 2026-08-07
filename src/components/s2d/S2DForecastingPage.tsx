"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, ShieldCheck, AlertTriangle, Target } from "lucide-react";

/**
 * S2DForecastingPage — 24-72h outlook ported from S2D-workspace-code
 * s2d-360-intelligence-engine/src/intelligence/forecasting/s2d-baseline-forecasting-service.js
 * Shows forecast horizon with confidence intervals; human review required.
 */
export function S2DForecastingPage() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/s2d/intelligence/forecasts");
        const data = await res.json();
        setForecasts(data.forecasts ?? []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load forecasts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="h-[300px] flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Forecasting Hub…</div>;
  if (error) return <Card className="border-red-500/30"><CardContent className="p-6 text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Forecasting Hub — 24-72h Outlook</h2>
        <Badge variant="outline" className="ml-auto border-mlk/30 text-mlk">{forecasts.length} narratives</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Baseline forecasting with confidence intervals ( <code className="bg-muted px-1 rounded">LOW / MEDIUM / HIGH</code> ). Governance: no election prediction, no voter-preference inference — narrative trajectory only.
      </p>
      {forecasts.length === 0 ? (
        <Card className="border-mlk/20"><CardContent className="p-8 text-center text-sm text-muted-foreground">No forecasts — need 48h of accepted evidence history.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {forecasts.map((f: any) => (
            <Card key={f.forecastId ?? f.narrative} className="border-mlk/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${f.trend === "RISING" ? "text-red-500" : "text-emerald-500"}`} /> {f.narrative}
                  <Badge variant="outline" className={`ml-auto text-[10px] ${f.trend === "RISING" ? "border-red-500/30 text-red-700" : "border-emerald-500/30 text-emerald-700"}`}>{f.trend}</Badge>
                </CardTitle>
                <div className="text-[11px] text-muted-foreground">{f.locality} · confidence {f.confidence}</div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-muted p-2">
                    <div className="text-[10px] text-muted-foreground">24h projected</div>
                    <div className="font-bold">{f.horizon24h?.projectedSignalVolume ?? "—"} <span className="font-normal text-muted-foreground">[{f.horizon24h?.lowerBound ?? "—"}–{f.horizon24h?.upperBound ?? "—"}]</span></div>
                    <div className="text-[10px] text-muted-foreground">conf {(f.horizon24h?.confidence ?? 0 * 100).toFixed ? (f.horizon24h.confidence * 100).toFixed(0) + "%" : "—"}</div>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <div className="text-[10px] text-muted-foreground">72h projected</div>
                    <div className="font-bold">{f.horizon72h?.projectedSignalVolume ?? "—"} <span className="font-normal text-muted-foreground">[{f.horizon72h?.lowerBound ?? "—"}–{f.horizon72h?.upperBound ?? "—"}]</span></div>
                    <div className="text-[10px] text-muted-foreground">conf {(f.horizon72h?.confidence ?? 0 * 100).toFixed ? (f.horizon72h.confidence * 100).toFixed(0) + "%" : "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Engine: <code className="bg-muted px-1 rounded">s2d-baseline-forecasting-service</code> · humanReviewRequired · aggregate public-source only</div>
    </div>
  );
}
export default S2DForecastingPage;
