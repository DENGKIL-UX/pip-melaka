export const PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA =
  "pip.public-communication.content-package.contract.v1";

export const PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_SCHEMA =
  "pip.public-communication.content-package.draft.v1";

export const PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA =
  "pip.public-communication.content-package.record.v1";

export const PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA =
  "pip.public-communication.content-package.collection.v1";

export const PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_EXPORT_SCHEMA =
  "pip.public-communication.content-package.export.v1";

export const PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS = Object.freeze({
  FACEBOOK_POST: "FACEBOOK_POST",
  INSTAGRAM_CAPTION: "INSTAGRAM_CAPTION",
  THREADS_POST: "THREADS_POST",
  SHORT_VIDEO_SCRIPT: "SHORT_VIDEO_SCRIPT",
  FAQ: "FAQ",
  COMMENT_RESPONSE: "COMMENT_RESPONSE",
  INFOGRAPHIC_BRIEF: "INFOGRAPHIC_BRIEF",
  HOLDING_STATEMENT: "HOLDING_STATEMENT",
});

export const PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES = Object.freeze({
  READY_FOR_HUMAN_REVIEW: "READY_FOR_HUMAN_REVIEW",
  BLOCKED_SOURCE_NOT_READY: "BLOCKED_SOURCE_NOT_READY",
  BLOCKED_EVIDENCE_INVALID: "BLOCKED_EVIDENCE_INVALID",
  REQUIRES_SPECIALIST_REVIEW: "REQUIRES_SPECIALIST_REVIEW",
  NO_CONTENT_REQUIRED: "NO_CONTENT_REQUIRED",
  VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
  INVALID: "INVALID",
});

export const PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES = Object.freeze({
  DRAFT_CREATED: "DRAFT_CREATED",
  DRAFT_BLOCKED: "DRAFT_BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  VALIDATION_FIXTURE_DRAFT: "VALIDATION_FIXTURE_DRAFT",
});

export const PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS =
  Object.freeze({
    EVIDENCE_REVIEW_REQUIRED: "EVIDENCE_REVIEW_REQUIRED",
    EDITORIAL_REVIEW_REQUIRED: "EDITORIAL_REVIEW_REQUIRED",
    SUBJECT_MATTER_REVIEW_REQUIRED: "SUBJECT_MATTER_REVIEW_REQUIRED",
    LEGAL_POLICY_REVIEW_REQUIRED: "LEGAL_POLICY_REVIEW_REQUIRED",
    SENIOR_APPROVAL_REQUIRED: "SENIOR_APPROVAL_REQUIRED",
  });

export const PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS = Object.freeze({
  SOURCE_PACKAGE_MISSING: "SOURCE_PACKAGE_MISSING",
  SOURCE_PACKAGE_INVALID: "SOURCE_PACKAGE_INVALID",
  SOURCE_PACKAGE_NOT_READY: "SOURCE_PACKAGE_NOT_READY",
  SOURCE_PACKAGE_FIXTURE_ONLY: "SOURCE_PACKAGE_FIXTURE_ONLY",
  VERIFIED_FACTUAL_CORE_MISSING: "VERIFIED_FACTUAL_CORE_MISSING",
  VERIFIED_EVIDENCE_MISSING: "VERIFIED_EVIDENCE_MISSING",
  EVIDENCE_LINEAGE_INVALID: "EVIDENCE_LINEAGE_INVALID",
  EVIDENCE_EXPIRED: "EVIDENCE_EXPIRED",
  EVIDENCE_CONFLICTING: "EVIDENCE_CONFLICTING",
  UNCERTAINTY_TOO_HIGH: "UNCERTAINTY_TOO_HIGH",
  SPECIALIST_REVIEW_REQUIRED: "SPECIALIST_REVIEW_REQUIRED",
  NO_PUBLIC_COMMUNICATION_ACTION: "NO_PUBLIC_COMMUNICATION_ACTION",
  MONITORING_ONLY: "MONITORING_ONLY",
  SOURCE_MUTATION_DETECTED: "SOURCE_MUTATION_DETECTED",
});

const DRAFT_ALLOWED_KEYS = new Set([
  "schema",
  "draft_id",
  "content_package_id",
  "source_recommendation_package_id",
  "response_case_id",
  "format",
  "draft_status",
  "draft_label",
  "content_sections",
  "verified_fact_ids",
  "evidence_ids",
  "uncertainty_note",
  "wording_risk_codes",
  "approval_level",
  "responsible_owner_role",
  "review_requirements",
  "human_review_required",
  "publication_ready",
  "automated_publication_allowed",
  "validation_fixture",
  "created_at",
  "safety",
]);

