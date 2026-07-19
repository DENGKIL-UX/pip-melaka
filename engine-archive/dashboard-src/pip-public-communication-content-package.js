import {
  PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_EXPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES,
  PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES,
  PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS,
  PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS,
  sanitizePipPublicCommunicationContentPackageExport,
  validatePipPublicCommunicationContentDraft,
  validatePipPublicCommunicationContentPackage,
  validatePipPublicCommunicationContentPackageCollection,
} from "./pip-public-communication-content-package-contract.js";
import {
  PIP_PUBLIC_COMMUNICATION_OBJECTIVES,
  PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES,
} from "./pip-public-communication-evidence-recommendation-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeText(value, max = 260) {
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

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function uniq(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function stableStringify(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '"[CircularArray]"';
    }
    seen.add(value);
    return `[${value.map((entry) => stableStringify(entry, seen)).join(",")}]`;
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return '"[CircularObject]"';
    }
    seen.add(value);
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function isEvidenceExpired(item) {
  const validUntil = normalizeIso(item?.valid_until);
  if (!validUntil) return false;
  return Date.parse(validUntil) < Date.now();
}

function buildFactualSectionsFromSource(sourcePackage) {
  const facts = toArray(sourcePackage?.verified_factual_core)
    .map((fact) => ({
      fact_id: sanitizeText(fact?.fact_id, 120),
      factual_statement: sanitizeText(fact?.factual_statement, 360),
      supporting_evidence_ids: uniq(
        toArray(fact?.supporting_evidence_ids).map((id) => sanitizeText(id, 120))
      ),
    }))
    .filter((fact) => fact.fact_id.length > 0 && fact.factual_statement.length > 0);

  const availableEvidenceIds = new Set(
    toArray(sourcePackage?.supporting_evidence).map((entry) =>
      sanitizeText(entry?.evidence_id, 120)
    )
  );

  return facts.map((fact) => {
    const evidenceIds = fact.supporting_evidence_ids.filter((id) =>
      availableEvidenceIds.has(id)
    );

    return {
      text: fact.factual_statement,
      verified_fact_ids: [fact.fact_id],
      evidence_ids: evidenceIds,
    };
  });
}

export function isPipPublicCommunicationRecommendationPackageEligibleForContentDrafts(
  sourcePackage
) {
  const safe = isPlainObject(sourcePackage) ? sourcePackage : {};
  const blockReasons = [];

  if (!safe || Object.keys(safe).length === 0) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SOURCE_PACKAGE_MISSING);
    return {
      eligible: false,
      block_reasons: blockReasons,
      objective: "",
      source_validation_valid: false,
    };
  }

  const sourceValidationValid = safe?.validation?.valid === true;
  if (!sourceValidationValid) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SOURCE_PACKAGE_INVALID);
  }

  const sourceStatus = sanitizeUpper(safe.package_status, 120);
  const sourceObjective = sanitizeUpper(safe.public_communication_objective, 120);

  const sourceProductionReady =
    sourceStatus ===
      PIP_PUBLIC_COMMUNICATION_RECOMMENDATION_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW &&
    safe.production_eligible === true;

  if (
    sourceObjective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.MONITOR_AND_VERIFY ||
    sourceObjective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.NO_PUBLIC_COMMUNICATION_ACTION
  ) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.MONITORING_ONLY);
  }

  if (sourceObjective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.ESCALATE_FOR_SPECIALIST_REVIEW) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SPECIALIST_REVIEW_REQUIRED
    );
  }

  if (!sourceProductionReady && safe.validation_fixture !== true) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SOURCE_PACKAGE_NOT_READY
    );
  }

  const verifiedFacts = toArray(safe.verified_factual_core);
  const supportingEvidence = toArray(safe.supporting_evidence);

  if (verifiedFacts.length <= 0) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.VERIFIED_FACTUAL_CORE_MISSING
    );
  }

  if (supportingEvidence.length <= 0) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.VERIFIED_EVIDENCE_MISSING
    );
  }

  const evidenceIdSet = new Set(
    supportingEvidence.map((entry) => sanitizeText(entry?.evidence_id, 120))
  );

  const lineageInvalid = supportingEvidence.some(
    (entry) => sanitizeText(entry?.lineage_reference, 220).length <= 0
  );
  if (lineageInvalid) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.EVIDENCE_LINEAGE_INVALID);
  }

  const expiredEvidence = supportingEvidence.some((entry) => isEvidenceExpired(entry));
  if (expiredEvidence) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.EVIDENCE_EXPIRED);
  }

  const conflictingEvidence = supportingEvidence.some((entry) =>
    String(entry?.verification_status ?? "").toUpperCase() === "CONFLICTING"
  );
  if (conflictingEvidence) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.EVIDENCE_CONFLICTING);
  }

  const unsupportedFactIds = verifiedFacts
    .flatMap((fact) => toArray(fact?.supporting_evidence_ids))
    .filter((id) => !evidenceIdSet.has(sanitizeText(id, 120)));

  if (unsupportedFactIds.length > 0) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.EVIDENCE_LINEAGE_INVALID);
  }

  const unknownSourceMutationFlag = safe?.safety?.source_records_modified === true;
  if (unknownSourceMutationFlag) {
    blockReasons.push(PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SOURCE_MUTATION_DETECTED);
  }

  const uniqueReasons = uniq(blockReasons);
  const hasBlockingReasons =
    uniqueReasons.filter(
      (reason) =>
        reason !== PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.MONITORING_ONLY &&
        reason !== PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.NO_PUBLIC_COMMUNICATION_ACTION &&
        reason !==
          PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SPECIALIST_REVIEW_REQUIRED
    ).length > 0;

  return {
    eligible: uniqueReasons.length === 0 && sourceProductionReady,
    block_reasons: uniqueReasons,
    objective: sourceObjective,
    source_validation_valid: sourceValidationValid,
    source_status: sourceStatus,
    unsupported_fact_id_count: unsupportedFactIds.length,
    conflicting_evidence: conflictingEvidence,
    expired_evidence: expiredEvidence,
    lineage_invalid: lineageInvalid,
    source_mutation_detected: unknownSourceMutationFlag,
    has_blocking_reasons: hasBlockingReasons,
  };
}

