export const PIP_DATABASE_BINDING_READINESS_CONTRACT_SCHEMA =
  "pip.database-binding-readiness.contract.v1";
export const PIP_DATABASE_BINDING_READINESS_REPORT_SCHEMA =
  "pip.database-binding-readiness.report.v1";
export const PIP_DATABASE_BINDING_HANDOFF_ACKNOWLEDGEMENT_SCHEMA =
  "pip.database-binding-readiness.acknowledgement.v1";

export const PIP_DATABASE_BINDING_HANDOFF_STATES = Object.freeze({
  PENDING: "PENDING",
  ACKNOWLEDGED: "ACKNOWLEDGED",
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

function toSafeBoolean(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  return fallback;
}

function toSafeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function normalizeIso(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(Date.parse(value)).toISOString();
}

function normalizeHex(value) {
  const normalized = sanitizeText(value).toLowerCase();
  if (!normalized) {
    return "";
  }
  return /^[a-f0-9]{16,128}$/.test(normalized) ? normalized : "";
}

function normalizeBlockers(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((entry) => sanitizeText(entry).toUpperCase())
    .filter(Boolean)
    .filter((entry, index, array) => array.indexOf(entry) === index);
}

export function buildPipDatabaseBindingReadinessContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_DATABASE_BINDING_READINESS_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    readiness_report_schema: PIP_DATABASE_BINDING_READINESS_REPORT_SCHEMA,
    acknowledgement_schema: PIP_DATABASE_BINDING_HANDOFF_ACKNOWLEDGEMENT_SCHEMA,
    handoff_states: { ...PIP_DATABASE_BINDING_HANDOFF_STATES },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,

      readiness_inspection_enabled: true,
      readiness_inspection_read_only: true,
      handoff_acknowledgement_enabled: true,
      acknowledgement_idempotent: true,

      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      acknowledgement_storage_mode: "DURABLE_FILE",

      reference_registry_dependency_required: true,
      reference_registry_mutation_performed: false,
      binding_activation_performed: false,
      binding_mutation_performed: false,

      secret_reference_values_excluded: true,
      secret_reference_names_excluded: true,
      environment_variable_names_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      request_content_excluded: true,
      raw_errors_excluded: true,

      database_driver_invoked: false,
      database_adapter_invoked: false,
      network_resolution_invoked: false,
      sql_execution_invoked: false,
      central_repository_modified: false,
      browser_storage_modified: false,

      p999_write_protection: true,
      diagnostic_only: true,
    },
  };
}

export function validatePipDatabaseBindingReadinessContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_DATABASE_BINDING_READINESS_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    readiness_schema_valid:
      safe.readiness_report_schema === PIP_DATABASE_BINDING_READINESS_REPORT_SCHEMA,
    acknowledgement_schema_valid:
      safe.acknowledgement_schema ===
      PIP_DATABASE_BINDING_HANDOFF_ACKNOWLEDGEMENT_SCHEMA,
    readiness_inspection_enabled: summary.readiness_inspection_enabled === true,
    readiness_inspection_read_only:
      summary.readiness_inspection_read_only === true,
    handoff_acknowledgement_enabled:
      summary.handoff_acknowledgement_enabled === true,
    acknowledgement_idempotent:
      summary.acknowledgement_idempotent === true,
    active_repository_durable:
      summary.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative:
      summary.durable_file_authoritative === true,
    storage_mode_durable:
      summary.acknowledgement_storage_mode === "DURABLE_FILE",
    dependency_required:
      summary.reference_registry_dependency_required === true,
    no_binding_activation:
      summary.binding_activation_performed === false &&
      summary.binding_mutation_performed === false,
    no_reference_registry_mutation:
      summary.reference_registry_mutation_performed === false,
    exclusion_flags:
      summary.secret_reference_values_excluded === true &&
      summary.secret_reference_names_excluded === true &&
      summary.environment_variable_names_excluded === true &&
      summary.connection_values_excluded === true &&
      summary.credential_values_excluded === true &&
      summary.request_content_excluded === true &&
      summary.raw_errors_excluded === true,
    invocations_disabled:
      summary.database_driver_invoked === false &&
      summary.database_adapter_invoked === false &&
      summary.network_resolution_invoked === false &&
      summary.sql_execution_invoked === false,
    mutation_guarded:
      summary.central_repository_modified === false &&
      summary.browser_storage_modified === false,
    p999_write_protection: summary.p999_write_protection === true,
    diagnostic_only: summary.diagnostic_only === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Database binding readiness contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipDatabaseBindingReadinessContractManifest({
            generatedAt: safe.generated_at,
          })
        : null,
  };
}

export function validatePipDatabaseBindingReadinessReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const blockers = normalizeBlockers(safe.readiness_blockers);

  const normalized = {
    schema: PIP_DATABASE_BINDING_READINESS_REPORT_SCHEMA,
    readiness_id: sanitizeText(safe.readiness_id),
    readiness_signature: normalizeHex(safe.readiness_signature),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),

    registry_status: sanitizeText(safe.registry_status).toUpperCase(),
    required_slot_count: toSafeInteger(safe.required_slot_count, 0),
    registered_slot_count: toSafeInteger(safe.registered_slot_count, 0),
    missing_slot_count: toSafeInteger(safe.missing_slot_count, 0),

    binding_ready: toSafeBoolean(safe.binding_ready, false),
    operator_handoff_required: toSafeBoolean(safe.operator_handoff_required, true),
    operator_handoff_state: sanitizeText(safe.operator_handoff_state).toUpperCase(),
    operator_handoff_acknowledged: toSafeBoolean(
      safe.operator_handoff_acknowledged,
      false
    ),
    acknowledgement_id: sanitizeText(safe.acknowledgement_id),
    acknowledged_at: normalizeIso(safe.acknowledged_at),
    acknowledged_role: sanitizeText(safe.acknowledged_role).toUpperCase() || null,

    readiness_blockers: blockers,
    blocker_count: toSafeInteger(safe.blocker_count, blockers.length),

    active_repository_kind: sanitizeText(safe.active_repository_kind).toUpperCase(),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, true),

    secret_reference_values_excluded: toSafeBoolean(
      safe.secret_reference_values_excluded,
      true
    ),
    secret_reference_names_excluded: toSafeBoolean(
      safe.secret_reference_names_excluded,
      true
    ),
    environment_variable_names_excluded: toSafeBoolean(
      safe.environment_variable_names_excluded,
      true
    ),
    connection_values_excluded: toSafeBoolean(safe.connection_values_excluded, true),
    credential_values_excluded: toSafeBoolean(safe.credential_values_excluded, true),

    database_driver_invoked: toSafeBoolean(safe.database_driver_invoked, false),
    database_adapter_invoked: toSafeBoolean(safe.database_adapter_invoked, false),
    network_resolution_invoked: toSafeBoolean(safe.network_resolution_invoked, false),
    sql_execution_invoked: toSafeBoolean(safe.sql_execution_invoked, false),

    binding_activation_performed: toSafeBoolean(safe.binding_activation_performed, false),
    binding_mutation_performed: toSafeBoolean(safe.binding_mutation_performed, false),
    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };

  const expectedState =
    normalized.operator_handoff_acknowledged === true
      ? PIP_DATABASE_BINDING_HANDOFF_STATES.ACKNOWLEDGED
      : PIP_DATABASE_BINDING_HANDOFF_STATES.PENDING;

  const checks = {
    schema_valid: normalized.schema === PIP_DATABASE_BINDING_READINESS_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    slot_counts_consistent:
      normalized.required_slot_count >= 0 &&
      normalized.registered_slot_count >= 0 &&
      normalized.missing_slot_count >= 0 &&
      normalized.required_slot_count ===
        normalized.registered_slot_count + normalized.missing_slot_count,
    blocker_count_consistent:
      normalized.blocker_count === normalized.readiness_blockers.length,
    blocking_logic:
      (normalized.binding_ready === true && normalized.blocker_count === 0) ||
      (normalized.binding_ready === false && normalized.blocker_count >= 1),
    handoff_state_valid:
      normalized.operator_handoff_state === expectedState &&
      Object.values(PIP_DATABASE_BINDING_HANDOFF_STATES).includes(
        normalized.operator_handoff_state
      ),
    acknowledgement_fields:
      (normalized.operator_handoff_acknowledged === true &&
        normalized.acknowledgement_id.length > 0 &&
        normalizeIso(normalized.acknowledged_at) !== null) ||
      (normalized.operator_handoff_acknowledged === false &&
        normalized.acknowledgement_id.length === 0 &&
        normalized.acknowledged_at === null),
    active_repository_durable:
      normalized.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative:
      normalized.durable_file_authoritative === true,
    exclusions_enabled:
      normalized.secret_reference_values_excluded === true &&
      normalized.secret_reference_names_excluded === true &&
      normalized.environment_variable_names_excluded === true &&
      normalized.connection_values_excluded === true &&
      normalized.credential_values_excluded === true,
    invocations_disabled:
      normalized.database_driver_invoked === false &&
      normalized.database_adapter_invoked === false &&
      normalized.network_resolution_invoked === false &&
      normalized.sql_execution_invoked === false,
    binding_not_activated:
      normalized.binding_activation_performed === false &&
      normalized.binding_mutation_performed === false,
    mutation_guarded:
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false,
    p999_write_protection: normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Database binding readiness report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipDatabaseBindingHandoffAcknowledgement(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};

  const normalized = {
    schema: PIP_DATABASE_BINDING_HANDOFF_ACKNOWLEDGEMENT_SCHEMA,
    acknowledgement_id: sanitizeText(safe.acknowledgement_id),
    acknowledgement_signature: normalizeHex(safe.acknowledgement_signature),
    acknowledged_at: normalizeIso(safe.acknowledged_at) ?? new Date().toISOString(),

    readiness_id: sanitizeText(safe.readiness_id),
    readiness_signature: normalizeHex(safe.readiness_signature),

    binding_ready: toSafeBoolean(safe.binding_ready, false),
    operator_handoff_state: sanitizeText(safe.operator_handoff_state).toUpperCase(),
    operator_handoff_acknowledged: toSafeBoolean(
      safe.operator_handoff_acknowledged,
      false
    ),

    changed: toSafeBoolean(safe.changed, false),
    result_code: sanitizeText(safe.result_code).toUpperCase(),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),

    active_repository_kind: sanitizeText(safe.active_repository_kind).toUpperCase(),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, true),

    secret_reference_values_excluded: toSafeBoolean(
      safe.secret_reference_values_excluded,
      true
    ),
    secret_reference_names_excluded: toSafeBoolean(
      safe.secret_reference_names_excluded,
      true
    ),
    environment_variable_names_excluded: toSafeBoolean(
      safe.environment_variable_names_excluded,
      true
    ),
    connection_values_excluded: toSafeBoolean(safe.connection_values_excluded, true),
    credential_values_excluded: toSafeBoolean(safe.credential_values_excluded, true),

    database_driver_invoked: toSafeBoolean(safe.database_driver_invoked, false),
    database_adapter_invoked: toSafeBoolean(safe.database_adapter_invoked, false),
    network_resolution_invoked: toSafeBoolean(safe.network_resolution_invoked, false),
    sql_execution_invoked: toSafeBoolean(safe.sql_execution_invoked, false),

    binding_activation_performed: toSafeBoolean(safe.binding_activation_performed, false),
    binding_mutation_performed: toSafeBoolean(safe.binding_mutation_performed, false),
    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
  };

  const checks = {
    schema_valid:
      normalized.schema ===
      PIP_DATABASE_BINDING_HANDOFF_ACKNOWLEDGEMENT_SCHEMA,
    acknowledged_at_valid: normalizeIso(normalized.acknowledged_at) !== null,
    state_acknowledged:
      normalized.operator_handoff_state ===
        PIP_DATABASE_BINDING_HANDOFF_STATES.ACKNOWLEDGED &&
      normalized.operator_handoff_acknowledged === true,
    result_code_valid:
      normalized.result_code === "UPDATED" ||
      normalized.result_code === "NO_CHANGE",
    changed_matches_result:
      (normalized.result_code === "UPDATED" && normalized.changed === true) ||
      (normalized.result_code === "NO_CHANGE" && normalized.changed === false),
    binding_ready: normalized.binding_ready === true,
    active_repository_durable:
      normalized.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative:
      normalized.durable_file_authoritative === true,
    exclusions_enabled:
      normalized.secret_reference_values_excluded === true &&
      normalized.secret_reference_names_excluded === true &&
      normalized.environment_variable_names_excluded === true &&
      normalized.connection_values_excluded === true &&
      normalized.credential_values_excluded === true,
    invocations_disabled:
      normalized.database_driver_invoked === false &&
      normalized.database_adapter_invoked === false &&
      normalized.network_resolution_invoked === false &&
      normalized.sql_execution_invoked === false,
    binding_not_activated:
      normalized.binding_activation_performed === false &&
      normalized.binding_mutation_performed === false,
    mutation_guarded:
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false,
    p999_write_protection: normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(
        `Database binding handoff acknowledgement check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function sanitizePipDatabaseBindingReadinessReport(report) {
  return validatePipDatabaseBindingReadinessReport(report).normalized;
}

export function sanitizePipDatabaseBindingHandoffAcknowledgement(receipt) {
  return validatePipDatabaseBindingHandoffAcknowledgement(receipt).normalized;
}
