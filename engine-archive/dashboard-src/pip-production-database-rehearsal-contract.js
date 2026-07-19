export const PIP_DATABASE_REHEARSAL_CONTRACT_SCHEMA =
  "pip.database-rehearsal.contract.v1";
export const PIP_DATABASE_REHEARSAL_REPORT_SCHEMA =
  "pip.database-rehearsal.report.v1";
export const PIP_DATABASE_RECONCILIATION_MANIFEST_SCHEMA =
  "pip.database-reconciliation.manifest.v1";
export const PIP_CUTOVER_BLOCK_RECEIPT_SCHEMA =
  "pip.database-cutover.block-receipt.v1";

export const PIP_DATABASE_REHEARSAL_STATUSES = Object.freeze({
  REHEARSED: "REHEARSED",
  BLOCKED: "BLOCKED",
  FAILED: "FAILED",
});

export const PIP_DATABASE_RECONCILIATION_STATUSES = Object.freeze({
  RECONCILED_EMPTY_DATASET: "RECONCILED_EMPTY_DATASET",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

export const PIP_DATABASE_REHEARSAL_MODES = Object.freeze({
  SCHEMA_ONLY_EMPTY_DATASET: "SCHEMA_ONLY_EMPTY_DATASET",
});

export const PIP_DATABASE_REHEARSAL_STAGES = Object.freeze({
  BLUEPRINT_VALIDATION: "BLUEPRINT_VALIDATION",
  DEPENDENCY_ORDER_VALIDATION: "DEPENDENCY_ORDER_VALIDATION",
  LEDGER_ALIGNMENT_VALIDATION: "LEDGER_ALIGNMENT_VALIDATION",
  EMPTY_DATASET_ENFORCEMENT: "EMPTY_DATASET_ENFORCEMENT",
  EXECUTION_SAFETY_VALIDATION: "EXECUTION_SAFETY_VALIDATION",
  PRIVACY_SANITIZATION_VALIDATION: "PRIVACY_SANITIZATION_VALIDATION",
  CUTOVER_INELIGIBILITY_VALIDATION: "CUTOVER_INELIGIBILITY_VALIDATION",
});

export const PIP_CUTOVER_BLOCK_REASONS = Object.freeze({
  PRODUCTION_DATABASE_INACTIVE: "PRODUCTION_DATABASE_INACTIVE",
  PRODUCTION_DATABASE_NOT_CONFIGURED: "PRODUCTION_DATABASE_NOT_CONFIGURED",
  PRODUCTION_CONNECTION_NOT_ATTEMPTED: "PRODUCTION_CONNECTION_NOT_ATTEMPTED",
  PRODUCTION_READ_DISABLED: "PRODUCTION_READ_DISABLED",
  PRODUCTION_WRITE_DISABLED: "PRODUCTION_WRITE_DISABLED",
  PRODUCTION_APPEND_DISABLED: "PRODUCTION_APPEND_DISABLED",
  SCHEMA_CREATION_DISABLED: "SCHEMA_CREATION_DISABLED",
  DATA_MIGRATION_DISABLED: "DATA_MIGRATION_DISABLED",
  SHADOW_WRITE_DISABLED: "SHADOW_WRITE_DISABLED",
  DUAL_WRITE_DISABLED: "DUAL_WRITE_DISABLED",
  PRODUCTION_RECONCILIATION_NOT_COMPLETED: "PRODUCTION_RECONCILIATION_NOT_COMPLETED",
  READ_CUTOVER_DISABLED: "READ_CUTOVER_DISABLED",
  WRITE_CUTOVER_DISABLED: "WRITE_CUTOVER_DISABLED",
  MANUAL_APPROVAL_NOT_PROVIDED: "MANUAL_APPROVAL_NOT_PROVIDED",
  P999_WRITE_PROTECTION_ENABLED: "P999_WRITE_PROTECTION_ENABLED",
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

export function buildPipDatabaseRehearsalContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_DATABASE_REHEARSAL_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    rehearsal_report_schema: PIP_DATABASE_REHEARSAL_REPORT_SCHEMA,
    reconciliation_manifest_schema: PIP_DATABASE_RECONCILIATION_MANIFEST_SCHEMA,
    cutover_block_receipt_schema: PIP_CUTOVER_BLOCK_RECEIPT_SCHEMA,
    statuses: { ...PIP_DATABASE_REHEARSAL_STATUSES },
    stages: { ...PIP_DATABASE_REHEARSAL_STAGES },
    reconciliation_statuses: { ...PIP_DATABASE_RECONCILIATION_STATUSES },
    rehearsal_modes: { ...PIP_DATABASE_REHEARSAL_MODES },
    cutover_block_reasons: { ...PIP_CUTOVER_BLOCK_REASONS },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,

      rehearsal_enabled: true,
      rehearsal_mode: PIP_DATABASE_REHEARSAL_MODES.SCHEMA_ONLY_EMPTY_DATASET,
      manual_rehearsal_only: true,
      deterministic_rehearsal_enabled: true,
      empty_dataset_only: true,
      reconciliation_manifest_enabled: true,
      cutover_block_verification_enabled: true,

      source_repository_kind: "DURABLE_FILE",
      target_repository_kind: "PRODUCTION_DATABASE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,

      repository_data_read_enabled: false,
      browser_storage_data_read_enabled: false,
      source_record_read_enabled: false,
      target_record_write_enabled: false,
      production_adapter_operation_enabled: false,
      production_driver_invocation_enabled: false,
      production_network_invocation_enabled: false,

      production_database_configured: false,
      production_database_connection_attempted: false,
      production_database_read_enabled: false,
      production_database_write_enabled: false,
      production_database_append_enabled: false,

      schema_creation_enabled: false,
      data_migration_enabled: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      shadow_write_enabled: false,
      dual_write_enabled: false,

      automatic_synchronisation_enabled: false,
      automatic_schema_migration_enabled: false,
      automatic_data_migration_enabled: false,
      automatic_failover_enabled: false,
      automatic_recovery_enabled: false,

      audit_event_append_enabled: false,
      rehearsal_persistence_enabled: false,
      automatic_rehearsal_enabled: false,
      polling_enabled: false,
      recurring_timer_enabled: false,
      retry_enabled: false,

      p999_write_protection: true,
      diagnostic_only: true,

      source_records_read: 0,
      target_records_written: 0,

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

export function validatePipDatabaseRehearsalContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_DATABASE_REHEARSAL_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    rehearsal_report_schema_valid:
      safe.rehearsal_report_schema === PIP_DATABASE_REHEARSAL_REPORT_SCHEMA,
    reconciliation_manifest_schema_valid:
      safe.reconciliation_manifest_schema === PIP_DATABASE_RECONCILIATION_MANIFEST_SCHEMA,
    cutover_block_receipt_schema_valid:
      safe.cutover_block_receipt_schema === PIP_CUTOVER_BLOCK_RECEIPT_SCHEMA,
    summary_valid:
      summary.authentication_configured === true &&
      summary.authentication_required === true &&
      summary.roles_configured === true &&
      summary.authorization_enforced === true &&
      summary.rehearsal_enabled === true &&
      summary.rehearsal_mode === PIP_DATABASE_REHEARSAL_MODES.SCHEMA_ONLY_EMPTY_DATASET &&
      summary.manual_rehearsal_only === true &&
      summary.deterministic_rehearsal_enabled === true &&
      summary.empty_dataset_only === true &&
      summary.reconciliation_manifest_enabled === true &&
      summary.cutover_block_verification_enabled === true &&
      summary.source_repository_kind === "DURABLE_FILE" &&
      summary.target_repository_kind === "PRODUCTION_DATABASE" &&
      summary.durable_file_authoritative === true &&
      summary.legacy_browser_storage_authoritative === true &&
      summary.repository_data_read_enabled === false &&
      summary.browser_storage_data_read_enabled === false &&
      summary.source_record_read_enabled === false &&
      summary.target_record_write_enabled === false &&
      summary.production_adapter_operation_enabled === false &&
      summary.production_driver_invocation_enabled === false &&
      summary.production_network_invocation_enabled === false &&
      summary.production_database_configured === false &&
      summary.production_database_connection_attempted === false &&
      summary.production_database_read_enabled === false &&
      summary.production_database_write_enabled === false &&
      summary.production_database_append_enabled === false &&
      summary.schema_creation_enabled === false &&
      summary.data_migration_enabled === false &&
      summary.repository_cutover_enabled === false &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false &&
      summary.shadow_write_enabled === false &&
      summary.dual_write_enabled === false &&
      summary.automatic_synchronisation_enabled === false &&
      summary.automatic_schema_migration_enabled === false &&
      summary.automatic_data_migration_enabled === false &&
      summary.automatic_failover_enabled === false &&
      summary.automatic_recovery_enabled === false &&
      summary.audit_event_append_enabled === false &&
      summary.rehearsal_persistence_enabled === false &&
      summary.automatic_rehearsal_enabled === false &&
      summary.polling_enabled === false &&
      summary.recurring_timer_enabled === false &&
      summary.retry_enabled === false &&
      summary.p999_write_protection === true &&
      summary.diagnostic_only === true &&
      toSafeInteger(summary.source_records_read, 0) === 0 &&
      toSafeInteger(summary.target_records_written, 0) === 0 &&
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
      errors.push(`Database rehearsal contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipDatabaseRehearsalContractManifest({ generatedAt: safe.generated_at })
        : null,
  };
}

function sanitizeStages(value) {
  const stages = Array.isArray(value) ? value : [];
  return stages
    .map((entry) => (isPlainObject(entry) ? entry : {}))
    .map((entry) => ({
      sequence: toSafeInteger(entry.sequence, 0),
      stage: sanitizeText(entry.stage).toUpperCase(),
      status: sanitizeText(entry.status).toUpperCase(),
      check_count: toSafeInteger(entry.check_count, 0),
      passed_check_count: toSafeInteger(entry.passed_check_count, 0),
      evidence_summary: sanitizeText(entry.evidence_summary),
    }));
}

export function validatePipDatabaseRehearsalReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const stages = sanitizeStages(safe.stages);

  const normalized = {
    schema: PIP_DATABASE_REHEARSAL_REPORT_SCHEMA,
    rehearsal_id: sanitizeText(safe.rehearsal_id),
    rehearsal_signature: sanitizeText(safe.rehearsal_signature),
    status: sanitizeText(safe.status).toUpperCase(),
    rehearsal_mode: sanitizeText(safe.rehearsal_mode).toUpperCase(),
    rehearsed_at: normalizeIso(safe.rehearsed_at) ?? new Date().toISOString(),
    source_repository_kind: sanitizeText(safe.source_repository_kind).toUpperCase(),
    target_repository_kind: sanitizeText(safe.target_repository_kind).toUpperCase(),
    logical_entity_count: toSafeInteger(safe.logical_entity_count, 0),
    logical_field_count: toSafeInteger(safe.logical_field_count, 0),
    dependency_edge_count: toSafeInteger(safe.dependency_edge_count, 0),
    migration_phase_count: toSafeInteger(safe.migration_phase_count, 0),
    source_records_read: toSafeInteger(safe.source_records_read, 0),
    target_records_written: toSafeInteger(safe.target_records_written, 0),
    fixture_records_created: toSafeInteger(safe.fixture_records_created, 0),
    repository_data_read: toSafeBoolean(safe.repository_data_read, false),
    browser_storage_data_read: toSafeBoolean(safe.browser_storage_data_read, false),
    durable_adapter_invoked: toSafeBoolean(safe.durable_adapter_invoked, false),
    production_adapter_invoked: toSafeBoolean(safe.production_adapter_invoked, false),
    production_driver_invoked: toSafeBoolean(safe.production_driver_invoked, false),
    production_network_invoked: toSafeBoolean(safe.production_network_invoked, false),
    schema_created: toSafeBoolean(safe.schema_created, false),
    data_migration_executed: toSafeBoolean(safe.data_migration_executed, false),
    shadow_write_executed: toSafeBoolean(safe.shadow_write_executed, false),
    dual_write_executed: toSafeBoolean(safe.dual_write_executed, false),
    read_cutover_executed: toSafeBoolean(safe.read_cutover_executed, false),
    write_cutover_executed: toSafeBoolean(safe.write_cutover_executed, false),
    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    audit_event_appended: toSafeBoolean(safe.audit_event_appended, false),
    stages,
  };

  const expectedStages = Object.values(PIP_DATABASE_REHEARSAL_STAGES);
  const stageSet = new Set(normalized.stages.map((entry) => entry.stage));
  const allStagesPassed = normalized.stages.every(
    (entry) => entry.status === "PASSED" && entry.check_count === entry.passed_check_count
  );

  const checks = {
    schema_valid: normalized.schema === PIP_DATABASE_REHEARSAL_REPORT_SCHEMA,
    status_valid: normalized.status === PIP_DATABASE_REHEARSAL_STATUSES.REHEARSED,
    mode_valid:
      normalized.rehearsal_mode === PIP_DATABASE_REHEARSAL_MODES.SCHEMA_ONLY_EMPTY_DATASET,
    repositories_valid:
      normalized.source_repository_kind === "DURABLE_FILE" &&
      normalized.target_repository_kind === "PRODUCTION_DATABASE",
    empty_dataset_valid:
      normalized.source_records_read === 0 &&
      normalized.target_records_written === 0 &&
      normalized.fixture_records_created === 0,
    stage_coverage_valid:
      normalized.stages.length === expectedStages.length &&
      expectedStages.every((stage) => stageSet.has(stage)) &&
      allStagesPassed,
    safety_valid:
      normalized.repository_data_read === false &&
      normalized.browser_storage_data_read === false &&
      normalized.durable_adapter_invoked === false &&
      normalized.production_adapter_invoked === false &&
      normalized.production_driver_invoked === false &&
      normalized.production_network_invoked === false &&
      normalized.schema_created === false &&
      normalized.data_migration_executed === false &&
      normalized.shadow_write_executed === false &&
      normalized.dual_write_executed === false &&
      normalized.read_cutover_executed === false &&
      normalized.write_cutover_executed === false &&
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.audit_event_appended === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Database rehearsal report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipDatabaseReconciliationManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const entities = Array.isArray(safe.entities) ? safe.entities : [];

  const normalizedEntities = entities
    .map((entry) => (isPlainObject(entry) ? entry : {}))
    .map((entry) => ({
      logical_entity_name: sanitizeText(entry.logical_entity_name),
      migration_order: toSafeInteger(entry.migration_order, 0),
      dependency_entity_count: toSafeInteger(entry.dependency_entity_count, 0),
      source_logical_field_count: toSafeInteger(entry.source_logical_field_count, 0),
      target_logical_field_count: toSafeInteger(entry.target_logical_field_count, 0),
      logical_field_count_difference: toSafeInteger(entry.logical_field_count_difference, 0),
      primary_key_definition_match: toSafeBoolean(entry.primary_key_definition_match, true),
      unique_key_definition_match: toSafeBoolean(entry.unique_key_definition_match, true),
      index_definition_match: toSafeBoolean(entry.index_definition_match, true),
      retention_definition_match: toSafeBoolean(entry.retention_definition_match, true),
      dependency_order_match: toSafeBoolean(entry.dependency_order_match, true),
      source_record_count: toSafeInteger(entry.source_record_count, 0),
      target_record_count: toSafeInteger(entry.target_record_count, 0),
      record_count_difference: toSafeInteger(entry.record_count_difference, 0),
      content_comparison_performed: toSafeBoolean(entry.content_comparison_performed, false),
      content_hash_excluded: toSafeBoolean(entry.content_hash_excluded, true),
      status: sanitizeText(entry.status).toUpperCase(),
    }));

  const normalized = {
    schema: PIP_DATABASE_RECONCILIATION_MANIFEST_SCHEMA,
    reconciliation_id: sanitizeText(safe.reconciliation_id),
    reconciliation_signature: sanitizeText(safe.reconciliation_signature),
    status: sanitizeText(safe.status).toUpperCase(),
    reconciliation_mode: sanitizeText(safe.reconciliation_mode).toUpperCase(),
    reconciled_at: normalizeIso(safe.reconciled_at) ?? new Date().toISOString(),
    logical_entity_count: toSafeInteger(safe.logical_entity_count, normalizedEntities.length),
    reconciled_entity_count: toSafeInteger(safe.reconciled_entity_count, normalizedEntities.length),
    logical_field_count: toSafeInteger(safe.logical_field_count, 0),
    field_difference_count: toSafeInteger(safe.field_difference_count, 0),
    dependency_difference_count: toSafeInteger(safe.dependency_difference_count, 0),
    record_difference_count: toSafeInteger(safe.record_difference_count, 0),
    source_records_read: toSafeInteger(safe.source_records_read, 0),
    target_records_read: toSafeInteger(safe.target_records_read, 0),
    content_comparison_performed: toSafeBoolean(safe.content_comparison_performed, false),
    production_database_configured: toSafeBoolean(safe.production_database_configured, false),
    production_connection_attempted: toSafeBoolean(safe.production_connection_attempted, false),
    repository_modified: toSafeBoolean(safe.repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    audit_event_appended: toSafeBoolean(safe.audit_event_appended, false),
    entities: normalizedEntities,
  };

  const checks = {
    schema_valid: normalized.schema === PIP_DATABASE_RECONCILIATION_MANIFEST_SCHEMA,
    status_valid:
      normalized.status === PIP_DATABASE_RECONCILIATION_STATUSES.RECONCILED_EMPTY_DATASET,
    mode_valid:
      normalized.reconciliation_mode ===
      PIP_DATABASE_REHEARSAL_MODES.SCHEMA_ONLY_EMPTY_DATASET,
    counts_valid:
      normalized.logical_entity_count === normalized.entities.length &&
      normalized.reconciled_entity_count === normalized.entities.length,
    difference_counts_valid:
      normalized.field_difference_count === 0 &&
      normalized.dependency_difference_count === 0 &&
      normalized.record_difference_count === 0,
    record_counts_valid:
      normalized.source_records_read === 0 && normalized.target_records_read === 0,
    content_excluded: normalized.content_comparison_performed === false,
    safety_valid:
      normalized.production_database_configured === false &&
      normalized.production_connection_attempted === false &&
      normalized.repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.audit_event_appended === false,
    entities_valid: normalized.entities.every(
      (entry) =>
        entry.logical_field_count_difference === 0 &&
        entry.primary_key_definition_match === true &&
        entry.unique_key_definition_match === true &&
        entry.index_definition_match === true &&
        entry.retention_definition_match === true &&
        entry.dependency_order_match === true &&
        entry.source_record_count === 0 &&
        entry.target_record_count === 0 &&
        entry.record_count_difference === 0 &&
        entry.content_comparison_performed === false &&
        entry.content_hash_excluded === true
    ),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Database reconciliation manifest check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipCutoverBlockReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};

  const normalized = {
    schema: PIP_CUTOVER_BLOCK_RECEIPT_SCHEMA,
    verification_id: sanitizeText(safe.verification_id),
    status: sanitizeText(safe.status).toUpperCase(),
    verified_at: normalizeIso(safe.verified_at) ?? new Date().toISOString(),
    source_repository_kind: sanitizeText(safe.source_repository_kind).toUpperCase(),
    target_repository_kind: sanitizeText(safe.target_repository_kind).toUpperCase(),
    active_repository_before: sanitizeText(safe.active_repository_before).toUpperCase(),
    active_repository_after: sanitizeText(safe.active_repository_after).toUpperCase(),
    active_repository_unchanged: toSafeBoolean(safe.active_repository_unchanged, true),
    durable_file_authoritative: toSafeBoolean(safe.durable_file_authoritative, true),
    production_database_active: toSafeBoolean(safe.production_database_active, false),
    production_database_configured: toSafeBoolean(safe.production_database_configured, false),
    production_connection_attempted: toSafeBoolean(safe.production_connection_attempted, false),
    production_read_enabled: toSafeBoolean(safe.production_read_enabled, false),
    production_write_enabled: toSafeBoolean(safe.production_write_enabled, false),
    production_append_enabled: toSafeBoolean(safe.production_append_enabled, false),
    schema_creation_enabled: toSafeBoolean(safe.schema_creation_enabled, false),
    data_migration_enabled: toSafeBoolean(safe.data_migration_enabled, false),
    shadow_write_enabled: toSafeBoolean(safe.shadow_write_enabled, false),
    dual_write_enabled: toSafeBoolean(safe.dual_write_enabled, false),
    read_cutover_enabled: toSafeBoolean(safe.read_cutover_enabled, false),
    write_cutover_enabled: toSafeBoolean(safe.write_cutover_enabled, false),
    production_reconciliation_completed: toSafeBoolean(
      safe.production_reconciliation_completed,
      false
    ),
    manual_approval_present: toSafeBoolean(safe.manual_approval_present, false),
    cutover_eligible: toSafeBoolean(safe.cutover_eligible, false),
    cutover_blocked: toSafeBoolean(safe.cutover_blocked, true),
    blocker_count: toSafeInteger(safe.blocker_count, 0),
    blocker_codes: Array.isArray(safe.blocker_codes)
      ? safe.blocker_codes.map((entry) => sanitizeText(entry).toUpperCase()).filter(Boolean)
      : [],
    repository_operation_invoked: toSafeBoolean(safe.repository_operation_invoked, false),
    production_adapter_invoked: toSafeBoolean(safe.production_adapter_invoked, false),
    production_driver_invoked: toSafeBoolean(safe.production_driver_invoked, false),
    production_network_invoked: toSafeBoolean(safe.production_network_invoked, false),
    central_repository_modified: toSafeBoolean(safe.central_repository_modified, false),
    browser_storage_modified: toSafeBoolean(safe.browser_storage_modified, false),
    audit_event_appended: toSafeBoolean(safe.audit_event_appended, false),
    p999_write_protection: toSafeBoolean(safe.p999_write_protection, true),
  };

  const checks = {
    schema_valid: normalized.schema === PIP_CUTOVER_BLOCK_RECEIPT_SCHEMA,
    status_valid: normalized.status === "VERIFIED_BLOCKED",
    repositories_valid:
      normalized.source_repository_kind === "DURABLE_FILE" &&
      normalized.target_repository_kind === "PRODUCTION_DATABASE" &&
      normalized.active_repository_before === "DURABLE_FILE" &&
      normalized.active_repository_after === "DURABLE_FILE" &&
      normalized.active_repository_unchanged === true &&
      normalized.durable_file_authoritative === true,
    production_safety_valid:
      normalized.production_database_active === false &&
      normalized.production_database_configured === false &&
      normalized.production_connection_attempted === false &&
      normalized.production_read_enabled === false &&
      normalized.production_write_enabled === false &&
      normalized.production_append_enabled === false,
    execution_safety_valid:
      normalized.schema_creation_enabled === false &&
      normalized.data_migration_enabled === false &&
      normalized.shadow_write_enabled === false &&
      normalized.dual_write_enabled === false &&
      normalized.read_cutover_enabled === false &&
      normalized.write_cutover_enabled === false,
    cutover_blocked_valid:
      normalized.production_reconciliation_completed === false &&
      normalized.manual_approval_present === false &&
      normalized.cutover_eligible === false &&
      normalized.cutover_blocked === true &&
      normalized.blocker_count > 0,
    invocation_valid:
      normalized.repository_operation_invoked === false &&
      normalized.production_adapter_invoked === false &&
      normalized.production_driver_invoked === false &&
      normalized.production_network_invoked === false &&
      normalized.central_repository_modified === false &&
      normalized.browser_storage_modified === false &&
      normalized.audit_event_appended === false,
    p999_valid: normalized.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (value !== true) {
      errors.push(`Cutover block receipt check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}
