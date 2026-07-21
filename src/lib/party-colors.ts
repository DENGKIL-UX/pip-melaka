// ponytail: MLK — Coalition / party colors.

export const PARTY_COLORS = {
  BN: "#0B3D91",  // Dark blue (BN official dacing blue)
  PH: "#E22926",
  PN: "#019C2D",
  OTH: "#6B7280",
} as const;

export const MLK_ACCENT = "#C77B2C";

export function partyColor(party: string | undefined | null): string {
  if (!party) return PARTY_COLORS.OTH;
  const p = party.toUpperCase();
  if (p.includes("BN") || p.includes("UMNO")) return PARTY_COLORS.BN;
  if (p.includes("PH") || p.includes("PKR") || p.includes("DAP")) return PARTY_COLORS.PH;
  if (p.includes("PN") || p.includes("BERSATU") || p.includes("PAS")) return PARTY_COLORS.PN;
  return PARTY_COLORS.OTH;
}
