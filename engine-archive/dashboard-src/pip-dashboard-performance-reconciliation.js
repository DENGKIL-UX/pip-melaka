export const PIP_DASHBOARD_PERFORMANCE_RECONCILIATION_SCHEMA =
  "pip.dashboard.performance-reconciliation.v1";

const REQUIRED_METRICS = [
  "total_voters",
  "male_voters",
  "female_voters",
  "other_or_unknown_gender_voters",
  "senior_voters_56_plus",
  "known_age_voters",
];

const REQUIRED_TIMINGS = [
  "metadata_load_ms",
  "aggregate_fetch_ms",
  "response_decode_ms",
  "jsonl_parse_ms",
  "reconciliation_validation_ms",
  "total_bundle_load_ms",
];

const REQUIRED_PAYLOADS = [
  "overview_bytes",
  "dun_bytes",
  "dm_bytes",
  "locality_bytes",
  "total_bytes",
];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeFiniteNonNegative(value) {
  const numeric = safeNumber(value, 0);
  return numeric >= 0 ? numeric : 0;
}

function toInteger(value) {
  const numeric = safeNumber(value, 0);
  if (numeric < 0) {
    return 0;
  }
  return Math.floor(numeric);
}

function normalizeParliamentCode(value) {
  const text = normalizeText(value).toUpperCase();

  if (/^\d{3}$/.test(text)) {
    return `P${text}`;
  }

  return text;
}

function normalizeMetricValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function aggregateRecords(records) {
  const safeRecords = Array.isArray(records) ? records : [];

  const metricSums = {};
  const metricAvailability = {};

  REQUIRED_METRICS.forEach((metricKey) => {
    metricSums[metricKey] = 0;
    metricAvailability[metricKey] = {
      available_record_count: 0,
      total_record_count: safeRecords.length,
      available_for_all_records: safeRecords.length > 0,
    };
  });

  let allPlainObjects = true;
  const discoveredParliamentCodes = new Set();

  safeRecords.forEach((record) => {
    const isObject = isPlainObject(record);

    if (!isObject) {
      allPlainObjects = false;
      REQUIRED_METRICS.forEach((metricKey) => {
        metricAvailability[metricKey].available_for_all_records = false;
      });
      return;
    }

    const geography = isPlainObject(record.geography)
      ? record.geography
      : {};

    const candidateParliamentCode = [
      geography.parliament_code,
      record.parliament_code,
      isPlainObject(record.constituency)
        ? record.constituency.parliament_code
        : "",
    ]
      .map((value) => normalizeParliamentCode(value))
      .find((value) => value.length > 0);

    if (candidateParliamentCode) {
      discoveredParliamentCodes.add(candidateParliamentCode);
    }

    const metrics = isPlainObject(record.metrics)
      ? record.metrics
      : {};

    REQUIRED_METRICS.forEach((metricKey) => {
      const metricValue = normalizeMetricValue(metrics[metricKey]);

      if (metricValue === null) {
        metricAvailability[metricKey].available_for_all_records = false;
        return;
      }

      metricAvailability[metricKey].available_record_count += 1;
      metricSums[metricKey] += metricValue;
    });
  });

  return {
    record_count: safeRecords.length,
    all_records_plain_objects: allPlainObjects,
    discovered_parliament_codes: [...discoveredParliamentCodes],
    metric_sums: metricSums,
    metric_availability: metricAvailability,
  };
}

function derivePerformanceStatus(totalBundleLoadMs) {
  const total = normalizeFiniteNonNegative(totalBundleLoadMs);

  if (total <= 1000) {
    return "FAST";
  }

  if (total <= 3000) {
    return "ACCEPTABLE";
  }

  return "REVIEW";
}

export function readPipDashboardPerformanceTime() {
  if (
    typeof performance !== "undefined" &&
    performance &&
    typeof performance.now === "function"
  ) {
    const now = Number(performance.now());
    if (Number.isFinite(now)) {
      return now;
    }
  }

  const fallback = Number(Date.now());
  return Number.isFinite(fallback) ? fallback : 0;
}

export function calculatePipDashboardPayloadBytes(value) {
  const text = String(value ?? "");

  if (typeof TextEncoder !== "undefined") {
    try {
      return toInteger(new TextEncoder().encode(text).length);
    } catch {
      // Fall through to Blob/string-length strategies.
    }
  }

  if (typeof Blob !== "undefined") {
    try {
      return toInteger(new Blob([text]).size);
    } catch {
      // Fall through to UTF-16 string length approximation.
    }
  }

  return toInteger(text.length);
}

