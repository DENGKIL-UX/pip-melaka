export const PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_SCHEMA =
  "pip.authenticated-runtime-acceptance.receipt.v1";

export const PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES =
  Object.freeze({
    READY: "READY",
    REVIEW_REQUIRED: "REVIEW_REQUIRED",
    BLOCKED: "BLOCKED",
  });

export const PIP_AUTHENTICATED_RUNTIME_CHECK_KEYS = Object.freeze([
  "frontend_rendered",
  "authentication_service_reachable",
  "legitimate_user_provisioned",
  "invalid_credentials_rejected",
  "valid_credentials_accepted",
  "authenticated_session_created",
  "session_restore_verified",
  "authorization_envelope_valid",
  "administrator_role_verified",
  "csrf_issued_after_authentication",
  "csrf_protected_mutation_verified",
  "logout_verified",
  "dashboard_heading_visible",
  "p134_metadata_visible",
  "p999_comparison_visible",
  "p999_read_only_verified",
  "batch58c_panel_visible",
  "batch58c_inspection_control_visible",
  "batch58c_acknowledgement_control_visible",
  "batch58c_export_control_visible",
  "uncaught_error_count_zero",
  "unhandled_rejection_count_zero",
  "browser_storage_credentials_absent",
  "database_connection_not_attempted",
  "secret_values_not_exposed",
  "environment_values_not_exposed",
]);

const SENSITIVE_KEY_PATTERN =
  /email|password|hash|csrf|cookie|session|secret|token|raw|path|env|credential/i;

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeStatus(status) {
  const normalized = sanitizeText(status).toUpperCase();
  return Object.values(PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES).includes(
    normalized
  )
    ? normalized
    : PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES.REVIEW_REQUIRED;
}

function sanitizeChecks(checks) {
  const source = isPlainObject(checks) ? checks : {};
  const output = {};

  PIP_AUTHENTICATED_RUNTIME_CHECK_KEYS.forEach((key) => {
    output[key] = source[key] === true;
  });

  return output;
}

function resolveStatusFromChecks(checks) {
  const source = sanitizeChecks(checks);
  const failedKeys = PIP_AUTHENTICATED_RUNTIME_CHECK_KEYS.filter(
    (key) => source[key] !== true
  );

  if (failedKeys.length === 0) {
    return PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES.READY;
  }

  if (
    source.frontend_rendered !== true ||
    source.authentication_service_reachable !== true ||
    source.valid_credentials_accepted !== true ||
    source.authenticated_session_created !== true
  ) {
    return PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES.BLOCKED;
  }

  return PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES.REVIEW_REQUIRED;
}

function sanitizeEvidence(input) {
  const safe = isPlainObject(input) ? input : {};
  const evidence = {};

  Object.entries(safe).forEach(([key, value]) => {
    const normalizedKey = sanitizeText(key);
    if (!normalizedKey) {
      return;
    }

    if (SENSITIVE_KEY_PATTERN.test(normalizedKey)) {
      return;
    }

    if (typeof value === "string") {
      evidence[normalizedKey] = sanitizeText(value).slice(0, 240);
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      evidence[normalizedKey] = value;
    }
  });

  return evidence;
}

export function buildPipAuthenticatedRuntimeAcceptanceReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = sanitizeChecks(safe.checks);
  const status = sanitizeStatus(safe.status || resolveStatusFromChecks(checks));

  return {
    schema: PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_SCHEMA,
    status,
    generated_at: sanitizeText(safe.generated_at) || new Date().toISOString(),
    checks,
    failed_check_count: PIP_AUTHENTICATED_RUNTIME_CHECK_KEYS.filter(
      (key) => checks[key] !== true
    ).length,
    runtime_evidence: sanitizeEvidence(safe.runtime_evidence),
    manual_provisioning_required: true,
    automatic_user_provisioning_performed: false,
    automatic_login_performed: false,
    authentication_bypass_enabled: false,
    credential_values_excluded: true,
    secret_values_exposed: false,
    environment_values_exposed: false,
  };
}

export function sanitizePipAuthenticatedRuntimeAcceptanceReceipt(input = {}) {
  const built = buildPipAuthenticatedRuntimeAcceptanceReceipt(input);
  return {
    ...built,
    runtime_evidence: sanitizeEvidence(built.runtime_evidence),
    credential_values_excluded: true,
    secret_values_exposed: false,
    environment_values_exposed: false,
  };
}

export function validatePipAuthenticatedRuntimeAcceptanceReceipt(input = {}) {
  const receipt = sanitizePipAuthenticatedRuntimeAcceptanceReceipt(input);
  const checks = {
    schema_valid:
      receipt.schema === PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_SCHEMA,
    status_valid: Object.values(
      PIP_AUTHENTICATED_RUNTIME_ACCEPTANCE_STATUSES
    ).includes(receipt.status),
    generated_at_valid: sanitizeText(receipt.generated_at).length >= 20,
    checks_present:
      isPlainObject(receipt.checks) &&
      PIP_AUTHENTICATED_RUNTIME_CHECK_KEYS.every(
        (key) => typeof receipt.checks[key] === "boolean"
      ),
    failed_check_count_valid:
      Number.isInteger(receipt.failed_check_count) &&
      receipt.failed_check_count >= 0,
    manual_provisioning_required_true:
      receipt.manual_provisioning_required === true,
    auto_provisioning_false:
      receipt.automatic_user_provisioning_performed === false,
    auto_login_false: receipt.automatic_login_performed === false,
    auth_bypass_false: receipt.authentication_bypass_enabled === false,
    credentials_excluded_true: receipt.credential_values_excluded === true,
    secret_exposure_false: receipt.secret_values_exposed === false,
    environment_exposure_false: receipt.environment_values_exposed === false,
    evidence_sanitized:
      Object.keys(receipt.runtime_evidence || {}).every(
        (key) => !SENSITIVE_KEY_PATTERN.test(String(key))
      ),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(
        `Authenticated runtime acceptance check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: receipt,
  };
}
