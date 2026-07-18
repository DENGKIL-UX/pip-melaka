export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA =
  "pip.public-communication.evidence-recommendation.contract.v1";

export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA =
  "pip.public-communication.evidence-recommendation.evidence-item.v1";

export const PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA =
  "pip.public-communication.evidence-recommendation.verified-fact.v1";

export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA =
  "pip.public-communication.evidence-recommendation.package.v1";

export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA =
  "pip.public-communication.evidence-recommendation.collection.v1";

export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_EXPORT_SCHEMA =
  "pip.public-communication.evidence-recommendation.export.v1";

export const PIP_PUBLIC_COMMUNICATION_OBJECTIVES = Object.freeze({
  MONITOR_AND_VERIFY: "MONITOR_AND_VERIFY",
  CLARIFY_VERIFIED_INFORMATION: "CLARIFY_VERIFIED_INFORMATION",
  CORRECT_VERIFIED_INFORMATION: "CORRECT_VERIFIED_INFORMATION",
  PROVIDE_VERIFIED_SERVICE_UPDATE: "PROVIDE_VERIFIED_SERVICE_UPDATE",
  AMPLIFY_VERIFIED_INFORMATION: "AMPLIFY_VERIFIED_INFORMATION",
  ESCALATE_FOR_SPECIALIST_REVIEW: "ESCALATE_FOR_SPECIALIST_REVIEW",
  NO_PUBLIC_COMMUNICATION_ACTION: "NO_PUBLIC_COMMUNICATION_ACTION",
});

export const PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES =
  Object.freeze({
    READY_FOR_HUMAN_REVIEW: "READY_FOR_HUMAN_REVIEW",
    BLOCKED_INSUFFICIENT_EVIDENCE: "BLOCKED_INSUFFICIENT_EVIDENCE",
    BLOCKED_CONFLICTING_EVIDENCE: "BLOCKED_CONFLICTING_EVIDENCE",
    REQUIRES_SPECIALIST_REVIEW: "REQUIRES_SPECIALIST_REVIEW",
    NO_PACKAGE_REQUIRED: "NO_PACKAGE_REQUIRED",
    VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
    INVALID: "INVALID",
  });

export const PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES =
  Object.freeze({
    VERIFIED: "VERIFIED",
    PENDING_VERIFICATION: "PENDING_VERIFICATION",
    CONFLICTING: "CONFLICTING",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
  });

export const PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS =
  Object.freeze({
    LOW: "LOW",
    MODERATE: "MODERATE",
    HIGH: "HIGH",
    INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  });

export const PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES = Object.freeze({
  OVERCLAIM: "OVERCLAIM",
  UNSUPPORTED_CAUSALITY: "UNSUPPORTED_CAUSALITY",
  UNVERIFIED_NUMBER: "UNVERIFIED_NUMBER",
  OUTDATED_INFORMATION: "OUTDATED_INFORMATION",
  MISLEADING_CERTAINTY: "MISLEADING_CERTAINTY",
  SENSITIVE_PERSONAL_INFORMATION: "SENSITIVE_PERSONAL_INFORMATION",
  PARTISAN_OR_PERSUASIVE_FRAMING: "PARTISAN_OR_PERSUASIVE_FRAMING",
  LEGAL_OR_POLICY_AMBIGUITY: "LEGAL_OR_POLICY_AMBIGUITY",
  SERVICE_COMMITMENT_RISK: "SERVICE_COMMITMENT_RISK",
  FIXTURE_CONTENT: "FIXTURE_CONTENT",
  CONFLICTING_EVIDENCE: "CONFLICTING_EVIDENCE",
  INSUFFICIENT_CONTEXT: "INSUFFICIENT_CONTEXT",
});

export const PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS = Object.freeze({
  EDITORIAL_REVIEW: "EDITORIAL_REVIEW",
  SUBJECT_MATTER_REVIEW: "SUBJECT_MATTER_REVIEW",
  SENIOR_COMMUNICATIONS_APPROVAL: "SENIOR_COMMUNICATIONS_APPROVAL",
  LEGAL_OR_POLICY_REVIEW: "LEGAL_OR_POLICY_REVIEW",
  EXECUTIVE_REVIEW: "EXECUTIVE_REVIEW",
  NO_PUBLIC_ACTION_REQUIRED: "NO_PUBLIC_ACTION_REQUIRED",
});

