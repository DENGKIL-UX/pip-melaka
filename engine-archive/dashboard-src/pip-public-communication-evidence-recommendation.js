import {
  PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS,
} from "./pip-public-communication-response-case-contract.js";
import {
  PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_EXPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES,
  PIP_PUBLIC_COMMUNICATION_OBJECTIVES,
  PIP_PUBLIC_COMMUNICATION_OWNER_ROLES,
  PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES,
  PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS,
  PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES,
  sanitizePipPublicCommunicationEvidenceRecommendationExport,
  validatePipPublicCommunicationEvidenceItem,
  validatePipPublicCommunicationEvidenceRecommendationCollection,
  validatePipPublicCommunicationEvidenceRecommendationPackage,
  validatePipPublicCommunicationVerifiedFact,
} from "./pip-public-communication-evidence-recommendation-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 220) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeUpper(value, max = 120, fallback = "") {
  const text = sanitizeText(value, max).toUpperCase();
  return text || fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true") return true;
    if (value.trim().toLowerCase() === "false") return false;
  }
  return fallback;
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sanitizeEvidenceItemRecord(input = {}, { validationFixture = false } = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_ITEM_SCHEMA,
    evidence_id: sanitizeText(input.evidence_id, 120),
    evidence_type: sanitizeText(input.evidence_type, 120) || "VERIFIED_PUBLIC_RECORD",
    source_reference: sanitizeText(input.source_reference, 220),
    lineage_reference: sanitizeText(input.lineage_reference, 220),
    observed_at: normalizeIso(input.observed_at),
    verified_at: normalizeIso(input.verified_at),
    valid_until: normalizeIso(input.valid_until),
    verification_status: sanitizeUpper(
      input.verification_status,
      80,
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.PENDING_VERIFICATION
    ),
    summary: sanitizeText(input.summary, 260),
    validation_fixture: normalizeBoolean(input.validation_fixture, validationFixture),
  };
}

function sanitizeVerifiedFactRecord(input = {}, { validationFixture = false } = {}) {
  return {
    schema: PIP_PUBLIC_COMMUNICATION_VERIFIED_FACT_SCHEMA,
    fact_id: sanitizeText(input.fact_id, 120),
    factual_statement: sanitizeText(input.factual_statement, 280),
    supporting_evidence_ids: uniq(
      toArray(input.supporting_evidence_ids).map((entry) => sanitizeText(entry, 120))
    ),
    verification_status: sanitizeUpper(
      input.verification_status,
      80,
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.PENDING_VERIFICATION
    ),
    verified_at: normalizeIso(input.verified_at),
    valid_until: normalizeIso(input.valid_until),
    uncertainty_note: sanitizeText(input.uncertainty_note, 260),
    validation_fixture: normalizeBoolean(input.validation_fixture, validationFixture),
  };
}

function normalizeEvidenceBundle(input = {}, { validationFixture = false } = {}) {
  const safe = isPlainObject(input) ? input : {};
  return {
    response_case_id: sanitizeText(safe.response_case_id, 120),
    source_issue_id: sanitizeText(safe.source_issue_id, 140),
    validation_fixture: normalizeBoolean(safe.validation_fixture, validationFixture),
    evidence_items: toArray(safe.evidence_items).map((entry) =>
      sanitizeEvidenceItemRecord(entry, { validationFixture })
    ),
    verified_facts: toArray(safe.verified_facts).map((entry) =>
      sanitizeVerifiedFactRecord(entry, { validationFixture })
    ),
  };
}

export function mapBatch63ARecommendationToEvidenceObjective(recommendation) {
  const value = sanitizeUpper(recommendation, 120);
  const mapping = {
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.MONITOR_AND_VERIFY,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.CLARIFY_VERIFIED_INFORMATION,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.CORRECT_VERIFIED_INFORMATION,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.PROVIDE_VERIFIED_SERVICE_UPDATE,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.AMPLIFY_VERIFIED_INFORMATION,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.ESCALATE_FOR_SPECIALIST_REVIEW,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED]:
      PIP_PUBLIC_COMMUNICATION_OBJECTIVES.NO_PUBLIC_COMMUNICATION_ACTION,
  };

  if (!Object.prototype.hasOwnProperty.call(mapping, value)) {
    throw new Error(`Unsupported Batch 63A recommendation: ${value || "UNKNOWN"}`);
  }

  return mapping[value];
}

function isEvidenceExpired(evidenceItem) {
  const validUntil = normalizeIso(evidenceItem?.valid_until);
  if (!validUntil) return false;
  return Date.parse(validUntil) < Date.now();
}