const PACKAGE_ALLOWED_KEYS = new Set([
  "schema",
  "content_package_id",
  "source_recommendation_package_id",
  "response_case_id",
  "source_issue_id",
  "issue_label",
  "geography_scope",
  "source_recommendation",
  "public_communication_objective",
  "verified_factual_core",
  "supporting_evidence",
  "uncertainty_classification",
  "uncertainty_notes",
  "wording_risk_codes",
  "approval_level",
  "responsible_owner_role",
  "package_status",
  "drafts",
  "draft_format_count",
  "human_review_required",
  "production_eligible",
  "publication_ready",
  "validation_fixture",
  "created_at",
  "safety",
  "validation",
  "block_reasons",
]);

const EXPORT_ALLOWED_KEYS = new Set([
  "schema",
  "generated_at",
  "contract_schema",
  "collection_schema",
  "summary",
  "production_content_packages",
  "blocked_records",
  "specialist_review_records",
  "no_content_required_records",
  "validation_fixture_packages",
  "draft_format_summaries",
  "validation_result",
  "safety_manifest",
]);

const FORBIDDEN_FIELD_PATTERN =
  /(voter|demographic|affiliation|preference|electoral|forecast|phone|address|private|credential|token|password|browser_storage|session_storage|account_identity)/i;

