export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CONTRACT_SCHEMA =
  "pip.public-communication.outcome-observation.contract.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA =
  "pip.public-communication.outcome-observation.case.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COLLECTION_SCHEMA =
  "pip.public-communication.outcome-observation.collection.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_SCHEMA =
  "pip.public-communication.outcome-observation.window.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_SCHEMA =
  "pip.public-communication.outcome-observation.snapshot.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CREATE_REQUEST_SCHEMA =
  "pip.public-communication.outcome-observation.create.request.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ELIGIBILITY_SCHEMA =
  "pip.public-communication.outcome-observation.eligibility.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_REQUEST_SCHEMA =
  "pip.public-communication.outcome-observation.snapshot.request.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_RECEIPT_SCHEMA =
  "pip.public-communication.outcome-observation.snapshot.receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COMPLETION_REQUEST_SCHEMA =
  "pip.public-communication.outcome-observation.completion.request.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COMPLETION_RECEIPT_SCHEMA =
  "pip.public-communication.outcome-observation.completion.receipt.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_HISTORY_SCHEMA =
  "pip.public-communication.outcome-observation.history.v1";
export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_EXPORT_SCHEMA =
  "pip.public-communication.outcome-observation.export.v1";

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES = Object.freeze({
  OBSERVATION_NOT_STARTED: "OBSERVATION_NOT_STARTED",
  BASELINE_REQUIRED: "BASELINE_REQUIRED",
  BASELINE_RECORDED: "BASELINE_RECORDED",
  POST_OBSERVATION_PENDING: "POST_OBSERVATION_PENDING",
  POST_OBSERVATION_IN_PROGRESS: "POST_OBSERVATION_IN_PROGRESS",
  OBSERVATION_WINDOW_COMPLETE: "OBSERVATION_WINDOW_COMPLETE",
});

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUS_ORDER = Object.freeze([
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_NOT_STARTED,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_RECORDED,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.POST_OBSERVATION_PENDING,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.POST_OBSERVATION_IN_PROGRESS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE,
]);

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES =
  Object.freeze({
    PRE_PUBLICATION_24H: "PRE_PUBLICATION_24H",
    POST_PUBLICATION_6H: "POST_PUBLICATION_6H",
    POST_PUBLICATION_12H: "POST_PUBLICATION_12H",
    POST_PUBLICATION_24H: "POST_PUBLICATION_24H",
    POST_PUBLICATION_72H: "POST_PUBLICATION_72H",
  });

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER =
  Object.freeze([
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.PRE_PUBLICATION_24H,
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.POST_PUBLICATION_6H,
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.POST_PUBLICATION_12H,
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.POST_PUBLICATION_24H,
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.POST_PUBLICATION_72H,
  ]);

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS = Object.freeze({
  CREATE_OBSERVATION_CASE: "CREATE_OBSERVATION_CASE",
  RECORD_BASELINE_SNAPSHOT: "RECORD_BASELINE_SNAPSHOT",
  RECORD_POST_PUBLICATION_SNAPSHOT: "RECORD_POST_PUBLICATION_SNAPSHOT",
  COMPLETE_OBSERVATION_WINDOW: "COMPLETE_OBSERVATION_WINDOW",
  RETURN_OBSERVATION_FOR_CORRECTION: "RETURN_OBSERVATION_FOR_CORRECTION",
  VOID_UNSTARTED_OBSERVATION: "VOID_UNSTARTED_OBSERVATION",
  EXPORT_OUTCOME_OBSERVATION_JSON: "EXPORT_OUTCOME_OBSERVATION_JSON",
});

