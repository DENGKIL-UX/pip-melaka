export const PIP_PRODUCTION_ACTIVATION_PERMIT_CONTRACT_SCHEMA =
  "pip.production-activation-permit.contract.v1";

export const PIP_PRODUCTION_ACTIVATION_PERMIT_REQUEST_SCHEMA =
  "pip.production-activation-permit.request.v1";

export const PIP_PRODUCTION_ACTIVATION_PERMIT_EVALUATION_SCHEMA =
  "pip.production-activation-permit.evaluation.v1";

export const PIP_PRODUCTION_ACTIVATION_PERMIT_RECEIPT_SCHEMA =
  "pip.production-activation-permit.receipt.v1";

export const PIP_PRODUCTION_ACTIVATION_PERMIT_REVOCATION_SCHEMA =
  "pip.production-activation-permit.revocation.v1";

export const PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  DRAFT: "DRAFT",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  READY_FOR_AUTHORIZATION: "READY_FOR_AUTHORIZATION",
  AUTHORIZED: "AUTHORIZED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_PRODUCTION_ACTIVATION_PERMIT_ACTIONS = Object.freeze({
  PREPARE: "PREPARE",
  EVALUATE: "EVALUATE",
  AUTHORIZE: "AUTHORIZE",
  REVOKE: "REVOKE",
});

export const PIP_PRODUCTION_ACTIVATION_PERMIT_ROLE_KEYS = Object.freeze({
  CHANGE_AUTHORITY: "CHANGE_AUTHORITY",
  SECURITY_WITNESS: "SECURITY_WITNESS",
  OPERATIONS_WITNESS: "OPERATIONS_WITNESS",
});

export const PIP_PRODUCTION_ACTIVATION_PERMIT_ATTESTATION_KEYS = Object.freeze({
  BATCH_59C_RUNTIME_ACCEPTANCE_PASSED:
    "BATCH_59C_RUNTIME_ACCEPTANCE_PASSED",
  BATCH_60A_CONFIGURATION_INTAKE_VALID:
    "BATCH_60A_CONFIGURATION_INTAKE_VALID",
  BATCH_60B_APPROVAL_VALID: "BATCH_60B_APPROVAL_VALID",
  BATCH_60B_ACTIVATION_READINESS_VALID:
    "BATCH_60B_ACTIVATION_READINESS_VALID",
  BATCH_60C_CHANGE_PACKAGE_VALID: "BATCH_60C_CHANGE_PACKAGE_VALID",
  BATCH_60C_STATIC_DRY_RUN_PASSED: "BATCH_60C_STATIC_DRY_RUN_PASSED",
  BATCH_60C_HANDOFF_ACKNOWLEDGED: "BATCH_60C_HANDOFF_ACKNOWLEDGED",
  BATCH_61A_OPERATOR_GOVERNANCE_VALID:
    "BATCH_61A_OPERATOR_GOVERNANCE_VALID",
  BATCH_61A_HANDOFF_ACKNOWLEDGED: "BATCH_61A_HANDOFF_ACKNOWLEDGED",
  BATCH_61B_GO_DECISION_VALID: "BATCH_61B_GO_DECISION_VALID",
  BATCH_61B_DECISION_DIGEST_MATCHES: "BATCH_61B_DECISION_DIGEST_MATCHES",
  CHANGE_WINDOW_REVIEWED: "CHANGE_WINDOW_REVIEWED",
  ROLLBACK_OWNER_CONFIRMED: "ROLLBACK_OWNER_CONFIRMED",
  MONITORING_OWNER_CONFIRMED: "MONITORING_OWNER_CONFIRMED",
  INCIDENT_ESCALATION_PATH_CONFIRMED:
    "INCIDENT_ESCALATION_PATH_CONFIRMED",
  AUTHORIZATION_ALIASES_ARE_DISTINCT:
    "AUTHORIZATION_ALIASES_ARE_DISTINCT",
  NO_OPERATOR_ALIAS_OVERLAP: "NO_OPERATOR_ALIAS_OVERLAP",
  NO_REVIEWER_ALIAS_OVERLAP: "NO_REVIEWER_ALIAS_OVERLAP",
  NO_SECRET_VALUES_PRESENT: "NO_SECRET_VALUES_PRESENT",
  NO_ENVIRONMENT_VALUES_PRESENT: "NO_ENVIRONMENT_VALUES_PRESENT",
  NO_CONNECTION_VALUES_PRESENT: "NO_CONNECTION_VALUES_PRESENT",
  NO_EXECUTABLE_COMMANDS_PRESENT: "NO_EXECUTABLE_COMMANDS_PRESENT",
  CUTOVERS_REMAIN_DISABLED: "CUTOVERS_REMAIN_DISABLED",
  AUTOMATIC_SYNCHRONISATION_REMAINS_DISABLED:
    "AUTOMATIC_SYNCHRONISATION_REMAINS_DISABLED",
  P999_REMAINS_PROTECTED: "P999_REMAINS_PROTECTED",
  AUTHORIZATION_RECORD_ONLY: "AUTHORIZATION_RECORD_ONLY",
  NO_ACTIVATION_PERFORMED: "NO_ACTIVATION_PERFORMED",
});

export const PIP_PRODUCTION_ACTIVATION_PERMIT_REASON_CODES = Object.freeze({
  PLANNED_CHANGE_WINDOW: "PLANNED_CHANGE_WINDOW",
  EMERGENCY_CHANGE_WINDOW: "EMERGENCY_CHANGE_WINDOW",
  SECURITY_REMEDIATION: "SECURITY_REMEDIATION",
  OPERATIONAL_RECOVERY: "OPERATIONAL_RECOVERY",
  AUTHORIZATION_REVOKED_BY_CHANGE_AUTHORITY:
    "AUTHORIZATION_REVOKED_BY_CHANGE_AUTHORITY",
  EVIDENCE_STATE_CHANGED: "EVIDENCE_STATE_CHANGED",
  CHANGE_WINDOW_CANCELLED: "CHANGE_WINDOW_CANCELLED",
  CHANGE_WINDOW_EXPIRED: "CHANGE_WINDOW_EXPIRED",
  GOVERNANCE_REVIEW_REQUIRED: "GOVERNANCE_REVIEW_REQUIRED",
});

