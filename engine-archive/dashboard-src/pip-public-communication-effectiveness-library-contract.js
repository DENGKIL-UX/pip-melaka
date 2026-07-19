export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_CONTRACT_SCHEMA =
  "pip.public-communication.effectiveness-library.contract.v1";
export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EVIDENCE_SCHEMA =
  "pip.public-communication.effectiveness.evidence.v1";
export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA =
  "pip.public-communication.effectiveness.entry.v1";
export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA =
  "pip.public-communication.effectiveness.library.v1";
export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EXPORT_SCHEMA =
  "pip.public-communication.effectiveness.export.v1";

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS = Object.freeze({
  CONFUSION_REDUCTION: "CONFUSION_REDUCTION",
  MISINFORMATION_CORRECTION: "MISINFORMATION_CORRECTION",
  VERIFIED_INFORMATION_REACH: "VERIFIED_INFORMATION_REACH",
  FOLLOW_UP_REQUIREMENT: "FOLLOW_UP_REQUIREMENT",
  UNINTENDED_ISSUES: "UNINTENDED_ISSUES",
});

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES =
  Object.freeze({
    OBSERVED: "OBSERVED",
    NOT_OBSERVED: "NOT_OBSERVED",
    INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    NOT_APPLICABLE: "NOT_APPLICABLE",
  });

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES =
  Object.freeze({
    PENDING_HUMAN_REVIEW: "PENDING_HUMAN_REVIEW",
    CONFIRMED: "CONFIRMED",
    REJECTED: "REJECTED",
    RETURNED_FOR_EVIDENCE: "RETURNED_FOR_EVIDENCE",
    SUPERSEDED: "SUPERSEDED",
  });

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS = Object.freeze({
  CREATE_LIBRARY_ENTRY: "CREATE_LIBRARY_ENTRY",
  CONFIRM_LIBRARY_ENTRY: "CONFIRM_LIBRARY_ENTRY",
  REJECT_LIBRARY_ENTRY: "REJECT_LIBRARY_ENTRY",
  RETURN_FOR_EVIDENCE: "RETURN_FOR_EVIDENCE",
  SUPERSEDE_LIBRARY_ENTRY: "SUPERSEDE_LIBRARY_ENTRY",
  ADD_REVIEW_NOTE: "ADD_REVIEW_NOTE",
  EXPORT_EFFECTIVENESS_LIBRARY: "EXPORT_EFFECTIVENESS_LIBRARY",
});

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES =
  Object.freeze({
    CONFUSION_REDUCTION_OBSERVED: "CONFUSION_REDUCTION_OBSERVED",
    CONFUSION_REDUCTION_NOT_OBSERVED: "CONFUSION_REDUCTION_NOT_OBSERVED",
    MISINFORMATION_CORRECTION_OBSERVED: "MISINFORMATION_CORRECTION_OBSERVED",
    MISINFORMATION_CORRECTION_INSUFFICIENT_EVIDENCE:
      "MISINFORMATION_CORRECTION_INSUFFICIENT_EVIDENCE",
    VERIFIED_INFORMATION_REACH_OBSERVED:
      "VERIFIED_INFORMATION_REACH_OBSERVED",
    VERIFIED_INFORMATION_REACH_NOT_OBSERVED:
      "VERIFIED_INFORMATION_REACH_NOT_OBSERVED",
    FOLLOW_UP_REQUIRED_CONFIRMED: "FOLLOW_UP_REQUIRED_CONFIRMED",
    FOLLOW_UP_NOT_AUTOMATIC: "FOLLOW_UP_NOT_AUTOMATIC",
    UNINTENDED_ISSUE_OBSERVED: "UNINTENDED_ISSUE_OBSERVED",
    UNINTENDED_ISSUE_NOT_OBSERVED: "UNINTENDED_ISSUE_NOT_OBSERVED",
    INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    MIXED_OBSERVATIONS: "MIXED_OBSERVATIONS",
    HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
    CONFIRMED_ENTRY_IMMUTABLE: "CONFIRMED_ENTRY_IMMUTABLE",
    SUPERSEDED_BY_NEW_ENTRY: "SUPERSEDED_BY_NEW_ENTRY",
  });

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS =
  Object.freeze({
    CONFUSION_REDUCTION_OBSERVED: "CONFUSION_REDUCTION_OBSERVED",
    CORRECTION_VISIBILITY_OBSERVED: "CORRECTION_VISIBILITY_OBSERVED",
    VERIFIED_INFORMATION_REACH_INCREASE_OBSERVED:
      "VERIFIED_INFORMATION_REACH_INCREASE_OBSERVED",
    FOLLOW_UP_REQUIRED: "FOLLOW_UP_REQUIRED",
    UNINTENDED_ISSUE_OBSERVED: "UNINTENDED_ISSUE_OBSERVED",
    NO_MATERIAL_CHANGE_OBSERVED: "NO_MATERIAL_CHANGE_OBSERVED",
    RESPONSE_VISIBILITY_LOW: "RESPONSE_VISIBILITY_LOW",
    MIXED_OBSERVATIONS: "MIXED_OBSERVATIONS",
    INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
  });

