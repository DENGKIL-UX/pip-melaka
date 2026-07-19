export const PIP_SECRET_PROVIDER_ADAPTER_CONTRACT_SCHEMA =
  "pip.deployment-secret-provider-adapter.contract.v1";
export const PIP_SECRET_PROVIDER_ADAPTER_REPORT_SCHEMA =
  "pip.deployment-secret-provider-adapter.report.v1";
export const PIP_SECRET_PROVIDER_ADAPTER_ACCEPTANCE_SCHEMA =
  "pip.deployment-secret-provider-adapter.acceptance.v1";

export const PIP_SECRET_PROVIDER_ADAPTER_KINDS = Object.freeze({
  UNSPECIFIED: "UNSPECIFIED",
  REFERENCE_ONLY: "REFERENCE_ONLY",
  ENVIRONMENT_REFERENCE: "ENVIRONMENT_REFERENCE",
  MANAGED_SECRET_STORE: "MANAGED_SECRET_STORE",
});

export const PIP_SECRET_PROVIDER_ADAPTER_STATUSES = Object.freeze({
  REGISTERED_UNCONFIGURED: "REGISTERED_UNCONFIGURED",
  REFERENCE_ONLY_READY: "REFERENCE_ONLY_READY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_SECRET_PROVIDER_ADAPTER_CAPABILITIES = Object.freeze({
  CONTRACT_INSPECTION: "CONTRACT_INSPECTION",
  LOGICAL_SLOT_VALIDATION: "LOGICAL_SLOT_VALIDATION",
  OPAQUE_REFERENCE_TOKEN_VALIDATION:
    "OPAQUE_REFERENCE_TOKEN_VALIDATION",
  SANITIZED_BINDING_PREVIEW: "SANITIZED_BINDING_PREVIEW",
  ACCEPTANCE_ACKNOWLEDGEMENT: "ACCEPTANCE_ACKNOWLEDGEMENT",
  EVIDENCE_EXPORT: "EVIDENCE_EXPORT",

  SECRET_VALUE_READ: "SECRET_VALUE_READ",
  SECRET_VALUE_WRITE: "SECRET_VALUE_WRITE",
  SECRET_VALUE_RESOLUTION: "SECRET_VALUE_RESOLUTION",
  SECRET_ROTATION: "SECRET_ROTATION",
  ENVIRONMENT_VALUE_READ: "ENVIRONMENT_VALUE_READ",
  CREDENTIAL_MATERIALIZATION: "CREDENTIAL_MATERIALIZATION",
  CONNECTION_STRING_CONSTRUCTION:
    "CONNECTION_STRING_CONSTRUCTION",
  DATABASE_CONNECTION: "DATABASE_CONNECTION",
  SQL_EXECUTION: "SQL_EXECUTION",
  DDL_EXECUTION: "DDL_EXECUTION",
  BINDING_ACTIVATION: "BINDING_ACTIVATION",
  REPOSITORY_CUTOVER: "REPOSITORY_CUTOVER",
});

export const PIP_SECRET_PROVIDER_REFERENCE_STATES = Object.freeze({
  VALID: "VALID",
  MISSING: "MISSING",
  MALFORMED_TOKEN: "MALFORMED_TOKEN",
});

export const PIP_SECRET_PROVIDER_BLOCKER_CODES = Object.freeze({
  MISSING_REQUIRED_REFERENCE_SLOT: "MISSING_REQUIRED_REFERENCE_SLOT",
  MALFORMED_OPAQUE_REFERENCE_TOKEN: "MALFORMED_OPAQUE_REFERENCE_TOKEN",
  P999_READ_ONLY_CONTEXT: "P999_READ_ONLY_CONTEXT",
  AUTHORIZATION_REQUIRED: "AUTHORIZATION_REQUIRED",
  CSRF_REQUIRED: "CSRF_REQUIRED",
  UNSAFE_RUNTIME_GUARD: "UNSAFE_RUNTIME_GUARD",
});

const PROHIBITED_KEY_PATTERN =
  /secret_name|secret_value|environment_variable|environment_value|password|username|hostname|host|port|database|connection_string|connectionstring|credential|token|csrf|cookie|session_id|filesystem_path|request_body|raw_error/i;

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

function toSafeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function toSafeBoolean(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  return fallback;
}