export const PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES = Object.freeze({
  ACTIVE_CONSTITUENCY_NOT_P134: "ACTIVE_CONSTITUENCY_NOT_P134",
  P999_CONTEXT_BLOCKED: "P999_CONTEXT_BLOCKED",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  AUTHORIZATION_REQUIRED: "AUTHORIZATION_REQUIRED",
  CSRF_REQUIRED: "CSRF_REQUIRED",
  BATCH61B_GO_REQUIRED: "BATCH61B_GO_REQUIRED",
  BATCH61B_RECEIPT_INVALID: "BATCH61B_RECEIPT_INVALID",
  EVIDENCE_DIGEST_MISMATCH: "EVIDENCE_DIGEST_MISMATCH",
  CHANGE_WINDOW_INVALID: "CHANGE_WINDOW_INVALID",
  CHANGE_WINDOW_EXPIRED: "CHANGE_WINDOW_EXPIRED",
  CHANGE_WINDOW_TOO_LONG: "CHANGE_WINDOW_TOO_LONG",
  AUTHORIZATION_ALIASES_INVALID: "AUTHORIZATION_ALIASES_INVALID",
  AUTHORIZATION_ALIASES_NOT_DISTINCT:
    "AUTHORIZATION_ALIASES_NOT_DISTINCT",
  OPERATOR_ALIAS_OVERLAP: "OPERATOR_ALIAS_OVERLAP",
  REVIEWER_ALIAS_OVERLAP: "REVIEWER_ALIAS_OVERLAP",
  REQUIRED_ATTESTATION_MISSING: "REQUIRED_ATTESTATION_MISSING",
  PROHIBITED_ACTION_FLAG_ACTIVE: "PROHIBITED_ACTION_FLAG_ACTIVE",
  P999_WRITE_PROTECTION_INVALID: "P999_WRITE_PROTECTION_INVALID",
});

export const PIP_PRODUCTION_ACTIVATION_TARGET_ENVIRONMENTS = Object.freeze({
  PRODUCTION: "PRODUCTION",
});

