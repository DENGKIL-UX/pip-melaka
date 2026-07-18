export const PIP_INDEPENDENT_REVIEW_BOARD_CONTRACT_SCHEMA =
  "pip.independent-review-board.contract.v1";

export const PIP_INDEPENDENT_REVIEW_CASE_SCHEMA =
  "pip.independent-review-board.case.v1";

export const PIP_INDEPENDENT_REVIEW_EVALUATION_SCHEMA =
  "pip.independent-review-board.evaluation.v1";

export const PIP_INDEPENDENT_REVIEW_DECISION_SCHEMA =
  "pip.independent-review-board.decision.v1";

export const PIP_INDEPENDENT_REVIEW_STATUSES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  REVIEW_IN_PROGRESS: "REVIEW_IN_PROGRESS",
  BLOCKED: "BLOCKED",
  GO: "GO",
  NO_GO: "NO_GO",
});

export const PIP_INDEPENDENT_REVIEW_DECISIONS = Object.freeze({
  GO: "GO",
  NO_GO: "NO_GO",
});

export const PIP_INDEPENDENT_REVIEW_ROLE_KEYS = Object.freeze({
  SECURITY_REVIEWER: "SECURITY_REVIEWER",
  DATA_GOVERNANCE_REVIEWER: "DATA_GOVERNANCE_REVIEWER",
  OPERATIONS_REVIEWER: "OPERATIONS_REVIEWER",
  REVIEW_BOARD_CHAIR: "REVIEW_BOARD_CHAIR",
});

export const PIP_INDEPENDENT_REVIEW_ATTESTATION_KEYS = Object.freeze({
  RUNTIME_ACCEPTANCE_REVIEWED: "RUNTIME_ACCEPTANCE_REVIEWED",
  CONFIGURATION_INTAKE_REVIEWED: "CONFIGURATION_INTAKE_REVIEWED",
  CONFIGURATION_APPROVAL_REVIEWED: "CONFIGURATION_APPROVAL_REVIEWED",
  CHANGE_PACKAGE_REVIEWED: "CHANGE_PACKAGE_REVIEWED",
  STATIC_DRY_RUN_REVIEWED: "STATIC_DRY_RUN_REVIEWED",
  EXTERNAL_OPERATOR_GOVERNANCE_REVIEWED: "EXTERNAL_OPERATOR_GOVERNANCE_REVIEWED",
  EVIDENCE_DIGESTS_MATCH: "EVIDENCE_DIGESTS_MATCH",
  REVIEWERS_ARE_INDEPENDENT: "REVIEWERS_ARE_INDEPENDENT",
  NO_REVIEWER_OPERATOR_ALIAS_OVERLAP: "NO_REVIEWER_OPERATOR_ALIAS_OVERLAP",
  NO_SECRET_VALUES_PRESENT: "NO_SECRET_VALUES_PRESENT",
  NO_ENVIRONMENT_VALUES_PRESENT: "NO_ENVIRONMENT_VALUES_PRESENT",
  NO_CONNECTION_VALUES_PRESENT: "NO_CONNECTION_VALUES_PRESENT",
  NO_EXECUTABLE_COMMANDS_PRESENT: "NO_EXECUTABLE_COMMANDS_PRESENT",
  CUTOVERS_REMAIN_DISABLED: "CUTOVERS_REMAIN_DISABLED",
  AUTOMATIC_SYNCHRONISATION_REMAINS_DISABLED:
    "AUTOMATIC_SYNCHRONISATION_REMAINS_DISABLED",
  P999_REMAINS_PROTECTED: "P999_REMAINS_PROTECTED",
  GO_IS_GOVERNANCE_RECOMMENDATION_ONLY:
    "GO_IS_GOVERNANCE_RECOMMENDATION_ONLY",
});

