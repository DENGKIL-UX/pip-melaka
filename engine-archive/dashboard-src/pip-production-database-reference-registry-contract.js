export const PIP_DATABASE_REFERENCE_REGISTRY_CONTRACT_SCHEMA =
  "pip.database-reference-registry.contract.v1";
export const PIP_DATABASE_REFERENCE_SLOT_REGISTRY_SCHEMA =
  "pip.database-reference-registry.snapshot.v1";
export const PIP_DATABASE_REFERENCE_COMPLETENESS_SCHEMA =
  "pip.database-reference-registry.completeness.v1";

export const PIP_DATABASE_REFERENCE_REGISTRY_STATUSES = Object.freeze({
  EMPTY: "EMPTY",
  PARTIAL: "PARTIAL",
  COMPLETE: "COMPLETE",
  VERIFIED_COMPLETE: "VERIFIED_COMPLETE",
  VERIFIED_INCOMPLETE: "VERIFIED_INCOMPLETE",
});

export const PIP_DATABASE_REFERENCE_SLOT_STATES = Object.freeze({
  UNREGISTERED: "UNREGISTERED",
  REGISTERED: "REGISTERED",
});

export const PIP_DATABASE_REFERENCE_SLOT_KEYS = Object.freeze({
  HOST_REFERENCE: "HOST_REFERENCE",
  PORT_REFERENCE: "PORT_REFERENCE",
  DATABASE_NAME_REFERENCE: "DATABASE_NAME_REFERENCE",
  USERNAME_REFERENCE: "USERNAME_REFERENCE",
  PASSWORD_REFERENCE: "PASSWORD_REFERENCE",
  TLS_MODE_REFERENCE: "TLS_MODE_REFERENCE",
  TLS_CA_REFERENCE: "TLS_CA_REFERENCE",
  SECRET_MANAGER_REFERENCE: "SECRET_MANAGER_REFERENCE",
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

function normalizeSlotToken(value) {
  const token = sanitizeText(value).toLowerCase();
  if (!token) {
    return null;
  }

  return /^[a-f0-9]{16,64}$/.test(token) ? token : null;
}

function normalizeSlotKey(value) {
  return sanitizeText(value).toUpperCase();
}

function normalizeSlotEntry(slotKey, slot) {
  const safeSlot = isPlainObject(slot) ? slot : {};
  const token = normalizeSlotToken(safeSlot.logical_reference_token);

  return {
    slot_key: slotKey,
    slot_id: sanitizeText(safeSlot.slot_id),
    required: true,
    slot_state:
      token === null
        ? PIP_DATABASE_REFERENCE_SLOT_STATES.UNREGISTERED
        : PIP_DATABASE_REFERENCE_SLOT_STATES.REGISTERED,
    registered: token !== null,
    logical_reference_present: token !== null,
    logical_reference_token: token,
    logical_reference_value_excluded: true,
    secret_material_excluded: true,
    connection_material_excluded: true,
  };
}

function normalizeSlots(slots) {
  const expectedKeys = Object.values(PIP_DATABASE_REFERENCE_SLOT_KEYS);
  const slotRows = Array.isArray(slots) ? slots : [];
  const byKey = new Map();

  slotRows
    .map((entry) => (isPlainObject(entry) ? entry : {}))
    .forEach((entry) => {
      const slotKey = normalizeSlotKey(entry.slot_key);
      if (expectedKeys.includes(slotKey) && !byKey.has(slotKey)) {
        byKey.set(slotKey, normalizeSlotEntry(slotKey, entry));
      }
    });

  return expectedKeys.map((slotKey) => {
    if (byKey.has(slotKey)) {
      return byKey.get(slotKey);
    }

    return normalizeSlotEntry(slotKey, {
      slot_id: "",
      logical_reference_token: null,
    });
  });
}

export function buildPipDatabaseReferenceRegistryContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_DATABASE_REFERENCE_REGISTRY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    snapshot_schema: PIP_DATABASE_REFERENCE_SLOT_REGISTRY_SCHEMA,
    completeness_schema: PIP_DATABASE_REFERENCE_COMPLETENESS_SCHEMA,
    registry_statuses: { ...PIP_DATABASE_REFERENCE_REGISTRY_STATUSES },
    slot_states: { ...PIP_DATABASE_REFERENCE_SLOT_STATES },
    slot_keys: { ...PIP_DATABASE_REFERENCE_SLOT_KEYS },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,

      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      central_registry_storage_mode: "DURABLE_FILE",
      central_registry_append_only_history: false,

      reference_slot_registry_enabled: true,
      reference_slot_registry_read_enabled: true,
      reference_slot_registration_enabled: true,
      completeness_verification_enabled: true,
      registration_idempotent: true,

      reference_slot_count: Object.values(PIP_DATABASE_REFERENCE_SLOT_KEYS).length,
      required_slot_count: Object.values(PIP_DATABASE_REFERENCE_SLOT_KEYS).length,

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

export function validatePipDatabaseReferenceRegistryContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const expectedSlotCount =
    Object.values(PIP_DATABASE_REFERENCE_SLOT_KEYS).length;

  const checks = {
    schema_valid:
      safe.schema === PIP_DATABASE_REFERENCE_REGISTRY_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    snapshot_schema_valid:
      safe.snapshot_schema === PIP_DATABASE_REFERENCE_SLOT_REGISTRY_SCHEMA,
    completeness_schema_valid:
      safe.completeness_schema ===
      PIP_DATABASE_REFERENCE_COMPLETENESS_SCHEMA,
    reference_slot_registry_enabled:
      summary.reference_slot_registry_enabled === true,
    reference_slot_registry_read_enabled:
      summary.reference_slot_registry_read_enabled === true,
    reference_slot_registration_enabled:
      summary.reference_slot_registration_enabled === true,
    completeness_verification_enabled:
      summary.completeness_verification_enabled === true,
    registration_idempotent: summary.registration_idempotent === true,
    slot_count:
      Number(summary.reference_slot_count) === expectedSlotCount &&
      Number(summary.required_slot_count) === expectedSlotCount,
    active_repository_durable:
      summary.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative:
      summary.durable_file_authoritative === true,
    storage_mode_durable:
      summary.central_registry_storage_mode === "DURABLE_FILE",
    append_only_history_disabled:
      summary.central_registry_append_only_history === false,
    secret_reference_values_excluded:
      summary.secret_reference_values_excluded === true,
    secret_reference_names_excluded:
      summary.secret_reference_names_excluded === true,
    environment_variable_names_excluded:
      summary.environment_variable_names_excluded === true,
    connection_values_excluded:
      summary.connection_values_excluded === true,
    credential_values_excluded:
      summary.credential_values_excluded === true,
    request_content_excluded: summary.request_content_excluded === true,
    raw_errors_excluded: summary.raw_errors_excluded === true,
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
      errors.push(`Database reference registry contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipDatabaseReferenceRegistryContractManifest({
            generatedAt: safe.generated_at,
          })
        : null,
  };
}

export function validatePipDatabaseReferenceSlotRegistrySnapshot(snapshot) {
  const safe = isPlainObject(snapshot) ? snapshot : {};
  const slots = normalizeSlots(safe.slots);
  const expectedSlotCount =
    Object.values(PIP_DATABASE_REFERENCE_SLOT_KEYS).length;
  const registeredSlotCount = slots.filter((entry) => entry.registered === true).length;
  const missingSlotCount = expectedSlotCount - registeredSlotCount;

  const normalized = {
    schema: PIP_DATABASE_REFERENCE_SLOT_REGISTRY_SCHEMA,
    registry_id: sanitizeText(safe.registry_id),
    registry_signature: sanitizeText(safe.registry_signature).toLowerCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    registry_status: sanitizeText(safe.registry_status).toUpperCase(),

    required_slot_count: toSafeInteger(safe.required_slot_count, expectedSlotCount),
    registered_slot_count: toSafeInteger(safe.registered_slot_count, registeredSlotCount),
    missing_slot_count: toSafeInteger(safe.missing_slot_count, missingSlotCount),

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

    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),

    slots,
  };

  const expectedStatus =
    normalized.registered_slot_count === 0
      ? PIP_DATABASE_REFERENCE_REGISTRY_STATUSES.EMPTY
      : normalized.registered_slot_count === expectedSlotCount
        ? PIP_DATABASE_REFERENCE_REGISTRY_STATUSES.COMPLETE
        : PIP_DATABASE_REFERENCE_REGISTRY_STATUSES.PARTIAL;

  const checks = {
    schema_valid:
      normalized.schema === PIP_DATABASE_REFERENCE_SLOT_REGISTRY_SCHEMA,
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    slot_count:
      normalized.required_slot_count === expectedSlotCount &&
      normalized.registered_slot_count === registeredSlotCount &&
      normalized.missing_slot_count === missingSlotCount,
    status_valid:
      normalized.registry_status === expectedStatus,
    active_repository_durable:
      normalized.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative:
      normalized.durable_file_authoritative === true,
    exclusion_flags:
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
    mutation_guards:
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.p999_write_protection === true,
    slots_valid:
      Array.isArray(normalized.slots) &&
      normalized.slots.length === expectedSlotCount &&
      normalized.slots.every((entry) => {
        const expectedState =
          entry.logical_reference_token === null
            ? PIP_DATABASE_REFERENCE_SLOT_STATES.UNREGISTERED
            : PIP_DATABASE_REFERENCE_SLOT_STATES.REGISTERED;

        return (
          entry.required === true &&
          entry.slot_state === expectedState &&
          entry.registered === (entry.logical_reference_token !== null) &&
          entry.logical_reference_present ===
            (entry.logical_reference_token !== null) &&
          entry.logical_reference_value_excluded === true &&
          entry.secret_material_excluded === true &&
          entry.connection_material_excluded === true
        );
      }),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(
        `Database reference slot registry snapshot check failed: ${key}`
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

export function validatePipDatabaseReferenceCompletenessReport(report) {
  const safe = isPlainObject(report) ? report : {};

  const missingSlotKeys = Array.isArray(safe.missing_slot_keys)
    ? safe.missing_slot_keys.map((entry) => normalizeSlotKey(entry)).filter(Boolean)
    : [];

  const registeredSlotKeys = Array.isArray(safe.registered_slot_keys)
    ? safe.registered_slot_keys
        .map((entry) => normalizeSlotKey(entry))
        .filter(Boolean)
    : [];

  const expectedSlotCount =
    Object.values(PIP_DATABASE_REFERENCE_SLOT_KEYS).length;

  const normalized = {
    schema: PIP_DATABASE_REFERENCE_COMPLETENESS_SCHEMA,
    verification_id: sanitizeText(safe.verification_id),
    verification_signature: sanitizeText(safe.verification_signature).toLowerCase(),
    verified_at: normalizeIso(safe.verified_at) ?? new Date().toISOString(),

    registry_id: sanitizeText(safe.registry_id),
    registry_signature: sanitizeText(safe.registry_signature).toLowerCase(),

    status: sanitizeText(safe.status).toUpperCase(),

    required_slot_count: toSafeInteger(safe.required_slot_count, expectedSlotCount),
    registered_slot_count: toSafeInteger(safe.registered_slot_count, 0),
    missing_slot_count: toSafeInteger(safe.missing_slot_count, expectedSlotCount),

    missing_slot_keys: missingSlotKeys,
    registered_slot_keys: registeredSlotKeys,

    registration_mutation_performed: toSafeBoolean(
      safe.registration_mutation_performed,
      false
    ),

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

    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };

  const expectedStatus =
    normalized.missing_slot_count === 0
      ? PIP_DATABASE_REFERENCE_REGISTRY_STATUSES.VERIFIED_COMPLETE
      : PIP_DATABASE_REFERENCE_REGISTRY_STATUSES.VERIFIED_INCOMPLETE;

  const checks = {
    schema_valid:
      normalized.schema === PIP_DATABASE_REFERENCE_COMPLETENESS_SCHEMA,
    verified_at_valid: normalizeIso(normalized.verified_at) !== null,
    status_valid: normalized.status === expectedStatus,
    slot_count_consistency:
      normalized.required_slot_count === expectedSlotCount &&
      normalized.registered_slot_count + normalized.missing_slot_count ===
        expectedSlotCount &&
      normalized.registered_slot_count === registeredSlotKeys.length &&
      normalized.missing_slot_count === missingSlotKeys.length,
    registration_mutation_guard:
      normalized.registration_mutation_performed === false,
    exclusion_flags:
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
    mutation_guards:
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(
        `Database reference completeness report check failed: ${key}`
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

export function sanitizePipDatabaseReferenceSlotRegistrySnapshot(snapshot) {
  return validatePipDatabaseReferenceSlotRegistrySnapshot(snapshot).normalized;
}

export function sanitizePipDatabaseReferenceCompletenessReport(report) {
  return validatePipDatabaseReferenceCompletenessReport(report).normalized;
}
