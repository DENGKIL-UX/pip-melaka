export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA =
  "pip.public-communication.manual-publishing-boundary.contract.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA =
  "pip.public-communication.manual-handoff-package.record.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA =
  "pip.public-communication.manual-handoff-package.collection.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_REQUEST_SCHEMA =
  "pip.public-communication.manual-handoff.preparation-request.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_EVALUATION_SCHEMA =
  "pip.public-communication.manual-handoff.preparation-evaluation.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_REQUEST_SCHEMA =
  "pip.public-communication.manual-handoff.acknowledgement-request.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_RECEIPT_SCHEMA =
  "pip.public-communication.manual-handoff.acknowledgement-receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_REQUEST_SCHEMA =
  "pip.public-communication.verified-publication-linkage.request.v1";
export const PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA =
  "pip.public-communication.verified-publication-linkage.receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_ARCHIVAL_ELIGIBILITY_REPORT_SCHEMA =
  "pip.public-communication.archival-eligibility.report.v1";
export const PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_REQUEST_SCHEMA =
  "pip.public-communication.archival-review.request.v1";
export const PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA =
  "pip.public-communication.archival-review.receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_REQUEST_SCHEMA =
  "pip.public-communication.archival-closure.request.v1";
export const PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA =
  "pip.public-communication.archival-closure.receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA =
  "pip.public-communication.manual-publishing-boundary.history-receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_EXPORT_SCHEMA =
  "pip.public-communication.manual-publishing-boundary.export.v1";

export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES = Object.freeze({
  HANDOFF_NOT_READY: "HANDOFF_NOT_READY",
  HANDOFF_READY: "HANDOFF_READY",
  HANDOFF_ACKNOWLEDGED: "HANDOFF_ACKNOWLEDGED",
  EXTERNAL_PUBLICATION_VERIFIED: "EXTERNAL_PUBLICATION_VERIFIED",
  ARCHIVAL_REVIEW_REQUIRED: "ARCHIVAL_REVIEW_REQUIRED",
  ARCHIVED: "ARCHIVED",
});

export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUS_ORDER =
  Object.freeze([
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_ACKNOWLEDGED,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVAL_REVIEW_REQUIRED,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVED,
  ]);

export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS = Object.freeze({
  PREPARE_MANUAL_HANDOFF: "PREPARE_MANUAL_HANDOFF",
  EXPORT_MANUAL_HANDOFF_PACKAGE: "EXPORT_MANUAL_HANDOFF_PACKAGE",
  ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF: "ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF",
  LINK_VERIFIED_EXTERNAL_PUBLICATION: "LINK_VERIFIED_EXTERNAL_PUBLICATION",
  REQUEST_ARCHIVAL_REVIEW: "REQUEST_ARCHIVAL_REVIEW",
  APPROVE_ARCHIVAL_CLOSURE: "APPROVE_ARCHIVAL_CLOSURE",
  RETURN_ARCHIVAL_REVIEW: "RETURN_ARCHIVAL_REVIEW",
  VOID_UNACKNOWLEDGED_HANDOFF: "VOID_UNACKNOWLEDGED_HANDOFF",
  EXPORT_BOUNDARY_AUDIT_PACKAGE: "EXPORT_BOUNDARY_AUDIT_PACKAGE",
});