export const PIP_INDEPENDENT_REVIEW_REASON_CODES = Object.freeze({
  BLOCKED_MISSING_EVIDENCE: "BLOCKED_MISSING_EVIDENCE",
  BLOCKED_DIGEST_MISMATCH: "BLOCKED_DIGEST_MISMATCH",
  BLOCKED_INSUFFICIENT_AUTH: "BLOCKED_INSUFFICIENT_AUTH",
  BLOCKED_INSUFFICIENT_CSRF: "BLOCKED_INSUFFICIENT_CSRF",
  BLOCKED_REVIEWER_INDEPENDENCE: "BLOCKED_REVIEWER_INDEPENDENCE",
  BLOCKED_P999_CONTEXT: "BLOCKED_P999_CONTEXT",
  NO_GO_SECURITY_CONCERN: "NO_GO_SECURITY_CONCERN",
  NO_GO_DATA_GOVERNANCE_CONCERN: "NO_GO_DATA_GOVERNANCE_CONCERN",
  NO_GO_OPERATIONAL_READINESS_CONCERN: "NO_GO_OPERATIONAL_READINESS_CONCERN",
  NO_GO_EVIDENCE_INSUFFICIENT: "NO_GO_EVIDENCE_INSUFFICIENT",
});

export const PIP_INDEPENDENT_REVIEW_EVIDENCE_KEYS = Object.freeze({
  B59C_RUNTIME_ACCEPTANCE: "B59C_RUNTIME_ACCEPTANCE",
  B60A_INTAKE_RECEIPT: "B60A_INTAKE_RECEIPT",
  B60B_APPROVAL_RECEIPT: "B60B_APPROVAL_RECEIPT",
  B60B_ACTIVATION_READINESS_REPORT: "B60B_ACTIVATION_READINESS_REPORT",
  B60C_CHANGE_PACKAGE: "B60C_CHANGE_PACKAGE",
  B60C_STATIC_DRY_RUN_REPORT: "B60C_STATIC_DRY_RUN_REPORT",
  B60C_HANDOFF_RECEIPT: "B60C_HANDOFF_RECEIPT",
  B61A_EXTERNAL_OPERATOR_CHECKLIST: "B61A_EXTERNAL_OPERATOR_CHECKLIST",
  B61A_SEPARATION_EVALUATION: "B61A_SEPARATION_EVALUATION",
  B61A_EXTERNAL_OPERATOR_HANDOFF_RECEIPT: "B61A_EXTERNAL_OPERATOR_HANDOFF_RECEIPT",
});

const REQUEST_ID_PATTERN = /^REQ-[A-Z0-9-]{6,72}$/;
const REVIEW_CASE_ID_PATTERN = /^RVBCASE-[A-Z0-9-]{8,96}$/;
const REVIEW_EVALUATION_ID_PATTERN = /^RVBEVAL-[A-Z0-9-]{8,96}$/;
const REVIEW_DECISION_ID_PATTERN = /^RVBDEC-[A-Z0-9-]{8,96}$/;
const ALIAS_PATTERN = /^RVB_[A-Z0-9]{8}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const FORBIDDEN_ALIAS_PATTERN =
  /@|\+?\d{7,}|\b(ic|name|nama|user|username|email|tel|phone|db|postgres|mysql|token|secret|pass)\b/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, max = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
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

  const segments = seeds.map((seed) => {
    let hash = seed >>> 0;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
      hash = (hash ^ (hash >>> 13)) >>> 0;
      hash = Math.imul(hash, 0x85ebca6b) >>> 0;
      hash = (hash ^ (hash >>> 16)) >>> 0;
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  });

  return segments.join("");
}

