export const PIP_PRODUCTION_CONFIGURATION_INTAKE_CONTRACT_SCHEMA =
  "pip.production-configuration-intake.contract.v1";

export const PIP_PRODUCTION_CONFIGURATION_INTAKE_ENVELOPE_SCHEMA =
  "pip.production-configuration-intake.envelope.v1";

export const PIP_PRODUCTION_CONFIGURATION_INTAKE_RECEIPT_SCHEMA =
  "pip.production-configuration-intake.receipt.v1";

export const PIP_PRODUCTION_CONFIGURATION_INTAKE_STATUSES = Object.freeze({
  EMPTY: "EMPTY",
  ACCEPTED: "ACCEPTED",
  IDEMPOTENT_REPLAY: "IDEMPOTENT_REPLAY",
  REJECTED: "REJECTED",
});

export const PIP_PRODUCTION_CONFIGURATION_TARGETS = Object.freeze({
  STAGING: "STAGING",
  PRODUCTION: "PRODUCTION",
});

export const PIP_PRODUCTION_CONFIGURATION_REGION_CLASSIFICATIONS = Object.freeze({
  MALAYSIA: "MALAYSIA",
  AP_SOUTHEAST: "AP_SOUTHEAST",
  OTHER_APPROVED_REGION: "OTHER_APPROVED_REGION",
});

export const PIP_PRODUCTION_CONFIGURATION_INTAKE_REGION_CLASSIFICATIONS =
  PIP_PRODUCTION_CONFIGURATION_REGION_CLASSIFICATIONS;

export const PIP_PRODUCTION_CONFIGURATION_TLS_MODES = Object.freeze({
  REQUIRED: "REQUIRED",
  VERIFY_FULL: "VERIFY_FULL",
});

export const PIP_PRODUCTION_CONFIGURATION_PROVIDER_VENDORS = Object.freeze({
  AWS_RDS: "AWS_RDS",
  AZURE_DATABASE_FOR_POSTGRESQL: "AZURE_DATABASE_FOR_POSTGRESQL",
  GOOGLE_CLOUD_SQL: "GOOGLE_CLOUD_SQL",
  SUPABASE: "SUPABASE",
  NEON: "NEON",
  OTHER_APPROVED_MANAGED_POSTGRESQL:
    "OTHER_APPROVED_MANAGED_POSTGRESQL",
});

export const PIP_PRODUCTION_CONFIGURATION_ALIAS_PATTERN =
  /^REF_[A-Z0-9_]{8,64}$/;

export const PIP_PRODUCTION_CONFIGURATION_CHANGE_REFERENCE_PATTERN =
  /^CHG-[A-Z0-9-]{4,32}$/;

const PIP_PROVIDER_KIND = "POSTGRESQL";
const PIP_DEPLOYMENT_MODEL = "MANAGED_SERVICE";

const FORBIDDEN_KEY_NAMES = new Set([
  "password",
  "token",
  "api_key",
  "secret",
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
  "environment_variable",
  "request_body",
  "raw_request_body",
  "raw_error",
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

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function hasForbiddenShape(value) {
  const safe = sanitizeText(value);
  if (!safe) {
    return true;
  }

  const lowered = safe.toLowerCase();

  return (
    safe.includes(".") ||
    safe.includes("/") ||
    safe.includes(":") ||
    safe.includes("@") ||
    /\s/.test(safe) ||
    /https?:\/\//i.test(safe) ||
    /\b[a-z0-9-]+\.[a-z]{2,}\b/i.test(lowered) ||
    /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(lowered) ||
    /(postgres|mysql|mongodb|server=|host=|port=|user=|password=|dbname=)/i.test(
      lowered
    )
  );
}

function hasForbiddenKeyName(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeyName(entry));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = sanitizeText(key).toLowerCase();
    if (FORBIDDEN_KEY_NAMES.has(normalizedKey)) {
      return true;
    }

    return hasForbiddenKeyName(nested);
  });
}

