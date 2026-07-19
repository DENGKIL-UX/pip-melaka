import {
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUS_ORDER,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS,
  PIP_PUBLIC_COMMUNICATION_FORMAT_TO_PUBLICATION_PLATFORM,
  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_EXPORT_SCHEMA,
  buildPipPublicCommunicationPublicationRegisterContractManifest,
  validatePipPublicCommunicationPublicationRegisterContractManifest,
  validatePipPublicCommunicationPublicationRegisterEntry,
  validatePipPublicCommunicationPublicationRegisterCollection,
  validatePipPublicCommunicationPublicationPlanningUpdate,
  validatePipPublicCommunicationManualPublicationRequest,
  validatePipPublicCommunicationPublicationVerificationRequest,
  sanitizePipPublicCommunicationPublicationRegisterExport,
} from "./pip-public-communication-publication-register-contract.js";

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
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
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

function uniq(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
}

function toAliasPattern(alias, prefix) {
  return new RegExp(`^${prefix}-[A-Z0-9]{8,16}$`).test(String(alias ?? ""));
}

function queueStatusIndex(status) {
  const order = [
    "DRAFT",
    "EVIDENCE_REVIEW",
    "EDITORIAL_REVIEW",
    "APPROVAL_REQUIRED",
    "APPROVED",
    "READY_FOR_PRODUCTION",
    "PUBLISHED",
    "ARCHIVED",
  ];
  return order.indexOf(sanitizeUpper(status, 120));
}

function statusIndex(status) {
  return PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUS_ORDER.indexOf(
    sanitizeUpper(status, 120)
  );
}

function createBlockedEvaluation({
  action,
  currentStatus,
  targetStatus,
  reasons,
  errors = [],
  requiredDependency = "",
} = {}) {
  return {
    valid: errors.length === 0,
    permitted: false,
    action: sanitizeUpper(action, 120),
    from_status: sanitizeUpper(currentStatus, 120),
    to_status: sanitizeUpper(targetStatus, 120),
    block_reasons: uniq(reasons),
    required_dependency: sanitizeText(requiredDependency, 120),
    errors: toArray(errors).map((entry) => sanitizeText(entry, 260)),
    summary: {
      blocked: true,
      block_count: uniq(reasons).length,
    },
  };
}

function validatePlatformForFormat(contentFormat, platform, channelLabel, reviewNote) {
  const normalizedFormat = sanitizeUpper(contentFormat, 120);
  const normalizedPlatform = sanitizeUpper(platform, 120);
  const expected = PIP_PUBLIC_COMMUNICATION_FORMAT_TO_PUBLICATION_PLATFORM[
    normalizedFormat
  ];

  if (!expected && normalizedPlatform) return true;
  if (expected === normalizedPlatform) return true;

  if (
    normalizedPlatform ===
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.OTHER_MANUAL_PUBLIC_CHANNEL &&
    sanitizeText(channelLabel, 160).length > 0 &&
    sanitizeText(reviewNote, 360).length > 0
  ) {
    return true;
  }

  return false;
}

function isAssetRequirementComplete(entry) {
  const requirements = toArray(entry.asset_requirements);
  if (requirements.length <= 0) return false;

  return requirements.every((item) => {
    const status = sanitizeUpper(item?.status, 80);
    const required = item?.required === true;
    if (!required) return true;
    if (status === "READY") return true;
    if (
      status === "REVIEW_REQUIRED" &&
      sanitizeText(item?.description, 220).length > 0
    ) {
      return true;
    }
    return false;
  });
}

export function validatePipPublicCommunicationPublicationUrl(value) {
  const text = sanitizeText(value, 2048);
  const errors = [];

  if (!text) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_REQUIRED
    );
    return { valid: false, errors, normalized: "" };
  }

  let parsed = null;
  try {
    parsed = new URL(text);
  } catch (_error) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_INVALID
    );
    return { valid: false, errors, normalized: "" };
  }

  if (parsed.protocol !== "https:") {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_NOT_HTTPS
    );
  }

  if (!parsed.hostname) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_INVALID
    );
  }

  if (parsed.username || parsed.password) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_CONTAINS_CREDENTIALS
    );
  }

  const blockedParamNames = [
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "apikey",
    "secret",
    "password",
    "credential",
    "session",
    "auth",
    "authorization",
  ];

  for (const [key] of parsed.searchParams.entries()) {
    const normalized = sanitizeText(key, 80).toLowerCase();
    if (blockedParamNames.some((entry) => normalized.includes(entry))) {
      errors.push(
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_CONTAINS_SECRET_PARAMETER
      );
      break;
    }
  }

  if (sanitizeText(parsed.hash, 260).match(/token|secret|auth|credential/i)) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_CONTAINS_SECRET_PARAMETER
    );
  }

  if (text.length > 2048) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_URL_INVALID
    );
  }

  return {
    valid: errors.length === 0,
    errors: uniq(errors),
    normalized: parsed.toString(),
  };
}

