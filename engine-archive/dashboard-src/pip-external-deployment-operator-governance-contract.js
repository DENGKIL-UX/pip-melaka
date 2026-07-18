export const PIP_EXTERNAL_OPERATOR_GOVERNANCE_CONTRACT_SCHEMA =
  "pip.external-operator-governance.contract.v1";

export const PIP_EXTERNAL_OPERATOR_CHECKLIST_SCHEMA =
  "pip.external-operator-checklist.v1";

export const PIP_EXTERNAL_OPERATOR_EVALUATION_SCHEMA =
  "pip.external-operator-evaluation.v1";

export const PIP_EXTERNAL_OPERATOR_HANDOFF_SCHEMA =
  "pip.external-operator-handoff.v1";

export const PIP_EXTERNAL_OPERATOR_GOVERNANCE_STATUSES = Object.freeze({
  NOT_PREPARED: "NOT_PREPARED",
  PREPARED: "PREPARED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
  READY_FOR_EXTERNAL_OPERATOR_REVIEW: "READY_FOR_EXTERNAL_OPERATOR_REVIEW",
  HANDOFF_ACKNOWLEDGED: "HANDOFF_ACKNOWLEDGED",
  SUPERSEDED: "SUPERSEDED",
});

export const PIP_EXTERNAL_OPERATOR_CHECK_STATUSES = Object.freeze({
  NOT_CHECKED: "NOT_CHECKED",
  PASS: "PASS",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED: "BLOCKED",
});

export const PIP_EXTERNAL_OPERATOR_ROLE_KEYS = Object.freeze({
  CHANGE_REQUESTOR: "CHANGE_REQUESTOR",
  SECURITY_REVIEWER: "SECURITY_REVIEWER",
  DEPLOYMENT_OPERATOR: "DEPLOYMENT_OPERATOR",
  ROLLBACK_OPERATOR: "ROLLBACK_OPERATOR",
  MONITORING_OBSERVER: "MONITORING_OBSERVER",
});

export const PIP_EXTERNAL_OPERATOR_ALIAS_PATTERN =
  /^OPR_[A-Z0-9_]{8,48}$/;

export const PIP_EXTERNAL_OPERATOR_CHECK_KEYS = Object.freeze({
  LATEST_CHANGE_PACKAGE_PRESENT: "latest_change_package_present",
  CHANGE_PACKAGE_VALID: "change_package_valid",
  CHANGE_PACKAGE_NOT_SUPERSEDED: "change_package_not_superseded",
  PACKAGE_DIGEST_VALID: "package_digest_valid",
  STATIC_DRY_RUN_PRESENT: "static_dry_run_present",
  STATIC_DRY_RUN_VALID: "static_dry_run_valid",
  STATIC_DRY_RUN_PASSED: "static_dry_run_passed",
  ZERO_DRY_RUN_BLOCKERS: "zero_dry_run_blockers",
  OPERATOR_HANDOFF_PRESENT: "operator_handoff_present",
  OPERATOR_HANDOFF_VALID: "operator_handoff_valid",
  OPERATOR_HANDOFF_ACKNOWLEDGED: "operator_handoff_acknowledged",
  MAINTENANCE_WINDOW_CLASSIFIED: "maintenance_window_classified",
  ROLLBACK_CLASSIFICATION_PRESENT: "rollback_classification_present",
  MONITORING_CLASSIFICATION_PRESENT: "monitoring_classification_present",
  CHANGE_REQUESTOR_ASSIGNED: "change_requestor_assigned",
  SECURITY_REVIEWER_ASSIGNED: "security_reviewer_assigned",
  DEPLOYMENT_OPERATOR_ASSIGNED: "deployment_operator_assigned",
  ROLLBACK_OPERATOR_ASSIGNED: "rollback_operator_assigned",
  MONITORING_OBSERVER_ASSIGNED: "monitoring_observer_assigned",
  OPERATOR_ALIASES_OPAQUE: "operator_aliases_opaque",
  MINIMUM_DISTINCT_OPERATOR_COUNT_MET: "minimum_distinct_operator_count_met",
  REQUESTOR_REVIEWER_SEPARATED: "requestor_reviewer_separated",
  REQUESTOR_OPERATOR_SEPARATED: "requestor_operator_separated",
  REVIEWER_OPERATOR_SEPARATED: "reviewer_operator_separated",
  OPERATOR_ROLLBACK_SEPARATED: "operator_rollback_separated",
  OPERATOR_OBSERVER_SEPARATED: "operator_observer_separated",
  REVIEWER_OBSERVER_SEPARATED: "reviewer_observer_separated",
  INCIDENT_ESCALATION_PATH_ATTESTED: "incident_escalation_path_attested",
  ROLLBACK_DECISION_AUTHORITY_ATTESTED:
    "rollback_decision_authority_attested",
  MONITORING_RESPONSIBILITY_ATTESTED: "monitoring_responsibility_attested",
  MANUAL_EXECUTION_ONLY_ATTESTED: "manual_execution_only_attested",
  NO_SECRET_VALUES_ATTESTED: "no_secret_values_attested",
  NO_ENVIRONMENT_VALUES_ATTESTED: "no_environment_values_attested",
  NO_CONNECTION_VALUES_ATTESTED: "no_connection_values_attested",
  NO_EXECUTABLE_COMMANDS_ATTESTED: "no_executable_commands_attested",
  NO_DATABASE_OPERATION_ATTESTED: "no_database_operation_attested",
  CUTOVERS_REMAIN_DISABLED_ATTESTED: "cutovers_remain_disabled_attested",
  AUTOMATIC_SYNCHRONISATION_DISABLED_ATTESTED:
    "automatic_synchronisation_disabled_attested",
  P999_PROTECTED: "p999_protected",
  DURABLE_READBACK_VALID: "durable_readback_valid",
});