export const PIP_PUBLIC_COMMUNICATION_OWNER_ROLES = Object.freeze({
  MONITORING_ANALYST: "MONITORING_ANALYST",
  COMMUNICATIONS_OFFICER: "COMMUNICATIONS_OFFICER",
  SUBJECT_MATTER_OWNER: "SUBJECT_MATTER_OWNER",
  SERVICE_OWNER: "SERVICE_OWNER",
  LEGAL_POLICY_REVIEWER: "LEGAL_POLICY_REVIEWER",
  SENIOR_APPROVER: "SENIOR_APPROVER",
  NO_OWNER_REQUIRED: "NO_OWNER_REQUIRED",
});

const EVIDENCE_ALLOWED_KEYS = new Set([
  "schema",
  "evidence_id",
  "evidence_type",
  "source_reference",
  "lineage_reference",
  "observed_at",
  "verified_at",
  "valid_until",
  "verification_status",
  "summary",
  "validation_fixture",
]);

const VERIFIED_FACT_ALLOWED_KEYS = new Set([
  "schema",
  "fact_id",
  "factual_statement",
  "supporting_evidence_ids",
  "verification_status",
  "verified_at",
  "valid_until",
  "uncertainty_note",
  "validation_fixture",
]);

const PACKAGE_ALLOWED_KEYS = new Set([
  "schema",
  "package_id",
  "response_case_id",
  "source_issue_id",
  "issue_label",
  "geography_scope",
  "source_recommendation",
  "package_status",
  "public_communication_objective",
  "objective_summary",
  "verified_factual_core",
  "supporting_evidence",
  "uncertainty_classification",
  "uncertainty_notes",
  "wording_risk_codes",
  "approval_level",
  "responsible_owner_role",
  "human_review_required",
  "production_eligible",
  "validation_fixture",
  "created_at",
  "safety",
  "validation",
]);

const EXPORT_ALLOWED_KEYS = new Set([
  "schema",
  "generated_at",
  "contract_schema",
  "collection_schema",
  "summary",
  "production_packages",
  "blocked_packages",
  "review_packages",
  "no_package_required",
  "validation_fixture_packages",
  "invalid_packages",
  "validation_result",
  "safety_manifest",
]);

const FORBIDDEN_FIELD_PATTERN =
  /(raw|post|caption|comment|message|faq|script|holding_statement|slogan|campaign|persuasive|voter|demographic|phone|address|email|token|password|credential|private_message|account_identity)/i;

