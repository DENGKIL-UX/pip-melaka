export const PIP_OBSERVABILITY_CONTRACT_SCHEMA = "pip.observability.contract.v1";
export const PIP_OBSERVABILITY_REPORT_SCHEMA = "pip.observability.report.v1";
export const PIP_OBSERVABILITY_ACCEPTANCE_SCHEMA = "pip.observability.acceptance.v1";

export const PIP_OBSERVABILITY_STATUSES = Object.freeze({
  READY: "READY",
  DEGRADED: "DEGRADED",
  CRITICAL: "CRITICAL",
});

export const PIP_OBSERVABILITY_CHECK_STATUSES = Object.freeze({
  PASS: "PASS",
  REVIEW: "REVIEW",
  BLOCKED: "BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

export const PIP_OBSERVABILITY_ROUTE_GROUPS = Object.freeze({
  AUTHENTICATION: "AUTHENTICATION",
  SCENARIO_API: "SCENARIO_API",
  CENTRAL_AUDIT: "CENTRAL_AUDIT",
  SYSTEM_HEALTH: "SYSTEM_HEALTH",
  OPERATIONAL_ALERTS: "OPERATIONAL_ALERTS",
  DEPLOYMENT_READINESS: "DEPLOYMENT_READINESS",
  EDGE_SECURITY: "EDGE_SECURITY",
  RELEASE_GATE: "RELEASE_GATE",
  OBSERVABILITY: "OBSERVABILITY",
  OTHER: "OTHER",
});

export const PIP_OBSERVABILITY_ERROR_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
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

function toSafeInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.floor(n));
}

function isEnumMember(value, enumObj) {
  return Object.values(enumObj).includes(String(value ?? ""));
}

function collectForbiddenTokens(value, path = "root") {
  const matches = [];

  const forbiddenSnippets = [
    "@",
    "authorization:",
    "bearer ",
    "set-cookie",
    "cookie",
    "csrf",
    "password",
    "secret",
    "token",
    "stack",
    "exception",
    "query",
    "url",
    "http://",
    "https://",
    "session",
    "user_id",
    "email",
    "hostname",
    "domain",
    "proxy",
    "cidr",
    "process.env",
    "db_path",
    "database",
    "/users/",
    ":\\",
  ];

  const forbiddenKeys = new Set([
    "user",
    "user_id",
    "user_identity",
    "email",
    "session",
    "session_id",
    "request_path",
    "request_url",
    "query",
    "headers",
    "body",
    "request_body",
    "response_body",
    "ip",
    "stack",
    "stack_trace",
    "exception_message",
    "raw_message",
    "message_raw",
    "origin",
    "domain",
    "host",
    "hostname",
    "env",
    "environment_value",
    "credential",
    "secret",
    "password",
    "process_id",
    "pid",
    "absolute_path",
    "scenario_content",
    "voter",
    "voter_record",
    "browser_storage_payload",
  ]);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      matches.push(...collectForbiddenTokens(entry, `${path}[${index}]`));
    });
    return matches;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nested]) => {
      const normalizedKey = String(key).trim().toLowerCase();
      if (forbiddenKeys.has(normalizedKey)) {
        matches.push(`${path}.${normalizedKey}`);
      }
      matches.push(...collectForbiddenTokens(nested, `${path}.${String(key)}`));
    });
    return matches;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      forbiddenSnippets.some((snippet) => normalized.includes(snippet))
    ) {
      matches.push(path);
    }
  }

  return matches;
}

function validateRouteGroupEntry(entry) {
  const safe = isPlainObject(entry) ? entry : {};
  return (
    isEnumMember(safe.route_group, PIP_OBSERVABILITY_ROUTE_GROUPS) &&
    Number.isFinite(Number(safe.request_count)) &&
    Number.isFinite(Number(safe.success_count)) &&
    Number.isFinite(Number(safe.client_error_count)) &&
    Number.isFinite(Number(safe.server_error_count)) &&
    Number.isFinite(Number(safe.average_response_ms)) &&
    Number.isFinite(Number(safe.p95_response_ms)) &&
    Number.isFinite(Number(safe.slow_request_count))
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
    isEnumMember(safe.status, PIP_OBSERVABILITY_CHECK_STATUSES) &&
    typeof safe.required === "boolean" &&
    typeof safe.safe_message === "string"
  );
}