function sanitizeAuditMetadata(value) {
  const safe = isPlainObject(value) ? value : {};
  const output = {};

  Object.entries(safe).forEach(([key, entry]) => {
    const normalizedKey = sanitizeText(key).toLowerCase();
    if (!normalizedKey || PROHIBITED_KEY_PATTERN.test(normalizedKey)) {
      return;
    }

    if (typeof entry === "string") {
      output[normalizedKey] = sanitizeText(entry).slice(0, 180);
      return;
    }

    if (typeof entry === "number" || typeof entry === "boolean") {
      output[normalizedKey] = entry;
    }
  });

  return output;
}

function buildCapabilityFlags() {
  return {
    contract_inspection_enabled: true,
    logical_slot_validation_enabled: true,
    opaque_reference_token_validation_enabled: true,
    sanitized_binding_preview_enabled: true,
    acceptance_acknowledgement_enabled: true,
    evidence_export_enabled: true,

    secret_value_read_enabled: false,
    secret_value_write_enabled: false,
    secret_value_resolution_enabled: false,
    secret_rotation_enabled: false,
    environment_value_read_enabled: false,
    credential_materialization_enabled: false,
    connection_string_construction_enabled: false,
    database_connection_enabled: false,
    sql_execution_enabled: false,
    ddl_execution_enabled: false,
    binding_activation_enabled: false,
    repository_cutover_enabled: false,
  };
}

export function buildPipSecretProviderAdapterContractManifest(input) {
  const safe = isPlainObject(input) ? input : {};
  const { generatedAt } = safe;

  return {
    schema: PIP_SECRET_PROVIDER_ADAPTER_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_SECRET_PROVIDER_ADAPTER_REPORT_SCHEMA,
    acceptance_schema: PIP_SECRET_PROVIDER_ADAPTER_ACCEPTANCE_SCHEMA,
    adapter_kinds: { ...PIP_SECRET_PROVIDER_ADAPTER_KINDS },
    adapter_statuses: { ...PIP_SECRET_PROVIDER_ADAPTER_STATUSES },
    adapter_capabilities: { ...PIP_SECRET_PROVIDER_ADAPTER_CAPABILITIES },
    reference_states: { ...PIP_SECRET_PROVIDER_REFERENCE_STATES },
    blocker_codes: { ...PIP_SECRET_PROVIDER_BLOCKER_CODES },
    summary: {
      adapter_contract_enabled: true,
      adapter_registered: true,
      selected_adapter_kind:
        PIP_SECRET_PROVIDER_ADAPTER_KINDS.REFERENCE_ONLY,
      adapter_status:
        PIP_SECRET_PROVIDER_ADAPTER_STATUSES.REFERENCE_ONLY_READY,
      adapter_configured: false,
      provider_selection_mutation_enabled: false,

      manual_inspection_only: true,
      manual_acknowledgement_only: true,
      process_environment_inspection_enabled: false,

      ...buildCapabilityFlags(),

      database_driver_invoked: false,
      database_adapter_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      binding_activation_performed: false,
      binding_mutation_performed: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      shadow_write_enabled: false,
      dual_write_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_secret_rotation_enabled: false,
      automatic_recovery_enabled: false,

      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,
      p999_write_protection: true,

      secret_reference_values_excluded: true,
      secret_reference_names_excluded: true,
      environment_variable_names_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      infrastructure_values_excluded: true,
      user_identity_values_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      browser_storage_content_excluded: true,
      raw_errors_excluded: true,
    },
  };
}

export function buildPipSecretProviderAdapterReport(input) {
  const safe = isPlainObject(input) ? input : {};
  const {
    generatedAt,
    status,
    requiredSlotCount,
    validSlotCount,
    missingSlotCount,
    malformedTokenCount,
    readinessResult,
    blockerCodes,
    auditMetadata,
  } = safe;

  const safeBlockers = (Array.isArray(blockerCodes) ? blockerCodes : [])
    .map((entry) => sanitizeText(entry).toUpperCase())
    .filter(Boolean)
    .filter((entry, index, array) => array.indexOf(entry) === index);

  return {
    schema: PIP_SECRET_PROVIDER_ADAPTER_REPORT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    adapter_kind: PIP_SECRET_PROVIDER_ADAPTER_KINDS.REFERENCE_ONLY,
    adapter_status:
      Object.values(PIP_SECRET_PROVIDER_ADAPTER_STATUSES).includes(
        sanitizeText(status).toUpperCase()
      )
        ? sanitizeText(status).toUpperCase()
        : PIP_SECRET_PROVIDER_ADAPTER_STATUSES.REFERENCE_ONLY_READY,
    adapter_configured: false,
    capabilities: buildCapabilityFlags(),
    required_logical_slot_count: toSafeInteger(requiredSlotCount, 0),
    valid_logical_slot_count: toSafeInteger(validSlotCount, 0),
    missing_logical_slot_count: toSafeInteger(missingSlotCount, 0),
    malformed_opaque_token_count: toSafeInteger(malformedTokenCount, 0),
    readiness_result: toSafeBoolean(readinessResult, true),
    blocker_codes: safeBlockers,

    safety_flags: {
      p999_write_protection: true,
      database_driver_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      binding_activation_performed: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      secret_value_read_enabled: false,
      environment_value_read_enabled: false,
      secret_reference_values_excluded: true,
      secret_reference_names_excluded: true,
      environment_variable_names_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      infrastructure_values_excluded: true,
      user_identity_values_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      browser_storage_content_excluded: true,
      raw_errors_excluded: true,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,
    },
    audit_receipt_metadata: sanitizeAuditMetadata(auditMetadata),
  };
}

