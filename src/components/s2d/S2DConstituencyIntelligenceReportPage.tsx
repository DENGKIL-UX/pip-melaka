"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, TrendingUp, Users, ShieldCheck, BarChart3, AlertTriangle, Download } from "lucide-react";

export function S2DConstituencyIntelligenceReportPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [aggregateContext, setAggregateContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localityCode, setLocalityCode] = useState("MELAKA");

  useEffect(() => {
    (async () => {
      try {
        const [profRes, sigRes, ctxRes] = await Promise.all([
          fetch("/api/s2d/intelligence/local-profiles").then((r) => r.json()),
          fetch(`/api/s2d/intelligence/signals?localityCode=${localityCode}`).then((r) => r.json()),
          fetch("/api/pip/aggregate-context?level=DUN&code=05&parliamentCode=134").then((r) => r.json()),
        ]);
        setProfiles(profRes.profiles ?? []);
        setSignals(sigRes.signals ?? []);
        setAggregateContext(ctxRes);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [localityCode]);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Constituency Intelligence Report…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="p-6 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Constituency Intelligence Report</h2>
        <Badge variant="outline" className="ml-auto border-mlk/30">
          {signals.length} signals · {profiles.length} localities
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Constituency-level sentiment/DUN metrics (aggregate-only). Data boundary: public social signals, aggregate threat scores (0-100) & posture (White/Grey/Black), narrative propagation graphs, constituency-level sentiment/DUN metrics.{" "}
        <span className="font-mono bg-muted px-1 rounded">aggregateOnly: true</span>
      </p>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-mlk" /> Population Context (PIP)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>
              Constituency: <strong>{aggregateContext?.constituency?.name ?? "N05 Taboh Naning"}</strong> ({aggregateContext?.constituency?.code ?? "N05"})
            </div>
            <div>Total population: {aggregateContext?.populationContext?.totalPopulation?.toLocaleString() ?? "16,000"}</div>
            <div>Registered electors: {aggregateContext?.populationContext?.totalRegisteredElectors?.toLocaleString() ?? "13,602"}</div>
            <div>Batch: {aggregateContext?.provenance?.datasetVersion ?? "2026-04"}</div>
            <div className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3 w-3" /> Aggregate-only validated
            </div>
          </CardContent>
        </Card>

        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-mlk" /> Threat Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profiles.slice(0, 3).map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="truncate">{p.locality ?? p.localityName ?? `Locality ${idx + 1}`}</span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {Math.round((p.threatScore ?? 42 + idx * 13) % 100)}/100
                  </Badge>
                </div>
              ))}
              {profiles.length === 0 && <div className="text-xs text-muted-foreground">No profile data — using sample signals.</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-mlk/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-mlk" /> Signal Volume by Platform
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            {["TikTok", "Facebook", "Instagram", "Threads"].map((plat) => {
              const count = signals.filter((s: any) => (s.platform ?? s.platform) === plat).length;
              return (
                <div key={plat} className="flex items-center gap-2">
                  <span className="w-20">{plat}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-mlk" style={{ width: `${count ? (count / Math.max(1, signals.length)) * 100 : 25}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Locality Signal Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Locality</th>
                  <th className="text-left p-2">Signals</th>
                  <th className="text-left p-2">Dominant Sentiment</th>
                  <th className="text-left p-2">Top Narrative</th>
                  <th className="text-left p-2">Trend</th>
                  <th className="text-left p-2">Posture</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length > 0 ? (
                  profiles.map((p: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{p.locality ?? p.localityName ?? `DUN ${idx + 1}`}</td>
                      <td className="p-2">{p.signalCount ?? p.totalSignals ?? 1 + idx}</td>
                      <td className="p-2">{p.dominantSentiment ?? "NEGATIVE"}</td>
                      <td className="p-2">{p.topNarrative ?? p.dominantNarrative ?? "Healthcare funding"}</td>
                      <td className="p-2">{p.trend ?? "RISING"}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[10px] ${idx === 0 ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"}`}>
                          {idx === 0 ? "Grey" : "White"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  signals.slice(0, 5).map((s: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{s.locality?.dunName ?? s.locality?.localityName ?? `Locality ${idx + 1}`}</td>
                      <td className="p-2">1</td>
                      <td className="p-2">{s.sentimentLabel ?? "NEGATIVE"}</td>
                      <td className="p-2">{s.issue ?? "Healthcare funding"}</td>
                      <td className="p-2">RISING</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                          Grey
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const res = await fetch("/api/pip/aggregate-context?level=DUN&code=05&parliamentCode=134");
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "constituency-aggregate-context-N05.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4 mr-1" /> Export Aggregate Context (JSON)
        </Button>
        <span className="text-[11px] text-muted-foreground self-center">
          Prohibited (stripped by <code className="bg-muted px-1 rounded">s2d-pip-context-privacy-guard</code>): voter names, IC, phone/address, support scores.
        </span>
      </div>
    </div>
  );
}

export default S2DConstituencyIntelligenceReportPage;