export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS =
  Object.freeze({
    SOURCE_QUEUE_COLLECTION_MISSING: "SOURCE_QUEUE_COLLECTION_MISSING",
    SOURCE_QUEUE_COLLECTION_INVALID: "SOURCE_QUEUE_COLLECTION_INVALID",
    SOURCE_QUEUE_ITEM_MISSING: "SOURCE_QUEUE_ITEM_MISSING",
    SOURCE_QUEUE_ITEM_INVALID: "SOURCE_QUEUE_ITEM_INVALID",
    SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION:
      "SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION",
    SOURCE_QUEUE_ITEM_NOT_PUBLISHED: "SOURCE_QUEUE_ITEM_NOT_PUBLISHED",
    SOURCE_QUEUE_ITEM_ALREADY_ARCHIVED: "SOURCE_QUEUE_ITEM_ALREADY_ARCHIVED",
    SOURCE_QUEUE_REVIEW_INCOMPLETE: "SOURCE_QUEUE_REVIEW_INCOMPLETE",
    SOURCE_QUEUE_APPROVAL_MISSING: "SOURCE_QUEUE_APPROVAL_MISSING",
    SOURCE_QUEUE_PUBLICATION_READY_FALSE: "SOURCE_QUEUE_PUBLICATION_READY_FALSE",
    SOURCE_QUEUE_MUTATION_DETECTED: "SOURCE_QUEUE_MUTATION_DETECTED",
    SOURCE_CONTENT_PACKAGE_MISSING: "SOURCE_CONTENT_PACKAGE_MISSING",
    SOURCE_CONTENT_PACKAGE_INVALID: "SOURCE_CONTENT_PACKAGE_INVALID",
    SOURCE_CONTENT_PACKAGE_MUTATION_DETECTED:
      "SOURCE_CONTENT_PACKAGE_MUTATION_DETECTED",
    SOURCE_DRAFT_MISSING: "SOURCE_DRAFT_MISSING",
    SOURCE_DRAFT_INVALID: "SOURCE_DRAFT_INVALID",
    SOURCE_DRAFT_MUTATION_DETECTED: "SOURCE_DRAFT_MUTATION_DETECTED",
    SOURCE_EVIDENCE_MISSING: "SOURCE_EVIDENCE_MISSING",
    SOURCE_EVIDENCE_INVALID: "SOURCE_EVIDENCE_INVALID",
    SOURCE_EVIDENCE_MUTATION_DETECTED: "SOURCE_EVIDENCE_MUTATION_DETECTED",
    SOURCE_EVIDENCE_LINEAGE_INVALID: "SOURCE_EVIDENCE_LINEAGE_INVALID",
    SOURCE_PUBLICATION_REGISTER_COLLECTION_MISSING:
      "SOURCE_PUBLICATION_REGISTER_COLLECTION_MISSING",
    SOURCE_PUBLICATION_REGISTER_COLLECTION_INVALID:
      "SOURCE_PUBLICATION_REGISTER_COLLECTION_INVALID",
    SOURCE_PUBLICATION_REGISTER_ENTRY_MISSING:
      "SOURCE_PUBLICATION_REGISTER_ENTRY_MISSING",
    SOURCE_PUBLICATION_REGISTER_ENTRY_INVALID:
      "SOURCE_PUBLICATION_REGISTER_ENTRY_INVALID",
    SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_READY:
      "SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_READY",
    SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_VERIFIED:
      "SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_VERIFIED",
    SOURCE_PUBLICATION_REGISTER_ENTRY_VOIDED:
      "SOURCE_PUBLICATION_REGISTER_ENTRY_VOIDED",
    SOURCE_PUBLICATION_REGISTER_MUTATION_DETECTED:
      "SOURCE_PUBLICATION_REGISTER_MUTATION_DETECTED",
    PUBLICATION_URL_MISSING: "PUBLICATION_URL_MISSING",
    PUBLICATION_URL_INVALID: "PUBLICATION_URL_INVALID",
    PUBLICATION_TIMESTAMP_MISSING: "PUBLICATION_TIMESTAMP_MISSING",
    PUBLICATION_TIMESTAMP_INVALID: "PUBLICATION_TIMESTAMP_INVALID",
    EXTERNAL_MANUAL_PUBLICATION_NOT_CONFIRMED:
      "EXTERNAL_MANUAL_PUBLICATION_NOT_CONFIRMED",
    PLATFORM_OPERATION_FLAG_INVALID: "PLATFORM_OPERATION_FLAG_INVALID",
    HANDOFF_PACKAGE_INCOMPLETE: "HANDOFF_PACKAGE_INCOMPLETE",
    HANDOFF_PACKAGE_INVALID: "HANDOFF_PACKAGE_INVALID",
    DUPLICATE_ACTIVE_HANDOFF: "DUPLICATE_ACTIVE_HANDOFF",
    HANDOFF_ACKNOWLEDGEMENT_REQUIRED: "HANDOFF_ACKNOWLEDGEMENT_REQUIRED",
    HANDOFF_ACKNOWLEDGEMENT_INVALID: "HANDOFF_ACKNOWLEDGEMENT_INVALID",
    HANDOFF_OPERATOR_ALIAS_INVALID: "HANDOFF_OPERATOR_ALIAS_INVALID",
    HANDOFF_PREPARER_ALIAS_INVALID: "HANDOFF_PREPARER_ALIAS_INVALID",
    HANDOFF_PREPARER_ACKNOWLEDGER_MUST_DIFFER:
      "HANDOFF_PREPARER_ACKNOWLEDGER_MUST_DIFFER",
    ACTOR_ROLE_NOT_AUTHORIZED: "ACTOR_ROLE_NOT_AUTHORIZED",
    ACTOR_ALIAS_INVALID: "ACTOR_ALIAS_INVALID",
    INVALID_CURRENT_STATUS: "INVALID_CURRENT_STATUS",
    INVALID_TARGET_STATUS: "INVALID_TARGET_STATUS",
    STATUS_SKIP_NOT_ALLOWED: "STATUS_SKIP_NOT_ALLOWED",
    MANUAL_ACTION_REQUIRED: "MANUAL_ACTION_REQUIRED",
    VERIFIED_PUBLICATION_LINKAGE_REQUIRED:
      "VERIFIED_PUBLICATION_LINKAGE_REQUIRED",
    VERIFIED_PUBLICATION_LINKAGE_INVALID:
      "VERIFIED_PUBLICATION_LINKAGE_INVALID",
    QUEUE_PUBLISHED_PROJECTION_REQUIRED: "QUEUE_PUBLISHED_PROJECTION_REQUIRED",
    ARCHIVAL_WINDOW_NOT_ELAPSED: "ARCHIVAL_WINDOW_NOT_ELAPSED",
    ARCHIVAL_REVIEW_NOTE_REQUIRED: "ARCHIVAL_REVIEW_NOTE_REQUIRED",
    ARCHIVAL_REVIEW_NOT_REQUESTED: "ARCHIVAL_REVIEW_NOT_REQUESTED",
    ARCHIVAL_APPROVER_ALIAS_INVALID: "ARCHIVAL_APPROVER_ALIAS_INVALID",
    ARCHIVAL_APPROVER_MUST_BE_INDEPENDENT:
      "ARCHIVAL_APPROVER_MUST_BE_INDEPENDENT",
    ARCHIVAL_CLOSURE_ALREADY_COMPLETED: "ARCHIVAL_CLOSURE_ALREADY_COMPLETED",
    UNRESOLVED_CORRECTION_EXISTS: "UNRESOLVED_CORRECTION_EXISTS",
    UNRESOLVED_VOID_EXISTS: "UNRESOLVED_VOID_EXISTS",
    P999_PRODUCTION_HANDOFF_BLOCKED: "P999_PRODUCTION_HANDOFF_BLOCKED",
    P999_PRODUCTION_ARCHIVE_BLOCKED: "P999_PRODUCTION_ARCHIVE_BLOCKED",
    FIXTURE_PRODUCTION_COUNT_BLOCKED: "FIXTURE_PRODUCTION_COUNT_BLOCKED",
    EXTERNAL_PLATFORM_OPERATION_NOT_PERMITTED:
      "EXTERNAL_PLATFORM_OPERATION_NOT_PERMITTED",
    SOCIAL_PLATFORM_CONNECTION_NOT_PERMITTED:
      "SOCIAL_PLATFORM_CONNECTION_NOT_PERMITTED",
    PLATFORM_AUTHENTICATION_NOT_PERMITTED:
      "PLATFORM_AUTHENTICATION_NOT_PERMITTED",
    ASSET_UPLOAD_NOT_PERMITTED: "ASSET_UPLOAD_NOT_PERMITTED",
    PUBLICATION_SCHEDULING_NOT_PERMITTED: "PUBLICATION_SCHEDULING_NOT_PERMITTED",
    AUTOMATED_PUBLICATION_NOT_PERMITTED: "AUTOMATED_PUBLICATION_NOT_PERMITTED",
    AUTOMATED_ARCHIVAL_NOT_PERMITTED: "AUTOMATED_ARCHIVAL_NOT_PERMITTED",
    SOURCE_DELETION_NOT_PERMITTED: "SOURCE_DELETION_NOT_PERMITTED",
    DUPLICATE_ACTION: "DUPLICATE_ACTION",
    UNSUPPORTED_ACTION: "UNSUPPORTED_ACTION",
  });