export function validatePipPublicCommunicationPublicationTimestamp({
  timestamp,
  recordedAt,
  approvalTimestamp,
  createdAt,
} = {}) {
  const errors = [];
  const normalizedTimestamp = normalizeIso(timestamp);
  const normalizedRecordedAt = normalizeIso(recordedAt) ?? new Date().toISOString();

  if (!sanitizeText(timestamp, 80)) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_TIMESTAMP_REQUIRED
    );
  }

  if (!normalizedTimestamp) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_TIMESTAMP_INVALID
    );
  }

  const publishedTime = Date.parse(String(normalizedTimestamp ?? ""));
  const recordedTime = Date.parse(String(normalizedRecordedAt));
  const approvalTime = Date.parse(String(normalizeIso(approvalTimestamp) ?? ""));
  const createdTime = Date.parse(String(normalizeIso(createdAt) ?? ""));

  if (Number.isFinite(publishedTime) && Number.isFinite(recordedTime)) {
    if (publishedTime - recordedTime > 5 * 60 * 1000) {
      errors.push(
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_TIMESTAMP_IN_FUTURE
      );
    }
  }

  if (Number.isFinite(publishedTime) && Number.isFinite(approvalTime)) {
    if (publishedTime < approvalTime) {
      errors.push(
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_TIMESTAMP_INVALID
      );
    }
  }

  if (Number.isFinite(publishedTime) && Number.isFinite(createdTime)) {
    if (publishedTime < createdTime) {
      errors.push(
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_TIMESTAMP_INVALID
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors: uniq(errors),
    normalized: normalizedTimestamp ?? "",
  };
}

export function detectPipPublicCommunicationPublicationSourceMutation({
  queueItem,
  registerEntry,
} = {}) {
  const sourceQueueFingerprint = sanitizeText(queueItem?.source_fingerprint, 160);
  const registerQueueFingerprint = sanitizeText(
    registerEntry?.source_queue_fingerprint,
    160
  );

  const sourceMutated =
    sourceQueueFingerprint.length > 0 &&
    registerQueueFingerprint.length > 0 &&
    sourceQueueFingerprint !== registerQueueFingerprint;

  return {
    mutated: sourceMutated,
    reasons: sourceMutated
      ? [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_MUTATION_DETECTED,
        ]
      : [],
  };
}

export function evaluatePipPublicCommunicationPublicationRegisterEligibility({
  queueItem,
  registerCollection,
  validationFixture = false,
} = {}) {
  const safeQueue = isPlainObject(queueItem) ? queueItem : {};
  const reasons = [];

  if (!safeQueue || Object.keys(safeQueue).length === 0) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_MISSING
    );
  }

  if (safeQueue?.validation?.valid === false) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_INVALID
    );
  }

  if (sanitizeUpper(safeQueue.current_status, 120) !== "READY_FOR_PRODUCTION") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION
    );
  }

  if (safeQueue.approval?.approved !== true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_NOT_APPROVED
    );
  }

  if (
    safeQueue.evidence_review?.completed !== true ||
    safeQueue.editorial_review?.completed !== true
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_REVIEW_INCOMPLETE
    );
  }

  if (toArray(safeQueue.verified_fact_ids).length <= 0 || toArray(safeQueue.evidence_ids).length <= 0) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.EVIDENCE_PACKAGE_REQUIRED
    );
  }

  if (safeQueue.automated_publication_allowed === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.AUTOMATED_PUBLICATION_NOT_PERMITTED
    );
  }

  if (safeQueue.validation_fixture === true && validationFixture !== true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_FIXTURE_PRODUCTION_BLOCKED
    );
  }

  const geography = sanitizeUpper(safeQueue.geography_scope, 120);
  if (geography.includes("P999") && validationFixture !== true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.P999_PRODUCTION_PUBLICATION_BLOCKED
    );
  }

  const allEntries = [
    ...toArray(registerCollection?.production_register_entries),
    ...toArray(registerCollection?.fixture_register_entries),
  ];

  const duplicateActive = allEntries.some((entry) => {
    const sameQueueId =
      sanitizeText(entry?.source_queue_item_id, 160) ===
      sanitizeText(safeQueue?.queue_item_id, 160);
    const activeStatus = ![
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VOIDED,
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED,
    ].includes(sanitizeUpper(entry?.current_status, 120));
    return sameQueueId && activeStatus;
  });

  if (duplicateActive) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.DUPLICATE_ACTIVE_REGISTER_ENTRY
    );
  }

  return {
    eligible: reasons.length === 0,
    block_reasons: uniq(reasons),
    queue_item_id: sanitizeText(safeQueue?.queue_item_id, 160),
  };
}

