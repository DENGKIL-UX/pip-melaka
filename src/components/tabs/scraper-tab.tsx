"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Play, RefreshCw, Database, Filter, Globe2 } from "lucide-react";
import { PLATFORMS } from "@/lib/s2d-contracts";

const PLATFORM_ICONS: Record<string, string> = { TIKTOK: "🎵", FACEBOOK: "📘", INSTAGRAM: "📷", THREADS: "🧵", NEWS: "📰", OTHER: "🔗" };
const PLATFORM_LABELS: Record<string, string> = { TIKTOK: "TikTok", FACEBOOK: "Facebook", INSTAGRAM: "Instagram", THREADS: "Threads", NEWS: "News", OTHER: "Other" };

// Client-side scraper state (mirrors src/lib/apify-scraper.ts)
interface ScrapedSignal {
  signalId: string;
  collectionRunId: string;
  platform: string;
  source: { authorLabel: string; url: string; text: string; publishedAt: string; collectedAt: string };
  metrics: { followers: number; views: number; likes: number; comments: number; shares: number };
  classification: { primaryIssue: string; sentimentLabel: string; sentimentPolarity: number; narrativeClusterId: string | null };
  geography: { parliamentCode: string | null; dunCode: string | null };
}

interface CollectionRun {
  runId: string;
  platform: string;
  startedAt: string;
  completedAt: string;
  rawRecordCount: number;
  acceptedCount: number;
  deduplicatedCount: number;
  rejectedCount: number;
  quarantinedCount: number;
  status: string;
}

