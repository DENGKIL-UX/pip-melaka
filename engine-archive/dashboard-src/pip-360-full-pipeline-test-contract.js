export const PIP_360_FULL_PIPELINE_TEST_CONTRACT_SCHEMA =
  "pip.360.full-pipeline-test.contract.v1";
export const PIP_360_FULL_PIPELINE_TEST_STAGE_RECEIPT_SCHEMA =
  "pip.360.full-pipeline-test.stage-receipt.v1";
export const PIP_360_FULL_PIPELINE_TEST_LINEAGE_SCHEMA =
  "pip.360.full-pipeline-test.lineage.v1";
export const PIP_360_FULL_PIPELINE_TEST_REPORT_SCHEMA =
  "pip.360.full-pipeline-test.report.v1";
export const PIP_360_FULL_PIPELINE_TEST_COLLECTION_SCHEMA =
  "pip.360.full-pipeline-test.collection.v1";
export const PIP_360_FULL_PIPELINE_TEST_EXPORT_SCHEMA =
  "pip.360.full-pipeline-test.export.v1";

export const PIP_360_FULL_PIPELINE_STAGES = Object.freeze({
  APIFY_DATASET_RECEIPT: "APIFY_DATASET_RECEIPT",
  INGESTION: "INGESTION",
  VALIDATION: "VALIDATION",
  S2D_CLASSIFICATION: "S2D_CLASSIFICATION",
  SENTIMENT_SNAPSHOT: "SENTIMENT_SNAPSHOT",
  PIP_GEOGRAPHY_FUSION: "PIP_GEOGRAPHY_FUSION",
  RESPONSE_CASE: "RESPONSE_CASE",
  HUMAN_APPROVAL: "HUMAN_APPROVAL",
  CONTENT_BRIEF: "CONTENT_BRIEF",
  PUBLICATION_RECORD: "PUBLICATION_RECORD",
  OUTCOME_MONITORING: "OUTCOME_MONITORING",
});

export const PIP_360_FULL_PIPELINE_STAGE_ORDER = Object.freeze([
  PIP_360_FULL_PIPELINE_STAGES.APIFY_DATASET_RECEIPT,
  PIP_360_FULL_PIPELINE_STAGES.INGESTION,
  PIP_360_FULL_PIPELINE_STAGES.VALIDATION,
  PIP_360_FULL_PIPELINE_STAGES.S2D_CLASSIFICATION,
  PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT,
  PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION,
  PIP_360_FULL_PIPELINE_STAGES.RESPONSE_CASE,
  PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL,
  PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF,
  PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD,
  PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING,
]);

export const PIP_360_FULL_PIPELINE_STAGE_STATUSES = Object.freeze({
  NOT_RUN: "NOT_RUN",
  PASSED: "PASSED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  MANUAL_ACTION_REQUIRED: "MANUAL_ACTION_REQUIRED",
  SKIPPED: "SKIPPED",
});

export const PIP_360_FULL_PIPELINE_FINAL_STATUSES = Object.freeze({
  PASSED: "PASSED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  PARTIAL: "PARTIAL",
});

export const PIP_360_FULL_PIPELINE_TEST_MODES = Object.freeze({
  COMPLETE_SANITIZED_FIXTURE: "COMPLETE_SANITIZED_FIXTURE",
  MISSING_HUMAN_APPROVAL: "MISSING_HUMAN_APPROVAL",
  INVALID_INGESTION: "INVALID_INGESTION",
  DUPLICATE_SOURCE_SIGNAL: "DUPLICATE_SOURCE_SIGNAL",
  INVALID_LINEAGE: "INVALID_LINEAGE",
});

