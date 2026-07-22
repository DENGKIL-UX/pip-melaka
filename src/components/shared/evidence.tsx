"use client";

// ponytail: MLK — Evidence tier badge + honest-gaps banner.
// Used across the dashboard to tag every data record's evidence tier.

import { Badge } from "@/components/ui/badge";
import { EVIDENCE_TIER_COLORS } from "@/lib/party-colors";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

export function EvidenceBadge({ tier, className }: { tier: string; className?: string }) {
  const color = EVIDENCE_TIER_COLORS[tier as keyof typeof EVIDENCE_TIER_COLORS] ?? "#9ca3af";
  const Icon = tier === "Verified" ? CheckCircle2 : tier === "Proxy" ? AlertTriangle : HelpCircle;
  return (
    <Badge
      variant="outline"
      className={`gap-1 ${className ?? ""}`}
      style={{ color, borderColor: color }}
      aria-label={`Evidence tier: ${tier}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {tier}
    </Badge>
  );
}

export function HonestyBanner() {
  // ponytail: MLK — Truth Above All banner (DESIGN.md cross-cutting).
  // Persistent at top of dashboard.
  return (
    <div
      className="rounded-md border border-mlk/40 bg-mlk/5 p-3 text-xs text-foreground/80"
      role="note"
      aria-label="Truth Above All banner"
    >
      <strong className="text-mlk">Truth Above All.</strong>{" "}
      Engine outputs ship as <span className="font-mono">Proxy</span> evidence tier until the 9-gate pipeline provenance protocol closes
      (currently 8/9 — gate 9 audit pending user-provided raw voter xlsx). No per-voter data ever shipped (PDPA Akta 709). NO <span className="font-mono">/api/engine</span> route — engine is build-time only.
    </div>
  );
}

export function NoGroundSurveyBanner() {
  // ponytail: MLK — DG_NO_GROUND_SURVEY banner.
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
      <AlertTriangle className="inline h-3 w-3 me-1" aria-hidden="true" />
      <strong>No ground-survey data.</strong> All demographics are passive (from voter rolls). <span className="sr-only">(gap DG_NO_GROUND_SURVEY)</span>
    </div>
  );
}

export function NoLiveSentimentBanner() {
  // ponytail: MLK — DG_NO_LIVE_SENTIMENT banner.
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
      <AlertTriangle className="inline h-3 w-3 me-1" aria-hidden="true" />
      <strong>No live sentiment feed.</strong> Digital Brain is structural-only. <span className="sr-only">(gap DG_NO_LIVE_SENTIMENT)</span>
    </div>
  );
}

export function ReducedMotionToggle() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return null;
}