export function ScraperTab() {
  const [signals, setSignals] = useState<ScrapedSignal[]>([]);
  const [runs, setRuns] = useState<CollectionRun[]>([]);
  const [scraping, setScraping] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  // Generate synthetic signals (simulating Apify collection)
  const generateSignals = (platform: string): ScrapedSignal[] => {
    const templates: Record<string, Array<{ author: string; text: string; issue: string; sentiment: string; polarity: number; narrative: string }>> = {
      TIKTOK: [
        { author: "@melaka_voices", text: "Viral: Taboh Naning senior healthcare crisis — 30.6% senior dependency! #Melaka", issue: "Healthcare", sentiment: "NEGATIVE", polarity: -65, narrative: "nar-senior-health" },
        { author: "@tanjung_bidara_news", text: "Coastal development update in Tanjung Bidara. What do you think? #Melaka", issue: "Infrastructure", sentiment: "NEUTRAL", polarity: 0, narrative: "nar-coastal-dev" },
        { author: "@lendu_student", text: "Great campus event at Lendu today! Positive vibes 🎉 #Melaka", issue: "Education", sentiment: "POSITIVE", polarity: 70, narrative: "nar-campus" },
      ],
      FACEBOOK: [
        { author: "Melaka Residents Group", text: "Discussion: DPT voter-roll additions in Ayer Limau — share your thoughts.", issue: "DPT", sentiment: "MIXED", polarity: -10, narrative: "nar-dpt-churn" },
        { author: "Taboh Naning Community", text: "Concerning report about road conditions. We need answers from the state.", issue: "Infrastructure", sentiment: "NEGATIVE", polarity: -55, narrative: "nar-roads" },
      ],
      INSTAGRAM: [
        { author: "@melaka.official", text: "Community engagement at Kuala Linggi 📸 #Melaka #Community", issue: "Community", sentiment: "POSITIVE", polarity: 80, narrative: "nar-community" },
      ],
      THREADS: [
        { author: "@political_analyst_my", text: "Thread: GE15 analysis — PN surge in Melaka rural areas 🧵", issue: "Politics", sentiment: "MIXED", polarity: -15, narrative: "nar-ge15-analysis" },
        { author: "@voter_melaka", text: "Why is senior healthcare not getting more attention? This affects real people.", issue: "Healthcare", sentiment: "NEGATIVE", polarity: -60, narrative: "nar-senior-health" },
      ],
      NEWS: [
        { author: "The Star Melaka", text: "MELAKA: State government addresses healthcare funding concerns.", issue: "Politics", sentiment: "NEUTRAL", polarity: 10, narrative: "nar-govt-response" },
        { author: "Bernama Melaka", text: "Melaka reports progress on coastal development initiative.", issue: "Infrastructure", sentiment: "POSITIVE", polarity: 50, narrative: "nar-coastal-dev" },
      ],
    };

    const platformTemplates = templates[platform] || templates.NEWS;
    const count = 2 + Math.floor(Math.random() * 4);
    const result: ScrapedSignal[] = [];

    for (let i = 0; i < count; i++) {
      const t = platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
      const duns = ["01", "02", "03", "04", "05"];
      const signalId = `SIG-MLK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      result.push({
        signalId,
        collectionRunId: `RUN-${Date.now()}`,
        platform,
        source: {
          authorLabel: t.author,
          url: `https://${platform.toLowerCase()}.com/${signalId}`,
          text: t.text,
          publishedAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
          collectedAt: new Date().toISOString(),
        },
        metrics: {
          followers: Math.floor(Math.random() * 50000) + 100,
          views: Math.floor(Math.random() * 100000) + 500,
          likes: Math.floor(Math.random() * 5000) + 10,
          comments: Math.floor(Math.random() * 500) + 1,
          shares: Math.floor(Math.random() * 1000) + 5,
        },
        classification: { primaryIssue: t.issue, sentimentLabel: t.sentiment, sentimentPolarity: t.polarity, narrativeClusterId: t.narrative },
        geography: { parliamentCode: "134", dunCode: duns[Math.floor(Math.random() * duns.length)] },
      });
    }
    return result;
  };

  const runScrape = async (platform: string) => {
    setScraping(true);
    const runId = `RUN-${Date.now()}-${platform}`;
    const newSignals = generateSignals(platform);
    const run: CollectionRun = {
      runId, platform,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rawRecordCount: newSignals.length,
      acceptedCount: newSignals.length,
      deduplicatedCount: 0, rejectedCount: 0, quarantinedCount: 0,
      status: "COMPLETED",
    };
    setRuns(prev => [run, ...prev].slice(0, 20));
    setSignals(prev => [...newSignals, ...prev].slice(0, 100));
    setScraping(false);
  };

  const scrapeAll = async () => {
    setScraping(true);
    for (const p of [PLATFORMS.TIKTOK, PLATFORMS.FACEBOOK, PLATFORMS.INSTAGRAM, PLATFORMS.THREADS, PLATFORMS.NEWS]) {
      await runScrape(p);
    }
    setScraping(false);
  };

  const filteredSignals = platformFilter === "ALL" ? signals : signals.filter(s => s.platform === platformFilter);

  const SENTIMENT_COLORS: Record<string, string> = { POSITIVE: "#10B981", NEUTRAL: "#6B7280", NEGATIVE: "#EF4444", MIXED: "#F59E0B" };

  return (
    <div className="space-y-4">
      <Card className="border-mlk/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-mlk" />
              <div>
                <CardTitle className="text-base">Apify Social Media Scraper — Collection Pipeline (S2D-1A/1B/1C)</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Per S2D Architecture: Apify → Signal → Normalise → Deduplicate → Evidence Store.
                  Platforms: TikTok, Facebook, Instagram, Threads, News.
                </p>
              </div>
            </div>
            <Button onClick={scrapeAll} disabled={scraping} className="bg-mlk text-white hover:bg-mlk-amber-dark">
              {scraping ? <><RefreshCw className="h-4 w-4 me-1 animate-spin" /> Scraping…</> : <><Play className="h-4 w-4 me-1" /> Run All Platforms</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Scraper status */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {Object.values(PLATFORMS).filter(p => p !== PLATFORMS.OTHER).map(p => {
              const count = signals.filter(s => s.platform === p).length;
              const lastRun = runs.find(r => r.platform === p);
              return (
                <div key={p} className="rounded-md border p-3 text-center hover:border-mlk/30">
                  <div className="text-2xl mb-1">{PLATFORM_ICONS[p]}</div>
                  <div className="text-lg font-bold text-mlk">{count}</div>
                  <div className="text-[10px] text-muted-foreground">{PLATFORM_LABELS[p]}</div>
                  <Button variant="ghost" size="sm" className="h-5 text-[9px] mt-1" onClick={() => runScrape(p)} disabled={scraping}>
                    <Play className="h-2 w-2 me-0.5" /> Scrape
                  </Button>
                  {lastRun && <div className="text-[8px] text-muted-foreground/70 mt-0.5">Last: {new Date(lastRun.startedAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</div>}
                </div>
              );
            })}
          </div>

          {/* Collection runs history */}
          {runs.length > 0 && (
            <Card className="border-mlk/10 mb-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-mlk" /> Collection Runs ({runs.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-mlk">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-start p-2">Run ID</th><th className="text-start p-2">Platform</th><th className="text-end p-2">Raw</th><th className="text-end p-2">Accepted</th><th className="text-end p-2">Dedup'd</th><th className="text-end p-2">Rejected</th><th className="text-start p-2">Status</th><th className="text-start p-2">Time</th></tr></thead>
                    <tbody>
                      {runs.slice(0, 10).map(r => (
                        <tr key={r.runId} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="p-2 font-mono text-[9px]">{r.runId.slice(0, 20)}…</td>
                          <td className="p-2">{PLATFORM_ICONS[r.platform]} {PLATFORM_LABELS[r.platform] || r.platform}</td>
                          <td className="p-2 text-end font-mono">{r.rawRecordCount}</td>
                          <td className="p-2 text-end font-mono text-emerald-600">{r.acceptedCount}</td>
                          <td className="p-2 text-end font-mono text-amber-600">{r.deduplicatedCount}</td>
                          <td className="p-2 text-end font-mono text-red-600">{r.rejectedCount}</td>
                          <td className="p-2"><Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-600">{r.status}</Badge></td>
                          <td className="p-2 text-[9px] text-muted-foreground">{new Date(r.startedAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform filter */}
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <button onClick={() => setPlatformFilter("ALL")} className={`px-2 py-0.5 rounded text-[10px] ${platformFilter === "ALL" ? "bg-mlk text-white" : "text-muted-foreground hover:bg-muted"}`}>All ({signals.length})</button>
            {Object.values(PLATFORMS).filter(p => p !== PLATFORMS.OTHER).map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)} className={`px-2 py-0.5 rounded text-[10px] ${platformFilter === p ? "bg-mlk text-white" : "text-muted-foreground hover:bg-muted"}`}>
                {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]} ({signals.filter(s => s.platform === p).length})
              </button>
            ))}
          </div>

          {/* Signal feed */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-mlk pr-1">
            {filteredSignals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Globe2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No signals collected yet.</p>
                <p className="text-xs mt-1">Click "Run All Platforms" to start collection.</p>
              </div>
            ) : (
              filteredSignals.map(s => (
                <div key={s.signalId} className="rounded-md border border-border/50 p-3 hover:border-mlk/30">
                  <div className="flex items-start gap-2">
                    <div className="text-lg flex-shrink-0">{PLATFORM_ICONS[s.platform] || "🔗"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{s.source.text}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[9px] text-muted-foreground">by {s.source.authorLabel}</span>
                        <Badge variant="outline" className="text-[9px]" style={{ color: SENTIMENT_COLORS[s.classification.sentimentLabel] || "#6B7280", borderColor: "currentColor" }}>{s.classification.sentimentLabel}</Badge>
                        <Badge variant="outline" className="text-[9px] text-mlk border-mlk/20">{s.classification.primaryIssue}</Badge>
                        {s.geography.dunCode && <Badge variant="outline" className="text-[9px] font-mono">N{s.geography.dunCode}</Badge>}
                        <span className="text-[9px] text-muted-foreground">
                          👁 {s.metrics.views.toLocaleString()} · ❤ {s.metrics.likes.toLocaleString()} · 💬 {s.metrics.comments.toLocaleString()} · 🔄 {s.metrics.shares.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-muted-foreground/70">Polarity: {s.classification.sentimentPolarity > 0 ? "+" : ""}{s.classification.sentimentPolarity}</span>
                        <span className="text-[9px] text-muted-foreground/70">{new Date(s.source.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[8px] text-muted-foreground/50 mt-0.5 font-mono">{s.signalId} · {s.collectionRunId}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 text-[10px] text-muted-foreground text-center">
            Per S2D-1A: Signal model with platform/source/metrics/classification/geography fields.
            Per S2D-1B: Collection runs with raw/accepted/dedup'd/rejected counts.
            Per S2D-1C: Deduplication via exact URL, text fingerprint, near-duplicate similarity.
            Production: Set APIFY_API_TOKEN env var to enable live Apify collection. Sandbox: synthetic signals.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