export function resolvePipPublicCommunicationEvidenceUncertainty({
  status,
  verifiedFactCount,
  verifiedEvidenceCount,
  conflictingEvidence,
} = {}) {
  if (status === PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE) {
    return PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
  }

  if (
    status === PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_CONFLICTING_EVIDENCE ||
    conflictingEvidence === true
  ) {
    return PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.HIGH;
  }

  if (normalizeNumber(verifiedFactCount, 0) >= 2 && normalizeNumber(verifiedEvidenceCount, 0) >= 2) {
    return PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.LOW;
  }

  return PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.MODERATE;
}

export function resolvePipPublicCommunicationEvidenceWordingRisks({
  status,
  validationFixture,
  evidenceExpired,
  conflictingEvidence,
  insufficientEvidence,
  uncertaintyClassification,
} = {}) {
  const risks = [];

  if (validationFixture === true) {
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.FIXTURE_CONTENT);
  }
  if (evidenceExpired === true) {
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.OUTDATED_INFORMATION);
  }
  if (conflictingEvidence === true) {
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.CONFLICTING_EVIDENCE);
  }
  if (insufficientEvidence === true) {
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.INSUFFICIENT_CONTEXT);
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.UNVERIFIED_NUMBER);
  }
  if (status === PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW) {
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.LEGAL_OR_POLICY_AMBIGUITY);
  }
  if (
    uncertaintyClassification === PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.HIGH ||
    uncertaintyClassification ===
      PIP_PUBLIC_COMMUNICATION_UNCERTAINTY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
  ) {
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.MISLEADING_CERTAINTY);
    risks.push(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.OVERCLAIM);
  }

  return uniq(risks);
}

export function resolvePipPublicCommunicationEvidenceApprovalLevel({
  sourceRecommendation,
  wordingRiskCodes = [],
} = {}) {
  const recommendation = sanitizeUpper(sourceRecommendation, 120);

  const baseMapping = {
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.SUBJECT_MATTER_REVIEW,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.EDITORIAL_REVIEW,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.SUBJECT_MATTER_REVIEW,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.SUBJECT_MATTER_REVIEW,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.SENIOR_COMMUNICATIONS_APPROVAL,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.LEGAL_OR_POLICY_REVIEW,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED]:
      PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.NO_PUBLIC_ACTION_REQUIRED,
  };

  const base =
    baseMapping[recommendation] ?? PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.SUBJECT_MATTER_REVIEW;

  const riskSet = new Set(toArray(wordingRiskCodes));
  if (
    riskSet.has(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.LEGAL_OR_POLICY_AMBIGUITY) ||
    riskSet.has(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.SERVICE_COMMITMENT_RISK) ||
    riskSet.has(PIP_PUBLIC_COMMUNICATION_WORDING_RISK_CODES.CONFLICTING_EVIDENCE)
  ) {
    return PIP_PUBLIC_COMMUNICATION_APPROVAL_LEVELS.EXECUTIVE_REVIEW;
  }

  return base;
}

export function resolvePipPublicCommunicationEvidenceOwnerRole({ sourceRecommendation } = {}) {
  const recommendation = sanitizeUpper(sourceRecommendation, 120);
  const mapping = {
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.MONITORING_ANALYST,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.COMMUNICATIONS_OFFICER,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.SUBJECT_MATTER_OWNER,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.SERVICE_OWNER,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.COMMUNICATIONS_OFFICER,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.LEGAL_POLICY_REVIEWER,
    [PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED]:
      PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.NO_OWNER_REQUIRED,
  };

  return mapping[recommendation] ?? PIP_PUBLIC_COMMUNICATION_OWNER_ROLES.SENIOR_APPROVER;
}

function buildObjectiveSummary(objective) {
  const summaryByObjective = {
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.MONITOR_AND_VERIFY]:
      "Monitor and verify public-information evidence before any communication action.",
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.CLARIFY_VERIFIED_INFORMATION]:
      "Clarify verified public information concerning the identified issue.",
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.CORRECT_VERIFIED_INFORMATION]:
      "Correct verified public information using explicitly validated facts and evidence.",
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.PROVIDE_VERIFIED_SERVICE_UPDATE]:
      "Provide a verified service-information update grounded in validated evidence.",
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.AMPLIFY_VERIFIED_INFORMATION]:
      "Amplify verified public information without persuasion or targeting.",
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.ESCALATE_FOR_SPECIALIST_REVIEW]:
      "Escalate the case for specialist review before any public-information action.",
    [PIP_PUBLIC_COMMUNICATION_OBJECTIVES.NO_PUBLIC_COMMUNICATION_ACTION]:
      "No public communication action is required for the current verified context.",
  };

  return summaryByObjective[objective] ||
    "Clarify verified public information concerning the identified issue.";
}