export const PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS =
  Object.freeze({
    SOURCE_BOUNDARY_COLLECTION_MISSING: "SOURCE_BOUNDARY_COLLECTION_MISSING",
    SOURCE_BOUNDARY_COLLECTION_INVALID: "SOURCE_BOUNDARY_COLLECTION_INVALID",
    SOURCE_BOUNDARY_PACKAGE_MISSING: "SOURCE_BOUNDARY_PACKAGE_MISSING",
    SOURCE_BOUNDARY_PACKAGE_INVALID: "SOURCE_BOUNDARY_PACKAGE_INVALID",
    SOURCE_BOUNDARY_STATUS_NOT_ELIGIBLE: "SOURCE_BOUNDARY_STATUS_NOT_ELIGIBLE",
    VERIFIED_PUBLICATION_LINKAGE_REQUIRED: "VERIFIED_PUBLICATION_LINKAGE_REQUIRED",
    VERIFIED_PUBLICATION_URL_MISSING: "VERIFIED_PUBLICATION_URL_MISSING",
    VERIFIED_PUBLICATION_URL_INVALID: "VERIFIED_PUBLICATION_URL_INVALID",
    VERIFIED_PUBLICATION_TIMESTAMP_MISSING: "VERIFIED_PUBLICATION_TIMESTAMP_MISSING",
    VERIFIED_PUBLICATION_TIMESTAMP_INVALID: "VERIFIED_PUBLICATION_TIMESTAMP_INVALID",
    INTERNAL_PUBLISHED_OR_ARCHIVED_PROJECTION_REQUIRED:
      "INTERNAL_PUBLISHED_OR_ARCHIVED_PROJECTION_REQUIRED",
    OUTCOME_MONITORING_COMPATIBILITY_REQUIRED:
      "OUTCOME_MONITORING_COMPATIBILITY_REQUIRED",
    OUTCOME_MONITORING_REQUIRED_FALSE: "OUTCOME_MONITORING_REQUIRED_FALSE",
    SOURCE_FINGERPRINT_MISMATCH: "SOURCE_FINGERPRINT_MISMATCH",
    SOURCE_MUTATION_DETECTED: "SOURCE_MUTATION_DETECTED",
    SOURCE_EVIDENCE_LINEAGE_INVALID: "SOURCE_EVIDENCE_LINEAGE_INVALID",
    SOURCE_APPROVAL_INVALID: "SOURCE_APPROVAL_INVALID",
    UNRESOLVED_CORRECTION_EXISTS: "UNRESOLVED_CORRECTION_EXISTS",
    UNRESOLVED_VOID_EXISTS: "UNRESOLVED_VOID_EXISTS",
    DUPLICATE_OBSERVATION_CASE: "DUPLICATE_OBSERVATION_CASE",
    OBSERVATION_CASE_MISSING: "OBSERVATION_CASE_MISSING",
    OBSERVATION_CASE_INVALID: "OBSERVATION_CASE_INVALID",
    INVALID_CURRENT_STATUS: "INVALID_CURRENT_STATUS",
    INVALID_TARGET_STATUS: "INVALID_TARGET_STATUS",
    STATUS_SKIP_NOT_ALLOWED: "STATUS_SKIP_NOT_ALLOWED",
    WINDOW_TYPE_INVALID: "WINDOW_TYPE_INVALID",
    WINDOW_START_INVALID: "WINDOW_START_INVALID",
    WINDOW_END_INVALID: "WINDOW_END_INVALID",
    WINDOW_SEQUENCE_INVALID: "WINDOW_SEQUENCE_INVALID",
    WINDOW_OVERLAP_DETECTED: "WINDOW_OVERLAP_DETECTED",
    WINDOW_BEFORE_PUBLICATION_INVALID: "WINDOW_BEFORE_PUBLICATION_INVALID",
    BASELINE_AFTER_PUBLICATION_INVALID: "BASELINE_AFTER_PUBLICATION_INVALID",
    WINDOW_NOT_YET_ELAPSED: "WINDOW_NOT_YET_ELAPSED",
    CAPTURE_TIMESTAMP_INVALID: "CAPTURE_TIMESTAMP_INVALID",
    AGGREGATE_METRICS_INVALID: "AGGREGATE_METRICS_INVALID",
    NEGATIVE_METRIC_VALUE: "NEGATIVE_METRIC_VALUE",
    SENTIMENT_COMPONENT_TOTAL_EXCEEDS_SIGNAL_COUNT:
      "SENTIMENT_COMPONENT_TOTAL_EXCEEDS_SIGNAL_COUNT",
    EVIDENCE_IDS_REQUIRED: "EVIDENCE_IDS_REQUIRED",
    UNCERTAINTY_NOTE_REQUIRED: "UNCERTAINTY_NOTE_REQUIRED",
    ACTOR_ROLE_NOT_AUTHORIZED: "ACTOR_ROLE_NOT_AUTHORIZED",
    ACTOR_ALIAS_INVALID: "ACTOR_ALIAS_INVALID",
    MANUAL_ACTION_REQUIRED: "MANUAL_ACTION_REQUIRED",
    FIXTURE_PRODUCTION_COUNT_BLOCKED: "FIXTURE_PRODUCTION_COUNT_BLOCKED",
    P999_PRODUCTION_OBSERVATION_BLOCKED: "P999_PRODUCTION_OBSERVATION_BLOCKED",
    RAW_CONTENT_NOT_PERMITTED: "RAW_CONTENT_NOT_PERMITTED",
    PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED: "PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED",
    VOTER_DATA_NOT_PERMITTED: "VOTER_DATA_NOT_PERMITTED",
    PERSONAL_DATA_NOT_PERMITTED: "PERSONAL_DATA_NOT_PERMITTED",
    INDIVIDUAL_LEVEL_METRIC_NOT_PERMITTED: "INDIVIDUAL_LEVEL_METRIC_NOT_PERMITTED",
    DEMOGRAPHIC_TARGETING_METRIC_NOT_PERMITTED:
      "DEMOGRAPHIC_TARGETING_METRIC_NOT_PERMITTED",
    CAUSAL_ATTRIBUTION_NOT_PERMITTED: "CAUSAL_ATTRIBUTION_NOT_PERMITTED",
    EFFECTIVENESS_CLASSIFICATION_NOT_PERMITTED:
      "EFFECTIVENESS_CLASSIFICATION_NOT_PERMITTED",
    FOLLOW_UP_RESPONSE_RECOMMENDATION_NOT_PERMITTED:
      "FOLLOW_UP_RESPONSE_RECOMMENDATION_NOT_PERMITTED",
    EXTERNAL_NETWORK_OPERATION_NOT_PERMITTED:
      "EXTERNAL_NETWORK_OPERATION_NOT_PERMITTED",
    AUTOMATIC_INGESTION_NOT_PERMITTED: "AUTOMATIC_INGESTION_NOT_PERMITTED",
    DUPLICATE_ACTION: "DUPLICATE_ACTION",
    UNSUPPORTED_ACTION: "UNSUPPORTED_ACTION",
  });

