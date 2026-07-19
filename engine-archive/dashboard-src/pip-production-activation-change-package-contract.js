export const PIP_PRODUCTION_CHANGE_PACKAGE_CONTRACT_SCHEMA =
  "pip.production-change-package.contract.v1";

export const PIP_PRODUCTION_CHANGE_PACKAGE_SCHEMA =
  "pip.production-change-package.v1";

export const PIP_PRODUCTION_CHANGE_DRY_RUN_REPORT_SCHEMA =
  "pip.production-change-dry-run.v1";

export const PIP_PRODUCTION_CHANGE_HANDOFF_RECEIPT_SCHEMA =
  "pip.production-change-handoff.v1";

export const PIP_PRODUCTION_CHANGE_PACKAGE_STATUSES = Object.freeze({
  NOT_PREPARED: "NOT_PREPARED",
  PREPARED: "PREPARED",
  DRY_RUN_PASSED: "DRY_RUN_PASSED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
  HANDOFF_ACKNOWLEDGED: "HANDOFF_ACKNOWLEDGED",
  SUPERSEDED: "SUPERSEDED",
});

export const PIP_PRODUCTION_CHANGE_DRY_RUN_STATUSES = Object.freeze({
  NOT_RUN: "NOT_RUN",
  PASSED: "PASSED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_PRODUCTION_CHANGE_HANDOFF_STATUSES = Object.freeze({
  NOT_ACKNOWLEDGED: "NOT_ACKNOWLEDGED",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  NO_CHANGE: "NO_CHANGE",
  STALE: "STALE",
  BLOCKED: "BLOCKED",
});

export const PIP_PRODUCTION_CHANGE_WINDOW_CLASSIFICATIONS = Object.freeze({
  CONTROLLED_MAINTENANCE_WINDOW: "CONTROLLED_MAINTENANCE_WINDOW",
  APPROVED_RELEASE_WINDOW: "APPROVED_RELEASE_WINDOW",
});

export const PIP_PRODUCTION_CHANGE_ROLLBACK_CLASSIFICATIONS = Object.freeze({
  CONFIGURATION_REVERSION_ONLY: "CONFIGURATION_REVERSION_ONLY",
  EXTERNAL_PROVIDER_NATIVE_ROLLBACK: "EXTERNAL_PROVIDER_NATIVE_ROLLBACK",
});

export const PIP_PRODUCTION_CHANGE_MONITORING_CLASSIFICATIONS = Object.freeze({
  MANUAL_OBSERVATION_ONLY: "MANUAL_OBSERVATION_ONLY",
  EXTERNAL_PROVIDER_MONITORING: "EXTERNAL_PROVIDER_MONITORING",
});

export const PIP_PRODUCTION_CHANGE_BLOCKER_CODES = Object.freeze({
  LATEST_INTAKE_REQUIRED: "LATEST_INTAKE_REQUIRED",
  VALID_INTAKE_RECEIPT_REQUIRED: "VALID_INTAKE_RECEIPT_REQUIRED",
  LATEST_APPROVAL_REQUIRED: "LATEST_APPROVAL_REQUIRED",
  VALID_APPROVAL_RECEIPT_REQUIRED: "VALID_APPROVAL_RECEIPT_REQUIRED",
  APPROVAL_ACTION_NOT_APPROVE: "APPROVAL_ACTION_NOT_APPROVE",
  APPROVAL_STATUS_NOT_APPROVED: "APPROVAL_STATUS_NOT_APPROVED",
  ACTIVATION_READINESS_NOT_READY: "ACTIVATION_READINESS_NOT_READY",
  APPROVAL_INTAKE_MISMATCH: "APPROVAL_INTAKE_MISMATCH",
  INTAKE_DIGEST_MISMATCH: "INTAKE_DIGEST_MISMATCH",
  APPROVAL_DIGEST_MISMATCH: "APPROVAL_DIGEST_MISMATCH",
  CHANGE_REFERENCE_MISMATCH: "CHANGE_REFERENCE_MISMATCH",
  PACKAGE_SUPERSEDED: "PACKAGE_SUPERSEDED",
  REQUIRED_ATTESTATION_INCOMPLETE: "REQUIRED_ATTESTATION_INCOMPLETE",
  DURABLE_READBACK_INVALID: "DURABLE_READBACK_INVALID",
  P999_CONTEXT_BLOCKED: "P999_CONTEXT_BLOCKED",
  SECURITY_INVARIANT_FAILED: "SECURITY_INVARIANT_FAILED",
});