export const PIP_EXTERNAL_OPERATOR_ATTESTATION_KEYS = Object.freeze({
  EXTERNAL_ROLES_REVIEWED: "external_roles_reviewed",
  INCIDENT_ESCALATION_PATH_CONFIRMED: "incident_escalation_path_confirmed",
  ROLLBACK_DECISION_AUTHORITY_CONFIRMED:
    "rollback_decision_authority_confirmed",
  MONITORING_RESPONSIBILITY_CONFIRMED:
    "monitoring_responsibility_confirmed",
  MANUAL_OPERATOR_EXECUTION_ONLY: "manual_operator_execution_only",
  NO_SECRET_VALUES_IN_PACKAGE: "no_secret_values_in_package",
  NO_ENVIRONMENT_VALUES_IN_PACKAGE: "no_environment_values_in_package",
  NO_CONNECTION_VALUES_IN_PACKAGE: "no_connection_values_in_package",
  NO_EXECUTABLE_COMMANDS_IN_PACKAGE: "no_executable_commands_in_package",
  NO_DATABASE_OPERATION_REQUESTED: "no_database_operation_requested",
  CUTOVERS_REMAIN_DISABLED: "cutovers_remain_disabled",
  AUTOMATIC_SYNCHRONISATION_REMAINS_DISABLED:
    "automatic_synchronisation_remains_disabled",
  P999_REMAINS_PROTECTED: "p999_remains_protected",
});

export const PIP_EXTERNAL_OPERATOR_BLOCKER_CODES = Object.freeze({
  LATEST_CHANGE_PACKAGE_REQUIRED: "LATEST_CHANGE_PACKAGE_REQUIRED",
  LATEST_CHANGE_PACKAGE_INVALID: "LATEST_CHANGE_PACKAGE_INVALID",
  STALE_CHANGE_PACKAGE: "STALE_CHANGE_PACKAGE",
  SUPERSEDED_CHANGE_PACKAGE: "SUPERSEDED_CHANGE_PACKAGE",
  DRY_RUN_REQUIRED: "DRY_RUN_REQUIRED",
  DRY_RUN_NOT_PASSED: "DRY_RUN_NOT_PASSED",
  DRY_RUN_BLOCKERS_PRESENT: "DRY_RUN_BLOCKERS_PRESENT",
  HANDOFF_REQUIRED: "HANDOFF_REQUIRED",
  HANDOFF_NOT_ACKNOWLEDGED: "HANDOFF_NOT_ACKNOWLEDGED",
  REQUIRED_ROLE_MISSING: "REQUIRED_ROLE_MISSING",
  ALIAS_FORMAT_INVALID: "ALIAS_FORMAT_INVALID",
  ALIAS_NOT_OPAQUE: "ALIAS_NOT_OPAQUE",
  MINIMUM_DISTINCT_OPERATOR_COUNT_NOT_MET:
    "MINIMUM_DISTINCT_OPERATOR_COUNT_NOT_MET",
  SEPARATION_RULE_FAILED: "SEPARATION_RULE_FAILED",
  REQUIRED_ATTESTATION_INCOMPLETE: "REQUIRED_ATTESTATION_INCOMPLETE",
  RAW_ALIAS_PERSISTENCE_BLOCKED: "RAW_ALIAS_PERSISTENCE_BLOCKED",
  SECURITY_INVARIANT_FAILED: "SECURITY_INVARIANT_FAILED",
  P999_CONTEXT_BLOCKED: "P999_CONTEXT_BLOCKED",
  DURABLE_READBACK_INVALID: "DURABLE_READBACK_INVALID",
});

const REQUEST_ID_PATTERN = /^REQ-[A-Z0-9-]{6,72}$/;
const CHECKLIST_ID_PATTERN = /^CHK-[A-Z0-9-]{12,96}$/;
const EVALUATION_ID_PATTERN = /^EVAL-[A-Z0-9-]{12,96}$/;
const HANDOFF_ID_PATTERN = /^EOH-[A-Z0-9-]{12,96}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

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
  /(?:postgres|mysql|mongodb):\/\//i,
];

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

