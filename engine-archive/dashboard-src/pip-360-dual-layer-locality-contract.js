export const PIP_360_DUAL_LAYER_LOCALITY_CONTRACT_SCHEMA =
  "pip.360-dual-layer-locality.contract.v1";

export const PIP_360_LOCALITY_IDENTITY_SCHEMA =
  "pip.360-locality-identity.v1";

export const PIP_360_POPULATION_LOCALITY_CONTEXT_SCHEMA =
  "pip.360-population-locality-context.v1";

export const PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA =
  "pip.360-public-signal-summary.v1";

export const PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA =
  "pip.360-public-signal-locality-context.v1";

export const PIP_360_DUAL_LAYER_LOCALITY_CONTEXT_SCHEMA =
  "pip.360-dual-layer-locality-context.v1";

export const PIP_360_DUAL_LAYER_LOCALITY_COLLECTION_SCHEMA =
  "pip.360-dual-layer-locality-collection.v1";

export const PIP_360_LOCALITY_EVIDENCE_SUMMARY_SCHEMA =
  "pip.360-locality-evidence-summary.v1";

export const PIP_360_LOCALITY_LAYER_TYPES = Object.freeze({
  POPULATION_CONTEXT: "POPULATION_CONTEXT",
  PUBLIC_SIGNAL_CONTEXT: "PUBLIC_SIGNAL_CONTEXT",
});

export const PIP_360_POPULATION_READINESS_STATUSES = Object.freeze({
  VERY_HIGH: "VERY_HIGH",
  HIGH: "HIGH",
  PARTIAL: "PARTIAL",
  LOW: "LOW",
  NOT_READY: "NOT_READY",
});

export const PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES = Object.freeze({
  VERIFIED_SIGNALS_AVAILABLE: "VERIFIED_SIGNALS_AVAILABLE",
  PARTIAL_SIGNAL_CONTEXT: "PARTIAL_SIGNAL_CONTEXT",
  NO_VERIFIED_SIGNALS: "NO_VERIFIED_SIGNALS",
  VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
  INVALID: "INVALID",
});

