import {
  PIP_360_FULL_PIPELINE_STAGE_ORDER,
  PIP_360_FULL_PIPELINE_STAGES,
  PIP_360_FULL_PIPELINE_STAGE_STATUSES,
  buildPip360FullPipelineTestContractManifest,
} from "./pip-360-full-pipeline-test-contract.js";
import {
  runPip360FullPipelineTestCollection,
} from "./pip-360-full-pipeline-test.js";
import {
  validatePipDashboardPerformanceReconciliationReport,
} from "./pip-dashboard-performance-reconciliation.js";
import {
  PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES,
  PIP_360_PIPELINE_RECONCILIATION_CONTRACT_SCHEMA,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER,
  PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS,
  PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES,
  PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES,
  PIP_360_PIPELINE_RECONCILIATION_REASON_CODES,
  PIP_360_PIPELINE_RECONCILIATION_REPORT_SCHEMA,
  PIP_360_PIPELINE_RECONCILIATION_SEVERITIES,
  PIP_360_PIPELINE_RECONCILIATION_TEST_MODES,
  buildPip360FullPipelineReconciliationContractManifest,
  sanitizePip360PipelineReconciliationExport as sanitizeContractExport,
  validatePip360FullPipelineReconciliationContractManifest,
  validatePip360PipelineReconciliationCheck,
  validatePip360PipelineReconciliationCollection,
  validatePip360PipelineReconciliationDimension,
  validatePip360PipelineReconciliationReport,
} from "./pip-360-full-pipeline-reconciliation-contract.js";

const MONITORING_WINDOWS = Object.freeze([
  "PRE_PUBLICATION_24H",
  "POST_PUBLICATION_6H",
  "POST_PUBLICATION_12H",
  "POST_PUBLICATION_24H",
  "POST_PUBLICATION_72H",
]);

const MONITORING_WINDOW_LABELS = Object.freeze([
  "PRE_PUBLICATION_BASELINE",
  "POST_6_HOURS",
  "POST_12_HOURS",
  "POST_24_HOURS",
  "POST_72_HOURS",
]);