function computeDigestSync(value) {
  const serialized = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 31 + serialized.charCodeAt(index)) >>> 0;
  }
  const part = hash.toString(16).padStart(8, "0");
  return `${part}${part}${part}${part}${part}${part}${part}${part}`.slice(0, 64);
}

function toRoleKeyList() {
  return Object.values(PIP_EXTERNAL_OPERATOR_ROLE_KEYS);
}

function toAttestationKeyList() {
  return Object.values(PIP_EXTERNAL_OPERATOR_ATTESTATION_KEYS);
}

function hasForbiddenAliasPattern(alias) {
  return FORBIDDEN_ALIAS_PATTERNS.some((pattern) => pattern.test(alias));
}

function sanitizeAlias(value) {
  return sanitizeText(value).toUpperCase();
}

function isOpaqueOperatorAlias(value) {
  const alias = sanitizeAlias(value);
  if (!PIP_EXTERNAL_OPERATOR_ALIAS_PATTERN.test(alias)) {
    return false;
  }
  if (hasForbiddenAliasPattern(alias)) {
    return false;
  }
  return true;
}

function sanitizeRoleAssignments(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  toRoleKeyList().forEach((roleKey) => {
    normalized[roleKey] = sanitizeAlias(safe[roleKey]);
  });
  return normalized;
}

function sanitizeRoleAssignmentDigests(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  toRoleKeyList().forEach((roleKey) => {
    normalized[roleKey] = sanitizeText(safe[roleKey]).toLowerCase();
  });
  return normalized;
}

function sanitizeAttestations(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  toAttestationKeyList().forEach((key) => {
    normalized[key] = safe[key] === true;
  });
  return normalized;
}

function evaluateSeparation(roleAssignments) {
  const aliases = toRoleKeyList().map((key) => roleAssignments[key]);
  const distinctAliasSet = new Set(
    aliases.filter((entry) => isOpaqueOperatorAlias(entry))
  );

  const rules = [
    {
      check_key: PIP_EXTERNAL_OPERATOR_CHECK_KEYS.REQUESTOR_REVIEWER_SEPARATED,
      pass:
        roleAssignments.CHANGE_REQUESTOR &&
        roleAssignments.SECURITY_REVIEWER &&
        roleAssignments.CHANGE_REQUESTOR !== roleAssignments.SECURITY_REVIEWER,
    },
    {
      check_key: PIP_EXTERNAL_OPERATOR_CHECK_KEYS.REQUESTOR_OPERATOR_SEPARATED,
      pass:
        roleAssignments.CHANGE_REQUESTOR &&
        roleAssignments.DEPLOYMENT_OPERATOR &&
        roleAssignments.CHANGE_REQUESTOR !== roleAssignments.DEPLOYMENT_OPERATOR,
    },
    {
      check_key: PIP_EXTERNAL_OPERATOR_CHECK_KEYS.REVIEWER_OPERATOR_SEPARATED,
      pass:
        roleAssignments.SECURITY_REVIEWER &&
        roleAssignments.DEPLOYMENT_OPERATOR &&
        roleAssignments.SECURITY_REVIEWER !== roleAssignments.DEPLOYMENT_OPERATOR,
    },
    {
      check_key: PIP_EXTERNAL_OPERATOR_CHECK_KEYS.OPERATOR_ROLLBACK_SEPARATED,
      pass:
        roleAssignments.DEPLOYMENT_OPERATOR &&
        roleAssignments.ROLLBACK_OPERATOR &&
        roleAssignments.DEPLOYMENT_OPERATOR !== roleAssignments.ROLLBACK_OPERATOR,
    },
    {
      check_key: PIP_EXTERNAL_OPERATOR_CHECK_KEYS.OPERATOR_OBSERVER_SEPARATED,
      pass:
        roleAssignments.DEPLOYMENT_OPERATOR &&
        roleAssignments.MONITORING_OBSERVER &&
        roleAssignments.DEPLOYMENT_OPERATOR !== roleAssignments.MONITORING_OBSERVER,
    },
    {
      check_key: PIP_EXTERNAL_OPERATOR_CHECK_KEYS.REVIEWER_OBSERVER_SEPARATED,
      pass:
        roleAssignments.SECURITY_REVIEWER &&
        roleAssignments.MONITORING_OBSERVER &&
        roleAssignments.SECURITY_REVIEWER !== roleAssignments.MONITORING_OBSERVER,
    },
  ];

  return {
    distinct_operator_count: distinctAliasSet.size,
    separation_rule_count: rules.length,
    passed_separation_rule_count: rules.filter((entry) => entry.pass).length,
    failed_separation_rule_count: rules.filter((entry) => !entry.pass).length,
    rules,
  };
}

