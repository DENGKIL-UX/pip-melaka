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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Maximize2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export function S2D360Tab() {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
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
        <div className="text-[10px] text-muted-foreground">
          Sections: <span className="text-foreground font-medium">Overview · Analysis · Forecasting · Reporting · Collection · Operations · Annotation · Integration</span>
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
            src="/s2d-360/index.html"
            className="w-full h-full border-0"
            title="S2D-360 Intelligence Engine"
            onLoad={() => setLoading(false)}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </Card>

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