export const PIP_PRODUCTION_CHANGE_CHECK_KEYS = Object.freeze({
  CHANGE_PACKAGE_CONTRACT_VALID: "change_package_contract_valid",
  INTAKE_CONTRACT_VALID: "intake_contract_valid",
  LATEST_INTAKE_PRESENT: "latest_intake_present",
  LATEST_INTAKE_VALID: "latest_intake_valid",
  APPROVAL_CONTRACT_VALID: "approval_contract_valid",
  LATEST_APPROVAL_PRESENT: "latest_approval_present",
  LATEST_APPROVAL_VALID: "latest_approval_valid",
  APPROVAL_ACTION_IS_APPROVE: "approval_action_is_approve",
  APPROVAL_STATUS_IS_APPROVED: "approval_status_is_approved",
  APPROVAL_MATCHES_LATEST_INTAKE: "approval_matches_latest_intake",
  INTAKE_DIGEST_MATCHES: "intake_digest_matches",
  APPROVAL_DIGEST_MATCHES: "approval_digest_matches",
  CHANGE_REFERENCE_MATCHES: "change_reference_matches",
  ACTIVATION_READINESS_REPORT_VALID: "activation_readiness_report_valid",
  ACTIVATION_READINESS_IS_READY: "activation_readiness_is_ready",
  ALL_BATCH60B_ATTESTATIONS_COMPLETE: "all_batch60b_attestations_complete",
  REFERENCE_ALIAS_COUNT_COMPLETE: "reference_alias_count_complete",
  OPAQUE_REFERENCE_ALIASES_CONFIRMED: "opaque_reference_aliases_confirmed",
  PACKAGE_DIGEST_VALID: "package_digest_valid",
  PACKAGE_NOT_SUPERSEDED: "package_not_superseded",
  DURABLE_INTAKE_READBACK_VALID: "durable_intake_readback_valid",
  DURABLE_APPROVAL_READBACK_VALID: "durable_approval_readback_valid",
  DURABLE_PACKAGE_READBACK_VALID: "durable_package_readback_valid",
  AUTHENTICATED_ADMINISTRATOR_REQUIRED: "authenticated_administrator_required",
  USER_ADMIN_PERMISSION_REQUIRED: "user_admin_permission_required",
  AUDIT_MAINTAIN_PERMISSION_REQUIRED: "audit_maintain_permission_required",
  CSRF_REQUIRED_FOR_MUTATIONS: "csrf_required_for_mutations",
  P999_PROTECTED: "p999_protected",
  NO_SECRET_VALUES_PRESENT: "no_secret_values_present",
  NO_ENVIRONMENT_VALUES_PRESENT: "no_environment_values_present",
  NO_CONNECTION_VALUES_PRESENT: "no_connection_values_present",
  NO_EXECUTABLE_COMMANDS_GENERATED: "no_executable_commands_generated",
  DATABASE_DRIVER_NOT_INVOKED: "database_driver_not_invoked",
  DATABASE_ADAPTER_NOT_INVOKED: "database_adapter_not_invoked",
  CONNECTION_PROBE_NOT_INVOKED: "connection_probe_not_invoked",
  NETWORK_RESOLUTION_NOT_INVOKED: "network_resolution_not_invoked",
  OUTBOUND_NETWORK_NOT_INVOKED: "outbound_network_not_invoked",
  SQL_NOT_EXECUTED: "sql_not_executed",
  DDL_NOT_EXECUTED: "ddl_not_executed",
  SCHEMA_NOT_CREATED: "schema_not_created",
  MIGRATION_NOT_EXECUTED: "migration_not_executed",
  PRODUCTION_DATA_NOT_WRITTEN: "production_data_not_written",
  BINDING_NOT_ACTIVATED: "binding_not_activated",
  SHADOW_WRITE_DISABLED: "shadow_write_disabled",
  DUAL_WRITE_DISABLED: "dual_write_disabled",
  REPOSITORY_CUTOVER_DISABLED: "repository_cutover_disabled",
  OPERATIONAL_READ_CUTOVER_DISABLED: "operational_read_cutover_disabled",
  OPERATIONAL_WRITE_CUTOVER_DISABLED: "operational_write_cutover_disabled",
  AUTOMATIC_SYNCHRONISATION_DISABLED: "automatic_synchronisation_disabled",
  AUTOMATIC_ACTIVATION_DISABLED: "automatic_activation_disabled",
});