export const PIP_360_FULL_PIPELINE_BLOCK_REASONS = Object.freeze({
  PREVIOUS_STAGE_FAILED: "PREVIOUS_STAGE_FAILED",
  PREVIOUS_STAGE_BLOCKED: "PREVIOUS_STAGE_BLOCKED",
  HUMAN_APPROVAL_REQUIRED: "HUMAN_APPROVAL_REQUIRED",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_LINEAGE: "INVALID_LINEAGE",
  PROHIBITED_OPERATION: "PROHIBITED_OPERATION",
});

export const PIP_360_FULL_PIPELINE_REASON_CODES = Object.freeze({
  API_TOKEN_PRESENT: "API_TOKEN_PRESENT",
  RAW_CONTENT_PRESENT: "RAW_CONTENT_PRESENT",
  ACCOUNT_IDENTITY_PRESENT: "ACCOUNT_IDENTITY_PRESENT",
  VALIDATION_FIXTURE_FALSE: "VALIDATION_FIXTURE_FALSE",
  NEGATIVE_RECORD_COUNT: "NEGATIVE_RECORD_COUNT",
  MISSING_DATASET_DIGEST: "MISSING_DATASET_DIGEST",
  DUPLICATE_SIGNAL_REFERENCE_ID: "DUPLICATE_SIGNAL_REFERENCE_ID",
  DUPLICATE_SOURCE_TIMESTAMP: "DUPLICATE_SOURCE_TIMESTAMP",
  DUPLICATE_REMOVAL_REASON_RECORDED: "DUPLICATE_REMOVAL_REASON_RECORDED",
  PROHIBITED_FIELD_PRESENT: "PROHIBITED_FIELD_PRESENT",
  HUMAN_APPROVAL_MISSING: "HUMAN_APPROVAL_MISSING",
  LINEAGE_FINGERPRINT_MISMATCH: "LINEAGE_FINGERPRINT_MISMATCH",
  DOWNSTREAM_EXECUTION_BLOCKED: "DOWNSTREAM_EXECUTION_BLOCKED",
  SENTIMENT_TOTAL_MISMATCH: "SENTIMENT_TOTAL_MISMATCH",
  RECOMMENDATION_NOT_ALLOWLISTED: "RECOMMENDATION_NOT_ALLOWLISTED",
  CAUSAL_ATTRIBUTION_NOT_PERMITTED: "CAUSAL_ATTRIBUTION_NOT_PERMITTED",
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

export function buildPip360FullPipelineTestContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_360_FULL_PIPELINE_TEST_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? "2027-01-01T00:00:00.000Z",
    stage_receipt_schema: PIP_360_FULL_PIPELINE_TEST_STAGE_RECEIPT_SCHEMA,
    lineage_schema: PIP_360_FULL_PIPELINE_TEST_LINEAGE_SCHEMA,
    report_schema: PIP_360_FULL_PIPELINE_TEST_REPORT_SCHEMA,
    collection_schema: PIP_360_FULL_PIPELINE_TEST_COLLECTION_SCHEMA,
    export_schema: PIP_360_FULL_PIPELINE_TEST_EXPORT_SCHEMA,
    stages: { ...PIP_360_FULL_PIPELINE_STAGES },
    stage_order: [...PIP_360_FULL_PIPELINE_STAGE_ORDER],
    stage_statuses: { ...PIP_360_FULL_PIPELINE_STAGE_STATUSES },
    final_statuses: { ...PIP_360_FULL_PIPELINE_FINAL_STATUSES },
    test_modes: { ...PIP_360_FULL_PIPELINE_TEST_MODES },
    block_reasons: { ...PIP_360_FULL_PIPELINE_BLOCK_REASONS },
    reason_codes: { ...PIP_360_FULL_PIPELINE_REASON_CODES },
    summary: {
      full_pipeline_test_enabled: true,
      acceptance_harness_only: true,
      sanitized_validation_fixtures_only: true,
      exact_stage_order_required: true,
      eleven_pipeline_stages_required: true,
      stage_input_output_lineage_required: true,
      deterministic_stage_identifiers_required: true,
      deterministic_stage_fingerprints_required: true,
      explicit_execution_timestamp_required: true,
      fail_closed_stage_propagation_required: true,
      downstream_execution_after_failure_enabled: false,
      downstream_execution_after_block_enabled: false,
      human_approval_required: true,
      manual_publication_record_required: true,
      verified_external_publication_fixture_required: true,
      five_window_outcome_monitoring_required: true,
      fixture_response_case_generation_enabled: true,
      production_response_case_generation_enabled: false,
      fixture_content_brief_generation_enabled: true,
      production_content_generation_enabled: false,
      fixture_publication_record_generation_enabled: true,
      production_publication_operation_enabled: false,
      fixture_outcome_monitoring_enabled: true,
      production_analytics_ingestion_enabled: false,
      live_apify_execution_enabled: false,
      apify_token_input_enabled: false,
      apify_api_request_enabled: false,
      live_s2d_execution_enabled: false,
      external_s2d_connection_enabled: false,
      social_platform_api_enabled: false,
      platform_authentication_enabled: false,
      publication_scheduling_enabled: false,
      automated_publication_enabled: false,
      automated_approval_enabled: false,
      automatic_ingestion_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
      external_network_access_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      production_records_modified: false,
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

export function validatePip360FullPipelineTestContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema: safe.schema === PIP_360_FULL_PIPELINE_TEST_CONTRACT_SCHEMA,
    stage_receipt_schema:
      safe.stage_receipt_schema ===
      PIP_360_FULL_PIPELINE_TEST_STAGE_RECEIPT_SCHEMA,
    lineage_schema: safe.lineage_schema === PIP_360_FULL_PIPELINE_TEST_LINEAGE_SCHEMA,
    report_schema: safe.report_schema === PIP_360_FULL_PIPELINE_TEST_REPORT_SCHEMA,
    collection_schema:
      safe.collection_schema === PIP_360_FULL_PIPELINE_TEST_COLLECTION_SCHEMA,
    export_schema: safe.export_schema === PIP_360_FULL_PIPELINE_TEST_EXPORT_SCHEMA,
    stage_count: Object.values(safe.stages ?? {}).length === 11,
    stage_order:
      JSON.stringify(toArray(safe.stage_order)) ===
      JSON.stringify(PIP_360_FULL_PIPELINE_STAGE_ORDER),
    stage_statuses:
      JSON.stringify(Object.values(safe.stage_statuses ?? {}).sort()) ===
      JSON.stringify(Object.values(PIP_360_FULL_PIPELINE_STAGE_STATUSES).sort()),
    final_statuses:
      JSON.stringify(Object.values(safe.final_statuses ?? {}).sort()) ===
      JSON.stringify(Object.values(PIP_360_FULL_PIPELINE_FINAL_STATUSES).sort()),
    test_modes:
      JSON.stringify(Object.values(safe.test_modes ?? {}).sort()) ===
      JSON.stringify(Object.values(PIP_360_FULL_PIPELINE_TEST_MODES).sort()),
    fixture_only:
      summary.acceptance_harness_only === true &&
      summary.sanitized_validation_fixtures_only === true &&
      summary.validation_fixture_separated === true,
    deterministic_and_lineage:
      summary.exact_stage_order_required === true &&
      summary.stage_input_output_lineage_required === true &&
      summary.deterministic_stage_identifiers_required === true &&
      summary.deterministic_stage_fingerprints_required === true,
    fail_closed:
      summary.fail_closed_stage_propagation_required === true &&
      summary.downstream_execution_after_failure_enabled === false &&
      summary.downstream_execution_after_block_enabled === false,
    human_gate:
      summary.human_approval_required === true &&
      summary.manual_publication_record_required === true,
    no_live_operations:
      summary.live_apify_execution_enabled === false &&
      summary.apify_api_request_enabled === false &&
      summary.live_s2d_execution_enabled === false &&
      summary.social_platform_api_enabled === false &&
      summary.external_network_access_enabled === false,
    no_automation:
      summary.automatic_ingestion_enabled === false &&
      summary.automated_approval_enabled === false &&
      summary.automated_publication_enabled === false &&
      summary.recurring_timer_enabled === false,
    no_targeting_or_prediction:
      summary.voter_preference_inference_enabled === false &&
      summary.election_prediction_enabled === false &&
      summary.voter_targeting_enabled === false &&
      summary.demographic_targeting_enabled === false &&
      summary.individual_persuasion_optimisation_enabled === false &&
      summary.political_persuasion_optimisation_enabled === false &&
      summary.engagement_optimisation_enabled === false,
    no_mutation:
      summary.browser_storage_modified === false &&
      summary.central_repository_modified === false &&
      summary.production_records_modified === false,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Manifest check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    stage_order: [...PIP_360_FULL_PIPELINE_STAGE_ORDER],
    stage_statuses: { ...PIP_360_FULL_PIPELINE_STAGE_STATUSES },
    final_statuses: { ...PIP_360_FULL_PIPELINE_FINAL_STATUSES },
    test_modes: { ...PIP_360_FULL_PIPELINE_TEST_MODES },
    block_reasons: { ...PIP_360_FULL_PIPELINE_BLOCK_REASONS },
    reason_codes: { ...PIP_360_FULL_PIPELINE_REASON_CODES },
    summary: {
      ...summary,
      acceptance_harness_only: summary.acceptance_harness_only === true,
      sanitized_validation_fixtures_only:
        summary.sanitized_validation_fixtures_only === true,
    },
  });
}