export function buildPipSecretProviderAdapterAcceptanceReceipt(input) {
  const safe = isPlainObject(input) ? input : {};
  const {
    generatedAt,
    report,
    acknowledgementChanged,
    resultCode,
    auditMetadata,
  } = safe;

  const normalizedReport = sanitizePipSecretProviderAdapterReport(report);

  return {
    schema: PIP_SECRET_PROVIDER_ADAPTER_ACCEPTANCE_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    adapter_kind: normalizedReport.adapter_kind,
    adapter_status: normalizedReport.adapter_status,
    acknowledgement_changed: toSafeBoolean(acknowledgementChanged, false),
    result_code: sanitizeText(resultCode).toUpperCase() || "NO_CHANGE",
    readiness_result: normalizedReport.readiness_result === true,
    blocker_codes: normalizedReport.blocker_codes,
    safety_flags: normalizedReport.safety_flags,
    audit_receipt_metadata: sanitizeAuditMetadata(auditMetadata),
  };
}

export function sanitizePipSecretProviderAdapterReport(report) {
  const built = buildPipSecretProviderAdapterReport(report);
  return {
    ...built,
    audit_receipt_metadata: sanitizeAuditMetadata(
      built.audit_receipt_metadata
    ),
  };
}

export function sanitizePipSecretProviderAdapterAcceptanceReceipt(
  receipt
) {
  const built = buildPipSecretProviderAdapterAcceptanceReceipt(receipt);
  return {
    ...built,
    audit_receipt_metadata: sanitizeAuditMetadata(
      built.audit_receipt_metadata
    ),
  };
}

export function validatePipSecretProviderAdapterContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_SECRET_PROVIDER_ADAPTER_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid:
      safe.report_schema === PIP_SECRET_PROVIDER_ADAPTER_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema ===
      PIP_SECRET_PROVIDER_ADAPTER_ACCEPTANCE_SCHEMA,
    adapter_enabled: summary.adapter_contract_enabled === true,
    adapter_registered: summary.adapter_registered === true,
    reference_only_selected:
      summary.selected_adapter_kind ===
      PIP_SECRET_PROVIDER_ADAPTER_KINDS.REFERENCE_ONLY,
    reference_only_ready:
      summary.adapter_status ===
      PIP_SECRET_PROVIDER_ADAPTER_STATUSES.REFERENCE_ONLY_READY,
    adapter_not_configured: summary.adapter_configured === false,
    provider_selection_read_only:
      summary.provider_selection_mutation_enabled === false,
    manual_only:
      summary.manual_inspection_only === true &&
      summary.manual_acknowledgement_only === true,
    disabled_sensitive_ops:
      summary.secret_value_read_enabled === false &&
      summary.secret_value_write_enabled === false &&
      summary.secret_value_resolution_enabled === false &&
      summary.secret_rotation_enabled === false &&
      summary.environment_value_read_enabled === false &&
      summary.process_environment_inspection_enabled === false &&
      summary.credential_materialization_enabled === false &&
      summary.connection_string_construction_enabled === false,
    disabled_runtime_ops:
      summary.database_driver_invoked === false &&
      summary.database_adapter_invoked === false &&
      summary.network_resolution_invoked === false &&
      summary.outbound_network_invoked === false &&
      summary.sql_execution_invoked === false &&
      summary.ddl_execution_invoked === false &&
      summary.binding_activation_performed === false &&
      summary.binding_mutation_performed === false,
    no_cutover:
      summary.repository_cutover_enabled === false &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false &&
      summary.shadow_write_enabled === false &&
      summary.dual_write_enabled === false,
    no_automation:
      summary.automatic_synchronisation_enabled === false &&
      summary.automatic_secret_rotation_enabled === false &&
      summary.automatic_recovery_enabled === false,
    durability_invariants:
      summary.active_repository_kind === "DURABLE_FILE" &&
      summary.durable_file_authoritative === true &&
      summary.legacy_browser_storage_authoritative === true,
    p999_protected: summary.p999_write_protection === true,
    exclusions_enabled:
      summary.secret_reference_values_excluded === true &&
      summary.secret_reference_names_excluded === true &&
      summary.environment_variable_names_excluded === true &&
      summary.environment_values_excluded === true &&
      summary.connection_values_excluded === true &&
      summary.credential_values_excluded === true &&
      summary.infrastructure_values_excluded === true &&
      summary.user_identity_values_excluded === true &&
      summary.voter_data_excluded === true &&
      summary.scenario_content_excluded === true &&
      summary.browser_storage_content_excluded === true &&
      summary.raw_errors_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Secret provider adapter contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipSecretProviderAdapterContractManifest({
            generatedAt: safe.generated_at,
          })
        : null,
  };
}