const REQUEST_ID_PATTERN = /^REQ-[A-Z0-9-]{6,72}$/;
const PERMIT_REQUEST_ID_PATTERN = /^APRREQ-[A-Z0-9-]{8,96}$/;
const PERMIT_EVALUATION_ID_PATTERN = /^APREVAL-[A-Z0-9-]{8,96}$/;
const PERMIT_ID_PATTERN = /^APRMT-[A-Z0-9-]{8,96}$/;
const PERMIT_RECEIPT_ID_PATTERN = /^APRAUTH-[A-Z0-9-]{8,96}$/;
const REVOCATION_RECEIPT_ID_PATTERN = /^APRREV-[A-Z0-9-]{8,96}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const ALIAS_PATTERN = /^APR_[A-Z0-9]{8}$/;
const FORBIDDEN_ALIAS_PATTERNS = [
  /@/,
  /\s/,
  /\./,
  /\//,
  /\\/,
  /:/,
  /^https?:\/\//i,
  /\b(?:localhost|[a-z0-9-]+\.[a-z]{2,})\b/i,
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,
  /\+?\d[\d\s-]{8,}/,
  /^[A-Za-z]:\\/,
  /(?:postgres|mysql|mongodb|jdbc|odbc):\/\//i,
  /\b(?:db|database|secret|token|password|username|email|phone|hostname|port)\b/i,
  /^OPR_/i,
  /^RVB_/i,
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, max = 320) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeRationale(value) {
  return sanitizeText(value, 320)
    .replace(
      /(password|token|secret|connection string|postgres|mysql|jdbc|odbc|host|hostname|ip|port|database|user(name)?|email|phone)/gi,
      "[redacted]"
    )
    .trim();
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function computeDigestSync(value) {
  const text = stableStringify(value);
  const seeds = [
    0x811c9dc5,
    0x9e3779b1,
    0x85ebca6b,
    0xc2b2ae35,
    0x27d4eb2f,
    0x165667b1,
    0xd3a2646c,
    0xfd7046c5,
  ];

  return seeds
    .map((seed) => {
      let hash = seed >>> 0;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
        hash = (hash ^ (hash >>> 13)) >>> 0;
        hash = Math.imul(hash, 0x85ebca6b) >>> 0;
        hash = (hash ^ (hash >>> 16)) >>> 0;
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
}

function createValidationResult(errors, normalized) {
  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

function roleKeyList() {
  return Object.values(PIP_PRODUCTION_ACTIVATION_PERMIT_ROLE_KEYS);
}

function attestationKeyList() {
  return Object.values(PIP_PRODUCTION_ACTIVATION_PERMIT_ATTESTATION_KEYS);
}

function hasForbiddenAliasPattern(alias) {
  return FORBIDDEN_ALIAS_PATTERNS.some((pattern) => pattern.test(alias));
}

function sanitizeAuthorizationAlias(value) {
  const alias = sanitizeText(value, 64).toUpperCase();
  if (!ALIAS_PATTERN.test(alias)) {
    return "";
  }
  if (hasForbiddenAliasPattern(alias)) {
    return "";
  }
  return alias;
}

function sanitizeRoleAssignments(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  roleKeyList().forEach((roleKey) => {
    normalized[roleKey] = sanitizeAuthorizationAlias(safe[roleKey]);
  });
  return normalized;
}

function sanitizeAttestations(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  attestationKeyList().forEach((key) => {
    normalized[key] = safe[key] === true;
  });
  return normalized;
}

function resolveWindowDurationMinutes(startIso, endIso) {
  if (!startIso || !endIso) {
    return null;
  }
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.round((end - start) / 60000);
}

function sanitizeBooleanFlag(value, fallback = false) {
  return value === true ? true : fallback === true;
}

function sanitizeSafetyFlags(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    activation_performed: sanitizeBooleanFlag(safe.activation_performed, false),
    deployment_execution_performed: sanitizeBooleanFlag(
      safe.deployment_execution_performed,
      false
    ),
    database_connection_attempted: sanitizeBooleanFlag(
      safe.database_connection_attempted,
      false
    ),
    database_driver_invoked: sanitizeBooleanFlag(
      safe.database_driver_invoked,
      false
    ),
    database_adapter_invoked: sanitizeBooleanFlag(
      safe.database_adapter_invoked,
      false
    ),
    network_resolution_invoked: sanitizeBooleanFlag(
      safe.network_resolution_invoked,
      false
    ),
    outbound_network_invoked: sanitizeBooleanFlag(
      safe.outbound_network_invoked,
      false
    ),
    sql_execution_invoked: sanitizeBooleanFlag(safe.sql_execution_invoked, false),
    ddl_execution_invoked: sanitizeBooleanFlag(safe.ddl_execution_invoked, false),
    schema_creation_invoked: sanitizeBooleanFlag(
      safe.schema_creation_invoked,
      false
    ),
    migration_invoked: sanitizeBooleanFlag(safe.migration_invoked, false),
    production_data_write_performed: sanitizeBooleanFlag(
      safe.production_data_write_performed,
      false
    ),
    binding_activation_performed: sanitizeBooleanFlag(
      safe.binding_activation_performed,
      false
    ),
    shadow_write_enabled: sanitizeBooleanFlag(safe.shadow_write_enabled, false),
    dual_write_enabled: sanitizeBooleanFlag(safe.dual_write_enabled, false),
    repository_cutover_enabled: sanitizeBooleanFlag(
      safe.repository_cutover_enabled,
      false
    ),
    operational_read_cutover_enabled: sanitizeBooleanFlag(
      safe.operational_read_cutover_enabled,
      false
    ),
    operational_write_cutover_enabled: sanitizeBooleanFlag(
      safe.operational_write_cutover_enabled,
      false
    ),
    automatic_activation_enabled: sanitizeBooleanFlag(
      safe.automatic_activation_enabled,
      false
    ),
    automatic_retry_enabled: sanitizeBooleanFlag(
      safe.automatic_retry_enabled,
      false
    ),
    automatic_synchronisation_enabled: sanitizeBooleanFlag(
      safe.automatic_synchronisation_enabled,
      false
    ),
    permit_automatically_consumed: sanitizeBooleanFlag(
      safe.permit_automatically_consumed,
      false
    ),
    p999_write_protection: safe.p999_write_protection !== false,
  };
}

export function buildPipProductionActivationPermitContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PRODUCTION_ACTIVATION_PERMIT_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    request_schema: PIP_PRODUCTION_ACTIVATION_PERMIT_REQUEST_SCHEMA,
    evaluation_schema: PIP_PRODUCTION_ACTIVATION_PERMIT_EVALUATION_SCHEMA,
    receipt_schema: PIP_PRODUCTION_ACTIVATION_PERMIT_RECEIPT_SCHEMA,
    revocation_schema: PIP_PRODUCTION_ACTIVATION_PERMIT_REVOCATION_SCHEMA,
    statuses: { ...PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES },
    actions: { ...PIP_PRODUCTION_ACTIVATION_PERMIT_ACTIONS },
    role_keys: { ...PIP_PRODUCTION_ACTIVATION_PERMIT_ROLE_KEYS },
    attestation_keys: { ...PIP_PRODUCTION_ACTIVATION_PERMIT_ATTESTATION_KEYS },
    reason_codes: { ...PIP_PRODUCTION_ACTIVATION_PERMIT_REASON_CODES },
    blocker_codes: { ...PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES },
    target_environments: { ...PIP_PRODUCTION_ACTIVATION_TARGET_ENVIRONMENTS },
    summary: {
      permit_governance_enabled: true,
      manual_permit_preparation_only: true,
      manual_permit_authorization_only: true,
      manual_permit_revocation_only: true,
      time_bound_permits_required: true,
      permit_revocation_enabled: true,
      authorization_receipt_append_only: true,
      revocation_receipt_append_only: true,
      permit_automatic_consumption_enabled: false,
      activation_execution_enabled: false,
      deployment_execution_enabled: false,
      database_operation_enabled: false,
      migration_execution_enabled: false,
      cutover_execution_enabled: false,
      automatic_activation_enabled: false,
      automatic_retry_enabled: false,
      automatic_synchronisation_enabled: false,
      p999_write_protection: true,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
    },
  };
}

export function sanitizePipProductionActivationPermitRequest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const startUtc = normalizeIso(safe.requested_window_start);
  const endUtc = normalizeIso(safe.requested_window_end);
  const maximumWindowMinutes = Math.max(
    0,
    Number.parseInt(String(safe.maximum_window_minutes ?? "0"), 10) || 0
  );
  const roleAssignments = sanitizeRoleAssignments(safe.role_assignments);
  const durationMinutes = resolveWindowDurationMinutes(startUtc, endUtc);
  const safetyFlags = sanitizeSafetyFlags(safe);

  return {
    schema: PIP_PRODUCTION_ACTIVATION_PERMIT_REQUEST_SCHEMA,
    permit_request_id: sanitizeText(safe.permit_request_id, 96).toUpperCase(),
    request_id: sanitizeText(safe.request_id, 80).toUpperCase(),
    target_constituency: sanitizeText(safe.target_constituency, 16).toUpperCase(),
    target_environment: sanitizeText(safe.target_environment, 32).toUpperCase(),
    change_reference: sanitizeText(safe.change_reference, 120),
    requested_window_start: startUtc,
    requested_window_end: endUtc,
    maximum_window_minutes: maximumWindowMinutes,
    window_duration_minutes: durationMinutes,
    role_assignments: roleAssignments,
    authorization_alias_count: Object.values(roleAssignments).filter(Boolean).length,
    attestation_results: sanitizeAttestations(safe.attestation_results),
    batch61b_decision_receipt_id: sanitizeText(
      safe.batch61b_decision_receipt_id,
      160
    ).toUpperCase(),
    batch61b_decision_receipt_digest: sanitizeText(
      safe.batch61b_decision_receipt_digest,
      64
    ).toLowerCase(),
    batch60c_change_package_id: sanitizeText(
      safe.batch60c_change_package_id,
      160
    ).toUpperCase(),
    batch60c_change_package_digest: sanitizeText(
      safe.batch60c_change_package_digest,
      64
    ).toLowerCase(),
    batch61a_handoff_receipt_id: sanitizeText(
      safe.batch61a_handoff_receipt_id,
      160
    ).toUpperCase(),
    batch61a_handoff_receipt_digest: sanitizeText(
      safe.batch61a_handoff_receipt_digest,
      64
    ).toLowerCase(),
    request_digest: sanitizeText(safe.request_digest, 64).toLowerCase(),
    prepared_at: normalizeIso(safe.prepared_at) ?? new Date().toISOString(),
    status:
      sanitizeText(safe.status, 48).toUpperCase() ||
      PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.DRAFT,
    ...safetyFlags,
  };
}

export function sanitizePipProductionActivationPermitRevocation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_PRODUCTION_ACTIVATION_PERMIT_REVOCATION_SCHEMA,
    permit_id: sanitizeText(safe.permit_id, 96).toUpperCase(),
    revocation_reason_code: sanitizeText(
      safe.revocation_reason_code,
      80
    ).toUpperCase(),
    revocation_rationale: sanitizeRationale(safe.revocation_rationale),
    change_authority_signoff: safe.change_authority_signoff === true,
  };
}

