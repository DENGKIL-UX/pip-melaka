export const PIP_INCIDENT_CASEBOOK_CONTRACT_SCHEMA =
  "pip.incident-casebook.contract.v1";
export const PIP_INCIDENT_CASE_SCHEMA =
  "pip.incident-case.v1";
export const PIP_INCIDENT_CASEBOOK_REPORT_SCHEMA =
  "pip.incident-casebook.report.v1";
export const PIP_INCIDENT_CASE_MUTATION_RECEIPT_SCHEMA =
  "pip.incident-casebook.mutation-receipt.v1";
export const PIP_INCIDENT_CLOSURE_EVIDENCE_SCHEMA =
  "pip.incident-casebook.closure-evidence.v1";

export const PIP_INCIDENT_CASE_STATUSES = Object.freeze({
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING",
  MITIGATION_IN_PROGRESS: "MITIGATION_IN_PROGRESS",
  READY_FOR_CLOSURE: "READY_FOR_CLOSURE",
  CLOSED: "CLOSED",
});

export const PIP_INCIDENT_CASE_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

export const PIP_INCIDENT_CHECKLIST_STATUSES = Object.freeze({
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  VERIFIED: "VERIFIED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  BLOCKED: "BLOCKED",
});

export const PIP_INCIDENT_CLOSURE_OUTCOMES = Object.freeze({
  RESOLVED: "RESOLVED",
  MONITORING_REQUIRED: "MONITORING_REQUIRED",
  FALSE_POSITIVE: "FALSE_POSITIVE",
});

export const PIP_INCIDENT_REVISION_TYPES = Object.freeze({
  CASE_CREATED: "CASE_CREATED",
  CHECKLIST_UPDATED: "CHECKLIST_UPDATED",
  CASE_CLOSED: "CASE_CLOSED",
});

export const PIP_INCIDENT_CHECKLIST_CATALOG = Object.freeze([
  Object.freeze({
    item_id: "AUTHENTICATION_AUTHORIZATION_VERIFIED",
    label: "Authentication and authorization controls verified",
    required: true,
  }),
  Object.freeze({
    item_id: "CENTRAL_AUDIT_DURABILITY_VERIFIED",
    label: "Central audit durability and readback verified",
    required: true,
  }),
  Object.freeze({
    item_id: "SCENARIO_STORAGE_VERIFIED",
    label: "Central scenario storage availability verified",
    required: true,
  }),
  Object.freeze({
    item_id: "CRITICAL_ALERTS_REVIEWED",
    label: "Active high and critical alerts reviewed",
    required: true,
  }),
  Object.freeze({
    item_id: "SANITIZED_ERRORS_REVIEWED",
    label: "Sanitized warning, error and critical event counts reviewed",
    required: true,
  }),
  Object.freeze({
    item_id: "PERFORMANCE_TREND_REVIEWED",
    label: "Request failure and response-time trend reviewed",
    required: true,
  }),
  Object.freeze({
    item_id: "P999_PROTECTION_VERIFIED",
    label: "P999 write protection verified",
    required: true,
  }),
  Object.freeze({
    item_id: "STORAGE_BASELINE_VERIFIED",
    label: "Legacy storage, cutover and synchronisation baseline verified",
    required: true,
  }),
  Object.freeze({
    item_id: "EVIDENCE_PACKAGE_CAPTURED",
    label: "Sanitized incident evidence package captured",
    required: true,
  }),
  Object.freeze({
    item_id: "MANUAL_CLOSURE_REVIEW_COMPLETED",
    label: "Manual closure review completed",
    required: true,
  }),
]);

const FORBIDDEN_SAFE_TEXT_PATTERNS = [
  /https?:\/\//i,
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
  /\b[a-z]:\\(?:[^\\\r\n]+\\?)+/i,
  /(?:^|\s)\/(?:[^\s/]+\/)+[^\s]*/,
  /\b(?:authorization|bearer|token)\b\s*[:=]/i,
  /\b(?:cookie|csrf)\b\s*[:=]/i,
  /\b[A-Z_]{2,}\s*=\s*\S+/,
  /\bat\s+\S+\s*\([^\)]*:\d+:\d+\)/i,
  /<[a-z!/][^>]*>/i,
  /\b(?:password|secret|apikey|api_key|private_key|credential)\b/i,
  /\b(?:voter|scenario_content|request_path|session_id|user_id|email)\b/i,
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeIso(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(Date.parse(value)).toISOString();
}

