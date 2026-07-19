import {
  PIP_CENTRAL_AUDIT_EVENT_TYPES,
  validatePipCentralAuditEvent,
} from "./pip-central-audit-contract.js";

export const PIP_RELEASE_GATE_CONTRACT_SCHEMA =
  "pip.release-gate.contract.v1";

export const PIP_RELEASE_GATE_REPORT_SCHEMA =
  "pip.release-gate.report.v1";

export const PIP_RELEASE_GATE_ACCEPTANCE_SCHEMA =
  "pip.release-gate.acceptance.v1";

export const PIP_RELEASE_GATE_STATUSES = Object.freeze({
  READY: "READY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_RELEASE_GATE_CHECK_STATUSES = Object.freeze({
  PASS: "PASS",
  REVIEW: "REVIEW",
  BLOCKED: "BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

export const PIP_RELEASE_GATE_DECISIONS = Object.freeze({
  APPROVED: "APPROVED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REJECTED: "REJECTED",
});

export const PIP_RELEASE_GATE_TARGET_ENVIRONMENTS = Object.freeze({
  LOCAL_DEVELOPMENT: "LOCAL_DEVELOPMENT",
  STAGING: "STAGING",
  PRODUCTION: "PRODUCTION",
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
      normalized.includes("csrf") ||
      normalized.includes("session") ||
      normalized.includes("cookie") ||
      normalized.includes("authorization:") ||
      normalized.includes("bearer ") ||
      normalized.includes("private key") ||
      normalized.includes("certificate") ||
      normalized.includes("proxy") ||
      normalized.includes("hostname") ||
      normalized.includes("process.env") ||
      normalized.includes("stack") ||
      normalized.includes("exception") ||
      normalized.includes("child_process") ||
      normalized.includes("npm ") ||
      normalized.includes("curl ") ||
      normalized.includes("wget ") ||
      normalized.includes(":\\") ||
      normalized.includes("/users/") ||
      normalized.includes("/home/")
    );
  }

  const forbiddenKeys = [
    "password",
    "password_hash",
    "session_id",
    "session_identifier",
    "csrf_token",
    "cookie",
    "authorization_header",
    "environment_value",
    "raw_environment",
    "proxy_address",
    "proxy_cidr",
    "origin_url",
    "trusted_origin",
    "database_credentials",
    "api_credentials",
    "private_key",
    "certificate_material",
    "absolute_path",
    "request_headers",
    "raw_request_headers",
    "raw_voter_records",
    "voter_identifier",
    "scenario_content",
    "browser_storage_payload",
    "stack_trace",
    "raw_exception_message",
    "runbook_markdown_raw",
    "executable_commands",
  ];

  return Object.entries(value).some(([key, nested]) => {
    if (forbiddenKeys.includes(String(key).trim().toLowerCase())) {
      return true;
    }
    return hasSensitiveShape(nested);
  });
}

function isGateStatus(value) {
  return Object.values(PIP_RELEASE_GATE_STATUSES).includes(String(value ?? ""));
}

function isDecision(value) {
  return Object.values(PIP_RELEASE_GATE_DECISIONS).includes(String(value ?? ""));
}

function isCheckStatus(value) {
  return Object.values(PIP_RELEASE_GATE_CHECK_STATUSES).includes(String(value ?? ""));
}

function isTargetEnvironment(value) {
  return Object.values(PIP_RELEASE_GATE_TARGET_ENVIRONMENTS).includes(
    String(value ?? "")
  );
}

function validateCheckEntry(check) {
  const safe = isPlainObject(check) ? check : {};
  return (
    typeof safe.check_id === "string" &&
    safe.check_id.trim().length > 0 &&
    typeof safe.category === "string" &&
    safe.category.trim().length > 0 &&
    typeof safe.label === "string" &&
    safe.label.trim().length > 0 &&
    isCheckStatus(safe.status) &&
    typeof safe.required === "boolean" &&
    typeof safe.safe_message === "string"
  );
}

function summarizeChecks(checksList) {
  const summary = {
    total_checks: 0,
    passed_checks: 0,
    review_checks: 0,
    blocked_checks: 0,
    required_checks_passed: true,
  };

  (Array.isArray(checksList) ? checksList : []).forEach((check) => {
    if (!isPlainObject(check)) {
      summary.required_checks_passed = false;
      return;
    }

    summary.total_checks += 1;
    const status = String(check.status ?? "");

    if (status === PIP_RELEASE_GATE_CHECK_STATUSES.PASS) {
      summary.passed_checks += 1;
    } else if (status === PIP_RELEASE_GATE_CHECK_STATUSES.REVIEW) {
      summary.review_checks += 1;
    } else if (status === PIP_RELEASE_GATE_CHECK_STATUSES.BLOCKED) {
      summary.blocked_checks += 1;
    }

    if (check.required === true && status !== PIP_RELEASE_GATE_CHECK_STATUSES.PASS) {
      summary.required_checks_passed = false;
    }
  });

  return summary;
}

function deriveStatus(summary) {
  if (
    Number(summary?.blocked_checks ?? 0) > 0 ||
    summary?.required_checks_passed !== true
  ) {
    return PIP_RELEASE_GATE_STATUSES.BLOCKED;
  }

  if (Number(summary?.review_checks ?? 0) > 0) {
    return PIP_RELEASE_GATE_STATUSES.REVIEW_REQUIRED;
  }

  return PIP_RELEASE_GATE_STATUSES.READY;
}

function deriveDecision(status) {
  if (status === PIP_RELEASE_GATE_STATUSES.READY) {
    return PIP_RELEASE_GATE_DECISIONS.APPROVED;
  }
  if (status === PIP_RELEASE_GATE_STATUSES.REVIEW_REQUIRED) {
    return PIP_RELEASE_GATE_DECISIONS.REVIEW_REQUIRED;
  }
  return PIP_RELEASE_GATE_DECISIONS.REJECTED;
}

export function buildPipReleaseGateContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_RELEASE_GATE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_RELEASE_GATE_REPORT_SCHEMA,
    acceptance_schema: PIP_RELEASE_GATE_ACCEPTANCE_SCHEMA,
    statuses: { ...PIP_RELEASE_GATE_STATUSES },
    check_statuses: { ...PIP_RELEASE_GATE_CHECK_STATUSES },
    decisions: { ...PIP_RELEASE_GATE_DECISIONS },
    target_environments: { ...PIP_RELEASE_GATE_TARGET_ENVIRONMENTS },
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
      diagnostic_only: true,
      automatic_deployment_enabled: false,
      automatic_release_enabled: false,
      automatic_rollback_enabled: false,
      automatic_restart_enabled: false,
      shell_execution_enabled: false,
      child_process_execution_enabled: false,
      outbound_network_check_enabled: false,
      environment_file_write_enabled: false,
      credential_values_redacted: true,
      environment_values_redacted: true,
      infrastructure_values_redacted: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
    },
  };
}

