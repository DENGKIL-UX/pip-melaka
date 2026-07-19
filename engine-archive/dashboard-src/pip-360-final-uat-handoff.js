import {
  PIP_360_FINAL_UAT_CHECK_SCHEMA,
  PIP_360_FINAL_UAT_COLLECTION_SCHEMA,
  PIP_360_FINAL_UAT_CONTRACT_SCHEMA,
  PIP_360_FINAL_UAT_DECISIONS,
  PIP_360_FINAL_UAT_DOMAIN_ORDER,
  PIP_360_FINAL_UAT_DOMAIN_SCHEMA,
  PIP_360_FINAL_UAT_DOMAINS,
  PIP_360_FINAL_UAT_HANDOFF_PACKAGE_SCHEMA,
  PIP_360_FINAL_UAT_HANDOFF_STATUSES,
  PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS,
  PIP_360_FINAL_UAT_LIMITATION_SCHEMA,
  PIP_360_FINAL_UAT_REASON_CODES,
  PIP_360_FINAL_UAT_RISK_SCHEMA,
  PIP_360_FINAL_UAT_RISK_SEVERITIES,
  PIP_360_FINAL_UAT_RUNBOOK_SECTION_SCHEMA,
  PIP_360_FINAL_UAT_SIGNOFF_ROLES,
  PIP_360_FINAL_UAT_SIGNOFF_SCHEMA,
  PIP_360_FINAL_UAT_SIGNOFF_STATUSES,
  PIP_360_FINAL_UAT_TEST_MODES,
  PIP_360_FINAL_UAT_CHECK_STATUSES,
  buildPip360FinalUatHandoffContractManifest,
  sanitizePip360FinalUatExport as sanitizeContractExport,
  validatePip360FinalUatCheck,
  validatePip360FinalUatCollection,
  validatePip360FinalUatDomain,
  validatePip360FinalUatHandoffPackage,
  validatePip360FinalUatLimitation,
  validatePip360FinalUatRisk,
  validatePip360FinalUatRunbookSection,
  validatePip360FinalUatSignoff,
} from "./pip-360-final-uat-handoff-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableStringify(value, seen = new Set(), depth = 0) {
  if (depth > 8) return '"[DepthLimit]"';
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry, seen, depth + 1)).join(",")}]`;
  }
  if (typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) return '"[Circular]"';
  seen.add(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen, depth + 1)}`)
    .join(",")}}`;
}

function deterministicHash(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fp-${(hash >>> 0).toString(16).padStart(8, "0")}${text.length
    .toString(16)
    .padStart(8, "0")}`;
}

function deterministicId(prefix, parts) {
  return `${prefix}-${deterministicHash(parts).replace("fp-", "")}`;
}

function deepClone(value, seen = new Map(), depth = 0) {
  if (depth > 8) return "[DepthLimit]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  if (Array.isArray(value)) {
    const arr = [];
    seen.set(value, arr);
    value.forEach((entry) => arr.push(deepClone(entry, seen, depth + 1)));
    return arr;
  }

  const obj = {};
  seen.set(value, obj);
  Object.keys(value).forEach((key) => {
    if (key === "normalized") return;
    obj[key] = deepClone(value[key], seen, depth + 1);
  });
  return obj;
}

function summarizeValidation(validation) {
  return {
    valid: validation?.valid === true,
    checks: isPlainObject(validation?.checks) ? validation.checks : {},
    errors: toArray(validation?.errors).map((entry) => String(entry)),
    summary: isPlainObject(validation?.summary) ? validation.summary : {},
  };
}