export function resolvePipPublicCommunicationContentPackageReviewRequirements(
  sourcePackage = {}
) {
  const requirements = [
    PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS.EVIDENCE_REVIEW_REQUIRED,
    PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS.EDITORIAL_REVIEW_REQUIRED,
    PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS.SUBJECT_MATTER_REVIEW_REQUIRED,
    PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS.LEGAL_POLICY_REVIEW_REQUIRED,
    PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS.SENIOR_APPROVAL_REQUIRED,
  ];

  const objective = sanitizeUpper(sourcePackage?.public_communication_objective, 120);

  if (objective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.CLARIFY_VERIFIED_INFORMATION) {
    return requirements.slice(0, 3);
  }

  return requirements;
}

function createCommonDraftContext({ sourcePackage, contentPackageId, format }) {
  const factualSections = buildFactualSectionsFromSource(sourcePackage);
  const verifiedFactIds = uniq(
    factualSections.flatMap((entry) => toArray(entry.verified_fact_ids))
  );
  const evidenceIds = uniq(factualSections.flatMap((entry) => toArray(entry.evidence_ids)));
  const issueLabel = sanitizeText(sourcePackage?.issue_label, 220);
  const objective = sanitizeText(sourcePackage?.public_communication_objective, 120);

  const opening = "The verified information currently available states:";
  const evidenceLine = "The available evidence indicates:";
  const reviewLine = "This information remains subject to human review.";
  const updateLine = "Further verified updates will be provided when available.";

  const contentSections = {
    factual_sections: factualSections,
    objective,
  };

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.FACEBOOK_POST) {
    contentSections.heading = `Draft update: ${issueLabel || "Verified issue"}`;
    contentSections.context = opening;
    contentSections.verified_information = factualSections.map((entry) => entry.text).join(" ");
    contentSections.uncertainty_note = sanitizeText(sourcePackage?.uncertainty_notes, 320);
    contentSections.evidence_note = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.INSTAGRAM_CAPTION) {
    contentSections.caption = `Draft caption: ${issueLabel || "Verified update"}.`;
    contentSections.verified_information = factualSections.map((entry) => entry.text).join(" ");
    contentSections.uncertainty_note = sanitizeText(sourcePackage?.uncertainty_notes, 320);
    contentSections.evidence_note = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.THREADS_POST) {
    contentSections.concise_context = `Draft context: ${issueLabel || "Verified issue"}`;
    contentSections.verified_information = factualSections.map((entry) => entry.text).join(" ");
    contentSections.uncertainty_note = sanitizeText(sourcePackage?.uncertainty_notes, 320);
    contentSections.evidence_note = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.SHORT_VIDEO_SCRIPT) {
    contentSections.opening = opening;
    contentSections.context = `Draft context: ${issueLabel || "Verified issue"}`;
    contentSections.verified_information = factualSections.map((entry) => entry.text).join(" ");
    contentSections.uncertainty_statement = sanitizeText(
      sourcePackage?.uncertainty_notes,
      320
    );
    contentSections.evidence_reference = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.closing = updateLine;
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.FAQ) {
    contentSections.title = `Draft FAQ: ${issueLabel || "Verified issue"}`;
    contentSections.question_and_answer_items = factualSections.map((entry, index) => ({
      text: `Q${index + 1}: What is verified? A: ${entry.text}`,
      verified_fact_ids: entry.verified_fact_ids,
      evidence_ids: entry.evidence_ids,
    }));
    contentSections.evidence_note = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.COMMENT_RESPONSE) {
    contentSections.response_text = opening;
    contentSections.verified_information = factualSections.map((entry) => entry.text).join(" ");
    contentSections.uncertainty_note = sanitizeText(sourcePackage?.uncertainty_notes, 320);
    contentSections.evidence_note = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.INFOGRAPHIC_BRIEF) {
    contentSections.proposed_title = `Draft infographic brief: ${issueLabel || "Verified issue"}`;
    contentSections.verified_key_fact = factualSections[0]?.text || "";
    contentSections.supporting_points = factualSections.map((entry) => ({
      text: entry.text,
      verified_fact_ids: entry.verified_fact_ids,
      evidence_ids: entry.evidence_ids,
    }));
    contentSections.evidence_line = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.uncertainty_note = sanitizeText(sourcePackage?.uncertainty_notes, 320);
    contentSections.design_notes =
      "Use neutral and informational visual treatment without emotional manipulation.";
    contentSections.review_notice = reviewLine;
  }

  if (format === PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.HOLDING_STATEMENT) {
    contentSections.current_verified_position = opening;
    contentSections.known_information = factualSections.map((entry) => entry.text).join(" ");
    contentSections.information_not_yet_verified = sanitizeText(
      sourcePackage?.uncertainty_notes,
      320
    );
    contentSections.next_update_condition = updateLine;
    contentSections.evidence_note = `${evidenceLine} ${evidenceIds.join(", ") || "No evidence IDs."}`;
    contentSections.review_notice = reviewLine;
  }

  return {
    draft_id: `${contentPackageId}-${format}`,
    content_package_id: contentPackageId,
    source_recommendation_package_id: sanitizeText(sourcePackage?.package_id, 140),
    response_case_id: sanitizeText(sourcePackage?.response_case_id, 140),
    format,
    draft_status:
      sourcePackage?.validation_fixture === true
        ? PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES.VALIDATION_FIXTURE_DRAFT
        : PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES.DRAFT_CREATED,
    draft_label: "DRAFT — HUMAN REVIEW REQUIRED",
    content_sections: contentSections,
    verified_fact_ids: verifiedFactIds,
    evidence_ids: evidenceIds,
    uncertainty_note: sanitizeText(sourcePackage?.uncertainty_notes, 320),
    wording_risk_codes: uniq(toArray(sourcePackage?.wording_risk_codes)),
    approval_level: sanitizeText(sourcePackage?.approval_level, 120),
    responsible_owner_role: sanitizeText(sourcePackage?.responsible_owner_role, 120),
    review_requirements:
      resolvePipPublicCommunicationContentPackageReviewRequirements(sourcePackage),
    human_review_required: true,
    publication_ready: false,
    automated_publication_allowed: false,
    validation_fixture: sourcePackage?.validation_fixture === true,
    created_at: normalizeIso(sourcePackage?.created_at) ?? new Date().toISOString(),
    safety: {
      publication_ready: false,
      automated_publication_allowed: false,
      social_platform_api_enabled: false,
      engagement_optimisation_enabled: false,
      persuasion_optimisation_enabled: false,
      voter_targeting_enabled: false,
    },
  };
}

