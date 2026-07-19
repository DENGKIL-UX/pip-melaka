import {
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EVIDENCE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EXPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES,
  buildPipPublicCommunicationEffectivenessLibraryContractManifest,
  sanitizePipPublicCommunicationEffectivenessExport as sanitizeExport,
  validatePipPublicCommunicationEffectivenessEntry,
  validatePipPublicCommunicationEffectivenessEvidence,
  validatePipPublicCommunicationEffectivenessLibrary,
} from "./pip-public-communication-effectiveness-library-contract.js";
import {
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_SUPPLEMENTAL_OUTCOME_CLASSIFICATIONS,
  validatePipPublicCommunicationOutcomeClassificationResult,
} from "./pip-public-communication-outcome-classification-contract.js";

const DEFAULT_EVALUATION_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const DIMENSION_ORDER = Object.freeze([
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.CONFUSION_REDUCTION,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.MISINFORMATION_CORRECTION,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.VERIFIED_INFORMATION_REACH,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.FOLLOW_UP_REQUIREMENT,
  PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.UNINTENDED_ISSUES,
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 420) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeUpper(value, max = 180, fallback = "") {
  const text = sanitizeText(value, max).toUpperCase();
  return text || fallback;
}

function normalizeIso(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function unique(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function stableStringify(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return '"[CircularArray]"';
    seen.add(value);
    return `[${value.map((entry) => stableStringify(entry, seen)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) return '"[CircularObject]"';
    seen.add(value);
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function aliasLooksValid(alias) {
  return /^LIB-[A-Z0-9]{8}$/.test(sanitizeUpper(alias, 32));
}

function roleAuthorized(role) {
  return ["ANALYST", "ADMINISTRATOR"].includes(sanitizeUpper(role, 80));
}

function resolveEvaluationTimestamp(value) {
  return normalizeIso(value) ?? DEFAULT_EVALUATION_TIMESTAMP;
}

function makeDimensionResult({
  dimension,
  observationStatus,
  supportingReasonCodes = [],
  supportingWindowTypes = [],
  supportingEvidenceReferenceIds = [],
  baselineValue = null,
  finalValue = null,
  observedDelta = null,
  evidenceCoveragePercent = 0,
  uncertaintyNotes = [],
}) {
  return {
    dimension,
    observation_status: observationStatus,
    supporting_reason_codes: unique(supportingReasonCodes),
    supporting_window_types: unique(supportingWindowTypes),
    supporting_evidence_reference_ids: unique(supportingEvidenceReferenceIds),
    baseline_value: baselineValue,
    final_value: finalValue,
    observed_delta: observedDelta,
    evidence_coverage_percent: Number(evidenceCoveragePercent ?? 0),
    uncertainty_notes: unique(uncertaintyNotes),
    causal_attribution_status: "NOT_PERFORMED",
    reviewer_confirmation_required: true,
  };
}

function flattenEvidenceReferences(evidencePackage = {}) {
  return unique([
    ...toArray(evidencePackage.supporting_evidence_reference_ids),
    ...toArray(
      evidencePackage.misinformation_correction_evidence?.independent_evidence_reference_ids
    ),
    ...toArray(evidencePackage.unintended_issue_evidence?.evidence_reference_ids),
  ].map((entry) => sanitizeText(entry, 180)));
}

function calculateShareDelta(shares, field) {
  const baseline = Number(shares?.PRE_PUBLICATION_24H?.[field]);
  const finalValue = Number(shares?.POST_PUBLICATION_72H?.[field]);
  if (!Number.isFinite(baseline) || !Number.isFinite(finalValue)) return null;
  return Number((finalValue - baseline).toFixed(4));
}

function evaluateEligibility({ classificationResult, evidencePackage }) {
  const classificationValidation = validatePipPublicCommunicationOutcomeClassificationResult(
    classificationResult
  );
  const evidenceValidation = validatePipPublicCommunicationEffectivenessEvidence(
    evidencePackage
  );
  const classification = classificationValidation.normalized;
  const evidence = evidenceValidation.normalized;
  const fixtureMode =
    classification.validation_fixture === true || evidence.validation_fixture === true;

  const checks = {
    classification_valid: classificationValidation.valid === true,
    classification_schema:
      classification.schema === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    classification_confirmed:
      classification.review_status ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.CONFIRMED,
    confirmed_primary_present: Boolean(classification.confirmed_primary_classification),
    source_classification_fingerprint_match:
      sanitizeText(classification.outcome_classification_result_id, 180).length > 0 &&
      sanitizeText(classification.outcome_classification_result_id, 180) ===
        sanitizeText(evidence.source_classification_result_id, 180) &&
      sanitizeText(
        classification.source_observation_case_fingerprint,
        180
      ) === sanitizeText(evidence.source_observation_case_fingerprint, 180),
    source_result_fingerprint_match:
      sanitizeText(stableHash(classification), 180).length > 0 &&
      sanitizeText(evidence.source_classification_result_fingerprint, 180) ===
        stableHash(classification),
    evidence_valid: evidenceValidation.valid === true,
    evidence_lineage:
      sanitizeUpper(evidence.evidence_lineage_status, 120, "VALID") === "VALID",
    source_not_fixture: fixtureMode === true || classification.validation_fixture !== true,
    causal_not_performed:
      classification.causal_attribution_status === "NOT_PERFORMED",
    effectiveness_not_established:
      classification.publication_effectiveness_claim_status === "NOT_ESTABLISHED",
  };

  const blockReasons = [];
  if (!checks.classification_valid) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SOURCE_CLASSIFICATION_RESULT_INVALID
    );
  }
  if (!checks.classification_confirmed) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SOURCE_CLASSIFICATION_NOT_CONFIRMED
    );
  }
  if (!checks.confirmed_primary_present) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SOURCE_CONFIRMED_PRIMARY_CLASSIFICATION_MISSING
    );
  }
  if (!checks.source_result_fingerprint_match) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SOURCE_CLASSIFICATION_FINGERPRINT_MISMATCH
    );
  }
  if (!checks.source_classification_fingerprint_match) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SOURCE_OBSERVATION_FINGERPRINT_MISMATCH
    );
  }
  if (!checks.evidence_valid) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.EVIDENCE_PACKAGE_INVALID
    );
  }
  if (!checks.evidence_lineage) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.EVIDENCE_LINEAGE_REQUIRED
    );
  }
  if (!checks.source_not_fixture) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SOURCE_CLASSIFICATION_FIXTURE_BLOCKED
    );
  }
  if (!checks.causal_not_performed) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.CAUSAL_ATTRIBUTION_NOT_PERMITTED
    );
  }
  if (!checks.effectiveness_not_established) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.PUBLICATION_EFFECTIVENESS_CLAIM_NOT_PERMITTED
    );
  }

  return {
    classification,
    evidence,
    checks,
    block_reasons: unique(blockReasons),
    valid: blockReasons.length === 0,
    fixture_mode: fixtureMode,
  };
}

export function evaluatePipPublicCommunicationEffectivenessEvidence({
  classificationResult,
  evidencePackage,
  evaluationTimestamp,
} = {}) {
  const eligibility = evaluateEligibility({
    classificationResult,
    evidencePackage,
  });
  const classification = eligibility.classification;
  const evidence = eligibility.evidence;
  const evaluationIso = resolveEvaluationTimestamp(evaluationTimestamp || evidence.evaluation_timestamp);
  const materialThreshold = Number(
    classification.applied_thresholds?.material_change_percentage_points ?? 10
  );
  const shares = isPlainObject(evidence.calculated_window_shares)
    ? evidence.calculated_window_shares
    : isPlainObject(classification.calculated_window_shares)
      ? classification.calculated_window_shares
      : {};
  const deltas = isPlainObject(evidence.calculated_window_deltas)
    ? evidence.calculated_window_deltas
    : isPlainObject(classification.calculated_window_deltas)
      ? classification.calculated_window_deltas
      : {};
  const correctionEvidence = evidence.misinformation_correction_evidence;
  const unintendedIssueEvidence = evidence.unintended_issue_evidence;
  const supportingEvidenceReferenceIds = flattenEvidenceReferences(evidence);
  const supplemental = toArray(classification.supplemental_classifications);

  const confusionDelta = Number(
    deltas.confusion_share_delta_percentage_points ??
      calculateShareDelta(shares, "confusion_share_percent")
  );
  const verifiedDelta = Number(
    deltas.verified_information_share_delta_percentage_points ??
      calculateShareDelta(shares, "verified_information_share_percent")
  );
  const baselineConfusion = Number(shares?.PRE_PUBLICATION_24H?.confusion_share_percent);
  const finalConfusion = Number(shares?.POST_PUBLICATION_72H?.confusion_share_percent);
  const baselineVerified = Number(
    shares?.PRE_PUBLICATION_24H?.verified_information_share_percent
  );
  const finalVerified = Number(
    shares?.POST_PUBLICATION_72H?.verified_information_share_percent
  );
  const baselineEngagementShare = Number(
    shares?.PRE_PUBLICATION_24H?.verified_information_engagement_share_percent
  );
  const finalEngagementShare = Number(
    shares?.POST_PUBLICATION_72H?.verified_information_engagement_share_percent
  );
  const verifiedEngagementDelta =
    Number.isFinite(baselineEngagementShare) && Number.isFinite(finalEngagementShare)
      ? Number((finalEngagementShare - baselineEngagementShare).toFixed(4))
      : null;

  const dimensionResults = [];
  const learningTags = [
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.HUMAN_REVIEW_REQUIRED,
  ];

  const confusionObserved =
    classification.confirmed_primary_classification ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING &&
    Number.isFinite(confusionDelta) &&
    confusionDelta <= -materialThreshold;
  dimensionResults.push(
    makeDimensionResult({
      dimension: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.CONFUSION_REDUCTION,
      observationStatus:
        eligibility.valid !== true
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
          : Number.isFinite(confusionDelta)
            ? confusionObserved
              ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.OBSERVED
              : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.NOT_OBSERVED
            : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE,
      supportingReasonCodes: [
        confusionObserved
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.CONFUSION_REDUCTION_OBSERVED
          : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.CONFUSION_REDUCTION_NOT_OBSERVED,
      ],
      supportingWindowTypes: ["PRE_PUBLICATION_24H", "POST_PUBLICATION_72H"],
      supportingEvidenceReferenceIds,
      baselineValue: Number.isFinite(baselineConfusion) ? baselineConfusion : null,
      finalValue: Number.isFinite(finalConfusion) ? finalConfusion : null,
      observedDelta: Number.isFinite(confusionDelta) ? confusionDelta : null,
      evidenceCoveragePercent: evidence.evidence_coverage_percent,
      uncertaintyNotes: evidence.uncertainty_notes,
    })
  );
  if (confusionObserved) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.CONFUSION_REDUCTION_OBSERVED
    );
  }

  const correctionObserved =
    correctionEvidence !== null &&
    Number(correctionEvidence.unsupported_claim_signal_count_final) <
      Number(correctionEvidence.unsupported_claim_signal_count_baseline) &&
    Number(correctionEvidence.verified_correction_reference_count) > 0;
  dimensionResults.push(
    makeDimensionResult({
      dimension:
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.MISINFORMATION_CORRECTION,
      observationStatus:
        eligibility.valid !== true
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
          : correctionEvidence === null
            ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
            : correctionObserved
              ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.OBSERVED
              : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.NOT_OBSERVED,
      supportingReasonCodes: [
        correctionEvidence === null
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.MISINFORMATION_CORRECTION_INSUFFICIENT_EVIDENCE
          : correctionObserved
            ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.MISINFORMATION_CORRECTION_OBSERVED
            : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.MISINFORMATION_CORRECTION_INSUFFICIENT_EVIDENCE,
      ],
      supportingWindowTypes: ["PRE_PUBLICATION_24H", "POST_PUBLICATION_72H"],
      supportingEvidenceReferenceIds: unique([
        ...supportingEvidenceReferenceIds,
        ...toArray(correctionEvidence?.independent_evidence_reference_ids),
      ]),
      baselineValue:
        correctionEvidence !== null
          ? Number(correctionEvidence.unsupported_claim_signal_count_baseline)
          : null,
      finalValue:
        correctionEvidence !== null
          ? Number(correctionEvidence.unsupported_claim_signal_count_final)
          : null,
      observedDelta:
        correctionEvidence !== null
          ? Number(correctionEvidence.unsupported_claim_signal_count_final) -
            Number(correctionEvidence.unsupported_claim_signal_count_baseline)
          : null,
      evidenceCoveragePercent: evidence.evidence_coverage_percent,
      uncertaintyNotes: evidence.uncertainty_notes,
    })
  );
  if (correctionObserved) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.CORRECTION_VISIBILITY_OBSERVED
    );
  }

  const verifiedObserved =
    (Number.isFinite(verifiedDelta) && verifiedDelta >= materialThreshold) ||
    (Number.isFinite(verifiedEngagementDelta) && verifiedEngagementDelta >= materialThreshold);
  dimensionResults.push(
    makeDimensionResult({
      dimension:
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.VERIFIED_INFORMATION_REACH,
      observationStatus:
        eligibility.valid !== true
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
          : Number.isFinite(verifiedDelta) || Number.isFinite(verifiedEngagementDelta)
            ? verifiedObserved
              ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.OBSERVED
              : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.NOT_OBSERVED
            : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE,
      supportingReasonCodes: [
        verifiedObserved
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.VERIFIED_INFORMATION_REACH_OBSERVED
          : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.VERIFIED_INFORMATION_REACH_NOT_OBSERVED,
      ],
      supportingWindowTypes: ["PRE_PUBLICATION_24H", "POST_PUBLICATION_72H"],
      supportingEvidenceReferenceIds,
      baselineValue: Number.isFinite(baselineVerified) ? baselineVerified : baselineEngagementShare,
      finalValue: Number.isFinite(finalVerified) ? finalVerified : finalEngagementShare,
      observedDelta: Number.isFinite(verifiedDelta) ? verifiedDelta : verifiedEngagementDelta,
      evidenceCoveragePercent: evidence.evidence_coverage_percent,
      uncertaintyNotes: evidence.uncertainty_notes,
    })
  );
  if (verifiedObserved) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.VERIFIED_INFORMATION_REACH_INCREASE_OBSERVED
    );
  }

  const followUpObserved =
    supplemental.includes("SECOND_RESPONSE_REQUIRED") &&
    classification.review_status ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.CONFIRMED;
  dimensionResults.push(
    makeDimensionResult({
      dimension: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.FOLLOW_UP_REQUIREMENT,
      observationStatus:
        eligibility.valid !== true
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
          : followUpObserved
            ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.OBSERVED
            : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.NOT_OBSERVED,
      supportingReasonCodes: [
        followUpObserved
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.FOLLOW_UP_REQUIRED_CONFIRMED
          : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.FOLLOW_UP_NOT_AUTOMATIC,
      ],
      supportingWindowTypes: classification.supporting_window_types,
      supportingEvidenceReferenceIds,
      evidenceCoveragePercent: evidence.evidence_coverage_percent,
      uncertaintyNotes: evidence.uncertainty_notes,
    })
  );
  if (followUpObserved) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.FOLLOW_UP_REQUIRED
    );
  }

  const unintendedIssueObserved =
    classification.confirmed_primary_classification ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED &&
    unintendedIssueEvidence !== null &&
    toArray(unintendedIssueEvidence.evidence_reference_ids).length >= 1 &&
    Number(unintendedIssueEvidence.independent_source_count) >= 1;
  const unintendedStatus =
    eligibility.valid !== true
      ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
      : classification.confirmed_primary_classification ===
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED
        ? unintendedIssueEvidence === null
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
          : unintendedIssueObserved
            ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.OBSERVED
            : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.NOT_OBSERVED
        : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.NOT_APPLICABLE;
  dimensionResults.push(
    makeDimensionResult({
      dimension: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.UNINTENDED_ISSUES,
      observationStatus: unintendedStatus,
      supportingReasonCodes: [
        unintendedIssueObserved
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.UNINTENDED_ISSUE_OBSERVED
          : PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REASON_CODES.UNINTENDED_ISSUE_NOT_OBSERVED,
      ],
      supportingWindowTypes: classification.supporting_window_types,
      supportingEvidenceReferenceIds: unique([
        ...supportingEvidenceReferenceIds,
        ...toArray(unintendedIssueEvidence?.evidence_reference_ids),
      ]),
      baselineValue: null,
      finalValue: null,
      observedDelta: null,
      evidenceCoveragePercent: evidence.evidence_coverage_percent,
      uncertaintyNotes: evidence.uncertainty_notes,
    })
  );
  if (unintendedIssueObserved) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.UNINTENDED_ISSUE_OBSERVED
    );
  }

  const observedDimensions = dimensionResults.filter(
    (entry) =>
      entry.observation_status ===
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.OBSERVED
  );
  const insufficientDimensions = dimensionResults.filter(
    (entry) =>
      entry.observation_status ===
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_OBSERVATION_STATUSES.INSUFFICIENT_EVIDENCE
  );
  if (classification.confirmed_primary_classification === "RESPONSE_NOT_SEEN") {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.RESPONSE_VISIBILITY_LOW
    );
  }
  if (observedDimensions.length === 0 && insufficientDimensions.length === 0) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.NO_MATERIAL_CHANGE_OBSERVED
    );
  }
  if (
    observedDimensions.some((entry) =>
      [
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.CONFUSION_REDUCTION,
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.VERIFIED_INFORMATION_REACH,
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.MISINFORMATION_CORRECTION,
      ].includes(entry.dimension)
    ) &&
    observedDimensions.some((entry) =>
      [
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.FOLLOW_UP_REQUIREMENT,
        PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.UNINTENDED_ISSUES,
      ].includes(entry.dimension)
    )
  ) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.MIXED_OBSERVATIONS
    );
  }
  if (insufficientDimensions.length > 0 || eligibility.valid !== true) {
    learningTags.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LEARNING_TAGS.INSUFFICIENT_EVIDENCE
    );
  }

  return {
    valid: eligibility.valid,
    dimension_results: dimensionResults,
    learning_tags: unique(learningTags),
    block_reasons: eligibility.block_reasons,
    supporting_evidence_reference_ids: supportingEvidenceReferenceIds,
    uncertainty_notes: evidence.uncertainty_notes,
    causal_attribution_status: "NOT_PERFORMED",
    publication_effectiveness_claim_status: "NOT_ESTABLISHED",
    evaluation_timestamp: evaluationIso,
  };
}

export function buildPipPublicCommunicationEffectivenessEntry({
  classificationResult,
  evidencePackage,
  evaluationTimestamp,
} = {}) {
  const payloadText = stableStringify(evidencePackage);
  if (/raw[_\s-]*public|raw[_\s-]*text|caption|comment/i.test(payloadText)) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.RAW_PUBLIC_CONTENT_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/@|public_account_handle|username|account_name/i.test(payloadText)) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/voter[_ -]?id|voter[_ -]?record/i.test(payloadText)) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.VOTER_DATA_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/demographic[_ -]?profile|demographic_profile/i.test(payloadText)) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.DEMOGRAPHIC_PROFILE_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/automatic_response_generation_requested/i.test(payloadText)) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.AUTOMATIC_RESPONSE_GENERATION_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/automatic_content_generation_requested/i.test(payloadText)) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.AUTOMATIC_CONTENT_GENERATION_NOT_PERMITTED,
        ],
      },
    };
  }

  const evaluation = evaluatePipPublicCommunicationEffectivenessEvidence({
    classificationResult,
    evidencePackage,
    evaluationTimestamp,
  });
  const source = validatePipPublicCommunicationOutcomeClassificationResult(
    classificationResult
  ).normalized;
  const evidence = validatePipPublicCommunicationEffectivenessEvidence(
    evidencePackage
  ).normalized;

  if (evaluation.valid !== true) {
    return {
      created: false,
      effectiveness_entry: null,
      evaluation,
    };
  }

  const evaluationIso = resolveEvaluationTimestamp(evaluationTimestamp);
  const entryId = `EFFLIB-${stableHash({
    sourceId: source.outcome_classification_result_id,
    evidenceId: evidence.effectiveness_evidence_id,
    evaluationIso,
  }).slice(-12)}`;

  const entry = validatePipPublicCommunicationEffectivenessEntry({
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ENTRY_SCHEMA,
    effectiveness_entry_id: entryId,
    source_effectiveness_evidence_id: evidence.effectiveness_evidence_id,
    source_classification_result_id: source.outcome_classification_result_id,
    source_classification_result_fingerprint: stableHash(source),
    source_observation_case_id: source.source_observation_case_id,
    source_publication_register_entry_id:
      evidence.source_publication_register_entry_id,
    dataset_scope: evidence.dataset_scope,
    confirmed_primary_classification: source.confirmed_primary_classification,
    supplemental_classifications: source.supplemental_classifications,
    dimension_results: evaluation.dimension_results,
    learning_tags: evaluation.learning_tags,
    supporting_evidence_reference_ids: evaluation.supporting_evidence_reference_ids,
    uncertainty_notes: evaluation.uncertainty_notes,
    causal_attribution_status: "NOT_PERFORMED",
    publication_effectiveness_claim_status: "NOT_ESTABLISHED",
    review_status:
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.PENDING_HUMAN_REVIEW,
    review_history: [
      {
        action: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.CREATE_LIBRARY_ENTRY,
        from_review_status: "NOT_CREATED",
        to_review_status:
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.PENDING_HUMAN_REVIEW,
        actor_role: "SYSTEM",
        actor_alias: "LIB-SYSTEM",
        note: "Effectiveness library entry generated from confirmed classification and sanitized evidence.",
        requested_at: evaluationIso,
      },
    ],
    supersedes_entry_id: "",
    superseded_by_entry_id: "",
    validation_fixture: evidence.validation_fixture === true,
    generated_at: evaluationIso,
  }).normalized;

  return {
    created: true,
    effectiveness_entry: entry,
    evaluation,
  };
}

export function recordPipPublicCommunicationEffectivenessReview({
  effectivenessEntry,
  action,
  actorRole,
  actorAlias,
  reviewNote,
  automatic = false,
  requestedAt,
} = {}) {
  const entry = validatePipPublicCommunicationEffectivenessEntry(effectivenessEntry).normalized;
  const normalizedAction = sanitizeUpper(action, 120);
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (automatic === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.AUTOMATIC_CONFIRMATION_NOT_PERMITTED
    );
  }
  if (!roleAuthorized(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }
  if (!sanitizeText(reviewNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.MANUAL_ACTION_REQUIRED
    );
  }
  if (
    entry.review_status === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.CONFIRMED ||
    entry.review_status === PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.SUPERSEDED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.CONFIRMED_ENTRY_IMMUTABLE
    );
  }
  if (normalizedAction === "DELETE_LIBRARY_ENTRY") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.DELETE_ACTION_NOT_SUPPORTED
    );
  }

  const supportedActions = [
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.CONFIRM_LIBRARY_ENTRY,
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.REJECT_LIBRARY_ENTRY,
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.RETURN_FOR_EVIDENCE,
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.ADD_REVIEW_NOTE,
  ];
  if (!supportedActions.includes(normalizedAction)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.MANUAL_ACTION_REQUIRED
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_effectiveness_entry: entry,
      evaluation: { valid: false, block_reasons: unique(reasons) },
    };
  }

  const nextStatus =
    normalizedAction ===
    PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.CONFIRM_LIBRARY_ENTRY
      ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.CONFIRMED
      : normalizedAction ===
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.REJECT_LIBRARY_ENTRY
        ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.REJECTED
        : normalizedAction ===
            PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.RETURN_FOR_EVIDENCE
          ? PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.RETURNED_FOR_EVIDENCE
          : entry.review_status;

  const updated = validatePipPublicCommunicationEffectivenessEntry({
    ...entry,
    review_status: nextStatus,
    review_history: [
      ...toArray(entry.review_history),
      {
        action: normalizedAction,
        from_review_status: entry.review_status,
        to_review_status: nextStatus,
        actor_role: role,
        actor_alias: alias,
        note: sanitizeText(reviewNote, 420),
        requested_at: resolveEvaluationTimestamp(requestedAt),
      },
    ],
  }).normalized;

  return {
    applied: true,
    updated_effectiveness_entry: updated,
    evaluation: { valid: true, block_reasons: [] },
  };
}

export function supersedePipPublicCommunicationEffectivenessEntry({
  effectivenessEntry,
  replacementClassificationResult,
  replacementEvidencePackage,
  actorRole,
  actorAlias,
  supersessionNote,
  evaluationTimestamp,
} = {}) {
  const entry = validatePipPublicCommunicationEffectivenessEntry(effectivenessEntry).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (!roleAuthorized(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }
  if (!sanitizeText(supersessionNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.SUPERSESSION_NOTE_REQUIRED
    );
  }
  if (
    entry.review_status !== PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.CONFIRMED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.CONFIRMED_ENTRY_IMMUTABLE
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_effectiveness_entry: entry,
      replacement_effectiveness_entry: null,
      evaluation: { valid: false, block_reasons: unique(reasons) },
    };
  }

  const replacement = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: replacementClassificationResult,
    evidencePackage: replacementEvidencePackage,
    evaluationTimestamp,
  });

  if (!replacement.created) {
    return {
      applied: false,
      updated_effectiveness_entry: entry,
      replacement_effectiveness_entry: null,
      evaluation: replacement.evaluation,
    };
  }

  const updatedOld = validatePipPublicCommunicationEffectivenessEntry({
    ...entry,
    review_status: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.SUPERSEDED,
    superseded_by_entry_id: replacement.effectiveness_entry.effectiveness_entry_id,
    review_history: [
      ...toArray(entry.review_history),
      {
        action: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.SUPERSEDE_LIBRARY_ENTRY,
        from_review_status: entry.review_status,
        to_review_status:
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_REVIEW_STATUSES.SUPERSEDED,
        actor_role: role,
        actor_alias: alias,
        note: sanitizeText(supersessionNote, 420),
        requested_at: resolveEvaluationTimestamp(evaluationTimestamp),
      },
    ],
  }).normalized;

  const replacementEntry = validatePipPublicCommunicationEffectivenessEntry({
    ...replacement.effectiveness_entry,
    supersedes_entry_id: entry.effectiveness_entry_id,
  }).normalized;

  return {
    applied: true,
    updated_effectiveness_entry: updatedOld,
    replacement_effectiveness_entry: replacementEntry,
    evaluation: { valid: true, block_reasons: [] },
  };
}

function countDimensionObserved(entries, dimension, status = "OBSERVED") {
  return toArray(entries).filter((entry) =>
    toArray(entry.dimension_results).some(
      (item) =>
        sanitizeUpper(item.dimension, 120) === dimension &&
        sanitizeUpper(item.observation_status, 120) === status
    )
  ).length;
}

export function buildPipPublicCommunicationEffectivenessSummary({
  sourceClassificationResultCount = 0,
  eligibleConfirmedClassificationCount = 0,
  productionEffectivenessEntries = [],
  fixtureEffectivenessEntries = [],
  blockedEntries = [],
  supersededEntries = [],
} = {}) {
  const allEntries = [
    ...toArray(productionEffectivenessEntries),
    ...toArray(fixtureEffectivenessEntries),
  ];
  return {
    source_classification_result_count: Number(sourceClassificationResultCount) || 0,
    eligible_confirmed_classification_count:
      Number(eligibleConfirmedClassificationCount) || 0,
    production_effectiveness_entry_count: toArray(productionEffectivenessEntries).length,
    fixture_effectiveness_entry_count: toArray(fixtureEffectivenessEntries).length,
    blocked_entry_count: toArray(blockedEntries).length,
    superseded_entry_count: toArray(supersededEntries).length,
    pending_human_review_count: allEntries.filter(
      (entry) => entry.review_status === "PENDING_HUMAN_REVIEW"
    ).length,
    confirmed_entry_count: allEntries.filter(
      (entry) => entry.review_status === "CONFIRMED"
    ).length,
    rejected_entry_count: allEntries.filter(
      (entry) => entry.review_status === "REJECTED"
    ).length,
    returned_for_evidence_count: allEntries.filter(
      (entry) => entry.review_status === "RETURNED_FOR_EVIDENCE"
    ).length,
    confusion_reduction_observed_count: countDimensionObserved(
      allEntries,
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.CONFUSION_REDUCTION
    ),
    misinformation_correction_observed_count: countDimensionObserved(
      allEntries,
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.MISINFORMATION_CORRECTION
    ),
    verified_information_reach_observed_count: countDimensionObserved(
      allEntries,
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.VERIFIED_INFORMATION_REACH
    ),
    follow_up_required_count: countDimensionObserved(
      allEntries,
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.FOLLOW_UP_REQUIREMENT
    ),
    unintended_issue_observed_count: countDimensionObserved(
      allEntries,
      PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_DIMENSIONS.UNINTENDED_ISSUES
    ),
    insufficient_evidence_dimension_count: allEntries.reduce(
      (total, entry) =>
        total +
        toArray(entry.dimension_results).filter(
          (item) => item.observation_status === "INSUFFICIENT_EVIDENCE"
        ).length,
      0
    ),
    causal_attribution_performed_count: 0,
    publication_effectiveness_claim_established_count: 0,
    automated_response_generated_count: 0,
    automated_content_generated_count: 0,
    fixture_excluded_from_production_total: true,
  };
}

function makeClassificationResult({
  id,
  confirmedPrimaryClassification,
  supplementalClassifications = [],
  reviewStatus = "CONFIRMED",
  validationFixture = true,
  classificationReasonCodes = [],
  confusionDelta = 0,
  verifiedDelta = 0,
}) {
  const shares = {
    PRE_PUBLICATION_24H: {
      confusion_share_percent: 40,
      verified_information_share_percent: 20,
      verified_information_engagement_share_percent: 20,
    },
    POST_PUBLICATION_72H: {
      confusion_share_percent: 40 + confusionDelta,
      verified_information_share_percent: 20 + verifiedDelta,
      verified_information_engagement_share_percent: 20 + verifiedDelta,
    },
  };
  return validatePipPublicCommunicationOutcomeClassificationResult({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    outcome_classification_result_id: `CLSRES-${id}`,
    source_classification_evidence_id: `CLSEVID-${id}`,
    source_observation_case_id: `OBSCASE-${id}`,
    source_observation_case_fingerprint: `OBSFP-${id}`,
    provisional_primary_classification: confirmedPrimaryClassification,
    confirmed_primary_classification:
      reviewStatus === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.CONFIRMED
        ? confirmedPrimaryClassification
        : "",
    supplemental_classifications: supplementalClassifications,
    classification_reason_codes: classificationReasonCodes,
    supporting_window_types: ["PRE_PUBLICATION_24H", "POST_PUBLICATION_72H"],
    supporting_evidence_reference_ids: [`https://example.invalid/evidence/${id}`],
    calculated_window_shares: shares,
    calculated_window_deltas: {
      confusion_share_delta_percentage_points: confusionDelta,
      verified_information_share_delta_percentage_points: verifiedDelta,
    },
    applied_thresholds: {
      material_change_percentage_points: 10,
    },
    evidence_coverage_percent: 85,
    uncertainty_notes: ["Fixture classification result."],
    causal_attribution_status: "NOT_PERFORMED",
    publication_effectiveness_claim_status: "NOT_ESTABLISHED",
    review_status: reviewStatus,
    review_history: [],
    validation_fixture: validationFixture,
    generated_at: DEFAULT_EVALUATION_TIMESTAMP,
  }).normalized;
}

function makeEffectivenessEvidence({
  id,
  classificationResult,
  coverage = 85,
  correctionEvidence = null,
  unintendedIssueEvidence = null,
  extra = {},
}) {
  return validatePipPublicCommunicationEffectivenessEvidence({
    effectiveness_evidence_id: `EFFEVID-${id}`,
    source_classification_result_id: classificationResult.outcome_classification_result_id,
    source_classification_result_fingerprint: stableHash(classificationResult),
    source_observation_case_id: classificationResult.source_observation_case_id,
    source_observation_case_fingerprint:
      classificationResult.source_observation_case_fingerprint,
    source_publication_register_entry_id: `PPR-${id}`,
    source_handoff_package_id: `PMH-${id}`,
    confirmed_primary_classification:
      classificationResult.confirmed_primary_classification,
    supplemental_classifications: classificationResult.supplemental_classifications,
    classification_reason_codes: classificationResult.classification_reason_codes,
    calculated_window_shares: classificationResult.calculated_window_shares,
    calculated_window_deltas: classificationResult.calculated_window_deltas,
    supporting_window_types: classificationResult.supporting_window_types,
    supporting_evidence_reference_ids:
      classificationResult.supporting_evidence_reference_ids,
    evidence_coverage_percent: coverage,
    evaluation_timestamp: "2027-01-05T00:00:00.000Z",
    dataset_scope: "PUBLIC_AGGREGATE_LEARNING",
    validation_fixture: true,
    misinformation_correction_evidence: correctionEvidence,
    unintended_issue_evidence: unintendedIssueEvidence,
    uncertainty_notes: ["Fixture effectiveness evidence."],
    evidence_lineage_status: "VALID",
    ...extra,
  }).normalized;
}

export function buildPipPublicCommunicationEffectivenessValidationFixture() {
  const confusionObservedClassification = makeClassificationResult({
    id: "65C-CONFUSION-OBS",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING,
    classificationReasonCodes: ["IMPROVING_CONFUSION_REDUCTION"],
    confusionDelta: -15,
    verifiedDelta: 5,
  });
  const confusionNotObservedClassification = makeClassificationResult({
    id: "65C-CONFUSION-NOT",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.STABLE,
    classificationReasonCodes: ["STABLE_WITHIN_THRESHOLD"],
    confusionDelta: -4,
    verifiedDelta: 2,
  });
  const reachObservedClassification = makeClassificationResult({
    id: "65C-REACH-OBS",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING,
    classificationReasonCodes: ["IMPROVING_VERIFIED_INFORMATION_INCREASE"],
    confusionDelta: -2,
    verifiedDelta: 15,
  });
  const followUpClassification = makeClassificationResult({
    id: "65C-FOLLOW-UP",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING,
    supplementalClassifications: ["SECOND_RESPONSE_REQUIRED"],
    classificationReasonCodes: ["WORSENING_CONFUSION_INCREASE"],
    confusionDelta: 15,
    verifiedDelta: -5,
  });
  const worseningOnlyClassification = makeClassificationResult({
    id: "65C-WORSENING-NO-FOLLOWUP",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING,
    classificationReasonCodes: ["WORSENING_NEGATIVE_SENTIMENT_INCREASE"],
    confusionDelta: 12,
    verifiedDelta: -2,
  });
  const unintendedIssueClassification = makeClassificationResult({
    id: "65C-UNINTENDED",
    confirmedPrimaryClassification:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED,
    classificationReasonCodes: ["NEW_NARRATIVE_SUPPORTED"],
    confusionDelta: 0,
    verifiedDelta: 0,
  });
  const responseNotSeenClassification = makeClassificationResult({
    id: "65C-NO-MATERIAL",
    confirmedPrimaryClassification:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.RESPONSE_NOT_SEEN,
    classificationReasonCodes: ["RESPONSE_NOT_OBSERVED"],
    confusionDelta: 0,
    verifiedDelta: 0,
  });
  const pendingClassification = makeClassificationResult({
    id: "65C-PENDING",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING,
    reviewStatus:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.PENDING_HUMAN_REVIEW,
    confusionDelta: -15,
    verifiedDelta: 5,
  });
  const rejectedClassification = makeClassificationResult({
    id: "65C-REJECTED",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING,
    reviewStatus:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.REJECTED,
    confusionDelta: -15,
    verifiedDelta: 5,
  });
  const returnedClassification = makeClassificationResult({
    id: "65C-RETURNED",
    confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING,
    reviewStatus:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.RETURNED_FOR_EVIDENCE,
    confusionDelta: -15,
    verifiedDelta: 5,
  });

  const correctionObservedEvidence = makeEffectivenessEvidence({
    id: "65C-CORRECTION-OBS",
    classificationResult: confusionObservedClassification,
    correctionEvidence: {
      sanitized_claim_reference_id: "CLAIM-001",
      verified_correction_reference_id: "CORR-001",
      independent_evidence_reference_ids: ["https://example.invalid/evidence/corr-1"],
      unsupported_claim_signal_count_baseline: 12,
      unsupported_claim_signal_count_final: 4,
      verified_correction_reference_count: 2,
      evidence_review_status: "VERIFIED",
    },
  });

  const correctionInsufficientEvidence = makeEffectivenessEvidence({
    id: "65C-CORRECTION-MISSING",
    classificationResult: confusionObservedClassification,
    correctionEvidence: null,
  });

  const unintendedObservedEvidence = makeEffectivenessEvidence({
    id: "65C-UNINTENDED-EVIDENCE",
    classificationResult: unintendedIssueClassification,
    unintendedIssueEvidence: {
      unintended_issue_reference_id: "UI-001",
      unintended_issue_category: "SANITIZED_NARRATIVE_CATEGORY",
      first_observed_window: "POST_PUBLICATION_24H",
      evidence_reference_ids: ["https://example.invalid/evidence/ui-1"],
      independent_source_count: 2,
      review_status: "VERIFIED",
    },
  });

  const negativeSentimentOnlyEvidence = makeEffectivenessEvidence({
    id: "65C-NEGATIVE-ONLY",
    classificationResult: makeClassificationResult({
      id: "65C-NEGATIVE-ONLY-CLS",
      confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING,
      classificationReasonCodes: ["WORSENING_NEGATIVE_SENTIMENT_INCREASE"],
      confusionDelta: 0,
      verifiedDelta: -1,
    }),
  });

  const confusionObservedEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-CONFUSION-OBS-EVID",
      classificationResult: confusionObservedClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const confusionNotObservedEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionNotObservedClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-CONFUSION-NOT-EVID",
      classificationResult: confusionNotObservedClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const reachObservedEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: reachObservedClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-REACH-OBS-EVID",
      classificationResult: reachObservedClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const correctionObservedEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: correctionObservedEvidence,
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const correctionInsufficientEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: correctionInsufficientEvidence,
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const followUpObservedEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: followUpClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-FOLLOWUP-EVID",
      classificationResult: followUpClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const followUpNotAutomaticEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: worseningOnlyClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-WORSENING-NO-FOLLOWUP-EVID",
      classificationResult: worseningOnlyClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const unintendedObservedEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: unintendedIssueClassification,
    evidencePackage: unintendedObservedEvidence,
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const negativeOnlyEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: negativeSentimentOnlyEvidence.source_classification_result_id
      ? makeClassificationResult({
          id: "65C-NEGATIVE-ONLY-CLS",
          confirmedPrimaryClassification: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING,
          classificationReasonCodes: ["WORSENING_NEGATIVE_SENTIMENT_INCREASE"],
          confusionDelta: 0,
          verifiedDelta: -1,
        })
      : worseningOnlyClassification,
    evidencePackage: negativeSentimentOnlyEvidence,
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const insufficientEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-INSUFFICIENT-EVID",
      classificationResult: confusionObservedClassification,
      coverage: 40,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const noMaterialChangeEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: responseNotSeenClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-NO-MATERIAL-EVID",
      classificationResult: responseNotSeenClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const mixedObservationsEntry = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: followUpClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-MIXED-EVID",
      classificationResult: followUpClassification,
      unintendedIssueEvidence: {
        unintended_issue_reference_id: "UI-002",
        unintended_issue_category: "SANITIZED_MIXED_CATEGORY",
        first_observed_window: "POST_PUBLICATION_72H",
        evidence_reference_ids: ["https://example.invalid/evidence/ui-2"],
        independent_source_count: 2,
        review_status: "VERIFIED",
      },
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });

  const pendingBlocked = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: pendingClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-PENDING-BLOCK",
      classificationResult: pendingClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const rejectedBlocked = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: rejectedClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-REJECT-BLOCK",
      classificationResult: rejectedClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const returnedBlocked = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: returnedClassification,
    evidencePackage: makeEffectivenessEvidence({
      id: "65C-RETURN-BLOCK",
      classificationResult: returnedClassification,
    }),
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const invalidFingerprintBlocked = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-FP-BLOCK",
        classificationResult: confusionObservedClassification,
      }),
      source_classification_result_fingerprint: "INVALID-FP",
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const missingLineageBlocked = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-LINEAGE-BLOCK",
        classificationResult: confusionObservedClassification,
      }),
      evidence_lineage_status: "MISSING",
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });

  const rawRejected = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-RAW-REJECT",
        classificationResult: confusionObservedClassification,
      }),
      raw_public_comment_text: "forbidden",
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const accountRejected = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-ACCOUNT-REJECT",
        classificationResult: confusionObservedClassification,
      }),
      public_account_handle: "@forbidden",
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const voterRejected = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-VOTER-REJECT",
        classificationResult: confusionObservedClassification,
      }),
      voter_record_id: "VOTER-1",
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const demographicRejected = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-DEMOGRAPHIC-REJECT",
        classificationResult: confusionObservedClassification,
      }),
      demographic_profile_label: "forbidden",
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const automaticResponseRejected = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-AUTO-RESP-REJECT",
        classificationResult: confusionObservedClassification,
      }),
      automatic_response_generation_requested: true,
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });
  const automaticContentRejected = buildPipPublicCommunicationEffectivenessEntry({
    classificationResult: confusionObservedClassification,
    evidencePackage: {
      ...makeEffectivenessEvidence({
        id: "65C-AUTO-CONTENT-REJECT",
        classificationResult: confusionObservedClassification,
      }),
      automatic_content_generation_requested: true,
    },
    evaluationTimestamp: "2027-01-05T00:00:00.000Z",
  });

  const confirmedEntry = recordPipPublicCommunicationEffectivenessReview({
    effectivenessEntry: confusionObservedEntry.effectiveness_entry,
    action: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.CONFIRM_LIBRARY_ENTRY,
    actorRole: "ADMINISTRATOR",
    actorAlias: "LIB-65C00001",
    reviewNote: "Confirmed for fixture review.",
    requestedAt: "2027-01-05T00:10:00.000Z",
  });
  const immutableConfirmedBlocked = recordPipPublicCommunicationEffectivenessReview({
    effectivenessEntry: confirmedEntry.updated_effectiveness_entry,
    action: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.RETURN_FOR_EVIDENCE,
    actorRole: "ADMINISTRATOR",
    actorAlias: "LIB-65C00002",
    reviewNote: "Should fail because confirmed entries are immutable.",
    requestedAt: "2027-01-05T00:20:00.000Z",
  });
  const automaticConfirmationBlocked = recordPipPublicCommunicationEffectivenessReview({
    effectivenessEntry: confusionNotObservedEntry.effectiveness_entry,
    action: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_ACTIONS.CONFIRM_LIBRARY_ENTRY,
    actorRole: "ADMINISTRATOR",
    actorAlias: "LIB-65C00003",
    reviewNote: "Should fail automatically.",
    automatic: true,
    requestedAt: "2027-01-05T00:20:00.000Z",
  });
  const deleteBlocked = recordPipPublicCommunicationEffectivenessReview({
    effectivenessEntry: confusionNotObservedEntry.effectiveness_entry,
    action: "DELETE_LIBRARY_ENTRY",
    actorRole: "ADMINISTRATOR",
    actorAlias: "LIB-65C00004",
    reviewNote: "Delete not supported.",
    requestedAt: "2027-01-05T00:20:00.000Z",
  });

  const superseded = supersedePipPublicCommunicationEffectivenessEntry({
    effectivenessEntry: confirmedEntry.updated_effectiveness_entry,
    replacementClassificationResult: reachObservedClassification,
    replacementEvidencePackage: makeEffectivenessEvidence({
      id: "65C-SUPERSEDE-EVID",
      classificationResult: reachObservedClassification,
      correctionEvidence: {
        sanitized_claim_reference_id: "CLAIM-002",
        verified_correction_reference_id: "CORR-002",
        independent_evidence_reference_ids: ["https://example.invalid/evidence/corr-2"],
        unsupported_claim_signal_count_baseline: 10,
        unsupported_claim_signal_count_final: 3,
        verified_correction_reference_count: 1,
        evidence_review_status: "VERIFIED",
      },
    }),
    actorRole: "ADMINISTRATOR",
    actorAlias: "LIB-65C00005",
    supersessionNote: "Superseded with refined learning evidence.",
    evaluationTimestamp: "2027-01-05T00:30:00.000Z",
  });

  const fixtureEntries = [
    confusionObservedEntry.effectiveness_entry,
    confusionNotObservedEntry.effectiveness_entry,
    reachObservedEntry.effectiveness_entry,
    correctionObservedEntry.effectiveness_entry,
    followUpObservedEntry.effectiveness_entry,
    unintendedObservedEntry.effectiveness_entry,
    insufficientEntry.effectiveness_entry,
    mixedObservationsEntry.effectiveness_entry,
    noMaterialChangeEntry.effectiveness_entry,
  ].filter(Boolean);

  const supersededEntries = [superseded.updated_effectiveness_entry].filter(Boolean);

  const library = validatePipPublicCommunicationEffectivenessLibrary({
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
    generated_at: "2027-01-05T00:40:00.000Z",
    production_effectiveness_entries: [],
    fixture_effectiveness_entries: fixtureEntries,
    blocked_entries: [],
    superseded_entries: supersededEntries,
    validation: { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  }).normalized;

  library.summary = buildPipPublicCommunicationEffectivenessSummary({
    sourceClassificationResultCount: 10,
    eligibleConfirmedClassificationCount: fixtureEntries.length,
    productionEffectivenessEntries: [],
    fixtureEffectivenessEntries: fixtureEntries,
    blockedEntries: [],
    supersededEntries,
  });

  const checks = {
    all_five_dimensions_present: fixtureEntries.every(
      (entry) => toArray(entry.dimension_results).length === 5
    ),
    confusion_reduction_observed_fixture:
      toArray(confusionObservedEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "CONFUSION_REDUCTION" &&
          entry.observation_status === "OBSERVED"
      ),
    confusion_reduction_not_observed_fixture:
      toArray(confusionNotObservedEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "CONFUSION_REDUCTION" &&
          entry.observation_status === "NOT_OBSERVED"
      ),
    correction_evidence_observed_fixture:
      toArray(correctionObservedEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "MISINFORMATION_CORRECTION" &&
          entry.observation_status === "OBSERVED"
      ),
    missing_correction_evidence_insufficient:
      toArray(correctionInsufficientEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "MISINFORMATION_CORRECTION" &&
          entry.observation_status === "INSUFFICIENT_EVIDENCE"
      ),
    verified_information_reach_observed_fixture:
      toArray(reachObservedEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "VERIFIED_INFORMATION_REACH" &&
          entry.observation_status === "OBSERVED"
      ),
    follow_up_requirement_requires_explicit_human_confirmation:
      toArray(followUpObservedEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "FOLLOW_UP_REQUIREMENT" &&
          entry.observation_status === "OBSERVED"
      ),
    worsening_alone_does_not_automatically_create_follow_up:
      toArray(followUpNotAutomaticEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "FOLLOW_UP_REQUIREMENT" &&
          entry.observation_status === "NOT_OBSERVED"
      ),
    unintended_issue_requires_explicit_evidence:
      toArray(unintendedObservedEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "UNINTENDED_ISSUES" &&
          entry.observation_status === "OBSERVED"
      ),
    negative_sentiment_alone_no_unintended_issue:
      toArray(negativeOnlyEntry.effectiveness_entry?.dimension_results).some(
        (entry) =>
          entry.dimension === "UNINTENDED_ISSUES" &&
          entry.observation_status !== "OBSERVED"
      ),
    pending_batch65b_blocked: pendingBlocked.created === false,
    rejected_batch65b_blocked: rejectedBlocked.created === false,
    returned_batch65b_blocked: returnedBlocked.created === false,
    invalid_source_fingerprint_blocked: invalidFingerprintBlocked.created === false,
    missing_evidence_lineage_blocked: missingLineageBlocked.created === false,
    all_entries_begin_pending_human_review: fixtureEntries.every(
      (entry) => entry.review_status === "PENDING_HUMAN_REVIEW"
    ),
    automatic_confirmation_rejected: automaticConfirmationBlocked.applied === false,
    confirmed_entry_immutable_protected:
      immutableConfirmedBlocked.applied === false,
    supersession_creates_new_linked_entry:
      superseded.applied === true &&
      superseded.updated_effectiveness_entry?.superseded_by_entry_id ===
        superseded.replacement_effectiveness_entry?.effectiveness_entry_id &&
      superseded.replacement_effectiveness_entry?.supersedes_entry_id ===
        superseded.updated_effectiveness_entry?.effectiveness_entry_id,
    deletion_rejected: deleteBlocked.applied === false,
    causal_attribution_not_performed: fixtureEntries.every(
      (entry) => entry.causal_attribution_status === "NOT_PERFORMED"
    ),
    effectiveness_claim_not_established: fixtureEntries.every(
      (entry) => entry.publication_effectiveness_claim_status === "NOT_ESTABLISHED"
    ),
    no_response_case_generated: fixtureEntries.every(
      (entry) => !("response_case_id" in entry)
    ),
    no_content_generated: fixtureEntries.every(
      (entry) => !("content_package_id" in entry)
    ),
    production_totals_exclude_fixtures:
      library.summary.production_effectiveness_entry_count === 0 &&
      library.summary.fixture_excluded_from_production_total === true,
    raw_public_content_rejected: rawRejected.created === false,
    public_account_identity_rejected: accountRejected.created === false,
    voter_data_rejected: voterRejected.created === false,
    demographic_profiles_rejected: demographicRejected.created === false,
    automatic_response_generation_rejected:
      automaticResponseRejected.created === false,
    automatic_content_generation_rejected:
      automaticContentRejected.created === false,
  };

  const exportPayload = sanitizeExport({
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_EXPORT_SCHEMA,
    generated_at: "2027-01-05T00:40:00.000Z",
    manifest: buildPipPublicCommunicationEffectivenessLibraryContractManifest({
      generatedAt: "2027-01-05T00:40:00.000Z",
    }),
    summary: library.summary,
    production_effectiveness_entries: [],
    fixture_effectiveness_entries: fixtureEntries,
    blocked_entries: [],
    superseded_entries: supersededEntries,
    collection_validation_result: library.validation,
    safety_manifest: library.safety,
  });

  return {
    library,
    checks,
    export_payload: exportPayload,
    fixture_inputs: {
      classifications: {
        confusionObservedClassification,
        confusionNotObservedClassification,
        reachObservedClassification,
        followUpClassification,
        worseningOnlyClassification,
        unintendedIssueClassification,
        responseNotSeenClassification,
      },
    },
  };
}

