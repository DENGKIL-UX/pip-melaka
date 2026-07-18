import {
  PIP_CENTRAL_AUDIT_EVENT_TYPES,
  validatePipCentralAuditEvent,
} from "./pip-central-audit-contract.js";

export const PIP_EDGE_SECURITY_CONTRACT_SCHEMA =
  "pip.edge-security.contract.v1";

export const PIP_EDGE_SECURITY_REPORT_SCHEMA =
  "pip.edge-security.report.v1";

export const PIP_EDGE_SECURITY_ACCEPTANCE_SCHEMA =
  "pip.edge-security.acceptance.v1";

export const PIP_EDGE_SECURITY_STATUSES = Object.freeze({
  READY: "READY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_EDGE_SECURITY_CHECK_STATUSES = Object.freeze({
  PASS: "PASS",
  REVIEW: "REVIEW",
  BLOCKED: "BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

export const PIP_EDGE_SECURITY_PROXY_MODES = Object.freeze({
  DISABLED: "DISABLED",
  LOOPBACK_ONLY: "LOOPBACK_ONLY",
  HOP_COUNT: "HOP_COUNT",
  CIDR_RESTRICTED: "CIDR_RESTRICTED",
  NAMED_PRIVATE_NETWORK: "NAMED_PRIVATE_NETWORK",
  UNSAFE_GLOBAL_TRUST: "UNSAFE_GLOBAL_TRUST",
  UNKNOWN: "UNKNOWN",
});

export const PIP_EDGE_SECURITY_SAME_SITE_POLICIES = Object.freeze({
  STRICT: "STRICT",
  LAX: "LAX",
  NONE: "NONE",
  MISSING: "MISSING",
  UNKNOWN: "UNKNOWN",
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

function isReportStatus(value) {
  return Object.values(PIP_EDGE_SECURITY_STATUSES).includes(
    String(value ?? "")
  );
}

function isCheckStatus(value) {
  return Object.values(PIP_EDGE_SECURITY_CHECK_STATUSES).includes(
    String(value ?? "")
  );
}

function isProxyMode(value) {
  return Object.values(PIP_EDGE_SECURITY_PROXY_MODES).includes(
    String(value ?? "")
  );
}

function isSameSitePolicy(value) {
  return Object.values(PIP_EDGE_SECURITY_SAME_SITE_POLICIES).includes(
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
      normalized.includes("cookie=") ||
      normalized.includes("private key") ||
      normalized.includes("api_key") ||
      normalized.includes("session_id") ||
      normalized.includes("exception") ||
      normalized.includes("c:\\") ||
      normalized.includes("/users/") ||
      normalized.includes("/home/")
    );
  }

  const forbiddenKeys = [
    "proxy_address",
    "proxy_cidr",
    "proxy_hostname",
    "trusted_origin",
    "origin_url",
    "cookie_value",
    "session_id",
    "session_identifier",
    "session_secret",
    "signing_secret",
    "certificate",
    "certificate_pem",
    "certificate_chain",
    "environment_value",
    "raw_environment",
    "request_headers",
    "raw_request_headers",
    "raw_request_url",
    "raw_url",
    "stack_trace",
    "raw_exception_message",
    "browser_storage_payload",
    "raw_voter_records",
    "raw_scenario_records",
  ];

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = String(key).trim().toLowerCase();
    if (forbiddenKeys.includes(normalizedKey)) {
      return true;
    }

    return hasSensitiveShape(nested);
  });
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

    const status = String(check.status ?? "");
    summary.total_checks += 1;

    if (status === PIP_EDGE_SECURITY_CHECK_STATUSES.PASS) {
      summary.passed_checks += 1;
    } else if (status === PIP_EDGE_SECURITY_CHECK_STATUSES.REVIEW) {
      summary.review_checks += 1;
    } else if (status === PIP_EDGE_SECURITY_CHECK_STATUSES.BLOCKED) {
      summary.blocked_checks += 1;
    }

    if (check.required === true && status !== PIP_EDGE_SECURITY_CHECK_STATUSES.PASS) {
      summary.required_checks_passed = false;
    }
  });

  return summary;
}

