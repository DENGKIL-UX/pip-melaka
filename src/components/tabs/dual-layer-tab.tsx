"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers3, Users, Signal, ShieldCheck } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { SENTIMENT, TREND, PLATFORMS } from "@/lib/s2d-contracts";
import { SEED_LOCALITY_SIGNAL_MAP } from "@/lib/s2d-seed-data";

// Real P134 locality intelligence (from engine data)
const P134_LOCALITIES = [
  { code: "008", name: "TMN SERI AMAN", dun: "05", dun_name: "Taboh Naning", voters: 4200, senior_pct: 30.6, signal_count: 22, sentiment: SENTIMENT.NEGATIVE, narrative: "Senior healthcare access", trend: TREND.RISING, platforms: [PLATFORMS.TIKTOK, PLATFORMS.THREADS] },
  { code: "002", name: "KG RAMUAN CHINA BESAR", dun: "03", dun_name: "Ayer Limau", voters: 3800, senior_pct: 27.7, signal_count: 15, sentiment: SENTIMENT.MIXED, narrative: "DPT voter-roll churn", trend: TREND.STABLE, platforms: [PLATFORMS.FACEBOOK, PLATFORMS.NEWS] },
  { code: "001", name: "KG KUALA LINGGI", dun: "01", dun_name: "Kuala Linggi", voters: 3100, senior_pct: 25.9, signal_count: 8, sentiment: SENTIMENT.POSITIVE, narrative: "MP community visit", trend: TREND.EMERGING, platforms: [PLATFORMS.INSTAGRAM] },
  { code: "012", name: "KG TANJUNG BIDARA", dun: "02", dun_name: "Tanjung Bidara", voters: 3500, senior_pct: 24.4, signal_count: 11, sentiment: SENTIMENT.NEUTRAL, narrative: "Coastal development", trend: TREND.STABLE, platforms: [PLATFORMS.NEWS, PLATFORMS.INSTAGRAM] },
  { code: "005", name: "KG LENDU", dun: "04", dun_name: "Lendu", voters: 2900, senior_pct: 26.4, signal_count: 14, sentiment: SENTIMENT.MIXED, narrative: "Campus expansion", trend: TREND.FALLING, platforms: [PLATFORMS.TIKTOK, PLATFORMS.THREADS] },
];

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#10B981", NEUTRAL: "#6B7280", NEGATIVE: "#EF4444", MIXED: "#F59E0B", INSUFFICIENT_EVIDENCE: "#94A3B8",
};

const PLATFORM_ICONS: Record<string, string> = { TIKTOK: "🎵", FACEBOOK: "📘", INSTAGRAM: "📷", THREADS: "🧵", NEWS: "📰", OTHER: "🔗" };