export function validatePipReleaseGateContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid: safe.schema === PIP_RELEASE_GATE_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid: safe.report_schema === PIP_RELEASE_GATE_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema === PIP_RELEASE_GATE_ACCEPTANCE_SCHEMA,
    statuses_valid:
      isPlainObject(safe.statuses) &&
      Object.values(PIP_RELEASE_GATE_STATUSES).every((value) =>
        Object.values(safe.statuses).includes(value)
      ),
    check_statuses_valid:
      isPlainObject(safe.check_statuses) &&
      Object.values(PIP_RELEASE_GATE_CHECK_STATUSES).every((value) =>
        Object.values(safe.check_statuses).includes(value)
      ),
    decisions_valid:
      isPlainObject(safe.decisions) &&
      Object.values(PIP_RELEASE_GATE_DECISIONS).every((value) =>
        Object.values(safe.decisions).includes(value)
      ),
    target_environments_valid:
      isPlainObject(safe.target_environments) &&
      Object.values(PIP_RELEASE_GATE_TARGET_ENVIRONMENTS).every((value) =>
        Object.values(safe.target_environments).includes(value)
      ),
    summary_valid:
      isPlainObject(safe.summary) &&
      safe.summary.authentication_configured === true &&
      safe.summary.authentication_required === true &&
      safe.summary.roles_configured === true &&
      safe.summary.authorization_enforced === true &&
      safe.summary.legacy_browser_storage_authoritative === true &&
      safe.summary.operational_read_cutover_enabled === false &&
      safe.summary.operational_write_cutover_enabled === false &&
      safe.summary.automatic_synchronisation_enabled === false &&
      safe.summary.p999_write_protection === true &&
      safe.summary.diagnostic_only === true &&
      safe.summary.automatic_deployment_enabled === false &&
      safe.summary.automatic_release_enabled === false &&
      safe.summary.automatic_rollback_enabled === false &&
      safe.summary.automatic_restart_enabled === false &&
      safe.summary.shell_execution_enabled === false &&
      safe.summary.child_process_execution_enabled === false &&
      safe.summary.outbound_network_check_enabled === false &&
      safe.summary.environment_file_write_enabled === false &&
      safe.summary.credential_values_redacted === true &&
      safe.summary.environment_values_redacted === true &&
      safe.summary.infrastructure_values_redacted === true &&
      safe.summary.voter_data_excluded === true &&
      safe.summary.scenario_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Release-gate contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}

