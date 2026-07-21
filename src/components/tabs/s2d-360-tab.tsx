"use client";

/**
 * S2D-360 Intelligence Engine tab — embeds the full S2D 360 engine via iframe.
 *
 * The S2D engine is a standalone React+Vite app built to static assets in
 * /public/s2d-360/. It provides 56 pages across 8 sections:
 * - Intelligence: Overview, Analysis, Forecasting, Reporting
 * - Data Entry: Collection (scraper, intake, watchlist)
 * - Operations: Hub, Annotation Ops, Integration
 *
 * The iframe approach gives instant access to all 56 pages without porting
 * 12,000+ files to Next.js/TypeScript. The engine runs in its own JS context
 * with its own IndexedDB storage — fully isolated from PIP-MLK.
 *
 * PIP Integration Boundary: The S2D engine has a strict aggregate-only
 * boundary. PIP voter data never enters S2D — only aggregate population
 * context (DUN-level demographics) can cross the boundary, and only when
 * explicitly enabled (currently DISABLED by default).
 *
 * Phase 2 will port the intelligence modules (src/intelligence/*) to
 * TypeScript and connect via /api/s2d/intelligence/* API routes.
 * Phase 3 will implement the /api/pip/aggregate-context endpoint.
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Maximize2, ShieldCheck, AlertCircle, Loader2, Database, Activity, TrendingUp, Brain, FileText, Zap } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { PartyTag, StatusTag } from "@/components/ui/party-tag";

// Types for the native engine API responses
interface NativeBrief {
  briefId: string;
  status: string;
  reportDate: string;
  sections: {
    executiveJudgement: string;
    mostImportantChange: string;
    highestRiskNarrative: string;
    localityHotspots: Array<{ locality: string; signalCount: number }>;
    politicalEntitySentimentMovement: Array<{ entity: string; movement: string }>;
    confidenceAndLimitations: string;
  };
  governance: Record<string, boolean>;
}

interface NativeChangePoint {
  narrative: string;
  type: string;
  severity: string;
  severityScore: number;
  description: string;
  locality: string;
}

interface NativeSignal {
  signalId: string;
  date: string;
  locality: { dunName?: string; parliamentName?: string };
  politicalEntity: string;
  issue: string;
  platform: string;
  sentimentLabel: string;
  engagementScore: number;
}

interface NativeRecommendation {
  recommendationId: string;
  title: string;
  narrative: string;
  locality: string;
  type: string;
  justification: string;
  riskOfActing: string;
  riskOfNotActing: string;
  approvalLevel: string;
  status: string;
}

export function S2D360Tab() {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState<"native" | "full">("native");
  const [deepLink, setDeepLink] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Native engine data
  const [brief, setBrief] = useState<NativeBrief | null>(null);
  const [changePoints, setChangePoints] = useState<NativeChangePoint[]>([]);
  const [signals, setSignals] = useState<NativeSignal[]>([]);
  const [recommendations, setRecommendations] = useState<NativeRecommendation[]>([]);
  const [nativeLoading, setNativeLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch native engine data
  useEffect(() => {
    (async () => {
      try {
        const [briefRes, cpRes, sigRes, recRes] = await Promise.all([
          fetch("/api/s2d/intelligence/daily-brief").then((r) => r.json()),
          fetch("/api/s2d/intelligence/change-points").then((r) => r.json()),
          fetch("/api/s2d/intelligence/signals").then((r) => r.json()),
          fetch("/api/s2d/intelligence/recommendations").then((r) => r.json()),
        ]);
        setBrief(briefRes.brief || null);
        setChangePoints(cpRes.changePoints || []);
        setSignals(sigRes.signals || []);
        setRecommendations(recRes.recommendations || []);
      } catch {
        // Graceful fallback — native engine data unavailable
      } finally {
        setNativeLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-3 fade-in-up">
      {/* Header banner */}
      <Card className="border-mlk/30 bg-mlk-radial">
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <ShieldCheck className="h-5 w-5 text-mlk flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-mlk">S2D-360 Intelligence Engine v1.0.0</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              56 pages · 8 sections · Identity firewall active · PIP boundary: <span className="font-mono text-amber-600">DISABLED</span> (read-only)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse me-1" />
              Engine Online
            </Badge>
            <Badge variant="outline" className="text-[9px] border-mlk/40 text-mlk">
              Aggregate-Only
            </Badge>
            <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-300">
              PDPA Compliant
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* PIP boundary notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-2.5 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
            <strong>PIP Integration Boundary:</strong> The S2D engine operates with a strict aggregate-only data contract.
            No individual voter data enters S2D — the identity firewall (28 rejected keys + 9 regex patterns)
            blocks any PII at the adapter layer. PIP context fusion is currently <strong>DISABLED</strong> by default.
            Enabling it is a deliberate operator decision post-release.
          </div>
        </CardContent>
      </Card>

      {/* Controls bar */}
      <div className="flex items-center justify-between gap-2">
        <Segmented
          value={view}
          onChange={(v) => setView(v)}
          options={[
            { value: "native" as const, label: "Native Engine", icon: Zap },
            { value: "full" as const, label: "Full Engine (56 pages)", icon: ExternalLink },
          ]}
        />
        <div className="flex items-center gap-2">
          <a href="/api/pip/aggregate-context?level=DUN&code=05&parliamentCode=134" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-mlk/30">
              <Database className="h-3 w-3" />
              PIP Context API
            </Button>
          </a>
          <a href="/api/s2d/intelligence" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-mlk/30">
              <Activity className="h-3 w-3" />
              S2D API
            </Button>
          </a>
        </div>
      </div>

      {/* Native Engine Panel */}
      {view === "native" && (
        <div className="space-y-3">
          {nativeLoading ? (
            <Card className="border-mlk/20"><CardContent className="p-8 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin me-2 text-mlk" /> Loading native engine data…
            </CardContent></Card>
          ) : (
            <>
              {/* Daily Intelligence Brief */}
              {brief && (
                <Card className="border-mlk/30 bg-mlk-radial">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-mlk" /> Daily Intelligence Brief
                      <Badge className="text-[9px] bg-mlk text-white border-transparent ms-1">{brief.status}</Badge>
                      <span className="text-[9px] text-muted-foreground font-mono ms-auto">{brief.briefId}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs leading-relaxed">{brief.sections.executiveJudgement}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="rounded-md border border-mlk/20 bg-background/60 p-2">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Most Important Change</div>
                        <div className="text-xs">{brief.sections.mostImportantChange}</div>
                      </div>
                      <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Highest Risk Narrative</div>
                        <div className="text-xs">{brief.sections.highestRiskNarrative}</div>
                      </div>
                    </div>
                    {/* Sentiment movement */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Sentiment Movement:</span>
                      {brief.sections.politicalEntitySentimentMovement.map((e) => (
                        <span key={e.entity} className="inline-flex items-center gap-1 text-[10px]">
                          <PartyTag coalition={e.entity as "BN" | "PH" | "PN"} size="xs" />
                          <span className="text-muted-foreground">{e.movement}</span>
                        </span>
                      ))}
                    </div>
                    {/* Locality hotspots */}
                    {brief.sections.localityHotspots.length > 0 && (
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Locality Hotspots</div>
                        <div className="flex gap-2 flex-wrap">
                          {brief.sections.localityHotspots.map((h) => (
                            <div key={h.locality} className="rounded-md border border-mlk/20 bg-background/60 px-2 py-1 text-[10px]">
                              <span className="font-medium">{h.locality}</span>: {h.signalCount} signals
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-[9px] text-muted-foreground italic">{brief.sections.confidenceAndLimitations}</div>
                  </CardContent>
                </Card>
              )}

              {/* Change Points */}
              {changePoints.length > 0 && (
                <Card className="border-mlk/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-mlk" /> Change-Point Detection ({changePoints.length})</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Narrative</TableHead>
                          <TableHead className="text-[10px]">Type</TableHead>
                          <TableHead className="text-[10px]">Severity</TableHead>
                          <TableHead className="text-[10px]">Locality</TableHead>
                          <TableHead className="text-[10px]">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {changePoints.map((cp, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-[10px] font-medium">{cp.narrative}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px]">{cp.type}</Badge></TableCell>
                            <TableCell><StatusTag status={cp.severity === "CRITICAL" ? "error" : cp.severity === "HIGH" ? "warning" : "success"} label={cp.severity} /></TableCell>
                            <TableCell className="text-[10px]">{cp.locality}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{cp.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Signals */}
              {signals.length > 0 && (
                <Card className="border-mlk/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-mlk" /> Signal Feed ({signals.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto scrollbar-mlk">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Locality</TableHead>
                            <TableHead className="text-[10px]">Entity</TableHead>
                            <TableHead className="text-[10px]">Issue</TableHead>
                            <TableHead className="text-[10px]">Platform</TableHead>
                            <TableHead className="text-[10px]">Sentiment</TableHead>
                            <TableHead className="text-[10px] text-right">Engagement</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {signals.map((s) => (
                            <TableRow key={s.signalId}>
                              <TableCell className="text-[10px]">{s.locality.dunName || s.locality.parliamentName || "—"}</TableCell>
                              <TableCell><PartyTag coalition={s.politicalEntity as "BN" | "PH" | "PN"} size="xs" /></TableCell>
                              <TableCell className="text-[10px]">{s.issue}</TableCell>
                              <TableCell className="text-[10px] font-mono">{s.platform}</TableCell>
                              <TableCell><StatusTag status={s.sentimentLabel === "Positive" ? "success" : s.sentimentLabel === "Negative" ? "error" : "default"} label={s.sentimentLabel} /></TableCell>
                              <TableCell className="text-[10px] text-right font-mono">{s.engagementScore}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <Card className="border-mlk/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-mlk" /> Recommendations ({recommendations.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {recommendations.map((rec) => (
                      <div key={rec.recommendationId} className="rounded-md border border-mlk/20 bg-background/60 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{rec.title}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] border-mlk/40 text-mlk">{rec.type}</Badge>
                            <StatusTag status={rec.status === "PENDING" ? "processing" : "success"} label={rec.status} />
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{rec.justification}</div>
                        <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground">
                          <span>Risk of acting: <span className="text-foreground">{rec.riskOfActing}</span></span>
                          <span>Risk of not acting: <span className="text-foreground">{rec.riskOfNotActing}</span></span>
                          <span>Approval: <span className="text-mlk font-medium">{rec.approvalLevel}</span></span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Full Engine Iframe (when view=full) */}
      {view === "full" && (
        <>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* §7.8: Deep link navigation — quick section access */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground me-1">Jump to:</span>
            {[
              { label: "Overview", hash: "/overview" },
              { label: "Analysis", hash: "/analysis" },
              { label: "Forecast", hash: "/forecasting" },
              { label: "Reporting", hash: "/reporting" },
              { label: "Collection", hash: "/collection" },
              { label: "Operations", hash: "/operations" },
            ].map((section) => (
              <button
                key={section.label}
                onClick={() => setDeepLink(section.hash)}
                className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  deepLink === section.hash ? "bg-mlk text-white" : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1 border-mlk/30"
              onClick={() => setFullscreen(!fullscreen)}
            >
              <Maximize2 className="h-3 w-3" />
              {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
            <a href="/s2d-360/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-mlk/30">
                <ExternalLink className="h-3 w-3" />
                Open in New Tab
              </Button>
            </a>
          </div>
        </div>

      {/* Iframe container */}
      <Card className={`border-mlk/20 overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""}`}>
        <div className={`relative ${fullscreen ? "h-screen" : "h-[calc(100vh-280px)] min-h-[600px]"}`}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-mlk" />
                <span className="text-xs text-muted-foreground">Loading S2D-360 Intelligence Engine…</span>
                <span className="text-[9px] text-muted-foreground/60">56 pages · 3.3MB bundle</span>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={`/s2d-360/index.html${deepLink ? `#${deepLink}` : ""}`}
            className="w-full h-full border-0"
            title="S2D-360 Intelligence Engine"
            onLoad={() => setLoading(false)}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </Card>
        </>
      )}

      {/* Footer info */}
      <Card className="border-mlk/20">
        <CardContent className="p-2 text-[9px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Engine: <strong className="text-foreground">v1.0.0</strong></span>
            <span>Pages: <strong className="text-foreground">56</strong></span>
            <span>Sections: <strong className="text-foreground">8</strong></span>
            <span>Governance booleans: <strong className="text-foreground">22</strong></span>
            <span>Validator scripts: <strong className="text-foreground">100+</strong></span>
          </div>
          <span className="text-muted-foreground/60">Source: s2d-engine/src/S2D360Engine.clean.jsx</span>
        </CardContent>
      </Card>
    </div>
  );
}
