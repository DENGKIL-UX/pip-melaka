import {
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_DEFAULT_THRESHOLDS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS,
  PIP_PUBLIC_COMMUNICATION_PRIMARY_OUTCOME_CLASSIFICATIONS,
  PIP_PUBLIC_COMMUNICATION_SUPPLEMENTAL_OUTCOME_CLASSIFICATIONS,
  buildPipPublicCommunicationOutcomeClassificationContractManifest,
  sanitizePipPublicCommunicationOutcomeClassificationExport as sanitizeExport,
  validatePipPublicCommunicationOutcomeClassificationCollection,
  validatePipPublicCommunicationOutcomeClassificationContractManifest,
  validatePipPublicCommunicationOutcomeClassificationEvidence,
  validatePipPublicCommunicationOutcomeClassificationResult,
} from "./pip-public-communication-outcome-classification-contract.js";

const REQUIRED_WINDOWS = Object.freeze([
  "PRE_PUBLICATION_24H",
  "POST_PUBLICATION_6H",
  "POST_PUBLICATION_12H",
  "POST_PUBLICATION_24H",
  "POST_PUBLICATION_72H",
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
  return /^CLS-[A-Z0-9]{8}$/.test(sanitizeUpper(alias, 32));
}

function roleAuthorized(role) {
  return ["ANALYST", "ADMINISTRATOR"].includes(sanitizeUpper(role, 80));
}

function buildThresholds(overrides = {}) {
  const manifest = buildPipPublicCommunicationOutcomeClassificationContractManifest({
    thresholds: overrides,
  });
  return manifest.thresholds;
}

function toPercentShare(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return Number(((numerator / denominator) * 100).toFixed(4));
}

function flattenEvidenceReferenceIds(windowEvidence = {}) {
  return unique(
    Object.values(windowEvidence).flatMap((entry) =>
      toArray(entry?.evidence_reference_ids).map((item) => sanitizeText(item, 180))
    )
  );
}

function normalizeReasonCodes(values) {
  return unique(values).filter((entry) =>
    Object.values(PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES).includes(entry)
  );
}

function makeReviewHistory({
  action,
  fromStatus,
  toStatus,
  actorRole,
  actorAlias,
  note,
  supportingEvidenceReferenceIds,
  requestedAt,
} = {}) {
  return {
    action: sanitizeUpper(action, 120),
    from_review_status: sanitizeUpper(fromStatus, 120),
    to_review_status: sanitizeUpper(toStatus, 120),
    actor_role: sanitizeUpper(actorRole, 80),
    actor_alias: sanitizeUpper(actorAlias, 32),
    note: sanitizeText(note, 420),
    supporting_evidence_reference_ids: unique(
      toArray(supportingEvidenceReferenceIds).map((entry) => sanitizeText(entry, 180))
    ),
    requested_at: normalizeIso(requestedAt) ?? new Date().toISOString(),
  };
}

function extractObservationWindowAggregate(snapshot) {
  const metrics = isPlainObject(snapshot?.aggregate_metrics) ? snapshot.aggregate_metrics : {};
  return {
    observed_public_signal_count: Number.isInteger(metrics.public_signal_count)
      ? metrics.public_signal_count
      : null,
    distinct_source_count: Number.isInteger(metrics.unique_public_source_count)
      ? metrics.unique_public_source_count
      : null,
    verified_information_signal_count: Number.isInteger(
      metrics.verified_information_signal_count
    )
      ? metrics.verified_information_signal_count
      : null,
    evidence_reviewed_confusion_signal_count: Number.isInteger(
      metrics.evidence_reviewed_confusion_signal_count
    )
      ? metrics.evidence_reviewed_confusion_signal_count
      : null,
    negative_sentiment_signal_count: Number.isInteger(metrics.negative_signal_count)
      ? metrics.negative_signal_count
      : null,
    neutral_sentiment_signal_count: Number.isInteger(metrics.neutral_signal_count)
      ? metrics.neutral_signal_count
      : null,
    positive_sentiment_signal_count: Number.isInteger(metrics.positive_signal_count)
      ? metrics.positive_signal_count
      : null,
    response_reference_count: Number.isInteger(metrics.response_reference_count)
      ? metrics.response_reference_count
      : null,
    public_engagement_count: Number.isInteger(metrics.public_engagement_count)
      ? metrics.public_engagement_count
      : null,
    verified_information_engagement_count: Number.isInteger(
      metrics.verified_information_engagement_count
    )
      ? metrics.verified_information_engagement_count
      : null,
    evidence_backed_new_narrative_count: Number.isInteger(
      metrics.evidence_backed_new_narrative_count
    )
      ? metrics.evidence_backed_new_narrative_count
      : null,
    evidence_backed_new_narrative_source_count: Number.isInteger(
      metrics.evidence_backed_new_narrative_source_count
    )
      ? metrics.evidence_backed_new_narrative_source_count
      : null,
    observed_from: snapshot?.observed_from ?? "",
    observed_to: snapshot?.observed_to ?? "",
    captured_at: snapshot?.captured_at ?? "",
    evidence_reference_ids: unique(
      toArray(snapshot?.evidence_ids).map((entry) => sanitizeText(entry, 180))
    ),
    narrative_category_ids: unique(
      toArray(snapshot?.narrative_category_ids).map((entry) => sanitizeText(entry, 180))
    ),
  };
}

function buildEvidenceFromObservationCase(observationCase, overrides = {}) {
  const caseRecord = isPlainObject(observationCase) ? observationCase : {};
  const snapshots = [
    caseRecord.baseline_snapshot,
    ...toArray(caseRecord.post_publication_snapshots),
  ].filter(Boolean);
  const byType = Object.fromEntries(
    snapshots.map((snapshot) => [sanitizeUpper(snapshot.window_type, 80), snapshot])
  );

  const window_evidence = {};
  REQUIRED_WINDOWS.forEach((windowType) => {
    window_evidence[windowType] = {
      ...extractObservationWindowAggregate(byType[windowType]),
      ...(isPlainObject(overrides.window_evidence?.[windowType])
        ? overrides.window_evidence[windowType]
        : {}),
    };
  });

  return validatePipPublicCommunicationOutcomeClassificationEvidence({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EVIDENCE_SCHEMA,
    classification_evidence_id:
      overrides.classification_evidence_id ||
      `CLSEVID-${sanitizeText(caseRecord.observation_case_id, 120)}`,
    source_observation_case_id: caseRecord.observation_case_id,
    source_observation_case_fingerprint:
      overrides.source_observation_case_fingerprint ||
      caseRecord.source_boundary_fingerprint ||
      stableHash(caseRecord),
    source_publication_register_entry_id: caseRecord.source_publication_register_entry_id,
    source_handoff_package_id: caseRecord.source_handoff_package_id,
    publication_timestamp: caseRecord.verified_publication_timestamp,
    evidence_compiled_at:
      overrides.evidence_compiled_at || new Date().toISOString(),
    dataset_scope: overrides.dataset_scope || "PUBLIC_AGGREGATE_OBSERVATION",
    validation_fixture: overrides.validation_fixture ?? caseRecord.validation_fixture,
    window_evidence,
    evidence_coverage_percent:
      overrides.evidence_coverage_percent ?? caseRecord.evidence_coverage_percent ?? 0,
    evidence_references:
      overrides.evidence_references ||
      flattenEvidenceReferenceIds(window_evidence),
    uncertainty_notes:
      overrides.uncertainty_notes ||
      [caseRecord.uncertainty_note].filter(Boolean),
    evidence_lineage_status:
      overrides.evidence_lineage_status || caseRecord.evidence_lineage_status || "VALID",
  }).normalized;
}

export function calculatePipPublicCommunicationOutcomeWindowShares(evidencePackage = {}) {
  const evidence = validatePipPublicCommunicationOutcomeClassificationEvidence(
    evidencePackage
  ).normalized;
  const shares = {};
  REQUIRED_WINDOWS.forEach((windowType) => {
    const windowEvidence = evidence.window_evidence[windowType];
    shares[windowType] = {
      confusion_share_percent: toPercentShare(
        windowEvidence.evidence_reviewed_confusion_signal_count,
        windowEvidence.observed_public_signal_count
      ),
      negative_sentiment_share_percent: toPercentShare(
        windowEvidence.negative_sentiment_signal_count,
        windowEvidence.observed_public_signal_count
      ),
      verified_information_share_percent: toPercentShare(
        windowEvidence.verified_information_signal_count,
        windowEvidence.observed_public_signal_count
      ),
      response_reference_share_percent: toPercentShare(
        windowEvidence.response_reference_count,
        windowEvidence.observed_public_signal_count
      ),
    };
  });
  return shares;
}

export function calculatePipPublicCommunicationOutcomeWindowDeltas(evidencePackage = {}) {
  const shares = calculatePipPublicCommunicationOutcomeWindowShares(evidencePackage);
  const baseline = shares.PRE_PUBLICATION_24H ?? {};
  const post72 = shares.POST_PUBLICATION_72H ?? {};
  const delta = (field) => {
    if (!Number.isFinite(baseline[field]) || !Number.isFinite(post72[field])) return null;
    return Number((post72[field] - baseline[field]).toFixed(4));
  };
  return {
    confusion_share_delta_percentage_points: delta("confusion_share_percent"),
    negative_sentiment_share_delta_percentage_points: delta(
      "negative_sentiment_share_percent"
    ),
    verified_information_share_delta_percentage_points: delta(
      "verified_information_share_percent"
    ),
  };
}

export function evaluatePipPublicCommunicationOutcomeClassificationEvidence({
  observationCase,
  evidencePackage,
  thresholds,
  evaluationTimestamp,
} = {}) {
  const caseRecord = isPlainObject(observationCase) ? observationCase : {};
  const evidenceValidation = validatePipPublicCommunicationOutcomeClassificationEvidence(
    evidencePackage
  );
  const evidence = evidenceValidation.normalized;
  const activeThresholds = buildThresholds(thresholds);
  const evaluationIso = normalizeIso(evaluationTimestamp);

  const checks = {
    source_observation_present: Object.keys(caseRecord).length > 0,
    source_observation_complete:
      sanitizeUpper(caseRecord.current_status, 180) === "OBSERVATION_WINDOW_COMPLETE",
    source_fingerprint_match:
      sanitizeText(caseRecord.source_boundary_fingerprint, 180) ===
      sanitizeText(evidence.source_observation_case_fingerprint, 180),
    evidence_valid: evidenceValidation.valid === true,
    evidence_lineage:
      sanitizeUpper(evidence.evidence_lineage_status, 120, "VALID") === "VALID",
    evaluation_timestamp: Boolean(evaluationIso),
    required_windows: REQUIRED_WINDOWS.every((windowType) =>
      isPlainObject(evidence.window_evidence?.[windowType])
    ),
    coverage_minimum:
      Number(evidence.evidence_coverage_percent) >=
      activeThresholds.minimum_evidence_coverage_percent,
    signal_minimum: REQUIRED_WINDOWS.every(
      (windowType) =>
        Number(evidence.window_evidence[windowType]?.observed_public_signal_count) >=
        activeThresholds.minimum_signal_count_per_evaluated_window
    ),
    source_minimum: REQUIRED_WINDOWS.every(
      (windowType) =>
        Number(evidence.window_evidence[windowType]?.distinct_source_count) >=
        activeThresholds.minimum_distinct_source_count_per_evaluated_window
    ),
    missing_required_metrics: REQUIRED_WINDOWS.every((windowType) => {
      const windowEvidence = evidence.window_evidence[windowType] ?? {};
      return [
        "observed_public_signal_count",
        "distinct_source_count",
        "verified_information_signal_count",
        "evidence_reviewed_confusion_signal_count",
        "negative_sentiment_signal_count",
        "neutral_sentiment_signal_count",
        "positive_sentiment_signal_count",
        "response_reference_count",
        "public_engagement_count",
        "verified_information_engagement_count",
        "evidence_backed_new_narrative_count",
        "evidence_backed_new_narrative_source_count",
        "observed_from",
        "observed_to",
        "captured_at",
      ].every((key) => {
        const value = windowEvidence[key];
        if (["observed_from", "observed_to", "captured_at"].includes(key)) {
          return Boolean(normalizeIso(value));
        }
        return Number.isInteger(value) && value >= 0;
      });
    }),
    counts_valid: REQUIRED_WINDOWS.every((windowType) => {
      const windowEvidence = evidence.window_evidence[windowType] ?? {};
      return (
        Number(windowEvidence.positive_sentiment_signal_count ?? 0) +
          Number(windowEvidence.neutral_sentiment_signal_count ?? 0) +
          Number(windowEvidence.negative_sentiment_signal_count ?? 0) <=
        Number(windowEvidence.observed_public_signal_count ?? 0)
      );
    }),
  };

  const shares = calculatePipPublicCommunicationOutcomeWindowShares(evidence);
  const deltas = calculatePipPublicCommunicationOutcomeWindowDeltas(evidence);
  const baselineWindow = evidence.window_evidence.PRE_PUBLICATION_24H ?? {};
  const postWindows = REQUIRED_WINDOWS.filter((entry) => entry !== "PRE_PUBLICATION_24H");
  const responseObserved = postWindows.some((windowType) => {
    const windowEvidence = evidence.window_evidence[windowType] ?? {};
    return (
      Number(windowEvidence.response_reference_count ?? 0) >=
        activeThresholds.response_seen_minimum_reference_count ||
      Number(windowEvidence.verified_information_signal_count ?? 0) > 0
    );
  });
  const newNarrativeCount = postWindows.reduce(
    (total, windowType) =>
      total + Number(evidence.window_evidence[windowType]?.evidence_backed_new_narrative_count ?? 0),
    0
  );
  const newNarrativeSourceCount = postWindows.reduce(
    (total, windowType) =>
      total + Number(
        evidence.window_evidence[windowType]?.evidence_backed_new_narrative_source_count ?? 0
      ),
    0
  );
  const baselineNarrativeCount = Number(
    baselineWindow.evidence_backed_new_narrative_count ?? 0
  );

  const worseningIndicators = [];
  if (
    Number(deltas.confusion_share_delta_percentage_points) >=
    activeThresholds.material_change_percentage_points
  ) {
    worseningIndicators.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.WORSENING_CONFUSION_INCREASE
    );
  }
  if (
    Number(deltas.negative_sentiment_share_delta_percentage_points) >=
    activeThresholds.material_change_percentage_points
  ) {
    worseningIndicators.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.WORSENING_NEGATIVE_SENTIMENT_INCREASE
    );
  }

  const improvingIndicators = [];
  if (
    Number(deltas.confusion_share_delta_percentage_points) <=
    -activeThresholds.material_change_percentage_points
  ) {
    improvingIndicators.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.IMPROVING_CONFUSION_REDUCTION
    );
  }
  if (
    Number(deltas.negative_sentiment_share_delta_percentage_points) <=
    -activeThresholds.material_change_percentage_points
  ) {
    improvingIndicators.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.IMPROVING_NEGATIVE_SENTIMENT_REDUCTION
    );
  }
  if (
    Number(deltas.verified_information_share_delta_percentage_points) >=
    activeThresholds.material_change_percentage_points
  ) {
    improvingIndicators.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.IMPROVING_VERIFIED_INFORMATION_INCREASE
    );
  }

  const conflictingMaterialChanges =
    worseningIndicators.length > 0 && improvingIndicators.length > 0;
  const newNarrativeDetected =
    newNarrativeCount >= activeThresholds.new_narrative_minimum_evidence_count &&
    newNarrativeSourceCount >=
      activeThresholds.new_narrative_minimum_distinct_source_count &&
    baselineNarrativeCount === 0 &&
    flattenEvidenceReferenceIds(evidence.window_evidence).length > 0;
  const responseNotSeen =
    responseObserved === false &&
    newNarrativeDetected === false &&
    postWindows.every(
      (windowType) =>
        Number(evidence.window_evidence[windowType]?.response_reference_count ?? 0) === 0
    );
  const stableCandidate =
    responseObserved === true &&
    newNarrativeDetected === false &&
    worseningIndicators.length === 0 &&
    improvingIndicators.length === 0;

  const reasonCodes = [];
  const blockReasons = [];
  let classification = PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
  let sufficientEvidence = false;

  if (!checks.source_observation_present) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SOURCE_OBSERVATION_CASE_MISSING
    );
  }
  if (!checks.source_observation_complete) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SOURCE_OBSERVATION_NOT_COMPLETE
    );
  }
  if (!checks.source_fingerprint_match) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SOURCE_OBSERVATION_FINGERPRINT_MISMATCH
    );
  }
  if (!checks.evidence_valid) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.EVIDENCE_PACKAGE_INVALID
    );
  }
  if (!checks.evidence_lineage) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.EVIDENCE_LINEAGE_REQUIRED
    );
  }
  if (!checks.evaluation_timestamp) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.INVALID_TIMESTAMP
    );
  }
  if (!checks.required_windows) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.MISSING_WINDOW_EVIDENCE
    );
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_MISSING_WINDOW
    );
  }
  if (!checks.coverage_minimum) {
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_LOW_COVERAGE
    );
  }
  if (!checks.signal_minimum) {
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_LOW_SIGNAL
    );
  }
  if (!checks.source_minimum) {
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_LOW_SOURCE
    );
  }
  if (!checks.missing_required_metrics) {
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_MISSING_METRICS
    );
  }
  if (!checks.counts_valid) {
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_INVALID_COUNTS
    );
  }
  if (conflictingMaterialChanges) {
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_CONFLICTING_MATERIAL_CHANGES
    );
  }

  const hardBlocked =
    blockReasons.length > 0 ||
    !checks.coverage_minimum ||
    !checks.signal_minimum ||
    !checks.source_minimum ||
    !checks.missing_required_metrics ||
    !checks.counts_valid ||
    conflictingMaterialChanges;

  if (hardBlocked) {
    classification = PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
    sufficientEvidence = false;
  } else if (newNarrativeDetected) {
    classification =
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED;
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.NEW_NARRATIVE_SUPPORTED
    );
    sufficientEvidence = true;
  } else if (responseNotSeen) {
    classification =
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.RESPONSE_NOT_SEEN;
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.RESPONSE_NOT_OBSERVED
    );
    sufficientEvidence = true;
  } else if (worseningIndicators.length > 0) {
    classification = PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING;
    reasonCodes.push(...worseningIndicators);
    sufficientEvidence = true;
  } else if (improvingIndicators.length > 0 && responseObserved) {
    classification = PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.IMPROVING;
    reasonCodes.push(...improvingIndicators);
    sufficientEvidence = true;
  } else if (stableCandidate) {
    classification = PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.STABLE;
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.STABLE_WITHIN_THRESHOLD
    );
    sufficientEvidence = true;
  } else {
    classification = PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
    reasonCodes.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REASON_CODES.INSUFFICIENT_EVIDENCE_MISSING_METRICS
    );
    sufficientEvidence = false;
  }

  return {
    valid: true,
    sufficient_evidence: sufficientEvidence,
    provisional_primary_classification: classification,
    classification_reason_codes: normalizeReasonCodes(reasonCodes),
    block_reasons: unique(blockReasons),
    supporting_window_types:
      classification === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.RESPONSE_NOT_SEEN
        ? [
            "POST_PUBLICATION_6H",
            "POST_PUBLICATION_12H",
            "POST_PUBLICATION_24H",
            "POST_PUBLICATION_72H",
          ]
        : classification === PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED
          ? [
              "POST_PUBLICATION_6H",
              "POST_PUBLICATION_12H",
              "POST_PUBLICATION_24H",
              "POST_PUBLICATION_72H",
            ]
          : ["PRE_PUBLICATION_24H", "POST_PUBLICATION_72H"],
    supporting_evidence_reference_ids: flattenEvidenceReferenceIds(evidence.window_evidence),
    calculated_window_shares: shares,
    calculated_window_deltas: deltas,
    applied_thresholds: activeThresholds,
    evidence_coverage_percent: Number(evidence.evidence_coverage_percent ?? 0),
    uncertainty_notes: evidence.uncertainty_notes,
    causal_attribution_status: "NOT_PERFORMED",
    publication_effectiveness_claim_status: "NOT_ESTABLISHED",
  };
}