const FORBIDDEN_TEXT_PATTERN =
  /(access token|password|credential|private message|raw account identity|voter targeting|demographic targeting|political persuasion|election prediction)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 260) {
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
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return fallback;
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function uniq(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
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

function enumIncludes(enumSet, value) {
  return Object.values(enumSet).includes(String(value ?? "").toUpperCase());
}

function validationEnvelope(valid, checks, errors, normalized) {
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

function sanitizeContentSections(value) {
  const safe = isPlainObject(value) ? value : {};
  const output = {};

  Object.entries(safe).forEach(([key, entry]) => {
    if (FORBIDDEN_FIELD_PATTERN.test(key)) return;
    if (Array.isArray(entry)) {
      output[key] = entry.map((item) =>
        isPlainObject(item)
          ? {
              text: sanitizeText(item.text, 420),
              verified_fact_ids: uniq(
                toArray(item.verified_fact_ids).map((id) => sanitizeText(id, 120))
              ),
              evidence_ids: uniq(
                toArray(item.evidence_ids).map((id) => sanitizeText(id, 120))
              ),
            }
          : sanitizeText(item, 320)
      );
      return;
    }

    output[key] = sanitizeText(entry, 520);
  });

  return output;
}

function sanitizeContentDraft(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (DRAFT_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_SCHEMA;
  output.draft_id = sanitizeText(output.draft_id, 140);
  output.content_package_id = sanitizeText(output.content_package_id, 140);
  output.source_recommendation_package_id = sanitizeText(
    output.source_recommendation_package_id,
    140
  );
  output.response_case_id = sanitizeText(output.response_case_id, 140);
  output.format = sanitizeUpper(output.format, 120);
  output.draft_status = sanitizeUpper(
    output.draft_status,
    120,
    PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES.DRAFT_BLOCKED
  );
  output.draft_label = "DRAFT — HUMAN REVIEW REQUIRED";
  output.content_sections = sanitizeContentSections(output.content_sections);
  output.verified_fact_ids = uniq(
    toArray(output.verified_fact_ids).map((id) => sanitizeText(id, 120))
  );
  output.evidence_ids = uniq(
    toArray(output.evidence_ids).map((id) => sanitizeText(id, 120))
  );
  output.uncertainty_note = sanitizeText(output.uncertainty_note, 320);
  output.wording_risk_codes = uniq(
    toArray(output.wording_risk_codes).map((entry) => sanitizeUpper(entry, 120))
  );
  output.approval_level = sanitizeUpper(output.approval_level, 120);
  output.responsible_owner_role = sanitizeUpper(output.responsible_owner_role, 120);
  output.review_requirements = uniq(
    toArray(output.review_requirements).map((entry) => sanitizeUpper(entry, 120))
  );
  output.human_review_required = true;
  output.publication_ready = false;
  output.automated_publication_allowed = false;
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.created_at = normalizeIso(output.created_at) ?? new Date().toISOString();
  output.safety = {
    evidence_review_required: true,
    editorial_review_required: true,
    subject_matter_review_required: true,
    legal_policy_review_required: true,
    senior_approval_required: true,
    publication_ready: false,
    automated_publication_allowed: false,
    automated_response_enabled: false,
    social_platform_api_enabled: false,
    engagement_optimisation_enabled: false,
    persuasion_optimisation_enabled: false,
    individual_targeting_enabled: false,
    demographic_targeting_enabled: false,
    voter_targeting_enabled: false,
  };

  return output;
}

function sanitizeContentPackage(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (PACKAGE_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA;
  output.content_package_id = sanitizeText(output.content_package_id, 140);
  output.source_recommendation_package_id = sanitizeText(
    output.source_recommendation_package_id,
    140
  );
  output.response_case_id = sanitizeText(output.response_case_id, 140);
  output.source_issue_id = sanitizeText(output.source_issue_id, 140);
  output.issue_label = sanitizeText(output.issue_label, 260);
  output.geography_scope = sanitizeText(output.geography_scope, 160);
  output.source_recommendation = sanitizeUpper(output.source_recommendation, 120);
  output.public_communication_objective = sanitizeUpper(
    output.public_communication_objective,
    120
  );
  output.verified_factual_core = toArray(output.verified_factual_core).map((fact) => ({
    fact_id: sanitizeText(fact?.fact_id, 120),
    factual_statement: sanitizeText(fact?.factual_statement, 320),
    supporting_evidence_ids: uniq(
      toArray(fact?.supporting_evidence_ids).map((id) => sanitizeText(id, 120))
    ),
  }));
  output.supporting_evidence = toArray(output.supporting_evidence).map((evidence) => ({
    evidence_id: sanitizeText(evidence?.evidence_id, 120),
    lineage_reference: sanitizeText(evidence?.lineage_reference, 220),
    verification_status: sanitizeUpper(evidence?.verification_status, 80),
    valid_until: normalizeIso(evidence?.valid_until),
    summary: sanitizeText(evidence?.summary, 320),
  }));
  output.uncertainty_classification = sanitizeUpper(
    output.uncertainty_classification,
    120
  );
  output.uncertainty_notes = sanitizeText(output.uncertainty_notes, 320);
  output.wording_risk_codes = uniq(
    toArray(output.wording_risk_codes).map((code) => sanitizeUpper(code, 120))
  );
  output.approval_level = sanitizeUpper(output.approval_level, 120);
  output.responsible_owner_role = sanitizeUpper(output.responsible_owner_role, 120);
  output.package_status = sanitizeUpper(
    output.package_status,
    120,
    PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.INVALID
  );
  output.drafts = toArray(output.drafts).map((draft) => sanitizeContentDraft(draft));
  output.draft_format_count = Number(output.draft_format_count ?? output.drafts.length) || 0;
  output.human_review_required = true;
  output.production_eligible = normalizeBoolean(output.production_eligible, false);
  output.publication_ready = false;
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.created_at = normalizeIso(output.created_at) ?? new Date().toISOString();
  output.block_reasons = uniq(
    toArray(output.block_reasons).map((entry) => sanitizeUpper(entry, 120))
  );
  output.safety = {
    evidence_grounded_content_only: true,
    verified_factual_core_required: true,
    evidence_lineage_required: true,
    human_review_required: true,
    publication_ready: false,
    automated_publication_enabled: false,
    social_platform_api_enabled: false,
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

export function buildPipPublicCommunicationContentPackageContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    draft_schema: PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_SCHEMA,
    package_schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_EXPORT_SCHEMA,
    formats: { ...PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS },
    package_statuses: { ...PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES },
    draft_statuses: { ...PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES },
    review_requirements: { ...PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS },
    block_reasons: { ...PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS },
    summary: {
      public_information_support_only: true,
      evidence_grounded_content_only: true,
      source_recommendation_package_required: true,
      verified_factual_core_required: true,
      explicit_evidence_lineage_required: true,
      uncertainty_disclosure_required: true,
      wording_risk_disclosure_required: true,
      approval_level_preserved: true,
      responsible_owner_preserved: true,
      human_review_required: true,
      draft_label_required: true,
      eight_supported_formats_required: true,
      deterministic_template_generation: true,
      platform_content_generation_enabled: true,
      draft_generation_enabled: true,
      automated_response_enabled: false,
      automated_approval_enabled: false,
      automated_publication_enabled: false,
      publication_scheduling_enabled: false,
      social_platform_api_enabled: false,
      engagement_optimisation_enabled: false,
      persuasion_optimisation_enabled: false,
      political_persuasion_enabled: false,
      emotional_manipulation_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      voter_targeting_enabled: false,
      locality_persuasion_ranking_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      factual_claim_creation_enabled: false,
      unsupported_paraphrase_enabled: false,
      source_fact_mutation_enabled: false,
      source_evidence_mutation_enabled: false,
      raw_public_content_included: false,
      public_account_identity_included: false,
      voter_records_included: false,
      personal_data_included: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_results_exclude_validation_fixtures: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
    },
  };
}

export function validatePipPublicCommunicationContentPackageContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  const checks = {
    schema_match:
      safe.schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA,
    draft_schema_match: safe.draft_schema === PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_SCHEMA,
    package_schema_match: safe.package_schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA,
    collection_schema_match:
      safe.collection_schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA,
    export_schema_match: safe.export_schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_EXPORT_SCHEMA,
    formats_match:
      JSON.stringify(safe.formats) === JSON.stringify(PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS),
    package_statuses_match:
      JSON.stringify(safe.package_statuses) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES),
    draft_statuses_match:
      JSON.stringify(safe.draft_statuses) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES),
    review_requirements_match:
      JSON.stringify(safe.review_requirements) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS),
    block_reasons_match:
      JSON.stringify(safe.block_reasons) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS),
  };

  const requiredSummaryFlags = {
    public_information_support_only: true,
    evidence_grounded_content_only: true,
    source_recommendation_package_required: true,
    verified_factual_core_required: true,
    explicit_evidence_lineage_required: true,
    uncertainty_disclosure_required: true,
    wording_risk_disclosure_required: true,
    approval_level_preserved: true,
    responsible_owner_preserved: true,
    human_review_required: true,
    draft_label_required: true,
    eight_supported_formats_required: true,
    deterministic_template_generation: true,
    platform_content_generation_enabled: true,
    draft_generation_enabled: true,
    automated_response_enabled: false,
    automated_approval_enabled: false,
    automated_publication_enabled: false,
    publication_scheduling_enabled: false,
    social_platform_api_enabled: false,
    engagement_optimisation_enabled: false,
    persuasion_optimisation_enabled: false,
    political_persuasion_enabled: false,
    emotional_manipulation_enabled: false,
    individual_targeting_enabled: false,
    demographic_targeting_enabled: false,
    voter_targeting_enabled: false,
    locality_persuasion_ranking_enabled: false,
    political_affiliation_inference_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    factual_claim_creation_enabled: false,
    unsupported_paraphrase_enabled: false,
    source_fact_mutation_enabled: false,
    source_evidence_mutation_enabled: false,
    raw_public_content_included: false,
    public_account_identity_included: false,
    voter_records_included: false,
    personal_data_included: false,
    validation_fixture_separated: true,
    p999_fixture_separated: true,
    production_results_exclude_validation_fixtures: true,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_access_enabled: false,
    automatic_refresh_enabled: false,
    recurring_timer_enabled: false,
  };

  Object.entries(requiredSummaryFlags).forEach(([key, expected]) => {
    const passed = summary[key] === expected;
    checks[`summary_${key}`] = passed;
    if (!passed) {
      errors.push(`summary.${key} must be ${String(expected)}.`);
    }
  });

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return validationEnvelope(errors.length === 0, checks, errors, safe);
}