export function computePipProductionActivationPermitRequestDigest(input = {}) {
  const normalized = sanitizePipProductionActivationPermitRequest(input);
  return computeDigestSync({
    ...normalized,
    permit_request_id: undefined,
    request_digest: undefined,
    prepared_at: undefined,
    status: undefined,
  });
}

export function computePipProductionActivationPermitReceiptDigest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return computeDigestSync({
    ...safe,
    permit_id: undefined,
    permit_receipt_id: undefined,
    permit_receipt_digest: undefined,
    authorized_at: undefined,
    permit_status: undefined,
  });
}

export function computePipProductionActivationPermitRevocationDigest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return computeDigestSync({
    ...safe,
    revocation_receipt_id: undefined,
    revocation_receipt_digest: undefined,
    revoked_at: undefined,
    revocation_status: undefined,
  });
}

export function buildPipProductionActivationPermitEvaluation({
  permitRequest,
  now,
  authenticatedAdministrator,
  hasUserAdminPermission,
  hasAuditMaintainPermission,
  csrfPresent,
  activeConstituency,
  p999Active,
  batch61bDecisionReceipt,
  batch61bDecisionIsGo,
  batch61bStatusIsGo,
  batch61bChairSignoff,
  batch61bReviewerConcurrence,
  batch61bBlockerCount,
  batch61bReceiptValid,
  batch61bDigestMatch,
  batch60cPackageValid,
  batch60cPackageDigestMatch,
  batch61aHandoffValid,
  batch61aHandoffDigestMatch,
  operatorAliasOverlapCount,
  reviewerAliasOverlapCount,
  prohibitedActionFlagActive,
  p999WriteProtection,
} = {}) {
  const request = sanitizePipProductionActivationPermitRequest(permitRequest);
  const currentTime = normalizeIso(now) ?? new Date().toISOString();
  const currentMs = Date.parse(currentTime);
  const startMs = Date.parse(String(request.requested_window_start ?? ""));
  const endMs = Date.parse(String(request.requested_window_end ?? ""));
  const durationMinutes = resolveWindowDurationMinutes(
    request.requested_window_start,
    request.requested_window_end
  );
  const windowExpired = Number.isFinite(endMs) ? endMs <= currentMs : true;
  const futureBoundaryExceeded =
    Number.isFinite(startMs) && Number.isFinite(currentMs)
      ? startMs - currentMs > 30 * 24 * 60 * 60 * 1000
      : true;
  const aliases = Object.values(request.role_assignments ?? {}).filter(Boolean);
  const distinctAliases = new Set(aliases);
  const passedAttestationCount = attestationKeyList().filter(
    (key) => request.attestation_results?.[key] === true
  ).length;
  const safetyFlags = sanitizeSafetyFlags(request);
  const prohibitedActionActive =
    prohibitedActionFlagActive === true ||
    safetyFlags.activation_performed === true ||
    safetyFlags.deployment_execution_performed === true ||
    safetyFlags.database_connection_attempted === true ||
    safetyFlags.database_driver_invoked === true ||
    safetyFlags.database_adapter_invoked === true ||
    safetyFlags.network_resolution_invoked === true ||
    safetyFlags.outbound_network_invoked === true ||
    safetyFlags.sql_execution_invoked === true ||
    safetyFlags.ddl_execution_invoked === true ||
    safetyFlags.schema_creation_invoked === true ||
    safetyFlags.migration_invoked === true ||
    safetyFlags.production_data_write_performed === true ||
    safetyFlags.binding_activation_performed === true ||
    safetyFlags.shadow_write_enabled === true ||
    safetyFlags.dual_write_enabled === true ||
    safetyFlags.repository_cutover_enabled === true ||
    safetyFlags.operational_read_cutover_enabled === true ||
    safetyFlags.operational_write_cutover_enabled === true ||
    safetyFlags.automatic_activation_enabled === true ||
    safetyFlags.automatic_retry_enabled === true ||
    safetyFlags.automatic_synchronisation_enabled === true ||
    safetyFlags.permit_automatically_consumed === true;

  const blockerCodes = [];
  if (authenticatedAdministrator !== true) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.AUTHENTICATION_REQUIRED);
  }
  if (hasUserAdminPermission !== true || hasAuditMaintainPermission !== true) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.AUTHORIZATION_REQUIRED);
  }
  if (csrfPresent !== true) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.CSRF_REQUIRED);
  }
  if (String(activeConstituency ?? "").trim().toUpperCase() !== "P134") {
    blockerCodes.push(
      PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.ACTIVE_CONSTITUENCY_NOT_P134
    );
  }
  if (p999Active === true) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.P999_CONTEXT_BLOCKED);
  }
  if (batch61bReceiptValid !== true) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.BATCH61B_RECEIPT_INVALID);
  }
  if (
    batch61bDecisionIsGo !== true ||
    batch61bStatusIsGo !== true ||
    batch61bChairSignoff !== true ||
    batch61bReviewerConcurrence !== true ||
    Number(batch61bBlockerCount ?? 1) !== 0
  ) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.BATCH61B_GO_REQUIRED);
  }
  if (
    batch61bDigestMatch !== true ||
    batch60cPackageDigestMatch !== true ||
    batch61aHandoffDigestMatch !== true
  ) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.EVIDENCE_DIGEST_MISMATCH);
  }
  if (!durationMinutes || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.CHANGE_WINDOW_INVALID);
  }
  if (durationMinutes !== null && durationMinutes > 240) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.CHANGE_WINDOW_TOO_LONG);
  }
  if (windowExpired || futureBoundaryExceeded) {
    blockerCodes.push(
      windowExpired
        ? PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.CHANGE_WINDOW_EXPIRED
        : PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.CHANGE_WINDOW_INVALID
    );
  }
  if (
    aliases.length !== roleKeyList().length ||
    aliases.some((alias) => !ALIAS_PATTERN.test(alias))
  ) {
    blockerCodes.push(
      PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.AUTHORIZATION_ALIASES_INVALID
    );
  }
  if (distinctAliases.size !== roleKeyList().length) {
    blockerCodes.push(
      PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.AUTHORIZATION_ALIASES_NOT_DISTINCT
    );
  }
  if (Number(operatorAliasOverlapCount ?? 0) > 0) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.OPERATOR_ALIAS_OVERLAP);
  }
  if (Number(reviewerAliasOverlapCount ?? 0) > 0) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.REVIEWER_ALIAS_OVERLAP);
  }
  if (passedAttestationCount !== attestationKeyList().length) {
    blockerCodes.push(
      PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.REQUIRED_ATTESTATION_MISSING
    );
  }
  if (batch60cPackageValid !== true || batch61aHandoffValid !== true) {
    blockerCodes.push(PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.EVIDENCE_DIGEST_MISMATCH);
  }
  if (prohibitedActionActive) {
    blockerCodes.push(
      PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.PROHIBITED_ACTION_FLAG_ACTIVE
    );
  }
  if (p999WriteProtection !== true || safetyFlags.p999_write_protection !== true) {
    blockerCodes.push(
      PIP_PRODUCTION_ACTIVATION_PERMIT_BLOCKER_CODES.P999_WRITE_PROTECTION_INVALID
    );
  }

  const uniqueBlockerCodes = Array.from(new Set(blockerCodes));
  const status =
    uniqueBlockerCodes.length === 0
      ? PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.READY_FOR_AUTHORIZATION
      : PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.BLOCKED;
  const requestDigest =
    request.request_digest || computePipProductionActivationPermitRequestDigest(request);

  return {
    schema: PIP_PRODUCTION_ACTIVATION_PERMIT_EVALUATION_SCHEMA,
    evaluation_id: sanitizeText(arguments[0]?.evaluation_id, 96).toUpperCase(),
    request_id: request.request_id,
    permit_request_id: request.permit_request_id,
    request_digest: requestDigest,
    status,
    target_constituency: request.target_constituency,
    target_environment: request.target_environment,
    change_reference: request.change_reference,
    requested_window_start: request.requested_window_start,
    requested_window_end: request.requested_window_end,
    maximum_window_minutes: request.maximum_window_minutes,
    window_duration_minutes: durationMinutes,
    window_currently_valid:
      uniqueBlockerCodes.length === 0 && startMs <= currentMs && endMs > currentMs,
    window_expired: windowExpired,
    future_window_boundary_valid: futureBoundaryExceeded !== true,
    authorization_alias_count: aliases.length,
    authorization_aliases_distinct: distinctAliases.size === roleKeyList().length,
    operator_alias_overlap_count: Number(operatorAliasOverlapCount ?? 0),
    reviewer_alias_overlap_count: Number(reviewerAliasOverlapCount ?? 0),
    passed_attestation_count: passedAttestationCount,
    required_attestation_count: attestationKeyList().length,
    batch61b_decision: sanitizeText(batch61bDecisionReceipt?.decision, 24).toUpperCase(),
    batch61b_receipt_valid: batch61bReceiptValid === true,
    batch61b_digest_match: batch61bDigestMatch === true,
    batch60c_package_valid: batch60cPackageValid === true,
    batch60c_package_digest_match: batch60cPackageDigestMatch === true,
    batch61a_handoff_valid: batch61aHandoffValid === true,
    batch61a_handoff_digest_match: batch61aHandoffDigestMatch === true,
    required_evidence_present:
      Boolean(request.batch61b_decision_receipt_id) &&
      Boolean(request.batch60c_change_package_id) &&
      Boolean(request.batch61a_handoff_receipt_id),
    required_evidence_valid:
      batch61bReceiptValid === true &&
      batch60cPackageValid === true &&
      batch61aHandoffValid === true,
    blocker_count: uniqueBlockerCodes.length,
    blocker_codes: uniqueBlockerCodes,
    evaluated_at: currentTime,
    prohibited_action_flag_active: prohibitedActionActive,
    p999_write_protection_valid:
      p999WriteProtection === true && safetyFlags.p999_write_protection === true,
  };
}

