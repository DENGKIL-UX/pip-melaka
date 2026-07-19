import {
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA,
  buildPipPublicCommunicationProductionQueueContractManifest,
  validatePipPublicCommunicationProductionQueueContractManifest,
  validatePipPublicCommunicationProductionQueueItem,
  validatePipPublicCommunicationProductionQueueCollection,
  validatePipPublicCommunicationProductionQueueTransitionRequest,
  validatePipPublicCommunicationProductionQueueTransitionEvaluation,
  validatePipPublicCommunicationProductionQueueTransitionReceipt,
  sanitizePipPublicCommunicationProductionQueueExport,
} from "./pip-public-communication-production-queue-contract.js";

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
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function statusIndex(status) {
  return PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER.indexOf(
    sanitizeUpper(status, 120)
  );
}

function buildTransitionActionMap() {
  return {
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.SUBMIT_FOR_EVIDENCE_REVIEW]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW,
      requires: ["human_review_required"],
      allowForFixture: true,
      actorRoles: ["ANALYST", "ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.COMPLETE_EVIDENCE_REVIEW]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW,
      requires: ["evidence_review_complete"],
      allowForFixture: true,
      actorRoles: ["ANALYST", "ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.SUBMIT_FOR_EDITORIAL_REVIEW]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW,
      requires: ["evidence_review_complete"],
      allowForFixture: true,
      actorRoles: ["ANALYST", "ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.COMPLETE_EDITORIAL_REVIEW]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
      requires: ["editorial_review_complete"],
      allowForFixture: true,
      actorRoles: ["ANALYST", "ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.REQUEST_APPROVAL]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
      requires: ["editorial_review_complete"],
      allowForFixture: true,
      actorRoles: ["ANALYST", "ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.RECORD_APPROVAL]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVED,
      requires: ["approval_recorded"],
      allowForFixture: true,
      actorRoles: ["ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.MARK_READY_FOR_PRODUCTION]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVED,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
      requires: ["approval_recorded", "publication_register"],
      allowForFixture: false,
      actorRoles: ["ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.RETURN_TO_DRAFT]: {
      from: null,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT,
      requires: ["review_note"],
      allowForFixture: true,
      actorRoles: ["ANALYST", "ADMINISTRATOR"],
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.MARK_PUBLISHED]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.PUBLISHED,
      requires: ["publication_record"],
      allowForFixture: false,
      actorRoles: ["ADMINISTRATOR"],
      disabledForBatch64A: true,
    },
    [PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.ARCHIVE_ITEM]: {
      from: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.PUBLISHED,
      to: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.ARCHIVED,
      requires: ["review_note"],
      allowForFixture: false,
      actorRoles: ["ADMINISTRATOR"],
      disabledForBatch64A: true,
    },
  };
}

function parseGeographyScope(value) {
  const text = sanitizeText(value, 160).toUpperCase();
  const segments = text.split("/").map((entry) => sanitizeText(entry, 40));
  return {
    constituency: segments[0] || "",
    district: segments[1] || "",
    raw: text,
  };
}

function buildQueueItemFromDraft(contentPackage, draft) {
  const sourceFingerprint = stableHash({
    contentPackage,
    draft,
  });

  const normalized = validatePipPublicCommunicationProductionQueueItem({
    schema: undefined,
    queue_item_id: `PQI-${sanitizeText(contentPackage?.response_case_id, 80)}-${sanitizeText(
      draft?.format,
      80
    )}`,
    source_content_package_id: contentPackage?.content_package_id,
    source_draft_id: draft?.draft_id,
    source_recommendation_package_id:
      contentPackage?.source_recommendation_package_id,
    response_case_id: contentPackage?.response_case_id,
    source_issue_id: contentPackage?.source_issue_id,
    issue_label: contentPackage?.issue_label,
    geography_scope: contentPackage?.geography_scope,
    content_format: draft?.format,
    draft_label: draft?.draft_label,
    current_status: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT,
    previous_status: "",
    status_sequence: 1,
    assigned_owner_role: contentPackage?.responsible_owner_role,
    responsible_owner_role: contentPackage?.responsible_owner_role,
    approval_level: contentPackage?.approval_level,
    verified_fact_ids: draft?.verified_fact_ids,
    evidence_ids: draft?.evidence_ids,
    uncertainty_note:
      draft?.uncertainty_note ?? contentPackage?.uncertainty_notes ?? "",
    wording_risk_codes:
      draft?.wording_risk_codes ?? contentPackage?.wording_risk_codes ?? [],
    evidence_review: {
      required: true,
      status: "PENDING",
      completed: false,
    },
    editorial_review: {
      required: true,
      status: "PENDING",
      completed: false,
    },
    approval: {
      required: true,
      status: "PENDING",
      approved: false,
    },
    production_readiness: {
      required: true,
      status: "PENDING",
      ready: false,
    },
    transition_history: [],
    transition_count: 0,
    human_review_required: contentPackage?.human_review_required === true,
    manual_transition_only: true,
    publication_ready: false,
    publication_registered: false,
    automated_transition_allowed: false,
    automated_approval_allowed: false,
    automated_publication_allowed: false,
    validation_fixture: contentPackage?.validation_fixture === true,
    production_eligible:
      contentPackage?.production_eligible === true &&
      contentPackage?.validation_fixture !== true,
    created_at: contentPackage?.created_at,
    updated_at: contentPackage?.created_at,
    source_fingerprint: sourceFingerprint,
  }).normalized;

  return normalized;
}

function isProductionEligibleSourcePackage(contentPackage) {
  return (
    isPlainObject(contentPackage) &&
    contentPackage.validation_fixture !== true &&
    contentPackage.production_eligible === true &&
    contentPackage.human_review_required === true &&
    contentPackage.package_status === "READY_FOR_HUMAN_REVIEW" &&
    Array.isArray(contentPackage.drafts) &&
    contentPackage.drafts.length > 0
  );
}

function isFixtureSourcePackage(contentPackage) {
  return (
    isPlainObject(contentPackage) &&
    contentPackage.validation_fixture === true &&
    Array.isArray(contentPackage.drafts) &&
    contentPackage.drafts.length > 0
  );
}

export function buildPipPublicCommunicationProductionQueueCollection({
  contentPackageCollection,
  includeValidationFixtures = true,
} = {}) {
  const safeCollection = isPlainObject(contentPackageCollection)
    ? contentPackageCollection
    : {};

  const sourcePackages = toArray(safeCollection.all_content_packages);
  const productionQueueItems = [];
  const fixtureQueueItems = [];
  const excludedSourcePackages = [];

  sourcePackages.forEach((contentPackage) => {
    if (isProductionEligibleSourcePackage(contentPackage)) {
      toArray(contentPackage.drafts).forEach((draft) => {
        if (draft?.draft_status === "DRAFT_CREATED") {
          productionQueueItems.push(buildQueueItemFromDraft(contentPackage, draft));
        }
      });
      return;
    }

    if (includeValidationFixtures && isFixtureSourcePackage(contentPackage)) {
      toArray(contentPackage.drafts).forEach((draft) => {
        if (draft?.draft_status === "DRAFT_CREATED") {
          fixtureQueueItems.push(buildQueueItemFromDraft(contentPackage, draft));
        }
      });
      return;
    }

    excludedSourcePackages.push({
      source_content_package_id: sanitizeText(contentPackage?.content_package_id, 160),
      response_case_id: sanitizeText(contentPackage?.response_case_id, 160),
      package_status: sanitizeUpper(contentPackage?.package_status, 120),
      validation_fixture: contentPackage?.validation_fixture === true,
      production_eligible: contentPackage?.production_eligible === true,
      reason: "SOURCE_CONTENT_PACKAGE_NOT_PRODUCTION_ELIGIBLE",
    });
  });

  const generatedAt = new Date().toISOString();
  const collection = {
    schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA,
    generated_at: generatedAt,
    summary: buildPipPublicCommunicationProductionQueueSummary({
      productionQueueItems,
      fixtureQueueItems,
      excludedSourcePackages,
      blockedTransitionEvaluations: [],
      successfulTransitionCount: 0,
    }),
    production_queue_items: productionQueueItems,
    fixture_queue_items: fixtureQueueItems,
    excluded_source_packages: excludedSourcePackages,
    blocked_transition_evaluations: [],
    successful_transition_count: 0,
    validation: {
      valid: true,
      errors: [],
    },
    safety: {
      source_content_package_required: true,
      source_content_draft_required: true,
      source_records_modified: false,
      source_evidence_modified: false,
      queue_item_generation_deterministic: true,
      manual_transition_only: true,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  };

  const validation = validatePipPublicCommunicationProductionQueueCollection(collection);
  collection.validation = {
    valid: validation.valid,
    errors: validation.errors,
  };

  return validation.normalized;
}

export function buildPipPublicCommunicationProductionQueueSummary({
  productionQueueItems = [],
  fixtureQueueItems = [],
  excludedSourcePackages = [],
  blockedTransitionEvaluations = [],
  successfulTransitionCount = 0,
} = {}) {
  const productionItems = toArray(productionQueueItems);
  const fixtureItems = toArray(fixtureQueueItems);
  const excluded = toArray(excludedSourcePackages);
  const blocked = toArray(blockedTransitionEvaluations);

  const allItems = [...productionItems, ...fixtureItems];
  const statusCounts = {};
  const formatCounts = {};

  PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER.forEach((status) => {
    statusCounts[status] = allItems.filter(
      (entry) => sanitizeUpper(entry.current_status, 120) === status
    ).length;
  });

  allItems.forEach((entry) => {
    const format = sanitizeUpper(entry.content_format, 120);
    if (!format) return;
    formatCounts[format] = (formatCounts[format] ?? 0) + 1;
  });

  const manualOnlyCount = allItems.filter(
    (entry) => entry.manual_transition_only === true
  ).length;

  return {
    total_queue_item_count: allItems.length,
    production_queue_item_count: productionItems.length,
    fixture_queue_item_count: fixtureItems.length,
    excluded_source_package_count: excluded.length,
    blocked_transition_count: blocked.length,
    successful_transition_count: Number(successfulTransitionCount) || 0,
    manual_transition_only_count: manualOnlyCount,
    publication_ready_count: allItems.filter((entry) => entry.publication_ready === true)
      .length,
    status_counts: statusCounts,
    format_counts: formatCounts,
    generated_status_order: [...PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUS_ORDER],
    safety: {
      production_totals_exclude_fixture_items: true,
      no_published_transition_in_batch64a: true,
      no_archived_transition_in_batch64a: true,
      no_automated_transition: true,
      no_automated_approval: true,
      no_automated_publication: true,
    },
  };
}

export function evaluatePipPublicCommunicationProductionQueueTransition({
  queueItem,
  transitionRequest,
} = {}) {
  const itemValidation = validatePipPublicCommunicationProductionQueueItem(queueItem);
  const requestValidation =
    validatePipPublicCommunicationProductionQueueTransitionRequest(transitionRequest);

  const item = itemValidation.normalized;
  const request = requestValidation.normalized;

  const actionMap = buildTransitionActionMap();
  const actionConfig = actionMap[request.action] ?? null;
  const blockReasons = [];
  const errors = [];

  if (!itemValidation.valid) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.SOURCE_DRAFT_INVALID
    );
    errors.push(...itemValidation.errors);
  }

  if (!requestValidation.valid) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.UNSUPPORTED_ACTION
    );
    errors.push(...requestValidation.errors);
  }

  if (!actionConfig) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.UNSUPPORTED_ACTION
    );
  }

  const currentStatus = sanitizeUpper(item.current_status, 120);
  const expectedCurrent = sanitizeUpper(request.expected_current_status, 120);

  if (!enumIncludesStatus(currentStatus)) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  if (!enumIncludesStatus(request.requested_target_status)) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.INVALID_TARGET_STATUS
    );
  }

  if (expectedCurrent && expectedCurrent !== currentStatus) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  if (
    currentStatus === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.PUBLISHED ||
    currentStatus === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.ARCHIVED
  ) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.QUEUE_ITEM_TERMINAL
    );
  }

  if (item.transition_history.some((entry) => entry.transition_id === request.queue_item_id)) {
    blockReasons.push(
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.DUPLICATE_TRANSITION
    );
  }

  let targetStatus = request.requested_target_status;
  if (actionConfig) {
    if (actionConfig.to) {
      targetStatus = actionConfig.to;
    }

    if (actionConfig.from && actionConfig.from !== currentStatus) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.INVALID_CURRENT_STATUS
      );
    }

    if (
      request.requested_target_status &&
      actionConfig.to &&
      sanitizeUpper(request.requested_target_status, 120) !== actionConfig.to
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.INVALID_TARGET_STATUS
      );
    }

    const actorRole = sanitizeUpper(request.actor_role, 120);
    if (actionConfig.actorRoles?.includes(actorRole) !== true) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
      );
    }

    if (actionConfig.disabledForBatch64A === true) {
      blockReasons.push(
        actionConfig.to === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.PUBLISHED
          ? PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.PUBLISHED_TRANSITION_DISABLED_IN_BATCH_64A
          : PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.ARCHIVE_TRANSITION_DISABLED_IN_BATCH_64A
      );
    }

    if (item.validation_fixture === true && actionConfig.allowForFixture !== true) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.VALIDATION_FIXTURE_PRODUCTION_TRANSITION_BLOCKED
      );
    }

    const geography = parseGeographyScope(item.geography_scope);
    if (
      geography.district === "P999" &&
      targetStatus ===
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.P999_PRODUCTION_TRANSITION_BLOCKED
      );
    }

    const fromIndex = statusIndex(currentStatus);
    const toIndex = statusIndex(targetStatus);
    if (
      actionConfig.to &&
      actionConfig.to !== PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT &&
      toIndex - fromIndex > 1
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.STATUS_SKIP_NOT_ALLOWED
      );
    }

    if (item.manual_transition_only !== true) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.MANUAL_TRANSITION_REQUIRED
      );
    }

    if (toIndex > statusIndex(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION)) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.PUBLISHED_TRANSITION_DISABLED_IN_BATCH_64A
      );
    }

    if (actionConfig.requires?.includes("review_note") && !request.review_note) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.REVIEW_NOTE_REQUIRED
      );
    }

    if (
      actionConfig.requires?.includes("evidence_review_complete") &&
      item.evidence_review?.completed !== true
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.EVIDENCE_REVIEW_INCOMPLETE
      );
    }

    if (
      actionConfig.requires?.includes("editorial_review_complete") &&
      item.editorial_review?.completed !== true
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.EDITORIAL_REVIEW_INCOMPLETE
      );
    }

    if (
      actionConfig.requires?.includes("approval_recorded") &&
      item.approval?.approved !== true
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.APPROVAL_NOT_RECORDED
      );
    }

    if (
      actionConfig.requires?.includes("approval_recorded") &&
      sanitizeUpper(request.actor_role, 120) !== "ADMINISTRATOR"
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.APPROVAL_ROLE_REQUIRED
      );
    }

    if (
      actionConfig.requires?.includes("publication_register") &&
      item.publication_registered !== true
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.PUBLICATION_REGISTER_REQUIRED
      );
    }

    if (
      actionConfig.requires?.includes("publication_record") &&
      item.production_readiness?.status !== "PUBLISHABLE"
    ) {
      blockReasons.push(
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.PUBLICATION_RECORD_REQUIRED
      );
    }
  }

  const uniqueBlockReasons = uniq(blockReasons);
  const valid = itemValidation.valid && requestValidation.valid;
  const permitted = valid && uniqueBlockReasons.length === 0;

  const evaluation = {
    schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA,
    valid,
    permitted,
    queue_item_id: item.queue_item_id,
    action: request.action,
    from_status: currentStatus,
    to_status: sanitizeUpper(targetStatus, 120),
    block_reasons: uniqueBlockReasons,
    required_dependency: actionConfig?.requires?.join("+") ?? "",
    errors,
    summary: {
      blocked: uniqueBlockReasons.length > 0,
      block_count: uniqueBlockReasons.length,
      manual_transition_only: item.manual_transition_only === true,
      automated_transition: false,
      automated_approval: false,
      automated_publication: false,
    },
  };

  return validatePipPublicCommunicationProductionQueueTransitionEvaluation(evaluation)
    .normalized;
}

