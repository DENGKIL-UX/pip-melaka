// ponytail: MLK — adapter for engine aggregate JSONLs. Reads static files from
// /public/data/p{N}/. NEVER imports engine/*.py or *.js at runtime. Normalises
// state_code "12" → "04" on read (engine uses legacy SPR enumerator code;
// patching the engine would invalidate the source archive SHA-256 — see
// ENGINE-INTEGRATION.md §10.3). Forces evidence_tier "Proxy" until
// pipeline-provenance.json:verified == true. Defensive re-strip of PDPA fields.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = join(__dirname, "..", "..", "public", "data");

export type IntelligenceLevel =
  | "STATE"
  | "PARLIAMENT"
  | "DUN"
  | "DM"
  | "LOCALITY";

export type EvidenceTier = "Verified" | "Proxy" | "Indicative";

export interface Geography {
  state_code?: string;
  state_name?: string;
  parliament_code?: string;
  parliament_name?: string;
  dun_code?: string;
  dun_name?: string;
  dm_code?: string;
  dm_name?: string;
  locality_code?: string;
  locality_name?: string;
  district?: string;
  postcode?: string;
}

export interface IntelligenceMetrics {
  total_voters: number;
  male_voters: number;
  female_voters: number;
  other_or_unknown_gender_voters: number;
  senior_voters_56_plus: number;
  known_age_voters: number;
  voter_density_score: string;
  senior_dependency_percent: number;
  gender_balance_score: number;
  male_percent: number;
  female_percent: number;
  dominant_age_group: string;
  dominant_ethnicity_group: string;
  dominant_profession_group: string;
  profile_completeness_score: number;
  average_cleansing_confidence: number | null;
  clean_records: number;
  clean_with_flags_records: number;
}

export interface IntelligenceRecord {
  level: IntelligenceLevel;
  id: string;
  geography: Geography;
  metrics: IntelligenceMetrics;
  distributions?: {
    age_band_counts: Record<string, number>;
    ethnicity_counts: Record<string, number>;
    profession_group_counts: Record<string, number>;
  };
  evidence_tier: EvidenceTier;
  evidence_note?: string;
}

export interface ParliamentOverview {
  parliament_code: string;
  parliament_name: string;
  state_code: string;
  state_name: string;
  district: string;
  total_voters: number;
  dun_count: number;
  dm_count: number;
  locality_count: number;
  male_voters: number;
  female_voters: number;
  senior_voters_56_plus: number;
  dominant_ethnicity_group: string;
  dominant_age_group: string;
  gender_balance_score: number;
  senior_dependency_percent: number;
  profile_completeness_score: number;
  average_cleansing_confidence: number | null;
  clean_records: number;
  clean_with_flags_records: number;
  evidence_tier: EvidenceTier;
}

export interface PipelineProvenance {
  source_archive_sha256: string;
  script_versions: { profiler: string; cleanser: string; transformer: string };
  runtime: { node: string; python: string; pandas: string; openpyxl: string };
  entry_points: string[];
  salt_rotated: boolean;
  salt_sha256: string;
  ethnicity_bug_fixed: boolean;
  privacy_regression_fixed: boolean;
  orchestrator_present: boolean;
  audit_passed: boolean;
  audit_samples: Array<{ locality_id: string; verified_count: number }>;
  verified: boolean;
  verified_at: string | null;
}

// ponytail: MLK — defensive PDPA re-strip list (gate 7 hardening).
// The cleanser fix is in the contract; the adapter re-strips on read as
// defence in depth, in case the cleanser fix regresses in a future run.
const PDPA_RESTRIP_FIELDS = [
  "NO_RUMAH", "ALAMAT1", "ALAMAT2", "ALAMAT3",
  "POSKOD", "BANGSA", "AGAMA",
  "IC", "IC_LAMA", "IC_PERSONEL", "IC_SPOUSE",
  "NAMA", "NO_TEL_HF", "NOAHLI", "CATATAN",
];

function loadProvenance(): PipelineProvenance {
  try {
    const path = join(__dirname, "..", "data", "pipeline-provenance.json");
    if (!existsSync(path)) {
      return {
        source_archive_sha256: "",
        script_versions: { profiler: "1.1.0", cleanser: "1.1.0", transformer: "1.0.0" },
        runtime: { node: "", python: "", pandas: "", openpyxl: "" },
        entry_points: [],
        salt_rotated: false,
        salt_sha256: "",
        ethnicity_bug_fixed: false,
        privacy_regression_fixed: false,
        orchestrator_present: false,
        audit_passed: false,
        audit_samples: [],
        verified: false,
        verified_at: null,
      };
    }
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { verified: false } as PipelineProvenance;
  }
}