export const PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS =
  Object.freeze({
    SOURCE_CLASSIFICATION_RESULT_MISSING: "SOURCE_CLASSIFICATION_RESULT_MISSING",
    SOURCE_CLASSIFICATION_RESULT_INVALID: "SOURCE_CLASSIFICATION_RESULT_INVALID",
    SOURCE_CLASSIFICATION_NOT_CONFIRMED: "SOURCE_CLASSIFICATION_NOT_CONFIRMED",
    SOURCE_CONFIRMED_PRIMARY_CLASSIFICATION_MISSING:
      "SOURCE_CONFIRMED_PRIMARY_CLASSIFICATION_MISSING",
    SOURCE_CLASSIFICATION_FINGERPRINT_MISMATCH:
      "SOURCE_CLASSIFICATION_FINGERPRINT_MISMATCH",
    SOURCE_OBSERVATION_FINGERPRINT_MISMATCH:
      "SOURCE_OBSERVATION_FINGERPRINT_MISMATCH",
    SOURCE_CLASSIFICATION_FIXTURE_BLOCKED: "SOURCE_CLASSIFICATION_FIXTURE_BLOCKED",
    EVIDENCE_PACKAGE_MISSING: "EVIDENCE_PACKAGE_MISSING",
    EVIDENCE_PACKAGE_INVALID: "EVIDENCE_PACKAGE_INVALID",
    EVIDENCE_LINEAGE_REQUIRED: "EVIDENCE_LINEAGE_REQUIRED",
    INVALID_COUNT: "INVALID_COUNT",
    NEGATIVE_COUNT_NOT_PERMITTED: "NEGATIVE_COUNT_NOT_PERMITTED",
    INVALID_TIMESTAMP: "INVALID_TIMESTAMP",
    MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
    RAW_PUBLIC_CONTENT_NOT_PERMITTED: "RAW_PUBLIC_CONTENT_NOT_PERMITTED",
    PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED:
      "PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED",
    VOTER_DATA_NOT_PERMITTED: "VOTER_DATA_NOT_PERMITTED",
    PERSONAL_DATA_NOT_PERMITTED: "PERSONAL_DATA_NOT_PERMITTED",
    DEMOGRAPHIC_PROFILE_NOT_PERMITTED: "DEMOGRAPHIC_PROFILE_NOT_PERMITTED",
    CAUSAL_ATTRIBUTION_NOT_PERMITTED: "CAUSAL_ATTRIBUTION_NOT_PERMITTED",
    PUBLICATION_EFFECTIVENESS_CLAIM_NOT_PERMITTED:
      "PUBLICATION_EFFECTIVENESS_CLAIM_NOT_PERMITTED",
    AUTOMATIC_CONFIRMATION_NOT_PERMITTED:
      "AUTOMATIC_CONFIRMATION_NOT_PERMITTED",
    AUTOMATIC_RESPONSE_GENERATION_NOT_PERMITTED:
      "AUTOMATIC_RESPONSE_GENERATION_NOT_PERMITTED",
    AUTOMATIC_CONTENT_GENERATION_NOT_PERMITTED:
      "AUTOMATIC_CONTENT_GENERATION_NOT_PERMITTED",
    CONFIRMED_ENTRY_IMMUTABLE: "CONFIRMED_ENTRY_IMMUTABLE",
    DELETE_ACTION_NOT_SUPPORTED: "DELETE_ACTION_NOT_SUPPORTED",
    SUPERSESSION_NOTE_REQUIRED: "SUPERSESSION_NOTE_REQUIRED",
    ACTOR_ROLE_NOT_AUTHORIZED: "ACTOR_ROLE_NOT_AUTHORIZED",
    ACTOR_ALIAS_INVALID: "ACTOR_ALIAS_INVALID",
    MANUAL_ACTION_REQUIRED: "MANUAL_ACTION_REQUIRED",
    EXTERNAL_NETWORK_OPERATION_NOT_PERMITTED:
      "EXTERNAL_NETWORK_OPERATION_NOT_PERMITTED",
    BROWSER_STORAGE_MUTATION_NOT_PERMITTED:
      "BROWSER_STORAGE_MUTATION_NOT_PERMITTED",
    CENTRAL_REPOSITORY_MUTATION_NOT_PERMITTED:
      "CENTRAL_REPOSITORY_MUTATION_NOT_PERMITTED",
  });