export function buildPipPublicCommunicationPublicationRegisterEntry({
  queueItem,
  ownerRole = "",
  ownerAlias = "",
  publicationPlatform = "",
  dueDate,
  publicChannelLabel = "",
  assetRequirements = [],
  evidencePackage = {},
  approvalReference = "",
  validationFixture = false,
} = {}) {
  const safeQueue = isPlainObject(queueItem) ? queueItem : {};

  const entry = validatePipPublicCommunicationPublicationRegisterEntry({
    schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ENTRY_SCHEMA,
    register_entry_id: `PPR-${sanitizeText(safeQueue.queue_item_id, 80)}`,
    source_queue_item_id: safeQueue.queue_item_id,
    source_content_package_id: safeQueue.source_content_package_id,
    source_draft_id: safeQueue.source_draft_id,
    source_recommendation_package_id: safeQueue.source_recommendation_package_id,
    response_case_id: safeQueue.response_case_id,
    source_issue_id: safeQueue.source_issue_id,
    issue_label: safeQueue.issue_label,
    geography_scope: safeQueue.geography_scope,
    content_format: safeQueue.content_format,
    draft_label: safeQueue.draft_label,
    source_queue_status: safeQueue.current_status,
    source_queue_fingerprint: safeQueue.source_fingerprint,
    source_content_fingerprint: stableHash({
      source_content_package_id: safeQueue.source_content_package_id,
      source_issue_id: safeQueue.source_issue_id,
      content_format: safeQueue.content_format,
    }),
    source_evidence_fingerprint: stableHash({
      evidence_ids: safeQueue.evidence_ids,
      verified_fact_ids: safeQueue.verified_fact_ids,
    }),
    responsible_owner_role: ownerRole,
    responsible_owner_alias: ownerAlias,
    publication_platform: publicationPlatform,
    public_channel_label: publicChannelLabel,
    due_date: dueDate,
    asset_requirements: assetRequirements,
    evidence_package: evidencePackage,
    evidence_ids: safeQueue.evidence_ids,
    verified_fact_ids: safeQueue.verified_fact_ids,
    approval_level: safeQueue.approval_level,
    approval_reference: approvalReference,
    approval_verified: safeQueue.approval?.approved === true,
    current_status: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.REGISTERED,
    previous_status: null,
    status_sequence: 1,
    publication_url: "",
    publication_timestamp: "",
    publication_recorded_at: "",
    publication_recorded_by_role: "",
    publication_recorded_by_alias: "",
    publication_verified: false,
    publication_verified_at: "",
    publication_verified_by_role: "",
    publication_verified_by_alias: "",
    publication_verification_note: "",
    external_manual_publication: false,
    platform_operation_performed_by_pip: false,
    publication_scheduled_by_pip: false,
    publication_attempted_by_pip: false,
    queue_status_projection: "READY_FOR_PRODUCTION",
    register_history: [],
    history_count: 0,
    validation_fixture: validationFixture === true,
    production_eligible: validationFixture !== true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).normalized;

  return entry;
}

export function buildPipPublicCommunicationPublicationRegisterCollection({
  queueCollection,
  includeValidationFixtures = true,
} = {}) {
  const safeCollection = isPlainObject(queueCollection) ? queueCollection : {};

  const productionRegisterEntries = [];
  const fixtureRegisterEntries = [];
  const excludedQueueItems = [];

  toArray(safeCollection.production_queue_items).forEach((queueItem) => {
    const evaluation = evaluatePipPublicCommunicationPublicationRegisterEligibility({
      queueItem,
      registerCollection: {
        production_register_entries: productionRegisterEntries,
        fixture_register_entries: fixtureRegisterEntries,
      },
      validationFixture: false,
    });

    if (evaluation.eligible) {
      productionRegisterEntries.push(
        buildPipPublicCommunicationPublicationRegisterEntry({
          queueItem,
          publicationPlatform:
            PIP_PUBLIC_COMMUNICATION_FORMAT_TO_PUBLICATION_PLATFORM[
              sanitizeUpper(queueItem.content_format, 120)
            ] ?? PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.OTHER_MANUAL_PUBLIC_CHANNEL,
          evidencePackage: {
            source_queue_item_id: queueItem.queue_item_id,
            source_content_package_id: queueItem.source_content_package_id,
            source_recommendation_package_id:
              queueItem.source_recommendation_package_id,
            verified_fact_ids: queueItem.verified_fact_ids,
            evidence_ids: queueItem.evidence_ids,
            evidence_status: "VERIFIED",
            evidence_lineage_status: "VALID",
            uncertainty_note: queueItem.uncertainty_note,
            wording_risks: queueItem.wording_risk_codes,
            approval_level: queueItem.approval_level,
            approval_reference: queueItem.approval?.approval_note ?? "",
          },
        })
      );
    } else {
      excludedQueueItems.push({
        queue_item_id: sanitizeText(queueItem?.queue_item_id, 160),
        reason: evaluation.block_reasons.join("|"),
      });
    }
  });

  if (includeValidationFixtures) {
    toArray(safeCollection.fixture_queue_items).forEach((queueItem) => {
      const entry = buildPipPublicCommunicationPublicationRegisterEntry({
        queueItem: {
          ...queueItem,
          current_status: "READY_FOR_PRODUCTION",
          approval: {
            ...queueItem.approval,
            approved: true,
          },
          evidence_review: {
            ...queueItem.evidence_review,
            completed: true,
          },
          editorial_review: {
            ...queueItem.editorial_review,
            completed: true,
          },
        },
        ownerRole: "COMMUNICATIONS_OFFICER",
        ownerAlias: "OWN-64BFX001",
        publicationPlatform:
          PIP_PUBLIC_COMMUNICATION_FORMAT_TO_PUBLICATION_PLATFORM[
            sanitizeUpper(queueItem.content_format, 120)
          ] ?? PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS.OTHER_MANUAL_PUBLIC_CHANNEL,
        dueDate: "2027-01-01T00:00:00.000Z",
        publicChannelLabel: "fixture channel",
        assetRequirements: [
          {
            asset_type: "COPY",
            required: true,
            status: "READY",
            description: "fixture reviewed",
            owner_role: "COMMUNICATIONS_OFFICER",
            due_date: "2027-01-01T00:00:00.000Z",
          },
        ],
        evidencePackage: {
          source_queue_item_id: queueItem.queue_item_id,
          source_content_package_id: queueItem.source_content_package_id,
          source_recommendation_package_id:
            queueItem.source_recommendation_package_id,
          verified_fact_ids: queueItem.verified_fact_ids,
          evidence_ids: queueItem.evidence_ids,
          evidence_status: "VERIFIED",
          evidence_lineage_status: "VALID",
          uncertainty_note: queueItem.uncertainty_note,
          wording_risks: queueItem.wording_risk_codes,
          approval_level: queueItem.approval_level,
          approval_reference: "FX-APPROVAL-64B",
        },
        approvalReference: "FX-APPROVAL-64B",
        validationFixture: true,
      });

      fixtureRegisterEntries.push({
        ...entry,
        production_eligible: false,
      });
    });
  }

  const collection = {
    schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_CONTRACT_SCHEMA,
    generated_at: new Date().toISOString(),
    summary: buildPipPublicCommunicationPublicationRegisterSummary({
      productionRegisterEntries,
      fixtureRegisterEntries,
      excludedQueueItems,
      blockedEvaluations: [],
      successfulActions: 0,
      projectedProductionPublished: 0,
      projectedFixturePublished: 0,
      sourceProductionQueueItems: toArray(safeCollection.production_queue_items).length,
      readyForProductionSourceItems: toArray(safeCollection.production_queue_items).filter(
        (entry) => sanitizeUpper(entry.current_status, 120) === "READY_FOR_PRODUCTION"
      ).length,
    }),
    production_register_entries: productionRegisterEntries,
    fixture_register_entries: fixtureRegisterEntries,
    excluded_queue_items: excludedQueueItems,
    blocked_evaluations: [],
    successful_actions: 0,
    validation: {
      valid: true,
      errors: [],
    },
    safety: {
      source_records_modified: false,
      source_content_modified: false,
      source_draft_modified: false,
      evidence_package_modified: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  };

  return validatePipPublicCommunicationPublicationRegisterCollection(collection)
    .normalized;
}

export function buildPipPublicCommunicationPublicationRegisterSummary({
  productionRegisterEntries = [],
  fixtureRegisterEntries = [],
  excludedQueueItems = [],
  blockedEvaluations = [],
  successfulActions = 0,
  projectedProductionPublished = 0,
  projectedFixturePublished = 0,
  sourceProductionQueueItems = 0,
  readyForProductionSourceItems = 0,
} = {}) {
  const all = [...toArray(productionRegisterEntries), ...toArray(fixtureRegisterEntries)];
  const statusCounts = {};

  PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUS_ORDER.forEach((status) => {
    statusCounts[status] = all.filter(
      (entry) => sanitizeUpper(entry.current_status, 120) === status
    ).length;
  });

  return {
    source_production_queue_items: Number(sourceProductionQueueItems) || 0,
    ready_for_production_source_items: Number(readyForProductionSourceItems) || 0,
    production_register_entry_count: toArray(productionRegisterEntries).length,
    fixture_register_entry_count: toArray(fixtureRegisterEntries).length,
    excluded_queue_item_count: toArray(excludedQueueItems).length,
    status_counts: statusCounts,
    projected_production_published_count: Number(projectedProductionPublished) || 0,
    projected_fixture_published_count: Number(projectedFixturePublished) || 0,
    blocked_register_action_count: toArray(blockedEvaluations).length,
    successful_register_action_count: Number(successfulActions) || 0,
    archived_count: 0,
    collection_validation_status: "VALID",
  };
}

export function evaluatePipPublicCommunicationPublicationPlanningUpdate({
  registerEntry,
  actorRole,
  actorAlias,
  update,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const request = validatePipPublicCommunicationPublicationPlanningUpdate({
    schema: "pip.public-communication.publication-register.planning-update.v1",
    register_entry_id: entry.register_entry_id,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.UPDATE_PLANNING_DETAILS,
    actor_role: actorRole,
    actor_alias: actorAlias,
    payload: update,
  }).normalized;

  const reasons = [];

  if (!["ANALYST", "ADMINISTRATOR"].includes(sanitizeUpper(request.actor_role, 80))) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }

  if (!toAliasPattern(request.actor_alias, "OWN") && !toAliasPattern(request.actor_alias, "REC") && !toAliasPattern(request.actor_alias, "VER")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }

  const nextOwnerRole = sanitizeUpper(update?.responsible_owner_role, 80);
  const nextOwnerAlias = sanitizeText(update?.responsible_owner_alias, 32);
  const nextPlatform = sanitizeUpper(update?.publication_platform, 80);
  const nextDueDate = normalizeIso(update?.due_date);
  const nextAssetRequirements = toArray(update?.asset_requirements);
  const nextApprovalReference = sanitizeText(update?.approval_reference, 120);

  if (!nextOwnerRole) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.RESPONSIBLE_OWNER_REQUIRED
    );
  }

  if (!toAliasPattern(nextOwnerAlias, "OWN")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.RESPONSIBLE_OWNER_ALIAS_INVALID
    );
  }

  if (!enumIncludesPlatform(nextPlatform)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PLATFORM_REQUIRED
    );
  }

  if (
    !validatePlatformForFormat(
      entry.content_format,
      nextPlatform,
      update?.public_channel_label,
      update?.review_note
    )
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PLATFORM_CONTENT_FORMAT_MISMATCH
    );
  }

  if (!nextDueDate) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.DUE_DATE_REQUIRED
    );
  }

  if (!toArray(nextAssetRequirements).length) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ASSET_REQUIREMENTS_REQUIRED
    );
  }

  if (!entry.evidence_ids.length || !entry.verified_fact_ids.length) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.EVIDENCE_PACKAGE_REQUIRED
    );
  }

  if (!nextApprovalReference) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.APPROVAL_REFERENCE_REQUIRED
    );
  }

  const targetStatus =
    sanitizeUpper(update?.mark_ready, 5) === "TRUE"
      ? PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.READY_FOR_MANUAL_PUBLICATION
      : entry.current_status;

  if (statusIndex(targetStatus) - statusIndex(entry.current_status) > 1) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.STATUS_SKIP_NOT_ALLOWED
    );
  }

  if (entry.current_status === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  return {
    valid: reasons.length === 0,
    permitted: reasons.length === 0,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.UPDATE_PLANNING_DETAILS,
    from_status: entry.current_status,
    to_status: targetStatus,
    block_reasons: uniq(reasons),
    required_dependency: "PLANNING_COMPLETENESS",
  };
}

