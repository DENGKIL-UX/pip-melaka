import {
  PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA,
  PIP_CENTRAL_AUDIT_EVENT_TYPES,
  validatePipCentralAuditEvent,
} from "./pip-central-audit-contract.js";

export const PIP_SYSTEM_HEALTH_CONTRACT_SCHEMA =
  "pip.system-health.contract.v1";

export const PIP_SYSTEM_HEALTH_REPORT_SCHEMA =
  "pip.system-health.report.v1";

export const PIP_SYSTEM_HEALTH_ACCEPTANCE_SCHEMA =
  "pip.system-health.acceptance.v1";

export const PIP_SYSTEM_HEALTH_STATUSES = Object.freeze({
  READY: "READY",
  DEGRADED: "DEGRADED",
  UNAVAILABLE: "UNAVAILABLE",
});

export const PIP_SYSTEM_COMPONENT_STATUSES = Object.freeze({
  READY: "READY",
  DEGRADED: "DEGRADED",
  UNAVAILABLE: "UNAVAILABLE",
});

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeIso(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return null;
  }

  return new Date(Date.parse(value)).toISOString();
}

function isStatus(value) {
  return Object.values(PIP_SYSTEM_HEALTH_STATUSES).includes(
    String(value ?? "")
  );
}

function isComponentStatus(value) {
  return Object.values(PIP_SYSTEM_COMPONENT_STATUSES).includes(
    String(value ?? "")
  );
}

function hasSensitiveShape(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasSensitiveShape(entry));
  }

  if (!isPlainObject(value)) {
    if (typeof value !== "string") {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    return (
      normalized.includes("password") ||
      normalized.includes("token") ||
      normalized.includes("cookie") ||
      normalized.includes("authorization") ||
      normalized.includes("stack") ||
      normalized.includes("exception") ||
      normalized.includes("request body") ||
      normalized.includes("@")
    );
  }

  const forbiddenKeys = [
    "stack",
    "stack_trace",
    "exception_message",
    "raw_error_message",
    "password",
    "password_hash",
    "session_identifier",
    "csrf_token",
    "cookie",
    "authorization_header",
    "request_body",
    "request_query",
    "raw_url_query",
    "email",
    "voter_record",
    "voter_identifier",
    "scenario_content",
    "scenario_operational_notes",
    "browser_storage_payload",
    "absolute_path",
    "env",
    "secret",
  ];

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = String(key).trim().toLowerCase();
    if (forbiddenKeys.includes(normalizedKey)) {
      return true;
    }

    return hasSensitiveShape(nested);
  });
}

export function validatePipSystemHealthReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const components = isPlainObject(safe.components)
    ? safe.components
    : {};
  const errors = isPlainObject(safe.errors) ? safe.errors : {};
  const security = isPlainObject(safe.security)
    ? safe.security
    : {};
  const persistence = isPlainObject(safe.persistence)
    ? safe.persistence
    : {};
  const protection = isPlainObject(safe.protection)
    ? safe.protection
    : {};

  const requiredComponents = [
    "authentication",
    "authorization",
    "scenario_store",
    "audit_store",
    "error_logger",
  ];

  const checks = {
    schema_valid: safe.schema === PIP_SYSTEM_HEALTH_REPORT_SCHEMA,
    status_valid: isStatus(safe.status),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    uptime_seconds_valid:
      Number.isFinite(Number(safe.uptime_seconds)) &&
      Number(safe.uptime_seconds) >= 0,
    components_valid: requiredComponents.every((key) =>
      isComponentStatus(components?.[key]?.status)
    ),
    errors_shape_valid:
      Number.isInteger(Number(errors.total_error_events)) &&
      Number.isInteger(Number(errors.recent_error_events_15m)) &&
      Number.isInteger(Number(errors.info_count)) &&
      Number.isInteger(Number(errors.warning_count)) &&
      Number.isInteger(Number(errors.error_count)) &&
      Number.isInteger(Number(errors.critical_count)) &&
      Number.isInteger(Number(errors.request_failure_count)) &&
      Number.isInteger(Number(errors.storage_error_count)) &&
      Number.isInteger(Number(errors.validation_error_count)),
    errors_latest_timestamp_valid:
      errors.latest_error_at === null ||
      normalizeIso(errors.latest_error_at) !== null,
    security_flags_valid:
      security.authentication_configured === true &&
      security.authentication_required === true &&
      security.roles_configured === true &&
      security.authorization_enforced === true &&
      security.error_redaction_enforced === true &&
      security.credential_material_excluded === true,
    persistence_flags_valid:
      typeof persistence.scenario_storage_mode === "string" &&
      typeof persistence.audit_storage_mode === "string" &&
      persistence.audit_append_only === true &&
      persistence.central_persistence_enabled === true &&
      persistence.legacy_browser_storage_authoritative === true &&
      persistence.operational_read_cutover_enabled === false &&
      persistence.operational_write_cutover_enabled === false &&
      persistence.automatic_synchronisation_enabled === false,
    p999_protection_valid:
      protection.p999_write_protection === true,
    sensitive_material_absent: !hasSensitiveShape(safe),
  };

  const issues = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      issues.push(`System health report check failed: ${key}`);
    }
  });

  return {
    valid: issues.length === 0,
    checks,
    errors: issues,
    normalized: {
      ...safe,
      generated_at:
        normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      errors: {
        ...errors,
        latest_error_at: normalizeIso(errors.latest_error_at) ?? null,
      },
    },
  };
}

export function validatePipSystemHealthAcceptanceReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};

  const reportValidation = validatePipSystemHealthReport(
    safe.report
  );
  const eventValidation = validatePipCentralAuditEvent(safe.event);

  const checks = {
    schema_valid:
      safe.schema === PIP_SYSTEM_HEALTH_ACCEPTANCE_SCHEMA,
    accepted_valid: safe.accepted === true,
    report_valid: reportValidation.valid === true,
    event_valid: eventValidation.valid === true,
    event_type_valid:
      safe.event?.event_type ===
      PIP_CENTRAL_AUDIT_EVENT_TYPES.SYSTEM_HEALTH_REPORT_GENERATED,
    write_readback_valid:
      safe.write_readback_verified === true,
    report_validation_passed_valid:
      safe.report_validation_passed === true,
    durable_audit_persistence_enabled_valid:
      safe.durable_audit_persistence_enabled === true,
    security_flags_valid:
      safe.security_flags_valid === true,
    cutover_flags_valid:
      safe.cutover_flags_valid === true,
    p999_protection_valid: safe.p999_protection === true,
    sensitive_content_excluded_valid:
      safe.sensitive_content_excluded === true,
    legacy_storage_preserved_valid:
      safe.legacy_storage_preserved !== false,
    received_at_valid: normalizeIso(safe.received_at) !== null,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`System health acceptance check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_SYSTEM_HEALTH_ACCEPTANCE_SCHEMA,
      accepted: safe.accepted === true,
      report: reportValidation.normalized,
      event: eventValidation.normalized,
      write_readback_verified:
        safe.write_readback_verified === true,
      report_validation_passed:
        safe.report_validation_passed === true,
      durable_audit_persistence_enabled:
        safe.durable_audit_persistence_enabled === true,
      security_flags_valid: safe.security_flags_valid === true,
      cutover_flags_valid: safe.cutover_flags_valid === true,
      p999_protection: safe.p999_protection === true,
      sensitive_content_excluded:
        safe.sensitive_content_excluded === true,
      legacy_storage_preserved:
        safe.legacy_storage_preserved !== false,
      received_at:
        normalizeIso(safe.received_at) ?? new Date().toISOString(),
    },
  };
}

export function buildPipSystemHealthContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_SYSTEM_HEALTH_CONTRACT_SCHEMA,
    generated_at:
      normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_SYSTEM_HEALTH_REPORT_SCHEMA,
    acceptance_schema: PIP_SYSTEM_HEALTH_ACCEPTANCE_SCHEMA,
    central_audit_contract_schema: PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA,
    statuses: {
      ...PIP_SYSTEM_HEALTH_STATUSES,
    },
    component_statuses: {
      ...PIP_SYSTEM_COMPONENT_STATUSES,
    },
    constraints: {
      descriptive_only: true,
      no_polling: true,
      no_alert_dispatch: true,
      no_recovery_automation: true,
      redact_raw_error_material: true,
      credential_material_excluded: true,
      p999_acceptance_rejected: true,
    },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      central_audit_append_only: true,
      central_persistence_enabled: true,
      legacy_browser_storage_authoritative: true,
    },
  };
}

export function validatePipSystemHealthContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_SYSTEM_HEALTH_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid:
      safe.report_schema === PIP_SYSTEM_HEALTH_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema === PIP_SYSTEM_HEALTH_ACCEPTANCE_SCHEMA,
    central_audit_contract_schema_valid:
      safe.central_audit_contract_schema ===
      PIP_CENTRAL_AUDIT_CONTRACT_SCHEMA,
    statuses_valid:
      isPlainObject(safe.statuses) &&
      Object.values(PIP_SYSTEM_HEALTH_STATUSES).every((value) =>
        Object.values(safe.statuses).includes(value)
      ),
    component_statuses_valid:
      isPlainObject(safe.component_statuses) &&
      Object.values(PIP_SYSTEM_COMPONENT_STATUSES).every((value) =>
        Object.values(safe.component_statuses).includes(value)
      ),
    descriptive_only_valid:
      safe.constraints?.descriptive_only === true,
    no_polling_valid: safe.constraints?.no_polling === true,
    no_alert_dispatch_valid:
      safe.constraints?.no_alert_dispatch === true,
    no_recovery_automation_valid:
      safe.constraints?.no_recovery_automation === true,
    redaction_constraint_valid:
      safe.constraints?.redact_raw_error_material === true,
    credential_exclusion_constraint_valid:
      safe.constraints?.credential_material_excluded === true,
    p999_constraint_valid:
      safe.constraints?.p999_acceptance_rejected === true,
    summary_security_valid:
      safe.summary?.authentication_configured === true &&
      safe.summary?.authentication_required === true &&
      safe.summary?.roles_configured === true &&
      safe.summary?.authorization_enforced === true,
    summary_cutover_sync_valid:
      safe.summary?.operational_read_cutover_enabled === false &&
      safe.summary?.operational_write_cutover_enabled === false &&
      safe.summary?.automatic_synchronisation_enabled === false,
    summary_persistence_valid:
      safe.summary?.central_audit_append_only === true &&
      safe.summary?.central_persistence_enabled === true &&
      safe.summary?.legacy_browser_storage_authoritative === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`System health contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}