function normalizeSummaryFromChecks(checks) {
  const summary = {
    total_checks: 0,
    passed_checks: 0,
    review_checks: 0,
    blocked_checks: 0,
    required_checks_passed: true,
  };

  (Array.isArray(checks) ? checks : []).forEach((check) => {
    if (!isPlainObject(check)) {
      summary.required_checks_passed = false;
      return;
    }

    summary.total_checks += 1;
    const status = String(check.status ?? "");
    if (status === PIP_OBSERVABILITY_CHECK_STATUSES.PASS) {
      summary.passed_checks += 1;
    } else if (status === PIP_OBSERVABILITY_CHECK_STATUSES.REVIEW) {
      summary.review_checks += 1;
    } else if (status === PIP_OBSERVABILITY_CHECK_STATUSES.BLOCKED) {
      summary.blocked_checks += 1;
    }

    if (
      check.required === true &&
      status !== PIP_OBSERVABILITY_CHECK_STATUSES.PASS
    ) {
      summary.required_checks_passed = false;
    }
  });

  return summary;
}

export function buildPipObservabilityContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_OBSERVABILITY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_OBSERVABILITY_REPORT_SCHEMA,
    acceptance_schema: PIP_OBSERVABILITY_ACCEPTANCE_SCHEMA,
    statuses: { ...PIP_OBSERVABILITY_STATUSES },
    check_statuses: { ...PIP_OBSERVABILITY_CHECK_STATUSES },
    route_groups: { ...PIP_OBSERVABILITY_ROUTE_GROUPS },
    error_severities: { ...PIP_OBSERVABILITY_ERROR_SEVERITIES },
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
      manual_snapshot_only: true,
      automatic_polling_enabled: false,
      recurring_timer_enabled: false,
      external_telemetry_export_enabled: false,
      automatic_alert_dispatch_enabled: false,
      automatic_recovery_enabled: false,
      automatic_restart_enabled: false,
      shell_execution_enabled: false,
      child_process_execution_enabled: false,
      outbound_network_check_enabled: false,
      environment_file_write_enabled: false,
      credential_values_redacted: true,
      environment_values_redacted: true,
      infrastructure_values_redacted: true,
      user_identity_values_redacted: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      request_content_excluded: true,
    },
  };
}