function enumIncludesStatus(value) {
  return Object.values(PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES).includes(
    sanitizeUpper(value, 120)
  );
}

function advanceItemForAction(item, request, evaluation) {
  const updated = {
    ...item,
    previous_status: item.current_status,
    current_status: evaluation.to_status,
    status_sequence: statusIndex(evaluation.to_status) + 1,
    updated_at: new Date().toISOString(),
  };

  if (
    request.action ===
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.COMPLETE_EVIDENCE_REVIEW ||
    request.action ===
      PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.SUBMIT_FOR_EDITORIAL_REVIEW
  ) {
    updated.evidence_review = {
      ...updated.evidence_review,
      completed: true,
      status: "COMPLETED",
      reviewer_role: sanitizeUpper(request.actor_role, 120),
      reviewer_alias: sanitizeText(request.actor_alias, 24),
      review_note: sanitizeText(request.review_note, 360),
      completed_at: updated.updated_at,
    };
  }

  if (
    request.action ===
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.COMPLETE_EDITORIAL_REVIEW
  ) {
    updated.editorial_review = {
      ...updated.editorial_review,
      completed: true,
      status: "COMPLETED",
      reviewer_role: sanitizeUpper(request.actor_role, 120),
      reviewer_alias: sanitizeText(request.actor_alias, 24),
      review_note: sanitizeText(request.review_note, 360),
      completed_at: updated.updated_at,
    };
  }

  if (
    request.action ===
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.RECORD_APPROVAL
  ) {
    updated.approval = {
      ...updated.approval,
      approved: true,
      status: "APPROVED",
      approver_role: sanitizeUpper(request.actor_role, 120),
      approver_alias: sanitizeText(request.actor_alias, 24),
      approval_note: sanitizeText(request.review_note, 360),
      approved_at: updated.updated_at,
    };
  }

  if (
    request.action ===
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.MARK_READY_FOR_PRODUCTION
  ) {
    updated.production_readiness = {
      ...updated.production_readiness,
      status: "READY_FOR_PRODUCTION",
      ready: true,
      checked_at: updated.updated_at,
      note: sanitizeText(request.review_note, 360),
    };
    updated.publication_ready = false;
  }

  if (
    request.action ===
    PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.RETURN_TO_DRAFT
  ) {
    updated.evidence_review = {
      ...updated.evidence_review,
      status: "PENDING",
      completed: false,
      review_note: sanitizeText(request.review_note, 360),
    };
    updated.editorial_review = {
      ...updated.editorial_review,
      status: "PENDING",
      completed: false,
      review_note: sanitizeText(request.review_note, 360),
    };
    updated.approval = {
      ...updated.approval,
      status: "PENDING",
      approved: false,
      approval_note: sanitizeText(request.review_note, 360),
    };
    updated.production_readiness = {
      ...updated.production_readiness,
      status: "PENDING",
      ready: false,
      checked_at: updated.updated_at,
      note: sanitizeText(request.review_note, 360),
    };
    updated.publication_ready = false;
    updated.publication_registered = false;
  }

  return validatePipPublicCommunicationProductionQueueItem(updated).normalized;
}

