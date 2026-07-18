export const PIP_RUNTIME_ACCEPTANCE_CONTRACT_SCHEMA =
  "pip.runtime-acceptance.contract.v1";
export const PIP_RUNTIME_ACCEPTANCE_REPORT_SCHEMA =
  "pip.runtime-acceptance.report.v1";

export const PIP_RUNTIME_ACCEPTANCE_STATUSES = Object.freeze({
  API_UNAVAILABLE: "API_UNAVAILABLE",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  DEPENDENCIES_PENDING: "DEPENDENCIES_PENDING",
  READY_FOR_MANUAL_ACCEPTANCE: "READY_FOR_MANUAL_ACCEPTANCE",
  RUNTIME_ACCEPTED: "RUNTIME_ACCEPTED",
  RUNTIME_BLOCKED: "RUNTIME_BLOCKED",
});

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

function toSafeBoolean(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  return fallback;
}

function toSafeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Number(fallback) || 0);
  }
  return Math.max(0, parsed);
}

function buildSafetyFlags(input = {}) {
  const safe = isPlainObject(input) ? input : {};

  return {
    external_network_enabled: false,
    automatic_dependency_execution_enabled: false,
    automatic_acknowledgement_enabled: false,
    secret_values_read: false,
    environment_values_read: false,
    database_driver_invoked: false,
    sql_execution: false,
    ddl_execution: false,
    binding_activated: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_synchronisation_enabled: false,
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };
}

export function buildPipRuntimeAcceptanceContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_RUNTIME_ACCEPTANCE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_RUNTIME_ACCEPTANCE_REPORT_SCHEMA,
    statuses: { ...PIP_RUNTIME_ACCEPTANCE_STATUSES },
    summary: {
      runtime_acceptance_enabled: true,
      runtime_acceptance_read_only: true,
      manual_dependency_execution_only: true,
      manual_acknowledgement_only: true,
      automatic_dependency_execution_enabled: false,
      automatic_acknowledgement_enabled: false,
      automatic_retry_enabled: false,
      external_network_enabled: false,
      loopback_api_only: true,
      authentication_required: true,
      authorization_enforced: true,
      csrf_required_for_mutations: true,
      durable_receipt_readback_enabled: true,
      browser_storage_receipt_authoritative: false,
      secret_values_excluded: true,
      secret_reference_values_excluded: true,
      raw_reference_names_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      user_identity_values_excluded: true,
      raw_errors_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      database_driver_invoked: false,
      database_adapter_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      migration_invoked: false,
      binding_activation_performed: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      p999_write_protection: true,
    },
  };
}

export function buildPipRuntimeAcceptanceReport(input = {}) {
  const safe = isPlainObject(input) ? input : {};

  const dependencyCount = toSafeInteger(safe.dependency_count, 4);
  const readyCount = toSafeInteger(safe.ready_dependency_count, 0);
  const acknowledgedCount = toSafeInteger(safe.acknowledged_dependency_count, 0);

  return {
    schema: PIP_RUNTIME_ACCEPTANCE_REPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    status: Object.values(PIP_RUNTIME_ACCEPTANCE_STATUSES).includes(
      sanitizeText(safe.status).toUpperCase()
    )
      ? sanitizeText(safe.status).toUpperCase()
      : PIP_RUNTIME_ACCEPTANCE_STATUSES.DEPENDENCIES_PENDING,
    api_reachable: toSafeBoolean(safe.api_reachable, false),
    health_report_valid: toSafeBoolean(safe.health_report_valid, false),
    authentication_configured: toSafeBoolean(safe.authentication_configured, false),
    authentication_required: toSafeBoolean(safe.authentication_required, true),
    authorization_enforced: toSafeBoolean(safe.authorization_enforced, true),
    authenticated_session_present: toSafeBoolean(
      safe.authenticated_session_present,
      false
    ),
    csrf_available: toSafeBoolean(safe.csrf_available, false),
    active_constituency_classification:
      sanitizeText(safe.active_constituency_classification).toUpperCase() ||
      "UNKNOWN",
    reference_registry_status:
      sanitizeText(safe.reference_registry_status).toUpperCase() || "PENDING",
    database_binding_status:
      sanitizeText(safe.database_binding_status).toUpperCase() || "PENDING",
    secret_provider_adapter_status:
      sanitizeText(safe.secret_provider_adapter_status).toUpperCase() || "PENDING",
    secret_reference_binding_status:
      sanitizeText(safe.secret_reference_binding_status).toUpperCase() || "PENDING",
    dependency_count: dependencyCount,
    ready_dependency_count: Math.min(dependencyCount, readyCount),
    acknowledged_dependency_count: Math.min(dependencyCount, acknowledgedCount),
    pending_dependency_count: Math.max(
      0,
      dependencyCount - Math.min(dependencyCount, acknowledgedCount)
    ),
    runtime_acceptance_ready: toSafeBoolean(safe.runtime_acceptance_ready, false),
    safety_flags: buildSafetyFlags(safe.safety_flags),
  };
}

export function validatePipRuntimeAcceptanceContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_RUNTIME_ACCEPTANCE_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid: safe.report_schema === PIP_RUNTIME_ACCEPTANCE_REPORT_SCHEMA,
    runtime_acceptance_enabled: summary.runtime_acceptance_enabled === true,
    runtime_acceptance_read_only: summary.runtime_acceptance_read_only === true,
    manual_dependency_execution_only:
      summary.manual_dependency_execution_only === true,
    manual_acknowledgement_only: summary.manual_acknowledgement_only === true,
    automation_disabled:
      summary.automatic_dependency_execution_enabled === false &&
      summary.automatic_acknowledgement_enabled === false &&
      summary.automatic_retry_enabled === false,
    loopback_api_only: summary.loopback_api_only === true,
    auth_enforced:
      summary.authentication_required === true &&
      summary.authorization_enforced === true &&
      summary.csrf_required_for_mutations === true,
    durable_receipt_readback_enabled:
      summary.durable_receipt_readback_enabled === true,
    browser_storage_not_authoritative:
      summary.browser_storage_receipt_authoritative === false,
    exclusions_enabled:
      summary.secret_values_excluded === true &&
      summary.secret_reference_values_excluded === true &&
      summary.raw_reference_names_excluded === true &&
      summary.environment_values_excluded === true &&
      summary.connection_values_excluded === true &&
      summary.credential_values_excluded === true &&
      summary.user_identity_values_excluded === true &&
      summary.raw_errors_excluded === true &&
      summary.voter_data_excluded === true &&
      summary.scenario_content_excluded === true,
    unsafe_ops_disabled:
      summary.database_driver_invoked === false &&
      summary.database_adapter_invoked === false &&
      summary.sql_execution_invoked === false &&
      summary.ddl_execution_invoked === false &&
      summary.migration_invoked === false &&
      summary.binding_activation_performed === false,
    cutovers_disabled:
      summary.repository_cutover_enabled === false &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false,
    sync_disabled: summary.automatic_synchronisation_enabled === false,
    p999_write_protection: summary.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Runtime acceptance contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_RUNTIME_ACCEPTANCE_CONTRACT_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      report_schema: PIP_RUNTIME_ACCEPTANCE_REPORT_SCHEMA,
      statuses: { ...PIP_RUNTIME_ACCEPTANCE_STATUSES },
      summary,
    },
  };
}

export function validatePipRuntimeAcceptanceReport(report) {
  const normalized = buildPipRuntimeAcceptanceReport(report);

  const checks = {
    schema_valid: normalized.schema === PIP_RUNTIME_ACCEPTANCE_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    status_valid: Object.values(PIP_RUNTIME_ACCEPTANCE_STATUSES).includes(
      normalized.status
    ),
    dependency_counts_valid:
      normalized.dependency_count >= 0 &&
      normalized.ready_dependency_count >= 0 &&
      normalized.acknowledged_dependency_count >= 0 &&
      normalized.pending_dependency_count >= 0 &&
      normalized.ready_dependency_count <= normalized.dependency_count &&
      normalized.acknowledged_dependency_count <= normalized.dependency_count,
    safety_flags_valid:
      normalized.safety_flags.external_network_enabled === false &&
      normalized.safety_flags.automatic_dependency_execution_enabled === false &&
      normalized.safety_flags.automatic_acknowledgement_enabled === false &&
      normalized.safety_flags.secret_values_read === false &&
      normalized.safety_flags.environment_values_read === false &&
      normalized.safety_flags.database_driver_invoked === false &&
      normalized.safety_flags.sql_execution === false &&
      normalized.safety_flags.ddl_execution === false &&
      normalized.safety_flags.binding_activated === false &&
      normalized.safety_flags.repository_cutover_enabled === false &&
      normalized.safety_flags.operational_read_cutover_enabled === false &&
      normalized.safety_flags.operational_write_cutover_enabled === false &&
      normalized.safety_flags.automatic_synchronisation_enabled === false &&
      normalized.safety_flags.p999_write_protection === true,
    classification_valid:
      normalized.active_constituency_classification.length > 0 &&
      normalized.reference_registry_status.length > 0 &&
      normalized.database_binding_status.length > 0 &&
      normalized.secret_provider_adapter_status.length > 0 &&
      normalized.secret_reference_binding_status.length > 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Runtime acceptance report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}
