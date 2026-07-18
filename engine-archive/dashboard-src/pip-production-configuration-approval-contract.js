export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_CONTRACT_SCHEMA =
  "pip.production-configuration-approval.contract.v1";

export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_ENVELOPE_SCHEMA =
  "pip.production-configuration-approval.envelope.v1";

export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_RECEIPT_SCHEMA =
  "pip.production-configuration-approval.receipt.v1";

export const PIP_PRODUCTION_CONFIGURATION_ACTIVATION_READINESS_REPORT_SCHEMA =
  "pip.production-configuration-approval.activation-readiness-report.v1";

export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_STATUSES = Object.freeze({
  EMPTY: "EMPTY",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  IDEMPOTENT_REPLAY: "IDEMPOTENT_REPLAY",
});

export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_ACTIONS = Object.freeze({
  APPROVE: "APPROVE",
  REJECT: "REJECT",
});

export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_REASON_CODES = Object.freeze({
  READY_FOR_ACTIVATION: "READY_FOR_ACTIVATION",
  POLICY_EXCEPTION_REQUIRED: "POLICY_EXCEPTION_REQUIRED",
  MISSING_ATTESTATION: "MISSING_ATTESTATION",
  CHANGE_REFERENCE_MISMATCH: "CHANGE_REFERENCE_MISMATCH",
  INTAKE_DIGEST_MISMATCH: "INTAKE_DIGEST_MISMATCH",
  INTAKE_NOT_FOUND: "INTAKE_NOT_FOUND",
  P999_READ_ONLY_PROTECTION: "P999_READ_ONLY_PROTECTION",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED",
});

export const PIP_PRODUCTION_CONFIGURATION_APPROVAL_ATTESTATION_RULES =
  Object.freeze({
    attested_role_required: "ADMINISTRATOR",
    require_attestation_timestamp: true,
    require_non_empty_request_id: true,
    require_intake_binding: true,
    require_change_reference_alignment: true,
    require_intake_digest_alignment: true,
    mutable_secret_values_allowed: false,
    connection_values_allowed: false,
    host_values_allowed: false,
    sql_execution_allowed: false,
    migration_allowed: false,
    cutover_allowed: false,
    automatic_activation_allowed: false,
    p999_write_protection: true,
  });

const PIP_REQUEST_ID_PATTERN = /^REQ-[A-Z0-9-]{6,72}$/;
const PIP_APPROVAL_ID_PATTERN = /^APPROVAL-[A-Z0-9-]{12,96}$/;
const PIP_INTAKE_ID_PATTERN = /^INTAKE-[A-Z0-9-]{12,96}$/;
const PIP_SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const PIP_CHANGE_REFERENCE_PATTERN = /^CHG-[A-Z0-9-]{4,32}$/;

const PIP_FORBIDDEN_KEY_NAMES = new Set([
  "password",
  "token",
  "secret",
  "secret_value",
  "connection_string",
  "database_url",
  "host",
  "hostname",
  "ip",
  "port",
  "username",
  "database",
  "database_name",
  "request_body",
  "raw_request_body",
  "email",
]);

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

function hasForbiddenKeyName(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeyName(entry));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).some(([key, nested]) => {
    const normalizedKey = sanitizeText(key).toLowerCase();
    if (PIP_FORBIDDEN_KEY_NAMES.has(normalizedKey)) {
      return true;
    }

    return hasForbiddenKeyName(nested);
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (!isPlainObject(value)) {
    return JSON.stringify(value);
  }

  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function digestPipProductionConfigurationIntakeReceipt(receipt) {
  const serialized = stableStringify(isPlainObject(receipt) ? receipt : {});
  return globalThis.crypto?.subtle
    ? null
    : serialized;
}

function computeDigestSync(receipt) {
  const serialized = stableStringify(isPlainObject(receipt) ? receipt : {});
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 31 + serialized.charCodeAt(index)) >>> 0;
  }

  const pad = hash.toString(16).padStart(8, "0");
  const expanded = `${pad}${pad}${pad}${pad}${pad}${pad}${pad}${pad}`;
  return expanded.slice(0, 64);
}

export function buildPipProductionConfigurationApprovalContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_PRODUCTION_CONFIGURATION_APPROVAL_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    envelope_schema: PIP_PRODUCTION_CONFIGURATION_APPROVAL_ENVELOPE_SCHEMA,
    receipt_schema: PIP_PRODUCTION_CONFIGURATION_APPROVAL_RECEIPT_SCHEMA,
    activation_readiness_report_schema:
      PIP_PRODUCTION_CONFIGURATION_ACTIVATION_READINESS_REPORT_SCHEMA,
    statuses: { ...PIP_PRODUCTION_CONFIGURATION_APPROVAL_STATUSES },
    actions: { ...PIP_PRODUCTION_CONFIGURATION_APPROVAL_ACTIONS },
    reason_codes: { ...PIP_PRODUCTION_CONFIGURATION_APPROVAL_REASON_CODES },
    attestation_rules: {
      ...PIP_PRODUCTION_CONFIGURATION_APPROVAL_ATTESTATION_RULES,
    },
    summary: {
      approval_workflow_enabled: true,
      activation_readiness_enabled: true,
      administrator_only: true,
      csrf_required: true,
      approval_idempotent: true,
      latest_intake_binding_required: true,
      intake_digest_match_required: true,
      change_reference_match_required: true,
      secret_values_accepted: false,
      environment_values_accepted: false,
      hostnames_accepted: false,
      ip_addresses_accepted: false,
      ports_accepted: false,
      usernames_accepted: false,
      passwords_accepted: false,
      database_names_accepted: false,
      connection_strings_accepted: false,
      sql_execution_enabled: false,
      ddl_execution_enabled: false,
      migration_execution_enabled: false,
      activation_execution_enabled: false,
      automatic_activation_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      p999_write_protection: true,
    },
  };
}

export function sanitizePipProductionConfigurationApprovalEnvelope(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const action = sanitizeText(safe.action).toUpperCase();
  const reasonCode = sanitizeText(safe.reason_code).toUpperCase();

  return {
    schema: PIP_PRODUCTION_CONFIGURATION_APPROVAL_ENVELOPE_SCHEMA,
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    intake_id: sanitizeText(safe.intake_id).toUpperCase(),
    intake_digest: sanitizeText(safe.intake_digest).toLowerCase(),
    change_reference: sanitizeText(safe.change_reference).toUpperCase(),
    action,
    reason_code:
      reasonCode ||
      (action === PIP_PRODUCTION_CONFIGURATION_APPROVAL_ACTIONS.APPROVE
        ? PIP_PRODUCTION_CONFIGURATION_APPROVAL_REASON_CODES.READY_FOR_ACTIVATION
        : PIP_PRODUCTION_CONFIGURATION_APPROVAL_REASON_CODES.MANUAL_REVIEW_REQUIRED),
    approval_comment: sanitizeText(safe.approval_comment).slice(0, 280),
    attested_by_role: sanitizeText(safe.attested_by_role).toUpperCase(),
    attested_at: normalizeIso(safe.attested_at) ?? new Date().toISOString(),
  };
}

