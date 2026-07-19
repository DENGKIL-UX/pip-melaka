import {
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_REQUEST_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_EVALUATION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_REQUEST_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_RECEIPT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_REQUEST_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_ARCHIVAL_ELIGIBILITY_REPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_REQUEST_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_REQUEST_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_EXPORT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES,
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUS_ORDER,
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS,
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS,
  buildPipPublicCommunicationManualPublishingBoundaryContractManifest,
  validatePipPublicCommunicationManualPublishingBoundaryContractManifest,
  validatePipPublicCommunicationManualHandoffPackage,
  validatePipPublicCommunicationManualHandoffCollection,
  validatePipPublicCommunicationManualHandoffPreparationRequest,
  validatePipPublicCommunicationManualHandoffPreparationEvaluation,
  validatePipPublicCommunicationManualHandoffAcknowledgementRequest,
  validatePipPublicCommunicationManualHandoffAcknowledgementReceipt,
  validatePipPublicCommunicationVerifiedPublicationLinkageRequest,
  validatePipPublicCommunicationVerifiedPublicationLinkageReceipt,
  validatePipPublicCommunicationArchivalEligibilityReport,
  validatePipPublicCommunicationArchivalReviewRequest,
  validatePipPublicCommunicationArchivalReviewReceipt,
  validatePipPublicCommunicationArchivalClosureRequest,
  validatePipPublicCommunicationArchivalClosureReceipt,
  validatePipPublicCommunicationManualPublishingBoundaryHistoryReceipt,
  sanitizePipPublicCommunicationManualPublishingBoundaryExport as sanitizeBoundaryExport,
} from "./pip-public-communication-manual-publishing-boundary-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values) {
  return Array.from(new Set(toArray(values).filter(Boolean)));
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