const PACKAGE_ALLOWED_KEYS = new Set([
  "schema",
  "handoff_package_id",
  "source_queue_item_id",
  "source_publication_register_entry_id",
  "source_content_package_id",
  "source_draft_id",
  "source_recommendation_package_id",
  "response_case_id",
  "source_issue_id",
  "issue_label",
  "geography_scope",
  "content_format",
  "publication_platform",
  "public_channel_label",
  "responsible_owner_role",
  "responsible_owner_alias",
  "approved_draft_label",
  "approved_draft_text",
  "approved_caption",
  "approved_alt_text",
  "approved_short_video_script",
  "approved_faq_content",
  "approved_comment_response",
  "approved_infographic_brief",
  "approved_holding_statement",
  "asset_requirements",
  "evidence_ids",
  "verified_fact_ids",
  "evidence_lineage_status",
  "uncertainty_note",
  "wording_risks",
  "approval_level",
  "approval_reference",
  "approval_verified",
  "due_date",
  "source_queue_status",
  "source_register_status",
  "source_queue_fingerprint",
  "source_content_fingerprint",
  "source_evidence_fingerprint",
  "source_register_fingerprint",
  "current_status",
  "previous_status",
  "status_sequence",
  "prepared_at",
  "prepared_by_role",
  "prepared_by_alias",
  "acknowledged",
  "acknowledged_at",
  "acknowledged_by_role",
  "acknowledged_by_alias",
  "acknowledgement_note",
  "verified_publication_linked",
  "verified_publication_linked_at",
  "verified_publication_url",
  "verified_publication_timestamp",
  "queue_status_projection",
  "archival_eligible_at",
  "archival_review_requested",
  "archival_review_requested_at",
  "archival_review_requested_by_role",
  "archival_review_requested_by_alias",
  "archival_review_note",
  "archival_closure_approved",
  "archival_closure_approved_at",
  "archival_closure_approved_by_role",
  "archival_closure_approved_by_alias",
  "archival_closure_note",
  "retention_classification",
  "outcome_monitoring_compatible",
  "outcome_monitoring_status",
  "outcome_monitoring_record_id",
  "outcome_monitoring_required",
  "boundary_history",
  "history_count",
  "validation_fixture",
  "production_eligible",
  "created_at",
  "updated_at",
  "safety",
]);

const COLLECTION_ALLOWED_KEYS = new Set([
  "schema",
  "contract_schema",
  "generated_at",
  "summary",
  "production_boundary_packages",
  "fixture_boundary_packages",
  "excluded_source_items",
  "blocked_evaluations",
  "successful_boundary_actions",
  "validation",
  "safety",
]);

