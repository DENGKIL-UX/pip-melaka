"use client";

/**
 * CandidateHistoryDialog — shows full election history for a candidate.
 *
 * Uses the ElectionData.MY REST API (via /api/electiondata proxy) to fetch
 * a candidate's complete election history. Highlights party switches
 * (e.g., Mas Ermieyati: UMNO/BN → BERSATU/PN between GE14 and GE15).
 *
 * Data source: public/data/elections/candidate-histories.json (pre-fetched
 * at build time) + live API fallback for candidates not in the pre-fetched set.
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trophy, X, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from "lucide-react";
import { PARTY_COLORS } from "@/lib/party-colors";
import { PartyLogo } from "@/components/shared/party-logo";
import { type PartyCode, type CoalitionCode, PARTIES, COALITIONS } from "@/lib/party-metadata";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  name: string;
  election_name: string;
  type: string;
  date: string;
  seat: string;
  state: string;
  party: string;
  party_uid: string;
  coalition: string;
  coalition_uid: string;
  votes: number;
  votes_perc: number;
  result: string;
}

interface CandidateHistoryProps {
  candidateName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function partyHex(p: string) { return PARTY_COLORS[p as keyof typeof PARTY_COLORS] ?? PARTY_COLORS.OTH; }

function ResultIcon({ result }: { result: string }) {
  if (result.startsWith("won")) return <Trophy className="h-3.5 w-3.5 text-emerald-500" aria-label="Won" />;
  if (result === "lost") return <X className="h-3.5 w-3.5 text-red-500" aria-label="Lost" />;
  if (result === "lost_deposit") return <TrendingDown className="h-3.5 w-3.5 text-amber-500" aria-label="Lost deposit" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function CandidateHistoryDialog({ candidateName, open, onOpenChange }: CandidateHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateName || !open) return;

    let cancelled = false;
    // Defer setState to rAF to comply with react-hooks/set-state-in-effect
    const raf = requestAnimationFrame(() => {
      setLoading(true);
      setError(null);
      setHistory(null);
    });

    (async () => {
      try {
        // First try the pre-fetched candidate-histories.json
        const preFetched = await fetch("/data/elections/candidate-histories.json");
        if (preFetched.ok) {
          const data = await preFetched.json();
          const candidate = data.candidates?.[candidateName];
          if (candidate?.uid && !cancelled) {
            // We have the UID — fetch live from the API proxy for fresh data
            const apiRes = await fetch(`/api/electiondata?endpoint=candidates&uid=${candidate.uid}`);
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              const results = (apiData.results ?? []).filter((r: HistoryEntry) => r.state === "Melaka");
              if (!cancelled) {
                setHistory(results);
                setLoading(false);
                return;
              }
            }
          }
          // Fallback to pre-fetched history
          if (candidate?.history && !cancelled) {
            setHistory(candidate.history);
            setLoading(false);
            return;
          }
        }

        // If not in pre-fetched, try searching candidates/dropdown
        if (!cancelled) {
          setError("Candidate not found in pre-fetched data. Use the Elections tab to view verified winners.");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load candidate history. The dev server may have restarted.");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [candidateName, open]);

  // Detect party switches
  const partySwitches = (() => {
    if (!history || history.length < 2) return [];
    const switches: Array<{ from: string; to: string; election: string }> = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      if (prev.party !== curr.party) {
        switches.push({ from: prev.party, to: curr.party, election: curr.election_name });
      }
    }
    return switches;
  })();

  const wins = history?.filter((h) => h.result.startsWith("won")).length ?? 0;
  const losses = history?.filter((h) => h.result === "lost").length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-mlk">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-mlk" />
            {candidateName ?? "Candidate"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Full election history from ElectionData.MY REST API · Melaka contests only
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin me-2" />
            Loading candidate history…
          </div>
        )}

        {error && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
            {error}
          </div>
        )}

        {history && history.length > 0 && (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{wins}</div>
                <div className="text-[10px] text-muted-foreground">Won</div>
              </div>
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{losses}</div>
                <div className="text-[10px] text-muted-foreground">Lost</div>
              </div>
              <div className="rounded-md border border-mlk/30 bg-mlk/5 p-2 text-center">
                <div className="text-lg font-bold text-mlk">{history.length}</div>
                <div className="text-[10px] text-muted-foreground">Total contests</div>
              </div>
            </div>

            {/* Party switch alert */}
            {partySwitches.length > 0 && (
              <div className="rounded-md border border-mlk/40 bg-mlk/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-3.5 w-3.5 text-mlk" />
                  <span className="text-xs font-semibold text-mlk">Party switch detected</span>
                </div>
                {partySwitches.map((s, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground">
                    {s.from} → <span className="text-mlk font-medium">{s.to}</span> ({s.election})
                  </div>
                ))}
              </div>
            )}

            {/* History timeline */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Election history (Melaka)</div>
              {history.map((h, i) => {
                const prevParty = i > 0 ? history[i - 1].party : null;
                const partyChanged = prevParty !== null && prevParty !== h.party;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2.5 text-xs",
                      partyChanged ? "border-mlk/30 bg-mlk/5" : "border-border/40"
                    )}
                  >
                    <ResultIcon result={h.result} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{h.election_name}</span>
                        <span className="text-[10px] text-muted-foreground">· {h.date}</span>
                      </div>
                      <div className="font-medium truncate">{h.seat}</div>
                      {partyChanged && (
                        <div className="text-[9px] text-mlk font-medium mt-0.5">
                          ← switched from {prevParty}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PartyLogo party={h.party as PartyCode} size="xs" />
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                        style={{ backgroundColor: partyHex(h.coalition) }}
                      >
                        {h.coalition}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs font-bold">{h.votes_perc.toFixed(1)}%</div>
                      <div className="text-[9px] text-muted-foreground">{h.votes.toLocaleString()} votes</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Source attribution */}
            <div className="text-[9px] text-muted-foreground italic flex items-center gap-1">
              <ExternalLink className="h-2.5 w-2.5" />
              Source: api.electiondata.my/v1/candidates · ElectionData.MY · CC0 1.0
            </div>
          </div>
        )}

        {history && history.length === 0 && !loading && !error && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No Melaka election history found for this candidate.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