export function validatePipPublicCommunicationContentDraft(input = {}) {
  const normalized = sanitizeContentDraft(input);
  const errors = [];

  const checks = {
    schema_valid: normalized.schema === PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_SCHEMA,
    draft_id_present: normalized.draft_id.length > 0,
    package_id_present: normalized.content_package_id.length > 0,
    source_package_id_present: normalized.source_recommendation_package_id.length > 0,
    response_case_id_present: normalized.response_case_id.length > 0,
    format_allowlisted: enumIncludes(PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS, normalized.format),
    draft_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES,
      normalized.draft_status
    ),
    review_requirements_allowlisted: normalized.review_requirements.every((entry) =>
      enumIncludes(PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS, entry)
    ),
    human_review_required_true: normalized.human_review_required === true,
    publication_ready_false: normalized.publication_ready === false,
    automated_publication_false: normalized.automated_publication_allowed === false,
    draft_label_required: normalized.draft_label === "DRAFT — HUMAN REVIEW REQUIRED",
    fact_ids_present: normalized.verified_fact_ids.length > 0 || normalized.draft_status !== "DRAFT_CREATED",
    evidence_ids_present: normalized.evidence_ids.length > 0 || normalized.draft_status !== "DRAFT_CREATED",
    no_forbidden_keys: Object.keys(input).every((key) => !FORBIDDEN_FIELD_PATTERN.test(String(key))),
    no_forbidden_text: !FORBIDDEN_TEXT_PATTERN.test(safeStringify(normalized)),
  };

  const factualSections = toArray(normalized.content_sections?.factual_sections);
  checks.factual_sections_lineage_valid =
    normalized.draft_status !== "DRAFT_CREATED" ||
    factualSections.every(
      (entry) =>
        toArray(entry?.verified_fact_ids).length > 0 && toArray(entry?.evidence_ids).length > 0
    );

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return validationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationContentPackage(input = {}) {
  const normalized = sanitizeContentPackage(input);
  const errors = [];

  const draftValidations = normalized.drafts.map((entry) =>
    validatePipPublicCommunicationContentDraft(entry)
  );

  const checks = {
    schema_valid: normalized.schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA,
    package_id_present: normalized.content_package_id.length > 0,
    source_package_id_present: normalized.source_recommendation_package_id.length > 0,
    response_case_id_present: normalized.response_case_id.length > 0,
    package_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES,
      normalized.package_status
    ),
    all_drafts_valid: draftValidations.every((entry) => entry.valid === true),
    draft_count_matches: normalized.draft_format_count === normalized.drafts.length,
    publication_ready_false: normalized.publication_ready === false,
    human_review_required_true: normalized.human_review_required === true,
    fixture_not_in_production:
      normalized.validation_fixture !== true || normalized.production_eligible !== true,
    block_reasons_allowlisted: normalized.block_reasons.every((entry) =>
      enumIncludes(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS, entry)
    ),
    no_forbidden_text: !FORBIDDEN_TEXT_PATTERN.test(safeStringify(normalized)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return validationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationContentPackageCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  const productionPackages = toArray(safe.production_content_packages);
  const blockedRecords = toArray(safe.blocked_records);
  const specialistReviewRecords = toArray(safe.specialist_review_records);
  const noContentRequiredRecords = toArray(safe.no_content_required_records);
  const fixturePackages = toArray(safe.validation_fixture_packages);
  const invalidRecords = toArray(safe.invalid_records);

  const validations = [
    ...productionPackages,
    ...blockedRecords,
    ...specialistReviewRecords,
    ...noContentRequiredRecords,
    ...fixturePackages,
    ...invalidRecords,
  ].map((entry) => validatePipPublicCommunicationContentPackage(entry));

  const checks = {
    schema_valid: safe.schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA,
    contract_schema_valid:
      safe.contract_schema === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA,
    generated_at_present: normalizeIso(safe.generated_at) !== null,
    records_valid: validations.every((entry) => entry.valid === true),
    fixture_excluded_from_production: productionPackages.every(
      (entry) => entry.validation_fixture !== true
    ),
    no_forbidden_text: !FORBIDDEN_TEXT_PATTERN.test(safeStringify(safe)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`${key} failed.`);
    }
  });

  return validationEnvelope(errors.length === 0, checks, errors, safe);
}

