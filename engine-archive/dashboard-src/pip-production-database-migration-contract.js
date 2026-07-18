export const PIP_DATABASE_MIGRATION_CONTRACT_SCHEMA =
  "pip.database-migration.contract.v1";
export const PIP_DATABASE_MIGRATION_PLAN_SCHEMA =
  "pip.database-migration.plan.v1";
export const PIP_DATABASE_MIGRATION_LEDGER_SCHEMA =
  "pip.database-migration.ledger.v1";
export const PIP_SHADOW_WRITE_VERIFICATION_SCHEMA =
  "pip.shadow-write.verification.v1";

export const PIP_DATABASE_MIGRATION_STATUSES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  PLANNED: "PLANNED",
  BLOCKED: "BLOCKED",
  READY_FOR_FUTURE_CONFIGURATION: "READY_FOR_FUTURE_CONFIGURATION",
  VERIFIED_DISABLED: "VERIFIED_DISABLED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

export const PIP_DATABASE_MIGRATION_PHASES = Object.freeze({
  SCHEMA_BLUEPRINT: "SCHEMA_BLUEPRINT",
  DRIVER_CONFIGURATION: "DRIVER_CONFIGURATION",
  CONNECTION_CONFIGURATION: "CONNECTION_CONFIGURATION",
  SCHEMA_CREATION: "SCHEMA_CREATION",
  DATA_MIGRATION: "DATA_MIGRATION",
  SHADOW_WRITE: "SHADOW_WRITE",
  RECONCILIATION: "RECONCILIATION",
  READ_CUTOVER: "READ_CUTOVER",
  WRITE_CUTOVER: "WRITE_CUTOVER",
  LEGACY_RETENTION: "LEGACY_RETENTION",
});

export const PIP_DATABASE_LOGICAL_TYPES = Object.freeze({
  STRING: "STRING",
  INTEGER: "INTEGER",
  NUMBER: "NUMBER",
  BOOLEAN: "BOOLEAN",
  TIMESTAMP: "TIMESTAMP",
  JSON: "JSON",
  HASH: "HASH",
  IDENTIFIER: "IDENTIFIER",
});

export const PIP_DATABASE_ENTITY_NAMES = Object.freeze({
  SCENARIOS: "scenarios",
  COLLECTIONS: "collections",
  COLLECTION_ITEMS: "collection_items",
  CENTRAL_AUDIT_EVENTS: "central_audit_events",
  OBSERVABILITY_SNAPSHOTS: "observability_snapshots",
  OPERATIONS_HISTORY_SNAPSHOTS: "operations_history_snapshots",
  INCIDENT_CASES: "incident_cases",
  INCIDENT_CASE_REVISIONS: "incident_case_revisions",
  INCIDENT_CHECKLIST_ITEMS: "incident_checklist_items",
  INCIDENT_CLOSURE_EVIDENCE: "incident_closure_evidence",
  REPOSITORY_SCHEMA_VERSIONS: "repository_schema_versions",
  MIGRATION_LEDGER_ENTRIES: "migration_ledger_entries",
});

export const PIP_SHADOW_WRITE_VERIFICATION_MODES = Object.freeze({
  DENIAL_ONLY: "DENIAL_ONLY",
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

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPipDatabaseMigrationContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_DATABASE_MIGRATION_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    migration_plan_schema: PIP_DATABASE_MIGRATION_PLAN_SCHEMA,
    migration_ledger_schema: PIP_DATABASE_MIGRATION_LEDGER_SCHEMA,
    shadow_write_verification_schema: PIP_SHADOW_WRITE_VERIFICATION_SCHEMA,
    statuses: { ...PIP_DATABASE_MIGRATION_STATUSES },
    phases: { ...PIP_DATABASE_MIGRATION_PHASES },
    logical_types: { ...PIP_DATABASE_LOGICAL_TYPES },
    entity_names: { ...PIP_DATABASE_ENTITY_NAMES },
    verification_modes: { ...PIP_SHADOW_WRITE_VERIFICATION_MODES },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,

      schema_blueprint_enabled: true,
      migration_ledger_enabled: true,
      migration_ledger_persistent: false,
      migration_ledger_read_only: true,

      shadow_write_verification_enabled: true,
      shadow_write_verification_mode:
        PIP_SHADOW_WRITE_VERIFICATION_MODES.DENIAL_ONLY,

      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,

      production_database_adapter_registered: true,
      production_database_configured: false,
      production_database_connection_attempted: false,
      production_database_read_enabled: false,
      production_database_write_enabled: false,
      production_database_append_enabled: false,

      schema_creation_enabled: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      dual_write_enabled: false,
      shadow_write_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_schema_migration_enabled: false,
      automatic_data_migration_enabled: false,
      automatic_failover_enabled: false,
      automatic_recovery_enabled: false,

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
      repository_content_excluded: true,
      browser_storage_content_excluded: true,
    },
  };
}

export function validatePipDatabaseMigrationContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_DATABASE_MIGRATION_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    migration_plan_schema_valid:
      safe.migration_plan_schema === PIP_DATABASE_MIGRATION_PLAN_SCHEMA,
    migration_ledger_schema_valid:
      safe.migration_ledger_schema === PIP_DATABASE_MIGRATION_LEDGER_SCHEMA,
    shadow_verification_schema_valid:
      safe.shadow_write_verification_schema ===
      PIP_SHADOW_WRITE_VERIFICATION_SCHEMA,
    summary_valid:
      summary.authentication_configured === true &&
      summary.authentication_required === true &&
      summary.roles_configured === true &&
      summary.authorization_enforced === true &&
      summary.schema_blueprint_enabled === true &&
      summary.migration_ledger_enabled === true &&
      summary.migration_ledger_persistent === false &&
      summary.migration_ledger_read_only === true &&
      summary.shadow_write_verification_enabled === true &&
      summary.shadow_write_verification_mode ===
        PIP_SHADOW_WRITE_VERIFICATION_MODES.DENIAL_ONLY &&
      summary.active_repository_kind === "DURABLE_FILE" &&
      summary.durable_file_authoritative === true &&
      summary.legacy_browser_storage_authoritative === true &&
      summary.production_database_adapter_registered === true &&
      summary.production_database_configured === false &&
      summary.production_database_connection_attempted === false &&
      summary.production_database_read_enabled === false &&
      summary.production_database_write_enabled === false &&
      summary.production_database_append_enabled === false &&
      summary.schema_creation_enabled === false &&
      summary.repository_cutover_enabled === false &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false &&
      summary.dual_write_enabled === false &&
      summary.shadow_write_enabled === false &&
      summary.automatic_synchronisation_enabled === false &&
      summary.automatic_schema_migration_enabled === false &&
      summary.automatic_data_migration_enabled === false &&
      summary.automatic_failover_enabled === false &&
      summary.automatic_recovery_enabled === false &&
      summary.p999_write_protection === true &&
      summary.diagnostic_only === true &&
      summary.manual_inspection_only === true &&
      summary.connection_values_redacted === true &&
      summary.credential_values_redacted === true &&
      summary.environment_values_redacted === true &&
      summary.infrastructure_values_redacted === true &&
      summary.user_identity_values_redacted === true &&
      summary.request_content_excluded === true &&
      summary.raw_errors_excluded === true &&
      summary.voter_data_excluded === true &&
      summary.scenario_content_excluded === true &&
      summary.repository_content_excluded === true &&
      summary.browser_storage_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Database migration contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipDatabaseMigrationContractManifest({
            generatedAt: safe.generated_at,
          })
        : null,
  };
}

