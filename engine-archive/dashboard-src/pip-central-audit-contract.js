export const PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA =
  "pip.central-audit.contract.v1";

export const PIP_CENTRAL_AUDIT_EVENT_SCHEMA =
  "pip.central-audit.event.v1";

export const PIP_CENTRAL_AUDIT_EVENT_CATEGORIES = Object.freeze({
  USER: "USER",
  SYSTEM: "SYSTEM",
  AUTHORIZATION: "AUTHORIZATION",
});

export const PIP_CENTRAL_AUDIT_EVENT_TYPES = Object.freeze({
  SYSTEM_STARTED: "SYSTEM_STARTED",
  SYSTEM_ERROR_RECORDED: "SYSTEM_ERROR_RECORDED",
  REQUEST_FAILURE_RECORDED: "REQUEST_FAILURE_RECORDED",
  STORAGE_ERROR_RECORDED: "STORAGE_ERROR_RECORDED",
  VALIDATION_ERROR_RECORDED: "VALIDATION_ERROR_RECORDED",
  SYSTEM_HEALTH_REPORT_GENERATED: "SYSTEM_HEALTH_REPORT_GENERATED",
  OPERATIONAL_ALERT_ACKNOWLEDGED:
    "OPERATIONAL_ALERT_ACKNOWLEDGED",
  OPERATIONAL_ALERT_ACCEPTANCE_RECORDED:
    "OPERATIONAL_ALERT_ACCEPTANCE_RECORDED",
  DEPLOYMENT_READINESS_ACCEPTANCE_RECORDED:
    "DEPLOYMENT_READINESS_ACCEPTANCE_RECORDED",
  EDGE_SECURITY_ACCEPTANCE_RECORDED:
    "EDGE_SECURITY_ACCEPTANCE_RECORDED",
  RELEASE_GATE_ACCEPTANCE_RECORDED:
    "RELEASE_GATE_ACCEPTANCE_RECORDED",
  OBSERVABILITY_SNAPSHOT_ACCEPTANCE_RECORDED:
    "OBSERVABILITY_SNAPSHOT_ACCEPTANCE_RECORDED",
  OBSERVABILITY_HISTORY_SNAPSHOT_RECORDED:
    "OBSERVABILITY_HISTORY_SNAPSHOT_RECORDED",
  INCIDENT_CASE_CREATED: "INCIDENT_CASE_CREATED",
  INCIDENT_CASE_CHECKLIST_UPDATED:
    "INCIDENT_CASE_CHECKLIST_UPDATED",
  INCIDENT_CASE_CLOSED: "INCIDENT_CASE_CLOSED",
  USER_SIGN_IN_SUCCEEDED: "USER_SIGN_IN_SUCCEEDED",
  USER_SIGN_IN_FAILED: "USER_SIGN_IN_FAILED",
  USER_SIGN_OUT: "USER_SIGN_OUT",
  SESSION_RESTORED: "SESSION_RESTORED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  AUTHORIZATION_DENIED: "AUTHORIZATION_DENIED",
  AUDIT_ACCEPTANCE_RECORDED: "AUDIT_ACCEPTANCE_RECORDED",
  DATABASE_REFERENCE_SLOTS_REGISTERED:
    "DATABASE_REFERENCE_SLOTS_REGISTERED",
  DATABASE_BINDING_HANDOFF_ACKNOWLEDGED:
    "DATABASE_BINDING_HANDOFF_ACKNOWLEDGED",
  DEPLOYMENT_SECRET_PROVIDER_ADAPTER_ACKNOWLEDGED:
    "DEPLOYMENT_SECRET_PROVIDER_ADAPTER_ACKNOWLEDGED",
  PRODUCTION_CONFIGURATION_INTAKE_ACCEPTED:
    "PRODUCTION_CONFIGURATION_INTAKE_ACCEPTED",
  PRODUCTION_CONFIGURATION_APPROVED:
    "PRODUCTION_CONFIGURATION_APPROVED",
  PRODUCTION_CONFIGURATION_REJECTED:
    "PRODUCTION_CONFIGURATION_REJECTED",
  PRODUCTION_CONFIGURATION_READINESS_EVALUATED:
    "PRODUCTION_CONFIGURATION_READINESS_EVALUATED",
  PRODUCTION_CHANGE_PACKAGE_PREPARED:
    "PRODUCTION_CHANGE_PACKAGE_PREPARED",
  PRODUCTION_CHANGE_DRY_RUN_EVALUATED:
    "PRODUCTION_CHANGE_DRY_RUN_EVALUATED",
  PRODUCTION_CHANGE_HANDOFF_ACKNOWLEDGED:
    "PRODUCTION_CHANGE_HANDOFF_ACKNOWLEDGED",
  EXTERNAL_OPERATOR_CHECKLIST_PREPARED:
    "EXTERNAL_OPERATOR_CHECKLIST_PREPARED",
  EXTERNAL_OPERATOR_SEPARATION_EVALUATED:
    "EXTERNAL_OPERATOR_SEPARATION_EVALUATED",
  EXTERNAL_OPERATOR_HANDOFF_ACKNOWLEDGED:
    "EXTERNAL_OPERATOR_HANDOFF_ACKNOWLEDGED",
  INDEPENDENT_REVIEW_CASE_PREPARED:
    "INDEPENDENT_REVIEW_CASE_PREPARED",
  INDEPENDENT_REVIEW_EVALUATED:
    "INDEPENDENT_REVIEW_EVALUATED",
  INDEPENDENT_REVIEW_DECISION_RECORDED:
    "INDEPENDENT_REVIEW_DECISION_RECORDED",
  PRODUCTION_ACTIVATION_PERMIT_PREPARED:
    "PRODUCTION_ACTIVATION_PERMIT_PREPARED",
  PRODUCTION_ACTIVATION_PERMIT_EVALUATED:
    "PRODUCTION_ACTIVATION_PERMIT_EVALUATED",
  PRODUCTION_ACTIVATION_PERMIT_AUTHORIZED:
    "PRODUCTION_ACTIVATION_PERMIT_AUTHORIZED",
  PRODUCTION_ACTIVATION_PERMIT_REVOKED:
    "PRODUCTION_ACTIVATION_PERMIT_REVOKED",
});