function normalizeReferenceAliases(input) {
  const aliases = isPlainObject(input) ? input : {};
  const normalized = {};

  Object.entries(aliases).forEach(([slotKey, alias]) => {
    const safeSlot = sanitizeText(slotKey).replace(/[^A-Z0-9_]/gi, "_");
    if (!safeSlot) {
      return;
    }

    normalized[safeSlot] = sanitizeText(alias).toUpperCase();
  });

  return normalized;
}

function buildSafetyFlags() {
  return {
    secret_values_accepted: false,
    environment_values_accepted: false,
    hostnames_accepted: false,
    ip_addresses_accepted: false,
    ports_accepted: false,
    usernames_accepted: false,
    passwords_accepted: false,
    database_names_accepted: false,
    connection_strings_accepted: false,
    raw_secret_reference_names_accepted: false,
    opaque_reference_aliases_only: true,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    network_resolution: false,
    outbound_network: false,
    sql_execution: false,
    ddl_execution: false,
    schema_creation: false,
    migration_execution: false,
    binding_activated: false,
    repository_cutover: false,
    read_cutover: false,
    write_cutover: false,
    automatic_synchronisation: false,
    p999_protected: true,
  };
}

export function buildPipProductionConfigurationIntakeContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PRODUCTION_CONFIGURATION_INTAKE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    envelope_schema: PIP_PRODUCTION_CONFIGURATION_INTAKE_ENVELOPE_SCHEMA,
    receipt_schema: PIP_PRODUCTION_CONFIGURATION_INTAKE_RECEIPT_SCHEMA,
    statuses: { ...PIP_PRODUCTION_CONFIGURATION_INTAKE_STATUSES },
    summary: {
      secure_intake_enabled: true,
      administrator_only: true,
      csrf_required: true,
      durable_receipt_enabled: true,
      intake_idempotent: true,
      opaque_reference_aliases_only: true,
      secret_value_input_enabled: false,
      environment_value_input_enabled: false,
      hostname_input_enabled: false,
      ip_address_input_enabled: false,
      port_input_enabled: false,
      username_input_enabled: false,
      password_input_enabled: false,
      database_name_input_enabled: false,
      connection_string_input_enabled: false,
      raw_secret_reference_input_enabled: false,
      database_driver_invoked: false,
      database_adapter_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      schema_creation_invoked: false,
      migration_invoked: false,
      binding_activation_performed: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      p999_write_protection: true,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
    },
  };
}

export function buildPipProductionConfigurationIntakeEnvelope(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const referenceAliases = normalizeReferenceAliases(safe.reference_aliases);

  return {
    schema: PIP_PRODUCTION_CONFIGURATION_INTAKE_ENVELOPE_SCHEMA,
    request_id: sanitizeText(safe.request_id),
    target_environment: sanitizeText(safe.target_environment).toUpperCase(),
    provider_kind: PIP_PROVIDER_KIND,
    provider_vendor: sanitizeText(safe.provider_vendor).toUpperCase(),
    deployment_model: PIP_DEPLOYMENT_MODEL,
    region_classification: sanitizeText(safe.region_classification).toUpperCase(),
    tls_mode: sanitizeText(safe.tls_mode).toUpperCase(),
    reference_aliases: referenceAliases,
    change_reference: sanitizeText(safe.change_reference).toUpperCase(),
    submitted_role: sanitizeText(safe.submitted_role).toUpperCase(),
    submitted_at: normalizeIso(safe.submitted_at) ?? new Date().toISOString(),
  };
}

export function sanitizePipProductionConfigurationIntakeEnvelope(input = {}) {
  return buildPipProductionConfigurationIntakeEnvelope(input);
}