function createValidationResult(errors, normalized) {
  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

export function computePipExternalOperatorAliasDigest({ roleKey, alias } = {}) {
  const normalizedRole = sanitizeText(roleKey).toUpperCase();
  const normalizedAlias = sanitizeAlias(alias);
  return computeDigestSync({ role_key: normalizedRole, alias: normalizedAlias });
}

export function computePipExternalOperatorChecklistDigest(input = {}) {
  const safe = sanitizePipExternalOperatorChecklist(input);
  const digestSafe = {
    ...safe,
    generated_at: undefined,
    checklist_id: undefined,
    checklist_digest: undefined,
    status: undefined,
  };
  return computeDigestSync(digestSafe);
}

export function buildPipExternalOperatorGovernanceContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_EXTERNAL_OPERATOR_GOVERNANCE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    checklist_schema: PIP_EXTERNAL_OPERATOR_CHECKLIST_SCHEMA,
    evaluation_schema: PIP_EXTERNAL_OPERATOR_EVALUATION_SCHEMA,
    handoff_schema: PIP_EXTERNAL_OPERATOR_HANDOFF_SCHEMA,
    statuses: {
      governance: { ...PIP_EXTERNAL_OPERATOR_GOVERNANCE_STATUSES },
      check: { ...PIP_EXTERNAL_OPERATOR_CHECK_STATUSES },
    },
    role_keys: { ...PIP_EXTERNAL_OPERATOR_ROLE_KEYS },
    attestation_keys: { ...PIP_EXTERNAL_OPERATOR_ATTESTATION_KEYS },
    check_keys: { ...PIP_EXTERNAL_OPERATOR_CHECK_KEYS },
    blocker_codes: { ...PIP_EXTERNAL_OPERATOR_BLOCKER_CODES },
    alias_pattern: String(PIP_EXTERNAL_OPERATOR_ALIAS_PATTERN),
    summary: {
      operator_governance_enabled: true,
      external_operator_review_only: true,
      checklist_enabled: true,
      separation_of_duties_enabled: true,
      opaque_operator_aliases_only: true,
      raw_operator_alias_persistence_enabled: false,
      operator_identity_persistence_enabled: false,
      authenticated_user_identity_persistence_enabled: false,

      administrator_recorder_required: true,
      user_admin_permission_required: true,
      audit_maintain_permission_required: true,
      csrf_required_for_mutations: true,

      latest_change_package_required: true,
      static_dry_run_passed_required: true,
      operator_handoff_acknowledged_required: true,
      minimum_distinct_operator_count: 4,

      deterministic_alias_digest_enabled: true,
      deterministic_checklist_digest_enabled: true,
      durable_registry_enabled: true,
      atomic_write_enabled: true,
      append_only_revision_history: true,
      idempotent_prepare_enabled: true,
      idempotent_evaluation_enabled: true,
      idempotent_handoff_enabled: true,

      activation_authorization_enabled: false,
      actual_activation_enabled: false,
      deployment_execution_enabled: false,
      executable_command_generation_enabled: false,
      shell_script_generation_enabled: false,
      powershell_script_generation_enabled: false,
      environment_file_generation_enabled: false,

      secret_resolution_enabled: false,
      secret_value_read_enabled: false,
      environment_value_read_enabled: false,
      credential_materialization_enabled: false,
      connection_string_construction_enabled: false,

      database_connection_attempted: false,
      database_driver_invoked: false,
      database_adapter_invoked: false,
      connection_probe_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      schema_creation_invoked: false,
      migration_invoked: false,
      production_data_write_invoked: false,

      binding_activation_performed: false,
      shadow_write_enabled: false,
      dual_write_enabled: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_activation_enabled: false,
      automatic_retry_enabled: false,
      polling_enabled: false,
      recurring_timer_enabled: false,

      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
      legacy_browser_storage_authoritative: true,
      p999_write_protection: true,

      raw_operator_aliases_excluded: true,
      user_identity_values_excluded: true,
      secret_values_excluded: true,
      secret_reference_values_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      infrastructure_values_excluded: true,
      raw_request_content_excluded: true,
      raw_errors_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      filesystem_paths_excluded: true,
    },
  };
}