export const PIP_CENTRAL_AUDIT_ERROR_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
});

const PIP_SYSTEM_ERROR_EVENT_TYPES = new Set([
  PIP_CENTRAL_AUDIT_EVENT_TYPES.SYSTEM_ERROR_RECORDED,
  PIP_CENTRAL_AUDIT_EVENT_TYPES.REQUEST_FAILURE_RECORDED,
  PIP_CENTRAL_AUDIT_EVENT_TYPES.STORAGE_ERROR_RECORDED,
  PIP_CENTRAL_AUDIT_EVENT_TYPES.VALIDATION_ERROR_RECORDED,
]);

const PIP_SAFE_OPERATIONAL_ALERT_METADATA_KEYS = new Set([
  "alert_fingerprint",
  "alert_code",
  "alert_severity",
  "alert_component",
  "report_status",
  "active_alert_count",
  "acknowledged_alert_count",
  "guidance_count",
  "legacy_storage_preserved",
]);

const PIP_SAFE_DEPLOYMENT_READINESS_METADATA_KEYS = new Set([
  "target_environment",
  "readiness_status",
  "total_checks",
  "passed_checks",
  "review_checks",
  "blocked_checks",
  "required_checks_passed",
  "legacy_storage_preserved",
]);

const PIP_SAFE_EDGE_SECURITY_METADATA_KEYS = new Set([
  "target_environment",
  "edge_security_status",
  "trusted_proxy_mode",
  "total_checks",
  "passed_checks",
  "review_checks",
  "blocked_checks",
  "required_checks_passed",
  "secure_cookie_valid",
  "csrf_origin_alignment_valid",
  "p999_write_protection",
  "legacy_storage_preserved",
]);

const PIP_SAFE_RELEASE_GATE_METADATA_KEYS = new Set([
  "release_id",
  "target_environment",
  "release_gate_status",
  "release_decision",
  "total_checks",
  "passed_checks",
  "review_checks",
  "blocked_checks",
  "required_checks_passed",
  "deployment_readiness_status",
  "edge_security_status",
  "rollback_evidence_ready",
  "runbook_ready",
  "p999_write_protection",
  "legacy_storage_preserved",
]);

const PIP_SAFE_OBSERVABILITY_METADATA_KEYS = new Set([
  "snapshot_id",
  "target_environment",
  "observability_status",
  "total_requests",
  "server_error_requests",
  "slow_request_count",
  "active_high_alerts",
  "active_critical_alerts",
  "recent_critical_event_present",
  "total_checks",
  "passed_checks",
  "review_checks",
  "blocked_checks",
  "required_checks_passed",
  "p999_write_protection",
  "legacy_storage_preserved",
]);

const PIP_SAFE_OBSERVABILITY_HISTORY_METADATA_KEYS = new Set([
  "snapshot_id",
  "target_environment",
  "observability_status",
  "accepted_at",
  "total_requests",
  "server_error_requests",
  "p95_response_ms",
  "slow_request_count",
  "active_high_alerts",
  "active_critical_alerts",
  "critical_error_events",
  "history_write_verified",
  "history_readback_verified",
  "p999_write_protection",
  "legacy_storage_preserved",
]);

