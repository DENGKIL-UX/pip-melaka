"use client";

// ponytail: MLK — Elections module. Main tabs wrapper with 3 sub-tabs
// (GE14 2018 / PRN15 2021 / GE15 2022) + 2026 projection card below the tabs.
//
// Implements WORKLOAD.md Phase 6.1 + DESIGN.md §3 row 4.
//
// PRN15 is Melaka's headline election fact (BN landslide 21/28 seats) — its
// tab content renders larger / more prominent. Default active tab = PRN15
// (matches useDashboardStore.timelineScenario initial value).
//
// Data source: `/data/elections/melaka-elections.json`. Evidence tier:
// Verified (per the JSON root) for the 3 elections; Indicative for the 2026
// projection.
//
// WCAG 2.1 AA: 3px #C77B2C focus-visible ring on tab triggers, 44×44px touch
// targets (h-11 tabs), aria-label on every interactive element, visible
// text alternative below the cards.

import * as React from "react";
import { AlertCircle, Vote } from "lucide-react";
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
import { ElectionsSkeleton } from "@/components/shared/skeletons";
import { ElectionSummaryBanner } from "./election-summary-banner";
import { ElectionTable } from "./election-table";
import { Projection2026Card } from "./projection-2026";
import type { Election, ElectionsDoc } from "./types";

const DATA_URL = "/data/elections/melaka-elections.json";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C77B2C] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface ElectionsModuleProps {
  className?: string;
}

function findElection(doc: ElectionsDoc, id: string): Election | undefined {
  return doc.elections.find((e) => e.id === id);
}

export function ElectionsModule({ className }: ElectionsModuleProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<ElectionsDoc | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(`Elections fetch failed: ${res.status}`);
        return (await res.json()) as ElectionsDoc;
      })
      .then((json) => {
        if (cancelled) return;
        setDoc(json);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tierColor = doc
    ? EVIDENCE_TIER_COLORS[
        doc.evidence_tier as keyof typeof EVIDENCE_TIER_COLORS
      ] ?? EVIDENCE_TIER_COLORS.Verified
    : EVIDENCE_TIER_COLORS.Verified;

  return (
    <Card
      className={cn("border-slate-200 dark:border-slate-800", className)}
      role="region"
      aria-label="Elections module — GE14, PRN15, GE15 results + 2026 projection"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-[#C77B2C]" aria-hidden />
            <div>
              <CardTitle className="text-base sm:text-lg">
                Elections · Melaka (3 elections + 2026 projection)
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                GE14 2018 / PRN15 2021 / GE15 2022 · 28 DUNs + 6 parliaments
              </CardDescription>
            </div>
          </div>
          {doc && (
            <Badge
              className="border-transparent text-white"
              style={{ backgroundColor: tierColor }}
              aria-label={`Election results evidence tier: ${doc.evidence_tier}`}
            >
              {doc.evidence_tier}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ElectionsSkeleton />
        ) : error ? (
          <div
            className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            <AlertCircle className="h-5 w-5" aria-hidden />
            <span>Failed to load elections data.</span>
            <span className="text-xs">{error}</span>
          </div>
        ) : doc ? (
          <div className="flex flex-col gap-5">
            <Tabs defaultValue="PRN15" className={FOCUS_RING}>
              <TabsList className="h-11" aria-label="Election selector">
                {doc.elections.map((e) => (
                  <TabsTrigger
                    key={e.id}
                    value={e.id}
                    className={cn("h-9 px-3 text-xs sm:text-sm", FOCUS_RING)}
                    aria-label={`${e.id} — ${e.name}, dated ${e.date}`}
                  >
                    {e.id}
                  </TabsTrigger>
                ))}
              </TabsList>
              {doc.elections.map((e) => {
                const inner = findElection(doc, e.id);
                if (!inner) return null;
                const isHeadline = e.id === "PRN15";
                return (
                  <TabsContent
                    key={e.id}
                    value={e.id}
                    className={cn("flex flex-col gap-4 pt-4", FOCUS_RING)}
                  >
                    <ElectionSummaryBanner election={inner} />
                    <div
                      className={cn(
                        "rounded-lg border bg-card p-3 sm:p-4",
                        isHeadline
                          ? "border-[#C77B2C]/40"
                          : "border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <h4 className="mb-2 text-sm font-semibold">
                        {inner.dun_results.length > 0
                          ? `Per-DUN results (${inner.dun_results.length} DUNs)`
                          : `Per-parliament results (${inner.parliament_results.length} parliaments)`}
                      </h4>
                      <ElectionTable election={inner} />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            <Projection2026Card projection={doc.projection_2026} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ElectionsModule;