function sanitizeBlueprint(blueprint) {
  const safe = isPlainObject(blueprint) ? blueprint : {};
  const entities = Array.isArray(safe.entities) ? safe.entities : [];

  return {
    status: String(safe.status ?? "REVIEW_REQUIRED").toUpperCase(),
    entities: entities
      .map((entity) => (isPlainObject(entity) ? entity : {}))
      .map((entity) => {
        const fields = Array.isArray(entity.logical_fields)
          ? entity.logical_fields
          : [];

        return {
          logical_entity_name: sanitizeText(entity.logical_entity_name),
          capability: sanitizeText(entity.capability),
          purpose: sanitizeText(entity.purpose),
          logical_fields: fields
            .map((field) => (isPlainObject(field) ? field : {}))
            .map((field) => ({
              logical_field_name: sanitizeText(field.logical_field_name),
              logical_field_type: String(field.logical_field_type ?? "").toUpperCase(),
              nullable: toSafeBoolean(field.nullable, false),
              primary_key: toSafeBoolean(field.primary_key, false),
              unique_key: toSafeBoolean(field.unique_key, false),
              indexed: toSafeBoolean(field.indexed, false),
              append_only: toSafeBoolean(field.append_only, false),
              retention_classification: sanitizeText(field.retention_classification),
            })),
          migration_order: toSafeInteger(entity.migration_order, 0),
          dependency_entity_names: Array.isArray(entity.dependency_entity_names)
            ? entity.dependency_entity_names.map((entry) => sanitizeText(entry))
            : [],
        };
      }),
    summary: {
      logical_entity_count: toSafeInteger(safe.summary?.logical_entity_count, entities.length),
      logical_field_count: toSafeInteger(
        safe.summary?.logical_field_count,
        entities.reduce((acc, entry) => {
          const fields = Array.isArray(entry?.logical_fields) ? entry.logical_fields.length : 0;
          return acc + fields;
        }, 0)
      ),
    },
  };
}

export function validatePipDatabaseMigrationLedger(ledger) {
  const safe = isPlainObject(ledger) ? ledger : {};
  const entries = Array.isArray(safe.entries) ? safe.entries : [];

  const normalizedEntries = entries
    .map((entry) => (isPlainObject(entry) ? entry : {}))
    .map((entry) => ({
      ledger_id: sanitizeText(entry.ledger_id),
      sequence: toSafeInteger(entry.sequence, 0),
      phase: String(entry.phase ?? "").toUpperCase(),
      status: String(entry.status ?? "").toUpperCase(),
      source_repository_kind: sanitizeText(entry.source_repository_kind).toUpperCase(),
      target_repository_kind: sanitizeText(entry.target_repository_kind).toUpperCase(),
      prerequisite_phase_ids: Array.isArray(entry.prerequisite_phase_ids)
        ? entry.prerequisite_phase_ids.map((value) => sanitizeText(value))
        : [],
      blocker_codes: Array.isArray(entry.blocker_codes)
        ? entry.blocker_codes.map((value) => sanitizeText(value).toUpperCase())
        : [],
      manual_approval_required: toSafeBoolean(entry.manual_approval_required, true),
      execution_enabled: toSafeBoolean(entry.execution_enabled, false),
      completed: toSafeBoolean(entry.completed, false),
      evidence_summary: sanitizeText(entry.evidence_summary),
    }));

  const requiredPhases = Object.values(PIP_DATABASE_MIGRATION_PHASES);
  const phaseCounts = new Map();
  normalizedEntries.forEach((entry) => {
    const key = String(entry.phase);
    phaseCounts.set(key, (phaseCounts.get(key) ?? 0) + 1);
  });

  const checks = {
    schema_valid: safe.schema === PIP_DATABASE_MIGRATION_LEDGER_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    status_valid: Object.values(PIP_DATABASE_MIGRATION_STATUSES).includes(
      String(safe.status ?? "").toUpperCase()
    ),
    deterministic: toSafeBoolean(safe.deterministic, true) === true,
    persistent_disabled: toSafeBoolean(safe.persistent, false) === false,
    read_only: toSafeBoolean(safe.read_only, true) === true,
    in_memory_only: toSafeBoolean(safe.in_memory_only, true) === true,
    phase_coverage_valid:
      requiredPhases.every((phase) => phaseCounts.get(phase) === 1) &&
      normalizedEntries.length === requiredPhases.length,
    execution_disabled: normalizedEntries.every((entry) => entry.execution_enabled === false),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Migration ledger check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_DATABASE_MIGRATION_LEDGER_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      status: String(safe.status ?? PIP_DATABASE_MIGRATION_STATUSES.REVIEW_REQUIRED).toUpperCase(),
      deterministic: true,
      persistent: false,
      read_only: true,
      in_memory_only: true,
      entries: normalizedEntries,
      summary: {
        phase_count: normalizedEntries.length,
        blocked_phase_count: normalizedEntries.filter(
          (entry) => entry.status === PIP_DATABASE_MIGRATION_STATUSES.BLOCKED
        ).length,
        executable_phase_count: normalizedEntries.filter(
          (entry) => entry.execution_enabled === true
        ).length,
      },
    },
  };
}