export function validatePipProductionConfigurationIntakeContractManifest(
  manifest
) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_PRODUCTION_CONFIGURATION_INTAKE_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    envelope_schema_valid:
      safe.envelope_schema === PIP_PRODUCTION_CONFIGURATION_INTAKE_ENVELOPE_SCHEMA,
    receipt_schema_valid:
      safe.receipt_schema === PIP_PRODUCTION_CONFIGURATION_INTAKE_RECEIPT_SCHEMA,
    secure_intake_enabled: summary.secure_intake_enabled === true,
    administrator_only: summary.administrator_only === true,
    csrf_required: summary.csrf_required === true,
    durable_receipt_enabled: summary.durable_receipt_enabled === true,
    intake_idempotent: summary.intake_idempotent === true,
    opaque_reference_aliases_only: summary.opaque_reference_aliases_only === true,
    secret_value_input_enabled: summary.secret_value_input_enabled === false,
    environment_value_input_enabled:
      summary.environment_value_input_enabled === false,
    hostname_input_enabled: summary.hostname_input_enabled === false,
    ip_address_input_enabled: summary.ip_address_input_enabled === false,
    port_input_enabled: summary.port_input_enabled === false,
    username_input_enabled: summary.username_input_enabled === false,
    password_input_enabled: summary.password_input_enabled === false,
    database_name_input_enabled: summary.database_name_input_enabled === false,
    connection_string_input_enabled:
      summary.connection_string_input_enabled === false,
    raw_secret_reference_input_enabled:
      summary.raw_secret_reference_input_enabled === false,
    database_driver_invoked: summary.database_driver_invoked === false,
    database_adapter_invoked: summary.database_adapter_invoked === false,
    network_resolution_invoked: summary.network_resolution_invoked === false,
    outbound_network_invoked: summary.outbound_network_invoked === false,
    sql_execution_invoked: summary.sql_execution_invoked === false,
    ddl_execution_invoked: summary.ddl_execution_invoked === false,
    schema_creation_invoked: summary.schema_creation_invoked === false,
    migration_invoked: summary.migration_invoked === false,
    binding_activation_performed: summary.binding_activation_performed === false,
    repository_cutover_enabled: summary.repository_cutover_enabled === false,
    operational_read_cutover_enabled:
      summary.operational_read_cutover_enabled === false,
    operational_write_cutover_enabled:
      summary.operational_write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      summary.automatic_synchronisation_enabled === false,
    p999_write_protection: summary.p999_write_protection === true,
    active_repository_kind: summary.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative: summary.durable_file_authoritative === true,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) => `Production configuration intake contract check failed: ${key}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: buildPipProductionConfigurationIntakeContractManifest({
      generatedAt: safe.generated_at,
    }),
  };
}

export function validatePipProductionConfigurationIntakeEnvelope(envelope) {
  const normalized = buildPipProductionConfigurationIntakeEnvelope(envelope);
  const aliases = normalized.reference_aliases;
  const aliasValues = Object.values(aliases);

  const checks = {
    schema_valid:
      normalized.schema === PIP_PRODUCTION_CONFIGURATION_INTAKE_ENVELOPE_SCHEMA,
    request_id_valid: normalized.request_id.length >= 8,
    target_environment_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_TARGETS
    ).includes(normalized.target_environment),
    provider_kind_valid: normalized.provider_kind === PIP_PROVIDER_KIND,
    provider_vendor_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_PROVIDER_VENDORS
    ).includes(normalized.provider_vendor),
    deployment_model_valid:
      normalized.deployment_model === PIP_DEPLOYMENT_MODEL,
    region_classification_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_REGION_CLASSIFICATIONS
    ).includes(normalized.region_classification),
    tls_mode_valid: Object.values(PIP_PRODUCTION_CONFIGURATION_TLS_MODES).includes(
      normalized.tls_mode
    ),
    reference_aliases_shape_valid:
      isPlainObject(aliases) && Object.keys(aliases).length > 0,
    reference_alias_pattern_valid:
      aliasValues.length > 0 &&
      aliasValues.every((alias) =>
        PIP_PRODUCTION_CONFIGURATION_ALIAS_PATTERN.test(alias)
      ),
    reference_alias_forbidden_shape_absent:
      aliasValues.every((alias) => !hasForbiddenShape(alias)),
    change_reference_valid: PIP_PRODUCTION_CONFIGURATION_CHANGE_REFERENCE_PATTERN.test(
      normalized.change_reference
    ),
    submitted_role_valid: normalized.submitted_role === "ADMINISTRATOR",
    submitted_at_valid: normalizeIso(normalized.submitted_at) !== null,
    forbidden_key_absent: hasForbiddenKeyName(normalized) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) => `Production configuration intake envelope check failed: ${key}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
    signature: stableJson(normalized),
  };
}

export function validatePipProductionConfigurationIntakeReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_PRODUCTION_CONFIGURATION_INTAKE_RECEIPT_SCHEMA,
    intake_id_valid: sanitizeText(safe.intake_id).length >= 12,
    request_id_valid: sanitizeText(safe.request_id).length >= 8,
    status_valid: Object.values(PIP_PRODUCTION_CONFIGURATION_INTAKE_STATUSES).includes(
      sanitizeText(safe.status).toUpperCase()
    ),
    target_environment_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_TARGETS
    ).includes(sanitizeText(safe.target_environment).toUpperCase()),
    provider_kind_valid: sanitizeText(safe.provider_kind).toUpperCase() === PIP_PROVIDER_KIND,
    provider_vendor_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_PROVIDER_VENDORS
    ).includes(sanitizeText(safe.provider_vendor).toUpperCase()),
    deployment_model_valid:
      sanitizeText(safe.deployment_model).toUpperCase() === PIP_DEPLOYMENT_MODEL,
    region_classification_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_REGION_CLASSIFICATIONS
    ).includes(sanitizeText(safe.region_classification).toUpperCase()),
    tls_mode_valid: Object.values(PIP_PRODUCTION_CONFIGURATION_TLS_MODES).includes(
      sanitizeText(safe.tls_mode).toUpperCase()
    ),
    reference_alias_count_valid:
      Number.isInteger(Number(safe.reference_alias_count)) &&
      Number(safe.reference_alias_count) > 0,
    change_reference_valid: PIP_PRODUCTION_CONFIGURATION_CHANGE_REFERENCE_PATTERN.test(
      sanitizeText(safe.change_reference).toUpperCase()
    ),
    submitted_role_valid:
      sanitizeText(safe.submitted_role).toUpperCase() === "ADMINISTRATOR",
    submitted_at_valid: normalizeIso(safe.submitted_at) !== null,
    stored_at_valid: normalizeIso(safe.stored_at) !== null,
    readback_valid: safe.durable_readback === true,
    idempotency_status_valid:
      sanitizeText(safe.idempotency_status).toUpperCase().length > 0,
    forbidden_key_absent: hasForbiddenKeyName(safe) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) => `Production configuration intake receipt check failed: ${key}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_PRODUCTION_CONFIGURATION_INTAKE_RECEIPT_SCHEMA,
      intake_id: sanitizeText(safe.intake_id),
      request_id: sanitizeText(safe.request_id),
      status: sanitizeText(safe.status).toUpperCase(),
      target_environment: sanitizeText(safe.target_environment).toUpperCase(),
      provider_kind: PIP_PROVIDER_KIND,
      provider_vendor: sanitizeText(safe.provider_vendor).toUpperCase(),
      deployment_model: PIP_DEPLOYMENT_MODEL,
      region_classification: sanitizeText(safe.region_classification).toUpperCase(),
      tls_mode: sanitizeText(safe.tls_mode).toUpperCase(),
      reference_alias_count: Number.parseInt(
        String(safe.reference_alias_count ?? "0"),
        10
      ),
      change_reference: sanitizeText(safe.change_reference).toUpperCase(),
      submitted_role: "ADMINISTRATOR",
      submitted_at: normalizeIso(safe.submitted_at) ?? new Date().toISOString(),
      stored_at: normalizeIso(safe.stored_at) ?? new Date().toISOString(),
      durable_readback: safe.durable_readback === true,
      idempotency_status: sanitizeText(safe.idempotency_status).toUpperCase(),
      revision: Number.parseInt(String(safe.revision ?? "0"), 10),
      safety_flags: buildSafetyFlags(),
    },
  };
}