const PROHIBITED_FEATURE_FLAGS = Object.freeze([
  "live_apify_execution_enabled",
  "live_s2d_execution_enabled",
  "external_network_access_enabled",
  "automatic_ingestion_enabled",
  "automated_approval_enabled",
  "automated_publication_enabled",
  "publication_scheduling_enabled",
  "social_platform_api_enabled",
  "platform_authentication_enabled",
  "production_response_case_generation_enabled",
  "production_content_generation_enabled",
  "production_analytics_ingestion_enabled",
  "voter_preference_inference_enabled",
  "political_affiliation_inference_enabled",
  "election_prediction_enabled",
  "individual_targeting_enabled",
  "demographic_targeting_enabled",
  "voter_targeting_enabled",
  "locality_persuasion_ranking_enabled",
  "engagement_optimisation_enabled",
  "political_persuasion_optimisation_enabled",
  "individual_persuasion_optimisation_enabled",
  "causal_attribution_enabled",
  "automatic_remediation_enabled",
  "browser_storage_modified",
  "central_repository_modified",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function ensureIsoTimestamp(value, fallback) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? String(value) : fallback;
}

function unique(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function stableStringify(value) {
  const seen = new Set();
  const walk = (entry, depth = 0) => {
    if (depth > 7) return '"[DepthLimit]"';
    if (Array.isArray(entry)) {
      return `[${entry.map((item) => walk(item, depth + 1)).join(",")}]`;
    }
    if (!isPlainObject(entry)) {
      return JSON.stringify(entry);
    }
    if (seen.has(entry)) {
      return '"[Circular]"';
    }
    seen.add(entry);
    return `{${Object.keys(entry)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${walk(entry[key], depth + 1)}`)
      .join(",")}}`;
  };
  return walk(value, 0);
}

function deterministicHash(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fp-${(hash >>> 0).toString(16).padStart(8, "0")}${(text.length >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function deterministicId(prefix, parts) {
  return `${prefix}-${deterministicHash(parts).replace("fp-", "")}`;
}

function deepClone(value) {
  const seen = new Map();

  const clone = (entry, depth = 0) => {
    if (depth > 8) return "[DepthLimit]";
    if (entry === null || entry === undefined) return entry;
    if (typeof entry !== "object") return entry;
    if (seen.has(entry)) return seen.get(entry);

    if (Array.isArray(entry)) {
      const output = [];
      seen.set(entry, output);
      entry.forEach((item) => {
        output.push(clone(item, depth + 1));
      });
      return output;
    }

    const output = {};
    seen.set(entry, output);
    Object.keys(entry).forEach((key) => {
      if (key === "normalized") return;
      output[key] = clone(entry[key], depth + 1);
    });
    return output;
  };

  return clone(value, 0);
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function baseSafetyFlags() {
  return {
    validation_fixture: true,
    production_operation_performed: false,
    external_network_request_performed: false,
    browser_storage_modified: false,
    central_repository_modified: false,
  };
}

function compactValidationEnvelope(validation) {
  return {
    valid: validation?.valid === true,
    checks: isPlainObject(validation?.checks) ? validation.checks : {},
    errors: toArray(validation?.errors).map((entry) => String(entry)),
    summary: isPlainObject(validation?.summary) ? validation.summary : {},
  };
}

function hasProhibitedPrivacyField(value, visited = new Set()) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") {
    if (typeof value === "string") {
      const safe = value.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) return true;
      if (/bearer\s+[a-z0-9._-]+/i.test(safe)) return true;
      if (/cookie=|set-cookie|csrf[_-]?token|authorization:\s*bearer/i.test(safe)) return true;
      if (/https?:\/\//i.test(safe) && !/example\.invalid/i.test(safe)) return true;
    }
    return false;
  }
  if (visited.has(value)) return false;
  visited.add(value);

  if (Array.isArray(value)) {
    return value.some((entry) => hasProhibitedPrivacyField(entry, visited));
  }

  return Object.values(value).some((entry) => hasProhibitedPrivacyField(entry, visited));
}

function getReportByPipelineMode(reports, mode) {
  return toArray(reports).find((entry) => entry.test_mode === mode) ?? null;
}

function getStage(report, stageName) {
  return toArray(report?.stage_receipts).find((entry) => entry.stage === stageName) ?? null;
}

function sumObjectValues(record = {}) {
  return Object.values(isPlainObject(record) ? record : {}).reduce((sum, value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
}

function buildCheckFingerprint(input) {
  return deterministicHash({
    test_mode: input.test_mode,
    dimension: input.dimension,
    check_key: input.check_key,
    expected_value: input.expected_value,
    observed_value: input.observed_value,
    variance_value: input.variance_value,
    source_stage_receipt_ids: input.source_stage_receipt_ids,
    source_fingerprints: input.source_fingerprints,
  });
}

export function buildPip360PipelineReconciliationCheck(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const check = {
    schema: undefined,
    reconciliation_check_id:
      safe.reconciliation_check_id ??
      deterministicId("recon-check", {
        testMode: safe.test_mode,
        dimension: safe.dimension,
        key: safe.check_key,
        timestamp: safe.reconciliation_timestamp,
      }),
    test_mode:
      safe.test_mode ?? PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.BASELINE_RECONCILED,
    source_pipeline_report_id: String(safe.source_pipeline_report_id ?? ""),
    dimension: safe.dimension,
    check_key: String(safe.check_key ?? ""),
    check_description: String(safe.check_description ?? ""),
    expected_value:
      safe.expected_value === undefined ? null : safe.expected_value,
    observed_value:
      safe.observed_value === undefined ? null : safe.observed_value,
    variance_value:
      safe.variance_value === undefined ? null : safe.variance_value,
    status: safe.status,
    severity: safe.severity,
    discrepancy_type:
      safe.discrepancy_type === undefined ? null : safe.discrepancy_type,
    reason_codes: unique(safe.reason_codes),
    source_stage_names: unique(safe.source_stage_names),
    source_stage_receipt_ids: unique(safe.source_stage_receipt_ids),
    source_artifact_ids: unique(safe.source_artifact_ids),
    source_evidence_ids: unique(safe.source_evidence_ids),
    source_fingerprints: unique(safe.source_fingerprints),
    validation_errors: toArray(safe.validation_errors).map((entry) => String(entry)),
    reconciliation_timestamp: safe.reconciliation_timestamp,
    ...baseSafetyFlags(),
  };

  check.check_fingerprint = buildCheckFingerprint(check);
  check.validation = compactValidationEnvelope(
    validatePip360PipelineReconciliationCheck(check)
  );
  return check;
}

function createCheck({
  testMode,
  sourcePipelineReportId,
  dimension,
  checkKey,
  description,
  expectedValue,
  observedValue,
  status,
  severity,
  discrepancyType = null,
  reasonCodes = [],
  sourceStageNames = [],
  sourceStageReceiptIds = [],
  sourceArtifactIds = [],
  sourceEvidenceIds = [],
  sourceFingerprints = [],
  validationErrors = [],
  reconciliationTimestamp,
  varianceValue,
}) {
  return buildPip360PipelineReconciliationCheck({
    test_mode: testMode,
    source_pipeline_report_id: sourcePipelineReportId,
    dimension,
    check_key: checkKey,
    check_description: description,
    expected_value: expectedValue,
    observed_value: observedValue,
    variance_value: varianceValue,
    status,
    severity,
    discrepancy_type: discrepancyType,
    reason_codes: reasonCodes,
    source_stage_names: sourceStageNames,
    source_stage_receipt_ids: sourceStageReceiptIds,
    source_artifact_ids: sourceArtifactIds,
    source_evidence_ids: sourceEvidenceIds,
    source_fingerprints: sourceFingerprints,
    validation_errors: validationErrors,
    reconciliation_timestamp: reconciliationTimestamp,
  });
}

export function buildPip360PipelineReconciliationDimension({
  testMode,
  dimension,
  checks = [],
  reconciliationTimestamp,
} = {}) {
  const safeChecks = toArray(checks);
  const status = safeChecks.some((entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED)
    ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED
    : safeChecks.some((entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED)
    ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED
    : safeChecks.some((entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.REVIEW_REQUIRED)
    ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.REVIEW_REQUIRED
    : safeChecks.length === 0
    ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.NOT_APPLICABLE
    : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED;

  const dimensionRecord = {
    schema: undefined,
    reconciliation_dimension_id: deterministicId("recon-dimension", {
      testMode,
      dimension,
      reconciliationTimestamp,
    }),
    test_mode: testMode,
    dimension,
    status,
    check_count: safeChecks.length,
    reconciliation_checks: safeChecks,
    reconciliation_timestamp: reconciliationTimestamp,
    validation_fixture: true,
  };

  dimensionRecord.validation = compactValidationEnvelope(
    validatePip360PipelineReconciliationDimension(dimensionRecord)
  );
  return dimensionRecord;
}

function findLineageEdge(report, fromStage, toStage) {
  return toArray(report?.lineage_ledger).find(
    (edge) => edge.from_stage === fromStage && edge.to_stage === toStage
  ) ?? null;
}

function sanitizeAuthorizationContext(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    role: sanitizeText(safe.role, 64).toUpperCase(),
    permission_count: Number.isFinite(Number(safe.permission_count))
      ? Number(safe.permission_count)
      : Array.isArray(safe.permissions)
      ? safe.permissions.length
      : null,
    authorization_contract_valid: safe.authorization_contract_valid === true,
    authorization_snapshot_valid: safe.authorization_snapshot_valid === true,
    authorization_enforced: safe.authorization_enforced === true,
  };
}

function sanitizeAuditContext(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    central_audit_contract_valid: safe.central_audit_contract_valid === true,
  };
}

function sanitizeFeatureFlagContext(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  return safe;
}

function buildSourceCollectionFingerprint(collection) {
  return deterministicHash({
    collection_id: collection?.collection_id ?? null,
    report_ids: toArray(collection?.reports).map((entry) => entry.pipeline_test_report_id),
    final_statuses: toArray(collection?.reports).map((entry) => entry.final_status),
  });
}

function deriveFinalStatusFromChecks(checks) {
  const safeChecks = toArray(checks);
  if (safeChecks.some((entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED)) {
    return PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.BLOCKED;
  }
  if (safeChecks.some((entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED)) {
    return PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.NOT_RECONCILED;
  }
  if (safeChecks.some((entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.REVIEW_REQUIRED)) {
    return PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.PARTIALLY_RECONCILED;
  }
  return PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.RECONCILED;
}

function buildSchemaAndStageChecks({
  testMode,
  reports,
  reconciliationTimestamp,
}) {
  const checks = [];
  const expectedStatuses = {
    COMPLETE_SANITIZED_FIXTURE: "PASSED",
    MISSING_HUMAN_APPROVAL: "BLOCKED",
    INVALID_INGESTION: "FAILED",
    DUPLICATE_SOURCE_SIGNAL: "PASSED",
    INVALID_LINEAGE: "FAILED",
  };

  toArray(reports).forEach((report) => {
    const reportId = report?.pipeline_test_report_id ?? "unknown";
    const reportMode = String(report?.test_mode ?? "UNKNOWN");
    const stageReceipts = toArray(report?.stage_receipts);
    const lineageLedger = toArray(report?.lineage_ledger);
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SCHEMA_AND_STAGE_ORDER,
        checkKey: `${reportMode}_report_schema`,
        description: `${reportMode} report schema is explicit and validation fixture remains enabled.`,
        expectedValue: { validation_fixture: true, fixtures_excluded_from_production_totals: true },
        observedValue: {
          validation_fixture: report?.validation_fixture ?? null,
          fixtures_excluded_from_production_totals:
            report?.fixtures_excluded_from_production_totals ?? null,
        },
        varianceValue: null,
        status:
          report?.validation_fixture === true &&
          report?.fixtures_excluded_from_production_totals === true
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType:
          report?.validation_fixture === true &&
          report?.fixtures_excluded_from_production_totals === true
            ? null
            : PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.STATUS_MISMATCH,
        reasonCodes:
          report?.validation_fixture === true &&
          report?.fixtures_excluded_from_production_totals === true
            ? []
            : [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.STAGE_ORDER_MISMATCH],
        reconciliationTimestamp,
      })
    );
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SCHEMA_AND_STAGE_ORDER,
        checkKey: `${reportMode}_stage_order`,
        description: `${reportMode} retains exactly the approved 11-stage order and 11 stage receipts.`,
        expectedValue: {
          stage_order: PIP_360_FULL_PIPELINE_STAGE_ORDER,
          receipt_count: 11,
          indexes: [1,2,3,4,5,6,7,8,9,10,11],
        },
        observedValue: {
          stage_order: report?.stage_order ?? [],
          receipt_count: stageReceipts.length,
          indexes: stageReceipts.map((entry) => entry.stage_index),
        },
        varianceValue: stageReceipts.length - 11,
        status:
          JSON.stringify(report?.stage_order ?? []) === JSON.stringify(PIP_360_FULL_PIPELINE_STAGE_ORDER) &&
          stageReceipts.length === 11 &&
          JSON.stringify(stageReceipts.map((entry) => entry.stage_index)) === JSON.stringify([1,2,3,4,5,6,7,8,9,10,11])
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.STATUS_MISMATCH,
        reasonCodes: [
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.STAGE_ORDER_MISMATCH,
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.STAGE_RECEIPT_COUNT_MISMATCH,
        ],
        sourceStageNames: stageReceipts.map((entry) => entry.stage),
        sourceStageReceiptIds: stageReceipts.map((entry) => entry.stage_receipt_id),
        reconciliationTimestamp,
      })
    );
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SCHEMA_AND_STAGE_ORDER,
        checkKey: `${reportMode}_final_status`,
        description: `${reportMode} final status matches approved Batch 66A expectation.`,
        expectedValue: expectedStatuses[reportMode] ?? null,
        observedValue: report?.final_status ?? null,
        varianceValue: null,
        status:
          (expectedStatuses[reportMode] ?? null) === (report?.final_status ?? null)
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.STATUS_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.STAGE_ORDER_MISMATCH],
        reconciliationTimestamp,
      })
    );
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SCHEMA_AND_STAGE_ORDER,
        checkKey: `${reportMode}_fingerprints_and_timestamps`,
        description: `${reportMode} retains explicit receipt fingerprints, timestamps and approved lineage edge counts.`,
        expectedValue: {
          lineage_edge_count: 10,
          receipt_fingerprints_present: true,
          execution_timestamps_present: true,
        },
        observedValue: {
          lineage_edge_count: lineageLedger.length,
          receipt_fingerprints_present: stageReceipts.every((entry) => Boolean(entry.receipt_fingerprint)),
          execution_timestamps_present: stageReceipts.every((entry) => Boolean(entry.execution_timestamp)),
        },
        varianceValue: lineageLedger.length - 10,
        status:
          lineageLedger.length === 10 &&
          stageReceipts.every((entry) => Boolean(entry.receipt_fingerprint)) &&
          stageReceipts.every((entry) => Boolean(entry.execution_timestamp))
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType:
          lineageLedger.length === 10
            ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MISSING_ARTIFACT
            : PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MISSING_LINEAGE_EDGE,
        reasonCodes: [
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.LINEAGE_EDGE_COUNT_MISMATCH,
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.RECEIPT_FINGERPRINT_MISSING,
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.RECEIPT_TIMESTAMP_MISSING,
        ],
        sourceStageReceiptIds: stageReceipts.map((entry) => entry.stage_receipt_id),
        sourceFingerprints: stageReceipts.map((entry) => entry.receipt_fingerprint),
        reconciliationTimestamp,
      })
    );
  });

  const complete = getReportByPipelineMode(reports, "COMPLETE_SANITIZED_FIXTURE");
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: complete?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SCHEMA_AND_STAGE_ORDER,
      checkKey: "complete_fixture_stage_and_lineage_statuses",
      description: "Complete fixture keeps all 11 stages PASSED and all 10 adjacent lineage edges VERIFIED.",
      expectedValue: { passed_stage_count: 11, verified_lineage_edges: 10 },
      observedValue: {
        passed_stage_count: complete?.passed_stage_count ?? null,
        verified_lineage_edges: toArray(complete?.lineage_ledger).filter((edge) => edge.lineage_status === "VERIFIED").length,
      },
      varianceValue: {
        stage_delta: Number(complete?.passed_stage_count ?? 0) - 11,
        edge_delta:
          toArray(complete?.lineage_ledger).filter((edge) => edge.lineage_status === "VERIFIED").length - 10,
      },
      status:
        Number(complete?.passed_stage_count ?? 0) === 11 &&
        toArray(complete?.lineage_ledger).filter((edge) => edge.lineage_status === "VERIFIED").length === 10
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.STATUS_MISMATCH,
      reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.LINEAGE_EDGE_COUNT_MISMATCH],
      reconciliationTimestamp,
    })
  );

  return checks;
}

function buildCountChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  toArray(reports).forEach((report) => {
    const reportId = report?.pipeline_test_report_id ?? "unknown";
    const receipt = getStage(report, PIP_360_FULL_PIPELINE_STAGES.APIFY_DATASET_RECEIPT);
    const ingestion = getStage(report, PIP_360_FULL_PIPELINE_STAGES.INGESTION);
    const validation = getStage(report, PIP_360_FULL_PIPELINE_STAGES.VALIDATION);
    const s2d = getStage(report, PIP_360_FULL_PIPELINE_STAGES.S2D_CLASSIFICATION);
    const sentiment = getStage(report, PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT);
    const geography = getStage(report, PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION);

    const ingestionExpected =
      Number(ingestion?.accepted_record_count ?? 0) +
      Number(ingestion?.rejected_record_count ?? 0) +
      Number(ingestion?.duplicate_record_count ?? 0);
    const sentimentExecuted =
      sentiment?.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED;
    const geographyExecuted =
      geography?.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED;
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.RECORD_COUNT_RECONCILIATION,
        checkKey: `${report?.test_mode}_ingestion_equation`,
        description: `${report?.test_mode} ingestion count equation reconciles source, accepted, rejected and duplicate counts.`,
        expectedValue: Number(ingestion?.source_record_count ?? null),
        observedValue: ingestionExpected,
        varianceValue:
          Number(ingestion?.source_record_count ?? 0) - Number(ingestionExpected ?? 0),
        status:
          Number(ingestion?.source_record_count ?? -1) === Number(ingestionExpected ?? -2)
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.COUNT_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.COUNT_EQUATION_MISMATCH],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.INGESTION],
        sourceStageReceiptIds: [ingestion?.stage_receipt_id],
        sourceArtifactIds: ingestion?.output_artifact_ids,
        sourceFingerprints: [ingestion?.receipt_fingerprint],
        reconciliationTimestamp,
      })
    );

    const validationExpected =
      Number(validation?.accepted_record_count ?? 0) +
      Number(validation?.rejected_record_count ?? 0);
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.RECORD_COUNT_RECONCILIATION,
        checkKey: `${report?.test_mode}_validation_equation`,
        description: `${report?.test_mode} validation stage reconciles source, accepted and rejected counts with explicit duplicate handling.`,
        expectedValue: Number(validation?.source_record_count ?? null),
        observedValue:
          Number(validationExpected ?? 0) + Number(validation?.duplicate_record_count ?? 0),
        varianceValue:
          Number(validation?.source_record_count ?? 0) -
          (Number(validationExpected ?? 0) + Number(validation?.duplicate_record_count ?? 0)),
        status:
          Number(validation?.source_record_count ?? -1) ===
          Number(validationExpected ?? 0) + Number(validation?.duplicate_record_count ?? 0)
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.COUNT_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.COUNT_EQUATION_MISMATCH],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.VALIDATION],
        sourceStageReceiptIds: [validation?.stage_receipt_id],
        sourceArtifactIds: validation?.output_artifact_ids,
        sourceFingerprints: [validation?.receipt_fingerprint],
        reconciliationTimestamp,
      })
    );

    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: reportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.RECORD_COUNT_RECONCILIATION,
        checkKey: `${report?.test_mode}_cross_stage_counts`,
        description: `${report?.test_mode} count-bearing stage totals remain coherent from receipt through geography and report summary.`,
        expectedValue: {
          apify_received_count: receipt?.accepted_record_count ?? null,
          s2d_classified_count: s2d?.accepted_record_count ?? null,
          sentiment_classified_signal_count: sentimentExecuted
            ? sentiment?.payload?.classified_signal_count ?? null
            : null,
          geography_input_count: geographyExecuted
            ? geography?.source_record_count ?? null
            : null,
          report_initial_record_count: report?.initial_record_count ?? null,
        },
        observedValue: {
          apify_received_count: receipt?.payload?.received_record_count ?? null,
          s2d_classified_count: s2d?.accepted_record_count ?? null,
          sentiment_classified_signal_count: sentimentExecuted
            ? sentiment?.accepted_record_count ?? null
            : null,
          geography_input_count: geographyExecuted
            ? geography?.accepted_record_count ?? null
            : null,
          report_initial_record_count: report?.initial_record_count ?? null,
        },
        varianceValue: {
          receipt_delta:
            Number(receipt?.payload?.received_record_count ?? 0) - Number(receipt?.accepted_record_count ?? 0),
          sentiment_delta:
            Number(sentiment?.payload?.classified_signal_count ?? 0) - Number(sentiment?.accepted_record_count ?? 0),
          geography_delta:
            Number(geography?.source_record_count ?? 0) - Number(geography?.accepted_record_count ?? 0),
        },
        status:
          Number(receipt?.payload?.received_record_count ?? -1) === Number(receipt?.accepted_record_count ?? -2) &&
          (!sentimentExecuted || Number(sentiment?.payload?.classified_signal_count ?? -1) === Number(sentiment?.accepted_record_count ?? -2)) &&
          (!geographyExecuted || Number(geography?.source_record_count ?? -1) === Number(geography?.accepted_record_count ?? -2))
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.WARNING,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.COUNT_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.COUNT_EQUATION_MISMATCH],
        sourceStageNames: [
          PIP_360_FULL_PIPELINE_STAGES.APIFY_DATASET_RECEIPT,
          PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT,
          PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION,
        ],
        sourceStageReceiptIds: [
          receipt?.stage_receipt_id,
          sentiment?.stage_receipt_id,
          geography?.stage_receipt_id,
        ],
        reconciliationTimestamp,
      })
    );
  });
  return checks;
}

function buildDuplicateChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  toArray(reports).forEach((report) => {
    const ingestion = getStage(report, PIP_360_FULL_PIPELINE_STAGES.INGESTION);
    const isDuplicateScenario = report?.test_mode === "DUPLICATE_SOURCE_SIGNAL";
    const duplicateCount = Number(ingestion?.duplicate_record_count ?? 0);
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: report?.pipeline_test_report_id ?? "unknown",
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.DUPLICATE_RECONCILIATION,
        checkKey: `${report?.test_mode}_duplicate_accounting`,
        description: `${report?.test_mode} discloses duplicate counts and canonical retention without silent removal.`,
        expectedValue: isDuplicateScenario ? { duplicate_count_gt_zero: true } : { duplicate_count: 0 },
        observedValue: {
          duplicate_count: duplicateCount,
          duplicate_reason: ingestion?.payload?.duplicate_removal_reason ?? null,
          accepted_count: ingestion?.accepted_record_count ?? null,
          source_count: ingestion?.source_record_count ?? null,
        },
        varianceValue: isDuplicateScenario ? duplicateCount : duplicateCount,
        status:
          isDuplicateScenario
            ? duplicateCount > 0 && Boolean(ingestion?.payload?.duplicate_removal_reason)
              ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
              : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED
            : duplicateCount === 0
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: isDuplicateScenario
          ? PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR
          : PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.INFO,
        discrepancyType: isDuplicateScenario && (duplicateCount <= 0 || !ingestion?.payload?.duplicate_removal_reason)
          ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.DUPLICATE_UNACCOUNTED
          : !isDuplicateScenario && duplicateCount !== 0
          ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.DUPLICATE_UNACCOUNTED
          : null,
        reasonCodes: isDuplicateScenario
          ? [
              PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.DUPLICATE_REASON_MISSING,
              PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.CANONICAL_RETENTION_MISMATCH,
            ]
          : [],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.INGESTION],
        sourceStageReceiptIds: [ingestion?.stage_receipt_id],
        sourceArtifactIds: ingestion?.output_artifact_ids,
        sourceFingerprints: [ingestion?.receipt_fingerprint],
        reconciliationTimestamp,
      })
    );
  });
  return checks;
}

function buildSentimentChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  toArray(reports).forEach((report) => {
    const stage = getStage(report, PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT);
    if (!stage || stage.status !== PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED) return;
    const payload = isPlainObject(stage.payload) ? stage.payload : {};
    const total =
      Number(payload.positive_count ?? 0) +
      Number(payload.neutral_count ?? 0) +
      Number(payload.negative_count ?? 0) +
      Number(payload.mixed_count ?? 0) +
      Number(payload.unknown_count ?? 0);
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: report?.pipeline_test_report_id ?? "unknown",
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SENTIMENT_RECONCILIATION,
        checkKey: `${report?.test_mode}_sentiment_totals`,
        description: `${report?.test_mode} sentiment totals reconcile exactly once across sentiment categories.`,
        expectedValue: payload.classified_signal_count ?? null,
        observedValue: total,
        varianceValue:
          Number(payload.classified_signal_count ?? 0) - Number(total ?? 0),
        status:
          Number(payload.classified_signal_count ?? -1) === Number(total ?? -2)
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.SENTIMENT_TOTAL_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.SENTIMENT_TOTAL_MISMATCH],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT],
        sourceStageReceiptIds: [stage.stage_receipt_id],
        sourceArtifactIds: stage.output_artifact_ids,
        sourceFingerprints: [stage.receipt_fingerprint],
        reconciliationTimestamp,
      })
    );
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: report?.pipeline_test_report_id ?? "unknown",
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.SENTIMENT_RECONCILIATION,
        checkKey: `${report?.test_mode}_issue_trend_confidence_totals`,
        description: `${report?.test_mode} issue, trend, narrative-velocity and confidence counts remain finite and aligned to the classified signal count.`,
        expectedValue: payload.classified_signal_count ?? null,
        observedValue: {
          issue_total: sumObjectValues(payload.issue_counts),
          trend_total: sumObjectValues(payload.trend_counts),
          velocity_total: sumObjectValues(payload.narrative_velocity_counts),
          confidence_total: sumObjectValues(payload.confidence_counts),
        },
        varianceValue: {
          issue_delta: sumObjectValues(payload.issue_counts) - Number(payload.classified_signal_count ?? 0),
          trend_delta: sumObjectValues(payload.trend_counts) - Number(payload.classified_signal_count ?? 0),
          velocity_delta: sumObjectValues(payload.narrative_velocity_counts) - Number(payload.classified_signal_count ?? 0),
          confidence_delta: sumObjectValues(payload.confidence_counts) - Number(payload.classified_signal_count ?? 0),
        },
        status:
          sumObjectValues(payload.issue_counts) === Number(payload.classified_signal_count ?? 0) &&
          sumObjectValues(payload.trend_counts) === Number(payload.classified_signal_count ?? 0) &&
          sumObjectValues(payload.narrative_velocity_counts) === Number(payload.classified_signal_count ?? 0) &&
          sumObjectValues(payload.confidence_counts) === Number(payload.classified_signal_count ?? 0)
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.WARNING,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.SENTIMENT_TOTAL_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.SENTIMENT_TOTAL_MISMATCH],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT],
        sourceStageReceiptIds: [stage.stage_receipt_id],
        reconciliationTimestamp,
      })
    );
  });
  return checks;
}

function buildGeographyChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  toArray(reports).forEach((report) => {
    const stage = getStage(report, PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION);
    if (!stage || stage.status !== PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED) return;
    const payload = isPlainObject(stage.payload) ? stage.payload : {};
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: report?.pipeline_test_report_id ?? "unknown",
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.GEOGRAPHY_RECONCILIATION,
        checkKey: `${report?.test_mode}_geography_totals`,
        description: `${report?.test_mode} geography-fusion input/output counts remain finite, non-negative and reconcile to accepted classified signals.`,
        expectedValue: stage.source_record_count ?? null,
        observedValue: stage.accepted_record_count ?? null,
        varianceValue: Number(stage.source_record_count ?? 0) - Number(stage.accepted_record_count ?? 0),
        status:
          Number(stage.source_record_count ?? -1) === Number(stage.accepted_record_count ?? -2)
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.GEOGRAPHY_TOTAL_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.GEOGRAPHY_TOTAL_MISMATCH],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION],
        sourceStageReceiptIds: [stage.stage_receipt_id],
        sourceArtifactIds: stage.output_artifact_ids,
        sourceFingerprints: [stage.receipt_fingerprint],
        reconciliationTimestamp,
      })
    );
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: report?.pipeline_test_report_id ?? "unknown",
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.GEOGRAPHY_RECONCILIATION,
        checkKey: `${report?.test_mode}_layer_separation`,
        description: `${report?.test_mode} keeps population context and public-signal context separate and excludes P999 from production totals.`,
        expectedValue: {
          population_context_array: true,
          public_signal_context_array: true,
          p999_excluded: true,
        },
        observedValue: {
          population_context_array: Array.isArray(payload.population_context),
          public_signal_context_array: Array.isArray(payload.public_signal_context),
          p999_excluded: payload.p999_fixture_excluded_from_production_totals === true,
        },
        varianceValue: null,
        status:
          Array.isArray(payload.population_context) &&
          Array.isArray(payload.public_signal_context) &&
          payload.p999_fixture_excluded_from_production_totals === true
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.GEOGRAPHY_TOTAL_MISMATCH,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.GEOGRAPHY_TOTAL_MISMATCH],
        sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION],
        sourceStageReceiptIds: [stage.stage_receipt_id],
        reconciliationTimestamp,
      })
    );
  });
  return checks;
}

function buildLineageChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  toArray(reports).forEach((report) => {
    const expectedTransitions = [];
    for (let index = 1; index < PIP_360_FULL_PIPELINE_STAGE_ORDER.length; index += 1) {
      expectedTransitions.push([
        PIP_360_FULL_PIPELINE_STAGE_ORDER[index - 1],
        PIP_360_FULL_PIPELINE_STAGE_ORDER[index],
      ]);
    }

    expectedTransitions.forEach(([fromStage, toStage]) => {
      const edge = findLineageEdge(report, fromStage, toStage);
      const toStageReceipt = getStage(report, toStage);
      const fromStageReceipt = getStage(report, fromStage);
      const expectedInputArtifactId = toArray(fromStageReceipt?.output_artifact_ids)[0] ?? null;
      const observedInputArtifactId = toArray(toStageReceipt?.input_artifact_ids)[0] ?? null;
      const expectedFingerprint = toArray(fromStageReceipt?.output_fingerprints)[0] ?? null;
      const observedFingerprint = edge?.to_input_fingerprint ?? toArray(toStageReceipt?.input_fingerprints)[0] ?? null;
      const blockedTransition =
        toStageReceipt?.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED ||
        toStageReceipt?.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.MANUAL_ACTION_REQUIRED;
      const blockedEquivalentStatus =
        edge?.lineage_status === "BLOCKED" || edge?.lineage_status === "VERIFIED";
      const expectedInvalidLineage =
        report?.test_mode === "INVALID_LINEAGE" && edge?.lineage_status === "INVALID";
      checks.push(
        createCheck({
          testMode,
          sourcePipelineReportId: report?.pipeline_test_report_id ?? "unknown",
          dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.ARTIFACT_AND_EVIDENCE_LINEAGE,
          checkKey: `${report?.test_mode}_${fromStage}_to_${toStage}`,
          description: `${report?.test_mode} preserves artifact IDs, prior receipt IDs and fingerprints for ${fromStage} -> ${toStage}.`,
          expectedValue: {
            artifact_id: expectedInputArtifactId,
            fingerprint: expectedFingerprint,
            blocked: blockedTransition,
          },
          observedValue: {
            edge_exists: Boolean(edge),
            artifact_id: observedInputArtifactId,
            fingerprint: observedFingerprint,
            lineage_status: edge?.lineage_status ?? null,
          },
          varianceValue: null,
          status:
            edge === null
              ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED
              : expectedInvalidLineage
              ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
              : blockedTransition
              ? blockedEquivalentStatus
                ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
                : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED
              : expectedInputArtifactId === observedInputArtifactId && expectedFingerprint === observedFingerprint
              ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
              : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
          severity: blockedTransition
            ? PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.WARNING
            : PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
          discrepancyType:
            edge === null
              ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MISSING_LINEAGE_EDGE
              : expectedFingerprint !== observedFingerprint
              ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.FINGERPRINT_MISMATCH
              : expectedInputArtifactId !== observedInputArtifactId
              ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MISSING_ARTIFACT
              : blockedTransition && edge.lineage_status !== "BLOCKED"
              ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.STATUS_MISMATCH
              : null,
          reasonCodes: [
            PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.ARTIFACT_ID_MISMATCH,
            PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.FINGERPRINT_MISMATCH,
          ],
          sourceStageNames: [fromStage, toStage],
          sourceStageReceiptIds: [fromStageReceipt?.stage_receipt_id, toStageReceipt?.stage_receipt_id],
          sourceArtifactIds: [expectedInputArtifactId, observedInputArtifactId],
          sourceFingerprints: [expectedFingerprint, observedFingerprint],
          reconciliationTimestamp,
        })
      );
    });
  });
  return checks;
}

function buildGovernanceChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  const complete = getReportByPipelineMode(reports, "COMPLETE_SANITIZED_FIXTURE");
  const missing = getReportByPipelineMode(reports, "MISSING_HUMAN_APPROVAL");
  const responseStage = getStage(complete, PIP_360_FULL_PIPELINE_STAGES.RESPONSE_CASE);
  const approvalStage = getStage(complete, PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL);
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: complete?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.HUMAN_GOVERNANCE,
      checkKey: "response_case_allowlist_and_approval_receipt",
      description: "Response recommendation remains allowlisted and explicit human approval evidence is present.",
      expectedValue: {
        recommendation_allowlisted: true,
        approval_receipt_explicit: true,
      },
      observedValue: {
        recommendation: responseStage?.payload?.recommendation ?? null,
        approval_receipt_id: approvalStage?.payload?.approval_receipt?.approval_receipt_id ?? null,
        reviewer_role: approvalStage?.payload?.approval_receipt?.reviewer_role ?? null,
      },
      varianceValue: null,
      status:
        Boolean(approvalStage?.payload?.approval_receipt?.approval_receipt_id) &&
        [
          "MONITOR",
          "CLARIFY",
          "CORRECT_WITH_EVIDENCE",
          "PROVIDE_SERVICE_UPDATE",
          "AMPLIFY_VERIFIED_INFORMATION",
          "ESCALATE_FOR_REVIEW",
          "NO_RESPONSE_REQUIRED",
        ].includes(String(responseStage?.payload?.recommendation ?? ""))
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.HUMAN_GATE_BYPASS,
      reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.HUMAN_APPROVAL_REQUIRED],
      sourceStageNames: [
        PIP_360_FULL_PIPELINE_STAGES.RESPONSE_CASE,
        PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL,
      ],
      sourceStageReceiptIds: [responseStage?.stage_receipt_id, approvalStage?.stage_receipt_id],
      reconciliationTimestamp,
    })
  );
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: missing?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.HUMAN_GOVERNANCE,
      checkKey: "missing_approval_blocks_downstream",
      description: "Missing approval remains MANUAL_ACTION_REQUIRED and blocks content, publication and outcome monitoring.",
      expectedValue: {
        human_approval: "MANUAL_ACTION_REQUIRED",
        blocked_stages: ["CONTENT_BRIEF", "PUBLICATION_RECORD", "OUTCOME_MONITORING"],
      },
      observedValue: {
        human_approval: getStage(missing, PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL)?.status ?? null,
        blocked_stages: [
          getStage(missing, PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF)?.status ?? null,
          getStage(missing, PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD)?.status ?? null,
          getStage(missing, PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING)?.status ?? null,
        ],
      },
      varianceValue: null,
      status:
        getStage(missing, PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL)?.status ===
          PIP_360_FULL_PIPELINE_STAGE_STATUSES.MANUAL_ACTION_REQUIRED &&
        getStage(missing, PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF)?.status ===
          PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED &&
        getStage(missing, PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD)?.status ===
          PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED &&
        getStage(missing, PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING)?.status ===
          PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.HUMAN_GATE_BYPASS,
      reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.HUMAN_APPROVAL_REQUIRED],
      reconciliationTimestamp,
    })
  );
  return checks;
}

function buildPublicationChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  const complete = getReportByPipelineMode(reports, "COMPLETE_SANITIZED_FIXTURE");
  const contentStage = getStage(complete, PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF);
  const publicationStage = getStage(complete, PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD);
  const receipt = publicationStage?.payload?.external_manual_publication_receipt ?? {};
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: complete?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PUBLICATION_BOUNDARY,
      checkKey: "draft_label_and_manual_publication_boundary",
      description: "Draft label remains present and publication remains fictional, HTTPS, manual and example.invalid scoped.",
      expectedValue: {
        draft_label: "DRAFT - HUMAN REVIEW REQUIRED",
        https_example_invalid: true,
        manual_publication: true,
      },
      observedValue: {
        draft_label: contentStage?.payload?.label ?? null,
        publication_url: receipt.publication_url ?? null,
        publication_method: receipt.publication_method ?? null,
      },
      varianceValue: null,
      status:
        String(contentStage?.payload?.label ?? "").includes("DRAFT - HUMAN REVIEW REQUIRED") &&
        /^https:\/\/example\.invalid\//.test(String(receipt.publication_url ?? "")) &&
        String(receipt.publication_method ?? "") === "EXTERNAL_MANUAL"
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.PUBLICATION_BOUNDARY_BYPASS,
      reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.PUBLICATION_BOUNDARY_REQUIRED],
      sourceStageNames: [
        PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF,
        PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD,
      ],
      sourceStageReceiptIds: [contentStage?.stage_receipt_id, publicationStage?.stage_receipt_id],
      reconciliationTimestamp,
    })
  );
  return checks;
}

function buildMonitoringChecks({ testMode, reports, reconciliationTimestamp }) {
  const checks = [];
  const complete = getReportByPipelineMode(reports, "COMPLETE_SANITIZED_FIXTURE");
  const stage = getStage(complete, PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING);
  const payload = stage?.payload ?? {};
  const windows = toArray(payload.monitoring_windows);
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: complete?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.OUTCOME_MONITORING,
      checkKey: "five_window_monitoring_reconciliation",
      description: "Outcome monitoring preserves the exact five approved windows and excludes any seven-day window.",
      expectedValue: MONITORING_WINDOW_LABELS,
      observedValue: windows,
      varianceValue: windows.length - MONITORING_WINDOWS.length,
      status:
        JSON.stringify(windows) === JSON.stringify(MONITORING_WINDOWS)
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MONITORING_WINDOW_MISMATCH,
      reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.MONITORING_WINDOW_MISMATCH],
      sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING],
      sourceStageReceiptIds: [stage?.stage_receipt_id],
      reconciliationTimestamp,
    })
  );
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: complete?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.OUTCOME_MONITORING,
      checkKey: "causality_and_effectiveness_claim_boundary",
      description: "Causal attribution remains NOT_PERFORMED and publication-effectiveness claim remains NOT_ESTABLISHED.",
      expectedValue: {
        causal_attribution_status: "NOT_PERFORMED",
        publication_effectiveness_claim_status: "NOT_ESTABLISHED",
      },
      observedValue: {
        causal_attribution_status: payload.causal_attribution_status ?? null,
        publication_effectiveness_claim_status:
          payload.publication_effectiveness_claim_status ?? null,
      },
      varianceValue: null,
      status:
        String(payload.causal_attribution_status ?? "") === "NOT_PERFORMED" &&
        String(payload.publication_effectiveness_claim_status ?? "") ===
          "NOT_ESTABLISHED"
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MONITORING_WINDOW_MISMATCH,
      reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.MONITORING_WINDOW_MISMATCH],
      sourceStageNames: [PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING],
      sourceStageReceiptIds: [stage?.stage_receipt_id],
      reconciliationTimestamp,
    })
  );
  return checks;
}

function buildAuthorizationAndAuditChecks({
  testMode,
  reports,
  authorizationContext,
  auditContext,
  reconciliationTimestamp,
}) {
  const checks = [];
  const sourceReportId = toArray(reports)[0]?.pipeline_test_report_id ?? "unknown";
  if (!authorizationContext) {
    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: sourceReportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.AUTHORIZATION_AND_AUDIT,
        checkKey: "authorization_context_required",
        description: "Sanitized authorization context is required for read-only reconciliation.",
        expectedValue: "SANITIZED_AUTHORIZATION_CONTEXT",
        observedValue: null,
        varianceValue: null,
        status: PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.AUTHORIZATION_INVALID,
        reasonCodes: [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.AUTHORIZATION_CONTEXT_REQUIRED],
        reconciliationTimestamp,
      })
    );
    return checks;
  }

  const auth = sanitizeAuthorizationContext(authorizationContext);
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: sourceReportId,
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.AUTHORIZATION_AND_AUDIT,
      checkKey: "authorization_snapshot_reconciles",
      description: "Authorization contract, snapshot validity, enforcement and permission count reconcile from sanitized context.",
      expectedValue: {
        authorization_contract_valid: true,
        authorization_snapshot_valid: true,
        authorization_enforced: true,
      },
      observedValue: auth,
      varianceValue: auth.permission_count,
      status:
        auth.authorization_contract_valid === true &&
        auth.authorization_snapshot_valid === true &&
        auth.authorization_enforced === true &&
        Number.isFinite(Number(auth.permission_count))
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.AUTHORIZATION_INVALID,
      reasonCodes: [
        PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.AUTHORIZATION_CONTRACT_INVALID,
        PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.AUTHORIZATION_SNAPSHOT_INVALID,
        PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.AUTHORIZATION_NOT_ENFORCED,
      ],
      reconciliationTimestamp,
    })
  );

  const audit = sanitizeAuditContext(auditContext);
  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: sourceReportId,
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.AUTHORIZATION_AND_AUDIT,
      checkKey: "audit_contract_reconciles_without_append",
      description: "Central audit contract remains valid and no production audit append occurs.",
      expectedValue: { central_audit_contract_valid: true, central_audit_append_count: 0 },
      observedValue: {
        central_audit_contract_valid: audit.central_audit_contract_valid,
        central_audit_append_count: 0,
      },
      varianceValue: 0,
      status:
        audit.central_audit_contract_valid === true
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.REVIEW_REQUIRED,
      severity:
        audit.central_audit_contract_valid === true
          ? PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.INFO
          : PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.WARNING,
      discrepancyType:
        audit.central_audit_contract_valid === true
          ? null
          : PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.AUDIT_EVIDENCE_INCOMPLETE,
      reasonCodes:
        audit.central_audit_contract_valid === true
          ? []
          : [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.REVIEW_REQUIRED_AUDIT_EVIDENCE],
      reconciliationTimestamp,
    })
  );

  return checks;
}

function buildPerformanceChecks({
  testMode,
  reports,
  performanceContext,
  reconciliationTimestamp,
}) {
  const checks = [];
  const sourceReportId = toArray(reports)[0]?.pipeline_test_report_id ?? "unknown";
  const performancePairs = [
    ["primary", performanceContext?.primaryPerformanceReport ?? null],
    ["comparison", performanceContext?.comparisonPerformanceReport ?? null],
  ];

  performancePairs.forEach(([scope, report]) => {
    if (!report) {
      checks.push(
        createCheck({
          testMode,
          sourcePipelineReportId: sourceReportId,
          dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PERFORMANCE_AND_PAYLOAD,
          checkKey: `${scope}_performance_report_missing`,
          description: `${scope} performance evidence is explicitly absent and therefore not applicable.`,
          expectedValue: `${scope.toUpperCase()}_PERFORMANCE_REPORT_OPTIONAL`,
          observedValue: null,
          varianceValue: null,
          status: PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.NOT_APPLICABLE,
          severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.INFO,
          discrepancyType: null,
          reconciliationTimestamp,
        })
      );
      return;
    }

    const validation = validatePipDashboardPerformanceReconciliationReport(report);
    const payloadBytes = isPlainObject(report.payload_byte_measurements)
      ? report.payload_byte_measurements
      : {};
    const timings = isPlainObject(report.performance_measurements)
      ? report.performance_measurements
      : {};
    const payloadTotal =
      Number(payloadBytes.overview_bytes ?? 0) +
      Number(payloadBytes.dun_bytes ?? 0) +
      Number(payloadBytes.dm_bytes ?? 0) +
      Number(payloadBytes.locality_bytes ?? 0);
    const hasNegativeTiming = Object.values(timings).some(
      (value) => Number(value) < 0
    );
    const hasNegativePayload = Object.values(payloadBytes).some(
      (value) => Number(value) < 0
    );

    checks.push(
      createCheck({
        testMode,
        sourcePipelineReportId: sourceReportId,
        dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PERFORMANCE_AND_PAYLOAD,
        checkKey: `${scope}_performance_validation`,
        description: `${scope} performance evidence validates and payload-byte totals reconcile without negative timings or payload values.`,
        expectedValue: {
          validation_valid: true,
          payload_total_matches: true,
          negative_timing: false,
          negative_payload: false,
        },
        observedValue: {
          validation_valid: validation.valid === true,
          payload_total_matches: Number(payloadBytes.total_bytes ?? 0) === payloadTotal,
          negative_timing: hasNegativeTiming,
          negative_payload: hasNegativePayload,
          payload_bytes: payloadBytes,
        },
        varianceValue:
          Number(payloadBytes.total_bytes ?? 0) - payloadTotal,
        status:
          validation.valid === true &&
          Number(payloadBytes.total_bytes ?? 0) === payloadTotal &&
          hasNegativeTiming === false &&
          hasNegativePayload === false
            ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
            : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
        severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR,
        discrepancyType: PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.PERFORMANCE_EVIDENCE_INVALID,
        reasonCodes: [
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.PERFORMANCE_REPORT_INVALID,
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.NEGATIVE_TIMING_VALUE,
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.NEGATIVE_PAYLOAD_VALUE,
          PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.PAYLOAD_TOTAL_MISMATCH,
        ],
        reconciliationTimestamp,
      })
    );
  });
  return checks;
}

function buildPrivacyChecks({
  testMode,
  sourceCollection,
  reconciliationTimestamp,
}) {
  const checks = [];
  const sanitizedSourceCollection = sanitizeContractExport({
    generated_at: reconciliationTimestamp,
    manifest: buildPip360FullPipelineReconciliationContractManifest({
      generatedAt: reconciliationTimestamp,
    }),
    reports: toArray(sourceCollection?.reports),
    summary: sourceCollection?.summary ?? {},
  });
  const hasPrivacyViolation = hasProhibitedPrivacyField(sanitizedSourceCollection);
  const fixtureExcluded =
    toArray(sourceCollection?.reports).every(
      (entry) => entry?.fixtures_excluded_from_production_totals === true
    ) && sourceCollection?.summary?.production_operation_count === 0;

  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: toArray(sourceCollection?.reports)[0]?.pipeline_test_report_id ?? "unknown",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.PRIVACY_AND_FIXTURE_ISOLATION,
      checkKey: "privacy_boundary_and_fixture_isolation",
      description: "Sanitized exports contain no prohibited privacy fields and fixtures remain excluded from production totals.",
      expectedValue: {
        privacy_violation: false,
        fixtures_excluded_from_production_totals: true,
      },
      observedValue: {
        privacy_violation: hasPrivacyViolation,
        fixtures_excluded_from_production_totals: fixtureExcluded,
      },
      varianceValue: null,
      status:
        hasPrivacyViolation === false && fixtureExcluded === true
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType: hasPrivacyViolation
        ? PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.PRIVACY_BOUNDARY_VIOLATION
        : PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.FIXTURE_LEAKAGE,
      reasonCodes: [
        PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.PRIVACY_FIELD_PRESENT,
        PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.FIXTURE_INCLUDED_IN_PRODUCTION_TOTALS,
      ],
      reconciliationTimestamp,
    })
  );
  return checks;
}

function buildFeatureFlagChecks({
  testMode,
  featureFlagContext,
  reconciliationTimestamp,
}) {
  const checks = [];
  const manifest66a = isPlainObject(featureFlagContext?.batch66aManifest)
    ? featureFlagContext.batch66aManifest
    : buildPip360FullPipelineTestContractManifest();
  const manifest66b = isPlainObject(featureFlagContext?.batch66bManifest)
    ? featureFlagContext.batch66bManifest
    : buildPip360FullPipelineReconciliationContractManifest();
  const summary66a = isPlainObject(manifest66a.summary) ? manifest66a.summary : {};
  const summary66b = isPlainObject(manifest66b.summary) ? manifest66b.summary : {};

  const violations = PROHIBITED_FEATURE_FLAGS.filter(
    (key) => summary66a[key] === true || summary66b[key] === true
  );

  checks.push(
    createCheck({
      testMode,
      sourcePipelineReportId: "feature-flags",
      dimension: PIP_360_PIPELINE_RECONCILIATION_DIMENSIONS.FEATURE_FLAGS_AND_SAFETY,
      checkKey: "prohibited_feature_flags_remain_disabled",
      description: "Batch 66A and Batch 66B manifests keep all prohibited feature flags disabled.",
      expectedValue: PROHIBITED_FEATURE_FLAGS.reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {}),
      observedValue: PROHIBITED_FEATURE_FLAGS.reduce((acc, key) => {
        acc[key] = summary66a[key] === true || summary66b[key] === true;
        return acc;
      }, {}),
      varianceValue: violations.length,
      status:
        violations.length === 0
          ? PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED
          : PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED,
      severity: PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL,
      discrepancyType:
        violations.length === 0
          ? null
          : PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.FEATURE_FLAG_VIOLATION,
      reasonCodes: violations.length === 0
        ? []
        : [PIP_360_PIPELINE_RECONCILIATION_REASON_CODES.PROHIBITED_FEATURE_FLAG_ENABLED],
      reconciliationTimestamp,
    })
  );
  return checks;
}

function buildDimensionsFromChecks({ testMode, checks, reconciliationTimestamp }) {
  return PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER.map((dimension) =>
    buildPip360PipelineReconciliationDimension({
      testMode,
      dimension,
      checks: toArray(checks).filter((entry) => entry.dimension === dimension),
      reconciliationTimestamp,
    })
  );
}

export function buildPip360PipelineReconciliationLedger({
  pipelineTestCollection,
  reconciliationTimestamp,
  authorizationContext,
  auditContext,
  performanceContext,
  featureFlagContext,
  testMode,
} = {}) {
  const sourceCollection = deepClone(pipelineTestCollection ?? {});
  const reports = toArray(sourceCollection.reports);
  return [
    ...buildSchemaAndStageChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildCountChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildDuplicateChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildSentimentChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildGeographyChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildLineageChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildGovernanceChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildPublicationChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildMonitoringChecks({ testMode, reports, reconciliationTimestamp }),
    ...buildAuthorizationAndAuditChecks({
      testMode,
      reports,
      authorizationContext,
      auditContext,
      reconciliationTimestamp,
    }),
    ...buildPerformanceChecks({
      testMode,
      reports,
      performanceContext,
      reconciliationTimestamp,
    }),
    ...buildPrivacyChecks({
      testMode,
      sourceCollection,
      reconciliationTimestamp,
    }),
    ...buildFeatureFlagChecks({
      testMode,
      featureFlagContext,
      reconciliationTimestamp,
    }),
  ];
}

function summarizeChecks(checks) {
  const safeChecks = toArray(checks);
  const discrepancyChecks = safeChecks.filter(
    (entry) =>
      entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED ||
      entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED ||
      entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.REVIEW_REQUIRED
  );
  const statusCount = (status) =>
    safeChecks.filter((entry) => entry.status === status).length;
  const severityCount = (severity) =>
    discrepancyChecks.filter((entry) => entry.severity === severity).length;
  const discrepancyCount = (type) =>
    discrepancyChecks.filter((entry) => entry.discrepancy_type === type).length;
  return {
    total_check_count: safeChecks.length,
    passed_check_count: statusCount(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.PASSED),
    failed_check_count: statusCount(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED),
    blocked_check_count: statusCount(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED),
    review_required_check_count: statusCount(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.REVIEW_REQUIRED),
    not_applicable_check_count: statusCount(PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.NOT_APPLICABLE),
    info_discrepancy_count: severityCount(PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.INFO),
    warning_discrepancy_count: severityCount(PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.WARNING),
    error_discrepancy_count: severityCount(PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.ERROR),
    critical_discrepancy_count: severityCount(PIP_360_PIPELINE_RECONCILIATION_SEVERITIES.CRITICAL),
    total_count_variance: safeChecks.reduce((sum, entry) => {
      const value = Number(entry.variance_value);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0),
    invalid_fingerprint_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.FINGERPRINT_MISMATCH
    ),
    missing_artifact_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MISSING_ARTIFACT
    ),
    missing_evidence_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MISSING_EVIDENCE
    ),
    unaccounted_duplicate_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.DUPLICATE_UNACCOUNTED
    ),
    sentiment_variance_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.SENTIMENT_TOTAL_MISMATCH
    ),
    geography_variance_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.GEOGRAPHY_TOTAL_MISMATCH
    ),
    human_gate_bypass_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.HUMAN_GATE_BYPASS
    ),
    publication_boundary_bypass_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.PUBLICATION_BOUNDARY_BYPASS
    ),
    monitoring_window_mismatch_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.MONITORING_WINDOW_MISMATCH
    ),
    fixture_leakage_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.FIXTURE_LEAKAGE
    ),
    privacy_violation_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.PRIVACY_BOUNDARY_VIOLATION
    ),
    feature_flag_violation_count: discrepancyCount(
      PIP_360_PIPELINE_RECONCILIATION_DISCREPANCY_TYPES.FEATURE_FLAG_VIOLATION
    ),
  };
}

export function reconcilePip360FullPipelineReport({
  pipelineTestCollection,
  reconciliationTimestamp,
  authorizationContext,
  auditContext,
  performanceContext,
  fixtureContext,
  featureFlagContext,
  testMode = PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.BASELINE_RECONCILED,
} = {}) {
  const effectiveTimestamp = ensureIsoTimestamp(
    reconciliationTimestamp,
    "2027-01-03T10:00:00.000Z"
  );
  const sourceCollection = deepClone(isPlainObject(pipelineTestCollection) ? pipelineTestCollection : {});
  const checks = buildPip360PipelineReconciliationLedger({
    pipelineTestCollection: sourceCollection,
    reconciliationTimestamp: effectiveTimestamp,
    authorizationContext,
    auditContext,
    performanceContext,
    fixtureContext,
    featureFlagContext,
    testMode,
  });
  const dimensions = buildDimensionsFromChecks({
    testMode,
    checks,
    reconciliationTimestamp: effectiveTimestamp,
  });
  const summary = summarizeChecks(checks);
  const finalStatus = deriveFinalStatusFromChecks(checks);
  const firstFailedDimension = dimensions.find(
    (entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.FAILED
  )?.dimension ?? null;
  const firstBlockedDimension = dimensions.find(
    (entry) => entry.status === PIP_360_PIPELINE_RECONCILIATION_CHECK_STATUSES.BLOCKED
  )?.dimension ?? null;
  const report = {
    schema: PIP_360_PIPELINE_RECONCILIATION_REPORT_SCHEMA,
    reconciliation_report_id: deterministicId("recon-report", {
      testMode,
      effectiveTimestamp,
      sourceCollectionId: sourceCollection?.collection_id ?? null,
    }),
    test_mode: testMode,
    source_pipeline_collection_id: String(sourceCollection?.collection_id ?? "unknown"),
    source_pipeline_collection_fingerprint: buildSourceCollectionFingerprint(sourceCollection),
    dimension_order: [...PIP_360_PIPELINE_RECONCILIATION_DIMENSION_ORDER],
    dimensions,
    reconciliation_checks: checks,
    ...summary,
    production_operation_count: 0,
    external_network_request_count: 0,
    browser_storage_mutation_count: 0,
    central_repository_mutation_count: 0,
    central_audit_append_count: 0,
    final_status: finalStatus,
    first_failed_dimension: firstFailedDimension,
    first_blocked_dimension: firstBlockedDimension,
    reconciliation_timestamp: effectiveTimestamp,
    validation_fixture: true,
    fixtures_excluded_from_production_totals:
      sourceCollection?.summary?.fixtures_excluded_from_production_totals !== false,
    safety_manifest: buildPip360FullPipelineReconciliationContractManifest({
      generatedAt: effectiveTimestamp,
    }).summary,
  };
  report.report_fingerprint = deterministicHash({
    report_id: report.reconciliation_report_id,
    source_pipeline_collection_fingerprint: report.source_pipeline_collection_fingerprint,
    total_check_count: report.total_check_count,
    failed_check_count: report.failed_check_count,
    blocked_check_count: report.blocked_check_count,
    final_status: report.final_status,
  });
  report.validation = compactValidationEnvelope(
    validatePip360PipelineReconciliationReport(report)
  );
  return report;
}

function buildScenarioPipelineCollection(testMode, baseCollection) {
  const cloned = deepClone(baseCollection);
  const complete = getReportByPipelineMode(cloned.reports, "COMPLETE_SANITIZED_FIXTURE");

  if (testMode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.COUNT_MISMATCH) {
    if (complete) {
      complete.initial_record_count = Number(complete.initial_record_count ?? 0) + 1;
      const ingestionStage = getStage(complete, PIP_360_FULL_PIPELINE_STAGES.INGESTION);
      if (ingestionStage) {
        ingestionStage.source_record_count =
          Number(ingestionStage.source_record_count ?? 0) + 1;
      }
    }
  }

  if (testMode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.LINEAGE_MISMATCH) {
    const firstEdge = toArray(complete?.lineage_ledger)[0];
    if (firstEdge) {
      firstEdge.to_input_fingerprint = `${String(firstEdge.to_input_fingerprint ?? "")}-tampered`;
    }
  }

  if (testMode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.FIXTURE_LEAKAGE) {
    if (complete) {
      complete.fixtures_excluded_from_production_totals = false;
    }
    if (isPlainObject(cloned.summary)) {
      cloned.summary.production_operation_count = 0;
    }
  }

  return cloned;
}

function buildScenarioContexts({
  testMode,
  authorizationContext,
  auditContext,
  performanceContext,
  fixtureContext,
  featureFlagContext,
}) {
  return {
    authorizationContext:
      testMode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.AUTHORIZATION_CONTEXT_MISSING
        ? null
        : authorizationContext,
    auditContext,
    performanceContext,
    fixtureContext,
    featureFlagContext,
  };
}

export function reconcilePip360FullPipelineTestCollection({
  pipelineTestCollection,
  reconciliationTimestamp = "2027-01-03T10:00:00.000Z",
  authorizationContext = null,
  auditContext = null,
  performanceContext = {},
  fixtureContext = {},
  featureFlagContext = {},
} = {}) {
  const effectiveTimestamp = ensureIsoTimestamp(
    reconciliationTimestamp,
    "2027-01-03T10:00:00.000Z"
  );
  const sourceCollection = isPlainObject(pipelineTestCollection)
    ? deepClone(pipelineTestCollection)
    : { collection_id: "missing-source", reports: [], summary: {} };
  const modes = Object.values(PIP_360_PIPELINE_RECONCILIATION_TEST_MODES);
  const reports = modes.map((testMode) => {
    const scenarioCollection =
      testMode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.BASELINE_RECONCILED
        ? deepClone(sourceCollection)
        : buildScenarioPipelineCollection(testMode, sourceCollection);
    const scenarioContexts = buildScenarioContexts({
      testMode,
      authorizationContext,
      auditContext,
      performanceContext,
      fixtureContext,
      featureFlagContext,
    });
    return reconcilePip360FullPipelineReport({
      pipelineTestCollection: scenarioCollection,
      reconciliationTimestamp: effectiveTimestamp,
      testMode,
      ...scenarioContexts,
    });
  });

  const summary = buildPip360FullPipelineReconciliationSummary({ reports });
  const collection = {
    schema: undefined,
    reconciliation_collection_id: deterministicId("recon-collection", {
      effectiveTimestamp,
      sourceCollectionId: sourceCollection?.collection_id ?? null,
    }),
    source_pipeline_collection_id: String(sourceCollection?.collection_id ?? "unknown"),
    reports,
    summary,
    reconciliation_timestamp: effectiveTimestamp,
    validation_fixture: true,
  };
  collection.validation = compactValidationEnvelope(
    validatePip360PipelineReconciliationCollection(collection)
  );
  return collection;
}

export function buildPip360FullPipelineReconciliationSummary({ reports = [] } = {}) {
  const safeReports = toArray(reports);
  const sum = (key) =>
    safeReports.reduce((total, entry) => total + Number(entry?.[key] ?? 0), 0);
  return {
    total_scenarios: safeReports.length,
    reconciled_scenarios: safeReports.filter(
      (entry) => entry.final_status === PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.RECONCILED
    ).length,
    partially_reconciled_scenarios: safeReports.filter(
      (entry) => entry.final_status === PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.PARTIALLY_RECONCILED
    ).length,
    not_reconciled_scenarios: safeReports.filter(
      (entry) => entry.final_status === PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.NOT_RECONCILED
    ).length,
    blocked_scenarios: safeReports.filter(
      (entry) => entry.final_status === PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.BLOCKED
    ).length,
    total_checks: sum("total_check_count"),
    passed_checks: sum("passed_check_count"),
    failed_checks: sum("failed_check_count"),
    blocked_checks: sum("blocked_check_count"),
    review_required_checks: sum("review_required_check_count"),
    critical_discrepancies: sum("critical_discrepancy_count"),
    error_discrepancies: sum("error_discrepancy_count"),
    warning_discrepancies: sum("warning_discrepancy_count"),
    total_count_variance: sum("total_count_variance"),
    invalid_fingerprint_count: sum("invalid_fingerprint_count"),
    unaccounted_duplicate_count: sum("unaccounted_duplicate_count"),
    sentiment_mismatch_count: sum("sentiment_variance_count"),
    geography_mismatch_count: sum("geography_variance_count"),
    human_gate_bypass_count: sum("human_gate_bypass_count"),
    publication_boundary_bypass_count: sum("publication_boundary_bypass_count"),
    monitoring_window_mismatch_count: sum("monitoring_window_mismatch_count"),
    fixture_leakage_count: sum("fixture_leakage_count"),
    privacy_violation_count: sum("privacy_violation_count"),
    feature_flag_violation_count: sum("feature_flag_violation_count"),
    production_operation_count: sum("production_operation_count"),
    external_network_request_count: sum("external_network_request_count"),
    browser_storage_mutation_count: sum("browser_storage_mutation_count"),
    central_repository_mutation_count: sum("central_repository_mutation_count"),
    central_audit_append_count: sum("central_audit_append_count"),
    validation_fixture: true,
  };
}

export function createPip360FullPipelineReconciliationExportFileName({
  generatedAt = "2027-01-03T10:00:00.000Z",
  scope = "P134",
} = {}) {
  const stamp = sanitizeText(generatedAt, 64)
    .replace(/[:.]/g, "-")
    .replace(/\s+/g, "_");
  const safeScope = sanitizeText(scope, 32).replace(/[^A-Za-z0-9_-]/g, "_") || "P134";
  return `pip-360-full-pipeline-reconciliation-${safeScope}-${stamp}.json`;
}

export function sanitizePip360PipelineReconciliationExport(payload = {}) {
  return sanitizeContractExport(payload);
}

export function serializePip360FullPipelineReconciliationExport(payload = {}) {
  return JSON.stringify(sanitizePip360PipelineReconciliationExport(payload), null, 2);
}

export function buildPip360FullPipelineReconciliationValidationFixture({
  reconciliationTimestamp = "2027-01-03T10:00:00.000Z",
  authorizationContext,
  auditContext,
  performanceContext,
  featureFlagContext,
} = {}) {
  const pipelineTestCollection = runPip360FullPipelineTestCollection({
    executionTimestamp: "2027-01-02T10:00:00.000Z",
  });
  const sourceBefore = stableStringify(pipelineTestCollection);
  const collection = reconcilePip360FullPipelineTestCollection({
    pipelineTestCollection,
    reconciliationTimestamp,
    authorizationContext,
    auditContext,
    performanceContext,
    fixtureContext: {
      validation_fixture: true,
      p999_fixture_separated: true,
    },
    featureFlagContext,
  });
  const sourceAfter = stableStringify(pipelineTestCollection);
  const reports = toArray(collection.reports);
  const baseline = reports.find(
    (entry) =>
      entry.test_mode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.BASELINE_RECONCILED
  );
  const countMismatch = reports.find(
    (entry) => entry.test_mode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.COUNT_MISMATCH
  );
  const lineageMismatch = reports.find(
    (entry) => entry.test_mode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.LINEAGE_MISMATCH
  );
  const authMissing = reports.find(
    (entry) =>
      entry.test_mode ===
      PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.AUTHORIZATION_CONTEXT_MISSING
  );
  const fixtureLeakage = reports.find(
    (entry) => entry.test_mode === PIP_360_PIPELINE_RECONCILIATION_TEST_MODES.FIXTURE_LEAKAGE
  );

  const checks = {
    source_batch66a_collection_unmodified: sourceBefore === sourceAfter,
    baseline_reconciled:
      baseline?.final_status === PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.RECONCILED,
    baseline_zero_failed_checks: Number(baseline?.failed_check_count ?? -1) === 0,
    baseline_zero_critical_discrepancies:
      Number(baseline?.critical_discrepancy_count ?? -1) === 0,
    exact_dimension_count:
      Array.isArray(baseline?.dimensions) && baseline.dimensions.length === 13,
    every_dimension_has_checks:
      toArray(baseline?.dimensions).every((entry) => Number(entry.check_count ?? 0) > 0),
    count_mismatch_detected:
      Number(countMismatch?.failed_check_count ?? 0) > 0 &&
      Number(countMismatch?.total_count_variance ?? 0) !== 0,
    lineage_mismatch_detected:
      Number(lineageMismatch?.invalid_fingerprint_count ?? 0) > 0,
    missing_authorization_blocked:
      authMissing?.final_status === PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.BLOCKED,
    fixture_leakage_detected:
      Number(fixtureLeakage?.fixture_leakage_count ?? 0) > 0 &&
      fixtureLeakage?.final_status ===
        PIP_360_PIPELINE_RECONCILIATION_FINAL_STATUSES.NOT_RECONCILED,
  };

  return {
    pipelineTestCollection,
    collection,
    baseline,
    countMismatch,
    lineageMismatch,
    authMissing,
    fixtureLeakage,
    checks,
    validation_fixture: true,
  };
}
