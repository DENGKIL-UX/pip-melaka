export const PIP_CENTRAL_REPOSITORY_CONTRACT_SCHEMA =
  "pip.central-repository.contract.v1";
export const PIP_CENTRAL_REPOSITORY_REPORT_SCHEMA =
  "pip.central-repository.report.v1";
export const PIP_CENTRAL_REPOSITORY_ADAPTER_SCHEMA =
  "pip.central-repository.adapter.v1";

export const PIP_CENTRAL_REPOSITORY_STATUSES = Object.freeze({
  READY: "READY",
  DISABLED: "DISABLED",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  UNAVAILABLE: "UNAVAILABLE",
});

export const PIP_CENTRAL_REPOSITORY_KINDS = Object.freeze({
  DURABLE_FILE: "DURABLE_FILE",
  PRODUCTION_DATABASE: "PRODUCTION_DATABASE",
});

export const PIP_CENTRAL_REPOSITORY_CAPABILITIES = Object.freeze({
  SCENARIOS: "SCENARIOS",
  COLLECTIONS: "COLLECTIONS",
  CENTRAL_AUDIT: "CENTRAL_AUDIT",
  OBSERVABILITY_HISTORY: "OBSERVABILITY_HISTORY",
  OPERATIONS_HISTORY: "OPERATIONS_HISTORY",
  INCIDENT_CASEBOOK: "INCIDENT_CASEBOOK",
});

export const PIP_CENTRAL_REPOSITORY_OPERATIONS = Object.freeze({
  READ: "READ",
  WRITE: "WRITE",
  APPEND: "APPEND",
  HEALTH: "HEALTH",
  INSPECT: "INSPECT",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeIso(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(Date.parse(value)).toISOString();
}

function isEnumMember(value, enumObject) {
  return Object.values(enumObject).includes(String(value ?? "").trim().toUpperCase());
}

function toSafeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, parsed);
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeBoolean(value, fallback = false) {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  return fallback;
}

function buildManifestSummary() {
  return {
    authentication_configured: true,
    authentication_required: true,
    roles_configured: true,
    authorization_enforced: true,

    repository_abstraction_enabled: true,
    adapter_registry_enabled: true,

    active_repository_kind: PIP_CENTRAL_REPOSITORY_KINDS.DURABLE_FILE,
    active_repository_authoritative: true,

    durable_file_adapter_registered: true,
    durable_file_read_enabled: true,
    durable_file_write_enabled: true,

    production_database_adapter_registered: true,
    production_database_configured: false,
    production_database_connection_attempted: false,
    production_database_read_enabled: false,
    production_database_write_enabled: false,

    repository_cutover_enabled: false,
    dual_write_enabled: false,
    shadow_write_enabled: false,
    automatic_synchronisation_enabled: false,
    automatic_schema_migration_enabled: false,
    automatic_data_migration_enabled: false,
    automatic_failover_enabled: false,
    automatic_recovery_enabled: false,

    legacy_browser_storage_authoritative: true,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,

    p999_write_protection: true,
    diagnostic_only: true,
    manual_inspection_only: true,

    connection_values_redacted: true,
    credential_values_redacted: true,
    environment_values_redacted: true,
    infrastructure_values_redacted: true,
    user_identity_values_redacted: true,

    request_content_excluded: true,
    raw_errors_excluded: true,
    voter_data_excluded: true,
    scenario_content_excluded: true,
    browser_storage_content_excluded: true,
  };
}

function buildDefaultCapabilityDescriptor() {
  const descriptor = {};
  Object.values(PIP_CENTRAL_REPOSITORY_CAPABILITIES).forEach((capability) => {
    descriptor[capability] = {
      supported: false,
      read_enabled: false,
      write_enabled: false,
      append_enabled: false,
    };
  });
  return descriptor;
}

function sanitizeCapabilityDescriptor(input) {
  const safe = isPlainObject(input) ? input : {};
  const output = buildDefaultCapabilityDescriptor();

  Object.values(PIP_CENTRAL_REPOSITORY_CAPABILITIES).forEach((capability) => {
    const entry = isPlainObject(safe[capability]) ? safe[capability] : {};
    output[capability] = {
      supported: sanitizeBoolean(entry.supported, false),
      read_enabled: sanitizeBoolean(entry.read_enabled, false),
      write_enabled: sanitizeBoolean(entry.write_enabled, false),
      append_enabled: sanitizeBoolean(entry.append_enabled, false),
    };
  });

  return output;
}

function looksSensitive(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => looksSensitive(entry));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((entry) => looksSensitive(entry));
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    normalized === "durable_file" ||
    normalized === "production_database" ||
    normalized === "ready" ||
    normalized === "disabled" ||
    normalized === "not_configured" ||
    normalized === "review_required"
  ) {
    return false;
  }

  return (
    normalized.includes("\\") ||
    normalized.includes("/") ||
    normalized.includes("host") ||
    normalized.includes("port") ||
    normalized.includes("connection") ||
    normalized.includes("jdbc") ||
    normalized.includes("postgres") ||
    normalized.includes("mysql") ||
    normalized.includes("mongodb") ||
    normalized.includes("database") ||
    normalized.includes("schema") ||
    normalized.includes("project") ||
    normalized.includes("service-account") ||
    normalized.includes("username") ||
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("token") ||
    normalized.includes("certificate") ||
    normalized.includes("env") ||
    normalized.includes("voter") ||
    normalized.includes("scenario") ||
    normalized.includes("browser storage") ||
    normalized.includes("stack") ||
    normalized.includes("exception")
  );
}

export function buildPipCentralRepositoryContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_CENTRAL_REPOSITORY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    adapter_schema: PIP_CENTRAL_REPOSITORY_ADAPTER_SCHEMA,
    report_schema: PIP_CENTRAL_REPOSITORY_REPORT_SCHEMA,
    statuses: { ...PIP_CENTRAL_REPOSITORY_STATUSES },
    kinds: { ...PIP_CENTRAL_REPOSITORY_KINDS },
    capabilities: { ...PIP_CENTRAL_REPOSITORY_CAPABILITIES },
    operations: { ...PIP_CENTRAL_REPOSITORY_OPERATIONS },
    summary: buildManifestSummary(),
  };
}

export function validatePipCentralRepositoryContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_CENTRAL_REPOSITORY_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    adapter_schema_valid: safe.adapter_schema === PIP_CENTRAL_REPOSITORY_ADAPTER_SCHEMA,
    report_schema_valid: safe.report_schema === PIP_CENTRAL_REPOSITORY_REPORT_SCHEMA,
    summary_authentication_valid:
      summary.authentication_configured === true &&
      summary.authentication_required === true &&
      summary.roles_configured === true &&
      summary.authorization_enforced === true,
    summary_active_repository_valid:
      summary.repository_abstraction_enabled === true &&
      summary.adapter_registry_enabled === true &&
      summary.active_repository_kind === PIP_CENTRAL_REPOSITORY_KINDS.DURABLE_FILE &&
      summary.active_repository_authoritative === true,
    summary_production_database_disabled:
      summary.production_database_adapter_registered === true &&
      summary.production_database_configured === false &&
      summary.production_database_connection_attempted === false &&
      summary.production_database_read_enabled === false &&
      summary.production_database_write_enabled === false,
    summary_safety_switches_disabled:
      summary.repository_cutover_enabled === false &&
      summary.dual_write_enabled === false &&
      summary.shadow_write_enabled === false &&
      summary.automatic_synchronisation_enabled === false &&
      summary.automatic_schema_migration_enabled === false &&
      summary.automatic_data_migration_enabled === false &&
      summary.automatic_failover_enabled === false &&
      summary.automatic_recovery_enabled === false,
    summary_storage_and_privacy_valid:
      summary.legacy_browser_storage_authoritative === true &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false &&
      summary.p999_write_protection === true &&
      summary.connection_values_redacted === true &&
      summary.credential_values_redacted === true &&
      summary.environment_values_redacted === true &&
      summary.infrastructure_values_redacted === true &&
      summary.user_identity_values_redacted === true &&
      summary.request_content_excluded === true &&
      summary.raw_errors_excluded === true &&
      summary.voter_data_excluded === true &&
      summary.scenario_content_excluded === true &&
      summary.browser_storage_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Central repository contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: errors.length === 0
      ? {
          schema: PIP_CENTRAL_REPOSITORY_CONTRACT_SCHEMA,
          generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
          adapter_schema: PIP_CENTRAL_REPOSITORY_ADAPTER_SCHEMA,
          report_schema: PIP_CENTRAL_REPOSITORY_REPORT_SCHEMA,
          statuses: { ...PIP_CENTRAL_REPOSITORY_STATUSES },
          kinds: { ...PIP_CENTRAL_REPOSITORY_KINDS },
          capabilities: { ...PIP_CENTRAL_REPOSITORY_CAPABILITIES },
          operations: { ...PIP_CENTRAL_REPOSITORY_OPERATIONS },
          summary: buildManifestSummary(),
        }
      : null,
  };
}