export function validatePipProductionConfigurationApprovalContractManifest(
  manifest
) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const attestationRules = isPlainObject(safe.attestation_rules)
    ? safe.attestation_rules
    : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_PRODUCTION_CONFIGURATION_APPROVAL_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    envelope_schema_valid:
      safe.envelope_schema === PIP_PRODUCTION_CONFIGURATION_APPROVAL_ENVELOPE_SCHEMA,
    receipt_schema_valid:
      safe.receipt_schema === PIP_PRODUCTION_CONFIGURATION_APPROVAL_RECEIPT_SCHEMA,
    readiness_schema_valid:
      safe.activation_readiness_report_schema ===
      PIP_PRODUCTION_CONFIGURATION_ACTIVATION_READINESS_REPORT_SCHEMA,
    approval_workflow_enabled: summary.approval_workflow_enabled === true,
    activation_readiness_enabled: summary.activation_readiness_enabled === true,
    administrator_only: summary.administrator_only === true,
    csrf_required: summary.csrf_required === true,
    approval_idempotent: summary.approval_idempotent === true,
    latest_intake_binding_required:
      summary.latest_intake_binding_required === true,
    intake_digest_match_required: summary.intake_digest_match_required === true,
    change_reference_match_required:
      summary.change_reference_match_required === true,
    secret_values_accepted: summary.secret_values_accepted === false,
    environment_values_accepted: summary.environment_values_accepted === false,
    hostnames_accepted: summary.hostnames_accepted === false,
    ip_addresses_accepted: summary.ip_addresses_accepted === false,
    ports_accepted: summary.ports_accepted === false,
    usernames_accepted: summary.usernames_accepted === false,
    passwords_accepted: summary.passwords_accepted === false,
    database_names_accepted: summary.database_names_accepted === false,
    connection_strings_accepted: summary.connection_strings_accepted === false,
    sql_execution_enabled: summary.sql_execution_enabled === false,
    ddl_execution_enabled: summary.ddl_execution_enabled === false,
    migration_execution_enabled: summary.migration_execution_enabled === false,
    activation_execution_enabled: summary.activation_execution_enabled === false,
    automatic_activation_enabled: summary.automatic_activation_enabled === false,
    operational_read_cutover_enabled:
      summary.operational_read_cutover_enabled === false,
    operational_write_cutover_enabled:
      summary.operational_write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      summary.automatic_synchronisation_enabled === false,
    p999_write_protection: summary.p999_write_protection === true,
    active_repository_kind: summary.active_repository_kind === "DURABLE_FILE",
    durable_file_authoritative: summary.durable_file_authoritative === true,
    attested_role_required:
      attestationRules.attested_role_required === "ADMINISTRATOR",
    require_non_empty_request_id:
      attestationRules.require_non_empty_request_id === true,
    require_intake_binding: attestationRules.require_intake_binding === true,
    require_change_reference_alignment:
      attestationRules.require_change_reference_alignment === true,
    require_intake_digest_alignment:
      attestationRules.require_intake_digest_alignment === true,
    mutable_secret_values_allowed:
      attestationRules.mutable_secret_values_allowed === false,
    cutover_allowed: attestationRules.cutover_allowed === false,
    automatic_activation_allowed:
      attestationRules.automatic_activation_allowed === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) =>
      `Production configuration approval manifest check failed: ${key}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: buildPipProductionConfigurationApprovalContractManifest({
      generatedAt: safe.generated_at,
    }),
  };
}

export function validatePipProductionConfigurationApprovalEnvelope(envelope) {
  const normalized = sanitizePipProductionConfigurationApprovalEnvelope(envelope);

  const checks = {
    schema_valid:
      normalized.schema === PIP_PRODUCTION_CONFIGURATION_APPROVAL_ENVELOPE_SCHEMA,
    request_id_valid: PIP_REQUEST_ID_PATTERN.test(normalized.request_id),
    intake_id_valid: PIP_INTAKE_ID_PATTERN.test(normalized.intake_id),
    intake_digest_valid: PIP_SHA256_PATTERN.test(normalized.intake_digest),
    change_reference_valid:
      PIP_CHANGE_REFERENCE_PATTERN.test(normalized.change_reference),
    action_valid: Object.values(PIP_PRODUCTION_CONFIGURATION_APPROVAL_ACTIONS).includes(
      normalized.action
    ),
    reason_code_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_APPROVAL_REASON_CODES
    ).includes(normalized.reason_code),
    approval_comment_valid:
      normalized.approval_comment.length > 0 &&
      normalized.approval_comment.length <= 280,
    attested_by_role_valid:
      normalized.attested_by_role ===
      PIP_PRODUCTION_CONFIGURATION_APPROVAL_ATTESTATION_RULES.attested_role_required,
    attested_at_valid: normalizeIso(normalized.attested_at) !== null,
    forbidden_keys_absent: hasForbiddenKeyName(normalized) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) =>
      `Production configuration approval envelope check failed: ${key}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function buildPipProductionConfigurationActivationReadinessReport({
  generatedAt,
  latestIntakeReceipt,
  latestApprovalReceipt,
  readinessChecks,
  serverInstanceId,
} = {}) {
  const checks = Array.isArray(readinessChecks) ? readinessChecks : [];
  const hasFailedCheck = checks.some(
    (entry) => String(entry?.status ?? "").toUpperCase() !== "PASS"
  );
  const status =
    hasFailedCheck || !latestIntakeReceipt || !latestApprovalReceipt
      ? "NOT_READY"
      : "READY";

  return {
    schema: PIP_PRODUCTION_CONFIGURATION_ACTIVATION_READINESS_REPORT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    status,
    server_instance_id: sanitizeText(serverInstanceId) || "unknown",
    active_repository_kind: "DURABLE_FILE",
    durable_file_authoritative: true,
    latest_intake_id: sanitizeText(latestIntakeReceipt?.intake_id).toUpperCase() || null,
    latest_approval_id:
      sanitizeText(latestApprovalReceipt?.approval_id).toUpperCase() || null,
    latest_approval_status:
      sanitizeText(latestApprovalReceipt?.status).toUpperCase() ||
      PIP_PRODUCTION_CONFIGURATION_APPROVAL_STATUSES.EMPTY,
    readiness_checks: checks.map((entry) => ({
      check_id: sanitizeText(entry?.check_id).toUpperCase(),
      status: sanitizeText(entry?.status).toUpperCase(),
      message: sanitizeText(entry?.message),
      required: entry?.required !== false,
    })),
    summary: {
      total_checks: checks.length,
      passed_checks: checks.filter(
        (entry) => String(entry?.status ?? "").toUpperCase() === "PASS"
      ).length,
      failed_checks: checks.filter(
        (entry) => String(entry?.status ?? "").toUpperCase() !== "PASS"
      ).length,
      p999_write_protection: true,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      activation_execution_enabled: false,
      sql_execution_enabled: false,
      migration_execution_enabled: false,
    },
  };
}