const PIP_SAFE_INCIDENT_CASE_CREATED_METADATA_KEYS = new Set([
  "case_id",
  "target_environment",
  "severity",
  "case_status",
  "snapshot_reference_count",
  "timeline_reference_count",
  "checklist_item_count",
  "evidence_validation_passed",
  "casebook_write_verified",
  "casebook_readback_verified",
  "p999_write_protection",
  "legacy_storage_preserved",
]);

const PIP_SAFE_INCIDENT_CASE_CHECKLIST_UPDATED_METADATA_KEYS =
  new Set([
    "case_id",
    "target_environment",
    "checklist_item_id",
    "previous_checklist_status",
    "current_checklist_status",
    "case_status",
    "revision_number",
    "required_items_satisfied",
    "blocked_item_count",
    "casebook_write_verified",
    "casebook_readback_verified",
    "p999_write_protection",
    "legacy_storage_preserved",
  ]);

const PIP_SAFE_INCIDENT_CASE_CLOSED_METADATA_KEYS = new Set([
  "case_id",
  "target_environment",
  "severity",
  "closure_outcome",
  "case_status",
  "revision_number",
  "required_items_satisfied",
  "blocked_item_count",
  "closure_acknowledged",
  "closure_evidence_generated",
  "casebook_write_verified",
  "casebook_readback_verified",
  "p999_write_protection",
  "legacy_storage_preserved",
]);

const PIP_SAFE_DATABASE_REFERENCE_REGISTRY_METADATA_KEYS =
  new Set([
    "registry_status",
    "required_slot_count",
    "registered_slot_count",
    "missing_slot_count",
    "processed_slot_count",
    "changed",
    "p999_write_protection",
  ]);

const PIP_SAFE_DATABASE_BINDING_HANDOFF_METADATA_KEYS =
  new Set([
    "registry_status",
    "binding_ready",
    "operator_handoff_state",
    "result_code",
    "changed",
    "p999_write_protection",
  ]);

const PIP_SAFE_SECRET_PROVIDER_ADAPTER_METADATA_KEYS =
  new Set([
    "readiness_result",
    "result_code",
    "changed",
    "required_logical_slot_count",
    "valid_logical_slot_count",
    "missing_logical_slot_count",
    "malformed_opaque_token_count",
    "adapter_status",
    "active_repository_kind",
    "durable_file_authoritative",
    "legacy_browser_storage_authoritative",
    "p999_write_protection",
  ]);

const PIP_SAFE_PRODUCTION_CONFIGURATION_INTAKE_METADATA_KEYS =
  new Set([
    "target_environment",
    "provider_kind",
    "provider_vendor",
    "deployment_model",
    "region_classification",
    "tls_mode",
    "reference_alias_count",
    "change_reference",
    "submitted_role",
    "revision",
    "idempotency_status",
    "durable_readback",
    "p999_write_protection",
  ]);

const PIP_SAFE_PRODUCTION_CONFIGURATION_APPROVAL_METADATA_KEYS =
  new Set([
    "status",
    "action",
    "reason_code",
    "intake_id",
    "intake_digest",
    "change_reference",
    "attested_by_role",
    "revision",
    "idempotency_status",
    "activation_readiness_status",
    "durable_readback",
    "p999_write_protection",
  ]);

const PIP_SAFE_PRODUCTION_CONFIGURATION_READINESS_METADATA_KEYS =
  new Set([
    "readiness_status",
    "latest_intake_id",
    "latest_approval_id",
    "latest_approval_status",
    "total_checks",
    "passed_checks",
    "failed_checks",
    "p999_write_protection",
    "activation_execution_enabled",
    "sql_execution_enabled",
    "migration_execution_enabled",
  ]);

const PIP_SAFE_PRODUCTION_CHANGE_PACKAGE_METADATA_KEYS =
  new Set([
    "package_id",
    "package_revision",
    "package_status",
    "dry_run_status",
    "handoff_status",
    "intake_id",
    "approval_id",
    "target_environment",
    "provider_kind",
    "provider_vendor",
    "change_reference",
    "reference_alias_count",
    "blocker_count",
    "activation_performed",
    "connection_attempted",
    "database_operation_performed",
    "timestamp",
  ]);

const PIP_SAFE_EXTERNAL_OPERATOR_GOVERNANCE_METADATA_KEYS =
  new Set([
    "checklist_id",
    "checklist_revision",
    "evaluation_id",
    "handoff_id",
    "status",
    "change_package_id",
    "change_package_revision",
    "role_assignment_count",
    "distinct_operator_count",
    "separation_rule_count",
    "passed_separation_rule_count",
    "blocker_count",
    "ready_for_external_operator_review",
    "activation_performed",
    "connection_attempted",
    "database_operation_performed",
    "timestamp",
  ]);

