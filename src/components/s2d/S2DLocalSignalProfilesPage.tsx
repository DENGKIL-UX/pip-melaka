"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPinned, ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * S2DLocalSignalProfilesPage — ported from S2D-workspace-code
 * s2d-360-intelligence-engine/src/components/S2DLocalSignalProfilesPage.jsx
 * Local signal profiles: DUN/constituency-level aggregation for MELAKA.
 */
export function S2DLocalSignalProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/s2d/intelligence/local-profiles");
        const data = await res.json();
        setProfiles(data.profiles ?? []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="h-[300px] flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Local Signal Profiles…</div>;
  if (error) return <Card className="border-red-500/30"><CardContent className="p-6 text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPinned className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Local Signal Profiles</h2>
        <Badge variant="outline" className="ml-auto border-mlk/30 text-mlk">{profiles.length} localities</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        DUN-level signal density & sentiment — constituency risk metrics for Melaka (28 DUNs). Only <code className="bg-muted px-1 rounded">aggregate</code> counts cross PIP boundary; no individual voter rows.
      </p>
      {profiles.length === 0 ? (
        <Card className="border-mlk/20"><CardContent className="p-8 text-center text-sm text-muted-foreground">No profiles — awaiting accepted evidence.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map((p: any, i: number) => (
            <Card key={i} className="border-mlk/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{p.locality?.localityName ?? p.locality?.dunName ?? p.dimensionValue ?? `Locality ${i+1}`}</span>
                  <Badge variant="outline" className="text-[10px]">{p.signalCount ?? p.recordCount ?? p.metrics?.totalRecords ?? 0} sig</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="text-muted-foreground">{p.locality?.parliamentName ?? ""} {p.locality?.dunCode ? `· N${p.locality.dunCode}` : ""}</div>
                {p.topIssue && <div>Top issue: <strong>{p.topIssue}</strong></div>}
                {p.dominantSentiment && <div>Sentiment: <Badge variant="outline" className="text-[10px] ml-1">{p.dominantSentiment}</Badge></div>}
                {p.metrics && <div className="text-[11px] text-muted-foreground">net {p.metrics.netSentiment?.toFixed?.(2) ?? "—"} · velocity {p.metrics.velocity?.toFixed?.(1) ?? "—"}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Service: <code className="bg-muted px-1 rounded">s2d-local-signal-profile-service</code> · MELAKA DUN aggregation (P134 N01-N05 verified · N06-N28 pending SPR raw)</div>
    </div>
  );
}
export default S2DLocalSignalProfilesPage;