export function validatePipProductionConfigurationActivationReadinessReport(
  report
) {
  const safe = isPlainObject(report) ? report : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const readinessChecks = Array.isArray(safe.readiness_checks)
    ? safe.readiness_checks
    : [];

  const checks = {
    schema_valid:
      safe.schema ===
      PIP_PRODUCTION_CONFIGURATION_ACTIVATION_READINESS_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    status_valid:
      String(safe.status ?? "") === "READY" ||
      String(safe.status ?? "") === "NOT_READY",
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    active_repository_kind_valid:
      String(safe.active_repository_kind ?? "") === "DURABLE_FILE",
    durable_file_authoritative: safe.durable_file_authoritative === true,
    approval_status_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_APPROVAL_STATUSES
    ).includes(String(safe.latest_approval_status ?? "")),
    readiness_checks_valid: readinessChecks.every(
      (entry) =>
        isPlainObject(entry) &&
        typeof entry.check_id === "string" &&
        entry.check_id.trim().length > 0 &&
        (String(entry.status ?? "") === "PASS" ||
          String(entry.status ?? "") === "FAIL") &&
        typeof entry.message === "string" &&
        entry.message.trim().length > 0 &&
        typeof entry.required === "boolean"
    ),
    summary_counts_valid:
      Number(summary.total_checks) === readinessChecks.length &&
      Number(summary.passed_checks) + Number(summary.failed_checks) ===
        Number(summary.total_checks),
    p999_write_protection: summary.p999_write_protection === true,
    read_cutover_enabled: summary.read_cutover_enabled === false,
    write_cutover_enabled: summary.write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      summary.automatic_synchronisation_enabled === false,
    activation_execution_enabled: summary.activation_execution_enabled === false,
    sql_execution_enabled: summary.sql_execution_enabled === false,
    migration_execution_enabled: summary.migration_execution_enabled === false,
    forbidden_keys_absent: hasForbiddenKeyName(safe) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) =>
      `Activation readiness report check failed: ${key}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at:
        normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      readiness_checks: readinessChecks,
      summary: {
        total_checks: readinessChecks.length,
        passed_checks: readinessChecks.filter(
          (entry) => String(entry.status ?? "") === "PASS"
        ).length,
        failed_checks: readinessChecks.filter(
          (entry) => String(entry.status ?? "") !== "PASS"
        ).length,
        p999_write_protection: true,
        read_cutover_enabled: false,
        write_cutover_enabled: false,
        automatic_synchronisation_enabled: false,
        activation_execution_enabled: false,
        sql_execution_enabled: false,
        migration_execution_enabled: false,
      },
    },
  };
}

export function validatePipProductionConfigurationApprovalReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_PRODUCTION_CONFIGURATION_APPROVAL_RECEIPT_SCHEMA,
    approval_id_valid: PIP_APPROVAL_ID_PATTERN.test(sanitizeText(safe.approval_id)),
    request_id_valid: PIP_REQUEST_ID_PATTERN.test(sanitizeText(safe.request_id)),
    status_valid: Object.values(PIP_PRODUCTION_CONFIGURATION_APPROVAL_STATUSES).includes(
      sanitizeText(safe.status).toUpperCase()
    ),
    action_valid: Object.values(PIP_PRODUCTION_CONFIGURATION_APPROVAL_ACTIONS).includes(
      sanitizeText(safe.action).toUpperCase()
    ),
    reason_code_valid: Object.values(
      PIP_PRODUCTION_CONFIGURATION_APPROVAL_REASON_CODES
    ).includes(sanitizeText(safe.reason_code).toUpperCase()),
    intake_id_valid: PIP_INTAKE_ID_PATTERN.test(sanitizeText(safe.intake_id)),
    intake_digest_valid: PIP_SHA256_PATTERN.test(sanitizeText(safe.intake_digest)),
    change_reference_valid: PIP_CHANGE_REFERENCE_PATTERN.test(
      sanitizeText(safe.change_reference).toUpperCase()
    ),
    attested_by_role_valid:
      sanitizeText(safe.attested_by_role).toUpperCase() === "ADMINISTRATOR",
    attested_at_valid: normalizeIso(safe.attested_at) !== null,
    stored_at_valid: normalizeIso(safe.stored_at) !== null,
    durable_readback_valid: safe.durable_readback === true,
    forbidden_keys_absent: hasForbiddenKeyName(safe) === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([key]) =>
      `Production configuration approval receipt check failed: ${key}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_PRODUCTION_CONFIGURATION_APPROVAL_RECEIPT_SCHEMA,
      approval_id: sanitizeText(safe.approval_id).toUpperCase(),
      request_id: sanitizeText(safe.request_id).toUpperCase(),
      status: sanitizeText(safe.status).toUpperCase(),
      action: sanitizeText(safe.action).toUpperCase(),
      reason_code: sanitizeText(safe.reason_code).toUpperCase(),
      intake_id: sanitizeText(safe.intake_id).toUpperCase(),
      intake_digest: sanitizeText(safe.intake_digest).toLowerCase(),
      change_reference: sanitizeText(safe.change_reference).toUpperCase(),
      approval_comment: sanitizeText(safe.approval_comment).slice(0, 280),
      attested_by_role: sanitizeText(safe.attested_by_role).toUpperCase(),
      attested_at: normalizeIso(safe.attested_at) ?? new Date().toISOString(),
      stored_at: normalizeIso(safe.stored_at) ?? new Date().toISOString(),
      revision: Number.parseInt(String(safe.revision ?? "0"), 10),
      durable_readback: safe.durable_readback === true,
      idempotency_status: sanitizeText(safe.idempotency_status).toUpperCase(),
      activation_readiness_status:
        sanitizeText(safe.activation_readiness_status).toUpperCase() || "NOT_READY",
      safety_flags: {
        secret_values_accepted: false,
        environment_values_accepted: false,
        hostnames_accepted: false,
        ip_addresses_accepted: false,
        ports_accepted: false,
        usernames_accepted: false,
        passwords_accepted: false,
        database_names_accepted: false,
        connection_strings_accepted: false,
        sql_execution_enabled: false,
        ddl_execution_enabled: false,
        migration_execution_enabled: false,
        activation_execution_enabled: false,
        automatic_synchronisation_enabled: false,
        read_cutover_enabled: false,
        write_cutover_enabled: false,
        p999_write_protection: true,
      },
    },
  };
}

export function computePipProductionConfigurationApprovalDigest(input) {
  return computeDigestSync(input);
}