export function buildPipPublicCommunicationOutcomeClassificationResult({
  observationCase,
  evidencePackage,
  thresholds,
  evaluationTimestamp,
} = {}) {
  const caseRecord = isPlainObject(observationCase) ? observationCase : {};
  const evidence = validatePipPublicCommunicationOutcomeClassificationEvidence(
    evidencePackage
  ).normalized;

  const textPayload = stableStringify(evidencePackage);
  if (/raw[_\s-]*post|comment[_\s-]*text|username|account[_\s-]*handle/i.test(textPayload)) {
    return {
      created: false,
      classification_result: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.RAW_CONTENT_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/@/.test(textPayload)) {
    return {
      created: false,
      classification_result: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/voter[_ -]?id|voter[_ -]?record/i.test(textPayload)) {
    return {
      created: false,
      classification_result: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.VOTER_DATA_NOT_PERMITTED,
        ],
      },
    };
  }
  if (/demographic|segment|target/i.test(textPayload)) {
    return {
      created: false,
      classification_result: null,
      evaluation: {
        valid: false,
        block_reasons: [
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.DEMOGRAPHIC_TARGETING_NOT_PERMITTED,
        ],
      },
    };
  }

  const evaluation = evaluatePipPublicCommunicationOutcomeClassificationEvidence({
    observationCase: caseRecord,
    evidencePackage: evidence,
    thresholds,
    evaluationTimestamp,
  });

  const result = validatePipPublicCommunicationOutcomeClassificationResult({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_RESULT_SCHEMA,
    outcome_classification_result_id: `CLSRES-${sanitizeText(
      evidence.classification_evidence_id,
      140
    )}`,
    source_classification_evidence_id: evidence.classification_evidence_id,
    source_observation_case_id: evidence.source_observation_case_id,
    source_observation_case_fingerprint: evidence.source_observation_case_fingerprint,
    provisional_primary_classification:
      evaluation.provisional_primary_classification ||
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
    confirmed_primary_classification: "",
    supplemental_classifications: [],
    classification_reason_codes: evaluation.classification_reason_codes,
    supporting_window_types: evaluation.supporting_window_types,
    supporting_evidence_reference_ids:
      evaluation.supporting_evidence_reference_ids,
    calculated_window_shares: evaluation.calculated_window_shares,
    calculated_window_deltas: evaluation.calculated_window_deltas,
    applied_thresholds: evaluation.applied_thresholds,
    evidence_coverage_percent: evaluation.evidence_coverage_percent,
    uncertainty_notes: evaluation.uncertainty_notes,
    causal_attribution_status: "NOT_PERFORMED",
    publication_effectiveness_claim_status: "NOT_ESTABLISHED",
    review_status:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.PENDING_HUMAN_REVIEW,
    review_history: [
      makeReviewHistory({
        action: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.CLASSIFY_OUTCOME,
        fromStatus: "NOT_CLASSIFIED",
        toStatus:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.PENDING_HUMAN_REVIEW,
        actorRole: "SYSTEM",
        actorAlias: "CLS-SYSTEM",
        note: "Deterministic provisional classification generated from sanitized aggregate evidence.",
        supportingEvidenceReferenceIds: evaluation.supporting_evidence_reference_ids,
        requestedAt: evaluationTimestamp,
      }),
    ],
    validation_fixture: evidence.validation_fixture === true,
    generated_at: normalizeIso(evaluationTimestamp) ?? new Date().toISOString(),
    second_response_review_required: false,
    second_response_review_reason: "",
    second_response_review_evidence_reference_ids: [],
    reviewed_by_role: "",
    reviewed_at: "",
  }).normalized;

  return {
    created: true,
    classification_result: result,
    evaluation,
  };
}

