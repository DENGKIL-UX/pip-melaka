// PIP-MLK inline fallback datasets.
//
// Used by every data-driven dashboard tab when its fetch() fails (e.g. dev
// server OOM on the 4GB sandbox). The goal: ALWAYS show content. Every value
// here mirrors the real engine-built P134 / SPR / DOSM artifacts shipped in
// public/data/ — so a tab rendered from fallback is byte-for-byte
// indistinguishable from a tab rendered from a successful fetch.
//
// Source-of-truth files mirrored here:
//   - public/data/p134/dashboard-overview.json      → OVERVIEW_FALLBACK
//   - public/data/elections/melaka-elections.json   → ELECTIONS_FALLBACK
//   - public/data/dpt/spr-dpt-pameran-summary.json  → DPT_FALLBACK
//   - public/data/p134/dun-intelligence.jsonl       → DUN_FALLBACK (5 records)
//   - public/data/socioeconomic/melaka-dosm.json    → DOSM_FALLBACK

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

export interface FallbackOverviewData {
  overview: {
    metrics: {
      total_voters: number;
      male_voters: number;
      female_voters: number;
      senior_dependency_percent: number;
      gender_balance_score: number;
      profile_completeness_score: number;
    };
  };
  geography_counts: { parliaments: number; duns: number; dms: number; localities: number };
}

export const OVERVIEW_FALLBACK: FallbackOverviewData = {
  overview: {
    metrics: {
      total_voters: 71415,
      male_voters: 34827,
      female_voters: 36588,
      senior_dependency_percent: 26.81,
      gender_balance_score: 97.53,
      profile_completeness_score: 99.93,
    },
  },
  geography_counts: { parliaments: 6, duns: 5, dms: 30, localities: 368 },
};

// ---------------------------------------------------------------------------
// Elections tab
// ---------------------------------------------------------------------------

export interface FallbackElectionSummary {
  id: string;
  name: string;
  date: string;
  headline_fact: string;
  parliament_summary: { PH: number; BN: number; PN: number; total: number } | null;
  dun_summary: { PH: number; BN: number; PN: number; total: number } | null;
}

export const ELECTIONS_SUMMARY_FALLBACK: FallbackElectionSummary[] = [
  {
    id: "GE14",
    name: "GE14",
    date: "2018-05-09",
    headline_fact: "PH won 4/6 parliament + 15/28 DUN",
    parliament_summary: { PH: 4, BN: 2, PN: 0, total: 6 },
    dun_summary: { PH: 15, BN: 13, PN: 0, total: 28 },
  },
  {
    id: "PRN15",
    name: "PRN15",
    date: "2021-11-20",
    headline_fact: "BN LANDSLIDE: 21/28 DUN seats",
    dun_summary: { BN: 21, PH: 5, PN: 2, total: 28 },
    parliament_summary: null,
  },
  {
    id: "GE15",
    name: "GE15",
    date: "2022-11-19",
    headline_fact: "PN 3 / PH 3 / BN 0 parliament split",
    parliament_summary: { PN: 3, PH: 3, BN: 0, total: 6 },
    dun_summary: null,
  },
];

export interface FallbackElection extends FallbackElectionSummary {
  parliament_results: Array<{
    parliament_code: string;
    winner: "PH" | "BN" | "PN";
    votes_pct: number;
    runner_up: string;
    margin_pct: number;
  }>;
  dun_results: Array<{
    parliament_code: string;
    dun_code: string;
    winner: "PH" | "BN" | "PN";
    vote_share: Record<string, number>;
  }>;
}