const REQUIRED_DIMENSIONS = Object.freeze([
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.CONFUSION_REDUCTION,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.MISINFORMATION_CORRECTION,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.VERIFIED_INFORMATION_REACH,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.FOLLOW_UP_REQUIREMENT,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.UNINTENDED_ISSUES,
]);

const FORBIDDEN_KEY_PATTERN =
  /(raw|text|comment|caption|username|handle|account|voter|address|phone|demographic|affiliation|preference|name)/i;
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
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
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

export function buildPipPublicCommunicationEffectivenessLibraryContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    evidence_schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EVIDENCE_SCHEMA,
    entry_schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA,
    library_schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EXPORT_SCHEMA,
    dimensions: { ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS },
    observation_statuses: {
      ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES,
    },
    review_statuses: { ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES },
    actions: { ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS },
    block_reasons: { ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS },
    reason_codes: { ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES },
    learning_tags: { ...PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS },
    required_dimensions: [...REQUIRED_DIMENSIONS],
    summary: {
      effectiveness_library_enabled: true,
      institutional_learning_only: true,
      aggregate_public_information_evaluation_only: true,
      completed_batch65a_observation_required: true,
      batch65b_classification_dependency_required: true,
      confirmed_classification_required_for_production_entry: true,
      source_classification_immutability_required: true,
      source_fingerprint_verification_required: true,
      evidence_lineage_required: true,
      five_effectiveness_dimensions_required: true,
      dimension_status_allowlist_enforced: true,
      human_review_required: true,
      manual_confirmation_only: true,
      append_only_review_history: true,
      supersession_instead_of_deletion_required: true,
      causal_attribution_enabled: false,
      publication_effectiveness_claim_enabled: false,
      individual_persuasion_optimisation_enabled: false,
      political_persuasion_optimisation_enabled: false,
      engagement_optimisation_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      voter_targeting_enabled: false,
      locality_persuasion_ranking_enabled: false,
      population_weighted_effectiveness_scoring_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      response_case_generation_enabled: false,
      second_response_generation_enabled: false,
      content_generation_enabled: false,
      publication_operation_enabled: false,
      platform_connection_enabled: false,
      platform_authentication_enabled: false,
      automatic_analytics_ingestion_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
      raw_public_content_included: false,
      public_account_identity_included: false,
      voter_records_included: false,
      personal_data_included: false,
      demographic_profiles_included: false,
      in_memory_library_only: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
    },
  };
}