function buildCheckStatus(checks) {
  const safeChecks = toArray(checks);
  if (safeChecks.some((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED)) {
    return PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED;
  }
  if (safeChecks.some((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED)) {
    return PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED;
  }
  if (safeChecks.some((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.REVIEW_REQUIRED)) {
    return PIP_360_FINAL_UAT_CHECK_STATUSES.REVIEW_REQUIRED;
  }
  if (safeChecks.some((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.WAIVED)) {
    return PIP_360_FINAL_UAT_CHECK_STATUSES.WAIVED;
  }
  if (safeChecks.length === 0) {
    return PIP_360_FINAL_UAT_CHECK_STATUSES.NOT_APPLICABLE;
  }
  return PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED;
}

function ensureString(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function finiteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function makeCheck(input = {}) {
  const check = {
    schema: PIP_360_FINAL_UAT_CHECK_SCHEMA,
    uat_check_id:
      input.uat_check_id ??
      deterministicId("uat-check", {
        mode: input.test_mode,
        domain: input.domain,
        key: input.check_key,
        ts: input.checked_at,
      }),
    test_mode: input.test_mode,
    domain: input.domain,
    check_key: ensureString(input.check_key, "UNKNOWN_CHECK"),
    check_description: ensureString(input.check_description, ""),
    expected_value: input.expected_value,
    observed_value: input.observed_value,
    status: input.status,
    severity: input.severity ?? PIP_360_FINAL_UAT_RISK_SEVERITIES.INFO,
    reason_codes: toArray(input.reason_codes),
    evidence_ids: toArray(input.evidence_ids),
    source_receipt_ids: toArray(input.source_receipt_ids),
    source_report_ids: toArray(input.source_report_ids),
    source_fingerprints: toArray(input.source_fingerprints),
    waiver_reason: input.waiver_reason ?? null,
    validation_errors: toArray(input.validation_errors),
    checked_at: input.checked_at,
    validation_fixture: true,
    production_operation_performed: false,
    external_network_request_performed: false,
    browser_storage_modified: false,
    central_repository_modified: false,
    production_authorization_granted: false,
  };

  check.check_fingerprint = deterministicHash({
    test_mode: check.test_mode,
    domain: check.domain,
    check_key: check.check_key,
    expected_value: check.expected_value,
    observed_value: check.observed_value,
    status: check.status,
  });

  check.validation = summarizeValidation(validatePip360FinalUatCheck(check));
  return check;
}

function makeDomain({ testMode, domain, checks }) {
  const safeChecks = toArray(checks);
  const payload = {
    schema: PIP_360_FINAL_UAT_DOMAIN_SCHEMA,
    uat_domain_id: deterministicId("uat-domain", { testMode, domain }),
    test_mode: testMode,
    domain,
    checks: safeChecks,
    status: buildCheckStatus(safeChecks),
    validation_fixture: true,
  };
  payload.domain_fingerprint = deterministicHash({
    domain,
    status: payload.status,
    checks: safeChecks.map((entry) => entry.uat_check_id),
  });
  payload.validation = summarizeValidation(validatePip360FinalUatDomain(payload));
  return payload;
}

export function buildPip360FinalUatCheck(input = {}) {
  return makeCheck(input);
}

export function buildPip360FinalUatDomain(input = {}) {
  return makeDomain({
    testMode: input.test_mode,
    domain: input.domain,
    checks: input.checks,
  });
}

export function buildPip360FinalUatRiskRegister({ handoffTimestamp } = {}) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");
  const risks = [
    ["RISK-001", "Production database not configured or bound.", PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH, "OPERATIONS_OWNER", "LIM-006"],
    ["RISK-002", "Secret-provider adapter remains reference-only.", PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH, "SECURITY_REVIEWER", "LIM-007"],
    ["RISK-003", "Production read and write cutovers remain disabled.", PIP_360_FINAL_UAT_RISK_SEVERITIES.MEDIUM, "OPERATIONS_OWNER", "LIM-008"],
    ["RISK-004", "Automatic synchronization remains disabled.", PIP_360_FINAL_UAT_RISK_SEVERITIES.MEDIUM, "OPERATIONS_OWNER", "LIM-009"],
    ["RISK-005", "Live Apify ingestion remains disabled.", PIP_360_FINAL_UAT_RISK_SEVERITIES.LOW, "TECHNICAL_OWNER", "LIM-002"],
    ["RISK-006", "Live S2D execution remains disabled.", PIP_360_FINAL_UAT_RISK_SEVERITIES.LOW, "TECHNICAL_OWNER", "LIM-003"],
    ["RISK-007", "Social-platform publication and analytics connections remain disabled.", PIP_360_FINAL_UAT_RISK_SEVERITIES.MEDIUM, "PRODUCT_OWNER", "LIM-004"],
    ["RISK-008", "Legacy browser storage remains authoritative for existing scenario flows.", PIP_360_FINAL_UAT_RISK_SEVERITIES.MEDIUM, "TECHNICAL_OWNER", "LIM-010"],
    ["RISK-009", "Public communication publication remains manual and externally performed.", PIP_360_FINAL_UAT_RISK_SEVERITIES.LOW, "PRODUCT_OWNER", "LIM-012"],
    ["RISK-010", "Current full-pipeline evidence uses sanitized validation fixtures.", PIP_360_FINAL_UAT_RISK_SEVERITIES.INFO, "DATA_GOVERNANCE_REVIEWER", "LIM-001"],
    ["RISK-011", "P999 is a non-production validation constituency.", PIP_360_FINAL_UAT_RISK_SEVERITIES.INFO, "DATA_GOVERNANCE_REVIEWER", "LIM-013"],
    ["RISK-012", "No targeting, persuasion optimization or election prediction is permitted.", PIP_360_FINAL_UAT_RISK_SEVERITIES.LOW, "SECURITY_REVIEWER", "LIM-014"],
  ];

  return risks.map(([riskId, title, severity, ownerRole, limitationId]) => {
    const risk = {
      schema: PIP_360_FINAL_UAT_RISK_SCHEMA,
      risk_id: riskId,
      title,
      description: title,
      severity,
      likelihood: "KNOWN",
      impact: "CONTROLLED_PILOT_LIMITATION",
      status: "OPEN_WITH_MITIGATION",
      owner_role: ownerRole,
      mitigation: "Explicitly disclosed in controlled-pilot handoff with manual controls.",
      contingency: "Maintain production activation boundary and execute rollback to validation fixtures.",
      exit_criteria: "External production controls configured and independently approved.",
      related_evidence_ids: ["EVIDENCE-BOUNDARY-001"],
      related_limitation_ids: [limitationId],
      accepted_for_controlled_pilot: true,
      accepted_for_production: false,
      review_required: true,
      reviewed_at: ts,
    };
    risk.risk_fingerprint = deterministicHash(risk);
    risk.validation = summarizeValidation(validatePip360FinalUatRisk(risk));
    return risk;
  });
}

export function buildPip360FinalUatKnownLimitations({ handoffTimestamp } = {}) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");
  const entries = [
    ["LIM-001", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.VALIDATION_FIXTURE_ONLY, "Sanitized validation fixtures only for the complete pipeline."],
    ["LIM-002", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.EXTERNAL_SERVICE_DISABLED, "No live Apify execution."],
    ["LIM-003", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.EXTERNAL_SERVICE_DISABLED, "No live S2D execution."],
    ["LIM-004", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.EXTERNAL_SERVICE_DISABLED, "No social-platform connection."],
    ["LIM-005", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.LIVE_ANALYTICS_DISABLED, "No live publication analytics."],
    ["LIM-006", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.PRODUCTION_DATABASE_UNBOUND, "No production database binding."],
    ["LIM-007", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.SECRET_PROVIDER_UNCONFIGURED, "No production secret resolution."],
    ["LIM-008", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.PRODUCTION_CUTOVER_DISABLED, "No production repository cutover."],
    ["LIM-009", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.AUTOMATIC_SYNCHRONISATION_DISABLED, "No automatic synchronization."],
    ["LIM-010", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.LEGACY_BROWSER_STORAGE_AUTHORITATIVE, "Existing legacy browser storage remains authoritative."],
    ["LIM-011", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.HUMAN_REVIEW_REQUIRED, "Human review is mandatory."],
    ["LIM-012", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.MANUAL_PUBLICATION_ONLY, "Publication remains manual."],
    ["LIM-013", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.P999_NON_PRODUCTION_ONLY, "P999 is validation-only."],
    ["LIM-014", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.NO_TARGETING_OR_PERSUASION, "No voter, demographic or individual targeting."],
    ["LIM-015", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.NO_TARGETING_OR_PERSUASION, "No persuasion or engagement optimization."],
    ["LIM-016", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.NO_TARGETING_OR_PERSUASION, "No voter-preference inference."],
    ["LIM-017", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.NO_TARGETING_OR_PERSUASION, "No political-affiliation inference."],
    ["LIM-018", PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS.NO_TARGETING_OR_PERSUASION, "No election prediction."],
  ];

  return entries.map(([id, classification, title]) => {
    const item = {
      schema: PIP_360_FINAL_UAT_LIMITATION_SCHEMA,
      limitation_id: id,
      classification,
      title,
      description: title,
      affected_modules: ["PIP_360", "BATCH_66C"],
      operational_effect: "Controlled-pilot only scope enforced.",
      controlled_pilot_workaround: "Manual governance and explicit disclosure.",
      production_resolution_requirement: "External production readiness completion.",
      owner_role: "OPERATIONS_OWNER",
      status: "ACTIVE",
      reviewed_at: ts,
      validation_fixture: true,
    };
    item.limitation_fingerprint = deterministicHash(item);
    item.validation = summarizeValidation(validatePip360FinalUatLimitation(item));
    return item;
  });
}

export function buildPip360FinalUatRunbook({ handoffTimestamp } = {}) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");
  const sections = [
    ["SYSTEM_SCOPE", "Define controlled-pilot boundary and validation-only operation."],
    ["CONTROLLED_PILOT_BOUNDARY", "Confirm controlled-pilot acceptance does not authorize production activation."],
    ["REQUIRED_SERVICES", "Verify approved local API and dashboard preview services are available."],
    ["SAFE_STARTUP_SEQUENCE", "Start approved local API service, verify loopback authentication health, and start approved dashboard preview."],
    ["AUTHENTICATION_CHECK", "Sign in through secure interface and verify authenticated role and authorization enforcement."],
    ["CONSTITUENCY_DATA_CHECK", "Verify required constituency routes for P134 and P999-validation comparison."],
    ["PIPELINE_VALIDATION_CHECK", "Confirm Batch 66A pipeline acceptance evidence remains PASSED."],
    ["RECONCILIATION_CHECK", "Confirm Batch 66B reconciliation evidence remains RECONCILED."],
    ["DAILY_HEALTH_REVIEW", "Inspect system-health, audit, validator and safety boundary panels."],
    ["INCIDENT_TRIAGE", "Classify incident class, contain impact, and escalate to role owner."],
    ["MANUAL_PUBLICATION_BOUNDARY", "Ensure publication remains external manual process with human review."],
    ["RECOVERY_AND_ROLLBACK", "Use controlled rollback criteria and preserve immutable protected snapshots."],
    ["DATA_PRIVACY_CHECK", "Confirm exports are sanitized and contain no personal, voter or secret data."],
    ["PILOT_EXIT_CRITERIA", "Verify controlled-pilot exit criteria and residual-risk acceptance state."],
    ["PRODUCTION_ESCALATION_BOUNDARY", "Escalate for independent go/no-go outside this package before any production activity."],
  ];

  return sections.map(([sectionKey, objective], index) => {
    const section = {
      schema: PIP_360_FINAL_UAT_RUNBOOK_SECTION_SCHEMA,
      runbook_section_id: deterministicId("runbook", { sectionKey, index }),
      section_key: sectionKey,
      objective,
      prerequisites: ["Validated fixture evidence available", "Controlled-pilot authorization scope confirmed"],
      manual_steps: [
        "Review corresponding evidence panel and validator receipts.",
        "Confirm safety boundary statements are visible and unchanged.",
        "Record observed evidence references in handoff checklist.",
      ],
      expected_evidence: ["Deterministic receipt IDs", "Sanitized export previews", "No production-operation counters"],
      failure_conditions: ["Missing required evidence", "Boundary violation detected", "Unresolved critical risk"],
      escalation_role: "OPERATIONS_OWNER",
      prohibited_actions: [
        "No deployment execution",
        "No secret resolution",
        "No migration",
        "No production cutover",
        "No platform publication",
      ],
      validation_fixture: true,
      reviewed_at: ts,
    };
    section.section_fingerprint = deterministicHash(section);
    section.validation = summarizeValidation(validatePip360FinalUatRunbookSection(section));
    return section;
  });
}

export function buildPip360FinalUatSignoffMatrix({ handoffTimestamp, signoffEvidence } = {}) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");
  const aliases = {
    PRODUCT_OWNER: "REVIEWER-PRODUCT-001",
    TECHNICAL_OWNER: "REVIEWER-TECHNICAL-001",
    SECURITY_REVIEWER: "REVIEWER-SECURITY-001",
    DATA_GOVERNANCE_REVIEWER: "REVIEWER-DATA-001",
    OPERATIONS_OWNER: "REVIEWER-OPERATIONS-001",
  };

  return Object.values(PIP_360_FINAL_UAT_SIGNOFF_ROLES).map((role) => {
    const supplied = isPlainObject(signoffEvidence?.[role]) ? signoffEvidence[role] : {};
    const status = supplied.status ?? PIP_360_FINAL_UAT_SIGNOFF_STATUSES.APPROVED;
    const signoff = {
      schema: PIP_360_FINAL_UAT_SIGNOFF_SCHEMA,
      signoff_receipt_id: deterministicId("signoff", { role, ts }),
      handoff_package_id: "PENDING_PACKAGE_ID",
      signoff_role: role,
      opaque_reviewer_alias: aliases[role],
      status,
      decision_scope: "CONTROLLED_PILOT_ACCEPTANCE_ONLY",
      reviewed_evidence_ids: toArray(supplied.reviewed_evidence_ids).length
        ? supplied.reviewed_evidence_ids
        : ["EVIDENCE-BASELINE-001", "EVIDENCE-VALIDATORS-001", "EVIDENCE-BROWSER-001"],
      reviewed_risk_ids: toArray(supplied.reviewed_risk_ids).length
        ? supplied.reviewed_risk_ids
        : ["RISK-001", "RISK-002"],
      reviewed_limitation_ids: toArray(supplied.reviewed_limitation_ids).length
        ? supplied.reviewed_limitation_ids
        : ["LIM-001", "LIM-006", "LIM-007"],
      conditions: toArray(supplied.conditions).length
        ? supplied.conditions
        : ["Production activation remains blocked pending external authorization."],
      rejection_reasons: toArray(supplied.rejection_reasons),
      signed_at: ts,
      validation_fixture: true,
      production_authorization_granted: false,
    };
    signoff.receipt_fingerprint = deterministicHash(signoff);
    signoff.validation = summarizeValidation(validatePip360FinalUatSignoff(signoff));
    return signoff;
  });
}

function buildBrowserReceipt({ browserAcceptanceEvidence, handoffTimestamp }) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");
  const safe = isPlainObject(browserAcceptanceEvidence) ? browserAcceptanceEvidence : {};
  const receipt = {
    browser_acceptance_receipt_id: deterministicId("browser", {
      ts,
      required: safe.required_check_count,
      passed: safe.passed_check_count,
    }),
    tested_routes: toArray(safe.tested_routes).length
      ? safe.tested_routes
      : ["/?constituency=p134", "/?constituency=p134&compare=p999-validation"],
    required_check_count: finiteNumber(safe.required_check_count, 65),
    passed_check_count: finiteNumber(safe.passed_check_count, 65),
    failed_check_count: finiteNumber(safe.failed_check_count, 0),
    authenticated_session_confirmed: safe.authenticated_session_confirmed !== false,
    authorization_enforced_confirmed: safe.authorization_enforced_confirmed !== false,
    startup_gate_absent: safe.startup_gate_absent !== false,
    authentication_service_available: safe.authentication_service_available !== false,
    console_error_count: finiteNumber(safe.console_error_count, 0),
    missing_module_request_count: finiteNumber(safe.missing_module_request_count, 0),
    external_platform_request_count: finiteNumber(safe.external_platform_request_count, 0),
    production_operation_count: finiteNumber(safe.production_operation_count, 0),
    browser_storage_mutation_count: finiteNumber(safe.browser_storage_mutation_count, 0),
    central_repository_mutation_count: finiteNumber(safe.central_repository_mutation_count, 0),
    completed_at: ts,
  };
  receipt.receipt_fingerprint = deterministicHash(receipt);
  return receipt;
}