export function sanitizePipExternalOperatorChecklist(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checkStatuses = isPlainObject(safe.check_statuses) ? safe.check_statuses : {};
  const blockerCodes = Array.isArray(safe.blocker_codes) ? safe.blocker_codes : [];

  return {
    schema: PIP_EXTERNAL_OPERATOR_CHECKLIST_SCHEMA,
    checklist_id: sanitizeText(safe.checklist_id).toUpperCase(),
    checklist_revision: Number.parseInt(String(safe.checklist_revision ?? "0"), 10),
    checklist_digest: sanitizeText(safe.checklist_digest).toLowerCase(),
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    change_package_id: sanitizeText(safe.change_package_id).toUpperCase(),
    change_package_revision: Number.parseInt(
      String(safe.change_package_revision ?? "0"),
      10
    ),
    change_package_digest: sanitizeText(safe.change_package_digest).toLowerCase(),
    role_assignments: sanitizeRoleAssignmentDigests(safe.role_assignments),
    attestation_results: sanitizeAttestations(safe.attestation_results),
    checklist_check_count: Number.parseInt(String(safe.checklist_check_count ?? "0"), 10),
    passed_check_count: Number.parseInt(String(safe.passed_check_count ?? "0"), 10),
    review_check_count: Number.parseInt(String(safe.review_check_count ?? "0"), 10),
    blocked_check_count: Number.parseInt(String(safe.blocked_check_count ?? "0"), 10),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? blockerCodes.length), 10),
    blocker_codes: blockerCodes.map((entry) => sanitizeText(entry).toUpperCase()),
    check_statuses: Object.fromEntries(
      Object.entries(PIP_EXTERNAL_OPERATOR_CHECK_KEYS).map(([key, checkKey]) => [
        checkKey,
        sanitizeText(checkStatuses[checkKey] ?? PIP_EXTERNAL_OPERATOR_CHECK_STATUSES.NOT_CHECKED)
          .toUpperCase(),
      ])
    ),
    role_assignment_count: Number.parseInt(String(safe.role_assignment_count ?? "0"), 10),
    role_assignment_digest_count: Number.parseInt(
      String(safe.role_assignment_digest_count ?? "0"),
      10
    ),
    distinct_operator_count: Number.parseInt(
      String(safe.distinct_operator_count ?? "0"),
      10
    ),
    required_distinct_operator_count: Number.parseInt(
      String(safe.required_distinct_operator_count ?? "4"),
      10
    ),
    separation_rule_count: Number.parseInt(String(safe.separation_rule_count ?? "0"), 10),
    passed_separation_rule_count: Number.parseInt(
      String(safe.passed_separation_rule_count ?? "0"),
      10
    ),
    failed_separation_rule_count: Number.parseInt(
      String(safe.failed_separation_rule_count ?? "0"),
      10
    ),
    ready_for_external_operator_review:
      safe.ready_for_external_operator_review === true,
    durable_readback_valid: safe.durable_readback_valid === true,
    idempotency_status:
      sanitizeText(safe.idempotency_status).toUpperCase() || "CREATED",
    activation_authorized: false,
    activation_performed: false,
    deployment_execution_performed: false,
    executable_commands_generated: false,
    shell_script_generated: false,
    powershell_script_generated: false,
    environment_file_generated: false,
    raw_operator_aliases_persisted: false,
    user_identities_persisted: false,
    secret_resolution: false,
    secret_values_read: false,
    environment_values_read: false,
    credential_materialization: false,
    connection_string_construction: false,
    database_connection_attempted: false,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    connection_probe: false,
    network_resolution: false,
    outbound_network: false,
    sql_execution: false,
    ddl_execution: false,
    schema_creation: false,
    migration_execution: false,
    production_data_write: false,
    binding_activated: false,
    shadow_write: false,
    dual_write: false,
    repository_cutover: false,
    read_cutover: false,
    write_cutover: false,
    automatic_activation: false,
    automatic_retry: false,
    automatic_synchronisation: false,
    p999_protected: true,
  };
}

export function sanitizePipExternalOperatorEvaluation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const blockerCodes = Array.isArray(safe.blocker_codes) ? safe.blocker_codes : [];
  return {
    schema: PIP_EXTERNAL_OPERATOR_EVALUATION_SCHEMA,
    evaluation_id: sanitizeText(safe.evaluation_id).toUpperCase(),
    checklist_id: sanitizeText(safe.checklist_id).toUpperCase(),
    checklist_revision: Number.parseInt(String(safe.checklist_revision ?? "0"), 10),
    checklist_digest: sanitizeText(safe.checklist_digest).toLowerCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    role_assignment_count: Number.parseInt(String(safe.role_assignment_count ?? "0"), 10),
    role_assignment_digest_count: Number.parseInt(
      String(safe.role_assignment_digest_count ?? "0"),
      10
    ),
    distinct_operator_count: Number.parseInt(
      String(safe.distinct_operator_count ?? "0"),
      10
    ),
    required_distinct_operator_count: Number.parseInt(
      String(safe.required_distinct_operator_count ?? "4"),
      10
    ),
    separation_rule_count: Number.parseInt(String(safe.separation_rule_count ?? "0"), 10),
    passed_separation_rule_count: Number.parseInt(
      String(safe.passed_separation_rule_count ?? "0"),
      10
    ),
    failed_separation_rule_count: Number.parseInt(
      String(safe.failed_separation_rule_count ?? "0"),
      10
    ),
    checklist_check_count: Number.parseInt(String(safe.checklist_check_count ?? "0"), 10),
    passed_check_count: Number.parseInt(String(safe.passed_check_count ?? "0"), 10),
    review_check_count: Number.parseInt(String(safe.review_check_count ?? "0"), 10),
    blocked_check_count: Number.parseInt(String(safe.blocked_check_count ?? "0"), 10),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? blockerCodes.length), 10),
    blocker_codes: blockerCodes.map((entry) => sanitizeText(entry).toUpperCase()),
    ready_for_external_operator_review:
      safe.ready_for_external_operator_review === true,
    durable_readback_valid: safe.durable_readback_valid === true,
    idempotency_status:
      sanitizeText(safe.idempotency_status).toUpperCase() || "CREATED",
    activation_authorized: false,
    activation_performed: false,
    connection_attempted: false,
    database_operation_performed: false,
    executable_commands_generated: false,
  };
}

export function sanitizePipExternalOperatorHandoffReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_EXTERNAL_OPERATOR_HANDOFF_SCHEMA,
    handoff_id: sanitizeText(safe.handoff_id).toUpperCase(),
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    checklist_id: sanitizeText(safe.checklist_id).toUpperCase(),
    evaluation_id: sanitizeText(safe.evaluation_id).toUpperCase(),
    checklist_digest: sanitizeText(safe.checklist_digest).toLowerCase(),
    handoff_status: sanitizeText(safe.handoff_status).toUpperCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    ready_for_external_operator_review:
      safe.ready_for_external_operator_review === true,
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    distinct_operator_count: Number.parseInt(
      String(safe.distinct_operator_count ?? "0"),
      10
    ),
    required_distinct_operator_count: Number.parseInt(
      String(safe.required_distinct_operator_count ?? "4"),
      10
    ),
    failed_separation_rule_count: Number.parseInt(
      String(safe.failed_separation_rule_count ?? "0"),
      10
    ),
    durable_readback_valid: safe.durable_readback_valid === true,
    idempotency_status:
      sanitizeText(safe.idempotency_status).toUpperCase() || "CREATED",
    activation_authorized: false,
    activation_performed: false,
    connection_attempted: false,
    database_operation_performed: false,
    executable_commands_generated: false,
    raw_operator_aliases_persisted: false,
    user_identities_persisted: false,
    p999_protected: true,
  };
}

export function buildPipExternalOperatorChecklist(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const roleAssignments = sanitizeRoleAssignments(safe.role_assignments);
  const roleAssignmentDigests = {};
  toRoleKeyList().forEach((roleKey) => {
    roleAssignmentDigests[roleKey] = computePipExternalOperatorAliasDigest({
      roleKey,
      alias: roleAssignments[roleKey],
    });
  });

  const attestations = sanitizeAttestations(safe.attestation_results);
  const separation = evaluateSeparation(roleAssignments);
  const allAliasesOpaque = toRoleKeyList().every((roleKey) =>
    isOpaqueOperatorAlias(roleAssignments[roleKey])
  );
  const allRolesAssigned = toRoleKeyList().every(
    (roleKey) => roleAssignments[roleKey].length > 0
  );
  const allAttestationsTrue = toAttestationKeyList().every((key) =>
    attestations[key] === true
  );

  const checklist = sanitizePipExternalOperatorChecklist({
    checklist_id: sanitizeText(safe.checklist_id).toUpperCase(),
    checklist_revision: Number.parseInt(String(safe.checklist_revision ?? "0"), 10),
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    change_package_id: sanitizeText(safe.change_package_id).toUpperCase(),
    change_package_revision: Number.parseInt(
      String(safe.change_package_revision ?? "0"),
      10
    ),
    change_package_digest: sanitizeText(safe.change_package_digest).toLowerCase(),
    role_assignments: roleAssignmentDigests,
    attestation_results: attestations,
    checklist_check_count: Number.parseInt(String(safe.checklist_check_count ?? "0"), 10),
    passed_check_count: Number.parseInt(String(safe.passed_check_count ?? "0"), 10),
    review_check_count: Number.parseInt(String(safe.review_check_count ?? "0"), 10),
    blocked_check_count: Number.parseInt(String(safe.blocked_check_count ?? "0"), 10),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    blocker_codes: Array.isArray(safe.blocker_codes) ? safe.blocker_codes : [],
    check_statuses: safe.check_statuses,
    role_assignment_count: toRoleKeyList().length,
    role_assignment_digest_count: toRoleKeyList().length,
    distinct_operator_count: separation.distinct_operator_count,
    required_distinct_operator_count: 4,
    separation_rule_count: separation.separation_rule_count,
    passed_separation_rule_count: separation.passed_separation_rule_count,
    failed_separation_rule_count: separation.failed_separation_rule_count,
    ready_for_external_operator_review:
      allAliasesOpaque && allRolesAssigned && allAttestationsTrue,
    durable_readback_valid: safe.durable_readback_valid === true,
    idempotency_status:
      sanitizeText(safe.idempotency_status).toUpperCase() || "CREATED",
  });

  checklist.checklist_digest =
    sanitizeText(safe.checklist_digest).toLowerCase() ||
    computePipExternalOperatorChecklistDigest(checklist);

  return checklist;
}

