export const PIP_DATABASE_PROVIDER_CONTRACT_SCHEMA =
  "pip.database-provider.contract.v1";
export const PIP_DATABASE_CONFIGURATION_ENVELOPE_SCHEMA =
  "pip.database-provider.configuration-envelope.v1";
export const PIP_DATABASE_PROVIDER_VERIFICATION_SCHEMA =
  "pip.database-provider.verification-report.v1";

export const PIP_DATABASE_PROVIDER_KINDS = Object.freeze({
  POSTGRESQL: "POSTGRESQL",
});

export const PIP_DATABASE_PROVIDER_VENDORS = Object.freeze({
  UNSPECIFIED: "UNSPECIFIED",
});

export const PIP_DATABASE_DEPLOYMENT_MODELS = Object.freeze({
  MANAGED_SERVICE: "MANAGED_SERVICE",
});

export const PIP_DATABASE_PROVIDER_STATUSES = Object.freeze({
  SELECTED_UNCONFIGURED: "SELECTED_UNCONFIGURED",
  CONFIGURATION_BLOCKED: "CONFIGURATION_BLOCKED",
  VERIFIED_UNCONFIGURED: "VERIFIED_UNCONFIGURED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  FAILED: "FAILED",
});

export const PIP_DATABASE_CONFIGURATION_STATES = Object.freeze({
  UNCONFIGURED: "UNCONFIGURED",
  REFERENCES_MISSING: "REFERENCES_MISSING",
  STRUCTURALLY_VALID: "STRUCTURALLY_VALID",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

export const PIP_DATABASE_CONNECTION_STATES = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  NOT_ATTEMPTED: "NOT_ATTEMPTED",
  BLOCKED: "BLOCKED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

export const PIP_DATABASE_CONFIGURATION_FIELD_KEYS = Object.freeze({
  HOST_REFERENCE: "HOST_REFERENCE",
  PORT_REFERENCE: "PORT_REFERENCE",
  DATABASE_NAME_REFERENCE: "DATABASE_NAME_REFERENCE",
  USERNAME_REFERENCE: "USERNAME_REFERENCE",
  PASSWORD_REFERENCE: "PASSWORD_REFERENCE",
  TLS_MODE_REFERENCE: "TLS_MODE_REFERENCE",
  TLS_CA_REFERENCE: "TLS_CA_REFERENCE",
  SECRET_MANAGER_REFERENCE: "SECRET_MANAGER_REFERENCE",
});

export const PIP_DATABASE_PROVIDER_BLOCKER_CODES = Object.freeze({
  HOST_REFERENCE_MISSING: "HOST_REFERENCE_MISSING",
  PORT_REFERENCE_MISSING: "PORT_REFERENCE_MISSING",
  DATABASE_NAME_REFERENCE_MISSING: "DATABASE_NAME_REFERENCE_MISSING",
  USERNAME_REFERENCE_MISSING: "USERNAME_REFERENCE_MISSING",
  PASSWORD_REFERENCE_MISSING: "PASSWORD_REFERENCE_MISSING",
  TLS_MODE_REFERENCE_MISSING: "TLS_MODE_REFERENCE_MISSING",
  TLS_CA_REFERENCE_MISSING: "TLS_CA_REFERENCE_MISSING",
  SECRET_MANAGER_REFERENCE_MISSING: "SECRET_MANAGER_REFERENCE_MISSING",
  DATABASE_DRIVER_NOT_INSTALLED: "DATABASE_DRIVER_NOT_INSTALLED",
  ORM_NOT_INSTALLED: "ORM_NOT_INSTALLED",
  CONNECTION_POOL_DISABLED: "CONNECTION_POOL_DISABLED",
  CONNECTION_PROBE_DISABLED: "CONNECTION_PROBE_DISABLED",
  PRODUCTION_DATABASE_NOT_CONFIGURED: "PRODUCTION_DATABASE_NOT_CONFIGURED",
  PRODUCTION_CONNECTION_NOT_ATTEMPTED: "PRODUCTION_CONNECTION_NOT_ATTEMPTED",
  PRODUCTION_READ_DISABLED: "PRODUCTION_READ_DISABLED",
  PRODUCTION_WRITE_DISABLED: "PRODUCTION_WRITE_DISABLED",
  PRODUCTION_APPEND_DISABLED: "PRODUCTION_APPEND_DISABLED",
  SCHEMA_CREATION_DISABLED: "SCHEMA_CREATION_DISABLED",
  DATA_MIGRATION_DISABLED: "DATA_MIGRATION_DISABLED",
  SHADOW_WRITE_DISABLED: "SHADOW_WRITE_DISABLED",
  DUAL_WRITE_DISABLED: "DUAL_WRITE_DISABLED",
  READ_CUTOVER_DISABLED: "READ_CUTOVER_DISABLED",
  WRITE_CUTOVER_DISABLED: "WRITE_CUTOVER_DISABLED",
  P999_WRITE_PROTECTION_ENABLED: "P999_WRITE_PROTECTION_ENABLED",
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

function buildFieldEnvelopeItem(fieldKey, entry) {
  const safeEntry = isPlainObject(entry) ? entry : {};
  return {
    field_key: sanitizeText(fieldKey).toUpperCase(),
    required: true,
    reference_present: toSafeBoolean(safeEntry.reference_present, false),
    raw_value_loaded: toSafeBoolean(safeEntry.raw_value_loaded, false),
    raw_value_excluded: toSafeBoolean(safeEntry.raw_value_excluded, true),
    status: sanitizeText(safeEntry.status || "MISSING").toUpperCase() || "MISSING",
  };
}

function normalizeFields(fields) {
  const expectedKeys = Object.values(PIP_DATABASE_CONFIGURATION_FIELD_KEYS);
  const safeFields = Array.isArray(fields) ? fields : [];
  const byKey = new Map();

  safeFields
    .map((entry) => (isPlainObject(entry) ? entry : {}))
    .forEach((entry) => {
      const key = sanitizeText(entry.field_key).toUpperCase();
      if (expectedKeys.includes(key) && !byKey.has(key)) {
        byKey.set(key, buildFieldEnvelopeItem(key, entry));
      }
    });

  return expectedKeys.map((fieldKey) => {
    if (byKey.has(fieldKey)) {
      return byKey.get(fieldKey);
    }
    return buildFieldEnvelopeItem(fieldKey, {
      reference_present: false,
      raw_value_loaded: false,
      raw_value_excluded: true,
      status: "MISSING",
    });
  });
}

export function buildPipDatabaseProviderContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_DATABASE_PROVIDER_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    configuration_envelope_schema: PIP_DATABASE_CONFIGURATION_ENVELOPE_SCHEMA,
    verification_schema: PIP_DATABASE_PROVIDER_VERIFICATION_SCHEMA,
    provider_kinds: { ...PIP_DATABASE_PROVIDER_KINDS },
    provider_vendors: { ...PIP_DATABASE_PROVIDER_VENDORS },
    deployment_models: { ...PIP_DATABASE_DEPLOYMENT_MODELS },
    provider_statuses: { ...PIP_DATABASE_PROVIDER_STATUSES },
    configuration_states: { ...PIP_DATABASE_CONFIGURATION_STATES },
    connection_states: { ...PIP_DATABASE_CONNECTION_STATES },
    configuration_field_keys: { ...PIP_DATABASE_CONFIGURATION_FIELD_KEYS },
    blocker_codes: { ...PIP_DATABASE_PROVIDER_BLOCKER_CODES },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,

      provider_selection_enabled: true,
      provider_selection_read_only: true,
      provider_selection_mutation_enabled: false,

      selected_provider_kind: PIP_DATABASE_PROVIDER_KINDS.POSTGRESQL,
      selected_provider_vendor: PIP_DATABASE_PROVIDER_VENDORS.UNSPECIFIED,
      selected_deployment_model: PIP_DATABASE_DEPLOYMENT_MODELS.MANAGED_SERVICE,
      selected_provider_status: PIP_DATABASE_PROVIDER_STATUSES.SELECTED_UNCONFIGURED,

      configuration_envelope_enabled: true,
      configuration_envelope_read_only: true,
      configuration_state: PIP_DATABASE_CONFIGURATION_STATES.UNCONFIGURED,
      configuration_values_loaded: false,
      configuration_complete: false,

      environment_reference_inspection_enabled: false,
      secret_reference_registration_enabled: false,
      secret_value_loading_enabled: false,
      credential_input_enabled: false,

      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,

      production_database_configured: false,
      production_database_connection_attempted: false,
      production_database_read_enabled: false,
      production_database_write_enabled: false,
      production_database_append_enabled: false,

      database_driver_installed: false,
      orm_installed: false,
      migration_framework_installed: false,
      connection_pool_enabled: false,
      connection_probe_enabled: false,

      database_operation_enabled: false,
      provider_network_operation_enabled: false,
      dns_resolution_enabled: false,
      sql_execution_enabled: false,
      ddl_execution_enabled: false,

      schema_creation_enabled: false,
      data_migration_enabled: false,
      shadow_write_enabled: false,
      dual_write_enabled: false,

      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,

      automatic_synchronisation_enabled: false,
      automatic_schema_migration_enabled: false,
      automatic_data_migration_enabled: false,
      automatic_failover_enabled: false,
      automatic_recovery_enabled: false,

      provider_inspection_manual_only: true,
      provider_verification_manual_only: true,
      provider_result_persistence_enabled: false,
      audit_event_append_enabled: false,
      polling_enabled: false,
      recurring_timer_enabled: false,
      retry_enabled: false,

      p999_write_protection: true,
      diagnostic_only: true,

      connection_values_redacted: true,
      credential_values_redacted: true,
      environment_values_redacted: true,
      infrastructure_values_redacted: true,
      user_identity_values_redacted: true,
      secret_reference_values_redacted: true,

      request_content_excluded: true,
      raw_errors_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      repository_content_excluded: true,
      browser_storage_content_excluded: true,
      environment_variable_names_excluded: true,
      connection_string_excluded: true,
    },
  };
}

export function validatePipDatabaseProviderContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_DATABASE_PROVIDER_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    configuration_envelope_schema_valid:
      safe.configuration_envelope_schema ===
      PIP_DATABASE_CONFIGURATION_ENVELOPE_SCHEMA,
    verification_schema_valid:
      safe.verification_schema === PIP_DATABASE_PROVIDER_VERIFICATION_SCHEMA,
    selected_provider_kind:
      summary.selected_provider_kind === PIP_DATABASE_PROVIDER_KINDS.POSTGRESQL,
    selected_provider_vendor:
      summary.selected_provider_vendor === PIP_DATABASE_PROVIDER_VENDORS.UNSPECIFIED,
    selected_deployment_model:
      summary.selected_deployment_model ===
      PIP_DATABASE_DEPLOYMENT_MODELS.MANAGED_SERVICE,
    provider_selection_read_only: summary.provider_selection_read_only === true,
    provider_mutation_disabled:
      summary.provider_selection_mutation_enabled === false,
    configuration_unconfigured:
      summary.configuration_state ===
      PIP_DATABASE_CONFIGURATION_STATES.UNCONFIGURED,
    configuration_values_loaded:
      summary.configuration_values_loaded === false,
    configuration_complete: summary.configuration_complete === false,
    environment_reference_inspection_disabled:
      summary.environment_reference_inspection_enabled === false,
    secret_reference_registration_disabled:
      summary.secret_reference_registration_enabled === false,
    secret_value_loading_disabled:
      summary.secret_value_loading_enabled === false,
    credential_input_disabled: summary.credential_input_enabled === false,
    active_repository_durable:
      summary.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative:
      summary.durable_file_authoritative === true,
    legacy_browser_storage_authoritative:
      summary.legacy_browser_storage_authoritative === true,
    production_database_configured:
      summary.production_database_configured === false,
    production_database_connection_attempted:
      summary.production_database_connection_attempted === false,
    production_database_read_enabled:
      summary.production_database_read_enabled === false,
    production_database_write_enabled:
      summary.production_database_write_enabled === false,
    production_database_append_enabled:
      summary.production_database_append_enabled === false,
    database_driver_installed:
      summary.database_driver_installed === false,
    orm_installed: summary.orm_installed === false,
    migration_framework_installed:
      summary.migration_framework_installed === false,
    connection_pool_enabled: summary.connection_pool_enabled === false,
    connection_probe_enabled: summary.connection_probe_enabled === false,
    database_operation_enabled:
      summary.database_operation_enabled === false,
    provider_network_operation_enabled:
      summary.provider_network_operation_enabled === false,
    dns_resolution_enabled: summary.dns_resolution_enabled === false,
    sql_execution_enabled: summary.sql_execution_enabled === false,
    ddl_execution_enabled: summary.ddl_execution_enabled === false,
    schema_creation_enabled: summary.schema_creation_enabled === false,
    data_migration_enabled: summary.data_migration_enabled === false,
    shadow_write_enabled: summary.shadow_write_enabled === false,
    dual_write_enabled: summary.dual_write_enabled === false,
    repository_cutover_enabled:
      summary.repository_cutover_enabled === false,
    operational_read_cutover_enabled:
      summary.operational_read_cutover_enabled === false,
    operational_write_cutover_enabled:
      summary.operational_write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      summary.automatic_synchronisation_enabled === false,
    automatic_schema_migration_enabled:
      summary.automatic_schema_migration_enabled === false,
    automatic_data_migration_enabled:
      summary.automatic_data_migration_enabled === false,
    automatic_failover_enabled:
      summary.automatic_failover_enabled === false,
    automatic_recovery_enabled:
      summary.automatic_recovery_enabled === false,
    provider_inspection_manual_only:
      summary.provider_inspection_manual_only === true,
    provider_verification_manual_only:
      summary.provider_verification_manual_only === true,
    provider_result_persistence_enabled:
      summary.provider_result_persistence_enabled === false,
    audit_event_append_enabled:
      summary.audit_event_append_enabled === false,
    polling_enabled: summary.polling_enabled === false,
    recurring_timer_enabled: summary.recurring_timer_enabled === false,
    retry_enabled: summary.retry_enabled === false,
    p999_write_protection: summary.p999_write_protection === true,
    diagnostic_only: summary.diagnostic_only === true,
    connection_values_redacted:
      summary.connection_values_redacted === true,
    credential_values_redacted:
      summary.credential_values_redacted === true,
    environment_values_redacted:
      summary.environment_values_redacted === true,
    infrastructure_values_redacted:
      summary.infrastructure_values_redacted === true,
    user_identity_values_redacted:
      summary.user_identity_values_redacted === true,
    secret_reference_values_redacted:
      summary.secret_reference_values_redacted === true,
    request_content_excluded: summary.request_content_excluded === true,
    raw_errors_excluded: summary.raw_errors_excluded === true,
    voter_data_excluded: summary.voter_data_excluded === true,
    scenario_content_excluded: summary.scenario_content_excluded === true,
    repository_content_excluded: summary.repository_content_excluded === true,
    browser_storage_content_excluded:
      summary.browser_storage_content_excluded === true,
    environment_variable_names_excluded:
      summary.environment_variable_names_excluded === true,
    connection_string_excluded:
      summary.connection_string_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Database provider contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipDatabaseProviderContractManifest({ generatedAt: safe.generated_at })
        : null,
  };
}