function enumIncludesPlatform(value) {
  return Object.values(PIP_PUBLIC_COMMUNICATION_PUBLICATION_PLATFORMS).includes(
    sanitizeUpper(value, 80)
  );
}

export function applyPipPublicCommunicationPublicationPlanningUpdate({
  registerEntry,
  actorRole,
  actorAlias,
  update,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const evaluation = evaluatePipPublicCommunicationPublicationPlanningUpdate({
    registerEntry: entry,
    actorRole,
    actorAlias,
    update,
  });

  if (evaluation.permitted !== true) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation,
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationPublicationRegisterEntry({
    ...entry,
    responsible_owner_role: update?.responsible_owner_role,
    responsible_owner_alias: update?.responsible_owner_alias,
    publication_platform: update?.publication_platform,
    public_channel_label: update?.public_channel_label,
    due_date: update?.due_date,
    asset_requirements: update?.asset_requirements,
    approval_reference: update?.approval_reference,
    approval_verified: true,
    previous_status: entry.current_status,
    current_status: evaluation.to_status,
    status_sequence: statusIndex(evaluation.to_status) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  if (!isAssetRequirementComplete(updated)) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation: createBlockedEvaluation({
        action: evaluation.action,
        currentStatus: entry.current_status,
        targetStatus: evaluation.to_status,
        reasons: [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ASSET_REQUIREMENTS_REQUIRED,
        ],
      }),
      receipt: null,
    };
  }

  const receipt = {
    schema: "pip.public-communication.publication-register.planning-receipt.v1",
    receipt_id: `PPR-PLAN-${updated.register_entry_id}-${updated.history_count + 1}`,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.UPDATE_PLANNING_DETAILS,
    from_status: entry.current_status,
    to_status: updated.current_status,
    actor_role: sanitizeUpper(actorRole, 80),
    actor_alias: sanitizeText(actorAlias, 32),
    note: sanitizeText(update?.review_note, 360) || "Planning updated.",
    created_at: new Date().toISOString(),
  };

  const withHistory = validatePipPublicCommunicationPublicationRegisterEntry({
    ...updated,
    register_history: [...updated.register_history, receipt],
    history_count: updated.history_count + 1,
  }).normalized;

  return {
    applied: true,
    updated_entry: withHistory,
    evaluation,
    receipt,
  };
}

export function evaluatePipPublicCommunicationManualPublicationRecord({
  registerEntry,
  actorRole,
  actorAlias,
  publicationUrl,
  publicationTimestamp,
  recordedAt,
  confirmExternalManualPublication,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const _request = validatePipPublicCommunicationManualPublicationRequest({
    schema: "pip.public-communication.publication-register.manual-publication-request.v1",
    register_entry_id: entry.register_entry_id,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RECORD_EXTERNAL_MANUAL_PUBLICATION,
    actor_role: actorRole,
    actor_alias: actorAlias,
    payload: {
      publication_url: publicationUrl,
      publication_timestamp: publicationTimestamp,
      recorded_at: recordedAt,
      confirm_external_manual_publication: confirmExternalManualPublication,
    },
  }).normalized;

  const reasons = [];

  if (sanitizeUpper(actorRole, 80) !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }

  if (!toAliasPattern(actorAlias, "REC")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }

  if (
    sanitizeUpper(entry.current_status, 120) !==
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.READY_FOR_MANUAL_PUBLICATION
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  if (entry.queue_status_projection !== "READY_FOR_PRODUCTION") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION
    );
  }

  if (entry.validation_fixture === true && entry.production_eligible !== false) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.P999_PRODUCTION_PUBLICATION_BLOCKED
    );
  }

  if (confirmExternalManualPublication !== true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.MANUAL_ACTION_REQUIRED
    );
  }

  const urlValidation = validatePipPublicCommunicationPublicationUrl(publicationUrl);
  const timestampValidation = validatePipPublicCommunicationPublicationTimestamp({
    timestamp: publicationTimestamp,
    recordedAt,
    createdAt: entry.created_at,
  });

  reasons.push(...urlValidation.errors);
  reasons.push(...timestampValidation.errors);

  return {
    valid: reasons.length === 0,
    permitted: reasons.length === 0,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RECORD_EXTERNAL_MANUAL_PUBLICATION,
    from_status: entry.current_status,
    to_status:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED,
    normalized_publication_url: urlValidation.normalized,
    normalized_publication_timestamp: timestampValidation.normalized,
    block_reasons: uniq(reasons),
    required_dependency: "EXTERNAL_MANUAL_PUBLICATION_CONFIRMATION",
  };
}