export function recordPipPublicCommunicationOutcomeClassificationReview({
  classificationResult,
  action,
  actorRole,
  actorAlias,
  reviewNote,
  supportingEvidenceReferenceIds,
  automatic = false,
  requestedAt,
} = {}) {
  const result = validatePipPublicCommunicationOutcomeClassificationResult(
    classificationResult
  ).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const normalizedAction = sanitizeUpper(action, 120);
  const reasons = [];

  if (automatic === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.AUTOMATIC_CONFIRMATION_NOT_PERMITTED
    );
  }
  if (!roleAuthorized(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }
  if (!sanitizeText(reviewNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.MANUAL_ACTION_REQUIRED
    );
  }
  if (
    ![
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.CONFIRM_CLASSIFICATION,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.REJECT_CLASSIFICATION,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.RETURN_FOR_EVIDENCE,
    ].includes(normalizedAction)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTION_NOT_PERMITTED
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_classification_result: result,
      evaluation: { valid: false, block_reasons: unique(reasons) },
    };
  }

  const nextStatus =
    normalizedAction ===
    PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.CONFIRM_CLASSIFICATION
      ? PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.CONFIRMED
      : normalizedAction ===
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.REJECT_CLASSIFICATION
        ? PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.REJECTED
        : PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.RETURNED_FOR_EVIDENCE;

  const updated = validatePipPublicCommunicationOutcomeClassificationResult({
    ...result,
    confirmed_primary_classification:
      nextStatus ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_REVIEW_STATUSES.CONFIRMED
        ? result.provisional_primary_classification
        : "",
    review_status: nextStatus,
    review_history: [
      ...toArray(result.review_history),
      makeReviewHistory({
        action: normalizedAction,
        fromStatus: result.review_status,
        toStatus: nextStatus,
        actorRole: role,
        actorAlias: alias,
        note: reviewNote,
        supportingEvidenceReferenceIds,
        requestedAt,
      }),
    ],
    reviewed_by_role: role,
    reviewed_at: normalizeIso(requestedAt) ?? new Date().toISOString(),
  }).normalized;

  return {
    applied: true,
    updated_classification_result: updated,
    evaluation: { valid: true, block_reasons: [] },
  };
}

