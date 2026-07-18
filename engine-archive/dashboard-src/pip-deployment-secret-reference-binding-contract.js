export const PIP_SECRET_REFERENCE_BINDING_CONTRACT_SCHEMA =
  "pip.secret-reference-binding.contract.v1";
export const PIP_SECRET_REFERENCE_BINDING_REPORT_SCHEMA =
  "pip.secret-reference-binding.report.v1";
export const PIP_SECRET_REFERENCE_BINDING_ACCEPTANCE_SCHEMA =
  "pip.secret-reference-binding.acceptance.v1";

export const PIP_SECRET_REFERENCE_BINDING_STATUSES = Object.freeze({
  NOT_READY: "NOT_READY",
  READY_FOR_EXTERNAL_SECRET_CONFIGURATION:
    "READY_FOR_EXTERNAL_SECRET_CONFIGURATION",
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

function sanitizeClassifications(value) {
  const safe = isPlainObject(value) ? value : {};
  return {
    dependency_state:
      sanitizeText(safe.dependency_state).toUpperCase() ||
      "DEPENDENCY_PENDING",
    binding_profile:
      sanitizeText(safe.binding_profile).toUpperCase() ||
      "REFERENCE_ONLY_READINESS",
    compatibility_level:
      sanitizeText(safe.compatibility_level).toUpperCase() ||
      "PROVIDER_NEUTRAL",
  };
}

function buildSafetyFlags(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    raw_reference_names_exposed: false,
    secret_values_read: false,
    environment_values_read: false,
    connection_values_read: false,
    credential_values_read: false,

    database_driver_invoked: false,
    database_adapter_invoked: false,
    network_resolution_invoked: false,
    outbound_network_invoked: false,
    sql_execution_invoked: false,
    ddl_execution_invoked: false,
    schema_creation_invoked: false,
    migration_invoked: false,
    binding_activation_performed: false,
    binding_mutation_performed: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_synchronisation_enabled: false,
    automatic_binding_enabled: false,
    automatic_secret_resolution_enabled: false,

    p999_write_protection: toSafeBoolean(
      safe.p999_write_protection,
      true
    ),
    active_repository_kind:
      sanitizeText(safe.active_repository_kind).toUpperCase() ||
      "DURABLE_FILE",
    durable_file_authoritative: toSafeBoolean(
      safe.durable_file_authoritative,
      true
    ),
  };
}

export function buildPipSecretReferenceBindingContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_SECRET_REFERENCE_BINDING_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_SECRET_REFERENCE_BINDING_REPORT_SCHEMA,
    acceptance_schema: PIP_SECRET_REFERENCE_BINDING_ACCEPTANCE_SCHEMA,
    statuses: { ...PIP_SECRET_REFERENCE_BINDING_STATUSES },
    summary: {
      binding_readiness_enabled: true,
      binding_readiness_read_only: true,
      manual_inspection_only: true,
      manual_acknowledgement_only: true,
      reference_registry_dependency_required: true,
      binding_readiness_dependency_required: true,
      secret_provider_adapter_dependency_required: true,
      abstract_slot_mapping_enabled: true,
      raw_reference_names_excluded: true,
      secret_reference_values_excluded: true,
      secret_values_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      infrastructure_values_excluded: true,
      user_identity_values_excluded: true,
      request_content_excluded: true,
      raw_errors_excluded: true,

      database_driver_invoked: false,
      database_adapter_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      schema_creation_invoked: false,
      migration_invoked: false,
      binding_activation_performed: false,
      binding_mutation_performed: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_binding_enabled: false,
      automatic_secret_resolution_enabled: false,
      p999_write_protection: true,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
    },
  };
}