export function validatePip360FullPipelineStageReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const statuses = Object.values(PIP_360_FULL_PIPELINE_STAGE_STATUSES);

  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_FULL_PIPELINE_TEST_STAGE_RECEIPT_SCHEMA,
    stage: PIP_360_FULL_PIPELINE_STAGE_ORDER.includes(safe.stage),
    stage_index: Number.isInteger(safe.stage_index) && safe.stage_index >= 1,
    status: statuses.includes(String(safe.status ?? "")),
    test_mode: Object.values(PIP_360_FULL_PIPELINE_TEST_MODES).includes(
      String(safe.test_mode ?? "")
    ),
    arrays_present:
      Array.isArray(safe.input_artifact_ids) &&
      Array.isArray(safe.input_fingerprints) &&
      Array.isArray(safe.output_artifact_ids) &&
      Array.isArray(safe.output_fingerprints) &&
      Array.isArray(safe.blocked_reason_codes) &&
      Array.isArray(safe.validation_errors),
    counts_present:
      Number.isFinite(Number(safe.source_record_count ?? 0)) &&
      Number.isFinite(Number(safe.accepted_record_count ?? 0)) &&
      Number.isFinite(Number(safe.rejected_record_count ?? 0)) &&
      Number.isFinite(Number(safe.duplicate_record_count ?? 0)),
    required_fixture_flags:
      safe.validation_fixture === true &&
      safe.production_operation_performed === false &&
      safe.external_network_request_performed === false &&
      safe.browser_storage_modified === false &&
      safe.central_repository_modified === false,
    execution_timestamp: normalizeIso(safe.execution_timestamp) !== null,
    fingerprint_present:
      String(safe.receipt_fingerprint ?? "").trim().length >= 12,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Stage receipt check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    input_artifact_ids: unique(safe.input_artifact_ids),
    input_fingerprints: unique(safe.input_fingerprints),
    output_artifact_ids: unique(safe.output_artifact_ids),
    output_fingerprints: unique(safe.output_fingerprints),
    blocked_reason_codes: unique(safe.blocked_reason_codes),
    validation_errors: toArray(safe.validation_errors).map((item) => String(item)),
    execution_timestamp: normalizeIso(safe.execution_timestamp),
  });
}

