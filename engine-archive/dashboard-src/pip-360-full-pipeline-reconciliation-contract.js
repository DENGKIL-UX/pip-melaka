export const PIP_360_PIPELINE_RECONCILIATION_CONTRACT_SCHEMA =
  "pip.360.full-pipeline-reconciliation.contract.v1";
export const PIP_360_PIPELINE_RECONCILIATION_CHECK_SCHEMA =
  "pip.360.full-pipeline-reconciliation.check.v1";
export const PIP_360_PIPELINE_RECONCILIATION_DIMENSION_SCHEMA =
  "pip.360.full-pipeline-reconciliation.dimension.v1";
export const PIP_360_PIPELINE_RECONCILIATION_REPORT_SCHEMA =
  "pip.360.full-pipeline-reconciliation.report.v1";
export const PIP_360_PIPELINE_RECONCILIATION_COLLECTION_SCHEMA =
  "pip.360.full-pipeline-reconciliation.collection.v1";
export const PIP_360_PIPELINE_RECONCILIATION_EXPORT_SCHEMA =
  "pip.360.full-pipeline-reconciliation.export.v1";

export const PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS = Object.freeze({
  SCHEMA_AND_STAGE_ORDER: "SCHEMA_AND_STAGE_ORDER",
  RECORD_COUNT_RECONCILIATION: "RECORD_COUNT_RECONCILIATION",
  DUPLICATE_RECONCILIATION: "DUPLICATE_RECONCILIATION",
  SENTIMENT_RECONCILIATION: "SENTIMENT_RECONCILIATION",
  GEOGRAPHY_RECONCILIATION: "GEOGRAPHY_RECONCILIATION",
  ARTIFACT_AND_EVIDENCE_LINEAGE: "ARTIFACT_AND_EVIDENCE_LINEAGE",
  HUMAN_GOVERNANCE: "HUMAN_GOVERNANCE",
  PUBLICATION_BOUNDARY: "PUBLICATION_BOUNDARY",
  OUTCOME_MONITORING: "OUTCOME_MONITORING",
  AUTHORIZATION_AND_AUDIT: "AUTHORIZATION_AND_AUDIT",
  PERFORMANCE_AND_PAYLOAD: "PERFORMANCE_AND_PAYLOAD",
  PRIVACY_AND_FIXTURE_ISOLATION: "PRIVACY_AND_FIXTURE_ISOLATION",
  FEATURE_FLAGS_AND_SAFETY: "FEATURE_FLAGS_AND_SAFETY",
});

export const PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER = Object.freeze([
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SCHEMA_AND_STAGE_ORDER,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.RECORD_COUNT_RECONCILIATION,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.DUPLICATE_RECONCILIATION,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SENTIMENT_RECONCILIATION,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.GEOGRAPHY_RECONCILIATION,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.ARTIFACT_AND_EVIDENCE_LINEAGE,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.HUMAN_GOVERNANCE,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PUBLICATION_BOUNDARY,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.OUTCOME_MONITORING,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.AUTHORIZATION_AND_AUDIT,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PERFORMANCE_AND_PAYLOAD,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PRIVACY_AND_FIXTURE_ISOLATION,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.FEATURE_FLAGS_AND_SAFETY,
]);

export const PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES = Object.freeze({
  PASSED: "PASSED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
});

export const PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES = Object.freeze({
  RECONCILED: "RECONCILED",
  PARTIALLY_RECONCILED: "PARTIALLY_RECONCILED",
  NOT_RECONCILED: "NOT_RECONCILED",
  BLOCKED: "BLOCKED",
});

export const PIP_360_PIPELINE_RECONCILIATION_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
});

