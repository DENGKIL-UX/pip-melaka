import {
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COLLECTION_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUS_ORDER,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_HISTORY_SCHEMA,
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_EXPORT_SCHEMA,
  buildPipPublicCommunicationOutcomeObservationContractManifest,
  validatePipPublicCommunicationOutcomeObservationContractManifest,
  validatePipPublicCommunicationOutcomeObservationCase,
  validatePipPublicCommunicationOutcomeObservationWindow,
  validatePipPublicCommunicationOutcomeObservationSnapshot,
  validatePipPublicCommunicationOutcomeObservationCreateRequest,
  validatePipPublicCommunicationOutcomeObservationSnapshotRequest,
  validatePipPublicCommunicationOutcomeObservationCompletionRequest,
  validatePipPublicCommunicationOutcomeObservationSnapshotReceipt,
  validatePipPublicCommunicationOutcomeObservationCompletionReceipt,
  validatePipPublicCommunicationOutcomeObservationHistoryReceipt,
  sanitizePipPublicCommunicationOutcomeObservationExport as sanitizeExport,
} from "./pip-public-communication-outcome-observation-contract.js";

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
  return /^OBS-[A-Z0-9]{8}$/.test(sanitizeUpper(alias, 32));
}

function statusIndex(status) {
  return PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUS_ORDER.indexOf(
    sanitizeUpper(status, 180)
  );
}

function makeHistory({ action, fromStatus, toStatus, actorRole, actorAlias, note, code }) {
  return validatePipPublicCommunicationOutcomeObservationHistoryReceipt({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_HISTORY_SCHEMA,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    actor_role: actorRole,
    actor_alias: actorAlias,
    note,
    receipt_id: `${code}-${Date.now()}`,
    requested_at: new Date().toISOString(),
  }).normalized;
}

function nextWindowType(completedWindowTypes = []) {
  return (
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER.find(
      (windowType) => !toArray(completedWindowTypes).includes(windowType)
    ) || ""
  );
}

function toMs(isoString) {
  return Date.parse(String(isoString ?? ""));
}

function getWindowUpperOffsetHours(windowType) {
  return windowType === "POST_PUBLICATION_6H"
    ? 6
    : windowType === "POST_PUBLICATION_12H"
      ? 12
      : windowType === "POST_PUBLICATION_24H"
        ? 24
        : windowType === "POST_PUBLICATION_72H"
          ? 72
          : 0;
}

function evaluateAggregateMetrics(metrics = {}) {
  const safe = isPlainObject(metrics) ? metrics : {};
  const allowedKeys = [
    "public_signal_count",
    "positive_signal_count",
    "neutral_signal_count",
    "negative_signal_count",
    "unique_public_source_count",
    "narrative_cluster_count",
    "issue_reference_count",
    "geography_coverage_count",
    "evidence_item_count",
    "public_reaction_count",
    "public_comment_count",
    "public_share_count",
    "public_view_count",
    "correction_reference_count",
    "clarification_reference_count",
  ];

  const keys = Object.keys(safe);
  const values = keys.map((key) => Number(safe[key]));
  const checks = {
    keys_allowlisted: keys.every((key) => allowedKeys.includes(key)),
    non_negative_values: values.every((value) => Number.isFinite(value) && value >= 0),
    sentiment_components_within_signal:
      Number(safe.positive_signal_count ?? 0) +
        Number(safe.neutral_signal_count ?? 0) +
        Number(safe.negative_signal_count ?? 0) <=
      Number(safe.public_signal_count ?? 0),
    no_individual_level_metric: !keys.some((key) => /individual|account|user/i.test(key)),
    no_demographic_metric: !keys.some((key) => /demographic|segment|target/i.test(key)),
  };

  const errors = [];
  if (!checks.keys_allowlisted)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.AGGREGATE_METRICS_INVALID);
  if (!checks.non_negative_values)
    errors.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.NEGATIVE_METRIC_VALUE);
  if (!checks.sentiment_components_within_signal) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SENTIMENT_COMPONENT_TOTAL_EXCEEDS_SIGNAL_COUNT
    );
  }
  if (!checks.no_individual_level_metric) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.INDIVIDUAL_LEVEL_METRIC_NOT_PERMITTED
    );
  }
  if (!checks.no_demographic_metric) {
    errors.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.DEMOGRAPHIC_TARGETING_METRIC_NOT_PERMITTED
    );
  }

  return { valid: errors.length === 0, checks, errors };
}

export function evaluatePipPublicCommunicationOutcomeObservationEligibility({
  boundaryPackage,
  existingCollection,
  validationFixture = false,
} = {}) {
  const source = isPlainObject(boundaryPackage) ? boundaryPackage : {};
  const publicationUrl = sanitizeText(source.verified_publication_url, 2048);
  const publicationTimestamp = normalizeIso(source.verified_publication_timestamp);
  const currentStatus = sanitizeUpper(source.current_status, 180);
  const queueProjection = sanitizeUpper(source.queue_status_projection, 180);

  const checks = {
    source_present: Object.keys(source).length > 0,
    source_valid: source.validation?.valid !== false,
    source_status: ["EXTERNAL_PUBLICATION_VERIFIED", "ARCHIVAL_REVIEW_REQUIRED", "ARCHIVED"].includes(
      currentStatus
    ),
    projection: ["PUBLISHED", "ARCHIVED"].includes(queueProjection),
    verified_linked: source.verified_publication_linked === true,
    publication_url: /^https:\/\//i.test(publicationUrl),
    publication_timestamp: Boolean(publicationTimestamp),
    outcome_monitoring_compatible: source.outcome_monitoring_compatible === true,
    outcome_monitoring_required: source.outcome_monitoring_required !== false,
    outcome_monitoring_not_evaluated:
      sanitizeUpper(source.outcome_monitoring_status, 120, "NOT_YET_EVALUATED") ===
      "NOT_YET_EVALUATED",
    evidence_lineage:
      sanitizeUpper(source.evidence_lineage_status, 120, "VALID") === "VALID",
    approval: Boolean(sanitizeText(source.approval_reference, 180)),
    fixture_rule: validationFixture === true || source.validation_fixture !== true,
    p999_blocked:
      validationFixture === true ||
      !sanitizeUpper(source.geography_scope, 160).includes("P999"),
    duplicate_case: true,
  };

  const allCases = [
    ...toArray(existingCollection?.production_observation_cases),
    ...toArray(existingCollection?.fixture_observation_cases),
  ];
  checks.duplicate_case = !allCases.some((entry) => {
    const sameHandoff =
      sanitizeText(entry.source_handoff_package_id, 180) ===
      sanitizeText(source.handoff_package_id, 180);
    const sameUrl =
      sanitizeText(entry.verified_publication_url, 2048) === publicationUrl;
    const sameQueue =
      sanitizeText(entry.source_queue_item_id, 180) ===
      sanitizeText(source.source_queue_item_id, 180);
    const notComplete =
      sanitizeUpper(entry.current_status, 180) !==
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE;
    return sameHandoff && sameUrl && sameQueue && notComplete;
  });

  const block_reasons = [];
  if (!checks.source_present)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SOURCE_BOUNDARY_PACKAGE_MISSING
    );
  if (!checks.source_status)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SOURCE_BOUNDARY_STATUS_NOT_ELIGIBLE
    );
  if (!checks.projection)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.INTERNAL_PUBLISHED_OR_ARCHIVED_PROJECTION_REQUIRED
    );
  if (!checks.verified_linked)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.VERIFIED_PUBLICATION_LINKAGE_REQUIRED
    );
  if (!checks.publication_url)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.VERIFIED_PUBLICATION_URL_INVALID
    );
  if (!checks.publication_timestamp)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.VERIFIED_PUBLICATION_TIMESTAMP_INVALID
    );
  if (!checks.outcome_monitoring_compatible)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.OUTCOME_MONITORING_COMPATIBILITY_REQUIRED
    );
  if (!checks.outcome_monitoring_required)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.OUTCOME_MONITORING_REQUIRED_FALSE
    );
  if (!checks.evidence_lineage)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SOURCE_EVIDENCE_LINEAGE_INVALID
    );
  if (!checks.approval)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SOURCE_APPROVAL_INVALID
    );
  if (!checks.duplicate_case)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.DUPLICATE_OBSERVATION_CASE
    );
  if (!checks.fixture_rule)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.FIXTURE_PRODUCTION_COUNT_BLOCKED
    );
  if (!checks.p999_blocked)
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.P999_PRODUCTION_OBSERVATION_BLOCKED
    );

  return {
    valid: block_reasons.length === 0,
    eligible: block_reasons.length === 0,
    checks,
    errors: [],
    block_reasons: unique(block_reasons),
    summary: {
      passed_checks: Object.values(checks).filter(Boolean).length,
      total_checks: Object.keys(checks).length,
      block_count: unique(block_reasons).length,
    },
  };
}