function normaliseStateCode(geography: Geography): Geography {
  // ponytail: MLK — state_code "12" → "04" normalisation on read.
  if (geography.state_code === "12") {
    return { ...geography, state_code: "04" };
  }
  return geography;
}

function defensiveReStrip(record: unknown): unknown {
  // ponytail: MLK — defensive PDPA re-strip. The cleanser fix (gate 7) is in
  // the contract; this is belt-and-suspenders in case a future cleanser run
  // regresses. Walks the record and deletes any PDPA_RESTRIP_FIELDS keys.
  if (!record || typeof record !== "object") return record;
  const r = record as Record<string, unknown>;
  for (const f of PDPA_RESTRIP_FIELDS) {
    if (f in r) delete r[f];
  }
  if (r.geography && typeof r.geography === "object") {
    const g = r.geography as Record<string, unknown>;
    for (const f of PDPA_RESTRIP_FIELDS) {
      if (f in g) delete g[f];
    }
  }
  return r;
}

function applyTier(record: IntelligenceRecord, provenance: PipelineProvenance): IntelligenceRecord {
  // ponytail: MLK — adapter forces Proxy tier until DG_ENGINE_VERSION closes
  // (provenance gate 9 audit_passed == true). Per ENGINE-INTEGRATION.md §6.5 rule 3.
  if (!provenance.verified) {
    return { ...record, evidence_tier: "Proxy" };
  }
  return { ...record, evidence_tier: record.evidence_tier === "Proxy" ? "Verified" : record.evidence_tier };
}

function readJsonl(path: string): IntelligenceRecord[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function parliamentCode(p: string): string {
  // Accept "p134", "P134", "134"
  const m = p.match(/(\d{3})/);
  return m ? m[1] : p;
}

export async function fetchIntelligence(
  parliament: string,
  level: IntelligenceLevel
): Promise<IntelligenceRecord[]> {
  const code = parliamentCode(parliament);
  const dir = join(PUBLIC_DATA, `p${code}`);
  const fileMap: Record<IntelligenceLevel, string> = {
    STATE: join(PUBLIC_DATA, "state", "state-intelligence.jsonl"),
    PARLIAMENT: join(dir, "parliament-intelligence.jsonl"),
    DUN: join(dir, "dun-intelligence.jsonl"),
    DM: join(dir, "dm-intelligence.jsonl"),
    LOCALITY: join(dir, "locality-intelligence.jsonl"),
  };
  const path = fileMap[level];
  if (!existsSync(path)) return [];
  const provenance = loadProvenance();
  const records = readJsonl(path)
    .map((r) => defensiveReStrip(r) as IntelligenceRecord)
    .map((r) => ({ ...r, geography: normaliseStateCode(r.geography) }))
    .filter((r) => r.level === level)
    .map((r) => applyTier(r, provenance));
  return records;
}

export async function fetchOverview(parliament: string): Promise<ParliamentOverview | null> {
  const code = parliamentCode(parliament);
  const path = join(PUBLIC_DATA, `p${code}`, "dashboard-overview.json");
  if (!existsSync(path)) return null;
  const overview = JSON.parse(readFileSync(path, "utf8")) as ParliamentOverview;
  const provenance = loadProvenance();
  // Normalise state_code and apply tier
  overview.state_code = overview.state_code === "12" ? "04" : overview.state_code;
  if (!provenance.verified) {
    overview.evidence_tier = "Proxy";
  } else if (overview.evidence_tier === "Proxy") {
    overview.evidence_tier = "Verified";
  }
  return overview;
}

export async function fetchAllOverviews(): Promise<ParliamentOverview[]> {
  const codes = ["134", "135", "136", "137", "138", "139"];
  const results = await Promise.all(codes.map((c) => fetchOverview(c)));
  return results.filter((o): o is ParliamentOverview => o !== null);
}

export async function fetchManifest(parliament: string): Promise<Record<string, unknown> | null> {
  const code = parliamentCode(parliament);
  const path = join(PUBLIC_DATA, `p${code}`, "transformation-manifest.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function fetchProvenanceSync(): PipelineProvenance {
  return loadProvenance();
}