const CASE_ALLOWED_KEYS = new Set([
  "schema",
  "observation_case_id",
  "source_handoff_package_id",
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
  "verified_publication_url",
  "verified_publication_timestamp",
  "responsible_owner_role",
  "responsible_owner_alias",
  "approval_level",
  "approval_reference",
  "evidence_ids",
  "verified_fact_ids",
  "evidence_lineage_status",
  "uncertainty_note",
  "wording_risks",
  "source_boundary_status",
  "source_queue_projection",
  "source_boundary_fingerprint",
  "source_queue_fingerprint",
  "source_content_fingerprint",
  "source_evidence_fingerprint",
  "source_register_fingerprint",
  "current_status",
  "previous_status",
  "status_sequence",
  "required_window_types",
  "completed_window_types",
  "pending_window_types",
  "baseline_snapshot",
  "post_publication_snapshots",
  "snapshot_count",
  "next_window_type",
  "next_window_eligible_at",
  "observation_started_at",
  "observation_completed_at",
  "observation_created_by_role",
  "observation_created_by_alias",
  "outcome_effectiveness_classification",
  "causal_attribution_status",
  "follow_up_response_recommendation_status",
  "outcome_monitoring_status",
  "outcome_monitoring_record_id",
  "history",
  "history_count",
  "validation_fixture",
  "production_eligible",
  "created_at",
  "updated_at",
  "safety",
]);

const SNAPSHOT_ALLOWED_KEYS = new Set([
  "schema",
  "snapshot_id",
  "observation_case_id",
  "window_type",
  "observed_from",
  "observed_to",
  "captured_at",
  "captured_by_role",
  "captured_by_alias",
  "source_method",
  "aggregate_metrics",
  "evidence_ids",
  "evidence_count",
  "uncertainty_note",
  "limitations",
  "source_reference_labels",
  "validation_fixture",
  "production_eligible",
  "safety",
]);

const FORBIDDEN_KEY_PATTERN =
  /(password|token|credential|session|email|phone|employee|user[_-]?id|account[_-]?id|platform[_-]?username|voter|demographic|affiliation|preference)/i;
const FORBIDDEN_VALUE_PATTERN = /(token|password|credential|oauth|api[_-]?key|@)/i;

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

function unique(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function isHttpsUrl(value) {
  const text = sanitizeText(value, 2048);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !/(token|password|secret|credential|oauth|api[_-]?key|session)/i.test(
        parsed.search
      )
    );
  } catch (_error) {
    return false;
  }
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

