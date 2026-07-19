export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA =
  "pip.public-communication.response-case.contract.v1";

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_INPUT_SCHEMA =
  "pip.public-communication.response-case.input.v1";

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA =
  "pip.public-communication.response-case.v1";

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA =
  "pip.public-communication.response-case.collection.v1";

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA =
  "pip.public-communication.response-case.evaluation.v1";

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EXPORT_SCHEMA =
  "pip.public-communication.response-case.export.v1";

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS = Object.freeze({
  MONITOR: "MONITOR",
  CLARIFY: "CLARIFY",
  CORRECT_WITH_EVIDENCE: "CORRECT_WITH_EVIDENCE",
  PROVIDE_SERVICE_UPDATE: "PROVIDE_SERVICE_UPDATE",
  AMPLIFY_VERIFIED_INFORMATION: "AMPLIFY_VERIFIED_INFORMATION",
  ESCALATE_FOR_REVIEW: "ESCALATE_FOR_REVIEW",
  NO_RESPONSE_REQUIRED: "NO_RESPONSE_REQUIRED",
});

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES = Object.freeze({
  ELIGIBLE_FOR_HUMAN_REVIEW: "ELIGIBLE_FOR_HUMAN_REVIEW",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED_INSUFFICIENT_EVIDENCE: "BLOCKED_INSUFFICIENT_EVIDENCE",
  BLOCKED_INVALID_GEOGRAPHY: "BLOCKED_INVALID_GEOGRAPHY",
  BLOCKED_CONFLICTING_CLASSIFICATION: "BLOCKED_CONFLICTING_CLASSIFICATION",
  NO_CASE_REQUIRED: "NO_CASE_REQUIRED",
  VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
  INVALID: "INVALID",
});

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES = Object.freeze({
  GENERAL_MONITORING: "GENERAL_MONITORING",
  PUBLIC_CONFUSION: "PUBLIC_CONFUSION",
  VERIFIED_FACTUAL_ERROR: "VERIFIED_FACTUAL_ERROR",
  SERVICE_INFORMATION_NEED: "SERVICE_INFORMATION_NEED",
  VERIFIED_INFORMATION_OPPORTUNITY: "VERIFIED_INFORMATION_OPPORTUNITY",
  CONFLICTING_INFORMATION: "CONFLICTING_INFORMATION",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  GEOGRAPHY_REVIEW: "GEOGRAPHY_REVIEW",
  UNSPECIFIED: "UNSPECIFIED",
});

export const PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS = Object.freeze({
  NO_VERIFIED_PRODUCTION_SIGNAL: "NO_VERIFIED_PRODUCTION_SIGNAL",
  NO_VERIFIED_EVIDENCE: "NO_VERIFIED_EVIDENCE",
  INSUFFICIENT_EVIDENCE_COUNT: "INSUFFICIENT_EVIDENCE_COUNT",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  INVALID_GEOGRAPHY: "INVALID_GEOGRAPHY",
  AMBIGUOUS_GEOGRAPHY: "AMBIGUOUS_GEOGRAPHY",
  CONFLICTING_CLASSIFICATIONS: "CONFLICTING_CLASSIFICATIONS",
  FIXTURE_ONLY: "FIXTURE_ONLY",
  UNSUPPORTED_CASE_TYPE: "UNSUPPORTED_CASE_TYPE",
  RESPONSE_INTENT_NOT_EXPLICIT: "RESPONSE_INTENT_NOT_EXPLICIT",
  RAW_CONTENT_NOT_ALLOWED: "RAW_CONTENT_NOT_ALLOWED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
});

export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES = Object.freeze({
  VERIFIED_READY: "VERIFIED_READY",
  PARTIALLY_VERIFIED: "PARTIALLY_VERIFIED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  INSUFFICIENT: "INSUFFICIENT",
  NONE: "NONE",
});

export const PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS = Object.freeze({
  ROUTINE: "ROUTINE",
  WATCH: "WATCH",
  ELEVATED_REVIEW: "ELEVATED_REVIEW",
  IMMEDIATE_HUMAN_REVIEW: "IMMEDIATE_HUMAN_REVIEW",
});

