export const PIP_360_GEOGRAPHY_MAPPING_CONTRACT_SCHEMA =
  "pip.360-geography-mapping.contract.v1";

export const PIP_360_GEOGRAPHY_HINT_SCHEMA =
  "pip.360-geography-hint.v1";

export const PIP_360_MAPPED_SIGNAL_SCHEMA =
  "pip.360-mapped-signal.v1";

export const PIP_360_GEOGRAPHY_MAPPING_SUMMARY_SCHEMA =
  "pip.360-geography-mapping-summary.v1";

export const PIP_360_GEOGRAPHY_LEVELS = Object.freeze({
  STATE: "STATE",
  PARLIAMENT: "PARLIAMENT",
  DUN: "DUN",
  DM: "DM",
  LOCALITY: "LOCALITY",
});

export const PIP_360_GEOGRAPHY_MAPPING_STATUSES = Object.freeze({
  MAPPED: "MAPPED",
  PARTIALLY_MAPPED: "PARTIALLY_MAPPED",
  AMBIGUOUS: "AMBIGUOUS",
  UNMAPPED: "UNMAPPED",
  INVALID: "INVALID",
});

export const PIP_360_GEOGRAPHY_MAPPING_METHODS = Object.freeze({
  EXACT_CODE_CHAIN: "EXACT_CODE_CHAIN",
  EXACT_NORMALIZED_NAME_CHAIN: "EXACT_NORMALIZED_NAME_CHAIN",
  EXACT_PARENT_CODE: "EXACT_PARENT_CODE",
  EXACT_PARENT_NAME: "EXACT_PARENT_NAME",
  NO_MATCH: "NO_MATCH",
});

export const PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES = Object.freeze({
  VERIFIED: "VERIFIED",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

const ALLOWED_HINT_KEYS = new Set([
  "schema",
  "signal_id",
  "source_system",
  "source_record_id",
  "observed_at",
  "state_code",
  "state_name",
  "parliament_code",
  "parliament_name",
  "dun_code",
  "dun_name",
  "dm_code",
  "dm_name",
  "locality_code",
  "locality_name",
]);

const FORBIDDEN_KEY_PATTERN =
  /(voter|address|phone|telephone|email|username|account|comment|content|sentiment|issue|narrative|preference|demographic)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, max = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function hasForbiddenKeys(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeys(entry));
  }
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, entry]) => {
    if (FORBIDDEN_KEY_PATTERN.test(String(key))) {
      return true;
    }
    return hasForbiddenKeys(entry);
  });
}

export function normalizePip360GeographyToken(value) {
  return sanitizeText(value, 160)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function buildPip360GeographyMappingContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_360_GEOGRAPHY_MAPPING_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    geography_hint_schema: PIP_360_GEOGRAPHY_HINT_SCHEMA,
    mapped_signal_schema: PIP_360_MAPPED_SIGNAL_SCHEMA,
    summary_schema: PIP_360_GEOGRAPHY_MAPPING_SUMMARY_SCHEMA,
    geography_levels: { ...PIP_360_GEOGRAPHY_LEVELS },
    mapping_statuses: { ...PIP_360_GEOGRAPHY_MAPPING_STATUSES },
    mapping_methods: { ...PIP_360_GEOGRAPHY_MAPPING_METHODS },
    confidence_classes: { ...PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES },
    summary: {
      descriptive_geography_mapping_only: true,
      population_context_mutation_enabled: false,
      public_signal_content_persisted: false,
      demographic_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      fuzzy_name_matching_enabled: false,
      cross_parent_locality_matching_enabled: false,
      automatic_geocoding_enabled: false,
      external_network_geocoding_enabled: false,
      raw_voter_data_included: false,
      browser_storage_modified: false,
      source_records_modified: false,
      p999_validation_fixture_separated: true,
    },
  };
}