const FORBIDDEN_TEXT_PATTERN =
  /(facebook|instagram|threads|short-video|video script|faq|comment response|infographic copy|holding statement|slogan|campaign|persuasive|electoral messaging|automated response)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 220) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeUpper(value, max = 120, fallback = "") {
  const text = sanitizeText(value, max).toUpperCase();
  return text || fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
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

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function safeStringify(value) {
  const seen = new Set();
  return JSON.stringify(value, (_key, entry) => {
    if (entry !== null && typeof entry === "object") {
      if (seen.has(entry)) {
        return "[Circular]";
      }
      seen.add(entry);
    }
    return entry;
  });
}

function buildValidationEnvelope(valid, errors, checks, normalized) {
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

function sanitizeEvidenceItem(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EVIDENCE_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA;
  output.evidence_id = sanitizeText(output.evidence_id, 120);
  output.evidence_type = sanitizeText(output.evidence_type, 120);
  output.source_reference = sanitizeText(output.source_reference, 200);
  output.lineage_reference = sanitizeText(output.lineage_reference, 220);
  output.observed_at = normalizeIso(output.observed_at);
  output.verified_at = normalizeIso(output.verified_at);
  output.valid_until = normalizeIso(output.valid_until);
  output.verification_status = sanitizeUpper(
    output.verification_status,
    80,
    PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.PENDING_VERIFICATION
  );
  output.summary = sanitizeText(output.summary, 260);
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);

  return output;
}

function sanitizeVerifiedFact(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (VERIFIED_FACT_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA;
  output.fact_id = sanitizeText(output.fact_id, 120);
  output.factual_statement = sanitizeText(output.factual_statement, 280);
  output.supporting_evidence_ids = uniq(
    toArray(output.supporting_evidence_ids).map((entry) => sanitizeText(entry, 120))
  );
  output.verification_status = sanitizeUpper(
    output.verification_status,
    80,
    PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.PENDING_VERIFICATION
  );
  output.verified_at = normalizeIso(output.verified_at);
  output.valid_until = normalizeIso(output.valid_until);
  output.uncertainty_note = sanitizeText(output.uncertainty_note, 260);
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);

  return output;
}

function sanitizeRecommendationPackage(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (PACKAGE_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA;
  output.package_id = sanitizeText(output.package_id, 120);
  output.response_case_id = sanitizeText(output.response_case_id, 120);
  output.source_issue_id = sanitizeText(output.source_issue_id, 140);
  output.issue_label = sanitizeText(output.issue_label, 220);
  output.geography_scope = sanitizeText(output.geography_scope, 180);
  output.source_recommendation = sanitizeUpper(output.source_recommendation, 120);
  output.package_status = sanitizeUpper(output.package_status, 120);
  output.public_communication_objective = sanitizeUpper(
    output.public_communication_objective,
    120
  );
  output.objective_summary = sanitizeText(output.objective_summary, 260);
  output.verified_factual_core = toArray(output.verified_factual_core).map((entry) =>
    sanitizeVerifiedFact(entry)
  );
  output.supporting_evidence = toArray(output.supporting_evidence).map((entry) =>
    sanitizeEvidenceItem(entry)
  );
  output.uncertainty_classification = sanitizeUpper(
    output.uncertainty_classification,
    80,
    PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  );
  output.uncertainty_notes = sanitizeText(output.uncertainty_notes, 280);
  output.wording_risk_codes = uniq(
    toArray(output.wording_risk_codes).map((entry) => sanitizeUpper(entry, 120))
  );
  output.approval_level = sanitizeUpper(output.approval_level, 120);
  output.responsible_owner_role = sanitizeUpper(output.responsible_owner_role, 120);
  output.human_review_required = normalizeBoolean(output.human_review_required, true);
  output.production_eligible = normalizeBoolean(output.production_eligible, false);
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.created_at = normalizeIso(output.created_at) ?? new Date().toISOString();
  output.safety = {
    evidence_grounded_public_information_support: true,
    response_wording_generated: false,
    platform_content_generated: false,
    content_drafts_generated: false,
    automated_approval: false,
    automated_publication: false,
    persuasion_optimisation: false,
    demographic_targeting: false,
    voter_preference_inference: false,
    election_prediction: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  output.validation = isPlainObject(output.validation)
    ? {
        valid: output.validation.valid === true,
        errors: toArray(output.validation.errors).map((entry) => sanitizeText(entry, 260)),
      }
    : { valid: true, errors: [] };

  return output;
}

export function buildPipPublicCommunicationEvidenceRecommendationContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    evidence_item_schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA,
    verified_fact_schema: PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA,
    package_schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_EXPORT_SCHEMA,
    objectives: { ...PIP_PUBLIC_COMMUNICATION_OBJECTIVES },
    package_statuses: {
      ...PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES,
    },
    evidence_verification_statuses: {
      ...PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES,
    },
    uncertainty_classifications: {
      ...PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS,
    },
    wording_risk_codes: {
      ...PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES,
    },
    approval_levels: { ...PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS },
    owner_roles: { ...PIP_PUBLIC_COMMUNICATION_OWNER_ROLES },
    summary: {
      public_information_support_only: true,
      evidence_grounded_only: true,
      verified_factual_core_required: true,
      explicit_evidence_lineage_required: true,
      uncertainty_disclosure_required: true,
      wording_risk_review_required: true,
      approval_level_required: true,
      responsible_owner_required: true,
      human_review_required: true,
      response_case_dependency_required: true,
      recommendation_mapping_deterministic: true,
      factual_statement_must_be_explicitly_supplied: true,
      response_wording_generation_enabled: false,
      platform_content_generation_enabled: false,
      content_draft_generation_enabled: false,
      automated_response_enabled: false,
      automated_approval_enabled: false,
      automated_publication_enabled: false,
      persuasion_optimisation_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      fact_inference_from_sentiment_enabled: false,
      fact_inference_from_issue_label_enabled: false,
      fact_inference_from_demographics_enabled: false,
      population_weighted_priority_enabled: false,
      production_fallback_fabrication_enabled: false,
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

export function validatePipPublicCommunicationEvidenceRecommendationContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  const checks = {
    schema_match:
      safe.schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA,
    evidence_item_schema_match:
      safe.evidence_item_schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA,
    verified_fact_schema_match:
      safe.verified_fact_schema === PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA,
    package_schema_match:
      safe.package_schema ===
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA,
    collection_schema_match:
      safe.collection_schema ===
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA,
    export_schema_match:
      safe.export_schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_EXPORT_SCHEMA,
    objectives_match:
      JSON.stringify(safe.objectives) === JSON.stringify(PIP_PUBLIC_COMMUNICATION_OBJECTIVES),
    package_statuses_match:
      JSON.stringify(safe.package_statuses) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES),
    evidence_verification_statuses_match:
      JSON.stringify(safe.evidence_verification_statuses) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES),
    uncertainty_classifications_match:
      JSON.stringify(safe.uncertainty_classifications) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS),
    wording_risk_codes_match:
      JSON.stringify(safe.wording_risk_codes) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES),
    approval_levels_match:
      JSON.stringify(safe.approval_levels) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS),
    owner_roles_match:
      JSON.stringify(safe.owner_roles) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_OWNER_ROLES),
  };

  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`${key} failed.`);
    }
  });

  const requiredSummaryFlags = {
    public_information_support_only: true,
    evidence_grounded_only: true,
    verified_factual_core_required: true,
    explicit_evidence_lineage_required: true,
    uncertainty_disclosure_required: true,
    wording_risk_review_required: true,
    approval_level_required: true,
    responsible_owner_required: true,
    human_review_required: true,
    response_case_dependency_required: true,
    recommendation_mapping_deterministic: true,
    factual_statement_must_be_explicitly_supplied: true,
    response_wording_generation_enabled: false,
    platform_content_generation_enabled: false,
    content_draft_generation_enabled: false,
    automated_response_enabled: false,
    automated_approval_enabled: false,
    automated_publication_enabled: false,
    persuasion_optimisation_enabled: false,
    individual_targeting_enabled: false,
    demographic_targeting_enabled: false,
    political_affiliation_inference_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    fact_inference_from_sentiment_enabled: false,
    fact_inference_from_issue_label_enabled: false,
    fact_inference_from_demographics_enabled: false,
    population_weighted_priority_enabled: false,
    production_fallback_fabrication_enabled: false,
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

  Object.entries(requiredSummaryFlags).forEach(([key, expected]) => {
    const matches = summary[key] === expected;
    checks[`summary_${key}`] = matches;
    if (!matches) {
      errors.push(`summary.${key} must be ${String(expected)}.`);
    }
  });

  return buildValidationEnvelope(errors.length === 0, errors, checks, safe);
}