export function buildPipProductionActivationPermitReceipt({
  permitId,
  permitReceiptId,
  permitRequest,
  permitEvaluation,
  authorizationReasonCode,
  authorizationRationale,
  authorizedAt,
} = {}) {
  const request = sanitizePipProductionActivationPermitRequest(permitRequest);
  const evaluation = isPlainObject(permitEvaluation) ? permitEvaluation : {};
  const normalizedAuthorizedAt = normalizeIso(authorizedAt) ?? new Date().toISOString();
  const receipt = {
    schema: PIP_PRODUCTION_ACTIVATION_PERMIT_RECEIPT_SCHEMA,
    permit_id: sanitizeText(permitId, 96).toUpperCase(),
    permit_receipt_id: sanitizeText(permitReceiptId, 96).toUpperCase(),
    request_id: request.request_id,
    permit_request_id: request.permit_request_id,
    request_digest:
      request.request_digest || computePipProductionActivationPermitRequestDigest(request),
    permit_status: PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.AUTHORIZED,
    target_constituency: request.target_constituency,
    target_environment: request.target_environment,
    change_reference: request.change_reference,
    requested_window_start: request.requested_window_start,
    requested_window_end: request.requested_window_end,
    maximum_window_minutes: request.maximum_window_minutes,
    window_duration_minutes: request.window_duration_minutes,
    role_assignments: { ...(request.role_assignments ?? {}) },
    authorization_alias_count: request.authorization_alias_count,
    authorization_aliases_distinct:
      Number(evaluation.authorization_alias_count ?? 0) === roleKeyList().length &&
      evaluation.authorization_aliases_distinct === true,
    operator_alias_overlap_count: Number(evaluation.operator_alias_overlap_count ?? 0),
    reviewer_alias_overlap_count: Number(evaluation.reviewer_alias_overlap_count ?? 0),
    attestation_results: { ...(request.attestation_results ?? {}) },
    passed_attestation_count: Number(evaluation.passed_attestation_count ?? 0),
    blocker_count: Number(evaluation.blocker_count ?? 0),
    blocker_codes: Array.isArray(evaluation.blocker_codes)
      ? [...evaluation.blocker_codes]
      : [],
    batch61b_decision_receipt_id: request.batch61b_decision_receipt_id,
    batch61b_decision_receipt_digest: request.batch61b_decision_receipt_digest,
    batch60c_change_package_id: request.batch60c_change_package_id,
    batch60c_change_package_digest: request.batch60c_change_package_digest,
    batch61a_handoff_receipt_id: request.batch61a_handoff_receipt_id,
    batch61a_handoff_receipt_digest: request.batch61a_handoff_receipt_digest,
    authorization_reason_code: sanitizeText(authorizationReasonCode, 80).toUpperCase(),
    authorization_rationale: sanitizeRationale(authorizationRationale),
    authorized_at: normalizedAuthorizedAt,
    revocation_status: "NOT_REVOKED",
    activation_performed: false,
    deployment_execution_performed: false,
    database_connection_attempted: false,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    network_resolution_invoked: false,
    outbound_network_invoked: false,
    sql_execution_invoked: false,
    ddl_execution_invoked: false,
    schema_creation_invoked: false,
    migration_invoked: false,
    production_data_write_performed: false,
    binding_activation_performed: false,
    shadow_write_enabled: false,
    dual_write_enabled: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_activation_enabled: false,
    automatic_retry_enabled: false,
    automatic_synchronisation_enabled: false,
    permit_automatically_consumed: false,
    p999_write_protection: true,
    authorization_record_only: true,
    no_activation_performed: true,
  };
  receipt.permit_receipt_digest = computePipProductionActivationPermitReceiptDigest(receipt);
  return receipt;
}