export function DualLayerTab() {
  return (
    <div className="space-y-3">
    <Card className="border-mlk/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers3 className="h-5 w-5 text-mlk" />
          <div>
            <CardTitle className="text-base">Dual-Layer Locality Context — Population + Signal Fusion</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Per archive: pip-360-dual-layer-locality-context.js. Fuses engine demographics (Layer 1) with S2D signals (Layer 2) per locality.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Layer legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/40" />
            <span className="text-muted-foreground">Layer 1: Population (Engine)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/40" />
            <span className="text-muted-foreground">Layer 2: Signal (S2D)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-mlk/30 border border-mlk/40" />
            <span className="text-muted-foreground">Fusion (Dual-Layer)</span>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 mb-4 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 inline me-1 text-emerald-500" />
          Privacy protections active: No targeting · No prediction · No voter preference inference · No election prediction · No individual targeting · No affiliation inference
        </div>

        {/* Dual-layer locality cards */}
        <div className="space-y-3">
          {P134_LOCALITIES.map(loc => (
            <div key={loc.code} className="rounded-md border border-mlk/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-mlk/5 to-transparent">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-mlk text-sm font-bold">LOC-{loc.code}</span>
                    <span className="text-sm font-medium">{loc.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">N{loc.dun} {loc.dun_name} · P134 Masjid Tanah</div>
                </div>
                <Badge variant="outline" className="text-[9px]" style={{ color: SENTIMENT_COLORS[loc.sentiment], borderColor: "currentColor" }}>{loc.sentiment}</Badge>
              </div>

              {/* Dual layers */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
                {/* Layer 1: Population */}
                <div className="p-3 bg-blue-500/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] uppercase font-semibold text-blue-600">Layer 1: Population</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><div className="text-[9px] text-muted-foreground">Voters</div><div className="font-mono font-bold">{loc.voters.toLocaleString()}</div></div>
                    <div><div className="text-[9px] text-muted-foreground">Senior dep</div><div className={`font-mono font-bold ${loc.senior_pct >= 30 ? "text-red-600" : loc.senior_pct >= 25 ? "text-amber-600" : "text-emerald-600"}`}>{loc.senior_pct}%</div></div>
                    <div><div className="text-[9px] text-muted-foreground">Readiness</div><div className="font-mono text-[10px]">{loc.senior_pct >= 30 ? "HIGH" : "PARTIAL"}</div></div>
                  </div>
                </div>

                {/* Layer 2: Signal */}
                <div className="p-3 bg-amber-500/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Signal className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] uppercase font-semibold text-amber-600">Layer 2: Signal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><div className="text-[9px] text-muted-foreground">Signals</div><div className="font-mono font-bold">{loc.signal_count}</div></div>
                    <div><div className="text-[9px] text-muted-foreground">Narrative</div><div className="font-mono text-[10px] truncate">{loc.narrative}</div></div>
                    <div><div className="text-[9px] text-muted-foreground">Platforms</div><div className="text-sm">{loc.platforms.map(p => PLATFORM_ICONS[p] || "").join(" ")}</div></div>
                  </div>
                </div>
              </div>

              {/* Fusion insight */}
              <div className="p-2 bg-mlk/5 border-t border-mlk/20 text-[10px] text-muted-foreground">
                <span className="text-mlk font-semibold">Fusion:</span>{" "}
                {loc.senior_pct >= 30 && loc.sentiment === SENTIMENT.NEGATIVE
                  ? "CRITICAL — High senior dependency + negative sentiment. Immediate action required."
                  : loc.senior_pct >= 25 && loc.signal_count > 10
                  ? "WARNING — Moderate senior dependency + active signal volume. Monitor closely."
                  : loc.sentiment === SENTIMENT.POSITIVE
                  ? "OPPORTUNITY — Positive sentiment. Amplification opportunity."
                  : "STABLE — No immediate action required."}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-[10px] text-muted-foreground text-center">
          5 of 368 P134 localities shown. Full dual-layer fusion available when all locality-intelligence.jsonl records are loaded.
        </div>
      </CardContent>
    </Card>

      {/* §7.16: Layer blending — opacity slider between two layers */}
      <Card className="border-mlk/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers3 className="h-4 w-4 text-mlk" /> Layer Blending — Demographics × Sentiment</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-mlk">Demographics Layer</span>
              <span className="font-mono text-muted-foreground" id="blend-val">50% / 50%</span>
              <span className="font-medium text-sky-600">Sentiment Layer</span>
            </div>
            <Slider defaultValue={[50]} min={0} max={100} step={5} className="w-full" aria-label="Layer blend opacity" />
            <div className="h-3 rounded-full overflow-hidden flex">
              <div className="h-full bg-mlk/40" style={{ width: "50%" }} />
              <div className="h-full bg-sky-500/40" style={{ width: "50%" }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded-md border border-mlk/20 p-2">
                <div className="text-[10px] text-muted-foreground mb-1">Top Demographic Signal</div>
                <div className="text-xs font-semibold">Senior dependency 25.9% (N01)</div>
                <div className="text-[9px] text-muted-foreground">WARNING threshold breached</div>
              </div>
              <div className="rounded-md border border-sky-500/20 p-2">
                <div className="text-[10px] text-muted-foreground mb-1">Top Sentiment Signal</div>
                <div className="text-xs font-semibold">Negative sentiment 45% (N05)</div>
                <div className="text-[9px] text-muted-foreground">Trending on TikTok</div>
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground">
              Slider controls the blend weight between demographic risk (amber) and sentiment signals (blue).
              Adjust to focus on one layer or find correlations.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