export function buildPipPublicCommunicationOutcomeObservationContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    case_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COLLECTION_SCHEMA,
    window_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_SCHEMA,
    snapshot_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_SCHEMA,
    create_request_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CREATE_REQUEST_SCHEMA,
    eligibility_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ELIGIBILITY_SCHEMA,
    snapshot_request_schema:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_REQUEST_SCHEMA,
    snapshot_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_RECEIPT_SCHEMA,
    completion_request_schema:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COMPLETION_REQUEST_SCHEMA,
    completion_receipt_schema:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COMPLETION_RECEIPT_SCHEMA,
    history_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_HISTORY_SCHEMA,
    export_schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_EXPORT_SCHEMA,
    statuses: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES },
    status_order: [...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUS_ORDER],
    window_types: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES },
    window_order: [...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER],
    actions: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS },
    block_reasons: { ...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS },
    summary: {
      descriptive_outcome_observation_only: true,
      verified_external_publication_required: true,
      batch64c_boundary_dependency_required: true,
      internal_published_or_archived_projection_required: true,
      source_immutability_required: true,
      source_fingerprint_verification_required: true,
      evidence_lineage_required: true,
      one_observation_case_per_publication: true,
      five_observation_windows_required: true,
      post_6_hour_window_required: true,
      post_12_hour_window_required: true,
      post_24_hour_window_required: true,
      post_72_hour_window_required: true,
      seven_day_window_enabled: false,
      approved_monitoring_plan_aligned: true,
      pre_publication_baseline_required: true,
      explicit_window_timestamps_required: true,
      explicit_evaluation_time_required: true,
      window_overlap_prohibited: true,
      future_window_recording_prohibited: true,
      manual_snapshot_input_only: true,
      aggregate_metrics_only: true,
      aggregate_engagement_observation_enabled: true,
      raw_public_content_excluded: true,
      public_account_identity_excluded: true,
      private_message_content_excluded: true,
      voter_records_excluded: true,
      voter_identifiers_excluded: true,
      personal_data_excluded: true,
      individual_level_metrics_excluded: true,
      demographic_targeting_metrics_excluded: true,
      effectiveness_classification_enabled: false,
      causal_attribution_enabled: false,
      response_recommendation_enabled: false,
      second_response_trigger_enabled: false,
      automated_ingestion_enabled: false,
      automatic_window_transition_enabled: false,
      external_platform_analytics_fetch_enabled: false,
      platform_connection_enabled: false,
      platform_authentication_enabled: false,
      engagement_optimisation_enabled: false,
      persuasion_optimisation_enabled: false,
      political_persuasion_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      voter_targeting_enabled: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      factual_claim_creation_enabled: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
      append_only_observation_history: true,
      in_memory_observation_only: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
    },
  };
}