const INPUT_ALLOWED_KEYS = new Set([
  "schema",
  "source_issue_id",
  "issue_label",
  "issue_category",
  "explicit_case_type",
  "explicit_public_information_need",
  "geography_scope",
  "geography_mapping_status",
  "trend_classification",
  "narrative_velocity",
  "sentiment_classification",
  "verified_signal_count",
  "evidence_count",
  "evidence_verification_status",
  "confidence_classification",
  "service_information_available",
  "factual_error_verified",
  "public_confusion_verified",
  "verified_information_available",
  "conflicting_classification",
  "observation_window",
  "validation_fixture",
]);

const EXPORT_ALLOWED_KEYS = new Set([
  "schema",
  "generated_at",
  "contract_schema",
  "collection_schema",
  "summary",
  "production_cases",
  "validation_fixture_cases",
  "blocked_cases",
  "review_cases",
  "no_case_required",
  "recommendations",
  "statuses",
  "urgency_classifications",
  "block_reasons",
  "validation_result",
  "safety",
]);

const CASE_ALLOWED_KEYS = new Set([
  "schema",
  "response_case_id",
  "source_issue_id",
  "issue_label",
  "issue_category",
  "geography_scope",
  "geography_mapping_status",
  "case_type",
  "status",
  "recommendation",
  "urgency",
  "rationale_codes",
  "block_reasons",
  "verified_signal_count",
  "evidence_count",
  "evidence_readiness_status",
  "confidence_classification",
  "observation_window",
  "production_eligible",
  "validation_fixture",
  "human_review_required",
  "generated_at",
  "safety",
]);

const FORBIDDEN_FIELD_PATTERN =
  /(population|demographic|voter|post_text|comment_text|caption_text|username|account_id|personal|email|phone|token|secret|password|draft|wording|objective|factual_core|social_media|platform|publish|persuasion|election|preference|affiliation)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true") return true;
    if (value.trim().toLowerCase() === "false") return false;
  }
  return fallback;
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function enumIncludes(enumSet, value) {
  return Object.values(enumSet).includes(String(value ?? "").toUpperCase());
}

