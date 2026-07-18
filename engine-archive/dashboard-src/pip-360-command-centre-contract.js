export const PIP_360_COMMAND_CENTRE_CONTRACT_SCHEMA =
  "pip.360-command-centre.contract.v1";

export const PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA =
  "pip.360-command-centre.snapshot.v1";

export const PIP_360_STATEWIDE_OVERVIEW_SCHEMA =
  "pip.360-command-centre.statewide-overview.v1";

export const PIP_360_DAILY_SENTIMENT_SCHEMA =
  "pip.360-command-centre.daily-sentiment.v1";

export const PIP_360_NARRATIVE_RADAR_SCHEMA =
  "pip.360-command-centre.narrative-radar.v1";

export const PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA =
  "pip.360-command-centre.locality-signal-map.v1";

export const PIP_360_ISSUE_ESCALATION_SCHEMA =
  "pip.360-command-centre.issue-escalation.v1";

export const PIP_360_EVIDENCE_CENTRE_SCHEMA =
  "pip.360-command-centre.evidence-centre.v1";

export const PIP_360_OPERATIONAL_QUEUE_SCHEMA =
  "pip.360-command-centre.operational-queue.v1";

export const PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA =
  "pip.360-command-centre.export.v1";

export const PIP_360_COMMAND_CENTRE_STATUSES = Object.freeze({
  READY: "READY",
  PARTIAL: "PARTIAL",
  NO_VERIFIED_SIGNALS: "NO_VERIFIED_SIGNALS",
  VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  INVALID: "INVALID",
});

export const PIP_360_COVERAGE_STATUSES = Object.freeze({
  COMPLETE_PRODUCTION_COVERAGE: "COMPLETE_PRODUCTION_COVERAGE",
  PARTIAL_PRODUCTION_COVERAGE: "PARTIAL_PRODUCTION_COVERAGE",
  ACTIVE_CONSTITUENCY_ONLY: "ACTIVE_CONSTITUENCY_ONLY",
  VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
  NO_PRODUCTION_COVERAGE: "NO_PRODUCTION_COVERAGE",
});

export const PIP_360_ESCALATION_CLASSIFICATIONS = Object.freeze({
  INFORMATIONAL: "INFORMATIONAL",
  MONITOR: "MONITOR",
  EVIDENCE_REVIEW_REQUIRED: "EVIDENCE_REVIEW_REQUIRED",
  GEOGRAPHY_REVIEW_REQUIRED: "GEOGRAPHY_REVIEW_REQUIRED",
  HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
});

export const PIP_360_OPERATIONAL_QUEUE_STATUSES = Object.freeze({
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  WAITING_FOR_EVIDENCE: "WAITING_FOR_EVIDENCE",
  WAITING_FOR_GEOGRAPHY_REVIEW: "WAITING_FOR_GEOGRAPHY_REVIEW",
  RESOLVED: "RESOLVED",
  NO_VERIFIED_ITEM: "NO_VERIFIED_ITEM",
});

export const PIP_360_COMMAND_CENTRE_TIME_WINDOWS = Object.freeze({
  LAST_24_HOURS: "LAST_24_HOURS",
  LAST_72_HOURS: "LAST_72_HOURS",
  LAST_7_DAYS: "LAST_7_DAYS",
});

const FORBIDDEN_KEY_PATTERN =
  /(post_text|comment_text|caption_text|username|account_id|phone|email|api_token|secret|password|personal_address|voter_id|voter_identifier|national_id|nric|ic_number|preference_inference|electoral_prediction|electoral_forecast|persuasion_score|targeting_recommendation)/i;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function hasForbiddenKeys(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenKeys(entry));
  }
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, entry]) => {
    if (FORBIDDEN_KEY_PATTERN.test(String(key))) {
      return true;
    }
    return hasForbiddenKeys(entry);
  });
}

function enumIncludes(enumSet, value) {
  return Object.values(enumSet).includes(String(value ?? "").toUpperCase());
}