export function validatePipPublicCommunicationEvidenceItem(input = {}) {
  const normalized = sanitizeEvidenceItem(input);
  const errors = [];

  const checks = {
    schema_valid: normalized.schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA,
    evidence_id_present: normalized.evidence_id.length > 0,
    evidence_type_present: normalized.evidence_type.length > 0,
    source_reference_present: normalized.source_reference.length > 0,
    lineage_reference_present: normalized.lineage_reference.length > 0,
    verification_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES,
      normalized.verification_status
    ),
    no_forbidden_keys: Object.keys(input).every(
      (key) => !FORBIDDEN_FIELD_PATTERN.test(String(key))
    ),
    no_forbidden_content: !FORBIDDEN_TEXT_PATTERN.test(JSON.stringify(normalized)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return buildValidationEnvelope(errors.length === 0, errors, checks, normalized);
}

export function validatePipPublicCommunicationVerifiedFact(input = {}) {
  const normalized = sanitizeVerifiedFact(input);
  const errors = [];

  const checks = {
    schema_valid: normalized.schema === PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA,
    fact_id_present: normalized.fact_id.length > 0,
    factual_statement_present: normalized.factual_statement.length > 0,
    supporting_evidence_ids_present: normalized.supporting_evidence_ids.length > 0,
    verification_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES,
      normalized.verification_status
    ),
    no_forbidden_keys: Object.keys(input).every(
      (key) => !FORBIDDEN_FIELD_PATTERN.test(String(key))
    ),
    no_forbidden_content: !FORBIDDEN_TEXT_PATTERN.test(JSON.stringify(normalized)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return buildValidationEnvelope(errors.length === 0, errors, checks, normalized);
}

export function validatePipPublicCommunicationEvidenceRecommendationPackage(
  input = {}
) {
  const normalized = sanitizeRecommendationPackage(input);
  const errors = [];

  const factValidations = normalized.verified_factual_core.map((entry) =>
    validatePipPublicCommunicationVerifiedFact(entry)
  );
  const evidenceValidations = normalized.supporting_evidence.map((entry) =>
    validatePipPublicCommunicationEvidenceItem(entry)
  );

  const checks = {
    schema_valid:
      normalized.schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA,
    package_id_present: normalized.package_id.length > 0,
    response_case_id_present: normalized.response_case_id.length > 0,
    source_issue_id_present: normalized.source_issue_id.length > 0,
    package_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES,
      normalized.package_status
    ),
    objective_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES,
      normalized.public_communication_objective
    ),
    uncertainty_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS,
      normalized.uncertainty_classification
    ),
    approval_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS,
      normalized.approval_level
    ),
    owner_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES,
      normalized.responsible_owner_role
    ),
    wording_risks_allowlisted: normalized.wording_risk_codes.every((entry) =>
      enumIncludes(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES, entry)
    ),
    verified_facts_valid: factValidations.every((entry) => entry.valid === true),
    evidence_items_valid: evidenceValidations.every((entry) => entry.valid === true),
    no_forbidden_content: !FORBIDDEN_TEXT_PATTERN.test(safeStringify(normalized)),
    fixture_not_production:
      normalized.validation_fixture !== true || normalized.production_eligible !== true,
    no_person_name_owner:
      /^[A-Z_]+$/.test(normalized.responsible_owner_role) &&
      normalized.responsible_owner_role.length > 0,
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return buildValidationEnvelope(errors.length === 0, errors, checks, normalized);
}

