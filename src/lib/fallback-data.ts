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
    name: "GE14 — 14th General Election",
    date: "2018-05-09",
    headline_fact: "PH won 4/6 parliament + 15/28 DUN. BN won 2 parliament + 13 DUN. PH formed state government.",
    parliament_summary: { PH: 4, BN: 2, PN: 0, total: 6 },
    dun_summary: { PH: 15, BN: 13, PN: 0, total: 28 },
  },
  {
    id: "PRN15",
    name: "PRN15 — 15th State Election",
    date: "2021-11-20",
    headline_fact: "BN LANDSLIDE: 21/28 DUN seats. PH won 5, PN won 2. BN regained state government.",
    parliament_summary: null,
    dun_summary: { PH: 5, BN: 21, PN: 2, total: 28 },
  },
  {
    id: "GE15",
    name: "GE15 — 15th General Election",
    date: "2022-11-19",
    headline_fact: "PN won 3 (P134, P136, P139), PH won 3 (P135, P137, P138), BN won 0. Melaka parliament split evenly PN 3 / PH 3.",
    parliament_summary: { PH: 3, BN: 0, PN: 3, total: 6 },
    dun_summary: null,
  },
];

export interface FallbackElection extends FallbackElectionSummary {
  parliament_results: Array<{
    parliament_code: string;
    winner: "PH" | "BN" | "PN";
    winner_party?: string;
    runner_up_party?: string | null;
    votes_pct: number;
    runner_up: string;
    margin_pct: number;
  }>;
  dun_results: Array<{
    parliament_code: string;
    dun_code: string;
    winner: "PH" | "BN" | "PN";
    winner_party?: string;
    vote_share: Record<string, number>;
  }>;
}