export function validatePipReleaseGateReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const checksList = Array.isArray(safe.checks) ? safe.checks : [];
  const summary = summarizeChecks(checksList);
  const safeSummary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_RELEASE_GATE_REPORT_SCHEMA,
    status_valid: isGateStatus(safe.status),
    decision_valid: isDecision(safe.decision),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    release_id_valid:
      typeof safe.release_id === "string" && safe.release_id.trim().length > 0,
    target_environment_valid: isTargetEnvironment(safe.target_environment),
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    release_identity_valid: isPlainObject(safe.release_identity),
    evidence_valid: isPlainObject(safe.evidence),
    release_gate_valid: isPlainObject(safe.release_gate),
    rollback_valid: isPlainObject(safe.rollback),
    runbook_valid:
      isPlainObject(safe.runbook) &&
      safe.runbook.schema === "pip.production-runbook.v1" &&
      safe.runbook.diagnostic_only === true &&
      Array.isArray(safe.runbook.sections),
    security_valid:
      safe.security?.authentication_configured === true &&
      safe.security?.authentication_required === true &&
      safe.security?.roles_configured === true &&
      safe.security?.authorization_enforced === true &&
      safe.security?.credential_values_redacted === true &&
      safe.security?.environment_values_redacted === true &&
      safe.security?.infrastructure_values_redacted === true &&
      safe.security?.voter_data_excluded === true &&
      safe.security?.scenario_content_excluded === true,
    persistence_valid:
      safe.persistence?.legacy_browser_storage_authoritative === true &&
      safe.persistence?.operational_read_cutover_enabled === false &&
      safe.persistence?.operational_write_cutover_enabled === false &&
      safe.persistence?.automatic_synchronisation_enabled === false,
    operations_valid:
      safe.operations?.diagnostic_only === true &&
      safe.operations?.automatic_deployment_enabled === false &&
      safe.operations?.automatic_release_enabled === false &&
      safe.operations?.automatic_rollback_enabled === false &&
      safe.operations?.automatic_restart_enabled === false &&
      safe.operations?.shell_execution_enabled === false &&
      safe.operations?.child_process_execution_enabled === false &&
      safe.operations?.outbound_network_check_enabled === false &&
      safe.operations?.environment_file_write_enabled === false,
    protection_valid: safe.protection?.p999_write_protection === true,
    checks_valid: checksList.every((entry) => validateCheckEntry(entry)),
    summary_counts_valid:
      Number(safeSummary.total_checks) === Number(summary.total_checks) &&
      Number(safeSummary.passed_checks) === Number(summary.passed_checks) &&
      Number(safeSummary.review_checks) === Number(summary.review_checks) &&
      Number(safeSummary.blocked_checks) === Number(summary.blocked_checks),
    required_checks_passed_valid:
      Boolean(safeSummary.required_checks_passed) ===
      Boolean(summary.required_checks_passed),
    status_summary_match: deriveStatus(summary) === String(safe.status ?? ""),
    decision_status_match: deriveDecision(String(safe.status ?? "")) === String(safe.decision ?? ""),
    sensitive_shape_absent: hasSensitiveShape(safe) !== true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Release-gate report check failed: ${key}`);
    }
  });

  const normalized = {
    ...safe,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
  };

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipReleaseGateAcceptanceReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const reportValidation = validatePipReleaseGateReport(safe.report);
  const eventValidation = validatePipCentralAuditEvent(safe.event);

  const checks = {
    schema_valid: safe.schema === PIP_RELEASE_GATE_ACCEPTANCE_SCHEMA,
    accepted_valid: safe.accepted === true,
    report_valid: reportValidation.valid === true,
    event_valid: eventValidation.valid === true,
    event_type_valid:
      safe.event?.event_type ===
      PIP_CENTRAL_AUDIT_EVENT_TYPES.RELEASE_GATE_ACCEPTANCE_RECORDED,
    target_environment_valid: safe.target_environment === "PRODUCTION",
    status_ready_valid: safe.release_gate_status === PIP_RELEASE_GATE_STATUSES.READY,
    decision_approved_valid:
      safe.release_decision === PIP_RELEASE_GATE_DECISIONS.APPROVED,
    required_checks_passed_valid: safe.required_checks_passed === true,
    report_validation_passed: safe.report_validation_passed === true,
    runbook_validation_passed: safe.runbook_validation_passed === true,
    rollback_validation_passed: safe.rollback_validation_passed === true,
    deployment_readiness_validation_passed:
      safe.deployment_readiness_validation_passed === true,
    edge_security_validation_passed:
      safe.edge_security_validation_passed === true,
    system_health_validation_passed:
      safe.system_health_validation_passed === true,
    operational_alert_validation_passed:
      safe.operational_alert_validation_passed === true,
    sensitive_redaction_passed: safe.sensitive_redaction_passed === true,
    durable_audit_readback_passed: safe.durable_audit_readback_passed === true,
    authentication_configured: safe.authentication_configured === true,
    authentication_required: safe.authentication_required === true,
    roles_configured: safe.roles_configured === true,
    authorization_enforced: safe.authorization_enforced === true,
    operational_read_cutover_enabled:
      safe.operational_read_cutover_enabled === false,
    operational_write_cutover_enabled:
      safe.operational_write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      safe.automatic_synchronisation_enabled === false,
    p999_write_protection: safe.p999_write_protection === true,
    automatic_deployment_enabled: safe.automatic_deployment_enabled === false,
    automatic_release_enabled: safe.automatic_release_enabled === false,
    automatic_rollback_enabled: safe.automatic_rollback_enabled === false,
    automatic_restart_enabled: safe.automatic_restart_enabled === false,
    shell_execution_enabled: safe.shell_execution_enabled === false,
    child_process_execution_enabled: safe.child_process_execution_enabled === false,
    outbound_network_check_enabled: safe.outbound_network_check_enabled === false,
    environment_file_write_enabled: safe.environment_file_write_enabled === false,
    received_at_valid: normalizeIso(safe.received_at) !== null,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Release-gate acceptance check failed: ${key}`);
    }
  });

  if (reportValidation.valid !== true) {
    errors.push(reportValidation.errors?.[0] ?? "Release-gate report validation failed.");
  }

  if (eventValidation.valid !== true) {
    errors.push(eventValidation.errors?.[0] ?? "Release-gate acceptance event validation failed.");
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      accepted: safe.accepted === true,
      report: reportValidation.normalized,
      event: eventValidation.normalized,
      received_at: normalizeIso(safe.received_at) ?? new Date().toISOString(),
    },
  };
}
