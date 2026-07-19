export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA =
  "pip.public-communication.publication-register.contract.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA =
  "pip.public-communication.publication-register.entry.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA =
  "pip.public-communication.publication-register.collection.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CREATE_REQUEST_SCHEMA =
  "pip.public-communication.publication-register.create-request.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CREATE_EVALUATION_SCHEMA =
  "pip.public-communication.publication-register.create-evaluation.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLANNING_UPDATE_SCHEMA =
  "pip.public-communication.publication-register.planning-update.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLANNING_RECEIPT_SCHEMA =
  "pip.public-communication.publication-register.planning-receipt.v1";

export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLICATION_REQUEST_SCHEMA =
  "pip.public-communication.publication-register.manual-publication-request.v1";

export const PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLICATION_RECORD_SCHEMA =
  "pip.public-communication.publication-register.manual-publication-record.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_VERIFICATION_REQUEST_SCHEMA =
  "pip.public-communication.publication-register.verification-request.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_VERIFICATION_RECEIPT_SCHEMA =
  "pip.public-communication.publication-register.verification-receipt.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_EXPORT_SCHEMA =
  "pip.public-communication.publication-register.export.v1";

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES = Object.freeze({
  REGISTERED: "REGISTERED",
  READY_FOR_MANUAL_PUBLICATION: "READY_FOR_MANUAL_PUBLICATION",
  PUBLICATION_RECORDED: "PUBLICATION_RECORDED",
  VERIFIED: "VERIFIED",
  VOIDED: "VOIDED",
});

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUS_ORDER = Object.freeze([
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.REGISTERED,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.READY_FOR_MANUAL_PUBLICATION,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VOIDED,
]);

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS = Object.freeze({
  CREATE_REGISTER_ENTRY: "CREATE_REGISTER_ENTRY",
  UPDATE_PLANNING_DETAILS: "UPDATE_PLANNING_DETAILS",
  MARK_READY_FOR_MANUAL_PUBLICATION: "MARK_READY_FOR_MANUAL_PUBLICATION",
  RECORD_EXTERNAL_MANUAL_PUBLICATION: "RECORD_EXTERNAL_MANUAL_PUBLICATION",
  VERIFY_PUBLICATION_RECORD: "VERIFY_PUBLICATION_RECORD",
  RETURN_FOR_CORRECTION: "RETURN_FOR_CORRECTION",
  VOID_REGISTER_ENTRY: "VOID_REGISTER_ENTRY",
  ARCHIVE_PUBLICATION: "ARCHIVE_PUBLICATION",
});

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS =
  Object.freeze({
    SOURCE_QUEUE_COLLECTION_MISSING: "SOURCE_QUEUE_COLLECTION_MISSING",
    SOURCE_QUEUE_COLLECTION_INVALID: "SOURCE_QUEUE_COLLECTION_INVALID",
    SOURCE_QUEUE_ITEM_MISSING: "SOURCE_QUEUE_ITEM_MISSING",
    SOURCE_QUEUE_ITEM_INVALID: "SOURCE_QUEUE_ITEM_INVALID",
    SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION: "SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION",
    SOURCE_QUEUE_ITEM_NOT_APPROVED: "SOURCE_QUEUE_ITEM_NOT_APPROVED",
    SOURCE_QUEUE_ITEM_REVIEW_INCOMPLETE: "SOURCE_QUEUE_ITEM_REVIEW_INCOMPLETE",
    SOURCE_QUEUE_ITEM_FIXTURE_PRODUCTION_BLOCKED:
      "SOURCE_QUEUE_ITEM_FIXTURE_PRODUCTION_BLOCKED",
    SOURCE_QUEUE_ITEM_MUTATION_DETECTED: "SOURCE_QUEUE_ITEM_MUTATION_DETECTED",
    SOURCE_CONTENT_PACKAGE_MUTATION_DETECTED:
      "SOURCE_CONTENT_PACKAGE_MUTATION_DETECTED",
    SOURCE_DRAFT_MUTATION_DETECTED: "SOURCE_DRAFT_MUTATION_DETECTED",
    SOURCE_EVIDENCE_MUTATION_DETECTED: "SOURCE_EVIDENCE_MUTATION_DETECTED",
    DUPLICATE_ACTIVE_REGISTER_ENTRY: "DUPLICATE_ACTIVE_REGISTER_ENTRY",
    REGISTER_ENTRY_MISSING: "REGISTER_ENTRY_MISSING",
    REGISTER_ENTRY_INVALID: "REGISTER_ENTRY_INVALID",
    REGISTER_ENTRY_VOIDED: "REGISTER_ENTRY_VOIDED",
    INVALID_CURRENT_STATUS: "INVALID_CURRENT_STATUS",
    INVALID_TARGET_STATUS: "INVALID_TARGET_STATUS",
    STATUS_SKIP_NOT_ALLOWED: "STATUS_SKIP_NOT_ALLOWED",
    MANUAL_ACTION_REQUIRED: "MANUAL_ACTION_REQUIRED",
    ACTOR_ROLE_NOT_AUTHORIZED: "ACTOR_ROLE_NOT_AUTHORIZED",
    ACTOR_ALIAS_INVALID: "ACTOR_ALIAS_INVALID",
    RESPONSIBLE_OWNER_REQUIRED: "RESPONSIBLE_OWNER_REQUIRED",
    RESPONSIBLE_OWNER_ALIAS_INVALID: "RESPONSIBLE_OWNER_ALIAS_INVALID",
    PLATFORM_REQUIRED: "PLATFORM_REQUIRED",
    PLATFORM_CONTENT_FORMAT_MISMATCH: "PLATFORM_CONTENT_FORMAT_MISMATCH",
    DUE_DATE_REQUIRED: "DUE_DATE_REQUIRED",
    DUE_DATE_INVALID: "DUE_DATE_INVALID",
    ASSET_REQUIREMENTS_REQUIRED: "ASSET_REQUIREMENTS_REQUIRED",
    EVIDENCE_PACKAGE_REQUIRED: "EVIDENCE_PACKAGE_REQUIRED",
    APPROVAL_REFERENCE_REQUIRED: "APPROVAL_REFERENCE_REQUIRED",
    PUBLICATION_URL_REQUIRED: "PUBLICATION_URL_REQUIRED",
    PUBLICATION_URL_INVALID: "PUBLICATION_URL_INVALID",
    PUBLICATION_URL_NOT_HTTPS: "PUBLICATION_URL_NOT_HTTPS",
    PUBLICATION_URL_CONTAINS_CREDENTIALS: "PUBLICATION_URL_CONTAINS_CREDENTIALS",
    PUBLICATION_URL_CONTAINS_SECRET_PARAMETER:
      "PUBLICATION_URL_CONTAINS_SECRET_PARAMETER",
    PUBLICATION_TIMESTAMP_REQUIRED: "PUBLICATION_TIMESTAMP_REQUIRED",
    PUBLICATION_TIMESTAMP_INVALID: "PUBLICATION_TIMESTAMP_INVALID",
    PUBLICATION_TIMESTAMP_IN_FUTURE: "PUBLICATION_TIMESTAMP_IN_FUTURE",
    PUBLICATION_VERIFICATION_NOTE_REQUIRED:
      "PUBLICATION_VERIFICATION_NOTE_REQUIRED",
    PUBLICATION_RECORD_NOT_RECORDED: "PUBLICATION_RECORD_NOT_RECORDED",
    PUBLICATION_RECORD_NOT_VERIFIED: "PUBLICATION_RECORD_NOT_VERIFIED",
    SAME_ACTOR_CANNOT_RECORD_AND_VERIFY:
      "SAME_ACTOR_CANNOT_RECORD_AND_VERIFY",
    PUBLISHED_STATUS_REQUIRES_VERIFIED_REGISTER_ENTRY:
      "PUBLISHED_STATUS_REQUIRES_VERIFIED_REGISTER_ENTRY",
    ARCHIVE_DISABLED_IN_BATCH_64B: "ARCHIVE_DISABLED_IN_BATCH_64B",
    P999_PRODUCTION_PUBLICATION_BLOCKED: "P999_PRODUCTION_PUBLICATION_BLOCKED",
    EXTERNAL_PLATFORM_OPERATION_NOT_PERMITTED:
      "EXTERNAL_PLATFORM_OPERATION_NOT_PERMITTED",
    AUTOMATED_PUBLICATION_NOT_PERMITTED: "AUTOMATED_PUBLICATION_NOT_PERMITTED",
    DUPLICATE_ACTION: "DUPLICATE_ACTION",
    UNSUPPORTED_ACTION: "UNSUPPORTED_ACTION",
  });