export function validatePipPublicCommunicationEffectivenessLibraryContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const checks = {
    schema:
      safe.schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_CONTRACT_SCHEMA,
    evidence_schema:
      safe.evidence_schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EVIDENCE_SCHEMA,
    entry_schema:
      safe.entry_schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA,
    library_schema:
      safe.library_schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
    export_schema:
      safe.export_schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EXPORT_SCHEMA,
    dimension_count: Object.values(safe.dimensions ?? {}).length === 5,
    required_dimensions:
      JSON.stringify(safe.required_dimensions ?? []) === JSON.stringify(REQUIRED_DIMENSIONS),
    observation_statuses:
      Object.values(safe.observation_statuses ?? {}).length === 4,
    review_statuses: Object.values(safe.review_statuses ?? {}).length === 5,
    batch65b_dependency:
      summary.batch65b_classification_dependency_required === true &&
      summary.confirmed_classification_required_for_production_entry === true,
    human_review_required:
      summary.human_review_required === true &&
      summary.manual_confirmation_only === true,
    no_causality:
      summary.causal_attribution_enabled === false &&
      summary.publication_effectiveness_claim_enabled === false,
    no_generation:
      summary.response_case_generation_enabled === false &&
      summary.second_response_generation_enabled === false &&
      summary.content_generation_enabled === false &&
      summary.publication_operation_enabled === false,
    no_targeting:
      summary.individual_persuasion_optimisation_enabled === false &&
      summary.political_persuasion_optimisation_enabled === false &&
      summary.engagement_optimisation_enabled === false &&
      summary.individual_targeting_enabled === false &&
      summary.demographic_targeting_enabled === false &&
      summary.voter_targeting_enabled === false &&
      summary.locality_persuasion_ranking_enabled === false,
    no_network:
      summary.platform_connection_enabled === false &&
      summary.platform_authentication_enabled === false &&
      summary.automatic_analytics_ingestion_enabled === false &&
      summary.external_network_access_enabled === false,
    safe_storage:
      summary.browser_storage_modified === false &&
      summary.central_repository_modified === false,
    fixtures:
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

export function validatePipPublicCommunicationEffectivenessEvidence(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EVIDENCE_SCHEMA,
    effectiveness_evidence_id: sanitizeText(safe.effectiveness_evidence_id, 180),
    source_classification_result_id: sanitizeText(
      safe.source_classification_result_id,
      180
    ),
    source_classification_result_fingerprint: sanitizeText(
      safe.source_classification_result_fingerprint,
      180
    ),
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
    calculated_window_shares: isPlainObject(safe.calculated_window_shares)
      ? safe.calculated_window_shares
      : {},
    calculated_window_deltas: isPlainObject(safe.calculated_window_deltas)
      ? safe.calculated_window_deltas
      : {},
    supporting_window_types: unique(
      toArray(safe.supporting_window_types).map((entry) => sanitizeUpper(entry, 120))
    ),
    supporting_evidence_reference_ids: unique(
      toArray(safe.supporting_evidence_reference_ids).map((entry) => sanitizeText(entry, 180))
    ),
    evidence_coverage_percent: normalizeInteger(safe.evidence_coverage_percent, null),
    evaluation_timestamp: normalizeIso(safe.evaluation_timestamp) ?? "",
    dataset_scope: sanitizeUpper(safe.dataset_scope, 120),
    validation_fixture: normalizeBoolean(safe.validation_fixture, false),
    misinformation_correction_evidence: isPlainObject(safe.misinformation_correction_evidence)
      ? safe.misinformation_correction_evidence
      : null,
    unintended_issue_evidence: isPlainObject(safe.unintended_issue_evidence)
      ? safe.unintended_issue_evidence
      : null,
    uncertainty_notes: unique(
      toArray(safe.uncertainty_notes).map((entry) => sanitizeText(entry, 300))
    ),
    evidence_lineage_status: sanitizeUpper(safe.evidence_lineage_status, 120, "VALID"),
  };

  const correctionEvidence = normalized.misinformation_correction_evidence;
  const unintendedIssueEvidence = normalized.unintended_issue_evidence;

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EVIDENCE_SCHEMA,
    evidence_id: normalized.effectiveness_evidence_id.length > 0,
    source_classification_result_id:
      normalized.source_classification_result_id.length > 0,
    source_classification_fingerprint:
      normalized.source_classification_result_fingerprint.length > 0,
    source_observation_case_id: normalized.source_observation_case_id.length > 0,
    source_observation_fingerprint:
      normalized.source_observation_case_fingerprint.length > 0,
    confirmed_primary_classification:
      normalized.confirmed_primary_classification.length > 0,
    evidence_coverage_percent:
      Number.isFinite(normalized.evidence_coverage_percent) &&
      normalized.evidence_coverage_percent >= 0 &&
      normalized.evidence_coverage_percent <= 100,
    evaluation_timestamp: normalized.evaluation_timestamp.length > 0,
    dataset_scope: normalized.dataset_scope.length > 0,
    evidence_lineage: normalized.evidence_lineage_status === "VALID",
    no_forbidden_keys: !FORBIDDEN_KEY_PATTERN.test(safeStringify(Object.keys(safe))),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
    correction_evidence_shape:
      correctionEvidence === null ||
      ([
        sanitizeText(correctionEvidence.sanitized_claim_reference_id, 180),
        sanitizeText(correctionEvidence.verified_correction_reference_id, 180),
      ].every(Boolean) &&
        toArray(correctionEvidence.independent_evidence_reference_ids).length >= 1 &&
        Number.isInteger(correctionEvidence.unsupported_claim_signal_count_baseline) &&
        Number.isInteger(correctionEvidence.unsupported_claim_signal_count_final) &&
        Number.isInteger(correctionEvidence.verified_correction_reference_count) &&
        sanitizeUpper(correctionEvidence.evidence_review_status, 80) === "VERIFIED"),
    unintended_issue_shape:
      unintendedIssueEvidence === null ||
      ([
        sanitizeText(unintendedIssueEvidence.unintended_issue_reference_id, 180),
        sanitizeText(unintendedIssueEvidence.unintended_issue_category, 180),
        sanitizeText(unintendedIssueEvidence.first_observed_window, 120),
      ].every(Boolean) &&
        toArray(unintendedIssueEvidence.evidence_reference_ids).length >= 1 &&
        Number.isInteger(unintendedIssueEvidence.independent_source_count) &&
        sanitizeUpper(unintendedIssueEvidence.review_status, 120).length > 0),
  };

  const errors = [];
  if (!checks.evidence_lineage) {
    errors.push(PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.EVIDENCE_LINEAGE_REQUIRED);
  }
  if (!checks.no_forbidden_keys || !checks.no_forbidden_values) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.RAW_PUBLIC_CONTENT_NOT_PERMITTED
    );
  }
  if (!checks.correction_evidence_shape || !checks.unintended_issue_shape) {
    errors.push(PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.MISSING_REQUIRED_FIELD);
  }
  Object.entries(checks).forEach(([key, value]) => {
    if (!value && errors.length < 12 && !errors.includes(`${key} failed.`)) {
      errors.push(`${key} failed.`);
    }
  });

  return envelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationEffectivenessEntry(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA,
    effectiveness_entry_id: sanitizeText(safe.effectiveness_entry_id, 180),
    source_effectiveness_evidence_id: sanitizeText(
      safe.source_effectiveness_evidence_id,
      180
    ),
    source_classification_result_id: sanitizeText(
      safe.source_classification_result_id,
      180
    ),
    source_classification_result_fingerprint: sanitizeText(
      safe.source_classification_result_fingerprint,
      180
    ),
    source_observation_case_id: sanitizeText(safe.source_observation_case_id, 180),
    source_publication_register_entry_id: sanitizeText(
      safe.source_publication_register_entry_id,
      180
    ),
    dataset_scope: sanitizeUpper(safe.dataset_scope, 120),
    confirmed_primary_classification: sanitizeUpper(
      safe.confirmed_primary_classification,
      120
    ),
    supplemental_classifications: unique(
      toArray(safe.supplemental_classifications).map((entry) => sanitizeUpper(entry, 120))
    ),
    dimension_results: toArray(safe.dimension_results),
    learning_tags: unique(
      toArray(safe.learning_tags).map((entry) => sanitizeUpper(entry, 120))
    ),
    supporting_evidence_reference_ids: unique(
      toArray(safe.supporting_evidence_reference_ids).map((entry) => sanitizeText(entry, 180))
    ),
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
    supersedes_entry_id: sanitizeText(safe.supersedes_entry_id, 180),
    superseded_by_entry_id: sanitizeText(safe.superseded_by_entry_id, 180),
    validation_fixture: normalizeBoolean(safe.validation_fixture, false),
    generated_at: normalizeIso(safe.generated_at) ?? "",
  };

  const dimensionStatuses = Object.values(
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES
  );

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA,
    entry_id: normalized.effectiveness_entry_id.length > 0,
    source_effectiveness_evidence_id:
      normalized.source_effectiveness_evidence_id.length > 0,
    dimension_count: normalized.dimension_results.length === 5,
    dimension_allowlist:
      JSON.stringify(
        normalized.dimension_results
          .map((entry) => sanitizeUpper(entry?.dimension, 120))
          .sort()
      ) === JSON.stringify([...REQUIRED_DIMENSIONS].sort()),
    dimension_status_allowlist: normalized.dimension_results.every((entry) =>
      dimensionStatuses.includes(sanitizeUpper(entry?.observation_status, 120))
    ),
    causal_attribution_status:
      normalized.causal_attribution_status === "NOT_PERFORMED",
    publication_effectiveness_claim_status:
      normalized.publication_effectiveness_claim_status === "NOT_ESTABLISHED",
    review_status: Object.values(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES
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

export function validatePipPublicCommunicationEffectivenessLibrary(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    summary: isPlainObject(safe.summary) ? safe.summary : {},
    production_effectiveness_entries: toArray(safe.production_effectiveness_entries).map(
      (entry) => validatePipPublicCommunicationEffectivenessEntry(entry).normalized
    ),
    fixture_effectiveness_entries: toArray(safe.fixture_effectiveness_entries).map(
      (entry) => validatePipPublicCommunicationEffectivenessEntry(entry).normalized
    ),
    blocked_entries: toArray(safe.blocked_entries),
    superseded_entries: toArray(safe.superseded_entries).map((entry) =>
      validatePipPublicCommunicationEffectivenessEntry(entry).normalized
    ),
    validation: isPlainObject(safe.validation)
      ? safe.validation
      : { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      ...((isPlainObject(safe.safety) && safe.safety) || {}),
    },
  };

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
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

export function sanitizePipPublicCommunicationEffectivenessExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EXPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    manifest: isPlainObject(safe.manifest) ? safe.manifest : {},
    summary: isPlainObject(safe.summary) ? safe.summary : {},
    production_effectiveness_entries: toArray(safe.production_effectiveness_entries).map(
      (entry) => validatePipPublicCommunicationEffectivenessEntry(entry).normalized
    ),
    fixture_effectiveness_entries: toArray(safe.fixture_effectiveness_entries).map(
      (entry) => validatePipPublicCommunicationEffectivenessEntry(entry).normalized
    ),
    blocked_entries: toArray(safe.blocked_entries),
    superseded_entries: toArray(safe.superseded_entries).map((entry) =>
      validatePipPublicCommunicationEffectivenessEntry(entry).normalized
    ),
    collection_validation_result: isPlainObject(safe.collection_validation_result)
      ? safe.collection_validation_result
      : { valid: true, errors: [] },
    safety_manifest: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      ...((isPlainObject(safe.safety_manifest) && safe.safety_manifest) || {}),
    },
  };
}