export function applyPipPublicCommunicationProductionQueueTransition({
  queueItem,
  transitionRequest,
} = {}) {
  const item = validatePipPublicCommunicationProductionQueueItem(queueItem).normalized;
  const request =
    validatePipPublicCommunicationProductionQueueTransitionRequest(transitionRequest).normalized;

  const evaluation = evaluatePipPublicCommunicationProductionQueueTransition({
    queueItem: item,
    transitionRequest: request,
  });

  if (evaluation.permitted !== true) {
    return {
      updated_item: item,
      evaluation,
      receipt: null,
      applied: false,
      errors: evaluation.errors,
    };
  }

  const sourceItemFingerprintBefore = stableHash(item);
  const updatedItem = advanceItemForAction(item, request, evaluation);
  const sourceItemFingerprintAfter = stableHash(updatedItem);

  const receipt = validatePipPublicCommunicationProductionQueueTransitionReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_RECEIPT_SCHEMA,
    transition_id: `PQT-${updatedItem.queue_item_id}-${updatedItem.transition_count + 1}`,
    queue_item_id: updatedItem.queue_item_id,
    action: request.action,
    from_status: evaluation.from_status,
    to_status: evaluation.to_status,
    actor_role: request.actor_role,
    actor_alias: request.actor_alias,
    review_note: request.review_note,
    transitioned_at: new Date().toISOString(),
    source_item_fingerprint_before: sourceItemFingerprintBefore,
    source_item_fingerprint_after: sourceItemFingerprintAfter,
    source_content_fingerprint: sanitizeText(updatedItem.source_fingerprint, 140),
    sequence: updatedItem.transition_count + 1,
    manual_transition: true,
    automated_transition: false,
    validation_fixture: updatedItem.validation_fixture === true,
    safety: {
      append_only_transition_history: true,
      manual_transition: true,
      automated_transition: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  }).normalized;

  const withHistory = validatePipPublicCommunicationProductionQueueItem({
    ...updatedItem,
    transition_history: [...updatedItem.transition_history, receipt],
    transition_count: updatedItem.transition_count + 1,
    updated_at: receipt.transitioned_at,
  }).normalized;

  return {
    updated_item: withHistory,
    evaluation,
    receipt,
    applied: true,
    errors: [],
  };
}

