export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA =
  "pip.public-communication.production-queue.contract.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_ITEM_SCHEMA =
  "pip.public-communication.production-queue.item.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA =
  "pip.public-communication.production-queue.collection.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_REQUEST_SCHEMA =
  "pip.public-communication.production-queue.transition-request.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA =
  "pip.public-communication.production-queue.transition-evaluation.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA =
  "pip.public-communication.production-queue.transition-receipt.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA =
  "pip.public-communication.production-queue.export.v1";

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  EVIDENCE_REVIEW: "EVIDENCE_REVIEW",
  EDITORIAL_REVIEW: "EDITORIAL_REVIEW",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  APPROVED: "APPROVED",
  READY_FOR_PRODUCTION: "READY_FOR_PRODUCTION",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
});

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER = Object.freeze([
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVED,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.PUBLISHED,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.ARCHIVED,
]);

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS =
  Object.freeze({
    SUBMIT_FOR_EVIDENCE_REVIEW: "SUBMIT_FOR_EVIDENCE_REVIEW",
    COMPLETE_EVIDENCE_REVIEW: "COMPLETE_EVIDENCE_REVIEW",
    SUBMIT_FOR_EDITORIAL_REVIEW: "SUBMIT_FOR_EDITORIAL_REVIEW",
    COMPLETE_EDITORIAL_REVIEW: "COMPLETE_EDITORIAL_REVIEW",
    REQUEST_APPROVAL: "REQUEST_APPROVAL",
    RECORD_APPROVAL: "RECORD_APPROVAL",
    MARK_READY_FOR_PRODUCTION: "MARK_READY_FOR_PRODUCTION",
    RETURN_TO_DRAFT: "RETURN_TO_DRAFT",
    MARK_PUBLISHED: "MARK_PUBLISHED",
    ARCHIVE_ITEM: "ARCHIVE_ITEM",
  });

export const PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS =
  Object.freeze({
    SOURCE_CONTENT_PACKAGE_MISSING: "SOURCE_CONTENT_PACKAGE_MISSING",
    SOURCE_CONTENT_PACKAGE_INVALID: "SOURCE_CONTENT_PACKAGE_INVALID",
    SOURCE_CONTENT_PACKAGE_NOT_PRODUCTION_ELIGIBLE:
      "SOURCE_CONTENT_PACKAGE_NOT_PRODUCTION_ELIGIBLE",
    SOURCE_DRAFT_MISSING: "SOURCE_DRAFT_MISSING",
    SOURCE_DRAFT_INVALID: "SOURCE_DRAFT_INVALID",
    SOURCE_DRAFT_NOT_HUMAN_REVIEWABLE: "SOURCE_DRAFT_NOT_HUMAN_REVIEWABLE",
    SOURCE_DRAFT_PUBLICATION_READY: "SOURCE_DRAFT_PUBLICATION_READY",
    SOURCE_MUTATION_DETECTED: "SOURCE_MUTATION_DETECTED",
    VALIDATION_FIXTURE_PRODUCTION_TRANSITION_BLOCKED:
      "VALIDATION_FIXTURE_PRODUCTION_TRANSITION_BLOCKED",
    INVALID_CURRENT_STATUS: "INVALID_CURRENT_STATUS",
    INVALID_TARGET_STATUS: "INVALID_TARGET_STATUS",
    STATUS_SKIP_NOT_ALLOWED: "STATUS_SKIP_NOT_ALLOWED",
    MANUAL_TRANSITION_REQUIRED: "MANUAL_TRANSITION_REQUIRED",
    ACTOR_ROLE_NOT_AUTHORIZED: "ACTOR_ROLE_NOT_AUTHORIZED",
    REVIEW_NOTE_REQUIRED: "REVIEW_NOTE_REQUIRED",
    EVIDENCE_REVIEW_INCOMPLETE: "EVIDENCE_REVIEW_INCOMPLETE",
    EDITORIAL_REVIEW_INCOMPLETE: "EDITORIAL_REVIEW_INCOMPLETE",
    APPROVAL_NOT_RECORDED: "APPROVAL_NOT_RECORDED",
    APPROVAL_ROLE_REQUIRED: "APPROVAL_ROLE_REQUIRED",
    PUBLICATION_REGISTER_REQUIRED: "PUBLICATION_REGISTER_REQUIRED",
    PUBLICATION_RECORD_REQUIRED: "PUBLICATION_RECORD_REQUIRED",
    PUBLISHED_TRANSITION_DISABLED_IN_BATCH_64A:
      "PUBLISHED_TRANSITION_DISABLED_IN_BATCH_64A",
    ARCHIVE_TRANSITION_DISABLED_IN_BATCH_64A:
      "ARCHIVE_TRANSITION_DISABLED_IN_BATCH_64A",
    QUEUE_ITEM_TERMINAL: "QUEUE_ITEM_TERMINAL",
    DUPLICATE_TRANSITION: "DUPLICATE_TRANSITION",
    UNSUPPORTED_ACTION: "UNSUPPORTED_ACTION",
    P999_PRODUCTION_TRANSITION_BLOCKED: "P999_PRODUCTION_TRANSITION_BLOCKED",
  });