export function validatePipPublicCommunicationOutcomeObservationContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const checks = {
    schema: safe.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CONTRACT_SCHEMA,
    case_schema:
      safe.case_schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA,
    collection_schema:
      safe.collection_schema ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COLLECTION_SCHEMA,
    status_count: Object.values(safe.statuses ?? {}).length === 6,
    window_count: Object.values(safe.window_types ?? {}).length === 5,
    status_order:
      JSON.stringify(safe.status_order) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUS_ORDER),
    window_order:
      JSON.stringify(safe.window_order) ===
      JSON.stringify(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER),
    aligned_monitoring_plan:
      summary.five_observation_windows_required === true &&
      summary.post_6_hour_window_required === true &&
      summary.post_12_hour_window_required === true &&
      summary.post_24_hour_window_required === true &&
      summary.post_72_hour_window_required === true &&
      summary.seven_day_window_enabled === false &&
      summary.approved_monitoring_plan_aligned === true,
    aggregate_only: summary.aggregate_metrics_only === true,
    no_effectiveness: summary.effectiveness_classification_enabled === false,
    no_network: summary.external_network_access_enabled === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePipPublicCommunicationOutcomeObservationCase(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  Object.entries(safe).forEach(([key, value]) => {
    if (CASE_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA;
  normalized.observation_case_id = sanitizeText(normalized.observation_case_id, 180);
  normalized.source_handoff_package_id = sanitizeText(
    normalized.source_handoff_package_id,
    180
  );
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
  normalized.issue_label = sanitizeText(normalized.issue_label, 260);
  normalized.geography_scope = sanitizeText(normalized.geography_scope, 180);
  normalized.content_format = sanitizeUpper(normalized.content_format, 140);
  normalized.publication_platform = sanitizeUpper(normalized.publication_platform, 120);
  normalized.public_channel_label = sanitizeText(normalized.public_channel_label, 180);
  normalized.verified_publication_url = sanitizeText(
    normalized.verified_publication_url,
    2048
  );
  normalized.verified_publication_timestamp =
    normalizeIso(normalized.verified_publication_timestamp) ?? "";
  normalized.responsible_owner_role = sanitizeUpper(
    normalized.responsible_owner_role,
    80
  );
  normalized.responsible_owner_alias = sanitizeText(
    normalized.responsible_owner_alias,
    32
  );
  normalized.approval_level = sanitizeUpper(normalized.approval_level, 120);
  normalized.approval_reference = sanitizeText(normalized.approval_reference, 180);
  normalized.evidence_ids = unique(
    toArray(normalized.evidence_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.verified_fact_ids = unique(
    toArray(normalized.verified_fact_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.evidence_lineage_status =
    sanitizeUpper(normalized.evidence_lineage_status, 120) || "VALID";
  normalized.uncertainty_note = sanitizeText(normalized.uncertainty_note, 800);
  normalized.wording_risks = unique(
    toArray(normalized.wording_risks).map((entry) => sanitizeText(entry, 120))
  );
  normalized.source_boundary_status = sanitizeUpper(
    normalized.source_boundary_status,
    180
  );
  normalized.source_queue_projection = sanitizeUpper(
    normalized.source_queue_projection,
    180
  );
  normalized.source_boundary_fingerprint = sanitizeText(
    normalized.source_boundary_fingerprint,
    180
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
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED
  );
  normalized.previous_status = sanitizeUpper(normalized.previous_status, 180);
  normalized.status_sequence = normalizeInteger(normalized.status_sequence, 1);
  normalized.required_window_types = toArray(normalized.required_window_types);
  normalized.completed_window_types = toArray(normalized.completed_window_types);
  normalized.pending_window_types = toArray(normalized.pending_window_types);
  normalized.baseline_snapshot = isPlainObject(normalized.baseline_snapshot)
    ? normalized.baseline_snapshot
    : null;
  normalized.post_publication_snapshots = toArray(normalized.post_publication_snapshots);
  normalized.snapshot_count = normalizeInteger(
    normalized.snapshot_count,
    (normalized.baseline_snapshot ? 1 : 0) + normalized.post_publication_snapshots.length
  );
  normalized.next_window_type = sanitizeUpper(normalized.next_window_type, 140);
  normalized.next_window_eligible_at = normalizeIso(normalized.next_window_eligible_at) ?? "";
  normalized.observation_started_at =
    normalizeIso(normalized.observation_started_at) ?? new Date().toISOString();
  normalized.observation_completed_at =
    normalizeIso(normalized.observation_completed_at) ?? "";
  normalized.observation_created_by_role = sanitizeUpper(
    normalized.observation_created_by_role,
    80
  );
  normalized.observation_created_by_alias = sanitizeText(
    normalized.observation_created_by_alias,
    32
  );
  normalized.outcome_effectiveness_classification =
    sanitizeUpper(normalized.outcome_effectiveness_classification, 80) ||
    "NOT_EVALUATED";
  normalized.causal_attribution_status =
    sanitizeUpper(normalized.causal_attribution_status, 80) || "NOT_PERFORMED";
  normalized.follow_up_response_recommendation_status =
    sanitizeUpper(normalized.follow_up_response_recommendation_status, 80) ||
    "NOT_GENERATED";
  normalized.outcome_monitoring_status =
    sanitizeUpper(normalized.outcome_monitoring_status, 120) ||
    "OBSERVATION_IN_PROGRESS";
  normalized.outcome_monitoring_record_id = sanitizeText(
    normalized.outcome_monitoring_record_id,
    180
  );
  normalized.history = toArray(normalized.history);
  normalized.history_count = normalizeInteger(
    normalized.history_count,
    normalized.history.length
  );
  normalized.validation_fixture = normalizeBoolean(normalized.validation_fixture, false);
  normalized.production_eligible = normalizeBoolean(normalized.production_eligible, false);
  normalized.created_at = normalizeIso(normalized.created_at) ?? new Date().toISOString();
  normalized.updated_at = normalizeIso(normalized.updated_at) ?? normalized.created_at;
  normalized.safety = {
    external_network_request_made: false,
    automatic_ingestion_performed: false,
    platform_connection_performed_by_pip: false,
    platform_authentication_performed_by_pip: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    ...((isPlainObject(normalized.safety) && normalized.safety) || {}),
  };

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA,
    case_id: normalized.observation_case_id.length > 0,
    source_handoff: normalized.source_handoff_package_id.length > 0,
    publication_url: isHttpsUrl(normalized.verified_publication_url),
    publication_timestamp: normalized.verified_publication_timestamp.length > 0,
    evidence_ids: normalized.evidence_ids.length > 0,
    no_forbidden_keys: Object.keys(safe).every(
      (key) => !FORBIDDEN_KEY_PATTERN.test(String(key))
    ),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
    no_effectiveness:
      normalized.outcome_effectiveness_classification === "NOT_EVALUATED" &&
      normalized.causal_attribution_status === "NOT_PERFORMED" &&
      normalized.follow_up_response_recommendation_status === "NOT_GENERATED",
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationOutcomeObservationWindow(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const windowType = sanitizeUpper(safe.window_type, 80);
  const observedFrom = normalizeIso(safe.observed_from);
  const observedTo = normalizeIso(safe.observed_to);
  const capturedAt = normalizeIso(safe.captured_at);
  const publicationTimestamp = normalizeIso(safe.publication_timestamp);
  const evaluationTimestamp = normalizeIso(safe.evaluation_timestamp);

  const fromMs = Date.parse(String(observedFrom ?? ""));
  const toMs = Date.parse(String(observedTo ?? ""));
  const capturedMs = Date.parse(String(capturedAt ?? ""));
  const publicationMs = Date.parse(String(publicationTimestamp ?? ""));
  const evaluationMs = Date.parse(String(evaluationTimestamp ?? ""));

  const hour = 60 * 60 * 1000;
  const lowerBoundMs =
    windowType === "PRE_PUBLICATION_24H"
      ? publicationMs - 24 * hour
      : windowType === "POST_PUBLICATION_6H"
        ? publicationMs
        : windowType === "POST_PUBLICATION_12H"
          ? publicationMs + 6 * hour
          : windowType === "POST_PUBLICATION_24H"
            ? publicationMs + 12 * hour
            : windowType === "POST_PUBLICATION_72H"
              ? publicationMs + 24 * hour
              : Number.NaN;
  const upperBoundMs =
    windowType === "PRE_PUBLICATION_24H"
      ? publicationMs
      : windowType === "POST_PUBLICATION_6H"
        ? publicationMs + 6 * hour
        : windowType === "POST_PUBLICATION_12H"
          ? publicationMs + 12 * hour
          : windowType === "POST_PUBLICATION_24H"
            ? publicationMs + 24 * hour
            : windowType === "POST_PUBLICATION_72H"
              ? publicationMs + 72 * hour
              : Number.NaN;

  const checks = {
    window_type: Object.values(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES
    ).includes(windowType),
    observed_from: Number.isFinite(fromMs),
    observed_to: Number.isFinite(toMs),
    observed_order: Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs < toMs,
    captured_at: Number.isFinite(capturedMs),
    captured_after_window:
      Number.isFinite(capturedMs) && Number.isFinite(toMs) && capturedMs >= toMs,
    window_elapsed:
      Number.isFinite(evaluationMs) && Number.isFinite(toMs) && evaluationMs >= toMs,
    publication_timestamp: Number.isFinite(publicationMs),
    lower_bound:
      Number.isFinite(fromMs) && Number.isFinite(lowerBoundMs) && fromMs >= lowerBoundMs,
    upper_bound:
      Number.isFinite(toMs) && Number.isFinite(upperBoundMs) && toMs <= upperBoundMs,
    baseline_before_publication:
      windowType !== "PRE_PUBLICATION_24H" ||
      (Number.isFinite(toMs) && Number.isFinite(publicationMs) && toMs <= publicationMs),
    post_after_publication:
      !windowType.startsWith("POST_") ||
      (Number.isFinite(fromMs) && Number.isFinite(publicationMs) && fromMs >= publicationMs),
  };

  const errors = [];
  if (!checks.window_type)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_TYPE_INVALID);
  if (!checks.observed_from)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_START_INVALID);
  if (!checks.observed_to)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_END_INVALID);
  if (!checks.observed_order)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_SEQUENCE_INVALID);
  if (!checks.captured_after_window)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.CAPTURE_TIMESTAMP_INVALID);
  if (!checks.window_elapsed)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_NOT_YET_ELAPSED);
  if (!checks.lower_bound || !checks.upper_bound)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_SEQUENCE_INVALID);
  if (!checks.baseline_before_publication)
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.BASELINE_AFTER_PUBLICATION_INVALID
    );
  if (!checks.post_after_publication)
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_BEFORE_PUBLICATION_INVALID
    );

  return envelope(errors.length === 0, checks, errors, {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_SCHEMA,
    window_type: windowType,
    observed_from: observedFrom ?? "",
    observed_to: observedTo ?? "",
    captured_at: capturedAt ?? "",
    publication_timestamp: publicationTimestamp ?? "",
    evaluation_timestamp: evaluationTimestamp ?? "",
  });
}

