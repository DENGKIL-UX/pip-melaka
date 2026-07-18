import {
  buildPip360CommandCentreSnapshot,
} from "./pip-360-command-centre.js";
import { PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA } from "./pip-360-command-centre-contract.js";
import {
  PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS,
  PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS,
  PIP_360_TREND_CLASSIFICATIONS,
} from "./pip-360-dual-layer-locality-contract.js";
import {
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS,
  PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS,
  sanitizePipPublicCommunicationResponseCaseExport,
  sanitizePipPublicCommunicationResponseCaseInput,
  validatePipPublicCommunicationResponseCase,
  validatePipPublicCommunicationResponseCaseCollection,
  validatePipPublicCommunicationResponseCaseInput,
} from "./pip-public-communication-response-case-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true") return true;
    if (value.trim().toLowerCase() === "false") return false;
  }
  return fallback;
}

function normalizeUpper(value, max = 80, fallback = "") {
  const text = sanitizeText(value, max).toUpperCase();
  return text || fallback;
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildEvidenceReadiness({
  evidenceCount,
  evidenceVerificationStatus,
  confidenceClassification,
} = {}) {
  const count = normalizeNumber(evidenceCount, 0);
  const status = normalizeUpper(evidenceVerificationStatus, 80, "NONE");
  const confidence = normalizeUpper(
    confidenceClassification,
    80,
    PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  );

  if (count <= 0 || status === "NONE") {
    return PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.NONE;
  }

  if (
    status === "VERIFIED" &&
    confidence !== PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW &&
    confidence !== PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  ) {
    return PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.VERIFIED_READY;
  }

  if (status === "PARTIAL") {
    return PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.PARTIALLY_VERIFIED;
  }

  if (confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW) {
    return PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.REVIEW_REQUIRED;
  }

  return PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.INSUFFICIENT;
}

function deriveUrgencyFromSignals({ trendClassification, narrativeVelocity } = {}) {
  const trend = normalizeUpper(
    trendClassification,
    80,
    PIP_360_TREND_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  );
  const velocity = normalizeUpper(
    narrativeVelocity,
    80,
    PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  );

  if (velocity === PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.HIGH) {
    return PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.WATCH;
  }

  if (
    trend === PIP_360_TREND_CLASSIFICATIONS.RISING ||
    trend === PIP_360_TREND_CLASSIFICATIONS.EMERGING
  ) {
    return PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.WATCH;
  }

  return PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.ROUTINE;
}

function isInvalidGeography(status) {
  const value = normalizeUpper(status, 80, "UNKNOWN");
  if (!value) return false;
  return (
    value.includes("INVALID") ||
    value.includes("AMBIGUOUS") ||
    value.includes("PARTIALLY_MAPPED") ||
    value.includes("PARENT_INVALID")
  );
}

function isAmbiguousGeography(status) {
  const value = normalizeUpper(status, 80, "UNKNOWN");
  return value.includes("AMBIGUOUS");
}

function hasVerifiedEvidence(input) {
  return (
    normalizeNumber(input.evidence_count, 0) > 0 &&
    normalizeUpper(input.evidence_verification_status, 80, "NONE") === "VERIFIED" &&
    ![
      PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW,
      PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
    ].includes(normalizeUpper(input.confidence_classification, 80, "INSUFFICIENT_EVIDENCE"))
  );
}

function supportsMonitorWithoutExplicitIntent(input) {
  const trend = normalizeUpper(input.trend_classification, 80, "INSUFFICIENT_EVIDENCE");
  const velocity = normalizeUpper(input.narrative_velocity, 80, "INSUFFICIENT_EVIDENCE");
  return (
    trend === PIP_360_TREND_CLASSIFICATIONS.RISING ||
    trend === PIP_360_TREND_CLASSIFICATIONS.EMERGING ||
    velocity === PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.HIGH
  );
}

function urgencyRank(value) {
  if (value === PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.IMMEDIATE_HUMAN_REVIEW) {
    return 4;
  }
  if (value === PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.ELEVATED_REVIEW) {
    return 3;
  }
  if (value === PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.WATCH) {
    return 2;
  }
  return 1;
}

function evidenceRank(value) {
  if (value === PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.VERIFIED_READY) return 5;
  if (value === PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.PARTIALLY_VERIFIED) return 4;
  if (value === PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.REVIEW_REQUIRED) return 3;
  if (value === PIP_PUBLIC_COMMUNICATION_EVIDENCE_READINESS_STATUSES.INSUFFICIENT) return 2;
  return 1;
}

function deriveCaseType(input) {
  const explicit = normalizeUpper(input.explicit_case_type, 80, "UNSPECIFIED");
  if (Object.values(PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES).includes(explicit)) {
    return explicit;
  }

  if (normalizeBoolean(input.conflicting_classification, false)) {
    return PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.CONFLICTING_INFORMATION;
  }

  return PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.UNSPECIFIED;
}

function createBaseCase(input, caseType, generatedAt) {
  const readiness = buildEvidenceReadiness(input);
  return {
    schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_SCHEMA,
    response_case_id: sanitizeText(
      `RC-${sanitizeText(input.source_issue_id, 40) || "UNSPECIFIED"}-${Date.now()}`,
      80
    ),
    source_issue_id: sanitizeText(input.source_issue_id, 120) || "UNSPECIFIED_SOURCE",
    issue_label: sanitizeText(input.issue_label, 180) || "UNSPECIFIED_ISSUE",
    issue_category: sanitizeText(input.issue_category, 120) || "UNSPECIFIED_CATEGORY",
    geography_scope: sanitizeText(input.geography_scope, 160) || "UNSPECIFIED_GEOGRAPHY",
    geography_mapping_status:
      normalizeUpper(input.geography_mapping_status, 80, "UNKNOWN") || "UNKNOWN",
    case_type: caseType,
    status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID,
    recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
    urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.IMMEDIATE_HUMAN_REVIEW,
    rationale_codes: [],
    block_reasons: [],
    verified_signal_count: normalizeNumber(input.verified_signal_count, 0),
    evidence_count: normalizeNumber(input.evidence_count, 0),
    evidence_readiness_status: readiness,
    confidence_classification: normalizeUpper(
      input.confidence_classification,
      80,
      PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
    ),
    observation_window: sanitizeText(input.observation_window, 140),
    production_eligible: false,
    validation_fixture: normalizeBoolean(input.validation_fixture, false),
    human_review_required: true,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    safety: {
      public_information_support_only: true,
      response_wording_generated: false,
      communication_objective_generated: false,
      factual_core_generated: false,
      content_draft_generated: false,
      persuasion_score_generated: false,
      voter_preference_inferred: false,
      election_outcome_predicted: false,
      demographic_targeting_used: false,
      population_weighting_used: false,
      raw_public_content_included: false,
      voter_data_included: false,
    },
  };
}

function finalizeCase(baseCase, {
  status,
  recommendation,
  urgency,
  rationaleCodes,
  blockReasons,
  productionEligible,
} = {}) {
  return {
    ...baseCase,
    status,
    recommendation,
    urgency,
    rationale_codes: uniq(toArray(rationaleCodes).map((entry) => normalizeUpper(entry, 80))),
    block_reasons: uniq(toArray(blockReasons).map((entry) => normalizeUpper(entry, 80))),
    production_eligible:
      baseCase.validation_fixture === true ? false : productionEligible === true,
    human_review_required: true,
  };
}

export function evaluatePipPublicCommunicationResponseCase(input = {}, { generatedAt } = {}) {
  const sanitized = sanitizePipPublicCommunicationResponseCaseInput(input);
  const inputValidation = validatePipPublicCommunicationResponseCaseInput(sanitized);

  const caseType = deriveCaseType(sanitized);
  const baseCase = createBaseCase(sanitized, caseType, generatedAt);

  if (inputValidation.valid !== true) {
    const responseCase = finalizeCase(baseCase, {
      status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.IMMEDIATE_HUMAN_REVIEW,
      rationaleCodes: ["GATE_1_STRUCTURE_VALIDATION_FAILED"],
      blockReasons: [PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.VALIDATION_FAILED],
      productionEligible: false,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 1,
      valid: false,
      errors: inputValidation.errors,
    };
  }

  const fixtureOnly = sanitized.validation_fixture === true;
  const hasVerifiedProductionSignal =
    normalizeNumber(sanitized.verified_signal_count, 0) > 0;
  const geographyInvalid = isInvalidGeography(sanitized.geography_mapping_status);
  const classificationsConflict =
    normalizeBoolean(sanitized.conflicting_classification, false) ||
    caseType === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.CONFLICTING_INFORMATION;

  const evidenceCount = normalizeNumber(sanitized.evidence_count, 0);
  const evidenceVerification = normalizeUpper(
    sanitized.evidence_verification_status,
    80,
    "NONE"
  );
  const confidence = normalizeUpper(
    sanitized.confidence_classification,
    80,
    PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  );

  const insufficientEvidence =
    evidenceCount <= 0 ||
    evidenceVerification !== "VERIFIED" ||
    confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW ||
    confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;

  const explicitNeed = sanitized.explicit_public_information_need === true;

  const gate2Reasons = fixtureOnly
    ? [PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.FIXTURE_ONLY]
    : [];

  if (!fixtureOnly && !hasVerifiedProductionSignal) {
    const responseCase = finalizeCase(baseCase, {
      status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.NO_CASE_REQUIRED,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED,
      urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.ROUTINE,
      rationaleCodes: ["GATE_3_NO_VERIFIED_PRODUCTION_SIGNAL"],
      blockReasons: [
        ...gate2Reasons,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.NO_VERIFIED_PRODUCTION_SIGNAL,
      ],
      productionEligible: false,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 3,
      valid: true,
      errors: [],
    };
  }

  if (geographyInvalid) {
    const responseCase = finalizeCase(baseCase, {
      status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INVALID_GEOGRAPHY,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.ELEVATED_REVIEW,
      rationaleCodes: ["GATE_4_GEOGRAPHY_VALIDATION_BLOCKED"],
      blockReasons: [
        ...gate2Reasons,
        isAmbiguousGeography(sanitized.geography_mapping_status)
          ? PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.AMBIGUOUS_GEOGRAPHY
          : PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.INVALID_GEOGRAPHY,
      ],
      productionEligible: false,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 4,
      valid: true,
      errors: [],
    };
  }

  if (classificationsConflict) {
    const responseCase = finalizeCase(baseCase, {
      status:
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_CONFLICTING_CLASSIFICATION,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.IMMEDIATE_HUMAN_REVIEW,
      rationaleCodes: ["GATE_5_CONFLICTING_CLASSIFICATION_BLOCKED"],
      blockReasons: [
        ...gate2Reasons,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.CONFLICTING_CLASSIFICATIONS,
      ],
      productionEligible: false,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 5,
      valid: true,
      errors: [],
    };
  }

  if (insufficientEvidence) {
    const evidenceReason =
      evidenceCount <= 0
        ? PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.INSUFFICIENT_EVIDENCE_COUNT
        : evidenceVerification !== "VERIFIED"
        ? PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.NO_VERIFIED_EVIDENCE
        : PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.LOW_CONFIDENCE;

    const responseCase = finalizeCase(baseCase, {
      status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.ELEVATED_REVIEW,
      rationaleCodes: ["GATE_6_EVIDENCE_VALIDATION_BLOCKED"],
      blockReasons: [...gate2Reasons, evidenceReason],
      productionEligible: false,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 6,
      valid: true,
      errors: [],
    };
  }

  if (!explicitNeed) {
    const recommendation = supportsMonitorWithoutExplicitIntent(sanitized)
      ? PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR
      : PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED;

    const responseCase = finalizeCase(baseCase, {
      status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.ELIGIBLE_FOR_HUMAN_REVIEW,
      recommendation,
      urgency: deriveUrgencyFromSignals(sanitized),
      rationaleCodes: ["GATE_7_PUBLIC_INFORMATION_NEED_NOT_EXPLICIT"],
      blockReasons: [
        ...gate2Reasons,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_BLOCK_REASONS.RESPONSE_INTENT_NOT_EXPLICIT,
      ],
      productionEligible:
        recommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 7,
      valid: true,
      errors: [],
    };
  }

  const responseReviewStatus = fixtureOnly
    ? PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.VALIDATION_FIXTURE_ONLY
    : PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.REVIEW_REQUIRED;

  if (
    caseType === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.VERIFIED_FACTUAL_ERROR &&
    sanitized.factual_error_verified === true
  ) {
    const responseCase = finalizeCase(baseCase, {
      status: responseReviewStatus,
      recommendation:
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
      urgency: deriveUrgencyFromSignals(sanitized),
      rationaleCodes: ["GATE_8_VERIFIED_FACTUAL_ERROR"],
      blockReasons: gate2Reasons,
      productionEligible: true,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 8,
      valid: true,
      errors: [],
    };
  }

  if (
    caseType === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.PUBLIC_CONFUSION &&
    sanitized.public_confusion_verified === true
  ) {
    const responseCase = finalizeCase(baseCase, {
      status: responseReviewStatus,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY,
      urgency: deriveUrgencyFromSignals(sanitized),
      rationaleCodes: ["GATE_9_VERIFIED_PUBLIC_CONFUSION"],
      blockReasons: gate2Reasons,
      productionEligible: true,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 9,
      valid: true,
      errors: [],
    };
  }

  if (
    caseType === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.SERVICE_INFORMATION_NEED &&
    sanitized.service_information_available === true
  ) {
    const responseCase = finalizeCase(baseCase, {
      status: responseReviewStatus,
      recommendation:
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE,
      urgency: deriveUrgencyFromSignals(sanitized),
      rationaleCodes: ["GATE_10_VERIFIED_SERVICE_INFORMATION"],
      blockReasons: gate2Reasons,
      productionEligible: true,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 10,
      valid: true,
      errors: [],
    };
  }

  if (
    caseType ===
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.VERIFIED_INFORMATION_OPPORTUNITY &&
    sanitized.verified_information_available === true
  ) {
    const responseCase = finalizeCase(baseCase, {
      status: responseReviewStatus,
      recommendation:
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION,
      urgency: deriveUrgencyFromSignals(sanitized),
      rationaleCodes: ["GATE_11_VERIFIED_INFORMATION_OPPORTUNITY"],
      blockReasons: gate2Reasons,
      productionEligible: true,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 11,
      valid: true,
      errors: [],
    };
  }

  if (supportsMonitorWithoutExplicitIntent(sanitized)) {
    const responseCase = finalizeCase(baseCase, {
      status: responseReviewStatus,
      recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR,
      urgency: deriveUrgencyFromSignals(sanitized),
      rationaleCodes: ["GATE_12_MONITORING"],
      blockReasons: gate2Reasons,
      productionEligible: true,
    });

    return {
      schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
      input: sanitized,
      response_case: responseCase,
      gate: 12,
      valid: true,
      errors: [],
    };
  }

  const responseCase = finalizeCase(baseCase, {
    status: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.NO_CASE_REQUIRED,
    recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED,
    urgency: PIP_PUBLIC_COMMUNICATION_URGENCY_CLASSIFICATIONS.ROUTINE,
    rationaleCodes: ["GATE_13_NO_RESPONSE_REQUIRED"],
    blockReasons: gate2Reasons,
    productionEligible: false,
  });

  return {
    schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_EVALUATION_SCHEMA,
    input: sanitized,
    response_case: responseCase,
    gate: 13,
    valid: true,
    errors: [],
  };
}

export function buildPipPublicCommunicationResponseCase(input = {}, options = {}) {
  const evaluation = evaluatePipPublicCommunicationResponseCase(input, options);
  const validation = validatePipPublicCommunicationResponseCase(
    evaluation.response_case
  );

  return {
    ...evaluation,
    response_case: validation.normalized,
    valid: evaluation.valid === true && validation.valid === true,
    errors: [...toArray(evaluation.errors), ...toArray(validation.errors)],
  };
}

function buildInputFromSnapshot({
  commandCentreSnapshot,
  explicitCommunicationNeeds,
  validationFixtureMode,
} = {}) {
  const snapshot = isPlainObject(commandCentreSnapshot) ? commandCentreSnapshot : {};

  const escalationItems = toArray(snapshot.issue_escalation?.items);
  const narrativeRecords = toArray(snapshot.narrative_radar?.records);
  const evidenceItems = toArray(snapshot.evidence_centre?.items);
  const statewideSignals = normalizeNumber(
    snapshot.statewide_overview?.verified_public_signal_count,
    0
  );

  const needsByIssue = new Map();
  toArray(explicitCommunicationNeeds).forEach((entry) => {
    const key = sanitizeText(entry.source_issue_id || entry.issue_label, 160).toUpperCase();
    if (key) {
      needsByIssue.set(key, entry);
    }
  });

  const narrativeByIssue = new Map();
  narrativeRecords.forEach((entry) => {
    const key = sanitizeText(entry.issue_label, 160).toUpperCase();
    if (!key) return;
    if (!narrativeByIssue.has(key)) {
      narrativeByIssue.set(key, entry);
    }
  });

  const evidenceByIssue = new Map();
  evidenceItems.forEach((entry) => {
    const key = sanitizeText(entry.issue_label, 160).toUpperCase();
    if (!key) return;
    const existing = evidenceByIssue.get(key) || {
      count: 0,
      verifiedCount: 0,
      observationWindow: "",
    };
    const count = normalizeNumber(entry.aggregate_source_record_count, 0) || 1;
    evidenceByIssue.set(key, {
      count: existing.count + count,
      verifiedCount:
        existing.verifiedCount +
        (normalizeUpper(entry.verification_status, 80, "NONE") === "VERIFIED" ? 1 : 0),
      observationWindow:
        existing.observationWindow || sanitizeText(entry.observation_window, 140),
    });
  });

  const fixtureContext =
    validationFixtureMode === true ||
    snapshot.fixture_disclosures?.validation_fixture_mode === true;

  const inputs = escalationItems.map((entry, index) => {
    const issueLabel = sanitizeText(entry.issue_label, 180) || `UNSPECIFIED_ISSUE_${index + 1}`;
    const issueKey = issueLabel.toUpperCase();
    const sourceIssueId = sanitizeText(entry.escalation_id || entry.queue_item_id, 120) ||
      `SRC-${String(index + 1).padStart(3, "0")}`;
    const needMeta =
      needsByIssue.get(sourceIssueId.toUpperCase()) || needsByIssue.get(issueKey) || {};
    const narrative = narrativeByIssue.get(issueKey) || {};
    const evidence = evidenceByIssue.get(issueKey) || { count: 0, verifiedCount: 0 };

    return sanitizePipPublicCommunicationResponseCaseInput({
      schema: "pip.public-communication.response-case.input.v1",
      source_issue_id: sourceIssueId,
      issue_label: issueLabel,
      issue_category:
        sanitizeText(needMeta.issue_category, 120) ||
        sanitizeText(narrative.issue_category, 120) ||
        "UNSPECIFIED_CATEGORY",
      explicit_case_type:
        sanitizeText(needMeta.explicit_case_type, 80) ||
        (normalizeUpper(entry.classification, 80) === "GEOGRAPHY_REVIEW_REQUIRED"
          ? PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.GEOGRAPHY_REVIEW
          : normalizeUpper(entry.classification, 80) === "HUMAN_REVIEW_REQUIRED"
          ? PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.CONFLICTING_INFORMATION
          : PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.GENERAL_MONITORING),
      explicit_public_information_need: normalizeBoolean(
        needMeta.explicit_public_information_need,
        false
      ),
      geography_scope: sanitizeText(entry.geography_scope, 160) || "UNSPECIFIED_GEOGRAPHY",
      geography_mapping_status:
        sanitizeText(needMeta.geography_mapping_status, 80) ||
        (normalizeUpper(entry.classification, 80) === "GEOGRAPHY_REVIEW_REQUIRED"
          ? "INVALID"
          : "EXACT_BATCH_62A_CHAIN"),
      trend_classification: sanitizeText(narrative.trend_classification, 80) || "INSUFFICIENT_EVIDENCE",
      narrative_velocity:
        sanitizeText(narrative.narrative_velocity, 80) || "INSUFFICIENT_EVIDENCE",
      sentiment_classification:
        sanitizeText(needMeta.sentiment_classification, 80) || "INSUFFICIENT_EVIDENCE",
      verified_signal_count:
        statewideSignals > 0
          ? Math.max(1, normalizeNumber(entry.evidence_count, 0))
          : 0,
      evidence_count:
        normalizeNumber(needMeta.evidence_count, evidence.count) ||
        normalizeNumber(entry.evidence_count, 0),
      evidence_verification_status:
        sanitizeText(needMeta.evidence_verification_status, 80) ||
        (evidence.verifiedCount > 0 ? "VERIFIED" : "NONE"),
      confidence_classification:
        sanitizeText(needMeta.confidence_classification, 80) ||
        sanitizeText(entry.confidence, 80) ||
        "INSUFFICIENT_EVIDENCE",
      service_information_available: normalizeBoolean(
        needMeta.service_information_available,
        false
      ),
      factual_error_verified: normalizeBoolean(needMeta.factual_error_verified, false),
      public_confusion_verified: normalizeBoolean(
        needMeta.public_confusion_verified,
        false
      ),
      verified_information_available: normalizeBoolean(
        needMeta.verified_information_available,
        false
      ),
      conflicting_classification: normalizeBoolean(
        needMeta.conflicting_classification,
        normalizeUpper(entry.classification, 80) === "HUMAN_REVIEW_REQUIRED"
      ),
      observation_window:
        sanitizeText(needMeta.observation_window, 140) ||
        sanitizeText(narrative.observation_window, 140) ||
        sanitizeText(evidence.observationWindow, 140),
      validation_fixture:
        normalizeBoolean(entry.fixture, false) || fixtureContext === true,
    });
  });

  if (inputs.length <= 0) {
    inputs.push(
      sanitizePipPublicCommunicationResponseCaseInput({
        schema: "pip.public-communication.response-case.input.v1",
        source_issue_id: "NO-VERIFIED-PRODUCTION-SIGNAL",
        issue_label: "NO VERIFIED PRODUCTION RESPONSE CASES AVAILABLE",
        issue_category: "UNSPECIFIED_CATEGORY",
        explicit_case_type: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_TYPES.UNSPECIFIED,
        explicit_public_information_need: false,
        geography_scope: "ACTIVE_CONSTITUENCY",
        geography_mapping_status: "UNKNOWN",
        trend_classification: "INSUFFICIENT_EVIDENCE",
        narrative_velocity: "INSUFFICIENT_EVIDENCE",
        sentiment_classification: "INSUFFICIENT_EVIDENCE",
        verified_signal_count: 0,
        evidence_count: 0,
        evidence_verification_status: "NONE",
        confidence_classification: "INSUFFICIENT_EVIDENCE",
        service_information_available: false,
        factual_error_verified: false,
        public_confusion_verified: false,
        verified_information_available: false,
        conflicting_classification: false,
        observation_window: "",
        validation_fixture: fixtureContext,
      })
    );
  }

  return inputs;
}

export function buildPipPublicCommunicationResponseCaseCollection({
  commandCentreSnapshot,
  explicitCommunicationNeeds = [],
  validationFixtureMode = false,
  generatedAt,
} = {}) {
  const snapshot =
    isPlainObject(commandCentreSnapshot) &&
    commandCentreSnapshot.schema === PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA
      ? commandCentreSnapshot
      : buildPip360CommandCentreSnapshot({
          publicSignalSummaries: [],
          validationFixtureMode,
        });

  const inputs = buildInputFromSnapshot({
    commandCentreSnapshot: snapshot,
    explicitCommunicationNeeds,
    validationFixtureMode,
  });

  const evaluations = inputs.map((entry) =>
    buildPipPublicCommunicationResponseCase(entry, { generatedAt })
  );

  const allCases = evaluations.map((entry) => entry.response_case);
  const sortedCases = allCases.slice().sort((a, b) => {
    const urgencyDelta = urgencyRank(b.urgency) - urgencyRank(a.urgency);
    if (urgencyDelta !== 0) return urgencyDelta;

    const evidenceDelta =
      evidenceRank(b.evidence_readiness_status) - evidenceRank(a.evidence_readiness_status);
    if (evidenceDelta !== 0) return evidenceDelta;

    const verifiedDelta =
      normalizeNumber(b.verified_signal_count, 0) - normalizeNumber(a.verified_signal_count, 0);
    if (verifiedDelta !== 0) return verifiedDelta;

    const evidenceCountDelta =
      normalizeNumber(b.evidence_count, 0) - normalizeNumber(a.evidence_count, 0);
    if (evidenceCountDelta !== 0) return evidenceCountDelta;

    return String(a.generated_at).localeCompare(String(b.generated_at));
  });

  const productionCases = sortedCases.filter(
    (entry) => entry.production_eligible === true && entry.validation_fixture !== true
  );
  const fixtureCases = sortedCases.filter((entry) => entry.validation_fixture === true);
  const blockedCases = sortedCases.filter((entry) =>
    [
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INVALID_GEOGRAPHY,
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_CONFLICTING_CLASSIFICATION,
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID,
    ].includes(entry.status)
  );
  const reviewCases = sortedCases.filter((entry) =>
    [
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.REVIEW_REQUIRED,
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.ELIGIBLE_FOR_HUMAN_REVIEW,
      PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.VALIDATION_FIXTURE_ONLY,
    ].includes(entry.status)
  );
  const noCaseRequired = sortedCases.filter(
    (entry) => entry.status === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.NO_CASE_REQUIRED
  );

  const productionSummaryCases = sortedCases.filter(
    (entry) => entry.validation_fixture !== true
  );

  const summary = {
    total_inputs: inputs.length,
    production_eligible_cases: productionCases.length,
    fixture_cases: fixtureCases.length,
    blocked_cases: blockedCases.length,
    review_required_cases: reviewCases.length,
    monitor_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR
    ).length,
    clarification_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY
    ).length,
    factual_correction_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE
    ).length,
    service_update_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE
    ).length,
    verified_information_amplification_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION
    ).length,
    no_response_required_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED
    ).length,
    invalid_cases: productionSummaryCases.filter(
      (entry) => entry.status === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID
    ).length,
    escalate_for_review_cases: productionSummaryCases.filter(
      (entry) =>
        entry.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW
    ).length,
  };

  const collection = {
    schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    source_snapshot_schema: snapshot.schema,
    production_cases: productionCases,
    validation_fixture_cases: fixtureCases,
    blocked_cases: blockedCases,
    review_cases: reviewCases,
    no_case_required: noCaseRequired,
    summary,
    safety: {
      public_information_support_only: true,
      response_wording_generated: false,
      communication_objective_generated: false,
      factual_core_generated: false,
      content_draft_generated: false,
      automated_response_enabled: false,
      automated_publication_enabled: false,
      demographic_targeting_used: false,
      population_weighting_used: false,
      raw_public_content_included: false,
      voter_data_included: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_access_enabled: false,
    },
    all_cases: sortedCases,
  };

  const validation = validatePipPublicCommunicationResponseCaseCollection(collection);

  return {
    ...collection,
    validation,
    evaluations,
  };
}

export function buildPipPublicCommunicationResponseCaseSummary(collection = {}) {
  const safe = isPlainObject(collection) ? collection : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  return {
    total_inputs: normalizeNumber(summary.total_inputs, 0),
    production_response_cases: normalizeNumber(summary.production_eligible_cases, 0),
    fixture_cases: normalizeNumber(summary.fixture_cases, 0),
    blocked_cases: normalizeNumber(summary.blocked_cases, 0),
    review_required_cases: normalizeNumber(summary.review_required_cases, 0),
    monitor_cases: normalizeNumber(summary.monitor_cases, 0),
    clarify_cases: normalizeNumber(summary.clarification_cases, 0),
    correct_with_evidence_cases: normalizeNumber(summary.factual_correction_cases, 0),
    provide_service_update_cases: normalizeNumber(summary.service_update_cases, 0),
    amplify_verified_information_cases: normalizeNumber(
      summary.verified_information_amplification_cases,
      0
    ),
    no_response_required_cases: normalizeNumber(summary.no_response_required_cases, 0),
    invalid_cases: normalizeNumber(summary.invalid_cases, 0),
    collection_validation: safe.validation?.valid === true ? "VALID" : "INVALID",
  };
}

export function buildPipPublicCommunicationResponseCaseValidationFixture({
  generatedAt,
} = {}) {
  const fixtureInputs = [
    {
      source_issue_id: "FX-01",
      issue_label: "No verified production signal",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "UNSPECIFIED",
      explicit_public_information_need: false,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      trend_classification: "STABLE",
      narrative_velocity: "LOW",
      sentiment_classification: "NEGATIVE",
      verified_signal_count: 0,
      evidence_count: 0,
      evidence_verification_status: "NONE",
      confidence_classification: "INSUFFICIENT_EVIDENCE",
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-02",
      issue_label: "Fixture only",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "PUBLIC_CONFUSION",
      explicit_public_information_need: true,
      geography_scope: "TEST/P999",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      trend_classification: "RISING",
      narrative_velocity: "HIGH",
      sentiment_classification: "MIXED",
      verified_signal_count: 5,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      public_confusion_verified: true,
      validation_fixture: true,
    },
    {
      source_issue_id: "FX-03",
      issue_label: "Invalid geography",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "GENERAL_MONITORING",
      explicit_public_information_need: true,
      geography_scope: "UNKNOWN",
      geography_mapping_status: "INVALID",
      trend_classification: "RISING",
      narrative_velocity: "HIGH",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-04",
      issue_label: "Ambiguous geography",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "GENERAL_MONITORING",
      explicit_public_information_need: true,
      geography_scope: "UNKNOWN",
      geography_mapping_status: "AMBIGUOUS",
      trend_classification: "RISING",
      narrative_velocity: "HIGH",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-05",
      issue_label: "Conflicting",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "CONFLICTING_INFORMATION",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      trend_classification: "MIXED",
      narrative_velocity: "MODERATE",
      verified_signal_count: 3,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "MEDIUM",
      conflicting_classification: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-06",
      issue_label: "Missing evidence",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "PUBLIC_CONFUSION",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      verified_signal_count: 3,
      evidence_count: 0,
      evidence_verification_status: "NONE",
      confidence_classification: "LOW",
      public_confusion_verified: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-07",
      issue_label: "Low confidence",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "PUBLIC_CONFUSION",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      verified_signal_count: 3,
      evidence_count: 2,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "LOW",
      public_confusion_verified: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-08",
      issue_label: "Verified factual error",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "VERIFIED_FACTUAL_ERROR",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      verified_signal_count: 4,
      evidence_count: 4,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      factual_error_verified: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-09",
      issue_label: "Verified confusion",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "PUBLIC_CONFUSION",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      public_confusion_verified: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-10",
      issue_label: "Service need",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "SERVICE_INFORMATION_NEED",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      service_information_available: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-11",
      issue_label: "Verified information opportunity",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "VERIFIED_INFORMATION_OPPORTUNITY",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "HIGH",
      verified_information_available: true,
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-12",
      issue_label: "Rising narrative monitor",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "GENERAL_MONITORING",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      trend_classification: "RISING",
      narrative_velocity: "MODERATE",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "MEDIUM",
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-13",
      issue_label: "Stable low velocity",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "GENERAL_MONITORING",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      trend_classification: "STABLE",
      narrative_velocity: "LOW",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "MEDIUM",
      validation_fixture: false,
    },
    {
      source_issue_id: "FX-14",
      issue_label: "Negative sentiment only",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "GENERAL_MONITORING",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      sentiment_classification: "NEGATIVE",
      trend_classification: "STABLE",
      narrative_velocity: "LOW",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "MEDIUM",
      validation_fixture: false,
      demographic_priority_weight: 100,
    },
    {
      source_issue_id: "FX-15",
      issue_label: "Velocity only",
      issue_category: "UNSPECIFIED",
      explicit_case_type: "GENERAL_MONITORING",
      explicit_public_information_need: true,
      geography_scope: "MELAKA/P134",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      trend_classification: "STABLE",
      narrative_velocity: "HIGH",
      verified_signal_count: 4,
      evidence_count: 3,
      evidence_verification_status: "VERIFIED",
      confidence_classification: "MEDIUM",
      validation_fixture: false,
      voter_id: "SHOULD_BE_STRIPPED",
      post_text: "SHOULD_BE_STRIPPED",
    },
  ];

  const fixtureEvaluations = fixtureInputs.map((entry) =>
    buildPipPublicCommunicationResponseCase(entry, { generatedAt })
  );

  const fixtureCases = fixtureEvaluations.map((entry) => entry.response_case);
  const fixtureCollection = {
    schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    production_cases: fixtureCases.filter(
      (entry) => entry.production_eligible === true && entry.validation_fixture !== true
    ),
    validation_fixture_cases: fixtureCases.filter(
      (entry) => entry.validation_fixture === true
    ),
    blocked_cases: fixtureCases.filter((entry) =>
      [
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INVALID_GEOGRAPHY,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_CONFLICTING_CLASSIFICATION,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID,
      ].includes(entry.status)
    ),
    review_cases: fixtureCases.filter((entry) =>
      [
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.REVIEW_REQUIRED,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.ELIGIBLE_FOR_HUMAN_REVIEW,
        PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.VALIDATION_FIXTURE_ONLY,
      ].includes(entry.status)
    ),
    no_case_required: fixtureCases.filter(
      (entry) =>
        entry.status === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.NO_CASE_REQUIRED
    ),
    summary: {
      total_inputs: fixtureInputs.length,
      production_eligible_cases: fixtureCases.filter(
        (entry) => entry.production_eligible === true && entry.validation_fixture !== true
      ).length,
      fixture_cases: fixtureCases.filter((entry) => entry.validation_fixture === true).length,
      blocked_cases: fixtureCases.filter((entry) =>
        [
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_INVALID_GEOGRAPHY,
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.BLOCKED_CONFLICTING_CLASSIFICATION,
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID,
        ].includes(entry.status)
      ).length,
      review_required_cases: fixtureCases.filter((entry) =>
        [
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.REVIEW_REQUIRED,
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.ELIGIBLE_FOR_HUMAN_REVIEW,
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.VALIDATION_FIXTURE_ONLY,
        ].includes(entry.status)
      ).length,
      monitor_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR
      ).length,
      clarification_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY
      ).length,
      factual_correction_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE
      ).length,
      service_update_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE
      ).length,
      verified_information_amplification_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION
      ).length,
      no_response_required_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED
      ).length,
      invalid_cases: fixtureCases.filter(
        (entry) => entry.status === PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.INVALID
      ).length,
      escalate_for_review_cases: fixtureCases.filter(
        (entry) =>
          entry.recommendation ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW
      ).length,
    },
  };

  const collectionValidation = validatePipPublicCommunicationResponseCaseCollection(
    fixtureCollection
  );

  const caseById = new Map(fixtureCases.map((entry) => [entry.source_issue_id, entry]));

  return {
    schema: "pip.public-communication.response-case.validation-fixture.v1",
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    checks: {
      no_verified_signal_returns_no_response_required:
        caseById.get("FX-01")?.recommendation ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED &&
        caseById.get("FX-01")?.status ===
          PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_STATUSES.NO_CASE_REQUIRED,
      fixture_only_input_non_production:
        caseById.get("FX-02")?.validation_fixture === true &&
        caseById.get("FX-02")?.production_eligible === false,
      invalid_geography_escalates:
        caseById.get("FX-03")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      ambiguous_geography_escalates:
        caseById.get("FX-04")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      conflicting_classification_escalates:
        caseById.get("FX-05")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      missing_evidence_escalates:
        caseById.get("FX-06")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      low_confidence_escalates:
        caseById.get("FX-07")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
      verified_factual_error_corrects:
        caseById.get("FX-08")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
      verified_public_confusion_clarifies:
        caseById.get("FX-09")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY,
      verified_service_need_updates:
        caseById.get("FX-10")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE,
      verified_information_amplifies:
        caseById.get("FX-11")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION,
      rising_verified_narrative_monitors:
        caseById.get("FX-12")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR,
      stable_low_velocity_no_response:
        caseById.get("FX-13")?.recommendation ===
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED,
      negative_sentiment_alone_no_correction:
        caseById.get("FX-14")?.recommendation !==
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
      high_velocity_alone_no_correction:
        caseById.get("FX-15")?.recommendation !==
        PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
      demographic_fields_stripped:
        !Object.prototype.hasOwnProperty.call(
          sanitizePipPublicCommunicationResponseCaseInput(fixtureInputs[13]),
          "demographic_priority_weight"
        ),
      voter_fields_stripped:
        !Object.prototype.hasOwnProperty.call(
          sanitizePipPublicCommunicationResponseCaseInput(fixtureInputs[14]),
          "voter_id"
        ),
      raw_public_content_stripped:
        !Object.prototype.hasOwnProperty.call(
          sanitizePipPublicCommunicationResponseCaseInput(fixtureInputs[14]),
          "post_text"
        ),
      no_draft_wording_produced: fixtureCases.every(
        (entry) =>
          !JSON.stringify(entry).match(/draft|wording|hashtag|platform|message_text/i)
      ),
      fixture_excluded_from_production_totals:
        fixtureCollection.production_cases.every(
          (entry) => entry.validation_fixture !== true
        ),
    },
    collection: {
      ...fixtureCollection,
      validation: collectionValidation,
    },
    evaluations: fixtureEvaluations,
  };
}

export function serializePipPublicCommunicationResponseCaseExport(payload = {}) {
  const safe = sanitizePipPublicCommunicationResponseCaseExport(payload);
  return JSON.stringify(safe, null, 2);
}

export function createPipPublicCommunicationResponseCaseExportFileName({
  constituencyCode,
  generatedAt,
} = {}) {
  const code = normalizeUpper(constituencyCode || "PIP", 24, "PIP").toLowerCase();
  const stamp = new Date(generatedAt ?? Date.now())
    .toISOString()
    .replace(/[:.]/g, "-");
  return `pip-public-communication-response-case-${code}-${stamp}.json`;
}

export {
  PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_RESPONSE_CASE_CONTRACT_SCHEMA,
};