export const PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES = Object.freeze({
  COUNT_MISMATCH: "COUNT_MISMATCH",
  STATUS_MISMATCH: "STATUS_MISMATCH",
  MISSING_ARTIFACT: "MISSING_ARTIFACT",
  MISSING_EVIDENCE: "MISSING_EVIDENCE",
  MISSING_STAGE_RECEIPT: "MISSING_STAGE_RECEIPT",
  MISSING_LINEAGE_EDGE: "MISSING_LINEAGE_EDGE",
  FINGERPRINT_MISMATCH: "FINGERPRINT_MISMATCH",
  DUPLICATE_UNACCOUNTED: "DUPLICATE_UNACCOUNTED",
  SENTIMENT_TOTAL_MISMATCH: "SENTIMENT_TOTAL_MISMATCH",
  GEOGRAPHY_TOTAL_MISMATCH: "GEOGRAPHY_TOTAL_MISMATCH",
  HUMAN_GATE_BYPASS: "HUMAN_GATE_BYPASS",
  PUBLICATION_BOUNDARY_BYPASS: "PUBLICATION_BOUNDARY_BYPASS",
  MONITORING_WINDOW_MISMATCH: "MONITORING_WINDOW_MISMATCH",
  AUTHORIZATION_INVALID: "AUTHORIZATION_INVALID",
  AUDIT_EVIDENCE_INCOMPLETE: "AUDIT_EVIDENCE_INCOMPLETE",
  PERFORMANCE_EVIDENCE_INVALID: "PERFORMANCE_EVIDENCE_INVALID",
  PRIVACY_BOUNDARY_VIOLATION: "PRIVACY_BOUNDARY_VIOLATION",
  FIXTURE_LEAKAGE: "FIXTURE_LEAKAGE",
  FEATURE_FLAG_VIOLATION: "FEATURE_FLAG_VIOLATION",
  PROHIBITED_OPERATION_DETECTED: "PROHIBITED_OPERATION_DETECTED",
});

export const PIP_360_PIPELINE_RECONCILIATION_TEST_MODES = Object.freeze({
  BASELINE_RECONCILED: "BASELINE_RECONCILED",
  COUNT_MISMATCH: "COUNT_MISMATCH",
  LINEAGE_MISMATCH: "LINEAGE_MISMATCH",
  AUTHORIZATION_CONTEXT_MISSING: "AUTHORIZATION_CONTEXT_MISSING",
  FIXTURE_LEAKAGE: "FIXTURE_LEAKAGE",
});