export function validatePipObservabilityContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_OBSERVABILITY_CONTRACT_SCHEMA,
    report_schema_valid: safe.report_schema === PIP_OBSERVABILITY_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema === PIP_OBSERVABILITY_ACCEPTANCE_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    statuses_valid:
      JSON.stringify(safe.statuses ?? {}) ===
      JSON.stringify(PIP_OBSERVABILITY_STATUSES),
    check_statuses_valid:
      JSON.stringify(safe.check_statuses ?? {}) ===
      JSON.stringify(PIP_OBSERVABILITY_CHECK_STATUSES),
    route_groups_valid:
      JSON.stringify(safe.route_groups ?? {}) ===
      JSON.stringify(PIP_OBSERVABILITY_ROUTE_GROUPS),
    error_severities_valid:
      JSON.stringify(safe.error_severities ?? {}) ===
      JSON.stringify(PIP_OBSERVABILITY_ERROR_SEVERITIES),
    authentication_configured: summary.authentication_configured === true,
    authentication_required: summary.authentication_required === true,
    roles_configured: summary.roles_configured === true,
    authorization_enforced: summary.authorization_enforced === true,
    legacy_browser_storage_authoritative:
      summary.legacy_browser_storage_authoritative === true,
    operational_read_cutover_enabled:
      summary.operational_read_cutover_enabled === false,
    operational_write_cutover_enabled:
      summary.operational_write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      summary.automatic_synchronisation_enabled === false,
    p999_write_protection: summary.p999_write_protection === true,
    diagnostic_only: summary.diagnostic_only === true,
    manual_snapshot_only: summary.manual_snapshot_only === true,
    automatic_polling_enabled: summary.automatic_polling_enabled === false,
    recurring_timer_enabled: summary.recurring_timer_enabled === false,
    external_telemetry_export_enabled:
      summary.external_telemetry_export_enabled === false,
    automatic_alert_dispatch_enabled:
      summary.automatic_alert_dispatch_enabled === false,
    automatic_recovery_enabled: summary.automatic_recovery_enabled === false,
    automatic_restart_enabled: summary.automatic_restart_enabled === false,
    shell_execution_enabled: summary.shell_execution_enabled === false,
    child_process_execution_enabled:
      summary.child_process_execution_enabled === false,
    outbound_network_check_enabled:
      summary.outbound_network_check_enabled === false,
    environment_file_write_enabled:
      summary.environment_file_write_enabled === false,
    credential_values_redacted: summary.credential_values_redacted === true,
    environment_values_redacted: summary.environment_values_redacted === true,
    infrastructure_values_redacted:
      summary.infrastructure_values_redacted === true,
    user_identity_values_redacted:
      summary.user_identity_values_redacted === true,
    voter_data_excluded: summary.voter_data_excluded === true,
    scenario_content_excluded: summary.scenario_content_excluded === true,
    request_content_excluded: summary.request_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Observability contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      summary: { ...summary },
    },
  };
}