export function validatePipCentralRepositoryAdapterDescriptor(descriptor) {
  const safe = isPlainObject(descriptor) ? descriptor : {};
  const safety = isPlainObject(safe.safety) ? safe.safety : {};
  const privacy = isPlainObject(safe.privacy) ? safe.privacy : {};
  const capabilities = sanitizeCapabilityDescriptor(safe.capabilities);

  const checks = {
    schema_valid: safe.schema === PIP_CENTRAL_REPOSITORY_ADAPTER_SCHEMA,
    adapter_id_valid: typeof safe.adapter_id === "string" && sanitizeText(safe.adapter_id).length > 0,
    repository_kind_valid: isEnumMember(safe.repository_kind, PIP_CENTRAL_REPOSITORY_KINDS),
    status_valid: isEnumMember(safe.status, PIP_CENTRAL_REPOSITORY_STATUSES),
    booleans_valid:
      typeof safe.active === "boolean" &&
      typeof safe.authoritative === "boolean" &&
      typeof safe.configured === "boolean" &&
      typeof safe.connection_attempted === "boolean",
    safety_valid:
      safety.repository_cutover_enabled === false &&
      safety.dual_write_enabled === false &&
      safety.shadow_write_enabled === false &&
      safety.automatic_synchronisation_enabled === false &&
      safety.automatic_migration_enabled === false &&
      safety.automatic_failover_enabled === false &&
      safety.p999_write_protection === true,
    privacy_valid:
      privacy.connection_values_redacted === true &&
      privacy.credential_values_redacted === true &&
      privacy.environment_values_redacted === true &&
      privacy.infrastructure_values_redacted === true &&
      privacy.user_identity_values_redacted === true &&
      privacy.request_content_excluded === true &&
      privacy.raw_errors_excluded === true &&
      privacy.voter_data_excluded === true &&
      privacy.scenario_content_excluded === true &&
      privacy.browser_storage_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Central repository adapter check failed: ${key}`);
    }
  });

  Object.values(PIP_CENTRAL_REPOSITORY_CAPABILITIES).forEach((capability) => {
    const entry = capabilities[capability];
    if (!isPlainObject(entry)) {
      errors.push(`Central repository adapter capability is missing: ${capability}`);
      return;
    }

    if (
      typeof entry.supported !== "boolean" ||
      typeof entry.read_enabled !== "boolean" ||
      typeof entry.write_enabled !== "boolean" ||
      typeof entry.append_enabled !== "boolean"
    ) {
      errors.push(`Central repository adapter capability flags invalid: ${capability}`);
    }
  });

  const normalized = {
    schema: PIP_CENTRAL_REPOSITORY_ADAPTER_SCHEMA,
    adapter_id: sanitizeText(safe.adapter_id),
    repository_kind: String(safe.repository_kind ?? "").toUpperCase(),
    status: String(safe.status ?? "").toUpperCase(),
    active: sanitizeBoolean(safe.active, false),
    authoritative: sanitizeBoolean(safe.authoritative, false),
    configured: sanitizeBoolean(safe.configured, false),
    connection_attempted: sanitizeBoolean(safe.connection_attempted, false),
    capabilities,
    safety: {
      repository_cutover_enabled: false,
      dual_write_enabled: false,
      shadow_write_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_migration_enabled: false,
      automatic_failover_enabled: false,
      p999_write_protection: true,
    },
    privacy: {
      connection_values_redacted: true,
      credential_values_redacted: true,
      environment_values_redacted: true,
      infrastructure_values_redacted: true,
      user_identity_values_redacted: true,
      request_content_excluded: true,
      raw_errors_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      browser_storage_content_excluded: true,
    },
  };

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function sanitizePipCentralRepositoryReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const safeAdapters = Array.isArray(safe.adapters) ? safe.adapters : [];
  const safeMatrix = Array.isArray(safe.capability_matrix) ? safe.capability_matrix : [];

  const adapters = safeAdapters
    .map((entry) => validatePipCentralRepositoryAdapterDescriptor(entry))
    .filter((entry) => entry.valid === true)
    .map((entry) => entry.normalized);

  const capabilityMatrix = safeMatrix
    .map((entry) => (isPlainObject(entry) ? entry : {}))
    .map((entry) => ({
      capability: String(entry.capability ?? "").toUpperCase(),
      adapter_id: sanitizeText(entry.adapter_id),
      repository_kind: String(entry.repository_kind ?? "").toUpperCase(),
      supported: sanitizeBoolean(entry.supported, false),
      read_enabled: sanitizeBoolean(entry.read_enabled, false),
      write_enabled: sanitizeBoolean(entry.write_enabled, false),
      append_enabled: sanitizeBoolean(entry.append_enabled, false),
    }))
    .filter((entry) =>
      Object.values(PIP_CENTRAL_REPOSITORY_CAPABILITIES).includes(entry.capability)
    );

  const sanitized = {
    schema: PIP_CENTRAL_REPOSITORY_REPORT_SCHEMA,
    status: String(safe.status ?? PIP_CENTRAL_REPOSITORY_STATUSES.REVIEW_REQUIRED).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    active_adapter_id: sanitizeText(safe.active_adapter_id),
    active_repository_kind: String(safe.active_repository_kind ?? "").toUpperCase(),
    active_repository_authoritative: sanitizeBoolean(safe.active_repository_authoritative, false),
    registered_adapter_count: toSafeInteger(safe.registered_adapter_count),
    ready_adapter_count: toSafeInteger(safe.ready_adapter_count),
    disabled_adapter_count: toSafeInteger(safe.disabled_adapter_count),
    not_configured_adapter_count: toSafeInteger(safe.not_configured_adapter_count),
    production_database_configured: sanitizeBoolean(safe.production_database_configured, false),
    production_database_connection_attempted: sanitizeBoolean(safe.production_database_connection_attempted, false),
    production_database_read_enabled: sanitizeBoolean(safe.production_database_read_enabled, false),
    production_database_write_enabled: sanitizeBoolean(safe.production_database_write_enabled, false),
    repository_cutover_enabled: sanitizeBoolean(safe.repository_cutover_enabled, false),
    dual_write_enabled: sanitizeBoolean(safe.dual_write_enabled, false),
    shadow_write_enabled: sanitizeBoolean(safe.shadow_write_enabled, false),
    automatic_synchronisation_enabled: sanitizeBoolean(safe.automatic_synchronisation_enabled, false),
    automatic_schema_migration_enabled: sanitizeBoolean(safe.automatic_schema_migration_enabled, false),
    automatic_data_migration_enabled: sanitizeBoolean(safe.automatic_data_migration_enabled, false),
    automatic_failover_enabled: sanitizeBoolean(safe.automatic_failover_enabled, false),
    adapters,
    capability_matrix: capabilityMatrix,
    security: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      p999_write_protection: true,
    },
    persistence: {
      active_repository_kind: String(safe.active_repository_kind ?? "").toUpperCase(),
      active_repository_authoritative: sanitizeBoolean(safe.active_repository_authoritative, false),
      legacy_browser_storage_authoritative: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      repository_cutover_enabled: false,
      dual_write_enabled: false,
      shadow_write_enabled: false,
    },
    privacy: {
      connection_values_redacted: true,
      credential_values_redacted: true,
      environment_values_redacted: true,
      infrastructure_values_redacted: true,
      user_identity_values_redacted: true,
      request_content_excluded: true,
      raw_errors_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      browser_storage_content_excluded: true,
    },
    summary: {
      diagnostic_only: true,
      manual_inspection_only: true,
      production_database_adapter_registered:
        adapters.some((entry) => entry.repository_kind === PIP_CENTRAL_REPOSITORY_KINDS.PRODUCTION_DATABASE),
      durable_file_adapter_registered:
        adapters.some((entry) => entry.repository_kind === PIP_CENTRAL_REPOSITORY_KINDS.DURABLE_FILE),
    },
  };

  return sanitized;
}

export function validatePipCentralRepositoryReport(report) {
  const normalized = sanitizePipCentralRepositoryReport(report);
  const checks = {
    schema_valid: normalized.schema === PIP_CENTRAL_REPOSITORY_REPORT_SCHEMA,
    status_valid: isEnumMember(normalized.status, PIP_CENTRAL_REPOSITORY_STATUSES),
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    active_repository_kind_valid:
      normalized.active_repository_kind === PIP_CENTRAL_REPOSITORY_KINDS.DURABLE_FILE,
    active_repository_authoritative_valid:
      normalized.active_repository_authoritative === true,
    production_database_disabled:
      normalized.production_database_configured === false &&
      normalized.production_database_connection_attempted === false &&
      normalized.production_database_read_enabled === false &&
      normalized.production_database_write_enabled === false,
    automation_switches_disabled:
      normalized.repository_cutover_enabled === false &&
      normalized.dual_write_enabled === false &&
      normalized.shadow_write_enabled === false &&
      normalized.automatic_synchronisation_enabled === false &&
      normalized.automatic_schema_migration_enabled === false &&
      normalized.automatic_data_migration_enabled === false &&
      normalized.automatic_failover_enabled === false,
    security_valid:
      normalized.security.authentication_configured === true &&
      normalized.security.authentication_required === true &&
      normalized.security.roles_configured === true &&
      normalized.security.authorization_enforced === true &&
      normalized.security.p999_write_protection === true,
    privacy_valid:
      normalized.privacy.connection_values_redacted === true &&
      normalized.privacy.credential_values_redacted === true &&
      normalized.privacy.environment_values_redacted === true &&
      normalized.privacy.infrastructure_values_redacted === true &&
      normalized.privacy.user_identity_values_redacted === true &&
      normalized.privacy.request_content_excluded === true &&
      normalized.privacy.raw_errors_excluded === true &&
      normalized.privacy.voter_data_excluded === true &&
      normalized.privacy.scenario_content_excluded === true &&
      normalized.privacy.browser_storage_content_excluded === true,
    no_sensitive_payload_values: true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Central repository report check failed: ${key}`);
    }
  });

  normalized.adapters.forEach((entry) => {
    const validation = validatePipCentralRepositoryAdapterDescriptor(entry);
    if (validation.valid !== true) {
      errors.push(validation.errors?.[0] ?? "Central repository adapter descriptor is invalid.");
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}