export function buildPipProductionActivationPermitRevocationReceipt({
  revocationReceiptId,
  authorizationReceipt,
  revocation,
  revokedAt,
} = {}) {
  const receipt = isPlainObject(authorizationReceipt) ? authorizationReceipt : {};
  const normalizedRevocation = sanitizePipProductionActivationPermitRevocation(revocation);
  const safe = {
    schema: PIP_PRODUCTION_ACTIVATION_PERMIT_REVOCATION_SCHEMA,
    revocation_receipt_id: sanitizeText(revocationReceiptId, 96).toUpperCase(),
    permit_id: sanitizeText(receipt.permit_id, 96).toUpperCase(),
    request_id: sanitizeText(receipt.request_id, 80).toUpperCase(),
    permit_receipt_digest: sanitizeText(receipt.permit_receipt_digest, 64).toLowerCase(),
    revocation_status: PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.REVOKED,
    revocation_reason_code: normalizedRevocation.revocation_reason_code,
    revocation_rationale: normalizedRevocation.revocation_rationale,
    change_authority_signoff: normalizedRevocation.change_authority_signoff === true,
    batch61b_decision_receipt_id: sanitizeText(
      receipt.batch61b_decision_receipt_id,
      160
    ).toUpperCase(),
    batch61b_decision_receipt_digest: sanitizeText(
      receipt.batch61b_decision_receipt_digest,
      64
    ).toLowerCase(),
    batch60c_change_package_id: sanitizeText(
      receipt.batch60c_change_package_id,
      160
    ).toUpperCase(),
    batch60c_change_package_digest: sanitizeText(
      receipt.batch60c_change_package_digest,
      64
    ).toLowerCase(),
    batch61a_handoff_receipt_id: sanitizeText(
      receipt.batch61a_handoff_receipt_id,
      160
    ).toUpperCase(),
    batch61a_handoff_receipt_digest: sanitizeText(
      receipt.batch61a_handoff_receipt_digest,
      64
    ).toLowerCase(),
    revoked_at: normalizeIso(revokedAt) ?? new Date().toISOString(),
    activation_performed: false,
    deployment_execution_performed: false,
    database_connection_attempted: false,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    network_resolution_invoked: false,
    outbound_network_invoked: false,
    sql_execution_invoked: false,
    ddl_execution_invoked: false,
    schema_creation_invoked: false,
    migration_invoked: false,
    production_data_write_performed: false,
    binding_activation_performed: false,
    shadow_write_enabled: false,
    dual_write_enabled: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_activation_enabled: false,
    automatic_retry_enabled: false,
    automatic_synchronisation_enabled: false,
    permit_automatically_consumed: false,
    p999_write_protection: true,
    usable_for_future_execution: false,
  };
  safe.revocation_receipt_digest = computePipProductionActivationPermitRevocationDigest(safe);
  return safe;
}

export function resolvePipProductionActivationPermitStatus({
  authorizationReceipt,
  revocationReceipt,
  evaluation,
  request,
  now,
} = {}) {
  const normalizedNow = normalizeIso(now) ?? new Date().toISOString();
  const nowMs = Date.parse(normalizedNow);
  const revocationValidation = validatePipProductionActivationPermitRevocationReceipt(
    revocationReceipt
  );
  if (revocationValidation.valid === true) {
    return PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.REVOKED;
  }

  const receiptValidation = validatePipProductionActivationPermitReceipt(
    authorizationReceipt
  );
  if (receiptValidation.valid === true) {
    const endMs = Date.parse(
      String(receiptValidation.normalized.requested_window_end ?? "")
    );
    if (Number.isFinite(endMs) && endMs <= nowMs) {
      return PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.EXPIRED;
    }
    return PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.AUTHORIZED;
  }

  const evaluationValidation = validatePipProductionActivationPermitEvaluation(evaluation);
  if (evaluationValidation.valid === true) {
    return evaluationValidation.normalized.status;
  }

  const requestValidation = validatePipProductionActivationPermitRequest(request);
  if (requestValidation.valid === true) {
    return PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.REVIEW_REQUIRED;
  }

  return PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.NOT_STARTED;
}

export function validatePipProductionActivationPermitContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  if (safe.schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_CONTRACT_SCHEMA) {
    errors.push("Contract schema mismatch.");
  }
  if (safe.request_schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_REQUEST_SCHEMA) {
    errors.push("Request schema mismatch.");
  }
  if (safe.evaluation_schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_EVALUATION_SCHEMA) {
    errors.push("Evaluation schema mismatch.");
  }
  if (safe.receipt_schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_RECEIPT_SCHEMA) {
    errors.push("Receipt schema mismatch.");
  }
  if (safe.revocation_schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_REVOCATION_SCHEMA) {
    errors.push("Revocation schema mismatch.");
  }

  const requiredSummaryFlags = {
    permit_governance_enabled: true,
    manual_permit_preparation_only: true,
    manual_permit_authorization_only: true,
    manual_permit_revocation_only: true,
    time_bound_permits_required: true,
    permit_revocation_enabled: true,
    authorization_receipt_append_only: true,
    revocation_receipt_append_only: true,
    permit_automatic_consumption_enabled: false,
    activation_execution_enabled: false,
    deployment_execution_enabled: false,
    database_operation_enabled: false,
    migration_execution_enabled: false,
    cutover_execution_enabled: false,
    automatic_activation_enabled: false,
    automatic_retry_enabled: false,
    automatic_synchronisation_enabled: false,
    p999_write_protection: true,
  };

  Object.entries(requiredSummaryFlags).forEach(([key, expected]) => {
    if (summary[key] !== expected) {
      errors.push(`${key} must be ${String(expected)}.`);
    }
  });

  if (summary.active_repository_kind !== "DURABLE_FILE") {
    errors.push("active_repository_kind must be DURABLE_FILE.");
  }
  if (summary.durable_file_authoritative !== true) {
    errors.push("durable_file_authoritative must be true.");
  }

  return createValidationResult(errors, safe);
}