export function recordPipPublicCommunicationSecondResponseRequiredClassification({
  classificationResult,
  actorRole,
  actorAlias,
  reviewerReason,
  supportingEvidenceReferenceIds,
  automatic = false,
  requestedAt,
} = {}) {
  const result = validatePipPublicCommunicationOutcomeClassificationResult(
    classificationResult
  ).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (automatic === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SECOND_RESPONSE_AUTOMATION_NOT_PERMITTED
    );
  }
  if (!roleAuthorized(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }
  if (
    ![
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.WORSENING,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.NEW_NARRATIVE_EMERGED,
    ].includes(result.provisional_primary_classification)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SECOND_RESPONSE_PRIMARY_CLASSIFICATION_NOT_ELIGIBLE
    );
  }
  if (!sanitizeText(reviewerReason, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SECOND_RESPONSE_REASON_REQUIRED
    );
  }
  if (toArray(supportingEvidenceReferenceIds).length === 0) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SECOND_RESPONSE_SUPPORTING_EVIDENCE_REQUIRED
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_classification_result: result,
      evaluation: { valid: false, block_reasons: unique(reasons) },
    };
  }

  const updated = validatePipPublicCommunicationOutcomeClassificationResult({
    ...result,
    supplemental_classifications: unique([
      ...toArray(result.supplemental_classifications),
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.SECOND_RESPONSE_REQUIRED,
    ]),
    second_response_review_required: true,
    second_response_review_reason: reviewerReason,
    second_response_review_evidence_reference_ids: supportingEvidenceReferenceIds,
    review_history: [
      ...toArray(result.review_history),
      makeReviewHistory({
        action:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.RECORD_SECOND_RESPONSE_REQUIRED,
        fromStatus: result.review_status,
        toStatus: result.review_status,
        actorRole: role,
        actorAlias: alias,
        note: reviewerReason,
        supportingEvidenceReferenceIds,
        requestedAt,
      }),
    ],
    reviewed_by_role: role,
    reviewed_at: normalizeIso(requestedAt) ?? new Date().toISOString(),
  }).normalized;

  return {
    applied: true,
    updated_classification_result: updated,
    evaluation: { valid: true, block_reasons: [] },
  };
}