function sanitizeCaseOutput(caseInput = {}) {
  const safe = isPlainObject(caseInput) ? caseInput : {};
  const output = {};
  Object.entries(safe).forEach(([key, value]) => {
    if (CASE_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA;
  output.response_case_id = sanitizeText(output.response_case_id, 80);
  output.source_issue_id = sanitizeText(output.source_issue_id, 120);
  output.issue_label = sanitizeText(output.issue_label, 180);
  output.issue_category = sanitizeText(output.issue_category, 120);
  output.geography_scope = sanitizeText(output.geography_scope, 160);
  output.geography_mapping_status = sanitizeText(
    output.geography_mapping_status,
    80
  ).toUpperCase();
  output.case_type = sanitizeText(output.case_type, 80).toUpperCase();
  output.status = sanitizeText(output.status, 80).toUpperCase();
  output.recommendation = sanitizeText(output.recommendation, 80).toUpperCase();
  output.urgency = sanitizeText(output.urgency, 80).toUpperCase();
  output.rationale_codes = toArray(output.rationale_codes)
    .map((entry) => sanitizeText(entry, 80).toUpperCase())
    .filter(Boolean);
  output.block_reasons = toArray(output.block_reasons)
    .map((entry) => sanitizeText(entry, 80).toUpperCase())
    .filter(Boolean);
  output.verified_signal_count = normalizeNumber(output.verified_signal_count, 0);
  output.evidence_count = normalizeNumber(output.evidence_count, 0);
  output.evidence_readiness_status = sanitizeText(
    output.evidence_readiness_status,
    80
  ).toUpperCase();
  output.confidence_classification = sanitizeText(
    output.confidence_classification,
    80
  ).toUpperCase();
  output.observation_window = sanitizeText(output.observation_window, 140);
  output.production_eligible = normalizeBoolean(output.production_eligible, false);
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.human_review_required = normalizeBoolean(output.human_review_required, true);
  output.generated_at = normalizeIso(output.generated_at) ?? new Date().toISOString();

  const safety = isPlainObject(output.safety) ? output.safety : {};
  output.safety = {
    public_information_support_only:
      safety.public_information_support_only !== false,
    response_wording_generated: false,
    communication_objective_generated: false,
    factual_core_generated: false,
    content_draft_generated: false,
    persuasion_score_generated: false,
    voter_preference_inferred: false,
    election_outcome_predicted: false,
    demographic_targeting_used: false,
    population_weighting_used: false,
    raw_public_content_included: false,
    voter_data_included: false,
  };

  return output;
}

export function buildPipPublicCommunicationResponseCaseContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    input_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_INPUT_SCHEMA,
    response_case_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA,
    evaluation_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EXPORT_SCHEMA,
    recommendations: { ...PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS },
    statuses: { ...PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES },
    case_types: { ...PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES },
    block_reasons: { ...PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS },
    evidence_readiness_statuses: {
      ...PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES,
    },
    urgency_classifications: {
      ...PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS,
    },
    summary: {
      public_information_support_only: true,
      evidence_grounding_required: true,
      human_review_required: true,
      deterministic_gate_rules_required: true,
      recommendation_allowlist_enforced: true,
      response_wording_generation_enabled: false,
      communication_objective_generation_enabled: false,
      factual_core_generation_enabled: false,
      content_draft_generation_enabled: false,
      automated_response_enabled: false,
      automated_approval_enabled: false,
      automated_publication_enabled: false,
      persuasion_optimisation_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      demographic_signal_correlation_enabled: false,
      demographic_issue_correlation_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      locality_persuasion_ranking_enabled: false,
      population_weighted_response_priority_enabled: false,
      sentiment_only_response_decision_enabled: false,
      raw_public_content_included: false,
      public_account_identity_included: false,
      voter_records_included: false,
      voter_identifiers_included: false,
      personal_addresses_included: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_results_exclude_validation_fixtures: true,
      external_network_access_enabled: false,
      automatic_ingestion_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
    },
  };
}

export function validatePipPublicCommunicationResponseCaseContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  const requiredSchemas = {
    schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA,
    input_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_INPUT_SCHEMA,
    response_case_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA,
    evaluation_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EXPORT_SCHEMA,
  };

  Object.entries(requiredSchemas).forEach(([key, expected]) => {
    if (safe[key] !== expected) {
      errors.push(`${key} mismatch.`);
    }
  });

  [
    ["recommendations", PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS],
    ["statuses", PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES],
    ["case_types", PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES],
    ["block_reasons", PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS],
    [
      "evidence_readiness_statuses",
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES,
    ],
    ["urgency_classifications", PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS],
  ].forEach(([key, expected]) => {
    if (JSON.stringify(safe[key]) !== JSON.stringify(expected)) {
      errors.push(`${key} must match exported constants.`);
    }
  });

  const requiredFlags = {
    public_information_support_only: true,
    evidence_grounding_required: true,
    human_review_required: true,
    deterministic_gate_rules_required: true,
    recommendation_allowlist_enforced: true,
    response_wording_generation_enabled: false,
    communication_objective_generation_enabled: false,
    factual_core_generation_enabled: false,
    content_draft_generation_enabled: false,
    automated_response_enabled: false,
    automated_approval_enabled: false,
    automated_publication_enabled: false,
    persuasion_optimisation_enabled: false,
    individual_targeting_enabled: false,
    demographic_targeting_enabled: false,
    demographic_signal_correlation_enabled: false,
    demographic_issue_correlation_enabled: false,
    political_affiliation_inference_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    locality_persuasion_ranking_enabled: false,
    population_weighted_response_priority_enabled: false,
    sentiment_only_response_decision_enabled: false,
    raw_public_content_included: false,
    public_account_identity_included: false,
    voter_records_included: false,
    voter_identifiers_included: false,
    personal_addresses_included: false,
    validation_fixture_separated: true,
    p999_fixture_separated: true,
    production_results_exclude_validation_fixtures: true,
    external_network_access_enabled: false,
    automatic_ingestion_enabled: false,
    automatic_refresh_enabled: false,
    recurring_timer_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
  };

  Object.entries(requiredFlags).forEach(([key, expected]) => {
    if (summary[key] !== expected) {
      errors.push(`${key} must be ${String(expected)}.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function sanitizePipPublicCommunicationResponseCaseInput(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const sanitized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (INPUT_ALLOWED_KEYS.has(key)) {
      sanitized[key] = value;
    }
  });

  sanitized.schema = PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_INPUT_SCHEMA;
  sanitized.source_issue_id = sanitizeText(sanitized.source_issue_id, 120);
  sanitized.issue_label = sanitizeText(sanitized.issue_label, 180);
  sanitized.issue_category = sanitizeText(sanitized.issue_category, 120);
  sanitized.explicit_case_type = sanitizeText(
    sanitized.explicit_case_type,
    80
  ).toUpperCase();
  sanitized.explicit_public_information_need = normalizeBoolean(
    sanitized.explicit_public_information_need,
    false
  );
  sanitized.geography_scope = sanitizeText(sanitized.geography_scope, 160);
  sanitized.geography_mapping_status = sanitizeText(
    sanitized.geography_mapping_status,
    80
  ).toUpperCase();
  sanitized.trend_classification = sanitizeText(
    sanitized.trend_classification,
    80
  ).toUpperCase();
  sanitized.narrative_velocity = sanitizeText(
    sanitized.narrative_velocity,
    80
  ).toUpperCase();
  sanitized.sentiment_classification = sanitizeText(
    sanitized.sentiment_classification,
    80
  ).toUpperCase();
  sanitized.verified_signal_count = normalizeNumber(
    sanitized.verified_signal_count,
    0
  );
  sanitized.evidence_count = normalizeNumber(sanitized.evidence_count, 0);
  sanitized.evidence_verification_status = sanitizeText(
    sanitized.evidence_verification_status,
    80
  ).toUpperCase();
  sanitized.confidence_classification = sanitizeText(
    sanitized.confidence_classification,
    80
  ).toUpperCase();
  sanitized.service_information_available = normalizeBoolean(
    sanitized.service_information_available,
    false
  );
  sanitized.factual_error_verified = normalizeBoolean(
    sanitized.factual_error_verified,
    false
  );
  sanitized.public_confusion_verified = normalizeBoolean(
    sanitized.public_confusion_verified,
    false
  );
  sanitized.verified_information_available = normalizeBoolean(
    sanitized.verified_information_available,
    false
  );
  sanitized.conflicting_classification = normalizeBoolean(
    sanitized.conflicting_classification,
    false
  );
  sanitized.observation_window = sanitizeText(
    sanitized.observation_window,
    140
  );
  sanitized.validation_fixture = normalizeBoolean(
    sanitized.validation_fixture,
    false
  );

  return sanitized;
}

export function validatePipPublicCommunicationResponseCaseInput(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_INPUT_SCHEMA) {
    errors.push("input schema mismatch.");
  }

  ["source_issue_id", "issue_label", "geography_scope"].forEach((key) => {
    if (!sanitizeText(safe[key], 200)) {
      errors.push(`${key} is required.`);
    }
  });

  ["verified_signal_count", "evidence_count"].forEach((key) => {
    if (!Number.isFinite(Number(safe[key]))) {
      errors.push(`${key} must be numeric.`);
    }
  });

  Object.keys(safe).forEach((key) => {
    if (FORBIDDEN_FIELD_PATTERN.test(key)) {
      errors.push(`${key} is not allowed.`);
    }
  });

  if (
    safe.explicit_case_type &&
    !enumIncludes(PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES, safe.explicit_case_type)
  ) {
    errors.push("explicit_case_type must be in case-type allowlist.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePipPublicCommunicationResponseCase(input = {}) {
  const safe = sanitizeCaseOutput(input);
  const errors = [];

  if (safe.schema !== PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA) {
    errors.push("response case schema mismatch.");
  }

  if (
    !enumIncludes(
      PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS,
      safe.recommendation
    )
  ) {
    errors.push("recommendation must be in allowlist.");
  }

  if (!enumIncludes(PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES, safe.status)) {
    errors.push("status must be valid.");
  }

  if (!enumIncludes(PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES, safe.case_type)) {
    errors.push("case_type must be valid.");
  }

  if (
    !enumIncludes(
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES,
      safe.evidence_readiness_status
    )
  ) {
    errors.push("evidence_readiness_status must be valid.");
  }

  if (
    !enumIncludes(
      PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS,
      safe.urgency
    )
  ) {
    errors.push("urgency must be valid.");
  }

  if (
    safe.validation_fixture === true &&
    safe.production_eligible === true
  ) {
    errors.push("fixture case must not be production eligible.");
  }

  if (
    toArray(safe.block_reasons).some(
      (entry) =>
        !enumIncludes(PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS, entry)
    )
  ) {
    errors.push("block reasons must belong to allowlist.");
  }

  const serialized = JSON.stringify(safe);
  if (FORBIDDEN_FIELD_PATTERN.test(serialized)) {
    errors.push("forbidden content detected in response case payload.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePipPublicCommunicationResponseCaseCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA) {
    errors.push("collection schema mismatch.");
  }

  const productionCases = toArray(safe.production_cases);
  const fixtureCases = toArray(safe.validation_fixture_cases);

  productionCases.forEach((entry, index) => {
    const validation = validatePipPublicCommunicationResponseCase(entry);
    if (!validation.valid) {
      errors.push(`production_cases[${index}] invalid: ${validation.errors[0]}`);
    }
    if (validation.normalized.validation_fixture === true) {
      errors.push(`production_cases[${index}] cannot be fixture.`);
    }
  });

  fixtureCases.forEach((entry, index) => {
    const validation = validatePipPublicCommunicationResponseCase(entry);
    if (!validation.valid) {
      errors.push(`validation_fixture_cases[${index}] invalid: ${validation.errors[0]}`);
    }
    if (validation.normalized.production_eligible === true) {
      errors.push(`validation_fixture_cases[${index}] cannot be production eligible.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePipPublicCommunicationResponseCaseEvaluation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA) {
    errors.push("evaluation schema mismatch.");
  }

  const caseValidation = validatePipPublicCommunicationResponseCase(
    safe.response_case ?? {}
  );
  if (caseValidation.valid !== true) {
    errors.push(caseValidation.errors[0] ?? "evaluation response case invalid.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function sanitizePipPublicCommunicationResponseCaseExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EXPORT_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EXPORT_SCHEMA;
  output.generated_at = normalizeIso(output.generated_at) ?? new Date().toISOString();
  output.contract_schema =
    output.contract_schema || PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA;
  output.collection_schema =
    output.collection_schema || PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA;

  output.production_cases = toArray(output.production_cases).map((entry) =>
    sanitizeCaseOutput(entry)
  );
  output.validation_fixture_cases = toArray(output.validation_fixture_cases).map((entry) =>
    sanitizeCaseOutput(entry)
  );
  output.blocked_cases = toArray(output.blocked_cases).map((entry) =>
    sanitizeCaseOutput(entry)
  );
  output.review_cases = toArray(output.review_cases).map((entry) =>
    sanitizeCaseOutput(entry)
  );
  output.no_case_required = toArray(output.no_case_required).map((entry) =>
    sanitizeCaseOutput(entry)
  );

  output.recommendations = {
    ...PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS,
  };
  output.statuses = { ...PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES };
  output.urgency_classifications = {
    ...PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS,
  };
  output.block_reasons = {
    ...PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS,
  };

  output.summary = isPlainObject(output.summary) ? output.summary : {};
  output.validation_result = isPlainObject(output.validation_result)
    ? {
        valid: output.validation_result.valid === true,
        errors: toArray(output.validation_result.errors).map((entry) =>
          sanitizeText(entry, 240)
        ),
      }
    : { valid: false, errors: ["validation_result missing."] };

  output.safety = {
    public_information_support_only: true,
    response_wording_generated: false,
    communication_objective_generated: false,
    factual_core_generated: false,
    content_draft_generated: false,
    automated_response_enabled: false,
    automated_publication_enabled: false,
    voter_data_included: false,
    raw_public_content_included: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_access_enabled: false,
  };

  return output;
}