function resolveBundleForCase(responseCase, verifiedEvidenceBundles = [], validationFixtureMode = false) {
  const responseCaseId = sanitizeText(responseCase?.response_case_id, 120);
  const sourceIssueId = sanitizeText(responseCase?.source_issue_id, 140);

  const match = toArray(verifiedEvidenceBundles)
    .map((entry) => normalizeEvidenceBundle(entry, { validationFixture: validationFixtureMode }))
    .find(
      (entry) =>
        (entry.response_case_id && entry.response_case_id === responseCaseId) ||
        (entry.source_issue_id && entry.source_issue_id === sourceIssueId)
    );

  if (match) {
    return match;
  }

  return normalizeEvidenceBundle(
    {
      response_case_id: responseCaseId,
      source_issue_id: sourceIssueId,
      evidence_items: [],
      verified_facts: [],
      validation_fixture: normalizeBoolean(responseCase?.validation_fixture, validationFixtureMode),
    },
    { validationFixture: validationFixtureMode }
  );
}

function determinePackageStatus({
  sourceRecommendation,
  responseCaseValid,
  sourceProductionEligible,
  validationFixture,
  verifiedFacts,
  verifiedEvidence,
  unknownEvidenceIds,
  hasConflictingEvidence,
  hasExpiredEvidence,
  hasLineageGap,
  hasEmptyFactStatement,
} = {}) {
  if (!responseCaseValid) {
    return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.INVALID;
  }

  if (sourceRecommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED) {
    return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.NO_PACKAGE_REQUIRED;
  }

  if (sourceRecommendation === PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW) {
    return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW;
  }

  if (validationFixture === true) {
    return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.VALIDATION_FIXTURE_ONLY;
  }

  if (hasConflictingEvidence) {
    return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_CONFLICTING_EVIDENCE;
  }

  const insufficientEvidence =
    sourceProductionEligible !== true ||
    verifiedFacts.length <= 0 ||
    verifiedEvidence.length <= 0 ||
    unknownEvidenceIds.length > 0 ||
    hasExpiredEvidence ||
    hasLineageGap ||
    hasEmptyFactStatement;

  if (insufficientEvidence) {
    return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE;
  }

  return PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW;
}