const REQUEST_ID_PATTERN = /^REQ-[A-Z0-9-]{6,72}$/;
const PACKAGE_ID_PATTERN = /^PKG-[A-Z0-9-]{12,96}$/;
const HANDOFF_ID_PATTERN = /^HO-[A-Z0-9-]{12,96}$/;
const INTAKE_ID_PATTERN = /^INTAKE-[A-Z0-9-]{12,96}$/;
const APPROVAL_ID_PATTERN = /^APPROVAL-[A-Z0-9-]{12,96}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

const FORBIDDEN_KEY_NAMES = new Set([
  "password",
  "token",
  "secret",
  "secret_name",
  "secret_path",
  "secret_identifier",
  "secret_value",
  "connection_string",
  "database_url",
  "host",
  "hostname",
  "ip",
  "port",
  "username",
  "database",
  "database_name",
  "cookie",
  "csrf",
  "session",
  "request_body",
  "raw_request_body",
  "email",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIso(value) {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function hasForbiddenKeyName(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeyName(entry));
  }
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).some(([key, nested]) => {
    if (FORBIDDEN_KEY_NAMES.has(sanitizeText(key).toLowerCase())) {
      return true;
    }
    return hasForbiddenKeyName(nested);
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (!isPlainObject(value)) {
    return JSON.stringify(value);
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function normalizePackageForDigest(input) {
  const safe = isPlainObject(input) ? { ...input } : {};
  delete safe.generated_at;
  delete safe.package_digest;
  return safe;
}

function computeDigestSync(value) {
  const serialized = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 31 + serialized.charCodeAt(index)) >>> 0;
  }
  const part = hash.toString(16).padStart(8, "0");
  return `${part}${part}${part}${part}${part}${part}${part}${part}`.slice(0, 64);
}

function buildInvariantFlags() {
  return {
    activation_performed: false,
    deployment_execution_enabled: false,
    executable_commands_generated: false,
    shell_script_generated: false,
    environment_file_generated: false,
    secret_resolution: false,
    secret_values_read: false,
    environment_values_read: false,
    credential_materialization: false,
    connection_string_construction: false,
    database_connection_attempted: false,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    connection_probe: false,
    network_resolution: false,
    outbound_network: false,
    sql_execution: false,
    ddl_execution: false,
    schema_creation: false,
    migration_execution: false,
    production_data_write: false,
    binding_activated: false,
    shadow_write: false,
    dual_write: false,
    repository_cutover: false,
    read_cutover: false,
    write_cutover: false,
    automatic_activation: false,
    automatic_retry: false,
    automatic_synchronisation: false,
    p999_protected: true,
  };
}

export function buildPipProductionChangePackageContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_PRODUCTION_CHANGE_PACKAGE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    change_package_schema: PIP_PRODUCTION_CHANGE_PACKAGE_SCHEMA,
    dry_run_report_schema: PIP_PRODUCTION_CHANGE_DRY_RUN_REPORT_SCHEMA,
    handoff_receipt_schema: PIP_PRODUCTION_CHANGE_HANDOFF_RECEIPT_SCHEMA,
    statuses: {
      package: { ...PIP_PRODUCTION_CHANGE_PACKAGE_STATUSES },
      dry_run: { ...PIP_PRODUCTION_CHANGE_DRY_RUN_STATUSES },
      handoff: { ...PIP_PRODUCTION_CHANGE_HANDOFF_STATUSES },
    },
    classifications: {
      change_window: { ...PIP_PRODUCTION_CHANGE_WINDOW_CLASSIFICATIONS },
      rollback: { ...PIP_PRODUCTION_CHANGE_ROLLBACK_CLASSIFICATIONS },
      monitoring: { ...PIP_PRODUCTION_CHANGE_MONITORING_CLASSIFICATIONS },
    },
    blocker_codes: { ...PIP_PRODUCTION_CHANGE_BLOCKER_CODES },
    check_keys: { ...PIP_PRODUCTION_CHANGE_CHECK_KEYS },
    summary: {
      change_package_enabled: true,
      change_package_manual_only: true,
      static_dry_run_enabled: true,
      static_dry_run_non_executable: true,
      manual_handoff_acknowledgement_only: true,
      administrator_only: true,
      user_admin_permission_required: true,
      audit_maintain_permission_required: true,
      csrf_required_for_mutations: true,
      approved_intake_required: true,
      approved_configuration_required: true,
      activation_readiness_required: true,
      latest_approval_required: true,
      deterministic_package_digest_enabled: true,
      durable_package_registry_enabled: true,
      atomic_write_enabled: true,
      append_only_revision_history: true,
      idempotent_prepare_enabled: true,
      idempotent_handoff_enabled: true,
      actual_activation_enabled: false,
      deployment_execution_enabled: false,
      executable_command_generation_enabled: false,
      shell_script_generation_enabled: false,
      environment_file_generation_enabled: false,
      secret_resolution_enabled: false,
      secret_value_read_enabled: false,
      secret_value_write_enabled: false,
      environment_value_read_enabled: false,
      credential_materialization_enabled: false,
      connection_string_construction_enabled: false,
      database_driver_invoked: false,
      database_adapter_invoked: false,
      connection_probe_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      schema_creation_invoked: false,
      migration_invoked: false,
      production_data_write_invoked: false,
      binding_activation_performed: false,
      shadow_write_enabled: false,
      dual_write_enabled: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_activation_enabled: false,
      automatic_retry_enabled: false,
      polling_enabled: false,
      recurring_timer_enabled: false,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,
      p999_write_protection: true,
      secret_values_excluded: true,
      secret_reference_values_excluded: true,
      raw_reference_names_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      infrastructure_values_excluded: true,
      user_identity_values_excluded: true,
      raw_request_content_excluded: true,
      raw_errors_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      filesystem_paths_excluded: true,
    },
  };
}