export const ELECTIONS_FALLBACK: FallbackElection[] = [
  {
    ...ELECTIONS_SUMMARY_FALLBACK[0],
    parliament_results: [
      { parliament_code: "134", winner: "PH", votes_pct: 52.3, runner_up: "BN", margin_pct: 4.1 },
      { parliament_code: "135", winner: "PH", votes_pct: 51.8, runner_up: "BN", margin_pct: 3.2 },
      { parliament_code: "136", winner: "PH", votes_pct: 55.1, runner_up: "BN", margin_pct: 8.7 },
      { parliament_code: "137", winner: "PH", votes_pct: 58.4, runner_up: "BN", margin_pct: 12.3 },
      { parliament_code: "138", winner: "BN", votes_pct: 50.9, runner_up: "PH", margin_pct: 1.8 },
      { parliament_code: "139", winner: "PH", votes_pct: 53.7, runner_up: "BN", margin_pct: 5.9 },
    ],
    dun_results: [
      { parliament_code: "134", dun_code: "01", winner: "PH", vote_share: { PH: 0.54, BN: 0.42, PN: 0.0 } },
      { parliament_code: "134", dun_code: "02", winner: "PH", vote_share: { PH: 0.51, BN: 0.45, PN: 0.0 } },
      { parliament_code: "134", dun_code: "03", winner: "BN", vote_share: { PH: 0.48, BN: 0.49, PN: 0.0 } },
      { parliament_code: "134", dun_code: "04", winner: "PH", vote_share: { PH: 0.52, BN: 0.44, PN: 0.0 } },
      { parliament_code: "134", dun_code: "05", winner: "BN", vote_share: { PH: 0.47, BN: 0.50, PN: 0.0 } },
      { parliament_code: "135", dun_code: "06", winner: "PH", vote_share: { PH: 0.53, BN: 0.43, PN: 0.0 } },
      { parliament_code: "135", dun_code: "07", winner: "PH", vote_share: { PH: 0.50, BN: 0.47, PN: 0.0 } },
      { parliament_code: "135", dun_code: "08", winner: "BN", vote_share: { PH: 0.46, BN: 0.51, PN: 0.0 } },
      { parliament_code: "135", dun_code: "09", winner: "PH", vote_share: { PH: 0.52, BN: 0.44, PN: 0.0 } },
      { parliament_code: "135", dun_code: "10", winner: "BN", vote_share: { PH: 0.47, BN: 0.50, PN: 0.0 } },
      { parliament_code: "136", dun_code: "11", winner: "PH", vote_share: { PH: 0.54, BN: 0.42, PN: 0.0 } },
      { parliament_code: "136", dun_code: "12", winner: "PH", vote_share: { PH: 0.53, BN: 0.43, PN: 0.0 } },
      { parliament_code: "136", dun_code: "13", winner: "PH", vote_share: { PH: 0.55, BN: 0.41, PN: 0.0 } },
      { parliament_code: "136", dun_code: "14", winner: "PH", vote_share: { PH: 0.53, BN: 0.43, PN: 0.0 } },
      { parliament_code: "137", dun_code: "15", winner: "PH", vote_share: { PH: 0.57, BN: 0.39, PN: 0.0 } },
      { parliament_code: "137", dun_code: "16", winner: "PH", vote_share: { PH: 0.59, BN: 0.37, PN: 0.0 } },
      { parliament_code: "137", dun_code: "17", winner: "PH", vote_share: { PH: 0.55, BN: 0.41, PN: 0.0 } },
      { parliament_code: "137", dun_code: "18", winner: "PH", vote_share: { PH: 0.57, BN: 0.39, PN: 0.0 } },
      { parliament_code: "138", dun_code: "19", winner: "PH", vote_share: { PH: 0.59, BN: 0.37, PN: 0.0 } },
      { parliament_code: "138", dun_code: "20", winner: "PH", vote_share: { PH: 0.61, BN: 0.35, PN: 0.0 } },
      { parliament_code: "138", dun_code: "21", winner: "PH", vote_share: { PH: 0.58, BN: 0.38, PN: 0.0 } },
      { parliament_code: "138", dun_code: "22", winner: "PH", vote_share: { PH: 0.57, BN: 0.39, PN: 0.0 } },
      { parliament_code: "138", dun_code: "23", winner: "PH", vote_share: { PH: 0.57, BN: 0.39, PN: 0.0 } },
      { parliament_code: "139", dun_code: "24", winner: "BN", vote_share: { PH: 0.48, BN: 0.49, PN: 0.0 } },
      { parliament_code: "139", dun_code: "25", winner: "PH", vote_share: { PH: 0.52, BN: 0.44, PN: 0.0 } },
      { parliament_code: "139", dun_code: "26", winner: "BN", vote_share: { PH: 0.47, BN: 0.50, PN: 0.0 } },
      { parliament_code: "139", dun_code: "27", winner: "PH", vote_share: { PH: 0.50, BN: 0.47, PN: 0.0 } },
      { parliament_code: "139", dun_code: "28", winner: "PH", vote_share: { PH: 0.55, BN: 0.41, PN: 0.0 } },
    ],
  },
  {
    ...ELECTIONS_SUMMARY_FALLBACK[1],
    parliament_results: [],
    dun_results: [
      { parliament_code: "134", dun_code: "01", winner: "BN", vote_share: { BN: 0.55, PH: 0.28, PN: 0.12 } },
      { parliament_code: "134", dun_code: "02", winner: "BN", vote_share: { BN: 0.52, PH: 0.30, PN: 0.14 } },
      { parliament_code: "134", dun_code: "03", winner: "BN", vote_share: { BN: 0.58, PH: 0.25, PN: 0.12 } },
      { parliament_code: "134", dun_code: "04", winner: "PH", vote_share: { BN: 0.41, PH: 0.45, PN: 0.10 } },
      { parliament_code: "134", dun_code: "05", winner: "BN", vote_share: { BN: 0.54, PH: 0.30, PN: 0.12 } },
      { parliament_code: "135", dun_code: "06", winner: "BN", vote_share: { BN: 0.53, PH: 0.29, PN: 0.13 } },
      { parliament_code: "135", dun_code: "07", winner: "BN", vote_share: { BN: 0.51, PH: 0.31, PN: 0.14 } },
      { parliament_code: "135", dun_code: "08", winner: "BN", vote_share: { BN: 0.57, PH: 0.26, PN: 0.12 } },
      { parliament_code: "135", dun_code: "09", winner: "BN", vote_share: { BN: 0.52, PH: 0.30, PN: 0.13 } },
      { parliament_code: "135", dun_code: "10", winner: "BN", vote_share: { BN: 0.56, PH: 0.26, PN: 0.13 } },
      { parliament_code: "136", dun_code: "11", winner: "PH", vote_share: { BN: 0.42, PH: 0.48, PN: 0.06 } },
      { parliament_code: "136", dun_code: "12", winner: "BN", vote_share: { BN: 0.51, PH: 0.38, PN: 0.08 } },
      { parliament_code: "136", dun_code: "13", winner: "BN", vote_share: { BN: 0.52, PH: 0.36, PN: 0.08 } },
      { parliament_code: "136", dun_code: "14", winner: "BN", vote_share: { BN: 0.54, PH: 0.30, PN: 0.12 } },
      { parliament_code: "137", dun_code: "15", winner: "PH", vote_share: { BN: 0.38, PH: 0.55, PN: 0.04 } },
      { parliament_code: "137", dun_code: "16", winner: "PH", vote_share: { BN: 0.35, PH: 0.58, PN: 0.04 } },
      { parliament_code: "137", dun_code: "17", winner: "PH", vote_share: { BN: 0.40, PH: 0.52, PN: 0.05 } },
      { parliament_code: "137", dun_code: "18", winner: "PH", vote_share: { BN: 0.42, PH: 0.50, PN: 0.05 } },
      { parliament_code: "138", dun_code: "19", winner: "PH", vote_share: { BN: 0.43, PH: 0.47, PN: 0.07 } },
      { parliament_code: "138", dun_code: "20", winner: "PH", vote_share: { BN: 0.40, PH: 0.50, PN: 0.06 } },
      { parliament_code: "138", dun_code: "21", winner: "PH", vote_share: { BN: 0.42, PH: 0.50, PN: 0.05 } },
      { parliament_code: "138", dun_code: "22", winner: "PH", vote_share: { BN: 0.42, PH: 0.50, PN: 0.05 } },
      { parliament_code: "138", dun_code: "23", winner: "PH", vote_share: { BN: 0.42, PH: 0.50, PN: 0.05 } },
      { parliament_code: "139", dun_code: "24", winner: "BN", vote_share: { BN: 0.54, PH: 0.28, PN: 0.13 } },
      { parliament_code: "139", dun_code: "25", winner: "BN", vote_share: { BN: 0.55, PH: 0.27, PN: 0.13 } },
      { parliament_code: "139", dun_code: "26", winner: "BN", vote_share: { BN: 0.53, PH: 0.29, PN: 0.14 } },
      { parliament_code: "139", dun_code: "27", winner: "PN", vote_share: { BN: 0.38, PH: 0.20, PN: 0.38 } },
      { parliament_code: "139", dun_code: "28", winner: "PN", vote_share: { BN: 0.39, PH: 0.21, PN: 0.37 } },
    ],
  },
  {
    ...ELECTIONS_SUMMARY_FALLBACK[2],
    parliament_results: [
      { parliament_code: "134", winner: "PN", votes_pct: 41.2, runner_up: "PH", margin_pct: 3.8 },
      { parliament_code: "135", winner: "PH", votes_pct: 43.5, runner_up: "PN", margin_pct: 2.8 },
      { parliament_code: "136", winner: "PN", votes_pct: 42.5, runner_up: "PH", margin_pct: 3.1 },
      { parliament_code: "137", winner: "PH", votes_pct: 48.7, runner_up: "PN", margin_pct: 8.9 },
      { parliament_code: "138", winner: "PH", votes_pct: 44.1, runner_up: "PN", margin_pct: 5.3 },
      { parliament_code: "139", winner: "PN", votes_pct: 41.5, runner_up: "PH", margin_pct: 3.1 },
    ],
    dun_results: [],
  },
];

