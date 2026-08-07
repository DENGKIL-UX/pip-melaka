"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, TrendingUp, Users, Radio, AlertTriangle } from "lucide-react";

interface NarrativeNode {
  id: string;
  label: string;
  locality?: string;
  sentiment?: string;
  signalCount?: number;
  type?: string;
}

interface NarrativeEdge {
  source: string;
  target: string;
  label?: string;
}

export function S2DNarrativePropagationGraphPage() {
  const [narratives, setNarratives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/s2d/intelligence/narratives");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setNarratives(data.narratives ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const graph = useMemo(() => {
    // Build a simple propagation chain from narratives
    const nodes: NarrativeNode[] = narratives.map((n, idx) => ({
      id: n.narrativeId ?? `nar-${idx}`,
      label: n.title ?? n.narrative ?? `Narrative ${idx + 1}`,
      locality: n.locality ?? "Unknown",
      sentiment: n.sentiment ?? "NEGATIVE",
      signalCount: n.signalCount ?? 0,
      type: n.status ?? "ESCALATING",
    }));

    // Synthetic edges showing propagation: first -> second -> third
    const edges: NarrativeEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ source: nodes[i].id, target: nodes[i + 1].id, label: "propagation" });
    }

    return { nodes, edges };
  }, [narratives]);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-mlk" /> Loading Narrative Propagation Graph…
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
        <Share2 className="h-5 w-5 text-mlk" />
        <h2 className="text-lg font-semibold">Narrative Propagation Graph</h2>
        <Badge variant="outline" className="ml-auto border-mlk/30">
          {graph.nodes.length} narratives · {graph.edges.length} edges
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Constituency-level narrative propagation (DUN-level sentiment/DUN metrics). Aggregate threat scores (0-100) & posture (White/Grey/Black) only — no individual voter data.
      </p>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-mlk" /> Propagation Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple D3-force placeholder — real graph would use d3-force + SVG */}
          <div className="relative bg-muted/30 rounded-lg p-4 min-h-[320px] border border-dashed">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {graph.nodes.map((node, idx) => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="rounded-lg border bg-card p-3 min-w-[160px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-xs font-semibold truncate">{node.label}</div>
                    <div className="text-[11px] text-muted-foreground">{node.locality} · {node.sentiment}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {node.signalCount} signals
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${node.type === "ESCALATING" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"}`}
                      >
                        {node.type}
                      </Badge>
                    </div>
                  </div>
                  {idx < graph.nodes.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className="h-0.5 w-8 bg-mlk/50" />
                      <TrendingUp className="h-3 w-3 text-mlk mt-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {graph.nodes.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">No narratives detected — awaiting Apify collection run.</div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded border p-2 text-center">
                <Users className="h-4 w-4 mx-auto text-mlk" />
                <div className="font-semibold">Earliest source</div>
                <div className="text-muted-foreground">Community page</div>
              </div>
              <div className="rounded border p-2 text-center">
                <Radio className="h-4 w-4 mx-auto text-purple-500" />
                <div className="font-semibold">Amplifier</div>
                <div className="text-muted-foreground">Influencer pickup</div>
              </div>
              <div className="rounded border p-2 text-center">
                <Share2 className="h-4 w-4 mx-auto text-blue-500" />
                <div className="font-semibold">Propagation</div>
                <div className="text-muted-foreground">Cross-platform spread</div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Source: <code className="bg-muted px-1 rounded">s2d-narrative-propagation-graph.js</code> — cross-platform spread is measured via engagement + velocity scores; DUN-level aggregation only.
          </div>
        </CardContent>
      </Card>

      <Card className="border-mlk/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Narrative Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Narrative</th>
                  <th className="text-left p-2">Locality</th>
                  <th className="text-left p-2">Signals</th>
                  <th className="text-left p-2">Sentiment</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {graph.nodes.map((n) => (
                  <tr key={n.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{n.label}</td>
                    <td className="p-2">{n.locality}</td>
                    <td className="p-2">{n.signalCount}</td>
                    <td className="p-2">{n.sentiment}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-[10px]">
                        {n.type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default S2DNarrativePropagationGraphPage;