export function createPipPublicCommunicationFormatSpecificDraft({
  sourcePackage,
  contentPackageId,
  format,
} = {}) {
  const candidate = createCommonDraftContext({ sourcePackage, contentPackageId, format });
  const validation = validatePipPublicCommunicationContentDraft(candidate);

  return {
    ...candidate,
    validation,
  };
}

export function createPipPublicCommunicationAllFormatDrafts({
  sourcePackage,
  contentPackageId,
} = {}) {
  return Object.values(PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS).map((format) =>
    createPipPublicCommunicationFormatSpecificDraft({
      sourcePackage,
      contentPackageId,
      format,
    })
  );
}

function resolveContentPackageStatusFromEligibility(eligibility, sourcePackage) {
  const objective = sanitizeUpper(eligibility.objective, 120);

  if (objective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.MONITOR_AND_VERIFY) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.NO_CONTENT_REQUIRED;
  }

  if (objective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.NO_PUBLIC_COMMUNICATION_ACTION) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.NO_CONTENT_REQUIRED;
  }

  if (objective === PIP_PUBLIC_COMMUNICATION_OBJECTIVES.ESCALATE_FOR_SPECIALIST_REVIEW) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW;
  }

  if (sourcePackage?.validation_fixture === true) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.VALIDATION_FIXTURE_ONLY;
  }

  if (eligibility.eligible) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW;
  }

  if (eligibility.source_validation_valid !== true) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.INVALID;
  }

  if (eligibility.block_reasons.includes(
    PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS.SOURCE_PACKAGE_NOT_READY
  )) {
    return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.BLOCKED_SOURCE_NOT_READY;
  }

  return PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.BLOCKED_EVIDENCE_INVALID;
}

