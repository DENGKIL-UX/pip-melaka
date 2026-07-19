"use client";

/**
 * PartyLogo — renders a party or coalition logo from ElectionData.my
 * with a graceful fallback to a coloured badge if the image fails to load.
 *
 * Per the ElectionData.MY reconnaissance, the /parties/{uid}/png endpoints
 * may serve HTML pages rather than raw PNG bytes. This component handles
 * that scenario by falling back to a coloured pill with the party/coalition
 * abbreviation.
 *
 * Usage:
 *   <PartyLogo party="DAP" size="sm" />
 *   <PartyLogo coalition="PH" size="md" showLabel />
 */

import { useState } from "react";
import { PARTIES, COALITIONS, partyLogoUrl, coalitionLogoUrl, type PartyCode, type CoalitionCode } from "@/lib/party-metadata";
import { cn } from "@/lib/utils";

interface PartyLogoProps {
  party?: PartyCode;
  coalition?: CoalitionCode;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { img: "h-5 w-5", badge: "h-5 px-1 text-[8px]", icon: "h-3 w-3" },
  sm: { img: "h-7 w-7", badge: "h-7 px-1.5 text-[9px]", icon: "h-3.5 w-3.5" },
  md: { img: "h-10 w-10", badge: "h-10 px-2 text-[10px]", icon: "h-5 w-5" },
  lg: { img: "h-14 w-14", badge: "h-14 px-3 text-xs", icon: "h-7 w-7" },
};

export function PartyLogo({
  party,
  coalition,
  size = "sm",
  showLabel = false,
  className,
}: PartyLogoProps) {
  const [imgError, setImgError] = useState(false);

  // Determine the entity (party takes precedence over coalition)
  const isParty = !!party;
  const meta = isParty ? PARTIES[party!] : COALITIONS[coalition!];
  const logoUrl = isParty ? partyLogoUrl(party!) : coalitionLogoUrl(coalition!);

  if (!meta) {
    return (
      <span className={cn("inline-flex items-center justify-center rounded bg-muted text-muted-foreground", SIZE_MAP[size].badge, className)}>
        ?
      </span>
    );
  }

  const dims = SIZE_MAP[size];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {imgError ? (
        // Fallback: coloured badge with abbreviation
        <span
          className={cn("inline-flex items-center justify-center rounded font-bold text-white", dims.badge)}
          style={{ backgroundColor: meta.color }}
          title={meta.fullName}
        >
          {meta.name}
        </span>
      ) : (
        <img
          src={logoUrl}
          alt={`${meta.name} logo`}
          className={cn("rounded object-contain border border-border/40 bg-white/80", dims.img)}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {meta.name}
          <span className="text-muted-foreground ms-1 text-[10px]">({meta.fullName})</span>
        </span>
      )}
    </span>
  );
}

/**
 * CoalitionBadge — small pill showing coalition code with colour.
 * Kept for backward compatibility with existing coalition-only displays.
 */
export function CoalitionBadge({
  coalition,
  size = "sm",
  showLogo = false,
}: {
  coalition: CoalitionCode;
  size?: "xs" | "sm" | "md";
  showLogo?: boolean;
}) {
  const meta = COALITIONS[coalition];
  if (!meta) return null;

  const dims = SIZE_MAP[size];

  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full font-bold text-white", dims.badge)}
      style={{ backgroundColor: meta.color }}
      title={meta.fullName}
    >
      {showLogo && <PartyLogo coalition={coalition} size="xs" />}
      {meta.name}
    </span>
  );
}