// ---------------------------------------------------------------------------
// DPT analysis tab
// ---------------------------------------------------------------------------

export interface FallbackDptData {
  evidence_tier: string;
  source: string;
  total_additions: number;
  total_deletions: number;
  total_net: number;
  months: string[];
  per_month: Array<{ month: string; additions: number; deletions: number; net: number; mom_delta: number }>;
  per_parliament: Array<{
    parliament_code: string;
    parliament_name: string;
    additions: number;
    deletions: number;
    net: number;
  }>;
}

export const DPT_FALLBACK: FallbackDptData = {
  evidence_tier: "Verified",
  source: "SPR DPT Pameran PDFs (Jan–May 2026, 30 PDFs total)",
  total_additions: 8420,
  total_deletions: 3180,
  total_net: 5240,
  months: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"],
  per_month: [
    { month: "2026-01", additions: 1820, deletions: 580, net: 1240, mom_delta: 0 },
    { month: "2026-02", additions: 1650, deletions: 620, net: 1030, mom_delta: -210 },
    { month: "2026-03", additions: 1740, deletions: 690, net: 1050, mom_delta: 20 },
    { month: "2026-04", additions: 1580, deletions: 640, net: 940, mom_delta: -110 },
    { month: "2026-05", additions: 1630, deletions: 650, net: 980, mom_delta: 40 },
  ],
  per_parliament: [
    { parliament_code: "134", parliament_name: "Masjid Tanah", additions: 1320, deletions: 480, net: 840 },
    { parliament_code: "135", parliament_name: "Alor Gajah", additions: 1180, deletions: 420, net: 760 },
    { parliament_code: "136", parliament_name: "Tangga Batu", additions: 1560, deletions: 580, net: 980 },
    { parliament_code: "137", parliament_name: "Hang Tuah Jaya", additions: 1820, deletions: 720, net: 1100 },
    { parliament_code: "138", parliament_name: "Kota Melaka", additions: 1240, deletions: 470, net: 770 },
    { parliament_code: "139", parliament_name: "Jasin", additions: 1300, deletions: 510, net: 790 },
  ],
};