export function createPipPublicCommunicationOutcomeObservationCase({
  boundaryPackage,
  actorRole,
  actorAlias,
  existingCollection,
  validationFixture = false,
} = {}) {
  validatePipPublicCommunicationOutcomeObservationCreateRequest({
    action: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.CREATE_OBSERVATION_CASE,
    actor_role: actorRole,
    actor_alias: actorAlias,
    requested_at: new Date().toISOString(),
  });

  const source = isPlainObject(boundaryPackage) ? boundaryPackage : {};
  const eligibility = evaluatePipPublicCommunicationOutcomeObservationEligibility({
    boundaryPackage: source,
    existingCollection,
    validationFixture,
  });

  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [...eligibility.block_reasons];

  if (!["ANALYST", "ADMINISTRATOR"].includes(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID);
  }

  if (reasons.length > 0) {
    return {
      created: false,
      observation_case: null,
      evaluation: {
        valid: false,
        eligible: false,
        block_reasons: unique(reasons),
      },
    };
  }

  const createdAt = new Date().toISOString();
  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_CASE_SCHEMA,
    observation_case_id: `OBSCASE-${sanitizeText(source.handoff_package_id, 80)}`,
    source_handoff_package_id: source.handoff_package_id,
    source_queue_item_id: source.source_queue_item_id,
    source_publication_register_entry_id: source.source_publication_register_entry_id,
    source_content_package_id: source.source_content_package_id,
    source_draft_id: source.source_draft_id,
    source_recommendation_package_id: source.source_recommendation_package_id,
    response_case_id: source.response_case_id,
    source_issue_id: source.source_issue_id,
    issue_label: source.issue_label,
    geography_scope: source.geography_scope,
    content_format: source.content_format,
    publication_platform: source.publication_platform,
    public_channel_label: source.public_channel_label,
    verified_publication_url: source.verified_publication_url,
    verified_publication_timestamp: source.verified_publication_timestamp,
    responsible_owner_role: source.responsible_owner_role,
    responsible_owner_alias: source.responsible_owner_alias,
    approval_level: source.approval_level,
    approval_reference: source.approval_reference,
    evidence_ids: source.evidence_ids,
    verified_fact_ids: source.verified_fact_ids,
    evidence_lineage_status: source.evidence_lineage_status,
    uncertainty_note: source.uncertainty_note,
    wording_risks: source.wording_risks,
    source_boundary_status: source.current_status,
    source_queue_projection: source.queue_status_projection,
    source_boundary_fingerprint: stableHash(source),
    source_queue_fingerprint: source.source_queue_fingerprint,
    source_content_fingerprint: source.source_content_fingerprint,
    source_evidence_fingerprint: source.source_evidence_fingerprint,
    source_register_fingerprint: source.source_register_fingerprint,
    current_status: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED,
    previous_status: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_NOT_STARTED,
    status_sequence: statusIndex(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED
    ) + 1,
    required_window_types: [...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER],
    completed_window_types: [],
    pending_window_types: [...PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER],
    baseline_snapshot: null,
    post_publication_snapshots: [],
    snapshot_count: 0,
    next_window_type: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.PRE_PUBLICATION_24H,
    next_window_eligible_at: source.verified_publication_timestamp,
    observation_started_at: createdAt,
    observation_completed_at: "",
    observation_created_by_role: role,
    observation_created_by_alias: alias,
    outcome_effectiveness_classification: "NOT_EVALUATED",
    causal_attribution_status: "NOT_PERFORMED",
    follow_up_response_recommendation_status: "NOT_GENERATED",
    outcome_monitoring_status: "OBSERVATION_IN_PROGRESS",
    outcome_monitoring_record_id: `OBSCASE-${sanitizeText(source.handoff_package_id, 80)}`,
    history: [
      makeHistory({
        action: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.CREATE_OBSERVATION_CASE,
        fromStatus:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_NOT_STARTED,
        toStatus: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED,
        actorRole: role,
        actorAlias: alias,
        note: "Observation case created.",
        code: "OBS",
      }),
    ],
    history_count: 1,
    validation_fixture: validationFixture === true,
    production_eligible: validationFixture !== true,
    created_at: createdAt,
    updated_at: createdAt,
    safety: {
      external_network_request_made: false,
      automatic_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
      browser_storage_modified: false,
      central_repository_modified: false,
    },
  }).normalized;

  return {
    created: true,
    observation_case: caseRecord,
    evaluation: {
      valid: true,
      eligible: true,
      block_reasons: [],
    },
  };
}

export function validatePipPublicCommunicationOutcomeObservationWindowReadiness({
  observationCase,
  windowType,
  observedFrom,
  observedTo,
  capturedAt,
  evaluationTimestamp,
} = {}) {
  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase(observationCase).normalized;
  const type = sanitizeUpper(windowType, 80);

  const windowValidation = validatePipPublicCommunicationOutcomeObservationWindow({
    window_type: type,
    observed_from: observedFrom,
    observed_to: observedTo,
    captured_at: capturedAt,
    publication_timestamp: caseRecord.verified_publication_timestamp,
    evaluation_timestamp: evaluationTimestamp,
  });

  const reasons = [...windowValidation.errors];
  const existing = [
    caseRecord.baseline_snapshot,
    ...toArray(caseRecord.post_publication_snapshots),
  ].filter(Boolean);
  const expectedNextType = nextWindowType(caseRecord.completed_window_types);

  const fromMs = toMs(observedFrom);
  const toWindowMs = toMs(observedTo);

  if (
    existing.some((snapshot) => {
      const left = toMs(snapshot.observed_from);
      const right = toMs(snapshot.observed_to);
      return (
        Number.isFinite(fromMs) &&
        Number.isFinite(toWindowMs) &&
        fromMs < right &&
        toWindowMs > left
      );
    })
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_OVERLAP_DETECTED
    );
  }

  if (
    caseRecord.completed_window_types.includes(type) ||
    !caseRecord.required_window_types.includes(type) ||
    type !== expectedNextType
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_SEQUENCE_INVALID
    );
  }

  return {
    valid: reasons.length === 0,
    permitted: reasons.length === 0,
    block_reasons: unique(reasons),
    checks: {
      window_validation: windowValidation.valid,
      non_overlap:
        !unique(reasons).includes(
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_OVERLAP_DETECTED
        ),
      not_duplicate:
        !unique(reasons).includes(
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_SEQUENCE_INVALID
        ),
    },
  };
}