export function validatePipObservabilityReport(report) {
  const safe = isPlainObject(report) ? report : {};

  const checks = {
    schema_valid: safe.schema === PIP_OBSERVABILITY_REPORT_SCHEMA,
    status_valid: isEnumMember(safe.status, PIP_OBSERVABILITY_STATUSES),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    snapshot_id_valid:
      typeof safe.snapshot_id === "string" && safe.snapshot_id.trim().length > 0,
    target_environment_valid:
      typeof safe.target_environment === "string" &&
      safe.target_environment.trim().length > 0,
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    runtime_valid: isPlainObject(safe.runtime),
    request_metrics_valid: isPlainObject(safe.request_metrics),
    route_groups_valid:
      Array.isArray(safe.request_metrics?.route_groups) &&
      safe.request_metrics.route_groups.every(validateRouteGroupEntry),
    error_metrics_valid: isPlainObject(safe.error_metrics),
    events_by_severity_valid: isPlainObject(safe.error_metrics?.events_by_severity),
    operational_alerts_valid: isPlainObject(safe.operational_alerts),
    system_health_valid: isPlainObject(safe.system_health),
    central_audit_valid: isPlainObject(safe.central_audit),
    scenario_storage_valid: isPlainObject(safe.scenario_storage),
    governance_valid: isPlainObject(safe.governance),
    security_valid: isPlainObject(safe.security),
    persistence_valid: isPlainObject(safe.persistence),
    operations_valid: isPlainObject(safe.operations),
    protection_valid: isPlainObject(safe.protection),
    summary_valid: isPlainObject(safe.summary),
    checks_valid:
      Array.isArray(safe.checks) && safe.checks.every(validateCheckEntry),
    security_invariants:
      safe.security?.authentication_configured === true &&
      safe.security?.authentication_required === true &&
      safe.security?.roles_configured === true &&
      safe.security?.authorization_enforced === true,
    persistence_invariants:
      safe.persistence?.legacy_browser_storage_authoritative === true &&
      safe.persistence?.operational_read_cutover_enabled === false &&
      safe.persistence?.operational_write_cutover_enabled === false &&
      safe.persistence?.automatic_synchronisation_enabled === false,
    operations_invariants:
      safe.operations?.diagnostic_only === true &&
      safe.operations?.manual_snapshot_only === true &&
      safe.operations?.automatic_polling_enabled === false &&
      safe.operations?.recurring_timer_enabled === false &&
      safe.operations?.external_telemetry_export_enabled === false &&
      safe.operations?.automatic_alert_dispatch_enabled === false &&
      safe.operations?.automatic_recovery_enabled === false &&
      safe.operations?.automatic_restart_enabled === false &&
      safe.operations?.shell_execution_enabled === false &&
      safe.operations?.child_process_execution_enabled === false &&
      safe.operations?.outbound_network_check_enabled === false &&
      safe.operations?.environment_file_write_enabled === false,
    redaction_invariants:
      safe.security?.credential_values_redacted === true &&
      safe.security?.environment_values_redacted === true &&
      safe.security?.infrastructure_values_redacted === true &&
      safe.security?.user_identity_values_redacted === true &&
      safe.security?.voter_data_excluded === true &&
      safe.security?.scenario_content_excluded === true &&
      safe.security?.request_content_excluded === true &&
      safe.error_metrics?.raw_messages_excluded === true &&
      safe.error_metrics?.stack_traces_excluded === true &&
      safe.error_metrics?.request_data_excluded === true,
    summary_consistent: (() => {
      const derived = normalizeSummaryFromChecks(safe.checks);
      return (
        toSafeInteger(safe.summary?.total_checks) === derived.total_checks &&
        toSafeInteger(safe.summary?.passed_checks) === derived.passed_checks &&
        toSafeInteger(safe.summary?.review_checks) === derived.review_checks &&
        toSafeInteger(safe.summary?.blocked_checks) === derived.blocked_checks &&
        Boolean(safe.summary?.required_checks_passed) ===
          Boolean(derived.required_checks_passed)
      );
    })(),
    forbidden_content_absent: collectForbiddenTokens(safe).length === 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Observability report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_OBSERVABILITY_REPORT_SCHEMA,
      status: String(safe.status ?? "").trim().toUpperCase(),
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      snapshot_id: String(safe.snapshot_id ?? "").trim(),
      target_environment: String(safe.target_environment ?? "").trim(),
      server_instance_id: String(safe.server_instance_id ?? "unknown").trim() || "unknown",
      checks: Array.isArray(safe.checks) ? safe.checks.map((entry) => ({ ...entry })) : [],
      summary: isPlainObject(safe.summary) ? { ...safe.summary } : {},
    },
  };
}

export function validatePipObservabilityAcceptanceReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const reportValidation = validatePipObservabilityReport(safe.report);

  const checks = {
    schema_valid: safe.schema === PIP_OBSERVABILITY_ACCEPTANCE_SCHEMA,
    accepted_valid: typeof safe.accepted === "boolean",
    status_valid: isEnumMember(safe.observability_status, PIP_OBSERVABILITY_STATUSES),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    receipt_id_valid:
      typeof safe.receipt_id === "string" && safe.receipt_id.trim().length > 0,
    contract_validation_passed:
      safe.contract_validation_passed === true,
    report_validation_passed:
      safe.report_validation_passed === true,
    metrics_safety_validation_passed:
      safe.metrics_safety_validation_passed === true,
    sensitive_values_excluded:
      safe.sensitive_values_excluded === true,
    durable_audit_write_readback_passed:
      safe.durable_audit_write_readback_passed === true,
    authentication_authorization_enforced:
      safe.authentication_authorization_enforced === true,
    cutover_synchronisation_disabled:
      safe.cutover_synchronisation_disabled === true,
    p999_protection_enabled: safe.p999_protection_enabled === true,
    prohibited_automation_flags_false:
      safe.prohibited_automation_flags_false === true,
    report_valid: reportValidation.valid === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Observability acceptance check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_OBSERVABILITY_ACCEPTANCE_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      receipt_id: String(safe.receipt_id ?? "").trim(),
      observability_status: String(safe.observability_status ?? "").trim().toUpperCase(),
      accepted: safe.accepted === true,
      report: reportValidation.normalized,
    },
  };
}