export function buildPipPublicCommunicationContentPackage({
  sourceRecommendationPackage,
  generatedAt,
} = {}) {
  const sourcePackage = isPlainObject(sourceRecommendationPackage)
    ? sourceRecommendationPackage
    : {};

  const sourceBeforeFingerprint = stableStringify(sourcePackage);

  const contentPackageId = sanitizeText(
    `CP-${sanitizeText(sourcePackage.package_id, 88) || sanitizeText(sourcePackage.response_case_id, 88) || "UNSPECIFIED"}`,
    140
  );

  const eligibility = isPipPublicCommunicationRecommendationPackageEligibleForContentDrafts(
    sourcePackage
  );

  const packageStatus = resolveContentPackageStatusFromEligibility(
    eligibility,
    sourcePackage
  );

  const createDrafts =
    packageStatus ===
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW ||
    packageStatus === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.VALIDATION_FIXTURE_ONLY;

  const drafts = createDrafts
    ? createPipPublicCommunicationAllFormatDrafts({
        sourcePackage,
        contentPackageId,
      })
    : [];

  const sourceAfterFingerprint = stableStringify(sourcePackage);

  const packageRecord = {
    schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_SCHEMA,
    content_package_id: contentPackageId || "CP-UNSPECIFIED",
    source_recommendation_package_id: sanitizeText(sourcePackage.package_id, 140),
    response_case_id: sanitizeText(sourcePackage.response_case_id, 140),
    source_issue_id: sanitizeText(sourcePackage.source_issue_id, 140),
    issue_label: sanitizeText(sourcePackage.issue_label, 260),
    geography_scope: sanitizeText(sourcePackage.geography_scope, 160),
    source_recommendation: sanitizeText(sourcePackage.source_recommendation, 120),
    public_communication_objective: sanitizeText(
      sourcePackage.public_communication_objective,
      120
    ),
    verified_factual_core: toArray(sourcePackage.verified_factual_core),
    supporting_evidence: toArray(sourcePackage.supporting_evidence),
    uncertainty_classification: sanitizeText(
      sourcePackage.uncertainty_classification,
      120
    ),
    uncertainty_notes: sanitizeText(sourcePackage.uncertainty_notes, 320),
    wording_risk_codes: uniq(toArray(sourcePackage.wording_risk_codes)),
    approval_level: sanitizeText(sourcePackage.approval_level, 120),
    responsible_owner_role: sanitizeText(sourcePackage.responsible_owner_role, 120),
    package_status: packageStatus,
    drafts,
    draft_format_count: drafts.length,
    human_review_required: true,
    production_eligible:
      packageStatus === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW,
    publication_ready: false,
    validation_fixture: sourcePackage.validation_fixture === true,
    created_at: normalizeIso(generatedAt ?? sourcePackage.created_at) ?? new Date().toISOString(),
    block_reasons: eligibility.block_reasons,
    safety: {
      evidence_grounded_drafts_only: true,
      verified_factual_core_required: true,
      evidence_lineage_required: true,
      human_review_required: true,
      publication_ready: false,
      automated_response: false,
      automated_approval: false,
      automated_publication: false,
      social_media_api_connection: false,
      engagement_optimisation: false,
      persuasion_optimisation: false,
      individual_targeting: false,
      demographic_targeting: false,
      voter_targeting: false,
      political_affiliation_inference: false,
      voter_preference_inference: false,
      election_prediction: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      source_records_modified: sourceBeforeFingerprint !== sourceAfterFingerprint,
      source_recommendation_status: sanitizeText(sourcePackage.package_status, 120),
    },
  };

  const packageValidation = validatePipPublicCommunicationContentPackage(packageRecord);

  return {
    ...packageRecord,
    validation: {
      valid: packageValidation.valid === true,
      errors: packageValidation.errors,
    },
  };
}