export function validatePip360GeographyMappingContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  if (safe.schema !== PIP_360_GEOGRAPHY_MAPPING_CONTRACT_SCHEMA) {
    errors.push("Contract schema mismatch.");
  }
  if (safe.geography_hint_schema !== PIP_360_GEOGRAPHY_HINT_SCHEMA) {
    errors.push("Geography hint schema mismatch.");
  }
  if (safe.mapped_signal_schema !== PIP_360_MAPPED_SIGNAL_SCHEMA) {
    errors.push("Mapped signal schema mismatch.");
  }
  if (safe.summary_schema !== PIP_360_GEOGRAPHY_MAPPING_SUMMARY_SCHEMA) {
    errors.push("Summary schema mismatch.");
  }

  const requiredFlags = {
    descriptive_geography_mapping_only: true,
    population_context_mutation_enabled: false,
    public_signal_content_persisted: false,
    demographic_inference_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    fuzzy_name_matching_enabled: false,
    cross_parent_locality_matching_enabled: false,
    automatic_geocoding_enabled: false,
    external_network_geocoding_enabled: false,
    raw_voter_data_included: false,
    browser_storage_modified: false,
    source_records_modified: false,
    p999_validation_fixture_separated: true,
  };

  Object.entries(requiredFlags).forEach(([key, expected]) => {
    if (summary[key] !== expected) {
      errors.push(`${key} must be ${String(expected)}.`);
    }
  });

  [
    ["geography_levels", PIP_360_GEOGRAPHY_LEVELS],
    ["mapping_statuses", PIP_360_GEOGRAPHY_MAPPING_STATUSES],
    ["mapping_methods", PIP_360_GEOGRAPHY_MAPPING_METHODS],
    ["confidence_classes", PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES],
  ].forEach(([key, expected]) => {
    if (JSON.stringify(safe[key]) !== JSON.stringify(expected)) {
      errors.push(`${key} must match the exported constant set.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function sanitizePip360SignalGeographyHint(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_360_GEOGRAPHY_HINT_SCHEMA,
    signal_id: sanitizeText(safe.signal_id, 80).toUpperCase(),
    source_system: sanitizeText(safe.source_system, 80).toUpperCase(),
    source_record_id: sanitizeText(safe.source_record_id, 120).toUpperCase(),
    observed_at: normalizeIso(safe.observed_at),
    state_code: sanitizeText(safe.state_code, 24).toUpperCase(),
    state_name: sanitizeText(safe.state_name, 120).toUpperCase(),
    parliament_code: sanitizeText(safe.parliament_code, 24).toUpperCase(),
    parliament_name: sanitizeText(safe.parliament_name, 120).toUpperCase(),
    dun_code: sanitizeText(safe.dun_code, 24).toUpperCase(),
    dun_name: sanitizeText(safe.dun_name, 120).toUpperCase(),
    dm_code: sanitizeText(safe.dm_code, 24).toUpperCase(),
    dm_name: sanitizeText(safe.dm_name, 120).toUpperCase(),
    locality_code: sanitizeText(safe.locality_code, 32).toUpperCase(),
    locality_name: sanitizeText(safe.locality_name, 160).toUpperCase(),
  };
}

export function validatePip360SignalGeographyHint(input = {}) {
  const errors = [];
  if (!isPlainObject(input)) {
    errors.push("Geography hint must be a plain object.");
    return {
      valid: false,
      errors,
      normalized: sanitizePip360SignalGeographyHint({}),
    };
  }

  const keys = Object.keys(input);
  if (keys.some((key) => !ALLOWED_HINT_KEYS.has(String(key).trim()))) {
    errors.push("Geography hint contains unsupported fields.");
  }
  if (hasForbiddenKeys(input)) {
    errors.push("Geography hint contains forbidden field names.");
  }

  const normalized = sanitizePip360SignalGeographyHint(input);
  if (normalized.schema !== PIP_360_GEOGRAPHY_HINT_SCHEMA) {
    errors.push("Geography hint schema mismatch.");
  }
  if (!normalized.signal_id) {
    errors.push("signal_id is required.");
  }
  if (!normalized.source_system) {
    errors.push("source_system is required.");
  }
  if (!normalized.source_record_id) {
    errors.push("source_record_id is required.");
  }
  if (normalized.observed_at === null) {
    errors.push("observed_at must be an ISO-8601 timestamp.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

export function sanitizePip360MappedSignal(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const supplied = sanitizePip360SignalGeographyHint(
    isPlainObject(safe.supplied_geography) ? safe.supplied_geography : safe
  );
  const mapped = isPlainObject(safe.mapped_geography) ? safe.mapped_geography : {};
  const evidence = isPlainObject(safe.evidence) ? safe.evidence : {};
  return {
    schema: PIP_360_MAPPED_SIGNAL_SCHEMA,
    signal_id: supplied.signal_id,
    source_system: supplied.source_system,
    source_record_id: supplied.source_record_id,
    observed_at: supplied.observed_at,
    supplied_geography: supplied,
    mapping_status: sanitizeText(safe.mapping_status, 40).toUpperCase(),
    mapping_method: sanitizeText(safe.mapping_method, 48).toUpperCase(),
    confidence: sanitizeText(safe.confidence, 40).toUpperCase(),
    deepest_verified_level: sanitizeText(safe.deepest_verified_level, 24).toUpperCase(),
    mapped_geography: {
      state_code: sanitizeText(mapped.state_code, 24).toUpperCase(),
      state_name: sanitizeText(mapped.state_name, 120).toUpperCase(),
      parliament_code: sanitizeText(mapped.parliament_code, 24).toUpperCase(),
      parliament_name: sanitizeText(mapped.parliament_name, 120).toUpperCase(),
      dun_code: sanitizeText(mapped.dun_code, 24).toUpperCase(),
      dun_name: sanitizeText(mapped.dun_name, 120).toUpperCase(),
      dm_code: sanitizeText(mapped.dm_code, 24).toUpperCase(),
      dm_name: sanitizeText(mapped.dm_name, 120).toUpperCase(),
      locality_code: sanitizeText(mapped.locality_code, 32).toUpperCase(),
      locality_name: sanitizeText(mapped.locality_name, 160).toUpperCase(),
    },
    evidence: {
      requested_level: sanitizeText(evidence.requested_level, 24).toUpperCase(),
      matched_fields: Array.isArray(evidence.matched_fields)
        ? evidence.matched_fields.map((entry) => sanitizeText(entry, 80).toLowerCase())
        : [],
      candidate_count: Number.parseInt(String(evidence.candidate_count ?? "0"), 10) || 0,
      parent_chain_verified: evidence.parent_chain_verified === true,
      ambiguity_count: Number.parseInt(String(evidence.ambiguity_count ?? "0"), 10) || 0,
      reason: sanitizeText(evidence.reason, 160),
    },
    validation_fixture: safe.validation_fixture === true,
    production_signal: safe.production_signal === true,
  };
}

export function validatePip360MappedSignal(input = {}) {
  const normalized = sanitizePip360MappedSignal(input);
  const errors = [];

  if (hasForbiddenKeys(input)) {
    errors.push("Mapped signal contains forbidden field names.");
  }
  if (normalized.schema !== PIP_360_MAPPED_SIGNAL_SCHEMA) {
    errors.push("Mapped signal schema mismatch.");
  }
  if (!normalized.signal_id) {
    errors.push("signal_id is required.");
  }
  if (!Object.values(PIP_360_GEOGRAPHY_MAPPING_STATUSES).includes(normalized.mapping_status)) {
    errors.push("mapping_status is invalid.");
  }
  if (!Object.values(PIP_360_GEOGRAPHY_MAPPING_METHODS).includes(normalized.mapping_method)) {
    errors.push("mapping_method is invalid.");
  }
  if (!Object.values(PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES).includes(normalized.confidence)) {
    errors.push("confidence is invalid.");
  }
  if (
    normalized.deepest_verified_level &&
    !Object.values(PIP_360_GEOGRAPHY_LEVELS).includes(normalized.deepest_verified_level)
  ) {
    errors.push("deepest_verified_level is invalid.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

export function validatePip360GeographyMappingSummary(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];
  if (safe.schema !== PIP_360_GEOGRAPHY_MAPPING_SUMMARY_SCHEMA) {
    errors.push("Summary schema mismatch.");
  }
  if (hasForbiddenKeys(safe)) {
    errors.push("Summary contains forbidden field names.");
  }
  if (
    safe.deepest_verified_level &&
    !Object.values(PIP_360_GEOGRAPHY_LEVELS).includes(
      sanitizeText(safe.deepest_verified_level, 24).toUpperCase()
    )
  ) {
    errors.push("deepest_verified_level is invalid.");
  }
  [
    "mapped_count",
    "partially_mapped_count",
    "ambiguous_count",
    "unmapped_count",
    "invalid_count",
  ].forEach((key) => {
    if (!Number.isInteger(Number(safe[key] ?? 0))) {
      errors.push(`${key} must be numeric.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}