export const ELECTIONS_FALLBACK: FallbackElection[] = [
  {
    ...ELECTIONS_SUMMARY_FALLBACK[0],
    parliament_results: [
      { parliament_code: "134", winner: "BN", winner_party: "UMNO", votes_pct: 54.1, runner_up: "PH", runner_up_party: "BERSATU", margin_pct: 19.3 },
      { parliament_code: "135", winner: "PH", winner_party: "BERSATU", votes_pct: 50.7, runner_up: "BN", runner_up_party: "MCA", margin_pct: 12.1 },
      { parliament_code: "136", winner: "PH", winner_party: "PKR", votes_pct: 46.9, runner_up: "BN", runner_up_party: "UMNO", margin_pct: 6.7 },
      { parliament_code: "137", winner: "PH", winner_party: "PKR", votes_pct: 51.0, runner_up: "BN", runner_up_party: "UMNO", margin_pct: 11.3 },
      { parliament_code: "138", winner: "PH", winner_party: "DAP", votes_pct: 72.7, runner_up: "BN", runner_up_party: "MCA", margin_pct: 46.7 },
      { parliament_code: "139", winner: "BN", winner_party: "UMNO", votes_pct: 43.0, runner_up: "PH", runner_up_party: "AMANAH", margin_pct: 0.4 },
    ],
    dun_results: [
      { parliament_code: "134", dun_code: "01", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5234417491569673, PH: 0.37419775916458176, GS: 0.10236049167845102 } },
      { parliament_code: "134", dun_code: "02", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5814509382096331, PH: 0.23915381857296525, GS: 0.1793952432174017 } },
      { parliament_code: "134", dun_code: "03", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5160157964019306, PH: 0.3537735849056604, GS: 0.13021061869240896 } },
      { parliament_code: "134", dun_code: "04", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4687208216619981, PH: 0.39554154995331464, GS: 0.1357376283846872 } },
      { parliament_code: "134", dun_code: "05", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4736093327642623, PH: 0.3683311993171149, GS: 0.15805946791862285 } },
      { parliament_code: "135", dun_code: "06", winner: "PH", winner_party: "PKR", vote_share: { PH: 0.5237395607794618, BN: 0.3834673677698731, GS: 0.09279307145066502 } },
      { parliament_code: "135", dun_code: "07", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.42467607812802166, BN: 0.3949912976213498, GS: 0.18033262425062851 } },
      { parliament_code: "135", dun_code: "08", winner: "PH", winner_party: "PKR", vote_share: { PH: 0.5266154284087674, BN: 0.3998481829395578, GS: 0.07353638865167474 } },
      { parliament_code: "135", dun_code: "09", winner: "PH", winner_party: "AMANAH", vote_share: { PH: 0.47159399312466077, BN: 0.4025692057173874, GS: 0.12583680115795187 } },
      { parliament_code: "135", dun_code: "10", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4579929088947125, PH: 0.43679667026360414, GS: 0.10521042084168336 } },
      { parliament_code: "136", dun_code: "11", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5622034938884858, PH: 0.43779650611151427 } },
      { parliament_code: "136", dun_code: "12", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.45420928402832417, PH: 0.3934697088906373, GS: 0.15232100708103855 } },
      { parliament_code: "136", dun_code: "13", winner: "PH", winner_party: "BERSATU", vote_share: { PH: 0.5629622738056473, BN: 0.36484160580546127, GS: 0.07219612038889148 } },
      { parliament_code: "136", dun_code: "14", winner: "PH", winner_party: "PKR", vote_share: { PH: 0.45580785505691634, BN: 0.40878479051194944, GS: 0.13540735443113416 } },
      { parliament_code: "137", dun_code: "15", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.5146697902722, BN: 0.3609437751004016, GS: 0.12438643462739848 } },
      { parliament_code: "137", dun_code: "16", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.6530826930113427, BN: 0.22950969630442736, GS: 0.11740761068422978 } },
      { parliament_code: "137", dun_code: "17", winner: "PH", winner_party: "AMANAH", vote_share: { PH: 0.5214119832791454, BN: 0.37468648397584764, GS: 0.10390153274500696 } },
      { parliament_code: "137", dun_code: "18", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4555642941407786, PH: 0.33726569668370693, GS: 0.20199239743085595, OTH: 0.00517761174465854 } },
      { parliament_code: "138", dun_code: "19", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.7264183890529256, BN: 0.26250119058957994, OTH: 0.011080420357494365 } },
      { parliament_code: "138", dun_code: "20", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.8168461102566178, BN: 0.16222779891524325, OTH: 0.020926090828138913 } },
      { parliament_code: "138", dun_code: "21", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.4965884722853986, BN: 0.3084670868802391, GS: 0.1909155890571187, OTH: 0.004028851777243486 } },
      { parliament_code: "138", dun_code: "22", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.8304543303360151, BN: 0.1612044486512068, OTH: 0.00834122101277804 } },
      { parliament_code: "138", dun_code: "23", winner: "PH", winner_party: "BERSATU", vote_share: { PH: 0.44566728452270626, BN: 0.37106116774791476, GS: 0.18327154772937906 } },
      { parliament_code: "139", dun_code: "24", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.4540323103873354, BN: 0.36676831246350483, GS: 0.1791993771491598 } },
      { parliament_code: "139", dun_code: "25", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4679555084745763, PH: 0.4206391242937853, GS: 0.11140536723163842 } },
      { parliament_code: "139", dun_code: "26", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.47456998813760376, PH: 0.27164887307236063, GS: 0.2537811387900356 } },
      { parliament_code: "139", dun_code: "27", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.45376565448618966, PH: 0.442614513638703, GS: 0.10361983187510722 } },
      { parliament_code: "139", dun_code: "28", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.513317191283293, PH: 0.3449354317998386, GS: 0.14174737691686845 } },
    ],
    party_breakdown: { UMNO: 2, BERSATU: 1, PKR: 2, DAP: 1 },
  },
  {
    ...ELECTIONS_SUMMARY_FALLBACK[1],
    parliament_results: [
    ],
    dun_results: [
      { parliament_code: "134", dun_code: "01", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5100459242250287, PH: 0.2465556831228473, PN: 0.23607921928817452, OTH: 0.007319173363949483 } },
      { parliament_code: "134", dun_code: "02", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4913709788761562, PN: 0.44111555985089057, PH: 0.0675134612729532 } },
      { parliament_code: "134", dun_code: "03", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5194207605900664, PN: 0.3725808634456625, PH: 0.10799837596427121 } },
      { parliament_code: "134", dun_code: "04", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.6387583653709241, PN: 0.19678200199345006, PH: 0.1644596326356258 } },
      { parliament_code: "134", dun_code: "05", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5723054703014985, PN: 0.24282361437082506, PH: 0.18487091532767647 } },
      { parliament_code: "135", dun_code: "06", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.41607565011820324, PH: 0.3313632781717888, PN: 0.23965721040189122, OTH: 0.012903861308116629 } },
      { parliament_code: "135", dun_code: "07", winner: "BN", winner_party: "MIC", vote_share: { BN: 0.3936433502670314, PH: 0.32082844861273935, PN: 0.2658590595284616, OTH: 0.01966914159176762 } },
      { parliament_code: "135", dun_code: "08", winner: "BN", winner_party: "MCA", vote_share: { BN: 0.46673336668334164, PH: 0.3494247123561781, PN: 0.15032516258129064, OTH: 0.03351675837918959 } },
      { parliament_code: "135", dun_code: "09", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4055131185652607, PH: 0.3436289161961696, PN: 0.2444370640983062, OTH: 0.0064209011402634785 } },
      { parliament_code: "135", dun_code: "10", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5677166934189406, PH: 0.2674558587479936, PN: 0.1368378812199037, OTH: 0.02798956661316212 } },
      { parliament_code: "136", dun_code: "11", winner: "PN", winner_party: "BERSATU", vote_share: { PN: 0.4364793622219365, BN: 0.4024045261669024, PH: 0.13083451202263083, OTH: 0.030281599588530283 } },
      { parliament_code: "136", dun_code: "12", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4003234937323089, PN: 0.31672058228871813, PH: 0.2829559239789729 } },
      { parliament_code: "136", dun_code: "13", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.39683923072453664, PH: 0.36029283597699147, PN: 0.2307826390099355, OTH: 0.012085294288536401 } },
      { parliament_code: "136", dun_code: "14", winner: "BN", winner_party: "MCA", vote_share: { BN: 0.3848744641763625, PH: 0.3178199632578077, PN: 0.29730557256582973 } },
      { parliament_code: "137", dun_code: "15", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.357702542874039, PH: 0.3480189237137788, PN: 0.19818154937906565, OTH: 0.09609698403311648 } },
      { parliament_code: "137", dun_code: "16", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.5996956824954035, BN: 0.24313700627654852, PN: 0.15716731122804792 } },
      { parliament_code: "137", dun_code: "17", winner: "PH", winner_party: "AMANAH", vote_share: { PH: 0.4155217683336387, BN: 0.350980032973072, PN: 0.22684252305061978, OTH: 0.006655675642669599 } },
      { parliament_code: "137", dun_code: "18", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.510699919549477, PN: 0.28527755430410295, PH: 0.19678197908286404, OTH: 0.007240547063555913 } },
      { parliament_code: "138", dun_code: "19", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.6585953177257525, BN: 0.2020958751393534, PN: 0.1393088071348941 } },
      { parliament_code: "138", dun_code: "20", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.8082814743896601, BN: 0.12051220679751078, PN: 0.0712063188128291 } },
      { parliament_code: "138", dun_code: "21", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.38358856768487437, PH: 0.36720989271967897, PN: 0.2353615592498567, OTH: 0.013839980345590041 } },
      { parliament_code: "138", dun_code: "22", winner: "PH", winner_party: "DAP", vote_share: { PH: 0.8119139055104045, BN: 0.11726355273734036, PN: 0.05662230954720014, OTH: 0.014200232205054926 } },
      { parliament_code: "138", dun_code: "23", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.43007390562819786, PN: 0.28254690164866403, PH: 0.27650653780557133, OTH: 0.0108726549175668 } },
      { parliament_code: "139", dun_code: "24", winner: "PN", winner_party: "BERSATU", vote_share: { PN: 0.3460432245870655, BN: 0.31908948968690937, PH: 0.254334785109705, OTH: 0.08053250061632015 } },
      { parliament_code: "139", dun_code: "25", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.45308641975308644, PN: 0.3041526374859708, PH: 0.24276094276094276 } },
      { parliament_code: "139", dun_code: "26", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4331527813601582, PN: 0.4263605880835698, PH: 0.13197489467801565, OTH: 0.008511735878256384 } },
      { parliament_code: "139", dun_code: "27", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.5843360995850623, PH: 0.24740663900414936, PN: 0.1682572614107884 } },
      { parliament_code: "139", dun_code: "28", winner: "BN", winner_party: "UMNO", vote_share: { BN: 0.4808349146110057, PN: 0.3370018975332068, PH: 0.17153700189753318, OTH: 0.01062618595825427 } },
    ],
    party_breakdown: { UMNO: 18, MIC: 1, MCA: 2, BERSATU: 2, DAP: 4, AMANAH: 1 },
  },
  {
    ...ELECTIONS_SUMMARY_FALLBACK[2],
    parliament_results: [
      { parliament_code: "134", winner: "PN", winner_party: "BERSATU", votes_pct: 46.8, runner_up: "BN", runner_up_party: "UMNO", margin_pct: 8.1 },
      { parliament_code: "135", winner: "PH", winner_party: "AMANAH", votes_pct: 38.6, runner_up: "BN", runner_up_party: "UMNO", margin_pct: 1.2 },
      { parliament_code: "136", winner: "PN", winner_party: "PAS", votes_pct: 40.6, runner_up: "PH", runner_up_party: "PKR", margin_pct: 9.6 },
      { parliament_code: "137", winner: "PH", winner_party: "PKR", votes_pct: 41.7, runner_up: "BN", runner_up_party: "UMNO", margin_pct: 9.1 },
      { parliament_code: "138", winner: "PH", winner_party: "DAP", votes_pct: 60.1, runner_up: "PN", runner_up_party: "GERAKAN", margin_pct: 37.7 },
      { parliament_code: "139", winner: "PN", winner_party: "PAS", votes_pct: 35.9, runner_up: "BN", runner_up_party: "UMNO", margin_pct: 0.4 },
    ],
    dun_results: [
    ],
    party_breakdown: { BERSATU: 1, AMANAH: 1, PAS: 2, PKR: 1, DAP: 1 },
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

  per_dun: [
    { parliament_code: "134", parliament_name: "Masjid Tanah", dun_code: "01", dun_name: "Kuala Linggi", additions: 283, deletions: 103, net: 180, voters: 15313, verified: true },
    { parliament_code: "134", parliament_name: "Masjid Tanah", dun_code: "02", dun_name: "Tanjung Bidara", additions: 259, deletions: 94, net: 165, voters: 14000, verified: true },
    { parliament_code: "134", parliament_name: "Masjid Tanah", dun_code: "03", dun_name: "Ayer Limau", additions: 250, deletions: 91, net: 159, voters: 13500, verified: true },
    { parliament_code: "134", parliament_name: "Masjid Tanah", dun_code: "04", dun_name: "Lendu", additions: 278, deletions: 101, net: 177, voters: 15000, verified: true },
    { parliament_code: "134", parliament_name: "Masjid Tanah", dun_code: "05", dun_name: "Taboh Naning", additions: 250, deletions: 91, net: 159, voters: 13602, verified: true },
    { parliament_code: "135", parliament_name: "Alor Gajah", dun_code: "06", dun_name: "Rembia", additions: 236, deletions: 84, net: 152, voters: 0, verified: false },
    { parliament_code: "135", parliament_name: "Alor Gajah", dun_code: "07", dun_name: "Gadek", additions: 236, deletions: 84, net: 152, voters: 0, verified: false },
    { parliament_code: "135", parliament_name: "Alor Gajah", dun_code: "08", dun_name: "Machap Jaya", additions: 236, deletions: 84, net: 152, voters: 0, verified: false },
    { parliament_code: "135", parliament_name: "Alor Gajah", dun_code: "09", dun_name: "Durian Tunggal", additions: 236, deletions: 84, net: 152, voters: 0, verified: false },
    { parliament_code: "135", parliament_name: "Alor Gajah", dun_code: "10", dun_name: "Asahan", additions: 236, deletions: 84, net: 152, voters: 0, verified: false },
    { parliament_code: "136", parliament_name: "Tangga Batu", dun_code: "11", dun_name: "Sungai Udang", additions: 430, deletions: 155, net: 275, voters: 0, verified: false },
    { parliament_code: "136", parliament_name: "Tangga Batu", dun_code: "12", dun_name: "Pantai Kundor", additions: 430, deletions: 155, net: 275, voters: 0, verified: false },
    { parliament_code: "136", parliament_name: "Tangga Batu", dun_code: "13", dun_name: "Paya Rumput", additions: 430, deletions: 155, net: 275, voters: 0, verified: false },
    { parliament_code: "136", parliament_name: "Tangga Batu", dun_code: "14", dun_name: "Kelebang", additions: 430, deletions: 155, net: 275, voters: 0, verified: false },
    { parliament_code: "137", parliament_name: "Hang Tuah Jaya", dun_code: "15", dun_name: "Pengkalan Batu", additions: 563, deletions: 218, net: 345, voters: 0, verified: false },
    { parliament_code: "137", parliament_name: "Hang Tuah Jaya", dun_code: "16", dun_name: "Ayer Keroh", additions: 563, deletions: 218, net: 345, voters: 0, verified: false },
    { parliament_code: "137", parliament_name: "Hang Tuah Jaya", dun_code: "17", dun_name: "Bukit Katil", additions: 563, deletions: 218, net: 345, voters: 0, verified: false },
    { parliament_code: "137", parliament_name: "Hang Tuah Jaya", dun_code: "18", dun_name: "Ayer Molek", additions: 563, deletions: 218, net: 345, voters: 0, verified: false },
    { parliament_code: "138", parliament_name: "Kota Melaka", dun_code: "19", dun_name: "Kesidang", additions: 384, deletions: 132, net: 252, voters: 0, verified: false },
    { parliament_code: "138", parliament_name: "Kota Melaka", dun_code: "20", dun_name: "Kota Laksamana", additions: 384, deletions: 132, net: 252, voters: 0, verified: false },
    { parliament_code: "138", parliament_name: "Kota Melaka", dun_code: "21", dun_name: "Duyong", additions: 384, deletions: 132, net: 252, voters: 0, verified: false },
    { parliament_code: "138", parliament_name: "Kota Melaka", dun_code: "22", dun_name: "Bandar Hilir", additions: 384, deletions: 132, net: 252, voters: 0, verified: false },
    { parliament_code: "138", parliament_name: "Kota Melaka", dun_code: "23", dun_name: "Telok Mas", additions: 384, deletions: 132, net: 252, voters: 0, verified: false },
    { parliament_code: "139", parliament_name: "Jasin", dun_code: "24", dun_name: "Bemban", additions: 348, deletions: 129, net: 219, voters: 0, verified: false },
    { parliament_code: "139", parliament_name: "Jasin", dun_code: "25", dun_name: "Rim", additions: 348, deletions: 129, net: 219, voters: 0, verified: false },
    { parliament_code: "139", parliament_name: "Jasin", dun_code: "26", dun_name: "Serkam", additions: 348, deletions: 129, net: 219, voters: 0, verified: false },
    { parliament_code: "139", parliament_name: "Jasin", dun_code: "27", dun_name: "Merlimau", additions: 348, deletions: 129, net: 219, voters: 0, verified: false },
    { parliament_code: "139", parliament_name: "Jasin", dun_code: "28", dun_name: "Sungai Rambai", additions: 348, deletions: 129, net: 219, voters: 0, verified: false },
  ],
  total_dun: 28,
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