export function buildPipPublicCommunicationContentPackageCollection({
  recommendationCollection,
  validationFixtureMode = false,
  generatedAt,
} = {}) {
  const safe = isPlainObject(recommendationCollection) ? recommendationCollection : {};
  const sourceBefore = stableStringify(safe);

  const allSourcePackages = [
    ...toArray(safe.production_packages),
    ...toArray(safe.blocked_packages),
    ...toArray(safe.review_packages),
    ...toArray(safe.no_package_required),
    ...toArray(safe.validation_fixture_packages),
    ...toArray(safe.invalid_packages),
  ];

  const uniqueSourcePackages = allSourcePackages.filter((entry, index, source) => {
    const id = sanitizeText(entry?.package_id, 140);
    if (!id) {
      return index === source.findIndex((candidate) => !sanitizeText(candidate?.package_id, 140));
    }
    return source.findIndex((candidate) => sanitizeText(candidate?.package_id, 140) === id) === index;
  });

  const packages = uniqueSourcePackages.map((sourcePackage) =>
    buildPipPublicCommunicationContentPackage({
      sourceRecommendationPackage: {
        ...sourcePackage,
        validation_fixture:
          sourcePackage?.validation_fixture === true || validationFixtureMode === true,
      },
      generatedAt,
    })
  );

  const sortedPackages = packages.slice().sort((a, b) => {
    const byDate = String(a.created_at).localeCompare(String(b.created_at));
    if (byDate !== 0) return byDate;
    return String(a.content_package_id).localeCompare(String(b.content_package_id));
  });

  const productionContentPackages = sortedPackages.filter(
    (entry) =>
      entry.package_status === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.READY_FOR_HUMAN_REVIEW &&
      entry.validation_fixture !== true
  );

  const blockedRecords = sortedPackages.filter((entry) =>
    [
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.BLOCKED_SOURCE_NOT_READY,
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.BLOCKED_EVIDENCE_INVALID,
    ].includes(entry.package_status)
  );

  const specialistReviewRecords = sortedPackages.filter(
    (entry) =>
      entry.package_status ===
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.REQUIRES_SPECIALIST_REVIEW
  );

  const noContentRequiredRecords = sortedPackages.filter(
    (entry) =>
      entry.package_status ===
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.NO_CONTENT_REQUIRED
  );

  const fixturePackages = sortedPackages.filter(
    (entry) =>
      entry.package_status ===
      PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.VALIDATION_FIXTURE_ONLY
  );

  const invalidRecords = sortedPackages.filter(
    (entry) =>
      entry.package_status === PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.INVALID
  );

  const allDrafts = sortedPackages.flatMap((entry) => toArray(entry.drafts));

  const draftFormatSummaries = Object.values(PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS).reduce(
    (acc, format) => {
      acc[format] = allDrafts.filter((draft) => draft.format === format).length;
      return acc;
    },
    {}
  );

  const sourceAfter = stableStringify(safe);
  const sourceMutationDetected = sourceBefore !== sourceAfter;

  const summary = {
    source_recommendation_package_count: uniqueSourcePackages.length,
    production_content_package_count: productionContentPackages.length,
    fixture_content_package_count: fixturePackages.length,
    ready_for_human_review_package_count: productionContentPackages.length,
    blocked_package_count: blockedRecords.length,
    specialist_review_package_count: specialistReviewRecords.length,
    no_content_required_package_count: noContentRequiredRecords.length,
    invalid_package_count: invalidRecords.length,
    total_draft_count: allDrafts.length,
    draft_format_count: draftFormatSummaries,
    collection_validation_status: "PENDING",
    source_records_modified: sourceMutationDetected,
  };

  const collection = {
    schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    summary,
    production_content_packages: productionContentPackages,
    blocked_records: blockedRecords,
    specialist_review_records: specialistReviewRecords,
    no_content_required_records: noContentRequiredRecords,
    validation_fixture_packages: fixturePackages,
    invalid_records: invalidRecords,
    all_content_packages: sortedPackages,
    draft_format_summaries: draftFormatSummaries,
    safety: {
      evidence_grounded_drafts_only: true,
      verified_factual_core_required: true,
      evidence_lineage_required: true,
      human_review_required: true,
      evidence_review_required: true,
      editorial_review_required: true,
      approval_required_before_production: true,
      publication_ready: false,
      automated_response: false,
      automated_approval: false,
      automated_publication: false,
      social_media_api_connection: false,
      engagement_optimisation: false,
      persuasion_optimisation: false,
      individual_targeting: false,
      demographic_targeting: false,
      voter_targeting: false,
      political_affiliation_inference: false,
      voter_preference_inference: false,
      election_prediction: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      source_records_modified: sourceMutationDetected,
    },
  };

  const collectionValidation =
    validatePipPublicCommunicationContentPackageCollection(collection);

  collection.summary.collection_validation_status =
    collectionValidation.valid === true && sourceMutationDetected === false
      ? "VALID"
      : "INVALID";
  collection.validation = collectionValidation;

  return collection;
}