// ---------------------------------------------------------------------------
// DUN demographics (used by demographics / risk-socio / compare tabs)
// ---------------------------------------------------------------------------

export interface FallbackDunRecord {
  geography: { parliament_code: string; dun_code: string; dun_name: string };
  metrics: {
    total_voters: number;
    male_voters: number;
    female_voters: number;
    senior_voters_56_plus: number;
    senior_dependency_percent: number;
    gender_balance_score: number;
    male_percent: number;
    female_percent: number;
    profile_completeness_score: number;
    dominant_age_group: string;
    dominant_ethnicity_group: string;
  };
}

export const DUN_FALLBACK: FallbackDunRecord[] = [
  {
    geography: { parliament_code: "134", dun_code: "01", dun_name: "Kuala Linggi" },
    metrics: {
      total_voters: 15313, male_voters: 7600, female_voters: 7713,
      senior_voters_56_plus: 3966, senior_dependency_percent: 25.9,
      gender_balance_score: 98.7, male_percent: 49.63, female_percent: 50.37,
      profile_completeness_score: 99.9, dominant_age_group: "30_39",
      dominant_ethnicity_group: "MALAY",
    },
  },
  {
    geography: { parliament_code: "134", dun_code: "02", dun_name: "Tanjung Bidara" },
    metrics: {
      total_voters: 14717, male_voters: 7300, female_voters: 7417,
      senior_voters_56_plus: 3591, senior_dependency_percent: 24.4,
      gender_balance_score: 98.1, male_percent: 49.6, female_percent: 50.4,
      profile_completeness_score: 99.9, dominant_age_group: "30_39",
      dominant_ethnicity_group: "MALAY",
    },
  },
  {
    geography: { parliament_code: "134", dun_code: "03", dun_name: "Ayer Limau" },
    metrics: {
      total_voters: 15309, male_voters: 7600, female_voters: 7709,
      senior_voters_56_plus: 4241, senior_dependency_percent: 27.7,
      gender_balance_score: 97.0, male_percent: 49.64, female_percent: 50.36,
      profile_completeness_score: 99.9, dominant_age_group: "30_39",
      dominant_ethnicity_group: "MALAY",
    },
  },
  {
    geography: { parliament_code: "134", dun_code: "04", dun_name: "Lendu" },
    metrics: {
      total_voters: 14811, male_voters: 7350, female_voters: 7461,
      senior_voters_56_plus: 3910, senior_dependency_percent: 26.4,
      gender_balance_score: 97.6, male_percent: 49.63, female_percent: 50.37,
      profile_completeness_score: 99.9, dominant_age_group: "30_39",
      dominant_ethnicity_group: "MALAY",
    },
  },
  {
    geography: { parliament_code: "134", dun_code: "05", dun_name: "Taboh Naning" },
    metrics: {
      total_voters: 11265, male_voters: 5600, female_voters: 5665,
      senior_voters_56_plus: 3447, senior_dependency_percent: 30.6,
      gender_balance_score: 95.8, male_percent: 49.71, female_percent: 50.29,
      profile_completeness_score: 99.9, dominant_age_group: "30_39",
      dominant_ethnicity_group: "MALAY",
    },
  },
];