export function validatePipPublicCommunicationEvidenceRecommendationCollection(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  const productionPackages = toArray(safe.production_packages);
  const blockedPackages = toArray(safe.blocked_packages);
  const reviewPackages = toArray(safe.review_packages);
  const noPackageRequired = toArray(safe.no_package_required);
  const fixturePackages = toArray(safe.validation_fixture_packages);
  const invalidPackages = toArray(safe.invalid_packages);

  const allValidations = [
    ...productionPackages,
    ...blockedPackages,
    ...reviewPackages,
    ...noPackageRequired,
    ...fixturePackages,
    ...invalidPackages,
  ].map((entry) => validatePipPublicCommunicationEvidenceRecommendationPackage(entry));

  const checks = {
    schema_valid:
      safe.schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA,
    contract_schema_valid:
      safe.contract_schema === PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA,
    package_schemas_valid: allValidations.every((entry) => entry.valid === true),
    fixture_excluded_from_production: productionPackages.every(
      (entry) => entry.validation_fixture !== true
    ),
    no_forbidden_content: !FORBIDDEN_TEXT_PATTERN.test(safeStringify(safe)),
    generated_at_present: normalizeIso(safe.generated_at) !== null,
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return buildValidationEnvelope(errors.length === 0, errors, checks, safe);
}

export function sanitizePipPublicCommunicationEvidenceRecommendationExport(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EXPORT_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_EXPORT_SCHEMA;
  output.generated_at = normalizeIso(output.generated_at) ?? new Date().toISOString();
  output.contract_schema =
    PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA;
  output.collection_schema =
    PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA;

  output.summary = isPlainObject(output.summary) ? output.summary : {};
  output.production_packages = toArray(output.production_packages).map((entry) =>
    sanitizeRecommendationPackage(entry)
  );
  output.blocked_packages = toArray(output.blocked_packages).map((entry) =>
    sanitizeRecommendationPackage(entry)
  );
  output.review_packages = toArray(output.review_packages).map((entry) =>
    sanitizeRecommendationPackage(entry)
  );
  output.no_package_required = toArray(output.no_package_required).map((entry) =>
    sanitizeRecommendationPackage(entry)
  );
  output.validation_fixture_packages = toArray(output.validation_fixture_packages).map(
    (entry) => sanitizeRecommendationPackage(entry)
  );
  output.invalid_packages = toArray(output.invalid_packages).map((entry) =>
    sanitizeRecommendationPackage(entry)
  );

  output.validation_result = isPlainObject(output.validation_result)
    ? {
        valid: output.validation_result.valid === true,
        errors: toArray(output.validation_result.errors).map((entry) => sanitizeText(entry, 220)),
      }
    : { valid: false, errors: ["validation_result missing."] };

  output.safety_manifest = {
    evidence_grounded_public_information_support: true,
    human_review_required: true,
    verified_factual_core_required: true,
    evidence_lineage_required: true,
    uncertainty_disclosed: true,
    wording_risks_disclosed: true,
    response_wording_generated: false,
    platform_content_generated: false,
    content_drafts_generated: false,
    automated_approval: false,
    automated_publication: false,
    persuasion_optimisation: false,
    demographic_targeting: false,
    voter_preference_inference: false,
    election_prediction: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  return output;
}