export function buildPipPublicCommunicationContentPackageSummary(collection = {}) {
  const safeSummary = isPlainObject(collection?.summary) ? collection.summary : {};
  const draftFormatCount = isPlainObject(safeSummary.draft_format_count)
    ? safeSummary.draft_format_count
    : {};

  return {
    source_recommendation_package_count:
      Number(safeSummary.source_recommendation_package_count ?? 0) || 0,
    production_content_package_count:
      Number(safeSummary.production_content_package_count ?? 0) || 0,
    fixture_content_package_count:
      Number(safeSummary.fixture_content_package_count ?? 0) || 0,
    ready_for_human_review_package_count:
      Number(safeSummary.ready_for_human_review_package_count ?? 0) || 0,
    blocked_package_count: Number(safeSummary.blocked_package_count ?? 0) || 0,
    specialist_review_package_count:
      Number(safeSummary.specialist_review_package_count ?? 0) || 0,
    no_content_required_package_count:
      Number(safeSummary.no_content_required_package_count ?? 0) || 0,
    invalid_package_count: Number(safeSummary.invalid_package_count ?? 0) || 0,
    total_draft_count: Number(safeSummary.total_draft_count ?? 0) || 0,
    draft_format_count: {
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.FACEBOOK_POST]:
        Number(draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.FACEBOOK_POST] ?? 0) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.INSTAGRAM_CAPTION]:
        Number(
          draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.INSTAGRAM_CAPTION] ?? 0
        ) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.THREADS_POST]:
        Number(draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.THREADS_POST] ?? 0) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.SHORT_VIDEO_SCRIPT]:
        Number(
          draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.SHORT_VIDEO_SCRIPT] ?? 0
        ) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.FAQ]:
        Number(draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.FAQ] ?? 0) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.COMMENT_RESPONSE]:
        Number(
          draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.COMMENT_RESPONSE] ?? 0
        ) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.INFOGRAPHIC_BRIEF]:
        Number(
          draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.INFOGRAPHIC_BRIEF] ?? 0
        ) || 0,
      [PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.HOLDING_STATEMENT]:
        Number(
          draftFormatCount[PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS.HOLDING_STATEMENT] ?? 0
        ) || 0,
    },
    collection_validation_status:
      sanitizeText(safeSummary.collection_validation_status, 40) || "INVALID",
  };
}