export function buildPipExternalOperatorEvaluation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return sanitizePipExternalOperatorEvaluation({
    evaluation_id: sanitizeText(safe.evaluation_id).toUpperCase(),
    checklist_id: sanitizeText(safe.checklist_id).toUpperCase(),
    checklist_revision: Number.parseInt(String(safe.checklist_revision ?? "0"), 10),
    checklist_digest: sanitizeText(safe.checklist_digest).toLowerCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    role_assignment_count: Number.parseInt(String(safe.role_assignment_count ?? "0"), 10),
    role_assignment_digest_count: Number.parseInt(
      String(safe.role_assignment_digest_count ?? "0"),
      10
    ),
    distinct_operator_count: Number.parseInt(
      String(safe.distinct_operator_count ?? "0"),
      10
    ),
    required_distinct_operator_count: Number.parseInt(
      String(safe.required_distinct_operator_count ?? "4"),
      10
    ),
    separation_rule_count: Number.parseInt(String(safe.separation_rule_count ?? "0"), 10),
    passed_separation_rule_count: Number.parseInt(
      String(safe.passed_separation_rule_count ?? "0"),
      10
    ),
    failed_separation_rule_count: Number.parseInt(
      String(safe.failed_separation_rule_count ?? "0"),
      10
    ),
    checklist_check_count: Number.parseInt(String(safe.checklist_check_count ?? "0"), 10),
    passed_check_count: Number.parseInt(String(safe.passed_check_count ?? "0"), 10),
    review_check_count: Number.parseInt(String(safe.review_check_count ?? "0"), 10),
    blocked_check_count: Number.parseInt(String(safe.blocked_check_count ?? "0"), 10),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    blocker_codes: Array.isArray(safe.blocker_codes) ? safe.blocker_codes : [],
    ready_for_external_operator_review:
      safe.ready_for_external_operator_review === true,
    durable_readback_valid: safe.durable_readback_valid === true,
    idempotency_status:
      sanitizeText(safe.idempotency_status).toUpperCase() || "CREATED",
  });
}

export function buildPipExternalOperatorHandoffReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return sanitizePipExternalOperatorHandoffReceipt({
    handoff_id: sanitizeText(safe.handoff_id).toUpperCase(),
    request_id: sanitizeText(safe.request_id).toUpperCase(),
    checklist_id: sanitizeText(safe.checklist_id).toUpperCase(),
    evaluation_id: sanitizeText(safe.evaluation_id).toUpperCase(),
    checklist_digest: sanitizeText(safe.checklist_digest).toLowerCase(),
    handoff_status: sanitizeText(safe.handoff_status).toUpperCase(),
    status: sanitizeText(safe.status).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    ready_for_external_operator_review:
      safe.ready_for_external_operator_review === true,
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    distinct_operator_count: Number.parseInt(
      String(safe.distinct_operator_count ?? "0"),
      10
    ),
    required_distinct_operator_count: Number.parseInt(
      String(safe.required_distinct_operator_count ?? "4"),
      10
    ),
    failed_separation_rule_count: Number.parseInt(
      String(safe.failed_separation_rule_count ?? "0"),
      10
    ),
    durable_readback_valid: safe.durable_readback_valid === true,
    idempotency_status:
      sanitizeText(safe.idempotency_status).toUpperCase() || "CREATED",
  });
}

export function validatePipExternalOperatorGovernanceContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_EXTERNAL_OPERATOR_GOVERNANCE_CONTRACT_SCHEMA) {
    errors.push("Contract schema mismatch.");
  }
  if (safe.checklist_schema !== PIP_EXTERNAL_OPERATOR_CHECKLIST_SCHEMA) {
    errors.push("Checklist schema mismatch.");
  }
  if (safe.evaluation_schema !== PIP_EXTERNAL_OPERATOR_EVALUATION_SCHEMA) {
    errors.push("Evaluation schema mismatch.");
  }
  if (safe.handoff_schema !== PIP_EXTERNAL_OPERATOR_HANDOFF_SCHEMA) {
    errors.push("Handoff schema mismatch.");
  }

  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  if (summary.operator_governance_enabled !== true) {
    errors.push("operator_governance_enabled must be true.");
  }
  if (summary.external_operator_review_only !== true) {
    errors.push("external_operator_review_only must be true.");
  }
  if (summary.minimum_distinct_operator_count !== 4) {
    errors.push("minimum_distinct_operator_count must equal 4.");
  }
  if (summary.activation_authorization_enabled !== false) {
    errors.push("activation_authorization_enabled must be false.");
  }
  if (summary.actual_activation_enabled !== false) {
    errors.push("actual_activation_enabled must be false.");
  }
  if (summary.active_repository_kind !== "DURABLE_FILE") {
    errors.push("active_repository_kind must be DURABLE_FILE.");
  }
  if (summary.durable_file_authoritative !== true) {
    errors.push("durable_file_authoritative must be true.");
  }
  if (summary.p999_write_protection !== true) {
    errors.push("p999_write_protection must be true.");
  }

  return createValidationResult(errors, safe);
}

