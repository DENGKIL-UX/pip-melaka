"use client";

// ponytail: MLK — DUN of the Day widget.
// New feature (round 6): highlights a deterministic DUN each day based on the
// current date. Shows key stats (voters, senior dependency, gender balance,
// GE15 winner) + a "Open drawer" CTA. Deterministic = same DUN shown all day,
// rotates through all 28 DUNs over 28 days.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Heart, Scale, Vote, ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { PARLIAMENTS } from "@/lib/melaka-constants";
import { PARTY_COLORS } from "@/lib/party-colors";
import { useDashboardStore } from "@/stores/dashboard-store";

interface DunAggregate {
  geography: {
    parliament_code?: string;
    dun_code?: string;
    dun_name?: string;
  };
  metrics: {
    total_voters: number;
    senior_dependency_percent: number;
    gender_balance_score: number;
    profile_completeness_score: number;
    dominant_ethnicity_group: string;
  };
}

interface ElectionResult {
  parliament_code: string;
  dun_code?: string;
  winner: string;
  votes_pct?: number;
}

interface DunOfTheDay {
  parliament: string;
  dunCode: string;
  dunName: string;
  totalVoters: number;
  seniorDependency: number;
  genderBalance: number;
  completeness: number;
  dominantEthnicity: string;
  ge15Winner?: string;
  ge14Winner?: string;
}

// Deterministic DUN picker: day-of-year mod 28 picks an index into the
// sorted list of all 28 DUNs (sorted by parliament code then DUN code).
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function DunOfTheDay() {
  const [dun, setDun] = useState<DunOfTheDay | null>(null);
  const [loading, setLoading] = useState(true);
  const { setSelectedParliament, setSelectedDun, setActiveTab } = useDashboardStore();

  useEffect(() => {
    (async () => {
      try {
        // Collect all 28 DUNs across 6 parliaments.
        const allDuns: DunAggregate[] = [];
        for (const p of PARLIAMENTS) {
          try {
            const res = await fetch(`/data/p${p.code}/dun-intelligence.jsonl`);
            if (!res.ok) continue;
            const text = await res.text();
            const lines = text.split("\n").filter((l) => l.trim());
            for (const line of lines) {
              allDuns.push(JSON.parse(line) as DunAggregate);
            }
          } catch {
            // skip this parliament
          }
        }

        // Sort for deterministic ordering.
        allDuns.sort((a, b) => {
          const pa = a.geography?.parliament_code ?? "";
          const pb = b.geography?.parliament_code ?? "";
          if (pa !== pb) return pa.localeCompare(pb);
          return (a.geography?.dun_code ?? "").localeCompare(b.geography?.dun_code ?? "");
        });

        if (allDuns.length === 0) {
          setLoading(false);
          return;
        }

        // Pick today's DUN.
        const today = new Date();
        const idx = dayOfYear(today) % allDuns.length;
        const picked = allDuns[idx];

        // Fetch election winners for this DUN.
        let ge15Winner: string | undefined;
        let ge14Winner: string | undefined;
        try {
          const elRes = await fetch("/data/elections/melaka-elections.json");
          if (elRes.ok) {
            const el = await elRes.json();
            const parlCode = picked.geography?.parliament_code ?? "";
            const dunCode = picked.geography?.dun_code ?? "";
            for (const e of el.elections ?? []) {
              const dunResults = e.dun_results ?? [];
              const match = dunResults.find(
                (r: ElectionResult) =>
                  r.parliament_code === parlCode && r.dun_code === dunCode
              );
              if (match) {
                if (e.id === "GE15") ge15Winner = match.winner;
                if (e.id === "GE14") ge14Winner = match.winner;
              }
            }
          }
        } catch {
          // skip elections
        }

        setDun({
          parliament: picked.geography?.parliament_code ?? "",
          dunCode: picked.geography?.dun_code ?? "",
          dunName: picked.geography?.dun_name ?? "",
          totalVoters: picked.metrics.total_voters,
          seniorDependency: picked.metrics.senior_dependency_percent,
          genderBalance: picked.metrics.gender_balance_score,
          completeness: picked.metrics.profile_completeness_score,
          dominantEthnicity: picked.metrics.dominant_ethnicity_group,
          ge15Winner,
          ge14Winner,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDrawer = () => {
    if (!dun) return;
    setSelectedParliament(dun.parliament);
    setSelectedDun({ parliament: dun.parliament, dun: dun.dunCode, name: dun.dunName });
    setActiveTab("demographics");
  };

  if (loading) {
    return (
      <Card className="border-mlk/20 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-mlk-gradient" aria-hidden="true" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mlk" aria-hidden="true" />
            DUN of the Day
            <Badge variant="outline" className="text-[10px] ml-auto font-mono">
              <Calendar className="h-3 w-3 me-1" aria-hidden="true" />
              Loading…
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-32 animate-pulse rounded-md bg-muted/40" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  if (!dun) return null;

  const todayStr = new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-mlk/30 overflow-hidden relative">
        {/* Gradient banner strip */}
        <div className="absolute inset-x-0 top-0 h-1 bg-mlk-gradient" aria-hidden="true" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mlk" aria-hidden="true" />
            DUN of the Day
            <Badge variant="outline" className="text-[10px] ml-auto font-mono">
              <Calendar className="h-3 w-3 me-1" aria-hidden="true" />
              {todayStr}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* DUN identity */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-mlk text-lg font-bold">N{dun.dunCode}</span>
                <span className="font-semibold text-base">{dun.dunName}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Parliament P{dun.parliament} · {PARLIAMENTS.find((p) => p.code === dun.parliament)?.name ?? ""}
              </div>
            </div>
            {dun.ge15Winner && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono"
                style={{
                  color: PARTY_COLORS[dun.ge15Winner as keyof typeof PARTY_COLORS] ?? "#6B7280",
                  borderColor: "currentColor",
                }}
              >
                GE15: {dun.ge15Winner}
              </Badge>
            )}
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-mlk/15 p-2.5 bg-mlk/5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                <Users className="h-3 w-3" aria-hidden="true" /> Voters
              </div>
              <div className="text-lg font-bold text-mlk font-mono">
                {dun.totalVoters.toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-mlk/15 p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                <Heart className="h-3 w-3" aria-hidden="true" /> Senior dep
              </div>
              <div className={`text-lg font-bold font-mono ${
                dun.seniorDependency >= 30
                  ? "text-red-600 dark:text-red-400"
                  : dun.seniorDependency >= 25
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {dun.seniorDependency.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-md border border-mlk/15 p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                <Scale className="h-3 w-3" aria-hidden="true" /> Gender bal
              </div>
              <div className={`text-lg font-bold font-mono ${
                dun.genderBalance < 90
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {dun.genderBalance.toFixed(1)}
              </div>
            </div>
            <div className="rounded-md border border-mlk/15 p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                <Vote className="h-3 w-3" aria-hidden="true" /> Ethnicity
              </div>
              <div className="text-sm font-bold truncate">
                {dun.dominantEthnicity}
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-mlk border-mlk/40 hover:bg-mlk/10"
            onClick={openDrawer}
            aria-label={`Open drawer for N${dun.dunCode} ${dun.dunName}`}
          >
            Open DUN drawer <ArrowRight className="h-3 w-3 ms-1" aria-hidden="true" />
          </Button>

          <div className="text-[10px] text-muted-foreground/70 text-center">
            Rotates daily · {dayOfYear(new Date()) % 28 + 1} of 28 DUNs
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