const ITEM_ALLOWED_KEYS = new Set([
  "schema",
  "queue_item_id",
  "source_content_package_id",
  "source_draft_id",
  "source_recommendation_package_id",
  "response_case_id",
  "source_issue_id",
  "issue_label",
  "geography_scope",
  "content_format",
  "draft_label",
  "current_status",
  "previous_status",
  "status_sequence",
  "assigned_owner_role",
  "responsible_owner_role",
  "approval_level",
  "verified_fact_ids",
  "evidence_ids",
  "uncertainty_note",
  "wording_risk_codes",
  "evidence_review",
  "editorial_review",
  "approval",
  "production_readiness",
  "transition_history",
  "transition_count",
  "human_review_required",
  "manual_transition_only",
  "publication_ready",
  "publication_registered",
  "automated_transition_allowed",
  "automated_approval_allowed",
  "automated_publication_allowed",
  "validation_fixture",
  "production_eligible",
  "created_at",
  "updated_at",
  "safety",
  "source_fingerprint",
]);

const COLLECTION_ALLOWED_KEYS = new Set([
  "schema",
  "contract_schema",
  "generated_at",
  "summary",
  "production_queue_items",
  "fixture_queue_items",
  "excluded_source_packages",
  "blocked_transition_evaluations",
  "successful_transition_count",
  "validation",
  "safety",
]);

const REQUEST_ALLOWED_KEYS = new Set([
  "schema",
  "queue_item_id",
  "action",
  "expected_current_status",
  "requested_target_status",
  "actor_role",
  "actor_alias",
  "review_note",
  "requested_at",
  "validation_fixture",
  "source_item_fingerprint",
]);

const EVALUATION_ALLOWED_KEYS = new Set([
  "schema",
  "valid",
  "permitted",
  "queue_item_id",
  "action",
  "from_status",
  "to_status",
  "block_reasons",
  "required_dependency",
  "errors",
  "summary",
]);

const RECEIPT_ALLOWED_KEYS = new Set([
  "schema",
  "transition_id",
  "queue_item_id",
  "action",
  "from_status",
  "to_status",
  "actor_role",
  "actor_alias",
  "review_note",
  "transitioned_at",
  "source_item_fingerprint_before",
  "source_item_fingerprint_after",
  "source_content_fingerprint",
  "sequence",
  "manual_transition",
  "automated_transition",
  "validation_fixture",
  "safety",
]);

const EXPORT_ALLOWED_KEYS = new Set([
  "schema",
  "generated_at",
  "contract_schema",
  "collection_schema",
  "queue_summary",
  "production_queue_items",
  "fixture_queue_items",
  "excluded_source_package_summary",
  "sanitized_transition_history",
  "blocked_transition_evaluations",
  "validation_result",
  "safety_manifest",
]);