export function validatePipPublicCommunicationOutcomeObservationSnapshot(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  Object.entries(safe).forEach(([key, value]) => {
    if (SNAPSHOT_ALLOWED_KEYS.has(key)) normalized[key] = value;
  });

  normalized.schema = PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_SCHEMA;
  normalized.snapshot_id = sanitizeText(normalized.snapshot_id, 180);
  normalized.observation_case_id = sanitizeText(normalized.observation_case_id, 180);
  normalized.window_type = sanitizeUpper(normalized.window_type, 80);
  normalized.observed_from = normalizeIso(normalized.observed_from) ?? "";
  normalized.observed_to = normalizeIso(normalized.observed_to) ?? "";
  normalized.captured_at = normalizeIso(normalized.captured_at) ?? "";
  normalized.captured_by_role = sanitizeUpper(normalized.captured_by_role, 80);
  normalized.captured_by_alias = sanitizeText(normalized.captured_by_alias, 32);
  normalized.source_method = sanitizeUpper(normalized.source_method, 80);
  normalized.aggregate_metrics = isPlainObject(normalized.aggregate_metrics)
    ? normalized.aggregate_metrics
    : {};
  normalized.evidence_ids = unique(
    toArray(normalized.evidence_ids).map((entry) => sanitizeText(entry, 120))
  );
  normalized.evidence_count = normalizeInteger(
    normalized.evidence_count,
    normalized.evidence_ids.length
  );
  normalized.uncertainty_note = sanitizeText(normalized.uncertainty_note, 600);
  normalized.limitations = sanitizeText(normalized.limitations, 800);
  normalized.source_reference_labels = unique(
    toArray(normalized.source_reference_labels).map((entry) => sanitizeText(entry, 120))
  );
  normalized.validation_fixture = normalizeBoolean(normalized.validation_fixture, false);
  normalized.production_eligible = normalizeBoolean(normalized.production_eligible, false);
  normalized.safety = {
    external_network_request_made: false,
    automatic_ingestion_performed: false,
    platform_connection_performed_by_pip: false,
    platform_authentication_performed_by_pip: false,
    ...((isPlainObject(normalized.safety) && normalized.safety) || {}),
  };

  const metrics = normalized.aggregate_metrics;
  const allowedMetricKeys = [
    "public_signal_count",
    "positive_signal_count",
    "neutral_signal_count",
    "negative_signal_count",
    "unique_public_source_count",
    "narrative_cluster_count",
    "issue_reference_count",
    "geography_coverage_count",
    "evidence_item_count",
    "public_reaction_count",
    "public_comment_count",
    "public_share_count",
    "public_view_count",
    "correction_reference_count",
    "clarification_reference_count",
  ];

  const metricKeys = Object.keys(metrics);
  const numericMetricValues = metricKeys.map((key) => Number(metrics[key]));

  const checks = {
    schema: normalized.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_SCHEMA,
    snapshot_id: normalized.snapshot_id.length > 0,
    observation_case_id: normalized.observation_case_id.length > 0,
    window_type: Object.values(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES
    ).includes(normalized.window_type),
    source_method: [
      "MANUAL_AGGREGATE_ENTRY",
      "VERIFIED_ANALYTICS_EXPORT",
      "PUBLIC_SIGNAL_SUMMARY",
      "APPROVED_RESEARCH_SUMMARY",
    ].includes(normalized.source_method),
    aggregate_metrics_shape:
      metricKeys.every((key) => allowedMetricKeys.includes(key)) &&
      numericMetricValues.every((value) => Number.isFinite(value) && value >= 0),
    sentiment_total:
      Number(metrics.positive_signal_count ?? 0) +
        Number(metrics.neutral_signal_count ?? 0) +
        Number(metrics.negative_signal_count ?? 0) <=
      Number(metrics.public_signal_count ?? 0),
    evidence_ids: normalized.evidence_ids.length > 0,
    uncertainty_note: normalized.uncertainty_note.length > 0,
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  if (!checks.aggregate_metrics_shape)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.AGGREGATE_METRICS_INVALID);
  if (!checks.sentiment_total)
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SENTIMENT_COMPONENT_TOTAL_EXCEEDS_SIGNAL_COUNT
    );
  if (!checks.evidence_ids)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.EVIDENCE_IDS_REQUIRED);
  if (!checks.uncertainty_note)
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.UNCERTAINTY_NOTE_REQUIRED
    );
  if (!checks.no_forbidden_values)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.PERSONAL_DATA_NOT_PERMITTED);

  Object.entries(checks).forEach(([key, value]) => {
    if (!value && errors.length < 12) {
      const mapped = {
        window_type: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_TYPE_INVALID,
      };
      if (mapped[key] && !errors.includes(mapped[key])) errors.push(mapped[key]);
    }
  });

  return envelope(errors.length === 0, checks, errors, normalized);
}