export function sanitizePipPublicCommunicationContentPackageExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EXPORT_ALLOWED_KEYS.has(key)) {
      output[key] = value;
    }
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_EXPORT_SCHEMA;
  output.generated_at = normalizeIso(output.generated_at) ?? new Date().toISOString();
  output.contract_schema = PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA;
  output.collection_schema = PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA;
  output.summary = isPlainObject(output.summary) ? output.summary : {};
  output.production_content_packages = toArray(output.production_content_packages).map((entry) =>
    sanitizeContentPackage(entry)
  );
  output.blocked_records = toArray(output.blocked_records).map((entry) =>
    sanitizeContentPackage(entry)
  );
  output.specialist_review_records = toArray(output.specialist_review_records).map((entry) =>
    sanitizeContentPackage(entry)
  );
  output.no_content_required_records = toArray(output.no_content_required_records).map((entry) =>
    sanitizeContentPackage(entry)
  );
  output.validation_fixture_packages = toArray(output.validation_fixture_packages).map((entry) =>
    sanitizeContentPackage(entry)
  );
  output.draft_format_summaries = isPlainObject(output.draft_format_summaries)
    ? output.draft_format_summaries
    : {};
  output.validation_result = isPlainObject(output.validation_result)
    ? {
        valid: output.validation_result.valid === true,
        errors: toArray(output.validation_result.errors).map((entry) => sanitizeText(entry, 260)),
      }
    : { valid: false, errors: ["validation_result missing."] };
  output.safety_manifest = {
    evidence_grounded_drafts_only: true,
    verified_factual_core_required: true,
    evidence_lineage_required: true,
    human_review_required: true,
    publication_ready: false,
    automated_response: false,
    automated_approval: false,
    automated_publication: false,
    social_media_api_connection: false,
    engagement_optimisation: false,
    persuasion_optimisation: false,
    individual_targeting: false,
    demographic_targeting: false,
    voter_targeting: false,
    political_affiliation_inference: false,
    voter_preference_inference: false,
    election_prediction: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  return output;
}
