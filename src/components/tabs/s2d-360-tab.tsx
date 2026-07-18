"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, MapPin, Activity, ShieldAlert, Eye } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SENTIMENT, TREND, NARRATIVE_VELOCITY, SIGNAL_CONFIDENCE, ESCALATION, PLATFORMS } from "@/lib/s2d-contracts";
import { SEED_SIGNALS, SEED_DAILY_SENTIMENT, SEED_NARRATIVE_RADAR, SEED_LOCALITY_SIGNAL_MAP } from "@/lib/s2d-seed-data";

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#10B981", NEUTRAL: "#6B7280", NEGATIVE: "#EF4444",
  MIXED: "#F59E0B", INSUFFICIENT_EVIDENCE: "#94A3B8",
};

const VELOCITY_COLORS: Record<string, string> = {
  HIGH: "#EF4444", MODERATE: "#F59E0B", LOW: "#10B981",
  NONE: "#6B7280", INSUFFICIENT_EVIDENCE: "#94A3B8",
};

const PLATFORM_ICONS: Record<string, string> = {
  TIKTOK: "🎵", FACEBOOK: "📘", INSTAGRAM: "📷", THREADS: "🧵", NEWS: "📰", OTHER: "🔗",
};

export function S2D360Tab() {
  const totalSignals = SEED_SIGNALS.length;
  const negativeCount = SEED_SIGNALS.filter(s => s.sentiment === SENTIMENT.NEGATIVE).length;
  const positiveCount = SEED_SIGNALS.filter(s => s.sentiment === SENTIMENT.POSITIVE).length;
  const activeNarratives = SEED_NARRATIVE_RADAR.filter(n => n.velocity === NARRATIVE_VELOCITY.HIGH).length;
  const escalationCount = SEED_SIGNALS.filter(s => s.escalation === ESCALATION.HUMAN_REVIEW_REQUIRED).length;

  return (
    <div className="space-y-4">
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-mlk" />
            <div>
              <CardTitle className="text-base">S2D 360 Command Centre — Signal Monitoring</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Per S2D Architecture: Apify → Signal → Sentiment → Narrative → Evidence → Response.
                Platforms: TikTok, Facebook, Instagram, Threads, News.
              </p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">P134 Melaka</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-mlk">{totalSignals}</div><div className="text-[10px] text-muted-foreground">Total Signals</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{positiveCount}</div><div className="text-[10px] text-muted-foreground">Positive</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-red-600">{negativeCount}</div><div className="text-[10px] text-muted-foreground">Negative</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-amber-600">{activeNarratives}</div><div className="text-[10px] text-muted-foreground">Active Narratives</div></div>
            <div className="rounded-md border p-3 text-center"><div className="text-2xl font-bold text-purple-600">{escalationCount}</div><div className="text-[10px] text-muted-foreground">Escalations</div></div>
          </div>

          {/* Daily sentiment trend */}
          <Card className="border-mlk/10 mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-mlk" /> Daily Sentiment Trend (3 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={SEED_DAILY_SENTIMENT}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="positive_pct" stroke="#10B981" name="Positive %" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="neutral_pct" stroke="#6B7280" name="Neutral %" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="negative_pct" stroke="#EF4444" name="Negative %" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Narrative Radar */}
          <Card className="border-mlk/10 mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-mlk" /> Narrative Radar</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SEED_NARRATIVE_RADAR.map((n) => (
                  <div key={n.narrative_id} className="flex items-start gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px]" style={{ color: SENTIMENT_COLORS[n.sentiment], borderColor: "currentColor" }}>{n.sentiment}</Badge>
                        <Badge variant="outline" className="text-[9px]" style={{ color: VELOCITY_COLORS[n.velocity], borderColor: "currentColor" }}>{n.velocity}</Badge>
                        <Badge variant="outline" className="text-[9px] text-mlk border-mlk/30">{n.trend}</Badge>
                        <span className="text-[9px] text-muted-foreground">{n.signal_count} signals · {n.locality_count} localities</span>
                        <span className="text-[9px] text-muted-foreground">{n.platforms.map(p => PLATFORM_ICONS[p] || p).join(" ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Locality Signal Map */}
          <Card className="border-mlk/10 mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-mlk" /> Locality Signal Map (P134)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-mlk">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-start p-2">Locality</th><th className="text-end p-2">Signals</th><th className="text-start p-2">Sentiment</th><th className="text-start p-2">Narrative</th><th className="text-start p-2">Trend</th></tr></thead>
                  <tbody>
                    {SEED_LOCALITY_SIGNAL_MAP.map((l) => (
                      <tr key={l.locality_code} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="p-2"><span className="font-mono text-mlk">{l.locality_code}</span> {l.locality_name}</td>
                        <td className="p-2 text-end font-mono">{l.signal_count}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[9px]" style={{ color: SENTIMENT_COLORS[l.dominant_sentiment], borderColor: "currentColor" }}>{l.dominant_sentiment}</Badge></td>
                        <td className="p-2 text-[10px]">{l.dominant_narrative}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[9px] text-mlk border-mlk/30">{l.trend}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Signal Feed */}
          <Card className="border-mlk/10">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-mlk" /> Signal Feed ({SEED_SIGNALS.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-mlk pr-1">
                {SEED_SIGNALS.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 p-2.5 rounded-md border border-border/50 hover:border-mlk/30">
                    <div className="flex-shrink-0 mt-0.5 text-lg">{PLATFORM_ICONS[s.platform] || "🔗"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-snug">{s.content_summary}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px]" style={{ color: SENTIMENT_COLORS[s.sentiment], borderColor: "currentColor" }}>{s.sentiment}</Badge>
                        <Badge variant="outline" className="text-[9px] text-mlk border-mlk/30">{s.trend}</Badge>
                        <Badge variant="outline" className="text-[9px]" style={{ color: VELOCITY_COLORS[s.narrative_velocity], borderColor: "currentColor" }}>{s.narrative_velocity}</Badge>
                        <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-500/40">{s.confidence}</Badge>
                        {s.dun && <Badge variant="outline" className="text-[9px] font-mono">N{s.dun}</Badge>}
                        <span className="text-[9px] text-muted-foreground">{s.engagement_count.toLocaleString()} engagement · {s.evidence_count} evidence</span>
                        {s.escalation === ESCALATION.HUMAN_REVIEW_REQUIRED && <Badge className="text-[8px] bg-red-500 text-white">HUMAN REVIEW</Badge>}
                        {s.escalation === ESCALATION.EVIDENCE_REVIEW_REQUIRED && <Badge className="text-[8px] bg-amber-500 text-white">EVIDENCE REVIEW</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