export function validatePipProductionActivationPermitRequest(input = {}) {
  const normalized = sanitizePipProductionActivationPermitRequest(input);
  const errors = [];
  const aliases = Object.values(normalized.role_assignments || {});
  const distinctAliases = new Set(aliases.filter(Boolean));
  const startMs = Date.parse(String(normalized.requested_window_start ?? ""));
  const endMs = Date.parse(String(normalized.requested_window_end ?? ""));
  const nowMs = Date.now();

  if (normalized.schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_REQUEST_SCHEMA) {
    errors.push("Request schema mismatch.");
  }
  if (normalized.permit_request_id && !PERMIT_REQUEST_ID_PATTERN.test(normalized.permit_request_id)) {
    errors.push("permit_request_id is invalid.");
  }
  if (!REQUEST_ID_PATTERN.test(normalized.request_id)) {
    errors.push("request_id is invalid.");
  }
  if (normalized.target_constituency !== "P134") {
    errors.push("target_constituency must be P134.");
  }
  if (
    normalized.target_environment !==
    PIP_PRODUCTION_ACTIVATION_TARGET_ENVIRONMENTS.PRODUCTION
  ) {
    errors.push("target_environment must be PRODUCTION.");
  }
  if (!normalized.change_reference) {
    errors.push("change_reference is required.");
  }
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    errors.push("requested window timestamps are invalid.");
  }
  if (
    normalized.maximum_window_minutes < 15 ||
    normalized.maximum_window_minutes > 240
  ) {
    errors.push("maximum_window_minutes must be between 15 and 240.");
  }
  if (
    normalized.window_duration_minutes === null ||
    normalized.window_duration_minutes > 240 ||
    normalized.window_duration_minutes > normalized.maximum_window_minutes
  ) {
    errors.push("window duration exceeds policy.");
  }
  if (Number.isFinite(endMs) && endMs <= nowMs) {
    errors.push("requested window is already expired.");
  }
  if (Number.isFinite(startMs) && startMs - nowMs > 30 * 24 * 60 * 60 * 1000) {
    errors.push("requested window begins more than 30 days in the future.");
  }

  roleKeyList().forEach((roleKey) => {
    if (!ALIAS_PATTERN.test(normalized.role_assignments?.[roleKey] ?? "")) {
      errors.push(`role assignment for ${roleKey} must be APR_XXXXXXXX.`);
    }
  });
  if (distinctAliases.size !== roleKeyList().length) {
    errors.push("authorization aliases must be distinct.");
  }
  attestationKeyList().forEach((key) => {
    if (typeof normalized.attestation_results?.[key] !== "boolean") {
      errors.push(`attestation ${key} must be boolean.`);
    }
  });
  if (!SHA256_PATTERN.test(normalized.batch61b_decision_receipt_digest)) {
    errors.push("batch61b_decision_receipt_digest must be SHA-256 hex.");
  }
  if (!SHA256_PATTERN.test(normalized.batch60c_change_package_digest)) {
    errors.push("batch60c_change_package_digest must be SHA-256 hex.");
  }
  if (!SHA256_PATTERN.test(normalized.batch61a_handoff_receipt_digest)) {
    errors.push("batch61a_handoff_receipt_digest must be SHA-256 hex.");
  }
  if (normalized.activation_performed !== false) {
    errors.push("activation_performed must remain false.");
  }
  if (normalized.deployment_execution_performed !== false) {
    errors.push("deployment_execution_performed must remain false.");
  }
  if (normalized.database_connection_attempted !== false) {
    errors.push("database_connection_attempted must remain false.");
  }
  if (normalized.database_driver_invoked !== false) {
    errors.push("database_driver_invoked must remain false.");
  }
  if (normalized.database_adapter_invoked !== false) {
    errors.push("database_adapter_invoked must remain false.");
  }
  if (normalized.network_resolution_invoked !== false) {
    errors.push("network_resolution_invoked must remain false.");
  }
  if (normalized.outbound_network_invoked !== false) {
    errors.push("outbound_network_invoked must remain false.");
  }
  if (normalized.sql_execution_invoked !== false) {
    errors.push("sql_execution_invoked must remain false.");
  }
  if (normalized.ddl_execution_invoked !== false) {
    errors.push("ddl_execution_invoked must remain false.");
  }
  if (normalized.schema_creation_invoked !== false) {
    errors.push("schema_creation_invoked must remain false.");
  }
  if (normalized.migration_invoked !== false) {
    errors.push("migration_invoked must remain false.");
  }
  if (normalized.production_data_write_performed !== false) {
    errors.push("production_data_write_performed must remain false.");
  }
  if (normalized.binding_activation_performed !== false) {
    errors.push("binding_activation_performed must remain false.");
  }
  if (normalized.shadow_write_enabled !== false) {
    errors.push("shadow_write_enabled must remain false.");
  }
  if (normalized.dual_write_enabled !== false) {
    errors.push("dual_write_enabled must remain false.");
  }
  if (normalized.repository_cutover_enabled !== false) {
    errors.push("repository_cutover_enabled must remain false.");
  }
  if (normalized.operational_read_cutover_enabled !== false) {
    errors.push("operational_read_cutover_enabled must remain false.");
  }
  if (normalized.operational_write_cutover_enabled !== false) {
    errors.push("operational_write_cutover_enabled must remain false.");
  }
  if (normalized.automatic_activation_enabled !== false) {
    errors.push("automatic_activation_enabled must remain false.");
  }
  if (normalized.automatic_retry_enabled !== false) {
    errors.push("automatic_retry_enabled must remain false.");
  }
  if (normalized.automatic_synchronisation_enabled !== false) {
    errors.push("automatic_synchronisation_enabled must remain false.");
  }
  if (normalized.p999_write_protection !== true) {
    errors.push("p999_write_protection must remain true.");
  }

  return createValidationResult(errors, normalized);
}