export const PIP_360_PIPELINE_RECONCILIATION_REASON_CODES = Object.freeze({
  BATCH66A_COLLECTION_REQUIRED: "BATCH66A_COLLECTION_REQUIRED",
  UNKNOWN_TEST_MODE: "UNKNOWN_TEST_MODE",
  STAGE_ORDER_MISMATCH: "STAGE_ORDER_MISMATCH",
  STAGE_RECEIPT_COUNT_MISMATCH: "STAGE_RECEIPT_COUNT_MISMATCH",
  LINEAGE_EDGE_COUNT_MISMATCH: "LINEAGE_EDGE_COUNT_MISMATCH",
  RECEIPT_FINGERPRINT_MISSING: "RECEIPT_FINGERPRINT_MISSING",
  RECEIPT_TIMESTAMP_MISSING: "RECEIPT_TIMESTAMP_MISSING",
  COUNT_EQUATION_MISMATCH: "COUNT_EQUATION_MISMATCH",
  DUPLICATE_REASON_MISSING: "DUPLICATE_REASON_MISSING",
  CANONICAL_RETENTION_MISMATCH: "CANONICAL_RETENTION_MISMATCH",
  SENTIMENT_TOTAL_MISMATCH: "SENTIMENT_TOTAL_MISMATCH",
  GEOGRAPHY_TOTAL_MISMATCH: "GEOGRAPHY_TOTAL_MISMATCH",
  ARTIFACT_ID_MISMATCH: "ARTIFACT_ID_MISMATCH",
  FINGERPRINT_MISMATCH: "FINGERPRINT_MISMATCH",
  EVIDENCE_LINEAGE_MISSING: "EVIDENCE_LINEAGE_MISSING",
  HUMAN_APPROVAL_REQUIRED: "HUMAN_APPROVAL_REQUIRED",
  PUBLICATION_BOUNDARY_REQUIRED: "PUBLICATION_BOUNDARY_REQUIRED",
  MONITORING_WINDOW_MISMATCH: "MONITORING_WINDOW_MISMATCH",
  AUTHORIZATION_CONTEXT_REQUIRED: "AUTHORIZATION_CONTEXT_REQUIRED",
  AUTHORIZATION_CONTRACT_INVALID: "AUTHORIZATION_CONTRACT_INVALID",
  AUTHORIZATION_SNAPSHOT_INVALID: "AUTHORIZATION_SNAPSHOT_INVALID",
  AUTHORIZATION_NOT_ENFORCED: "AUTHORIZATION_NOT_ENFORCED",
  AUDIT_CONTRACT_INVALID: "AUDIT_CONTRACT_INVALID",
  PERFORMANCE_REPORT_INVALID: "PERFORMANCE_REPORT_INVALID",
  NEGATIVE_TIMING_VALUE: "NEGATIVE_TIMING_VALUE",
  NEGATIVE_PAYLOAD_VALUE: "NEGATIVE_PAYLOAD_VALUE",
  PAYLOAD_TOTAL_MISMATCH: "PAYLOAD_TOTAL_MISMATCH",
  PRIVACY_FIELD_PRESENT: "PRIVACY_FIELD_PRESENT",
  FIXTURE_INCLUDED_IN_PRODUCTION_TOTALS: "FIXTURE_INCLUDED_IN_PRODUCTION_TOTALS",
  PROHIBITED_FEATURE_FLAG_ENABLED: "PROHIBITED_FEATURE_FLAG_ENABLED",
  PROHIBITED_OPERATION_DETECTED: "PROHIBITED_OPERATION_DETECTED",
  REVIEW_REQUIRED_AUDIT_EVIDENCE: "REVIEW_REQUIRED_AUDIT_EVIDENCE",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIso(value) {
  const parsed = Date.parse(String(value ?? ""));
  if (!Number.isFinite(parsed)) return null;
  return new globalThis.Date(parsed).toISOString();
}

function unique(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function decycle(value, seen = new Set(), depth = 0) {
  if (depth > 7) return "[DepthLimit]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";

  if (Array.isArray(value)) {
    seen.add(value);
    return value.map((entry) => decycle(entry, seen, depth + 1));
  }

  seen.add(value);
  const output = {};
  Object.keys(value).forEach((key) => {
    if (key === "normalized") return;
    output[key] = decycle(value[key], seen, depth + 1);
  });
  return output;
}

function envelope(valid, checks, errors, normalized) {
  return {
    valid,
    checks,
    errors,
    normalized,
    summary: {
      passed_checks: Object.values(checks).filter(Boolean).length,
      total_checks: Object.keys(checks).length,
      error_count: errors.length,
    },
  };
}

export function buildPip360FullPipelineReconciliationContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_360_PIPELINE_RECONCILIATION_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? "2027-01-03T00:00:00.000Z",
    check_schema: PIP_360_PIPELINE_RECONCILIATION_CHECK_SCHEMA,
    dimension_schema: PIP_360_PIPELINE_RECONCILIATION_DIMENSION_SCHEMA,
    report_schema: PIP_360_PIPELINE_RECONCILIATION_REPORT_SCHEMA,
    collection_schema: PIP_360_PIPELINE_RECONCILIATION_COLLECTION_SCHEMA,
    export_schema: PIP_360_PIPELINE_RECONCILIATION_EXPORT_SCHEMA,
    dimensions: { ...PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS },
    dimension_order: [...PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER],
    check_statuses: { ...PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES },
    final_statuses: { ...PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES },
    severities: { ...PIP_360_PIPELINE_RECONCILIATION_SEVERITIES },
    discrepancy_types: { ...PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES },
    test_modes: { ...PIP_360_PIPELINE_RECONCILIATION_TEST_MODES },
    reason_codes: { ...PIP_360_PIPELINE_RECONCILIATION_REASON_CODES },
    summary: {
      reconciliation_enabled: true,
      read_only_reconciliation_only: true,
      batch66a_dependency_required: true,
      batch66a_source_immutability_required: true,
      exact_eleven_stage_order_required: true,
      exact_ten_adjacent_lineage_edges_required: true,
      deterministic_reconciliation_required: true,
      deterministic_check_identifiers_required: true,
      deterministic_report_fingerprints_required: true,
      explicit_reconciliation_timestamp_required: true,
      expected_and_observed_values_required: true,
      variance_disclosure_required: true,
      discrepancy_disclosure_required: true,
      silent_repair_enabled: false,
      silent_normalisation_enabled: false,
      silent_duplicate_removal_enabled: false,
      upstream_artifact_replacement_enabled: false,
      upstream_fingerprint_regeneration_enabled: false,
      automatic_remediation_enabled: false,
      automatic_retry_enabled: false,
      source_and_derived_counts_separate: true,
      duplicate_count_explicitly_reconciled: true,
      sentiment_total_reconciliation_required: true,
      geography_total_reconciliation_required: true,
      artifact_lineage_reconciliation_required: true,
      evidence_lineage_reconciliation_required: true,
      human_approval_gate_reconciliation_required: true,
      manual_publication_boundary_reconciliation_required: true,
      five_window_monitoring_reconciliation_required: true,
      authorization_snapshot_reconciliation_required: true,
      central_audit_contract_reconciliation_required: true,
      performance_evidence_reconciliation_required: true,
      privacy_boundary_reconciliation_required: true,
      fixture_isolation_reconciliation_required: true,
      feature_flag_reconciliation_required: true,
      performance_evaluation_diagnostic_only: true,
      performance_failure_causes_production_operation: false,
      production_operation_enabled: false,
      external_network_access_enabled: false,
      live_apify_execution_enabled: false,
      live_s2d_execution_enabled: false,
      social_platform_api_enabled: false,
      platform_authentication_enabled: false,
      automated_ingestion_enabled: false,
      automated_approval_enabled: false,
      automated_publication_enabled: false,
      publication_scheduling_enabled: false,
      production_response_case_generation_enabled: false,
      production_content_generation_enabled: false,
      production_analytics_ingestion_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      production_records_modified: false,
      central_audit_append_performed: false,
      raw_public_content_included: false,
      public_account_identity_included: false,
      personal_data_included: false,
      voter_records_included: false,
      voter_identifiers_included: false,
      demographic_profiles_included: false,
      political_affiliation_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      individual_targeting_enabled: false,
      demographic_targeting_enabled: false,
      voter_targeting_enabled: false,
      locality_persuasion_ranking_enabled: false,
      individual_persuasion_optimisation_enabled: false,
      political_persuasion_optimisation_enabled: false,
      engagement_optimisation_enabled: false,
      causal_attribution_enabled: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
    },
  };
}

export function validatePip360FullPipelineReconciliationContractManifest(
  input = {}
) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema: safe.schema === PIP_360_PIPELINE_RECONCILIATION_CONTRACT_SCHEMA,
    check_schema:
      safe.check_schema === PIP_360_PIPELINE_RECONCILIATION_CHECK_SCHEMA,
    dimension_schema:
      safe.dimension_schema === PIP_360_PIPELINE_RECONCILIATION_DIMENSION_SCHEMA,
    report_schema:
      safe.report_schema === PIP_360_PIPELINE_RECONCILIATION_REPORT_SCHEMA,
    collection_schema:
      safe.collection_schema ===
      PIP_360_PIPELINE_RECONCILIATION_COLLECTION_SCHEMA,
    export_schema:
      safe.export_schema === PIP_360_PIPELINE_RECONCILIATION_EXPORT_SCHEMA,
    dimension_count: Object.values(safe.dimensions ?? {}).length === 13,
    dimension_order:
      JSON.stringify(toArray(safe.dimension_order)) ===
      JSON.stringify(PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER),
    check_statuses:
      JSON.stringify(Object.values(safe.check_statuses ?? {}).sort()) ===
      JSON.stringify(
        Object.values(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES).sort()
      ),
    final_statuses:
      JSON.stringify(Object.values(safe.final_statuses ?? {}).sort()) ===
      JSON.stringify(
        Object.values(PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES).sort()
      ),
    severities:
      JSON.stringify(Object.values(safe.severities ?? {}).sort()) ===
      JSON.stringify(
        Object.values(PIP_360_PIPELINE_RECONCILIATION_SEVERITIES).sort()
      ),
    discrepancy_types:
      JSON.stringify(Object.values(safe.discrepancy_types ?? {}).sort()) ===
      JSON.stringify(
        Object.values(PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES).sort()
      ),
    test_modes:
      JSON.stringify(Object.values(safe.test_modes ?? {}).sort()) ===
      JSON.stringify(
        Object.values(PIP_360_PIPELINE_RECONCILIATION_TEST_MODES).sort()
      ),
    dependency_and_immutability:
      summary.batch66a_dependency_required === true &&
      summary.batch66a_source_immutability_required === true,
    deterministic:
      summary.deterministic_reconciliation_required === true &&
      summary.deterministic_check_identifiers_required === true &&
      summary.deterministic_report_fingerprints_required === true,
    disclosure:
      summary.expected_and_observed_values_required === true &&
      summary.variance_disclosure_required === true &&
      summary.discrepancy_disclosure_required === true,
    no_silent_repair:
      summary.silent_repair_enabled === false &&
      summary.silent_normalisation_enabled === false &&
      summary.silent_duplicate_removal_enabled === false &&
      summary.upstream_fingerprint_regeneration_enabled === false,
    no_remediation:
      summary.automatic_remediation_enabled === false &&
      summary.automatic_retry_enabled === false,
    reconciliation_dimensions_enabled:
      summary.human_approval_gate_reconciliation_required === true &&
      summary.manual_publication_boundary_reconciliation_required === true &&
      summary.five_window_monitoring_reconciliation_required === true &&
      summary.authorization_snapshot_reconciliation_required === true &&
      summary.central_audit_contract_reconciliation_required === true &&
      summary.performance_evidence_reconciliation_required === true &&
      summary.privacy_boundary_reconciliation_required === true &&
      summary.fixture_isolation_reconciliation_required === true &&
      summary.feature_flag_reconciliation_required === true,
    no_live_or_production:
      summary.production_operation_enabled === false &&
      summary.external_network_access_enabled === false &&
      summary.live_apify_execution_enabled === false &&
      summary.live_s2d_execution_enabled === false &&
      summary.social_platform_api_enabled === false &&
      summary.platform_authentication_enabled === false &&
      summary.automated_ingestion_enabled === false &&
      summary.automated_approval_enabled === false &&
      summary.automated_publication_enabled === false &&
      summary.production_response_case_generation_enabled === false &&
      summary.production_content_generation_enabled === false &&
      summary.production_analytics_ingestion_enabled === false,
    no_mutation:
      summary.browser_storage_modified === false &&
      summary.central_repository_modified === false &&
      summary.production_records_modified === false &&
      summary.central_audit_append_performed === false,
    no_targeting_or_prediction:
      summary.voter_preference_inference_enabled === false &&
      summary.election_prediction_enabled === false &&
      summary.individual_targeting_enabled === false &&
      summary.demographic_targeting_enabled === false &&
      summary.voter_targeting_enabled === false &&
      summary.locality_persuasion_ranking_enabled === false &&
      summary.individual_persuasion_optimisation_enabled === false &&
      summary.political_persuasion_optimisation_enabled === false &&
      summary.engagement_optimisation_enabled === false,
    fixture_isolation:
      summary.validation_fixture_separated === true &&
      summary.p999_fixture_separated === true &&
      summary.production_totals_exclude_validation_fixtures === true,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Manifest check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    dimension_order: [...PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER],
    check_statuses: { ...PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES },
    final_statuses: { ...PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES },
    severities: { ...PIP_360_PIPELINE_RECONCILIATION_SEVERITIES },
    discrepancy_types: { ...PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES },
    test_modes: { ...PIP_360_PIPELINE_RECONCILIATION_TEST_MODES },
    reason_codes: { ...PIP_360_PIPELINE_RECONCILIATION_REASON_CODES },
    summary: { ...summary },
  });
}