const FORBIDDEN_KEY_PATTERN =
  /(email|full_name|account_id|token|session|credential|password|private_message|voter|demographic|affiliation|preference|election_forecast|browser_storage)/i;

const FORBIDDEN_VALUE_PATTERN =
  /(token|password|credential|private message|session identifier|raw public-account identity)/i;

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

function sanitizeUpper(value, max = 140, fallback = "") {
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

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
      if (seen.has(entry)) return "[Circular]";
      seen.add(entry);
    }
    return entry;
  });
}

function enumIncludes(enumSet, value) {
  return Object.values(enumSet).includes(String(value ?? "").toUpperCase());
}

function buildValidationEnvelope(valid, checks, errors, normalized) {
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

function sanitizeReviewRecord(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    required: normalizeBoolean(safe.required, true),
    status: sanitizeUpper(safe.status, 120, "PENDING"),
    reviewer_role: sanitizeUpper(safe.reviewer_role, 120),
    reviewer_alias: sanitizeText(safe.reviewer_alias, 24),
    review_note: sanitizeText(safe.review_note, 360),
    completed: normalizeBoolean(safe.completed, false),
    completed_at: normalizeIso(safe.completed_at),
  };
}

function sanitizeApprovalRecord(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    required: normalizeBoolean(safe.required, true),
    status: sanitizeUpper(safe.status, 120, "PENDING"),
    approver_role: sanitizeUpper(safe.approver_role, 120),
    approver_alias: sanitizeText(safe.approver_alias, 24),
    approval_note: sanitizeText(safe.approval_note, 360),
    approved: normalizeBoolean(safe.approved, false),
    approved_at: normalizeIso(safe.approved_at),
  };
}

function sanitizeTransitionReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};
  Object.entries(safe).forEach(([key, value]) => {
    if (RECEIPT_ALLOWED_KEYS.has(key)) output[key] = value;
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA;
  output.transition_id = sanitizeText(output.transition_id, 160);
  output.queue_item_id = sanitizeText(output.queue_item_id, 160);
  output.action = sanitizeUpper(output.action, 120);
  output.from_status = sanitizeUpper(output.from_status, 120);
  output.to_status = sanitizeUpper(output.to_status, 120);
  output.actor_role = sanitizeUpper(output.actor_role, 120);
  output.actor_alias = sanitizeText(output.actor_alias, 24);
  output.review_note = sanitizeText(output.review_note, 360);
  output.transitioned_at = normalizeIso(output.transitioned_at) ?? new Date().toISOString();
  output.source_item_fingerprint_before = sanitizeText(
    output.source_item_fingerprint_before,
    140
  );
  output.source_item_fingerprint_after = sanitizeText(
    output.source_item_fingerprint_after,
    140
  );
  output.source_content_fingerprint = sanitizeText(output.source_content_fingerprint, 140);
  output.sequence = normalizeInteger(output.sequence, 1);
  output.manual_transition = true;
  output.automated_transition = false;
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.safety = {
    append_only_transition_history: true,
    manual_transition: true,
    automated_transition: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  return output;
}

export function buildPipPublicCommunicationProductionQueueContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    queue_item_schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_ITEM_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA,
    transition_request_schema:
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_REQUEST_SCHEMA,
    transition_evaluation_schema:
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA,
    transition_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA,
    statuses: { ...PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES },
    status_order: [...PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER],
    transition_actions: {
      ...PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS,
    },
    transition_block_reasons: {
      ...PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS,
    },
    summary: {
      public_information_operations_only: true,
      source_content_package_required: true,
      source_content_draft_required: true,
      one_queue_item_per_draft: true,
      source_immutability_required: true,
      evidence_grounding_required: true,
      evidence_lineage_required: true,
      human_review_required: true,
      manual_transition_only: true,
      sequential_status_transition_required: true,
      status_skipping_enabled: false,
      append_only_transition_history: true,
      review_note_required_for_return_to_draft: true,
      evidence_review_required: true,
      editorial_review_required: true,
      manual_approval_required: true,
      administrator_approval_required: true,
      publication_register_required: true,
      eight_statuses_required: true,
      initial_status_draft: true,
      maximum_batch64a_status:
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
      published_status_contract_visible: true,
      archived_status_contract_visible: true,
      published_transition_enabled: false,
      archive_transition_enabled: false,
      automated_transition_enabled: false,
      automated_review_enabled: false,
      automated_approval_enabled: false,
      automated_publication_enabled: false,
      publication_scheduling_enabled: false,
      social_platform_api_enabled: false,
      external_asset_upload_enabled: false,
      engagement_optimisation_enabled: false,
      persuasion_optimisation_enabled: false,
      political_persuasion_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      voter_targeting_enabled: false,
      locality_persuasion_ranking_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      factual_claim_creation_enabled: false,
      source_content_mutation_enabled: false,
      source_evidence_mutation_enabled: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
      in_memory_queue_only: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
    },
  };
}

export function validatePipPublicCommunicationProductionQueueContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  const checks = {
    schema_match:
      safe.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA,
    queue_item_schema_match:
      safe.queue_item_schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_ITEM_SCHEMA,
    collection_schema_match:
      safe.collection_schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA,
    transition_request_schema_match:
      safe.transition_request_schema ===
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_REQUEST_SCHEMA,
    transition_evaluation_schema_match:
      safe.transition_evaluation_schema ===
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA,
    transition_receipt_schema_match:
      safe.transition_receipt_schema ===
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA,
    export_schema_match:
      safe.export_schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA,
    statuses_match:
      JSON.stringify(safe.statuses) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES),
    status_order_match:
      JSON.stringify(safe.status_order) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER),
    actions_match:
      JSON.stringify(safe.transition_actions) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS),
    block_reasons_match:
      JSON.stringify(safe.transition_block_reasons) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS),
  };

  const requiredSummaryFlags = {
    public_information_operations_only: true,
    source_content_package_required: true,
    source_content_draft_required: true,
    one_queue_item_per_draft: true,
    source_immutability_required: true,
    evidence_grounding_required: true,
    evidence_lineage_required: true,
    human_review_required: true,
    manual_transition_only: true,
    sequential_status_transition_required: true,
    status_skipping_enabled: false,
    append_only_transition_history: true,
    review_note_required_for_return_to_draft: true,
    evidence_review_required: true,
    editorial_review_required: true,
    manual_approval_required: true,
    administrator_approval_required: true,
    publication_register_required: true,
    eight_statuses_required: true,
    initial_status_draft: true,
    maximum_batch64a_status:
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
    published_status_contract_visible: true,
    archived_status_contract_visible: true,
    published_transition_enabled: false,
    archive_transition_enabled: false,
    automated_transition_enabled: false,
    automated_review_enabled: false,
    automated_approval_enabled: false,
    automated_publication_enabled: false,
    publication_scheduling_enabled: false,
    social_platform_api_enabled: false,
    external_asset_upload_enabled: false,
    engagement_optimisation_enabled: false,
    persuasion_optimisation_enabled: false,
    political_persuasion_enabled: false,
    individual_targeting_enabled: false,
    demographic_targeting_enabled: false,
    voter_targeting_enabled: false,
    locality_persuasion_ranking_enabled: false,
    political_affiliation_inference_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    factual_claim_creation_enabled: false,
    source_content_mutation_enabled: false,
    source_evidence_mutation_enabled: false,
    validation_fixture_separated: true,
    p999_fixture_separated: true,
    production_totals_exclude_validation_fixtures: true,
    in_memory_queue_only: true,
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

  return buildValidationEnvelope(errors.length === 0, checks, errors, safe);
}

