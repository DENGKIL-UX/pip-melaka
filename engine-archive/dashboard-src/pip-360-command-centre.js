import {
  PIP_360_COMMAND_CENTRE_CONTRACT_SCHEMA,
  PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA,
  PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA,
  PIP_360_COMMAND_CENTRE_STATUSES,
  PIP_360_COMMAND_CENTRE_TIME_WINDOWS,
  PIP_360_COVERAGE_STATUSES,
  PIP_360_DAILY_SENTIMENT_SCHEMA,
  PIP_360_ESCALATION_CLASSIFICATIONS,
  PIP_360_EVIDENCE_CENTRE_SCHEMA,
  PIP_360_ISSUE_ESCALATION_SCHEMA,
  PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA,
  PIP_360_NARRATIVE_RADAR_SCHEMA,
  PIP_360_OPERATIONAL_QUEUE_SCHEMA,
  PIP_360_OPERATIONAL_QUEUE_STATUSES,
  PIP_360_STATEWIDE_OVERVIEW_SCHEMA,
  sanitizePip360CommandCentreExport,
  validatePip360CommandCentreSnapshot,
} from "./pip-360-command-centre-contract.js";
import {
  buildPip360DualLayerLocalityContextCollection,
  buildPip360DualLayerLocalityValidationFixture,
} from "./pip-360-dual-layer-locality-context.js";
import {
  PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES,
  PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS,
  PIP_360_TREND_CLASSIFICATIONS,
  PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS,
  sanitizePip360PublicSignalSummary,
  validatePip360PublicSignalSummary,
} from "./pip-360-dual-layer-locality-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, max = 180) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeCode(value, max = 32) {
  return sanitizeText(value, max).toUpperCase();
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSorted(values) {
  return Array.from(
    new Set(values.map((entry) => sanitizeText(entry, 180)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function getBundleMetadata(bundle) {
  const metadata = isPlainObject(bundle?.metadata) ? bundle.metadata : {};
  const constituency = isPlainObject(metadata.constituency) ? metadata.constituency : {};
  const validationFixture =
    metadata.validation_fixture === true ||
    constituency.validation_fixture === true ||
    normalizeCode(constituency.parliament_code, 16) === "P999";

  return {
    metadata,
    constituency,
    validationFixture,
  };
}

function collectLoadedBundles({ primaryConstituencyBundle, comparisonConstituencyBundle }) {
  const bundles = [primaryConstituencyBundle, comparisonConstituencyBundle].filter((entry) =>
    isPlainObject(entry)
  );

  return bundles.map((bundle) => {
    const meta = getBundleMetadata(bundle);
    const overview = isPlainObject(bundle.overview) ? bundle.overview : {};
    const totalVoters = normalizeNumber(overview.metrics?.total_voters, 0);
    const dunCount = toArray(bundle.dunRecords).length;
    const dmCount = toArray(bundle.dmRecords).length;
    const localityCount = toArray(bundle.localityRecords).length;

    return {
      bundle,
      code: normalizeCode(meta.constituency.parliament_code, 16),
      state: sanitizeText(meta.constituency.state_name, 120).toUpperCase(),
      validationFixture: meta.validationFixture,
      totalVoters,
      dunCount,
      dmCount,
      localityCount,
    };
  });
}

function deriveCoverageStatus({
  registeredConstituencyCount,
  loadedConstituencyCount,
  loadedProductionConstituencyCount,
  loadedValidationFixtureCount,
} = {}) {
  if (loadedProductionConstituencyCount <= 0 && loadedValidationFixtureCount > 0) {
    return PIP_360_COVERAGE_STATUSES.VALIDATION_FIXTURE_ONLY;
  }
  if (loadedProductionConstituencyCount <= 0) {
    return PIP_360_COVERAGE_STATUSES.NO_PRODUCTION_COVERAGE;
  }
  // Batch 62C command-centre outputs are always a loaded subset view; avoid claiming
  // complete statewide production coverage from dashboard-loaded bundles.
  return PIP_360_COVERAGE_STATUSES.PARTIAL_PRODUCTION_COVERAGE;
}

function filterByTimeWindow(records, timeWindow) {
  const now = Date.now();
  const hours =
    timeWindow === PIP_360_COMMAND_CENTRE_TIME_WINDOWS.LAST_24_HOURS
      ? 24
      : timeWindow === PIP_360_COMMAND_CENTRE_TIME_WINDOWS.LAST_72_HOURS
      ? 72
      : 24 * 7;
  const minTime = now - hours * 60 * 60 * 1000;

  return records.filter((entry) => {
    const stamp = normalizeIso(entry.observation_window_end ?? entry.observation_window_start);
    if (!stamp) {
      return true;
    }
    return Date.parse(stamp) >= minTime;
  });
}

export function buildPip360StatewideOverview({
  constituencyRegistry,
  primaryConstituencyBundle,
  comparisonConstituencyBundle,
  dashboardData,
  dunRecords,
  dmRecords,
  localityRecords,
  publicSignalSummaries,
} = {}) {
  const loadedBundles = collectLoadedBundles({
    primaryConstituencyBundle,
    comparisonConstituencyBundle,
  });

  const registeredConstituencyCount =
    toArray(constituencyRegistry?.constituencies).length ||
    toArray(constituencyRegistry).length ||
    0;

  const loadedConstituencyCount = loadedBundles.length;
  const loadedProductionConstituencyCount = loadedBundles.filter(
    (entry) => entry.validationFixture !== true
  ).length;
  const loadedValidationFixtureCount = loadedBundles.filter(
    (entry) => entry.validationFixture === true
  ).length;
  const representedStateCount = uniqueSorted(loadedBundles.map((entry) => entry.state)).length;

  const productionVoterTotal = loadedBundles
    .filter((entry) => entry.validationFixture !== true)
    .reduce((acc, entry) => acc + entry.totalVoters, 0);

  const productionDunCount = loadedBundles
    .filter((entry) => entry.validationFixture !== true)
    .reduce((acc, entry) => acc + entry.dunCount, 0);

  const productionDmCount = loadedBundles
    .filter((entry) => entry.validationFixture !== true)
    .reduce((acc, entry) => acc + entry.dmCount, 0);

  const productionLocalityCount = loadedBundles
    .filter((entry) => entry.validationFixture !== true)
    .reduce((acc, entry) => acc + entry.localityCount, 0);

  const summaries = toArray(publicSignalSummaries);
  const verifiedPublicSignalCount = summaries.filter((entry) => entry.production_signal === true).length;
  const evidenceCount = summaries.reduce(
    (acc, entry) => acc + normalizeNumber(entry.evidence_count, 0),
    0
  );

  const coverageStatus = deriveCoverageStatus({
    registeredConstituencyCount,
    loadedConstituencyCount,
    loadedProductionConstituencyCount,
    loadedValidationFixtureCount,
  });

  const incompleteCoverage =
    coverageStatus !== PIP_360_COVERAGE_STATUSES.COMPLETE_PRODUCTION_COVERAGE;

  return {
    schema: PIP_360_STATEWIDE_OVERVIEW_SCHEMA,
    registered_constituency_count: registeredConstituencyCount,
    loaded_constituency_count: loadedConstituencyCount,
    loaded_production_constituency_count: loadedProductionConstituencyCount,
    loaded_validation_fixture_count: loadedValidationFixtureCount,
    represented_state_count: representedStateCount,
    production_voter_total: productionVoterTotal,
    production_dun_count: productionDunCount || toArray(dunRecords).length,
    production_dm_count: productionDmCount || toArray(dmRecords).length,
    production_locality_count: productionLocalityCount || toArray(localityRecords).length,
    verified_public_signal_count: verifiedPublicSignalCount,
    evidence_count: evidenceCount,
    coverage_status: coverageStatus,
    coverage_disclosure: incompleteCoverage
      ? "LOADED-COVERAGE OVERVIEW - NOT A COMPLETE STATEWIDE TOTAL"
      : "COMPLETE PRODUCTION COVERAGE",
    source_disclosure:
      "Aggregate-only overview. Production totals exclude validation fixture constituencies.",
    dashboard_scope: sanitizeText(dashboardData?.datasetLabel, 160) || "PIP aggregate dashboard",
  };
}

export function buildPip360DailySentiment({
  publicSignalSummaries,
  timeWindow = PIP_360_COMMAND_CENTRE_TIME_WINDOWS.LAST_24_HOURS,
  includeFixture = true,
} = {}) {
  const safeSummaries = toArray(publicSignalSummaries);
  const windowFilteredRecords = filterByTimeWindow(safeSummaries, timeWindow);
  const records =
    windowFilteredRecords.length > 0 ? windowFilteredRecords : safeSummaries;
  const grouped = new Map();

  records.forEach((entry) => {
    const dateKey = normalizeIso(entry.observation_window_end ?? entry.observation_window_start)?.slice(0, 10) ||
      "UNSPECIFIED_DATE";
    const key = `${dateKey}|${entry.validation_fixture === true ? "FIXTURE" : "PRODUCTION"}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        observation_date: dateKey,
        fixture: entry.validation_fixture === true,
        positive_observation_count: 0,
        neutral_observation_count: 0,
        negative_observation_count: 0,
        total_classified_observation_count: 0,
        insufficient_evidence_observation_count: 0,
        evidence_count: 0,
        source_count: 0,
        confidence_classification: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      });
    }

    const target = grouped.get(key);
    target.positive_observation_count += normalizeNumber(entry.positive_observation_count, 0);
    target.neutral_observation_count += normalizeNumber(entry.neutral_observation_count, 0);
    target.negative_observation_count += normalizeNumber(entry.negative_observation_count, 0);
    target.total_classified_observation_count += normalizeNumber(
      entry.total_sentiment_observation_count,
      0
    );
    if (
      sanitizeText(entry.sentiment_classification, 40).toUpperCase() ===
      "INSUFFICIENT_EVIDENCE"
    ) {
      target.insufficient_evidence_observation_count += 1;
    }
    target.evidence_count += normalizeNumber(entry.evidence_count, 0);
    target.source_count += normalizeNumber(entry.source_record_count, 0);

    const confidence = sanitizeText(entry.confidence_classification, 40).toUpperCase();
    if (confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED) {
      target.confidence_classification = PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED;
    } else if (
      confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.HIGH &&
      target.confidence_classification !== PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED
    ) {
      target.confidence_classification = PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.HIGH;
    }
  });

  const outputRecords = Array.from(grouped.values())
    .filter((entry) => includeFixture || entry.fixture !== true)
    .sort((a, b) => String(a.observation_date).localeCompare(String(b.observation_date)));

  return {
    schema: PIP_360_DAILY_SENTIMENT_SCHEMA,
    time_window: timeWindow,
    records: outputRecords,
    no_verified_daily_sentiment_available:
      outputRecords.filter((entry) => entry.fixture !== true).length === 0,
    disclosure:
      outputRecords.filter((entry) => entry.fixture === true).length > 0
        ? "VALIDATION FIXTURE - NON-PRODUCTION SENTIMENT"
        : "PRODUCTION DAILY SENTIMENT",
  };
}

export function buildPip360NarrativeRadar({
  publicSignalSummaries,
  timeWindow = PIP_360_COMMAND_CENTRE_TIME_WINDOWS.LAST_24_HOURS,
  includeFixture = true,
} = {}) {
  const safeSummaries = toArray(publicSignalSummaries);
  const windowFilteredRecords = filterByTimeWindow(safeSummaries, timeWindow);
  const records =
    windowFilteredRecords.length > 0 ? windowFilteredRecords : safeSummaries;
  const grouped = new Map();

  records.forEach((entry) => {
    const issueLabel = sanitizeText(entry.issue_label, 160) || "UNSPECIFIED_ISSUE";
    const issueCategory = sanitizeText(entry.issue_category, 120) || "UNSPECIFIED_CATEGORY";
    const fixture = entry.validation_fixture === true;
    const key = `${issueLabel}|${issueCategory}|${fixture ? "FIXTURE" : "PRODUCTION"}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        issue_label: issueLabel,
        issue_category: issueCategory,
        observation_count: 0,
        geography_coverage: new Set(),
        trend_classification: PIP_360_TREND_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
        narrative_velocity: PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
        narrative_velocity_score: 0,
        engagement_total: 0,
        evidence_count: 0,
        confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
        observation_window: null,
        fixture,
      });
    }

    const target = grouped.get(key);
    target.observation_count += normalizeNumber(entry.total_sentiment_observation_count, 0);
    target.geography_coverage.add(
      [
        normalizeCode(entry.state_code, 16),
        normalizeCode(entry.parliament_code, 16),
        normalizeCode(entry.dun_code, 16),
        normalizeCode(entry.dm_code, 16),
        normalizeCode(entry.locality_code, 40),
      ].join("/")
    );
    target.engagement_total += normalizeNumber(entry.total_public_engagement, 0);
    target.evidence_count += normalizeNumber(entry.evidence_count, 0);
    target.narrative_velocity_score += normalizeNumber(
      entry.narrative_observations_per_hour,
      0
    );

    const trend = sanitizeText(entry.trend_classification, 60).toUpperCase();
    if (trend === PIP_360_TREND_CLASSIFICATIONS.RISING || trend === PIP_360_TREND_CLASSIFICATIONS.EMERGING) {
      target.trend_classification = trend;
    }

    const velocity = sanitizeText(entry.narrative_velocity_classification, 60).toUpperCase();
    if (velocity) {
      target.narrative_velocity = velocity;
    }

    const confidence = sanitizeText(entry.confidence_classification, 60).toUpperCase();
    if (confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED) {
      target.confidence = confidence;
    }

    const windowStart = normalizeIso(entry.observation_window_start);
    const windowEnd = normalizeIso(entry.observation_window_end);
    if (windowStart || windowEnd) {
      target.observation_window = `${windowStart ?? "-"} to ${windowEnd ?? "-"}`;
    }
  });

  const output = Array.from(grouped.values())
    .filter((entry) => includeFixture || entry.fixture !== true)
    .map((entry) => ({
      issue_label: entry.issue_label,
      issue_category: entry.issue_category,
      observation_count: entry.observation_count,
      geography_coverage: entry.geography_coverage.size,
      trend_classification: entry.trend_classification,
      narrative_velocity: entry.narrative_velocity,
      narrative_velocity_score: Number(entry.narrative_velocity_score.toFixed(2)),
      engagement_total: entry.engagement_total,
      evidence_count: entry.evidence_count,
      confidence: entry.confidence,
      observation_window: entry.observation_window,
      fixture: entry.fixture,
      production_or_fixture_status: entry.fixture
        ? "VALIDATION_FIXTURE_ONLY"
        : "PRODUCTION",
    }))
    .sort((a, b) => {
      if (b.observation_count !== a.observation_count) {
        return b.observation_count - a.observation_count;
      }
      if (b.narrative_velocity_score !== a.narrative_velocity_score) {
        return b.narrative_velocity_score - a.narrative_velocity_score;
      }
      return b.evidence_count - a.evidence_count;
    });

  return {
    schema: PIP_360_NARRATIVE_RADAR_SCHEMA,
    time_window: timeWindow,
    records: output,
    no_verified_narratives_available:
      output.filter((entry) => entry.fixture !== true).length === 0,
  };
}

export function buildPip360LocalitySignalMap({
  dualLayerCollection,
  narrativeRadar,
} = {}) {
  const collectionItems = toArray(dualLayerCollection?.items);
  const issueLookup = new Map();

  toArray(narrativeRadar?.records).forEach((entry) => {
    issueLookup.set(sanitizeText(entry.issue_label, 160).toUpperCase(), entry);
  });

  const rows = collectionItems.map((entry) => {
    const identity = isPlainObject(entry.locality_identity) ? entry.locality_identity : {};
    const population = isPlainObject(entry.population_context) ? entry.population_context : {};
    const signal = isPlainObject(entry.public_signal_context)
      ? entry.public_signal_context
      : {};

    const issues = toArray(signal.current_issues).map((value) => sanitizeText(value, 160));
    const topIssue = issues[0] ? issueLookup.get(issues[0].toUpperCase()) : null;

    return {
      state_name: sanitizeText(identity.state_name, 120) || "-",
      parliament_name: sanitizeText(identity.parliament_name, 120) || "-",
      dun_name: sanitizeText(identity.dun_name, 120) || "-",
      dm_name: sanitizeText(identity.dm_name, 120) || "-",
      locality_name: sanitizeText(identity.locality_name, 160) || "-",
      geography_mapping_status: "EXACT_BATCH_62A_CHAIN",
      population_context_availability: sanitizeText(
        population.population_data_availability,
        40
      ) || "NOT_AVAILABLE",
      public_signal_context_status:
        sanitizeText(signal.context_status, 80) ||
        PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.NO_VERIFIED_SIGNALS,
      issue_count: issues.length,
      dominant_aggregate_sentiment:
        sanitizeText(signal.sentiment?.classification, 60) ||
        "INSUFFICIENT_EVIDENCE",
      trend:
        sanitizeText(signal.trend?.classification, 60) ||
        "INSUFFICIENT_EVIDENCE",
      narrative_velocity:
        sanitizeText(signal.narrative_velocity?.classification, 60) ||
        "INSUFFICIENT_EVIDENCE",
      engagement: normalizeNumber(signal.public_engagement?.total_public_engagement, 0),
      evidence_count: normalizeNumber(signal.evidence?.evidence_count, 0),
      confidence:
        sanitizeText(signal.confidence?.classification, 60) ||
        "INSUFFICIENT_EVIDENCE",
      fixture: signal.validation_fixture_only === true,
      population_context_label: "POPULATION CONTEXT",
      public_signal_context_label: "PUBLIC-SIGNAL CONTEXT",
      representative_issue: topIssue?.issue_label ?? null,
    };
  });

  return {
    schema: PIP_360_LOCALITY_SIGNAL_MAP_SCHEMA,
    rows,
  };
}

function classifyEscalation(entry = {}) {
  if (entry.no_verified_signal === true) {
    return PIP_360_ESCALATION_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
  }
  if (entry.invalid_geography === true) {
    return PIP_360_ESCALATION_CLASSIFICATIONS.GEOGRAPHY_REVIEW_REQUIRED;
  }
  if (entry.missing_evidence === true || entry.low_confidence === true) {
    return PIP_360_ESCALATION_CLASSIFICATIONS.EVIDENCE_REVIEW_REQUIRED;
  }
  if (entry.conflicting_structure === true) {
    return PIP_360_ESCALATION_CLASSIFICATIONS.HUMAN_REVIEW_REQUIRED;
  }
  if (entry.rising_or_emerging === true || entry.high_velocity === true) {
    return PIP_360_ESCALATION_CLASSIFICATIONS.MONITOR;
  }
  return PIP_360_ESCALATION_CLASSIFICATIONS.INFORMATIONAL;
}

export function buildPip360IssueEscalation({
  localitySignalMap,
} = {}) {
  const rows = toArray(localitySignalMap?.rows);

  const items = rows.map((entry, index) => {
    const contextStatus = sanitizeText(entry.public_signal_context_status, 80).toUpperCase();
    const confidence = sanitizeText(entry.confidence, 80).toUpperCase();
    const trend = sanitizeText(entry.trend, 80).toUpperCase();
    const velocity = sanitizeText(entry.narrative_velocity, 80).toUpperCase();

    const flags = {
      no_verified_signal:
        contextStatus === PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.NO_VERIFIED_SIGNALS,
      invalid_geography:
        sanitizeText(entry.geography_mapping_status, 80) !== "EXACT_BATCH_62A_CHAIN",
      missing_evidence: normalizeNumber(entry.evidence_count, 0) <= 0,
      low_confidence:
        confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW ||
        confidence === PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      conflicting_structure:
        contextStatus === PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.INVALID,
      rising_or_emerging:
        trend === PIP_360_TREND_CLASSIFICATIONS.RISING ||
        trend === PIP_360_TREND_CLASSIFICATIONS.EMERGING,
      high_velocity: velocity === PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.HIGH,
    };

    const classification = classifyEscalation(flags);
    const geographyScope = [
      entry.state_name,
      entry.parliament_name,
      entry.dun_name,
      entry.dm_name,
      entry.locality_name,
    ]
      .filter(Boolean)
      .join(" -> ");

    return {
      escalation_id: `ESC-${String(index + 1).padStart(4, "0")}`,
      issue_label: sanitizeText(entry.representative_issue, 160) || "NO_VERIFIED_ISSUE",
      geography_scope: geographyScope,
      classification,
      reason_codes: Object.entries(flags)
        .filter(([, value]) => value === true)
        .map(([key]) => key.toUpperCase()),
      evidence_count: normalizeNumber(entry.evidence_count, 0),
      confidence,
      fixture: entry.fixture === true,
      trend,
      narrative_velocity: velocity,
    };
  });

  return {
    schema: PIP_360_ISSUE_ESCALATION_SCHEMA,
    items,
  };
}

export function buildPip360EvidenceCentre({
  publicSignalSummaries,
} = {}) {
  const evidenceMap = new Map();

  toArray(publicSignalSummaries).forEach((entry) => {
    const references = uniqueSorted(toArray(entry.evidence_references));
    references.forEach((reference) => {
      if (!evidenceMap.has(reference)) {
        evidenceMap.set(reference, {
          evidence_reference: reference,
          issue_label: sanitizeText(entry.issue_label, 160) || "UNSPECIFIED_ISSUE",
          geography_scope: [
            normalizeCode(entry.state_code, 16),
            normalizeCode(entry.parliament_code, 16),
            normalizeCode(entry.dun_code, 16),
            normalizeCode(entry.dm_code, 16),
            normalizeCode(entry.locality_code, 40),
          ]
            .filter(Boolean)
            .join("/"),
          observation_window: `${normalizeIso(entry.observation_window_start) ?? "-"} to ${
            normalizeIso(entry.observation_window_end) ?? "-"
          }`,
          evidence_source_count: normalizeNumber(entry.evidence_source_count, 0),
          aggregate_source_record_count: normalizeNumber(entry.source_record_count, 0),
          confidence:
            sanitizeText(entry.confidence_classification, 80) ||
            PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
          verification_status:
            normalizeNumber(entry.evidence_count, 0) > 0 ? "VERIFIED" : "INSUFFICIENT_EVIDENCE",
          fixture: entry.validation_fixture === true,
        });
      }
    });
  });

  return {
    schema: PIP_360_EVIDENCE_CENTRE_SCHEMA,
    items: Array.from(evidenceMap.values()),
  };
}

export function buildPip360OperationalQueue({
  issueEscalation,
} = {}) {
  const escalationItems = toArray(issueEscalation?.items);
  const verifiedReviewItems = escalationItems.filter(
    (entry) =>
      entry.classification !== PIP_360_ESCALATION_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE &&
      entry.fixture !== true
  );

  if (verifiedReviewItems.length === 0) {
    return {
      schema: PIP_360_OPERATIONAL_QUEUE_SCHEMA,
      items: [
        {
          queue_item_id: "QUEUE-NO-VERIFIED-ITEM",
          issue_label: "NO_VERIFIED_SIGNALS",
          geography_scope: "ACTIVE_CONSTITUENCY",
          classification: PIP_360_ESCALATION_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
          queue_status: PIP_360_OPERATIONAL_QUEUE_STATUSES.NO_VERIFIED_ITEM,
          reason_codes: ["NO_VERIFIED_PRODUCTION_SIGNALS"],
          evidence_count: 0,
          confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
          created_timestamp: new Date().toISOString(),
          fixture: false,
          human_review_required: true,
        },
      ],
    };
  }

  const items = verifiedReviewItems.map((entry, index) => ({
    queue_item_id: `QUEUE-${String(index + 1).padStart(4, "0")}`,
    issue_label: entry.issue_label,
    geography_scope: entry.geography_scope,
    classification: entry.classification,
    queue_status: PIP_360_OPERATIONAL_QUEUE_STATUSES.OPEN,
    reason_codes: toArray(entry.reason_codes),
    evidence_count: normalizeNumber(entry.evidence_count, 0),
    confidence: sanitizeText(entry.confidence, 80),
    created_timestamp: new Date().toISOString(),
    fixture: entry.fixture === true,
    human_review_required: true,
  }));

  return {
    schema: PIP_360_OPERATIONAL_QUEUE_SCHEMA,
    items,
  };
}

export function buildPip360CommandCentreSnapshot({
  constituencyRegistry,
  primaryConstituencyBundle,
  comparisonConstituencyBundle,
  constituencyConfig,
  dashboardData,
  dunRecords,
  dmRecords,
  localityRecords,
  publicSignalSummaries = [],
  dualLayerCollection,
  validationFixtureMode = false,
  timeWindow = PIP_360_COMMAND_CENTRE_TIME_WINDOWS.LAST_24_HOURS,
} = {}) {
  const safePublicSignalSummaries = toArray(publicSignalSummaries)
    .map((entry) => validatePip360PublicSignalSummary(entry))
    .filter((entry) => entry.valid === true)
    .map((entry) => sanitizePip360PublicSignalSummary(entry.normalized));

  const effectiveDualLayerCollection = isPlainObject(dualLayerCollection)
    ? dualLayerCollection
    : buildPip360DualLayerLocalityContextCollection({
        constituencyConfig,
        localityRecords: toArray(localityRecords),
        publicSignalSummaries: safePublicSignalSummaries,
        validationFixtureMode,
      });

  const statewideOverview = buildPip360StatewideOverview({
    constituencyRegistry,
    primaryConstituencyBundle,
    comparisonConstituencyBundle,
    dashboardData,
    dunRecords,
    dmRecords,
    localityRecords,
    publicSignalSummaries: safePublicSignalSummaries,
  });

  const dailySentiment = buildPip360DailySentiment({
    publicSignalSummaries: safePublicSignalSummaries,
    timeWindow,
    includeFixture: true,
  });

  const narrativeRadar = buildPip360NarrativeRadar({
    publicSignalSummaries: safePublicSignalSummaries,
    timeWindow,
    includeFixture: true,
  });

  const localitySignalMap = buildPip360LocalitySignalMap({
    dualLayerCollection: effectiveDualLayerCollection,
    narrativeRadar,
  });

  const issueEscalation = buildPip360IssueEscalation({
    localitySignalMap,
  });

  const evidenceCentre = buildPip360EvidenceCentre({
    publicSignalSummaries: safePublicSignalSummaries,
  });

  const operationalQueue = buildPip360OperationalQueue({
    issueEscalation,
  });

  const productionSignalCount = safePublicSignalSummaries.filter(
    (entry) => entry.production_signal === true
  ).length;

  const status =
    productionSignalCount <= 0
      ? validationFixtureMode
        ? PIP_360_COMMAND_CENTRE_STATUSES.VALIDATION_FIXTURE_ONLY
        : PIP_360_COMMAND_CENTRE_STATUSES.NO_VERIFIED_SIGNALS
      : statewideOverview.coverage_status ===
        PIP_360_COVERAGE_STATUSES.COMPLETE_PRODUCTION_COVERAGE
      ? PIP_360_COMMAND_CENTRE_STATUSES.READY
      : PIP_360_COMMAND_CENTRE_STATUSES.PARTIAL;

  const snapshot = {
    schema: PIP_360_COMMAND_CENTRE_SNAPSHOT_SCHEMA,
    contract_schema: PIP_360_COMMAND_CENTRE_CONTRACT_SCHEMA,
    generated_at: new Date().toISOString(),
    status,
    scope_disclosure:
      "DESCRIPTIVE AGGREGATE-ONLY PUBLIC-SIGNAL INTELLIGENCE. HUMAN REVIEW REQUIRED. NO PERSUASION, PREFERENCE INFERENCE, OR ELECTORAL PREDICTION.",
    statewide_overview: statewideOverview,
    daily_sentiment: dailySentiment,
    narrative_radar: narrativeRadar,
    locality_signal_map: localitySignalMap,
    issue_escalation: issueEscalation,
    evidence_centre: evidenceCentre,
    operational_queue: operationalQueue,
    fixture_disclosures: {
      validation_fixture_mode: validationFixtureMode === true,
      p999_fixture_separated: true,
      production_totals_exclude_validation_fixtures: true,
    },
    safety_guards: {
      response_recommendation_created: false,
      combined_population_signal_score_created: false,
      voter_preference_inference_created: false,
      electoral_prediction_created: false,
      demographic_correlation_created: false,
      browser_storage_modified: false,
      central_repository_modified: false,
      external_network_request_made: false,
    },
  };

  const validation = validatePip360CommandCentreSnapshot(snapshot);
  return {
    ...snapshot,
    validation,
  };
}

export function buildPip360CommandCentreValidationFixture(localityRecords = []) {
  const fixture = buildPip360DualLayerLocalityValidationFixture(localityRecords);
  const safeSummaries = toArray(fixture.summaries)
    .map((entry) => validatePip360PublicSignalSummary(entry))
    .filter((entry) => entry.valid === true)
    .map((entry) => sanitizePip360PublicSignalSummary(entry.normalized));

  const noProductionSignalsSnapshot = buildPip360CommandCentreSnapshot({
    constituencyConfig: {
      parliamentCode: "P134",
      parliamentName: "MASJID TANAH",
      stateName: "MELAKA",
    },
    localityRecords: toArray(localityRecords),
    publicSignalSummaries: [],
    validationFixtureMode: false,
  });

  const fixtureSnapshot = buildPip360CommandCentreSnapshot({
    constituencyConfig: {
      parliamentCode: "P999",
      parliamentName: "VALIDATION CONSTITUENCY",
      stateName: "TEST STATE",
    },
    localityRecords: toArray(localityRecords),
    publicSignalSummaries: safeSummaries,
    validationFixtureMode: true,
    dualLayerCollection: buildPip360DualLayerLocalityContextCollection({
      constituencyConfig: {
        parliamentCode: "P999",
        parliamentName: "VALIDATION CONSTITUENCY",
        stateName: "TEST STATE",
      },
      localityRecords: toArray(localityRecords),
      publicSignalSummaries: safeSummaries,
      validationFixtureMode: true,
    }),
  });

  const risingMonitorPresent = toArray(fixtureSnapshot.issue_escalation?.items).some(
    (entry) => entry.classification === PIP_360_ESCALATION_CLASSIFICATIONS.MONITOR
  );

  const evidenceReviewPresent = toArray(fixtureSnapshot.issue_escalation?.items).some(
    (entry) =>
      entry.classification ===
      PIP_360_ESCALATION_CLASSIFICATIONS.EVIDENCE_REVIEW_REQUIRED
  );

  const geographyReviewPresent = toArray(fixtureSnapshot.issue_escalation?.items).some(
    (entry) =>
      entry.classification ===
      PIP_360_ESCALATION_CLASSIFICATIONS.GEOGRAPHY_REVIEW_REQUIRED
  );

  const conflictingReviewPresent = toArray(fixtureSnapshot.issue_escalation?.items).some(
    (entry) =>
      entry.classification ===
      PIP_360_ESCALATION_CLASSIFICATIONS.HUMAN_REVIEW_REQUIRED
  );

  const references = toArray(fixtureSnapshot.evidence_centre?.items).map(
    (entry) => entry.evidence_reference
  );

  return {
    schema: "pip.360-command-centre.validation-fixture.v1",
    generated_at: new Date().toISOString(),
    fixture_label: fixture.fixture_label,
    checks: {
      production_totals_exclude_p999:
        normalizeNumber(
          fixtureSnapshot.statewide_overview?.loaded_validation_fixture_count,
          0
        ) >= 1 &&
        normalizeNumber(fixtureSnapshot.statewide_overview?.loaded_production_constituency_count, 0) ===
          0,
      fixture_sentiment_separate: fixtureSnapshot.daily_sentiment?.disclosure?.includes(
        "VALIDATION FIXTURE"
      ),
      fixture_narrative_labelled: toArray(fixtureSnapshot.narrative_radar?.records).every(
        (entry) => entry.production_or_fixture_status === "VALIDATION_FIXTURE_ONLY"
      ),
      rising_verified_narrative_monitor: risingMonitorPresent,
      missing_evidence_escalation: evidenceReviewPresent,
      invalid_geography_escalation: geographyReviewPresent,
      conflicting_structure_escalation: conflictingReviewPresent,
      evidence_references_deduplicated: new Set(references).size === references.length,
      empty_production_no_verified_signals:
        noProductionSignalsSnapshot.status ===
        PIP_360_COMMAND_CENTRE_STATUSES.NO_VERIFIED_SIGNALS,
      no_combined_population_signal_score:
        fixtureSnapshot.safety_guards?.combined_population_signal_score_created === false,
      no_response_recommendation:
        fixtureSnapshot.safety_guards?.response_recommendation_created === false,
      no_voter_preference_inference:
        fixtureSnapshot.safety_guards?.voter_preference_inference_created === false,
    },
    snapshot: fixtureSnapshot,
  };
}

export function buildPip360CommandCentreSummary(snapshot = {}) {
  return {
    coverage_status: snapshot.statewide_overview?.coverage_status,
    production_constituencies_loaded: normalizeNumber(
      snapshot.statewide_overview?.loaded_production_constituency_count,
      0
    ),
    validation_fixtures_loaded: normalizeNumber(
      snapshot.statewide_overview?.loaded_validation_fixture_count,
      0
    ),
    production_voter_coverage: normalizeNumber(
      snapshot.statewide_overview?.production_voter_total,
      0
    ),
    verified_signal_count: normalizeNumber(
      snapshot.statewide_overview?.verified_public_signal_count,
      0
    ),
    daily_sentiment_records: toArray(snapshot.daily_sentiment?.records).length,
    narrative_count: toArray(snapshot.narrative_radar?.records).length,
    mapped_localities: toArray(snapshot.locality_signal_map?.rows).length,
    escalation_items: toArray(snapshot.issue_escalation?.items).length,
    evidence_references: toArray(snapshot.evidence_centre?.items).length,
    operational_queue_items: toArray(snapshot.operational_queue?.items).length,
    snapshot_validation: snapshot.validation?.valid === true ? "VALID" : "INVALID",
  };
}

export function serializePip360CommandCentreExport(payload = {}) {
  const safe = sanitizePip360CommandCentreExport(payload);
  return JSON.stringify(safe, null, 2);
}

export function createPip360CommandCentreExportFileName({
  constituencyCode,
  generatedAt,
} = {}) {
  const code = normalizeCode(constituencyCode || "PIP", 24) || "PIP";
  const stamp = new Date(generatedAt ?? Date.now())
    .toISOString()
    .replace(/[:.]/g, "-");
  return `pip-360-command-centre-${code.toLowerCase()}-${stamp}.json`;
}

export {
  PIP_360_COMMAND_CENTRE_EXPORT_SCHEMA,
  PIP_360_COMMAND_CENTRE_TIME_WINDOWS,
};
