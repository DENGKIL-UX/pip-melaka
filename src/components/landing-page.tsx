"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShieldCheck, Globe2, Vote, Users, TrendingUp, MapPin, Building2, Layers3, Activity, ShieldAlert, RefreshCw, Clock, Database, CheckCircle2, Info, Landmark, Repeat2, AlertTriangle, TrendingDown, Trophy } from "lucide-react";
import { PARLIAMENTS, TOTAL_DUN, TOTAL_VOTERS_P134, DISTRICTS } from "@/lib/melaka-constants";
import { DUN_SUMMARY, DUN_COALITION_COUNTS, DUN_DISTRICT_COUNTS, type DunSummary } from "@/lib/dun-summary";
import { PARTY_COLORS } from "@/lib/party-colors";
import { type PartyCode } from "@/lib/party-metadata";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { PartyLogo } from "@/components/shared/party-logo";
import { Segmented } from "@/components/ui/segmented";
import { PartyTag } from "@/components/ui/party-tag";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FilterKind = "all" | "verified" | "pending";
type SeatsView = "parliament" | "dun";
type DunCoalitionFilter = "all" | "BN" | "PH" | "PN" | "swing";
type DistrictFilter = "all" | (typeof DISTRICTS)[number];

/**
 * Premium parliament card — adapted from uploaded premium-design
 * ParliamentCard.tsx, rebranded to MLK amber accent.
 *
 * Features: completeness bar, verified/pending status dot, hover lift,
 * monospace data row, click-to-enter.
 */