export const PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS = Object.freeze({
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  THREADS: "THREADS",
  SHORT_VIDEO_PLATFORM: "SHORT_VIDEO_PLATFORM",
  WEBSITE_FAQ: "WEBSITE_FAQ",
  COMMENT_THREAD: "COMMENT_THREAD",
  INFOGRAPHIC_CHANNEL: "INFOGRAPHIC_CHANNEL",
  OFFICIAL_STATEMENT_CHANNEL: "OFFICIAL_STATEMENT_CHANNEL",
  OTHER_MANUAL_PUBLIC_CHANNEL: "OTHER_MANUAL_PUBLIC_CHANNEL",
});

export const PIP_PUBLIC_COMMUNICATION_FORMAT_TO_PUBLICATION_PLATFORM = Object.freeze({
  FACEBOOK_POST: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.FACEBOOK,
  INSTAGRAM_CAPTION: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.INSTAGRAM,
  THREADS_POST: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.THREADS,
  SHORT_VIDEO_SCRIPT:
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.SHORT_VIDEO_PLATFORM,
  FAQ: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.WEBSITE_FAQ,
  COMMENT_RESPONSE: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.COMMENT_THREAD,
  INFOGRAPHIC_BRIEF:
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.INFOGRAPHIC_CHANNEL,
  HOLDING_STATEMENT:
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.OFFICIAL_STATEMENT_CHANNEL,
});

