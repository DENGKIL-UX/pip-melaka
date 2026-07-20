// PIP-MLK — DUN summary dataset (28 seats).
//
// Sources (all real, verified 2026-07-19):
//   • DOSM kawasanku GeoJSON — DUN names + parliament assignments + districts
//   • ElectionData.MY data lake (lake.electiondata.my) — PRN15 (2021-11-20) and
//     GE14 (2018-05-09) DUN ballot results.
//
// PRN15 is the most recent Melaka state election (next: PRN16, expected by 2026).
// GE15 (2022) was a federal-only election for Melaka — no DUN ballots cast,
// so the current DUN composition reflects PRN15 results.
//
// All vote shares are decimal (0.51 = 51%). Margins are percentage points.

import type { CoalitionCode, PartyCode } from "@/lib/party-metadata";

export interface DunElectionResult {
  coalition: CoalitionCode;
  party: PartyCode;
  candidate: string;
  votes: number;
  votesPct: number;      // winner's vote share %
  marginPct: number;     // winner % minus runner-up %
  runnerUpCoalition: CoalitionCode;
  runnerUpParty: PartyCode;
}

export interface DunSummary {
  dunCode: string;            // "01" .. "28"
  dunCodeLabel: string;       // "N01" .. "N28"
  dunName: string;            // "Kuala Linggi"
  parliamentCode: string;    // "134"
  parliamentName: string;     // "Masjid Tanah"
  district: string;           // "Alor Gajah" | "Melaka Tengah" | "Jasin"
  prn15: DunElectionResult;   // 2021 state election (most recent DUN)
  ge14: DunElectionResult;    // 2018 state election (synchronised)
  swing: boolean;             // winner changed between GE14 → PRN15
  swingDirection: `${CoalitionCode}→${CoalitionCode}` | null;
  incumbentCandidate: string; // PRN15 winner (current assemblyperson)
  isMarginal: boolean;        // margin < 5pp
  isSafe: boolean;            // margin > 20pp
}