export function applyPipPublicCommunicationProductionQueueTransitions({
  queueCollection,
  transitionRequests = [],
} = {}) {
  const safeCollection = validatePipPublicCommunicationProductionQueueCollection(
    queueCollection
  ).normalized;
  const requestList = toArray(transitionRequests).map((entry) =>
    validatePipPublicCommunicationProductionQueueTransitionRequest(entry).normalized
  );

  const productionQueueItems = [...safeCollection.production_queue_items];
  const fixtureQueueItems = [...safeCollection.fixture_queue_items];
  const blockedTransitionEvaluations = [...safeCollection.blocked_transition_evaluations];
  const receipts = [];

  requestList.forEach((request) => {
    const allItems = [...productionQueueItems, ...fixtureQueueItems];
    const itemIndex = allItems.findIndex(
      (entry) => entry.queue_item_id === request.queue_item_id
    );

    if (itemIndex < 0) {
      blockedTransitionEvaluations.push(
        validatePipPublicCommunicationProductionQueueTransitionEvaluation({
          schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_EVALUATION_SCHEMA,
          valid: false,
          permitted: false,
          queue_item_id: request.queue_item_id,
          action: request.action,
          from_status: request.expected_current_status,
          to_status: request.requested_target_status,
          block_reasons: [
            PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.SOURCE_DRAFT_MISSING,
          ],
          required_dependency: "",
          errors: ["queue item not found"],
          summary: {
            blocked: true,
            block_count: 1,
          },
        }).normalized
      );
      return;
    }

    const item = allItems[itemIndex];
    const applied = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: item,
      transitionRequest: request,
    });

    if (applied.applied !== true) {
      blockedTransitionEvaluations.push(applied.evaluation);
      return;
    }

    const targetArray = item.validation_fixture ? fixtureQueueItems : productionQueueItems;
    const targetIndex = targetArray.findIndex(
      (entry) => entry.queue_item_id === item.queue_item_id
    );
    if (targetIndex >= 0) {
      targetArray[targetIndex] = applied.updated_item;
      receipts.push(applied.receipt);
    }
  });

  const updatedCollection = {
    ...safeCollection,
    production_queue_items: productionQueueItems,
    fixture_queue_items: fixtureQueueItems,
    blocked_transition_evaluations: blockedTransitionEvaluations,
    successful_transition_count: receipts.length,
    summary: buildPipPublicCommunicationProductionQueueSummary({
      productionQueueItems,
      fixtureQueueItems,
      excludedSourcePackages: safeCollection.excluded_source_packages,
      blockedTransitionEvaluations,
      successfulTransitionCount: receipts.length,
    }),
    safety: {
      ...safeCollection.safety,
      source_records_modified: false,
      source_evidence_modified: false,
      manual_transition_only: true,
      automated_transition_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  };

  const validatedCollection =
    validatePipPublicCommunicationProductionQueueCollection(updatedCollection).normalized;

  return {
    queue_collection: validatedCollection,
    receipts,
    blocked_transition_evaluations: blockedTransitionEvaluations,
    summary: validatedCollection.summary,
  };
}