export function recordPipPublicCommunicationExternalManualPublication({
  registerEntry,
  actorRole,
  actorAlias,
  publicationUrl,
  publicationTimestamp,
  recordedAt,
  confirmExternalManualPublication = false,
  recordNote = "",
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const evaluation = evaluatePipPublicCommunicationManualPublicationRecord({
    registerEntry: entry,
    actorRole,
    actorAlias,
    publicationUrl,
    publicationTimestamp,
    recordedAt,
    confirmExternalManualPublication,
  });

  if (!evaluation.permitted) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation,
      record: null,
    };
  }

  const updated = validatePipPublicCommunicationPublicationRegisterEntry({
    ...entry,
    previous_status: entry.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
      ) + 1,
    publication_url: evaluation.normalized_publication_url,
    publication_timestamp: evaluation.normalized_publication_timestamp,
    publication_recorded_at: normalizeIso(recordedAt) ?? new Date().toISOString(),
    publication_recorded_by_role: sanitizeUpper(actorRole, 80),
    publication_recorded_by_alias: sanitizeText(actorAlias, 32),
    external_manual_publication: true,
    queue_status_projection: "READY_FOR_PRODUCTION",
    updated_at: new Date().toISOString(),
  }).normalized;

  const record = {
    schema: "pip.public-communication.publication-register.manual-publication-record.v1",
    receipt_id: `PPR-REC-${updated.register_entry_id}-${updated.history_count + 1}`,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RECORD_EXTERNAL_MANUAL_PUBLICATION,
    from_status: entry.current_status,
    to_status: updated.current_status,
    actor_role: sanitizeUpper(actorRole, 80),
    actor_alias: sanitizeText(actorAlias, 32),
    note:
      sanitizeText(recordNote, 360) ||
      "PUBLICATION WAS PERFORMED OUTSIDE PIP.",
    created_at: updated.publication_recorded_at,
    safety_note:
      "PIP RECORDS AND VERIFIES PUBLICATION - PIP DOES NOT PUBLISH.",
  };

  const withHistory = validatePipPublicCommunicationPublicationRegisterEntry({
    ...updated,
    register_history: [...updated.register_history, record],
    history_count: updated.history_count + 1,
  }).normalized;

  return {
    applied: true,
    updated_entry: withHistory,
    evaluation,
    record,
  };
}

export function evaluatePipPublicCommunicationPublicationVerification({
  registerEntry,
  actorRole,
  actorAlias,
  verificationNote,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const _request = validatePipPublicCommunicationPublicationVerificationRequest({
    schema: "pip.public-communication.publication-register.verification-request.v1",
    register_entry_id: entry.register_entry_id,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VERIFY_PUBLICATION_RECORD,
    actor_role: actorRole,
    actor_alias: actorAlias,
    review_note: verificationNote,
  }).normalized;

  const reasons = [];

  if (sanitizeUpper(actorRole, 80) !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }

  if (!toAliasPattern(actorAlias, "VER")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }

  if (!sanitizeText(verificationNote, 360)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_VERIFICATION_NOTE_REQUIRED
    );
  }

  if (
    sanitizeUpper(entry.current_status, 120) !==
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_RECORD_NOT_RECORDED
    );
  }

  if (
    sanitizeText(actorAlias, 32) ===
    sanitizeText(entry.publication_recorded_by_alias, 32)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SAME_ACTOR_CANNOT_RECORD_AND_VERIFY
    );
  }

  return {
    valid: reasons.length === 0,
    permitted: reasons.length === 0,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VERIFY_PUBLICATION_RECORD,
    from_status: entry.current_status,
    to_status: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED,
    block_reasons: uniq(reasons),
    required_dependency: "INDEPENDENT_ADMINISTRATOR_VERIFICATION",
  };
}