export function removePipPublicCommunicationSecondResponseRequiredClassification({
  classificationResult,
  actorRole,
  actorAlias,
  reviewerReason,
  requestedAt,
} = {}) {
  const result = validatePipPublicCommunicationOutcomeClassificationResult(
    classificationResult
  ).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (!roleAuthorized(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }
  if (!sanitizeText(reviewerReason, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_BLOCK_REASONS.SECOND_RESPONSE_REASON_REQUIRED
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_classification_result: result,
      evaluation: { valid: false, block_reasons: unique(reasons) },
    };
  }

  const updated = validatePipPublicCommunicationOutcomeClassificationResult({
    ...result,
    supplemental_classifications: toArray(result.supplemental_classifications).filter(
      (entry) =>
        entry !==
        PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATIONS.SECOND_RESPONSE_REQUIRED
    ),
    second_response_review_required: false,
    second_response_review_reason: reviewerReason,
    second_response_review_evidence_reference_ids: [],
    review_history: [
      ...toArray(result.review_history),
      makeReviewHistory({
        action:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_ACTIONS.REMOVE_SECOND_RESPONSE_REQUIRED,
        fromStatus: result.review_status,
        toStatus: result.review_status,
        actorRole: role,
        actorAlias: alias,
        note: reviewerReason,
        supportingEvidenceReferenceIds: [],
        requestedAt,
      }),
    ],
    reviewed_by_role: role,
    reviewed_at: normalizeIso(requestedAt) ?? new Date().toISOString(),
  }).normalized;

  return {
    applied: true,
    updated_classification_result: updated,
    evaluation: { valid: true, block_reasons: [] },
  };
}

export function buildPipPublicCommunicationOutcomeClassificationSummary({
  sourceObservationCaseCount = 0,
  eligibleObservationCaseCount = 0,
  productionClassificationResults = [],
  fixtureClassificationResults = [],
  blockedEvaluations = [],
} = {}) {
  const allResults = [
    ...toArray(productionClassificationResults),
    ...toArray(fixtureClassificationResults),
  ];
  const countByClassification = (classification) =>
    allResults.filter(
      (entry) =>
        sanitizeUpper(entry.provisional_primary_classification, 120) === classification
    ).length;
  return {
    source_observation_case_count: Number(sourceObservationCaseCount) || 0,
    eligible_observation_case_count: Number(eligibleObservationCaseCount) || 0,
    production_classification_result_count: toArray(productionClassificationResults).length,
    fixture_classification_result_count: toArray(fixtureClassificationResults).length,
    blocked_evaluation_count: toArray(blockedEvaluations).length,
    pending_human_review_count: allResults.filter(
      (entry) => entry.review_status === "PENDING_HUMAN_REVIEW"
    ).length,
    confirmed_classification_count: allResults.filter(
      (entry) => entry.review_status === "CONFIRMED"
    ).length,
    rejected_classification_count: allResults.filter(
      (entry) => entry.review_status === "REJECTED"
    ).length,
    returned_for_evidence_count: allResults.filter(
      (entry) => entry.review_status === "RETURNED_FOR_EVIDENCE"
    ).length,
    improving_count: countByClassification("IMPROVING"),
    stable_count: countByClassification("STABLE"),
    worsening_count: countByClassification("WORSENING"),
    response_not_seen_count: countByClassification("RESPONSE_NOT_SEEN"),
    new_narrative_emerged_count: countByClassification("NEW_NARRATIVE_EMERGED"),
    second_response_required_count: allResults.filter((entry) =>
      toArray(entry.supplemental_classifications).includes("SECOND_RESPONSE_REQUIRED")
    ).length,
    insufficient_evidence_count: countByClassification("INSUFFICIENT_EVIDENCE"),
    causal_attribution_performed_count: 0,
    automated_response_generated_count: 0,
    fixture_excluded_from_production_total: true,
  };
}

function makeCompletedObservationCase({
  id,
  fingerprint,
  validationFixture = true,
} = {}) {
  return {
    observation_case_id: `OBSCASE-${id}`,
    source_handoff_package_id: `PMH-${id}`,
    source_queue_item_id: `PQI-${id}`,
    source_publication_register_entry_id: `PPR-${id}`,
    verified_publication_timestamp: "2027-01-01T00:00:00.000Z",
    source_boundary_fingerprint: fingerprint,
    current_status: "OBSERVATION_WINDOW_COMPLETE",
    evidence_lineage_status: "VALID",
    validation_fixture: validationFixture,
    production_eligible: validationFixture !== true,
  };
}

function makeWindow({
  observedPublicSignalCount,
  distinctSourceCount,
  verifiedInformationSignalCount,
  confusionSignalCount,
  negativeSignalCount,
  neutralSignalCount,
  positiveSignalCount,
  responseReferenceCount,
  publicEngagementCount,
  verifiedInformationEngagementCount,
  newNarrativeCount,
  newNarrativeSourceCount,
  observedFrom,
  observedTo,
  capturedAt,
  evidenceReferenceIds,
  narrativeCategoryIds = [],
}) {
  const source = arguments[0] ?? {};
  const readCount = (camelKey, snakeKey) => {
    const camelValue = source[camelKey];
    const snakeValue = source[snakeKey];
    return Number.isInteger(camelValue)
      ? camelValue
      : Number.isInteger(snakeValue)
        ? snakeValue
        : null;
  };
  const readTextValue = (camelKey, snakeKey, fallback = "") =>
    source[camelKey] ?? source[snakeKey] ?? fallback;
  const readArrayValue = (camelKey, snakeKey) =>
    Array.isArray(source[camelKey])
      ? source[camelKey]
      : Array.isArray(source[snakeKey])
        ? source[snakeKey]
        : [];

  return {
    observed_public_signal_count: readCount(
      "observedPublicSignalCount",
      "observed_public_signal_count"
    ),
    distinct_source_count: readCount("distinctSourceCount", "distinct_source_count"),
    verified_information_signal_count: readCount(
      "verifiedInformationSignalCount",
      "verified_information_signal_count"
    ),
    evidence_reviewed_confusion_signal_count: readCount(
      "confusionSignalCount",
      "evidence_reviewed_confusion_signal_count"
    ),
    negative_sentiment_signal_count: readCount(
      "negativeSignalCount",
      "negative_sentiment_signal_count"
    ),
    neutral_sentiment_signal_count: readCount(
      "neutralSignalCount",
      "neutral_sentiment_signal_count"
    ),
    positive_sentiment_signal_count: readCount(
      "positiveSignalCount",
      "positive_sentiment_signal_count"
    ),
    response_reference_count: readCount(
      "responseReferenceCount",
      "response_reference_count"
    ),
    public_engagement_count: readCount(
      "publicEngagementCount",
      "public_engagement_count"
    ),
    verified_information_engagement_count: readCount(
      "verifiedInformationEngagementCount",
      "verified_information_engagement_count"
    ),
    evidence_backed_new_narrative_count: readCount(
      "newNarrativeCount",
      "evidence_backed_new_narrative_count"
    ),
    evidence_backed_new_narrative_source_count: readCount(
      "newNarrativeSourceCount",
      "evidence_backed_new_narrative_source_count"
    ),
    observed_from: readTextValue("observedFrom", "observed_from", observedFrom),
    observed_to: readTextValue("observedTo", "observed_to", observedTo),
    captured_at: readTextValue("capturedAt", "captured_at", capturedAt),
    evidence_reference_ids: readArrayValue(
      "evidenceReferenceIds",
      "evidence_reference_ids"
    ),
    narrative_category_ids: readArrayValue(
      "narrativeCategoryIds",
      "narrative_category_ids"
    ),
  };
}

export function buildPipPublicCommunicationOutcomeClassificationValidationFixture({
  thresholds,
  evaluationTimestamp = "2027-01-04T12:00:00.000Z",
} = {}) {
  const activeThresholds = buildThresholds(thresholds);
  const makeEvidence = (id, windows, overrides = {}) => {
    const observationCase = makeCompletedObservationCase({
      id,
      fingerprint: `OBSFP-${id}`,
      validationFixture: true,
    });
    return {
      observationCase,
      evidence: validatePipPublicCommunicationOutcomeClassificationEvidence({
        classification_evidence_id: `CLSEVID-${id}`,
        source_observation_case_id: observationCase.observation_case_id,
        source_observation_case_fingerprint: observationCase.source_boundary_fingerprint,
        source_publication_register_entry_id:
          observationCase.source_publication_register_entry_id,
        source_handoff_package_id: observationCase.source_handoff_package_id,
        publication_timestamp: observationCase.verified_publication_timestamp,
        evidence_compiled_at: evaluationTimestamp,
        dataset_scope: "PUBLIC_AGGREGATE_OBSERVATION",
        validation_fixture: true,
        evidence_coverage_percent: 85,
        evidence_references: flattenEvidenceReferenceIds(windows),
        uncertainty_notes: ["Fixture aggregate classification evidence."],
        evidence_lineage_status: "VALID",
        window_evidence: windows,
        ...overrides,
      }).normalized,
    };
  };

  const baseline = makeWindow({
    observedPublicSignalCount: 20,
    distinctSourceCount: 4,
    verifiedInformationSignalCount: 4,
    confusionSignalCount: 8,
    negativeSignalCount: 8,
    neutralSignalCount: 6,
    positiveSignalCount: 6,
    responseReferenceCount: 1,
    publicEngagementCount: 30,
    verifiedInformationEngagementCount: 10,
    newNarrativeCount: 0,
    newNarrativeSourceCount: 0,
    observedFrom: "2026-12-31T00:00:00.000Z",
    observedTo: "2027-01-01T00:00:00.000Z",
    capturedAt: "2027-01-01T00:10:00.000Z",
    evidenceReferenceIds: ["https://example.invalid/evidence/base-1"],
  });
  const post6 = makeWindow({
    observedPublicSignalCount: 20,
    distinctSourceCount: 4,
    verifiedInformationSignalCount: 6,
    confusionSignalCount: 7,
    negativeSignalCount: 7,
    neutralSignalCount: 7,
    positiveSignalCount: 6,
    responseReferenceCount: 1,
    publicEngagementCount: 28,
    verifiedInformationEngagementCount: 11,
    newNarrativeCount: 0,
    newNarrativeSourceCount: 0,
    observedFrom: "2027-01-01T00:00:00.000Z",
    observedTo: "2027-01-01T06:00:00.000Z",
    capturedAt: "2027-01-01T06:10:00.000Z",
    evidenceReferenceIds: ["https://example.invalid/evidence/post6-1"],
  });
  const post12 = makeWindow({
    observedPublicSignalCount: 20,
    distinctSourceCount: 4,
    verifiedInformationSignalCount: 7,
    confusionSignalCount: 6,
    negativeSignalCount: 6,
    neutralSignalCount: 8,
    positiveSignalCount: 6,
    responseReferenceCount: 1,
    publicEngagementCount: 27,
    verifiedInformationEngagementCount: 12,
    newNarrativeCount: 0,
    newNarrativeSourceCount: 0,
    observedFrom: "2027-01-01T06:00:00.000Z",
    observedTo: "2027-01-01T12:00:00.000Z",
    capturedAt: "2027-01-01T12:10:00.000Z",
    evidenceReferenceIds: ["https://example.invalid/evidence/post12-1"],
  });
  const improving72 = makeWindow({
    observedPublicSignalCount: 20,
    distinctSourceCount: 4,
    verifiedInformationSignalCount: 10,
    confusionSignalCount: 4,
    negativeSignalCount: 4,
    neutralSignalCount: 8,
    positiveSignalCount: 8,
    responseReferenceCount: 2,
    publicEngagementCount: 26,
    verifiedInformationEngagementCount: 14,
    newNarrativeCount: 0,
    newNarrativeSourceCount: 0,
    observedFrom: "2027-01-02T00:00:00.000Z",
    observedTo: "2027-01-04T00:00:00.000Z",
    capturedAt: "2027-01-04T00:10:00.000Z",
    evidenceReferenceIds: ["https://example.invalid/evidence/post72-improving"],
  });

  const improvingInput = makeEvidence("FX-IMPROVING", {
    PRE_PUBLICATION_24H: baseline,
    POST_PUBLICATION_6H: post6,
    POST_PUBLICATION_12H: post12,
    POST_PUBLICATION_24H: makeWindow({
      ...post12,
      verifiedInformationSignalCount: 8,
      confusionSignalCount: 5,
      negativeSignalCount: 5,
      responseReferenceCount: 2,
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post24-improving"],
    }),
    POST_PUBLICATION_72H: improving72,
  });

  const stableInput = makeEvidence("FX-STABLE", {
    PRE_PUBLICATION_24H: baseline,
    POST_PUBLICATION_6H: post6,
    POST_PUBLICATION_12H: post12,
    POST_PUBLICATION_24H: makeWindow({
      ...post12,
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post24-stable"],
    }),
    POST_PUBLICATION_72H: makeWindow({
      observedPublicSignalCount: 20,
      distinctSourceCount: 4,
      verifiedInformationSignalCount: 5,
      confusionSignalCount: 7,
      negativeSignalCount: 7,
      neutralSignalCount: 6,
      positiveSignalCount: 7,
      responseReferenceCount: 1,
      publicEngagementCount: 26,
      verifiedInformationEngagementCount: 10,
      newNarrativeCount: 0,
      newNarrativeSourceCount: 0,
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post72-stable"],
    }),
  });

  const worseningInput = makeEvidence("FX-WORSENING", {
    PRE_PUBLICATION_24H: baseline,
    POST_PUBLICATION_6H: post6,
    POST_PUBLICATION_12H: post12,
    POST_PUBLICATION_24H: makeWindow({
      ...post12,
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      confusionSignalCount: 9,
      negativeSignalCount: 9,
      neutralSignalCount: 6,
      positiveSignalCount: 5,
      evidenceReferenceIds: ["https://example.invalid/evidence/post24-worsening"],
    }),
    POST_PUBLICATION_72H: makeWindow({
      observedPublicSignalCount: 20,
      distinctSourceCount: 4,
      verifiedInformationSignalCount: 2,
      confusionSignalCount: 11,
      negativeSignalCount: 11,
      neutralSignalCount: 5,
      positiveSignalCount: 4,
      responseReferenceCount: 1,
      publicEngagementCount: 24,
      verifiedInformationEngagementCount: 6,
      newNarrativeCount: 0,
      newNarrativeSourceCount: 0,
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post72-worsening"],
    }),
  });

  const responseNotSeenInput = makeEvidence("FX-NOTSEEN", {
    PRE_PUBLICATION_24H: baseline,
    POST_PUBLICATION_6H: makeWindow({
      ...post6,
      verifiedInformationSignalCount: 0,
      responseReferenceCount: 0,
      evidenceReferenceIds: ["https://example.invalid/evidence/post6-noseen"],
    }),
    POST_PUBLICATION_12H: makeWindow({
      ...post12,
      verifiedInformationSignalCount: 0,
      responseReferenceCount: 0,
      evidenceReferenceIds: ["https://example.invalid/evidence/post12-noseen"],
    }),
    POST_PUBLICATION_24H: makeWindow({
      ...post12,
      verifiedInformationSignalCount: 0,
      responseReferenceCount: 0,
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post24-noseen"],
    }),
    POST_PUBLICATION_72H: makeWindow({
      observedPublicSignalCount: 20,
      distinctSourceCount: 4,
      verifiedInformationSignalCount: 0,
      confusionSignalCount: 7,
      negativeSignalCount: 7,
      neutralSignalCount: 7,
      positiveSignalCount: 6,
      responseReferenceCount: 0,
      publicEngagementCount: 23,
      verifiedInformationEngagementCount: 0,
      newNarrativeCount: 0,
      newNarrativeSourceCount: 0,
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post72-noseen"],
    }),
  });

  const newNarrativeInput = makeEvidence("FX-NARRATIVE", {
    PRE_PUBLICATION_24H: baseline,
    POST_PUBLICATION_6H: makeWindow({
      ...post6,
      responseReferenceCount: 1,
      newNarrativeCount: 1,
      newNarrativeSourceCount: 1,
      evidenceReferenceIds: ["https://example.invalid/evidence/post6-narrative"],
      narrativeCategoryIds: ["NAR-01"],
    }),
    POST_PUBLICATION_12H: makeWindow({
      ...post12,
      responseReferenceCount: 1,
      newNarrativeCount: 1,
      newNarrativeSourceCount: 1,
      evidenceReferenceIds: ["https://example.invalid/evidence/post12-narrative"],
      narrativeCategoryIds: ["NAR-02"],
    }),
    POST_PUBLICATION_24H: makeWindow({
      ...post12,
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      responseReferenceCount: 1,
      newNarrativeCount: 1,
      newNarrativeSourceCount: 1,
      evidenceReferenceIds: ["https://example.invalid/evidence/post24-narrative"],
      narrativeCategoryIds: ["NAR-03"],
    }),
    POST_PUBLICATION_72H: makeWindow({
      observedPublicSignalCount: 20,
      distinctSourceCount: 4,
      verifiedInformationSignalCount: 5,
      confusionSignalCount: 8,
      negativeSignalCount: 8,
      neutralSignalCount: 6,
      positiveSignalCount: 6,
      responseReferenceCount: 1,
      publicEngagementCount: 25,
      verifiedInformationEngagementCount: 10,
      newNarrativeCount: 2,
      newNarrativeSourceCount: 2,
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evidenceReferenceIds: ["https://example.invalid/evidence/post72-narrative"],
      narrativeCategoryIds: ["NAR-04", "NAR-05"],
    }),
  });

  const missingWindowInput = makeEvidence(
    "FX-MISSING-WINDOW",
    {
      PRE_PUBLICATION_24H: baseline,
      POST_PUBLICATION_6H: post6,
      POST_PUBLICATION_12H: post12,
      POST_PUBLICATION_24H: makeWindow({
        ...post12,
        observedFrom: "2027-01-01T12:00:00.000Z",
        observedTo: "2027-01-02T00:00:00.000Z",
        capturedAt: "2027-01-02T00:10:00.000Z",
        evidenceReferenceIds: ["https://example.invalid/evidence/post24-missing"],
      }),
      POST_PUBLICATION_72H: {},
    },
    { evidence_coverage_percent: 85 }
  );

  const lowSignalInput = makeEvidence(
    "FX-LOW-SIGNAL",
    {
      PRE_PUBLICATION_24H: { ...baseline, observed_public_signal_count: 8 },
      POST_PUBLICATION_6H: post6,
      POST_PUBLICATION_12H: post12,
      POST_PUBLICATION_24H: makeWindow({
        ...post12,
        observedFrom: "2027-01-01T12:00:00.000Z",
        observedTo: "2027-01-02T00:00:00.000Z",
        capturedAt: "2027-01-02T00:10:00.000Z",
        evidenceReferenceIds: ["https://example.invalid/evidence/post24-lowsignal"],
      }),
      POST_PUBLICATION_72H: improving72,
    },
    { evidence_coverage_percent: 85 }
  );

  const lowSourceInput = makeEvidence(
    "FX-LOW-SOURCE",
    {
      PRE_PUBLICATION_24H: { ...baseline, distinct_source_count: 1 },
      POST_PUBLICATION_6H: post6,
      POST_PUBLICATION_12H: post12,
      POST_PUBLICATION_24H: makeWindow({
        ...post12,
        observedFrom: "2027-01-01T12:00:00.000Z",
        observedTo: "2027-01-02T00:00:00.000Z",
        capturedAt: "2027-01-02T00:10:00.000Z",
        evidenceReferenceIds: ["https://example.invalid/evidence/post24-lowsource"],
      }),
      POST_PUBLICATION_72H: improving72,
    },
    { evidence_coverage_percent: 85 }
  );

  const lowCoverageInput = makeEvidence(
    "FX-LOW-COVERAGE",
    {
      PRE_PUBLICATION_24H: baseline,
      POST_PUBLICATION_6H: post6,
      POST_PUBLICATION_12H: post12,
      POST_PUBLICATION_24H: makeWindow({
        ...post12,
        observedFrom: "2027-01-01T12:00:00.000Z",
        observedTo: "2027-01-02T00:00:00.000Z",
        capturedAt: "2027-01-02T00:10:00.000Z",
        evidenceReferenceIds: ["https://example.invalid/evidence/post24-lowcoverage"],
      }),
      POST_PUBLICATION_72H: improving72,
    },
    { evidence_coverage_percent: 60 }
  );

  const conflictingInput = makeEvidence(
    "FX-CONFLICT",
    {
      PRE_PUBLICATION_24H: baseline,
      POST_PUBLICATION_6H: post6,
      POST_PUBLICATION_12H: post12,
      POST_PUBLICATION_24H: makeWindow({
        ...post12,
        observedFrom: "2027-01-01T12:00:00.000Z",
        observedTo: "2027-01-02T00:00:00.000Z",
        capturedAt: "2027-01-02T00:10:00.000Z",
        evidenceReferenceIds: ["https://example.invalid/evidence/post24-conflict"],
      }),
      POST_PUBLICATION_72H: makeWindow({
        observedPublicSignalCount: 20,
        distinctSourceCount: 4,
        verifiedInformationSignalCount: 8,
        confusionSignalCount: 12,
        negativeSignalCount: 4,
        neutralSignalCount: 8,
        positiveSignalCount: 8,
        responseReferenceCount: 2,
        publicEngagementCount: 26,
        verifiedInformationEngagementCount: 12,
        newNarrativeCount: 0,
        newNarrativeSourceCount: 0,
        observedFrom: "2027-01-02T00:00:00.000Z",
        observedTo: "2027-01-04T00:00:00.000Z",
        capturedAt: "2027-01-04T00:10:00.000Z",
        evidenceReferenceIds: ["https://example.invalid/evidence/post72-conflict"],
      }),
    },
    { evidence_coverage_percent: 85 }
  );

  const fixtureInputs = [
    improvingInput,
    stableInput,
    worseningInput,
    responseNotSeenInput,
    newNarrativeInput,
    missingWindowInput,
    lowSignalInput,
    lowSourceInput,
    lowCoverageInput,
    conflictingInput,
  ];

  const createdResults = fixtureInputs.map((entry) =>
    buildPipPublicCommunicationOutcomeClassificationResult({
      observationCase: entry.observationCase,
      evidencePackage: entry.evidence,
      thresholds: activeThresholds,
      evaluationTimestamp,
    })
  );

  const improvingResult = createdResults[0].classification_result;
  const stableResult = createdResults[1].classification_result;
  const worseningResult = createdResults[2].classification_result;
  const responseNotSeenResult = createdResults[3].classification_result;
  const narrativeResult = createdResults[4].classification_result;
  const insufficientResults = createdResults.slice(5).map((entry) => entry.classification_result);

  const secondResponseAccepted = recordPipPublicCommunicationSecondResponseRequiredClassification({
    classificationResult: worseningResult,
    actorRole: "ADMINISTRATOR",
    actorAlias: "CLS-65B00001",
    reviewerReason: "Escalated operational review required.",
    supportingEvidenceReferenceIds: ["https://example.invalid/evidence/post72-worsening"],
    requestedAt: evaluationTimestamp,
  });

  const secondResponseRejectedWithoutReason =
    recordPipPublicCommunicationSecondResponseRequiredClassification({
      classificationResult: narrativeResult,
      actorRole: "ADMINISTRATOR",
      actorAlias: "CLS-65B00002",
      reviewerReason: "",
      supportingEvidenceReferenceIds: ["https://example.invalid/evidence/post72-narrative"],
      requestedAt: evaluationTimestamp,
    }).applied === false;

  const secondResponseRejectedForImproving =
    recordPipPublicCommunicationSecondResponseRequiredClassification({
      classificationResult: improvingResult,
      actorRole: "ADMINISTRATOR",
      actorAlias: "CLS-65B00003",
      reviewerReason: "Not eligible.",
      supportingEvidenceReferenceIds: ["https://example.invalid/evidence/post72-improving"],
      requestedAt: evaluationTimestamp,
    }).applied === false;

  const secondResponseRejectedForStable =
    recordPipPublicCommunicationSecondResponseRequiredClassification({
      classificationResult: stableResult,
      actorRole: "ADMINISTRATOR",
      actorAlias: "CLS-65B00004",
      reviewerReason: "Not eligible.",
      supportingEvidenceReferenceIds: ["https://example.invalid/evidence/post72-stable"],
      requestedAt: evaluationTimestamp,
    }).applied === false;

  const automaticConfirmationRejected =
    recordPipPublicCommunicationOutcomeClassificationReview({
      classificationResult: worseningResult,
      action: "CONFIRM_CLASSIFICATION",
      actorRole: "ADMINISTRATOR",
      actorAlias: "CLS-65B00005",
      reviewNote: "Automatic confirm should fail.",
      supportingEvidenceReferenceIds: ["https://example.invalid/evidence/post72-worsening"],
      automatic: true,
      requestedAt: evaluationTimestamp,
    }).applied === false;

  const rawContentRejected =
    buildPipPublicCommunicationOutcomeClassificationResult({
      observationCase: improvingInput.observationCase,
      evidencePackage: {
        ...improvingInput.evidence,
        raw_post_text: "forbidden",
      },
      thresholds: activeThresholds,
      evaluationTimestamp,
    }).created === false;

  const accountIdentityRejected =
    buildPipPublicCommunicationOutcomeClassificationResult({
      observationCase: improvingInput.observationCase,
      evidencePackage: {
        ...improvingInput.evidence,
        public_account_handle: "@forbidden",
      },
      thresholds: activeThresholds,
      evaluationTimestamp,
    }).created === false;

  const voterDataRejected =
    buildPipPublicCommunicationOutcomeClassificationResult({
      observationCase: improvingInput.observationCase,
      evidencePackage: {
        ...improvingInput.evidence,
        voter_record_id: "VOTER-1",
      },
      thresholds: activeThresholds,
      evaluationTimestamp,
    }).created === false;

  const demographicRejected =
    buildPipPublicCommunicationOutcomeClassificationResult({
      observationCase: improvingInput.observationCase,
      evidencePackage: {
        ...improvingInput.evidence,
        demographic_targeting_flag: true,
      },
      thresholds: activeThresholds,
      evaluationTimestamp,
    }).created === false;

  const fixtureResults = [
    improvingResult,
    stableResult,
    secondResponseAccepted.updated_classification_result,
    responseNotSeenResult,
    narrativeResult,
    insufficientResults[0],
  ].filter(Boolean);

  const collection = validatePipPublicCommunicationOutcomeClassificationCollection({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
    generated_at: evaluationTimestamp,
    production_classification_results: [],
    fixture_classification_results: fixtureResults,
    blocked_evaluations: [],
    validation: { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      automatic_analytics_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
    },
  }).normalized;

  collection.summary = buildPipPublicCommunicationOutcomeClassificationSummary({
    sourceObservationCaseCount: fixtureInputs.length,
    eligibleObservationCaseCount: fixtureInputs.length,
    productionClassificationResults: [],
    fixtureClassificationResults: fixtureResults,
    blockedEvaluations: [],
  });

  const checks = {
    improving_fixture_classification:
      improvingResult?.provisional_primary_classification === "IMPROVING",
    stable_fixture_classification:
      stableResult?.provisional_primary_classification === "STABLE",
    worsening_fixture_classification:
      worseningResult?.provisional_primary_classification === "WORSENING",
    response_not_seen_fixture_classification:
      responseNotSeenResult?.provisional_primary_classification ===
      "RESPONSE_NOT_SEEN",
    new_narrative_fixture_classification:
      narrativeResult?.provisional_primary_classification ===
      "NEW_NARRATIVE_EMERGED",
    insufficient_missing_window:
      insufficientResults[0]?.provisional_primary_classification ===
      "INSUFFICIENT_EVIDENCE",
    insufficient_low_signal:
      insufficientResults[1]?.provisional_primary_classification ===
      "INSUFFICIENT_EVIDENCE",
    insufficient_low_source:
      insufficientResults[2]?.provisional_primary_classification ===
      "INSUFFICIENT_EVIDENCE",
    insufficient_low_coverage:
      insufficientResults[3]?.provisional_primary_classification ===
      "INSUFFICIENT_EVIDENCE",
    insufficient_conflicting_changes:
      insufficientResults[4]?.provisional_primary_classification ===
      "INSUFFICIENT_EVIDENCE",
    second_response_required_accepted: secondResponseAccepted.applied === true,
    second_response_required_rejected_without_reason:
      secondResponseRejectedWithoutReason,
    second_response_required_rejected_for_improving:
      secondResponseRejectedForImproving,
    second_response_required_rejected_for_stable:
      secondResponseRejectedForStable,
    automatic_confirmation_rejected: automaticConfirmationRejected,
    raw_content_rejected: rawContentRejected,
    account_identity_rejected: accountIdentityRejected,
    voter_data_rejected: voterDataRejected,
    demographic_targeting_rejected: demographicRejected,
    fixture_excluded_from_production_totals:
      collection.summary.production_classification_result_count === 0 &&
      collection.summary.fixture_excluded_from_production_total === true,
  };

  const exportPayload = sanitizeExport({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA,
    generated_at: evaluationTimestamp,
    manifest: buildPipPublicCommunicationOutcomeClassificationContractManifest({
      thresholds: activeThresholds,
    }),
    classification_summary: collection.summary,
    production_classification_results: [],
    fixture_classification_results: fixtureResults,
    blocked_evaluations: [],
    thresholds: activeThresholds,
    collection_validation_result: collection.validation,
    safety_manifest: collection.safety,
  });

  return {
    collection,
    checks,
    export_payload: exportPayload,
    fixture_inputs: fixtureInputs,
  };
}

export function buildPipPublicCommunicationOutcomeClassificationCollection({
  observationCollection,
  includeValidationFixtures = true,
  thresholds,
  evaluationTimestamp,
} = {}) {
  const sourceCollection = isPlainObject(observationCollection) ? observationCollection : {};
  const activeThresholds = buildThresholds(thresholds);
  const productionResults = [];
  const blockedEvaluations = [];
  const productionCases = toArray(sourceCollection.production_observation_cases);

  productionCases.forEach((observationCase) => {
    if (sanitizeUpper(observationCase?.current_status, 180) !== "OBSERVATION_WINDOW_COMPLETE") {
      return;
    }

    const evidence = buildEvidenceFromObservationCase(observationCase, {
      evidence_coverage_percent: observationCase.evidence_coverage_percent ?? 0,
      evidence_compiled_at: evaluationTimestamp,
      validation_fixture: false,
    });
    const created = buildPipPublicCommunicationOutcomeClassificationResult({
      observationCase,
      evidencePackage: evidence,
      thresholds: activeThresholds,
      evaluationTimestamp,
    });
    if (created.created) {
      productionResults.push(created.classification_result);
    } else {
      blockedEvaluations.push({
        source_observation_case_id: observationCase.observation_case_id,
        block_reasons: created.evaluation.block_reasons,
      });
    }
  });

  const fixture = includeValidationFixtures
    ? buildPipPublicCommunicationOutcomeClassificationValidationFixture({
        thresholds: activeThresholds,
        evaluationTimestamp,
      })
    : { collection: { fixture_classification_results: [] }, checks: {}, export_payload: {} };

  const collection = validatePipPublicCommunicationOutcomeClassificationCollection({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_COLLECTION_SCHEMA,
    generated_at: normalizeIso(evaluationTimestamp) ?? new Date().toISOString(),
    production_classification_results: productionResults,
    fixture_classification_results:
      fixture.collection?.fixture_classification_results ?? [],
    blocked_evaluations: [
      ...blockedEvaluations,
      ...toArray(fixture.collection?.blocked_evaluations),
    ],
    validation: { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      automatic_analytics_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
    },
  }).normalized;

  collection.summary = buildPipPublicCommunicationOutcomeClassificationSummary({
    sourceObservationCaseCount:
      productionCases.length +
      toArray(sourceCollection.fixture_observation_cases).length,
    eligibleObservationCaseCount: productionResults.length,
    productionClassificationResults: productionResults,
    fixtureClassificationResults: collection.fixture_classification_results,
    blockedEvaluations: collection.blocked_evaluations,
  });

  collection.export_payload = sanitizeExport({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_CLASSIFICATION_EXPORT_SCHEMA,
    generated_at: normalizeIso(evaluationTimestamp) ?? new Date().toISOString(),
    manifest: buildPipPublicCommunicationOutcomeClassificationContractManifest({
      thresholds: activeThresholds,
    }),
    classification_summary: collection.summary,
    production_classification_results: collection.production_classification_results,
    fixture_classification_results: collection.fixture_classification_results,
    blocked_evaluations: collection.blocked_evaluations,
    thresholds: activeThresholds,
    collection_validation_result: collection.validation,
    safety_manifest: collection.safety,
  });

  return collection;
}

export function createPipPublicCommunicationOutcomeClassificationExportFileName({
  generatedAt,
  scope = "P134",
  suffix = "outcome-classification",
} = {}) {
  const iso = normalizeIso(generatedAt) ?? new Date().toISOString();
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeSuffix = sanitizeText(suffix, 64).replace(/[^A-Za-z0-9_-]/g, "_");
  return `pip-public-communication-${safeSuffix}-${safeScope}-${compact}.json`;
}

export function sanitizePipPublicCommunicationOutcomeClassificationExport(payload = {}) {
  return sanitizeExport(payload);
}

export function serializePipPublicCommunicationOutcomeClassificationExport(
  payload = {}
) {
  return JSON.stringify(
    sanitizePipPublicCommunicationOutcomeClassificationExport(payload),
    null,
    2
  );
}

export function buildPipPublicCommunicationOutcomeClassificationManifestValidationResult({
  thresholds,
} = {}) {
  const manifest = buildPipPublicCommunicationOutcomeClassificationContractManifest({
    thresholds,
  });
  return validatePipPublicCommunicationOutcomeClassificationContractManifest(manifest);
}