const PIP_SAFE_INDEPENDENT_REVIEW_BOARD_METADATA_KEYS =
  new Set([
    "review_case_id",
    "review_case_revision",
    "review_case_digest",
    "evaluation_id",
    "decision_receipt_id",
    "status",
    "decision",
    "decision_reason_code",
    "blocker_count",
    "evidence_items_present",
    "evidence_items_valid",
    "evidence_digests_match",
    "distinct_reviewer_count",
    "reviewer_independence_passed",
    "reviewer_operator_overlap_count",
    "reviewer_concurrence",
    "chair_signoff",
    "activation_performed",
    "deployment_execution_performed",
    "database_operation_performed",
    "timestamp",
  ]);

const PIP_SAFE_PRODUCTION_ACTIVATION_PERMIT_METADATA_KEYS =
  new Set([
    "permit_id",
    "permit_request_id",
    "request_digest",
    "permit_receipt_digest",
    "revocation_receipt_digest",
    "change_reference",
    "status",
    "reason_code",
    "batch61b_decision_receipt_digest",
    "batch60c_change_package_digest",
    "batch61a_handoff_receipt_digest",
    "timestamp",
    "authorization_record_only",
    "permit_automatically_consumed",
    "activation_performed",
    "deployment_execution_performed",
    "database_connection_attempted",
    "automatic_synchronisation_enabled",
    "p999_write_protection",
  ]);

const PIP_SAFE_SYSTEM_ERROR_METADATA_KEYS = new Set([
  "component",
  "operation",
  "error_code",
  "error_name",
  "error_fingerprint",
  "severity",
  "http_status",
  "request_id",
  "request_method",
  "route_template",
  "recoverable",
  "retryable",
  "validation_error_count",
  "fixture",
]);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeIso(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return null;
  }

  return new Date(Date.parse(value)).toISOString();
}

function hasForbiddenKeyName(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeyName(entry));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const forbidden = [
    "password",
    "password_hash",
    "stack",
    "stack_trace",
    "raw_exception_message",
    "exception_message",
    "csrf_token",
    "cookie",
    "set_cookie",
    "session_identifier",
    "session_id",
    "authorization",
    "authorization_header",
    "request_body",
    "raw_body",
    "raw_request_body",
    "raw_url_query_string",
    "url_query",
    "raw_voter_records",
    "voter_record",
    "voter_identifier",
    "scenario_operational_notes",
    "operational_notes",
    "browser_storage",
    "local_storage",
    "session_storage",
    "email",
  ];

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = String(key).trim().toLowerCase();
    if (forbidden.includes(normalizedKey)) {
      return true;
    }

    return hasForbiddenKeyName(nested);
  });
}

function isSupportedCategory(value) {
  return Object.values(PIP_CENTRAL_AUDIT_EVENT_CATEGORIES).includes(
    String(value ?? "")
  );
}

function isSupportedEventType(value) {
  return Object.values(PIP_CENTRAL_AUDIT_EVENT_TYPES).includes(
    String(value ?? "")
  );
}

function isSupportedSeverity(value) {
  return Object.values(PIP_CENTRAL_AUDIT_ERROR_SEVERITIES).includes(
    String(value ?? "")
  );
}

function containsForbiddenRawValue(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenRawValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((nested) =>
      containsForbiddenRawValue(nested)
    );
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const hasAuthorizationSecretPattern =
    /\bauthorization\b\s*[:=]/i.test(value) ||
    /\bbearer\s+[a-z0-9\-_.]+/i.test(value);

  return (
    normalized.includes("@") ||
    normalized.includes("password") ||
    normalized.includes("csrf") ||
    normalized.includes("set-cookie") ||
    hasAuthorizationSecretPattern ||
    normalized.includes("request body") ||
    normalized.includes("raw body") ||
    normalized.includes("stack") ||
    normalized.includes("exception")
  );
}

function validateSystemErrorMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_SYSTEM_ERROR_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  if (
    "severity" in metadata &&
    !isSupportedSeverity(metadata.severity)
  ) {
    return false;
  }

  if (
    "http_status" in metadata &&
    !Number.isInteger(Number(metadata.http_status))
  ) {
    return false;
  }

  if (
    "validation_error_count" in metadata &&
    (!Number.isInteger(Number(metadata.validation_error_count)) ||
      Number(metadata.validation_error_count) < 0)
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateOperationalAlertMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_OPERATIONAL_ALERT_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateDeploymentReadinessMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_DEPLOYMENT_READINESS_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateEdgeSecurityMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_EDGE_SECURITY_METADATA_KEYS.has(String(key).trim())
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateReleaseGateMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_RELEASE_GATE_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateObservabilityMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_OBSERVABILITY_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateObservabilityHistoryMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_OBSERVABILITY_HISTORY_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateIncidentCaseCreatedMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_INCIDENT_CASE_CREATED_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateIncidentCaseChecklistUpdatedMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_INCIDENT_CASE_CHECKLIST_UPDATED_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateIncidentCaseClosedMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_INCIDENT_CASE_CLOSED_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateDatabaseReferenceRegistryMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_DATABASE_REFERENCE_REGISTRY_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateDatabaseBindingHandoffMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_DATABASE_BINDING_HANDOFF_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateSecretProviderAdapterMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_SECRET_PROVIDER_ADAPTER_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateProductionConfigurationIntakeMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_PRODUCTION_CONFIGURATION_INTAKE_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateProductionConfigurationApprovalMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_PRODUCTION_CONFIGURATION_APPROVAL_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateProductionConfigurationReadinessMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_PRODUCTION_CONFIGURATION_READINESS_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateProductionChangePackageMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_PRODUCTION_CHANGE_PACKAGE_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateExternalOperatorGovernanceMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_EXTERNAL_OPERATOR_GOVERNANCE_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateIndependentReviewBoardMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_INDEPENDENT_REVIEW_BOARD_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

function validateProductionActivationPermitMetadata(metadata) {
  if (!isPlainObject(metadata)) {
    return false;
  }

  const keys = Object.keys(metadata);
  if (
    keys.some(
      (key) =>
        !PIP_SAFE_PRODUCTION_ACTIVATION_PERMIT_METADATA_KEYS.has(
          String(key).trim()
        )
    )
  ) {
    return false;
  }

  return !containsForbiddenRawValue(metadata);
}

export function validatePipCentralAuditEvent(event) {
  const safeEvent = isPlainObject(event) ? event : {};
  const checks = {
    schema_valid:
      safeEvent.schema === PIP_CENTRAL_AUDIT_EVENT_SCHEMA,
    event_id_valid:
      typeof safeEvent.event_id === "string" &&
      safeEvent.event_id.trim().length > 0,
    occurred_at_valid:
      normalizeIso(safeEvent.occurred_at) !== null,
    category_valid: isSupportedCategory(safeEvent.category),
    event_type_valid: isSupportedEventType(safeEvent.event_type),
    outcome_valid:
      typeof safeEvent.outcome === "string" &&
      safeEvent.outcome.trim().length > 0,
    actor_user_id_valid:
      safeEvent.actor_user_id === null ||
      (typeof safeEvent.actor_user_id === "string" &&
        safeEvent.actor_user_id.trim().length > 0),
    actor_role_valid:
      safeEvent.actor_role === null ||
      (typeof safeEvent.actor_role === "string" &&
        safeEvent.actor_role.trim().length > 0),
    subject_type_valid:
      safeEvent.subject_type === null ||
      (typeof safeEvent.subject_type === "string" &&
        safeEvent.subject_type.trim().length > 0),
    subject_id_valid:
      safeEvent.subject_id === null ||
      (typeof safeEvent.subject_id === "string" &&
        safeEvent.subject_id.trim().length > 0),
    request_id_valid:
      safeEvent.request_id === null ||
      (typeof safeEvent.request_id === "string" &&
        safeEvent.request_id.trim().length > 0),
    request_method_valid:
      safeEvent.request_method === null ||
      (typeof safeEvent.request_method === "string" &&
        safeEvent.request_method.trim().length > 0),
    request_path_valid:
      safeEvent.request_path === null ||
      (typeof safeEvent.request_path === "string" &&
        safeEvent.request_path.trim().length > 0),
    server_instance_id_valid:
      safeEvent.server_instance_id === null ||
      (typeof safeEvent.server_instance_id === "string" &&
        safeEvent.server_instance_id.trim().length > 0),
    constituency_key_valid:
      safeEvent.constituency_key === null ||
      (typeof safeEvent.constituency_key === "string" &&
        safeEvent.constituency_key.trim().length > 0),
    parliament_code_valid:
      safeEvent.parliament_code === null ||
      (typeof safeEvent.parliament_code === "string" &&
        safeEvent.parliament_code.trim().length > 0),
    metadata_valid: isPlainObject(safeEvent.metadata),
    metadata_safe: !hasForbiddenKeyName(safeEvent.metadata),
    system_error_metadata_safe:
      !PIP_SYSTEM_ERROR_EVENT_TYPES.has(safeEvent.event_type) ||
      validateSystemErrorMetadata(safeEvent.metadata),
    operational_alert_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.OPERATIONAL_ALERT_ACKNOWLEDGED &&
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.OPERATIONAL_ALERT_ACCEPTANCE_RECORDED ||
      validateOperationalAlertMetadata(safeEvent.metadata),
    deployment_readiness_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.DEPLOYMENT_READINESS_ACCEPTANCE_RECORDED ||
      validateDeploymentReadinessMetadata(safeEvent.metadata),
    edge_security_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.EDGE_SECURITY_ACCEPTANCE_RECORDED ||
      validateEdgeSecurityMetadata(safeEvent.metadata),
    release_gate_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.RELEASE_GATE_ACCEPTANCE_RECORDED ||
      validateReleaseGateMetadata(safeEvent.metadata),
    observability_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.OBSERVABILITY_SNAPSHOT_ACCEPTANCE_RECORDED ||
      validateObservabilityMetadata(safeEvent.metadata),
    observability_history_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.OBSERVABILITY_HISTORY_SNAPSHOT_RECORDED ||
      validateObservabilityHistoryMetadata(safeEvent.metadata),
    incident_case_created_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.INCIDENT_CASE_CREATED ||
      validateIncidentCaseCreatedMetadata(safeEvent.metadata),
    incident_case_checklist_updated_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.INCIDENT_CASE_CHECKLIST_UPDATED ||
      validateIncidentCaseChecklistUpdatedMetadata(safeEvent.metadata),
    incident_case_closed_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.INCIDENT_CASE_CLOSED ||
      validateIncidentCaseClosedMetadata(safeEvent.metadata),
    database_reference_registry_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.DATABASE_REFERENCE_SLOTS_REGISTERED ||
      validateDatabaseReferenceRegistryMetadata(safeEvent.metadata),
    database_binding_handoff_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.DATABASE_BINDING_HANDOFF_ACKNOWLEDGED ||
      validateDatabaseBindingHandoffMetadata(safeEvent.metadata),
    secret_provider_adapter_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.DEPLOYMENT_SECRET_PROVIDER_ADAPTER_ACKNOWLEDGED ||
      validateSecretProviderAdapterMetadata(safeEvent.metadata),
    production_configuration_intake_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CONFIGURATION_INTAKE_ACCEPTED ||
      validateProductionConfigurationIntakeMetadata(safeEvent.metadata),
    production_configuration_approval_metadata_safe:
      (safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CONFIGURATION_APPROVED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CONFIGURATION_REJECTED) ||
      validateProductionConfigurationApprovalMetadata(safeEvent.metadata),
    production_configuration_readiness_metadata_safe:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CONFIGURATION_READINESS_EVALUATED ||
      validateProductionConfigurationReadinessMetadata(safeEvent.metadata),
    production_change_package_metadata_safe:
      (safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CHANGE_PACKAGE_PREPARED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CHANGE_DRY_RUN_EVALUATED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_CHANGE_HANDOFF_ACKNOWLEDGED) ||
      validateProductionChangePackageMetadata(safeEvent.metadata),
    external_operator_governance_metadata_safe:
      (safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.EXTERNAL_OPERATOR_CHECKLIST_PREPARED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.EXTERNAL_OPERATOR_SEPARATION_EVALUATED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.EXTERNAL_OPERATOR_HANDOFF_ACKNOWLEDGED) ||
      validateExternalOperatorGovernanceMetadata(safeEvent.metadata),
    independent_review_board_metadata_safe:
      (safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.INDEPENDENT_REVIEW_CASE_PREPARED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.INDEPENDENT_REVIEW_EVALUATED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.INDEPENDENT_REVIEW_DECISION_RECORDED) ||
      validateIndependentReviewBoardMetadata(safeEvent.metadata),
    production_activation_permit_metadata_safe:
      (safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_ACTIVATION_PERMIT_PREPARED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_ACTIVATION_PERMIT_EVALUATED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_ACTIVATION_PERMIT_AUTHORIZED &&
        safeEvent.event_type !==
          PIP_CENTRAL_AUDIT_EVENT_TYPES.PRODUCTION_ACTIVATION_PERMIT_REVOKED) ||
      validateProductionActivationPermitMetadata(safeEvent.metadata),
    failed_login_actor_null:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.USER_SIGN_IN_FAILED ||
      safeEvent.actor_user_id === null,
    failed_login_email_absent:
      safeEvent.event_type !==
        PIP_CENTRAL_AUDIT_EVENT_TYPES.USER_SIGN_IN_FAILED ||
      typeof safeEvent.metadata?.failed_identity_fingerprint ===
        "string",
  };

  const errors = [];

  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Central audit event check failed: ${key}`);
    }
  });

  const normalized = {
    schema: PIP_CENTRAL_AUDIT_EVENT_SCHEMA,
    event_id:
      typeof safeEvent.event_id === "string"
        ? safeEvent.event_id.trim()
        : "",
    occurred_at:
      normalizeIso(safeEvent.occurred_at) ??
      new Date().toISOString(),
    category: String(safeEvent.category ?? "").trim(),
    event_type: String(safeEvent.event_type ?? "").trim(),
    outcome: String(safeEvent.outcome ?? "").trim(),
    actor_user_id:
      safeEvent.actor_user_id === null
        ? null
        : String(safeEvent.actor_user_id ?? "").trim() || null,
    actor_role:
      safeEvent.actor_role === null
        ? null
        : String(safeEvent.actor_role ?? "").trim() || null,
    subject_type:
      safeEvent.subject_type === null
        ? null
        : String(safeEvent.subject_type ?? "").trim() || null,
    subject_id:
      safeEvent.subject_id === null
        ? null
        : String(safeEvent.subject_id ?? "").trim() || null,
    request_id:
      safeEvent.request_id === null
        ? null
        : String(safeEvent.request_id ?? "").trim() || null,
    request_method:
      safeEvent.request_method === null
        ? null
        : String(safeEvent.request_method ?? "").trim() || null,
    request_path:
      safeEvent.request_path === null
        ? null
        : String(safeEvent.request_path ?? "").trim() || null,
    server_instance_id:
      safeEvent.server_instance_id === null
        ? null
        : String(safeEvent.server_instance_id ?? "").trim() || null,
    constituency_key:
      safeEvent.constituency_key === null
        ? null
        : String(safeEvent.constituency_key ?? "").trim() || null,
    parliament_code:
      safeEvent.parliament_code === null
        ? null
        : String(safeEvent.parliament_code ?? "").trim() || null,
    metadata: isPlainObject(safeEvent.metadata)
      ? { ...safeEvent.metadata }
      : {},
  };

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipCentralAuditHealth(health) {
  const safeHealth = isPlainObject(health) ? health : {};

  const checks = {
    status_valid:
      safeHealth.status === "READY" ||
      safeHealth.status === "DEGRADED",
    contract_schema_valid:
      safeHealth.contract_schema ===
      PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA,
    event_schema_valid:
      safeHealth.event_schema === PIP_CENTRAL_AUDIT_EVENT_SCHEMA,
    storage_mode_valid:
      safeHealth.storage_mode === "DURABLE_FILE",
    append_only_valid: safeHealth.append_only === true,
    central_persistence_valid:
      safeHealth.central_persistence_enabled === true,
    event_count_valid:
      Number.isInteger(safeHealth.event_count) &&
      safeHealth.event_count >= 0,
    user_event_count_valid:
      Number.isInteger(safeHealth.user_event_count) &&
      safeHealth.user_event_count >= 0,
    system_event_count_valid:
      Number.isInteger(safeHealth.system_event_count) &&
      safeHealth.system_event_count >= 0,
    authorization_event_count_valid:
      Number.isInteger(safeHealth.authorization_event_count) &&
      safeHealth.authorization_event_count >= 0,
    latest_event_at_valid:
      safeHealth.latest_event_at === null ||
      normalizeIso(safeHealth.latest_event_at) !== null,
    authentication_configured_valid:
      safeHealth.authentication_configured === true,
    authentication_required_valid:
      safeHealth.authentication_required === true,
    roles_configured_valid:
      safeHealth.roles_configured === true,
    authorization_enforced_valid:
      safeHealth.authorization_enforced === true,
    read_cutover_disabled:
      safeHealth.operational_read_cutover_enabled === false,
    write_cutover_disabled:
      safeHealth.operational_write_cutover_enabled === false,
    synchronisation_disabled:
      safeHealth.automatic_synchronisation_enabled === false,
    p999_write_protection_valid:
      safeHealth.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Central audit health check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safeHealth,
      latest_event_at:
        normalizeIso(safeHealth.latest_event_at) ?? null,
    },
  };
}

export function validatePipCentralAuditAcceptanceReceipt(receipt) {
  const safeReceipt = isPlainObject(receipt) ? receipt : {};

  const eventValidation = validatePipCentralAuditEvent(
    safeReceipt.event
  );

  const checks = {
    accepted_valid: safeReceipt.accepted === true,
    event_validation_valid: eventValidation.valid === true,
    acceptance_event_type_valid:
      safeReceipt.event?.event_type ===
      PIP_CENTRAL_AUDIT_EVENT_TYPES.AUDIT_ACCEPTANCE_RECORDED,
    write_readback_valid:
      safeReceipt.write_readback_verified === true,
    legacy_storage_preserved_valid:
      safeReceipt.legacy_storage_preserved !== false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Central audit acceptance check failed: ${key}`);
    }
  });

  if (eventValidation.valid !== true) {
    errors.push(
      eventValidation.errors?.[0] ??
        "Acceptance event validation failed."
    );
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      accepted: safeReceipt.accepted === true,
      event: eventValidation.normalized,
      write_readback_verified:
        safeReceipt.write_readback_verified === true,
      legacy_storage_preserved:
        safeReceipt.legacy_storage_preserved !== false,
      received_at:
        normalizeIso(safeReceipt.received_at) ??
        new Date().toISOString(),
    },
  };
}