function createValidationResult(errors, normalized) {
  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

function reviewRoleList() {
  return Object.values(PIP_INDEPENDENT_REVIEW_ROLE_KEYS);
}

function evidenceKeyList() {
  return Object.values(PIP_INDEPENDENT_REVIEW_EVIDENCE_KEYS);
}

function attestationKeyList() {
  return Object.values(PIP_INDEPENDENT_REVIEW_ATTESTATION_KEYS);
}

function sanitizeReviewerAlias(rawAlias) {
  const alias = sanitizeText(rawAlias, 64).toUpperCase();
  if (!ALIAS_PATTERN.test(alias)) {
    return "";
  }
  if (FORBIDDEN_ALIAS_PATTERN.test(alias)) {
    return "";
  }
  return alias;
}

function computeReviewerAliasDigest({ roleKey, alias } = {}) {
  return computeDigestSync({
    role_key: sanitizeText(roleKey).toUpperCase(),
    alias: sanitizeReviewerAlias(alias),
  });
}

function sanitizeRoleAssignments(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  reviewRoleList().forEach((roleKey) => {
    normalized[roleKey] = sanitizeReviewerAlias(safe[roleKey]);
  });
  return normalized;
}

function sanitizeRoleAssignmentDigests(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  reviewRoleList().forEach((roleKey) => {
    const digest = sanitizeText(safe[roleKey], 64).toLowerCase();
    normalized[roleKey] = SHA256_PATTERN.test(digest) ? digest : "";
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

function sanitizeEvidenceReferences(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  evidenceKeyList().forEach((key) => {
    const entry = isPlainObject(safe[key]) ? safe[key] : {};
    normalized[key] = {
      artifact_id: sanitizeText(entry.artifact_id, 160).toUpperCase(),
      artifact_status: sanitizeText(entry.artifact_status, 80).toUpperCase(),
      artifact_digest: sanitizeText(entry.artifact_digest, 64).toLowerCase(),
      artifact_valid: entry.artifact_valid === true,
    };
  });
  return normalized;
}

function sanitizeDecisionRoleMap(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const normalized = {};
  reviewRoleList().forEach((roleKey) => {
    const value = sanitizeText(safe[roleKey], 12).toUpperCase();
    normalized[roleKey] = value === "GO" || value === "NO_GO" ? value : "";
  });
  return normalized;
}

export function buildPipIndependentReviewBoardContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_INDEPENDENT_REVIEW_BOARD_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    review_case_schema: PIP_INDEPENDENT_REVIEW_CASE_SCHEMA,
    review_evaluation_schema: PIP_INDEPENDENT_REVIEW_EVALUATION_SCHEMA,
    review_decision_schema: PIP_INDEPENDENT_REVIEW_DECISION_SCHEMA,
    statuses: { ...PIP_INDEPENDENT_REVIEW_STATUSES },
    decisions: { ...PIP_INDEPENDENT_REVIEW_DECISIONS },
    role_keys: { ...PIP_INDEPENDENT_REVIEW_ROLE_KEYS },
    attestation_keys: { ...PIP_INDEPENDENT_REVIEW_ATTESTATION_KEYS },
    reason_codes: { ...PIP_INDEPENDENT_REVIEW_REASON_CODES },
    evidence_keys: { ...PIP_INDEPENDENT_REVIEW_EVIDENCE_KEYS },
    reviewer_alias_pattern: String(ALIAS_PATTERN),
    summary: {
      independent_review_board_enabled: true,
      governance_recommendation_only: true,
      manual_review_only: true,
      manual_decision_only: true,
      automatic_decision_enabled: false,
      activation_authorization_granted: false,
      activation_performed: false,
      actual_activation_enabled: false,
      deployment_execution_enabled: false,
      executable_command_generation_enabled: false,
      shell_execution_enabled: false,
      child_process_execution_enabled: false,
      database_driver_invoked: false,
      database_adapter_invoked: false,
      connection_probe_invoked: false,
      network_resolution_invoked: false,
      outbound_network_invoked: false,
      sql_execution_invoked: false,
      ddl_execution_invoked: false,
      schema_creation_invoked: false,
      migration_invoked: false,
      repository_cutover_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      secret_values_excluded: true,
      environment_values_excluded: true,
      connection_values_excluded: true,
      credential_values_excluded: true,
      raw_reviewer_aliases_excluded: true,
      user_identity_values_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      browser_storage_content_excluded: true,
      p999_write_protection: true,
      active_repository_kind: "DURABLE_FILE",
      durable_file_authoritative: true,
    },
  };
}

export function sanitizePipIndependentReviewBoardCase(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const rawRoleAssignments = sanitizeRoleAssignments(safe.role_assignments);
  const roleAssignmentDigests = {};
  reviewRoleList().forEach((roleKey) => {
    const digest = computeReviewerAliasDigest({
      roleKey,
      alias: rawRoleAssignments[roleKey],
    });
    roleAssignmentDigests[roleKey] = digest;
  });

  return {
    schema: PIP_INDEPENDENT_REVIEW_CASE_SCHEMA,
    review_case_id: sanitizeText(safe.review_case_id, 96).toUpperCase(),
    review_case_revision: Number.parseInt(
      String(safe.review_case_revision ?? "0"),
      10
    ),
    review_case_digest: sanitizeText(safe.review_case_digest, 64).toLowerCase(),
    request_id: sanitizeText(safe.request_id, 80).toUpperCase(),
    status: sanitizeText(safe.status, 48).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    evidence_references: sanitizeEvidenceReferences(safe.evidence_references),
    role_assignments: roleAssignmentDigests,
    role_assignment_count: reviewRoleList().length,
    distinct_reviewer_count: new Set(Object.values(roleAssignmentDigests)).size,
    attestation_results: sanitizeAttestations(safe.attestation_results),
    evidence_items_present: Number.parseInt(
      String(safe.evidence_items_present ?? "0"),
      10
    ),
    evidence_items_valid: Number.parseInt(
      String(safe.evidence_items_valid ?? "0"),
      10
    ),
    evidence_digests_match: safe.evidence_digests_match === true,
    reviewer_independence_passed: safe.reviewer_independence_passed === true,
    reviewer_operator_overlap_count: Number.parseInt(
      String(safe.reviewer_operator_overlap_count ?? "0"),
      10
    ),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    blocker_codes: Array.isArray(safe.blocker_codes)
      ? safe.blocker_codes.map((entry) => sanitizeText(entry, 80).toUpperCase())
      : [],
    idempotency_status: sanitizeText(safe.idempotency_status, 48).toUpperCase() || "CREATED",
    manual_review_only: true,
    manual_decision_only: true,
    automatic_decision_enabled: false,
    activation_authorization_granted: false,
    activation_performed: false,
    actual_activation_enabled: false,
    deployment_execution_enabled: false,
    executable_command_generation_enabled: false,
    shell_execution_enabled: false,
    child_process_execution_enabled: false,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    connection_probe_invoked: false,
    network_resolution_invoked: false,
    outbound_network_invoked: false,
    sql_execution_invoked: false,
    ddl_execution_invoked: false,
    schema_creation_invoked: false,
    migration_invoked: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_synchronisation_enabled: false,
    secret_values_excluded: true,
    environment_values_excluded: true,
    connection_values_excluded: true,
    credential_values_excluded: true,
    raw_reviewer_aliases_excluded: true,
    user_identity_values_excluded: true,
    voter_data_excluded: true,
    scenario_content_excluded: true,
    browser_storage_content_excluded: true,
    p999_write_protection: true,
  };
}

export function computePipIndependentReviewBoardCaseDigest(input = {}) {
  const safe = sanitizePipIndependentReviewBoardCase(input);
  const digestSafe = {
    ...safe,
    review_case_id: undefined,
    review_case_revision: undefined,
    review_case_digest: undefined,
    generated_at: undefined,
    status: undefined,
    idempotency_status: undefined,
  };
  return computeDigestSync(digestSafe);
}

export function evaluatePipIndependentReviewerIndependence({
  role_assignments,
  operator_alias_digests,
} = {}) {
  const normalizedAssignments = sanitizeRoleAssignmentDigests(role_assignments);
  const reviewerDigests = Object.values(normalizedAssignments).filter((entry) =>
    SHA256_PATTERN.test(entry)
  );
  const distinctReviewerDigests = new Set(reviewerDigests);
  const operatorSet = new Set(
    (Array.isArray(operator_alias_digests) ? operator_alias_digests : [])
      .map((entry) => sanitizeText(entry, 64).toLowerCase())
      .filter((entry) => SHA256_PATTERN.test(entry))
  );

  const overlap = reviewerDigests.filter((entry) => operatorSet.has(entry));
  const independence_passed =
    reviewerDigests.length === reviewRoleList().length &&
    distinctReviewerDigests.size === reviewRoleList().length &&
    overlap.length === 0;

  return {
    reviewer_digest_count: reviewerDigests.length,
    distinct_reviewer_count: distinctReviewerDigests.size,
    reviewer_operator_overlap_count: overlap.length,
    reviewer_independence_passed: independence_passed,
    blocker_codes: independence_passed
      ? []
      : [PIP_INDEPENDENT_REVIEW_REASON_CODES.BLOCKED_REVIEWER_INDEPENDENCE],
  };
}

export function buildPipIndependentReviewBoardEvaluation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_INDEPENDENT_REVIEW_EVALUATION_SCHEMA,
    evaluation_id: sanitizeText(safe.evaluation_id, 96).toUpperCase(),
    review_case_id: sanitizeText(safe.review_case_id, 96).toUpperCase(),
    review_case_digest: sanitizeText(safe.review_case_digest, 64).toLowerCase(),
    status: sanitizeText(safe.status, 48).toUpperCase(),
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    evidence_items_present: Number.parseInt(
      String(safe.evidence_items_present ?? "0"),
      10
    ),
    evidence_items_valid: Number.parseInt(
      String(safe.evidence_items_valid ?? "0"),
      10
    ),
    evidence_digests_match: safe.evidence_digests_match === true,
    distinct_reviewer_count: Number.parseInt(
      String(safe.distinct_reviewer_count ?? "0"),
      10
    ),
    reviewer_independence_passed: safe.reviewer_independence_passed === true,
    reviewer_operator_overlap_count: Number.parseInt(
      String(safe.reviewer_operator_overlap_count ?? "0"),
      10
    ),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    blocker_codes: Array.isArray(safe.blocker_codes)
      ? safe.blocker_codes.map((entry) => sanitizeText(entry, 80).toUpperCase())
      : [],
    manual_review_only: true,
    manual_decision_only: true,
    automatic_decision_enabled: false,
    activation_authorization_granted: false,
    activation_performed: false,
    actual_activation_enabled: false,
    deployment_execution_enabled: false,
    executable_command_generation_enabled: false,
    shell_execution_enabled: false,
    child_process_execution_enabled: false,
    database_driver_invoked: false,
    database_adapter_invoked: false,
    connection_probe_invoked: false,
    network_resolution_invoked: false,
    outbound_network_invoked: false,
    sql_execution_invoked: false,
    ddl_execution_invoked: false,
    schema_creation_invoked: false,
    migration_invoked: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_synchronisation_enabled: false,
    p999_write_protection: true,
  };
}

export function buildPipIndependentReviewBoardDecisionReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_INDEPENDENT_REVIEW_DECISION_SCHEMA,
    decision_receipt_id: sanitizeText(safe.decision_receipt_id, 96).toUpperCase(),
    review_case_id: sanitizeText(safe.review_case_id, 96).toUpperCase(),
    review_case_digest: sanitizeText(safe.review_case_digest, 64).toLowerCase(),
    decision: sanitizeText(safe.decision, 16).toUpperCase(),
    decision_status: sanitizeText(safe.decision_status, 48).toUpperCase(),
    decision_reason_code: sanitizeText(safe.decision_reason_code, 80).toUpperCase(),
    decision_rationale: sanitizeText(safe.decision_rationale, 400),
    reviewer_decisions: sanitizeDecisionRoleMap(safe.reviewer_decisions),
    reviewer_concurrence: safe.reviewer_concurrence === true,
    chair_signoff: safe.chair_signoff === true,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    blocker_count: Number.parseInt(String(safe.blocker_count ?? "0"), 10),
    evidence_items_valid: Number.parseInt(
      String(safe.evidence_items_valid ?? "0"),
      10
    ),
    evidence_digests_match: safe.evidence_digests_match === true,
    activation_authorization_granted: false,
    activation_performed: false,
    deployment_execution_performed: false,
    database_connection_attempted: false,
    database_operation_performed: false,
    migration_performed: false,
    repository_cutover_enabled: false,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_synchronisation_enabled: false,
    p999_write_protection: true,
  };
}

export function validatePipIndependentReviewBoardContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];
  if (safe.schema !== PIP_INDEPENDENT_REVIEW_BOARD_CONTRACT_SCHEMA) {
    errors.push("Contract schema mismatch.");
  }
  if (safe.review_case_schema !== PIP_INDEPENDENT_REVIEW_CASE_SCHEMA) {
    errors.push("Review-case schema mismatch.");
  }
  if (safe.review_evaluation_schema !== PIP_INDEPENDENT_REVIEW_EVALUATION_SCHEMA) {
    errors.push("Review-evaluation schema mismatch.");
  }
  if (safe.review_decision_schema !== PIP_INDEPENDENT_REVIEW_DECISION_SCHEMA) {
    errors.push("Review-decision schema mismatch.");
  }

  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const requiredTrue = [
    "independent_review_board_enabled",
    "governance_recommendation_only",
    "manual_review_only",
    "manual_decision_only",
    "secret_values_excluded",
    "environment_values_excluded",
    "connection_values_excluded",
    "credential_values_excluded",
    "raw_reviewer_aliases_excluded",
    "user_identity_values_excluded",
    "voter_data_excluded",
    "scenario_content_excluded",
    "browser_storage_content_excluded",
    "p999_write_protection",
    "durable_file_authoritative",
  ];
  requiredTrue.forEach((key) => {
    if (summary[key] !== true) {
      errors.push(`${key} must be true.`);
    }
  });

  const requiredFalse = [
    "automatic_decision_enabled",
    "activation_authorization_granted",
    "activation_performed",
    "actual_activation_enabled",
    "deployment_execution_enabled",
    "executable_command_generation_enabled",
    "shell_execution_enabled",
    "child_process_execution_enabled",
    "database_driver_invoked",
    "database_adapter_invoked",
    "connection_probe_invoked",
    "network_resolution_invoked",
    "outbound_network_invoked",
    "sql_execution_invoked",
    "ddl_execution_invoked",
    "schema_creation_invoked",
    "migration_invoked",
    "repository_cutover_enabled",
    "operational_read_cutover_enabled",
    "operational_write_cutover_enabled",
    "automatic_synchronisation_enabled",
  ];
  requiredFalse.forEach((key) => {
    if (summary[key] !== false) {
      errors.push(`${key} must be false.`);
    }
  });

  if (summary.active_repository_kind !== "DURABLE_FILE") {
    errors.push("active_repository_kind must be DURABLE_FILE.");
  }

  return createValidationResult(errors, safe);
}