export const PIP_360_SENTIMENT_CLASSIFICATIONS = Object.freeze({
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
  MIXED: "MIXED",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

export const PIP_360_TREND_CLASSIFICATIONS = Object.freeze({
  RISING: "RISING",
  STABLE: "STABLE",
  FALLING: "FALLING",
  EMERGING: "EMERGING",
  MIXED: "MIXED",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

export const PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS = Object.freeze({
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  LOW: "LOW",
  NONE: "NONE",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

export const PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS = Object.freeze({
  VERIFIED: "VERIFIED",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

export const PIP_360_EVIDENCE_STATUSES = Object.freeze({
  VERIFIED: "VERIFIED",
  PARTIAL: "PARTIAL",
  INSUFFICIENT: "INSUFFICIENT",
  NONE: "NONE",
});

const ALLOWED_PUBLIC_SIGNAL_KEYS = new Set([
  "schema",
  "signal_summary_id",
  "mapped_signal_id",
  "source_system",
  "observation_window_start",
  "observation_window_end",
  "state_code",
  "parliament_code",
  "dun_code",
  "dm_code",
  "locality_code",
  "issue_label",
  "issue_category",
  "sentiment_classification",
  "positive_observation_count",
  "neutral_observation_count",
  "negative_observation_count",
  "total_sentiment_observation_count",
  "trend_classification",
  "trend_window_hours",
  "narrative_velocity_classification",
  "narrative_observations_per_hour",
  "total_public_engagement",
  "source_record_count",
  "evidence_count",
  "evidence_source_count",
  "evidence_references",
  "confidence_classification",
  "confidence_score",
  "validation_fixture",
  "production_signal",
]);

const FORBIDDEN_KEY_PATTERN =
  /(post|comment|caption|username|profile|account_id|accountid|phone|email|identifier|voter|personal|address|reaction|affiliation|persuasion|prediction|target)/i;

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

function normalizeCode(value, max = 24) {
  return sanitizeText(value, max).toUpperCase();
}

function normalizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasForbiddenKeys(input) {
  if (Array.isArray(input)) {
    return input.some((entry) => hasForbiddenKeys(entry));
  }
  if (!isPlainObject(input)) {
    return false;
  }
  return Object.entries(input).some(([key, value]) => {
    if (FORBIDDEN_KEY_PATTERN.test(String(key))) {
      return true;
    }
    return hasForbiddenKeys(value);
  });
}

function isValueInEnum(enumSet, value) {
  return Object.values(enumSet).includes(String(value ?? "").toUpperCase());
}

export function buildPip360DualLayerLocalityContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_360_DUAL_LAYER_LOCALITY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    locality_identity_schema: PIP_360_LOCALITY_IDENTITY_SCHEMA,
    population_locality_context_schema: PIP_360_POPULATION_LOCALITY_CONTEXT_SCHEMA,
    public_signal_summary_schema: PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA,
    public_signal_locality_context_schema:
      PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA,
    dual_layer_locality_context_schema: PIP_360_DUAL_LAYER_LOCALITY_CONTEXT_SCHEMA,
    dual_layer_locality_collection_schema:
      PIP_360_DUAL_LAYER_LOCALITY_COLLECTION_SCHEMA,
    locality_evidence_summary_schema: PIP_360_LOCALITY_EVIDENCE_SUMMARY_SCHEMA,
    layer_types: { ...PIP_360_LOCALITY_LAYER_TYPES },
    population_readiness_statuses: { ...PIP_360_POPULATION_READINESS_STATUSES },
    public_signal_context_statuses: {
      ...PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES,
    },
    sentiment_classifications: { ...PIP_360_SENTIMENT_CLASSIFICATIONS },
    trend_classifications: { ...PIP_360_TREND_CLASSIFICATIONS },
    narrative_velocity_classifications: {
      ...PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS,
    },
    confidence_classifications: {
      ...PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS,
    },
    evidence_statuses: { ...PIP_360_EVIDENCE_STATUSES },
    summary: {
      population_and_signal_layers_separate: true,
      sibling_layer_structure_required: true,
      combined_targeting_score_enabled: false,
      cross_layer_persuasion_scoring_enabled: false,
      cross_layer_prediction_enabled: false,
      demographic_signal_correlation_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      individual_targeting_enabled: false,
      political_affiliation_inference_enabled: false,
      population_record_mutation_enabled: false,
      public_signal_record_mutation_enabled: false,
      raw_public_content_persisted: false,
      public_account_identity_persisted: false,
      voter_identifiers_included: false,
      personal_addresses_included: false,
      phone_numbers_included: false,
      validation_fixture_separated: true,
      p999_validation_fixture_separated: true,
      external_network_access_enabled: false,
      automatic_ingestion_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
    },
  };
}

export function validatePip360DualLayerLocalityContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  const requiredSchemas = {
    schema: PIP_360_DUAL_LAYER_LOCALITY_CONTRACT_SCHEMA,
    locality_identity_schema: PIP_360_LOCALITY_IDENTITY_SCHEMA,
    population_locality_context_schema: PIP_360_POPULATION_LOCALITY_CONTEXT_SCHEMA,
    public_signal_summary_schema: PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA,
    public_signal_locality_context_schema:
      PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA,
    dual_layer_locality_context_schema: PIP_360_DUAL_LAYER_LOCALITY_CONTEXT_SCHEMA,
    dual_layer_locality_collection_schema:
      PIP_360_DUAL_LAYER_LOCALITY_COLLECTION_SCHEMA,
    locality_evidence_summary_schema: PIP_360_LOCALITY_EVIDENCE_SUMMARY_SCHEMA,
  };

  Object.entries(requiredSchemas).forEach(([key, expected]) => {
    if (safe[key] !== expected) {
      errors.push(`${key} mismatch.`);
    }
  });

  const requiredFlags = {
    population_and_signal_layers_separate: true,
    sibling_layer_structure_required: true,
    combined_targeting_score_enabled: false,
    cross_layer_persuasion_scoring_enabled: false,
    cross_layer_prediction_enabled: false,
    demographic_signal_correlation_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    individual_targeting_enabled: false,
    political_affiliation_inference_enabled: false,
    population_record_mutation_enabled: false,
    public_signal_record_mutation_enabled: false,
    raw_public_content_persisted: false,
    public_account_identity_persisted: false,
    voter_identifiers_included: false,
    personal_addresses_included: false,
    phone_numbers_included: false,
    validation_fixture_separated: true,
    p999_validation_fixture_separated: true,
    external_network_access_enabled: false,
    automatic_ingestion_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
  };

  Object.entries(requiredFlags).forEach(([key, expected]) => {
    if (summary[key] !== expected) {
      errors.push(`${key} must be ${String(expected)}.`);
    }
  });

  [
    ["layer_types", PIP_360_LOCALITY_LAYER_TYPES],
    ["population_readiness_statuses", PIP_360_POPULATION_READINESS_STATUSES],
    ["public_signal_context_statuses", PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES],
    ["sentiment_classifications", PIP_360_SENTIMENT_CLASSIFICATIONS],
    ["trend_classifications", PIP_360_TREND_CLASSIFICATIONS],
    [
      "narrative_velocity_classifications",
      PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS,
    ],
    ["confidence_classifications", PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS],
    ["evidence_statuses", PIP_360_EVIDENCE_STATUSES],
  ].forEach(([key, expected]) => {
    if (JSON.stringify(safe[key]) !== JSON.stringify(expected)) {
      errors.push(`${key} must match exported constants.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function sanitizePip360LocalityIdentity(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_360_LOCALITY_IDENTITY_SCHEMA,
    state_code: normalizeCode(safe.state_code),
    state_name: sanitizeText(safe.state_name, 120).toUpperCase(),
    parliament_code: normalizeCode(safe.parliament_code),
    parliament_name: sanitizeText(safe.parliament_name, 120).toUpperCase(),
    dun_code: normalizeCode(safe.dun_code),
    dun_name: sanitizeText(safe.dun_name, 120).toUpperCase(),
    dm_code: normalizeCode(safe.dm_code),
    dm_name: sanitizeText(safe.dm_name, 120).toUpperCase(),
    locality_code: normalizeCode(safe.locality_code, 32),
    locality_name: sanitizeText(safe.locality_name, 160).toUpperCase(),
  };
}

export function validatePip360LocalityIdentity(input = {}) {
  const normalized = sanitizePip360LocalityIdentity(input);
  const errors = [];

  if (!isPlainObject(input)) {
    errors.push("Locality identity must be a plain object.");
  }

  if (normalized.schema !== PIP_360_LOCALITY_IDENTITY_SCHEMA) {
    errors.push("Locality identity schema mismatch.");
  }

  [
    "state_code",
    "parliament_code",
    "dun_code",
    "dm_code",
    "locality_code",
    "state_name",
    "parliament_name",
    "dun_name",
    "dm_name",
    "locality_name",
  ].forEach((key) => {
    if (!normalized[key]) {
      errors.push(`${key} is required.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

export function sanitizePip360PublicSignalSummary(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const references = Array.isArray(safe.evidence_references)
    ? safe.evidence_references
    : [];

  return {
    schema: PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA,
    signal_summary_id: sanitizeText(safe.signal_summary_id, 80).toUpperCase(),
    mapped_signal_id: sanitizeText(safe.mapped_signal_id, 80).toUpperCase(),
    source_system: sanitizeText(safe.source_system, 80).toUpperCase(),
    observation_window_start: normalizeIso(safe.observation_window_start),
    observation_window_end: normalizeIso(safe.observation_window_end),
    state_code: normalizeCode(safe.state_code),
    parliament_code: normalizeCode(safe.parliament_code),
    dun_code: normalizeCode(safe.dun_code),
    dm_code: normalizeCode(safe.dm_code),
    locality_code: normalizeCode(safe.locality_code, 32),
    issue_label: sanitizeText(safe.issue_label, 160),
    issue_category: sanitizeText(safe.issue_category, 80).toUpperCase(),
    sentiment_classification: sanitizeText(
      safe.sentiment_classification,
      40
    ).toUpperCase(),
    positive_observation_count: normalizeNumber(safe.positive_observation_count),
    neutral_observation_count: normalizeNumber(safe.neutral_observation_count),
    negative_observation_count: normalizeNumber(safe.negative_observation_count),
    total_sentiment_observation_count: normalizeNumber(
      safe.total_sentiment_observation_count
    ),
    trend_classification: sanitizeText(safe.trend_classification, 40).toUpperCase(),
    trend_window_hours: normalizeNumber(safe.trend_window_hours),
    narrative_velocity_classification: sanitizeText(
      safe.narrative_velocity_classification,
      40
    ).toUpperCase(),
    narrative_observations_per_hour: normalizeNumber(
      safe.narrative_observations_per_hour
    ),
    total_public_engagement: normalizeNumber(safe.total_public_engagement),
    source_record_count: normalizeNumber(safe.source_record_count),
    evidence_count: normalizeNumber(safe.evidence_count),
    evidence_source_count: normalizeNumber(safe.evidence_source_count),
    evidence_references: Array.from(
      new Set(
        references
          .map((entry) => sanitizeText(entry, 120))
          .filter((entry) => entry.length > 0)
      )
    ),
    confidence_classification: sanitizeText(
      safe.confidence_classification,
      40
    ).toUpperCase(),
    confidence_score: normalizeNumber(safe.confidence_score),
    validation_fixture: safe.validation_fixture === true,
    production_signal: safe.production_signal === true,
  };
}

export function validatePip360PublicSignalSummary(input = {}) {
  const errors = [];
  if (!isPlainObject(input)) {
    errors.push("Public-signal summary must be a plain object.");
  }

  if (hasForbiddenKeys(input)) {
    errors.push("Public-signal summary contains forbidden field names.");
  }

  const keys = Object.keys(isPlainObject(input) ? input : {});
  if (keys.some((key) => !ALLOWED_PUBLIC_SIGNAL_KEYS.has(key))) {
    errors.push("Public-signal summary contains unsupported fields.");
  }

  const normalized = sanitizePip360PublicSignalSummary(input);

  if (normalized.schema !== PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA) {
    errors.push("Public-signal summary schema mismatch.");
  }

  [
    "signal_summary_id",
    "mapped_signal_id",
    "source_system",
    "state_code",
    "parliament_code",
    "dun_code",
    "dm_code",
    "locality_code",
    "issue_label",
    "issue_category",
  ].forEach((key) => {
    if (!normalized[key]) {
      errors.push(`${key} is required.`);
    }
  });

  if (!isValueInEnum(PIP_360_SENTIMENT_CLASSIFICATIONS, normalized.sentiment_classification)) {
    errors.push("sentiment_classification must be a supported value.");
  }
  if (!isValueInEnum(PIP_360_TREND_CLASSIFICATIONS, normalized.trend_classification)) {
    errors.push("trend_classification must be a supported value.");
  }
  if (
    !isValueInEnum(
      PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS,
      normalized.narrative_velocity_classification
    )
  ) {
    errors.push("narrative_velocity_classification must be a supported value.");
  }
  if (
    !isValueInEnum(
      PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS,
      normalized.confidence_classification
    )
  ) {
    errors.push("confidence_classification must be a supported value.");
  }

  if (!normalized.observation_window_start || !normalized.observation_window_end) {
    errors.push("observation_window_start and observation_window_end are required.");
  }

  if (normalized.production_signal !== true && normalized.validation_fixture !== true) {
    errors.push("Summary must be explicitly production_signal or validation_fixture.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

export function validatePip360PopulationLocalityContext(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_360_POPULATION_LOCALITY_CONTEXT_SCHEMA) {
    errors.push("Population locality context schema mismatch.");
  }

  const identityValidation = validatePip360LocalityIdentity(safe.locality_identity);
  if (identityValidation.valid !== true) {
    errors.push("Population locality context identity is invalid.");
  }

  if (!isValueInEnum(PIP_360_POPULATION_READINESS_STATUSES, safe.data_readiness?.readiness_status)) {
    errors.push("Population readiness_status is invalid.");
  }

  if (safe.aggregate_only !== true) {
    errors.push("Population context must be aggregate-only.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360PublicSignalLocalityContext(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA) {
    errors.push("Public-signal locality context schema mismatch.");
  }

  const identityValidation = validatePip360LocalityIdentity(safe.locality_identity);
  if (identityValidation.valid !== true) {
    errors.push("Public-signal locality context identity is invalid.");
  }

  if (!isValueInEnum(PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES, safe.context_status)) {
    errors.push("Public-signal context_status is invalid.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360DualLayerLocalityContext(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_360_DUAL_LAYER_LOCALITY_CONTEXT_SCHEMA) {
    errors.push("Dual-layer locality context schema mismatch.");
  }

  const identityValidation = validatePip360LocalityIdentity(safe.locality_identity);
  const populationValidation = validatePip360PopulationLocalityContext(
    safe.population_context
  );
  const signalValidation = validatePip360PublicSignalLocalityContext(
    safe.public_signal_context
  );

  if (identityValidation.valid !== true) {
    errors.push("Dual-layer identity is invalid.");
  }
  if (populationValidation.valid !== true) {
    errors.push("Population context is invalid.");
  }
  if (signalValidation.valid !== true) {
    errors.push("Public-signal context is invalid.");
  }

  const guard = isPlainObject(safe.separation_guard) ? safe.separation_guard : {};
  const guardExpectations = {
    layers_remain_separate: true,
    combined_score_created: false,
    cross_layer_correlation_created: false,
    targeting_recommendation_created: false,
    voter_preference_inferred: false,
    electoral_outcome_inferred: false,
  };

  Object.entries(guardExpectations).forEach(([key, expected]) => {
    if (guard[key] !== expected) {
      errors.push(`separation_guard.${key} must be ${String(expected)}.`);
    }
  });

  [
    "combined_score",
    "persuasion_score",
    "voter_conversion_score",
    "support_probability_score",
    "demographic_sentiment_correlation",
    "demographic_issue_correlation",
    "individual_account_profile",
    "individual_voter_profile",
    "electoral_prediction",
    "targeting_recommendation",
  ].forEach((forbiddenKey) => {
    if (Object.prototype.hasOwnProperty.call(safe, forbiddenKey)) {
      errors.push(`${forbiddenKey} is prohibited.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360DualLayerLocalityCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_360_DUAL_LAYER_LOCALITY_COLLECTION_SCHEMA) {
    errors.push("Dual-layer locality collection schema mismatch.");
  }

  const items = Array.isArray(safe.items) ? safe.items : [];
  if (items.length === 0) {
    errors.push("Dual-layer locality collection must include at least one item.");
  }

  const invalidItems = items
    .map((item, index) => ({
      index,
      validation: validatePip360DualLayerLocalityContext(item),
    }))
    .filter((entry) => entry.validation.valid !== true);

  if (invalidItems.length > 0) {
    errors.push("Dual-layer locality collection contains invalid context items.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
    invalid_items: invalidItems,
  };
}