function deriveStatusFromSummary(summary) {
  if (summary.blocked_checks > 0 || summary.required_checks_passed !== true) {
    return PIP_EDGE_SECURITY_STATUSES.BLOCKED;
  }

  if (summary.review_checks > 0) {
    return PIP_EDGE_SECURITY_STATUSES.REVIEW_REQUIRED;
  }

  return PIP_EDGE_SECURITY_STATUSES.READY;
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

export function buildPipEdgeSecurityContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_EDGE_SECURITY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_EDGE_SECURITY_REPORT_SCHEMA,
    acceptance_schema: PIP_EDGE_SECURITY_ACCEPTANCE_SCHEMA,
    statuses: { ...PIP_EDGE_SECURITY_STATUSES },
    check_statuses: { ...PIP_EDGE_SECURITY_CHECK_STATUSES },
    proxy_modes: { ...PIP_EDGE_SECURITY_PROXY_MODES },
    same_site_policies: { ...PIP_EDGE_SECURITY_SAME_SITE_POLICIES },
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
      automatic_proxy_configuration_enabled: false,
      automatic_https_redirect_enabled: false,
      automatic_certificate_management_enabled: false,
      automatic_cookie_mutation_enabled: false,
      outbound_network_check_enabled: false,
      shell_execution_enabled: false,
      automatic_restart_enabled: false,
      proxy_values_redacted: true,
      origin_values_redacted: true,
      environment_values_redacted: true,
    },
    constraints: {
      prohibit_proxy_values: true,
      prohibit_origin_values: true,
      prohibit_cookie_values: true,
      prohibit_session_identifiers: true,
      prohibit_signing_secrets: true,
      prohibit_csrf_tokens: true,
      prohibit_passwords: true,
      prohibit_authorization_headers: true,
      prohibit_private_keys: true,
      prohibit_certificate_material: true,
      prohibit_environment_values: true,
      prohibit_absolute_paths: true,
      prohibit_raw_request_headers: true,
      prohibit_raw_request_urls: true,
      prohibit_raw_voter_or_scenario_records: true,
      prohibit_browser_storage_payloads: true,
      prohibit_stack_traces: true,
      prohibit_raw_exception_messages: true,
    },
  };
}

export function validatePipEdgeSecurityContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid: safe.schema === PIP_EDGE_SECURITY_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    report_schema_valid: safe.report_schema === PIP_EDGE_SECURITY_REPORT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema === PIP_EDGE_SECURITY_ACCEPTANCE_SCHEMA,
    statuses_valid:
      isPlainObject(safe.statuses) &&
      Object.values(PIP_EDGE_SECURITY_STATUSES).every((value) =>
        Object.values(safe.statuses).includes(value)
      ),
    check_statuses_valid:
      isPlainObject(safe.check_statuses) &&
      Object.values(PIP_EDGE_SECURITY_CHECK_STATUSES).every((value) =>
        Object.values(safe.check_statuses).includes(value)
      ),
    proxy_modes_valid:
      isPlainObject(safe.proxy_modes) &&
      Object.values(PIP_EDGE_SECURITY_PROXY_MODES).every((value) =>
        Object.values(safe.proxy_modes).includes(value)
      ),
    same_site_policies_valid:
      isPlainObject(safe.same_site_policies) &&
      Object.values(PIP_EDGE_SECURITY_SAME_SITE_POLICIES).every((value) =>
        Object.values(safe.same_site_policies).includes(value)
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
      safe.summary.automatic_proxy_configuration_enabled === false &&
      safe.summary.automatic_https_redirect_enabled === false &&
      safe.summary.automatic_certificate_management_enabled === false &&
      safe.summary.automatic_cookie_mutation_enabled === false &&
      safe.summary.outbound_network_check_enabled === false &&
      safe.summary.shell_execution_enabled === false &&
      safe.summary.automatic_restart_enabled === false &&
      safe.summary.proxy_values_redacted === true &&
      safe.summary.origin_values_redacted === true &&
      safe.summary.environment_values_redacted === true,
    constraints_valid:
      isPlainObject(safe.constraints) &&
      safe.constraints.prohibit_proxy_values === true &&
      safe.constraints.prohibit_origin_values === true &&
      safe.constraints.prohibit_cookie_values === true &&
      safe.constraints.prohibit_session_identifiers === true &&
      safe.constraints.prohibit_signing_secrets === true &&
      safe.constraints.prohibit_csrf_tokens === true &&
      safe.constraints.prohibit_passwords === true &&
      safe.constraints.prohibit_authorization_headers === true &&
      safe.constraints.prohibit_private_keys === true &&
      safe.constraints.prohibit_certificate_material === true &&
      safe.constraints.prohibit_environment_values === true &&
      safe.constraints.prohibit_absolute_paths === true &&
      safe.constraints.prohibit_raw_request_headers === true &&
      safe.constraints.prohibit_raw_request_urls === true &&
      safe.constraints.prohibit_raw_voter_or_scenario_records === true &&
      safe.constraints.prohibit_browser_storage_payloads === true &&
      safe.constraints.prohibit_stack_traces === true &&
      safe.constraints.prohibit_raw_exception_messages === true,
    sensitive_content_absent: !hasSensitiveShape(safe),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Edge security contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}

export function validatePipEdgeSecurityReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const reverseProxy = isPlainObject(safe.reverse_proxy) ? safe.reverse_proxy : {};
  const https = isPlainObject(safe.https) ? safe.https : {};
  const sessionCookie = isPlainObject(safe.session_cookie)
    ? safe.session_cookie
    : {};
  const originSecurity = isPlainObject(safe.origin_security)
    ? safe.origin_security
    : {};
  const security = isPlainObject(safe.security) ? safe.security : {};
  const persistence = isPlainObject(safe.persistence) ? safe.persistence : {};
  const operations = isPlainObject(safe.operations) ? safe.operations : {};
  const protection = isPlainObject(safe.protection) ? safe.protection : {};
  const checksList = Array.isArray(safe.checks) ? safe.checks : [];
  const computedSummary = summarizeChecks(checksList);
  const safeSummary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_EDGE_SECURITY_REPORT_SCHEMA,
    status_valid: isReportStatus(safe.status),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" &&
      safe.target_environment.trim().length > 0,
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    trusted_proxy_mode_valid: isProxyMode(reverseProxy.trusted_proxy_mode),
    reverse_proxy_valid:
      typeof reverseProxy.reverse_proxy_declared === "boolean" &&
      typeof reverseProxy.trusted_proxy_policy_configured === "boolean" &&
      typeof reverseProxy.unrestricted_proxy_trust_disabled === "boolean" &&
      typeof reverseProxy.forwarded_proto_supported === "boolean" &&
      typeof reverseProxy.forwarded_host_supported === "boolean" &&
      typeof reverseProxy.forwarded_port_supported === "boolean" &&
      typeof reverseProxy.forwarded_header_spoof_protection === "boolean" &&
      typeof reverseProxy.direct_request_trust_restricted === "boolean",
    https_valid:
      typeof https.https_termination_declared === "boolean" &&
      typeof https.https_required_for_target === "boolean" &&
      typeof https.effective_protocol_validation_enabled === "boolean" &&
      typeof https.insecure_request_detection_enabled === "boolean" &&
      typeof https.canonical_https_redirect_declared === "boolean" &&
      typeof https.hsts_configured === "boolean" &&
      typeof https.hsts_max_age_sufficient === "boolean" &&
      typeof https.hsts_include_subdomains === "boolean" &&
      typeof https.hsts_preload_declared === "boolean",
    session_cookie_valid:
      typeof sessionCookie.cookie_name_policy_valid === "boolean" &&
      typeof sessionCookie.secure_enabled === "boolean" &&
      typeof sessionCookie.http_only_enabled === "boolean" &&
      isSameSitePolicy(sessionCookie.same_site_policy) &&
      typeof sessionCookie.same_site_policy_valid === "boolean" &&
      typeof sessionCookie.path_restricted === "boolean" &&
      typeof sessionCookie.domain_scope_safe === "boolean" &&
      typeof sessionCookie.lifetime_bounded === "boolean" &&
      typeof sessionCookie.production_cookie_policy_valid === "boolean",
    origin_security_valid:
      typeof originSecurity.trusted_origin_policy_configured === "boolean" &&
      Number.isInteger(Number(originSecurity.trusted_origin_count)) &&
      Number(originSecurity.trusted_origin_count) >= 0 &&
      typeof originSecurity.wildcard_origin_disabled === "boolean" &&
      typeof originSecurity.cors_policy_configured === "boolean" &&
      typeof originSecurity.cors_credentials_enabled === "boolean" &&
      typeof originSecurity.cors_origin_allowlist_enforced === "boolean" &&
      typeof originSecurity.csrf_origin_alignment_enabled === "boolean" &&
      typeof originSecurity.host_header_validation_enabled === "boolean",
    security_valid:
      security.authentication_configured === true &&
      security.authentication_required === true &&
      security.roles_configured === true &&
      security.authorization_enforced === true &&
      security.credential_values_redacted === true &&
      security.environment_values_redacted === true &&
      security.proxy_values_redacted === true &&
      security.origin_values_redacted === true,
    persistence_valid:
      persistence.legacy_browser_storage_authoritative === true &&
      persistence.operational_read_cutover_enabled === false &&
      persistence.operational_write_cutover_enabled === false &&
      persistence.automatic_synchronisation_enabled === false,
    operations_valid:
      operations.diagnostic_only === true &&
      operations.automatic_proxy_configuration_enabled === false &&
      operations.automatic_https_redirect_enabled === false &&
      operations.automatic_certificate_management_enabled === false &&
      operations.automatic_cookie_mutation_enabled === false &&
      operations.outbound_network_check_enabled === false &&
      operations.shell_execution_enabled === false &&
      operations.automatic_restart_enabled === false,
    protection_valid: protection.p999_write_protection === true,
    checks_valid: checksList.every((check) => validateCheckEntry(check)),
    summary_valid:
      Number(safeSummary.total_checks) === computedSummary.total_checks &&
      Number(safeSummary.passed_checks) === computedSummary.passed_checks &&
      Number(safeSummary.review_checks) === computedSummary.review_checks &&
      Number(safeSummary.blocked_checks) === computedSummary.blocked_checks &&
      safeSummary.required_checks_passed === computedSummary.required_checks_passed,
    status_matches_checks:
      String(safe.status ?? "") === deriveStatusFromSummary(computedSummary),
    sensitive_content_absent: !hasSensitiveShape(safe),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Edge security report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      summary: {
        total_checks: computedSummary.total_checks,
        passed_checks: computedSummary.passed_checks,
        review_checks: computedSummary.review_checks,
        blocked_checks: computedSummary.blocked_checks,
        required_checks_passed: computedSummary.required_checks_passed,
      },
      checks: checksList,
    },
  };
}

export function validatePipEdgeSecurityAcceptanceReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const reportValidation = validatePipEdgeSecurityReport(safe.report);
  const eventValidation = validatePipCentralAuditEvent(safe.event);

  const checks = {
    schema_valid: safe.schema === PIP_EDGE_SECURITY_ACCEPTANCE_SCHEMA,
    accepted_valid: safe.accepted === true,
    report_valid: reportValidation.valid === true,
    event_valid: eventValidation.valid === true,
    event_type_valid:
      safe.event?.event_type ===
      PIP_CENTRAL_AUDIT_EVENT_TYPES.EDGE_SECURITY_ACCEPTANCE_RECORDED,
    edge_security_status_valid:
      String(safe.edge_security_status ?? "") !==
      PIP_EDGE_SECURITY_STATUSES.BLOCKED,
    report_validation_passed_valid:
      safe.report_validation_passed === true,
    request_context_validation_passed_valid:
      safe.request_context_validation_passed === true,
    sensitive_value_redaction_passed_valid:
      safe.sensitive_value_redaction_passed === true,
    durable_readback_passed_valid: safe.durable_readback_passed === true,
    security_flags_valid:
      safe.authentication_configured === true &&
      safe.authentication_required === true &&
      safe.roles_configured === true &&
      safe.authorization_enforced === true,
    cutover_flags_valid:
      safe.operational_read_cutover_enabled === false &&
      safe.operational_write_cutover_enabled === false &&
      safe.automatic_synchronisation_enabled === false,
    protection_valid: safe.p999_write_protection === true,
    automation_flags_valid:
      safe.automatic_proxy_configuration_enabled === false &&
      safe.automatic_https_redirect_enabled === false &&
      safe.automatic_certificate_management_enabled === false &&
      safe.automatic_cookie_mutation_enabled === false &&
      safe.outbound_network_check_enabled === false &&
      safe.shell_execution_enabled === false &&
      safe.automatic_restart_enabled === false,
    legacy_storage_preserved_valid:
      safe.legacy_storage_preserved !== false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Edge security acceptance check failed: ${key}`);
    }
  });

  if (reportValidation.valid !== true) {
    errors.push(
      reportValidation.errors?.[0] ?? "Edge security report validation failed."
    );
  }

  if (eventValidation.valid !== true) {
    errors.push(
      eventValidation.errors?.[0] ?? "Edge security event validation failed."
    );
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_EDGE_SECURITY_ACCEPTANCE_SCHEMA,
      accepted: safe.accepted === true,
      report: reportValidation.normalized,
      event: eventValidation.normalized,
      edge_security_status: String(safe.edge_security_status ?? ""),
      report_validation_passed: safe.report_validation_passed === true,
      request_context_validation_passed:
        safe.request_context_validation_passed === true,
      sensitive_value_redaction_passed:
        safe.sensitive_value_redaction_passed === true,
      durable_readback_passed: safe.durable_readback_passed === true,
      authentication_configured: safe.authentication_configured === true,
      authentication_required: safe.authentication_required === true,
      roles_configured: safe.roles_configured === true,
      authorization_enforced: safe.authorization_enforced === true,
      operational_read_cutover_enabled: safe.operational_read_cutover_enabled,
      operational_write_cutover_enabled: safe.operational_write_cutover_enabled,
      automatic_synchronisation_enabled: safe.automatic_synchronisation_enabled,
      p999_write_protection: safe.p999_write_protection === true,
      automatic_proxy_configuration_enabled:
        safe.automatic_proxy_configuration_enabled,
      automatic_https_redirect_enabled:
        safe.automatic_https_redirect_enabled,
      automatic_certificate_management_enabled:
        safe.automatic_certificate_management_enabled,
      automatic_cookie_mutation_enabled:
        safe.automatic_cookie_mutation_enabled,
      outbound_network_check_enabled: safe.outbound_network_check_enabled,
      shell_execution_enabled: safe.shell_execution_enabled,
      automatic_restart_enabled: safe.automatic_restart_enabled,
      legacy_storage_preserved: safe.legacy_storage_preserved,
      received_at: normalizeIso(safe.received_at) ?? new Date().toISOString(),
    },
  };
}