export function recordPipPublicCommunicationOutcomeObservationSnapshot({
  observationCase,
  actorRole,
  actorAlias,
  windowType,
  observedFrom,
  observedTo,
  capturedAt,
  evaluationTimestamp,
  sourceMethod,
  aggregateMetrics,
  evidenceIds,
  uncertaintyNote,
  limitations,
  sourceReferenceLabels,
} = {}) {
  validatePipPublicCommunicationOutcomeObservationSnapshotRequest({
    action:
      windowType ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.PRE_PUBLICATION_24H
        ? PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RECORD_BASELINE_SNAPSHOT
        : PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RECORD_POST_PUBLICATION_SNAPSHOT,
    actor_role: actorRole,
    actor_alias: actorAlias,
  });

  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase(observationCase).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);

  const reasons = [];
  if (!["ANALYST", "ADMINISTRATOR"].includes(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID);
  }

  const readiness = validatePipPublicCommunicationOutcomeObservationWindowReadiness({
    observationCase: caseRecord,
    windowType,
    observedFrom,
    observedTo,
    capturedAt,
    evaluationTimestamp,
  });
  if (!readiness.permitted) reasons.push(...readiness.block_reasons);

  const metricEvaluation = evaluateAggregateMetrics(aggregateMetrics);
  if (!metricEvaluation.valid) reasons.push(...metricEvaluation.errors);

  if (toArray(evidenceIds).length === 0) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.EVIDENCE_IDS_REQUIRED);
  }
  if (!sanitizeText(uncertaintyNote, 600)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.UNCERTAINTY_NOTE_REQUIRED
    );
  }

  if (sanitizeText(limitations, 800).match(/raw\s+post/i)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.RAW_CONTENT_NOT_PERMITTED);
  }
  if (sanitizeText(sourceReferenceLabels, 800).match(/@/i)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.PUBLIC_ACCOUNT_IDENTITY_NOT_PERMITTED
    );
  }

  if (reasons.length > 0) {
    return {
      recorded: false,
      updated_observation_case: caseRecord,
      receipt: null,
      evaluation: {
        valid: false,
        permitted: false,
        block_reasons: unique(reasons),
      },
    };
  }

  const snapshot = validatePipPublicCommunicationOutcomeObservationSnapshot({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_SNAPSHOT_SCHEMA,
    snapshot_id: `SNAP-${sanitizeText(caseRecord.observation_case_id, 80)}-${sanitizeUpper(
      windowType,
      80
    )}`,
    observation_case_id: caseRecord.observation_case_id,
    window_type: windowType,
    observed_from: observedFrom,
    observed_to: observedTo,
    captured_at: capturedAt,
    captured_by_role: role,
    captured_by_alias: alias,
    source_method: sourceMethod,
    aggregate_metrics: aggregateMetrics,
    evidence_ids: evidenceIds,
    evidence_count: toArray(evidenceIds).length,
    uncertainty_note: uncertaintyNote,
    limitations,
    source_reference_labels: toArray(sourceReferenceLabels),
    validation_fixture: caseRecord.validation_fixture === true,
    production_eligible: caseRecord.production_eligible === true,
  }).normalized;

  const baselineType =
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES.PRE_PUBLICATION_24H;
  const isBaseline = sanitizeUpper(windowType, 80) === baselineType;

  const completed = unique([
    ...toArray(caseRecord.completed_window_types),
    sanitizeUpper(windowType, 80),
  ]);
  const pending = PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER.filter(
    (entry) => !completed.includes(entry)
  );
  const nextType = nextWindowType(completed);

  const updatedStatus =
    completed.length >= PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER.length
      ? PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE
      : completed.includes(baselineType)
        ? PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.POST_OBSERVATION_IN_PROGRESS
        : PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_RECORDED;

  const updatedCase = validatePipPublicCommunicationOutcomeObservationCase({
    ...caseRecord,
    previous_status: caseRecord.current_status,
    current_status: updatedStatus,
    status_sequence: statusIndex(updatedStatus) + 1,
    baseline_snapshot: isBaseline ? snapshot : caseRecord.baseline_snapshot,
    post_publication_snapshots: isBaseline
      ? toArray(caseRecord.post_publication_snapshots)
      : [...toArray(caseRecord.post_publication_snapshots), snapshot],
    completed_window_types: completed,
    pending_window_types: pending,
    next_window_type: nextType,
    next_window_eligible_at: nextType
      ? new Date(
          toMs(caseRecord.verified_publication_timestamp) +
            getWindowUpperOffsetHours(nextType) *
              60 *
              60 *
              1000
        ).toISOString()
      : "",
    snapshot_count:
      (isBaseline ? 1 : caseRecord.baseline_snapshot ? 1 : 0) +
      (isBaseline
        ? toArray(caseRecord.post_publication_snapshots).length
        : toArray(caseRecord.post_publication_snapshots).length + 1),
    history: [
      ...toArray(caseRecord.history),
      makeHistory({
        action: isBaseline
          ? PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RECORD_BASELINE_SNAPSHOT
          : PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RECORD_POST_PUBLICATION_SNAPSHOT,
        fromStatus: caseRecord.current_status,
        toStatus: updatedStatus,
        actorRole: role,
        actorAlias: alias,
        note: `Recorded ${sanitizeUpper(windowType, 80)} snapshot.`,
        code: "SNP",
      }),
    ],
    history_count: Number(caseRecord.history_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = validatePipPublicCommunicationOutcomeObservationSnapshotReceipt({
    action: isBaseline
      ? PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RECORD_BASELINE_SNAPSHOT
      : PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RECORD_POST_PUBLICATION_SNAPSHOT,
    actor_role: role,
    actor_alias: alias,
    note: `Snapshot recorded for ${sanitizeUpper(windowType, 80)}.`,
    payload: {
      snapshot_id: snapshot.snapshot_id,
      observation_case_id: snapshot.observation_case_id,
      window_type: snapshot.window_type,
    },
  }).normalized;

  return {
    recorded: true,
    updated_observation_case: updatedCase,
    snapshot,
    receipt,
    evaluation: {
      valid: true,
      permitted: true,
      block_reasons: [],
    },
  };
}

export function completePipPublicCommunicationOutcomeObservationWindow({
  observationCase,
  actorRole,
  actorAlias,
  completionNote,
} = {}) {
  validatePipPublicCommunicationOutcomeObservationCompletionRequest({
    action: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.COMPLETE_OBSERVATION_WINDOW,
    actor_role: actorRole,
    actor_alias: actorAlias,
    note: completionNote,
  });

  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase(observationCase).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (role !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID);
  }
  if (!sanitizeText(completionNote, 420)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.MANUAL_ACTION_REQUIRED);
  }
  if (
    toArray(caseRecord.completed_window_types).length <
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER.length
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.WINDOW_SEQUENCE_INVALID
    );
  }

  if (reasons.length > 0) {
    return {
      completed: false,
      updated_observation_case: caseRecord,
      receipt: null,
      evaluation: {
        valid: false,
        permitted: false,
        block_reasons: unique(reasons),
      },
    };
  }

  const updatedCase = validatePipPublicCommunicationOutcomeObservationCase({
    ...caseRecord,
    previous_status: caseRecord.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE
      ) + 1,
    next_window_type: "",
    next_window_eligible_at: "",
    observation_completed_at: new Date().toISOString(),
    outcome_effectiveness_classification: "NOT_EVALUATED",
    causal_attribution_status: "NOT_PERFORMED",
    follow_up_response_recommendation_status: "NOT_GENERATED",
    outcome_monitoring_status: "OBSERVATION_WINDOW_COMPLETE",
    history: [
      ...toArray(caseRecord.history),
      makeHistory({
        action: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.COMPLETE_OBSERVATION_WINDOW,
        fromStatus: caseRecord.current_status,
        toStatus:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE,
        actorRole: role,
        actorAlias: alias,
        note: sanitizeText(completionNote, 420),
        code: "CMP",
      }),
    ],
    history_count: Number(caseRecord.history_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  const receipt = validatePipPublicCommunicationOutcomeObservationCompletionReceipt({
    action: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.COMPLETE_OBSERVATION_WINDOW,
    actor_role: role,
    actor_alias: alias,
    note: sanitizeText(completionNote, 420),
  }).normalized;

  return {
    completed: true,
    updated_observation_case: updatedCase,
    receipt,
    evaluation: {
      valid: true,
      permitted: true,
      block_reasons: [],
    },
  };
}

export function returnPipPublicCommunicationOutcomeObservationForCorrection({
  observationCase,
  actorRole,
  actorAlias,
  correctionNote,
} = {}) {
  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase(observationCase).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (!["ANALYST", "ADMINISTRATOR"].includes(role)) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!sanitizeText(correctionNote, 420)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.MANUAL_ACTION_REQUIRED);
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID);
  }
  if (
    ![
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_RECORDED,
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.POST_OBSERVATION_IN_PROGRESS,
    ].includes(sanitizeUpper(caseRecord.current_status, 180))
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  if (reasons.length > 0) {
    return {
      returned: false,
      updated_observation_case: caseRecord,
      evaluation: {
        valid: false,
        permitted: false,
        block_reasons: unique(reasons),
      },
    };
  }

  const nextStatus =
    sanitizeUpper(caseRecord.current_status, 180) ===
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_RECORDED
      ? PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED
      : PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_RECORDED;

  const updatedCase = validatePipPublicCommunicationOutcomeObservationCase({
    ...caseRecord,
    previous_status: caseRecord.current_status,
    current_status: nextStatus,
    status_sequence: statusIndex(nextStatus) + 1,
    history: [
      ...toArray(caseRecord.history),
      makeHistory({
        action:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.RETURN_OBSERVATION_FOR_CORRECTION,
        fromStatus: caseRecord.current_status,
        toStatus: nextStatus,
        actorRole: role,
        actorAlias: alias,
        note: sanitizeText(correctionNote, 420),
        code: "COR",
      }),
    ],
    history_count: Number(caseRecord.history_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  return {
    returned: true,
    updated_observation_case: updatedCase,
    evaluation: {
      valid: true,
      permitted: true,
      block_reasons: [],
    },
  };
}

export function voidPipPublicCommunicationUnstartedOutcomeObservation({
  observationCase,
  actorRole,
  actorAlias,
  voidReason,
} = {}) {
  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase(observationCase).normalized;
  const role = sanitizeUpper(actorRole, 80);
  const alias = sanitizeUpper(actorAlias, 32);
  const reasons = [];

  if (role !== "ADMINISTRATOR") {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ROLE_NOT_AUTHORIZED
    );
  }
  if (!aliasLooksValid(alias)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.ACTOR_ALIAS_INVALID);
  }
  if (!sanitizeText(voidReason, 420)) {
    reasons.push(PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.MANUAL_ACTION_REQUIRED);
  }
  if (
    sanitizeUpper(caseRecord.current_status, 180) !==
    PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.BASELINE_REQUIRED
  ) {
    reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.INVALID_CURRENT_STATUS
    );
  }

  if (reasons.length > 0) {
    return {
      voided: false,
      updated_observation_case: caseRecord,
      evaluation: {
        valid: false,
        permitted: false,
        block_reasons: unique(reasons),
      },
    };
  }

  const updatedCase = validatePipPublicCommunicationOutcomeObservationCase({
    ...caseRecord,
    previous_status: caseRecord.current_status,
    current_status:
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_NOT_STARTED,
    status_sequence:
      statusIndex(
        PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_NOT_STARTED
      ) + 1,
    history: [
      ...toArray(caseRecord.history),
      makeHistory({
        action:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_ACTIONS.VOID_UNSTARTED_OBSERVATION,
        fromStatus: caseRecord.current_status,
        toStatus:
          PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_NOT_STARTED,
        actorRole: role,
        actorAlias: alias,
        note: sanitizeText(voidReason, 420),
        code: "VOID",
      }),
    ],
    history_count: Number(caseRecord.history_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).normalized;

  return {
    voided: true,
    updated_observation_case: updatedCase,
    evaluation: {
      valid: true,
      permitted: true,
      block_reasons: [],
    },
  };
}

export function detectPipPublicCommunicationOutcomeObservationSourceMutation({
  observationCase,
  boundaryPackage,
} = {}) {
  const caseRecord = validatePipPublicCommunicationOutcomeObservationCase(observationCase).normalized;
  const source = isPlainObject(boundaryPackage) ? boundaryPackage : {};

  const checks = {
    boundary_fingerprint:
      sanitizeText(caseRecord.source_boundary_fingerprint, 180) === stableHash(source),
    queue_fingerprint:
      sanitizeText(caseRecord.source_queue_fingerprint, 180) ===
      sanitizeText(source.source_queue_fingerprint, 180),
    content_fingerprint:
      sanitizeText(caseRecord.source_content_fingerprint, 180) ===
      sanitizeText(source.source_content_fingerprint, 180),
    evidence_fingerprint:
      sanitizeText(caseRecord.source_evidence_fingerprint, 180) ===
      sanitizeText(source.source_evidence_fingerprint, 180),
    register_fingerprint:
      sanitizeText(caseRecord.source_register_fingerprint, 180) ===
      sanitizeText(source.source_register_fingerprint, 180),
  };

  const block_reasons = [];
  if (!Object.values(checks).every(Boolean)) {
    block_reasons.push(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_BLOCK_REASONS.SOURCE_MUTATION_DETECTED
    );
  }

  return {
    mutated: block_reasons.length > 0,
    checks,
    block_reasons,
  };
}

export function buildPipPublicCommunicationOutcomeObservationCollection({
  boundaryCollection,
  includeValidationFixtures = true,
} = {}) {
  const sourceCollection = isPlainObject(boundaryCollection) ? boundaryCollection : {};

  const productionCases = [];
  const fixtureCases = [];
  const blockedEvaluations = [];

  toArray(sourceCollection.production_boundary_packages).forEach((entry, index) => {
    const created = createPipPublicCommunicationOutcomeObservationCase({
      boundaryPackage: entry,
      actorRole: "ANALYST",
      actorAlias: `OBS-65A${String(index + 1).padStart(5, "0")}`,
      existingCollection: {
        production_observation_cases: productionCases,
        fixture_observation_cases: fixtureCases,
      },
      validationFixture: false,
    });

    if (created.created) {
      productionCases.push(created.observation_case);
    } else {
      blockedEvaluations.push({
        source_handoff_package_id: entry.handoff_package_id,
        block_reasons: created.evaluation.block_reasons,
      });
    }
  });

  if (includeValidationFixtures) {
    toArray(sourceCollection.fixture_boundary_packages).forEach((entry, index) => {
      const created = createPipPublicCommunicationOutcomeObservationCase({
        boundaryPackage: {
          ...entry,
          current_status: "EXTERNAL_PUBLICATION_VERIFIED",
          queue_status_projection: "PUBLISHED",
          verified_publication_linked: true,
          verified_publication_url:
            entry.verified_publication_url || `https://example.invalid/obs/${index + 1}`,
          verified_publication_timestamp:
            entry.verified_publication_timestamp || "2027-01-01T00:00:00.000Z",
          outcome_monitoring_compatible: true,
          outcome_monitoring_required: true,
          outcome_monitoring_status: "NOT_YET_EVALUATED",
          validation_fixture: true,
          production_eligible: false,
        },
        actorRole: "ANALYST",
        actorAlias: `OBS-65A${String(index + 11).padStart(5, "0")}`,
        existingCollection: {
          production_observation_cases: productionCases,
          fixture_observation_cases: fixtureCases,
        },
        validationFixture: true,
      });

      if (created.created) fixtureCases.push(created.observation_case);
    });
  }

  const summary = buildPipPublicCommunicationOutcomeObservationSummary({
    sourceBoundaryPackageCount:
      toArray(sourceCollection.production_boundary_packages).length +
      toArray(sourceCollection.fixture_boundary_packages).length,
    eligibleSourcePackageCount: productionCases.length,
    productionObservationCases: productionCases,
    fixtureObservationCases: fixtureCases,
    blockedEvaluations,
  });

  const normalized = {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COLLECTION_SCHEMA,
    generated_at: new Date().toISOString(),
    summary,
    production_observation_cases: productionCases,
    fixture_observation_cases: fixtureCases,
    blocked_evaluations: blockedEvaluations,
    validation: { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      automatic_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
    },
  };

  return normalized;
}

export function buildPipPublicCommunicationOutcomeObservationSummary({
  sourceBoundaryPackageCount = 0,
  eligibleSourcePackageCount = 0,
  productionObservationCases = [],
  fixtureObservationCases = [],
  blockedEvaluations = [],
} = {}) {
  const allCases = [
    ...toArray(productionObservationCases),
    ...toArray(fixtureObservationCases),
  ];

  const statusCounts = {};
  PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUS_ORDER.forEach((status) => {
    statusCounts[status] = allCases.filter(
      (entry) => sanitizeUpper(entry.current_status, 180) === status
    ).length;
  });

  const allSnapshots = allCases.flatMap((entry) => [
    entry.baseline_snapshot,
    ...toArray(entry.post_publication_snapshots),
  ]).filter(Boolean);

  return {
    source_boundary_package_count: Number(sourceBoundaryPackageCount) || 0,
    eligible_source_package_count: Number(eligibleSourcePackageCount) || 0,
    production_observation_case_count: toArray(productionObservationCases).length,
    fixture_observation_case_count: toArray(fixtureObservationCases).length,
    blocked_source_evaluation_count: toArray(blockedEvaluations).length,
    status_counts: statusCounts,
    baseline_snapshot_count: allSnapshots.filter(
      (snapshot) => sanitizeUpper(snapshot.window_type, 80) === "PRE_PUBLICATION_24H"
    ).length,
    post_6h_snapshot_count: allSnapshots.filter(
      (snapshot) => sanitizeUpper(snapshot.window_type, 80) === "POST_PUBLICATION_6H"
    ).length,
    post_12h_snapshot_count: allSnapshots.filter(
      (snapshot) => sanitizeUpper(snapshot.window_type, 80) === "POST_PUBLICATION_12H"
    ).length,
    post_24h_snapshot_count: allSnapshots.filter(
      (snapshot) => sanitizeUpper(snapshot.window_type, 80) === "POST_PUBLICATION_24H"
    ).length,
    post_72h_snapshot_count: allSnapshots.filter(
      (snapshot) => sanitizeUpper(snapshot.window_type, 80) === "POST_PUBLICATION_72H"
    ).length,
    missing_required_window_count: allCases.filter(
      (entry) =>
        toArray(entry.completed_window_types).length <
        PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_ORDER.length
    ).length,
    invalid_window_count: 0,
    production_completion_count: toArray(productionObservationCases).filter(
      (entry) =>
        sanitizeUpper(entry.current_status, 180) ===
        PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE
    ).length,
    fixture_completion_count: toArray(fixtureObservationCases).filter(
      (entry) =>
        sanitizeUpper(entry.current_status, 180) ===
        PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE
    ).length,
    collection_validation_status: "VALID",
  };
}

export function buildPipPublicCommunicationOutcomeObservationValidationFixture() {
  const publicationTime = "2027-01-01T00:00:00.000Z";
  const boundaryPackages = Array.from({ length: 8 }, (_entry, index) => ({
    handoff_package_id: `PMH-65A-FX-${index + 1}`,
    source_queue_item_id: `PQI-65A-FX-${index + 1}`,
    source_publication_register_entry_id: `PPR-65A-FX-${index + 1}`,
    source_content_package_id: `PCP-65A-FX-${index + 1}`,
    source_draft_id: `PCD-65A-FX-${index + 1}`,
    source_recommendation_package_id: `PRP-65A-FX-${index + 1}`,
    response_case_id: `RC-65A-FX-${index + 1}`,
    source_issue_id: `ISSUE-65A-FX-${index + 1}`,
    issue_label: `Fixture observation issue ${index + 1}`,
    geography_scope: "TEST/P999",
    content_format: "FACEBOOK_POST",
    publication_platform: "FACEBOOK",
    public_channel_label: "fixture-channel",
    verified_publication_linked: true,
    verified_publication_url: `https://example.invalid/outcome/${index + 1}`,
    verified_publication_timestamp: publicationTime,
    approval_level: "SENIOR_APPROVAL",
    approval_reference: `APP-65A-FX-${index + 1}`,
    evidence_ids: [`EVID-65A-FX-${index + 1}`],
    verified_fact_ids: [`FACT-65A-FX-${index + 1}`],
    evidence_lineage_status: "VALID",
    uncertainty_note: "Fixture uncertainty",
    wording_risks: ["FIXTURE"],
    current_status: "EXTERNAL_PUBLICATION_VERIFIED",
    queue_status_projection: "PUBLISHED",
    source_queue_fingerprint: stableHash({ q: index + 1 }),
    source_content_fingerprint: stableHash({ c: index + 1 }),
    source_evidence_fingerprint: stableHash({ e: index + 1 }),
    source_register_fingerprint: stableHash({ r: index + 1 }),
    outcome_monitoring_compatible: true,
    outcome_monitoring_required: true,
    outcome_monitoring_status: "NOT_YET_EVALUATED",
    validation_fixture: true,
    production_eligible: false,
  }));

  const createRejectViewer = createPipPublicCommunicationOutcomeObservationCase({
    boundaryPackage: boundaryPackages[0],
    actorRole: "VIEWER",
    actorAlias: "OBS-65A00001",
    validationFixture: true,
  });

  const createAnalyst = createPipPublicCommunicationOutcomeObservationCase({
    boundaryPackage: boundaryPackages[0],
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00002",
    validationFixture: true,
  });

  let flowCase = createAnalyst.observation_case;

  const baselineRecorded = recordPipPublicCommunicationOutcomeObservationSnapshot({
    observationCase: flowCase,
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00003",
    windowType: "PRE_PUBLICATION_24H",
    observedFrom: "2026-12-31T00:00:00.000Z",
    observedTo: "2027-01-01T00:00:00.000Z",
    capturedAt: "2027-01-01T00:10:00.000Z",
    evaluationTimestamp: "2027-01-01T00:10:00.000Z",
    sourceMethod: "MANUAL_AGGREGATE_ENTRY",
    aggregateMetrics: {
      public_signal_count: 12,
      positive_signal_count: 4,
      neutral_signal_count: 5,
      negative_signal_count: 3,
      unique_public_source_count: 6,
    },
    evidenceIds: ["EVID-65A-FX-BASE"],
    uncertaintyNote: "baseline fixture",
    limitations: "none",
    sourceReferenceLabels: ["public aggregate"],
  });

  flowCase = baselineRecorded.updated_observation_case;

  const missing6WindowRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_12H",
      observedFrom: "2027-01-01T06:00:00.000Z",
      observedTo: "2027-01-01T12:00:00.000Z",
      capturedAt: "2027-01-01T12:10:00.000Z",
      evaluationTimestamp: "2027-01-01T12:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 10,
        positive_signal_count: 3,
        neutral_signal_count: 4,
        negative_signal_count: 3,
      },
      evidenceIds: ["EVID-65A-FX-M6"],
      uncertaintyNote: "missing 6h rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const early6hCaptureRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_6H",
      observedFrom: "2027-01-01T00:00:00.000Z",
      observedTo: "2027-01-01T06:00:00.000Z",
      capturedAt: "2027-01-01T05:59:00.000Z",
      evaluationTimestamp: "2027-01-01T06:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 8,
        positive_signal_count: 2,
        neutral_signal_count: 4,
        negative_signal_count: 2,
      },
      evidenceIds: ["EVID-65A-FX-E6"],
      uncertaintyNote: "early 6h rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const post6Recorded = recordPipPublicCommunicationOutcomeObservationSnapshot({
    observationCase: flowCase,
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00003",
    windowType: "POST_PUBLICATION_6H",
    observedFrom: "2027-01-01T00:00:00.000Z",
    observedTo: "2027-01-01T06:00:00.000Z",
    capturedAt: "2027-01-01T06:05:00.000Z",
    evaluationTimestamp: "2027-01-01T06:05:00.000Z",
    sourceMethod: "MANUAL_AGGREGATE_ENTRY",
    aggregateMetrics: {
      public_signal_count: 14,
      positive_signal_count: 5,
      neutral_signal_count: 5,
      negative_signal_count: 4,
      unique_public_source_count: 7,
    },
    evidenceIds: ["EVID-65A-FX-06"],
    uncertaintyNote: "6h fixture",
    limitations: "none",
    sourceReferenceLabels: ["public aggregate"],
  });

  flowCase = post6Recorded.updated_observation_case;

  const overlap6h12hRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_12H",
      observedFrom: "2027-01-01T05:30:00.000Z",
      observedTo: "2027-01-01T12:00:00.000Z",
      capturedAt: "2027-01-01T12:05:00.000Z",
      evaluationTimestamp: "2027-01-01T12:05:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 11,
        positive_signal_count: 4,
        neutral_signal_count: 4,
        negative_signal_count: 3,
      },
      evidenceIds: ["EVID-65A-FX-O612"],
      uncertaintyNote: "6h 12h overlap rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const early12hCaptureRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_12H",
      observedFrom: "2027-01-01T06:00:00.000Z",
      observedTo: "2027-01-01T12:00:00.000Z",
      capturedAt: "2027-01-01T11:59:00.000Z",
      evaluationTimestamp: "2027-01-01T12:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 12,
        positive_signal_count: 4,
        neutral_signal_count: 5,
        negative_signal_count: 3,
      },
      evidenceIds: ["EVID-65A-FX-E12"],
      uncertaintyNote: "early 12h rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const post12Recorded = recordPipPublicCommunicationOutcomeObservationSnapshot({
    observationCase: flowCase,
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00003",
    windowType: "POST_PUBLICATION_12H",
    observedFrom: "2027-01-01T06:00:00.000Z",
    observedTo: "2027-01-01T12:00:00.000Z",
    capturedAt: "2027-01-01T12:05:00.000Z",
    evaluationTimestamp: "2027-01-01T12:05:00.000Z",
    sourceMethod: "MANUAL_AGGREGATE_ENTRY",
    aggregateMetrics: {
      public_signal_count: 16,
      positive_signal_count: 5,
      neutral_signal_count: 6,
      negative_signal_count: 5,
      unique_public_source_count: 8,
    },
    evidenceIds: ["EVID-65A-FX-12"],
    uncertaintyNote: "12h fixture",
    limitations: "none",
    sourceReferenceLabels: ["public aggregate"],
  });

  flowCase = post12Recorded.updated_observation_case;

  const missing12WindowRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post6Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_24H",
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evaluationTimestamp: "2027-01-02T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 17,
        positive_signal_count: 5,
        neutral_signal_count: 7,
        negative_signal_count: 5,
      },
      evidenceIds: ["EVID-65A-FX-M12"],
      uncertaintyNote: "missing 12h rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const overlap12h24hRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_24H",
      observedFrom: "2027-01-01T11:30:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evaluationTimestamp: "2027-01-02T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 18,
        positive_signal_count: 6,
        neutral_signal_count: 7,
        negative_signal_count: 5,
      },
      evidenceIds: ["EVID-65A-FX-O1224"],
      uncertaintyNote: "12h 24h overlap rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const early24hCaptureRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_24H",
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-01T23:59:00.000Z",
      evaluationTimestamp: "2027-01-02T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 18,
        positive_signal_count: 6,
        neutral_signal_count: 7,
        negative_signal_count: 5,
      },
      evidenceIds: ["EVID-65A-FX-E24"],
      uncertaintyNote: "early 24h rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const post24Recorded = recordPipPublicCommunicationOutcomeObservationSnapshot({
    observationCase: flowCase,
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00003",
    windowType: "POST_PUBLICATION_24H",
    observedFrom: "2027-01-01T12:00:00.000Z",
    observedTo: "2027-01-02T00:00:00.000Z",
    capturedAt: "2027-01-02T00:10:00.000Z",
    evaluationTimestamp: "2027-01-02T00:10:00.000Z",
    sourceMethod: "MANUAL_AGGREGATE_ENTRY",
    aggregateMetrics: {
      public_signal_count: 18,
      positive_signal_count: 6,
      neutral_signal_count: 7,
      negative_signal_count: 5,
      unique_public_source_count: 9,
    },
    evidenceIds: ["EVID-65A-FX-24"],
    uncertaintyNote: "24h fixture",
    limitations: "none",
    sourceReferenceLabels: ["public aggregate"],
  });

  flowCase = post24Recorded.updated_observation_case;

  const completionFourWindowsRejected = completePipPublicCommunicationOutcomeObservationWindow({
    observationCase: flowCase,
    actorRole: "ADMINISTRATOR",
    actorAlias: "OBS-65A00009",
    completionNote: "too early",
  }).completed === false;

  const early72hCaptureRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_72H",
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-03T23:59:00.000Z",
      evaluationTimestamp: "2027-01-04T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 22,
        positive_signal_count: 7,
        neutral_signal_count: 9,
        negative_signal_count: 6,
      },
      evidenceIds: ["EVID-65A-FX-E72"],
      uncertaintyNote: "early 72h rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const post72Recorded = recordPipPublicCommunicationOutcomeObservationSnapshot({
    observationCase: flowCase,
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00003",
    windowType: "POST_PUBLICATION_72H",
    observedFrom: "2027-01-02T00:00:00.000Z",
    observedTo: "2027-01-04T00:00:00.000Z",
    capturedAt: "2027-01-04T00:05:00.000Z",
    evaluationTimestamp: "2027-01-04T00:05:00.000Z",
    sourceMethod: "MANUAL_AGGREGATE_ENTRY",
    aggregateMetrics: {
      public_signal_count: 24,
      positive_signal_count: 8,
      neutral_signal_count: 10,
      negative_signal_count: 6,
      unique_public_source_count: 11,
    },
    evidenceIds: ["EVID-65A-FX-72"],
    uncertaintyNote: "72h fixture",
    limitations: "none",
    sourceReferenceLabels: ["public aggregate"],
  });

  flowCase = post72Recorded.updated_observation_case;

  const unsupported7dWindowRejection =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: flowCase,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_7D",
      observedFrom: "2027-01-04T00:00:00.000Z",
      observedTo: "2027-01-08T00:00:00.000Z",
      capturedAt: "2027-01-08T00:10:00.000Z",
      evaluationTimestamp: "2027-01-08T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 30,
        positive_signal_count: 10,
        neutral_signal_count: 11,
        negative_signal_count: 9,
      },
      evidenceIds: ["EVID-65A-FX-7D"],
      uncertaintyNote: "unsupported 7d window rejection",
      limitations: "none",
      sourceReferenceLabels: ["public aggregate"],
    }).recorded === false;

  const completeSuccess = completePipPublicCommunicationOutcomeObservationWindow({
    observationCase: flowCase,
    actorRole: "ADMINISTRATOR",
    actorAlias: "OBS-65A00009",
    completionNote: "All windows complete.",
  });

  const invalidUrlReject =
    evaluatePipPublicCommunicationOutcomeObservationEligibility({
      boundaryPackage: {
        ...boundaryPackages[1],
        verified_publication_url: "http://example.invalid/not-https",
      },
      validationFixture: true,
    }).eligible === false;

  const invalidTimestampReject =
    evaluatePipPublicCommunicationOutcomeObservationEligibility({
      boundaryPackage: {
        ...boundaryPackages[1],
        verified_publication_timestamp: "invalid",
      },
      validationFixture: true,
    }).eligible === false;

  const duplicateReject =
    evaluatePipPublicCommunicationOutcomeObservationEligibility({
      boundaryPackage: boundaryPackages[0],
      existingCollection: {
        fixture_observation_cases: [createAnalyst.observation_case],
      },
      validationFixture: true,
    }).eligible === false;

  const baselineAfterPublicationReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: createAnalyst.observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "PRE_PUBLICATION_24H",
      observedFrom: "2027-01-01T00:10:00.000Z",
      observedTo: "2027-01-01T01:00:00.000Z",
      capturedAt: "2027-01-01T01:10:00.000Z",
      evaluationTimestamp: "2027-01-01T01:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 3,
        positive_signal_count: 1,
        neutral_signal_count: 1,
        negative_signal_count: 1,
      },
      evidenceIds: ["EVID-X"],
      uncertaintyNote: "x",
      limitations: "x",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const postBeforePublicationReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post12Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_24H",
      observedFrom: "2026-12-31T23:00:00.000Z",
      observedTo: "2027-01-01T23:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evaluationTimestamp: "2027-01-02T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 4,
        positive_signal_count: 1,
        neutral_signal_count: 2,
        negative_signal_count: 1,
      },
      evidenceIds: ["EVID-X2"],
      uncertaintyNote: "x",
      limitations: "x",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const overlapReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post24Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_72H",
      observedFrom: "2027-01-01T18:00:00.000Z",
      observedTo: "2027-01-03T12:00:00.000Z",
      capturedAt: "2027-01-03T12:10:00.000Z",
      evaluationTimestamp: "2027-01-03T12:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 5,
        positive_signal_count: 1,
        neutral_signal_count: 3,
        negative_signal_count: 1,
      },
      evidenceIds: ["EVID-X3"],
      uncertaintyNote: "x",
      limitations: "x",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const futureWindowReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post12Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_24H",
      observedFrom: "2027-01-01T12:00:00.000Z",
      observedTo: "2027-01-02T00:00:00.000Z",
      capturedAt: "2027-01-02T00:10:00.000Z",
      evaluationTimestamp: "2027-01-01T23:59:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 5,
        positive_signal_count: 2,
        neutral_signal_count: 2,
        negative_signal_count: 1,
      },
      evidenceIds: ["EVID-X4"],
      uncertaintyNote: "x",
      limitations: "x",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const negativeMetricReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post24Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_72H",
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evaluationTimestamp: "2027-01-04T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: -1,
      },
      evidenceIds: ["EVID-X5"],
      uncertaintyNote: "x",
      limitations: "x",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const sentimentOverflowReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post24Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_72H",
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evaluationTimestamp: "2027-01-04T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 2,
        positive_signal_count: 2,
        neutral_signal_count: 2,
        negative_signal_count: 0,
      },
      evidenceIds: ["EVID-X6"],
      uncertaintyNote: "x",
      limitations: "x",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const rawContentReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post24Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_72H",
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evaluationTimestamp: "2027-01-04T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 2,
        positive_signal_count: 1,
        neutral_signal_count: 1,
        negative_signal_count: 0,
      },
      evidenceIds: ["EVID-X7"],
      uncertaintyNote: "x",
      limitations: "raw post text",
      sourceReferenceLabels: ["x"],
    }).recorded === false;

  const accountIdentityReject =
    recordPipPublicCommunicationOutcomeObservationSnapshot({
      observationCase: post24Recorded.updated_observation_case,
      actorRole: "ANALYST",
      actorAlias: "OBS-65A00003",
      windowType: "POST_PUBLICATION_72H",
      observedFrom: "2027-01-02T00:00:00.000Z",
      observedTo: "2027-01-04T00:00:00.000Z",
      capturedAt: "2027-01-04T00:10:00.000Z",
      evaluationTimestamp: "2027-01-04T00:10:00.000Z",
      sourceMethod: "MANUAL_AGGREGATE_ENTRY",
      aggregateMetrics: {
        public_signal_count: 2,
        positive_signal_count: 1,
        neutral_signal_count: 1,
        negative_signal_count: 0,
      },
      evidenceIds: ["EVID-X8"],
      uncertaintyNote: "x",
      limitations: "ok",
      sourceReferenceLabels: ["@real-handle"],
    }).recorded === false;

  const mutationReject =
    detectPipPublicCommunicationOutcomeObservationSourceMutation({
      observationCase: createAnalyst.observation_case,
      boundaryPackage: {
        ...boundaryPackages[0],
        source_queue_fingerprint: "MUTATED",
      },
    }).mutated === true;

  const returnCorrection = returnPipPublicCommunicationOutcomeObservationForCorrection({
    observationCase: post24Recorded.updated_observation_case,
    actorRole: "ANALYST",
    actorAlias: "OBS-65A00004",
    correctionNote: "Need corrected baseline metrics.",
  });

  const voidUnstarted = voidPipPublicCommunicationUnstartedOutcomeObservation({
    observationCase: createAnalyst.observation_case,
    actorRole: "ADMINISTRATOR",
    actorAlias: "OBS-65A00005",
    voidReason: "Void before snapshots.",
  });

  const voidStartedReject =
    voidPipPublicCommunicationUnstartedOutcomeObservation({
      observationCase: post24Recorded.updated_observation_case,
      actorRole: "ADMINISTRATOR",
      actorAlias: "OBS-65A00005",
      voidReason: "Cannot void started.",
    }).voided === false;

  const p999ProductionReject =
    evaluatePipPublicCommunicationOutcomeObservationEligibility({
      boundaryPackage: {
        ...boundaryPackages[2],
        geography_scope: "MELAKA/P999",
        validation_fixture: false,
        production_eligible: true,
      },
      validationFixture: false,
    }).eligible === false;

  const createdCases = [
    createAnalyst.observation_case,
    post6Recorded.updated_observation_case,
    post12Recorded.updated_observation_case,
    post24Recorded.updated_observation_case,
    post72Recorded.updated_observation_case,
    completeSuccess.updated_observation_case,
    ...boundaryPackages.slice(2, 4).map((entry, index) =>
      createPipPublicCommunicationOutcomeObservationCase({
        boundaryPackage: entry,
        actorRole: "ANALYST",
        actorAlias: `OBS-65A${String(index + 20).padStart(5, "0")}`,
        validationFixture: true,
      }).observation_case
    ),
  ].filter(Boolean).slice(0, 8);

  const fixtureCollection = {
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_COLLECTION_SCHEMA,
    generated_at: "2027-01-08T01:00:00.000Z",
    production_observation_cases: [],
    fixture_observation_cases: createdCases,
    blocked_evaluations: [],
    validation: { valid: true, errors: [] },
    safety: {
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
      automatic_ingestion_performed: false,
      platform_connection_performed_by_pip: false,
      platform_authentication_performed_by_pip: false,
    },
  };

  fixtureCollection.summary = buildPipPublicCommunicationOutcomeObservationSummary({
    sourceBoundaryPackageCount: 8,
    eligibleSourcePackageCount: 8,
    productionObservationCases: [],
    fixtureObservationCases: createdCases,
    blockedEvaluations: [],
  });

  const checks = {
    eight_boundary_packages: boundaryPackages.length === 8,
    eight_observation_cases: createdCases.length === 8,
    all_statuses_present: Object.values(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES
    ).every((status) =>
      createdCases.some((entry) => sanitizeUpper(entry.current_status, 180) === status)
    ),
    all_window_types_present: Object.values(
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_WINDOW_TYPES
    ).every((type) =>
      [
        completeSuccess.updated_observation_case?.baseline_snapshot,
        ...(completeSuccess.updated_observation_case?.post_publication_snapshots ?? []),
      ]
        .filter(Boolean)
        .some((snapshot) => sanitizeUpper(snapshot.window_type, 80) === type)
    ),
    unverified_publication_rejection:
      evaluatePipPublicCommunicationOutcomeObservationEligibility({
        boundaryPackage: {
          ...boundaryPackages[1],
          verified_publication_linked: false,
        },
        validationFixture: true,
      }).eligible === false,
    invalid_publication_url_rejection: invalidUrlReject,
    invalid_publication_timestamp_rejection: invalidTimestampReject,
    duplicate_case_rejection: duplicateReject,
    source_fingerprint_mutation_rejection: mutationReject,
    baseline_after_publication_rejection: baselineAfterPublicationReject,
    missing_6h_window_rejection: missing6WindowRejection,
    missing_12h_window_rejection: missing12WindowRejection,
    post_window_before_publication_rejection: postBeforePublicationReject,
    overlapping_window_rejection: overlapReject,
    overlap_6h_12h_rejection: overlap6h12hRejection,
    overlap_12h_24h_rejection: overlap12h24hRejection,
    future_window_rejection: futureWindowReject,
    early_6h_capture_rejection: early6hCaptureRejection,
    early_12h_capture_rejection: early12hCaptureRejection,
    early_24h_capture_rejection: early24hCaptureRejection,
    early_72h_capture_rejection: early72hCaptureRejection,
    unsupported_7d_window_rejection: unsupported7dWindowRejection,
    negative_metric_rejection: negativeMetricReject,
    sentiment_overflow_rejection: sentimentOverflowReject,
    raw_content_rejection: rawContentReject,
    account_identity_rejection: accountIdentityReject,
    viewer_case_creation_rejection: createRejectViewer.created === false,
    analyst_case_creation_success: createAnalyst.created === true,
    analyst_snapshot_recording_success: baselineRecorded.recorded === true,
    administrator_completion_success: completeSuccess.completed === true,
    completion_missing_windows_rejection: completionFourWindowsRejected,
    completion_with_four_of_five_windows_rejected: completionFourWindowsRejected,
    completion_with_all_five_windows_accepted: completeSuccess.completed === true,
    return_for_correction_success: returnCorrection.returned === true,
    void_unstarted_success: voidUnstarted.voided === true,
    void_started_rejection: voidStartedReject,
    p999_production_observation_rejection: p999ProductionReject,
    fixture_excluded_from_production_totals:
      fixtureCollection.summary.production_observation_case_count === 0,
    completion_terminal_status:
      sanitizeUpper(completeSuccess.updated_observation_case?.current_status, 180) ===
      PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_STATUSES.OBSERVATION_WINDOW_COMPLETE,
    completion_effectiveness_boundary:
      sanitizeUpper(
        completeSuccess.updated_observation_case?.outcome_effectiveness_classification,
        80
      ) === "NOT_EVALUATED",
    completion_causality_boundary:
      sanitizeUpper(
        completeSuccess.updated_observation_case?.causal_attribution_status,
        80
      ) === "NOT_PERFORMED",
    completion_recommendation_boundary:
      sanitizeUpper(
        completeSuccess.updated_observation_case?.follow_up_response_recommendation_status,
        80
      ) === "NOT_GENERATED",
  };

  const exportPayload = sanitizeExport({
    schema: PIP_PUBLIC_COMMUNICATION_OUTCOME_OBSERVATION_EXPORT_SCHEMA,
    generated_at: "2027-01-08T01:00:00.000Z",
    observation_summary: fixtureCollection.summary,
    production_observation_cases: [],
    fixture_observation_cases: createdCases,
    blocked_evaluations: [],
    sanitized_aggregate_snapshots: [
      completeSuccess.updated_observation_case?.baseline_snapshot,
      ...(completeSuccess.updated_observation_case?.post_publication_snapshots ?? []),
    ].filter(Boolean),
    transition_receipts: [],
    completion_receipts: [],
    correction_receipts: [],
    void_receipts: [],
    collection_validation_result: fixtureCollection.validation,
    safety_manifest: fixtureCollection.safety,
  });

  return {
    collection: fixtureCollection,
    checks,
    export_payload: exportPayload,
    fixture_inputs: {
      boundary_packages: boundaryPackages,
    },
  };
}

export function sanitizePipPublicCommunicationOutcomeObservationExport(payload = {}) {
  return sanitizeExport(payload);
}

export function serializePipPublicCommunicationOutcomeObservationExport(payload = {}) {
  return JSON.stringify(sanitizePipPublicCommunicationOutcomeObservationExport(payload), null, 2);
}

export function createPipPublicCommunicationOutcomeObservationExportFileName({
  generatedAt,
  scope = "P134",
  suffix = "outcome-observation",
} = {}) {
  const iso = normalizeIso(generatedAt) ?? new Date().toISOString();
  const compact = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeScope = sanitizeText(scope, 40).replace(/[^A-Za-z0-9_-]/g, "_");
  const safeSuffix = sanitizeText(suffix, 64).replace(/[^A-Za-z0-9_-]/g, "_");
  return `pip-public-communication-${safeSuffix}-${safeScope}-${compact}.json`;
}

export function buildPipPublicCommunicationOutcomeObservationManifestValidationResult() {
  const manifest = buildPipPublicCommunicationOutcomeObservationContractManifest();
  return validatePipPublicCommunicationOutcomeObservationContractManifest(manifest);
}