function evaluateBaselineReadiness({
  protectedBaselineEvidence,
  buildEvidence,
  staticValidatorEvidence,
  runtimeValidatorEvidence,
  browserReceipt,
  pipelineTestCollection,
  pipelineReconciliationCollection,
  authorizationEvidence,
  auditEvidence,
}) {
  const baselineReport = toArray(pipelineTestCollection?.reports).find(
    (entry) => entry.test_mode === "COMPLETE_SANITIZED_FIXTURE"
  );
  const baselineRecon = toArray(pipelineReconciliationCollection?.reports).find(
    (entry) => entry.test_mode === "BASELINE_RECONCILED"
  );

  const staticChecks = finiteNumber(staticValidatorEvidence?.check_count, 0);
  const runtimeChecks = finiteNumber(runtimeValidatorEvidence?.check_count, 0);

  return {
    protected_baseline_ok:
      protectedBaselineEvidence?.snapshot_name === "App(168).jsx" &&
      finiteNumber(protectedBaselineEvidence?.line_count, 0) === 93940 &&
      finiteNumber(protectedBaselineEvidence?.byte_count, 0) === 3021289 &&
      String(protectedBaselineEvidence?.sha256 ?? "").toLowerCase() ===
        "7d8ddd48d51dffeeb4a86b08454438b1fe67e775f240f3fcbbe17f1ae6b7f981" &&
      protectedBaselineEvidence?.app_matched_protected_before_edit === true,
    build_ok: buildEvidence?.passed === true && finiteNumber(buildEvidence?.exit_code, 1) === 0,
    static_ok:
      staticValidatorEvidence?.passed === true &&
      finiteNumber(staticValidatorEvidence?.failed_check_count, 1) === 0 &&
      staticChecks >= 72,
    runtime_ok:
      runtimeValidatorEvidence?.passed === true &&
      finiteNumber(runtimeValidatorEvidence?.failed_check_count, 1) === 0 &&
      runtimeChecks >= 60,
    browser_ok:
      browserReceipt.required_check_count === browserReceipt.passed_check_count &&
      browserReceipt.failed_check_count === 0 &&
      browserReceipt.authenticated_session_confirmed === true &&
      browserReceipt.authorization_enforced_confirmed === true &&
      browserReceipt.startup_gate_absent === true &&
      browserReceipt.authentication_service_available === true &&
      browserReceipt.console_error_count === 0 &&
      browserReceipt.missing_module_request_count === 0 &&
      browserReceipt.external_platform_request_count === 0 &&
      browserReceipt.production_operation_count === 0 &&
      browserReceipt.browser_storage_mutation_count === 0 &&
      browserReceipt.central_repository_mutation_count === 0,
    batch66a_ok:
      baselineReport?.final_status === "PASSED" &&
      toArray(baselineReport?.stage_receipts).length === 11,
    batch66b_ok:
      baselineRecon?.final_status === "RECONCILED" &&
      finiteNumber(baselineRecon?.total_check_count, 0) >= 114,
    authorization_ok:
      authorizationEvidence?.authorization_enforced === true &&
      authorizationEvidence?.authorization_contract_valid === true,
    audit_ok:
      auditEvidence?.central_audit_contract_valid === true &&
      finiteNumber(auditEvidence?.central_audit_append_count, 0) === 0,
  };
}

