import {
  PIP_360_DUAL_LAYER_LOCALITY_COLLECTION_SCHEMA,
  PIP_360_DUAL_LAYER_LOCALITY_CONTEXT_SCHEMA,
  PIP_360_EVIDENCE_STATUSES,
  PIP_360_LOCALITY_EVIDENCE_SUMMARY_SCHEMA,
  PIP_360_LOCALITY_IDENTITY_SCHEMA,
  PIP_360_POPULATION_LOCALITY_CONTEXT_SCHEMA,
  PIP_360_POPULATION_READINESS_STATUSES,
  PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES,
  PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA,
  PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA,
  PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS,
  PIP_360_SENTIMENT_CLASSIFICATIONS,
  PIP_360_TREND_CLASSIFICATIONS,
  PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS,
  sanitizePip360LocalityIdentity,
  sanitizePip360PublicSignalSummary,
  validatePip360DualLayerLocalityCollection,
  validatePip360DualLayerLocalityContext,
  validatePip360LocalityIdentity,
  validatePip360PublicSignalSummary,
} from "./pip-360-dual-layer-locality-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, max = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeCode(value, max = 24) {
  return sanitizeText(value, max).toUpperCase();
}

function normalizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizePercent(value) {
  const n = normalizeNumber(value);
  if (n === null) {
    return null;
  }
  return Math.max(0, Math.min(100, n));
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function sumNumbers(values) {
  return values.reduce((acc, entry) => {
    const n = normalizeNumber(entry);
    return acc + (n === null ? 0 : n);
  }, 0);
}

function sortUniqueStrings(values) {
  return Array.from(
    new Set(values.map((entry) => sanitizeText(entry, 200)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function getLocalityIdentityFromRecord(record = {}) {
  const geography = isPlainObject(record.geography) ? record.geography : {};
  return sanitizePip360LocalityIdentity({
    schema: PIP_360_LOCALITY_IDENTITY_SCHEMA,
    state_code: geography.state_code,
    state_name: geography.state_name,
    parliament_code: geography.parliament_code,
    parliament_name: geography.parliament_name,
    dun_code: geography.dun_code,
    dun_name: geography.dun_name,
    dm_code: geography.dm_code,
    dm_name: geography.dm_name,
    locality_code: geography.locality_code,
    locality_name: geography.locality_name,
  });
}

function derivePopulationReadinessStatus({
  profileCompletenessScore,
  cleansingConfidence,
  unavailableFieldCount,
} = {}) {
  const completeness = normalizePercent(profileCompletenessScore);
  const confidence = normalizeNumber(cleansingConfidence);
  const unavailable = normalizeNumber(unavailableFieldCount) ?? 0;

  if (completeness === null && confidence === null) {
    return PIP_360_POPULATION_READINESS_STATUSES.NOT_READY;
  }

  if (completeness !== null && completeness >= 98 && (confidence ?? 1) >= 0.99) {
    return PIP_360_POPULATION_READINESS_STATUSES.VERY_HIGH;
  }

  if (completeness !== null && completeness >= 90 && unavailable <= 3) {
    return PIP_360_POPULATION_READINESS_STATUSES.HIGH;
  }

  if (completeness !== null && completeness >= 70) {
    return PIP_360_POPULATION_READINESS_STATUSES.PARTIAL;
  }

  return PIP_360_POPULATION_READINESS_STATUSES.LOW;
}

function availabilityFromValue(value) {
  return value === null || value === undefined
    ? "NOT_AVAILABLE"
    : "AVAILABLE";
}

function makeNoSignalContext(localityIdentity, { validationFixtureOnly = false } = {}) {
  const status = validationFixtureOnly
    ? PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.VALIDATION_FIXTURE_ONLY
    : PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.NO_VERIFIED_SIGNALS;

  return {
    schema: PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA,
    locality_identity: localityIdentity,
    context_status: status,
    current_issues: [],
    sentiment: {
      classification: PIP_360_SENTIMENT_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      positive_observation_count: 0,
      neutral_observation_count: 0,
      negative_observation_count: 0,
      total_sentiment_observation_count: 0,
    },
    trend: {
      classification: PIP_360_TREND_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      trend_window_hours: null,
    },
    narrative_velocity: {
      classification:
        PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      observations_per_hour: null,
    },
    public_engagement: {
      total_public_engagement: 0,
      source_record_count: 0,
    },
    evidence: {
      schema: PIP_360_LOCALITY_EVIDENCE_SUMMARY_SCHEMA,
      evidence_status: PIP_360_EVIDENCE_STATUSES.NONE,
      evidence_count: 0,
      evidence_source_count: 0,
      evidence_references: [],
    },
    confidence: {
      classification:
        PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      score: null,
    },
    observation_window: {
      start: null,
      end: null,
    },
    source_summary_count: 0,
    validation_fixture_only: validationFixtureOnly === true,
  };
}

function classifySentimentFromCounts({ positive, neutral, negative, total } = {}) {
  if ((total ?? 0) <= 0) {
    return PIP_360_SENTIMENT_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
  }

  const values = [
    [PIP_360_SENTIMENT_CLASSIFICATIONS.POSITIVE, positive ?? 0],
    [PIP_360_SENTIMENT_CLASSIFICATIONS.NEUTRAL, neutral ?? 0],
    [PIP_360_SENTIMENT_CLASSIFICATIONS.NEGATIVE, negative ?? 0],
  ].sort((a, b) => b[1] - a[1]);

  if (values[0][1] === values[1][1]) {
    return PIP_360_SENTIMENT_CLASSIFICATIONS.MIXED;
  }

  return values[0][0];
}

function classifyNarrativeVelocity(value) {
  const n = normalizeNumber(value);
  if (n === null) {
    return PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;
  }
  if (n <= 0) {
    return PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.NONE;
  }
  if (n < 2) {
    return PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.LOW;
  }
  if (n < 8) {
    return PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.MODERATE;
  }
  return PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.HIGH;
}

function classifyEvidenceStatus({ evidenceCount, evidenceSourceCount } = {}) {
  const count = normalizeNumber(evidenceCount) ?? 0;
  const sources = normalizeNumber(evidenceSourceCount) ?? 0;

  if (count <= 0 || sources <= 0) {
    return PIP_360_EVIDENCE_STATUSES.NONE;
  }
  if (count >= 3 && sources >= 2) {
    return PIP_360_EVIDENCE_STATUSES.VERIFIED;
  }
  if (count >= 1) {
    return PIP_360_EVIDENCE_STATUSES.PARTIAL;
  }
  return PIP_360_EVIDENCE_STATUSES.INSUFFICIENT;
}

function classifyContextStatus({
  summaries,
  validationFixtureMode,
  productionSignalPresent,
  evidenceStatus,
} = {}) {
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return validationFixtureMode
      ? PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.VALIDATION_FIXTURE_ONLY
      : PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.NO_VERIFIED_SIGNALS;
  }

  if (productionSignalPresent !== true && validationFixtureMode === true) {
    return PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.VALIDATION_FIXTURE_ONLY;
  }

  if (productionSignalPresent !== true) {
    return PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.NO_VERIFIED_SIGNALS;
  }

  if (evidenceStatus === PIP_360_EVIDENCE_STATUSES.VERIFIED) {
    return PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.VERIFIED_SIGNALS_AVAILABLE;
  }

  return PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.PARTIAL_SIGNAL_CONTEXT;
}

function hasExactLocalityChainMatch(localityIdentity, summary) {
  return (
    normalizeCode(summary.state_code) === normalizeCode(localityIdentity.state_code) &&
    normalizeCode(summary.parliament_code) ===
      normalizeCode(localityIdentity.parliament_code) &&
    normalizeCode(summary.dun_code) === normalizeCode(localityIdentity.dun_code) &&
    normalizeCode(summary.dm_code) === normalizeCode(localityIdentity.dm_code) &&
    normalizeCode(summary.locality_code, 32) ===
      normalizeCode(localityIdentity.locality_code, 32)
  );
}

export function buildPip360PopulationLocalityContext(localityRecord = {}) {
  const identity = getLocalityIdentityFromRecord(localityRecord);
  const metrics = isPlainObject(localityRecord.metrics) ? localityRecord.metrics : {};
  const distributions = isPlainObject(localityRecord.distributions)
    ? localityRecord.distributions
    : {};

  const totalVoters = normalizeNumber(metrics.total_voters);
  const knownAgePopulation = normalizeNumber(metrics.known_age_voters);
  const malePopulation = normalizeNumber(metrics.male_voters);
  const femalePopulation = normalizeNumber(metrics.female_voters);
  const otherUnknownPopulation = normalizeNumber(metrics.other_or_unknown_gender_voters);
  const ageBandCounts = isPlainObject(distributions.age_band_counts)
    ? { ...distributions.age_band_counts }
    : null;

  const unavailableFieldCount = [
    totalVoters,
    knownAgePopulation,
    malePopulation,
    femalePopulation,
    normalizeNumber(metrics.profile_completeness_score),
  ].filter((entry) => entry === null).length;

  const readinessStatus = derivePopulationReadinessStatus({
    profileCompletenessScore: metrics.profile_completeness_score,
    cleansingConfidence: metrics.average_cleansing_confidence,
    unavailableFieldCount,
  });

  return {
    schema: PIP_360_POPULATION_LOCALITY_CONTEXT_SCHEMA,
    locality_identity: identity,
    total_voter_population: totalVoters,
    age_composition: {
      availability: availabilityFromValue(knownAgePopulation),
      known_age_population: knownAgePopulation,
      age_band_counts: ageBandCounts,
      dominant_age_group: sanitizeText(metrics.dominant_age_group, 40) || null,
      senior_56_plus_population: normalizeNumber(metrics.senior_voters_56_plus),
      senior_56_plus_percent: normalizePercent(metrics.senior_dependency_percent),
    },
    gender_composition: {
      availability:
        malePopulation !== null || femalePopulation !== null
          ? "AVAILABLE"
          : "NOT_AVAILABLE",
      male_population: malePopulation,
      female_population: femalePopulation,
      other_or_unknown_population: otherUnknownPopulation,
      male_percent: normalizePercent(metrics.male_percent),
      female_percent: normalizePercent(metrics.female_percent),
      gender_balance_score: normalizePercent(metrics.gender_balance_score),
    },
    locality_density: {
      voter_density_score: sanitizeText(metrics.voter_density_score, 24) || null,
      density_classification: sanitizeText(metrics.voter_density_score, 24) || null,
    },
    data_readiness: {
      profile_completeness_score: normalizePercent(metrics.profile_completeness_score),
      cleansing_confidence: normalizeNumber(metrics.average_cleansing_confidence),
      readiness_status: readinessStatus,
      unavailable_field_count: unavailableFieldCount,
    },
    population_data_availability:
      totalVoters !== null
        ? "AVAILABLE"
        : "NOT_AVAILABLE",
    aggregate_only: true,
    includes_voter_identifiers: false,
  };
}

export function groupPip360PublicSignalSummariesByLocality(summaries = []) {
  const map = new Map();

  (Array.isArray(summaries) ? summaries : []).forEach((entry) => {
    const validation = validatePip360PublicSignalSummary(entry);
    if (validation.valid !== true) {
      return;
    }

    const summary = validation.normalized;
    const key = [
      normalizeCode(summary.state_code),
      normalizeCode(summary.parliament_code),
      normalizeCode(summary.dun_code),
      normalizeCode(summary.dm_code),
      normalizeCode(summary.locality_code, 32),
    ].join("|");

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(summary);
  });

  return map;
}

export function buildPip360PublicSignalLocalityContext({
  localityIdentity,
  signalSummaries = [],
  validationFixtureMode = false,
} = {}) {
  const identity = sanitizePip360LocalityIdentity(localityIdentity);
  const identityValidation = validatePip360LocalityIdentity(identity);

  if (identityValidation.valid !== true) {
    return {
      ...makeNoSignalContext(identity, { validationFixtureOnly: validationFixtureMode }),
      context_status: PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.INVALID,
    };
  }

  const normalizedSummaries = (Array.isArray(signalSummaries) ? signalSummaries : [])
    .map((entry) => validatePip360PublicSignalSummary(entry))
    .filter((entry) => entry.valid === true)
    .map((entry) => entry.normalized)
    .filter((entry) => hasExactLocalityChainMatch(identity, entry));

  if (normalizedSummaries.length === 0) {
    return makeNoSignalContext(identity, {
      validationFixtureOnly: validationFixtureMode,
    });
  }

  const productionSignalPresent = normalizedSummaries.some(
    (entry) => entry.production_signal === true
  );

  const positive = sumNumbers(
    normalizedSummaries.map((entry) => entry.positive_observation_count)
  );
  const neutral = sumNumbers(
    normalizedSummaries.map((entry) => entry.neutral_observation_count)
  );
  const negative = sumNumbers(
    normalizedSummaries.map((entry) => entry.negative_observation_count)
  );
  const totalSentiment = sumNumbers(
    normalizedSummaries.map((entry) => entry.total_sentiment_observation_count)
  );

  const trendValues = sortUniqueStrings(
    normalizedSummaries.map((entry) => entry.trend_classification)
  );
  const velocityValues = normalizedSummaries
    .map((entry) => normalizeNumber(entry.narrative_observations_per_hour))
    .filter((entry) => entry !== null);

  const evidenceReferences = sortUniqueStrings(
    normalizedSummaries.flatMap((entry) => entry.evidence_references ?? [])
  );

  const evidenceCount = sumNumbers(
    normalizedSummaries.map((entry) => entry.evidence_count)
  );
  const evidenceSourceCount = sumNumbers(
    normalizedSummaries.map((entry) => entry.evidence_source_count)
  );

  const evidenceStatus = classifyEvidenceStatus({
    evidenceCount,
    evidenceSourceCount,
  });

  const windowStarts = normalizedSummaries
    .map((entry) => normalizeIso(entry.observation_window_start))
    .filter(Boolean)
    .sort();
  const windowEnds = normalizedSummaries
    .map((entry) => normalizeIso(entry.observation_window_end))
    .filter(Boolean)
    .sort();

  const observationWindowStart = windowStarts[0] ?? null;
  const observationWindowEnd = windowEnds[windowEnds.length - 1] ?? null;

  const trendWindowHours =
    normalizeNumber(
      normalizedSummaries[0]?.trend_window_hours
    ) !== null && observationWindowStart && observationWindowEnd
      ? sumNumbers(normalizedSummaries.map((entry) => entry.trend_window_hours)) /
        normalizedSummaries.length
      : null;

  const averageVelocity =
    velocityValues.length > 0
      ? velocityValues.reduce((acc, entry) => acc + entry, 0) / velocityValues.length
      : null;

  const sentimentClassification = classifySentimentFromCounts({
    positive,
    neutral,
    negative,
    total: totalSentiment,
  });

  const trendClassification =
    trendValues.length === 0
      ? PIP_360_TREND_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
      : trendValues.length === 1
        ? trendValues[0]
        : PIP_360_TREND_CLASSIFICATIONS.MIXED;

  const confidenceValues = normalizedSummaries
    .map((entry) => sanitizeText(entry.confidence_classification, 40).toUpperCase())
    .filter(Boolean);

  const confidenceClassification =
    confidenceValues.length === 0
      ? PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE
      : confidenceValues.includes(PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED)
        ? PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED
        : confidenceValues.includes(PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.HIGH)
          ? PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.HIGH
          : confidenceValues.includes(PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.MEDIUM)
            ? PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.MEDIUM
            : confidenceValues.includes(PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW)
              ? PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW
              : PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE;

  const confidenceScoreValues = normalizedSummaries
    .map((entry) => normalizeNumber(entry.confidence_score))
    .filter((entry) => entry !== null);

  const confidenceScore =
    confidenceScoreValues.length > 0
      ? confidenceScoreValues.reduce((acc, entry) => acc + entry, 0) /
        confidenceScoreValues.length
      : null;

  const contextStatus = classifyContextStatus({
    summaries: normalizedSummaries,
    validationFixtureMode,
    productionSignalPresent,
    evidenceStatus,
  });

  return {
    schema: PIP_360_PUBLIC_SIGNAL_LOCALITY_CONTEXT_SCHEMA,
    locality_identity: identity,
    context_status: contextStatus,
    current_issues: sortUniqueStrings(normalizedSummaries.map((entry) => entry.issue_label)),
    sentiment: {
      classification: sentimentClassification,
      positive_observation_count: positive,
      neutral_observation_count: neutral,
      negative_observation_count: negative,
      total_sentiment_observation_count: totalSentiment,
    },
    trend: {
      classification: trendClassification,
      trend_window_hours: trendWindowHours,
    },
    narrative_velocity: {
      classification:
        observationWindowStart && observationWindowEnd
          ? classifyNarrativeVelocity(averageVelocity)
          : PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
      observations_per_hour:
        observationWindowStart && observationWindowEnd ? averageVelocity : null,
    },
    public_engagement: {
      total_public_engagement: sumNumbers(
        normalizedSummaries.map((entry) => entry.total_public_engagement)
      ),
      source_record_count: sumNumbers(
        normalizedSummaries.map((entry) => entry.source_record_count)
      ),
    },
    evidence: {
      schema: PIP_360_LOCALITY_EVIDENCE_SUMMARY_SCHEMA,
      evidence_status: evidenceStatus,
      evidence_count: evidenceCount,
      evidence_source_count: evidenceSourceCount,
      evidence_references: evidenceReferences,
    },
    confidence: {
      classification: confidenceClassification,
      score: confidenceScore,
    },
    observation_window: {
      start: observationWindowStart,
      end: observationWindowEnd,
    },
    source_summary_count: normalizedSummaries.length,
    validation_fixture_only: productionSignalPresent !== true,
  };
}

export function buildPip360DualLayerLocalityContext({
  localityRecord,
  signalSummaries = [],
  validationFixtureMode = false,
} = {}) {
  const populationContext = buildPip360PopulationLocalityContext(localityRecord);
  const publicSignalContext = buildPip360PublicSignalLocalityContext({
    localityIdentity: populationContext.locality_identity,
    signalSummaries,
    validationFixtureMode,
  });

  const context = {
    schema: PIP_360_DUAL_LAYER_LOCALITY_CONTEXT_SCHEMA,
    locality_identity: populationContext.locality_identity,
    population_context: populationContext,
    public_signal_context: publicSignalContext,
    separation_guard: {
      layers_remain_separate: true,
      combined_score_created: false,
      cross_layer_correlation_created: false,
      targeting_recommendation_created: false,
      voter_preference_inferred: false,
      electoral_outcome_inferred: false,
    },
  };

  const validation = validatePip360DualLayerLocalityContext(context);
  return {
    ...context,
    validation,
  };
}

export function buildPip360DualLayerLocalityContextCollection({
  constituencyConfig,
  localityRecords = [],
  publicSignalSummaries = [],
  validationFixtureMode = false,
} = {}) {
  const safeLocalityRecords = Array.isArray(localityRecords) ? localityRecords : [];
  const grouped = groupPip360PublicSignalSummariesByLocality(publicSignalSummaries);

  const items = safeLocalityRecords.map((record) => {
    const identity = getLocalityIdentityFromRecord(record);
    const groupKey = [
      normalizeCode(identity.state_code),
      normalizeCode(identity.parliament_code),
      normalizeCode(identity.dun_code),
      normalizeCode(identity.dm_code),
      normalizeCode(identity.locality_code, 32),
    ].join("|");

    return buildPip360DualLayerLocalityContext({
      localityRecord: record,
      signalSummaries: grouped.get(groupKey) ?? [],
      validationFixtureMode,
    });
  });

  const collection = {
    schema: PIP_360_DUAL_LAYER_LOCALITY_COLLECTION_SCHEMA,
    constituency_identity: {
      parliament_code: normalizeCode(
        constituencyConfig?.parliamentCode ?? constituencyConfig?.parliament_code
      ),
      parliament_name: sanitizeText(
        constituencyConfig?.parliamentName ?? constituencyConfig?.parliament_name,
        120
      ).toUpperCase(),
      state_name: sanitizeText(
        constituencyConfig?.stateName ?? constituencyConfig?.state_name,
        120
      ).toUpperCase(),
    },
    items,
    generated_at: new Date().toISOString(),
    validation_fixture_mode: validationFixtureMode === true,
  };

  const validation = validatePip360DualLayerLocalityCollection(collection);
  return {
    ...collection,
    validation,
  };
}

export function buildPip360DualLayerLocalityCollectionSummary(collection = {}) {
  const items = Array.isArray(collection.items) ? collection.items : [];

  const publicSignalStatuses = items.map(
    (entry) => entry.public_signal_context?.context_status
  );

  const signalSummaryCount = items.reduce(
    (acc, entry) => acc + Number(entry.public_signal_context?.source_summary_count ?? 0),
    0
  );

  const evidenceCount = items.reduce(
    (acc, entry) => acc + Number(entry.public_signal_context?.evidence?.evidence_count ?? 0),
    0
  );

  const invalidCount = items.filter((entry) => entry.validation?.valid !== true).length;

  return {
    locality_count: items.length,
    population_context_ready_count: items.filter((entry) => {
      const status = entry.population_context?.data_readiness?.readiness_status;
      return (
        status === PIP_360_POPULATION_READINESS_STATUSES.VERY_HIGH ||
        status === PIP_360_POPULATION_READINESS_STATUSES.HIGH
      );
    }).length,
    population_context_partial_count: items.filter((entry) => {
      const status = entry.population_context?.data_readiness?.readiness_status;
      return (
        status === PIP_360_POPULATION_READINESS_STATUSES.PARTIAL ||
        status === PIP_360_POPULATION_READINESS_STATUSES.LOW ||
        status === PIP_360_POPULATION_READINESS_STATUSES.NOT_READY
      );
    }).length,
    public_signals_available_count: publicSignalStatuses.filter(
      (entry) => entry === PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.VERIFIED_SIGNALS_AVAILABLE
    ).length,
    no_verified_signals_count: publicSignalStatuses.filter(
      (entry) => entry === PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.NO_VERIFIED_SIGNALS
    ).length,
    validation_fixture_only_count: publicSignalStatuses.filter(
      (entry) => entry === PIP_360_PUBLIC_SIGNAL_CONTEXT_STATUSES.VALIDATION_FIXTURE_ONLY
    ).length,
    signal_summary_count: signalSummaryCount,
    evidence_count: evidenceCount,
    invalid_context_count: invalidCount,
    layer_separation_valid: items.every(
      (entry) => entry.separation_guard?.layers_remain_separate === true
    ),
    source_records_modified: false,
    combined_score_created: false,
  };
}

export function buildPip360DualLayerLocalityValidationFixture(localityRecords = []) {
  const safeLocalities = Array.isArray(localityRecords) ? localityRecords : [];
  const first = safeLocalities[0] ?? null;
  const second = safeLocalities[1] ?? first;
  const third = safeLocalities[2] ?? second;

  const firstIdentity = first ? getLocalityIdentityFromRecord(first) : null;
  const secondIdentity = second ? getLocalityIdentityFromRecord(second) : null;
  const thirdIdentity = third ? getLocalityIdentityFromRecord(third) : null;

  const mkSummary = ({
    signalId,
    mappedId,
    identity,
    issue,
    sentiment,
    positive,
    neutral,
    negative,
    trend,
    trendHours,
    velocityClass,
    velocityRate,
    engagement,
    sourceCount,
    evidenceCount,
    evidenceSources,
    refs,
    confidence,
    confidenceScore,
    production = false,
  }) => ({
    schema: PIP_360_PUBLIC_SIGNAL_SUMMARY_SCHEMA,
    signal_summary_id: signalId,
    mapped_signal_id: mappedId,
    source_system: "VALIDATION_FIXTURE",
    observation_window_start: "2026-01-01T00:00:00.000Z",
    observation_window_end: "2026-01-02T00:00:00.000Z",
    state_code: identity?.state_code,
    parliament_code: identity?.parliament_code,
    dun_code: identity?.dun_code,
    dm_code: identity?.dm_code,
    locality_code: identity?.locality_code,
    issue_label: issue,
    issue_category: "CONTRACT_VALIDATION_ONLY",
    sentiment_classification: sentiment,
    positive_observation_count: positive,
    neutral_observation_count: neutral,
    negative_observation_count: negative,
    total_sentiment_observation_count: positive + neutral + negative,
    trend_classification: trend,
    trend_window_hours: trendHours,
    narrative_velocity_classification: velocityClass,
    narrative_observations_per_hour: velocityRate,
    total_public_engagement: engagement,
    source_record_count: sourceCount,
    evidence_count: evidenceCount,
    evidence_source_count: evidenceSources,
    evidence_references: refs,
    confidence_classification: confidence,
    confidence_score: confidenceScore,
    validation_fixture: true,
    production_signal: production,
  });

  const summaries = [];

  if (firstIdentity) {
    summaries.push(
      mkSummary({
        signalId: "FIXTURE-SIGNAL-ALPHA",
        mappedId: "FIXTURE-MAPPED-ALPHA",
        identity: firstIdentity,
        issue: "VALIDATION_ISSUE_ALPHA",
        sentiment: PIP_360_SENTIMENT_CLASSIFICATIONS.POSITIVE,
        positive: 14,
        neutral: 3,
        negative: 1,
        trend: PIP_360_TREND_CLASSIFICATIONS.RISING,
        trendHours: 24,
        velocityClass: PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.MODERATE,
        velocityRate: 3.5,
        engagement: 124,
        sourceCount: 12,
        evidenceCount: 4,
        evidenceSources: 2,
        refs: ["EVID-ALPHA-1", "EVID-ALPHA-1", "EVID-ALPHA-2"],
        confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.VERIFIED,
        confidenceScore: 0.92,
      })
    );
  }

  if (secondIdentity) {
    summaries.push(
      mkSummary({
        signalId: "FIXTURE-SIGNAL-BETA",
        mappedId: "FIXTURE-MAPPED-BETA",
        identity: secondIdentity,
        issue: "VALIDATION_ISSUE_BETA",
        sentiment: PIP_360_SENTIMENT_CLASSIFICATIONS.MIXED,
        positive: 4,
        neutral: 4,
        negative: 4,
        trend: PIP_360_TREND_CLASSIFICATIONS.MIXED,
        trendHours: 48,
        velocityClass: PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.LOW,
        velocityRate: 1.2,
        engagement: 42,
        sourceCount: 7,
        evidenceCount: 2,
        evidenceSources: 1,
        refs: ["EVID-BETA-1"],
        confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.MEDIUM,
        confidenceScore: 0.64,
      })
    );
  }

  if (thirdIdentity) {
    summaries.push(
      {
        ...mkSummary({
          signalId: "FIXTURE-WRONG-DM",
          mappedId: "FIXTURE-WRONG-DM",
          identity: thirdIdentity,
          issue: "VALIDATION_ISSUE_ALPHA",
          sentiment: PIP_360_SENTIMENT_CLASSIFICATIONS.NEUTRAL,
          positive: 2,
          neutral: 5,
          negative: 1,
          trend: PIP_360_TREND_CLASSIFICATIONS.STABLE,
          trendHours: 24,
          velocityClass: PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.LOW,
          velocityRate: 1.0,
          engagement: 10,
          sourceCount: 3,
          evidenceCount: 1,
          evidenceSources: 1,
          refs: ["EVID-WRONG-DM-1"],
          confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW,
          confidenceScore: 0.3,
        }),
        dm_code: `${thirdIdentity.dm_code}-X`,
      },
      {
        ...mkSummary({
          signalId: "FIXTURE-WRONG-DUN",
          mappedId: "FIXTURE-WRONG-DUN",
          identity: thirdIdentity,
          issue: "VALIDATION_ISSUE_BETA",
          sentiment: PIP_360_SENTIMENT_CLASSIFICATIONS.NEUTRAL,
          positive: 1,
          neutral: 3,
          negative: 1,
          trend: PIP_360_TREND_CLASSIFICATIONS.STABLE,
          trendHours: 24,
          velocityClass: PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.LOW,
          velocityRate: 0.5,
          engagement: 8,
          sourceCount: 2,
          evidenceCount: 1,
          evidenceSources: 1,
          refs: ["EVID-WRONG-DUN-1"],
          confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW,
          confidenceScore: 0.21,
        }),
        dun_code: `${thirdIdentity.dun_code}-X`,
      },
      {
        ...mkSummary({
          signalId: "FIXTURE-WRONG-PARLIAMENT",
          mappedId: "FIXTURE-WRONG-PARLIAMENT",
          identity: thirdIdentity,
          issue: "VALIDATION_ISSUE_ALPHA",
          sentiment: PIP_360_SENTIMENT_CLASSIFICATIONS.NEUTRAL,
          positive: 1,
          neutral: 1,
          negative: 1,
          trend: PIP_360_TREND_CLASSIFICATIONS.STABLE,
          trendHours: 24,
          velocityClass: PIP_360_NARRATIVE_VELOCITY_CLASSIFICATIONS.NONE,
          velocityRate: 0,
          engagement: 3,
          sourceCount: 1,
          evidenceCount: 1,
          evidenceSources: 1,
          refs: ["EVID-WRONG-PAR-1"],
          confidence: PIP_360_SIGNAL_CONFIDENCE_CLASSIFICATIONS.LOW,
          confidenceScore: 0.1,
        }),
        parliament_code: `${thirdIdentity.parliament_code}-X`,
      }
    );
  }

  return {
    schema: "pip.360-dual-layer-locality-validation-fixture.v1",
    generated_at: new Date().toISOString(),
    validation_fixture: true,
    production_signal: false,
    fixture_label: "VALIDATION FIXTURE - NON-PRODUCTION PUBLIC-SIGNAL CONTEXT",
    no_signal_expected: true,
    summaries,
  };
}

export function serializePip360DualLayerLocalityExport(payload = {}) {
  return JSON.stringify(payload, null, 2);
}

export function createPip360DualLayerLocalityExportFileName({
  constituencyCode,
  generatedAt,
} = {}) {
  const code = normalizeCode(constituencyCode || "PIP", 24) || "PIP";
  const stamp = new Date(generatedAt ?? Date.now())
    .toISOString()
    .replace(/[:.]/g, "-");
  return `pip-360-dual-layer-locality-${code.toLowerCase()}-${stamp}.json`;
}

export { validatePip360DualLayerLocalityCollection };