export function buildPipPublicCommunicationContentPackageValidationFixture({
  generatedAt,
} = {}) {
  const fixtureSourceCollection = {
    production_packages: [
      {
        package_id: "PKG-FX-CLARIFY",
        response_case_id: "RC-FX-CLARIFY",
        source_issue_id: "FX-ISSUE-CLARIFY",
        issue_label: "Fixture clarify issue",
        geography_scope: "TEST/P999",
        source_recommendation: "CLARIFY",
        package_status: "READY_FOR_HUMAN_REVIEW",
        public_communication_objective: "CLARIFY_VERIFIED_INFORMATION",
        verified_factual_core: [
          {
            fact_id: "F-FX-CLARIFY-1",
            factual_statement: "Fixture fact: service access channel is verified.",
            supporting_evidence_ids: ["E-FX-CLARIFY-1"],
          },
        ],
        supporting_evidence: [
          {
            evidence_id: "E-FX-CLARIFY-1",
            lineage_reference: "fixture-lineage-clarify-1",
            verification_status: "VERIFIED",
            valid_until: "2028-01-01T00:00:00.000Z",
            summary: "Fixture verified evidence clarify.",
          },
        ],
        uncertainty_classification: "LOW",
        uncertainty_notes: "Fixture low uncertainty.",
        wording_risk_codes: ["FIXTURE_CONTENT"],
        approval_level: "EDITORIAL_REVIEW",
        responsible_owner_role: "COMMUNICATIONS_OFFICER",
        validation_fixture: true,
        production_eligible: true,
        validation: { valid: true, errors: [] },
      },
      {
        package_id: "PKG-FX-MONITOR",
        response_case_id: "RC-FX-MONITOR",
        source_issue_id: "FX-ISSUE-MONITOR",
        issue_label: "Fixture monitor issue",
        geography_scope: "TEST/P999",
        source_recommendation: "MONITOR",
        package_status: "READY_FOR_HUMAN_REVIEW",
        public_communication_objective: "MONITOR_AND_VERIFY",
        verified_factual_core: [
          {
            fact_id: "F-FX-MONITOR-1",
            factual_statement: "Fixture fact: monitoring is in progress.",
            supporting_evidence_ids: ["E-FX-MONITOR-1"],
          },
        ],
        supporting_evidence: [
          {
            evidence_id: "E-FX-MONITOR-1",
            lineage_reference: "fixture-lineage-monitor-1",
            verification_status: "VERIFIED",
            valid_until: "2028-01-01T00:00:00.000Z",
            summary: "Fixture verified evidence monitor.",
          },
        ],
        uncertainty_classification: "MODERATE",
        uncertainty_notes: "Fixture moderate uncertainty.",
        wording_risk_codes: ["FIXTURE_CONTENT"],
        approval_level: "SUBJECT_MATTER_REVIEW",
        responsible_owner_role: "MONITORING_ANALYST",
        validation_fixture: true,
        production_eligible: true,
        validation: { valid: true, errors: [] },
      },
      {
        package_id: "PKG-FX-ESCALATE",
        response_case_id: "RC-FX-ESCALATE",
        source_issue_id: "FX-ISSUE-ESCALATE",
        issue_label: "Fixture escalate issue",
        geography_scope: "TEST/P999",
        source_recommendation: "ESCALATE_FOR_REVIEW",
        package_status: "REQUIRES_SPECIALIST_REVIEW",
        public_communication_objective: "ESCALATE_FOR_SPECIALIST_REVIEW",
        verified_factual_core: [
          {
            fact_id: "F-FX-ESCALATE-1",
            factual_statement: "Fixture fact: specialist review is required.",
            supporting_evidence_ids: ["E-FX-ESCALATE-1"],
          },
        ],
        supporting_evidence: [
          {
            evidence_id: "E-FX-ESCALATE-1",
            lineage_reference: "fixture-lineage-escalate-1",
            verification_status: "VERIFIED",
            valid_until: "2028-01-01T00:00:00.000Z",
            summary: "Fixture verified evidence escalate.",
          },
        ],
        uncertainty_classification: "HIGH",
        uncertainty_notes: "Fixture high uncertainty.",
        wording_risk_codes: ["LEGAL_OR_POLICY_AMBIGUITY"],
        approval_level: "LEGAL_OR_POLICY_REVIEW",
        responsible_owner_role: "LEGAL_POLICY_REVIEWER",
        validation_fixture: true,
        production_eligible: false,
        validation: { valid: true, errors: [] },
      },
      {
        package_id: "PKG-FX-NO-ACTION",
        response_case_id: "RC-FX-NO-ACTION",
        source_issue_id: "FX-ISSUE-NO-ACTION",
        issue_label: "Fixture no action issue",
        geography_scope: "TEST/P999",
        source_recommendation: "NO_RESPONSE_REQUIRED",
        package_status: "NO_PACKAGE_REQUIRED",
        public_communication_objective: "NO_PUBLIC_COMMUNICATION_ACTION",
        verified_factual_core: [
          {
            fact_id: "F-FX-NO-ACTION-1",
            factual_statement: "Fixture fact: no communication action required.",
            supporting_evidence_ids: ["E-FX-NO-ACTION-1"],
          },
        ],
        supporting_evidence: [
          {
            evidence_id: "E-FX-NO-ACTION-1",
            lineage_reference: "fixture-lineage-no-action-1",
            verification_status: "VERIFIED",
            valid_until: "2028-01-01T00:00:00.000Z",
            summary: "Fixture verified evidence no action.",
          },
        ],
        uncertainty_classification: "LOW",
        uncertainty_notes: "Fixture low uncertainty.",
        wording_risk_codes: ["FIXTURE_CONTENT"],
        approval_level: "NO_PUBLIC_ACTION_REQUIRED",
        responsible_owner_role: "NO_OWNER_REQUIRED",
        validation_fixture: true,
        production_eligible: false,
        validation: { valid: true, errors: [] },
      },
      {
        package_id: "PKG-FX-MISSING-EVIDENCE",
        response_case_id: "RC-FX-MISSING-EVIDENCE",
        source_issue_id: "FX-ISSUE-MISSING-EVIDENCE",
        issue_label: "Fixture missing evidence issue",
        geography_scope: "TEST/P999",
        source_recommendation: "CLARIFY",
        package_status: "READY_FOR_HUMAN_REVIEW",
        public_communication_objective: "CLARIFY_VERIFIED_INFORMATION",
        verified_factual_core: [
          {
            fact_id: "F-FX-MISSING-EVIDENCE-1",
            factual_statement: "Fixture fact missing evidence.",
            supporting_evidence_ids: ["E-FX-MISSING-EVIDENCE-1"],
          },
        ],
        supporting_evidence: [],
        uncertainty_classification: "HIGH",
        uncertainty_notes: "Fixture missing evidence uncertainty.",
        wording_risk_codes: ["INSUFFICIENT_CONTEXT"],
        approval_level: "SUBJECT_MATTER_REVIEW",
        responsible_owner_role: "SUBJECT_MATTER_OWNER",
        validation_fixture: true,
        production_eligible: true,
        validation: { valid: true, errors: [] },
      },
      {
        package_id: "PKG-FX-CONFLICT",
        response_case_id: "RC-FX-CONFLICT",
        source_issue_id: "FX-ISSUE-CONFLICT",
        issue_label: "Fixture conflicting evidence issue",
        geography_scope: "TEST/P999",
        source_recommendation: "CORRECT_WITH_EVIDENCE",
        package_status: "READY_FOR_HUMAN_REVIEW",
        public_communication_objective: "CORRECT_VERIFIED_INFORMATION",
        verified_factual_core: [
          {
            fact_id: "F-FX-CONFLICT-1",
            factual_statement: "Fixture fact with conflicting evidence.",
            supporting_evidence_ids: ["E-FX-CONFLICT-1"],
          },
        ],
        supporting_evidence: [
          {
            evidence_id: "E-FX-CONFLICT-1",
            lineage_reference: "fixture-lineage-conflict-1",
            verification_status: "CONFLICTING",
            valid_until: "2028-01-01T00:00:00.000Z",
            summary: "Fixture conflicting evidence.",
          },
        ],
        uncertainty_classification: "HIGH",
        uncertainty_notes: "Fixture conflicting evidence uncertainty.",
        wording_risk_codes: ["CONFLICTING_EVIDENCE"],
        approval_level: "EXECUTIVE_REVIEW",
        responsible_owner_role: "SENIOR_APPROVER",
        validation_fixture: true,
        production_eligible: true,
        validation: { valid: true, errors: [] },
      },
    ],
    blocked_packages: [],
    review_packages: [],
    no_package_required: [],
    validation_fixture_packages: [],
    invalid_packages: [],
  };

  const collection = buildPipPublicCommunicationContentPackageCollection({
    recommendationCollection: fixtureSourceCollection,
    validationFixtureMode: true,
    generatedAt,
  });

  const packageByCaseId = new Map(
    toArray(collection.all_content_packages).map((entry) => [entry.response_case_id, entry])
  );

  const clarifyPackage = packageByCaseId.get("RC-FX-CLARIFY");

  return {
    schema: "pip.public-communication.content-package.validation-fixture.v1",
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    checks: {
      eligible_fixture_generates_eight_formats:
        Number(clarifyPackage?.draft_format_count ?? 0) === 8,
      monitoring_case_has_no_drafts:
        Number(packageByCaseId.get("RC-FX-MONITOR")?.draft_format_count ?? 0) === 0,
      specialist_case_has_no_drafts:
        Number(packageByCaseId.get("RC-FX-ESCALATE")?.draft_format_count ?? 0) === 0,
      no_content_case_has_no_drafts:
        Number(packageByCaseId.get("RC-FX-NO-ACTION")?.draft_format_count ?? 0) === 0,
      missing_evidence_blocked:
        packageByCaseId.get("RC-FX-MISSING-EVIDENCE")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.BLOCKED_EVIDENCE_INVALID,
      conflicting_evidence_blocked:
        packageByCaseId.get("RC-FX-CONFLICT")?.package_status ===
        PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES.BLOCKED_EVIDENCE_INVALID,
      fixture_excluded_from_production:
        Number(collection.summary.production_content_package_count ?? 0) === 0,
      human_review_label_preserved: toArray(clarifyPackage?.drafts).every(
        (entry) => entry.draft_label === "DRAFT — HUMAN REVIEW REQUIRED"
      ),
      publication_ready_false_for_all: toArray(collection.all_content_packages).every(
        (entry) => entry.publication_ready === false
      ),
      automated_publication_false_for_all: toArray(collection.all_content_packages)
        .flatMap((entry) => toArray(entry.drafts))
        .every((entry) => entry.automated_publication_allowed === false),
    },
    collection,
  };
}

export function serializePipPublicCommunicationContentPackageExport(payload = {}) {
  const safe = sanitizePipPublicCommunicationContentPackageExport(payload);
  return JSON.stringify(safe, null, 2);
}

export function createPipPublicCommunicationContentPackageExportFileName({
  constituencyCode,
  generatedAt,
} = {}) {
  const code = sanitizeUpper(constituencyCode || "PIP", 24, "PIP").toLowerCase();
  const stamp = new Date(generatedAt ?? Date.now()).toISOString().replace(/[:.]/g, "-");
  return `pip-public-communication-content-package-${code}-${stamp}.json`;
}

export {
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_EXPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_CONTENT_FORMATS,
  PIP_PUBLIC_COMMUNICATION_CONTENT_PACKAGE_STATUSES,
  PIP_PUBLIC_COMMUNICATION_CONTENT_DRAFT_STATUSES,
  PIP_PUBLIC_COMMUNICATION_CONTENT_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_CONTENT_REVIEW_REQUIREMENTS,
};