function isEnumMember(value, enumObject) {
  return Object.values(enumObject).includes(String(value ?? "").trim().toUpperCase());
}

function toSafeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, parsed);
}

function sanitizeWhitespace(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePipIncidentSafeText(value, {
  field = "safe_text",
  maxLength = 600,
  required = true,
} = {}) {
  const normalized = sanitizeWhitespace(value);

  if (!normalized && required) {
    return {
      valid: false,
      errors: [`${field} is required.`],
      normalized: "",
    };
  }

  if (!normalized && !required) {
    return {
      valid: true,
      errors: [],
      normalized: "",
    };
  }

  if (normalized.length > maxLength) {
    return {
      valid: false,
      errors: [`${field} exceeds maximum length (${maxLength}).`],
      normalized,
    };
  }

  const forbidden = FORBIDDEN_SAFE_TEXT_PATTERNS.find((pattern) =>
    pattern.test(normalized)
  );

  if (forbidden) {
    return {
      valid: false,
      errors: [`${field} contains prohibited content.`],
      normalized,
    };
  }

  return {
    valid: true,
    errors: [],
    normalized,
  };
}

function buildDefaultChecklistItems() {
  return PIP_INCIDENT_CHECKLIST_CATALOG.map((entry) => ({
    item_id: entry.item_id,
    label: entry.label,
    required: entry.required === true,
    status: PIP_INCIDENT_CHECKLIST_STATUSES.PENDING,
    safe_note: "",
    evidence_reference: "",
    updated_at: null,
  }));
}

function summarizeChecklist(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const summary = {
    total_items: safeItems.length,
    required_items: 0,
    pending_items: 0,
    in_progress_items: 0,
    verified_items: 0,
    not_applicable_items: 0,
    blocked_items: 0,
    required_items_satisfied: false,
    items: safeItems,
  };

  safeItems.forEach((item) => {
    if (item.required === true) {
      summary.required_items += 1;
    }

    if (item.status === PIP_INCIDENT_CHECKLIST_STATUSES.PENDING) {
      summary.pending_items += 1;
    } else if (item.status === PIP_INCIDENT_CHECKLIST_STATUSES.IN_PROGRESS) {
      summary.in_progress_items += 1;
    } else if (item.status === PIP_INCIDENT_CHECKLIST_STATUSES.VERIFIED) {
      summary.verified_items += 1;
    } else if (item.status === PIP_INCIDENT_CHECKLIST_STATUSES.NOT_APPLICABLE) {
      summary.not_applicable_items += 1;
    } else if (item.status === PIP_INCIDENT_CHECKLIST_STATUSES.BLOCKED) {
      summary.blocked_items += 1;
    }
  });

  summary.required_items_satisfied = safeItems
    .filter((item) => item.required === true)
    .every(
      (item) =>
        item.status === PIP_INCIDENT_CHECKLIST_STATUSES.VERIFIED ||
        item.status === PIP_INCIDENT_CHECKLIST_STATUSES.NOT_APPLICABLE
    );

  return summary;
}

function validateChecklistItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length !== PIP_INCIDENT_CHECKLIST_CATALOG.length) {
    return false;
  }

  const catalogIds = new Set(PIP_INCIDENT_CHECKLIST_CATALOG.map((entry) => entry.item_id));
  const seen = new Set();

  return safeItems.every((item) => {
    const safe = isPlainObject(item) ? item : {};
    const itemId = String(safe.item_id ?? "").trim();
    const status = String(safe.status ?? "").trim().toUpperCase();
    const noteValidation = sanitizePipIncidentSafeText(safe.safe_note, {
      field: "checklist.safe_note",
      maxLength: 300,
      required: false,
    });

    if (!itemId || seen.has(itemId) || !catalogIds.has(itemId)) {
      return false;
    }
    seen.add(itemId);

    if (!isEnumMember(status, PIP_INCIDENT_CHECKLIST_STATUSES)) {
      return false;
    }

    if (noteValidation.valid !== true) {
      return false;
    }

    if (
      status === PIP_INCIDENT_CHECKLIST_STATUSES.NOT_APPLICABLE &&
      safe.required === true &&
      !noteValidation.normalized
    ) {
      return false;
    }

    return (
      typeof safe.label === "string" &&
      safe.label.trim().length > 0 &&
      typeof safe.required === "boolean" &&
      typeof safe.evidence_reference === "string" &&
      (safe.updated_at === null || normalizeIso(safe.updated_at) !== null)
    );
  });
}

function validateRevisionRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  let expected = 1;
  return rows.every((row) => {
    const safe = isPlainObject(row) ? row : {};
    const safeSummary = sanitizePipIncidentSafeText(safe.safe_summary, {
      field: "revision.safe_summary",
      maxLength: 600,
      required: true,
    });

    const valid =
      typeof safe.revision_id === "string" &&
      safe.revision_id.trim().length > 0 &&
      Number(safe.revision_number) === expected &&
      isEnumMember(safe.revision_type, PIP_INCIDENT_REVISION_TYPES) &&
      normalizeIso(safe.occurred_at) !== null &&
      isEnumMember(safe.case_status, PIP_INCIDENT_CASE_STATUSES) &&
      safeSummary.valid === true &&
      Array.isArray(safe.changed_fields) &&
      safe.changed_fields.every(
        (entry) => typeof entry === "string" && entry.trim().length > 0
      );

    expected += 1;
    return valid;
  });
}

function buildContractSummary() {
  return {
    authentication_configured: true,
    authentication_required: true,
    roles_configured: true,
    authorization_enforced: true,
    durable_casebook_enabled: true,
    append_only_revision_ledger: true,
    deletion_enabled: false,
    legacy_browser_storage_authoritative: true,
    operational_read_cutover_enabled: false,
    operational_write_cutover_enabled: false,
    automatic_synchronisation_enabled: false,
    p999_write_protection: true,
    diagnostic_only: true,
    manual_case_creation_only: true,
    manual_checklist_updates_only: true,
    manual_closure_only: true,
    automatic_incident_creation_enabled: false,
    automatic_checklist_completion_enabled: false,
    automatic_case_closure_enabled: false,
    automatic_remediation_enabled: false,
    automatic_recovery_enabled: false,
    automatic_restart_enabled: false,
    automatic_alert_dispatch_enabled: false,
    polling_enabled: false,
    recurring_timer_enabled: false,
    external_telemetry_enabled: false,
    shell_execution_enabled: false,
    child_process_execution_enabled: false,
    outbound_network_check_enabled: false,
    environment_file_write_enabled: false,
    credential_values_redacted: true,
    environment_values_redacted: true,
    infrastructure_values_redacted: true,
    user_identity_values_redacted: true,
    request_content_excluded: true,
    raw_errors_excluded: true,
    voter_data_excluded: true,
    scenario_content_excluded: true,
    browser_storage_content_excluded: true,
  };
}

export function buildPipIncidentCasebookContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_INCIDENT_CASEBOOK_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    case_schema: PIP_INCIDENT_CASE_SCHEMA,
    report_schema: PIP_INCIDENT_CASEBOOK_REPORT_SCHEMA,
    mutation_receipt_schema: PIP_INCIDENT_CASE_MUTATION_RECEIPT_SCHEMA,
    closure_evidence_schema: PIP_INCIDENT_CLOSURE_EVIDENCE_SCHEMA,
    case_statuses: { ...PIP_INCIDENT_CASE_STATUSES },
    severities: { ...PIP_INCIDENT_CASE_SEVERITIES },
    checklist_statuses: { ...PIP_INCIDENT_CHECKLIST_STATUSES },
    closure_outcomes: { ...PIP_INCIDENT_CLOSURE_OUTCOMES },
    revision_types: { ...PIP_INCIDENT_REVISION_TYPES },
    checklist_catalog: PIP_INCIDENT_CHECKLIST_CATALOG.map((entry) => ({ ...entry })),
    summary: buildContractSummary(),
  };
}

export function validatePipIncidentCasebookContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const checks = {
    schema_valid: safe.schema === PIP_INCIDENT_CASEBOOK_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    case_schema_valid: safe.case_schema === PIP_INCIDENT_CASE_SCHEMA,
    report_schema_valid: safe.report_schema === PIP_INCIDENT_CASEBOOK_REPORT_SCHEMA,
    mutation_receipt_schema_valid:
      safe.mutation_receipt_schema === PIP_INCIDENT_CASE_MUTATION_RECEIPT_SCHEMA,
    closure_evidence_schema_valid:
      safe.closure_evidence_schema === PIP_INCIDENT_CLOSURE_EVIDENCE_SCHEMA,
    checklist_catalog_valid:
      Array.isArray(safe.checklist_catalog) &&
      safe.checklist_catalog.length === PIP_INCIDENT_CHECKLIST_CATALOG.length,
    summary_security_valid:
      summary.authentication_configured === true &&
      summary.authentication_required === true &&
      summary.roles_configured === true &&
      summary.authorization_enforced === true,
    summary_persistence_valid:
      summary.durable_casebook_enabled === true &&
      summary.append_only_revision_ledger === true &&
      summary.deletion_enabled === false &&
      summary.legacy_browser_storage_authoritative === true &&
      summary.operational_read_cutover_enabled === false &&
      summary.operational_write_cutover_enabled === false &&
      summary.automatic_synchronisation_enabled === false,
    summary_operations_valid:
      summary.manual_case_creation_only === true &&
      summary.manual_checklist_updates_only === true &&
      summary.manual_closure_only === true &&
      summary.automatic_incident_creation_enabled === false &&
      summary.automatic_checklist_completion_enabled === false &&
      summary.automatic_case_closure_enabled === false &&
      summary.automatic_remediation_enabled === false &&
      summary.automatic_recovery_enabled === false &&
      summary.automatic_restart_enabled === false &&
      summary.automatic_alert_dispatch_enabled === false &&
      summary.polling_enabled === false &&
      summary.recurring_timer_enabled === false &&
      summary.external_telemetry_enabled === false &&
      summary.shell_execution_enabled === false &&
      summary.child_process_execution_enabled === false &&
      summary.outbound_network_check_enabled === false &&
      summary.environment_file_write_enabled === false,
    summary_redaction_valid:
      summary.credential_values_redacted === true &&
      summary.environment_values_redacted === true &&
      summary.infrastructure_values_redacted === true &&
      summary.user_identity_values_redacted === true &&
      summary.request_content_excluded === true &&
      summary.raw_errors_excluded === true &&
      summary.voter_data_excluded === true &&
      summary.scenario_content_excluded === true &&
      summary.browser_storage_content_excluded === true &&
      summary.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Incident casebook contract manifest check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      summary: buildContractSummary(),
    },
  };
}

