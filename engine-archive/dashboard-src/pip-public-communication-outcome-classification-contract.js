export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_CONTRACT_SCHEMA =
  "pip.public-communication.outcome-classification.contract.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA =
  "pip.public-communication.outcome-classification.evidence.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA =
  "pip.public-communication.outcome-classification.result.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA =
  "pip.public-communication.outcome-classification.collection.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA =
  "pip.public-communication.outcome-classification.export.v1";

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS = Object.freeze({
  IMPROVING: "IMPROVING",
  STABLE: "STABLE",
  WORSENING: "WORSENING",
  RESPONSE_NOT_SEEN: "RESPONSE_NOT_SEEN",
  NEW_NARRATIVE_EMERGED: "NEW_NARRATIVE_EMERGED",
  SECOND_RESPONSE_REQUIRED: "SECOND_RESPONSE_REQUIRED",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

export const PIP_PUBLIC_COMMUNICATION_PRIMARY_OUTCOME_CLASSIFICATIONS = Object.freeze([
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.STABLE,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.RESPONSE_NOT_SEEN,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
]);

export const PIP_PUBLIC_COMMUNICATION_SUPPLEMENTAL_OUTCOME_CLASSIFICATIONS =
  Object.freeze([
    PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.SECOND_RESPONSE_REQUIRED,
  ]);

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES =
  Object.freeze({
    PENDING_HUMAN_REVIEW: "PENDING_HUMAN_REVIEW",
    CONFIRMED: "CONFIRMED",
    REJECTED: "REJECTED",
    RETURNED_FOR_EVIDENCE: "RETURNED_FOR_EVIDENCE",
  });

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS =
  Object.freeze({
    CLASSIFY_OUTCOME: "CLASSIFY_OUTCOME",
    CONFIRM_CLASSIFICATION: "CONFIRM_CLASSIFICATION",
    REJECT_CLASSIFICATION: "REJECT_CLASSIFICATION",
    RETURN_FOR_EVIDENCE: "RETURN_FOR_EVIDENCE",
    RECORD_SECOND_RESPONSE_REQUIRED: "RECORD_SECOND_RESPONSE_REQUIRED",
    REMOVE_SECOND_RESPONSE_REQUIRED: "REMOVE_SECOND_RESPONSE_REQUIRED",
    EXPORT_CLASSIFICATION_PACKAGE: "EXPORT_CLASSIFICATION_PACKAGE",
  });

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES =
  Object.freeze({
    IMPROVING_CONFUSION_REDUCTION: "IMPROVING_CONFUSION_REDUCTION",
    IMPROVING_NEGATIVE_SENTIMENT_REDUCTION:
      "IMPROVING_NEGATIVE_SENTIMENT_REDUCTION",
    IMPROVING_VERIFIED_INFORMATION_INCREASE:
      "IMPROVING_VERIFIED_INFORMATION_INCREASE",
    STABLE_WITHIN_THRESHOLD: "STABLE_WITHIN_THRESHOLD",
    WORSENING_CONFUSION_INCREASE: "WORSENING_CONFUSION_INCREASE",
    WORSENING_NEGATIVE_SENTIMENT_INCREASE:
      "WORSENING_NEGATIVE_SENTIMENT_INCREASE",
    RESPONSE_NOT_OBSERVED: "RESPONSE_NOT_OBSERVED",
    NEW_NARRATIVE_SUPPORTED: "NEW_NARRATIVE_SUPPORTED",
    INSUFFICIENT_EVIDENCE_MISSING_WINDOW:
      "INSUFFICIENT_EVIDENCE_MISSING_WINDOW",
    INSUFFICIENT_EVIDENCE_LOW_SIGNAL: "INSUFFICIENT_EVIDENCE_LOW_SIGNAL",
    INSUFFICIENT_EVIDENCE_LOW_SOURCE: "INSUFFICIENT_EVIDENCE_LOW_SOURCE",
    INSUFFICIENT_EVIDENCE_LOW_COVERAGE:
      "INSUFFICIENT_EVIDENCE_LOW_COVERAGE",
    INSUFFICIENT_EVIDENCE_INVALID_COUNTS:
      "INSUFFICIENT_EVIDENCE_INVALID_COUNTS",
    INSUFFICIENT_EVIDENCE_MISSING_METRICS:
      "INSUFFICIENT_EVIDENCE_MISSING_METRICS",
    INSUFFICIENT_EVIDENCE_CONFLICTING_MATERIAL_CHANGES:
      "INSUFFICIENT_EVIDENCE_CONFLICTING_MATERIAL_CHANGES",
    SECOND_RESPONSE_REVIEW_REQUIRED: "SECOND_RESPONSE_REVIEW_REQUIRED",
    SECOND_RESPONSE_REVIEW_REMOVED: "SECOND_RESPONSE_REVIEW_REMOVED",
  });

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS =
  Object.freeze({
    SOURCE_OBSERVATION_CASE_MISSING: "SOURCE_OBSERVATION_CASE_MISSING",
    SOURCE_OBSERVATION_CASE_INVALID: "SOURCE_OBSERVATION_CASE_INVALID",
    SOURCE_OBSERVATION_NOT_COMPLETE: "SOURCE_OBSERVATION_NOT_COMPLETE",
    SOURCE_OBSERVATION_FINGERPRINT_MISMATCH:
      "SOURCE_OBSERVATION_FINGERPRINT_MISMATCH",
    SOURCE_OBSERVATION_IMMUTABILITY_VIOLATION:
      "SOURCE_OBSERVATION_IMMUTABILITY_VIOLATION",
    EVIDENCE_PACKAGE_MISSING: "EVIDENCE_PACKAGE_MISSING",
    EVIDENCE_PACKAGE_INVALID: "EVIDENCE_PACKAGE_INVALID",
    EVIDENCE_LINEAGE_REQUIRED: "EVIDENCE_LINEAGE_REQUIRED",
    MISSING_WINDOW_EVIDENCE: "MISSING_WINDOW_EVIDENCE",
    INVALID_WINDOW_EVIDENCE: "INVALID_WINDOW_EVIDENCE",
    INVALID_TIMESTAMP: "INVALID_TIMESTAMP",
    INVALID_COUNT: "INVALID_COUNT",
    NEGATIVE_COUNT_NOT_PERMITTED: "NEGATIVE_COUNT_NOT_PERMITTED",
    UNRECONCILED_SENTIMENT_TOTAL: "UNRECONCILED_SENTIMENT_TOTAL",
    MISSING_REQUIRED_METRIC: "MISSING_REQUIRED_METRIC",
    EVIDENCE_COVERAGE_BELOW_MINIMUM: "EVIDENCE_COVERAGE_BELOW_MINIMUM",
    SIGNAL_COUNT_BELOW_MINIMUM: "SIGNAL_COUNT_BELOW_MINIMUM",
    DISTINCT_SOURCE_COUNT_BELOW_MINIMUM: "DISTINCT_SOURCE_COUNT_BELOW_MINIMUM",
    CONFLICTING_MATERIAL_CHANGES: "CONFLICTING_MATERIAL_CHANGES",
    CLASSIFICATION_NOT_DETERMINISTIC: "CLASSIFICATION_NOT_DETERMINISTIC",
    REVIEW_STATUS_INVALID: "REVIEW_STATUS_INVALID",
    ACTION_NOT_PERMITTED: "ACTION_NOT_PERMITTED",
    ACTOR_ROLE_NOT_AUTHORIZED: "ACTOR_ROLE_NOT_AUTHORIZED",
    ACTOR_ALIAS_INVALID: "ACTOR_ALIAS_INVALID",
    MANUAL_ACTION_REQUIRED: "MANUAL_ACTION_REQUIRED",
    AUTOMATIC_CONFIRMATION_NOT_PERMITTED:
      "AUTOMATIC_CONFIRMATION_NOT_PERMITTED",
    SECOND_RESPONSE_PRIMARY_CLASSIFICATION_NOT_ELIGIBLE:
      "SECOND_RESPONSE_PRIMARY_CLASSIFICATION_NOT_ELIGIBLE",
    SECOND_RESPONSE_REASON_REQUIRED: "SECOND_RESPONSE_REASON_REQUIRED",
    SECOND_RESPONSE_SUPPORTING_EVIDENCE_REQUIRED:
      "SECOND_RESPONSE_SUPPORTING_EVIDENCE_REQUIRED",
    RAW_CONTENT_NOT_PERMITTED: "RAW_CONTENT_NOT_PERMITTED",
    PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED:
      "PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED",
    VOTER_DATA_NOT_PERMITTED: "VOTER_DATA_NOT_PERMITTED",
    PERSONAL_DATA_NOT_PERMITTED: "PERSONAL_DATA_NOT_PERMITTED",
    DEMOGRAPHIC_TARGETING_NOT_PERMITTED:
      "DEMOGRAPHIC_TARGETING_NOT_PERMITTED",
    EXTERNAL_NETWORK_OPERATION_NOT_PERMITTED:
      "EXTERNAL_NETWORK_OPERATION_NOT_PERMITTED",
    BROWSER_STORAGE_MUTATION_NOT_PERMITTED:
      "BROWSER_STORAGE_MUTATION_NOT_PERMITTED",
    CENTRAL_REPOSITORY_MUTATION_NOT_PERMITTED:
      "CENTRAL_REPOSITORY_MUTATION_NOT_PERMITTED",
    SECOND_RESPONSE_AUTOMATION_NOT_PERMITTED:
      "SECOND_RESPONSE_AUTOMATION_NOT_PERMITTED",
  });

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS =
  Object.freeze({
    minimum_signal_count_per_evaluated_window: 10,
    minimum_distinct_source_count_per_evaluated_window: 2,
    minimum_evidence_coverage_percent: 70,
    material_change_percentage_points: 10,
    response_seen_minimum_reference_count: 1,
    new_narrative_minimum_evidence_count: 2,
    new_narrative_minimum_distinct_source_count: 2,
  });

const REQUIRED_WINDOWS = Object.freeze([
  "PRE_PUBLICATION_24H",
  "POST_PUBLICATION_6H",
  "POST_PUBLICATION_12H",
  "POST_PUBLICATION_24H",
  "POST_PUBLICATION_72H",
]);

const WINDOW_METRIC_KEYS = Object.freeze([
  "observed_public_signal_count",
  "distinct_source_count",
  "verified_information_signal_count",
  "evidence_reviewed_confusion_signal_count",
  "negative_sentiment_signal_count",
  "neutral_sentiment_signal_count",
  "positive_sentiment_signal_count",
  "response_reference_count",
  "public_engagement_count",
  "verified_information_engagement_count",
  "evidence_backed_new_narrative_count",
  "evidence_backed_new_narrative_source_count",
  "observed_from",
  "observed_to",
  "captured_at",
  "evidence_reference_ids",
  "narrative_category_ids",
]);

const FORBIDDEN_KEY_PATTERN =
  /(raw|text|comment|message|username|handle|account|voter|demographic|affiliation|preference|address|phone|name)/i;
const FORBIDDEN_VALUE_PATTERN =
  /(@|password|token|credential|oauth|api[_-]?key|voter|demographic|affiliation|preference)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 420) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeUpper(value, max = 180, fallback = "") {
  const text = sanitizeText(value, max).toUpperCase();
  return text || fallback;
}

function normalizeIso(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeInteger(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true") return true;
    if (value.trim().toLowerCase() === "false") return false;
  }
  return fallback;
}

function unique(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function safeStringify(value) {
  const seen = new Set();
  return JSON.stringify(value, (_key, entry) => {
    if (entry !== null && typeof entry === "object") {
      if (seen.has(entry)) return "[Circular]";
      seen.add(entry);
    }
    return entry;
  });
}

function envelope(valid, checks, errors, normalized) {
  return {
    valid,
    checks,
    errors,
    normalized,
    summary: {
      passed_checks: Object.values(checks).filter(Boolean).length,
      total_checks: Object.keys(checks).length,
      error_count: errors.length,
    },
  };
}

function validateThresholdConfig(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    minimum_signal_count_per_evaluated_window: normalizeInteger(
      safe.minimum_signal_count_per_evaluated_window,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.minimum_signal_count_per_evaluated_window
    ),
    minimum_distinct_source_count_per_evaluated_window: normalizeInteger(
      safe.minimum_distinct_source_count_per_evaluated_window,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.minimum_distinct_source_count_per_evaluated_window
    ),
    minimum_evidence_coverage_percent: normalizeInteger(
      safe.minimum_evidence_coverage_percent,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.minimum_evidence_coverage_percent
    ),
    material_change_percentage_points: normalizeInteger(
      safe.material_change_percentage_points,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.material_change_percentage_points
    ),
    response_seen_minimum_reference_count: normalizeInteger(
      safe.response_seen_minimum_reference_count,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.response_seen_minimum_reference_count
    ),
    new_narrative_minimum_evidence_count: normalizeInteger(
      safe.new_narrative_minimum_evidence_count,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.new_narrative_minimum_evidence_count
    ),
    new_narrative_minimum_distinct_source_count: normalizeInteger(
      safe.new_narrative_minimum_distinct_source_count,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS.new_narrative_minimum_distinct_source_count
    ),
  };

  const checks = {
    signal_minimum:
      Number.isFinite(normalized.minimum_signal_count_per_evaluated_window) &&
      normalized.minimum_signal_count_per_evaluated_window >= 1,
    source_minimum:
      Number.isFinite(normalized.minimum_distinct_source_count_per_evaluated_window) &&
      normalized.minimum_distinct_source_count_per_evaluated_window >= 1,
    coverage_range:
      Number.isFinite(normalized.minimum_evidence_coverage_percent) &&
      normalized.minimum_evidence_coverage_percent >= 0 &&
      normalized.minimum_evidence_coverage_percent <= 100,
    material_change:
      Number.isFinite(normalized.material_change_percentage_points) &&
      normalized.material_change_percentage_points >= 1,
    response_minimum:
      Number.isFinite(normalized.response_seen_minimum_reference_count) &&
      normalized.response_seen_minimum_reference_count >= 0,
    narrative_evidence:
      Number.isFinite(normalized.new_narrative_minimum_evidence_count) &&
      normalized.new_narrative_minimum_evidence_count >= 1,
    narrative_sources:
      Number.isFinite(normalized.new_narrative_minimum_distinct_source_count) &&
      normalized.new_narrative_minimum_distinct_source_count >= 1,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, normalized);
}

function normalizeWindowEvidence(windowType, input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    window_type: windowType,
  };

  WINDOW_METRIC_KEYS.forEach((key) => {
    if (key === "evidence_reference_ids" || key === "narrative_category_ids") {
      normalized[key] = unique(
        toArray(safe[key]).map((entry) => sanitizeText(entry, 180))
      );
      return;
    }
    if (key === "observed_from" || key === "observed_to" || key === "captured_at") {
      normalized[key] = normalizeIso(safe[key]) ?? "";
      return;
    }
    normalized[key] = normalizeInteger(safe[key], null);
  });

  return normalized;
}