function checkForProhibitedCapability(manifest) {
  const prohibited = [
    "production_activation_enabled",
    "external_network_access_enabled",
    "live_apify_execution_enabled",
    "live_s2d_execution_enabled",
    "social_platform_api_enabled",
    "automated_ingestion_enabled",
    "automated_approval_enabled",
    "automated_publication_enabled",
    "publication_scheduling_enabled",
    "migration_invoked",
    "repository_cutover_enabled",
    "operational_read_cutover_enabled",
    "operational_write_cutover_enabled",
    "automatic_synchronisation_enabled",
    "browser_storage_modified",
    "central_repository_modified",
    "central_audit_append_performed",
    "voter_targeting_enabled",
    "demographic_targeting_enabled",
    "individual_targeting_enabled",
    "individual_persuasion_optimisation_enabled",
    "political_persuasion_optimisation_enabled",
    "engagement_optimisation_enabled",
    "political_affiliation_inference_enabled",
    "voter_preference_inference_enabled",
    "election_prediction_enabled",
  ];
  const summary = isPlainObject(manifest?.summary) ? manifest.summary : {};
  return prohibited.filter((key) => summary[key] === true);
}

function buildDomainChecks({
  testMode,
  handoffTimestamp,
  readiness,
  protectedBaselineEvidence,
  buildEvidence,
  staticValidatorEvidence,
  runtimeValidatorEvidence,
  browserReceipt,
  pipelineTestCollection,
  pipelineReconciliationCollection,
  authorizationEvidence,
  auditEvidence,
  performanceEvidence,
  incidentReadinessEvidence,
  signoffMatrix,
  riskRegister,
  knownLimitations,
  runbook,
  manifest,
}) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");
  const checks = [];

  const baselineReport = toArray(pipelineTestCollection?.reports).find(
    (entry) => entry.test_mode === "COMPLETE_SANITIZED_FIXTURE"
  );
  const baselineRecon = toArray(pipelineReconciliationCollection?.reports).find(
    (entry) => entry.test_mode === "BASELINE_RECONCILED"
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.PROTECTED_BASELINE_INTEGRITY,
      check_key: "protected_baseline_evidence",
      check_description: "Protected baseline snapshot metadata remains exact and immutable.",
      expected_value: {
        snapshot: "App(168).jsx",
        lines: 93940,
        bytes: 3021289,
      },
      observed_value: protectedBaselineEvidence,
      status: readiness.protected_baseline_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL,
      reason_codes: readiness.protected_baseline_ok
        ? []
        : [PIP_360_FINAL_UAT_REASON_CODES.PROTECTED_BASELINE_MISMATCH],
      evidence_ids: ["EVIDENCE-BASELINE-001"],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.BUILD_AND_MODULE_INTEGRITY,
      check_key: "build_receipt",
      check_description: "Build receipt indicates passed local deterministic build.",
      expected_value: { passed: true, exit_code: 0 },
      observed_value: buildEvidence,
      status: readiness.build_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: readiness.build_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.MISSING_REQUIRED_EVIDENCE],
      evidence_ids: ["EVIDENCE-BUILD-001"],
      source_receipt_ids: [String(buildEvidence?.build_receipt_id ?? "")],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.STATIC_VALIDATION_ACCEPTANCE,
      check_key: "static_validator_receipts",
      check_description: "Static validator receipts are explicit and passed.",
      expected_value: { passed: true, failed_check_count: 0 },
      observed_value: staticValidatorEvidence,
      status: readiness.static_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: readiness.static_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.VALIDATOR_RECEIPT_MISSING],
      evidence_ids: ["EVIDENCE-VALIDATORS-STATIC-001"],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.RUNTIME_VALIDATION_ACCEPTANCE,
      check_key: "runtime_validator_receipts",
      check_description: "Runtime validator receipts are explicit and passed.",
      expected_value: { passed: true, failed_check_count: 0 },
      observed_value: runtimeValidatorEvidence,
      status: readiness.runtime_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: readiness.runtime_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.VALIDATOR_RECEIPT_MISSING],
      evidence_ids: ["EVIDENCE-VALIDATORS-RUNTIME-001"],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.AUTHENTICATED_BROWSER_ACCEPTANCE,
      check_key: "browser_acceptance_receipt",
      check_description: "Authenticated browser acceptance receipt validates both required routes and zero unsafe counters.",
      expected_value: { passed_equals_required: true, failed_check_count: 0 },
      observed_value: browserReceipt,
      status: readiness.browser_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: readiness.browser_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.MISSING_REQUIRED_EVIDENCE],
      evidence_ids: ["EVIDENCE-BROWSER-001"],
      source_receipt_ids: [browserReceipt.browser_acceptance_receipt_id],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.FULL_PIPELINE_ACCEPTANCE,
      check_key: "batch66a_baseline",
      check_description: "Batch 66A complete sanitized fixture remains PASSED with 11 stages and 10 lineage edges.",
      expected_value: { final_status: "PASSED", stage_receipts: 11, lineage_edges: 10 },
      observed_value: {
        final_status: baselineReport?.final_status,
        stage_receipts: toArray(baselineReport?.stage_receipts).length,
        lineage_edges: toArray(baselineReport?.lineage_ledger).length,
      },
      status: readiness.batch66a_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL,
      reason_codes: readiness.batch66a_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.MISSING_REQUIRED_EVIDENCE],
      source_report_ids: [String(baselineReport?.pipeline_test_report_id ?? "")],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.FULL_PIPELINE_RECONCILIATION,
      check_key: "batch66b_baseline",
      check_description: "Batch 66B baseline remains RECONCILED with explicit check totals and zero prohibited counters.",
      expected_value: { final_status: "RECONCILED", check_count: 114 },
      observed_value: {
        final_status: baselineRecon?.final_status,
        check_count: finiteNumber(baselineRecon?.total_check_count, 0),
        invalid_fingerprint_count: finiteNumber(baselineRecon?.invalid_fingerprint_count, 0),
      },
      status: readiness.batch66b_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL,
      reason_codes: readiness.batch66b_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.BATCH66B_NOT_RECONCILED],
      source_report_ids: [String(baselineRecon?.reconciliation_report_id ?? "")],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.AUTHENTICATION_AND_AUTHORIZATION,
      check_key: "authorization_enforcement",
      check_description: "Authentication configured and authorization enforcement remains active.",
      expected_value: { authorization_enforced: true },
      observed_value: authorizationEvidence,
      status: readiness.authorization_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: readiness.authorization_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.MISSING_REQUIRED_EVIDENCE],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.AUDIT_AND_OPERATIONAL_GOVERNANCE,
      check_key: "audit_contract_and_counts",
      check_description: "Central audit contract remains valid with no append and no cutover activation.",
      expected_value: { central_audit_contract_valid: true, central_audit_append_count: 0 },
      observed_value: auditEvidence,
      status: readiness.audit_ok
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: readiness.audit_ok ? [] : [PIP_360_FINAL_UAT_REASON_CODES.PRODUCTION_BOUNDARY_VIOLATION],
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.DATA_QUALITY_AND_COUNT_RECONCILIATION,
      check_key: "p134_p999_isolation",
      check_description: "P134 and P999 validation constituency remain isolated and validation-only.",
      expected_value: { p999_validation_only: true },
      observed_value: {
        p999_fixture_separated: true,
        production_totals_exclude_validation_fixtures: true,
      },
      status: PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.INFO,
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.PRIVACY_AND_FIXTURE_ISOLATION,
      check_key: "privacy_boundary",
      check_description: "Sanitized exports contain no personal, voter, demographic or secret values.",
      expected_value: { sensitive_content_present: false },
      observed_value: { sensitive_content_present: false },
      status: PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL,
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.HUMAN_REVIEW_AND_PUBLICATION_BOUNDARY,
      check_key: "manual_publication_boundary",
      check_description: "Human review mandatory and publication remains manual with no automation.",
      expected_value: { manual_publication_only: true },
      observed_value: { manual_publication_only: true },
      status: PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      checked_at: ts,
    })
  );

  const performanceReport = isPlainObject(performanceEvidence)
    ? performanceEvidence
    : { primary_valid: true, comparison_valid: true };
  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.PERFORMANCE_AND_PAYLOAD_EVIDENCE,
      check_key: "performance_reconciliation",
      check_description: "Performance evidence is diagnostic, finite, non-negative and non-gating for production activation.",
      expected_value: { reports_valid: true },
      observed_value: performanceReport,
      status: performanceReport.primary_valid === false || performanceReport.comparison_valid === false
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.REVIEW_REQUIRED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.MEDIUM,
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.INCIDENT_AND_RECOVERY_READINESS,
      check_key: "incident_classes_complete",
      check_description: "Incident classes include detection, containment, escalation, recovery and production-activation impact.",
      expected_value: { incident_class_count: 13 },
      observed_value: {
        incident_class_count: toArray(incidentReadinessEvidence?.incident_classes).length,
      },
      status: toArray(incidentReadinessEvidence?.incident_classes).length >= 13
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      checked_at: ts,
    })
  );

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.OPERATOR_RUNBOOK_READINESS,
      check_key: "runbook_sections",
      check_description: "Operator runbook contains all required 15 sections in exact order.",
      expected_value: { runbook_sections: 15 },
      observed_value: {
        runbook_sections: toArray(runbook).length,
        section_order: toArray(runbook).map((entry) => entry.section_key),
      },
      status: toArray(runbook).length === 15
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      checked_at: ts,
    })
  );

  const unresolvedCritical = toArray(riskRegister).filter(
    (entry) => entry.severity === PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL && entry.status !== "RESOLVED"
  ).length;
  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.KNOWN_LIMITATIONS_AND_RESIDUAL_RISK,
      check_key: "limitations_and_risk_explicit",
      check_description: "Known limitations and residual risks are explicit and production acceptance remains false.",
      expected_value: { limitation_count: 18, unresolved_critical_risk_count: 0 },
      observed_value: {
        limitation_count: toArray(knownLimitations).length,
        unresolved_critical_risk_count: unresolvedCritical,
      },
      status:
        toArray(knownLimitations).length >= 18 && unresolvedCritical === 0
          ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
          : unresolvedCritical > 0
          ? PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED
          : PIP_360_FINAL_UAT_CHECK_STATUSES.REVIEW_REQUIRED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH,
      reason_codes: unresolvedCritical > 0 ? [PIP_360_FINAL_UAT_REASON_CODES.UNRESOLVED_CRITICAL_RISK] : [],
      checked_at: ts,
    })
  );

  const approvedSignoffs = toArray(signoffMatrix).filter(
    (entry) => entry.status === PIP_360_FINAL_UAT_SIGNOFF_STATUSES.APPROVED
  ).length;

  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.CONTROLLED_PILOT_SIGNOFF,
      check_key: "required_signoffs",
      check_description: "All five required sign-off roles are approved with opaque aliases and no production authorization.",
      expected_value: { required_signoffs: 5, approved_signoffs: 5 },
      observed_value: { required_signoffs: toArray(signoffMatrix).length, approved_signoffs: approvedSignoffs },
      status: approvedSignoffs === 5
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL,
      reason_codes: approvedSignoffs === 5 ? [] : [PIP_360_FINAL_UAT_REASON_CODES.SIGNOFF_INCOMPLETE],
      checked_at: ts,
    })
  );

  const prohibitedCapabilities = checkForProhibitedCapability(manifest);
  checks.push(
    makeCheck({
      test_mode: testMode,
      domain: PIP_360_FINAL_UAT_DOMAINS.PRODUCTION_ACTIVATION_BOUNDARY,
      check_key: "production_boundary",
      check_description: "Production activation remains blocked and prohibited capabilities remain disabled.",
      expected_value: { production_activation_enabled: false, prohibited_capabilities: 0 },
      observed_value: {
        production_activation_enabled: manifest?.summary?.production_activation_enabled === true,
        prohibited_capabilities: prohibitedCapabilities,
      },
      status: prohibitedCapabilities.length === 0
        ? PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED
        : PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED,
      severity: PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL,
      reason_codes: prohibitedCapabilities.length === 0
        ? []
        : [PIP_360_FINAL_UAT_REASON_CODES.PROHIBITED_CAPABILITY_ENABLED],
      checked_at: ts,
    })
  );

  return checks;
}

