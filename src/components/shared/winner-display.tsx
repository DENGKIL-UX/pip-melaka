"use client";

import { PartyLogo } from "@/components/shared/party-logo";
import { PartyTag } from "@/components/ui/party-tag";
import { CoalitionCode, PartyCode } from "@/lib/party-metadata";
import { cn } from "@/lib/utils";

interface WinnerDisplayProps {
  /** Coalition winner (BN / PH / PN / BEBAS) */
  winner: CoalitionCode;
  /** Specific winning party (optional, e.g. "DAP", "UMNO") */
  winnerParty?: PartyCode;
  /** Candidate name (optional) */
  candidate?: string;
  /** Visual size variant */
  size?: "xs" | "sm" | "md";
  /** Show party logo next to tag */
  showLogo?: boolean;
  /** Show candidate name */
  showCandidate?: boolean;
  /** Additional className */
  className?: string;
  /** Click handler for candidate name (used in elections tab) */
  onCandidateClick?: (name: string) => void;
}

/**
 * WinnerDisplay — consistent, reusable component for showing election winners.
 *
 * Used across Elections tab and Compare/Banding tab to ensure visual consistency.
 *
 * Features:
 * - Coalition-colored PartyTag
 * - Optional PartyLogo from ElectionData.my
 * - Optional candidate name with click support
 */
export function WinnerDisplay({
  winner,
  winnerParty,
  candidate,
  size = "sm",
  showLogo = true,
  showCandidate = true,
  className,
  onCandidateClick,
}: WinnerDisplayProps) {
  const isClickable = !!candidate && !!onCandidateClick;

  return (
    <div className={cn("flex items-center gap-1.5 min-w-0", className)}>
      <PartyTag coalition={winner} size={size} />

      {showLogo && winnerParty && (
        <PartyLogo party={winnerParty} size={size === "md" ? "sm" : "xs"} />
      )}

      {showCandidate && candidate && (
        <button
          type="button"
          onClick={() => onCandidateClick?.(candidate)}
          disabled={!isClickable}
          className={cn(
            "text-[9px] text-mlk hover:underline truncate max-w-[140px] text-left focus-mlk rounded",
            !isClickable && "cursor-default hover:no-underline text-muted-foreground"
          )}
          title={candidate}
        >
          {candidate.length > 22 ? candidate.substring(0, 20) + "…" : candidate}
        </button>
      )}
    </div>
  );
}

/**
 * Compact version — used in tight table cells (e.g. compare tab)
 */
export function WinnerCompact({
  winner,
  winnerParty,
  size = "xs",
  showLogo = true,
}: Omit<WinnerDisplayProps, "candidate" | "showCandidate" | "onCandidateClick">) {
  return (
    <div className="flex items-center gap-1">
      <PartyTag coalition={winner} size={size} />
      {showLogo && winnerParty && (
        <PartyLogo party={winnerParty} size="xs" />
      )}
    </div>
  );
}