export function buildPipPublicCommunicationOutcomeClassificationContractManifest({
  generatedAt,
  thresholds,
} = {}) {
  const thresholdValidation = validateThresholdConfig(thresholds);
  return {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    evidence_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA,
    result_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA,
    classifications: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS },
    primary_classifications: [...PIP_PUBLIC_COMMUNICATION_PRIMARY_OUTCOME_CLASSIFICATIONS],
    supplemental_classifications: [
      ...PIP_PUBLIC_COMMUNICATION_SUPPLEMENTAL_OUTCOME_CLASSIFICATIONS,
    ],
    review_statuses: {
      ...PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES,
    },
    actions: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS },
    reason_codes: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES },
    block_reasons: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS },
    required_windows: [...REQUIRED_WINDOWS],
    thresholds: thresholdValidation.normalized,
    summary: {
      outcome_classification_enabled: true,
      aggregate_public_information_evaluation_only: true,
      completed_batch65a_observation_required: true,
      five_window_monitoring_dependency_required: true,
      source_observation_immutability_required: true,
      source_fingerprint_verification_required: true,
      evidence_lineage_required: true,
      deterministic_provisional_classification_enabled: true,
      human_review_required: true,
      primary_classification_required: true,
      supplemental_classification_supported: true,
      second_response_classification_human_only: true,
      second_response_generation_enabled: false,
      content_generation_enabled: false,
      response_case_generation_enabled: false,
      publication_operation_enabled: false,
      causal_attribution_enabled: false,
      publication_effectiveness_claim_enabled: false,
      persuasion_optimisation_enabled: false,
      engagement_optimisation_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      voter_targeting_enabled: false,
      locality_persuasion_ranking_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      raw_public_content_included: false,
      public_account_identity_included: false,
      voter_records_included: false,
      personal_data_included: false,
      manual_aggregate_input_only: true,
      automatic_analytics_ingestion_enabled: false,
      platform_connection_enabled: false,
      platform_authentication_enabled: false,
      external_network_access_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
      in_memory_classification_only: true,
      append_only_review_history: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
    },
  };
}