function PremiumParliamentCard({
  code,
  name,
  district,
  dunCount,
  voters,
  verified,
  delay,
  onClick,
}: {
  code: string;
  name: string;
  district: string;
  dunCount: number;
  voters: number | null;
  verified: boolean;
  delay: number;
  onClick: () => void;
}) {
  const completeness = verified ? 100 : 0;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "group relative w-full text-left cursor-pointer",
        "rounded-xl overflow-hidden",
        "bg-card border",
        verified ? "border-t-2 border-t-emerald-500/40 border-x-mlk/10 border-b-mlk/10" : "border-t-2 border-t-amber-500/30 border-x-mlk/10 border-b-mlk/10",
        "hover:border-mlk/30",
        "transition-all duration-300",
        "shadow-sm hover:shadow-mlk",
        "p-5 focus-mlk"
      )}
      aria-label={`Enter dashboard — ${name} (P${code})`}
    >
      {/* Hover glow */}
      <div
        className="absolute -inset-px bg-gradient-to-r from-mlk/0 via-mlk/5 to-mlk/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-mlk bg-mlk/10 px-2 py-0.5 rounded">
                P{code}
              </span>
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  verified ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
                aria-label={verified ? "Verified data" : "Pending data"}
              />
            </div>
            <h3 className="mt-2 text-base font-semibold group-hover:text-mlk transition-colors">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {district}
            </p>
          </div>
          <ChevronRight
            className="w-4 h-4 text-muted-foreground group-hover:text-mlk group-hover:translate-x-1 transition-all"
            aria-hidden="true"
          />
        </div>

        {/* Data completeness bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Data completeness</span>
            <span className="font-mono">{completeness}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completeness}%` }}
              transition={{ duration: 1.2, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "h-full rounded-full",
                verified
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-amber-500 to-amber-400"
              )}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono text-sm">{dunCount}</span>
            <span className="text-[10px] text-muted-foreground">DUN</span>
          </div>
          <div className="w-px h-3 bg-border" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            {voters ? (
              <span className="font-mono text-sm">{voters.toLocaleString()}</span>
            ) : (
              <span className="font-mono text-sm text-muted-foreground">—</span>
            )}
            <span className="text-[10px] text-muted-foreground">voters</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * PremiumDunCard — DUN seat card (28 total) for the landing page.
 *
 * Shows the latest PRN15 winner (coalition + party + candidate),
 * the GE14→PRN15 swing indicator (if hands changed), a margin-of-victory
 * bar, and the parent parliament/district. Designed to live next to
 * PremiumParliamentCard so the two views feel visually consistent.
 */
function PremiumDunCard({
  dun,
  delay,
  onClick,
}: {
  dun: DunSummary;
  delay: number;
  onClick: () => void;
}) {
  const { prn15, ge14 } = dun;
  const coalition = prn15.coalition;
  const swing = dun.swing;

  // Margin-of-victory bar — scaled to 50pp max (anything > 30pp is "fortress").
  const marginPct = Math.max(0, Math.min(prn15.marginPct, 50));
  const marginFillPct = (marginPct / 50) * 100;
  const marginColor =
    prn15.marginPct < 5 ? "#ef4444" : prn15.marginPct < 15 ? "#f59e0b" : "#10b981";

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "group relative w-full text-left cursor-pointer",
        "rounded-xl overflow-hidden",
        "bg-card border",
        coalition === "BN" && "border-t-2 border-t-sky-500/50 border-x-mlk/10 border-b-mlk/10",
        coalition === "PH" && "border-t-2 border-t-red-500/50 border-x-mlk/10 border-b-mlk/10",
        coalition === "PN" && "border-t-2 border-t-emerald-500/50 border-x-mlk/10 border-b-mlk/10",
        "hover:border-mlk/30",
        "transition-all duration-300",
        "shadow-sm hover:shadow-mlk",
        "p-4 focus-mlk",
      )}
      aria-label={`Enter dashboard — ${dun.dunName} (${dun.dunCodeLabel})`}
    >
      {/* Hover glow */}
      <div
        className="absolute -inset-px bg-gradient-to-r from-mlk/0 via-mlk/5 to-mlk/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Header — DUN code + parent parliament + winner tag */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-mlk bg-mlk/10 px-1.5 py-0.5 rounded">
                {dun.dunCodeLabel}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                P{dun.parliamentCode}
              </span>
              {swing && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-mlk bg-mlk/10 px-1.5 py-0.5 rounded-full">
                  <Repeat2 className="w-2.5 h-2.5" aria-hidden="true" />
                  Swing
                </span>
              )}
              {dun.isMarginal && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
                  Marginal
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-sm font-semibold group-hover:text-mlk transition-colors truncate">
              {dun.dunName}
            </h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5" aria-hidden="true" />
              {dun.district} · {dun.parliamentName}
            </p>
          </div>
          <PartyTag coalition={coalition} size="xs" />
        </div>

        {/* Incumbent row */}
        <div className="mb-3 flex items-start gap-1.5">
          <Trophy className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Incumbent (PRN15 · 2021)</div>
            <div className="flex items-center gap-1.5">
              <PartyLogo party={prn15.party as PartyCode} size="xs" />
              <div className="text-xs font-medium truncate" title={prn15.candidate}>
                {prn15.candidate}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              <span className="font-mono">{prn15.party}</span> · {prn15.votes.toLocaleString()} votes ({prn15.votesPct.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Margin bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
            <span>Margin of victory</span>
            <span className="font-mono" style={{ color: marginColor }}>
              {prn15.marginPct.toFixed(1)}pp
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${marginFillPct}%` }}
              transition={{ duration: 1, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: marginColor }}
            />
          </div>
        </div>

        {/* Swing indicator (GE14 → PRN15) */}
        {swing ? (
          <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-mlk/5 border border-mlk/20">
            <TrendingDown className="w-3 h-3 text-mlk" aria-hidden="true" />
            <span className="text-muted-foreground">
              <span className="font-mono">GE14</span>{" "}
              <span className="font-semibold text-foreground">{ge14.coalition}</span>
              <span className="text-mlk mx-1">→</span>
              <span className="font-mono">PRN15</span>{" "}
              <span className="font-semibold text-foreground">{prn15.coalition}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-emerald-500" aria-hidden="true" />
            <span>
              Held by <span className="font-semibold text-foreground">{prn15.coalition}</span> since GE14
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

/**
 * DunCoalitionFilterTabs — All / BN / PH / PN / Swing segmented filter
 * for the DUN view. Each tab shows live counts.
 */
function DunCoalitionFilterTabs({
  filter,
  setFilter,
}: {
  filter: DunCoalitionFilter;
  setFilter: (f: DunCoalitionFilter) => void;
}) {
  const tabs: Array<{ id: DunCoalitionFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: DUN_SUMMARY.length },
    { id: "BN", label: "BN", count: DUN_COALITION_COUNTS.BN },
    { id: "PH", label: "PH", count: DUN_COALITION_COUNTS.PH },
    { id: "PN", label: "PN", count: DUN_COALITION_COUNTS.PN },
    { id: "swing", label: "Swing", count: DUN_COALITION_COUNTS.swing },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-mlk/10"
      role="tablist"
      aria-label="Filter DUN seats by coalition winner"
    >
      {tabs.map((tab) => {
        const isActive = filter === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all focus-mlk",
              isActive
                ? tab.id === "swing"
                  ? "bg-gradient-to-r from-mlk to-mlk-amber-dark text-white shadow-sm"
                  : "bg-mlk text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            {tab.label}
            <span className={cn("ms-1.5 font-mono text-[10px]", isActive ? "text-white/80" : "text-muted-foreground/70")}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * DistrictFilterTabs — All / Alor Gajah / Melaka Tengah / Jasin
 * for the DUN view. Each tab shows live counts.
 */
function DistrictFilterTabs({
  filter,
  setFilter,
}: {
  filter: DistrictFilter;
  setFilter: (f: DistrictFilter) => void;
}) {
  const tabs: Array<{ id: DistrictFilter; label: string; count: number }> = [
    { id: "all", label: "All Districts", count: DUN_SUMMARY.length },
    ...DISTRICTS.map((d) => ({
      id: d as DistrictFilter,
      label: d,
      count: DUN_DISTRICT_COUNTS[d as keyof typeof DUN_DISTRICT_COUNTS],
    })),
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Filter DUN seats by district">
      {tabs.map((tab) => {
        const isActive = filter === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all focus-mlk",
              isActive
                ? "border-mlk/40 bg-mlk/10 text-mlk"
                : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="ms-1 font-mono text-[9px] opacity-70">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * DunCompositionStrip — small visual seat-composition bar (BN/PH/PN).
 * Mirrors the look of a parliament seating chart.
 */
function DunCompositionStrip() {
  const segments = [
    { code: "BN" as const, count: DUN_COALITION_COUNTS.BN, color: PARTY_COLORS.BN },
    { code: "PH" as const, count: DUN_COALITION_COUNTS.PH, color: PARTY_COLORS.PH },
    { code: "PN" as const, count: DUN_COALITION_COUNTS.PN, color: PARTY_COLORS.PN },
  ];
  const total = segments.reduce((s, x) => s + x.count, 0);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-2 rounded-full overflow-hidden border border-border/60 w-48">
        {segments.map((seg) => (
          <motion.div
            key={seg.code}
            initial={{ width: 0 }}
            animate={{ width: `${(seg.count / total) * 100}%` }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundColor: seg.color }}
            title={`${seg.code}: ${seg.count} seats`}
            aria-label={`${seg.code} ${seg.count} seats`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        {segments.map((seg) => (
          <div key={seg.code} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: seg.color }} aria-hidden="true" />
            <span className="font-mono text-muted-foreground">{seg.code}</span>
            <span className="font-semibold text-foreground">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * BentoHero — asymmetric bento grid for the landing hero.
 *
 * Featured large tile (verified data map) + 4 summary tiles.
 * Each summary tile has an InfoTooltip for jargon (S2D phases, provenance gates).
 */
function BentoHero({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Large featured card — spans 2 cols × 2 rows */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="col-span-2 md:row-span-2 relative overflow-hidden rounded-2xl border border-mlk/20 bg-mlk-radial p-6 md:p-8 flex flex-col justify-between min-h-[280px]"
      >
        {/* Animated background blobs */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-64 h-64 bg-mlk/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-mlk/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-mlk" aria-hidden="true" />
            <span className="text-xs font-medium text-mlk tracking-wider uppercase">
              Verified Data
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            DOSM kawasanku
            <span className="shimmer-text"> GeoJSON</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Real boundary data from Department of Statistics Malaysia.
            2026 redelineation verified against official gazette.
          </p>
        </div>

        <div className="relative z-10 flex items-end gap-4 md:gap-6 mt-6">
          <div>
            <div className="font-mono text-3xl md:text-4xl font-bold">
              <AnimatedCounter value={6} duration={1400} groupSeparator={false} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Parliaments</div>
          </div>
          <div className="w-px h-10 bg-border" aria-hidden="true" />
          <div>
            <div className="font-mono text-3xl md:text-4xl font-bold">
              <AnimatedCounter value={TOTAL_DUN} duration={1600} groupSeparator={false} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">DUN Seats</div>
          </div>
          <div className="w-px h-10 bg-border" aria-hidden="true" />
          <div>
            <div className="font-mono text-3xl md:text-4xl font-bold">
              <AnimatedCounter value={3} duration={1800} groupSeparator={false} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Elections</div>
          </div>
        </div>
      </motion.div>

      {/* Smaller summary tiles — each with InfoTooltip for jargon */}

      {/* GeoJSON layers tile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers3 className="w-4 h-4 text-mlk" aria-hidden="true" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">GeoJSON</span>
          </div>
          <InfoTooltip
            label="What are GeoJSON layers?"
            content={
              <div>
                <div className="font-semibold text-mlk mb-1">GeoJSON Boundary Layers</div>
                <div className="text-muted-foreground">
                  28 DUN + 6 parlimen polygon boundaries from DOSM kawasanku (2026 redelineation). Used for choropleth maps and 3D extrusion.
                </div>
              </div>
            }
          />
        </div>
        <div className="font-mono text-2xl font-bold">
          <AnimatedCounter value={28} groupSeparator={false} />+<AnimatedCounter value={6} groupSeparator={false} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">DUN + parlimen layers</div>
      </motion.div>

      {/* Voters tile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-mlk" aria-hidden="true" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Voters</span>
          </div>
          <InfoTooltip
            label="What does P134 verified mean?"
            content={
              <div>
                <div className="font-semibold text-mlk mb-1">P134 Verified Voters</div>
                <div className="text-muted-foreground">
                  71,415 voter records in P134 Masjid Tanah, built by the PIP-VOTER-INTELLIGENCE engine from a cleansed voter roll (99.93% profile completeness). P135–P139 pending raw SPR data.
                </div>
              </div>
            }
          />
        </div>
        <div className="font-mono text-2xl font-bold">
          <AnimatedCounter value={TOTAL_VOTERS_P134} duration={2200} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">P134 verified</div>
      </motion.div>

      {/* S2D Loop tile — with tooltip explaining 9 phases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-mlk" aria-hidden="true" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">S2D Loop</span>
          </div>
          <InfoTooltip
            label="What is the S2D Loop?"
            content={
              <div>
                <div className="font-semibold text-mlk mb-1.5">S2D: Sensing → Deciding → Acting</div>
                <div className="space-y-0.5 text-muted-foreground">
                  <div><span className="text-mlk font-mono">S1</span> Sensing — data ingestion</div>
                  <div><span className="text-mlk font-mono">S2</span> Structuring — normalization</div>
                  <div><span className="text-mlk font-mono">S3</span> Scoring — analytics engine</div>
                  <div><span className="text-mlk font-mono">S4</span> Signaling — alert generation</div>
                  <div><span className="text-mlk font-mono">S5</span> Deciding — human judgement</div>
                  <div><span className="text-mlk font-mono">S6</span> Acting — campaign deployment</div>
                  <div><span className="text-mlk font-mono">S7</span> Monitoring — outcome tracking</div>
                  <div><span className="text-mlk font-mono">S8</span> Learning — model refinement</div>
                  <div><span className="text-mlk font-mono">S9</span> Adapting — strategy update</div>
                </div>
              </div>
            }
          />
        </div>
        <div className="font-mono text-2xl font-bold text-mlk">
          <AnimatedCounter value={9} groupSeparator={false} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">phases · sensing→acting</div>
      </motion.div>

      {/* Provenance tile — with tooltip explaining all 9 gates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="rounded-xl border border-mlk/10 bg-card p-4 md:p-5 hover:border-mlk/30 transition-colors hover-lift"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-mlk" aria-hidden="true" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Provenance</span>
          </div>
          <InfoTooltip
            label="What are provenance gates?"
            content={
              <div>
                <div className="font-semibold text-mlk mb-1.5">Provenance Gates (8 of 9 closed)</div>
                <div className="space-y-0.5 text-muted-foreground">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Engine source acquired</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Raw JSONL extracted</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Schema validated</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> PDPA scrub applied</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Demographics transformed</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> GeoJSON boundaries mapped</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Elections cross-referenced</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> DPT churn computed</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-500" /> Raw SPR voter xlsx (open)</div>
                </div>
              </div>
            }
          />
        </div>
        <div className="font-mono text-2xl font-bold">
          <AnimatedCounter value={8} groupSeparator={false} />/<AnimatedCounter value={9} groupSeparator={false} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">gates closed</div>
        {/* Mini progress bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "88.9%" }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-mlk to-mlk/60"
          />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * DataFreshnessStrip — "Updated 2 hours ago · Next refresh in 6 hours · Source: DOSM"
 *
 * Addresses VLM audit finding: "No 'last updated' timestamp — builds trust
 * in data freshness".
 */
function DataFreshnessStrip() {
  // Real build timestamp injected by next.config.ts at build time.
  // Falls back to "just now" if env var is missing (dev mode without rebuild).
  const buildTime = useMemo(() => {
    const envTime = process.env.NEXT_PUBLIC_BUILD_TIME;
    if (envTime) {
      const parsed = new Date(envTime);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Fallback: treat as just-built (0 seconds ago)
    return new Date();
  }, []);

  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - buildTime.getTime();
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      if (hours > 0) {
        setRelativeTime(`${hours}h ${mins}m ago`);
      } else {
        setRelativeTime(`${mins}m ago`);
      }
    };
    update();
    const interval = setInterval(update, 60 * 1000); // update every minute
    return () => clearInterval(interval);
  }, [buildTime]);

  return (
    <div className="flex items-center justify-center gap-3 md:gap-6 mt-6 md:mt-8 text-xs text-muted-foreground flex-wrap">
      <span className="flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" aria-hidden="true" />
        Updated <span className="text-foreground font-medium">{relativeTime}</span>
      </span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" aria-hidden="true" />
      <span className="flex items-center gap-1.5">
        <Clock className="w-3 h-3" aria-hidden="true" />
        Next refresh in <span className="text-foreground font-medium">6 hours</span>
      </span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" aria-hidden="true" />
      <span className="flex items-center gap-1.5">
        <Database className="w-3 h-3" aria-hidden="true" />
        Source: <span className="text-foreground font-medium">DOSM kawasanku 2026</span>
      </span>
    </div>
  );
}

/**
 * MarginalSeatsWatchlist — highlights the 6 DUN seats with <5pp margin.
 *
 * These are the seats most likely to flip in PRN16 (next state election).
 * Shows: DUN code, name, incumbent, runner-up, margin, and a mini vote-share bar.
 * Clicking any card enters the dashboard.
 */
function MarginalSeatsWatchlist({ onEnter }: { onEnter: () => void }) {
  const marginalSeats = useMemo(() => {
    return DUN_SUMMARY
      .filter((d) => d.isMarginal)
      .sort((a, b) => a.prn15.marginPct - b.prn15.marginPct); // tightest first
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/5 via-mlk/5 to-amber-500/5 p-5 md:p-6"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Marginal Seats Watchlist
              <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-600 dark:text-red-400">
                {marginalSeats.length} seats
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              DUN seats with &lt;5pp victory margin — most likely to flip in PRN16
            </p>
          </div>
        </div>
        <InfoTooltip
          label="What is a marginal seat?"
          content={
            <div>
              <div className="font-semibold text-mlk mb-1">Marginal Seat (&lt;5pp margin)</div>
              <div className="text-muted-foreground">
                A seat where the winner&apos;s vote share minus the runner-up&apos;s is less than 5 percentage points.
                These seats are statistically competitive and most likely to change hands in the next election.
                Watchlist sorted by tightest margin first.
              </div>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {marginalSeats.map((dun, i) => {
          const marginColor = dun.prn15.marginPct < 1 ? "#dc2626" : dun.prn15.marginPct < 3 ? "#f59e0b" : "#eab308";
          const winnerColor = dun.prn15.coalition === "BN" ? PARTY_COLORS.BN : dun.prn15.coalition === "PH" ? PARTY_COLORS.PH : PARTY_COLORS.PN;
          const runnerUpColor = dun.prn15.runnerUpCoalition === "BN" ? PARTY_COLORS.BN : dun.prn15.runnerUpCoalition === "PH" ? PARTY_COLORS.PH : PARTY_COLORS.PN;
          return (
            <motion.button
              key={dun.dunCode}
              type="button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
              whileHover={{ y: -2 }}
              onClick={onEnter}
              className="group text-left rounded-xl border border-border/60 bg-card/80 hover:border-mlk/30 hover:shadow-md transition-all p-4 focus-mlk"
              aria-label={`View ${dun.dunName} — marginal seat (${dun.prn15.marginPct.toFixed(1)}pp margin)`}
            >
              {/* Header — code + name + margin badge */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-mlk bg-mlk/10 px-1.5 py-0.5 rounded">
                      {dun.dunCodeLabel}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">P{dun.parliamentCode}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-semibold group-hover:text-mlk transition-colors truncate">
                    {dun.dunName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{dun.parliamentName} · {dun.district}</p>
                </div>
                <span
                  className="font-mono text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ color: marginColor, backgroundColor: `${marginColor}15` }}
                >
                  {dun.prn15.marginPct.toFixed(1)}pp
                </span>
              </div>

              {/* Vote share bar — winner vs runner-up */}
              <div className="mb-2">
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${dun.prn15.votesPct}%`,
                      backgroundColor: winnerColor,
                    }}
                  />
                  <div
                    className="h-full transition-all opacity-60"
                    style={{
                      width: `${Math.max(0, dun.prn15.votesPct - dun.prn15.marginPct)}%`,
                      backgroundColor: runnerUpColor,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
                  <span style={{ color: winnerColor }} className="font-medium">
                    {dun.prn15.coalition} · {dun.prn15.party} ({dun.prn15.votesPct.toFixed(1)}%)
                  </span>
                  <span style={{ color: runnerUpColor }} className="font-medium">
                    {dun.prn15.runnerUpCoalition} · {dun.prn15.runnerUpParty}
                  </span>
                </div>
              </div>

              {/* Incumbent */}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <PartyLogo party={dun.prn15.party as PartyCode} size="xs" />
                <Trophy className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate" title={dun.prn15.candidate}>{dun.prn15.candidate}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * ParliamentFilterTabs — All / Verified / Pending filter.
 *
 * Addresses VLM audit finding: "No sorting, no filtering, no search within section".
 */
function ParliamentFilterTabs({
  filter,
  setFilter,
  counts,
}: {
  filter: FilterKind;
  setFilter: (f: FilterKind) => void;
  counts: { all: number; verified: number; pending: number };
}) {
  const tabs: Array<{ id: FilterKind; label: string; count: number }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "verified", label: "Verified", count: counts.verified },
    { id: "pending", label: "Pending", count: counts.pending },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-mlk/10"
      role="tablist"
      aria-label="Filter parliaments by verification status"
    >
      {tabs.map((tab) => {
        const isActive = filter === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all focus-mlk",
              isActive
                ? "bg-mlk text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {tab.label}
            <span className={cn("ms-1.5 font-mono text-[10px]", isActive ? "text-white/80" : "text-muted-foreground/70")}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [showHero, setShowHero] = useState(false);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [seatsView, setSeatsView] = useState<SeatsView>("parliament");
  const [dunCoalition, setDunCoalition] = useState<DunCoalitionFilter>("all");
  const [district, setDistrict] = useState<DistrictFilter>("all");
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHero(true);
  }, []);

  // Particle network background
  useEffect(() => {
    if (!particleCanvasRef.current) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    const canvas = particleCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(199, 123, 44, 0.6)";
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 180) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(199, 123, 44, ${0.15 * (1 - d / 180)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const counts = useMemo(() => ({
    all: PARLIAMENTS.length,
    verified: PARLIAMENTS.filter((p) => p.code === "134").length,
    pending: PARLIAMENTS.filter((p) => p.code !== "134").length,
  }), []);

  const filteredParliaments = useMemo(() => {
    if (filter === "all") return PARLIAMENTS;
    if (filter === "verified") return PARLIAMENTS.filter((p) => p.code === "134");
    return PARLIAMENTS.filter((p) => p.code !== "134");
  }, [filter]);

  // DUN filter — coalition winner + district (independent, both apply)
  const filteredDuns = useMemo(() => {
    return DUN_SUMMARY.filter((d) => {
      if (dunCoalition === "swing") {
        if (!d.swing) return false;
      } else if (dunCoalition !== "all") {
        if (d.prn15.coalition !== dunCoalition) return false;
      }
      if (district !== "all" && d.district !== district) return false;
      return true;
    });
  }, [dunCoalition, district]);

  const handleEnter = () => {
    toast({
      title: "Entering dashboard",
      description: "Loading 19 tabs of Melaka political intelligence…",
    });
    onEnter();
  };

  const handleParliamentClick = (code: string, name: string) => {
    toast({
      title: `Opening ${name}`,
      description: `P${code} · Entering dashboard…`,
    });
    onEnter();
  };

  const handleDunClick = (dun: DunSummary) => {
    toast({
      title: `Opening ${dun.dunName}`,
      description: `${dun.dunCodeLabel} · ${dun.parliamentName} · Entering dashboard…`,
    });
    onEnter();
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <canvas ref={particleCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 bg-mlk-radial pointer-events-none" aria-hidden="true" />
      <a href="#main" className="skip-link">Skip to main content</a>

      <main id="main" className="relative z-10 container mx-auto px-4 py-8 md:py-12 flex-1">
        {/* Hero */}
        <section className="text-center mb-10 md:mb-14">
          <AnimatePresence>
            {showHero && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Badge variant="outline" className="mb-4 border-mlk/40 text-mlk bg-mlk/5">
                  <ShieldCheck className="h-3 w-3 me-1" aria-hidden="true" />
                  PIP-MLK · Political Intelligence Platform · Melaka
                </Badge>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  <span className="bg-mlk-gradient bg-clip-text text-transparent text-mlk-glow">Truth Above All.</span>
                </h1>
                <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                  A public-facing political intelligence dashboard for Melaka state — 6 parliaments, 28 DUN, 3 elections. Real DOSM kawasanku GeoJSON boundaries. Build-time engine demographics. No PDPA-sensitive data ever shipped.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 justify-center">
                  <Button size="lg" onClick={handleEnter} className="bg-mlk text-white hover:bg-mlk-amber-dark text-base h-12 px-8" aria-label="Enter the PIP-MLK dashboard">
                    Enter Dashboard <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Bento hero grid */}
        <section className="mb-6 md:mb-8" aria-label="Headline statistics">
          <BentoHero onEnter={onEnter} />
        </section>

        {/* Data freshness strip */}
        <section className="mb-8 md:mb-10">
          <DataFreshnessStrip />
        </section>

        {/* Marginal Seats Watchlist — 6 DUN seats with <5pp margin */}
        <section className="mb-8 md:mb-12" aria-label="Marginal seats watchlist">
          <MarginalSeatsWatchlist onEnter={onEnter} />
        </section>

        {/* Seats section — Parliament / DUN segmented toggle */}
        <section className="mb-12 md:mb-16" aria-labelledby="seats-h">
          {/* Header — title + segmented toggle */}
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 id="seats-h" className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
                {seatsView === "parliament" ? (
                  <>
                    <Building2 className="w-6 h-6 text-mlk" aria-hidden="true" />
                    6 parliaments · 3 districts
                  </>
                ) : (
                  <>
                    <Landmark className="w-6 h-6 text-mlk" aria-hidden="true" />
                    28 DUN seats · PRN15 (2021)
                  </>
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {seatsView === "parliament"
                  ? "Verified against DOSM kawasanku GeoJSON (2026 redelineation)."
                  : "Melaka State Legislative Assembly composition. Real ElectionData.MY ballot counts."}
              </p>
            </div>
            <Segmented<SeatsView>
              value={seatsView}
              onChange={(v) => setSeatsView(v)}
              size="md"
              variant="mlk"
              options={[
                { value: "parliament", label: "Parliaments (6)", icon: Building2 },
                { value: "dun", label: "DUN (28)", icon: Landmark },
              ]}
            />
          </div>

          {/* DUN-only — composition strip */}
          <AnimatePresence>
            {seatsView === "dun" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-center gap-4 flex-wrap p-3 rounded-xl border border-mlk/15 bg-mlk/5">
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4 text-mlk" aria-hidden="true" />
                    <span className="text-xs font-medium text-mlk uppercase tracking-wide">Seat Composition</span>
                  </div>
                  <DunCompositionStrip />
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground ms-auto">
                    <div className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3 text-mlk" aria-hidden="true" />
                      <span className="font-mono text-mlk">{DUN_COALITION_COUNTS.swing}</span>
                      <span>swing seats</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" aria-hidden="true" />
                      <span className="font-mono text-red-500">{DUN_COALITION_COUNTS.marginal}</span>
                      <span>marginal (&lt;5pp)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                      <span className="font-mono text-emerald-500">{DUN_COALITION_COUNTS.safe}</span>
                      <span>safe (&gt;20pp)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter row — switches between parliament/dun filters */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            {seatsView === "parliament" ? (
              <>
                <ParliamentFilterTabs filter={filter} setFilter={setFilter} counts={counts} />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                  <span className="font-mono">{counts.verified}</span>
                  <span>/</span>
                  <span className="font-mono">{counts.all}</span>
                  <span>verified</span>
                </div>
              </>
            ) : (
              <>
                <DunCoalitionFilterTabs filter={dunCoalition} setFilter={setDunCoalition} />
                <DistrictFilterTabs filter={district} setFilter={setDistrict} />
              </>
            )}
          </div>

          {/* Grid — animates between parliament and DUN views */}
          <AnimatePresence mode="popLayout">
            {seatsView === "parliament" ? (
              <motion.div
                key={`parl-${filter}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {filteredParliaments.map((p, i) => (
                  <PremiumParliamentCard
                    key={p.code}
                    code={p.code}
                    name={p.name}
                    district={p.district}
                    dunCount={p.dunCount}
                    voters={p.totalVoters > 0 ? p.totalVoters : null}
                    verified={p.code === "134"}
                    delay={i * 0.05}
                    onClick={() => handleParliamentClick(p.code, p.name)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`dun-${dunCoalition}-${district}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {filteredDuns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
                    <p className="text-sm">No DUN seats match the current filters.</p>
                    <button
                      onClick={() => { setDunCoalition("all"); setDistrict("all"); }}
                      className="mt-3 text-xs text-mlk hover:underline focus-mlk rounded"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 text-xs text-muted-foreground">
                      Showing <span className="font-mono text-foreground font-semibold">{filteredDuns.length}</span> of{" "}
                      <span className="font-mono">{DUN_SUMMARY.length}</span> DUN seats
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredDuns.map((d, i) => (
                        <PremiumDunCard
                          key={d.dunCode}
                          dun={d}
                          delay={i * 0.03}
                          onClick={() => handleDunClick(d)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer — sticky to bottom */}
      <footer className="relative z-10 text-center text-xs text-muted-foreground border-t border-mlk/20 py-6 mt-auto">
        <p className="mb-1"><strong className="text-mlk">PIP-MLK</strong> · Political Intelligence Platform · Melaka</p>
        <p>Real DOSM kawasanku GeoJSON · Leaflet 2D + Three.js 3D · PDPA Akta 709 compliant</p>
      </footer>
    </div>
  );
}