const ENTRY_ALLOWED_KEYS = new Set([
  "schema",
  "register_entry_id",
  "source_queue_item_id",
  "source_content_package_id",
  "source_draft_id",
  "source_recommendation_package_id",
  "response_case_id",
  "source_issue_id",
  "issue_label",
  "geography_scope",
  "content_format",
  "draft_label",
  "source_queue_status",
  "source_queue_fingerprint",
  "source_content_fingerprint",
  "source_evidence_fingerprint",
  "responsible_owner_role",
  "responsible_owner_alias",
  "publication_platform",
  "public_channel_label",
  "due_date",
  "asset_requirements",
  "evidence_package",
  "evidence_ids",
  "verified_fact_ids",
  "approval_level",
  "approval_reference",
  "approval_verified",
  "current_status",
  "previous_status",
  "status_sequence",
  "publication_url",
  "publication_timestamp",
  "publication_recorded_at",
  "publication_recorded_by_role",
  "publication_recorded_by_alias",
  "publication_verified",
  "publication_verified_at",
  "publication_verified_by_role",
  "publication_verified_by_alias",
  "publication_verification_note",
  "external_manual_publication",
  "platform_operation_performed_by_pip",
  "publication_scheduled_by_pip",
  "publication_attempted_by_pip",
  "queue_status_projection",
  "register_history",
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
  "production_register_entries",
  "fixture_register_entries",
  "excluded_queue_items",
  "blocked_evaluations",
  "successful_actions",
  "validation",
  "safety",
]);

const REQUEST_ALLOWED_KEYS = new Set([
  "schema",
  "register_entry_id",
  "source_queue_item_id",
  "action",
  "actor_role",
  "actor_alias",
  "review_note",
  "payload",
  "requested_at",
  "validation_fixture",
]);

const EXPORT_ALLOWED_KEYS = new Set([
  "schema",
  "generated_at",
  "register_summary",
  "production_register_entries",
  "fixture_register_entries",
  "excluded_queue_item_summary",
  "sanitized_planning_receipts",
  "sanitized_publication_records",
  "sanitized_verification_receipts",
  "projected_queue_statuses",
  "blocked_evaluations",
  "collection_validation_result",
  "safety_manifest",
]);

