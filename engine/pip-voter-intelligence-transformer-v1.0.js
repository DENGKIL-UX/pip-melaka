#!/usr/bin/env node
"use strict";

/**
 * PIP Voter Intelligence Transformer v1.0
 * --------------------------------------
 * Dependency-free CommonJS transformer for PIP Voter Intelligence.
 *
 * Primary input:
 *   data/clean/P134-full/voter-cleaned.jsonl
 *
 * Primary outputs:
 *   data/transform/P134-full/
 *
 * Design goals:
 *   - Stream 71k+ records without loading the full voter dataset into memory.
 *   - Preserve P134 pseudonymised identity model:
 *       VTR_ID, VTR_LABEL, VOTER_ID_HASH
 *   - Never emit privacy-removed legacy fields.
 *   - Carry cleanser disposition/confidence.
 *   - Derive dashboard-ready voter profiles and geographic aggregates.
 *   - Operate without ontology; optionally attach ontology metadata when present.
 *   - Use only Node built-in modules.
 */

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline");
const crypto = require("node:crypto");

const VERSION = "1.0.0";
const ARTIFACT = "pip-voter-intelligence-transformer-v1.0.js";

const DEFAULT_INPUT = path.resolve("data/clean/P134-full/voter-cleaned.jsonl");
const DEFAULT_OUTPUT_DIR = path.resolve("data/transform/P134-full");
const DEFAULT_CONTRACT = path.resolve("contracts/pip-voter-source-contract-p134-v1.0.json");

const PRIVACY_REMOVED_FIELDS = new Set([
  "IC",
  "IC_LAMA",
  "IC_PERSONEL",
  "IC_SPOUSE",
  "NAMA",
  "NO_TEL_HF",
  "NOAHLI",
  "CATATAN",
]);

const CORE_COMPLETENESS_FIELDS = [
  "VTR_ID",
  "VOTER_ID_HASH",
  "JANTINA",
  "UMUR",
  "KAUM",
  "LOKALITI",
  "DM",
  "DUN",
  "PARLIMEN",
  "NEGERI",
  "POSKOD",
];