export function buildPipSecretReferenceBindingReport(input = {}) {
  const safe = isPlainObject(input) ? input : {};

  const requiredSlotCount = toSafeInteger(safe.required_slot_count, 0);
  const registeredSlotCount = toSafeInteger(safe.registered_slot_count, 0);
  const missingSlotCount = toSafeInteger(
    safe.missing_slot_count,
    Math.max(0, requiredSlotCount - registeredSlotCount)
  );
  const duplicateSlotCount = toSafeInteger(safe.duplicate_slot_count, 0);
  const incompatibleSlotCount = toSafeInteger(
    safe.incompatible_slot_count,
    0
  );
  const eligibleSlotCount = Math.max(
    0,
    registeredSlotCount - duplicateSlotCount - incompatibleSlotCount
  );
  const dependencyCheckCount = 3;
  const passedDependencyCheckCount = toSafeInteger(
    safe.passed_dependency_check_count,
    Number(safe.reference_registry_ready === true) +
      Number(safe.database_binding_readiness_ready === true) +
      Number(safe.secret_provider_adapter_ready === true)
  );

  const readinessResult =
    toSafeBoolean(safe.readiness_result, false) &&
    missingSlotCount === 0 &&
    duplicateSlotCount === 0 &&
    incompatibleSlotCount === 0;

  return {
    schema: PIP_SECRET_REFERENCE_BINDING_REPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    status: readinessResult
      ? PIP_SECRET_REFERENCE_BINDING_STATUSES.READY_FOR_EXTERNAL_SECRET_CONFIGURATION
      : PIP_SECRET_REFERENCE_BINDING_STATUSES.NOT_READY,

    readiness_result: readinessResult,
    reference_registry_ready: toSafeBoolean(
      safe.reference_registry_ready,
      false
    ),
    database_binding_readiness_ready: toSafeBoolean(
      safe.database_binding_readiness_ready,
      false
    ),
    secret_provider_adapter_ready: toSafeBoolean(
      safe.secret_provider_adapter_ready,
      false
    ),

    required_slot_count: requiredSlotCount,
    registered_slot_count: registeredSlotCount,
    eligible_slot_count: eligibleSlotCount,
    missing_slot_count: missingSlotCount,
    duplicate_slot_count: duplicateSlotCount,
    incompatible_slot_count: incompatibleSlotCount,
    abstract_binding_count: toSafeInteger(
      safe.abstract_binding_count,
      eligibleSlotCount
    ),
    dependency_check_count: dependencyCheckCount,
    passed_dependency_check_count: Math.min(
      dependencyCheckCount,
      Math.max(0, passedDependencyCheckCount)
    ),

    sanitized_classifications: sanitizeClassifications(
      safe.sanitized_classifications
    ),
    safety_flags: buildSafetyFlags(safe.safety_flags),
  };
}

export function buildPipSecretReferenceBindingAcceptanceReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const report = buildPipSecretReferenceBindingReport(safe.report);

  return {
    schema: PIP_SECRET_REFERENCE_BINDING_ACCEPTANCE_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    status: report.status,
    readiness_result: report.readiness_result === true,
    acknowledgement_changed: toSafeBoolean(
      safe.acknowledgement_changed,
      false
    ),
    result_code: sanitizeText(safe.result_code).toUpperCase() || "NO_CHANGE",
    acknowledged_at: normalizeIso(safe.acknowledged_at),
    acknowledged_by_role:
      sanitizeText(safe.acknowledged_by_role).toUpperCase() ||
      "ADMINISTRATOR",
    report_signature:
      sanitizeText(safe.report_signature).toLowerCase() || "",
    safety_flags: report.safety_flags,
  };
}

export function validatePipSecretReferenceBindingContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_SECRET_REFERENCE_BINDING_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid:
      safe.report_schema === PIP_SECRET_REFERENCE_BINDING_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema === PIP_SECRET_REFERENCE_BINDING_ACCEPTANCE_SCHEMA,

    binding_readiness_enabled: summary.binding_readiness_enabled === true,
    binding_readiness_read_only:
      summary.binding_readiness_read_only === true,
    manual_inspection_only: summary.manual_inspection_only === true,
    manual_acknowledgement_only:
      summary.manual_acknowledgement_only === true,
    dependency_required:
      summary.reference_registry_dependency_required === true &&
      summary.binding_readiness_dependency_required === true &&
      summary.secret_provider_adapter_dependency_required === true,
    abstract_slot_mapping_enabled:
      summary.abstract_slot_mapping_enabled === true,
    exclusions_enabled:
      summary.raw_reference_names_excluded === true &&
      summary.secret_reference_values_excluded === true &&
      summary.secret_values_excluded === true &&
      summary.environment_values_excluded === true &&
      summary.connection_values_excluded === true &&
      summary.credential_values_excluded === true &&
      summary.infrastructure_values_excluded === true &&
      summary.user_identity_values_excluded === true &&
      summary.request_content_excluded === true &&
      summary.raw_errors_excluded === true,
    runtime_ops_disabled:
      summary.database_driver_invoked === false &&
      summary.database_adapter_invoked === false &&
      summary.network_resolution_invoked === false &&
      summary.outbound_network_invoked === false &&
      summary.sql_execution_invoked === false &&
      summary.ddl_execution_invoked === false &&
      summary.schema_creation_invoked === false &&
      summary.migration_invoked === false &&
      summary.binding_activation_performed === false &&
      summary.binding_mutation_performed === false,
    cutover_disabled:
      summary.repository_cutover_enabled === false &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false,
    automatic_ops_disabled:
      summary.automatic_synchronisation_enabled === false &&
      summary.automatic_binding_enabled === false &&
      summary.automatic_secret_resolution_enabled === false,
    p999_protection: summary.p999_write_protection === true,
    durable_repository:
      summary.active_repository_kind === "DURABLE_FILE" &&
      summary.durable_file_authoritative === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Secret reference binding contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized:
      errors.length === 0
        ? buildPipSecretReferenceBindingContractManifest({
            generatedAt: safe.generated_at,
          })
        : null,
  };
}