export function buildPip360CommandCentreContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_360_COMMAND_CENTRE_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    snapshot_schema: PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA,
    statewide_overview_schema: PIP_360_STATEWIDE_OVERVIEW_SCHEMA,
    daily_sentiment_schema: PIP_360_DAILY_SENTIMENT_SCHEMA,
    narrative_radar_schema: PIP_360_NARRATIVE_RADAR_SCHEMA,
    locality_signal_map_schema: PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA,
    issue_escalation_schema: PIP_360_ISSUE_ESCALATION_SCHEMA,
    evidence_centre_schema: PIP_360_EVIDENCE_CENTRE_SCHEMA,
    operational_queue_schema: PIP_360_OPERATIONAL_QUEUE_SCHEMA,
    export_schema: PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA,
    statuses: { ...PIP_360_COMMAND_CENTRE_STATUSES },
    coverage_statuses: { ...PIP_360_COVERAGE_STATUSES },
    escalation_classifications: { ...PIP_360_ESCALATION_CLASSIFICATIONS },
    operational_queue_statuses: { ...PIP_360_OPERATIONAL_QUEUE_STATUSES },
    time_windows: { ...PIP_360_COMMAND_CENTRE_TIME_WINDOWS },
    summary: {
      descriptive_intelligence_only: true,
      human_review_required: true,
      response_recommendation_enabled: false,
      automated_response_enabled: false,
      automated_publication_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      persuasion_scoring_enabled: false,
      individual_targeting_enabled: false,
      political_affiliation_inference_enabled: false,
      demographic_signal_correlation_enabled: false,
      demographic_issue_correlation_enabled: false,
      combined_population_signal_score_enabled: false,
      raw_public_content_persisted: false,
      public_account_identity_persisted: false,
      voter_records_included: false,
      voter_identifiers_included: false,
      validation_fixture_separated: true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
      external_network_access_enabled: false,
      automatic_ingestion_enabled: false,
      automatic_refresh_enabled: false,
      recurring_timer_enabled: false,
      browser_storage_modified: false,
      central_repository_modified: false,
    },
  };
}

