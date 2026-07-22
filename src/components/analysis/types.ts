// ponytail: MLK — DPT (Daftar Pemilih Tambahan) Analysis module shared types.
// Mirrors the shape of `/data/dpt/spr-dpt-pameran.json` (30 records) +
// `/data/dpt/spr-dpt-pameran-summary.json` (state-level aggregates).
//
// Source: SPR S3 object store (sprinfo.spr.gov.my) — MinIO bucket, public
// read, no auth. PDFs extracted with `pdftotext -layout` (FPDF 1.85 producer
// — pure text layer, no OCR). Evidence tier: Verified.
//
// See `spr-dpt-extraction` skill spec + WORKLOAD.md Phase 6.2 + DESIGN.md §3.6.

export interface DptDmRow {
  dm_code: string;
  additions: number;
  deletions: number;
  net: number;
}

export interface DptDunRow {
  dun_code: string;
  dun_name: string;
  additions: number;
  deletions: number;
  net: number;
  dm_breakdown: DptDmRow[];
}

export interface DptRecord {
  parliament_code: string;
  parliament_name: string;
  district: string;
  month: string; // e.g. "2026-01"
  month_label: string; // e.g. "January 2026"
  additions: number;
  deletions: number;
  net: number;
  mom_delta: number; // month-over-month net delta vs previous month
  dun_breakdown: DptDunRow[];
}

export interface DptSummaryPerMonth {
  month: string;
  month_label: string;
  additions: number;
  deletions: number;
  net: number;
  parliament_count: number;
}

export interface DptSummaryPerParliament {
  parliament_code: string;
  parliament_name: string;
  additions: number;
  deletions: number;
  net: number;
  month_count: number;
}

export interface DptMethodologyInfo {
  pdf_producer: string;
  extraction_method: string;
  verified_in: string;
  age_scope: string;
  ramadan_note: string;
}

export interface DptSummaryDoc {
  state: string;
  state_code: string;
  months: string[];
  month_codes: string[];
  parliament_count: number;
  total_pdfs: number;
  total_additions: number;
  total_deletions: number;
  total_net: number;
  headline_feature: string;
  per_month: DptSummaryPerMonth[];
  per_parliament: DptSummaryPerParliament[];
  methodology: DptMethodologyInfo;
  evidence_tier: string;
}

// Engine intelligence row (matches p{N}/locality-intelligence.jsonl + dun-intelligence.jsonl shapes)
export interface EngineLocalityRow {
  level: "LOCALITY";
  geography: {
    parliament_code: string;
    dun_code: string;
    dun_name: string;
    dm_code: string;
    locality_code: string;
    locality_name: string;
    district: string;
  };
  metrics: {
    total_voters: number;
    voter_density_score?: string;
  };
}

export interface EngineDunRow {
  level: "DUN";
  geography: {
    parliament_code: string;
    dun_code: string;
    dun_name: string;
    district: string;
  };
  metrics: {
    total_voters: number;
    voter_density_score?: string;
  };
}