function statusIndex(status) {
  return PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUS_ORDER.indexOf(
    sanitizeUpper(status, 180)
  );
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

function toStableString(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return '"[CircularArray]"';
    seen.add(value);
    return `[${value.map((entry) => toStableString(entry, seen)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) return '"[CircularObject]"';
    seen.add(value);
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${toStableString(value[key], seen)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  const input = toStableString(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function aliasMatches(value, prefix) {
  return new RegExp(`^${prefix}-[A-Z0-9]{8}$`).test(sanitizeUpper(value, 32));
}

function validHttpsUrl(value) {
  const text = sanitizeText(value, 2048);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !/(token|password|secret|credential|oauth|api[_-]?key|session|auth)/i.test(
        parsed.search
      )
    );
  } catch (_error) {
    return false;
  }
}

function createReceipt({
  schema,
  action,
  fromStatus,
  toStatus,
  actorRole,
  actorAlias,
  note,
  code,
} = {}) {
  return validatePipPublicCommunicationManualPublishingBoundaryHistoryReceipt({
    schema: schema || PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA,
    receipt_id: `${code}-${Date.now()}`,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    actor_role: actorRole,
    actor_alias: actorAlias,
    note,
    created_at: new Date().toISOString(),
  }).normalized;
}

function blockedEvaluation({
  action,
  fromStatus,
  toStatus,
  reasons,
  requiredDependency = "",
} = {}) {
  return validatePipPublicCommunicationManualHandoffPreparationEvaluation({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PREPARATION_EVALUATION_SCHEMA,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    valid: false,
    permitted: false,
    block_reasons: uniq(reasons),
    required_dependency: sanitizeText(requiredDependency, 180),
    summary: {
      blocked: true,
      block_count: uniq(reasons).length,
    },
  }).normalized;
}

function approvedContentFromPackage(contentPackage = {}) {
  const drafts = toArray(contentPackage.drafts);
  const preferred = drafts.find(
    (entry) => sanitizeUpper(entry.draft_label, 120) === "DRAFT - HUMAN REVIEW REQUIRED"
  );
  const draft = preferred ?? drafts[0] ?? {};

  const sections = isPlainObject(draft.content_sections) ? draft.content_sections : {};
  const body = sanitizeText(sections.body ?? draft.body, 10000);

  return {
    approved_draft_label: sanitizeText(draft.draft_label, 100),
    approved_draft_text: body,
    approved_caption: sanitizeText(sections.caption, 3000),
    approved_alt_text: sanitizeText(sections.alt_text, 2000),
    approved_short_video_script: sanitizeText(sections.short_video_script, 6000),
    approved_faq_content: sanitizeText(sections.faq_content, 7000),
    approved_comment_response: sanitizeText(sections.comment_response, 3000),
    approved_infographic_brief: sanitizeText(sections.infographic_brief, 5000),
    approved_holding_statement: sanitizeText(sections.holding_statement, 5000),
    source_draft_id: sanitizeText(draft.draft_id, 180),
  };
}

function packageFingerprints({ contentPackage, queueItem, registerEntry }) {
  const queueFingerprint = sanitizeText(
    queueItem.source_fingerprint ?? registerEntry.source_queue_fingerprint,
    180
  );
  const contentFingerprint = sanitizeText(
    registerEntry.source_content_fingerprint,
    180
  );
  const evidenceFingerprint = sanitizeText(
    registerEntry.source_evidence_fingerprint,
    180
  );
  const registerFingerprint = stableHash({
    register_entry_id: registerEntry.register_entry_id,
    source_queue_item_id: registerEntry.source_queue_item_id,
    source_content_package_id: registerEntry.source_content_package_id,
    source_draft_id: registerEntry.source_draft_id,
    approval_reference: registerEntry.approval_reference,
  });

  return {
    queueFingerprint,
    contentFingerprint,
    evidenceFingerprint,
    registerFingerprint,
    computedContentFingerprint: stableHash({
      content_package_id: contentPackage.content_package_id,
      issue_id: contentPackage.source_issue_id,
      format: queueItem.content_format,
    }),
    computedEvidenceFingerprint: stableHash({
      evidence_ids: queueItem.evidence_ids,
      verified_fact_ids: queueItem.verified_fact_ids,
    }),
  };
}

function findById(items, key, value) {
  const target = sanitizeText(value, 180);
  return toArray(items).find((entry) => sanitizeText(entry?.[key], 180) === target) ?? null;
}

export function evaluatePipPublicCommunicationManualHandoffEligibility({
  contentPackage,
  queueItem,
  publicationRegisterEntry,
  existingCollection,
  validationFixture = false,
} = {}) {
  const content = isPlainObject(contentPackage) ? contentPackage : {};
  const queue = isPlainObject(queueItem) ? queueItem : {};
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const checks = {
    content_present: Object.keys(content).length > 0,
    queue_present: Object.keys(queue).length > 0,
    register_present: Object.keys(register).length > 0,
    content_valid: content.validation?.valid !== false,
    queue_valid: queue.validation?.valid !== false,
    register_valid: register.validation?.valid !== false,
    content_not_fixture: content.validation_fixture !== true || validationFixture === true,
    queue_not_fixture: queue.validation_fixture !== true || validationFixture === true,
    register_not_fixture:
      register.validation_fixture !== true || validationFixture === true,
    content_production_eligible:
      content.production_eligible !== false || validationFixture === true,
    queue_production_eligible:
      queue.production_eligible !== false || validationFixture === true,
    register_production_eligible:
      register.production_eligible !== false || validationFixture === true,
    queue_ready_for_production:
      sanitizeUpper(queue.current_status, 140) === "READY_FOR_PRODUCTION",
    queue_not_archived: sanitizeUpper(queue.current_status, 140) !== "ARCHIVED",
    queue_publication_ready: queue.publication_ready === true,
    queue_review_complete:
      queue.evidence_review?.completed === true &&
      queue.editorial_review?.completed === true,
    queue_approval_complete: queue.approval?.approved === true,
    queue_automation_disabled: queue.automated_publication_allowed !== true,
    register_ready:
      sanitizeUpper(register.current_status, 180) === "READY_FOR_MANUAL_PUBLICATION",
    register_not_voided:
      sanitizeUpper(register.current_status, 180) !== "VOIDED",
    register_not_verified:
      sanitizeUpper(register.current_status, 180) !== "VERIFIED",
    register_url_empty: sanitizeText(register.publication_url, 2048).length === 0,
    register_timestamp_empty:
      sanitizeText(register.publication_timestamp, 80).length === 0,
    approval_verified: register.approval_verified === true,
    evidence_ids_present: toArray(queue.evidence_ids).length > 0,
    verified_fact_ids_present: toArray(queue.verified_fact_ids).length > 0,
    evidence_lineage_valid:
      sanitizeUpper(register.evidence_package?.evidence_lineage_status, 120, "VALID") ===
      "VALID",
    no_duplicate_active_handoff: true,
    p999_production_blocked:
      validationFixture === true ||
      !sanitizeUpper(queue.geography_scope, 160).includes("P999"),
  };

  const activePackages = [
    ...toArray(existingCollection?.production_boundary_packages),
    ...toArray(existingCollection?.fixture_boundary_packages),
  ];
  checks.no_duplicate_active_handoff = !activePackages.some((entry) => {
    const sameQueue =
      sanitizeText(entry.source_queue_item_id, 180) ===
      sanitizeText(queue.queue_item_id, 180);
    const active = ![
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVED,
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY,
    ].includes(sanitizeUpper(entry.current_status, 180));
    return sameQueue && active;
  });

  const reasons = [];
  if (!checks.content_present)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_CONTENT_PACKAGE_MISSING
    );
  if (!checks.queue_present)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_ITEM_MISSING
    );
  if (!checks.register_present)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_MISSING
    );
  if (!checks.queue_ready_for_production)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION
    );
  if (!checks.queue_review_complete)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_REVIEW_INCOMPLETE
    );
  if (!checks.queue_approval_complete)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_APPROVAL_MISSING
    );
  if (!checks.queue_publication_ready)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_PUBLICATION_READY_FALSE
    );
  if (!checks.register_ready)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_READY
    );
  if (!checks.register_not_voided)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_VOIDED
    );
  if (!checks.evidence_ids_present || !checks.verified_fact_ids_present)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_EVIDENCE_MISSING
    );
  if (!checks.evidence_lineage_valid)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_EVIDENCE_LINEAGE_INVALID
    );
  if (!checks.no_duplicate_active_handoff)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.DUPLICATE_ACTIVE_HANDOFF
    );
  if (!checks.p999_production_blocked)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.P999_PRODUCTION_HANDOFF_BLOCKED
    );

  return {
    valid: reasons.length === 0,
    eligible: reasons.length === 0,
    checks,
    errors: [],
    block_reasons: uniq(reasons),
    summary: {
      passed_checks: Object.values(checks).filter(Boolean).length,
      total_checks: Object.keys(checks).length,
      block_count: uniq(reasons).length,
    },
  };
}

export function detectPipPublicCommunicationManualBoundarySourceMutation({
  handoffPackage,
  contentPackage,
  queueItem,
  publicationRegisterEntry,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const content = isPlainObject(contentPackage) ? contentPackage : {};
  const queue = isPlainObject(queueItem) ? queueItem : {};
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const fp = packageFingerprints({
    contentPackage: content,
    queueItem: queue,
    registerEntry: register,
  });

  const reasons = [];
  if (
    handoff.source_queue_fingerprint &&
    fp.queueFingerprint &&
    handoff.source_queue_fingerprint !== fp.queueFingerprint
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_MUTATION_DETECTED
    );
  }
  if (
    handoff.source_content_fingerprint &&
    fp.contentFingerprint &&
    handoff.source_content_fingerprint !== fp.contentFingerprint
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_CONTENT_PACKAGE_MUTATION_DETECTED
    );
  }
  if (
    handoff.source_evidence_fingerprint &&
    fp.evidenceFingerprint &&
    handoff.source_evidence_fingerprint !== fp.evidenceFingerprint
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_EVIDENCE_MUTATION_DETECTED
    );
  }
  if (
    handoff.source_register_fingerprint &&
    fp.registerFingerprint &&
    handoff.source_register_fingerprint !== fp.registerFingerprint
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_MUTATION_DETECTED
    );
  }

  return {
    mutated: reasons.length > 0,
    block_reasons: uniq(reasons),
  };
}

export function buildPipPublicCommunicationManualHandoffPackage({
  contentPackage,
  queueItem,
  publicationRegisterEntry,
  preparedByRole,
  preparedByAlias,
  existingCollection,
  validationFixture = false,
} = {}) {
  const content = isPlainObject(contentPackage) ? contentPackage : {};
  const queue = isPlainObject(queueItem) ? queueItem : {};
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const eligibility = evaluatePipPublicCommunicationManualHandoffEligibility({
    contentPackage: content,
    queueItem: queue,
    publicationRegisterEntry: register,
    existingCollection,
    validationFixture,
  });

  const approved = approvedContentFromPackage(content);
  const fp = packageFingerprints({
    contentPackage: content,
    queueItem: queue,
    registerEntry: register,
  });

  const status = eligibility.eligible
    ? PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY
    : PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY;

  return validatePipPublicCommunicationManualHandoffPackage({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_PACKAGE_SCHEMA,
    handoff_package_id: `PMH-${sanitizeText(queue.queue_item_id, 80)}`,
    source_queue_item_id: queue.queue_item_id,
    source_publication_register_entry_id: register.register_entry_id,
    source_content_package_id: content.content_package_id,
    source_draft_id: approved.source_draft_id || register.source_draft_id,
    source_recommendation_package_id: content.source_recommendation_package_id,
    response_case_id: queue.response_case_id,
    source_issue_id: queue.source_issue_id,
    issue_label: queue.issue_label,
    geography_scope: queue.geography_scope,
    content_format: queue.content_format,
    publication_platform: register.publication_platform,
    public_channel_label: register.public_channel_label,
    responsible_owner_role:
      register.responsible_owner_role || content.responsible_owner_role,
    responsible_owner_alias: register.responsible_owner_alias,
    approved_draft_label: approved.approved_draft_label,
    approved_draft_text: approved.approved_draft_text,
    approved_caption: approved.approved_caption,
    approved_alt_text: approved.approved_alt_text,
    approved_short_video_script: approved.approved_short_video_script,
    approved_faq_content: approved.approved_faq_content,
    approved_comment_response: approved.approved_comment_response,
    approved_infographic_brief: approved.approved_infographic_brief,
    approved_holding_statement: approved.approved_holding_statement,
    asset_requirements: register.asset_requirements,
    evidence_ids: queue.evidence_ids,
    verified_fact_ids: queue.verified_fact_ids,
    evidence_lineage_status:
      register.evidence_package?.evidence_lineage_status || "VALID",
    uncertainty_note: queue.uncertainty_note,
    wording_risks: queue.wording_risk_codes,
    approval_level: queue.approval_level,
    approval_reference: register.approval_reference,
    approval_verified: register.approval_verified === true,
    due_date: register.due_date,
    source_queue_status: queue.current_status,
    source_register_status: register.current_status,
    source_queue_fingerprint: fp.queueFingerprint,
    source_content_fingerprint: fp.contentFingerprint || fp.computedContentFingerprint,
    source_evidence_fingerprint: fp.evidenceFingerprint || fp.computedEvidenceFingerprint,
    source_register_fingerprint: fp.registerFingerprint,
    current_status: status,
    previous_status: null,
    status_sequence: 1,
    prepared_at: new Date().toISOString(),
    prepared_by_role: preparedByRole,
    prepared_by_alias: preparedByAlias,
    acknowledged: false,
    acknowledged_at: "",
    acknowledged_by_role: "",
    acknowledged_by_alias: "",
    acknowledgement_note: "",
    verified_publication_linked: false,
    verified_publication_linked_at: "",
    verified_publication_url: "",
    verified_publication_timestamp: "",
    queue_status_projection: "READY_FOR_PRODUCTION",
    archival_eligible_at: "",
    archival_review_requested: false,
    archival_review_requested_at: "",
    archival_review_requested_by_role: "",
    archival_review_requested_by_alias: "",
    archival_review_note: "",
    archival_closure_approved: false,
    archival_closure_approved_at: "",
    archival_closure_approved_by_role: "",
    archival_closure_approved_by_alias: "",
    archival_closure_note: "",
    retention_classification: "CONTENT_PRODUCTION_RECORD_RETAINED",
    outcome_monitoring_compatible: true,
    outcome_monitoring_status: "NOT_YET_EVALUATED",
    outcome_monitoring_record_id: "",
    outcome_monitoring_required: true,
    boundary_history: [],
    history_count: 0,
    validation_fixture: validationFixture === true,
    production_eligible: validationFixture !== true && eligibility.eligible,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    safety: {
      platform_operation_performed_by_pip: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      asset_upload_performed_by_pip: false,
      publication_scheduled_by_pip: false,
      publication_attempted_by_pip: false,
      publication_created_by_pip: false,
      publication_edited_by_pip: false,
      publication_deleted_by_pip: false,
      automated_publication_enabled: false,
      automated_archival_enabled: false,
      source_deletion_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  }).normalized;
}

export function buildPipPublicCommunicationManualHandoffCollection({
  contentPackageCollection,
  queueCollection,
  publicationRegisterCollection,
  includeValidationFixtures = true,
} = {}) {
  const contentCollection = isPlainObject(contentPackageCollection)
    ? contentPackageCollection
    : {};
  const queue = isPlainObject(queueCollection) ? queueCollection : {};
  const registerCollection = isPlainObject(publicationRegisterCollection)
    ? publicationRegisterCollection
    : {};

  const productionBoundaryPackages = [];
  const fixtureBoundaryPackages = [];
  const excludedSourceItems = [];
  const blockedEvaluations = [];

  toArray(queue.production_queue_items).forEach((queueItem) => {
    const content = findById(
      contentCollection.production_content_packages,
      "content_package_id",
      queueItem.source_content_package_id
    );
    const register = findById(
      registerCollection.production_register_entries,
      "source_queue_item_id",
      queueItem.queue_item_id
    );

    const handoff = buildPipPublicCommunicationManualHandoffPackage({
      contentPackage: content,
      queueItem,
      publicationRegisterEntry: register,
      preparedByRole: "ANALYST",
      preparedByAlias: "PRE-64C00001",
      existingCollection: {
        production_boundary_packages: productionBoundaryPackages,
        fixture_boundary_packages: fixtureBoundaryPackages,
      },
      validationFixture: false,
    });

    if (
      handoff.current_status ===
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY
    ) {
      productionBoundaryPackages.push(handoff);
    } else {
      blockedEvaluations.push(
        blockedEvaluation({
          action:
            PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.PREPARE_MANUAL_HANDOFF,
          fromStatus: handoff.current_status,
          toStatus: handoff.current_status,
          reasons: [
            PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.HANDOFF_PACKAGE_INCOMPLETE,
          ],
          requiredDependency: "SOURCE_READINESS",
        })
      );
      excludedSourceItems.push({
        queue_item_id: sanitizeText(queueItem.queue_item_id, 180),
        reason: "INELIGIBLE_SOURCE",
      });
    }
  });

  if (includeValidationFixtures) {
    toArray(queue.fixture_queue_items).forEach((queueItem, index) => {
      const content = findById(
        contentCollection.validation_fixture_packages,
        "content_package_id",
        queueItem.source_content_package_id
      );
      const register = findById(
        registerCollection.fixture_register_entries,
        "source_queue_item_id",
        queueItem.queue_item_id
      );

      const fixture = buildPipPublicCommunicationManualHandoffPackage({
        contentPackage: content,
        queueItem: {
          ...queueItem,
          current_status: "READY_FOR_PRODUCTION",
          publication_ready: true,
          evidence_review: { completed: true },
          editorial_review: { completed: true },
          approval: { approved: true },
        },
        publicationRegisterEntry: {
          ...register,
          current_status: "READY_FOR_MANUAL_PUBLICATION",
          validation_fixture: true,
          production_eligible: false,
          publication_url: "",
          publication_timestamp: "",
        },
        preparedByRole: "ANALYST",
        preparedByAlias: `PRE-64C${String(index + 10).padStart(5, "0")}`,
        existingCollection: {
          production_boundary_packages: productionBoundaryPackages,
          fixture_boundary_packages: fixtureBoundaryPackages,
        },
        validationFixture: true,
      });

      fixtureBoundaryPackages.push({
        ...fixture,
        validation_fixture: true,
        production_eligible: false,
      });
    });
  }

  const summary = buildPipPublicCommunicationManualHandoffSummary({
    sourceContentPackages: toArray(contentCollection.production_content_packages).length,
    sourceQueueItems: toArray(queue.production_queue_items).length,
    sourceRegisterEntries: toArray(registerCollection.production_register_entries).length,
    productionBoundaryPackages,
    fixtureBoundaryPackages,
    excludedSourceItems,
    blockedEvaluations,
    successfulBoundaryActions: 0,
    productionPublishedProjections: 0,
    productionArchivedProjections: 0,
    fixturePublishedProjections: 0,
    fixtureArchivedProjections: 0,
  });

  return validatePipPublicCommunicationManualHandoffCollection({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA,
    generated_at: new Date().toISOString(),
    summary,
    production_boundary_packages: productionBoundaryPackages,
    fixture_boundary_packages: fixtureBoundaryPackages,
    excluded_source_items: excludedSourceItems,
    blocked_evaluations: blockedEvaluations,
    successful_boundary_actions: 0,
    validation: { valid: true, errors: [] },
    safety: {
      platform_operation_performed_by_pip: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      asset_upload_performed_by_pip: false,
      publication_scheduled_by_pip: false,
      publication_attempted_by_pip: false,
      publication_created_by_pip: false,
      publication_edited_by_pip: false,
      publication_deleted_by_pip: false,
      automated_publication_enabled: false,
      automated_archival_enabled: false,
      source_deletion_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  }).normalized;
}

export function buildPipPublicCommunicationManualHandoffSummary({
  sourceContentPackages = 0,
  sourceQueueItems = 0,
  sourceRegisterEntries = 0,
  productionBoundaryPackages = [],
  fixtureBoundaryPackages = [],
  excludedSourceItems = [],
  blockedEvaluations = [],
  successfulBoundaryActions = 0,
  productionPublishedProjections = 0,
  productionArchivedProjections = 0,
  fixturePublishedProjections = 0,
  fixtureArchivedProjections = 0,
} = {}) {
  const all = [
    ...toArray(productionBoundaryPackages),
    ...toArray(fixtureBoundaryPackages),
  ];

  const statusCounts = {};
  PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUS_ORDER.forEach((status) => {
    statusCounts[status] = all.filter(
      (entry) => sanitizeUpper(entry.current_status, 180) === status
    ).length;
  });

  return {
    source_content_package_count: Number(sourceContentPackages) || 0,
    source_queue_item_count: Number(sourceQueueItems) || 0,
    source_publication_register_entry_count: Number(sourceRegisterEntries) || 0,
    handoff_eligible_production_items: toArray(productionBoundaryPackages).length,
    production_boundary_package_count: toArray(productionBoundaryPackages).length,
    fixture_boundary_package_count: toArray(fixtureBoundaryPackages).length,
    excluded_source_item_count: toArray(excludedSourceItems).length,
    status_counts: statusCounts,
    production_published_projection_count: Number(productionPublishedProjections) || 0,
    production_archived_projection_count: Number(productionArchivedProjections) || 0,
    fixture_published_projection_count: Number(fixturePublishedProjections) || 0,
    fixture_archived_projection_count: Number(fixtureArchivedProjections) || 0,
    blocked_boundary_action_count: toArray(blockedEvaluations).length,
    successful_boundary_action_count: Number(successfulBoundaryActions) || 0,
    collection_validation_status: "VALID",
  };
}

export function acknowledgePipPublicCommunicationExternalManualHandoff({
  handoffPackage,
  actorRole,
  actorAlias,
  acknowledgementNote,
  publicationRegisterEntry,
  queueItem,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;

  validatePipPublicCommunicationManualHandoffAcknowledgementRequest({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_REQUEST_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: handoff.source_queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF,
    actor_role: actorRole,
    actor_alias: actorAlias,
    note: acknowledgementNote,
  });

  const reasons = [];
  if (
    sanitizeUpper(handoff.current_status, 180) !==
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }
  if (sanitizeUpper(actorRole, 80) !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasMatches(actorAlias, "HND")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.HANDOFF_OPERATOR_ALIAS_INVALID
    );
  }
  if (!sanitizeText(acknowledgementNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.HANDOFF_ACKNOWLEDGEMENT_INVALID
    );
  }
  if (
    sanitizeText(actorAlias, 32) === sanitizeText(handoff.prepared_by_alias, 32)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.HANDOFF_PREPARER_ACKNOWLEDGER_MUST_DIFFER
    );
  }
  if (sanitizeUpper(queueItem?.current_status, 140) !== "READY_FOR_PRODUCTION") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_ITEM_NOT_READY_FOR_PRODUCTION
    );
  }
  if (
    sanitizeUpper(publicationRegisterEntry?.current_status, 180) !==
    "READY_FOR_MANUAL_PUBLICATION"
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_READY
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_handoff_package: handoff,
      evaluation: blockedEvaluation({
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF,
        fromStatus: handoff.current_status,
        toStatus: handoff.current_status,
        reasons,
        requiredDependency: "INDEPENDENT_HANDOFF_ACKNOWLEDGEMENT",
      }),
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationManualHandoffPackage({
    ...handoff,
    previous_status: handoff.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_ACKNOWLEDGED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_ACKNOWLEDGED
      ) + 1,
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledged_by_role: sanitizeUpper(actorRole, 80),
    acknowledged_by_alias: sanitizeText(actorAlias, 32),
    acknowledgement_note:
      sanitizeText(acknowledgementNote, 420) ||
      "HANDOFF RECEIVED FOR EXTERNAL MANUAL PUBLICATION",
    queue_status_projection: "READY_FOR_PRODUCTION",
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = validatePipPublicCommunicationManualHandoffAcknowledgementReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_RECEIPT_SCHEMA,
    handoff_package_id: updated.handoff_package_id,
    source_queue_item_id: updated.source_queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF,
    actor_role: sanitizeUpper(actorRole, 80),
    actor_alias: sanitizeText(actorAlias, 32),
    note:
      "PIP PLATFORM CONNECTION PERFORMED: NO | PIP PLATFORM AUTHENTICATION PERFORMED: NO | PIP PUBLICATION OPERATION PERFORMED: NO | PIP ASSET UPLOAD PERFORMED: NO | EXTERNAL HUMAN PUBLICATION REQUIRED: YES",
  }).normalized;

  const withHistory = validatePipPublicCommunicationManualHandoffPackage({
    ...updated,
    boundary_history: [
      ...toArray(updated.boundary_history),
      createReceipt({
        schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_ACKNOWLEDGEMENT_RECEIPT_SCHEMA,
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF,
        fromStatus: handoff.current_status,
        toStatus: updated.current_status,
        actorRole,
        actorAlias,
        note: sanitizeText(acknowledgementNote, 420),
        code: "HND",
      }),
    ],
    history_count: Number(updated.history_count || 0) + 1,
  }).normalized;

  return {
    applied: true,
    updated_handoff_package: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.ACKNOWLEDGE_EXTERNAL_MANUAL_HANDOFF,
      from_status: handoff.current_status,
      to_status: withHistory.current_status,
      block_reasons: [],
    },
    receipt,
  };
}

export function evaluatePipPublicCommunicationVerifiedPublicationLinkage({
  handoffPackage,
  publicationRegisterEntry,
  queueItem,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};
  const queue = isPlainObject(queueItem) ? queueItem : {};

  validatePipPublicCommunicationVerifiedPublicationLinkageRequest({
    schema: PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_REQUEST_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: handoff.source_queue_item_id,
    source_publication_register_entry_id:
      handoff.source_publication_register_entry_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.LINK_VERIFIED_EXTERNAL_PUBLICATION,
  });

  const reasons = [];

  if (
    sanitizeUpper(handoff.current_status, 180) !==
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_ACKNOWLEDGED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.HANDOFF_ACKNOWLEDGEMENT_REQUIRED
    );
  }
  if (sanitizeUpper(register.current_status, 180) !== "VERIFIED") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_VERIFIED
    );
  }
  if (register.publication_verified !== true || register.external_manual_publication !== true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.VERIFIED_PUBLICATION_LINKAGE_REQUIRED
    );
  }
  if (!validHttpsUrl(register.publication_url)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.PUBLICATION_URL_INVALID
    );
  }
  if (!normalizeIso(register.publication_timestamp)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.PUBLICATION_TIMESTAMP_INVALID
    );
  }
  if (register.platform_operation_performed_by_pip === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.PLATFORM_OPERATION_FLAG_INVALID
    );
  }
  if (
    sanitizeText(register.source_queue_item_id, 180) !==
      sanitizeText(handoff.source_queue_item_id, 180) ||
    sanitizeText(register.source_content_package_id, 180) !==
      sanitizeText(handoff.source_content_package_id, 180) ||
    sanitizeText(register.source_draft_id, 180) !==
      sanitizeText(handoff.source_draft_id, 180)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.VERIFIED_PUBLICATION_LINKAGE_INVALID
    );
  }

  const mutation = detectPipPublicCommunicationManualBoundarySourceMutation({
    handoffPackage: handoff,
    queueItem: queue,
    publicationRegisterEntry: register,
    contentPackage: {
      content_package_id: handoff.source_content_package_id,
      source_issue_id: handoff.source_issue_id,
    },
  });
  if (mutation.mutated) reasons.push(...mutation.block_reasons);

  return {
    valid: reasons.length === 0,
    permitted: reasons.length === 0,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.LINK_VERIFIED_EXTERNAL_PUBLICATION,
    from_status: handoff.current_status,
    to_status:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED,
    block_reasons: uniq(reasons),
  };
}

export function linkPipPublicCommunicationVerifiedExternalPublication({
  handoffPackage,
  publicationRegisterEntry,
  queueItem,
  actorRole = "ADMINISTRATOR",
  actorAlias = "ARC-64C00001",
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const evaluation = evaluatePipPublicCommunicationVerifiedPublicationLinkage({
    handoffPackage: handoff,
    publicationRegisterEntry,
    queueItem,
  });

  if (!evaluation.permitted) {
    return {
      applied: false,
      updated_handoff_package: handoff,
      evaluation,
      receipt: null,
    };
  }

  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const updated = validatePipPublicCommunicationManualHandoffPackage({
    ...handoff,
    previous_status: handoff.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED
      ) + 1,
    verified_publication_linked: true,
    verified_publication_linked_at: new Date().toISOString(),
    verified_publication_url: register.publication_url,
    verified_publication_timestamp: register.publication_timestamp,
    queue_status_projection: "PUBLISHED",
    archival_eligible_at: new Date(
      Date.parse(register.publication_timestamp) + 72 * 60 * 60 * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = validatePipPublicCommunicationVerifiedPublicationLinkageReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA,
    handoff_package_id: updated.handoff_package_id,
    source_queue_item_id: updated.source_queue_item_id,
    source_publication_register_entry_id:
      updated.source_publication_register_entry_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.LINK_VERIFIED_EXTERNAL_PUBLICATION,
    actor_role: sanitizeUpper(actorRole, 80),
    actor_alias: sanitizeText(actorAlias, 32),
    note:
      "PUBLISHED IS AN INTERNAL RECORD CLASSIFICATION BASED ON A VERIFIED EXTERNAL MANUAL PUBLICATION. PIP PLATFORM OPERATION PERFORMED: NO.",
  }).normalized;

  const withHistory = validatePipPublicCommunicationManualHandoffPackage({
    ...updated,
    boundary_history: [
      ...toArray(updated.boundary_history),
      createReceipt({
        schema: PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA,
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.LINK_VERIFIED_EXTERNAL_PUBLICATION,
        fromStatus: handoff.current_status,
        toStatus: updated.current_status,
        actorRole,
        actorAlias,
        note: "Verified external publication linked.",
        code: "LNK",
      }),
    ],
    history_count: Number(updated.history_count || 0) + 1,
  }).normalized;

  return {
    applied: true,
    updated_handoff_package: withHistory,
    evaluation,
    receipt,
  };
}

export function projectPipPublicCommunicationQueueItemToPublishedFromBoundary({
  queueItem,
  handoffPackage,
  publicationRegisterEntry,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const queue = isPlainObject(queueItem) ? queueItem : {};
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const reasons = [];
  if (
    sanitizeUpper(handoff.current_status, 180) !==
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED ||
    handoff.verified_publication_linked !== true ||
    sanitizeUpper(register.current_status, 180) !== "VERIFIED" ||
    register.publication_verified !== true ||
    register.external_manual_publication !== true ||
    register.platform_operation_performed_by_pip === true ||
    sanitizeUpper(queue.current_status, 140) !== "READY_FOR_PRODUCTION"
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.QUEUE_PUBLISHED_PROJECTION_REQUIRED
    );
  }

  if (
    sanitizeText(handoff.source_queue_item_id, 180) !==
      sanitizeText(queue.queue_item_id, 180) ||
    sanitizeText(handoff.source_content_package_id, 180) !==
      sanitizeText(queue.source_content_package_id, 180) ||
    sanitizeText(handoff.source_draft_id, 180) !== sanitizeText(queue.source_draft_id, 180)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.VERIFIED_PUBLICATION_LINKAGE_INVALID
    );
  }

  const mutation = detectPipPublicCommunicationManualBoundarySourceMutation({
    handoffPackage: handoff,
    queueItem: queue,
    publicationRegisterEntry: register,
    contentPackage: {
      content_package_id: handoff.source_content_package_id,
      source_issue_id: handoff.source_issue_id,
    },
  });
  if (mutation.mutated) reasons.push(...mutation.block_reasons);

  if (reasons.length > 0) {
    return {
      valid: false,
      projected_queue_item: queue,
      block_reasons: uniq(reasons),
      receipt: null,
    };
  }

  const projected = {
    ...queue,
    previous_status: "READY_FOR_PRODUCTION",
    current_status: "PUBLISHED",
    status_sequence: queueStatusIndex("PUBLISHED") + 1,
    transition_count: Number(queue.transition_count ?? 0) + 1,
    transition_history: [
      ...toArray(queue.transition_history),
      {
        transition_id: `B64C-PUB-${sanitizeText(queue.queue_item_id, 80)}-${
          Number(queue.transition_count ?? 0) + 1
        }`,
        action: "BOUNDARY_VERIFIED_PUBLICATION_LINKAGE",
        from_status: "READY_FOR_PRODUCTION",
        to_status: "PUBLISHED",
        note:
          "PUBLISHED IS AN INTERNAL RECORD CLASSIFICATION BASED ON A VERIFIED EXTERNAL MANUAL PUBLICATION. PIP PLATFORM OPERATION PERFORMED: NO.",
        transitioned_at: new Date().toISOString(),
        manual_transition: true,
      },
    ],
    publication_registered: true,
    publication_ready: true,
    automated_publication_allowed: false,
  };

  const receipt = validatePipPublicCommunicationVerifiedPublicationLinkageReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_VERIFIED_PUBLICATION_LINKAGE_RECEIPT_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: queue.queue_item_id,
    source_publication_register_entry_id: handoff.source_publication_register_entry_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.LINK_VERIFIED_EXTERNAL_PUBLICATION,
    actor_role: "ADMINISTRATOR",
    actor_alias: "ARC-64C00011",
    note:
      "PUBLISHED IS AN INTERNAL RECORD CLASSIFICATION BASED ON A VERIFIED EXTERNAL MANUAL PUBLICATION. PIP PLATFORM OPERATION PERFORMED: NO.",
  }).normalized;

  return {
    valid: true,
    projected_queue_item: projected,
    block_reasons: [],
    receipt,
  };
}

export function evaluatePipPublicCommunicationArchivalEligibility({
  handoffPackage,
  publicationRegisterEntry,
  evaluationTimestamp,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const nowIso = normalizeIso(evaluationTimestamp) ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const publishedIso = normalizeIso(
    handoff.verified_publication_timestamp || register.publication_timestamp
  );
  const publishedMs = Date.parse(String(publishedIso ?? ""));

  const eligibilityAt = Number.isFinite(publishedMs)
    ? new Date(publishedMs + 72 * 60 * 60 * 1000).toISOString()
    : "";
  const eligibleMs = Date.parse(String(eligibilityAt || ""));

  const elapsedHours =
    Number.isFinite(publishedMs) && Number.isFinite(nowMs)
      ? Math.max(0, (nowMs - publishedMs) / (60 * 60 * 1000))
      : 0;
  const remainingHours =
    Number.isFinite(eligibleMs) && Number.isFinite(nowMs)
      ? Math.max(0, (eligibleMs - nowMs) / (60 * 60 * 1000))
      : 72;

  const checks = {
    boundary_verified: [
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED,
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVAL_REVIEW_REQUIRED,
    ].includes(sanitizeUpper(handoff.current_status, 180)),
    queue_projection_published:
      sanitizeUpper(handoff.queue_status_projection, 180) === "PUBLISHED",
    register_verified: sanitizeUpper(register.current_status, 180) === "VERIFIED",
    publication_url_valid: validHttpsUrl(handoff.verified_publication_url || register.publication_url),
    publication_timestamp_valid: Number.isFinite(publishedMs),
    archival_window_elapsed: remainingHours <= 0,
    unresolved_correction_absent: true,
    unresolved_void_absent: true,
  };

  const reasons = [];
  if (!checks.boundary_verified)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  if (!checks.queue_projection_published)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.QUEUE_PUBLISHED_PROJECTION_REQUIRED
    );
  if (!checks.register_verified)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_VERIFIED
    );
  if (!checks.publication_url_valid)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.PUBLICATION_URL_INVALID
    );
  if (!checks.publication_timestamp_valid)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.PUBLICATION_TIMESTAMP_INVALID
    );
  if (!checks.archival_window_elapsed)
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_WINDOW_NOT_ELAPSED
    );

  const report = validatePipPublicCommunicationArchivalEligibilityReport({
    schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_ELIGIBILITY_REPORT_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: handoff.source_queue_item_id,
    source_publication_register_entry_id:
      handoff.source_publication_register_entry_id,
    checks,
    errors: [],
    block_reasons: uniq(reasons),
    archival_eligible_at: eligibilityAt,
    elapsed_hours: Number(elapsedHours.toFixed(2)),
    remaining_hours: Number(remainingHours.toFixed(2)),
    summary: {
      eligible: reasons.length === 0,
      manual_review_required: true,
      minimum_hours: 72,
    },
  }).normalized;

  return {
    valid: reasons.length === 0,
    eligible: reasons.length === 0,
    checks,
    errors: [],
    block_reasons: uniq(reasons),
    archival_eligible_at: eligibilityAt,
    elapsed_hours: Number(elapsedHours.toFixed(2)),
    remaining_hours: Number(remainingHours.toFixed(2)),
    summary: report.summary,
  };
}

export function requestPipPublicCommunicationArchivalReview({
  handoffPackage,
  publicationRegisterEntry,
  evaluationTimestamp,
  actorRole,
  actorAlias,
  reviewNote,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;

  validatePipPublicCommunicationArchivalReviewRequest({
    schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_REQUEST_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: handoff.source_queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.REQUEST_ARCHIVAL_REVIEW,
    actor_role: actorRole,
    actor_alias: actorAlias,
    note: reviewNote,
  });

  const role = sanitizeUpper(actorRole, 80);
  const reasons = [];
  if (!aliasMatches(actorAlias, "ARC")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ACTOR_ALIAS_INVALID
    );
  }
  if (!["ANALYST", "ADMINISTRATOR"].includes(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!sanitizeText(reviewNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_REVIEW_NOTE_REQUIRED
    );
  }

  const eligibility = evaluatePipPublicCommunicationArchivalEligibility({
    handoffPackage: handoff,
    publicationRegisterEntry,
    evaluationTimestamp,
  });
  if (!eligibility.eligible) reasons.push(...eligibility.block_reasons);

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_handoff_package: handoff,
      evaluation: blockedEvaluation({
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.REQUEST_ARCHIVAL_REVIEW,
        fromStatus: handoff.current_status,
        toStatus: handoff.current_status,
        reasons,
        requiredDependency: "MINIMUM_72_HOUR_WINDOW",
      }),
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationManualHandoffPackage({
    ...handoff,
    previous_status: handoff.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVAL_REVIEW_REQUIRED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVAL_REVIEW_REQUIRED
      ) + 1,
    archival_review_requested: true,
    archival_review_requested_at: new Date().toISOString(),
    archival_review_requested_by_role: role,
    archival_review_requested_by_alias: sanitizeText(actorAlias, 32),
    archival_review_note: sanitizeText(reviewNote, 420),
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = validatePipPublicCommunicationArchivalReviewReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA,
    handoff_package_id: updated.handoff_package_id,
    source_queue_item_id: updated.source_queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.REQUEST_ARCHIVAL_REVIEW,
    actor_role: role,
    actor_alias: sanitizeText(actorAlias, 32),
    note: sanitizeText(reviewNote, 420),
  }).normalized;

  const withHistory = validatePipPublicCommunicationManualHandoffPackage({
    ...updated,
    boundary_history: [
      ...toArray(updated.boundary_history),
      createReceipt({
        schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA,
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.REQUEST_ARCHIVAL_REVIEW,
        fromStatus: handoff.current_status,
        toStatus: updated.current_status,
        actorRole,
        actorAlias,
        note: sanitizeText(reviewNote, 420),
        code: "ARQ",
      }),
    ],
    history_count: Number(updated.history_count || 0) + 1,
  }).normalized;

  return {
    applied: true,
    updated_handoff_package: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.REQUEST_ARCHIVAL_REVIEW,
      from_status: handoff.current_status,
      to_status: withHistory.current_status,
      block_reasons: [],
    },
    receipt,
  };
}

export function returnPipPublicCommunicationArchivalReview({
  handoffPackage,
  actorRole,
  actorAlias,
  correctionNote,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const reasons = [];

  if (!["ANALYST", "ADMINISTRATOR"].includes(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!sanitizeText(correctionNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_REVIEW_NOTE_REQUIRED
    );
  }
  if (
    sanitizeUpper(handoff.current_status, 180) !==
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVAL_REVIEW_REQUIRED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_REVIEW_NOT_REQUESTED
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_handoff_package: handoff,
      evaluation: blockedEvaluation({
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.RETURN_ARCHIVAL_REVIEW,
        fromStatus: handoff.current_status,
        toStatus: handoff.current_status,
        reasons,
      }),
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationManualHandoffPackage({
    ...handoff,
    previous_status: handoff.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.EXTERNAL_PUBLICATION_VERIFIED
      ) + 1,
    archival_review_requested: false,
    archival_review_requested_at: "",
    archival_review_requested_by_role: "",
    archival_review_requested_by_alias: "",
    archival_review_note: "",
    updated_at: new Date().toISOString(),
  }).normalized;

  const withHistory = validatePipPublicCommunicationManualHandoffPackage({
    ...updated,
    boundary_history: [
      ...toArray(updated.boundary_history),
      createReceipt({
        schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA,
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.RETURN_ARCHIVAL_REVIEW,
        fromStatus: handoff.current_status,
        toStatus: updated.current_status,
        actorRole,
        actorAlias,
        note: sanitizeText(correctionNote, 420),
        code: "ARC",
      }),
    ],
    history_count: Number(updated.history_count || 0) + 1,
  }).normalized;

  return {
    applied: true,
    updated_handoff_package: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.RETURN_ARCHIVAL_REVIEW,
      from_status: handoff.current_status,
      to_status: withHistory.current_status,
      block_reasons: [],
    },
    receipt: validatePipPublicCommunicationArchivalReviewReceipt({
      schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_REVIEW_RECEIPT_SCHEMA,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.RETURN_ARCHIVAL_REVIEW,
      actor_role: role,
      actor_alias: sanitizeText(actorAlias, 32),
      note: sanitizeText(correctionNote, 420),
    }).normalized,
  };
}

export function approvePipPublicCommunicationArchivalClosure({
  handoffPackage,
  publicationRegisterEntry,
  evaluationTimestamp,
  actorRole,
  actorAlias,
  closureNote,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};
  const role = sanitizeUpper(actorRole, 80);
  const reasons = [];

  validatePipPublicCommunicationArchivalClosureRequest({
    schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_REQUEST_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: handoff.source_queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.APPROVE_ARCHIVAL_CLOSURE,
    actor_role: role,
    actor_alias: actorAlias,
    note: closureNote,
  });

  if (role !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasMatches(actorAlias, "ARC")) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_APPROVER_ALIAS_INVALID
    );
  }
  if (!sanitizeText(closureNote, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_REVIEW_NOTE_REQUIRED
    );
  }
  if (
    sanitizeUpper(handoff.current_status, 180) !==
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVAL_REVIEW_REQUIRED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_REVIEW_NOT_REQUESTED
    );
  }
  if (
    sanitizeText(actorAlias, 32) ===
      sanitizeText(handoff.archival_review_requested_by_alias, 32) ||
    sanitizeText(actorAlias, 32) ===
      sanitizeText(register.publication_recorded_by_alias, 32) ||
    sanitizeText(actorAlias, 32) ===
      sanitizeText(register.publication_verified_by_alias, 32)
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_APPROVER_MUST_BE_INDEPENDENT
    );
  }

  const eligibility = evaluatePipPublicCommunicationArchivalEligibility({
    handoffPackage: handoff,
    publicationRegisterEntry: register,
    evaluationTimestamp,
  });
  if (!eligibility.eligible) reasons.push(...eligibility.block_reasons);

  if (handoff.archival_closure_approved === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ARCHIVAL_CLOSURE_ALREADY_COMPLETED
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_handoff_package: handoff,
      evaluation: blockedEvaluation({
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.APPROVE_ARCHIVAL_CLOSURE,
        fromStatus: handoff.current_status,
        toStatus: handoff.current_status,
        reasons,
      }),
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationManualHandoffPackage({
    ...handoff,
    previous_status: handoff.current_status,
    current_status: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVED
      ) + 1,
    archival_closure_approved: true,
    archival_closure_approved_at: new Date().toISOString(),
    archival_closure_approved_by_role: role,
    archival_closure_approved_by_alias: sanitizeText(actorAlias, 32),
    archival_closure_note: sanitizeText(closureNote, 420),
    queue_status_projection: "ARCHIVED",
    retention_classification: "CONTENT_PRODUCTION_RECORD_RETAINED",
    outcome_monitoring_compatible: true,
    outcome_monitoring_status: "NOT_YET_EVALUATED",
    outcome_monitoring_required: true,
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = validatePipPublicCommunicationArchivalClosureReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA,
    handoff_package_id: updated.handoff_package_id,
    source_queue_item_id: updated.source_queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.APPROVE_ARCHIVAL_CLOSURE,
    actor_role: role,
    actor_alias: sanitizeText(actorAlias, 32),
    note:
      "ARCHIVED IS AN INTERNAL CONTENT-OPERATIONS CLASSIFICATION. NO PUBLIC PLATFORM CONTENT WAS DELETED, EDITED OR MOVED BY PIP.",
  }).normalized;

  const withHistory = validatePipPublicCommunicationManualHandoffPackage({
    ...updated,
    boundary_history: [
      ...toArray(updated.boundary_history),
      createReceipt({
        schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA,
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.APPROVE_ARCHIVAL_CLOSURE,
        fromStatus: handoff.current_status,
        toStatus: updated.current_status,
        actorRole,
        actorAlias,
        note: sanitizeText(closureNote, 420),
        code: "ACL",
      }),
    ],
    history_count: Number(updated.history_count || 0) + 1,
  }).normalized;

  return {
    applied: true,
    updated_handoff_package: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.APPROVE_ARCHIVAL_CLOSURE,
      from_status: handoff.current_status,
      to_status: withHistory.current_status,
      block_reasons: [],
    },
    receipt,
  };
}

export function projectPipPublicCommunicationQueueItemToArchivedFromBoundary({
  queueItem,
  handoffPackage,
  publicationRegisterEntry,
} = {}) {
  const queue = isPlainObject(queueItem) ? queueItem : {};
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const register = isPlainObject(publicationRegisterEntry)
    ? publicationRegisterEntry
    : {};

  const reasons = [];
  if (sanitizeUpper(queue.current_status, 120) !== "PUBLISHED") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_QUEUE_ITEM_NOT_PUBLISHED
    );
  }
  if (
    sanitizeUpper(handoff.current_status, 180) !==
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.ARCHIVED ||
    handoff.archival_closure_approved !== true
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }
  if (sanitizeUpper(register.current_status, 180) !== "VERIFIED") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.SOURCE_PUBLICATION_REGISTER_ENTRY_NOT_VERIFIED
    );
  }
  if (register.platform_operation_performed_by_pip === true) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.PLATFORM_OPERATION_FLAG_INVALID
    );
  }

  const mutation = detectPipPublicCommunicationManualBoundarySourceMutation({
    handoffPackage: handoff,
    queueItem: queue,
    publicationRegisterEntry: register,
    contentPackage: {
      content_package_id: handoff.source_content_package_id,
      source_issue_id: handoff.source_issue_id,
    },
  });
  if (mutation.mutated) reasons.push(...mutation.block_reasons);

  if (reasons.length > 0) {
    return {
      valid: false,
      projected_queue_item: queue,
      block_reasons: uniq(reasons),
      receipt: null,
    };
  }

  const projected = {
    ...queue,
    previous_status: "PUBLISHED",
    current_status: "ARCHIVED",
    status_sequence: queueStatusIndex("ARCHIVED") + 1,
    transition_count: Number(queue.transition_count ?? 0) + 1,
    transition_history: [
      ...toArray(queue.transition_history),
      {
        transition_id: `B64C-ARC-${sanitizeText(queue.queue_item_id, 80)}-${
          Number(queue.transition_count ?? 0) + 1
        }`,
        action: "BOUNDARY_ARCHIVAL_CLOSURE_LINKAGE",
        from_status: "PUBLISHED",
        to_status: "ARCHIVED",
        note:
          "ARCHIVED IS AN INTERNAL CONTENT-OPERATIONS CLASSIFICATION. NO PUBLIC PLATFORM CONTENT WAS DELETED, EDITED OR MOVED BY PIP.",
        transitioned_at: new Date().toISOString(),
        manual_transition: true,
      },
    ],
    publication_registered: true,
    publication_ready: true,
    automated_publication_allowed: false,
  };

  const receipt = validatePipPublicCommunicationArchivalClosureReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_ARCHIVAL_CLOSURE_RECEIPT_SCHEMA,
    handoff_package_id: handoff.handoff_package_id,
    source_queue_item_id: queue.queue_item_id,
    action:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.APPROVE_ARCHIVAL_CLOSURE,
    actor_role: sanitizeUpper(handoff.archival_closure_approved_by_role, 80),
    actor_alias: sanitizeText(handoff.archival_closure_approved_by_alias, 32),
    note:
      "ARCHIVED IS AN INTERNAL CONTENT-OPERATIONS CLASSIFICATION. NO PUBLIC PLATFORM CONTENT WAS DELETED, EDITED OR MOVED BY PIP.",
  }).normalized;

  return {
    valid: true,
    projected_queue_item: projected,
    block_reasons: [],
    receipt,
  };
}

export function voidPipPublicCommunicationUnacknowledgedHandoff({
  handoffPackage,
  actorRole,
  actorAlias,
  voidReason,
} = {}) {
  const handoff = validatePipPublicCommunicationManualHandoffPackage(handoffPackage).normalized;
  const reasons = [];

  if (sanitizeUpper(actorRole, 80) !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!sanitizeText(voidReason, 420)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.MANUAL_ACTION_REQUIRED
    );
  }
  if (
    sanitizeUpper(handoff.current_status, 180) !==
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  if (reasons.length > 0) {
    return {
      applied: false,
      updated_handoff_package: handoff,
      evaluation: blockedEvaluation({
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.VOID_UNACKNOWLEDGED_HANDOFF,
        fromStatus: handoff.current_status,
        toStatus: handoff.current_status,
        reasons,
      }),
      receipt: null,
    };
  }

  const updated = validatePipPublicCommunicationManualHandoffPackage({
    ...handoff,
    previous_status: handoff.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY
      ) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  const withHistory = validatePipPublicCommunicationManualHandoffPackage({
    ...updated,
    boundary_history: [
      ...toArray(updated.boundary_history),
      createReceipt({
        schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA,
        action:
          PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.VOID_UNACKNOWLEDGED_HANDOFF,
        fromStatus: handoff.current_status,
        toStatus: updated.current_status,
        actorRole,
        actorAlias,
        note: sanitizeText(voidReason, 420),
        code: "VOID",
      }),
    ],
    history_count: Number(updated.history_count || 0) + 1,
  }).normalized;

  return {
    applied: true,
    updated_handoff_package: withHistory,
    evaluation: {
      valid: true,
      permitted: true,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.VOID_UNACKNOWLEDGED_HANDOFF,
      from_status: handoff.current_status,
      to_status: withHistory.current_status,
      block_reasons: [],
    },
    receipt: validatePipPublicCommunicationManualPublishingBoundaryHistoryReceipt({
      schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_HISTORY_SCHEMA,
      action:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_ACTIONS.VOID_UNACKNOWLEDGED_HANDOFF,
      actor_role: sanitizeUpper(actorRole, 80),
      actor_alias: sanitizeText(actorAlias, 32),
      note: sanitizeText(voidReason, 420),
    }).normalized,
  };
}

export function buildPipPublicCommunicationManualPublishingBoundaryValidationFixture() {
  const now = Date.parse("2027-01-05T00:00:00.000Z");
  const publicationTime = new Date(now - 96 * 60 * 60 * 1000).toISOString();

  const fixtureContentPackages = Array.from({ length: 8 }, (_entry, index) => ({
    content_package_id: `PCP-64C-FX-${index + 1}`,
    source_recommendation_package_id: `PRP-64C-FX-${index + 1}`,
    source_issue_id: `ISSUE-64C-FX-${index + 1}`,
    validation_fixture: true,
    production_eligible: false,
    responsible_owner_role: "COMMUNICATIONS_OFFICER",
    drafts: [
      {
        draft_id: `PCD-64C-FX-${index + 1}`,
        draft_label: "DRAFT - HUMAN REVIEW REQUIRED",
        content_sections: {
          body: `Fixture draft ${index + 1}`,
          caption: `Fixture caption ${index + 1}`,
        },
      },
    ],
    validation: { valid: true, errors: [] },
  }));

  const fixtureQueueItems = Array.from({ length: 8 }, (_entry, index) => ({
    queue_item_id: `PQI-64C-FX-${index + 1}`,
    source_content_package_id: `PCP-64C-FX-${index + 1}`,
    source_draft_id: `PCD-64C-FX-${index + 1}`,
    source_recommendation_package_id: `PRP-64C-FX-${index + 1}`,
    response_case_id: `RC-64C-FX-${index + 1}`,
    source_issue_id: `ISSUE-64C-FX-${index + 1}`,
    issue_label: `Fixture issue ${index + 1}`,
    geography_scope: "TEST/P999",
    content_format: "FACEBOOK_POST",
    current_status: "READY_FOR_PRODUCTION",
    source_fingerprint: stableHash({ idx: index + 1 }),
    evidence_review: { completed: true },
    editorial_review: { completed: true },
    approval: { approved: true },
    publication_ready: true,
    automated_publication_allowed: false,
    evidence_ids: [`EVID-64C-FX-${index + 1}`],
    verified_fact_ids: [`FACT-64C-FX-${index + 1}`],
    wording_risk_codes: ["FIXTURE"],
    uncertainty_note: "Fixture",
    approval_level: "SENIOR_APPROVAL",
    validation_fixture: true,
    production_eligible: false,
    validation: { valid: true, errors: [] },
  }));

  const fixtureRegisterEntries = fixtureQueueItems.map((item, index) => ({
    register_entry_id: `PPR-64C-FX-${index + 1}`,
    source_queue_item_id: item.queue_item_id,
    source_content_package_id: item.source_content_package_id,
    source_draft_id: item.source_draft_id,
    source_queue_fingerprint: item.source_fingerprint,
    source_content_fingerprint: stableHash({ content: item.source_content_package_id }),
    source_evidence_fingerprint: stableHash({ evidence: item.evidence_ids }),
    current_status: "READY_FOR_MANUAL_PUBLICATION",
    publication_platform: "FACEBOOK",
    public_channel_label: "fixture channel",
    asset_requirements: [
      {
        asset_type: "COPY",
        required: true,
        status: "READY",
      },
    ],
    evidence_package: { evidence_lineage_status: "VALID" },
    approval_reference: "APP-FX-64C",
    approval_verified: true,
    publication_url: "",
    publication_timestamp: "",
    publication_verified: false,
    external_manual_publication: false,
    validation_fixture: true,
    production_eligible: false,
    validation: { valid: true, errors: [] },
  }));

  let basePackage = buildPipPublicCommunicationManualHandoffPackage({
    contentPackage: fixtureContentPackages[0],
    queueItem: fixtureQueueItems[0],
    publicationRegisterEntry: fixtureRegisterEntries[0],
    preparedByRole: "ANALYST",
    preparedByAlias: "PRE-64C00001",
    validationFixture: true,
  });

  const analystPrepareSuccess =
    basePackage.current_status ===
    PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY;

  const viewerPrepareReject = evaluatePipPublicCommunicationManualHandoffEligibility({
    contentPackage: fixtureContentPackages[0],
    queueItem: { ...fixtureQueueItems[0], current_status: "DRAFT" },
    publicationRegisterEntry: fixtureRegisterEntries[0],
    validationFixture: true,
  }).eligible === false;

  const analystAcknowledgeReject = acknowledgePipPublicCommunicationExternalManualHandoff({
    handoffPackage: basePackage,
    actorRole: "ANALYST",
    actorAlias: "HND-64C00009",
    acknowledgementNote: "fail",
    publicationRegisterEntry: fixtureRegisterEntries[0],
    queueItem: fixtureQueueItems[0],
  }).applied === false;

  const sameAliasReject = acknowledgePipPublicCommunicationExternalManualHandoff({
    handoffPackage: basePackage,
    actorRole: "ADMINISTRATOR",
    actorAlias: "PRE-64C00001",
    acknowledgementNote: "fail",
    publicationRegisterEntry: fixtureRegisterEntries[0],
    queueItem: fixtureQueueItems[0],
  }).applied === false;

  const acknowledged = acknowledgePipPublicCommunicationExternalManualHandoff({
    handoffPackage: basePackage,
    actorRole: "ADMINISTRATOR",
    actorAlias: "HND-64C00002",
    acknowledgementNote: "HANDOFF RECEIVED FOR EXTERNAL MANUAL PUBLICATION",
    publicationRegisterEntry: fixtureRegisterEntries[0],
    queueItem: fixtureQueueItems[0],
  });

  const registerVerified = {
    ...fixtureRegisterEntries[0],
    current_status: "VERIFIED",
    publication_verified: true,
    publication_url: "https://example.invalid/public/fx64c",
    publication_timestamp: publicationTime,
    external_manual_publication: true,
    platform_operation_performed_by_pip: false,
    publication_attempted_by_pip: false,
    publication_scheduled_by_pip: false,
    publication_recorded_by_alias: "REC-64B00001",
    publication_verified_by_alias: "VER-64B00002",
  };

  const unverifiedLinkReject = linkPipPublicCommunicationVerifiedExternalPublication({
    handoffPackage: acknowledged.updated_handoff_package,
    publicationRegisterEntry: fixtureRegisterEntries[0],
    queueItem: fixtureQueueItems[0],
  }).applied === false;

  const linked = linkPipPublicCommunicationVerifiedExternalPublication({
    handoffPackage: acknowledged.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
    queueItem: fixtureQueueItems[0],
  });

  const urlMismatchReject = linkPipPublicCommunicationVerifiedExternalPublication({
    handoffPackage: acknowledged.updated_handoff_package,
    publicationRegisterEntry: {
      ...registerVerified,
      publication_url: "http://example.invalid/bad",
    },
    queueItem: fixtureQueueItems[0],
  }).applied === false;

  const timestampMismatchReject = linkPipPublicCommunicationVerifiedExternalPublication({
    handoffPackage: acknowledged.updated_handoff_package,
    publicationRegisterEntry: {
      ...registerVerified,
      publication_timestamp: "invalid",
    },
    queueItem: fixtureQueueItems[0],
  }).applied === false;

  const publishedProjection = projectPipPublicCommunicationQueueItemToPublishedFromBoundary({
    queueItem: fixtureQueueItems[0],
    handoffPackage: linked.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
  });

  const before72Reject = requestPipPublicCommunicationArchivalReview({
    handoffPackage: linked.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
    evaluationTimestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
    actorRole: "ANALYST",
    actorAlias: "ARC-64C00003",
    reviewNote: "too early",
  }).applied === false;

  const reviewRequested = requestPipPublicCommunicationArchivalReview({
    handoffPackage: linked.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
    evaluationTimestamp: new Date(now).toISOString(),
    actorRole: "ANALYST",
    actorAlias: "ARC-64C00003",
    reviewNote: "Eligible archival review.",
  });

  const analystApprovalReject = approvePipPublicCommunicationArchivalClosure({
    handoffPackage: reviewRequested.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
    evaluationTimestamp: new Date(now).toISOString(),
    actorRole: "ANALYST",
    actorAlias: "ARC-64C00004",
    closureNote: "fail",
  }).applied === false;

  const sameRequesterApproverReject = approvePipPublicCommunicationArchivalClosure({
    handoffPackage: reviewRequested.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
    evaluationTimestamp: new Date(now).toISOString(),
    actorRole: "ADMINISTRATOR",
    actorAlias: "ARC-64C00003",
    closureNote: "fail",
  }).applied === false;

  const sameVerifierApproverReject = approvePipPublicCommunicationArchivalClosure({
    handoffPackage: reviewRequested.updated_handoff_package,
    publicationRegisterEntry: {
      ...registerVerified,
      publication_verified_by_alias: "ARC-64C00007",
    },
    evaluationTimestamp: new Date(now).toISOString(),
    actorRole: "ADMINISTRATOR",
    actorAlias: "ARC-64C00007",
    closureNote: "fail",
  }).applied === false;

  const approvedArchive = approvePipPublicCommunicationArchivalClosure({
    handoffPackage: reviewRequested.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
    evaluationTimestamp: new Date(now).toISOString(),
    actorRole: "ADMINISTRATOR",
    actorAlias: "ARC-64C00008",
    closureNote: "Independent archival approval.",
  });

  const archivedProjection = projectPipPublicCommunicationQueueItemToArchivedFromBoundary({
    queueItem: publishedProjection.projected_queue_item,
    handoffPackage: approvedArchive.updated_handoff_package,
    publicationRegisterEntry: registerVerified,
  });

  const returnCorrection = returnPipPublicCommunicationArchivalReview({
    handoffPackage: reviewRequested.updated_handoff_package,
    actorRole: "ANALYST",
    actorAlias: "ARC-64C00005",
    correctionNote: "Need revision",
  });

  const voidSuccess = voidPipPublicCommunicationUnacknowledgedHandoff({
    handoffPackage: basePackage,
    actorRole: "ADMINISTRATOR",
    actorAlias: "ARC-64C00006",
    voidReason: "Void pre-handoff",
  });

  const voidAcknowledgedReject = voidPipPublicCommunicationUnacknowledgedHandoff({
    handoffPackage: acknowledged.updated_handoff_package,
    actorRole: "ADMINISTRATOR",
    actorAlias: "ARC-64C00006",
    voidReason: "Cannot",
  }).applied === false;

  const p999ProductionReject =
    evaluatePipPublicCommunicationManualHandoffEligibility({
      contentPackage: fixtureContentPackages[1],
      queueItem: { ...fixtureQueueItems[1], geography_scope: "MELAKA/P999" },
      publicationRegisterEntry: fixtureRegisterEntries[1],
      validationFixture: false,
    }).eligible === false;

  const duplicateReject =
    evaluatePipPublicCommunicationManualHandoffEligibility({
      contentPackage: fixtureContentPackages[0],
      queueItem: fixtureQueueItems[0],
      publicationRegisterEntry: fixtureRegisterEntries[0],
      existingCollection: {
        production_boundary_packages: [basePackage],
        fixture_boundary_packages: [],
      },
      validationFixture: true,
    }).eligible === false;

  const statusFixtures = [
    {
      ...basePackage,
      current_status:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_NOT_READY,
    },
    {
      ...basePackage,
      current_status:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY,
    },
    acknowledged.updated_handoff_package,
    linked.updated_handoff_package,
    reviewRequested.updated_handoff_package,
    approvedArchive.updated_handoff_package,
    ...fixtureQueueItems.slice(2).map((_item, idx) => ({
      ...basePackage,
      handoff_package_id: `PMH-FX-${idx + 3}`,
      source_queue_item_id: fixtureQueueItems[idx + 2].queue_item_id,
      source_publication_register_entry_id:
        fixtureRegisterEntries[idx + 2].register_entry_id,
      source_content_package_id: fixtureContentPackages[idx + 2].content_package_id,
      source_draft_id: fixtureQueueItems[idx + 2].source_draft_id,
      current_status:
        PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES.HANDOFF_READY,
      validation_fixture: true,
      production_eligible: false,
    })),
  ].slice(0, 8);

  const collection = validatePipPublicCommunicationManualHandoffCollection({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_HANDOFF_COLLECTION_SCHEMA,
    contract_schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_CONTRACT_SCHEMA,
    generated_at: new Date(now).toISOString(),
    summary: buildPipPublicCommunicationManualHandoffSummary({
      sourceContentPackages: 0,
      sourceQueueItems: 0,
      sourceRegisterEntries: 0,
      productionBoundaryPackages: [],
      fixtureBoundaryPackages: statusFixtures,
      excludedSourceItems: [],
      blockedEvaluations: [],
      successfulBoundaryActions: 10,
      productionPublishedProjections: 0,
      productionArchivedProjections: 0,
      fixturePublishedProjections: publishedProjection.valid ? 1 : 0,
      fixtureArchivedProjections: archivedProjection.valid ? 1 : 0,
    }),
    production_boundary_packages: [],
    fixture_boundary_packages: statusFixtures,
    excluded_source_items: [],
    blocked_evaluations: [],
    successful_boundary_actions: 10,
    validation: { valid: true, errors: [] },
    safety: {
      platform_operation_performed_by_pip: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      asset_upload_performed_by_pip: false,
      publication_scheduled_by_pip: false,
      publication_attempted_by_pip: false,
      publication_created_by_pip: false,
      publication_edited_by_pip: false,
      publication_deleted_by_pip: false,
      automated_publication_enabled: false,
      automated_archival_enabled: false,
      source_deletion_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  }).normalized;

  const checks = {
    eight_fixture_content_packages: fixtureContentPackages.length === 8,
    eight_fixture_queue_items: fixtureQueueItems.length === 8,
    eight_fixture_register_entries: fixtureRegisterEntries.length === 8,
    eight_fixture_boundary_packages: statusFixtures.length === 8,
    statuses_present: Object.values(
      PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_STATUSES
    ).every((status) =>
      statusFixtures.some(
        (entry) => sanitizeUpper(entry.current_status, 180) === status
      )
    ),
    complete_flow:
      acknowledged.applied === true &&
      linked.applied === true &&
      reviewRequested.applied === true &&
      approvedArchive.applied === true,
    fixture_published_projection: publishedProjection.valid === true,
    fixture_archived_projection: archivedProjection.valid === true,
    viewer_preparation_rejection: viewerPrepareReject,
    analyst_preparation_success: analystPrepareSuccess,
    analyst_acknowledgement_rejection: analystAcknowledgeReject,
    administrator_acknowledgement_success: acknowledged.applied === true,
    same_preparer_acknowledger_rejection: sameAliasReject,
    unverified_register_linkage_rejection: unverifiedLinkReject,
    verified_register_linkage_success: linked.applied === true,
    source_mutation_rejection:
      evaluatePipPublicCommunicationVerifiedPublicationLinkage({
        handoffPackage: acknowledged.updated_handoff_package,
        publicationRegisterEntry: registerVerified,
        queueItem: {
          ...fixtureQueueItems[0],
          source_fingerprint: "MUTATED",
        },
      }).permitted === false,
    publication_url_mismatch_rejection: urlMismatchReject,
    publication_timestamp_mismatch_rejection: timestampMismatchReject,
    archival_before_72_rejection: before72Reject,
    archival_after_72_success: reviewRequested.applied === true,
    analyst_archival_approval_rejection: analystApprovalReject,
    same_requester_approver_rejection: sameRequesterApproverReject,
    same_publication_verifier_archival_approver_rejection:
      sameVerifierApproverReject,
    independent_archival_approval_success: approvedArchive.applied === true,
    return_archival_correction_success: returnCorrection.applied === true,
    void_unacknowledged_handoff_success: voidSuccess.applied === true,
    void_acknowledged_handoff_rejection: voidAcknowledgedReject,
    p999_production_handoff_rejection: p999ProductionReject,
    p999_production_archive_rejection:
      approvePipPublicCommunicationArchivalClosure({
        handoffPackage: {
          ...approvedArchive.updated_handoff_package,
          validation_fixture: true,
          production_eligible: false,
        },
        publicationRegisterEntry: registerVerified,
        evaluationTimestamp: new Date(now).toISOString(),
        actorRole: "ADMINISTRATOR",
        actorAlias: "ARC-64C00012",
        closureNote: "fx",
      }).applied === false,
    duplicate_active_handoff_rejection: duplicateReject,
  };

  const exportPayload = sanitizeBoundaryExport({
    schema: PIP_PUBLIC_COMMUNICATION_MANUAL_PUBLISHING_BOUNDARY_EXPORT_SCHEMA,
    generated_at: new Date(now).toISOString(),
    boundary_summary: collection.summary,
    production_boundary_packages: collection.production_boundary_packages,
    fixture_boundary_packages: collection.fixture_boundary_packages,
    blocked_evaluations: collection.blocked_evaluations,
    handoff_preparation_receipts: [],
    handoff_acknowledgement_receipts: [acknowledged.receipt].filter(Boolean),
    verified_publication_linkage_receipts: [linked.receipt].filter(Boolean),
    internal_published_projection_receipts: [publishedProjection.receipt].filter(Boolean),
    archival_eligibility_reports: [
      evaluatePipPublicCommunicationArchivalEligibility({
        handoffPackage: linked.updated_handoff_package,
        publicationRegisterEntry: registerVerified,
        evaluationTimestamp: new Date(now).toISOString(),
      }),
    ],
    archival_review_receipts: [reviewRequested.receipt].filter(Boolean),
    archival_closure_receipts: [approvedArchive.receipt].filter(Boolean),
    internal_archived_projection_receipts: [archivedProjection.receipt].filter(Boolean),
    collection_validation_result: collection.validation,
    safety_manifest: collection.safety,
  });

  return {
    collection,
    checks,
    export_payload: exportPayload,
    fixture_inputs: {
      content_packages: fixtureContentPackages,
      queue_items: fixtureQueueItems,
      register_entries: fixtureRegisterEntries,
    },
  };
}

export function sanitizePipPublicCommunicationManualPublishingBoundaryExport(
  payload = {}
) {
  return sanitizeBoundaryExport(payload);
}

export function serializePipPublicCommunicationManualPublishingBoundaryExport(
  payload = {}
) {
  const sanitized = sanitizePipPublicCommunicationManualPublishingBoundaryExport(payload);
  return JSON.stringify(sanitized, null, 2);
}

export function createPipPublicCommunicationManualPublishingBoundaryExportFileName({
  generatedAt,
  scope = "P134",
  suffix = "manual-publishing-boundary",
} = {}) {
  const iso = normalizeIso(generatedAt) ?? new Date().toISOString();
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeSuffix = sanitizeText(suffix, 64).replace(/[^A-Za-z0-9_-]/g, "_");
  return `pip-public-communication-${safeSuffix}-${safeScope}-${compact}.json`;
}

export function createPipPublicCommunicationManualHandoffExportFileName({
  generatedAt,
  scope = "P134",
  handoffPackageId = "PMH",
} = {}) {
  const iso = normalizeIso(generatedAt) ?? new Date().toISOString();
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeId = sanitizeText(handoffPackageId, 64).replace(/[^A-Za-z0-9_-]/g, "_");
  return `pip-public-communication-manual-handoff-${safeScope}-${safeId}-${compact}.json`;
}

export function buildPipPublicCommunicationManualPublishingBoundaryManifestValidationResult() {
  const manifest = buildPipPublicCommunicationManualPublishingBoundaryContractManifest();
  return validatePipPublicCommunicationManualPublishingBoundaryContractManifest(manifest);
}