export function buildPipPublicCommunicationEvidenceRecommendationPackage({
  responseCase,
  evidenceBundle,
  generatedAt,
} = {}) {
  const sourceCase = isPlainObject(responseCase) ? responseCase : {};
  const safeBundle = normalizeEvidenceBundle(evidenceBundle, {
    validationFixture: normalizeBoolean(sourceCase.validation_fixture, false),
  });

  const sourceRecommendation = sanitizeUpper(sourceCase.recommendation, 120);
  const responseCaseValid = sanitizeText(sourceCase.response_case_id, 120).length > 0;

  const objective = mapBatch63ARecommendationToEvidenceObjective(sourceRecommendation);

  const evidenceValidations = safeBundle.evidence_items.map((entry) =>
    validatePipPublicCommunicationEvidenceItem(entry)
  );
  const factValidations = safeBundle.verified_facts.map((entry) =>
    validatePipPublicCommunicationVerifiedFact(entry)
  );

  const verifiedEvidence = evidenceValidations
    .filter((entry) => entry.valid === true)
    .map((entry) => entry.normalized)
    .filter(
      (entry) =>
        entry.verification_status === PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.VERIFIED
    );

  const verifiedFacts = factValidations
    .filter((entry) => entry.valid === true)
    .map((entry) => entry.normalized)
    .filter(
      (entry) =>
        entry.verification_status === PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.VERIFIED
    );

  const evidenceIdSet = new Set(verifiedEvidence.map((entry) => String(entry.evidence_id)));

  const unknownEvidenceIds = uniq(
    verifiedFacts
      .flatMap((entry) => toArray(entry.supporting_evidence_ids))
      .filter((entry) => !evidenceIdSet.has(String(entry)))
  );

  const hasConflictingEvidence = safeBundle.evidence_items.some((entry) =>
    [
      PIP_PUBLIC_COMMUNICATION_EVIDENCE_VERIFICATION_STATUSES.CONFLICTING,
    ].includes(sanitizeUpper(entry.verification_status, 80))
  );

  const hasExpiredEvidence = verifiedEvidence.some((entry) => isEvidenceExpired(entry));
  const hasLineageGap = verifiedEvidence.some(
    (entry) => sanitizeText(entry.lineage_reference, 220).length <= 0
  );
  const hasEmptyFactStatement = verifiedFacts.some(
    (entry) => sanitizeText(entry.factual_statement, 280).length <= 0
  );

  const packageStatus = determinePackageStatus({
    sourceRecommendation,
    responseCaseValid,
    sourceProductionEligible: normalizeBoolean(sourceCase.production_eligible, false),
    validationFixture: normalizeBoolean(sourceCase.validation_fixture, false),
    verifiedFacts,
    verifiedEvidence,
    unknownEvidenceIds,
    hasConflictingEvidence,
    hasExpiredEvidence,
    hasLineageGap,
    hasEmptyFactStatement,
  });

  const uncertaintyClassification = resolvePipPublicCommunicationEvidenceUncertainty({
    status: packageStatus,
    verifiedFactCount: verifiedFacts.length,
    verifiedEvidenceCount: verifiedEvidence.length,
    conflictingEvidence: hasConflictingEvidence,
  });

  const insufficientEvidence =
    packageStatus ===
    PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE;

  const wordingRiskCodes = resolvePipPublicCommunicationEvidenceWordingRisks({
    status: packageStatus,
    validationFixture: normalizeBoolean(sourceCase.validation_fixture, false),
    evidenceExpired: hasExpiredEvidence,
    conflictingEvidence: hasConflictingEvidence,
    insufficientEvidence,
    uncertaintyClassification,
  });

  const approvalLevel = resolvePipPublicCommunicationEvidenceApprovalLevel({
    sourceRecommendation,
    wordingRiskCodes,
  });

  const ownerRole = resolvePipPublicCommunicationEvidenceOwnerRole({
    sourceRecommendation,
  });

  const validationErrors = [];
  if (unknownEvidenceIds.length > 0) {
    validationErrors.push("Verified facts reference unknown evidence IDs.");
  }
  if (hasLineageGap) {
    validationErrors.push("Evidence lineage reference is missing.");
  }
  if (hasExpiredEvidence) {
    validationErrors.push("Evidence validity window is expired.");
  }
  if (hasConflictingEvidence) {
    validationErrors.push("Conflicting evidence present.");
  }
  if (hasEmptyFactStatement) {
    validationErrors.push("Factual statement must be explicitly supplied.");
  }

  const packageRecord = {
    schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_PACKAGE_SCHEMA,
    package_id:
      sanitizeText(
        `PKG-${sanitizeText(sourceCase.response_case_id, 72) || sanitizeText(sourceCase.source_issue_id, 72) || "UNSPECIFIED"}`,
        120
      ) || "PKG-UNSPECIFIED",
    response_case_id: sanitizeText(sourceCase.response_case_id, 120),
    source_issue_id: sanitizeText(sourceCase.source_issue_id, 140),
    issue_label: sanitizeText(sourceCase.issue_label, 220),
    geography_scope: sanitizeText(sourceCase.geography_scope, 180),
    source_recommendation: sourceRecommendation,
    package_status: packageStatus,
    public_communication_objective: objective,
    objective_summary: buildObjectiveSummary(objective),
    verified_factual_core: verifiedFacts,
    supporting_evidence: verifiedEvidence,
    uncertainty_classification: uncertaintyClassification,
    uncertainty_notes:
      packageStatus ===
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE
        ? "Insufficient explicitly verified factual core and evidence lineage for package readiness."
        : packageStatus ===
          PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_CONFLICTING_EVIDENCE
        ? "Conflicting evidence must be resolved before public-information recommendation can proceed."
        : packageStatus ===
          PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW
        ? "Specialist review required before package can proceed to human editorial workflow."
        : "Uncertainty has been disclosed based on explicit verification coverage.",
    wording_risk_codes: wordingRiskCodes,
    approval_level: approvalLevel,
    responsible_owner_role: ownerRole,
    human_review_required: true,
    production_eligible:
      packageStatus ===
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW,
    validation_fixture: normalizeBoolean(sourceCase.validation_fixture, false),
    created_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    safety: {
      evidence_grounded_public_information_support: true,
      response_wording_generated: false,
      platform_content_generated: false,
      content_drafts_generated: false,
      automated_approval: false,
      automated_publication: false,
      persuasion_optimisation: false,
      demographic_targeting: false,
      voter_preference_inference: false,
      election_prediction: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
    validation: {
      valid: validationErrors.length <= 0,
      errors: validationErrors,
    },
  };

  const packageValidation =
    validatePipPublicCommunicationEvidenceRecommendationPackage(packageRecord);

  return {
    ...packageRecord,
    validation: {
      valid: packageValidation.valid === true && validationErrors.length <= 0,
      errors: uniq([...validationErrors, ...toArray(packageValidation.errors)]),
    },
  };
}

export function buildPipPublicCommunicationEvidenceRecommendationCollection({
  responseCaseCollection,
  verifiedEvidenceBundles = [],
  validationFixtureMode = false,
  generatedAt,
} = {}) {
  const safeCollection = isPlainObject(responseCaseCollection) ? responseCaseCollection : {};

  const sourceBeforeFingerprint = stableStringify({
    responseCaseCollection: safeCollection,
    verifiedEvidenceBundles,
  });

  const allCases = [
    ...toArray(safeCollection.production_cases),
    ...toArray(safeCollection.blocked_cases),
    ...toArray(safeCollection.review_cases),
    ...toArray(safeCollection.no_case_required),
    ...toArray(safeCollection.validation_fixture_cases),
  ];

  const uniqueCases = allCases.filter((entry, index, source) => {
    const id = sanitizeText(entry?.response_case_id, 120);
    if (!id) {
      return index === source.findIndex((candidate) => !sanitizeText(candidate?.response_case_id, 120));
    }
    return source.findIndex((candidate) => sanitizeText(candidate?.response_case_id, 120) === id) === index;
  });

  const packages = uniqueCases.map((entry) => {
    const forcedFixture = normalizeBoolean(entry?.validation_fixture, false) || validationFixtureMode === true;
    const bundle = resolveBundleForCase(entry, verifiedEvidenceBundles, forcedFixture);

    return buildPipPublicCommunicationEvidenceRecommendationPackage({
      responseCase: {
        ...entry,
        validation_fixture: forcedFixture,
      },
      evidenceBundle: bundle,
      generatedAt,
    });
  });

  const sortedPackages = packages.slice().sort((a, b) => {
    const createdDelta = String(a.created_at).localeCompare(String(b.created_at));
    if (createdDelta !== 0) return createdDelta;
    return String(a.package_id).localeCompare(String(b.package_id));
  });

  const productionPackages = sortedPackages.filter(
    (entry) =>
      entry.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW &&
      entry.validation_fixture !== true
  );

  const blockedPackages = sortedPackages.filter((entry) =>
    [
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_CONFLICTING_EVIDENCE,
    ].includes(entry.package_status)
  );

  const reviewPackages = sortedPackages.filter((entry) =>
    [
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW,
    ].includes(entry.package_status)
  );

  const noPackageRequired = sortedPackages.filter(
    (entry) =>
      entry.package_status ===
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.NO_PACKAGE_REQUIRED
  );

  const fixturePackages = sortedPackages.filter(
    (entry) =>
      entry.package_status ===
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.VALIDATION_FIXTURE_ONLY
  );

  const invalidPackages = sortedPackages.filter(
    (entry) =>
      entry.package_status === PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.INVALID
  );

  const sourceAfterFingerprint = stableStringify({
    responseCaseCollection: safeCollection,
    verifiedEvidenceBundles,
  });

  const sourceRecordsModified = sourceBeforeFingerprint !== sourceAfterFingerprint;

  const summary = {
    total_source_cases: uniqueCases.length,
    production_packages: productionPackages.length,
    fixture_packages: fixturePackages.length,
    ready_for_review_count: productionPackages.length,
    insufficient_evidence_count: blockedPackages.filter(
      (entry) =>
        entry.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE
    ).length,
    conflicting_evidence_count: blockedPackages.filter(
      (entry) =>
        entry.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_CONFLICTING_EVIDENCE
    ).length,
    specialist_review_count: reviewPackages.length,
    no_package_required_count: noPackageRequired.length,
    invalid_count: invalidPackages.length,
    collection_validation_status: "PENDING",
    source_records_modified: sourceRecordsModified,
  };

  const collection = {
    schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    summary,
    production_packages: productionPackages,
    blocked_packages: blockedPackages,
    review_packages: reviewPackages,
    no_package_required: noPackageRequired,
    validation_fixture_packages: fixturePackages,
    invalid_packages: invalidPackages,
    all_packages: sortedPackages,
    safety: {
      evidence_grounded_public_information_support: true,
      human_review_required: true,
      verified_factual_core_required: true,
      evidence_lineage_required: true,
      uncertainty_disclosed: true,
      wording_risks_disclosed: true,
      response_wording_generated: false,
      platform_content_generated: false,
      content_drafts_generated: false,
      automated_approval: false,
      automated_publication: false,
      persuasion_optimisation: false,
      demographic_targeting: false,
      voter_preference_inference: false,
      election_prediction: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      source_records_modified: sourceRecordsModified,
    },
  };

  const collectionValidation =
    validatePipPublicCommunicationEvidenceRecommendationCollection(collection);

  collection.summary.collection_validation_status =
    collectionValidation.valid === true && sourceRecordsModified === false
      ? "VALID"
      : "INVALID";
  collection.validation = collectionValidation;

  return collection;
}

export function buildPipPublicCommunicationEvidenceRecommendationSummary(collection = {}) {
  const safe = isPlainObject(collection) ? collection : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  return {
    production_packages: normalizeNumber(summary.production_packages, 0),
    fixture_packages: normalizeNumber(summary.fixture_packages, 0),
    ready_for_review_count: normalizeNumber(summary.ready_for_review_count, 0),
    insufficient_evidence_count: normalizeNumber(summary.insufficient_evidence_count, 0),
    conflicting_evidence_count: normalizeNumber(summary.conflicting_evidence_count, 0),
    specialist_review_count: normalizeNumber(summary.specialist_review_count, 0),
    no_package_required_count: normalizeNumber(summary.no_package_required_count, 0),
    invalid_count: normalizeNumber(summary.invalid_count, 0),
    collection_validation_status: sanitizeText(summary.collection_validation_status, 40) ||
      "INVALID",
  };
}

export function buildPipPublicCommunicationEvidenceRecommendationValidationFixture({
  generatedAt,
} = {}) {
  const fixtureResponseCaseCollection = {
    production_cases: [
      {
        response_case_id: "RC-FX-CLARIFY",
        source_issue_id: "FX-CLARIFY",
        issue_label: "Fixture informational clarification",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY,
        production_eligible: true,
        validation_fixture: true,
      },
      {
        response_case_id: "RC-FX-CORRECT",
        source_issue_id: "FX-CORRECT",
        issue_label: "Fixture factual correction",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
        production_eligible: true,
        validation_fixture: true,
      },
      {
        response_case_id: "RC-FX-SERVICE",
        source_issue_id: "FX-SERVICE",
        issue_label: "Fixture service update",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE,
        production_eligible: true,
        validation_fixture: true,
      },
      {
        response_case_id: "RC-FX-AMPLIFY",
        source_issue_id: "FX-AMPLIFY",
        issue_label: "Fixture amplify verified information",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION,
        production_eligible: true,
        validation_fixture: true,
      },
      {
        response_case_id: "RC-FX-MONITOR",
        source_issue_id: "FX-MONITOR",
        issue_label: "Fixture monitoring objective",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.MONITOR,
        production_eligible: true,
        validation_fixture: true,
      },
    ],
    blocked_cases: [
      {
        response_case_id: "RC-FX-INSUFFICIENT",
        source_issue_id: "FX-INSUFFICIENT",
        issue_label: "Fixture insufficient evidence",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CLARIFY,
        production_eligible: true,
        validation_fixture: true,
      },
      {
        response_case_id: "RC-FX-CONFLICT",
        source_issue_id: "FX-CONFLICT",
        issue_label: "Fixture conflicting evidence",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
        production_eligible: true,
        validation_fixture: true,
      },
      {
        response_case_id: "RC-FX-EXPIRED",
        source_issue_id: "FX-EXPIRED",
        issue_label: "Fixture expired evidence",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE,
        production_eligible: true,
        validation_fixture: true,
      },
    ],
    review_cases: [
      {
        response_case_id: "RC-FX-ESCALATE",
        source_issue_id: "FX-ESCALATE",
        issue_label: "Fixture specialist escalation",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.ESCALATE_FOR_REVIEW,
        production_eligible: false,
        validation_fixture: true,
      },
    ],
    no_case_required: [
      {
        response_case_id: "RC-FX-NO-ACTION",
        source_issue_id: "FX-NO-ACTION",
        issue_label: "Fixture no action required",
        geography_scope: "TEST/P999",
        recommendation: PIP_PUBLIC_COMMUNICATION_RESPONSE_RECOMMENDATIONS.NO_RESPONSE_REQUIRED,
        production_eligible: false,
        validation_fixture: true,
      },
    ],
    validation_fixture_cases: [],
  };

  const verifiedEvidenceBundles = [
    {
      response_case_id: "RC-FX-CLARIFY",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-CLARIFY-01",
          evidence_type: "OFFICIAL_UPDATE",
          source_reference: "fixture://source/clarify/1",
          lineage_reference: "fixture-lineage-clarify-1",
          observed_at: "2026-01-10T00:00:00.000Z",
          verified_at: "2026-01-10T00:30:00.000Z",
          valid_until: "2028-01-10T00:30:00.000Z",
          verification_status: "VERIFIED",
          summary: "Fictional fixture evidence for clarification.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-CLARIFY-01",
          factual_statement:
            "Fixture fact: service hours update was verified through official source.",
          supporting_evidence_ids: ["E-FX-CLARIFY-01"],
          verification_status: "VERIFIED",
          verified_at: "2026-01-10T00:30:00.000Z",
          valid_until: "2028-01-10T00:30:00.000Z",
          uncertainty_note: "Low uncertainty in fixture context.",
        },
      ],
    },
    {
      response_case_id: "RC-FX-CORRECT",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-CORRECT-01",
          evidence_type: "OFFICIAL_CORRECTION_RECORD",
          source_reference: "fixture://source/correct/1",
          lineage_reference: "fixture-lineage-correct-1",
          observed_at: "2026-01-11T00:00:00.000Z",
          verified_at: "2026-01-11T00:30:00.000Z",
          valid_until: "2028-01-11T00:30:00.000Z",
          verification_status: "VERIFIED",
          summary: "Fictional fixture evidence for correction.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-CORRECT-01",
          factual_statement:
            "Fixture fact: prior value was incorrect and has a verified corrected value.",
          supporting_evidence_ids: ["E-FX-CORRECT-01"],
          verification_status: "VERIFIED",
          verified_at: "2026-01-11T00:30:00.000Z",
          valid_until: "2028-01-11T00:30:00.000Z",
          uncertainty_note: "Low uncertainty in fixture context.",
        },
      ],
    },
    {
      response_case_id: "RC-FX-SERVICE",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-SERVICE-01",
          evidence_type: "SERVICE_BULLETIN",
          source_reference: "fixture://source/service/1",
          lineage_reference: "fixture-lineage-service-1",
          observed_at: "2026-01-12T00:00:00.000Z",
          verified_at: "2026-01-12T00:30:00.000Z",
          valid_until: "2028-01-12T00:30:00.000Z",
          verification_status: "VERIFIED",
          summary: "Fictional fixture evidence for service update.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-SERVICE-01",
          factual_statement: "Fixture fact: public service window was updated and verified.",
          supporting_evidence_ids: ["E-FX-SERVICE-01"],
          verification_status: "VERIFIED",
          verified_at: "2026-01-12T00:30:00.000Z",
          valid_until: "2028-01-12T00:30:00.000Z",
          uncertainty_note: "Moderate uncertainty in fixture context.",
        },
      ],
    },
    {
      response_case_id: "RC-FX-AMPLIFY",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-AMPLIFY-01",
          evidence_type: "VERIFIED_INFORMATION_NOTE",
          source_reference: "fixture://source/amplify/1",
          lineage_reference: "fixture-lineage-amplify-1",
          observed_at: "2026-01-13T00:00:00.000Z",
          verified_at: "2026-01-13T00:30:00.000Z",
          valid_until: "2028-01-13T00:30:00.000Z",
          verification_status: "VERIFIED",
          summary: "Fictional fixture evidence for amplification.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-AMPLIFY-01",
          factual_statement:
            "Fixture fact: verified public-information guidance remains unchanged.",
          supporting_evidence_ids: ["E-FX-AMPLIFY-01"],
          verification_status: "VERIFIED",
          verified_at: "2026-01-13T00:30:00.000Z",
          valid_until: "2028-01-13T00:30:00.000Z",
          uncertainty_note: "Low uncertainty in fixture context.",
        },
      ],
    },
    {
      response_case_id: "RC-FX-MONITOR",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-MONITOR-01",
          evidence_type: "MONITORING_RECORD",
          source_reference: "fixture://source/monitor/1",
          lineage_reference: "fixture-lineage-monitor-1",
          observed_at: "2026-01-14T00:00:00.000Z",
          verified_at: "2026-01-14T00:30:00.000Z",
          valid_until: "2028-01-14T00:30:00.000Z",
          verification_status: "VERIFIED",
          summary: "Fictional fixture evidence for monitoring.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-MONITOR-01",
          factual_statement: "Fixture fact: signal trend requires ongoing verification.",
          supporting_evidence_ids: ["E-FX-MONITOR-01"],
          verification_status: "VERIFIED",
          verified_at: "2026-01-14T00:30:00.000Z",
          valid_until: "2028-01-14T00:30:00.000Z",
          uncertainty_note: "Moderate uncertainty in fixture context.",
        },
      ],
    },
    {
      response_case_id: "RC-FX-CONFLICT",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-CONFLICT-01",
          evidence_type: "CONFLICTING_SOURCE",
          source_reference: "fixture://source/conflict/1",
          lineage_reference: "fixture-lineage-conflict-1",
          observed_at: "2026-01-15T00:00:00.000Z",
          verified_at: "2026-01-15T00:30:00.000Z",
          valid_until: "2028-01-15T00:30:00.000Z",
          verification_status: "CONFLICTING",
          summary: "Fictional conflicting fixture evidence.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-CONFLICT-01",
          factual_statement: "Fixture fact with conflicting evidence context.",
          supporting_evidence_ids: ["E-FX-CONFLICT-01"],
          verification_status: "VERIFIED",
          verified_at: "2026-01-15T00:30:00.000Z",
          valid_until: "2028-01-15T00:30:00.000Z",
          uncertainty_note: "High uncertainty in fixture context.",
        },
      ],
    },
    {
      response_case_id: "RC-FX-EXPIRED",
      validation_fixture: true,
      evidence_items: [
        {
          evidence_id: "E-FX-EXPIRED-01",
          evidence_type: "EXPIRED_SOURCE",
          source_reference: "fixture://source/expired/1",
          lineage_reference: "fixture-lineage-expired-1",
          observed_at: "2024-01-15T00:00:00.000Z",
          verified_at: "2024-01-15T00:30:00.000Z",
          valid_until: "2024-02-15T00:30:00.000Z",
          verification_status: "VERIFIED",
          summary: "Fictional expired fixture evidence.",
        },
      ],
      verified_facts: [
        {
          fact_id: "F-FX-EXPIRED-01",
          factual_statement: "Fixture fact with expired supporting evidence.",
          supporting_evidence_ids: ["E-FX-EXPIRED-01"],
          verification_status: "VERIFIED",
          verified_at: "2024-01-15T00:30:00.000Z",
          valid_until: "2024-02-15T00:30:00.000Z",
          uncertainty_note: "High uncertainty in fixture context.",
        },
      ],
    },
  ];

  const collection = buildPipPublicCommunicationEvidenceRecommendationCollection({
    responseCaseCollection: fixtureResponseCaseCollection,
    verifiedEvidenceBundles,
    validationFixtureMode: true,
    generatedAt,
  });

  const packageByCaseId = new Map(
    toArray(collection.all_packages).map((entry) => [entry.response_case_id, entry])
  );

  return {
    schema: "pip.public-communication.evidence-recommendation.validation-fixture.v1",
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    checks: {
      all_recommendation_paths_present: [
        "RC-FX-CLARIFY",
        "RC-FX-CORRECT",
        "RC-FX-SERVICE",
        "RC-FX-AMPLIFY",
        "RC-FX-MONITOR",
        "RC-FX-ESCALATE",
        "RC-FX-NO-ACTION",
      ].every((id) => packageByCaseId.has(id)),
      missing_evidence_blocking_present:
        packageByCaseId.get("RC-FX-INSUFFICIENT")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
      conflicting_evidence_blocking_present:
        packageByCaseId.get("RC-FX-CONFLICT")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_CONFLICTING_EVIDENCE,
      expired_evidence_blocking_present:
        packageByCaseId.get("RC-FX-EXPIRED")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.BLOCKED_INSUFFICIENT_EVIDENCE,
      specialist_escalation_present:
        packageByCaseId.get("RC-FX-ESCALATE")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW,
      no_package_required_present:
        packageByCaseId.get("RC-FX-NO-ACTION")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.NO_PACKAGE_REQUIRED,
      fixture_excluded_from_production:
        toArray(collection.production_packages).every((entry) => entry.validation_fixture !== true),
      source_immutability_verified: collection.safety?.source_records_modified === false,
      evidence_lineage_verified: toArray(collection.all_packages)
        .flatMap((entry) => toArray(entry.supporting_evidence))
        .every((entry) => sanitizeText(entry.lineage_reference, 220).length > 0),
    },
    collection,
  };
}

export function serializePipPublicCommunicationEvidenceRecommendationExport(
  payload = {}
) {
  const safe = sanitizePipPublicCommunicationEvidenceRecommendationExport(payload);
  return JSON.stringify(safe, null, 2);
}

export function createPipPublicCommunicationEvidenceRecommendationExportFileName({
  constituencyCode,
  generatedAt,
} = {}) {
  const code = sanitizeUpper(constituencyCode || "PIP", 24, "PIP").toLowerCase();
  const stamp = new Date(generatedAt ?? Date.now()).toISOString().replace(/[:.]/g, "-");
  return `pip-public-communication-evidence-recommendation-${code}-${stamp}.json`;
}

export {
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_EVIDENCE_RECOMMENDATION_EXPORT_SCHEMA,
};