export function validatePipIndependentReviewBoardCase(input = {}) {
  const normalized = sanitizePipIndependentReviewBoardCase(input);
  const errors = [];

  if (normalized.schema !== PIP_INDEPENDENT_REVIEW_CASE_SCHEMA) {
    errors.push("Review-case schema mismatch.");
  }
  if (!REVIEW_CASE_ID_PATTERN.test(normalized.review_case_id)) {
    errors.push("review_case_id is invalid.");
  }
  if (!REQUEST_ID_PATTERN.test(normalized.request_id)) {
    errors.push("request_id is invalid.");
  }
  if (!SHA256_PATTERN.test(normalized.review_case_digest)) {
    errors.push("review_case_digest must be SHA-256.");
  }
  if (!Object.values(PIP_INDEPENDENT_REVIEW_STATUSES).includes(normalized.status)) {
    errors.push("review-case status is invalid.");
  }

  const missingEvidence = evidenceKeyList().filter((key) => {
    const entry = normalized.evidence_references[key];
    return (
      !entry ||
      !entry.artifact_id ||
      !entry.artifact_status ||
      !SHA256_PATTERN.test(entry.artifact_digest)
    );
  });
  if (missingEvidence.length > 0) {
    errors.push("All required evidence references must include id/status/digest.");
  }

  const digestValues = Object.values(normalized.role_assignments || {});
  if (!digestValues.every((entry) => SHA256_PATTERN.test(entry))) {
    errors.push("All reviewer alias digests must be valid SHA-256 values.");
  }

  if (new Set(digestValues).size !== reviewRoleList().length) {
    errors.push("Reviewer alias digests must be distinct across all four roles.");
  }

  const missingAttestations = attestationKeyList().filter(
    (key) => normalized.attestation_results[key] !== true
  );
  if (missingAttestations.length > 0) {
    errors.push("All required attestations must be true.");
  }

  if (normalized.activation_performed !== false || normalized.deployment_execution_enabled !== false) {
    errors.push("Activation/deployment flags must remain disabled.");
  }

  return createValidationResult(errors, normalized);
}