export function validatePipPublicCommunicationProductionQueueItem(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (ITEM_ALLOWED_KEYS.has(key)) output[key] = value;
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_ITEM_SCHEMA;
  output.queue_item_id = sanitizeText(output.queue_item_id, 160);
  output.source_content_package_id = sanitizeText(output.source_content_package_id, 160);
  output.source_draft_id = sanitizeText(output.source_draft_id, 160);
  output.source_recommendation_package_id = sanitizeText(
    output.source_recommendation_package_id,
    160
  );
  output.response_case_id = sanitizeText(output.response_case_id, 160);
  output.source_issue_id = sanitizeText(output.source_issue_id, 160);
  output.issue_label = sanitizeText(output.issue_label, 260);
  output.geography_scope = sanitizeText(output.geography_scope, 180);
  output.content_format = sanitizeUpper(output.content_format, 120);
  output.draft_label = sanitizeText(output.draft_label, 80);
  output.current_status = sanitizeUpper(
    output.current_status,
    120,
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT
  );
  output.previous_status = sanitizeUpper(output.previous_status, 120);
  output.status_sequence = normalizeInteger(output.status_sequence, 1);
  output.assigned_owner_role = sanitizeUpper(output.assigned_owner_role, 120);
  output.responsible_owner_role = sanitizeUpper(output.responsible_owner_role, 120);
  output.approval_level = sanitizeUpper(output.approval_level, 120);
  output.verified_fact_ids = uniq(
    toArray(output.verified_fact_ids).map((entry) => sanitizeText(entry, 120))
  );
  output.evidence_ids = uniq(
    toArray(output.evidence_ids).map((entry) => sanitizeText(entry, 120))
  );
  output.uncertainty_note = sanitizeText(output.uncertainty_note, 320);
  output.wording_risk_codes = uniq(
    toArray(output.wording_risk_codes).map((entry) => sanitizeUpper(entry, 120))
  );
  output.evidence_review = sanitizeReviewRecord(output.evidence_review);
  output.editorial_review = sanitizeReviewRecord(output.editorial_review);
  output.approval = sanitizeApprovalRecord(output.approval);
  output.production_readiness = {
    required: normalizeBoolean(output.production_readiness?.required, true),
    status: sanitizeUpper(output.production_readiness?.status, 120, "PENDING"),
    note: sanitizeText(output.production_readiness?.note, 360),
    ready: normalizeBoolean(output.production_readiness?.ready, false),
    checked_at: normalizeIso(output.production_readiness?.checked_at),
  };
  output.transition_history = toArray(output.transition_history).map((entry) =>
    sanitizeTransitionReceipt(entry)
  );
  output.transition_count = normalizeInteger(output.transition_count, 0);
  output.human_review_required = normalizeBoolean(output.human_review_required, true);
  output.manual_transition_only = normalizeBoolean(output.manual_transition_only, true);
  output.publication_ready = normalizeBoolean(output.publication_ready, false);
  output.publication_registered = normalizeBoolean(output.publication_registered, false);
  output.automated_transition_allowed = normalizeBoolean(
    output.automated_transition_allowed,
    false
  );
  output.automated_approval_allowed = normalizeBoolean(
    output.automated_approval_allowed,
    false
  );
  output.automated_publication_allowed = normalizeBoolean(
    output.automated_publication_allowed,
    false
  );
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.production_eligible = normalizeBoolean(output.production_eligible, false);
  output.created_at = normalizeIso(output.created_at) ?? new Date().toISOString();
  output.updated_at = normalizeIso(output.updated_at) ?? output.created_at;
  output.source_fingerprint = sanitizeText(output.source_fingerprint, 140);
  output.safety = {
    source_content_package_required: true,
    source_content_draft_required: true,
    one_queue_item_per_source_draft: true,
    source_immutability_required: true,
    manual_transition_only: true,
    sequential_status_transition_required: true,
    status_skipping_enabled: false,
    maximum_batch64a_status:
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
    published_transition_enabled: false,
    archive_transition_enabled: false,
    automated_transition_enabled: false,
    automated_approval_enabled: false,
    automated_publication_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  const errors = [];

  const checks = {
    schema_valid: output.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_ITEM_SCHEMA,
    queue_item_id_present: output.queue_item_id.length > 0,
    source_content_package_id_present: output.source_content_package_id.length > 0,
    source_draft_id_present: output.source_draft_id.length > 0,
    status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      output.current_status
    ),
    format_present: output.content_format.length > 0,
    draft_label_required:
      output.draft_label === "DRAFT — HUMAN REVIEW REQUIRED" ||
      output.draft_label === "DRAFT - HUMAN REVIEW REQUIRED",
    fact_ids_present: output.verified_fact_ids.length > 0,
    evidence_ids_present: output.evidence_ids.length > 0,
    transition_count_consistent: output.transition_count === output.transition_history.length,
    manual_transition_only: output.manual_transition_only === true,
    publication_ready_false: output.publication_ready === false,
    no_forbidden_keys: Object.keys(input).every(
      (key) => !FORBIDDEN_KEY_PATTERN.test(String(key))
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(output)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, output);
}

export function validatePipPublicCommunicationProductionQueueCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (COLLECTION_ALLOWED_KEYS.has(key)) output[key] = value;
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA;
  output.contract_schema =
    sanitizeText(output.contract_schema, 120) ||
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA;
  output.generated_at = normalizeIso(output.generated_at) ?? new Date().toISOString();
  output.summary = isPlainObject(output.summary) ? output.summary : {};
  output.production_queue_items = toArray(output.production_queue_items).map((entry) =>
    validatePipPublicCommunicationProductionQueueItem(entry).normalized
  );
  output.fixture_queue_items = toArray(output.fixture_queue_items).map((entry) =>
    validatePipPublicCommunicationProductionQueueItem(entry).normalized
  );
  output.excluded_source_packages = toArray(output.excluded_source_packages);
  output.blocked_transition_evaluations = toArray(output.blocked_transition_evaluations);
  output.successful_transition_count = normalizeInteger(
    output.successful_transition_count,
    0
  );
  output.validation = isPlainObject(output.validation)
    ? {
        valid: output.validation.valid === true,
        errors: toArray(output.validation.errors).map((entry) => sanitizeText(entry, 260)),
      }
    : { valid: true, errors: [] };
  output.safety = isPlainObject(output.safety) ? output.safety : {};

  const allItems = [...output.production_queue_items, ...output.fixture_queue_items];
  const itemValidations = allItems.map((entry) =>
    validatePipPublicCommunicationProductionQueueItem(entry)
  );

  const errors = [];
  const checks = {
    schema_valid: output.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA,
    contract_schema_valid:
      output.contract_schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA,
    generated_at_present: normalizeIso(output.generated_at) !== null,
    all_queue_items_valid: itemValidations.every((entry) => entry.valid === true),
    fixture_excluded_from_production: output.production_queue_items.every(
      (entry) => entry.validation_fixture !== true
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(output)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, output);
}

export function validatePipPublicCommunicationProductionQueueTransitionRequest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (REQUEST_ALLOWED_KEYS.has(key)) output[key] = value;
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_REQUEST_SCHEMA;
  output.queue_item_id = sanitizeText(output.queue_item_id, 160);
  output.action = sanitizeUpper(output.action, 120);
  output.expected_current_status = sanitizeUpper(output.expected_current_status, 120);
  output.requested_target_status = sanitizeUpper(output.requested_target_status, 120);
  output.actor_role = sanitizeUpper(output.actor_role, 120);
  output.actor_alias = sanitizeText(output.actor_alias, 24);
  output.review_note = sanitizeText(output.review_note, 360);
  output.requested_at = normalizeIso(output.requested_at) ?? new Date().toISOString();
  output.validation_fixture = normalizeBoolean(output.validation_fixture, false);
  output.source_item_fingerprint = sanitizeText(output.source_item_fingerprint, 140);

  const errors = [];
  const checks = {
    schema_valid:
      output.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_REQUEST_SCHEMA,
    queue_item_id_present: output.queue_item_id.length > 0,
    action_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS,
      output.action
    ),
    expected_current_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      output.expected_current_status
    ),
    requested_target_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      output.requested_target_status
    ),
    actor_role_present: output.actor_role.length > 0,
    actor_alias_sanitized:
      /^REV-[A-Z0-9]{4,16}$/.test(output.actor_alias) || output.actor_alias.length === 0,
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(output)),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, output);
}