export function buildPipPublicCommunicationProductionQueueValidationFixture({
  contentPackageCollection,
} = {}) {
  const sourceCollection = isPlainObject(contentPackageCollection)
    ? contentPackageCollection
    : {
        all_content_packages: [
          {
            schema: "pip.public-communication.content-package.record.v1",
            content_package_id: "PCP-RC-FX-QUEUE",
            source_recommendation_package_id: "PRP-RC-FX-QUEUE",
            response_case_id: "RC-FX-QUEUE",
            source_issue_id: "RC-FX-QUEUE-ISSUE",
            issue_label: "Fixture queue issue",
            geography_scope: "TEST/P999",
            source_recommendation: "CLARIFY",
            public_communication_objective: "CLARIFY_VERIFIED_INFORMATION",
            verified_factual_core: [
              {
                fact_id: "RC-FX-QUEUE-F1",
                factual_statement:
                  "Verified fixture statement for deterministic queue validation.",
                supporting_evidence_ids: ["RC-FX-QUEUE-E1"],
              },
            ],
            supporting_evidence: [
              {
                evidence_id: "RC-FX-QUEUE-E1",
                lineage_reference: "RC-FX-QUEUE-L1",
                verification_status: "VERIFIED",
                valid_until: "2028-01-01T00:00:00.000Z",
              },
            ],
            uncertainty_classification: "LOW",
            uncertainty_notes: "Fixture uncertainty note.",
            wording_risk_codes: ["FIXTURE_QUEUE"],
            approval_level: "SENIOR_APPROVAL",
            responsible_owner_role: "COMMUNICATIONS_OFFICER",
            package_status: "VALIDATION_FIXTURE_ONLY",
            drafts: [
              {
                schema: "pip.public-communication.content-package.draft.v1",
                draft_id: "PCD-RC-FX-QUEUE-FACEBOOK_POST",
                content_package_id: "PCP-RC-FX-QUEUE",
                source_recommendation_package_id: "PRP-RC-FX-QUEUE",
                response_case_id: "RC-FX-QUEUE",
                format: "FACEBOOK_POST",
                draft_status: "DRAFT_CREATED",
                draft_label: "DRAFT - HUMAN REVIEW REQUIRED",
                content_sections: {
                  body:
                    "Fixture draft body for queue validation. Human review required.",
                },
                verified_fact_ids: ["RC-FX-QUEUE-F1"],
                evidence_ids: ["RC-FX-QUEUE-E1"],
                uncertainty_note: "Fixture uncertainty note.",
                wording_risk_codes: ["FIXTURE_QUEUE"],
                approval_level: "SENIOR_APPROVAL",
                responsible_owner_role: "COMMUNICATIONS_OFFICER",
                review_requirements: [
                  "EVIDENCE_REVIEW_REQUIRED",
                  "EDITORIAL_REVIEW_REQUIRED",
                  "SUBJECT_MATTER_REVIEW_REQUIRED",
                  "LEGAL_POLICY_REVIEW_REQUIRED",
                  "SENIOR_APPROVAL_REQUIRED",
                ],
                human_review_required: true,
                publication_ready: false,
                automated_publication_allowed: false,
                validation_fixture: true,
                created_at: "2027-01-01T00:00:00.000Z",
                safety: {
                  deterministic: true,
                },
              },
            ],
            draft_format_count: 1,
            human_review_required: true,
            production_eligible: false,
            publication_ready: false,
            validation_fixture: true,
            created_at: "2027-01-01T00:00:00.000Z",
            validation: {
              valid: true,
              errors: [],
            },
            safety: {
              source_records_modified: false,
            },
            block_reasons: [],
          },
        ],
      };

  const queueCollection = buildPipPublicCommunicationProductionQueueCollection({
    contentPackageCollection: sourceCollection,
    includeValidationFixtures: true,
  });

  const fixtureItem = queueCollection.fixture_queue_items[0] ?? null;
  const receiptChecks = {
    draft_to_evidence_review: false,
    evidence_review_to_editorial_review: false,
    editorial_review_to_approval_required: false,
    approval_required_to_approved: false,
    approved_to_ready_for_production_blocked_on_fixture: false,
    published_blocked_in_batch64a: false,
  };

  const receipts = [];
  const blocked = [];

  if (fixtureItem) {
    let working = fixtureItem;

    const step1 = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: working,
      transitionRequest: {
        queue_item_id: working.queue_item_id,
        action:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.SUBMIT_FOR_EVIDENCE_REVIEW,
        expected_current_status: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.DRAFT,
        requested_target_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW,
        actor_role: "ANALYST",
        actor_alias: "REV-ANL64A",
        review_note: "Submit for evidence review.",
        validation_fixture: true,
      },
    });

    if (step1.applied) {
      working = step1.updated_item;
      receipts.push(step1.receipt);
      receiptChecks.draft_to_evidence_review =
        step1.updated_item.current_status ===
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW;
    } else {
      blocked.push(step1.evaluation);
    }

    const step2 = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: {
        ...working,
        evidence_review: {
          ...working.evidence_review,
          completed: true,
          status: "COMPLETED",
        },
      },
      transitionRequest: {
        queue_item_id: working.queue_item_id,
        action:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.COMPLETE_EVIDENCE_REVIEW,
        expected_current_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EVIDENCE_REVIEW,
        requested_target_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW,
        actor_role: "ANALYST",
        actor_alias: "REV-ANL64A",
        review_note: "Evidence review completed.",
        validation_fixture: true,
      },
    });

    if (step2.applied) {
      working = step2.updated_item;
      receipts.push(step2.receipt);
      receiptChecks.evidence_review_to_editorial_review =
        step2.updated_item.current_status ===
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW;
    } else {
      blocked.push(step2.evaluation);
    }

    const step3 = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: {
        ...working,
        editorial_review: {
          ...working.editorial_review,
          completed: true,
          status: "COMPLETED",
        },
      },
      transitionRequest: {
        queue_item_id: working.queue_item_id,
        action:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.COMPLETE_EDITORIAL_REVIEW,
        expected_current_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.EDITORIAL_REVIEW,
        requested_target_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
        actor_role: "ANALYST",
        actor_alias: "REV-ANL64A",
        review_note: "Editorial review completed.",
        validation_fixture: true,
      },
    });

    if (step3.applied) {
      working = step3.updated_item;
      receipts.push(step3.receipt);
      receiptChecks.editorial_review_to_approval_required =
        step3.updated_item.current_status ===
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED;
    } else {
      blocked.push(step3.evaluation);
    }

    const step4 = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: {
        ...working,
        approval: {
          ...working.approval,
          approved: true,
          status: "APPROVED",
        },
      },
      transitionRequest: {
        queue_item_id: working.queue_item_id,
        action: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.RECORD_APPROVAL,
        expected_current_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVAL_REQUIRED,
        requested_target_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVED,
        actor_role: "ADMINISTRATOR",
        actor_alias: "REV-ADM64A",
        review_note: "Approval recorded.",
        validation_fixture: true,
      },
    });

    if (step4.applied) {
      working = step4.updated_item;
      receipts.push(step4.receipt);
      receiptChecks.approval_required_to_approved =
        step4.updated_item.current_status ===
        PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVED;
    } else {
      blocked.push(step4.evaluation);
    }

    const step5 = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: {
        ...working,
        publication_registered: true,
      },
      transitionRequest: {
        queue_item_id: working.queue_item_id,
        action:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.MARK_READY_FOR_PRODUCTION,
        expected_current_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.APPROVED,
        requested_target_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.READY_FOR_PRODUCTION,
        actor_role: "ADMINISTRATOR",
        actor_alias: "REV-ADM64A",
        review_note: "Fixture blocked from production transition.",
        validation_fixture: true,
      },
    });

    if (!step5.applied) {
      blocked.push(step5.evaluation);
      receiptChecks.approved_to_ready_for_production_blocked_on_fixture =
        step5.evaluation.block_reasons.includes(
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.VALIDATION_FIXTURE_PRODUCTION_TRANSITION_BLOCKED
        );
    }

    const step6 = applyPipPublicCommunicationProductionQueueTransition({
      queueItem: working,
      transitionRequest: {
        queue_item_id: working.queue_item_id,
        action: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_TRANSITION_ACTIONS.MARK_PUBLISHED,
        expected_current_status: working.current_status,
        requested_target_status:
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_STATUSES.PUBLISHED,
        actor_role: "ADMINISTRATOR",
        actor_alias: "REV-ADM64A",
        review_note: "Batch 64A blocks published transition.",
        validation_fixture: true,
      },
    });

    if (!step6.applied) {
      blocked.push(step6.evaluation);
      receiptChecks.published_blocked_in_batch64a =
        step6.evaluation.block_reasons.includes(
          PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_BLOCK_REASONS.PUBLISHED_TRANSITION_DISABLED_IN_BATCH_64A
        );
    }
  }

  const exported = sanitizePipPublicCommunicationProductionQueueExport({
    schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA,
    generated_at: queueCollection.generated_at,
    contract_schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_CONTRACT_SCHEMA,
    collection_schema: PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_COLLECTION_SCHEMA,
    queue_summary: queueCollection.summary,
    production_queue_items: queueCollection.production_queue_items,
    fixture_queue_items: queueCollection.fixture_queue_items,
    excluded_source_package_summary: {
      count: queueCollection.excluded_source_packages.length,
      by_reason: queueCollection.excluded_source_packages.reduce((acc, entry) => {
        const key = sanitizeUpper(entry.reason, 140, "UNKNOWN");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    },
    sanitized_transition_history: receipts,
    blocked_transition_evaluations: blocked,
    validation_result: queueCollection.validation,
    safety_manifest: queueCollection.safety,
  });

  return {
    collection: queueCollection,
    checks: {
      queue_items_built: queueCollection.production_queue_items.length >= 0,
      fixture_items_built: queueCollection.fixture_queue_items.length >= 0,
      transitions_are_manual: receipts.every((entry) => entry.manual_transition === true),
      published_transition_blocked_in_batch64a:
        receiptChecks.published_blocked_in_batch64a === true,
      fixture_transition_blocked_for_production:
        receiptChecks.approved_to_ready_for_production_blocked_on_fixture === true,
      staged_progression_works:
        receiptChecks.draft_to_evidence_review === true &&
        receiptChecks.evidence_review_to_editorial_review === true &&
        receiptChecks.editorial_review_to_approval_required === true &&
        receiptChecks.approval_required_to_approved === true,
      export_schema_valid:
        exported.schema === PIP_PUBLIC_COMMUNICATION_PRODUCTION_QUEUE_EXPORT_SCHEMA,
    },
    receipts,
    blocked_transition_evaluations: blocked,
    export_payload: exported,
  };
}

export function serializePipPublicCommunicationProductionQueueExport(exportPayload = {}) {
  const sanitized = sanitizePipPublicCommunicationProductionQueueExport(exportPayload);
  return JSON.stringify(sanitized, null, 2);
}

export function createPipPublicCommunicationProductionQueueExportFileName({
  generatedAt,
  scope = "P134",
  suffix = "production-queue",
} = {}) {
  const iso = normalizeIso(generatedAt) ?? new Date().toISOString();
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_") || "P134";
  const safeSuffix = sanitizeText(suffix, 64).replace(/[^A-Za-z0-9_-]/g, "_") || "queue";
  return `pip-public-communication-${safeSuffix}-${safeScope}-${compact}.json`;
}

export function buildPipPublicCommunicationProductionQueueManifestValidationResult() {
  const manifest = buildPipPublicCommunicationProductionQueueContractManifest();
  return validatePipPublicCommunicationProductionQueueContractManifest(manifest);
}
