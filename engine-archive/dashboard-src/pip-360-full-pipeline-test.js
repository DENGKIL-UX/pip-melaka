import {
  PIP_360_FULL_PIPELINE_STAGE_ORDER,
  PIP_360_FULL_PIPELINE_STAGES,
  PIP_360_FULL_PIPELINE_STAGE_STATUSES,
  PIP_360_FULL_PIPELINE_FINAL_STATUSES,
  PIP_360_FULL_PIPELINE_TEST_MODES,
  PIP_360_FULL_PIPELINE_REASON_CODES,
  buildPip360FullPipelineTestContractManifest,
  sanitizePip360FullPipelineTestExport as sanitizePip360FullPipelineContractExport,
  validatePip360FullPipelineLineage,
  validatePip360FullPipelineStageReceipt,
  validatePip360FullPipelineTestCollection,
  validatePip360FullPipelineTestReport,
} from "./pip-360-full-pipeline-test-contract.js";
import { buildPip360GeographyMappingValidationFixture } from "./pip-360-geography-mapper.js";
import { buildPip360DualLayerLocalityValidationFixture } from "./pip-360-dual-layer-locality-context.js";
import { buildPip360CommandCentreValidationFixture } from "./pip-360-command-centre.js";
import { buildPipPublicCommunicationResponseCaseValidationFixture } from "./pip-public-communication-response-case.js";
import { buildPipPublicCommunicationEvidenceRecommendationValidationFixture } from "./pip-public-communication-evidence-recommendation.js";
import { buildPipPublicCommunicationContentPackageValidationFixture } from "./pip-public-communication-content-package.js";
import { buildPipPublicCommunicationProductionQueueValidationFixture } from "./pip-public-communication-production-queue.js";
import { buildPipPublicCommunicationPublicationRegisterValidationFixture } from "./pip-public-communication-publication-register.js";
import { buildPipPublicCommunicationManualPublishingBoundaryValidationFixture } from "./pip-public-communication-manual-publishing-boundary.js";
import { buildPipPublicCommunicationOutcomeObservationValidationFixture } from "./pip-public-communication-outcome-observation.js";
import { buildPipPublicCommunicationOutcomeClassificationValidationFixture } from "./pip-public-communication-outcome-classification.js";
import { buildPipPublicCommunicationEffectivenessValidationFixture } from "./pip-public-communication-effectiveness-library.js";

const PROHIBITED_FIELD_KEYS = Object.freeze([
  "post_text",
  "caption_text",
  "comment_text",
  "username",
  "account_handle",
  "personal_name",
  "voter_identifier",
  "address",
  "phone_number",
  "demographic_profile",
  "inferred_political_affiliation",
  "raw_content",
  "account_identity",
]);

const RESPONSE_ALLOWLIST = Object.freeze([
  "MONITOR",
  "CLARIFY",
  "CORRECT_WITH_EVIDENCE",
  "PROVIDE_SERVICE_UPDATE",
  "AMPLIFY_VERIFIED_INFORMATION",
  "ESCALATE_FOR_REVIEW",
  "NO_RESPONSE_REQUIRED",
]);

const MONITORING_WINDOWS = Object.freeze([
  "PRE_PUBLICATION_24H",
  "POST_PUBLICATION_6H",
  "POST_PUBLICATION_12H",
  "POST_PUBLICATION_24H",
  "POST_PUBLICATION_72H",
]);

