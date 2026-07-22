"use client";

// ponytail: MLK — DPT Analysis module. Main 6-tab wrapper. The headline
// feature for Melaka — 5 months of consecutive DPT Pameran coverage enables
// proper time-trend analysis (unique among PIP-MLK/N9 states).
//
// Implements WORKLOAD.md Phase 6.2 + DESIGN.md §3.6 (Analysis module 6 tabs
// + Demographics overlay).
//
// Tabs:
//   1. Overview    — state-level summary + monthly trend + Demographics overlay
//   2. By Parliament — 6 parliament cards (5-month additions/deletions/net)
//   3. By DUN       — 28 DUNs × 5 months heatmap
//   4. By DM        — ~168 DM rows (filterable by parliament)
//   5. Trend        — 4-line Recharts chart (add/del/net/MoM delta) — headline
//   6. Methodology  — extraction + data-quality + DG_DPT_AGE_SCOPE note
//
// Source: `/data/dpt/spr-dpt-pameran-summary.json` (state aggregates) +
// `/data/dpt/spr-dpt-pameran.json` (30 records with DM breakdown).
//
// WCAG 2.1 AA: 3px #C77B2C focus-visible ring on tab triggers, 44×44px touch
// targets (h-11 tabs), aria-label on every interactive element, visible text
// alternative below each chart.

import * as React from "react";
import {
  AlertCircle,
  Database,
  LayoutGrid,
  Building2,
  Grid3x3,
  MapPin,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { EVIDENCE_TIER_COLORS } from "@/lib/party-colors";
import { AnalysisSkeleton } from "@/components/shared/skeletons";
import { DptOverview } from "./dpt-overview";
import { DptByParliament } from "./dpt-by-parliament";
import { DptByDun } from "./dpt-by-dun";
import { DptByDm } from "./dpt-by-dm";
import { DptTrend } from "./dpt-trend";
import { DptMethodology } from "./dpt-methodology";
import type { DptSummaryDoc } from "./types";

const SUMMARY_URL = "/data/dpt/spr-dpt-pameran-summary.json";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface TabDef {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  hint: string;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", Icon: LayoutGrid, hint: "State summary + Demographics overlay" },
  { id: "parliament", label: "By Parliament", Icon: Building2, hint: "6 parliaments · 5 months" },
  { id: "dun", label: "By DUN", Icon: Grid3x3, hint: "28 DUNs heatmap" },
  { id: "dm", label: "By DM", Icon: MapPin, hint: "~168 DMs (filterable)" },
  { id: "trend", label: "Trend", Icon: TrendingUp, hint: "5-month line chart (HEADLINE)" },
  { id: "methodology", label: "Methodology", Icon: BookOpen, hint: "Extraction + data-quality + DG_DPT_AGE_SCOPE" },
];

export interface AnalysisModuleProps {
  className?: string;
}

export function AnalysisModule({ className }: AnalysisModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<DptSummaryDoc | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(SUMMARY_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`DPT summary fetch failed: ${res.status}`);
        return (await res.json()) as DptSummaryDoc;
      })
      .then((json) => {
        if (cancelled) return;
        setSummary(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tierColor = summary
    ? EVIDENCE_TIER_COLORS[
        summary.evidence_tier as keyof typeof EVIDENCE_TIER_COLORS
      ] ?? EVIDENCE_TIER_COLORS.Verified
    : EVIDENCE_TIER_COLORS.Verified;

  return (
    <Card
      className={cn("border-slate-200 dark:border-slate-800", className)}
      role="region"
      aria-label="DPT Analysis module — 6 tabs (Overview / By Parliament / By DUN / By DM / Trend / Methodology)"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <div>
              <CardTitle className="text-base sm:text-lg">
                DPT Analysis · Daftar Pemilih Tambahan (5 months Jan–May 2026)
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Melaka's headline feature · 30 PDFs · 6 parliaments × 5 months
                · SPR Pameran public display
              </CardDescription>
            </div>
          </div>
          {summary && (
            <Badge
              className="border-transparent text-white"
              style={{ backgroundColor: tierColor }}
              aria-label={`Evidence tier: ${summary.evidence_tier}`}
            >
              {summary.evidence_tier}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <AnalysisSkeleton />
        ) : error ? (
          <div
            className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            <AlertCircle className="h-5 w-5" aria-hidden />
            <span>Failed to load DPT data.</span>
            <span className="text-xs">{error}</span>
          </div>
        ) : summary ? (
          <Tabs defaultValue="overview" className={FOCUS_RING}>
            <TabsList
              className="h-11 flex-wrap"
              aria-label="DPT analysis sections"
            >
              {TABS.map((t) => {
                const Icon = t.Icon;
                const isHeadline = t.id === "trend";
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={cn(
                      "h-9 gap-1 px-3 text-xs sm:text-sm",
                      FOCUS_RING,
                      isHeadline && "data-[state=active]:bg-[#C77B2C]/15"
                    )}
                    aria-label={`${t.label} tab — ${t.hint}${isHeadline ? " (HEADLINE)" : ""}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span>{t.label}</span>
                    {isHeadline ? (
                      <Badge
                        variant="outline"
                        className="ml-1 border-[#C77B2C]/60 px-1 py-0 text-[9px] text-[#C77B2C]"
                      >
                        HEADLINE
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="overview" className={cn("pt-4", FOCUS_RING)}>
              <DptOverview summary={summary} />
            </TabsContent>
            <TabsContent value="parliament" className={cn("pt-4", FOCUS_RING)}>
              <DptByParliament perParliament={summary.per_parliament} />
            </TabsContent>
            <TabsContent value="dun" className={cn("pt-4", FOCUS_RING)}>
              <DptByDun />
            </TabsContent>
            <TabsContent value="dm" className={cn("pt-4", FOCUS_RING)}>
              <DptByDm />
            </TabsContent>
            <TabsContent value="trend" className={cn("pt-4", FOCUS_RING)}>
              <DptTrend perMonth={summary.per_month} />
              <p className="mt-4 text-xs text-muted-foreground">
                Source: SPR Pameran PDFs (5 months × 6 parliaments = 30 PDFs).
                Methodology: pdftotext -layout extraction (no OCR needed —
                FPDF 1.85 producer). Unique to Melaka — PIP-N9 has only 1 month
                and no Trend tab.
              </p>
            </TabsContent>
            <TabsContent value="methodology" className={cn("pt-4", FOCUS_RING)}>
              <DptMethodology summary={summary} />
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default AnalysisModule;