export function buildPipDashboardPerformanceReconciliationReport({
  constituencyKey,
  metadata,
  overview,
  dunRecords,
  dmRecords,
  localityRecords,
  timings,
  payloadBytes,
}) {
  const safeMetadata = isPlainObject(metadata) ? metadata : {};
  const safeOverview = isPlainObject(overview) ? overview : {};
  const safeTimings = isPlainObject(timings) ? timings : {};
  const safePayloadBytes = isPlainObject(payloadBytes)
    ? payloadBytes
    : {};

  const constituency = isPlainObject(safeMetadata.constituency)
    ? safeMetadata.constituency
    : {};

  const dataset = isPlainObject(safeMetadata.dataset)
    ? safeMetadata.dataset
    : {};

  const overviewMetrics = isPlainObject(
    safeOverview?.overview?.metrics
  )
    ? safeOverview.overview.metrics
    : {};

  const overviewGeographyCounts = isPlainObject(
    safeOverview.geography_counts
  )
    ? safeOverview.geography_counts
    : {};

  const sourceType = normalizeText(dataset.sourceType).toUpperCase();

  const expectedParliamentCode = normalizeParliamentCode(
    constituency.parliamentCode
  );

  const dunAggregate = aggregateRecords(dunRecords);
  const dmAggregate = aggregateRecords(dmRecords);
  const localityAggregate = aggregateRecords(localityRecords);

  const overviewMetricValues = {};
  REQUIRED_METRICS.forEach((metricKey) => {
    overviewMetricValues[metricKey] = normalizeMetricValue(
      overviewMetrics[metricKey]
    );
  });

  const compareMetricAggregate = (aggregateLevel, metricKey) => {
    const overviewValue = overviewMetricValues[metricKey];
    const aggregateValue = normalizeMetricValue(
      aggregateLevel.metric_sums[metricKey]
    );

    const metricAvailability =
      aggregateLevel.metric_availability[metricKey] ?? {};

    const compareReady =
      metricAvailability.available_for_all_records === true &&
      overviewValue !== null &&
      aggregateValue !== null;

    return {
      compare_ready: compareReady,
      equal: compareReady
        ? Math.abs(overviewValue - aggregateValue) < 1e-9
        : false,
      availability: metricAvailability,
      overview_value: overviewValue,
      aggregate_value: aggregateValue,
    };
  };

  const dunMetricComparisons = {};
  const dmMetricComparisons = {};
  const localityMetricComparisons = {};

  REQUIRED_METRICS.forEach((metricKey) => {
    dunMetricComparisons[metricKey] = compareMetricAggregate(
      dunAggregate,
      metricKey
    );

    dmMetricComparisons[metricKey] = compareMetricAggregate(
      dmAggregate,
      metricKey
    );

    localityMetricComparisons[metricKey] = compareMetricAggregate(
      localityAggregate,
      metricKey
    );
  });

  const allReconciledValues = [
    ...REQUIRED_METRICS.map((metricKey) => overviewMetricValues[metricKey]),
    ...REQUIRED_METRICS.map(
      (metricKey) => dunAggregate.metric_sums[metricKey]
    ),
    ...REQUIRED_METRICS.map(
      (metricKey) => dmAggregate.metric_sums[metricKey]
    ),
    ...REQUIRED_METRICS.map(
      (metricKey) => localityAggregate.metric_sums[metricKey]
    ),
    dunAggregate.record_count,
    dmAggregate.record_count,
    localityAggregate.record_count,
  ];

  const normalizedTimings = {
    metadata_load_ms: normalizeFiniteNonNegative(
      safeTimings.metadata_load_ms
    ),
    aggregate_fetch_ms: normalizeFiniteNonNegative(
      safeTimings.aggregate_fetch_ms
    ),
    response_decode_ms: normalizeFiniteNonNegative(
      safeTimings.response_decode_ms
    ),
    jsonl_parse_ms: normalizeFiniteNonNegative(
      safeTimings.jsonl_parse_ms
    ),
    reconciliation_validation_ms: normalizeFiniteNonNegative(
      safeTimings.reconciliation_validation_ms
    ),
    total_bundle_load_ms: normalizeFiniteNonNegative(
      safeTimings.total_bundle_load_ms
    ),
  };

  const normalizedPayloads = {
    overview_bytes: toInteger(safePayloadBytes.overview_bytes),
    dun_bytes: toInteger(safePayloadBytes.dun_bytes),
    dm_bytes: toInteger(safePayloadBytes.dm_bytes),
    locality_bytes: toInteger(safePayloadBytes.locality_bytes),
    total_bytes: toInteger(
      safePayloadBytes.total_bytes ??
        toInteger(safePayloadBytes.overview_bytes) +
          toInteger(safePayloadBytes.dun_bytes) +
          toInteger(safePayloadBytes.dm_bytes) +
          toInteger(safePayloadBytes.locality_bytes)
    ),
  };

  const checks = {
    metadata_expected_total_equals_overview_total:
      normalizeMetricValue(dataset.expectedTotalVoters) !== null &&
      overviewMetricValues.total_voters !== null &&
      Math.abs(
        Number(dataset.expectedTotalVoters) -
          Number(overviewMetricValues.total_voters)
      ) < 1e-9,

    metadata_expected_dun_count_equals_loaded_dun_count:
      Number(dataset?.expectedRecordCounts?.dun) ===
      dunAggregate.record_count,

    metadata_expected_dm_count_equals_loaded_dm_count:
      Number(dataset?.expectedRecordCounts?.dm) ===
      dmAggregate.record_count,

    metadata_expected_locality_count_equals_loaded_locality_count:
      Number(dataset?.expectedRecordCounts?.locality) ===
      localityAggregate.record_count,

    overview_geography_dun_count_equals_loaded_dun_count:
      Number(overviewGeographyCounts.duns) ===
      dunAggregate.record_count,

    overview_geography_dm_count_equals_loaded_dm_count:
      Number(overviewGeographyCounts.dms) === dmAggregate.record_count,

    overview_geography_locality_count_equals_loaded_locality_count:
      Number(overviewGeographyCounts.localities) ===
      localityAggregate.record_count,

    dun_total_voters_sum_equals_overview_total_voters:
      dunMetricComparisons.total_voters.equal,

    dm_total_voters_sum_equals_overview_total_voters:
      dmMetricComparisons.total_voters.equal,

    locality_total_voters_sum_equals_overview_total_voters:
      localityMetricComparisons.total_voters.equal,

    dun_demographic_sums_equal_overview_metrics:
      REQUIRED_METRICS.every(
        (metricKey) => dunMetricComparisons[metricKey].equal
      ),

    dm_demographic_sums_equal_overview_metrics:
      REQUIRED_METRICS.every(
        (metricKey) => dmMetricComparisons[metricKey].equal
      ),

    locality_demographic_sums_equal_overview_metrics:
      REQUIRED_METRICS.every(
        (metricKey) => localityMetricComparisons[metricKey].equal
      ),

    all_reconciled_values_finite: allReconciledValues.every((value) =>
      Number.isFinite(Number(value))
    ),

    no_reconciled_count_negative: allReconciledValues.every(
      (value) => Number(value) >= 0
    ),

    every_loaded_record_plain_object:
      dunAggregate.all_records_plain_objects === true &&
      dmAggregate.all_records_plain_objects === true &&
      localityAggregate.all_records_plain_objects === true,

    every_aggregate_level_contains_expected_parliament_code:
      expectedParliamentCode.length > 0 &&
      dunAggregate.discovered_parliament_codes.includes(
        expectedParliamentCode
      ) &&
      dmAggregate.discovered_parliament_codes.includes(
        expectedParliamentCode
      ) &&
      localityAggregate.discovered_parliament_codes.includes(
        expectedParliamentCode
      ),
  };

  const reconciliationPassed = Object.values(checks).every(Boolean);

  const performanceStatus = derivePerformanceStatus(
    normalizedTimings.total_bundle_load_ms
  );

  const performanceAdvisoryChecks = {
    total_bundle_load_fast:
      normalizedTimings.total_bundle_load_ms <= 1000,
    total_bundle_load_acceptable:
      normalizedTimings.total_bundle_load_ms <= 3000,
    classification_fast: performanceStatus === "FAST",
    classification_acceptable:
      performanceStatus === "ACCEPTABLE",
    classification_review: performanceStatus === "REVIEW",
  };

  return {
    schema: PIP_DASHBOARD_PERFORMANCE_RECONCILIATION_SCHEMA,
    generated_at: new Date().toISOString(),
    constituency: {
      key: normalizeText(constituencyKey).toLowerCase(),
      parliament_code: expectedParliamentCode,
      parliament_name: normalizeText(constituency.parliamentName),
      state_name: normalizeText(constituency.stateName).toUpperCase(),
    },
    dataset: {
      dataset_id: normalizeText(dataset.datasetId),
      dataset_version: normalizeText(dataset.datasetVersion),
      source_type: sourceType,
      validation_fixture: sourceType === "VALIDATION_FIXTURE",
      expected_total_voters: safeNumber(dataset.expectedTotalVoters, 0),
      expected_record_counts: {
        dun: safeNumber(dataset?.expectedRecordCounts?.dun, 0),
        dm: safeNumber(dataset?.expectedRecordCounts?.dm, 0),
        locality: safeNumber(dataset?.expectedRecordCounts?.locality, 0),
      },
    },
    performance_measurements: normalizedTimings,
    payload_byte_measurements: normalizedPayloads,
    loaded_record_counts: {
      dun: dunAggregate.record_count,
      dm: dmAggregate.record_count,
      locality: localityAggregate.record_count,
    },
    overview_metric_values: {
      ...overviewMetricValues,
      geography_counts: {
        duns: safeNumber(overviewGeographyCounts.duns, 0),
        dms: safeNumber(overviewGeographyCounts.dms, 0),
        localities: safeNumber(
          overviewGeographyCounts.localities,
          0
        ),
      },
    },
    aggregate_sums: {
      dun: dunAggregate,
      dm: dmAggregate,
      locality: localityAggregate,
    },
    metric_availability: {
      dun: dunAggregate.metric_availability,
      dm: dmAggregate.metric_availability,
      locality: localityAggregate.metric_availability,
    },
    metric_comparisons: {
      dun: dunMetricComparisons,
      dm: dmMetricComparisons,
      locality: localityMetricComparisons,
    },
    reconciliation_checks: checks,
    performance_advisory_checks: performanceAdvisoryChecks,
    reconciliation_status: reconciliationPassed
      ? "PASSED"
      : "REVIEW_REQUIRED",
    performance_status: performanceStatus,
    overall_valid: reconciliationPassed,
  };
}