export function validatePipSecretReferenceBindingReport(report) {
  const normalized = buildPipSecretReferenceBindingReport(report);
  const flags = isPlainObject(normalized.safety_flags)
    ? normalized.safety_flags
    : {};

  const checks = {
    schema_valid: normalized.schema === PIP_SECRET_REFERENCE_BINDING_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    status_valid: Object.values(PIP_SECRET_REFERENCE_BINDING_STATUSES).includes(
      normalized.status
    ),
    readiness_result_boolean:
      typeof normalized.readiness_result === "boolean",
    dependency_booleans:
      typeof normalized.reference_registry_ready === "boolean" &&
      typeof normalized.database_binding_readiness_ready === "boolean" &&
      typeof normalized.secret_provider_adapter_ready === "boolean",
    slot_counts_consistent:
      normalized.required_slot_count >= 0 &&
      normalized.registered_slot_count >= 0 &&
      normalized.eligible_slot_count >= 0 &&
      normalized.missing_slot_count >= 0 &&
      normalized.duplicate_slot_count >= 0 &&
      normalized.incompatible_slot_count >= 0,
    dependency_check_consistent:
      normalized.dependency_check_count >=
        normalized.passed_dependency_check_count &&
      normalized.dependency_check_count === 3,
    no_sensitive_runtime_ops:
      flags.raw_reference_names_exposed === false &&
      flags.secret_values_read === false &&
      flags.environment_values_read === false &&
      flags.connection_values_read === false &&
      flags.credential_values_read === false &&
      flags.database_driver_invoked === false &&
      flags.database_adapter_invoked === false &&
      flags.network_resolution_invoked === false &&
      flags.outbound_network_invoked === false &&
      flags.sql_execution_invoked === false &&
      flags.ddl_execution_invoked === false &&
      flags.schema_creation_invoked === false &&
      flags.migration_invoked === false &&
      flags.binding_activation_performed === false &&
      flags.binding_mutation_performed === false,
    cutover_disabled:
      flags.repository_cutover_enabled === false &&
      flags.operational_read_cutover_enabled === false &&
      flags.operational_write_cutover_enabled === false,
    automatic_ops_disabled:
      flags.automatic_synchronisation_enabled === false &&
      flags.automatic_binding_enabled === false &&
      flags.automatic_secret_resolution_enabled === false,
    p999_protected: flags.p999_write_protection === true,
    durable_repository:
      flags.active_repository_kind === "DURABLE_FILE" &&
      flags.durable_file_authoritative === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Secret reference binding report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipSecretReferenceBindingAcceptanceReceipt(receipt) {
  const normalized = buildPipSecretReferenceBindingAcceptanceReceipt(receipt);

  const checks = {
    schema_valid:
      normalized.schema === PIP_SECRET_REFERENCE_BINDING_ACCEPTANCE_SCHEMA,
    generated_at_valid: normalizeIso(normalized.generated_at) !== null,
    status_valid: Object.values(PIP_SECRET_REFERENCE_BINDING_STATUSES).includes(
      normalized.status
    ),
    readiness_result_boolean:
      typeof normalized.readiness_result === "boolean",
    result_code_present: sanitizeText(normalized.result_code).length > 0,
    acknowledged_at_optional_valid:
      normalized.acknowledged_at === null ||
      normalizeIso(normalized.acknowledged_at) !== null,
    report_signature_sanitized:
      typeof normalized.report_signature === "string" &&
      /^[a-f0-9]{0,128}$/.test(normalized.report_signature),
    safety_flags_valid:
      validatePipSecretReferenceBindingReport({
        ...normalized,
        schema: PIP_SECRET_REFERENCE_BINDING_REPORT_SCHEMA,
        generated_at: normalized.generated_at,
        status: normalized.status,
        readiness_result: normalized.readiness_result,
        reference_registry_ready: true,
        database_binding_readiness_ready: true,
        secret_provider_adapter_ready: true,
        required_slot_count: 0,
        registered_slot_count: 0,
        eligible_slot_count: 0,
        missing_slot_count: 0,
        duplicate_slot_count: 0,
        incompatible_slot_count: 0,
        abstract_binding_count: 0,
        dependency_check_count: 3,
        passed_dependency_check_count: 3,
        sanitized_classifications: {
          dependency_state: "DEPENDENCY_READY",
          binding_profile: "REFERENCE_ONLY_READINESS",
          compatibility_level: "PROVIDER_NEUTRAL",
        },
        safety_flags: normalized.safety_flags,
      }).checks.no_sensitive_runtime_ops === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(
        `Secret reference binding acceptance receipt check failed: ${key}`
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