export function validatePipExternalOperatorChecklist(input = {}) {
  const normalized = sanitizePipExternalOperatorChecklist(input);
  const errors = [];

  if (normalized.schema !== PIP_EXTERNAL_OPERATOR_CHECKLIST_SCHEMA) {
    errors.push("Checklist schema mismatch.");
  }
  if (!CHECKLIST_ID_PATTERN.test(normalized.checklist_id)) {
    errors.push("checklist_id is invalid.");
  }
  if (!REQUEST_ID_PATTERN.test(normalized.request_id)) {
    errors.push("request_id is invalid.");
  }
  if (!SHA256_PATTERN.test(normalized.checklist_digest)) {
    errors.push("checklist_digest must be SHA-256 hex.");
  }
  if (!SHA256_PATTERN.test(normalized.change_package_digest)) {
    errors.push("change_package_digest must be SHA-256 hex.");
  }

  toRoleKeyList().forEach((roleKey) => {
    const digest = normalized.role_assignments[roleKey];
    if (!SHA256_PATTERN.test(digest)) {
      errors.push(`role assignment digest for ${roleKey} is invalid.`);
    }
  });

  toAttestationKeyList().forEach((key) => {
    if (typeof normalized.attestation_results[key] !== "boolean") {
      errors.push(`attestation ${key} must be boolean.`);
    }
  });

  if (
    !Object.values(PIP_EXTERNAL_OPERATOR_GOVERNANCE_STATUSES).includes(
      normalized.status
    )
  ) {
    errors.push("checklist status is invalid.");
  }

  if (normalized.activation_performed !== false) {
    errors.push("activation_performed must remain false.");
  }
  if (normalized.database_connection_attempted !== false) {
    errors.push("database_connection_attempted must remain false.");
  }
  if (normalized.raw_operator_aliases_persisted !== false) {
    errors.push("raw_operator_aliases_persisted must remain false.");
  }

  return createValidationResult(errors, normalized);
}

export function validatePipExternalOperatorEvaluation(input = {}) {
  const normalized = sanitizePipExternalOperatorEvaluation(input);
  const errors = [];

  if (normalized.schema !== PIP_EXTERNAL_OPERATOR_EVALUATION_SCHEMA) {
    errors.push("Evaluation schema mismatch.");
  }
  if (!EVALUATION_ID_PATTERN.test(normalized.evaluation_id)) {
    errors.push("evaluation_id is invalid.");
  }
  if (!CHECKLIST_ID_PATTERN.test(normalized.checklist_id)) {
    errors.push("checklist_id is invalid.");
  }
  if (!SHA256_PATTERN.test(normalized.checklist_digest)) {
    errors.push("checklist_digest must be SHA-256 hex.");
  }
  if (
    !Object.values(PIP_EXTERNAL_OPERATOR_GOVERNANCE_STATUSES).includes(
      normalized.status
    )
  ) {
    errors.push("evaluation status is invalid.");
  }
  if (normalized.blocked_check_count < 0 || normalized.failed_separation_rule_count < 0) {
    errors.push("evaluation counts must not be negative.");
  }
  if (normalized.activation_performed !== false) {
    errors.push("activation_performed must remain false.");
  }

  return createValidationResult(errors, normalized);
}

export function validatePipExternalOperatorHandoffReceipt(input = {}) {
  const normalized = sanitizePipExternalOperatorHandoffReceipt(input);
  const errors = [];

  if (normalized.schema !== PIP_EXTERNAL_OPERATOR_HANDOFF_SCHEMA) {
    errors.push("Handoff schema mismatch.");
  }
  if (!HANDOFF_ID_PATTERN.test(normalized.handoff_id)) {
    errors.push("handoff_id is invalid.");
  }
  if (!REQUEST_ID_PATTERN.test(normalized.request_id)) {
    errors.push("request_id is invalid.");
  }
  if (!CHECKLIST_ID_PATTERN.test(normalized.checklist_id)) {
    errors.push("checklist_id is invalid.");
  }
  if (!EVALUATION_ID_PATTERN.test(normalized.evaluation_id)) {
    errors.push("evaluation_id is invalid.");
  }
  if (!SHA256_PATTERN.test(normalized.checklist_digest)) {
    errors.push("checklist_digest must be SHA-256 hex.");
  }

  if (
    normalized.handoff_status !== "ACKNOWLEDGED" &&
    normalized.handoff_status !== "NO_CHANGE"
  ) {
    errors.push("handoff_status must be ACKNOWLEDGED or NO_CHANGE.");
  }

  if (normalized.activation_performed !== false) {
    errors.push("activation_performed must remain false.");
  }
  if (normalized.raw_operator_aliases_persisted !== false) {
    errors.push("raw_operator_aliases_persisted must remain false.");
  }

  return createValidationResult(errors, normalized);
}