export function validatePipIndependentReviewBoardEvaluation(input = {}) {
  const normalized = buildPipIndependentReviewBoardEvaluation(input);
  const errors = [];

  if (normalized.schema !== PIP_INDEPENDENT_REVIEW_EVALUATION_SCHEMA) {
    errors.push("Review-evaluation schema mismatch.");
  }
  if (!REVIEW_EVALUATION_ID_PATTERN.test(normalized.evaluation_id)) {
    errors.push("evaluation_id is invalid.");
  }
  if (!REVIEW_CASE_ID_PATTERN.test(normalized.review_case_id)) {
    errors.push("review_case_id is invalid.");
  }
  if (!SHA256_PATTERN.test(normalized.review_case_digest)) {
    errors.push("review_case_digest must be SHA-256.");
  }
  if (!Object.values(PIP_INDEPENDENT_REVIEW_STATUSES).includes(normalized.status)) {
    errors.push("evaluation status is invalid.");
  }
  if (normalized.blocker_count < 0) {
    errors.push("blocker_count must not be negative.");
  }

  return createValidationResult(errors, normalized);
}

export function validatePipIndependentReviewBoardDecisionReceipt(input = {}) {
  const normalized = buildPipIndependentReviewBoardDecisionReceipt(input);
  const errors = [];

  if (normalized.schema !== PIP_INDEPENDENT_REVIEW_DECISION_SCHEMA) {
    errors.push("Decision schema mismatch.");
  }
  if (!REVIEW_DECISION_ID_PATTERN.test(normalized.decision_receipt_id)) {
    errors.push("decision_receipt_id is invalid.");
  }
  if (!REVIEW_CASE_ID_PATTERN.test(normalized.review_case_id)) {
    errors.push("review_case_id is invalid.");
  }
  if (!SHA256_PATTERN.test(normalized.review_case_digest)) {
    errors.push("review_case_digest must be SHA-256.");
  }

  if (!Object.values(PIP_INDEPENDENT_REVIEW_DECISIONS).includes(normalized.decision)) {
    errors.push("decision must be GO or NO_GO.");
  }

  const hasChairDecision =
    normalized.reviewer_decisions[PIP_INDEPENDENT_REVIEW_ROLE_KEYS.REVIEW_BOARD_CHAIR] ===
      normalized.decision && normalized.chair_signoff === true;
  if (!hasChairDecision) {
    errors.push("Review-board chair sign-off is required for decision recording.");
  }

  if (normalized.decision === PIP_INDEPENDENT_REVIEW_DECISIONS.NO_GO) {
    if (!normalized.decision_reason_code) {
      errors.push("NO_GO requires a reason code.");
    }
    if (!normalized.decision_rationale) {
      errors.push("NO_GO requires a sanitized rationale.");
    }
    if (normalized.reviewer_concurrence !== true) {
      errors.push("NO_GO requires reviewer concurrence.");
    }
  }

  if (normalized.activation_performed !== false || normalized.deployment_execution_performed !== false) {
    errors.push("Decision receipt must preserve non-execution safety invariants.");
  }

  return createValidationResult(errors, normalized);
}