export function validatePipIncidentCase(incidentCase) {
  const safe = isPlainObject(incidentCase) ? incidentCase : {};

  const titleValidation = sanitizePipIncidentSafeText(safe.title, {
    field: "title",
    maxLength: 120,
    required: true,
  });
  const summaryValidation = sanitizePipIncidentSafeText(safe.safe_summary, {
    field: "safe_summary",
    maxLength: 600,
    required: true,
  });
  const closureSummaryValidation = sanitizePipIncidentSafeText(
    safe.closure?.closure_summary,
    {
      field: "closure_summary",
      maxLength: 600,
      required: false,
    }
  );

  const checklistItems = Array.isArray(safe.checklist?.items)
    ? safe.checklist.items
    : [];
  const checklistSummary = summarizeChecklist(checklistItems);

  const checks = {
    schema_valid: safe.schema === PIP_INCIDENT_CASE_SCHEMA,
    case_id_valid: typeof safe.case_id === "string" && safe.case_id.trim().length > 0,
    created_at_valid: normalizeIso(safe.created_at) !== null,
    updated_at_valid: normalizeIso(safe.updated_at) !== null,
    closed_at_valid: safe.closed_at === null || normalizeIso(safe.closed_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" && safe.target_environment.trim().length > 0,
    severity_valid: isEnumMember(safe.severity, PIP_INCIDENT_CASE_SEVERITIES),
    status_valid: isEnumMember(safe.status, PIP_INCIDENT_CASE_STATUSES),
    title_valid: titleValidation.valid === true,
    safe_summary_valid: summaryValidation.valid === true,
    evidence_valid:
      isPlainObject(safe.evidence) &&
      Array.isArray(safe.evidence.snapshot_ids) &&
      Array.isArray(safe.evidence.timeline_event_ids) &&
      Number.isFinite(Number(safe.evidence.evidence_item_count)) &&
      Number.isFinite(Number(safe.evidence.snapshot_count)) &&
      Number.isFinite(Number(safe.evidence.timeline_event_count)) &&
      safe.evidence.evidence_validation_passed === true,
    checklist_valid: validateChecklistItems(checklistItems),
    checklist_counts_valid:
      Number(safe.checklist?.total_items) === checklistSummary.total_items &&
      Number(safe.checklist?.required_items) === checklistSummary.required_items &&
      Number(safe.checklist?.pending_items) === checklistSummary.pending_items &&
      Number(safe.checklist?.in_progress_items) === checklistSummary.in_progress_items &&
      Number(safe.checklist?.verified_items) === checklistSummary.verified_items &&
      Number(safe.checklist?.not_applicable_items) === checklistSummary.not_applicable_items &&
      Number(safe.checklist?.blocked_items) === checklistSummary.blocked_items,
    closure_valid:
      isPlainObject(safe.closure) &&
      (safe.closure.outcome === null ||
        isEnumMember(safe.closure.outcome, PIP_INCIDENT_CLOSURE_OUTCOMES)) &&
      typeof safe.closure.closure_acknowledged === "boolean" &&
      typeof safe.closure.closure_evidence_generated === "boolean" &&
      (safe.closure.closed_at === null || normalizeIso(safe.closure.closed_at) !== null) &&
      closureSummaryValidation.valid === true,
    revisions_valid: validateRevisionRows(safe.revisions),
    security_valid:
      safe.security?.authentication_configured === true &&
      safe.security?.authentication_required === true &&
      safe.security?.roles_configured === true &&
      safe.security?.authorization_enforced === true &&
      safe.security?.sensitive_values_excluded === true &&
      safe.security?.user_identity_excluded === true &&
      safe.security?.request_content_excluded === true &&
      safe.security?.raw_errors_excluded === true &&
      safe.security?.voter_data_excluded === true &&
      safe.security?.scenario_content_excluded === true &&
      safe.security?.browser_storage_content_excluded === true,
    persistence_valid:
      safe.persistence?.durable === true &&
      safe.persistence?.append_only === true &&
      safe.persistence?.deletion_enabled === false &&
      safe.persistence?.legacy_browser_storage_authoritative === true &&
      safe.persistence?.operational_read_cutover_enabled === false &&
      safe.persistence?.operational_write_cutover_enabled === false &&
      safe.persistence?.automatic_synchronisation_enabled === false,
    operations_valid:
      safe.operations?.manual_case_creation_only === true &&
      safe.operations?.manual_checklist_updates_only === true &&
      safe.operations?.manual_closure_only === true &&
      safe.operations?.automatic_incident_creation_enabled === false &&
      safe.operations?.automatic_checklist_completion_enabled === false &&
      safe.operations?.automatic_case_closure_enabled === false &&
      safe.operations?.automatic_remediation_enabled === false &&
      safe.operations?.automatic_recovery_enabled === false &&
      safe.operations?.automatic_restart_enabled === false &&
      safe.operations?.automatic_alert_dispatch_enabled === false &&
      safe.operations?.polling_enabled === false &&
      safe.operations?.recurring_timer_enabled === false &&
      safe.operations?.external_telemetry_enabled === false &&
      safe.operations?.shell_execution_enabled === false &&
      safe.operations?.child_process_execution_enabled === false &&
      safe.operations?.outbound_network_check_enabled === false &&
      safe.operations?.environment_file_write_enabled === false,
    protection_valid: safe.protection?.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Incident case validation failed: ${key}`);
    }
  });

  if (titleValidation.valid !== true) {
    errors.push(...titleValidation.errors);
  }
  if (summaryValidation.valid !== true) {
    errors.push(...summaryValidation.errors);
  }
  if (closureSummaryValidation.valid !== true) {
    errors.push(...closureSummaryValidation.errors);
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      title: titleValidation.normalized,
      safe_summary: summaryValidation.normalized,
      closure: {
        ...safe.closure,
        closure_summary: closureSummaryValidation.normalized,
      },
      created_at: normalizeIso(safe.created_at) ?? new Date().toISOString(),
      updated_at: normalizeIso(safe.updated_at) ?? new Date().toISOString(),
      closed_at: normalizeIso(safe.closed_at),
    },
  };
}

export function validatePipIncidentCasebookReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const safeCases = Array.isArray(safe.cases) ? safe.cases : [];

  const checks = {
    schema_valid: safe.schema === PIP_INCIDENT_CASEBOOK_REPORT_SCHEMA,
    status_valid: ["READY", "EMPTY", "REVIEW_REQUIRED"].includes(String(safe.status ?? "")),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" && safe.target_environment.trim().length > 0,
    requested_limit_valid:
      Number.isInteger(Number(safe.requested_limit)) && Number(safe.requested_limit) > 0,
    counts_valid:
      Number.isInteger(Number(safe.total_cases)) &&
      Number.isInteger(Number(safe.returned_cases)) &&
      Number.isInteger(Number(safe.open_cases)) &&
      Number.isInteger(Number(safe.investigating_cases)) &&
      Number.isInteger(Number(safe.mitigation_cases)) &&
      Number.isInteger(Number(safe.ready_for_closure_cases)) &&
      Number.isInteger(Number(safe.closed_cases)) &&
      Number.isInteger(Number(safe.critical_cases)),
    store_flags_valid:
      safe.durable_store_ready === true &&
      safe.append_only === true &&
      safe.deletion_enabled === false,
    cases_valid: safeCases.every((entry) => validatePipIncidentCase(entry).valid === true),
    security_valid: safe.security?.authentication_configured === true,
    persistence_valid: safe.persistence?.legacy_browser_storage_authoritative === true,
    operations_valid: safe.operations?.automatic_case_closure_enabled === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Incident casebook report validation failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    },
  };
}

export function validatePipIncidentCaseMutationReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const checks = {
    schema_valid: safe.schema === PIP_INCIDENT_CASE_MUTATION_RECEIPT_SCHEMA,
    action_valid:
      ["CASE_CREATED", "CHECKLIST_UPDATED", "CASE_CLOSED"].includes(
        String(safe.action ?? "")
      ),
    accepted_valid: safe.accepted === true,
    case_id_valid: typeof safe.case_id === "string" && safe.case_id.trim().length > 0,
    revision_id_valid: typeof safe.revision_id === "string" && safe.revision_id.trim().length > 0,
    revision_number_valid:
      Number.isInteger(Number(safe.revision_number)) && Number(safe.revision_number) > 0,
    case_status_valid: isEnumMember(safe.case_status, PIP_INCIDENT_CASE_STATUSES),
    target_environment_valid:
      typeof safe.target_environment === "string" && safe.target_environment.trim().length > 0,
    occurred_at_valid: normalizeIso(safe.occurred_at) !== null,
    validation_flags_valid:
      safe.contract_validation_passed === true &&
      safe.case_validation_passed === true,
    durability_flags_valid:
      safe.durable_write_verified === true &&
      safe.durable_readback_verified === true &&
      safe.audit_write_verified === true &&
      safe.audit_readback_verified === true,
    baseline_flags_valid:
      safe.browser_storage_preserved === true &&
      safe.p999_write_protection === true &&
      safe.security_invariants_preserved === true &&
      safe.forbidden_automation_disabled === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Incident mutation receipt validation failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      occurred_at: normalizeIso(safe.occurred_at) ?? new Date().toISOString(),
    },
  };
}

export function validatePipIncidentClosureEvidence(evidence) {
  const safe = isPlainObject(evidence) ? evidence : {};
  const closureSummaryValidation = sanitizePipIncidentSafeText(
    safe.closure_summary,
    {
      field: "closure_summary",
      maxLength: 600,
      required: true,
    }
  );

  const checks = {
    schema_valid: safe.schema === PIP_INCIDENT_CLOSURE_EVIDENCE_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    case_id_valid: typeof safe.case_id === "string" && safe.case_id.trim().length > 0,
    target_environment_valid:
      typeof safe.target_environment === "string" && safe.target_environment.trim().length > 0,
    severity_valid: isEnumMember(safe.severity, PIP_INCIDENT_CASE_SEVERITIES),
    closure_outcome_valid: isEnumMember(safe.closure_outcome, PIP_INCIDENT_CLOSURE_OUTCOMES),
    closure_summary_valid: closureSummaryValidation.valid === true,
    created_at_valid: normalizeIso(safe.created_at) !== null,
    closed_at_valid: normalizeIso(safe.closed_at) !== null,
    summary_sections_valid:
      isPlainObject(safe.evidence_summary) &&
      isPlainObject(safe.checklist_summary) &&
      isPlainObject(safe.revision_summary),
    flags_valid:
      safe.security?.authentication_required === true &&
      safe.persistence?.append_only === true &&
      safe.operations?.automatic_case_closure_enabled === false &&
      safe.protection?.p999_write_protection === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Incident closure evidence validation failed: ${key}`);
    }
  });

  if (closureSummaryValidation.valid !== true) {
    errors.push(...closureSummaryValidation.errors);
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      created_at: normalizeIso(safe.created_at) ?? new Date().toISOString(),
      closed_at: normalizeIso(safe.closed_at) ?? new Date().toISOString(),
      closure_summary: closureSummaryValidation.normalized,
    },
  };
}

export function createDefaultPipIncidentChecklist() {
  return buildDefaultChecklistItems();
}

export function summarizePipIncidentChecklist(items) {
  return summarizeChecklist(items);
}