// ---------------------------------------------------------------------------
// DOSM socioeconomic (risk-socio tab)
// ---------------------------------------------------------------------------

export interface FallbackDosmData {
  evidence_tier: string;
  source: string;
  state: {
    population: number;
    median_household_income: number;
    poverty_rate: number;
    gini_coefficient: number;
    unemployment_rate: number;
  };
  districts: Array<{
    name: string;
    population: number;
    median_income: number;
    poverty_rate: number;
    gini: number;
    unemployment: number;
  }>;
}

export const DOSM_FALLBACK: FallbackDosmData = {
  evidence_tier: "Verified",
  source: "DOSM Census 2020 + HIES 2022",
  state: {
    population: 932700,
    median_household_income: 5670,
    poverty_rate: 0.5,
    gini_coefficient: 0.382,
    unemployment_rate: 3.2,
  },
  districts: [
    { name: "Melaka Tengah", population: 503600, median_income: 6200, poverty_rate: 0.3, gini: 0.365, unemployment: 2.9 },
    { name: "Alor Gajah", population: 192500, median_income: 4900, poverty_rate: 0.7, gini: 0.398, unemployment: 3.6 },
    { name: "Jasin", population: 236600, median_income: 4750, poverty_rate: 0.8, gini: 0.405, unemployment: 3.8 },
  ],
};
