import {
  PIP_CENTRAL_AUDIT_EVENT_TYPES,
  validatePipCentralAuditEvent,
} from "./pip-central-audit-contract.js";

export const PIP_DEPLOYMENT_READINESS_CONTRACT_SCHEMA =
  "pip.deployment-readiness.contract.v1";

export const PIP_DEPLOYMENT_READINESS_REPORT_SCHEMA =
  "pip.deployment-readiness.report.v1";

export const PIP_DEPLOYMENT_READINESS_ACCEPTANCE_SCHEMA =
  "pip.deployment-readiness.acceptance.v1";

export const PIP_DEPLOYMENT_READINESS_STATUSES = Object.freeze({
  READY: "READY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_DEPLOYMENT_TARGET_ENVIRONMENTS = Object.freeze({
  LOCAL_DEVELOPMENT: "LOCAL_DEVELOPMENT",
  STAGING: "STAGING",
  PRODUCTION: "PRODUCTION",
});

export const PIP_DEPLOYMENT_CHECK_STATUSES = Object.freeze({
  PASS: "PASS",
  REVIEW: "REVIEW",
  BLOCKED: "BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
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

function isReportStatus(value) {
  return Object.values(PIP_DEPLOYMENT_READINESS_STATUSES).includes(
    String(value ?? "")
  );
}

function isTargetEnvironment(value) {
  return Object.values(PIP_DEPLOYMENT_TARGET_ENVIRONMENTS).includes(
    String(value ?? "")
  );
}

function isCheckStatus(value) {
  return Object.values(PIP_DEPLOYMENT_CHECK_STATUSES).includes(
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
      normalized.includes("secret=") ||
      normalized.includes("csrf_token") ||
      normalized.includes("set-cookie") ||
      normalized.includes("authorization:") ||
      normalized.includes("bearer ") ||
      normalized.includes("private key") ||
      normalized.includes("db_") ||
      normalized.includes("api_key") ||
      normalized.includes("process.env") ||
      normalized.includes("stack") ||
      normalized.includes("exception") ||
      normalized.includes("localstorage") ||
      normalized.includes("sessionstorage") ||
      normalized.includes(":\\") ||
      normalized.includes("/users/") ||
      normalized.includes("/home/")
    );
  }

  const forbiddenKeys = [
    "password",
    "password_hash",
    "session_secret",
    "signing_secret",
    "csrf_token",
    "cookie",
    "authorization_header",
    "session_identifier",
    "token",
    "private_key",
    "credentials",
    "database_credentials",
    "api_credentials",
    "absolute_path",
    "process_env",
    "raw_environment",
    "raw_voter_records",
    "voter_identifiers",
    "scenario_content",
    "browser_storage_payload",
    "stack_trace",
    "raw_exception_message",
  ];

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = String(key).trim().toLowerCase();
    if (forbiddenKeys.includes(normalizedKey)) {
      return true;
    }

    return hasSensitiveShape(nested);
  });
}

function validateCheckEntry(check) {
  const safeCheck = isPlainObject(check) ? check : {};

  return (
    typeof safeCheck.check_id === "string" &&
    safeCheck.check_id.trim().length > 0 &&
    typeof safeCheck.category === "string" &&
    safeCheck.category.trim().length > 0 &&
    typeof safeCheck.label === "string" &&
    safeCheck.label.trim().length > 0 &&
    isCheckStatus(safeCheck.status) &&
    typeof safeCheck.required === "boolean" &&
    typeof safeCheck.safe_message === "string" &&
    safeCheck.safe_message.trim().length > 0
  );
}

function summarizeChecks(checks) {
  const safeChecks = Array.isArray(checks) ? checks : [];

  const summary = {
    total_checks: safeChecks.length,
    passed_checks: 0,
    review_checks: 0,
    blocked_checks: 0,
    required_checks_passed: true,
  };

  safeChecks.forEach((check) => {
    const status = String(check?.status ?? "");
    if (status === PIP_DEPLOYMENT_CHECK_STATUSES.PASS) {
      summary.passed_checks += 1;
    } else if (status === PIP_DEPLOYMENT_CHECK_STATUSES.REVIEW) {
      summary.review_checks += 1;
    } else if (status === PIP_DEPLOYMENT_CHECK_STATUSES.BLOCKED) {
      summary.blocked_checks += 1;
    }

    if (
      check?.required === true &&
      status !== PIP_DEPLOYMENT_CHECK_STATUSES.PASS
    ) {
      summary.required_checks_passed = false;
    }
  });

  return summary;
}

function deriveStatusFromChecks(checkSummary) {
  if (
    checkSummary.blocked_checks > 0 ||
    checkSummary.required_checks_passed !== true
  ) {
    return PIP_DEPLOYMENT_READINESS_STATUSES.BLOCKED;
  }

  if (checkSummary.review_checks > 0) {
    return PIP_DEPLOYMENT_READINESS_STATUSES.REVIEW_REQUIRED;
  }

  return PIP_DEPLOYMENT_READINESS_STATUSES.READY;
}

export function validatePipDeploymentReadinessReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const runtime = isPlainObject(safe.runtime) ? safe.runtime : {};
  const network = isPlainObject(safe.network) ? safe.network : {};
  const security = isPlainObject(safe.security) ? safe.security : {};
  const persistence = isPlainObject(safe.persistence)
    ? safe.persistence
    : {};
  const operations = isPlainObject(safe.operations) ? safe.operations : {};
  const protection = isPlainObject(safe.protection) ? safe.protection : {};
  const checksList = Array.isArray(safe.checks) ? safe.checks : [];

  const computedSummary = summarizeChecks(checksList);
  const safeSummary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_DEPLOYMENT_READINESS_REPORT_SCHEMA,
    status_valid: isReportStatus(safe.status),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    target_environment_valid: isTargetEnvironment(safe.target_environment),
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    runtime_valid:
      typeof runtime.runtime_name === "string" &&
      runtime.runtime_name.trim().length > 0 &&
      typeof runtime.runtime_version_supported === "boolean" &&
      typeof runtime.process_environment_classified === "boolean" &&
      Number.isFinite(Number(runtime.uptime_seconds)) &&
      Number(runtime.uptime_seconds) >= 0,
    network_valid:
      typeof network.api_base_path_configured === "boolean" &&
      typeof network.trusted_origin_policy_configured === "boolean" &&
      typeof network.cors_policy_configured === "boolean" &&
      typeof network.reverse_proxy_declared === "boolean" &&
      typeof network.https_termination_declared === "boolean" &&
      typeof network.secure_cookie_mode_enabled === "boolean",
    security_valid:
      security.authentication_configured === true &&
      security.authentication_required === true &&
      security.roles_configured === true &&
      security.authorization_enforced === true &&
      typeof security.session_signing_material_configured === "boolean" &&
      typeof security.csrf_protection_configured === "boolean" &&
      security.credential_values_redacted === true &&
      security.environment_values_redacted === true,
    persistence_valid:
      typeof persistence.scenario_storage_mode === "string" &&
      typeof persistence.audit_storage_mode === "string" &&
      typeof persistence.scenario_store_ready === "boolean" &&
      typeof persistence.audit_store_ready === "boolean" &&
      persistence.audit_append_only === true &&
      persistence.central_persistence_enabled === true &&
      persistence.legacy_browser_storage_authoritative === true &&
      persistence.operational_read_cutover_enabled === false &&
      persistence.operational_write_cutover_enabled === false &&
      persistence.automatic_synchronisation_enabled === false,
    operations_valid:
      typeof operations.health_reporting_available === "boolean" &&
      typeof operations.operational_alerts_available === "boolean" &&
      typeof operations.safe_error_logging_available === "boolean" &&
      operations.manual_readiness_check_only === true &&
      operations.automatic_deployment_enabled === false &&
      operations.automatic_restart_enabled === false &&
      operations.shell_execution_enabled === false &&
      operations.outbound_network_check_enabled === false,
    protection_valid: protection.p999_write_protection === true,
    checks_valid: checksList.every((check) => validateCheckEntry(check)),
    summary_valid:
      Number(safeSummary.total_checks) === computedSummary.total_checks &&
      Number(safeSummary.passed_checks) === computedSummary.passed_checks &&
      Number(safeSummary.review_checks) === computedSummary.review_checks &&
      Number(safeSummary.blocked_checks) === computedSummary.blocked_checks &&
      safeSummary.required_checks_passed ===
        computedSummary.required_checks_passed,
    status_matches_checks:
      String(safe.status ?? "") ===
      deriveStatusFromChecks(computedSummary),
    sensitive_content_absent: !hasSensitiveShape(safe),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(
        `Deployment readiness report check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at:
        normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      summary: {
        total_checks: computedSummary.total_checks,
        passed_checks: computedSummary.passed_checks,
        review_checks: computedSummary.review_checks,
        blocked_checks: computedSummary.blocked_checks,
        required_checks_passed:
          computedSummary.required_checks_passed,
      },
      checks: checksList,
    },
  };
}

export function validatePipDeploymentReadinessAcceptanceReceipt(
  receipt
) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const reportValidation = validatePipDeploymentReadinessReport(
    safe.report
  );
  const eventValidation = validatePipCentralAuditEvent(safe.event);

  const checks = {
    schema_valid:
      safe.schema === PIP_DEPLOYMENT_READINESS_ACCEPTANCE_SCHEMA,
    accepted_valid: safe.accepted === true,
    report_valid: reportValidation.valid === true,
    event_valid: eventValidation.valid === true,
    event_type_valid:
      safe.event?.event_type ===
      PIP_CENTRAL_AUDIT_EVENT_TYPES.DEPLOYMENT_READINESS_ACCEPTANCE_RECORDED,
    readiness_status_valid:
      String(safe.readiness_status ?? "") !==
      PIP_DEPLOYMENT_READINESS_STATUSES.BLOCKED,
    report_validation_passed_valid:
      safe.report_validation_passed === true,
    safe_configuration_inspection_passed_valid:
      safe.safe_configuration_inspection_passed === true,
    secret_redaction_passed_valid:
      safe.secret_redaction_passed === true,
    write_readback_valid: safe.write_readback_verified === true,
    durable_audit_readback_valid:
      safe.durable_audit_readback_verified === true,
    security_flags_valid: safe.security_flags_valid === true,
    cutover_flags_valid: safe.cutover_flags_valid === true,
    p999_protection_valid: safe.p999_protection === true,
    automatic_deployment_disabled_valid:
      safe.automatic_deployment_enabled === false,
    automatic_restart_disabled_valid:
      safe.automatic_restart_enabled === false,
    shell_execution_disabled_valid:
      safe.shell_execution_enabled === false,
    outbound_network_check_disabled_valid:
      safe.outbound_network_check_enabled === false,
    legacy_storage_preserved_valid:
      safe.legacy_storage_preserved !== false,
    received_at_valid: normalizeIso(safe.received_at) !== null,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(
        `Deployment readiness acceptance check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_DEPLOYMENT_READINESS_ACCEPTANCE_SCHEMA,
      accepted: safe.accepted === true,
      report: reportValidation.normalized,
      event: eventValidation.normalized,
      readiness_status: String(
        safe.readiness_status ?? reportValidation.normalized?.status ?? ""
      ),
      report_validation_passed:
        safe.report_validation_passed === true,
      safe_configuration_inspection_passed:
        safe.safe_configuration_inspection_passed === true,
      secret_redaction_passed:
        safe.secret_redaction_passed === true,
      write_readback_verified:
        safe.write_readback_verified === true,
      durable_audit_readback_verified:
        safe.durable_audit_readback_verified === true,
      security_flags_valid: safe.security_flags_valid === true,
      cutover_flags_valid: safe.cutover_flags_valid === true,
      p999_protection: safe.p999_protection === true,
      automatic_deployment_enabled:
        safe.automatic_deployment_enabled === true,
      automatic_restart_enabled:
        safe.automatic_restart_enabled === true,
      shell_execution_enabled:
        safe.shell_execution_enabled === true,
      outbound_network_check_enabled:
        safe.outbound_network_check_enabled === true,
      legacy_storage_preserved:
        safe.legacy_storage_preserved !== false,
      received_at:
        normalizeIso(safe.received_at) ?? new Date().toISOString(),
    },
  };
}

export function buildPipDeploymentReadinessContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_DEPLOYMENT_READINESS_CONTRACT_SCHEMA,
    generated_at:
      normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_DEPLOYMENT_READINESS_REPORT_SCHEMA,
    acceptance_schema: PIP_DEPLOYMENT_READINESS_ACCEPTANCE_SCHEMA,
    statuses: {
      ...PIP_DEPLOYMENT_READINESS_STATUSES,
    },
    target_environments: {
      ...PIP_DEPLOYMENT_TARGET_ENVIRONMENTS,
    },
    check_statuses: {
      ...PIP_DEPLOYMENT_CHECK_STATUSES,
    },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      legacy_browser_storage_authoritative: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      p999_write_protection: true,
      automatic_deployment_enabled: false,
      automatic_restart_enabled: false,
      shell_execution_enabled: false,
      outbound_network_check_enabled: false,
      environment_values_redacted: true,
      diagnostic_only: true,
    },
  };
}

export function validatePipDeploymentReadinessContractManifest(
  manifest
) {
  const safe = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_DEPLOYMENT_READINESS_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid:
      safe.report_schema === PIP_DEPLOYMENT_READINESS_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema ===
      PIP_DEPLOYMENT_READINESS_ACCEPTANCE_SCHEMA,
    statuses_valid:
      isPlainObject(safe.statuses) &&
      Object.values(PIP_DEPLOYMENT_READINESS_STATUSES).every((value) =>
        Object.values(safe.statuses).includes(value)
      ),
    target_environments_valid:
      isPlainObject(safe.target_environments) &&
      Object.values(PIP_DEPLOYMENT_TARGET_ENVIRONMENTS).every(
        (value) => Object.values(safe.target_environments).includes(value)
      ),
    check_statuses_valid:
      isPlainObject(safe.check_statuses) &&
      Object.values(PIP_DEPLOYMENT_CHECK_STATUSES).every((value) =>
        Object.values(safe.check_statuses).includes(value)
      ),
    summary_security_valid:
      safe.summary?.authentication_configured === true &&
      safe.summary?.authentication_required === true &&
      safe.summary?.roles_configured === true &&
      safe.summary?.authorization_enforced === true,
    summary_storage_valid:
      safe.summary?.legacy_browser_storage_authoritative === true &&
      safe.summary?.operational_read_cutover_enabled === false &&
      safe.summary?.operational_write_cutover_enabled === false &&
      safe.summary?.automatic_synchronisation_enabled === false &&
      safe.summary?.p999_write_protection === true,
    summary_execution_valid:
      safe.summary?.automatic_deployment_enabled === false &&
      safe.summary?.automatic_restart_enabled === false &&
      safe.summary?.shell_execution_enabled === false &&
      safe.summary?.outbound_network_check_enabled === false,
    summary_safety_valid:
      safe.summary?.environment_values_redacted === true &&
      safe.summary?.diagnostic_only === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(
        `Deployment readiness contract check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}