export function validatePipSecretProviderAdapterReport(report) {
  const safe = sanitizePipSecretProviderAdapterReport(report);
  const safetyFlags = isPlainObject(safe.safety_flags)
    ? safe.safety_flags
    : {};

  const checks = {
    schema_valid: safe.schema === PIP_SECRET_PROVIDER_ADAPTER_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    adapter_kind_reference_only:
      safe.adapter_kind === PIP_SECRET_PROVIDER_ADAPTER_KINDS.REFERENCE_ONLY,
    adapter_status_valid: Object.values(
      PIP_SECRET_PROVIDER_ADAPTER_STATUSES
    ).includes(safe.adapter_status),
    adapter_not_configured: safe.adapter_configured === false,
    slot_counts_valid:
      safe.required_logical_slot_count >= 0 &&
      safe.valid_logical_slot_count >= 0 &&
      safe.missing_logical_slot_count >= 0 &&
      safe.required_logical_slot_count ===
        safe.valid_logical_slot_count + safe.missing_logical_slot_count,
    malformed_count_valid: safe.malformed_opaque_token_count >= 0,
    readiness_boolean: typeof safe.readiness_result === "boolean",
    blocker_codes_valid: Array.isArray(safe.blocker_codes),
    prohibited_fields_absent:
      Object.keys(safe.audit_receipt_metadata ?? {}).every(
        (key) => !PROHIBITED_KEY_PATTERN.test(String(key))
      ),
    safety_false_ops:
      safetyFlags.secret_value_read_enabled === false &&
      safetyFlags.environment_value_read_enabled === false &&
      safetyFlags.database_driver_invoked === false &&
      safetyFlags.network_resolution_invoked === false &&
      safetyFlags.outbound_network_invoked === false &&
      safetyFlags.sql_execution_invoked === false &&
      safetyFlags.binding_activation_performed === false &&
      safetyFlags.repository_cutover_enabled === false &&
      safetyFlags.operational_read_cutover_enabled === false &&
      safetyFlags.operational_write_cutover_enabled === false,
    p999_protected: safetyFlags.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Secret provider adapter report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}

export function validatePipSecretProviderAdapterAcceptanceReceipt(receipt) {
  const safe = sanitizePipSecretProviderAdapterAcceptanceReceipt(receipt);

  const checks = {
    schema_valid:
      safe.schema === PIP_SECRET_PROVIDER_ADAPTER_ACCEPTANCE_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    adapter_kind_reference_only:
      safe.adapter_kind === PIP_SECRET_PROVIDER_ADAPTER_KINDS.REFERENCE_ONLY,
    adapter_status_valid: Object.values(
      PIP_SECRET_PROVIDER_ADAPTER_STATUSES
    ).includes(safe.adapter_status),
    result_code_present: sanitizeText(safe.result_code).length > 0,
    blocker_codes_valid: Array.isArray(safe.blocker_codes),
    safety_flags_valid: isPlainObject(safe.safety_flags),
    prohibited_fields_absent:
      Object.keys(safe.audit_receipt_metadata ?? {}).every(
        (key) => !PROHIBITED_KEY_PATTERN.test(String(key))
      ),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Secret provider adapter acceptance check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}