export function sanitizePipProductionChangePackage(input = {}) {
  const safe = isPlainObject(input) ? input : {};

  return {
    schema: PIP_PRODUCTION_CHANGE_PACKAGE_SCHEMA,
    package_id: sanitizeText(safe.package_id).toUpperCase(),
    package_revision: Number.parseInt(String(safe.package_revision ?? "0"), 10),
    package_digest: sanitizeText(safe.package_digest).toLowerCase(),
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    intake_id: sanitizeText(safe.intake_id).toUpperCase(),
    intake_request_id: sanitizeText(safe.intake_request_id).toUpperCase(),
    intake_receipt_digest: sanitizeText(safe.intake_receipt_digest).toLowerCase(),
    approval_id: sanitizeText(safe.approval_id).toUpperCase(),
    approval_request_id: sanitizeText(safe.approval_request_id).toUpperCase(),
    approval_revision: Number.parseInt(String(safe.approval_revision ?? "0"), 10),
    approval_receipt_digest: sanitizeText(safe.approval_receipt_digest).toLowerCase(),
    activation_readiness_digest: sanitizeText(safe.activation_readiness_digest).toLowerCase(),
    target_environment: sanitizeText(safe.target_environment).toUpperCase(),
    provider_kind: sanitizeText(safe.provider_kind).toUpperCase(),
    provider_vendor: sanitizeText(safe.provider_vendor).toUpperCase(),
    deployment_model: sanitizeText(safe.deployment_model).toUpperCase(),
    region_classification: sanitizeText(safe.region_classification).toUpperCase(),
    tls_mode: sanitizeText(safe.tls_mode).toUpperCase(),
    reference_alias_count: Number.parseInt(String(safe.reference_alias_count ?? "0"), 10),
    reference_alias_set_digest: sanitizeText(safe.reference_alias_set_digest).toLowerCase(),
    change_reference: sanitizeText(safe.change_reference).toUpperCase(),
    change_window_classification: sanitizeText(
      safe.change_window_classification
    ).toUpperCase(),
    rollback_classification: sanitizeText(safe.rollback_classification).toUpperCase(),
    monitoring_classification: sanitizeText(safe.monitoring_classification).toUpperCase(),
    activation_mode: "EXTERNAL_MANUAL_OPERATOR",
    dry_run_mode: "STATIC_GOVERNANCE_NO_CONNECTIVITY",
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    activation_performed: false,
    connection_attempted: false,
    database_operation_performed: false,
  };
}