export function validatePip360CommandCentreContractManifest(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const errors = [];

  const requiredSchemas = {
    schema: PIP_360_COMMAND_CENTRE_CONTRACT_SCHEMA,
    snapshot_schema: PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA,
    statewide_overview_schema: PIP_360_STATEWIDE_OVERVIEW_SCHEMA,
    daily_sentiment_schema: PIP_360_DAILY_SENTIMENT_SCHEMA,
    narrative_radar_schema: PIP_360_NARRATIVE_RADAR_SCHEMA,
    locality_signal_map_schema: PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA,
    issue_escalation_schema: PIP_360_ISSUE_ESCALATION_SCHEMA,
    evidence_centre_schema: PIP_360_EVIDENCE_CENTRE_SCHEMA,
    operational_queue_schema: PIP_360_OPERATIONAL_QUEUE_SCHEMA,
    export_schema: PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA,
  };

  Object.entries(requiredSchemas).forEach(([key, expected]) => {
    if (safe[key] !== expected) {
      errors.push(`${key} mismatch.`);
    }
  });

  [
    ["statuses", PIP_360_COMMAND_CENTRE_STATUSES],
    ["coverage_statuses", PIP_360_COVERAGE_STATUSES],
    ["escalation_classifications", PIP_360_ESCALATION_CLASSIFICATIONS],
    ["operational_queue_statuses", PIP_360_OPERATIONAL_QUEUE_STATUSES],
    ["time_windows", PIP_360_COMMAND_CENTRE_TIME_WINDOWS],
  ].forEach(([key, expected]) => {
    if (JSON.stringify(safe[key]) !== JSON.stringify(expected)) {
      errors.push(`${key} must match exported constants.`);
    }
  });

  const requiredFlags = {
    descriptive_intelligence_only: true,
    human_review_required: true,
    response_recommendation_enabled: false,
    automated_response_enabled: false,
    automated_publication_enabled: false,
    voter_preference_inference_enabled: false,
    election_prediction_enabled: false,
    persuasion_scoring_enabled: false,
    individual_targeting_enabled: false,
    political_affiliation_inference_enabled: false,
    demographic_signal_correlation_enabled: false,
    demographic_issue_correlation_enabled: false,
    combined_population_signal_score_enabled: false,
    raw_public_content_persisted: false,
    public_account_identity_persisted: false,
    voter_records_included: false,
    voter_identifiers_included: false,
    validation_fixture_separated: true,
    p999_fixture_separated: true,
    production_totals_exclude_validation_fixtures: true,
    external_network_access_enabled: false,
    automatic_ingestion_enabled: false,
    automatic_refresh_enabled: false,
    recurring_timer_enabled: false,
    browser_storage_modified: false,
    central_repository_modified: false,
  };

  Object.entries(requiredFlags).forEach(([key, expected]) => {
    if (summary[key] !== expected) {
      errors.push(`${key} must be ${String(expected)}.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360StatewideOverview(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_360_STATEWIDE_OVERVIEW_SCHEMA) {
    errors.push("statewide overview schema mismatch.");
  }

  if (!enumIncludes(PIP_360_COVERAGE_STATUSES, safe.coverage_status)) {
    errors.push("coverage_status must be valid.");
  }

  const requiredNumericKeys = [
    "registered_constituency_count",
    "loaded_constituency_count",
    "loaded_production_constituency_count",
    "loaded_validation_fixture_count",
    "represented_state_count",
    "production_voter_total",
    "production_dun_count",
    "production_dm_count",
    "production_locality_count",
    "verified_public_signal_count",
    "evidence_count",
  ];

  requiredNumericKeys.forEach((key) => {
    if (!Number.isFinite(Number(safe[key]))) {
      errors.push(`${key} must be numeric.`);
    }
  });

  if (
    safe.coverage_status ===
      PIP_360_COVERAGE_STATUSES.COMPLETE_PRODUCTION_COVERAGE &&
    Number(safe.loaded_production_constituency_count) <
      Number(safe.registered_constituency_count)
  ) {
    errors.push("complete production coverage cannot be declared while loading is incomplete.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360DailySentiment(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const records = Array.isArray(safe.records) ? safe.records : [];
  const errors = [];

  if (safe.schema !== PIP_360_DAILY_SENTIMENT_SCHEMA) {
    errors.push("daily sentiment schema mismatch.");
  }

  records.forEach((entry, index) => {
    const item = isPlainObject(entry) ? entry : {};
    [
      "positive_observation_count",
      "neutral_observation_count",
      "negative_observation_count",
      "total_classified_observation_count",
      "insufficient_evidence_observation_count",
      "evidence_count",
      "source_count",
    ].forEach((key) => {
      if (!Number.isFinite(Number(item[key]))) {
        errors.push(`daily_sentiment.records[${index}].${key} must be numeric.`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360NarrativeRadar(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const records = Array.isArray(safe.records) ? safe.records : [];
  const errors = [];

  if (safe.schema !== PIP_360_NARRATIVE_RADAR_SCHEMA) {
    errors.push("narrative radar schema mismatch.");
  }

  records.forEach((entry, index) => {
    const item = isPlainObject(entry) ? entry : {};
    if (!sanitizeText(item.issue_label, 160)) {
      errors.push(`narrative_radar.records[${index}].issue_label is required.`);
    }
    if (!Number.isFinite(Number(item.observation_count))) {
      errors.push(`narrative_radar.records[${index}].observation_count must be numeric.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360LocalitySignalMap(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const rows = Array.isArray(safe.rows) ? safe.rows : [];
  const errors = [];

  if (safe.schema !== PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA) {
    errors.push("locality signal map schema mismatch.");
  }

  rows.forEach((entry, index) => {
    const item = isPlainObject(entry) ? entry : {};
    ["state_name", "parliament_name", "dun_name", "dm_name", "locality_name"].forEach(
      (key) => {
        if (!sanitizeText(item[key], 160)) {
          errors.push(`locality_signal_map.rows[${index}].${key} is required.`);
        }
      }
    );
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360IssueEscalation(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const items = Array.isArray(safe.items) ? safe.items : [];
  const errors = [];

  if (safe.schema !== PIP_360_ISSUE_ESCALATION_SCHEMA) {
    errors.push("issue escalation schema mismatch.");
  }

  items.forEach((entry, index) => {
    const item = isPlainObject(entry) ? entry : {};
    if (!enumIncludes(PIP_360_ESCALATION_CLASSIFICATIONS, item.classification)) {
      errors.push(`issue_escalation.items[${index}].classification must be valid.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360EvidenceCentre(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const items = Array.isArray(safe.items) ? safe.items : [];
  const errors = [];

  if (safe.schema !== PIP_360_EVIDENCE_CENTRE_SCHEMA) {
    errors.push("evidence centre schema mismatch.");
  }

  const references = new Set();
  items.forEach((entry, index) => {
    const item = isPlainObject(entry) ? entry : {};
    const reference = sanitizeText(item.evidence_reference, 200);
    if (!reference) {
      errors.push(`evidence_centre.items[${index}].evidence_reference is required.`);
      return;
    }
    if (references.has(reference)) {
      errors.push(`evidence_centre.items[${index}].evidence_reference must be deduplicated.`);
      return;
    }
    references.add(reference);
  });

  if (hasForbiddenKeys(safe)) {
    errors.push("evidence centre contains forbidden key material.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360OperationalQueue(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const items = Array.isArray(safe.items) ? safe.items : [];
  const errors = [];

  if (safe.schema !== PIP_360_OPERATIONAL_QUEUE_SCHEMA) {
    errors.push("operational queue schema mismatch.");
  }

  items.forEach((entry, index) => {
    const item = isPlainObject(entry) ? entry : {};
    if (!enumIncludes(PIP_360_OPERATIONAL_QUEUE_STATUSES, item.queue_status)) {
      errors.push(`operational_queue.items[${index}].queue_status must be valid.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function validatePip360CommandCentreSnapshot(input = {}) {
  const safe = isPlainObject(input) ? input : {};
  const errors = [];

  if (safe.schema !== PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA) {
    errors.push("snapshot schema mismatch.");
  }

  if (!enumIncludes(PIP_360_COMMAND_CENTRE_STATUSES, safe.status)) {
    errors.push("snapshot status must be valid.");
  }

  const statewide = validatePip360StatewideOverview(safe.statewide_overview);
  const daily = validatePip360DailySentiment(safe.daily_sentiment);
  const narratives = validatePip360NarrativeRadar(safe.narrative_radar);
  const localityMap = validatePip360LocalitySignalMap(safe.locality_signal_map);
  const escalation = validatePip360IssueEscalation(safe.issue_escalation);
  const evidence = validatePip360EvidenceCentre(safe.evidence_centre);
  const queue = validatePip360OperationalQueue(safe.operational_queue);

  [statewide, daily, narratives, localityMap, escalation, evidence, queue].forEach(
    (validation) => {
      if (validation.valid !== true) {
        errors.push(...validation.errors);
      }
    }
  );

  const forbiddenSections = [
    safe.statewide_overview,
    safe.daily_sentiment,
    safe.narrative_radar,
    safe.locality_signal_map,
    safe.issue_escalation,
    safe.evidence_centre,
    safe.operational_queue,
  ];

  if (forbiddenSections.some((entry) => hasForbiddenKeys(entry))) {
    errors.push("snapshot contains forbidden key material.");
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: safe,
  };
}

export function sanitizePip360CommandCentreExport(input = {}) {
  const safe = isPlainObject(input) ? input : {};

  const output = {
    schema: PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA,
    generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
    contract_schema: sanitizeText(safe.contract_schema, 160),
    snapshot_schema: sanitizeText(safe.snapshot_schema, 160),
    scope_disclosure: sanitizeText(safe.scope_disclosure, 320),
    statewide_overview: isPlainObject(safe.statewide_overview)
      ? safe.statewide_overview
      : {},
    daily_sentiment: isPlainObject(safe.daily_sentiment)
      ? safe.daily_sentiment
      : {},
    narrative_radar: isPlainObject(safe.narrative_radar)
      ? safe.narrative_radar
      : {},
    locality_signal_map: isPlainObject(safe.locality_signal_map)
      ? safe.locality_signal_map
      : {},
    issue_escalation: isPlainObject(safe.issue_escalation)
      ? safe.issue_escalation
      : {},
    evidence_centre: isPlainObject(safe.evidence_centre)
      ? safe.evidence_centre
      : {},
    operational_queue: isPlainObject(safe.operational_queue)
      ? safe.operational_queue
      : {},
    fixture_disclosures: isPlainObject(safe.fixture_disclosures)
      ? safe.fixture_disclosures
      : {},
    safety_guards: isPlainObject(safe.safety_guards)
      ? safe.safety_guards
      : {},
    validation_result: isPlainObject(safe.validation_result)
      ? safe.validation_result
      : {},
  };

  if (hasForbiddenKeys(output)) {
    return {
      schema: PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA,
      generated_at: new Date().toISOString(),
      contract_schema: PIP_360_COMMAND_CENTRE_CONTRACT_SCHEMA,
      snapshot_schema: PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA,
      scope_disclosure:
        "Descriptive aggregate-only export. Forbidden sensitive keys removed.",
      statewide_overview: {},
      daily_sentiment: { schema: PIP_360_DAILY_SENTIMENT_SCHEMA, records: [] },
      narrative_radar: { schema: PIP_360_NARRATIVE_RADAR_SCHEMA, records: [] },
      locality_signal_map: { schema: PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA, rows: [] },
      issue_escalation: { schema: PIP_360_ISSUE_ESCALATION_SCHEMA, items: [] },
      evidence_centre: { schema: PIP_360_EVIDENCE_CENTRE_SCHEMA, items: [] },
      operational_queue: { schema: PIP_360_OPERATIONAL_QUEUE_SCHEMA, items: [] },
      fixture_disclosures: {},
      safety_guards: {},
      validation_result: {
        valid: false,
        errors: ["Forbidden key material detected in export payload."],
      },
    };
  }

  return output;
}
