// PIP-MLK Party metadata — maps Malaysian political parties to coalitions
// and generates ElectionData.my logo URLs.
//
// Based on the ElectionData.MY live testing (verified 2026-07-19):
//   - Party logos: https://electiondata.my/static/images/parties/{party_uid}.png
//   - Coalition logos: https://electiondata.my/static/images/coalitions/{coalition_uid}.png
//
// The /parties/{uid}/png endpoint returns HTML pages, NOT images.
// The actual image assets live at /static/images/parties/{uid}.png and
// /static/images/coalitions/{uid}.png respectively.
//
// Verified party UIDs (from MECo dataset):
//   UMNO = 001-UMNO, MCA = 003-MCA, MIC = 002-MIC,
//   DAP = 021-DAP, PKR = 078-PKR, AMANAH = 046-AMANAH,
//   PAS = 004-PAS, BERSATU = 107-BERSATU, GERAKAN = 026-GERAKAN,
//   BEBAS = 000-BEBAS (independent)
//
// Coalition UIDs (string format, NOT integers):
//   BN = 001-BN, PH = 007-PH, PN = 011-PN

export type CoalitionCode = "BN" | "PH" | "PN" | "BEBAS";
export type PartyCode =
  | "UMNO" | "MCA" | "MIC"
  | "DAP" | "PKR" | "AMANAH"
  | "PAS" | "BERSATU" | "GERAKAN"
  | "BEBAS";

export interface PartyMeta {
  code: PartyCode;
  name: string;
  fullName: string;
  coalition: CoalitionCode;
  uid: string; // ElectionData.my party_uid
  color: string; // party-specific hex
  formed?: number;
}

export interface CoalitionMeta {
  code: CoalitionCode;
  name: string;
  fullName: string;
  uid: string; // ElectionData.my coalition_uid (integer as string)
  color: string;
  memberParties: PartyCode[];
}

// ---------------------------------------------------------------------------
// Coalition metadata
// ---------------------------------------------------------------------------

export const COALITIONS: Record<CoalitionCode, CoalitionMeta> = {
  BN: {
    code: "BN",
    name: "BN",
    fullName: "Barisan Nasional",
    uid: "001-BN",
    color: "#0B3D91",  // Dark blue (BN official dacing blue)
    memberParties: ["UMNO", "MCA", "MIC"],
  },
  PH: {
    code: "PH",
    name: "PH",
    fullName: "Pakatan Harapan",
    uid: "007-PH",
    color: "#E22926",
    memberParties: ["DAP", "PKR", "AMANAH"],
  },
  PN: {
    code: "PN",
    name: "PN",
    fullName: "Perikatan Nasional",
    uid: "011-PN",
    color: "#019C2D",
    memberParties: ["PAS", "BERSATU", "GERAKAN"],
  },
  BEBAS: {
    code: "BEBAS",
    name: "BEBAS",
    fullName: "Independent",
    uid: "000-BEBAS",
    color: "#6B7280",
    memberParties: ["BEBAS"],
  },
};

// ---------------------------------------------------------------------------
// Party metadata
// ---------------------------------------------------------------------------

export const PARTIES: Record<PartyCode, PartyMeta> = {
  // BN component parties
  UMNO: {
    code: "UMNO",
    name: "UMNO",
    fullName: "United Malays National Organisation",
    coalition: "BN",
    uid: "001-UMNO",
    color: "#0B3D91",  // Dark blue (BN family)
    formed: 1946,
  },
  MCA: {
    code: "MCA",
    name: "MCA",
    fullName: "Malaysian Chinese Association",
    coalition: "BN",
    uid: "003-MCA",
    color: "#0B3D91",  // Dark blue (BN family)
    formed: 1949,
  },
  MIC: {
    code: "MIC",
    name: "MIC",
    fullName: "Malaysian Indian Congress",
    coalition: "BN",
    uid: "002-MIC",
    color: "#0B3D91",  // Dark blue (BN family)
    formed: 1946,
  },
  // PH component parties
  DAP: {
    code: "DAP",
    name: "DAP",
    fullName: "Democratic Action Party",
    coalition: "PH",
    uid: "021-DAP",
    color: "#C81E1E",
    formed: 1966,
  },
  PKR: {
    code: "PKR",
    name: "PKR",
    fullName: "People's Justice Party",
    coalition: "PH",
    uid: "078-PKR",
    color: "#1E88E5",
    formed: 1999,
  },
  AMANAH: {
    code: "AMANAH",
    name: "AMANAH",
    fullName: "National Trust Party",
    coalition: "PH",
    uid: "046-AMANAH",
    color: "#E53935",
    formed: 2015,
  },
  // PN component parties
  PAS: {
    code: "PAS",
    name: "PAS",
    fullName: "Malaysian Islamic Party",
    coalition: "PN",
    uid: "004-PAS",
    color: "#15803D",
    formed: 1951,
  },
  BERSATU: {
    code: "BERSATU",
    name: "BERSATU",
    fullName: "Malaysian United Indigenous Party",
    coalition: "PN",
    uid: "107-BERSATU",
    color: "#16A34A",
    formed: 2016,
  },
  GERAKAN: {
    code: "GERAKAN",
    name: "GERAKAN",
    fullName: "Malaysian People's Movement Party",
    coalition: "PN",
    uid: "026-GERAKAN",
    color: "#15803D",
    formed: 1968,
  },
  // Independent
  BEBAS: {
    code: "BEBAS",
    name: "BEBAS",
    fullName: "Independent",
    coalition: "BEBAS",
    uid: "000-BEBAS",
    color: "#6B7280",
  },
};

// ---------------------------------------------------------------------------
// Logo URL generators (ElectionData.my — verified working 2026-07-19)
// ---------------------------------------------------------------------------

const EDM_PARTY_LOGO_BASE = "https://electiondata.my/static/images/parties";
const EDM_COALITION_LOGO_BASE = "https://electiondata.my/static/images/coalitions";

/** Generate the ElectionData.my logo URL for a party. */
export function partyLogoUrl(party: PartyCode): string {
  const meta = PARTIES[party];
  if (!meta) return "";
  return `${EDM_PARTY_LOGO_BASE}/${meta.uid}.png`;
}

/** Generate the ElectionData.my logo URL for a coalition. */
export function coalitionLogoUrl(coalition: CoalitionCode): string {
  const meta = COALITIONS[coalition];
  if (!meta) return "";
  return `${EDM_COALITION_LOGO_BASE}/${meta.uid}.png`;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** Get the coalition a party belongs to. */
export function partyToCoalition(party: PartyCode): CoalitionCode {
  return PARTIES[party]?.coalition ?? "BEBAS";
}

/** Get the coalition color for a party (falls back to party color). */
export function partyColor(party: PartyCode): string {
  return PARTIES[party]?.color ?? "#6B7280";
}

/** Get the coalition color. */
export function coalitionColor(coalition: CoalitionCode): string {
  return COALITIONS[coalition]?.color ?? "#6B7280";
}

/** Get all parties in a coalition. */
export function partiesInCoalition(coalition: CoalitionCode): PartyCode[] {
  return COALITIONS[coalition]?.memberParties ?? [];
}

/**
 * NOTE: seatToParty() has been removed. Party assignments now come directly
 * from the real ElectionData.MY dataset (headline_ballots_state_mlk.parquet
 * and headline_ballots.parquet) which includes the actual winning party
 * for every seat. See public/data/elections/melaka-elections.json for the
 * real per-seat party data.
 */