const ENVELOPE_ALLOWED_KEYS = new Set([
  "schema",
  "handoff_package_id",
  "source_queue_item_id",
  "source_publication_register_entry_id",
  "action",
  "actor_role",
  "actor_alias",
  "note",
  "payload",
  "requested_at",
  "validation_fixture",
  "checks",
  "errors",
  "summary",
  "archival_eligible_at",
  "elapsed_hours",
  "remaining_hours",
]);

const EXPORT_ALLOWED_KEYS = new Set([
  "schema",
  "generated_at",
  "boundary_summary",
  "production_boundary_packages",
  "fixture_boundary_packages",
  "blocked_evaluations",
  "handoff_preparation_receipts",
  "handoff_acknowledgement_receipts",
  "verified_publication_linkage_receipts",
  "internal_published_projection_receipts",
  "archival_eligibility_reports",
  "archival_review_receipts",
  "archival_closure_receipts",
  "internal_archived_projection_receipts",
  "collection_validation_result",
  "safety_manifest",
]);

const FORBIDDEN_KEY_PATTERN =
  /(token|password|credential|session|email|phone|employee|user[_-]?id|account[_-]?id|platform[_-]?username|private[_-]?message|voter|demographic|affiliation|preference)/i;
const FORBIDDEN_VALUE_PATTERN =
  /(token|password|credential|session|oauth|api[_-]?key|authorization|private message|@)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 360) {
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

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
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

function uniq(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function enumIncludes(enumSet, value) {
  return Object.values(enumSet).includes(String(value ?? "").toUpperCase());
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

function sanitizeHistoryReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema:
      sanitizeText(safe.schema, 200) ||
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA,
    receipt_id: sanitizeText(safe.receipt_id, 180),
    action: sanitizeUpper(safe.action, 160),
    from_status: sanitizeUpper(safe.from_status, 160),
    to_status: sanitizeUpper(safe.to_status, 160),
    actor_role: sanitizeUpper(safe.actor_role, 80),
    actor_alias: sanitizeText(safe.actor_alias, 32),
    note: sanitizeText(safe.note, 420),
    created_at: normalizeIso(safe.created_at) ?? new Date().toISOString(),
    safety: {
      platform_operation_performed_by_pip: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      asset_upload_performed_by_pip: false,
      publication_scheduled_by_pip: false,
      publication_attempted_by_pip: false,
      publication_created_by_pip: false,
      publication_edited_by_pip: false,
      publication_deleted_by_pip: false,
      automated_publication_enabled: false,
      automated_archival_enabled: false,
      source_deletion_enabled: false,
      append_only_history: true,
    },
  };
}

export function buildPipPublicCommunicationManualPublishingBoundaryContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    handoff_package_schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA,
    handoff_collection_schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA,
    handoff_preparation_request_schema:
      PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_REQUEST_SCHEMA,
    handoff_preparation_evaluation_schema:
      PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_EVALUATION_SCHEMA,
    handoff_acknowledgement_request_schema:
      PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_REQUEST_SCHEMA,
    handoff_acknowledgement_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_RECEIPT_SCHEMA,
    verified_publication_linkage_request_schema:
      PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_REQUEST_SCHEMA,
    verified_publication_linkage_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA,
    archival_eligibility_report_schema:
      PIP_PUBLIC_COMMUNICATION_ARCHIVAL_ELIGIBILITY_REPORT_SCHEMA,
    archival_review_request_schema:
      PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_REQUEST_SCHEMA,
    archival_review_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA,
    archival_closure_request_schema:
      PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_REQUEST_SCHEMA,
    archival_closure_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA,
    history_schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_EXPORT_SCHEMA,
    statuses: { ...PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES },
    status_order: [...PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUS_ORDER],
    actions: { ...PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS },
    block_reasons: {
      ...PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS,
    },
    summary: {
      public_information_operations_only: true,
      source_content_package_required: true,
      source_production_queue_required: true,
      source_publication_register_required: true,
      source_queue_ready_for_production_required: true,
      source_register_ready_for_handoff_required: true,
      source_register_verified_for_published_required: true,
      evidence_lineage_required: true,
      manual_approval_required: true,
      source_immutability_required: true,
      source_fingerprint_verification_required: true,
      one_active_handoff_per_queue_item: true,
      approved_content_only: true,
      raw_source_content_excluded: true,
      manual_handoff_only: true,
      handoff_acknowledgement_required: true,
      handoff_preparer_acknowledger_separation_required: true,
      verified_external_publication_required: true,
      internal_published_projection_enabled: true,
      published_status_is_internal_classification: true,
      minimum_archival_delay_hours: 72,
      explicit_archival_review_required: true,
      independent_archival_approval_required: true,
      internal_archived_projection_enabled: true,
      archived_status_is_internal_classification: true,
      append_only_boundary_history: true,
      source_deletion_enabled: false,
      platform_content_deletion_enabled: false,
      platform_content_editing_enabled: false,
      platform_operation_enabled: false,
      platform_connection_enabled: false,
      platform_authentication_enabled: false,
      social_platform_api_enabled: false,
      social_platform_sdk_enabled: false,
      oauth_enabled: false,
      asset_upload_enabled: false,
      publication_scheduling_enabled: false,
      automated_publication_enabled: false,
      automated_publication_verification_enabled: false,
      automated_archival_enabled: false,
      automatic_status_transition_enabled: false,
      engagement_monitoring_enabled: false,
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
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
      voter_records_excluded: true,
      voter_identifiers_excluded: true,
      personal_data_excluded: true,
      public_account_identity_excluded: true,
      credential_values_excluded: true,
      platform_tokens_excluded: true,
      session_values_excluded: true,
      in_memory_boundary_only: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
      outcome_monitoring_compatible: true,
      outcome_classification_enabled: false,
    },
  };
}

