// ponytail: MLK — Demographics module shared types.
// Mirrors the shape of `/data/p{N}/parliament-intelligence.jsonl` +
// `/data/p{N}/dun-intelligence.jsonl` (engine aggregate JSONL files).
// See MELAKA-FACTS.md §5.5 + DESIGN.md §3.5 (engine pipeline).

export type AgeBandKey =
  | "UNDER_18"
  | "18_20"
  | "21_29"
  | "30_39"
  | "40_49"
  | "50_55"
  | "56_64"
  | "65_PLUS";

export type EthnicityKey =
  | "MALAY"
  | "CHINESE"
  | "INDIAN"
  | "BUMIPUTERA"
  | "OTHER"
  | "UNKNOWN";

export interface EngineMetrics {
  total_voters: number;
  male_voters?: number;
  female_voters?: number;
  other_or_unknown_gender_voters?: number;
  senior_voters_56_plus?: number;
  known_age_voters?: number;
  voter_density_score?: string;
  senior_dependency_percent?: number;
  gender_balance_score?: number;
  male_percent?: number;
  female_percent?: number;
  dominant_age_group?: string;
  dominant_ethnicity_group?: string;
  dominant_profession_group?: string;
  profile_completeness_score?: number;
  average_cleansing_confidence?: number;
  clean_records?: number;
  clean_with_flags_records?: number;
}

export interface EngineDistributions {
  age_band_counts?: Partial<Record<AgeBandKey, number>>;
  ethnicity_counts?: Partial<Record<EthnicityKey, number>>;
  profession_group_counts?: Record<string, number>;
}

export interface ParliamentIntelligenceRow {
  level: "PARLIAMENT";
  id: string;
  geography: {
    state_code: string;
    state_name: string;
    parliament_code: string;
    parliament_name: string;
    district: string;
  };
  evidence_tier: string;
  evidence_note?: string;
  metrics: EngineMetrics;
  distributions: EngineDistributions;
}

export interface DunIntelligenceRow {
  level: "DUN";
  id: string;
  geography: {
    state_code: string;
    state_name: string;
    parliament_code: string;
    parliament_name: string;
    dun_code: string;
    dun_name: string;
    district: string;
  };
  evidence_tier: string;
  evidence_note?: string;
  metrics: EngineMetrics;
  distributions: EngineDistributions;
}