export function verifyPipPublicCommunicationPublicationRecord({
  registerEntry,
  actorRole,
  actorAlias,
  verificationNote,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const evaluation = evaluatePipPublicCommunicationPublicationVerification({
    registerEntry: entry,
    actorRole,
    actorAlias,
    verificationNote,
  });

  if (!evaluation.permitted) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation,
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationPublicationRegisterEntry({
    ...entry,
    previous_status: entry.current_status,
    current_status: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED,
    status_sequence:
      statusIndex(PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED) +
      1,
    publication_verified: true,
    publication_verified_at: new Date().toISOString(),
    publication_verified_by_role: sanitizeUpper(actorRole, 80),
    publication_verified_by_alias: sanitizeText(actorAlias, 32),
    publication_verification_note: sanitizeText(verificationNote, 360),
    queue_status_projection: "PUBLISHED",
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = {
    schema: "pip.public-communication.publication-register.verification-receipt.v1",
    receipt_id: `PPR-VER-${updated.register_entry_id}-${updated.history_count + 1}`,
    action:
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VERIFY_PUBLICATION_RECORD,
    from_status: entry.current_status,
    to_status: updated.current_status,
    actor_role: sanitizeUpper(actorRole, 80),
    actor_alias: sanitizeText(actorAlias, 32),
    note: sanitizeText(verificationNote, 360),
    created_at: updated.publication_verified_at,
    safety_note:
      "PUBLISHED STATUS RECORDED FROM VERIFIED EXTERNAL MANUAL PUBLICATION; PIP PLATFORM OPERATION PERFORMED: NO.",
  };

  const withHistory = validatePipPublicCommunicationPublicationRegisterEntry({
    ...updated,
    register_history: [...updated.register_history, receipt],
    history_count: updated.history_count + 1,
  }).normalized;

  return {
    applied: true,
    updated_entry: withHistory,
    evaluation,
    receipt,
  };
}

export function projectPipPublicCommunicationQueueItemFromVerifiedPublication({
  queueItem,
  registerEntry,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const safeQueue = isPlainObject(queueItem) ? queueItem : {};

  if (
    sanitizeUpper(entry.current_status, 120) !==
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED ||
    entry.publication_verified !== true ||
    entry.external_manual_publication !== true ||
    sanitizeText(entry.source_queue_item_id, 160) !==
      sanitizeText(safeQueue.queue_item_id, 160)
  ) {
    return {
      valid: false,
      projected_queue_item: safeQueue,
      block_reasons: [
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLISHED_STATUS_REQUIRES_VERIFIED_REGISTER_ENTRY,
      ],
    };
  }

  if (
    sanitizeText(entry.source_queue_fingerprint, 160) &&
    sanitizeText(safeQueue.source_fingerprint, 160) &&
    sanitizeText(entry.source_queue_fingerprint, 160) !==
      sanitizeText(safeQueue.source_fingerprint, 160)
  ) {
    return {
      valid: false,
      projected_queue_item: safeQueue,
      block_reasons: [
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.SOURCE_QUEUE_ITEM_MUTATION_DETECTED,
      ],
    };
  }

  const projected = {
    ...safeQueue,
    previous_status: "READY_FOR_PRODUCTION",
    current_status: "PUBLISHED",
    status_sequence: queueStatusIndex("PUBLISHED") + 1,
    transition_count: Number(safeQueue.transition_count ?? 0) + 1,
    transition_history: [
      ...toArray(safeQueue.transition_history),
      {
        transition_id: `PQI-LINK-${sanitizeText(safeQueue.queue_item_id, 80)}-${
          Number(safeQueue.transition_count ?? 0) + 1
        }`,
        action: "PUBLICATION_REGISTER_LINKAGE",
        from_status: "READY_FOR_PRODUCTION",
        to_status: "PUBLISHED",
        note:
          "PUBLISHED STATUS RECORDED FROM VERIFIED EXTERNAL MANUAL PUBLICATION; PIP PLATFORM OPERATION PERFORMED: NO.",
        transitioned_at: new Date().toISOString(),
        manual_transition: true,
      },
    ],
    publication_registered: true,
    publication_ready: true,
    automated_publication_allowed: false,
  };

  return {
    valid: true,
    projected_queue_item: projected,
    block_reasons: [],
  };
}

export function returnPipPublicCommunicationPublicationRegisterEntryForCorrection({
  registerEntry,
  actorRole,
  actorAlias,
  correctionNote,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;
  const role = sanitizeUpper(actorRole, 80);

  if (!["ANALYST", "ADMINISTRATOR"].includes(role)) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation: createBlockedEvaluation({
        action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RETURN_FOR_CORRECTION,
        currentStatus: entry.current_status,
        targetStatus: entry.current_status,
        reasons: [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED,
        ],
      }),
      receipt: null,
    };
  }

  if (!sanitizeText(correctionNote, 360)) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation: createBlockedEvaluation({
        action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RETURN_FOR_CORRECTION,
        currentStatus: entry.current_status,
        targetStatus: entry.current_status,
        reasons: [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_VERIFICATION_NOTE_REQUIRED,
        ],
      }),
      receipt: null,
    };
  }

  const current = sanitizeUpper(entry.current_status, 120);
  if (current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation: createBlockedEvaluation({
        action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RETURN_FOR_CORRECTION,
        currentStatus: current,
        targetStatus: current,
        reasons: [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.INVALID_CURRENT_STATUS,
        ],
      }),
      receipt: null,
    };
  }

  const target =
    current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
      ? PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.READY_FOR_MANUAL_PUBLICATION
      : PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.REGISTERED;

  const updated = validatePipPublicCommunicationPublicationRegisterEntry({
    ...entry,
    previous_status: current,
    current_status: target,
    status_sequence: statusIndex(target) + 1,
    publication_url:
      current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
        ? ""
        : entry.publication_url,
    publication_timestamp:
      current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
        ? ""
        : entry.publication_timestamp,
    publication_recorded_at:
      current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
        ? ""
        : entry.publication_recorded_at,
    publication_recorded_by_role:
      current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
        ? ""
        : entry.publication_recorded_by_role,
    publication_recorded_by_alias:
      current === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.PUBLICATION_RECORDED
        ? ""
        : entry.publication_recorded_by_alias,
    publication_verified: false,
    publication_verified_at: "",
    publication_verified_by_role: "",
    publication_verified_by_alias: "",
    publication_verification_note: "",
    external_manual_publication: false,
    queue_status_projection: "READY_FOR_PRODUCTION",
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = {
    schema: "pip.public-communication.publication-register.planning-receipt.v1",
    receipt_id: `PPR-COR-${updated.register_entry_id}-${updated.history_count + 1}`,
    action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RETURN_FOR_CORRECTION,
    from_status: current,
    to_status: target,
    actor_role: role,
    actor_alias: sanitizeText(actorAlias, 32),
    note: sanitizeText(correctionNote, 360),
    created_at: new Date().toISOString(),
  };

  const withHistory = validatePipPublicCommunicationPublicationRegisterEntry({
    ...updated,
    register_history: [...updated.register_history, receipt],
    history_count: updated.history_count + 1,
  }).normalized;

  return {
    applied: true,
    updated_entry: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.RETURN_FOR_CORRECTION,
      from_status: current,
      to_status: target,
      block_reasons: [],
      required_dependency: "CORRECTION_NOTE",
    },
    receipt,
  };
}

export function voidPipPublicCommunicationPublicationRegisterEntry({
  registerEntry,
  actorRole,
  actorAlias,
  voidReason,
} = {}) {
  const entry = validatePipPublicCommunicationPublicationRegisterEntry(registerEntry).normalized;

  if (sanitizeUpper(actorRole, 80) !== "ADMINISTRATOR") {
    return {
      applied: false,
      updated_entry: entry,
      evaluation: createBlockedEvaluation({
        action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VOID_REGISTER_ENTRY,
        currentStatus: entry.current_status,
        targetStatus: entry.current_status,
        reasons: [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED,
        ],
      }),
      receipt: null,
    };
  }

  if (
    sanitizeUpper(entry.current_status, 120) ===
    PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VERIFIED
  ) {
    return {
      applied: false,
      updated_entry: entry,
      evaluation: createBlockedEvaluation({
        action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VOID_REGISTER_ENTRY,
        currentStatus: entry.current_status,
        targetStatus: entry.current_status,
        reasons: [
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.PUBLICATION_RECORD_NOT_VERIFIED,
        ],
      }),
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationPublicationRegisterEntry({
    ...entry,
    previous_status: entry.current_status,
    current_status: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VOIDED,
    status_sequence:
      statusIndex(PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VOIDED) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = {
    schema: "pip.public-communication.publication-register.planning-receipt.v1",
    receipt_id: `PPR-VOID-${updated.register_entry_id}-${updated.history_count + 1}`,
    action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VOID_REGISTER_ENTRY,
    from_status: entry.current_status,
    to_status: updated.current_status,
    actor_role: "ADMINISTRATOR",
    actor_alias: sanitizeText(actorAlias, 32),
    note: sanitizeText(voidReason, 360) || "Entry voided.",
    created_at: new Date().toISOString(),
  };

  const withHistory = validatePipPublicCommunicationPublicationRegisterEntry({
    ...updated,
    register_history: [...updated.register_history, receipt],
    history_count: updated.history_count + 1,
  }).normalized;

  return {
    applied: true,
    updated_entry: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.VOID_REGISTER_ENTRY,
      from_status: entry.current_status,
      to_status: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES.VOIDED,
      block_reasons: [],
      required_dependency: "VOID_REASON",
    },
    receipt,
  };
}

export function buildPipPublicCommunicationPublicationRegisterValidationFixture() {
  const now = "2027-01-01T00:00:00.000Z";

  const makeFixtureQueue = (idx, status = "READY_FOR_PRODUCTION") => ({
    queue_item_id: `PQI-FX64B-${idx}`,
    source_content_package_id: `PCP-FX64B-${idx}`,
    source_draft_id: `PCD-FX64B-${idx}`,
    source_recommendation_package_id: `PRP-FX64B-${idx}`,
    response_case_id: `RC-FX64B-${idx}`,
    source_issue_id: `ISSUE-FX64B-${idx}`,
    issue_label: `Fixture issue ${idx}`,
    geography_scope: "TEST/P999",
    content_format: "FACEBOOK_POST",
    draft_label: "DRAFT - HUMAN REVIEW REQUIRED",
    current_status: status,
    source_fingerprint: stableHash({ idx, status }),
    evidence_review: { completed: true },
    editorial_review: { completed: true },
    approval: { approved: true },
    approval_level: "SENIOR_APPROVAL",
    verified_fact_ids: [`FACT-${idx}`],
    evidence_ids: [`EVID-${idx}`],
    wording_risk_codes: ["FIXTURE"],
    uncertainty_note: "Fixture",
    validation_fixture: true,
    production_eligible: false,
    automated_publication_allowed: false,
    publication_ready: true,
    transition_count: 0,
    transition_history: [],
  });

  const fixtureQueueItems = Array.from({ length: 8 }, (_, index) =>
    makeFixtureQueue(String(index + 1))
  );

  const queueCollection = {
    production_queue_items: [],
    fixture_queue_items: fixtureQueueItems,
    blocked_transition_evaluations: [],
    successful_transition_count: 0,
  };

  let collection = buildPipPublicCommunicationPublicationRegisterCollection({
    queueCollection,
    includeValidationFixtures: true,
  });

  const entry0 = collection.fixture_register_entries[0];
  const planning = applyPipPublicCommunicationPublicationPlanningUpdate({
    registerEntry: entry0,
    actorRole: "ANALYST",
    actorAlias: "OWN-64B00001",
    update: {
      responsible_owner_role: "COMMUNICATIONS_OFFICER",
      responsible_owner_alias: "OWN-64B00001",
      publication_platform: "FACEBOOK",
      public_channel_label: "fixture-public-channel",
      due_date: now,
      asset_requirements: [
        {
          asset_type: "COPY",
          required: true,
          status: "READY",
          description: "ready",
          owner_role: "COMMUNICATIONS_OFFICER",
          due_date: now,
        },
      ],
      approval_reference: "APP-FX-64B",
      mark_ready: true,
    },
  });

  const recorded = recordPipPublicCommunicationExternalManualPublication({
    registerEntry: planning.updated_entry,
    actorRole: "ADMINISTRATOR",
    actorAlias: "REC-64B00001",
    publicationUrl: "https://example.invalid/public/post/64b",
    publicationTimestamp: now,
    recordedAt: now,
    confirmExternalManualPublication: true,
  });

  const verified = verifyPipPublicCommunicationPublicationRecord({
    registerEntry: recorded.updated_entry,
    actorRole: "ADMINISTRATOR",
    actorAlias: "VER-64B00002",
    verificationNote: "Manual review completed.",
  });

  const projected = projectPipPublicCommunicationQueueItemFromVerifiedPublication({
    queueItem: fixtureQueueItems[0],
    registerEntry: verified.updated_entry,
  });

  const sameAliasReject = verifyPipPublicCommunicationPublicationRecord({
    registerEntry: recorded.updated_entry,
    actorRole: "ADMINISTRATOR",
    actorAlias: "REC-64B00001",
    verificationNote: "should fail",
  });

  const analystRecordReject = recordPipPublicCommunicationExternalManualPublication({
    registerEntry: planning.updated_entry,
    actorRole: "ANALYST",
    actorAlias: "REC-64B00009",
    publicationUrl: "https://example.invalid/public/post/analyst",
    publicationTimestamp: now,
    recordedAt: now,
    confirmExternalManualPublication: true,
  });

  const httpReject = validatePipPublicCommunicationPublicationUrl(
    "http://example.invalid/public/post"
  );
  const credReject = validatePipPublicCommunicationPublicationUrl(
    "https://user:pass@example.invalid/private"
  );
  const secretReject = validatePipPublicCommunicationPublicationUrl(
    "https://example.invalid/public/post?access_token=abc"
  );
  const invalidTsReject = validatePipPublicCommunicationPublicationTimestamp({
    timestamp: "invalid",
    recordedAt: now,
  });
  const futureTsReject = validatePipPublicCommunicationPublicationTimestamp({
    timestamp: "2035-01-01T00:00:00.000Z",
    recordedAt: now,
  });

  const archiveReject = createBlockedEvaluation({
    action: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_ACTIONS.ARCHIVE_PUBLICATION,
    currentStatus: "VERIFIED",
    targetStatus: "ARCHIVED",
    reasons: [
      PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ARCHIVE_DISABLED_IN_BATCH_64B,
    ],
    requiredDependency: "BATCH_64C_MANUAL_PUBLISHING_BOUNDARY",
  });

  const fixtureEntries = [...collection.fixture_register_entries];
  fixtureEntries[0] = verified.updated_entry;

  const voided = voidPipPublicCommunicationPublicationRegisterEntry({
    registerEntry: fixtureEntries[2],
    actorRole: "ADMINISTRATOR",
    actorAlias: "VER-64B00005",
    voidReason: "Fixture void",
  });
  fixtureEntries[2] = voided.updated_entry;

  const corrected = returnPipPublicCommunicationPublicationRegisterEntryForCorrection({
    registerEntry: fixtureEntries[1],
    actorRole: "ANALYST",
    actorAlias: "OWN-64B00003",
    correctionNote: "Fixture correction",
  });
  fixtureEntries[1] = corrected.updated_entry;

  collection = validatePipPublicCommunicationPublicationRegisterCollection({
    ...collection,
    fixture_register_entries: fixtureEntries,
    blocked_evaluations: [
      archiveReject,
      sameAliasReject.evaluation,
      analystRecordReject.evaluation,
    ],
    successful_actions: 5,
    summary: buildPipPublicCommunicationPublicationRegisterSummary({
      productionRegisterEntries: collection.production_register_entries,
      fixtureRegisterEntries: fixtureEntries,
      excludedQueueItems: collection.excluded_queue_items,
      blockedEvaluations: [
        archiveReject,
        sameAliasReject.evaluation,
        analystRecordReject.evaluation,
      ],
      successfulActions: 5,
      projectedProductionPublished: 0,
      projectedFixturePublished: projected.valid ? 1 : 0,
      sourceProductionQueueItems: 0,
      readyForProductionSourceItems: 0,
    }),
  }).normalized;

  const exportPayload = sanitizePipPublicCommunicationPublicationRegisterExport({
    schema: PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_EXPORT_SCHEMA,
    generated_at: collection.generated_at,
    register_summary: collection.summary,
    production_register_entries: collection.production_register_entries,
    fixture_register_entries: collection.fixture_register_entries,
    excluded_queue_item_summary: {
      count: collection.excluded_queue_items.length,
    },
    sanitized_planning_receipts: planning.receipt ? [planning.receipt] : [],
    sanitized_publication_records: recorded.record ? [recorded.record] : [],
    sanitized_verification_receipts: verified.receipt ? [verified.receipt] : [],
    projected_queue_statuses: projected.valid
      ? [
          {
            queue_item_id: projected.projected_queue_item.queue_item_id,
            previous_status: projected.projected_queue_item.previous_status,
            current_status: projected.projected_queue_item.current_status,
            projected_from_register_entry: verified.updated_entry.register_entry_id,
          },
        ]
      : [],
    blocked_evaluations: collection.blocked_evaluations,
    collection_validation_result: collection.validation,
    safety_manifest: collection.safety,
  });

  return {
    collection,
    checks: {
      eight_fixture_queue_items: fixtureQueueItems.length === 8,
      register_statuses_present: Object.values(
        PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_STATUSES
      ).every((status) =>
        collection.fixture_register_entries.some(
          (entry) => sanitizeUpper(entry.current_status, 120) === status
        )
      ),
      sequential_flow_verified:
        planning.applied === true &&
        recorded.applied === true &&
        verified.applied === true,
      projected_fixture_published: projected.valid === true,
      missing_publication_url_rejection:
        recordPipPublicCommunicationExternalManualPublication({
          registerEntry: planning.updated_entry,
          actorRole: "ADMINISTRATOR",
          actorAlias: "REC-64B00999",
          publicationUrl: "",
          publicationTimestamp: now,
          recordedAt: now,
          confirmExternalManualPublication: true,
        }).applied === false,
      http_url_rejection: httpReject.valid === false,
      credential_url_rejection: credReject.valid === false,
      secret_param_rejection: secretReject.valid === false,
      invalid_timestamp_rejection: invalidTsReject.valid === false,
      future_timestamp_rejection: futureTsReject.valid === false,
      analyst_recording_rejection: analystRecordReject.applied === false,
      same_alias_rejection: sameAliasReject.applied === false,
      administrator_recording_success: recorded.applied === true,
      independent_verification_success: verified.applied === true,
      archive_rejection:
        archiveReject.block_reasons.includes(
          PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_BLOCK_REASONS.ARCHIVE_DISABLED_IN_BATCH_64B
        ),
      export_schema_valid:
        exportPayload.schema === PIP_PUBLIC_COMMUNICATION_PUBLICATION_REGISTER_EXPORT_SCHEMA,
    },
    export_payload: exportPayload,
  };
}

export function serializePipPublicCommunicationPublicationRegisterExport(
  payload = {}
) {
  const sanitized = sanitizePipPublicCommunicationPublicationRegisterExport(payload);
  return JSON.stringify(sanitized, null, 2);
}

export function createPipPublicCommunicationPublicationRegisterExportFileName({
  generatedAt,
  scope = "P134",
  suffix = "publication-register",
} = {}) {
  const iso = normalizeIso(generatedAt) ?? new Date().toISOString();
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeSuffix = sanitizeText(suffix, 64).replace(/[^A-Za-z0-9_-]/g, "_");
  return `pip-public-communication-${safeSuffix}-${safeScope || "P134"}-${compact}.json`;
}

export function buildPipPublicCommunicationPublicationRegisterManifestValidationResult() {
  const manifest = buildPipPublicCommunicationPublicationRegisterContractManifest();
  return validatePipPublicCommunicationPublicationRegisterContractManifest(manifest);
}