export function validatePip360PipelineReconciliationCheck(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_PIPELINE_RECONCILIATION_CHECK_SCHEMA,
    id_present:
      String(safe.reconciliation_check_id ?? "").trim().length > 0,
    test_mode: Object.values(PIP_360_PIPELINE_RECONCILIATION_TEST_MODES).includes(
      String(safe.test_mode ?? "")
    ),
    dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER.includes(
      String(safe.dimension ?? "")
    ),
    key_present: String(safe.check_key ?? "").trim().length > 0,
    description_present:
      String(safe.check_description ?? "").trim().length > 0,
    status: Object.values(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES).includes(
      String(safe.status ?? "")
    ),
    severity: Object.values(PIP_360_PIPELINE_RECONCILIATION_SEVERITIES).includes(
      String(safe.severity ?? "")
    ),
    discrepancy_type:
      safe.discrepancy_type === null ||
      Object.values(PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES).includes(
        String(safe.discrepancy_type ?? "")
      ),
    arrays:
      Array.isArray(safe.reason_codes) &&
      Array.isArray(safe.source_stage_names) &&
      Array.isArray(safe.source_stage_receipt_ids) &&
      Array.isArray(safe.source_artifact_ids) &&
      Array.isArray(safe.source_evidence_ids) &&
      Array.isArray(safe.source_fingerprints) &&
      Array.isArray(safe.validation_errors),
    timestamp: normalizeIso(safe.reconciliation_timestamp) !== null,
    safety_flags:
      safe.validation_fixture === true &&
      safe.production_operation_performed === false &&
      safe.external_network_request_performed === false &&
      safe.browser_storage_modified === false &&
      safe.central_repository_modified === false,
    fingerprint_present:
      String(safe.check_fingerprint ?? "").trim().length >= 12,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Reconciliation check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    reason_codes: unique(safe.reason_codes),
    source_stage_names: unique(safe.source_stage_names),
    source_stage_receipt_ids: unique(safe.source_stage_receipt_ids),
    source_artifact_ids: unique(safe.source_artifact_ids),
    source_evidence_ids: unique(safe.source_evidence_ids),
    source_fingerprints: unique(safe.source_fingerprints),
    validation_errors: toArray(safe.validation_errors).map((entry) => String(entry)),
  });
}