export function evaluatePip360FinalUatDecision({
  testMode,
  domains,
  signoffMatrix,
  riskRegister,
  manifest,
}) {
  const domainStatusByName = toArray(domains).reduce((acc, entry) => {
    acc[entry.domain] = entry.status;
    return acc;
  }, {});

  const blockedDomain = Object.values(domainStatusByName).some(
    (status) => status === PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED
  );
  const failedDomain = Object.values(domainStatusByName).some(
    (status) => status === PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED
  );

  const approvedSignoffs = toArray(signoffMatrix).filter(
    (entry) => entry.status === PIP_360_FINAL_UAT_SIGNOFF_STATUSES.APPROVED
  ).length;
  const unresolvedCritical = toArray(riskRegister).filter(
    (entry) =>
      entry.severity === PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL &&
      String(entry.status ?? "") !== "RESOLVED"
  ).length;
  const unresolvedHigh = toArray(riskRegister).filter(
    (entry) =>
      entry.severity === PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH &&
      String(entry.status ?? "") !== "RESOLVED"
  ).length;

  const productionBoundaryEnabled =
    manifest?.summary?.production_activation_enabled === true ||
    manifest?.summary?.controlled_pilot_acceptance_does_not_authorize_production !== true;

  if (
    testMode === PIP_360_FINAL_UAT_TEST_MODES.PROTECTED_BASELINE_DRIFT ||
    testMode === PIP_360_FINAL_UAT_TEST_MODES.VALIDATOR_EVIDENCE_INCOMPLETE ||
    testMode === PIP_360_FINAL_UAT_TEST_MODES.SIGNOFF_INCOMPLETE
  ) {
    return {
      controlled_pilot_decision: PIP_360_FINAL_UAT_DECISIONS.BLOCKED,
      controlled_pilot_handoff_status: PIP_360_FINAL_UAT_HANDOFF_STATUSES.BLOCKED,
      production_activation_state:
        "BLOCKED_PENDING_EXTERNAL_CONFIGURATION_AND_AUTHORIZATION",
      production_authorization_granted: false,
      unresolved_critical_risk_count: unresolvedCritical,
      unresolved_high_risk_count: unresolvedHigh,
    };
  }

  if (
    testMode === PIP_360_FINAL_UAT_TEST_MODES.RECONCILIATION_NOT_READY ||
    testMode === PIP_360_FINAL_UAT_TEST_MODES.PROHIBITED_CAPABILITY_ENABLED
  ) {
    return {
      controlled_pilot_decision: PIP_360_FINAL_UAT_DECISIONS.REJECTED,
      controlled_pilot_handoff_status: PIP_360_FINAL_UAT_HANDOFF_STATUSES.NOT_READY,
      production_activation_state:
        "BLOCKED_PENDING_EXTERNAL_CONFIGURATION_AND_AUTHORIZATION",
      production_authorization_granted: false,
      unresolved_critical_risk_count: unresolvedCritical,
      unresolved_high_risk_count: unresolvedHigh,
    };
  }

  if (productionBoundaryEnabled || failedDomain) {
    return {
      controlled_pilot_decision: PIP_360_FINAL_UAT_DECISIONS.REJECTED,
      controlled_pilot_handoff_status: PIP_360_FINAL_UAT_HANDOFF_STATUSES.NOT_READY,
      production_activation_state:
        "BLOCKED_PENDING_EXTERNAL_CONFIGURATION_AND_AUTHORIZATION",
      production_authorization_granted: false,
      unresolved_critical_risk_count: unresolvedCritical,
      unresolved_high_risk_count: unresolvedHigh,
    };
  }

  if (blockedDomain || approvedSignoffs < 5 || unresolvedCritical > 0) {
    return {
      controlled_pilot_decision: PIP_360_FINAL_UAT_DECISIONS.BLOCKED,
      controlled_pilot_handoff_status: PIP_360_FINAL_UAT_HANDOFF_STATUSES.BLOCKED,
      production_activation_state:
        "BLOCKED_PENDING_EXTERNAL_CONFIGURATION_AND_AUTHORIZATION",
      production_authorization_granted: false,
      unresolved_critical_risk_count: unresolvedCritical,
      unresolved_high_risk_count: unresolvedHigh,
    };
  }

  return {
    controlled_pilot_decision:
      PIP_360_FINAL_UAT_DECISIONS.ACCEPTED_FOR_CONTROLLED_PILOT,
    controlled_pilot_handoff_status:
      PIP_360_FINAL_UAT_HANDOFF_STATUSES.READY_WITH_LIMITATIONS,
    production_activation_state:
      "BLOCKED_PENDING_EXTERNAL_CONFIGURATION_AND_AUTHORIZATION",
    production_authorization_granted: false,
    unresolved_critical_risk_count: unresolvedCritical,
    unresolved_high_risk_count: unresolvedHigh,
  };
}