function validateEnvelope(input = {}, schemaFallback = "") {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {
    schema: sanitizeText(safe.schema, 200) || sanitizeText(schemaFallback, 200),
    action: sanitizeUpper(safe.action, 120),
    actor_role: sanitizeUpper(safe.actor_role, 80),
    actor_alias: sanitizeText(safe.actor_alias, 32),
    note: sanitizeText(safe.note, 420),
    requested_at: normalizeIso(safe.requested_at) ?? new Date().toISOString(),
    payload: isPlainObject(safe.payload) ? safe.payload : {},
  };

  const checks = {
    schema: normalized.schema.length > 0,
    actor_alias_safe: !FORBIDDEN_VALUE_PATTERN.test(normalized.actor_alias),
    no_forbidden_values: !FORBIDDEN_VALUE_PATTERN.test(safeStringify(normalized)),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) errors.push(`${key} failed.`);
  });
  return envelope(errors.length === 0, checks, errors, normalized);
}

export function validatePipPublicCommunicationOutcomeObservationCreateRequest(input = {}) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CREATE_REQUEST_SCHEMA);
}

export function validatePipPublicCommunicationOutcomeObservationEligibility(
  input = {}
) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ELIGIBILITY_SCHEMA);
}

export function validatePipPublicCommunicationOutcomeObservationSnapshotRequest(
  input = {}
) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_REQUEST_SCHEMA);
}