const FORBIDDEN_KEY_PATTERN =
  /(token|password|credential|session|email|phone|account|voter|demographic|affiliation|preference|identity|private_message)/i;
const FORBIDDEN_VALUE_PATTERN =
  /(token|password|credential|session|private message|@|api[_-]?key|authorization)/i;

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
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
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

function sanitizeAssetRequirement(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    asset_type: sanitizeUpper(safe.asset_type, 80),
    required: normalizeBoolean(safe.required, false),
    status: sanitizeUpper(safe.status, 80),
    description: sanitizeText(safe.description, 220),
    owner_role: sanitizeUpper(safe.owner_role, 80),
    due_date: normalizeIso(safe.due_date),
  };
}

function sanitizeHistoryReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    receipt_id: sanitizeText(safe.receipt_id, 160),
    action: sanitizeUpper(safe.action, 140),
    from_status: sanitizeUpper(safe.from_status, 120),
    to_status: sanitizeUpper(safe.to_status, 120),
    actor_role: sanitizeUpper(safe.actor_role, 80),
    actor_alias: sanitizeText(safe.actor_alias, 32),
    note: sanitizeText(safe.note, 360),
    created_at: normalizeIso(safe.created_at) ?? new Date().toISOString(),
    safety: {
      append_only: true,
      platform_operation_performed_by_pip: false,
      publication_scheduled_by_pip: false,
      publication_attempted_by_pip: false,
    },
  };
}

export function buildPipPublicCommunicationPublicationRegisterContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    entry_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA,
    create_request_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CREATE_REQUEST_SCHEMA,
    create_evaluation_schema:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CREATE_EVALUATION_SCHEMA,
    planning_update_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLANNING_UPDATE_SCHEMA,
    planning_receipt_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLANNING_RECEIPT_SCHEMA,
    manual_publication_request_schema:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLICATION_REQUEST_SCHEMA,
    manual_publication_record_schema:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLICATION_RECORD_SCHEMA,
    verification_request_schema:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_VERIFICATION_REQUEST_SCHEMA,
    verification_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_VERIFICATION_RECEIPT_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_EXPORT_SCHEMA,
    statuses: { ...PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES },
    status_order: [...PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUS_ORDER],
    actions: { ...PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS },
    block_reasons: {
      ...PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS,
    },
    platforms: { ...PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS },
    summary: {
      public_information_operations_only: true,
      source_production_queue_required: true,
      source_queue_ready_for_production_required: true,
      source_queue_approval_required: true,
      source_queue_review_completion_required: true,
      source_immutability_required: true,
      source_fingerprint_verification_required: true,
      one_active_register_entry_per_queue_item: true,
      responsible_owner_required: true,
      publication_platform_required: true,
      due_date_required: true,
      asset_requirements_required: true,
      evidence_package_required: true,
      approval_reference_required: true,
      publication_url_required_for_recording: true,
      publication_timestamp_required_for_recording: true,
      https_publication_url_required: true,
      manual_publication_recording_only: true,
      manual_publication_verification_only: true,
      recorder_verifier_separation_required: true,
      append_only_register_history: true,
      verified_register_entry_required_for_published_status: true,
      external_manual_publication_required: true,
      queue_status_projection_enabled: true,
      published_status_projection_enabled: true,
      archive_status_enabled: false,
      platform_operation_enabled: false,
      automated_publication_enabled: false,
      automated_verification_enabled: false,
      automated_approval_enabled: false,
      automated_status_transition_enabled: false,
      publication_scheduling_enabled: false,
      social_platform_api_enabled: false,
      social_platform_authentication_enabled: false,
      asset_upload_enabled: false,
      content_editing_enabled: false,
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
      raw_public_content_excluded: true,
      public_account_identity_excluded: true,
      voter_records_excluded: true,
      personal_data_excluded: true,
      credential_values_excluded: true,
      platform_tokens_excluded: true,
      in_memory_register_only: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
    },
  };
}