export function validatePipProductionActivationPermitEvaluation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];
  if (safe.schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_EVALUATION_SCHEMA) {
    errors.push("Evaluation schema mismatch.");
  }
  if (!PERMIT_EVALUATION_ID_PATTERN.test(String(safe.evaluation_id ?? ""))) {
    errors.push("evaluation_id is invalid.");
  }
  if (!REQUEST_ID_PATTERN.test(String(safe.request_id ?? ""))) {
    errors.push("request_id is invalid.");
  }
  if (!PERMIT_REQUEST_ID_PATTERN.test(String(safe.permit_request_id ?? ""))) {
    errors.push("permit_request_id is invalid.");
  }
  if (!SHA256_PATTERN.test(String(safe.request_digest ?? ""))) {
    errors.push("request_digest must be SHA-256 hex.");
  }
  if (!Object.values(PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES).includes(safe.status)) {
    errors.push("evaluation status is invalid.");
  }
  if (safe.target_constituency !== "P134") {
    errors.push("target_constituency must be P134.");
  }
  if (safe.target_environment !== "PRODUCTION") {
    errors.push("target_environment must be PRODUCTION.");
  }
  if (!Array.isArray(safe.blocker_codes)) {
    errors.push("blocker_codes must be an array.");
  }
  if (Number(safe.blocker_count ?? 0) !== (safe.blocker_codes?.length ?? 0)) {
    errors.push("blocker_count must match blocker_codes length.");
  }
  if (safe.prohibited_action_flag_active !== false && safe.status === PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.READY_FOR_AUTHORIZATION) {
    errors.push("ready evaluation cannot have prohibited_action_flag_active.");
  }
  if (safe.p999_write_protection_valid !== true) {
    errors.push("p999_write_protection_valid must be true.");
  }
  return createValidationResult(errors, safe);
}

export function validatePipProductionActivationPermitReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];
  if (safe.schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_RECEIPT_SCHEMA) {
    errors.push("Receipt schema mismatch.");
  }
  if (!PERMIT_ID_PATTERN.test(String(safe.permit_id ?? ""))) {
    errors.push("permit_id is invalid.");
  }
  if (!PERMIT_RECEIPT_ID_PATTERN.test(String(safe.permit_receipt_id ?? ""))) {
    errors.push("permit_receipt_id is invalid.");
  }
  if (!REQUEST_ID_PATTERN.test(String(safe.request_id ?? ""))) {
    errors.push("request_id is invalid.");
  }
  if (!PERMIT_REQUEST_ID_PATTERN.test(String(safe.permit_request_id ?? ""))) {
    errors.push("permit_request_id is invalid.");
  }
  if (!SHA256_PATTERN.test(String(safe.request_digest ?? ""))) {
    errors.push("request_digest must be SHA-256 hex.");
  }
  if (!SHA256_PATTERN.test(String(safe.permit_receipt_digest ?? ""))) {
    errors.push("permit_receipt_digest must be SHA-256 hex.");
  }
  if (safe.permit_status !== PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.AUTHORIZED) {
    errors.push("permit_status must be AUTHORIZED.");
  }
  if (safe.target_constituency !== "P134") {
    errors.push("target_constituency must be P134.");
  }
  if (safe.target_environment !== "PRODUCTION") {
    errors.push("target_environment must be PRODUCTION.");
  }
  if (!Object.values(PIP_PRODUCTION_ACTIVATION_PERMIT_REASON_CODES).includes(safe.authorization_reason_code)) {
    errors.push("authorization_reason_code is invalid.");
  }
  if (safe.blocker_count !== 0) {
    errors.push("authorized receipt blocker_count must be 0.");
  }
  if (safe.activation_performed !== false || safe.deployment_execution_performed !== false) {
    errors.push("execution flags must remain false.");
  }
  if (safe.database_connection_attempted !== false || safe.database_driver_invoked !== false || safe.database_adapter_invoked !== false) {
    errors.push("database flags must remain false.");
  }
  if (safe.network_resolution_invoked !== false || safe.outbound_network_invoked !== false) {
    errors.push("network flags must remain false.");
  }
  if (safe.sql_execution_invoked !== false || safe.ddl_execution_invoked !== false || safe.schema_creation_invoked !== false || safe.migration_invoked !== false) {
    errors.push("sql/migration flags must remain false.");
  }
  if (safe.shadow_write_enabled !== false || safe.dual_write_enabled !== false || safe.repository_cutover_enabled !== false || safe.operational_read_cutover_enabled !== false || safe.operational_write_cutover_enabled !== false) {
    errors.push("cutover flags must remain false.");
  }
  if (safe.automatic_activation_enabled !== false || safe.automatic_retry_enabled !== false || safe.automatic_synchronisation_enabled !== false || safe.permit_automatically_consumed !== false) {
    errors.push("automatic flags must remain false.");
  }
  if (safe.p999_write_protection !== true) {
    errors.push("p999_write_protection must remain true.");
  }
  return createValidationResult(errors, safe);
}

export function validatePipProductionActivationPermitRevocationReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];
  if (safe.schema !== PIP_PRODUCTION_ACTIVATION_PERMIT_REVOCATION_SCHEMA) {
    errors.push("Revocation schema mismatch.");
  }
  if (!REVOCATION_RECEIPT_ID_PATTERN.test(String(safe.revocation_receipt_id ?? ""))) {
    errors.push("revocation_receipt_id is invalid.");
  }
  if (!PERMIT_ID_PATTERN.test(String(safe.permit_id ?? ""))) {
    errors.push("permit_id is invalid.");
  }
  if (!SHA256_PATTERN.test(String(safe.permit_receipt_digest ?? ""))) {
    errors.push("permit_receipt_digest must be SHA-256 hex.");
  }
  if (!SHA256_PATTERN.test(String(safe.revocation_receipt_digest ?? ""))) {
    errors.push("revocation_receipt_digest must be SHA-256 hex.");
  }
  if (safe.revocation_status !== PIP_PRODUCTION_ACTIVATION_PERMIT_STATUSES.REVOKED) {
    errors.push("revocation_status must be REVOKED.");
  }
  if (!Object.values(PIP_PRODUCTION_ACTIVATION_PERMIT_REASON_CODES).includes(safe.revocation_reason_code)) {
    errors.push("revocation_reason_code is invalid.");
  }
  if (safe.change_authority_signoff !== true) {
    errors.push("change_authority_signoff must be true.");
  }
  if (safe.usable_for_future_execution !== false) {
    errors.push("usable_for_future_execution must be false.");
  }
  if (safe.activation_performed !== false || safe.deployment_execution_performed !== false) {
    errors.push("execution flags must remain false.");
  }
  if (safe.p999_write_protection !== true) {
    errors.push("p999_write_protection must remain true.");
  }
  return createValidationResult(errors, safe);
}