export function sanitizePipDatabaseMigrationPlan(plan) {
  const safe = isPlainObject(plan) ? plan : {};
  const blueprint = sanitizeBlueprint(safe.schema_blueprint);
  const ledgerValidation = validatePipDatabaseMigrationLedger(safe.migration_ledger);

  return {
    schema: PIP_DATABASE_MIGRATION_PLAN_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    status: String(safe.status ?? PIP_DATABASE_MIGRATION_STATUSES.REVIEW_REQUIRED).toUpperCase(),
    verification_mode: String(
      safe.verification_mode ?? PIP_SHADOW_WRITE_VERIFICATION_MODES.DENIAL_ONLY
    ).toUpperCase(),
    active_repository_kind: sanitizeText(safe.active_repository_kind).toUpperCase(),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, false),
    legacy_browser_storage_authoritative: toSafeBoolean(
      safe.legacy_browser_storage_authoritative,
      true
    ),
    production_database_configured: toSafeBoolean(safe.production_database_configured, false),
    production_database_connection_attempted: toSafeBoolean(
      safe.production_database_connection_attempted,
      false
    ),
    production_database_read_enabled: toSafeBoolean(safe.production_database_read_enabled, false),
    production_database_write_enabled: toSafeBoolean(safe.production_database_write_enabled, false),
    production_database_append_enabled: toSafeBoolean(safe.production_database_append_enabled, false),
    schema_creation_enabled: toSafeBoolean(safe.schema_creation_enabled, false),
    data_migration_enabled: toSafeBoolean(safe.data_migration_enabled, false),
    repository_cutover_enabled: toSafeBoolean(safe.repository_cutover_enabled, false),
    operational_read_cutover_enabled: toSafeBoolean(
      safe.operational_read_cutover_enabled,
      false
    ),
    operational_write_cutover_enabled: toSafeBoolean(
      safe.operational_write_cutover_enabled,
      false
    ),
    dual_write_enabled: toSafeBoolean(safe.dual_write_enabled, false),
    shadow_write_enabled: toSafeBoolean(safe.shadow_write_enabled, false),
    automatic_synchronisation_enabled: toSafeBoolean(
      safe.automatic_synchronisation_enabled,
      false
    ),
    automatic_schema_migration_enabled: toSafeBoolean(
      safe.automatic_schema_migration_enabled,
      false
    ),
    automatic_data_migration_enabled: toSafeBoolean(
      safe.automatic_data_migration_enabled,
      false
    ),
    automatic_failover_enabled: toSafeBoolean(safe.automatic_failover_enabled, false),
    automatic_recovery_enabled: toSafeBoolean(safe.automatic_recovery_enabled, false),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
    schema_blueprint: blueprint,
    migration_ledger: ledgerValidation.normalized,
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
      repository_content_excluded: true,
      browser_storage_content_excluded: true,
    },
  };
}