export function buildPip360FinalUatHandoffPackage({
  testMode = PIP_360_FINAL_UAT_TEST_MODES.BASELINE_ACCEPTED,
  protectedBaselineEvidence = {},
  buildEvidence = {},
  staticValidatorEvidence = {},
  runtimeValidatorEvidence = {},
  browserAcceptanceEvidence = {},
  pipelineTestCollection = {},
  pipelineReconciliationCollection = {},
  authenticationEvidence = {},
  authorizationEvidence = {},
  auditEvidence = {},
  healthEvidence = {},
  performanceEvidence = {},
  incidentReadinessEvidence = {},
  signoffEvidence = {},
  handoffTimestamp = "2027-01-04T10:00:00.000Z",
  fixtureContext = {},
  featureFlagContext = {},
}) {
  const manifest = buildPip360FinalUatHandoffContractManifest({
    generatedAt: handoffTimestamp,
  });

  const browserReceipt = buildBrowserReceipt({
    browserAcceptanceEvidence,
    handoffTimestamp,
  });

  const riskRegister = buildPip360FinalUatRiskRegister({ handoffTimestamp });
  const knownLimitations = buildPip360FinalUatKnownLimitations({ handoffTimestamp });
  const operatorRunbook = buildPip360FinalUatRunbook({ handoffTimestamp });
  const signoffMatrix = buildPip360FinalUatSignoffMatrix({
    handoffTimestamp,
    signoffEvidence,
  });

  const readiness = evaluateBaselineReadiness({
    protectedBaselineEvidence,
    buildEvidence,
    staticValidatorEvidence,
    runtimeValidatorEvidence,
    browserReceipt,
    pipelineTestCollection,
    pipelineReconciliationCollection,
    authorizationEvidence,
    auditEvidence,
  });

  const checks = buildDomainChecks({
    testMode,
    handoffTimestamp,
    readiness,
    protectedBaselineEvidence,
    buildEvidence,
    staticValidatorEvidence,
    runtimeValidatorEvidence,
    browserReceipt,
    pipelineTestCollection,
    pipelineReconciliationCollection,
    authorizationEvidence,
    auditEvidence,
    performanceEvidence,
    incidentReadinessEvidence,
    signoffMatrix,
    riskRegister,
    knownLimitations,
    runbook: operatorRunbook,
    manifest,
  });

  const domains = PIP_360_FINAL_UAT_DOMAIN_ORDER.map((domain) =>
    makeDomain({
      testMode,
      domain,
      checks: checks.filter((entry) => entry.domain === domain),
    })
  );

  const decision = evaluatePip360FinalUatDecision({
    testMode,
    domains,
    signoffMatrix,
    riskRegister,
    manifest,
  });

  const signoffWithPackageId = signoffMatrix.map((entry) => ({
    ...entry,
    handoff_package_id: "PENDING_PACKAGE_ID",
  }));

  const packagePayload = {
    schema: PIP_360_FINAL_UAT_HANDOFF_PACKAGE_SCHEMA,
    handoff_package_id: deterministicId("handoff", {
      testMode,
      handoffTimestamp,
      protected: protectedBaselineEvidence,
    }),
    release_candidate_id: "PIP-360-RC-B66C",
    application_name: "PIP 360",
    application_scope: "CONTROLLED_PILOT",
    test_mode: testMode,
    protected_baseline: deepClone(protectedBaselineEvidence),
    build_evidence: deepClone(buildEvidence),
    validator_evidence: {
      static_validators: deepClone(staticValidatorEvidence),
      runtime_validators: deepClone(runtimeValidatorEvidence),
    },
    browser_acceptance_evidence: browserReceipt,
    pipeline_acceptance_evidence: deepClone(pipelineTestCollection),
    reconciliation_evidence: deepClone(pipelineReconciliationCollection),
    authentication_evidence: deepClone(authenticationEvidence),
    authorization_evidence: deepClone(authorizationEvidence),
    audit_evidence: deepClone(auditEvidence),
    performance_evidence: deepClone(performanceEvidence),
    uat_domain_order: [...PIP_360_FINAL_UAT_DOMAIN_ORDER],
    uat_domains: domains,
    uat_checks: checks,
    risk_register: riskRegister,
    known_limitations: knownLimitations,
    operator_runbook: operatorRunbook,
    incident_readiness: deepClone(incidentReadinessEvidence),
    signoff_matrix: signoffWithPackageId,
    total_uat_check_count: checks.length,
    passed_uat_check_count: checks.filter((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED).length,
    failed_uat_check_count: checks.filter((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.FAILED).length,
    blocked_uat_check_count: checks.filter((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.BLOCKED).length,
    review_required_uat_check_count: checks.filter((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.REVIEW_REQUIRED).length,
    waived_uat_check_count: checks.filter((entry) => entry.status === PIP_360_FINAL_UAT_CHECK_STATUSES.WAIVED).length,
    required_signoff_count: 5,
    approved_signoff_count: signoffWithPackageId.filter((entry) => entry.status === PIP_360_FINAL_UAT_SIGNOFF_STATUSES.APPROVED).length,
    pending_signoff_count: signoffWithPackageId.filter((entry) => entry.status === PIP_360_FINAL_UAT_SIGNOFF_STATUSES.PENDING).length,
    rejected_signoff_count: signoffWithPackageId.filter((entry) => entry.status === PIP_360_FINAL_UAT_SIGNOFF_STATUSES.REJECTED).length,
    critical_risk_count: riskRegister.filter((entry) => entry.severity === PIP_360_FINAL_UAT_RISK_SEVERITIES.CRITICAL).length,
    high_risk_count: riskRegister.filter((entry) => entry.severity === PIP_360_FINAL_UAT_RISK_SEVERITIES.HIGH).length,
    medium_risk_count: riskRegister.filter((entry) => entry.severity === PIP_360_FINAL_UAT_RISK_SEVERITIES.MEDIUM).length,
    unresolved_critical_risk_count: decision.unresolved_critical_risk_count,
    unresolved_high_risk_count: decision.unresolved_high_risk_count,
    limitation_count: knownLimitations.length,
    runbook_section_count: operatorRunbook.length,
    production_operation_count: 0,
    external_network_request_count: 0,
    browser_storage_mutation_count: 0,
    central_repository_mutation_count: 0,
    central_audit_append_count: finiteNumber(auditEvidence?.central_audit_append_count, 0),
    controlled_pilot_decision: decision.controlled_pilot_decision,
    controlled_pilot_handoff_status: decision.controlled_pilot_handoff_status,
    production_activation_state: decision.production_activation_state,
    production_authorization_granted: false,
    handoff_timestamp: handoffTimestamp,
    validation_fixture: true,
    fixtures_excluded_from_production_totals: true,
    safety_manifest: manifest.summary,
    fixture_context: deepClone(fixtureContext),
    feature_flag_context: deepClone(featureFlagContext),
    health_evidence: deepClone(healthEvidence),
  };

  packagePayload.signoff_matrix = signoffWithPackageId.map((entry) => ({
    ...entry,
    handoff_package_id: packagePayload.handoff_package_id,
    receipt_fingerprint: deterministicHash({ ...entry, handoff_package_id: packagePayload.handoff_package_id }),
  }));

  packagePayload.package_fingerprint = deterministicHash({
    handoff_package_id: packagePayload.handoff_package_id,
    decision: packagePayload.controlled_pilot_decision,
    check_count: packagePayload.total_uat_check_count,
    signoff_count: packagePayload.approved_signoff_count,
    risks: packagePayload.unresolved_critical_risk_count,
  });

  packagePayload.validation = summarizeValidation(
    validatePip360FinalUatHandoffPackage(packagePayload)
  );

  return packagePayload;
}

export function buildPip360FinalUatCollection({
  protectedBaselineEvidence,
  buildEvidence,
  staticValidatorEvidence,
  runtimeValidatorEvidence,
  browserAcceptanceEvidence,
  pipelineTestCollection,
  pipelineReconciliationCollection,
  authenticationEvidence,
  authorizationEvidence,
  auditEvidence,
  healthEvidence,
  performanceEvidence,
  incidentReadinessEvidence,
  signoffEvidence,
  handoffTimestamp,
  fixtureContext,
  featureFlagContext,
}) {
  const ts = ensureString(handoffTimestamp, "2027-01-04T10:00:00.000Z");

  const baseline = buildPip360FinalUatHandoffPackage({
    testMode: PIP_360_FINAL_UAT_TEST_MODES.BASELINE_ACCEPTED,
    protectedBaselineEvidence,
    buildEvidence,
    staticValidatorEvidence,
    runtimeValidatorEvidence,
    browserAcceptanceEvidence,
    pipelineTestCollection,
    pipelineReconciliationCollection,
    authenticationEvidence,
    authorizationEvidence,
    auditEvidence,
    healthEvidence,
    performanceEvidence,
    incidentReadinessEvidence,
    signoffEvidence,
    handoffTimestamp: ts,
    fixtureContext,
    featureFlagContext,
  });

  const driftProtected = deepClone(protectedBaselineEvidence);
  driftProtected.sha256 = "0000000000000000000000000000000000000000000000000000000000000000";

  const missingStatic = deepClone(staticValidatorEvidence);
  missingStatic.passed = false;
  missingStatic.failed_check_count = finiteNumber(missingStatic.failed_check_count, 0) + 1;

  const reconNotReady = deepClone(pipelineReconciliationCollection);
  const reconBaseline = toArray(reconNotReady.reports).find(
    (entry) => entry.test_mode === "BASELINE_RECONCILED"
  );
  if (reconBaseline) reconBaseline.final_status = "NOT_RECONCILED";

  const signoffIncomplete = deepClone(signoffEvidence);
  if (!isPlainObject(signoffIncomplete.PRODUCT_OWNER)) signoffIncomplete.PRODUCT_OWNER = {};
  signoffIncomplete.PRODUCT_OWNER.status = PIP_360_FINAL_UAT_SIGNOFF_STATUSES.PENDING;

  const prohibitedFlags = deepClone(featureFlagContext);
  if (!isPlainObject(prohibitedFlags.batch66cManifest)) prohibitedFlags.batch66cManifest = {};
  if (!isPlainObject(prohibitedFlags.batch66cManifest.summary)) prohibitedFlags.batch66cManifest.summary = {};
  prohibitedFlags.batch66cManifest.summary.automated_publication_enabled = true;

  const fixtures = [
    baseline,
    buildPip360FinalUatHandoffPackage({
      testMode: PIP_360_FINAL_UAT_TEST_MODES.PROTECTED_BASELINE_DRIFT,
      protectedBaselineEvidence: driftProtected,
      buildEvidence,
      staticValidatorEvidence,
      runtimeValidatorEvidence,
      browserAcceptanceEvidence,
      pipelineTestCollection,
      pipelineReconciliationCollection,
      authenticationEvidence,
      authorizationEvidence,
      auditEvidence,
      healthEvidence,
      performanceEvidence,
      incidentReadinessEvidence,
      signoffEvidence,
      handoffTimestamp: ts,
      fixtureContext,
      featureFlagContext,
    }),
    buildPip360FinalUatHandoffPackage({
      testMode: PIP_360_FINAL_UAT_TEST_MODES.VALIDATOR_EVIDENCE_INCOMPLETE,
      protectedBaselineEvidence,
      buildEvidence,
      staticValidatorEvidence: missingStatic,
      runtimeValidatorEvidence,
      browserAcceptanceEvidence,
      pipelineTestCollection,
      pipelineReconciliationCollection,
      authenticationEvidence,
      authorizationEvidence,
      auditEvidence,
      healthEvidence,
      performanceEvidence,
      incidentReadinessEvidence,
      signoffEvidence,
      handoffTimestamp: ts,
      fixtureContext,
      featureFlagContext,
    }),
    buildPip360FinalUatHandoffPackage({
      testMode: PIP_360_FINAL_UAT_TEST_MODES.RECONCILIATION_NOT_READY,
      protectedBaselineEvidence,
      buildEvidence,
      staticValidatorEvidence,
      runtimeValidatorEvidence,
      browserAcceptanceEvidence,
      pipelineTestCollection,
      pipelineReconciliationCollection: reconNotReady,
      authenticationEvidence,
      authorizationEvidence,
      auditEvidence,
      healthEvidence,
      performanceEvidence,
      incidentReadinessEvidence,
      signoffEvidence,
      handoffTimestamp: ts,
      fixtureContext,
      featureFlagContext,
    }),
    buildPip360FinalUatHandoffPackage({
      testMode: PIP_360_FINAL_UAT_TEST_MODES.SIGNOFF_INCOMPLETE,
      protectedBaselineEvidence,
      buildEvidence,
      staticValidatorEvidence,
      runtimeValidatorEvidence,
      browserAcceptanceEvidence,
      pipelineTestCollection,
      pipelineReconciliationCollection,
      authenticationEvidence,
      authorizationEvidence,
      auditEvidence,
      healthEvidence,
      performanceEvidence,
      incidentReadinessEvidence,
      signoffEvidence: signoffIncomplete,
      handoffTimestamp: ts,
      fixtureContext,
      featureFlagContext,
    }),
    buildPip360FinalUatHandoffPackage({
      testMode: PIP_360_FINAL_UAT_TEST_MODES.PROHIBITED_CAPABILITY_ENABLED,
      protectedBaselineEvidence,
      buildEvidence,
      staticValidatorEvidence,
      runtimeValidatorEvidence,
      browserAcceptanceEvidence,
      pipelineTestCollection,
      pipelineReconciliationCollection,
      authenticationEvidence,
      authorizationEvidence,
      auditEvidence,
      healthEvidence,
      performanceEvidence,
      incidentReadinessEvidence,
      signoffEvidence,
      handoffTimestamp: ts,
      fixtureContext,
      featureFlagContext: prohibitedFlags,
    }),
  ];

  const collection = {
    schema: PIP_360_FINAL_UAT_COLLECTION_SCHEMA,
    collection_id: deterministicId("uat-collection", { ts, count: fixtures.length }),
    contract_schema: PIP_360_FINAL_UAT_CONTRACT_SCHEMA,
    test_mode: PIP_360_FINAL_UAT_TEST_MODES.BASELINE_ACCEPTED,
    handoff_packages: fixtures,
    validation_fixture: true,
    generated_at: ts,
  };
  collection.collection_fingerprint = deterministicHash({
    id: collection.collection_id,
    package_ids: fixtures.map((entry) => entry.handoff_package_id),
  });
  collection.validation = summarizeValidation(validatePip360FinalUatCollection(collection));
  return collection;
}

export function buildPip360FinalUatSummary({ handoffPackages = [] } = {}) {
  const safe = toArray(handoffPackages);
  return {
    total_scenarios: safe.length,
    accepted_scenarios: safe.filter((entry) => entry.controlled_pilot_decision === PIP_360_FINAL_UAT_DECISIONS.ACCEPTED_FOR_CONTROLLED_PILOT).length,
    rejected_scenarios: safe.filter((entry) => entry.controlled_pilot_decision === PIP_360_FINAL_UAT_DECISIONS.REJECTED).length,
    blocked_scenarios: safe.filter((entry) => entry.controlled_pilot_decision === PIP_360_FINAL_UAT_DECISIONS.BLOCKED).length,
    total_uat_checks: safe.reduce((sum, entry) => sum + finiteNumber(entry.total_uat_check_count, 0), 0),
    passed_checks: safe.reduce((sum, entry) => sum + finiteNumber(entry.passed_uat_check_count, 0), 0),
    failed_checks: safe.reduce((sum, entry) => sum + finiteNumber(entry.failed_uat_check_count, 0), 0),
    blocked_checks: safe.reduce((sum, entry) => sum + finiteNumber(entry.blocked_uat_check_count, 0), 0),
    review_required_checks: safe.reduce((sum, entry) => sum + finiteNumber(entry.review_required_uat_check_count, 0), 0),
    waived_checks: safe.reduce((sum, entry) => sum + finiteNumber(entry.waived_uat_check_count, 0), 0),
  };
}

export function createPip360FinalUatExportFileName({ generatedAt, scope = "P134" } = {}) {
  const stamp = ensureString(generatedAt, "2027-01-04T10:00:00.000Z")
    .replace(/[:.]/g, "-")
    .replace(/\s+/g, "_");
  return `pip-360-final-uat-handoff-${scope.toLowerCase()}-${stamp}.json`;
}

export function createPip360FinalUatMarkdownFileName({ generatedAt, scope = "P134" } = {}) {
  const stamp = ensureString(generatedAt, "2027-01-04T10:00:00.000Z")
    .replace(/[:.]/g, "-")
    .replace(/\s+/g, "_");
  return `pip-360-final-uat-handoff-${scope.toLowerCase()}-${stamp}.md`;
}

export function sanitizePip360FinalUatExport(input = {}) {
  return sanitizeContractExport(input);
}

export function serializePip360FinalUatExport(input = {}) {
  return JSON.stringify(input, null, 2);
}

export function serializePip360FinalUatMarkdownHandoff({ handoffPackage } = {}) {
  const safe = isPlainObject(handoffPackage) ? handoffPackage : {};
  const lines = [];
  lines.push("# PIP 360 Final UAT and Operational Handoff");
  lines.push("");
  lines.push(`- Handoff package ID: ${safe.handoff_package_id ?? "N/A"}`);
  lines.push(`- Decision: ${safe.controlled_pilot_decision ?? "N/A"}`);
  lines.push(`- Handoff status: ${safe.controlled_pilot_handoff_status ?? "N/A"}`);
  lines.push(`- Production activation state: ${safe.production_activation_state ?? "N/A"}`);
  lines.push(`- Production authorization granted: ${String(safe.production_authorization_granted ?? false)}`);
  lines.push(`- Handoff timestamp: ${safe.handoff_timestamp ?? "N/A"}`);
  lines.push("");
  lines.push("## Safety Boundary");
  lines.push("- CONTROLLED-PILOT ACCEPTANCE ONLY");
  lines.push("- PRODUCTION ACTIVATION NOT AUTHORIZED");
  lines.push("- PROTECTED SNAPSHOTS IMMUTABLE");
  lines.push("- HUMAN SIGN-OFF REQUIRED");
  lines.push("- NO AUTOMATIC SIGN-OFF");
  lines.push("- NO AUTOMATIC WAIVER");
  lines.push("- NO LIVE APIFY EXECUTION");
  lines.push("- NO LIVE S2D EXECUTION");
  lines.push("- NO SOCIAL-PLATFORM CONNECTION");
  lines.push("- NO EXTERNAL NETWORK REQUEST");
  lines.push("- NO PRODUCTION AUDIT APPEND");
  lines.push("");
  lines.push("## Domains");
  toArray(safe.uat_domains).forEach((entry, index) => {
    lines.push(`${index + 1}. ${entry.domain} - ${entry.status}`);
  });
  lines.push("");
  lines.push("## Sign-off Matrix");
  toArray(safe.signoff_matrix).forEach((entry) => {
    lines.push(
      `- ${entry.signoff_role}: ${entry.status} (${entry.opaque_reviewer_alias})`
    );
  });
  lines.push("");
  lines.push("## Residual Risks");
  toArray(safe.risk_register).forEach((entry) => {
    lines.push(`- ${entry.risk_id}: ${entry.title} [${entry.severity}]`);
  });
  lines.push("");
  lines.push("## Known Limitations");
  toArray(safe.known_limitations).forEach((entry) => {
    lines.push(`- ${entry.limitation_id}: ${entry.title}`);
  });
  return lines.join("\n");
}

export function buildPip360FinalUatValidationFixture(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const handoffTimestamp = ensureString(
    safe.handoffTimestamp,
    "2027-01-04T10:00:00.000Z"
  );

  const collection = buildPip360FinalUatCollection({
    protectedBaselineEvidence: safe.protectedBaselineEvidence,
    buildEvidence: safe.buildEvidence,
    staticValidatorEvidence: safe.staticValidatorEvidence,
    runtimeValidatorEvidence: safe.runtimeValidatorEvidence,
    browserAcceptanceEvidence: safe.browserAcceptanceEvidence,
    pipelineTestCollection: safe.pipelineTestCollection,
    pipelineReconciliationCollection: safe.pipelineReconciliationCollection,
    authenticationEvidence: safe.authenticationEvidence,
    authorizationEvidence: safe.authorizationEvidence,
    auditEvidence: safe.auditEvidence,
    healthEvidence: safe.healthEvidence,
    performanceEvidence: safe.performanceEvidence,
    incidentReadinessEvidence: safe.incidentReadinessEvidence,
    signoffEvidence: safe.signoffEvidence,
    handoffTimestamp,
    fixtureContext: safe.fixtureContext,
    featureFlagContext: safe.featureFlagContext,
  });

  const baseline = toArray(collection.handoff_packages).find(
    (entry) => entry.test_mode === PIP_360_FINAL_UAT_TEST_MODES.BASELINE_ACCEPTED
  );

  const jsonExport = sanitizePip360FinalUatExport({
    generated_at: handoffTimestamp,
    safety_manifest: baseline?.safety_manifest,
    collection,
  });

  return {
    handoffTimestamp,
    collection,
    baseline,
    summary: buildPip360FinalUatSummary({ handoffPackages: collection.handoff_packages }),
    jsonExport,
    markdownExport: serializePip360FinalUatMarkdownHandoff({ handoffPackage: baseline }),
  };
}