function fail(message, exitCode = 1) {
  console.error(`ERROR: ${message}`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = {
    input: DEFAULT_INPUT,
    outputDir: DEFAULT_OUTPUT_DIR,
    contract: fs.existsSync(DEFAULT_CONTRACT) ? DEFAULT_CONTRACT : null,
    ontology: null,
    strict: false,
    selfCheck: false,
    pretty: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") out.input = path.resolve(argv[++i]);
    else if (arg === "--output-dir") out.outputDir = path.resolve(argv[++i]);
    else if (arg === "--contract") out.contract = path.resolve(argv[++i]);
    else if (arg === "--ontology") out.ontology = path.resolve(argv[++i]);
    else if (arg === "--strict") out.strict = true;
    else if (arg === "--self-check") out.selfCheck = true;
    else if (arg === "--pretty") out.pretty = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return out;
}

function printHelp() {
  console.log(`
PIP Voter Intelligence Transformer v${VERSION}

Usage:
  node ${ARTIFACT} [options]

Options:
  --input <file>        Input cleaned JSONL file.
  --output-dir <dir>    Output directory.
  --contract <file>     Optional P134 source contract JSON.
  --ontology <file>     Optional PIP ontology JSON.
  --strict              Fail on record-level transformation errors.
  --pretty              Pretty-print JSON aggregate outputs.
  --self-check          Run deterministic internal checks and exit.
  -h, --help            Show help.
`);
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isPresent(value) {
  return asString(value) !== "";
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round(n, digits = 4) {
  if (!Number.isFinite(n)) return null;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function normalizeToken(value) {
  return asString(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function upper(value) {
  return normalizeToken(value).toUpperCase();
}

function safeKey(value, fallback = "UNKNOWN") {
  const s = normalizeToken(value);
  return s || fallback;
}

function firstPresent(record, fields) {
  for (const field of fields) {
    if (isPresent(record[field])) return record[field];
  }
  return "";
}

function normalizeGender(value) {
  const v = upper(value);
  if (["L", "LELAKI", "MALE", "M", "MAN"].includes(v)) return "MALE";
  if (["P", "PEREMPUAN", "FEMALE", "F", "WOMAN"].includes(v)) return "FEMALE";
  return v ? "OTHER_OR_UNKNOWN" : "UNKNOWN";
}

function normalizeEthnicity(record) {
  const raw = upper(firstPresent(record, ["BANGSA", "KAUM2", "KAUM"]));
  if (!raw) return "UNKNOWN";
  if (/MELAYU|MALAY/.test(raw)) return "MALAY";
  if (/CINA|CHINESE/.test(raw)) return "CHINESE";
  if (/INDIA|INDIAN/.test(raw)) return "INDIAN";
  if (/BUMIPUTERA|BUMIPUTRA|IBAN|KADAZAN|DUSUN|BIDAYUH|MELANAU|ORANG ASLI/.test(raw)) {
    return "BUMIPUTERA";
  }
  return "OTHER";
}

function deriveAge(record) {
  const direct = asNumber(record.UMUR);
  if (direct !== null) return Math.trunc(direct);
  const birthYear = asNumber(record.TAHUN_LAHIR);
  if (birthYear !== null) {
    const currentYear = new Date().getUTCFullYear();
    const age = currentYear - Math.trunc(birthYear);
    if (age >= 0 && age <= 130) return age;
  }
  return null;
}

function ageBand(age) {
  if (age === null) return "UNKNOWN";
  if (age < 18) return "UNDER_18";
  if (age <= 20) return "18_20";
  if (age <= 29) return "21_29";
  if (age <= 39) return "30_39";
  if (age <= 49) return "40_49";
  if (age <= 55) return "50_55";
  if (age <= 64) return "56_64";
  return "65_PLUS";
}

function classifyProfession(value) {
  const v = upper(value);
  if (!v) return "UNKNOWN";
  if (/PESARA|PENSION|RETIREE|BERSARA/.test(v)) return "RETIREE_PENSIONER";
  if (/KERAJAAN|AWAM|GOVERNMENT|CIVIL SERVANT|TENTERA|POLIS|GURU|CIKGU/.test(v)) {
    return "PUBLIC_SECTOR";
  }
  if (/PENGURUS|MANAGER|DIRECTOR|DIREKTOR|KETUA|EKSEKUTIF|EXECUTIVE|PROFESIONAL|PROFESSIONAL/.test(v)) {
    return "SENIOR_WORKER";
  }
  if (/PEKERJA|WORKER|CLERK|KERANI|OPERATOR|TECHNICIAN|JURUTEKNIK|PEGAWAI|KAKITANGAN|STAFF/.test(v)) {
    return "SALARIED_WORKER";
  }
  return "OTHER";
}

function buildGeography(record) {
  return {
    state_code: normalizeToken(firstPresent(record, ["NEGERI_CODE"])),
    state_name: normalizeToken(firstPresent(record, ["NEGERI_NAME", "NEGERI"])),
    parliament_code: normalizeToken(firstPresent(record, ["PARLIMEN_CODE"])),
    parliament_name: normalizeToken(firstPresent(record, ["PARLIMEN_NAME", "PARLIMEN"])),
    dun_code: normalizeToken(firstPresent(record, ["DUN_CODE"])),
    dun_name: normalizeToken(firstPresent(record, ["DUN_NAME", "DUN"])),
    dm_code: normalizeToken(firstPresent(record, ["DM_CODE"])),
    dm_name: normalizeToken(firstPresent(record, ["DM_NAME", "DM"])),
    locality_code: normalizeToken(firstPresent(record, ["LOKALITI_CODE"])),
    locality_name: normalizeToken(firstPresent(record, ["LOKALITI_NAME", "LOKALITI"])),
    postcode: normalizeToken(record.POSKOD),
  };
}

function geographyId(level, geo) {
  const partsByLevel = {
    state: [geo.state_code, geo.state_name],
    parliament: [geo.state_code, geo.parliament_code, geo.parliament_name],
    dun: [geo.state_code, geo.parliament_code, geo.dun_code, geo.dun_name],
    dm: [geo.state_code, geo.parliament_code, geo.dun_code, geo.dm_code, geo.dm_name],
    locality: [
      geo.state_code,
      geo.parliament_code,
      geo.dun_code,
      geo.dm_code,
      geo.locality_code,
      geo.locality_name,
    ],
  };
  const parts = (partsByLevel[level] || []).map((v) => safeKey(v)).join("|");
  return `${level.toUpperCase()}:${parts}`;
}

function completenessScore(record) {
  let present = 0;
  for (const field of CORE_COMPLETENESS_FIELDS) {
    if (isPresent(record[field])) present += 1;
  }
  return round((present / CORE_COMPLETENESS_FIELDS.length) * 100, 2);
}

function buildProfiles(record) {
  const age = deriveAge(record);
  const gender = normalizeGender(record.JANTINA);
  const ethnicity = normalizeEthnicity(record);
  const professionGroup = classifyProfession(record.PROFESSION);
  return {
    age,
    age_band: ageBand(age),
    is_senior_56_plus: age !== null ? age >= 56 : null,
    gender,
    ethnicity,
    profession_group: professionGroup,
    religion: normalizeToken(record.AGAMA),
    profile_completeness_score: completenessScore(record),
  };
}

function buildVoterOutput(record, sourceLine) {
  const voterIdHash = normalizeToken(record.VOTER_ID_HASH);
  if (!voterIdHash) throw new Error("Missing VOTER_ID_HASH");

  const geo = buildGeography(record);
  const profiles = buildProfiles(record);
  const disposition = normalizeToken(record.__CLEANSING_DISPOSITION) || "UNKNOWN";
  const cleansingConfidence = asNumber(record.__CLEANSING_CONFIDENCE);

  return {
    VTR_ID: normalizeToken(record.VTR_ID),
    VTR_LABEL: normalizeToken(record.VTR_LABEL),
    VOTER_ID_HASH: voterIdHash,
    voter_id_hash: voterIdHash,
    voter_source_id: normalizeToken(record.VTR_ID),
    voter_label: normalizeToken(record.VTR_LABEL),
    demographics: {
      gender: profiles.gender,
      age: profiles.age,
      age_band: profiles.age_band,
      is_senior_56_plus: profiles.is_senior_56_plus,
      ethnicity: profiles.ethnicity,
      religion: profiles.religion,
    },
    profession: {
      raw: normalizeToken(record.PROFESSION),
      group: profiles.profession_group,
    },
    geography: geo,
    electoral: {
      voter_category: normalizeToken(record.KATEGORIPEMILIH),
      voter_status: normalizeToken(record.STATUSPEMILIH),
      party_code: normalizeToken(record.KODPARTI),
      attitude: normalizeToken(record.SIKAP),
      status: normalizeToken(record.STATUS),
      outside_area: normalizeToken(record.KAWASAN_LUAR),
    },
    profiles: {
      profile_completeness_score: profiles.profile_completeness_score,
    },
    quality: {
      cleansing_disposition: disposition,
      cleansing_confidence: cleansingConfidence,
      review_required: disposition === "CLEAN_WITH_FLAGS",
    },
    lineage: {
      source_line: sourceLine,
      source_row_ref: normalizeToken(record.__SOURCE_ROW_REF),
      source_unit: normalizeToken(record.__SOURCE_UNIT),
      transformed_at_utc: new Date().toISOString(),
      transformer_version: VERSION,
    },
  };
}

function newAggregate(level, id, geo) {
  return {
    level,
    id,
    geography: geo,
    total_voters: 0,
    male_voters: 0,
    female_voters: 0,
    other_or_unknown_gender_voters: 0,
    senior_voters_56_plus: 0,
    known_age_voters: 0,
    age_band_counts: Object.create(null),
    ethnicity_counts: Object.create(null),
    profession_group_counts: Object.create(null),
    clean_records: 0,
    clean_with_flags_records: 0,
    completeness_sum: 0,
    cleansing_confidence_sum: 0,
    cleansing_confidence_count: 0,
  };
}

function incrementCounter(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function updateAggregate(agg, voter) {
  agg.total_voters += 1;

  if (voter.demographics.gender === "MALE") agg.male_voters += 1;
  else if (voter.demographics.gender === "FEMALE") agg.female_voters += 1;
  else agg.other_or_unknown_gender_voters += 1;

  if (voter.demographics.age !== null) agg.known_age_voters += 1;
  if (voter.demographics.is_senior_56_plus === true) agg.senior_voters_56_plus += 1;

  incrementCounter(agg.age_band_counts, voter.demographics.age_band || "UNKNOWN");
  incrementCounter(agg.ethnicity_counts, voter.demographics.ethnicity || "UNKNOWN");
  incrementCounter(agg.profession_group_counts, voter.profession.group || "UNKNOWN");

  if (voter.quality.cleansing_disposition === "CLEAN") agg.clean_records += 1;
  if (voter.quality.cleansing_disposition === "CLEAN_WITH_FLAGS") agg.clean_with_flags_records += 1;

  const completeness = asNumber(voter.profiles.profile_completeness_score);
  if (completeness !== null) agg.completeness_sum += completeness;

  const cc = asNumber(voter.quality.cleansing_confidence);
  if (cc !== null) {
    agg.cleansing_confidence_sum += cc;
    agg.cleansing_confidence_count += 1;
  }
}

function dominantKey(counter) {
  let bestKey = "UNKNOWN";
  let bestCount = -1;
  for (const [key, count] of Object.entries(counter)) {
    if (count > bestCount || (count === bestCount && key < bestKey)) {
      bestKey = key;
      bestCount = count;
    }
  }
  return { key: bestKey, count: Math.max(0, bestCount) };
}

function voterDensityBand(total) {
  if (total > 1000) return "HIGH";
  if (total >= 500) return "MEDIUM";
  return "LOW";
}

function finalizeAggregate(agg) {
  const total = agg.total_voters || 0;
  const malePct = total ? (agg.male_voters / total) * 100 : 0;
  const femalePct = total ? (agg.female_voters / total) * 100 : 0;
  const seniorPct = total ? (agg.senior_voters_56_plus / total) * 100 : 0;
  const genderBalanceScore = clamp(100 - Math.abs(malePct - femalePct), 0, 100);
  const dominantAge = dominantKey(agg.age_band_counts);
  const dominantEthnicity = dominantKey(agg.ethnicity_counts);
  const dominantProfession = dominantKey(agg.profession_group_counts);

  return {
    level: agg.level,
    id: agg.id,
    geography: agg.geography,
    metrics: {
      total_voters: total,
      male_voters: agg.male_voters,
      female_voters: agg.female_voters,
      other_or_unknown_gender_voters: agg.other_or_unknown_gender_voters,
      senior_voters_56_plus: agg.senior_voters_56_plus,
      known_age_voters: agg.known_age_voters,
      voter_density_score: voterDensityBand(total),
      senior_dependency_percent: round(seniorPct, 4),
      gender_balance_score: round(genderBalanceScore, 4),
      male_percent: round(malePct, 4),
      female_percent: round(femalePct, 4),
      dominant_age_group: dominantAge.key,
      dominant_ethnicity_group: dominantEthnicity.key,
      dominant_profession_group: dominantProfession.key,
      profile_completeness_score: total ? round(agg.completeness_sum / total, 4) : 0,
      average_cleansing_confidence: agg.cleansing_confidence_count
        ? round(agg.cleansing_confidence_sum / agg.cleansing_confidence_count, 6)
        : null,
      clean_records: agg.clean_records,
      clean_with_flags_records: agg.clean_with_flags_records,
    },
    distributions: {
      age_band_counts: agg.age_band_counts,
      ethnicity_counts: agg.ethnicity_counts,
      profession_group_counts: agg.profession_group_counts,
    },
  };
}

function pickGeoForLevel(level, geo) {
  const common = {
    state_code: geo.state_code,
    state_name: geo.state_name,
  };
  if (level === "state") return common;
  Object.assign(common, {
    parliament_code: geo.parliament_code,
    parliament_name: geo.parliament_name,
  });
  if (level === "parliament") return common;
  Object.assign(common, {
    dun_code: geo.dun_code,
    dun_name: geo.dun_name,
  });
  if (level === "dun") return common;
  Object.assign(common, {
    dm_code: geo.dm_code,
    dm_name: geo.dm_name,
  });
  if (level === "dm") return common;
  Object.assign(common, {
    locality_code: geo.locality_code,
    locality_name: geo.locality_name,
    postcode: geo.postcode,
  });
  return common;
}

function getOrCreateAggregate(map, level, geo) {
  const id = geographyId(level, geo);
  if (!map.has(id)) map.set(id, newAggregate(level, id, pickGeoForLevel(level, geo)));
  return map.get(id);
}

function csvEscape(value) {
  const s = asString(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function loadJsonMaybe(filePath) {
  if (!filePath) return null;
  const raw = await fsp.readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function contractSummary(contract) {
  if (!contract) return null;
  const scope = contract.source_scope || contract.sourceScope || {};
  return {
    contract_type: contract.contract_type || contract.type || null,
    expected_source_field_count:
      scope.expected_source_field_count ?? scope.physical_source_field_count ?? null,
    source_schema_mode: scope.source_schema_mode || null,
  };
}

function ontologySummary(ontology) {
  if (!ontology) return null;
  return {
    name: ontology.name || ontology.title || ontology.ontology_name || null,
    version: ontology.version || ontology.ontology_version || null,
  };
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

async function writeJson(filePath, value, pretty) {
  const text = JSON.stringify(value, null, pretty ? 2 : 0) + "\n";
  await fsp.writeFile(filePath, text, "utf8");
}

async function writeJsonlAggregates(filePath, map) {
  const stream = fs.createWriteStream(filePath, { encoding: "utf8" });
  for (const agg of map.values()) {
    if (!stream.write(JSON.stringify(finalizeAggregate(agg)) + "\n")) {
      await new Promise((resolve) => stream.once("drain", resolve));
    }
  }
  await new Promise((resolve, reject) => {
    stream.end(resolve);
    stream.on("error", reject);
  });
}

function selfCheck() {
  const checks = [];
  const add = (name, passed, detail = null) => checks.push({ name, passed, detail });

  add("gender_male", normalizeGender("LELAKI") === "MALE");
  add("gender_female", normalizeGender("PEREMPUAN") === "FEMALE");
  add("age_band_56", ageBand(56) === "56_64");
  add("density_low", voterDensityBand(499) === "LOW");
  add("density_medium", voterDensityBand(500) === "MEDIUM");
  add("density_high", voterDensityBand(1001) === "HIGH");
  add(
    "privacy_removed_set",
    PRIVACY_REMOVED_FIELDS.has("IC") && PRIVACY_REMOVED_FIELDS.has("NAMA"),
  );

  const passed = checks.every((c) => c.passed);
  console.log(JSON.stringify({ artifact: ARTIFACT, version: VERSION, passed, checks }, null, 2));
  process.exit(passed ? 0 : 2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.selfCheck) selfCheck();

  if (!fs.existsSync(args.input)) fail(`Input file not found: ${args.input}`);
  if (args.contract && !fs.existsSync(args.contract)) fail(`Contract file not found: ${args.contract}`);
  if (args.ontology && !fs.existsSync(args.ontology)) fail(`Ontology file not found: ${args.ontology}`);

  await fsp.mkdir(args.outputDir, { recursive: true });

  const contract = await loadJsonMaybe(args.contract);
  const ontology = await loadJsonMaybe(args.ontology);
  const startedAt = new Date();
  const runId = `PVT_${startedAt.toISOString().replace(/[-:.]/g, "").replace("Z", "Z")}_${crypto
    .randomBytes(4)
    .toString("hex")}`;

  const voterOutPath = path.join(args.outputDir, "voter-intelligence.jsonl");
  const issuePath = path.join(args.outputDir, "transform-issues.csv");
  const voterStream = fs.createWriteStream(voterOutPath, { encoding: "utf8" });
  const issueStream = fs.createWriteStream(issuePath, { encoding: "utf8" });
  issueStream.write("source_line,severity,code,message\n");

  const aggregates = {
    state: new Map(),
    parliament: new Map(),
    dun: new Map(),
    dm: new Map(),
    locality: new Map(),
  };

  const counters = {
    input_records: 0,
    transformed_records: 0,
    failed_records: 0,
    clean_records: 0,
    clean_with_flags_records: 0,
    review_required_records: 0,
  };

  const uniqueHashes = new Set();
  let duplicateHashRecords = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(args.input, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    counters.input_records += 1;
    const sourceLine = counters.input_records;

    try {
      const record = JSON.parse(line);

      for (const forbidden of PRIVACY_REMOVED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(record, forbidden)) {
          throw new Error(`Privacy-removed field present: ${forbidden}`);
        }
      }

      const voter = buildVoterOutput(record, sourceLine);
      if (uniqueHashes.has(voter.voter_id_hash)) duplicateHashRecords += 1;
      else uniqueHashes.add(voter.voter_id_hash);

      if (voter.quality.cleansing_disposition === "CLEAN") counters.clean_records += 1;
      if (voter.quality.cleansing_disposition === "CLEAN_WITH_FLAGS") {
        counters.clean_with_flags_records += 1;
      }
      if (voter.quality.review_required) counters.review_required_records += 1;

      for (const level of Object.keys(aggregates)) {
        const agg = getOrCreateAggregate(aggregates[level], level, voter.geography);
        updateAggregate(agg, voter);
      }

      if (!voterStream.write(JSON.stringify(voter) + "\n")) {
        await new Promise((resolve) => voterStream.once("drain", resolve));
      }
      counters.transformed_records += 1;
    } catch (error) {
      counters.failed_records += 1;
      issueStream.write(
        [sourceLine, "ERROR", "TRANSFORM_RECORD_FAILED", error.message].map(csvEscape).join(",") + "\n",
      );
      if (args.strict) throw error;
    }
  }

  await Promise.all([
    new Promise((resolve, reject) => {
      voterStream.end(resolve);
      voterStream.on("error", reject);
    }),
    new Promise((resolve, reject) => {
      issueStream.end(resolve);
      issueStream.on("error", reject);
    }),
  ]);

  await writeJsonlAggregates(path.join(args.outputDir, "state-intelligence.jsonl"), aggregates.state);
  await writeJsonlAggregates(
    path.join(args.outputDir, "parliament-intelligence.jsonl"),
    aggregates.parliament,
  );
  await writeJsonlAggregates(path.join(args.outputDir, "dun-intelligence.jsonl"), aggregates.dun);
  await writeJsonlAggregates(path.join(args.outputDir, "dm-intelligence.jsonl"), aggregates.dm);
  await writeJsonlAggregates(
    path.join(args.outputDir, "locality-intelligence.jsonl"),
    aggregates.locality,
  );

  const overall = newAggregate("overall", "OVERALL", {});
  for (const agg of aggregates.state.values()) {
    overall.total_voters += agg.total_voters;
    overall.male_voters += agg.male_voters;
    overall.female_voters += agg.female_voters;
    overall.other_or_unknown_gender_voters += agg.other_or_unknown_gender_voters;
    overall.senior_voters_56_plus += agg.senior_voters_56_plus;
    overall.known_age_voters += agg.known_age_voters;
    overall.clean_records += agg.clean_records;
    overall.clean_with_flags_records += agg.clean_with_flags_records;
    overall.completeness_sum += agg.completeness_sum;
    overall.cleansing_confidence_sum += agg.cleansing_confidence_sum;
    overall.cleansing_confidence_count += agg.cleansing_confidence_count;
    for (const [k, v] of Object.entries(agg.age_band_counts)) overall.age_band_counts[k] = (overall.age_band_counts[k] || 0) + v;
    for (const [k, v] of Object.entries(agg.ethnicity_counts)) overall.ethnicity_counts[k] = (overall.ethnicity_counts[k] || 0) + v;
    for (const [k, v] of Object.entries(agg.profession_group_counts)) overall.profession_group_counts[k] = (overall.profession_group_counts[k] || 0) + v;
  }

  const dashboardOverview = {
    artifact: "PIP_VOTER_DASHBOARD_OVERVIEW",
    schema_version: "1.0",
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    source: {
      input_file: args.input,
      contract: contractSummary(contract),
      ontology: ontologySummary(ontology),
      transform_mode: ontology ? "ONTOLOGY_AWARE" : "SOURCE_CONTRACT_FALLBACK",
    },
    overview: finalizeAggregate(overall),
    geography_counts: {
      states: aggregates.state.size,
      parliaments: aggregates.parliament.size,
      duns: aggregates.dun.size,
      dms: aggregates.dm.size,
      localities: aggregates.locality.size,
    },
    record_quality: {
      transformed_records: counters.transformed_records,
      failed_records: counters.failed_records,
      clean_records: counters.clean_records,
      clean_with_flags_records: counters.clean_with_flags_records,
      review_required_records: counters.review_required_records,
      duplicate_voter_id_hash_records: duplicateHashRecords,
    },
  };

  await writeJson(path.join(args.outputDir, "dashboard-overview.json"), dashboardOverview, args.pretty);

  const endedAt = new Date();
  const inputSha256 = await sha256File(args.input);
  const manifest = {
    artifact: "PIP_VOTER_INTELLIGENCE_TRANSFORM_OUTPUT",
    transformer: ARTIFACT,
    transformer_version: VERSION,
    run_id: runId,
    started_at_utc: startedAt.toISOString(),
    completed_at_utc: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    input: {
      file: args.input,
      sha256: inputSha256,
      records: counters.input_records,
    },
    contract: contractSummary(contract),
    ontology: ontologySummary(ontology),
    transform_mode: ontology ? "ONTOLOGY_AWARE" : "SOURCE_CONTRACT_FALLBACK",
    results: {
      ...counters,
      unique_voter_id_hashes: uniqueHashes.size,
      duplicate_voter_id_hash_records: duplicateHashRecords,
      aggregate_counts: {
        states: aggregates.state.size,
        parliaments: aggregates.parliament.size,
        duns: aggregates.dun.size,
        dms: aggregates.dm.size,
        localities: aggregates.locality.size,
      },
    },
    privacy: {
      removed_fields_enforced: Array.from(PRIVACY_REMOVED_FIELDS),
    },
    outputs: {
      voter_intelligence_jsonl: "voter-intelligence.jsonl",
      locality_intelligence_jsonl: "locality-intelligence.jsonl",
      dm_intelligence_jsonl: "dm-intelligence.jsonl",
      dun_intelligence_jsonl: "dun-intelligence.jsonl",
      parliament_intelligence_jsonl: "parliament-intelligence.jsonl",
      state_intelligence_jsonl: "state-intelligence.jsonl",
      dashboard_overview_json: "dashboard-overview.json",
      transform_issues_csv: "transform-issues.csv",
    },
  };

  await writeJson(path.join(args.outputDir, "transformation-manifest.json"), manifest, true);

  const status = counters.failed_records === 0 && duplicateHashRecords === 0 ? "SUCCESS" : "SUCCESS_WITH_WARNINGS";
  const summary = {
    status,
    run_id: runId,
    transformer_version: VERSION,
    input_records: counters.input_records,
    transformed_records: counters.transformed_records,
    failed_records: counters.failed_records,
    unique_voter_id_hashes: uniqueHashes.size,
    duplicate_voter_id_hash_records: duplicateHashRecords,
    clean_records: counters.clean_records,
    clean_with_flags_records: counters.clean_with_flags_records,
    output_dir: args.outputDir,
    dashboard_overview: path.join(args.outputDir, "dashboard-overview.json"),
    manifest: path.join(args.outputDir, "transformation-manifest.json"),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (args.strict && status !== "SUCCESS") process.exitCode = 2;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