export function buildPipCentralAuditContractManifest({
  generatedAt,
} = {}) {
  const emittedAt =
    normalizeIso(generatedAt) ?? new Date().toISOString();

  return {
    schema: PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA,
    generated_at: emittedAt,
    event_schema: PIP_CENTRAL_AUDIT_EVENT_SCHEMA,
    categories: {
      ...PIP_CENTRAL_AUDIT_EVENT_CATEGORIES,
    },
    event_types: {
      ...PIP_CENTRAL_AUDIT_EVENT_TYPES,
    },
    error_severities: {
      ...PIP_CENTRAL_AUDIT_ERROR_SEVERITIES,
    },
    capabilities: {
      append_only: true,
      supports_update: false,
      supports_delete: false,
      supports_prune: false,
      supports_restore: false,
      server_generated_events_only: true,
    },
    constraints: {
      prohibit_sensitive_material: true,
      prohibit_raw_stack_traces: true,
      prohibit_raw_exception_messages: true,
      prohibit_raw_voter_data: true,
      prohibit_browser_storage_payloads: true,
      prohibit_scenario_operational_notes: true,
      p999_acceptance_prohibited: true,
      failed_login_identity_fingerprint_required: true,
      failed_login_raw_email_prohibited: true,
    },
    summary: {
      legacy_browser_storage_authoritative: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      append_only: true,
    },
  };
}

export function validatePipCentralAuditContractManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safeManifest.schema === PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA,
    generated_at_valid:
      normalizeIso(safeManifest.generated_at) !== null,
    event_schema_valid:
      safeManifest.event_schema === PIP_CENTRAL_AUDIT_EVENT_SCHEMA,
    categories_valid:
      isPlainObject(safeManifest.categories) &&
      Object.values(PIP_CENTRAL_AUDIT_EVENT_CATEGORIES).every(
        (value) =>
          Object.values(safeManifest.categories).includes(value)
      ),
    event_types_valid:
      isPlainObject(safeManifest.event_types) &&
      Object.values(PIP_CENTRAL_AUDIT_EVENT_TYPES).every((value) =>
        Object.values(safeManifest.event_types).includes(value)
      ),
    error_severities_valid:
      isPlainObject(safeManifest.error_severities) &&
      Object.values(PIP_CENTRAL_AUDIT_ERROR_SEVERITIES).every(
        (value) =>
          Object.values(safeManifest.error_severities).includes(
            value
          )
      ),
    append_only_valid:
      safeManifest.capabilities?.append_only === true,
    update_disabled:
      safeManifest.capabilities?.supports_update === false,
    delete_disabled:
      safeManifest.capabilities?.supports_delete === false,
    prune_disabled:
      safeManifest.capabilities?.supports_prune === false,
    restore_disabled:
      safeManifest.capabilities?.supports_restore === false,
    legacy_authoritative_valid:
      safeManifest.summary
        ?.legacy_browser_storage_authoritative === true,
    read_cutover_disabled:
      safeManifest.summary
        ?.operational_read_cutover_enabled === false,
    write_cutover_disabled:
      safeManifest.summary
        ?.operational_write_cutover_enabled === false,
    sync_disabled:
      safeManifest.summary
        ?.automatic_synchronisation_enabled === false,
    authentication_configured_valid:
      safeManifest.summary?.authentication_configured === true,
    authentication_required_valid:
      safeManifest.summary?.authentication_required === true,
    roles_configured_valid:
      safeManifest.summary?.roles_configured === true,
    authorization_enforced_valid:
      safeManifest.summary?.authorization_enforced === true,
    p999_protection_valid:
      safeManifest.constraints
        ?.p999_acceptance_prohibited === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(
        `Central audit contract check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safeManifest,
  };
}