export function validatePipPublicCommunicationManualPublishingBoundaryContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema:
      safe.schema === PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA,
    handoff_package_schema:
      safe.handoff_package_schema ===
      PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA,
    handoff_collection_schema:
      safe.handoff_collection_schema ===
      PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA,
    status_count: Object.values(safe.statuses ?? {}).length === 6,
    status_order:
      JSON.stringify(safe.status_order) ===
      JSON.stringify(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUS_ORDER
      ),
    minimum_archival_delay: Number(summary.minimum_archival_delay_hours) === 72,
    archive_classification_only:
      summary.archived_status_is_internal_classification === true,
    published_classification_only:
      summary.published_status_is_internal_classification === true,
    manual_handoff_only: summary.manual_handoff_only === true,
    external_network_disabled: summary.external_network_access_enabled === false,
    platform_operation_disabled: summary.platform_operation_enabled === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, safe);
}

export function validatePipPublicCommunicationManualHandoffPackage(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (PACKAGE_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA;
  normalized.handoff_package_id = sanitizeText(normalized.handoff_package_id, 180);
  normalized.source_queue_item_id = sanitizeText(normalized.source_queue_item_id, 180);
  normalized.source_publication_register_entry_id = sanitizeText(
    normalized.source_publication_register_entry_id,
    180
  );
  normalized.source_content_package_id = sanitizeText(
    normalized.source_content_package_id,
    180
  );
  normalized.source_draft_id = sanitizeText(normalized.source_draft_id, 180);
  normalized.source_recommendation_package_id = sanitizeText(
    normalized.source_recommendation_package_id,
    180
  );
  normalized.response_case_id = sanitizeText(normalized.response_case_id, 180);
  normalized.source_issue_id = sanitizeText(normalized.source_issue_id, 180);
  normalized.issue_label = sanitizeText(normalized.issue_label, 280);
  normalized.geography_scope = sanitizeText(normalized.geography_scope, 200);
  normalized.content_format = sanitizeUpper(normalized.content_format, 140);
  normalized.publication_platform = sanitizeUpper(normalized.publication_platform, 120);
  normalized.public_channel_label = sanitizeText(normalized.public_channel_label, 160);
  normalized.responsible_owner_role = sanitizeUpper(
    normalized.responsible_owner_role,
    80
  );
  normalized.responsible_owner_alias = sanitizeText(
    normalized.responsible_owner_alias,
    32
  );
  normalized.approved_draft_label = sanitizeText(normalized.approved_draft_label, 100);
  normalized.approved_draft_text = sanitizeText(normalized.approved_draft_text, 10000);
  normalized.approved_caption = sanitizeText(normalized.approved_caption, 3000);
  normalized.approved_alt_text = sanitizeText(normalized.approved_alt_text, 2000);
  normalized.approved_short_video_script = sanitizeText(
    normalized.approved_short_video_script,
    6000
  );
  normalized.approved_faq_content = sanitizeText(normalized.approved_faq_content, 7000);
  normalized.approved_comment_response = sanitizeText(
    normalized.approved_comment_response,
    3000
  );
  normalized.approved_infographic_brief = sanitizeText(
    normalized.approved_infographic_brief,
    5000
  );
  normalized.approved_holding_statement = sanitizeText(
    normalized.approved_holding_statement,
    5000
  );
  normalized.asset_requirements = toArray(normalized.asset_requirements);
  normalized.evidence_ids = uniq(
    toArray(normalized.evidence_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.verified_fact_ids = uniq(
    toArray(normalized.verified_fact_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.evidence_lineage_status = sanitizeUpper(
    normalized.evidence_lineage_status,
    120,
    "VALID"
  );
  normalized.uncertainty_note = sanitizeText(normalized.uncertainty_note, 1000);
  normalized.wording_risks = uniq(
    toArray(normalized.wording_risks).map((entry) => sanitizeText(entry, 120))
  );
  normalized.approval_level = sanitizeUpper(normalized.approval_level, 120);
  normalized.approval_reference = sanitizeText(normalized.approval_reference, 200);
  normalized.approval_verified = normalizeBoolean(normalized.approval_verified, false);
  normalized.due_date = normalizeIso(normalized.due_date) ?? "";
  normalized.source_queue_status = sanitizeUpper(normalized.source_queue_status, 140);
  normalized.source_register_status = sanitizeUpper(
    normalized.source_register_status,
    140
  );
  normalized.source_queue_fingerprint = sanitizeText(
    normalized.source_queue_fingerprint,
    180
  );
  normalized.source_content_fingerprint = sanitizeText(
    normalized.source_content_fingerprint,
    180
  );
  normalized.source_evidence_fingerprint = sanitizeText(
    normalized.source_evidence_fingerprint,
    180
  );
  normalized.source_register_fingerprint = sanitizeText(
    normalized.source_register_fingerprint,
    180
  );
  normalized.current_status = sanitizeUpper(
    normalized.current_status,
    180,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY
  );
  normalized.previous_status = sanitizeUpper(normalized.previous_status, 180);
  normalized.status_sequence = normalizeInteger(normalized.status_sequence, 1);
  normalized.prepared_at = normalizeIso(normalized.prepared_at) ?? new Date().toISOString();
  normalized.prepared_by_role = sanitizeUpper(normalized.prepared_by_role, 80);
  normalized.prepared_by_alias = sanitizeText(normalized.prepared_by_alias, 32);
  normalized.acknowledged = normalizeBoolean(normalized.acknowledged, false);
  normalized.acknowledged_at = normalizeIso(normalized.acknowledged_at) ?? "";
  normalized.acknowledged_by_role = sanitizeUpper(
    normalized.acknowledged_by_role,
    80
  );
  normalized.acknowledged_by_alias = sanitizeText(
    normalized.acknowledged_by_alias,
    32
  );
  normalized.acknowledgement_note = sanitizeText(
    normalized.acknowledgement_note,
    420
  );
  normalized.verified_publication_linked = normalizeBoolean(
    normalized.verified_publication_linked,
    false
  );
  normalized.verified_publication_linked_at =
    normalizeIso(normalized.verified_publication_linked_at) ?? "";
  normalized.verified_publication_url = sanitizeText(
    normalized.verified_publication_url,
    2048
  );
  normalized.verified_publication_timestamp =
    normalizeIso(normalized.verified_publication_timestamp) ?? "";
  normalized.queue_status_projection = sanitizeUpper(
    normalized.queue_status_projection,
    160,
    "READY_FOR_PRODUCTION"
  );
  normalized.archival_eligible_at = normalizeIso(normalized.archival_eligible_at) ?? "";
  normalized.archival_review_requested = normalizeBoolean(
    normalized.archival_review_requested,
    false
  );
  normalized.archival_review_requested_at =
    normalizeIso(normalized.archival_review_requested_at) ?? "";
  normalized.archival_review_requested_by_role = sanitizeUpper(
    normalized.archival_review_requested_by_role,
    80
  );
  normalized.archival_review_requested_by_alias = sanitizeText(
    normalized.archival_review_requested_by_alias,
    32
  );
  normalized.archival_review_note = sanitizeText(normalized.archival_review_note, 420);
  normalized.archival_closure_approved = normalizeBoolean(
    normalized.archival_closure_approved,
    false
  );
  normalized.archival_closure_approved_at =
    normalizeIso(normalized.archival_closure_approved_at) ?? "";
  normalized.archival_closure_approved_by_role = sanitizeUpper(
    normalized.archival_closure_approved_by_role,
    80
  );
  normalized.archival_closure_approved_by_alias = sanitizeText(
    normalized.archival_closure_approved_by_alias,
    32
  );
  normalized.archival_closure_note = sanitizeText(
    normalized.archival_closure_note,
    420
  );
  normalized.retention_classification =
    sanitizeUpper(normalized.retention_classification, 140) ||
    "CONTENT_PRODUCTION_RECORD_RETAINED";
  normalized.outcome_monitoring_compatible = normalizeBoolean(
    normalized.outcome_monitoring_compatible,
    true
  );
  normalized.outcome_monitoring_status =
    sanitizeUpper(normalized.outcome_monitoring_status, 120) ||
    "NOT_YET_EVALUATED";
  normalized.outcome_monitoring_record_id = sanitizeText(
    normalized.outcome_monitoring_record_id,
    180
  );
  normalized.outcome_monitoring_required = normalizeBoolean(
    normalized.outcome_monitoring_required,
    true
  );
  normalized.boundary_history = toArray(normalized.boundary_history).map(
    sanitizeHistoryReceipt
  );
  normalized.history_count = normalizeInteger(
    normalized.history_count,
    normalized.boundary_history.length
  );
  normalized.validation_fixture = normalizeBoolean(normalized.validation_fixture, false);
  normalized.production_eligible = normalizeBoolean(normalized.production_eligible, false);
  normalized.created_at = normalizeIso(normalized.created_at) ?? new Date().toISOString();
  normalized.updated_at = normalizeIso(normalized.updated_at) ?? normalized.created_at;
  normalized.safety = {
    platform_operation_performed_by_pip: false,
    platform_connection_performed_by_pip: false,
    platform_authentication_performed_by_pip: false,
    asset_upload_performed_by_pip: false,
    publication_scheduled_by_pip: false,
    publication_attempted_by_pip: false,
    publication_created_by_pip: false,
    publication_edited_by_pip: false,
    publication_deleted_by_pip: false,
    automated_publication_enabled: false,
    automated_archival_enabled: false,
    source_deletion_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
    append_only_history: true,
  };

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA,
    handoff_package_id: normalized.handoff_package_id.length > 0,
    queue_item_id: normalized.source_queue_item_id.length > 0,
    register_entry_id: normalized.source_publication_register_entry_id.length > 0,
    status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES,
      normalized.current_status
    ),
    status_sequence_valid: normalized.status_sequence >= 1,
    no_forbidden_keys: Object.keys(safe).every(
      (key) => !FORBIDDEN_KEY_PATTERN.test(String(key))
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
    approved_only:
      normalized.approved_draft_text.length > 0 ||
      normalized.approved_caption.length > 0 ||
      normalized.approved_short_video_script.length > 0 ||
      normalized.approved_faq_content.length > 0 ||
      normalized.approved_comment_response.length > 0 ||
      normalized.approved_infographic_brief.length > 0 ||
      normalized.approved_holding_statement.length > 0,
    manual_boundary_only:
      normalized.safety.platform_operation_performed_by_pip === false &&
      normalized.safety.publication_created_by_pip === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationManualHandoffCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (COLLECTION_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA;
  normalized.contract_schema =
    sanitizeText(normalized.contract_schema, 200) ||
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA;
  normalized.generated_at = normalizeIso(normalized.generated_at) ?? new Date().toISOString();
  normalized.summary = isPlainObject(normalized.summary) ? normalized.summary : {};
  normalized.production_boundary_packages = toArray(
    normalized.production_boundary_packages
  ).map((entry) => validatePipPublicCommunicationManualHandoffPackage(entry).normalized);
  normalized.fixture_boundary_packages = toArray(
    normalized.fixture_boundary_packages
  ).map((entry) => validatePipPublicCommunicationManualHandoffPackage(entry).normalized);
  normalized.excluded_source_items = toArray(normalized.excluded_source_items);
  normalized.blocked_evaluations = toArray(normalized.blocked_evaluations);
  normalized.successful_boundary_actions = normalizeInteger(
    normalized.successful_boundary_actions,
    0
  );
  normalized.validation = isPlainObject(normalized.validation)
    ? {
        valid: normalized.validation.valid === true,
        errors: toArray(normalized.validation.errors).map((entry) =>
          sanitizeText(entry, 260)
        ),
      }
    : { valid: true, errors: [] };
  normalized.safety = isPlainObject(normalized.safety)
    ? normalized.safety
    : {
        platform_operation_performed_by_pip: false,
        platform_connection_performed_by_pip: false,
        platform_authentication_performed_by_pip: false,
        asset_upload_performed_by_pip: false,
        publication_scheduled_by_pip: false,
        publication_attempted_by_pip: false,
        publication_created_by_pip: false,
        publication_edited_by_pip: false,
        publication_deleted_by_pip: false,
        automated_publication_enabled: false,
        automated_archival_enabled: false,
        source_deletion_enabled: false,
        browser_storage_modified: false,
        central_repository_modified: false,
        external_network_request_made: false,
      };

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA,
    contract_schema:
      normalized.contract_schema ===
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA,
    production_excludes_fixture: normalized.production_boundary_packages.every(
      (entry) => entry.validation_fixture !== true
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

function validateEnvelope(input = {}, schemaFallback = "") {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (ENVELOPE_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema =
    sanitizeText(normalized.schema, 200) || sanitizeText(schemaFallback, 200);
  normalized.handoff_package_id = sanitizeText(normalized.handoff_package_id, 180);
  normalized.source_queue_item_id = sanitizeText(normalized.source_queue_item_id, 180);
  normalized.source_publication_register_entry_id = sanitizeText(
    normalized.source_publication_register_entry_id,
    180
  );
  normalized.action = sanitizeUpper(normalized.action, 160);
  normalized.actor_role = sanitizeUpper(normalized.actor_role, 80);
  normalized.actor_alias = sanitizeText(normalized.actor_alias, 32);
  normalized.note = sanitizeText(normalized.note, 420);
  normalized.payload = isPlainObject(normalized.payload) ? normalized.payload : {};
  normalized.requested_at = normalizeIso(normalized.requested_at) ?? new Date().toISOString();
  normalized.validation_fixture = normalizeBoolean(normalized.validation_fixture, false);
  normalized.checks = isPlainObject(normalized.checks) ? normalized.checks : {};
  normalized.errors = toArray(normalized.errors).map((entry) => sanitizeText(entry, 260));
  normalized.summary = isPlainObject(normalized.summary) ? normalized.summary : {};
  normalized.archival_eligible_at = normalizeIso(normalized.archival_eligible_at) ?? "";
  normalized.elapsed_hours = Number(normalized.elapsed_hours ?? 0) || 0;
  normalized.remaining_hours = Number(normalized.remaining_hours ?? 0) || 0;

  const checks = {
    schema_present: normalized.schema.length > 0,
    actor_alias_safe: !FORBIDDEN_VALUE_PATTERN.test(normalized.actor_alias),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationManualHandoffPreparationRequest(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_REQUEST_SCHEMA
  );
}

export function validatePipPublicCommunicationManualHandoffPreparationEvaluation(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_EVALUATION_SCHEMA
  );
}

export function validatePipPublicCommunicationManualHandoffAcknowledgementRequest(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_REQUEST_SCHEMA
  );
}

export function validatePipPublicCommunicationManualHandoffAcknowledgementReceipt(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_RECEIPT_SCHEMA
  );
}

export function validatePipPublicCommunicationVerifiedPublicationLinkageRequest(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_REQUEST_SCHEMA
  );
}

export function validatePipPublicCommunicationVerifiedPublicationLinkageReceipt(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA
  );
}

export function validatePipPublicCommunicationArchivalEligibilityReport(input = {}) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_ARCHIVAL_ELIGIBILITY_REPORT_SCHEMA);
}

export function validatePipPublicCommunicationArchivalReviewRequest(input = {}) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_REQUEST_SCHEMA);
}

export function validatePipPublicCommunicationArchivalReviewReceipt(input = {}) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA);
}