export function validatePipPublicCommunicationOutcomeClassificationContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const thresholdValidation = validateThresholdConfig(safe.thresholds);
  const checks = {
    schema:
      safe.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_CONTRACT_SCHEMA,
    evidence_schema:
      safe.evidence_schema ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA,
    result_schema:
      safe.result_schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    collection_schema:
      safe.collection_schema ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
    export_schema:
      safe.export_schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA,
    classification_count: Object.values(safe.classifications ?? {}).length === 7,
    primary_count: toArray(safe.primary_classifications).length === 6,
    supplemental_count: toArray(safe.supplemental_classifications).length === 1,
    second_response_supplemental_only:
      toArray(safe.primary_classifications).includes("SECOND_RESPONSE_REQUIRED") === false &&
      JSON.stringify(safe.supplemental_classifications ?? []) ===
        JSON.stringify(["SECOND_RESPONSE_REQUIRED"]),
    five_windows:
      JSON.stringify(safe.required_windows ?? []) === JSON.stringify(REQUIRED_WINDOWS),
    thresholds_valid: thresholdValidation.valid === true,
    human_review_required: summary.human_review_required === true,
    no_causality: summary.causal_attribution_enabled === false,
    no_generation:
      summary.second_response_generation_enabled === false &&
      summary.content_generation_enabled === false &&
      summary.response_case_generation_enabled === false &&
      summary.publication_operation_enabled === false,
    no_targeting:
      summary.individual_targeting_enabled === false &&
      summary.demographic_targeting_enabled === false &&
      summary.voter_targeting_enabled === false &&
      summary.locality_persuasion_ranking_enabled === false,
    safe_storage:
      summary.browser_storage_modified === false &&
      summary.central_repository_modified === false,
    no_network: summary.external_network_access_enabled === false,
    fixture_separation:
      summary.validation_fixture_separated === true &&
      summary.p999_fixture_separated === true &&
      summary.production_totals_exclude_validation_fixtures === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePipPublicCommunicationOutcomeClassificationEvidence(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA,
    classification_evidence_id: sanitizeText(safe.classification_evidence_id, 180),
    source_observation_case_id: sanitizeText(safe.source_observation_case_id, 180),
    source_observation_case_fingerprint: sanitizeText(
      safe.source_observation_case_fingerprint,
      180
    ),
    source_publication_register_entry_id: sanitizeText(
      safe.source_publication_register_entry_id,
      180
    ),
    source_handoff_package_id: sanitizeText(safe.source_handoff_package_id, 180),
    publication_timestamp: normalizeIso(safe.publication_timestamp) ?? "",
    evidence_compiled_at: normalizeIso(safe.evidence_compiled_at) ?? "",
    dataset_scope: sanitizeUpper(safe.dataset_scope, 120),
    validation_fixture: normalizeBoolean(safe.validation_fixture, false),
    evidence_coverage_percent: normalizeInteger(safe.evidence_coverage_percent, null),
    evidence_references: unique(
      toArray(safe.evidence_references).map((entry) => sanitizeText(entry, 180))
    ),
    uncertainty_notes: unique(
      toArray(safe.uncertainty_notes).map((entry) => sanitizeText(entry, 300))
    ),
    evidence_lineage_status: sanitizeUpper(safe.evidence_lineage_status, 120, "VALID"),
    window_evidence: {},
  };

  REQUIRED_WINDOWS.forEach((windowType) => {
    normalized.window_evidence[windowType] = normalizeWindowEvidence(
      windowType,
      safe.window_evidence?.[windowType]
    );
  });

  const checks = {
    schema:
      normalized.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA,
    evidence_id: normalized.classification_evidence_id.length > 0,
    source_case_id: normalized.source_observation_case_id.length > 0,
    source_fingerprint: normalized.source_observation_case_fingerprint.length > 0,
    publication_timestamp: normalized.publication_timestamp.length > 0,
    evidence_compiled_at: normalized.evidence_compiled_at.length > 0,
    dataset_scope: normalized.dataset_scope.length > 0,
    window_keys:
      JSON.stringify(Object.keys(normalized.window_evidence)) ===
      JSON.stringify(REQUIRED_WINDOWS),
    windows_valid: REQUIRED_WINDOWS.every((windowType) => {
      const windowEvidence = normalized.window_evidence[windowType];
      return WINDOW_METRIC_KEYS.every((key) => {
        const value = windowEvidence[key];
        if (key === "observed_from" || key === "observed_to" || key === "captured_at") {
          return sanitizeText(value, 40).length > 0;
        }
        if (key === "evidence_reference_ids" || key === "narrative_category_ids") {
          return Array.isArray(value);
        }
        return Number.isInteger(value) && value >= 0;
      });
    }),
    coverage_range:
      Number.isFinite(normalized.evidence_coverage_percent) &&
      normalized.evidence_coverage_percent >= 0 &&
      normalized.evidence_coverage_percent <= 100,
    no_forbidden_keys: !FORBIDDEN_KEY_PATTERN.test(safeStringify(Object.keys(safe))),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
    evidence_lineage: normalized.evidence_lineage_status === "VALID",
    sentiment_reconciles: REQUIRED_WINDOWS.every((windowType) => {
      const windowEvidence = normalized.window_evidence[windowType];
      return (
        Number(windowEvidence.positive_sentiment_signal_count ?? 0) +
          Number(windowEvidence.neutral_sentiment_signal_count ?? 0) +
          Number(windowEvidence.negative_sentiment_signal_count ?? 0) <=
        Number(windowEvidence.observed_public_signal_count ?? 0)
      );
    }),
  };

  const errors = [];
  if (!checks.windows_valid) {
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.INVALID_WINDOW_EVIDENCE);
  }
  if (!checks.coverage_range) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.EVIDENCE_COVERAGE_BELOW_MINIMUM
    );
  }
  if (!checks.no_forbidden_keys || !checks.no_forbidden_values) {
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.RAW_CONTENT_NOT_PERMITTED);
  }
  if (!checks.evidence_lineage) {
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.EVIDENCE_LINEAGE_REQUIRED);
  }
  if (!checks.sentiment_reconciles) {
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.UNRECONCILED_SENTIMENT_TOTAL);
  }
  Object.entries(checks).forEach(([key, value]) => {
    if (!value && errors.length < 12 && key !== "windows_valid" && key !== "coverage_range") {
      errors.push(`${key} failed.`);
    }
  });

  return envelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationOutcomeClassificationResult(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    outcome_classification_result_id: sanitizeText(
      safe.outcome_classification_result_id,
      180
    ),
    source_classification_evidence_id: sanitizeText(
      safe.source_classification_evidence_id,
      180
    ),
    source_observation_case_id: sanitizeText(safe.source_observation_case_id, 180),
    source_observation_case_fingerprint: sanitizeText(
      safe.source_observation_case_fingerprint,
      180
    ),
    provisional_primary_classification: sanitizeUpper(
      safe.provisional_primary_classification,
      120
    ),
    confirmed_primary_classification: sanitizeUpper(
      safe.confirmed_primary_classification,
      120
    ),
    supplemental_classifications: unique(
      toArray(safe.supplemental_classifications).map((entry) => sanitizeUpper(entry, 120))
    ),
    classification_reason_codes: unique(
      toArray(safe.classification_reason_codes).map((entry) => sanitizeUpper(entry, 120))
    ),
    supporting_window_types: unique(
      toArray(safe.supporting_window_types).map((entry) => sanitizeUpper(entry, 120))
    ),
    supporting_evidence_reference_ids: unique(
      toArray(safe.supporting_evidence_reference_ids).map((entry) => sanitizeText(entry, 180))
    ),
    calculated_window_shares: isPlainObject(safe.calculated_window_shares)
      ? safe.calculated_window_shares
      : {},
    calculated_window_deltas: isPlainObject(safe.calculated_window_deltas)
      ? safe.calculated_window_deltas
      : {},
    applied_thresholds: validateThresholdConfig(safe.applied_thresholds).normalized,
    evidence_coverage_percent: normalizeInteger(safe.evidence_coverage_percent, null),
    uncertainty_notes: unique(
      toArray(safe.uncertainty_notes).map((entry) => sanitizeText(entry, 300))
    ),
    causal_attribution_status: sanitizeUpper(safe.causal_attribution_status, 120),
    publication_effectiveness_claim_status: sanitizeUpper(
      safe.publication_effectiveness_claim_status,
      120
    ),
    review_status: sanitizeUpper(safe.review_status, 120),
    review_history: toArray(safe.review_history),
    validation_fixture: normalizeBoolean(safe.validation_fixture, false),
    generated_at: normalizeIso(safe.generated_at) ?? "",
    second_response_review_required: normalizeBoolean(
      safe.second_response_review_required,
      false
    ),
    second_response_review_reason: sanitizeText(
      safe.second_response_review_reason,
      420
    ),
    second_response_review_evidence_reference_ids: unique(
      toArray(safe.second_response_review_evidence_reference_ids).map((entry) =>
        sanitizeText(entry, 180)
      )
    ),
    reviewed_by_role: sanitizeUpper(safe.reviewed_by_role, 80),
    reviewed_at: normalizeIso(safe.reviewed_at) ?? "",
  };

  const checks = {
    schema:
      normalized.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    result_id: normalized.outcome_classification_result_id.length > 0,
    provisional_primary: PIP_PUBLIC_COMMUNICATION_PRIMARY_OUTCOME_CLASSIFICATIONS.includes(
      normalized.provisional_primary_classification
    ),
    confirmed_primary:
      normalized.confirmed_primary_classification === "" ||
      PIP_PUBLIC_COMMUNICATION_PRIMARY_OUTCOME_CLASSIFICATIONS.includes(
        normalized.confirmed_primary_classification
      ),
    supplemental_only: normalized.supplemental_classifications.every((entry) =>
      PIP_PUBLIC_COMMUNICATION_SUPPLEMENTAL_OUTCOME_CLASSIFICATIONS.includes(entry)
    ),
    causal_status: normalized.causal_attribution_status === "NOT_PERFORMED",
    effectiveness_status:
      normalized.publication_effectiveness_claim_status === "NOT_ESTABLISHED",
    review_status: Object.values(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES
    ).includes(normalized.review_status),
    generated_at: normalized.generated_at.length > 0,
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationOutcomeClassificationCollection(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    summary: isPlainObject(safe.summary) ? safe.summary : {},
    production_classification_results: toArray(
      safe.production_classification_results
    ).map((entry) => validatePipPublicCommunicationOutcomeClassificationResult(entry).normalized),
    fixture_classification_results: toArray(safe.fixture_classification_results).map((entry) =>
      validatePipPublicCommunicationOutcomeClassificationResult(entry).normalized
    ),
    blocked_evaluations: toArray(safe.blocked_evaluations),
    validation: isPlainObject(safe.validation)
      ? safe.validation
      : { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      automatic_analytics_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      ...((isPlainObject(safe.safety) && safe.safety) || {}),
    },
  };

  const checks = {
    schema:
      normalized.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
    safety:
      normalized.safety.browser_storage_modified === false &&
      normalized.safety.central_repository_modified === false &&
      normalized.safety.external_network_request_made === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, normalized);
}

export function sanitizePipPublicCommunicationOutcomeClassificationExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    manifest: isPlainObject(safe.manifest) ? safe.manifest : {},
    classification_summary: isPlainObject(safe.classification_summary)
      ? safe.classification_summary
      : {},
    production_classification_results: toArray(safe.production_classification_results).map(
      (entry) => validatePipPublicCommunicationOutcomeClassificationResult(entry).normalized
    ),
    fixture_classification_results: toArray(safe.fixture_classification_results).map((entry) =>
      validatePipPublicCommunicationOutcomeClassificationResult(entry).normalized
    ),
    blocked_evaluations: toArray(safe.blocked_evaluations),
    thresholds: validateThresholdConfig(safe.thresholds).normalized,
    collection_validation_result: isPlainObject(safe.collection_validation_result)
      ? safe.collection_validation_result
      : { valid: true, errors: [] },
    safety_manifest: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      automatic_analytics_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      ...((isPlainObject(safe.safety_manifest) && safe.safety_manifest) || {}),
    },
  };
}