export function sanitizePipProductionChangeDryRunReport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = Array.isArray(safe.checks) ? safe.checks : [];
  const blockerCodes = Array.isArray(safe.blocker_codes) ? safe.blocker_codes : [];

  return {
    schema: PIP_PRODUCTION_CHANGE_DRY_RUN_REPORT_SCHEMA,
    package_id: sanitizeText(safe.package_id).toUpperCase(),
    package_revision: Number.parseInt(String(safe.package_revision ?? "0"), 10),
    package_digest: sanitizeText(safe.package_digest).toLowerCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    passed_checks: Number.parseInt(String(safe.passed_checks ?? "0"), 10),
    blocked_checks: Number.parseInt(String(safe.blocked_checks ?? "0"), 10),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? blockerCodes.length), 10),
    blocker_codes: blockerCodes.map((entry) => sanitizeText(entry).toUpperCase()),
    checks: checks.map((entry) => ({
      check_key: sanitizeText(entry?.check_key).toLowerCase(),
      status: sanitizeText(entry?.status).toUpperCase(),
      message: sanitizeText(entry?.message),
      required: entry?.required !== false,
    })),
    ready_for_external_manual_change_review:
      safe.ready_for_external_manual_change_review === true,
    activation_performed: false,
    connection_attempted: false,
    database_operation_performed: false,
    executable_commands_generated: false,
    durable_readback: safe.durable_readback === true,
    invariant_flags: buildInvariantFlags(),
  };
}

export function sanitizePipProductionChangeHandoffReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_PRODUCTION_CHANGE_HANDOFF_RECEIPT_SCHEMA,
    handoff_id: sanitizeText(safe.handoff_id).toUpperCase(),
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    package_id: sanitizeText(safe.package_id).toUpperCase(),
    package_revision: Number.parseInt(String(safe.package_revision ?? "0"), 10),
    package_digest: sanitizeText(safe.package_digest).toLowerCase(),
    dry_run_status: sanitizeText(safe.dry_run_status).toUpperCase(),
    handoff_status: sanitizeText(safe.handoff_status).toUpperCase(),
    idempotency_status: sanitizeText(safe.idempotency_status).toUpperCase(),
    acknowledged_at: normalizeIso(safe.acknowledged_at) ?? new Date().toISOString(),
    stored_at: normalizeIso(safe.stored_at) ?? new Date().toISOString(),
    durable_readback: safe.durable_readback === true,
    activation_performed: false,
    connection_attempted: false,
    database_operation_performed: false,
    executable_commands_generated: false,
  };
}

export function buildPipProductionChangePackage(input = {}) {
  const sanitized = sanitizePipProductionChangePackage(input);
  const digest = computePipProductionChangePackageDigest(sanitized);
  return {
    ...sanitized,
    package_digest: digest,
  };
}

export function buildPipProductionChangeDryRunReport(input = {}) {
  return sanitizePipProductionChangeDryRunReport(input);
}

export function buildPipProductionChangeHandoffReceipt(input = {}) {
  return sanitizePipProductionChangeHandoffReceipt(input);
}

export function validatePipProductionChangePackageContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_PRODUCTION_CHANGE_PACKAGE_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    package_schema_valid:
      safe.change_package_schema === PIP_PRODUCTION_CHANGE_PACKAGE_SCHEMA,
    dry_run_schema_valid:
      safe.dry_run_report_schema === PIP_PRODUCTION_CHANGE_DRY_RUN_REPORT_SCHEMA,
    handoff_schema_valid:
      safe.handoff_receipt_schema === PIP_PRODUCTION_CHANGE_HANDOFF_RECEIPT_SCHEMA,
    manual_only: summary.change_package_manual_only === true,
    static_dry_run_non_executable: summary.static_dry_run_non_executable === true,
    admin_only: summary.administrator_only === true,
    user_admin_permission_required:
      summary.user_admin_permission_required === true,
    audit_maintain_permission_required:
      summary.audit_maintain_permission_required === true,
    csrf_required: summary.csrf_required_for_mutations === true,
    deterministic_digest: summary.deterministic_package_digest_enabled === true,
    durable_registry: summary.durable_package_registry_enabled === true,
    atomic_write: summary.atomic_write_enabled === true,
    append_only_history: summary.append_only_revision_history === true,
    idempotent_prepare: summary.idempotent_prepare_enabled === true,
    idempotent_handoff: summary.idempotent_handoff_enabled === true,
    execution_disabled:
      summary.actual_activation_enabled === false &&
      summary.deployment_execution_enabled === false &&
      summary.executable_command_generation_enabled === false,
    secret_resolution_disabled: summary.secret_resolution_enabled === false,
    database_operations_disabled:
      summary.database_driver_invoked === false &&
      summary.database_adapter_invoked === false &&
      summary.sql_execution_invoked === false &&
      summary.ddl_execution_invoked === false &&
      summary.migration_invoked === false,
    active_repository_kind: summary.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative: summary.durable_file_authoritative === true,
    p999_write_protection: summary.p999_write_protection === true,
    sanitized_content_only:
      summary.user_identity_values_excluded === true &&
      summary.secret_values_excluded === true &&
      summary.environment_values_excluded === true &&
      summary.connection_values_excluded === true,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) =>
      `Production activation change package manifest check failed: ${key}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: buildPipProductionChangePackageContractManifest({
      generatedAt: safe.generated_at,
    }),
  };
}

export function validatePipProductionChangePackage(value) {
  const normalized = sanitizePipProductionChangePackage(value);
  const computedDigest = computePipProductionChangePackageDigest(normalized);

  const checks = {
    schema_valid: normalized.schema === PIP_PRODUCTION_CHANGE_PACKAGE_SCHEMA,
    package_id_valid: PACKAGE_ID_PATTERN.test(normalized.package_id),
    package_revision_valid:
      Number.isInteger(normalized.package_revision) && normalized.package_revision > 0,
    package_digest_valid: SHA256_PATTERN.test(normalized.package_digest),
    package_digest_matches: normalized.package_digest === computedDigest,
    request_id_valid: REQUEST_ID_PATTERN.test(normalized.request_id),
    intake_id_valid: INTAKE_ID_PATTERN.test(normalized.intake_id),
    approval_id_valid: APPROVAL_ID_PATTERN.test(normalized.approval_id),
    intake_receipt_digest_valid: SHA256_PATTERN.test(normalized.intake_receipt_digest),
    approval_receipt_digest_valid: SHA256_PATTERN.test(normalized.approval_receipt_digest),
    activation_readiness_digest_valid: SHA256_PATTERN.test(
      normalized.activation_readiness_digest
    ),
    reference_alias_count_valid:
      Number.isInteger(normalized.reference_alias_count) &&
      normalized.reference_alias_count > 0,
    reference_alias_set_digest_valid: SHA256_PATTERN.test(
      normalized.reference_alias_set_digest
    ),
    change_window_classification_valid: Object.values(
      PIP_PRODUCTION_CHANGE_WINDOW_CLASSIFICATIONS
    ).includes(normalized.change_window_classification),
    rollback_classification_valid: Object.values(
      PIP_PRODUCTION_CHANGE_ROLLBACK_CLASSIFICATIONS
    ).includes(normalized.rollback_classification),
    monitoring_classification_valid: Object.values(
      PIP_PRODUCTION_CHANGE_MONITORING_CLASSIFICATIONS
    ).includes(normalized.monitoring_classification),
    activation_mode_valid:
      normalized.activation_mode === "EXTERNAL_MANUAL_OPERATOR",
    dry_run_mode_valid:
      normalized.dry_run_mode === "STATIC_GOVERNANCE_NO_CONNECTIVITY",
    status_valid: Object.values(PIP_PRODUCTION_CHANGE_PACKAGE_STATUSES).includes(
      normalized.status
    ),
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    no_execution:
      normalized.activation_performed === false &&
      normalized.connection_attempted === false &&
      normalized.database_operation_performed === false,
    forbidden_keys_absent: hasForbiddenKeyName(normalized) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) =>
      `Production activation change package check failed: ${key}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipProductionChangeDryRunReport(value) {
  const normalized = sanitizePipProductionChangeDryRunReport(value);
  const validStatuses = new Set(["PASS", "FAIL"]);

  const checks = {
    schema_valid:
      normalized.schema === PIP_PRODUCTION_CHANGE_DRY_RUN_REPORT_SCHEMA,
    package_id_valid: PACKAGE_ID_PATTERN.test(normalized.package_id),
    package_revision_valid:
      Number.isInteger(normalized.package_revision) && normalized.package_revision > 0,
    package_digest_valid: SHA256_PATTERN.test(normalized.package_digest),
    status_valid: Object.values(PIP_PRODUCTION_CHANGE_DRY_RUN_STATUSES).includes(
      normalized.status
    ),
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    blocker_count_valid:
      Number.isInteger(normalized.blocker_count) &&
      normalized.blocker_count >= 0 &&
      normalized.blocker_count === normalized.blocker_codes.length,
    checks_valid: normalized.checks.every(
      (entry) =>
        typeof entry.check_key === "string" &&
        entry.check_key.trim().length > 0 &&
        validStatuses.has(String(entry.status ?? "")) &&
        typeof entry.message === "string" &&
        entry.message.trim().length > 0 &&
        typeof entry.required === "boolean"
    ),
    ready_flag_valid:
      typeof normalized.ready_for_external_manual_change_review === "boolean",
    no_execution:
      normalized.activation_performed === false &&
      normalized.connection_attempted === false &&
      normalized.database_operation_performed === false &&
      normalized.executable_commands_generated === false,
    durable_readback_valid: normalized.durable_readback === true,
    forbidden_keys_absent: hasForbiddenKeyName(normalized) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) => `Production change dry-run check failed: ${key}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipProductionChangeHandoffReceipt(value) {
  const normalized = sanitizePipProductionChangeHandoffReceipt(value);

  const checks = {
    schema_valid:
      normalized.schema === PIP_PRODUCTION_CHANGE_HANDOFF_RECEIPT_SCHEMA,
    handoff_id_valid: HANDOFF_ID_PATTERN.test(normalized.handoff_id),
    request_id_valid: REQUEST_ID_PATTERN.test(normalized.request_id),
    package_id_valid: PACKAGE_ID_PATTERN.test(normalized.package_id),
    package_revision_valid:
      Number.isInteger(normalized.package_revision) && normalized.package_revision > 0,
    package_digest_valid: SHA256_PATTERN.test(normalized.package_digest),
    dry_run_status_valid: Object.values(PIP_PRODUCTION_CHANGE_DRY_RUN_STATUSES).includes(
      normalized.dry_run_status
    ),
    handoff_status_valid: Object.values(PIP_PRODUCTION_CHANGE_HANDOFF_STATUSES).includes(
      normalized.handoff_status
    ),
    idempotency_status_valid: normalized.idempotency_status.length > 0,
    acknowledged_at_valid: normalizeIso(normalized.acknowledged_at) !== null,
    stored_at_valid: normalizeIso(normalized.stored_at) !== null,
    durable_readback_valid: normalized.durable_readback === true,
    no_execution:
      normalized.activation_performed === false &&
      normalized.connection_attempted === false &&
      normalized.database_operation_performed === false &&
      normalized.executable_commands_generated === false,
    forbidden_keys_absent: hasForbiddenKeyName(normalized) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) => `Production change handoff check failed: ${key}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function computePipProductionChangePackageDigest(input) {
  const normalized = normalizePackageForDigest(sanitizePipProductionChangePackage(input));
  return computeDigestSync(normalized);
}