export function validatePipPublicCommunicationOutcomeObservationSnapshotReceipt(
  input = {}
) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_RECEIPT_SCHEMA);
}

export function validatePipPublicCommunicationOutcomeObservationCompletionRequest(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COMPLETION_REQUEST_SCHEMA
  );
}

export function validatePipPublicCommunicationOutcomeObservationCompletionReceipt(
  input = {}
) {
  return validateEnvelope(
    input,
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COMPLETION_RECEIPT_SCHEMA
  );
}

export function validatePipPublicCommunicationOutcomeObservationHistoryReceipt(
  input = {}
) {
  return validateEnvelope(input, PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_HISTORY_SCHEMA);
}

export function sanitizePipPublicCommunicationOutcomeObservationExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const sanitized = {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_EXPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    observation_summary: isPlainObject(safe.observation_summary)
      ? safe.observation_summary
      : {},
    production_observation_cases: toArray(safe.production_observation_cases).map(
      (entry) => validatePipPublicCommunicationOutcomeObservationCase(entry).normalized
    ),
    fixture_observation_cases: toArray(safe.fixture_observation_cases).map((entry) =>
      validatePipPublicCommunicationOutcomeObservationCase(entry).normalized
    ),
    blocked_evaluations: toArray(safe.blocked_evaluations),
    sanitized_aggregate_snapshots: toArray(safe.sanitized_aggregate_snapshots).map(
      (entry) => validatePipPublicCommunicationOutcomeObservationSnapshot(entry).normalized
    ),
    transition_receipts: toArray(safe.transition_receipts),
    completion_receipts: toArray(safe.completion_receipts),
    correction_receipts: toArray(safe.correction_receipts),
    void_receipts: toArray(safe.void_receipts),
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

  return sanitized;
}