export function validatePipPublicCommunicationProductionQueueTransitionEvaluation(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EVALUATION_ALLOWED_KEYS.has(key)) output[key] = value;
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA;
  output.valid = output.valid === true;
  output.permitted = output.permitted === true;
  output.queue_item_id = sanitizeText(output.queue_item_id, 160);
  output.action = sanitizeUpper(output.action, 120);
  output.from_status = sanitizeUpper(output.from_status, 120);
  output.to_status = sanitizeUpper(output.to_status, 120);
  output.block_reasons = uniq(
    toArray(output.block_reasons).map((entry) => sanitizeUpper(entry, 140))
  );
  output.required_dependency = sanitizeText(output.required_dependency, 80);
  output.errors = toArray(output.errors).map((entry) => sanitizeText(entry, 260));
  output.summary = isPlainObject(output.summary) ? output.summary : {};

  const errors = [];
  const checks = {
    schema_valid:
      output.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA,
    action_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS,
      output.action
    ),
    from_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      output.from_status
    ),
    to_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      output.to_status
    ),
    block_reasons_allowlisted: output.block_reasons.every((entry) =>
      enumIncludes(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS, entry)
    ),
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, output);
}

export function validatePipPublicCommunicationProductionQueueTransitionReceipt(
  input = {}
) {
  const normalized = sanitizeTransitionReceipt(input);
  const errors = [];

  const checks = {
    schema_valid:
      normalized.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA,
    transition_id_present: normalized.transition_id.length > 0,
    queue_item_id_present: normalized.queue_item_id.length > 0,
    action_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS,
      normalized.action
    ),
    from_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      normalized.from_status
    ),
    to_status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
      normalized.to_status
    ),
    manual_transition_true: normalized.manual_transition === true,
    automated_transition_false: normalized.automated_transition === false,
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function sanitizePipPublicCommunicationProductionQueueExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const output = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EXPORT_ALLOWED_KEYS.has(key)) output[key] = value;
  });

  output.schema = PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA;
  output.generated_at = normalizeIso(output.generated_at) ?? new Date().toISOString();
  output.contract_schema =
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA;
  output.collection_schema =
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA;
  output.queue_summary = isPlainObject(output.queue_summary) ? output.queue_summary : {};
  output.production_queue_items = toArray(output.production_queue_items).map(
    (entry) => validatePipPublicCommunicationProductionQueueItem(entry).normalized
  );
  output.fixture_queue_items = toArray(output.fixture_queue_items).map(
    (entry) => validatePipPublicCommunicationProductionQueueItem(entry).normalized
  );
  output.excluded_source_package_summary = isPlainObject(
    output.excluded_source_package_summary
  )
    ? output.excluded_source_package_summary
    : {};
  output.sanitized_transition_history = toArray(output.sanitized_transition_history).map(
    (entry) => validatePipPublicCommunicationProductionQueueTransitionReceipt(entry).normalized
  );
  output.blocked_transition_evaluations = toArray(
    output.blocked_transition_evaluations
  ).map((entry) =>
    validatePipPublicCommunicationProductionQueueTransitionEvaluation(entry).normalized
  );
  output.validation_result = isPlainObject(output.validation_result)
    ? {
        valid: output.validation_result.valid === true,
        errors: toArray(output.validation_result.errors).map((entry) =>
          sanitizeText(entry, 260)
        ),
      }
    : { valid: false, errors: ["validation_result missing."] };
  output.safety_manifest = {
    source_content_package_required: true,
    one_queue_item_per_source_draft: true,
    evidence_lineage_required: true,
    manual_transition_required: true,
    published_transition_enabled: false,
    archive_transition_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  return output;
}