export function validatePipDashboardPerformanceReconciliationReport(report) {
  const safeReport = isPlainObject(report) ? report : {};

  const performanceMeasurements = isPlainObject(
    safeReport.performance_measurements
  )
    ? safeReport.performance_measurements
    : {};

  const payloadMeasurements = isPlainObject(
    safeReport.payload_byte_measurements
  )
    ? safeReport.payload_byte_measurements
    : {};

  const reconciliationChecks = isPlainObject(
    safeReport.reconciliation_checks
  )
    ? safeReport.reconciliation_checks
    : {};

  const checks = {
    schema:
      safeReport.schema ===
      PIP_DASHBOARD_PERFORMANCE_RECONCILIATION_SCHEMA,

    generatedAt:
      Number.isFinite(Date.parse(safeReport.generated_at)),

    requiredPerformanceMeasurements: REQUIRED_TIMINGS.every((key) => {
      const value = Number(performanceMeasurements[key]);
      return Number.isFinite(value) && value >= 0;
    }),

    requiredPayloadSizes: REQUIRED_PAYLOADS.every((key) => {
      const value = Number(payloadMeasurements[key]);
      return (
        Number.isFinite(value) &&
        value >= 0 &&
        Number.isInteger(value)
      );
    }),

    reconciliationChecksBoolean:
      Object.keys(reconciliationChecks).length > 0 &&
      Object.values(reconciliationChecks).every(
        (value) => typeof value === "boolean"
      ),

    reconciliationStatusMatchesChecks:
      safeReport.reconciliation_status ===
      (Object.values(reconciliationChecks).every(Boolean)
        ? "PASSED"
        : "REVIEW_REQUIRED"),

    overallValidMatchesReconciliation:
      Boolean(safeReport.overall_valid) ===
      Object.values(reconciliationChecks).every(Boolean),

    performanceStatusAllowed:
      safeReport.performance_status === "FAST" ||
      safeReport.performance_status === "ACCEPTABLE" ||
      safeReport.performance_status === "REVIEW",
  };

  const errors = [];

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(`Performance reconciliation check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      constituency_key: normalizeText(
        safeReport?.constituency?.key
      ).toLowerCase(),
      dataset_id: normalizeText(safeReport?.dataset?.dataset_id),
      reconciliation_status: normalizeText(
        safeReport.reconciliation_status
      ),
      performance_status: normalizeText(
        safeReport.performance_status
      ),
      reconciliation_check_count:
        Object.keys(reconciliationChecks).length,
      passed_reconciliation_check_count:
        Object.values(reconciliationChecks).filter(Boolean).length,
    },
  };
}