const STAGE_INDEX_BY_NAME = Object.freeze(
  PIP_360_FULL_PIPELINE_STAGE_ORDER.reduce((acc, stage, index) => {
    acc[stage] = index + 1;
    return acc;
  }, {})
);

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
  if (Number.isFinite(parsed)) {
    return String(value);
  }
  return fallback;
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stableStringify(value) {
  const seen = new Set();

  const walk = (entry, depth = 0) => {
    if (depth > 6) return '"[DepthLimit]"';

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
    const keys = Object.keys(entry).sort();
    const body = keys
      .map((key) => `${JSON.stringify(key)}:${walk(entry[key], depth + 1)}`)
      .join(",");
    return `{${body}}`;
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

function buildValidationFixtureSignals(testMode) {
  const baseSignals = [
    {
      signal_reference_id: "sig-fixture-0001",
      source_reference_id: "src-fixture-0001",
      platform_classification: "FICTIONAL_SOCIAL_FEED",
      published_timestamp: "2027-01-02T08:00:00.000Z",
      engagement_count: 18,
      geography_hint: "LOCALITY_A",
      language_classification: "MS",
      evidence_reference_ids: ["ev-fixture-001"],
      validation_fixture: true,
    },
    {
      signal_reference_id: "sig-fixture-0002",
      source_reference_id: "src-fixture-0002",
      platform_classification: "FICTIONAL_SOCIAL_FEED",
      published_timestamp: "2027-01-02T08:05:00.000Z",
      engagement_count: 7,
      geography_hint: "LOCALITY_B",
      language_classification: "MS",
      evidence_reference_ids: ["ev-fixture-002"],
      validation_fixture: true,
    },
  ];

  if (testMode === PIP_360_FULL_PIPELINE_TEST_MODES.DUPLICATE_SOURCE_SIGNAL) {
    return [
      ...baseSignals,
      {
        ...baseSignals[0],
        signal_reference_id: "sig-fixture-0001",
        source_reference_id: "src-fixture-0001",
      },
    ];
  }

  if (testMode === PIP_360_FULL_PIPELINE_TEST_MODES.INVALID_INGESTION) {
    return [
      ...baseSignals,
      {
        signal_reference_id: "",
        source_reference_id: "src-fixture-invalid",
        platform_classification: "FICTIONAL_SOCIAL_FEED",
        published_timestamp: "not-a-timestamp",
        engagement_count: -5,
        geography_hint: "LOCALITY_X",
        language_classification: "MS",
        evidence_reference_ids: ["bad evidence id"],
        validation_fixture: true,
        post_text: "not allowed",
      },
    ];
  }

  return baseSignals;
}

function buildValidationFixtureDataset(testMode, executionTimestamp) {
  return {
    source_fixture_id: `fixture-${String(testMode).toLowerCase()}`,
    apify_dataset_reference_id: "apify-dataset-fixture-001",
    apify_run_reference_id: "apify-run-fixture-001",
    actor_reference_id: "actor-fixture-001",
    platform_classification: "FICTIONAL_SOCIAL_FEED",
    received_record_count: buildValidationFixtureSignals(testMode).length,
    received_at: executionTimestamp,
    dataset_digest: deterministicHash({ testMode, executionTimestamp, dataset: "sanitized" }),
    schema_version: "fixture.v1",
    validation_fixture: true,
    sanitized: true,
    token_present: false,
    raw_content_present: false,
    account_identity_present: false,
    ingestion_records: buildValidationFixtureSignals(testMode),
  };
}

function buildS2DClassifications(acceptedRecords, executionTimestamp) {
  return toArray(acceptedRecords).map((record, index) => ({
    s2d_classification_reference_id: `s2d-fixture-${String(index + 1).padStart(4, "0")}`,
    source_signal_reference_id: record.signal_reference_id,
    issue_classification: "SERVICE_INFORMATION",
    narrative_cluster_reference_id: `cluster-fixture-${String(index + 1).padStart(3, "0")}`,
    sentiment_classification: index % 2 === 0 ? "NEUTRAL" : "NEGATIVE",
    trend_classification: "STABLE",
    narrative_velocity_classification: "CONSISTENT",
    confidence_classification: "MEDIUM",
    evidence_reference_ids: toArray(record.evidence_reference_ids),
    classifier_version: "fixture-s2d-v1",
    classified_at: executionTimestamp,
    validation_fixture: true,
  }));
}

function buildSentimentSnapshot(classifications, executionTimestamp) {
  const safe = toArray(classifications);
  const total = safe.length;
  const counts = {
    positive_count: safe.filter((item) => item.sentiment_classification === "POSITIVE").length,
    neutral_count: safe.filter((item) => item.sentiment_classification === "NEUTRAL").length,
    negative_count: safe.filter((item) => item.sentiment_classification === "NEGATIVE").length,
    mixed_count: safe.filter((item) => item.sentiment_classification === "MIXED").length,
    unknown_count: safe.filter((item) => item.sentiment_classification === "UNKNOWN").length,
  };

  return {
    sentiment_snapshot_id: deterministicId("sentiment", {
      total,
      executionTimestamp,
      classifications: safe.map((item) => item.s2d_classification_reference_id),
    }),
    classified_signal_count: total,
    ...counts,
    issue_counts: { SERVICE_INFORMATION: total },
    trend_counts: { STABLE: total },
    narrative_velocity_counts: { CONSISTENT: total },
    confidence_counts: { MEDIUM: total },
    evidence_reference_ids: Array.from(
      new Set(safe.flatMap((item) => toArray(item.evidence_reference_ids)))
    ),
    snapshot_timestamp: executionTimestamp,
    validation_fixture: true,
  };
}

function buildOutcomeMonitoringBundle(executionTimestamp) {
  const observationFixture = buildPipPublicCommunicationOutcomeObservationValidationFixture();
  const classificationFixture =
    buildPipPublicCommunicationOutcomeClassificationValidationFixture();
  const effectivenessFixture =
    buildPipPublicCommunicationEffectivenessValidationFixture();

  return {
    monitoring_windows: [...MONITORING_WINDOWS],
    outcome_observation:
      observationFixture?.fixture_collection ?? observationFixture?.collection ?? {},
    outcome_classification:
      classificationFixture?.fixture_classification_collection ??
      classificationFixture?.classification_collection ??
      {},
    effectiveness_library:
      effectivenessFixture?.library ?? effectivenessFixture?.fixture_library ?? {},
    causal_attribution_status: "NOT_PERFORMED",
    publication_effectiveness_claim_status: "NOT_ESTABLISHED",
    monitored_at: executionTimestamp,
    validation_fixture: true,
  };
}

function makeStageReceipt({
  stage,
  status,
  testMode,
  executionTimestamp,
  sourceCount,
  acceptedCount,
  rejectedCount,
  duplicateCount,
  inputArtifactIds,
  inputFingerprints,
  outputArtifactIds,
  outputFingerprints,
  previousStageReceipt,
  blockedReasonCodes,
  validationErrors,
  payload,
}) {
  const stageIndex = STAGE_INDEX_BY_NAME[stage];
  const receiptBase = {
    stage,
    stage_index: stageIndex,
    status,
    test_mode: testMode,
    input_artifact_ids: toArray(inputArtifactIds),
    input_fingerprints: toArray(inputFingerprints),
    output_artifact_ids: toArray(outputArtifactIds),
    output_fingerprints: toArray(outputFingerprints),
    source_record_count: normalizeInteger(sourceCount),
    accepted_record_count: normalizeInteger(acceptedCount),
    rejected_record_count: normalizeInteger(rejectedCount),
    duplicate_record_count: normalizeInteger(duplicateCount),
    blocked_reason_codes: toArray(blockedReasonCodes),
    validation_errors: toArray(validationErrors),
    execution_timestamp: executionTimestamp,
    previous_stage_receipt_id: previousStageReceipt?.stage_receipt_id ?? null,
    previous_stage_fingerprint: previousStageReceipt?.receipt_fingerprint ?? null,
    ...baseSafetyFlags(),
    payload: isPlainObject(payload) ? payload : {},
  };

  const stageReceiptId = deterministicId("stg", {
    stage,
    stageIndex,
    testMode,
    executionTimestamp,
    previous: receiptBase.previous_stage_fingerprint,
  });

  const receiptFingerprint = deterministicHash({
    stage,
    stageIndex,
    status,
    testMode,
    executionTimestamp,
    inputArtifactIds: receiptBase.input_artifact_ids,
    outputArtifactIds: receiptBase.output_artifact_ids,
    previousStageFingerprint: receiptBase.previous_stage_fingerprint,
  });

  return {
    schema: undefined,
    stage_receipt_id: stageReceiptId,
    ...receiptBase,
    receipt_fingerprint: receiptFingerprint,
  };
}

function buildBlockedStageReceipt(stage, previousStageReceipt, testMode, executionTimestamp, reasonCode) {
  return makeStageReceipt({
    stage,
    status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED,
    testMode,
    executionTimestamp,
    sourceCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    duplicateCount: 0,
    inputArtifactIds: [],
    inputFingerprints: previousStageReceipt ? [previousStageReceipt.receipt_fingerprint] : [],
    outputArtifactIds: [],
    outputFingerprints: [],
    previousStageReceipt,
    blockedReasonCodes: [reasonCode],
    validationErrors: [reasonCode],
    payload: { blocked: true },
  });
}

export function buildPip360FullPipelineStageReceipt(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const stage =
    PIP_360_FULL_PIPELINE_STAGE_ORDER.find((item) => item === safe.stage) ??
    PIP_360_FULL_PIPELINE_STAGES.APIFY_DATASET_RECEIPT;
  return makeStageReceipt({
    stage,
    status:
      safe.status ??
      PIP_360_FULL_PIPELINE_STAGE_STATUSES.NOT_RUN,
    testMode:
      safe.test_mode ??
      PIP_360_FULL_PIPELINE_TEST_MODES.COMPLETE_SANITIZED_FIXTURE,
    executionTimestamp:
      ensureIsoTimestamp(
        safe.execution_timestamp,
        "2027-01-02T10:00:00.000Z"
      ),
    sourceCount: safe.source_record_count,
    acceptedCount: safe.accepted_record_count,
    rejectedCount: safe.rejected_record_count,
    duplicateCount: safe.duplicate_record_count,
    inputArtifactIds: safe.input_artifact_ids,
    inputFingerprints: safe.input_fingerprints,
    outputArtifactIds: safe.output_artifact_ids,
    outputFingerprints: safe.output_fingerprints,
    previousStageReceipt: safe.previous_stage_receipt,
    blockedReasonCodes: safe.blocked_reason_codes,
    validationErrors: safe.validation_errors,
    payload: safe.payload,
  });
}

function validateDatasetReceipt(dataset) {
  const errors = [];

  if (dataset.token_present === true) {
    errors.push(PIP_360_FULL_PIPELINE_REASON_CODES.API_TOKEN_PRESENT);
  }
  if (dataset.raw_content_present === true) {
    errors.push(PIP_360_FULL_PIPELINE_REASON_CODES.RAW_CONTENT_PRESENT);
  }
  if (dataset.account_identity_present === true) {
    errors.push(PIP_360_FULL_PIPELINE_REASON_CODES.ACCOUNT_IDENTITY_PRESENT);
  }
  if (dataset.validation_fixture !== true) {
    errors.push(PIP_360_FULL_PIPELINE_REASON_CODES.VALIDATION_FIXTURE_FALSE);
  }
  if (Number(dataset.received_record_count) < 0) {
    errors.push(PIP_360_FULL_PIPELINE_REASON_CODES.NEGATIVE_RECORD_COUNT);
  }
  if (sanitizeText(dataset.dataset_digest).length === 0) {
    errors.push(PIP_360_FULL_PIPELINE_REASON_CODES.MISSING_DATASET_DIGEST);
  }

  return errors;
}

function detectProhibitedFields(record) {
  const safe = isPlainObject(record) ? record : {};
  return PROHIBITED_FIELD_KEYS.filter((key) => key in safe);
}

function validateIngestionRecords(records) {
  const accepted = [];
  const rejected = [];
  const duplicateReasons = [];
  const validationErrors = [];

  const seenBySignalId = new Set();
  const seenBySourceTimestamp = new Set();

  toArray(records).forEach((record, index) => {
    const safe = isPlainObject(record) ? record : {};
    const signalReferenceId = sanitizeText(safe.signal_reference_id, 120);
    const sourceReferenceId = sanitizeText(safe.source_reference_id, 120);
    const timestamp = sanitizeText(safe.published_timestamp, 80);
    const evidenceIds = toArray(safe.evidence_reference_ids);

    const prohibitedFields = detectProhibitedFields(safe);
    if (prohibitedFields.length > 0) {
      rejected.push({ index, reason: PIP_360_FULL_PIPELINE_REASON_CODES.PROHIBITED_FIELD_PRESENT });
      validationErrors.push(
        `${PIP_360_FULL_PIPELINE_REASON_CODES.PROHIBITED_FIELD_PRESENT}:${prohibitedFields.join(",")}`
      );
      return;
    }

    const sourceTimestampKey = `${sourceReferenceId}::${timestamp}`;
    if (seenBySignalId.has(signalReferenceId)) {
      duplicateReasons.push(PIP_360_FULL_PIPELINE_REASON_CODES.DUPLICATE_SIGNAL_REFERENCE_ID);
      return;
    }
    if (seenBySourceTimestamp.has(sourceTimestampKey)) {
      duplicateReasons.push(PIP_360_FULL_PIPELINE_REASON_CODES.DUPLICATE_SOURCE_TIMESTAMP);
      return;
    }

    const timestampValid = Number.isFinite(Date.parse(timestamp));
    const evidenceValid =
      evidenceIds.length >= 1 && evidenceIds.every((entry) => /^ev-[a-z0-9-]+$/i.test(String(entry)));

    if (
      signalReferenceId.length === 0 ||
      sourceReferenceId.length === 0 ||
      !timestampValid ||
      !Number.isFinite(Number(safe.engagement_count ?? NaN)) ||
      Number(safe.engagement_count ?? 0) < 0 ||
      safe.validation_fixture !== true ||
      !evidenceValid
    ) {
      rejected.push({ index, reason: PIP_360_FULL_PIPELINE_REASON_CODES.INVALID_LINEAGE });
      validationErrors.push("INVALID_INGESTION_RECORD");
      return;
    }

    seenBySignalId.add(signalReferenceId);
    seenBySourceTimestamp.add(sourceTimestampKey);
    accepted.push(safe);
  });

  return {
    accepted,
    rejected,
    duplicate_count: duplicateReasons.length,
    duplicate_reasons: duplicateReasons,
    validation_errors: validationErrors,
    canonical_records: accepted,
  };
}

function buildLineageEdge({
  fromStage,
  fromReceipt,
  fromOutputArtifactId,
  fromOutputFingerprint,
  toStage,
  toReceipt,
  toInputArtifactId,
  toInputFingerprint,
}) {
  const status =
    toReceipt.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED
      ? "BLOCKED"
      : fromOutputFingerprint === toInputFingerprint
      ? "VERIFIED"
      : "INVALID";

  const validationErrors =
    status === "INVALID"
      ? [PIP_360_FULL_PIPELINE_REASON_CODES.LINEAGE_FINGERPRINT_MISMATCH]
      : [];

  return {
    lineage_edge_id: deterministicId("lin", {
      fromStage,
      toStage,
      fromReceipt: fromReceipt.stage_receipt_id,
      toReceipt: toReceipt.stage_receipt_id,
    }),
    from_stage: fromStage,
    from_stage_receipt_id: fromReceipt.stage_receipt_id,
    from_output_artifact_id: fromOutputArtifactId,
    from_output_fingerprint: fromOutputFingerprint,
    to_stage: toStage,
    to_stage_receipt_id: toReceipt.stage_receipt_id,
    to_input_artifact_id: toInputArtifactId,
    to_input_fingerprint: toInputFingerprint,
    lineage_status: status,
    validation_errors: validationErrors,
  };
}

function buildStageCountSummary(receipts) {
  const safe = toArray(receipts);
  return {
    total_stages: safe.length,
    passed_stage_count: safe.filter((entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED).length,
    failed_stage_count: safe.filter((entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED).length,
    blocked_stage_count: safe.filter((entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED).length,
    manual_action_required_count: safe.filter(
      (entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.MANUAL_ACTION_REQUIRED
    ).length,
    skipped_stage_count: safe.filter((entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.SKIPPED).length,
  };
}

function deriveFinalStatus(receipts) {
  const counters = buildStageCountSummary(receipts);
  if (counters.failed_stage_count > 0) return PIP_360_FULL_PIPELINE_FINAL_STATUSES.FAILED;
  if (counters.blocked_stage_count > 0 || counters.manual_action_required_count > 0) {
    return PIP_360_FULL_PIPELINE_FINAL_STATUSES.BLOCKED;
  }
  if (counters.passed_stage_count === PIP_360_FULL_PIPELINE_STAGE_ORDER.length) {
    return PIP_360_FULL_PIPELINE_FINAL_STATUSES.PASSED;
  }
  return PIP_360_FULL_PIPELINE_FINAL_STATUSES.PARTIAL;
}

function buildFixtureApprovalReceipt(responseCaseReceipt, executionTimestamp) {
  const base = {
    approval_receipt_id: "approval-fixture-0001",
    source_response_case_id: responseCaseReceipt?.payload?.response_case_id ?? "response-case-fixture-0001",
    source_response_case_fingerprint:
      responseCaseReceipt?.payload?.response_case_fingerprint ?? deterministicHash({ fallback: "response-case" }),
    approval_action: "FIXTURE_CONTINUATION_REVIEW",
    approval_status: "APPROVED_FOR_FIXTURE_CONTINUATION",
    approval_level: "HUMAN_REVIEWER",
    reviewer_role: "ANALYST",
    reviewer_reference_id: "reviewer-fixture-0001",
    reviewed_at: executionTimestamp,
    review_note_reference_id: "note-fixture-0001",
    validation_fixture: true,
  };

  return {
    ...base,
    receipt_fingerprint: deterministicHash(base),
  };
}

function buildFixturePublicationRecord(executionTimestamp) {
  return {
    publication_record_id: "publication-fixture-0001",
    publication_method: "EXTERNAL_MANUAL",
    publication_url: "https://example.invalid/publication/fixture-0001",
    publication_timestamp: executionTimestamp,
    verifier_reference_id: "verifier-fixture-0001",
    validation_fixture: true,
    manual_handoff_confirmed: true,
    external_publication_verified: true,
  };
}

function runSingle(testMode, options = {}) {
  const executionTimestamp = ensureIsoTimestamp(
    options.executionTimestamp,
    "2027-01-02T10:00:00.000Z"
  );

  const stageReceipts = [];
  const addReceipt = (receipt) => {
    const result = validatePip360FullPipelineStageReceipt(receipt);
    stageReceipts.push({ ...receipt, validation: compactValidationEnvelope(result) });
    return stageReceipts[stageReceipts.length - 1];
  };

  const dataset = buildValidationFixtureDataset(testMode, executionTimestamp);
  const datasetErrors = validateDatasetReceipt(dataset);

  const stage1 = addReceipt(
    makeStageReceipt({
      stage: PIP_360_FULL_PIPELINE_STAGES.APIFY_DATASET_RECEIPT,
      status:
        datasetErrors.length === 0
          ? PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED
          : PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED,
      testMode,
      executionTimestamp,
      sourceCount: dataset.received_record_count,
      acceptedCount: datasetErrors.length === 0 ? dataset.received_record_count : 0,
      rejectedCount: datasetErrors.length,
      duplicateCount: 0,
      inputArtifactIds: [dataset.apify_dataset_reference_id],
      inputFingerprints: [dataset.dataset_digest],
      outputArtifactIds: ["dataset-receipt-fixture"],
      outputFingerprints: [deterministicHash(dataset)],
      previousStageReceipt: null,
      blockedReasonCodes: datasetErrors,
      validationErrors: datasetErrors,
      payload: dataset,
    })
  );

  const ingestResult = validateIngestionRecords(dataset.ingestion_records);
  const stage2Status =
    stage1.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED
      ? PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED
      : PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED;

  const stage2 = addReceipt(
    stage2Status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED
      ? buildBlockedStageReceipt(
          PIP_360_FULL_PIPELINE_STAGES.INGESTION,
          stage1,
          testMode,
          executionTimestamp,
          PIP_360_FULL_PIPELINE_REASON_CODES.DOWNSTREAM_EXECUTION_BLOCKED
        )
      : makeStageReceipt({
          stage: PIP_360_FULL_PIPELINE_STAGES.INGESTION,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: dataset.ingestion_records.length,
          acceptedCount: ingestResult.accepted.length,
          rejectedCount: ingestResult.rejected.length,
          duplicateCount: ingestResult.duplicate_count,
          inputArtifactIds: ["dataset-receipt-fixture"],
          inputFingerprints: [toArray(stage1.output_fingerprints)[0] ?? stage1.receipt_fingerprint],
          outputArtifactIds: ["ingestion-artifact-fixture"],
          outputFingerprints: [deterministicHash(ingestResult.accepted)],
          previousStageReceipt: stage1,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: {
            accepted_records: ingestResult.accepted,
            duplicate_reasons: ingestResult.duplicate_reasons,
            duplicate_removal_reason:
              ingestResult.duplicate_count > 0
                ? PIP_360_FULL_PIPELINE_REASON_CODES.DUPLICATE_REMOVAL_REASON_RECORDED
                : null,
          },
        })
  );

  const validationFailedByFixture =
    testMode === PIP_360_FULL_PIPELINE_TEST_MODES.INVALID_INGESTION;

  const validationErrors = [
    ...ingestResult.validation_errors,
    ...(validationFailedByFixture ? ["VALIDATION_STAGE_FAILED"] : []),
  ];

  const stage3 = addReceipt(
    stage2.status !== PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED
      ? buildBlockedStageReceipt(
          PIP_360_FULL_PIPELINE_STAGES.VALIDATION,
          stage2,
          testMode,
          executionTimestamp,
          PIP_360_FULL_PIPELINE_REASON_CODES.DOWNSTREAM_EXECUTION_BLOCKED
        )
      : makeStageReceipt({
          stage: PIP_360_FULL_PIPELINE_STAGES.VALIDATION,
          status:
            validationErrors.length === 0
              ? PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED
              : PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED,
          testMode,
          executionTimestamp,
          sourceCount: stage2.source_record_count,
          acceptedCount:
            validationErrors.length === 0 ? stage2.accepted_record_count : 0,
          rejectedCount:
            validationErrors.length === 0
              ? stage2.rejected_record_count
              : stage2.source_record_count,
          duplicateCount: stage2.duplicate_record_count,
          inputArtifactIds: ["ingestion-artifact-fixture"],
          inputFingerprints: [toArray(stage2.output_fingerprints)[0] ?? stage2.receipt_fingerprint],
          outputArtifactIds: ["validation-artifact-fixture"],
          outputFingerprints: [deterministicHash({ ok: validationErrors.length === 0 })],
          previousStageReceipt: stage2,
          blockedReasonCodes:
            validationErrors.length === 0
              ? []
              : [PIP_360_FULL_PIPELINE_REASON_CODES.DOWNSTREAM_EXECUTION_BLOCKED],
          validationErrors,
          payload: {
            canonical_record_count: ingestResult.canonical_records.length,
            duplicate_removal_reason:
              stage2.duplicate_record_count > 0
                ? PIP_360_FULL_PIPELINE_REASON_CODES.DUPLICATE_REMOVAL_REASON_RECORDED
                : null,
            digest_integrity_valid: true,
          },
        })
  );

  let upstreamFailedOrBlocked =
    stage3.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED ||
    stage3.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED;

  const reuse62Fixtures = {
    geography_mapping_fixture: buildPip360GeographyMappingValidationFixture(),
    locality_fixture: buildPip360DualLayerLocalityValidationFixture(),
    command_centre_fixture: buildPip360CommandCentreValidationFixture(),
  };

  const reuse63to65Fixtures = {
    response_case_fixture: buildPipPublicCommunicationResponseCaseValidationFixture(),
    recommendation_fixture: buildPipPublicCommunicationEvidenceRecommendationValidationFixture(),
    content_fixture: buildPipPublicCommunicationContentPackageValidationFixture(),
    queue_fixture: buildPipPublicCommunicationProductionQueueValidationFixture(),
    publication_fixture: buildPipPublicCommunicationPublicationRegisterValidationFixture(),
    boundary_fixture: buildPipPublicCommunicationManualPublishingBoundaryValidationFixture(),
  };

  const stageOutputs = {};

  PIP_360_FULL_PIPELINE_STAGE_ORDER.slice(3).forEach((stage) => {
    const previous = stageReceipts[stageReceipts.length - 1];

    if (upstreamFailedOrBlocked) {
      addReceipt(
        buildBlockedStageReceipt(
          stage,
          previous,
          testMode,
          executionTimestamp,
          PIP_360_FULL_PIPELINE_REASON_CODES.DOWNSTREAM_EXECUTION_BLOCKED
        )
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.S2D_CLASSIFICATION) {
      const classifications = buildS2DClassifications(
        ingestResult.canonical_records,
        executionTimestamp
      );
      stageOutputs[stage] = classifications;

      addReceipt(
        makeStageReceipt({
          stage,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: stage3.accepted_record_count,
          acceptedCount: classifications.length,
          rejectedCount: 0,
          duplicateCount: 0,
          inputArtifactIds: ["validation-artifact-fixture"],
          inputFingerprints: [toArray(stage3.output_fingerprints)[0] ?? stage3.receipt_fingerprint],
          outputArtifactIds: ["s2d-artifact-fixture"],
          outputFingerprints: [deterministicHash(classifications)],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: {
            classification_envelopes: classifications,
          },
        })
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT) {
      const snapshot = buildSentimentSnapshot(
        stageOutputs[PIP_360_FULL_PIPELINE_STAGES.S2D_CLASSIFICATION],
        executionTimestamp
      );
      stageOutputs[stage] = snapshot;

      addReceipt(
        makeStageReceipt({
          stage,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: snapshot.classified_signal_count,
          acceptedCount: snapshot.classified_signal_count,
          rejectedCount: 0,
          duplicateCount: 0,
          inputArtifactIds: ["s2d-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: ["sentiment-artifact-fixture"],
          outputFingerprints: [deterministicHash(snapshot)],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: snapshot,
        })
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.PIP_GEOGRAPHY_FUSION) {
      const geographyBundle = {
        mapped_public_signals:
          reuse62Fixtures.geography_mapping_fixture?.mapped_signals ?? [],
        geography_mapping_summary:
          reuse62Fixtures.geography_mapping_fixture?.summary ?? {},
        dual_layer_locality_collection:
          reuse62Fixtures.locality_fixture?.collection ?? {},
        command_centre_snapshot:
          reuse62Fixtures.command_centre_fixture?.snapshot ?? {},
        population_context:
          reuse62Fixtures.locality_fixture?.collection?.population_locality_contexts ?? [],
        public_signal_context:
          reuse62Fixtures.locality_fixture?.collection?.public_signal_locality_contexts ?? [],
        p999_fixture_excluded_from_production_totals: true,
      };
      stageOutputs[stage] = geographyBundle;

      addReceipt(
        makeStageReceipt({
          stage,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: stageOutputs[PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT]
            ?.classified_signal_count,
          acceptedCount: stageOutputs[PIP_360_FULL_PIPELINE_STAGES.SENTIMENT_SNAPSHOT]
            ?.classified_signal_count,
          rejectedCount: 0,
          duplicateCount: 0,
          inputArtifactIds: ["sentiment-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: ["geography-fusion-artifact-fixture"],
          outputFingerprints: [deterministicHash(geographyBundle)],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: geographyBundle,
        })
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.RESPONSE_CASE) {
      const recommendation = "CLARIFY";
      const responseCase = {
        response_case_id: "response-case-fixture-0001",
        response_case_fingerprint: deterministicHash({ recommendation, executionTimestamp }),
        recommendation,
        evidence_lineage_complete: true,
        validation_fixture: true,
        human_review_required: true,
        raw_public_content_included: false,
      };
      stageOutputs[stage] = responseCase;

      const responseErrors = [];
      if (!RESPONSE_ALLOWLIST.includes(recommendation)) {
        responseErrors.push(PIP_360_FULL_PIPELINE_REASON_CODES.RECOMMENDATION_NOT_ALLOWLISTED);
      }

      addReceipt(
        makeStageReceipt({
          stage,
          status:
            responseErrors.length === 0
              ? PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED
              : PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED,
          testMode,
          executionTimestamp,
          sourceCount: 1,
          acceptedCount: responseErrors.length === 0 ? 1 : 0,
          rejectedCount: responseErrors.length,
          duplicateCount: 0,
          inputArtifactIds: ["geography-fusion-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: ["response-case-artifact-fixture"],
          outputFingerprints: [deterministicHash(responseCase)],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: responseErrors,
          payload: responseCase,
        })
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL) {
      const requireManualAction =
        testMode === PIP_360_FULL_PIPELINE_TEST_MODES.MISSING_HUMAN_APPROVAL;
      const approvalReceipt = requireManualAction
        ? null
        : buildFixtureApprovalReceipt(previous, executionTimestamp);

      stageOutputs[stage] = approvalReceipt;

      addReceipt(
        makeStageReceipt({
          stage,
          status: requireManualAction
            ? PIP_360_FULL_PIPELINE_STAGE_STATUSES.MANUAL_ACTION_REQUIRED
            : PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: 1,
          acceptedCount: requireManualAction ? 0 : 1,
          rejectedCount: requireManualAction ? 1 : 0,
          duplicateCount: 0,
          inputArtifactIds: ["response-case-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: requireManualAction ? [] : ["human-approval-artifact-fixture"],
          outputFingerprints: requireManualAction
            ? []
            : [deterministicHash(approvalReceipt)],
          previousStageReceipt: previous,
          blockedReasonCodes: requireManualAction
            ? [PIP_360_FULL_PIPELINE_REASON_CODES.HUMAN_APPROVAL_MISSING]
            : [],
          validationErrors: requireManualAction
            ? [PIP_360_FULL_PIPELINE_REASON_CODES.HUMAN_APPROVAL_MISSING]
            : [],
          payload: {
            approval_receipt: approvalReceipt,
          },
        })
      );

      if (requireManualAction) {
        upstreamFailedOrBlocked = true;
      }
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF) {
      const contentFixture = reuse63to65Fixtures.content_fixture;
      stageOutputs[stage] = {
        fixture_content_package_collection:
          contentFixture?.content_package_collection ??
          contentFixture?.collection ??
          {},
        label: "DRAFT - HUMAN REVIEW REQUIRED",
      };

      addReceipt(
        makeStageReceipt({
          stage,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          duplicateCount: 0,
          inputArtifactIds: ["human-approval-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: ["content-brief-artifact-fixture"],
          outputFingerprints: [deterministicHash(stageOutputs[stage])],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: stageOutputs[stage],
        })
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD) {
      const publicationFixture = {
        production_queue_fixture: reuse63to65Fixtures.queue_fixture,
        publication_register_fixture: reuse63to65Fixtures.publication_fixture,
        manual_boundary_fixture: reuse63to65Fixtures.boundary_fixture,
        external_manual_publication_receipt: buildFixturePublicationRecord(executionTimestamp),
      };
      stageOutputs[stage] = publicationFixture;

      addReceipt(
        makeStageReceipt({
          stage,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          duplicateCount: 0,
          inputArtifactIds: ["content-brief-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: ["publication-record-artifact-fixture"],
          outputFingerprints: [deterministicHash(publicationFixture)],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: publicationFixture,
        })
      );
      return;
    }

    if (stage === PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING) {
      const bundle = {
        ...buildOutcomeMonitoringBundle(executionTimestamp),
        supporting_reuse: {
          response_case_fixture: reuse63to65Fixtures.response_case_fixture,
          recommendation_fixture: reuse63to65Fixtures.recommendation_fixture,
        },
      };
      stageOutputs[stage] = bundle;

      addReceipt(
        makeStageReceipt({
          stage,
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.PASSED,
          testMode,
          executionTimestamp,
          sourceCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          duplicateCount: 0,
          inputArtifactIds: ["publication-record-artifact-fixture"],
          inputFingerprints: [toArray(previous.output_fingerprints)[0] ?? previous.receipt_fingerprint],
          outputArtifactIds: ["outcome-monitoring-artifact-fixture"],
          outputFingerprints: [deterministicHash(bundle)],
          previousStageReceipt: previous,
          blockedReasonCodes: [],
          validationErrors: [],
          payload: bundle,
        })
      );
    }
  });

  const lineageLedger = buildPip360FullPipelineLineageLedger({
    stageReceipts,
    injectInvalidLineage:
      testMode === PIP_360_FULL_PIPELINE_TEST_MODES.INVALID_LINEAGE,
  });

  if (testMode === PIP_360_FULL_PIPELINE_TEST_MODES.INVALID_LINEAGE) {
    const mismatchEdge = lineageLedger.find((edge) => edge.lineage_status === "INVALID");
    const mismatchToStage = mismatchEdge?.to_stage;
    const targetIndex = PIP_360_FULL_PIPELINE_STAGE_ORDER.findIndex((item) => item === mismatchToStage);

    if (targetIndex >= 0) {
      stageReceipts[targetIndex] = {
        ...stageReceipts[targetIndex],
        status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED,
        validation_errors: [PIP_360_FULL_PIPELINE_REASON_CODES.LINEAGE_FINGERPRINT_MISMATCH],
      };

      for (let index = targetIndex + 1; index < stageReceipts.length; index += 1) {
        stageReceipts[index] = {
          ...stageReceipts[index],
          status: PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED,
          validation_errors: [PIP_360_FULL_PIPELINE_REASON_CODES.DOWNSTREAM_EXECUTION_BLOCKED],
          blocked_reason_codes: [PIP_360_FULL_PIPELINE_REASON_CODES.DOWNSTREAM_EXECUTION_BLOCKED],
        };
      }
    }
  }

  const counters = buildStageCountSummary(stageReceipts);
  const finalStatus = deriveFinalStatus(stageReceipts);
  const firstFailureStage =
    stageReceipts.find((entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED)?.stage ??
    null;
  const firstBlockedStage =
    stageReceipts.find(
      (entry) =>
        entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED ||
        entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.MANUAL_ACTION_REQUIRED
    )?.stage ?? null;

  const lineageValid = lineageLedger.every((edge) => edge.lineage_status !== "INVALID");

  const report = {
    schema: undefined,
    pipeline_test_report_id: deterministicId("report", {
      testMode,
      executionTimestamp,
    }),
    test_mode: testMode,
    stage_order: [...PIP_360_FULL_PIPELINE_STAGE_ORDER],
    stage_receipts: stageReceipts,
    lineage_ledger: lineageLedger,
    source_fixture_id: dataset.source_fixture_id,
    source_dataset_digest: dataset.dataset_digest,
    initial_record_count: dataset.received_record_count,
    final_monitored_record_count:
      stageReceipts.find((entry) => entry.stage === PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING)
        ?.accepted_record_count ?? 0,
    passed_stage_count: counters.passed_stage_count,
    failed_stage_count: counters.failed_stage_count,
    blocked_stage_count: counters.blocked_stage_count,
    manual_action_required_count: counters.manual_action_required_count,
    skipped_stage_count: counters.skipped_stage_count,
    final_status: finalStatus,
    first_failure_stage: firstFailureStage,
    first_blocked_stage: firstBlockedStage,
    lineage_valid: lineageValid,
    fixtures_excluded_from_production_totals: true,
    production_operation_count: 0,
    external_network_request_count: 0,
    browser_storage_mutation_count: 0,
    central_repository_mutation_count: 0,
    generated_at: executionTimestamp,
    validation_fixture: true,
    safety_manifest: buildPip360FullPipelineTestContractManifest({
      generatedAt: executionTimestamp,
    }).summary,
  };

  report.validation = compactValidationEnvelope(
    validatePip360FullPipelineTestReport(report)
  );
  return report;
}

export function buildPip360FullPipelineLineageLedger({
  stageReceipts = [],
  injectInvalidLineage = false,
} = {}) {
  const safeReceipts = toArray(stageReceipts);
  const edges = [];

  for (let index = 1; index < safeReceipts.length; index += 1) {
    const fromReceipt = safeReceipts[index - 1];
    const toReceipt = safeReceipts[index];
    const fromStage = fromReceipt.stage;
    const toStage = toReceipt.stage;

    const baseFromFingerprint = toArray(fromReceipt.output_fingerprints)[0] ?? "";
    const baseToFingerprint = toArray(toReceipt.input_fingerprints)[0] ?? "";

    const fromOutputFingerprint = baseFromFingerprint;
    const toInputFingerprint =
      injectInvalidLineage && index === 3
        ? `${baseToFingerprint}-tampered`
        : baseToFingerprint;

    const edge = buildLineageEdge({
      fromStage,
      fromReceipt,
      fromOutputArtifactId: toArray(fromReceipt.output_artifact_ids)[0] ?? `${fromStage}-output`,
      fromOutputFingerprint,
      toStage,
      toReceipt,
      toInputArtifactId: toArray(toReceipt.input_artifact_ids)[0] ?? `${toStage}-input`,
      toInputFingerprint,
    });

    edge.validation = compactValidationEnvelope(
      validatePip360FullPipelineLineage(edge)
    );
    edges.push(edge);
  }

  return edges;
}

export function runPip360FullPipelineTest({
  testMode = PIP_360_FULL_PIPELINE_TEST_MODES.COMPLETE_SANITIZED_FIXTURE,
  executionTimestamp,
} = {}) {
  return runSingle(testMode, { executionTimestamp });
}

export function runPip360FullPipelineTestCollection({
  executionTimestamp = "2027-01-02T10:00:00.000Z",
  testModes,
} = {}) {
  const modes =
    toArray(testModes).length > 0
      ? toArray(testModes)
      : Object.values(PIP_360_FULL_PIPELINE_TEST_MODES);

  const reports = modes.map((testMode) =>
    runPip360FullPipelineTest({ testMode, executionTimestamp })
  );

  const summary = buildPip360FullPipelineTestSummary({ reports });
  const collection = {
    schema: undefined,
    collection_id: deterministicId("collection", { executionTimestamp, modes }),
    reports,
    summary,
    generated_at: executionTimestamp,
    validation_fixture: true,
  };

  collection.validation = compactValidationEnvelope(
    validatePip360FullPipelineTestCollection(collection)
  );
  return collection;
}

export function buildPip360FullPipelineTestSummary({ reports = [] } = {}) {
  const safe = toArray(reports);
  return {
    total_scenarios: safe.length,
    passed_scenarios: safe.filter((entry) => entry.final_status === PIP_360_FULL_PIPELINE_FINAL_STATUSES.PASSED)
      .length,
    failed_scenarios: safe.filter((entry) => entry.final_status === PIP_360_FULL_PIPELINE_FINAL_STATUSES.FAILED)
      .length,
    blocked_scenarios: safe.filter((entry) => entry.final_status === PIP_360_FULL_PIPELINE_FINAL_STATUSES.BLOCKED)
      .length,
    partial_scenarios: safe.filter((entry) => entry.final_status === PIP_360_FULL_PIPELINE_FINAL_STATUSES.PARTIAL)
      .length,
    total_stages: safe.reduce((sum, entry) => sum + toArray(entry.stage_receipts).length, 0),
    passed_stages: safe.reduce((sum, entry) => sum + Number(entry.passed_stage_count ?? 0), 0),
    failed_stages: safe.reduce((sum, entry) => sum + Number(entry.failed_stage_count ?? 0), 0),
    blocked_stages: safe.reduce((sum, entry) => sum + Number(entry.blocked_stage_count ?? 0), 0),
    manual_action_required_stages: safe.reduce(
      (sum, entry) => sum + Number(entry.manual_action_required_count ?? 0),
      0
    ),
    verified_lineage_edges: safe.reduce(
      (sum, entry) =>
        sum +
        toArray(entry.lineage_ledger).filter((edge) => edge.lineage_status === "VERIFIED").length,
      0
    ),
    invalid_lineage_edges: safe.reduce(
      (sum, entry) =>
        sum +
        toArray(entry.lineage_ledger).filter((edge) => edge.lineage_status === "INVALID").length,
      0
    ),
    production_operation_count: safe.reduce(
      (sum, entry) => sum + Number(entry.production_operation_count ?? 0),
      0
    ),
    external_network_request_count: safe.reduce(
      (sum, entry) => sum + Number(entry.external_network_request_count ?? 0),
      0
    ),
    browser_storage_mutation_count: safe.reduce(
      (sum, entry) => sum + Number(entry.browser_storage_mutation_count ?? 0),
      0
    ),
    central_repository_mutation_count: safe.reduce(
      (sum, entry) => sum + Number(entry.central_repository_mutation_count ?? 0),
      0
    ),
    fixtures_excluded_from_production_totals: true,
    validation_fixture: true,
  };
}

export function createPip360FullPipelineTestExportFileName({
  generatedAt = "2027-01-02T10:00:00.000Z",
  scope = "P134",
} = {}) {
  const stamp = sanitizeText(generatedAt, 64)
    .replace(/[:.]/g, "-")
    .replace(/\s+/g, "_");
  const safeScope = sanitizeText(scope, 32).replace(/[^A-Za-z0-9_-]/g, "_") || "P134";
  return `pip-360-full-pipeline-test-${safeScope}-${stamp}.json`;
}

export function sanitizePip360FullPipelineTestExport(payload = {}) {
  return sanitizePip360FullPipelineContractExport(payload);
}

export function serializePip360FullPipelineTestExport(payload = {}) {
  return JSON.stringify(sanitizePip360FullPipelineTestExport(payload), null, 2);
}

export function buildPip360FullPipelineValidationFixture({
  executionTimestamp = "2027-01-02T10:00:00.000Z",
} = {}) {
  const collection = runPip360FullPipelineTestCollection({ executionTimestamp });
  const reports = toArray(collection.reports);

  const reportByMode = Object.fromEntries(
    reports.map((report) => [report.test_mode, report])
  );

  const complete = reportByMode[PIP_360_FULL_PIPELINE_TEST_MODES.COMPLETE_SANITIZED_FIXTURE];
  const missingApproval =
    reportByMode[PIP_360_FULL_PIPELINE_TEST_MODES.MISSING_HUMAN_APPROVAL];
  const invalidIngestion =
    reportByMode[PIP_360_FULL_PIPELINE_TEST_MODES.INVALID_INGESTION];
  const duplicate =
    reportByMode[PIP_360_FULL_PIPELINE_TEST_MODES.DUPLICATE_SOURCE_SIGNAL];
  const invalidLineage =
    reportByMode[PIP_360_FULL_PIPELINE_TEST_MODES.INVALID_LINEAGE];

  const checks = {
    complete_has_11_stage_receipts:
      toArray(complete?.stage_receipts).length === 11,
    complete_has_10_lineage_edges:
      toArray(complete?.lineage_ledger).length === 10,
    complete_all_stages_passed: Number(complete?.passed_stage_count ?? 0) === 11,
    complete_final_status_passed:
      complete?.final_status === PIP_360_FULL_PIPELINE_FINAL_STATUSES.PASSED,
    complete_lineage_all_verified:
      toArray(complete?.lineage_ledger).every((edge) => edge.lineage_status === "VERIFIED"),
    missing_approval_manual_action_required:
      toArray(missingApproval?.stage_receipts).some(
        (entry) =>
          entry.stage === PIP_360_FULL_PIPELINE_STAGES.HUMAN_APPROVAL &&
          entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.MANUAL_ACTION_REQUIRED
      ),
    missing_approval_blocks_9_11:
      toArray(missingApproval?.stage_receipts)
        .filter((entry) =>
          [
            PIP_360_FULL_PIPELINE_STAGES.CONTENT_BRIEF,
            PIP_360_FULL_PIPELINE_STAGES.PUBLICATION_RECORD,
            PIP_360_FULL_PIPELINE_STAGES.OUTCOME_MONITORING,
          ].includes(entry.stage)
        )
        .every((entry) => entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED),
    invalid_ingestion_validation_failed:
      toArray(invalidIngestion?.stage_receipts).some(
        (entry) =>
          entry.stage === PIP_360_FULL_PIPELINE_STAGES.VALIDATION &&
          entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED
      ),
    invalid_ingestion_blocks_4_11:
      toArray(invalidIngestion?.stage_receipts)
        .filter((entry) => Number(entry.stage_index) >= 4)
        .every((entry) =>
          entry.stage === PIP_360_FULL_PIPELINE_STAGES.VALIDATION
            ? entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.FAILED
            : entry.status === PIP_360_FULL_PIPELINE_STAGE_STATUSES.BLOCKED
        ),
    duplicate_detected:
      toArray(duplicate?.stage_receipts).some(
        (entry) =>
          entry.stage === PIP_360_FULL_PIPELINE_STAGES.INGESTION &&
          Number(entry.duplicate_record_count ?? 0) > 0
      ),
    duplicate_reason_recorded:
      toArray(duplicate?.stage_receipts).some(
        (entry) =>
          entry.stage === PIP_360_FULL_PIPELINE_STAGES.INGESTION &&
          String(entry.payload?.duplicate_removal_reason ?? "").includes(
            PIP_360_FULL_PIPELINE_REASON_CODES.DUPLICATE_REMOVAL_REASON_RECORDED
          )
      ),
    invalid_lineage_detected:
      toArray(invalidLineage?.lineage_ledger).some(
        (edge) => edge.lineage_status === "INVALID"
      ),
  };

  return {
    collection,
    checks,
    summary: collection.summary,
    validation_fixture: true,
  };
}