export function validatePipPublicCommunicationArchivalClosureRequest(input = {}) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_REQUEST_SCHEMA);
}

export function validatePipPublicCommunicationArchivalClosureReceipt(input = {}) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA);
}

export function validatePipPublicCommunicationManualPublishingBoundaryHistoryReceipt(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA
  );
}

export function sanitizePipPublicCommunicationManualPublishingBoundaryExport(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const sanitized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EXPORT_ALLOWED_KEYS.has(key)) sanitized[key] = value;
  });

  sanitized.schema = PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_EXPORT_SCHEMA;
  sanitized.generated_at = normalizeIso(sanitized.generated_at) ?? new Date().toISOString();
  sanitized.boundary_summary = isPlainObject(sanitized.boundary_summary)
    ? sanitized.boundary_summary
    : {};
  sanitized.production_boundary_packages = toArray(
    sanitized.production_boundary_packages
  ).map((entry) => validatePipPublicCommunicationManualHandoffPackage(entry).normalized);
  sanitized.fixture_boundary_packages = toArray(sanitized.fixture_boundary_packages).map(
    (entry) => validatePipPublicCommunicationManualHandoffPackage(entry).normalized
  );
  sanitized.blocked_evaluations = toArray(sanitized.blocked_evaluations);
  sanitized.handoff_preparation_receipts = toArray(
    sanitized.handoff_preparation_receipts
  ).map((entry) =>
    validatePipPublicCommunicationManualHandoffPreparationEvaluation(entry).normalized
  );
  sanitized.handoff_acknowledgement_receipts = toArray(
    sanitized.handoff_acknowledgement_receipts
  ).map((entry) =>
    validatePipPublicCommunicationManualHandoffAcknowledgementReceipt(entry).normalized
  );
  sanitized.verified_publication_linkage_receipts = toArray(
    sanitized.verified_publication_linkage_receipts
  ).map((entry) =>
    validatePipPublicCommunicationVerifiedPublicationLinkageReceipt(entry).normalized
  );
  sanitized.internal_published_projection_receipts = toArray(
    sanitized.internal_published_projection_receipts
  ).map((entry) =>
    validatePipPublicCommunicationVerifiedPublicationLinkageReceipt(entry).normalized
  );
  sanitized.archival_eligibility_reports = toArray(
    sanitized.archival_eligibility_reports
  ).map((entry) => validatePipPublicCommunicationArchivalEligibilityReport(entry).normalized);
  sanitized.archival_review_receipts = toArray(sanitized.archival_review_receipts).map(
    (entry) => validatePipPublicCommunicationArchivalReviewReceipt(entry).normalized
  );
  sanitized.archival_closure_receipts = toArray(sanitized.archival_closure_receipts).map(
    (entry) => validatePipPublicCommunicationArchivalClosureReceipt(entry).normalized
  );
  sanitized.internal_archived_projection_receipts = toArray(
    sanitized.internal_archived_projection_receipts
  ).map((entry) => validatePipPublicCommunicationArchivalClosureReceipt(entry).normalized);
  sanitized.collection_validation_result = isPlainObject(
    sanitized.collection_validation_result
  )
    ? sanitized.collection_validation_result
    : { valid: true, errors: [] };
  sanitized.safety_manifest = {
    platform_operation_performed_by_pip: false,
    platform_connection_performed_by_pip: false,
    platform_authentication_performed_by_pip: false,
    asset_upload_performed_by_pip: false,
    publication_scheduled_by_pip: false,
    publication_attempted_by_pip: false,
    publication_created_by_pip: false,
    publication_edited_by_pip: false,
    publication_deleted_by_pip: false,
    automated_publication_enabled: false,
    automated_archival_enabled: false,
    source_deletion_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
    ...(isPlainObject(sanitized.safety_manifest) ? sanitized.safety_manifest : {}),
  };

  return sanitized;
}