export function validatePipDatabaseMigrationPlan(plan) {
  const normalized = sanitizePipDatabaseMigrationPlan(plan);
  const ledgerValidation = validatePipDatabaseMigrationLedger(
    normalized.migration_ledger
  );

  const checks = {
    schema_valid: normalized.schema === PIP_DATABASE_MIGRATION_PLAN_SCHEMA,
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    status_valid: Object.values(PIP_DATABASE_MIGRATION_STATUSES).includes(normalized.status),
    verification_mode_valid:
      normalized.verification_mode ===
      PIP_SHADOW_WRITE_VERIFICATION_MODES.DENIAL_ONLY,
    active_repository_valid: normalized.active_repository_kind === "DURABLE_FILE",
    production_disabled:
      normalized.production_database_configured === false &&
      normalized.production_database_connection_attempted === false &&
      normalized.production_database_read_enabled === false &&
      normalized.production_database_write_enabled === false &&
      normalized.production_database_append_enabled === false,
    migration_execution_disabled:
      normalized.schema_creation_enabled === false &&
      normalized.data_migration_enabled === false &&
      normalized.repository_cutover_enabled === false &&
      normalized.operational_read_cutover_enabled === false &&
      normalized.operational_write_cutover_enabled === false &&
      normalized.dual_write_enabled === false &&
      normalized.shadow_write_enabled === false &&
      normalized.automatic_synchronisation_enabled === false &&
      normalized.automatic_schema_migration_enabled === false &&
      normalized.automatic_data_migration_enabled === false &&
      normalized.automatic_failover_enabled === false &&
      normalized.automatic_recovery_enabled === false,
    ledger_valid: ledgerValidation.valid === true,
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
      normalized.privacy.repository_content_excluded === true &&
      normalized.privacy.browser_storage_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Migration plan check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipShadowWriteVerificationReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const normalized = {
    schema: PIP_SHADOW_WRITE_VERIFICATION_SCHEMA,
    status: String(safe.status ?? "").toUpperCase(),
    verification_mode: String(safe.verification_mode ?? "").toUpperCase(),
    verified_at: normalizeIso(safe.verified_at) ?? new Date().toISOString(),
    active_repository_kind: sanitizeText(safe.active_repository_kind).toUpperCase(),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, false),
    target_repository_kind: sanitizeText(safe.target_repository_kind).toUpperCase(),
    target_adapter_active: toSafeBoolean(safe.target_adapter_active, false),
    target_adapter_configured: toSafeBoolean(safe.target_adapter_configured, false),
    connection_attempted_before: toSafeBoolean(safe.connection_attempted_before, false),
    connection_attempted_after: toSafeBoolean(safe.connection_attempted_after, false),
    requested_operation: sanitizeText(safe.requested_operation).toUpperCase(),
    controlled_error_code: sanitizeText(safe.controlled_error_code).toUpperCase(),
    durable_operation_invoked: toSafeBoolean(safe.durable_operation_invoked, false),
    production_driver_invoked: toSafeBoolean(safe.production_driver_invoked, false),
    production_network_invoked: toSafeBoolean(safe.production_network_invoked, false),
    production_write_invoked: toSafeBoolean(safe.production_write_invoked, false),
    production_append_invoked: toSafeBoolean(safe.production_append_invoked, false),
    repository_cutover_enabled: toSafeBoolean(safe.repository_cutover_enabled, false),
    dual_write_enabled: toSafeBoolean(safe.dual_write_enabled, false),
    shadow_write_enabled: toSafeBoolean(safe.shadow_write_enabled, false),
    automatic_migration_enabled: toSafeBoolean(safe.automatic_migration_enabled, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };

  const checks = {
    schema_valid: normalized.schema === PIP_SHADOW_WRITE_VERIFICATION_SCHEMA,
    status_valid:
      normalized.status === PIP_DATABASE_MIGRATION_STATUSES.VERIFIED_DISABLED,
    mode_valid:
      normalized.verification_mode ===
      PIP_SHADOW_WRITE_VERIFICATION_MODES.DENIAL_ONLY,
    invariant_valid:
      normalized.active_repository_kind === "DURABLE_FILE" &&
      normalized.durable_file_authoritative === true &&
      normalized.target_repository_kind === "PRODUCTION_DATABASE" &&
      normalized.target_adapter_active === false &&
      normalized.target_adapter_configured === false &&
      normalized.connection_attempted_before === false &&
      normalized.connection_attempted_after === false &&
      normalized.controlled_error_code === "REPOSITORY_OPERATION_DISABLED" &&
      normalized.durable_operation_invoked === false &&
      normalized.production_driver_invoked === false &&
      normalized.production_network_invoked === false &&
      normalized.production_write_invoked === false &&
      normalized.production_append_invoked === false &&
      normalized.repository_cutover_enabled === false &&
      normalized.dual_write_enabled === false &&
      normalized.shadow_write_enabled === false &&
      normalized.automatic_migration_enabled === false &&
      normalized.browser_storage_modified === false &&
      normalized.central_repository_modified === false &&
      normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Shadow write verification check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}