export function validatePipDatabaseConfigurationEnvelope(envelope) {
  const safe = isPlainObject(envelope) ? envelope : {};
  const fields = normalizeFields(safe.fields);
  const requiredFieldCount = Object.values(PIP_DATABASE_CONFIGURATION_FIELD_KEYS).length;
  const configuredFieldCount = fields.filter((entry) => entry.reference_present === true).length;
  const missingFieldCount = fields.filter((entry) => entry.reference_present !== true).length;

  const normalized = {
    schema: PIP_DATABASE_CONFIGURATION_ENVELOPE_SCHEMA,
    envelope_id: sanitizeText(safe.envelope_id),
    envelope_signature: sanitizeText(safe.envelope_signature),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),

    provider_kind: sanitizeText(safe.provider_kind).toUpperCase(),
    provider_vendor: sanitizeText(safe.provider_vendor).toUpperCase(),
    deployment_model: sanitizeText(safe.deployment_model).toUpperCase(),

    provider_status: sanitizeText(safe.provider_status).toUpperCase(),
    configuration_state: sanitizeText(safe.configuration_state).toUpperCase(),
    connection_state: sanitizeText(safe.connection_state).toUpperCase(),

    required_field_count: toSafeInteger(safe.required_field_count, requiredFieldCount),
    configured_field_count: toSafeInteger(safe.configured_field_count, configuredFieldCount),
    missing_field_count: toSafeInteger(safe.missing_field_count, missingFieldCount),
    configuration_complete: toSafeBoolean(safe.configuration_complete, false),

    fields,

    active_repository_kind: sanitizeText(safe.active_repository_kind).toUpperCase(),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, true),
    legacy_browser_storage_authoritative: toSafeBoolean(
      safe.legacy_browser_storage_authoritative,
      true
    ),

    production_database_configured: toSafeBoolean(safe.production_database_configured, false),
    production_connection_attempted: toSafeBoolean(safe.production_connection_attempted, false),
    production_read_enabled: toSafeBoolean(safe.production_read_enabled, false),
    production_write_enabled: toSafeBoolean(safe.production_write_enabled, false),
    production_append_enabled: toSafeBoolean(safe.production_append_enabled, false),

    database_driver_installed: toSafeBoolean(safe.database_driver_installed, false),
    orm_installed: toSafeBoolean(safe.orm_installed, false),
    migration_framework_installed: toSafeBoolean(safe.migration_framework_installed, false),
    connection_pool_enabled: toSafeBoolean(safe.connection_pool_enabled, false),
    connection_probe_enabled: toSafeBoolean(safe.connection_probe_enabled, false),

    schema_creation_enabled: toSafeBoolean(safe.schema_creation_enabled, false),
    data_migration_enabled: toSafeBoolean(safe.data_migration_enabled, false),
    shadow_write_enabled: toSafeBoolean(safe.shadow_write_enabled, false),
    dual_write_enabled: toSafeBoolean(safe.dual_write_enabled, false),
    read_cutover_enabled: toSafeBoolean(safe.read_cutover_enabled, false),
    write_cutover_enabled: toSafeBoolean(safe.write_cutover_enabled, false),

    provider_network_operation_invoked: toSafeBoolean(
      safe.provider_network_operation_invoked,
      false
    ),
    dns_resolution_invoked: toSafeBoolean(safe.dns_resolution_invoked, false),
    database_adapter_invoked: toSafeBoolean(safe.database_adapter_invoked, false),
    database_driver_invoked: toSafeBoolean(safe.database_driver_invoked, false),
    sql_execution_invoked: toSafeBoolean(safe.sql_execution_invoked, false),

    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    audit_event_appended: toSafeBoolean(safe.audit_event_appended, false),

    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };

  const stageChecks = {
    schema_valid:
      normalized.schema === PIP_DATABASE_CONFIGURATION_ENVELOPE_SCHEMA,
    provider_kind:
      normalized.provider_kind === PIP_DATABASE_PROVIDER_KINDS.POSTGRESQL,
    provider_vendor:
      normalized.provider_vendor === PIP_DATABASE_PROVIDER_VENDORS.UNSPECIFIED,
    deployment_model:
      normalized.deployment_model === PIP_DATABASE_DEPLOYMENT_MODELS.MANAGED_SERVICE,
    provider_status:
      normalized.provider_status ===
      PIP_DATABASE_PROVIDER_STATUSES.SELECTED_UNCONFIGURED,
    configuration_state:
      normalized.configuration_state ===
      PIP_DATABASE_CONFIGURATION_STATES.UNCONFIGURED,
    connection_state:
      normalized.connection_state ===
      PIP_DATABASE_CONNECTION_STATES.NOT_ATTEMPTED,
    required_field_count:
      normalized.required_field_count === requiredFieldCount,
    configured_field_count: normalized.configured_field_count === 0,
    missing_field_count: normalized.missing_field_count === requiredFieldCount,
    configuration_complete: normalized.configuration_complete === false,
    fields_complete: normalized.fields.length === requiredFieldCount,
    fields_required: normalized.fields.every((entry) => entry.required === true),
    fields_reference_absent:
      normalized.fields.every((entry) => entry.reference_present === false),
    fields_raw_value_absent:
      normalized.fields.every((entry) => entry.raw_value_loaded === false),
    fields_raw_value_excluded:
      normalized.fields.every((entry) => entry.raw_value_excluded === true),
    fields_missing_state:
      normalized.fields.every((entry) => entry.status === "MISSING"),
    active_repository:
      normalized.active_repository_kind === "DURABLE_FILE",
    durable_authoritative: normalized.durable_file_authoritative === true,
    legacy_authoritative:
      normalized.legacy_browser_storage_authoritative === true,
    production_disabled:
      normalized.production_database_configured === false &&
      normalized.production_connection_attempted === false &&
      normalized.production_read_enabled === false &&
      normalized.production_write_enabled === false &&
      normalized.production_append_enabled === false,
    install_flags_disabled:
      normalized.database_driver_installed === false &&
      normalized.orm_installed === false &&
      normalized.migration_framework_installed === false &&
      normalized.connection_pool_enabled === false &&
      normalized.connection_probe_enabled === false,
    schema_and_migration_disabled:
      normalized.schema_creation_enabled === false &&
      normalized.data_migration_enabled === false &&
      normalized.shadow_write_enabled === false &&
      normalized.dual_write_enabled === false &&
      normalized.read_cutover_enabled === false &&
      normalized.write_cutover_enabled === false,
    invocations_disabled:
      normalized.provider_network_operation_invoked === false &&
      normalized.dns_resolution_invoked === false &&
      normalized.database_adapter_invoked === false &&
      normalized.database_driver_invoked === false &&
      normalized.sql_execution_invoked === false,
    mutation_disabled:
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.audit_event_appended === false,
    p999_write_protection: normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(stageChecks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Configuration envelope check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks: stageChecks,
    errors,
    normalized,
  };
}

export function validatePipDatabaseProviderVerificationReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const blockerCodes = Array.isArray(safe.blocker_codes)
    ? safe.blocker_codes.map((entry) => sanitizeText(entry).toUpperCase()).filter(Boolean)
    : [];

  const normalized = {
    schema: PIP_DATABASE_PROVIDER_VERIFICATION_SCHEMA,
    verification_id: sanitizeText(safe.verification_id),
    verification_signature: sanitizeText(safe.verification_signature),
    verified_at: normalizeIso(safe.verified_at) ?? new Date().toISOString(),

    status: sanitizeText(safe.status).toUpperCase(),

    provider_kind: sanitizeText(safe.provider_kind).toUpperCase(),
    provider_vendor: sanitizeText(safe.provider_vendor).toUpperCase(),
    deployment_model: sanitizeText(safe.deployment_model).toUpperCase(),

    provider_selected: toSafeBoolean(safe.provider_selected, false),
    configuration_complete: toSafeBoolean(safe.configuration_complete, false),
    connection_eligible: toSafeBoolean(safe.connection_eligible, false),
    connection_blocked: toSafeBoolean(safe.connection_blocked, true),

    required_field_count: toSafeInteger(safe.required_field_count, 0),
    configured_field_count: toSafeInteger(safe.configured_field_count, 0),
    missing_field_count: toSafeInteger(safe.missing_field_count, 0),

    blocker_count: toSafeInteger(safe.blocker_count, blockerCodes.length),
    blocker_codes: blockerCodes,

    active_repository_before: sanitizeText(safe.active_repository_before).toUpperCase(),
    active_repository_after: sanitizeText(safe.active_repository_after).toUpperCase(),
    active_repository_unchanged: toSafeBoolean(safe.active_repository_unchanged, false),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, true),

    production_database_configured: toSafeBoolean(safe.production_database_configured, false),
    production_connection_attempted: toSafeBoolean(safe.production_connection_attempted, false),
    production_read_enabled: toSafeBoolean(safe.production_read_enabled, false),
    production_write_enabled: toSafeBoolean(safe.production_write_enabled, false),
    production_append_enabled: toSafeBoolean(safe.production_append_enabled, false),

    database_driver_installed: toSafeBoolean(safe.database_driver_installed, false),
    orm_installed: toSafeBoolean(safe.orm_installed, false),
    connection_pool_enabled: toSafeBoolean(safe.connection_pool_enabled, false),
    connection_probe_enabled: toSafeBoolean(safe.connection_probe_enabled, false),

    schema_creation_enabled: toSafeBoolean(safe.schema_creation_enabled, false),
    data_migration_enabled: toSafeBoolean(safe.data_migration_enabled, false),
    shadow_write_enabled: toSafeBoolean(safe.shadow_write_enabled, false),
    dual_write_enabled: toSafeBoolean(safe.dual_write_enabled, false),
    read_cutover_enabled: toSafeBoolean(safe.read_cutover_enabled, false),
    write_cutover_enabled: toSafeBoolean(safe.write_cutover_enabled, false),

    provider_network_operation_invoked: toSafeBoolean(
      safe.provider_network_operation_invoked,
      false
    ),
    dns_resolution_invoked: toSafeBoolean(safe.dns_resolution_invoked, false),
    database_adapter_invoked: toSafeBoolean(safe.database_adapter_invoked, false),
    database_driver_invoked: toSafeBoolean(safe.database_driver_invoked, false),
    sql_execution_invoked: toSafeBoolean(safe.sql_execution_invoked, false),

    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    audit_event_appended: toSafeBoolean(safe.audit_event_appended, false),

    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };

  const checks = {
    schema_valid: normalized.schema === PIP_DATABASE_PROVIDER_VERIFICATION_SCHEMA,
    status:
      normalized.status ===
      PIP_DATABASE_PROVIDER_STATUSES.VERIFIED_UNCONFIGURED,
    provider_kind:
      normalized.provider_kind === PIP_DATABASE_PROVIDER_KINDS.POSTGRESQL,
    provider_vendor:
      normalized.provider_vendor === PIP_DATABASE_PROVIDER_VENDORS.UNSPECIFIED,
    deployment_model:
      normalized.deployment_model ===
      PIP_DATABASE_DEPLOYMENT_MODELS.MANAGED_SERVICE,
    provider_selected: normalized.provider_selected === true,
    configuration_complete: normalized.configuration_complete === false,
    connection_eligible: normalized.connection_eligible === false,
    connection_blocked: normalized.connection_blocked === true,
    required_field_count:
      normalized.required_field_count ===
      Object.values(PIP_DATABASE_CONFIGURATION_FIELD_KEYS).length,
    configured_field_count: normalized.configured_field_count === 0,
    missing_field_count:
      normalized.missing_field_count ===
      Object.values(PIP_DATABASE_CONFIGURATION_FIELD_KEYS).length,
    blocker_count_valid:
      normalized.blocker_count > 0 &&
      normalized.blocker_count === normalized.blocker_codes.length,
    active_repository_before:
      normalized.active_repository_before === "DURABLE_FILE",
    active_repository_after:
      normalized.active_repository_after === "DURABLE_FILE",
    active_repository_unchanged:
      normalized.active_repository_unchanged === true,
    durable_authoritative:
      normalized.durable_file_authoritative === true,
    production_disabled:
      normalized.production_database_configured === false &&
      normalized.production_connection_attempted === false &&
      normalized.production_read_enabled === false &&
      normalized.production_write_enabled === false &&
      normalized.production_append_enabled === false,
    installation_disabled:
      normalized.database_driver_installed === false &&
      normalized.orm_installed === false &&
      normalized.connection_pool_enabled === false &&
      normalized.connection_probe_enabled === false,
    migration_disabled:
      normalized.schema_creation_enabled === false &&
      normalized.data_migration_enabled === false &&
      normalized.shadow_write_enabled === false &&
      normalized.dual_write_enabled === false &&
      normalized.read_cutover_enabled === false &&
      normalized.write_cutover_enabled === false,
    invocation_disabled:
      normalized.provider_network_operation_invoked === false &&
      normalized.dns_resolution_invoked === false &&
      normalized.database_adapter_invoked === false &&
      normalized.database_driver_invoked === false &&
      normalized.sql_execution_invoked === false,
    mutation_disabled:
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.audit_event_appended === false,
    p999_write_protection: normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Provider verification check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function sanitizePipDatabaseConfigurationEnvelope(envelope) {
  return validatePipDatabaseConfigurationEnvelope(envelope).normalized;
}

export function sanitizePipDatabaseProviderVerificationReport(report) {
  return validatePipDatabaseProviderVerificationReport(report).normalized;
}