export function buildPipPublicCommunicationEffectivenessLibrary({
  classificationCollection,
  includeValidationFixtures = true,
  evaluationTimestamp,
} = {}) {
  const safe = isPlainObject(classificationCollection) ? classificationCollection : {};
  const productionEntries = [];
  const blockedEntries = [];
  const supersededEntries = [];

  toArray(safe.production_classification_results).forEach((classificationResult) => {
    const evidencePackage = isPlainObject(classificationResult?.effectiveness_evidence)
      ? classificationResult.effectiveness_evidence
      : null;
    if (!evidencePackage) {
      blockedEntries.push({
        source_classification_result_id:
          classificationResult?.outcome_classification_result_id ?? "UNKNOWN",
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_BLOCK_REASONS.EVIDENCE_PACKAGE_MISSING,
        ],
      });
      return;
    }
    const created = buildPipPublicCommunicationEffectivenessEntry({
      classificationResult,
      evidencePackage,
      evaluationTimestamp,
    });
    if (created.created) {
      productionEntries.push(created.effectiveness_entry);
    } else {
      blockedEntries.push({
        source_classification_result_id:
          classificationResult?.outcome_classification_result_id ?? "UNKNOWN",
        block_reasons: created.evaluation.block_reasons,
      });
    }
  });

  const fixture = includeValidationFixtures
    ? buildPipPublicCommunicationEffectivenessValidationFixture()
    : { library: { fixture_effectiveness_entries: [], blocked_entries: [], superseded_entries: [] } };

  const library = validatePipPublicCommunicationEffectivenessLibrary({
    schema: PIP_PUBLIC_COMMUNICATION_EFFECTIVENESS_LIBRARY_SCHEMA,
    generated_at: resolveEvaluationTimestamp(evaluationTimestamp),
    production_effectiveness_entries: productionEntries,
    fixture_effectiveness_entries: fixture.library?.fixture_effectiveness_entries ?? [],
    blocked_entries: [
      ...blockedEntries,
      ...toArray(fixture.library?.blocked_entries),
    ],
    superseded_entries: fixture.library?.superseded_entries ?? [],
    validation: { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  }).normalized;

  library.summary = buildPipPublicCommunicationEffectivenessSummary({
    sourceClassificationResultCount:
      toArray(safe.production_classification_results).length +
      toArray(safe.fixture_classification_results).length,
    eligibleConfirmedClassificationCount: productionEntries.length,
    productionEffectivenessEntries: productionEntries,
    fixtureEffectivenessEntries: library.fixture_effectiveness_entries,
    blockedEntries: library.blocked_entries,
    supersededEntries: library.superseded_entries,
  });

  return library;
}

export function createPipPublicCommunicationEffectivenessExportFileName({
  generatedAt,
  scope = "P134",
  suffix = "effectiveness-library",
} = {}) {
  const iso = resolveEvaluationTimestamp(generatedAt);
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeSuffix = sanitizeText(suffix, 64).replace(/[^A-Za-z0-9_-]/g, "_");
  return `pip-public-communication-${safeSuffix}-${safeScope}-${compact}.json`;
}

export function sanitizePipPublicCommunicationEffectivenessExport(payload = {}) {
  return sanitizeExport(payload);
}

export function serializePipPublicCommunicationEffectivenessExport(payload = {}) {
  return JSON.stringify(
    sanitizePipPublicCommunicationEffectivenessExport(payload),
    null,
    2
  );
}