export function validatePipPublicCommunicationPublicationRegisterContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const checks = {
    schema:
      safe.schema === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA,
    entry_schema:
      safe.entry_schema === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA,
    collection_schema:
      safe.collection_schema ===
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA,
    status_count:
      Object.values(safe.statuses ?? {}).length === 5,
    status_order:
      JSON.stringify(safe.status_order) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUS_ORDER),
    action_count: Object.values(safe.actions ?? {}).length === 8,
    archive_disabled: summary.archive_status_enabled === false,
    external_network_disabled: summary.external_network_access_enabled === false,
    platform_operation_disabled: summary.platform_operation_enabled === false,
    manual_recording_only: summary.manual_publication_recording_only === true,
    manual_verification_only: summary.manual_publication_verification_only === true,
    one_active_entry: summary.one_active_register_entry_per_queue_item === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, safe);
}

export function validatePipPublicCommunicationPublicationRegisterEntry(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (ENTRY_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA;
  normalized.register_entry_id = sanitizeText(normalized.register_entry_id, 160);
  normalized.source_queue_item_id = sanitizeText(normalized.source_queue_item_id, 160);
  normalized.source_content_package_id = sanitizeText(
    normalized.source_content_package_id,
    160
  );
  normalized.source_draft_id = sanitizeText(normalized.source_draft_id, 160);
  normalized.source_recommendation_package_id = sanitizeText(
    normalized.source_recommendation_package_id,
    160
  );
  normalized.response_case_id = sanitizeText(normalized.response_case_id, 160);
  normalized.source_issue_id = sanitizeText(normalized.source_issue_id, 160);
  normalized.issue_label = sanitizeText(normalized.issue_label, 260);
  normalized.geography_scope = sanitizeText(normalized.geography_scope, 180);
  normalized.content_format = sanitizeUpper(normalized.content_format, 120);
  normalized.draft_label = sanitizeText(normalized.draft_label, 80);
  normalized.source_queue_status = sanitizeUpper(normalized.source_queue_status, 120);
  normalized.source_queue_fingerprint = sanitizeText(
    normalized.source_queue_fingerprint,
    160
  );
  normalized.source_content_fingerprint = sanitizeText(
    normalized.source_content_fingerprint,
    160
  );
  normalized.source_evidence_fingerprint = sanitizeText(
    normalized.source_evidence_fingerprint,
    160
  );
  normalized.responsible_owner_role = sanitizeUpper(
    normalized.responsible_owner_role,
    80
  );
  normalized.responsible_owner_alias = sanitizeText(
    normalized.responsible_owner_alias,
    32
  );
  normalized.publication_platform = sanitizeUpper(normalized.publication_platform, 80);
  normalized.public_channel_label = sanitizeText(normalized.public_channel_label, 160);
  normalized.due_date = normalizeIso(normalized.due_date);
  normalized.asset_requirements = toArray(normalized.asset_requirements).map(
    sanitizeAssetRequirement
  );
  normalized.evidence_package = isPlainObject(normalized.evidence_package)
    ? normalized.evidence_package
    : {};
  normalized.evidence_ids = uniq(
    toArray(normalized.evidence_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.verified_fact_ids = uniq(
    toArray(normalized.verified_fact_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.approval_level = sanitizeUpper(normalized.approval_level, 80);
  normalized.approval_reference = sanitizeText(normalized.approval_reference, 120);
  normalized.approval_verified = normalizeBoolean(normalized.approval_verified, false);
  normalized.current_status = sanitizeUpper(
    normalized.current_status,
    120,
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.REGISTERED
  );
  normalized.previous_status = sanitizeUpper(normalized.previous_status, 120);
  normalized.status_sequence = normalizeInteger(normalized.status_sequence, 1);
  normalized.publication_url = sanitizeText(normalized.publication_url, 2048);
  normalized.publication_timestamp = normalizeIso(normalized.publication_timestamp) ?? "";
  normalized.publication_recorded_at = normalizeIso(normalized.publication_recorded_at) ?? "";
  normalized.publication_recorded_by_role = sanitizeUpper(
    normalized.publication_recorded_by_role,
    80
  );
  normalized.publication_recorded_by_alias = sanitizeText(
    normalized.publication_recorded_by_alias,
    32
  );
  normalized.publication_verified = normalizeBoolean(normalized.publication_verified, false);
  normalized.publication_verified_at = normalizeIso(normalized.publication_verified_at) ?? "";
  normalized.publication_verified_by_role = sanitizeUpper(
    normalized.publication_verified_by_role,
    80
  );
  normalized.publication_verified_by_alias = sanitizeText(
    normalized.publication_verified_by_alias,
    32
  );
  normalized.publication_verification_note = sanitizeText(
    normalized.publication_verification_note,
    360
  );
  normalized.external_manual_publication = normalizeBoolean(
    normalized.external_manual_publication,
    false
  );
  normalized.platform_operation_performed_by_pip = false;
  normalized.publication_scheduled_by_pip = false;
  normalized.publication_attempted_by_pip = false;
  normalized.queue_status_projection = sanitizeUpper(
    normalized.queue_status_projection,
    120,
    "READY_FOR_PRODUCTION"
  );
  normalized.register_history = toArray(normalized.register_history).map(
    sanitizeHistoryReceipt
  );
  normalized.history_count = normalizeInteger(
    normalized.history_count,
    normalized.register_history.length
  );
  normalized.validation_fixture = normalizeBoolean(normalized.validation_fixture, false);
  normalized.production_eligible = normalizeBoolean(normalized.production_eligible, false);
  normalized.created_at = normalizeIso(normalized.created_at) ?? new Date().toISOString();
  normalized.updated_at = normalizeIso(normalized.updated_at) ?? normalized.created_at;
  normalized.safety = {
    append_only_history: true,
    platform_operation_performed_by_pip: false,
    publication_scheduled_by_pip: false,
    publication_attempted_by_pip: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  const checks = {
    schema:
      normalized.schema === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA,
    entry_id_present: normalized.register_entry_id.length > 0,
    queue_id_present: normalized.source_queue_item_id.length > 0,
    status_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES,
      normalized.current_status
    ),
    status_sequence_valid: normalized.status_sequence >= 1,
    projection_allowlisted: ["READY_FOR_PRODUCTION", "PUBLISHED"].includes(
      normalized.queue_status_projection
    ),
    manual_only:
      normalized.platform_operation_performed_by_pip === false &&
      normalized.publication_scheduled_by_pip === false,
    no_forbidden_keys: Object.keys(input).every(
      (key) => !FORBIDDEN_KEY_PATTERN.test(String(key))
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationPublicationRegisterCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (COLLECTION_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA;
  normalized.contract_schema =
    sanitizeText(normalized.contract_schema, 140) ||
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA;
  normalized.generated_at = normalizeIso(normalized.generated_at) ?? new Date().toISOString();
  normalized.summary = isPlainObject(normalized.summary) ? normalized.summary : {};
  normalized.production_register_entries = toArray(
    normalized.production_register_entries
  ).map((entry) => validatePipPublicCommunicationPublicationRegisterEntry(entry).normalized);
  normalized.fixture_register_entries = toArray(normalized.fixture_register_entries).map(
    (entry) => validatePipPublicCommunicationPublicationRegisterEntry(entry).normalized
  );
  normalized.excluded_queue_items = toArray(normalized.excluded_queue_items);
  normalized.blocked_evaluations = toArray(normalized.blocked_evaluations);
  normalized.successful_actions = normalizeInteger(normalized.successful_actions, 0);
  normalized.validation = isPlainObject(normalized.validation)
    ? {
        valid: normalized.validation.valid === true,
        errors: toArray(normalized.validation.errors).map((entry) =>
          sanitizeText(entry, 260)
        ),
      }
    : { valid: true, errors: [] };
  normalized.safety = isPlainObject(normalized.safety) ? normalized.safety : {};

  const checks = {
    schema:
      normalized.schema ===
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA,
    contract_schema:
      normalized.contract_schema ===
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA,
    production_excludes_fixture: normalized.production_register_entries.every(
      (entry) => entry.validation_fixture !== true
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationPublicationRegisterCreateRequest(
  input = {}
) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationPublicationRegisterCreateEvaluation(
  input = {}
) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationPublicationPlanningUpdate(input = {}) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationPublicationPlanningReceipt(input = {}) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationManualPublicationRequest(input = {}) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationManualPublicationRecord(input = {}) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationPublicationVerificationRequest(
  input = {}
) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

export function validatePipPublicCommunicationPublicationVerificationReceipt(
  input = {}
) {
  return validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input);
}

function validatePipPublicCommunicationPublicationRegisterRequestEnvelope(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (REQUEST_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = sanitizeText(normalized.schema, 180);
  normalized.register_entry_id = sanitizeText(normalized.register_entry_id, 160);
  normalized.source_queue_item_id = sanitizeText(normalized.source_queue_item_id, 160);
  normalized.action = sanitizeUpper(normalized.action, 140);
  normalized.actor_role = sanitizeUpper(normalized.actor_role, 80);
  normalized.actor_alias = sanitizeText(normalized.actor_alias, 32);
  normalized.review_note = sanitizeText(normalized.review_note, 360);
  normalized.payload = isPlainObject(normalized.payload) ? normalized.payload : {};
  normalized.requested_at = normalizeIso(normalized.requested_at) ?? new Date().toISOString();
  normalized.validation_fixture = normalizeBoolean(normalized.validation_fixture, false);

  const checks = {
    schema_present: normalized.schema.length > 0,
    action_allowlisted: enumIncludes(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS,
      normalized.action
    ),
    actor_role_present: normalized.actor_role.length > 0,
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) errors.push(`${key} failed.`);
  });

  return buildValidationEnvelope(errors.length === 0, checks, errors, normalized);
}

export function sanitizePipPublicCommunicationPublicationRegisterExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(safe).forEach(([key, value]) => {
    if (EXPORT_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_EXPORT_SCHEMA;
  normalized.generated_at = normalizeIso(normalized.generated_at) ?? new Date().toISOString();
  normalized.register_summary = isPlainObject(normalized.register_summary)
    ? normalized.register_summary
    : {};
  normalized.production_register_entries = toArray(
    normalized.production_register_entries
  ).map((entry) => validatePipPublicCommunicationPublicationRegisterEntry(entry).normalized);
  normalized.fixture_register_entries = toArray(normalized.fixture_register_entries).map(
    (entry) => validatePipPublicCommunicationPublicationRegisterEntry(entry).normalized
  );
  normalized.excluded_queue_item_summary = isPlainObject(
    normalized.excluded_queue_item_summary
  )
    ? normalized.excluded_queue_item_summary
    : {};
  normalized.sanitized_planning_receipts = toArray(normalized.sanitized_planning_receipts).map(
    sanitizeHistoryReceipt
  );
  normalized.sanitized_publication_records = toArray(
    normalized.sanitized_publication_records
  ).map(sanitizeHistoryReceipt);
  normalized.sanitized_verification_receipts = toArray(
    normalized.sanitized_verification_receipts
  ).map(sanitizeHistoryReceipt);
  normalized.projected_queue_statuses = toArray(normalized.projected_queue_statuses).map(
    (entry) => ({
      queue_item_id: sanitizeText(entry?.queue_item_id, 160),
      previous_status: sanitizeUpper(entry?.previous_status, 120),
      current_status: sanitizeUpper(entry?.current_status, 120),
      projected_from_register_entry: sanitizeText(
        entry?.projected_from_register_entry,
        160
      ),
      safety_note:
        "PUBLISHED STATUS RECORDED FROM VERIFIED EXTERNAL MANUAL PUBLICATION; PIP PLATFORM OPERATION PERFORMED: NO.",
    })
  );
  normalized.blocked_evaluations = toArray(normalized.blocked_evaluations);
  normalized.collection_validation_result = isPlainObject(
    normalized.collection_validation_result
  )
    ? normalized.collection_validation_result
    : { valid: false, errors: ["collection_validation_result missing."] };
  normalized.safety_manifest = {
    platform_operation_performed_by_pip: false,
    publication_scheduled_by_pip: false,
    publication_attempted_by_pip: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    external_network_request_made: false,
  };

  return normalized;
}