export function validatePip360FullPipelineLineage(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const statuses = ["VERIFIED", "INVALID", "MISSING", "BLOCKED"];
  const checks = {
    lineage_edge_id: String(safe.lineage_edge_id ?? "").trim().length > 0,
    from_stage: PIP_360_FULL_PIPELINE_STAGE_ORDER.includes(safe.from_stage),
    to_stage: PIP_360_FULL_PIPELINE_STAGE_ORDER.includes(safe.to_stage),
    ids_present:
      String(safe.from_stage_receipt_id ?? "").trim().length > 0 &&
      String(safe.to_stage_receipt_id ?? "").trim().length > 0 &&
      String(safe.from_output_artifact_id ?? "").trim().length > 0 &&
      String(safe.to_input_artifact_id ?? "").trim().length > 0,
    fingerprints_present:
      String(safe.from_output_fingerprint ?? "").trim().length > 0 &&
      String(safe.to_input_fingerprint ?? "").trim().length > 0,
    lineage_status: statuses.includes(String(safe.lineage_status ?? "")),
    validation_errors: Array.isArray(safe.validation_errors),
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Lineage check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    validation_errors: toArray(safe.validation_errors).map((item) => String(item)),
  });
}

export function validatePip360FullPipelineTestReport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_FULL_PIPELINE_TEST_REPORT_SCHEMA,
    report_id: String(safe.pipeline_test_report_id ?? "").trim().length > 0,
    test_mode: Object.values(PIP_360_FULL_PIPELINE_TEST_MODES).includes(
      String(safe.test_mode ?? "")
    ),
    stage_order:
      JSON.stringify(toArray(safe.stage_order)) ===
      JSON.stringify(PIP_360_FULL_PIPELINE_STAGE_ORDER),
    stage_receipts: Array.isArray(safe.stage_receipts),
    lineage_ledger: Array.isArray(safe.lineage_ledger),
    counters:
      Number.isFinite(Number(safe.production_operation_count ?? 0)) &&
      Number.isFinite(Number(safe.external_network_request_count ?? 0)) &&
      Number.isFinite(Number(safe.browser_storage_mutation_count ?? 0)) &&
      Number.isFinite(Number(safe.central_repository_mutation_count ?? 0)),
    zero_mutation:
      Number(safe.production_operation_count ?? -1) === 0 &&
      Number(safe.external_network_request_count ?? -1) === 0 &&
      Number(safe.browser_storage_mutation_count ?? -1) === 0 &&
      Number(safe.central_repository_mutation_count ?? -1) === 0,
    fixtures_only:
      safe.validation_fixture === true &&
      safe.fixtures_excluded_from_production_totals === true,
    final_status: Object.values(PIP_360_FULL_PIPELINE_FINAL_STATUSES).includes(
      String(safe.final_status ?? "")
    ),
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Report check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FullPipelineTestCollection(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const reports = toArray(safe.reports);
  const checks = {
    schema:
      safe.schema === undefined ||
      safe.schema === PIP_360_FULL_PIPELINE_TEST_COLLECTION_SCHEMA,
    reports: reports.length >= 1,
    report_modes_covered:
      reports.length === Object.values(PIP_360_FULL_PIPELINE_TEST_MODES).length,
    validation_fixture: safe.validation_fixture === true,
  };

  const errors = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => `Collection check failed: ${key}`);

  return envelope(errors.length === 0, checks, errors, {
    ...safe,
    reports,
  });
}

export function sanitizePip360FullPipelineTestExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    schema: PIP_360_FULL_PIPELINE_TEST_EXPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? "2027-01-01T00:00:00.000Z",
    manifest: isPlainObject(safe.manifest)
      ? safe.manifest
      : buildPip360FullPipelineTestContractManifest(),
    reports: toArray(safe.reports).map((report) => decycle(report)),
    summary: decycle(isPlainObject(safe.summary) ? safe.summary : {}),
    validation_fixture: true,
    acceptance_harness_only: true,
  };
}
