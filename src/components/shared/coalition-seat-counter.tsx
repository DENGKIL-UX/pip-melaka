"use client";

// ponytail: MLK — Animated coalition seat counter.
// New feature (round 2): shows PRN15 2021 seat counts (BN 21 / PH 5 / PN 2)
// as animated horizontal bars in the dashboard header. Visualizes Melaka's
// "BN landslide" headline fact at a glance.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PARTY_COLORS } from "@/lib/party-colors";

interface SeatCount {
  party: "BN" | "PH" | "PN";
  count: number;
  color: string;
  label: string;
}

const PRN15_SEATS: SeatCount[] = [
  { party: "BN", count: 21, color: PARTY_COLORS.BN, label: "Barisan Nasional" },
  { party: "PH", count: 5, color: PARTY_COLORS.PH, label: "Pakatan Harapan" },
  { party: "PN", count: 2, color: PARTY_COLORS.PN, label: "Perikatan Nasional" },
];

const TOTAL_SEATS = 28;

export function CoalitionSeatCounter({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex items-center gap-1.5 ${className ?? ""}`} aria-label="PRN15 2021 coalition seat counts: BN 21, PH 5, PN 2 out of 28">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide hidden lg:inline">PRN15</span>
        <div className="flex h-5 w-32 sm:w-40 rounded-full overflow-hidden border border-border" role="img" aria-label="PRN15 seat distribution bar">
          {PRN15_SEATS.map((s, i) => {
            const widthPct = (s.count / TOTAL_SEATS) * 100;
            return (
              <Tooltip key={s.party}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="flex items-center justify-center text-[9px] font-bold text-white cursor-help overflow-hidden"
                    style={{ backgroundColor: s.color }}
                    initial={mounted ? { width: 0 } : { width: `${widthPct}%` }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                  >
                    {widthPct > 12 && s.count}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="font-semibold" style={{ color: s.color }}>{s.party} · {s.label}</div>
                  <div>{s.count} / {TOTAL_SEATS} seats ({widthPct.toFixed(1)}%)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">PRN15 2021 state election</div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">/ {TOTAL_SEATS}</span>
      </div>
    </TooltipProvider>
  );
}