export function validatePip360PipelineReconciliationDimension(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_PIPELINE_RECONCILIATION_DIMENSION_SCHEMA,
    id_present:
      String(safe.reconciliation_dimension_id ?? "").trim().length > 0,
    dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER.includes(
      String(safe.dimension ?? "")
    ),
    status: Object.values(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES).includes(
      String(safe.status ?? "")
    ),
    checks_array: Array.isArray(safe.reconciliation_checks),
    count_present: Number.isFinite(Number(safe.check_count ?? NaN)),
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Reconciliation dimension failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360PipelineReconciliationReport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_PIPELINE_RECONCILIATION_REPORT_SCHEMA,
    id_present:
      String(safe.reconciliation_report_id ?? "").trim().length > 0,
    test_mode: Object.values(PIP_360_PIPELINE_RECONCILIATION_TEST_MODES).includes(
      String(safe.test_mode ?? "")
    ),
    source_collection:
      String(safe.source_pipeline_collection_id ?? "").trim().length > 0 &&
      String(safe.source_pipeline_collection_fingerprint ?? "").trim().length > 0,
    dimension_order:
      JSON.stringify(toArray(safe.dimension_order)) ===
      JSON.stringify(PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER),
    dimensions: Array.isArray(safe.dimensions),
    reconciliation_checks: Array.isArray(safe.reconciliation_checks),
    counters:
      Number.isFinite(Number(safe.total_check_count ?? NaN)) &&
      Number.isFinite(Number(safe.production_operation_count ?? NaN)) &&
      Number.isFinite(Number(safe.external_network_request_count ?? NaN)) &&
      Number.isFinite(Number(safe.browser_storage_mutation_count ?? NaN)) &&
      Number.isFinite(Number(safe.central_repository_mutation_count ?? NaN)) &&
      Number.isFinite(Number(safe.central_audit_append_count ?? NaN)),
    zero_mutation:
      Number(safe.production_operation_count ?? -1) === 0 &&
      Number(safe.external_network_request_count ?? -1) === 0 &&
      Number(safe.browser_storage_mutation_count ?? -1) === 0 &&
      Number(safe.central_repository_mutation_count ?? -1) === 0 &&
      Number(safe.central_audit_append_count ?? -1) === 0,
    final_status: Object.values(PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES).includes(
      String(safe.final_status ?? "")
    ),
    timestamp: normalizeIso(safe.reconciliation_timestamp) !== null,
    fixture_only:
      safe.validation_fixture === true &&
      safe.fixtures_excluded_from_production_totals === true,
    fingerprint_present:
      String(safe.report_fingerprint ?? "").trim().length >= 12,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Reconciliation report failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360PipelineReconciliationCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_PIPELINE_RECONCILIATION_COLLECTION_SCHEMA,
    reports: Array.isArray(safe.reports),
    mode_count:
      toArray(safe.reports).length ===
      Object.values(PIP_360_PIPELINE_RECONCILIATION_TEST_MODES).length,
    validation_fixture: safe.validation_fixture === true,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Reconciliation collection failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    reports: toArray(safe.reports),
  });
}

export function sanitizePip360PipelineReconciliationExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_360_PIPELINE_RECONCILIATION_EXPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? "2027-01-03T00:00:00.000Z",
    manifest: isPlainObject(safe.manifest)
      ? decycle(safe.manifest)
      : buildPip360FullPipelineReconciliationContractManifest(),
    reports: toArray(safe.reports).map((entry) => decycle(entry)),
    summary: decycle(isPlainObject(safe.summary) ? safe.summary : {}),
    validation_fixture: true,
    read_only_reconciliation_only: true,
  };
}