export const DUN_SUMMARY: DunSummary[] = [
  // ── P134 Masjid Tanah (Alor Gajah) — 5 DUN ──────────────────────────────
  {
    dunCode: "01", dunCodeLabel: "N01", dunName: "Kuala Linggi",
    parliamentCode: "134", parliamentName: "Masjid Tanah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Rosli bin Abdullah", votes: 3554, votesPct: 51.0, marginPct: 26.3, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Ismail bin Othman",  votes: 4812, votesPct: 52.3, marginPct: 14.9, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Rosli bin Abdullah",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "02", dunCodeLabel: "N02", dunName: "Tanjung Bidara",
    parliamentCode: "134", parliamentName: "Masjid Tanah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Ab Rauf bin Yusoh", votes: 3559, votesPct: 49.1, marginPct: 5.0, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Md Rawi bin Mahmud",  votes: 4865, votesPct: 58.1, marginPct: 34.2, runnerUpCoalition: "PH", runnerUpParty: "BERSATU" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Ab Rauf bin Yusoh",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "03", dunCodeLabel: "N03", dunName: "Ayer Limau",
    parliamentCode: "134", parliamentName: "Masjid Tanah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Hameed bin Mytheen Kunju Basheer", votes: 3838, votesPct: 51.9, marginPct: 14.7, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Amirudin Yusof",                   votes: 4704, votesPct: 51.6, marginPct: 16.2, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Hameed bin Mytheen Kunju Basheer",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "04", dunCodeLabel: "N04", dunName: "Lendu",
    parliamentCode: "134", parliamentName: "Masjid Tanah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Sulaiman bin Md Ali", votes: 4486, votesPct: 63.9, marginPct: 44.2, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Sulaiman bin Md Ali", votes: 4016, votesPct: 46.9, marginPct:  7.3, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Sulaiman bin Md Ali",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "05", dunCodeLabel: "N05", dunName: "Taboh Naning",
    parliamentCode: "134", parliamentName: "Masjid Tanah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Zulkiflee bin Mohd Zin", votes: 3170, votesPct: 57.2, marginPct: 32.9, runnerUpCoalition: "PN", runnerUpParty: "PAS" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Latipah binti Omar",    votes: 3329, votesPct: 47.4, marginPct: 10.5, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Zulkiflee bin Mohd Zin",
    isMarginal: false, isSafe: true,
  },

  // ── P135 Alor Gajah (Alor Gajah) — 5 DUN ────────────────────────────────
  {
    dunCode: "06", dunCodeLabel: "N06", dunName: "Rembia",
    parliamentCode: "135", parliamentName: "Alor Gajah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Muhammad Jailani bin Khamis", votes: 4224, votesPct: 41.6, marginPct: 8.5, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    ge14:  { coalition: "PH", party: "PKR", candidate: "Muhammad Jailani bin Khamis", votes: 6773, votesPct: 52.4, marginPct: 14.0, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Muhammad Jailani bin Khamis",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "07", dunCodeLabel: "N07", dunName: "Gadek",
    parliamentCode: "135", parliamentName: "Alor Gajah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "MIC",  candidate: "Shanmugam a/l V.Pitchay", votes: 3022, votesPct: 39.4, marginPct: 7.3, runnerUpCoalition: "PH", runnerUpParty: "DAP" },
    ge14:  { coalition: "PH", party: "DAP",  candidate: "Saminathan a/l Ganesan", votes: 4392, votesPct: 42.5, marginPct:  3.0, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Shanmugam a/l V.Pitchay",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "08", dunCodeLabel: "N08", dunName: "Machap Jaya",
    parliamentCode: "135", parliamentName: "Alor Gajah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "MCA",  candidate: "Ngwe Hee Sem",         votes: 3732, votesPct: 46.7, marginPct: 11.7, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    ge14:  { coalition: "PH", party: "PKR",  candidate: "Ginie Lim Siew Lin",  votes: 5550, votesPct: 52.7, marginPct: 12.7, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Ngwe Hee Sem",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "09", dunCodeLabel: "N09", dunName: "Durian Tunggal",
    parliamentCode: "135", parliamentName: "Alor Gajah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO",   candidate: "Zahari bin Abd Kalil",        votes: 3663, votesPct: 40.6, marginPct: 6.2, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    ge14:  { coalition: "PH", party: "AMANAH", candidate: "Mohd Sofi bin Abdul Wahab",   votes: 5213, votesPct: 47.2, marginPct: 6.9, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Zahari bin Abd Kalil",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "10", dunCodeLabel: "N10", dunName: "Asahan",
    parliamentCode: "135", parliamentName: "Alor Gajah", district: "Alor Gajah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Fairul Nizam bin Roslan", votes: 5659, votesPct: 56.8, marginPct: 30.0, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Abdul Ghafar bin Atan",   votes: 5942, votesPct: 45.8, marginPct:  2.1, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Fairul Nizam bin Roslan",
    isMarginal: false, isSafe: true,
  },

  // ── P136 Tangga Batu (Melaka Tengah) — 4 DUN ────────────────────────────
  {
    dunCode: "11", dunCodeLabel: "N11", dunName: "Sungai Udang",
    parliamentCode: "136", parliamentName: "Tangga Batu", district: "Melaka Tengah",
    prn15: { coalition: "PN", party: "BERSATU", candidate: "Mohd Aleef bin Yusof",     votes: 6789, votesPct: 43.6, marginPct: 3.4, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    ge14:  { coalition: "BN", party: "UMNO",    candidate: "Idris bin Haron",          votes: 10073, votesPct: 56.2, marginPct: 12.4, runnerUpCoalition: "PH", runnerUpParty: "BERSATU" },
    swing: true, swingDirection: "BN→PN",
    incumbentCandidate: "Mohd Aleef bin Yusof",
    isMarginal: true, isSafe: false,
  },
  {
    dunCode: "12", dunCodeLabel: "N12", dunName: "Pantai Kundor",
    parliamentCode: "136", parliamentName: "Tangga Batu", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Tuminah binti Kadi",         votes: 3960, votesPct: 40.0, marginPct: 8.4, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Nor Azman bin Hassan",       votes: 5773, votesPct: 45.4, marginPct: 6.1, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Tuminah binti Kadi",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "13", dunCodeLabel: "N13", dunName: "Paya Rumput",
    parliamentCode: "136", parliamentName: "Tangga Batu", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "UMNO",    candidate: "Rais bin Yasin",                votes: 6830, votesPct: 39.7, marginPct: 3.7, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    ge14:  { coalition: "PH", party: "BERSATU", candidate: "Mohd Rafiq bin Naizamohideen",  votes: 12102, votesPct: 56.3, marginPct: 19.8, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Rais bin Yasin",
    isMarginal: true, isSafe: false,
  },
  {
    dunCode: "14", dunCodeLabel: "N14", dunName: "Kelebang",
    parliamentCode: "136", parliamentName: "Tangga Batu", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "MCA", candidate: "Lim Ban Hong", votes: 5028, votesPct: 38.5, marginPct: 6.7, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    ge14:  { coalition: "PH", party: "PKR", candidate: "Gue Teck",    votes: 7648, votesPct: 45.6, marginPct: 4.7, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Lim Ban Hong",
    isMarginal: false, isSafe: false,
  },

  // ── P137 Hang Tuah Jaya (Melaka Tengah) — 4 DUN ────────────────────────
  {
    dunCode: "15", dunCodeLabel: "N15", dunName: "Pengkalan Batu",
    parliamentCode: "137", parliamentName: "Hang Tuah Jaya", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Kalsom binti Noordin",       votes: 4839, votesPct: 35.8, marginPct: 1.0, runnerUpCoalition: "PH", runnerUpParty: "DAP" },
    ge14:  { coalition: "PH", party: "DAP",  candidate: "Norhizam bin Hassan Baktee", votes: 9227, votesPct: 51.5, marginPct: 15.4, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Kalsom binti Noordin",
    isMarginal: true, isSafe: false,
  },
  {
    dunCode: "16", dunCodeLabel: "N16", dunName: "Ayer Keroh",
    parliamentCode: "137", parliamentName: "Hang Tuah Jaya", district: "Melaka Tengah",
    prn15: { coalition: "PH", party: "DAP", candidate: "Kerk Chee Yee", votes: 9459, votesPct: 60.0, marginPct: 35.7, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    ge14:  { coalition: "PH", party: "DAP", candidate: "Kerk Chee Yee", votes: 14279, votesPct: 65.3, marginPct: 42.4, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Kerk Chee Yee",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "17", dunCodeLabel: "N17", dunName: "Bukit Katil",
    parliamentCode: "137", parliamentName: "Hang Tuah Jaya", district: "Melaka Tengah",
    prn15: { coalition: "PH", party: "AMANAH", candidate: "Adly bin Zahari",         votes: 6805, votesPct: 41.6, marginPct: 6.5, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    ge14:  { coalition: "PH", party: "AMANAH", candidate: "Adly bin Zahari",         votes: 11226, votesPct: 52.1, marginPct: 14.7, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Adly bin Zahari",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "18", dunCodeLabel: "N18", dunName: "Ayer Molek",
    parliamentCode: "137", parliamentName: "Hang Tuah Jaya", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Rahmad bin Mariman",    votes: 6348, votesPct: 51.1, marginPct: 22.5, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Rahmad bin Mariman",    votes: 6951, votesPct: 45.6, marginPct: 11.7, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Rahmad bin Mariman",
    isMarginal: false, isSafe: true,
  },

  // ── P138 Kota Melaka (Melaka Tengah) — 5 DUN ───────────────────────────
  {
    dunCode: "19", dunCodeLabel: "N19", dunName: "Kesidang",
    parliamentCode: "138", parliamentName: "Kota Melaka", district: "Melaka Tengah",
    prn15: { coalition: "PH", party: "DAP", candidate: "Seah Shoo Chin (Allex Seah)", votes: 14769, votesPct: 65.9, marginPct: 45.6, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    ge14:  { coalition: "PH", party: "DAP", candidate: "Seah Shoo Chin (Allex Seah)", votes: 22880, votesPct: 72.6, marginPct: 46.4, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Seah Shoo Chin (Allex Seah)",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "20", dunCodeLabel: "N20", dunName: "Kota Laksamana",
    parliamentCode: "138", parliamentName: "Kota Melaka", district: "Melaka Tengah",
    prn15: { coalition: "PH", party: "DAP", candidate: "Low Chee Leong", votes: 13508, votesPct: 80.8, marginPct: 68.8, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    ge14:  { coalition: "PH", party: "DAP", candidate: "Low Chee Leong", votes: 20181, votesPct: 81.7, marginPct: 65.5, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Low Chee Leong",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "21", dunCodeLabel: "N21", dunName: "Duyong",
    parliamentCode: "138", parliamentName: "Kota Melaka", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Mohd Noor Helmy bin Abdul Halem", votes: 4684, votesPct: 38.4, marginPct: 1.6, runnerUpCoalition: "PH", runnerUpParty: "DAP" },
    ge14:  { coalition: "PH", party: "DAP",  candidate: "Damian Yeo Shen Li",             votes: 7642, votesPct: 49.7, marginPct: 7.0, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Mohd Noor Helmy bin Abdul Halem",
    isMarginal: true, isSafe: false,
  },
  {
    dunCode: "22", dunCodeLabel: "N22", dunName: "Bandar Hilir",
    parliamentCode: "138", parliamentName: "Kota Melaka", district: "Melaka Tengah",
    prn15: { coalition: "PH", party: "DAP", candidate: "Leng Chau Yen",   votes: 9091, votesPct: 81.2, marginPct: 69.5, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    ge14:  { coalition: "PH", party: "DAP", candidate: "Tey Kok Kiew",    votes: 14038, votesPct: 83.0, marginPct: 66.9, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Leng Chau Yen",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "23", dunCodeLabel: "N23", dunName: "Telok Mas",
    parliamentCode: "138", parliamentName: "Kota Melaka", district: "Melaka Tengah",
    prn15: { coalition: "BN", party: "UMNO",   candidate: "Abdul Razak bin Abdul Rahman", votes: 6052, votesPct: 43.0, marginPct: 14.8, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "PH", party: "BERSATU", candidate: "Noor Effandi bin Ahmad",      votes: 7694, votesPct: 44.6, marginPct:  7.4, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→BN",
    incumbentCandidate: "Abdul Razak bin Abdul Rahman",
    isMarginal: false, isSafe: false,
  },

  // ── P139 Jasin (Jasin) — 5 DUN ──────────────────────────────────────────
  {
    dunCode: "24", dunCodeLabel: "N24", dunName: "Bemban",
    parliamentCode: "139", parliamentName: "Jasin", district: "Jasin",
    prn15: { coalition: "PN", party: "BERSATU", candidate: "Mohd Yadzil bin Yaakub", votes: 4211, votesPct: 34.6, marginPct: 2.7, runnerUpCoalition: "BN", runnerUpParty: "MCA" },
    ge14:  { coalition: "PH", party: "DAP",      candidate: "Wong Fort Pin",          votes: 6998, votesPct: 45.4, marginPct: 8.7, runnerUpCoalition: "BN", runnerUpParty: "UMNO" },
    swing: true, swingDirection: "PH→PN",
    incumbentCandidate: "Mohd Yadzil bin Yaakub",
    isMarginal: true, isSafe: false,
  },
  {
    dunCode: "25", dunCodeLabel: "N25", dunName: "Rim",
    parliamentCode: "139", parliamentName: "Jasin", district: "Jasin",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Khaidhirah binti Abu Zahar", votes: 4037, votesPct: 45.3, marginPct: 14.9, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Ghazale bin Muhamad",        votes: 5301, votesPct: 46.8, marginPct: 4.7, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Khaidhirah binti Abu Zahar",
    isMarginal: false, isSafe: false,
  },
  {
    dunCode: "26", dunCodeLabel: "N26", dunName: "Serkam",
    parliamentCode: "139", parliamentName: "Jasin", district: "Jasin",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Zaidi bin Attan",     votes: 5038, votesPct: 43.3, marginPct: 0.7, runnerUpCoalition: "PN", runnerUpParty: "PAS" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Zaidi bin Attan",    votes: 6401, votesPct: 47.5, marginPct: 12.9, runnerUpCoalition: "PH", runnerUpParty: "PKR" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Zaidi bin Attan",
    isMarginal: true, isSafe: false,
  },
  {
    dunCode: "27", dunCodeLabel: "N27", dunName: "Merlimau",
    parliamentCode: "139", parliamentName: "Jasin", district: "Jasin",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Muhamad Akmal bin Saleh", votes: 5633, votesPct: 58.4, marginPct: 33.7, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Roslan bin Ahmad",       votes: 5290, votesPct: 45.4, marginPct: 1.1, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Muhamad Akmal bin Saleh",
    isMarginal: false, isSafe: true,
  },
  {
    dunCode: "28", dunCodeLabel: "N28", dunName: "Sungai Rambai",
    parliamentCode: "139", parliamentName: "Jasin", district: "Jasin",
    prn15: { coalition: "BN", party: "UMNO", candidate: "Siti Faizah binti Abdul Azis", votes: 3801, votesPct: 48.1, marginPct: 14.4, runnerUpCoalition: "PN", runnerUpParty: "BERSATU" },
    ge14:  { coalition: "BN", party: "UMNO", candidate: "Hasan bin Abd Rahman",        votes: 5088, votesPct: 51.3, marginPct: 16.8, runnerUpCoalition: "PH", runnerUpParty: "AMANAH" },
    swing: false, swingDirection: null,
    incumbentCandidate: "Siti Faizah binti Abdul Azis",
    isMarginal: false, isSafe: false,
  },
];

// ── Aggregate helpers ──────────────────────────────────────────────────────

export const DUN_COALITION_COUNTS = {
  BN: DUN_SUMMARY.filter((d) => d.prn15.coalition === "BN").length,    // 21
  PH: DUN_SUMMARY.filter((d) => d.prn15.coalition === "PH").length,    // 5
  PN: DUN_SUMMARY.filter((d) => d.prn15.coalition === "PN").length,    // 2
  swing: DUN_SUMMARY.filter((d) => d.swing).length,                    // 11
  marginal: DUN_SUMMARY.filter((d) => d.isMarginal).length,            // 6
  safe: DUN_SUMMARY.filter((d) => d.isSafe).length,                    // 10
};

export const DUN_DISTRICT_COUNTS = {
  "Alor Gajah": DUN_SUMMARY.filter((d) => d.district === "Alor Gajah").length,      // 10
  "Melaka Tengah": DUN_SUMMARY.filter((d) => d.district === "Melaka Tengah").length, // 13
  "Jasin": DUN_SUMMARY.filter((d) => d.district === "Jasin").length,                 // 5
};

/** Lookup a DUN by its 2-digit code. */
export function getDunByCode(code: string): DunSummary | undefined {
  return DUN_SUMMARY.find((d) => d.dunCode === code);
}

/** Get all DUNs in a given parliament. */
export function getDunsForParliament(parlCode: string): DunSummary[] {
  return DUN_SUMMARY.filter((d) => d.parliamentCode === parlCode);
}
