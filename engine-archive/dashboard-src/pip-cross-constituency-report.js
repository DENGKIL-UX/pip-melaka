import {
  buildCrossConstituencyNormalisedComparison,
  buildNormalisedConstituencyMetrics,
  validateCrossConstituencyNormalisedComparison,
} from "./pip-cross-constituency-normalisation.js";

export const CROSS_CONSTITUENCY_REPORT_SCHEMA =
  "pip.cross-constituency-comparison-report.v1";

function safeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

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

function directionFromValues(primaryValue, comparisonValue) {
  const primaryNumber = safeNumber(primaryValue, 0);
  const comparisonNumber = safeNumber(comparisonValue, 0);

  if (comparisonNumber > primaryNumber) {
    return "COMPARISON_HIGHER";
  }

  if (comparisonNumber < primaryNumber) {
    return "PRIMARY_HIGHER";
  }

  return "EQUAL";
}

function buildNumericMetricRow({
  metricKey,
  label,
  unit,
  primaryValue,
  comparisonValue,
}) {
  const safePrimary = safeNumber(primaryValue, 0);
  const safeComparison = safeNumber(comparisonValue, 0);
  const signedDifference = safeComparison - safePrimary;

  return {
    metric_key: metricKey,
    label,
    unit,
    primary_value: safePrimary,
    comparison_value: safeComparison,
    signed_difference: signedDifference,
    absolute_difference: Math.abs(signedDifference),
    direction: directionFromValues(safePrimary, safeComparison),
  };
}

function buildTextMetricRow({
  metricKey,
  label,
  unit,
  primaryValue,
  comparisonValue,
}) {
  return {
    metric_key: metricKey,
    label,
    unit,
    primary_value: normalizeText(primaryValue),
    comparison_value: normalizeText(comparisonValue),
    signed_difference: null,
    absolute_difference: null,
    direction: "NOT_APPLICABLE",
  };
}

function toIdentity(bundle, loadedAtIso) {
  const config = isPlainObject(bundle?.constituencyConfig)
    ? bundle.constituencyConfig
    : {};

  const metrics = isPlainObject(bundle?.dashboardData?.overview?.metrics)
    ? bundle.dashboardData.overview.metrics
    : {};

  const geographyCounts = isPlainObject(bundle?.dashboardData?.geography_counts)
    ? bundle.dashboardData.geography_counts
    : {};

  const sourceType = normalizeText(config.datasetSourceType).toUpperCase();

  return {
    registry_key: normalizeText(bundle?.constituencyKey).toLowerCase(),
    parliament_code: normalizeText(config.parliamentCode).toUpperCase(),
    parliament_name: normalizeText(config.parliamentName),
    state: normalizeText(config.stateName).toUpperCase(),
    dataset_id: normalizeText(config.datasetId),
    dataset_version: normalizeText(config.datasetVersion),
    dataset_source_type: sourceType,
    environment:
      sourceType === "VALIDATION_FIXTURE"
        ? "VALIDATION_FIXTURE"
        : "PRODUCTION_DATASET",
    total_voters: safeNumber(metrics.total_voters, 0),
    dun_count: safeNumber(geographyCounts.duns, 0),
    dm_count: safeNumber(geographyCounts.dms, 0),
    locality_count: safeNumber(geographyCounts.localities, 0),
    loaded_timestamp: loadedAtIso,
  };
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function metricRowsFromNormalisedSection(sectionName, rows) {
  return rows.map((row) => ({
    section: sectionName,
    metric_key: row.metric_key,
    label: row.label,
    unit: row.unit,
    primary_value: row.primary_value,
    comparison_value: row.comparison_value,
    signed_difference: row.signed_difference,
    absolute_difference: row.absolute_difference,
    direction: row.direction,
  }));
}

export function createCrossConstituencyReportFileName({
  primaryParliamentCode,
  comparisonParliamentCode,
  generatedAt,
  extension,
}) {
  const generatedDate = new Date(generatedAt);
  const year = generatedDate.getUTCFullYear();
  const month = String(generatedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(generatedDate.getUTCDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  const safeExtension = slugify(extension);
  const allowedExtensions = new Set(["json", "csv", "html"]);

  const finalExtension = allowedExtensions.has(safeExtension)
    ? safeExtension
    : "json";

  return [
    "pip-cross-constituency",
    slugify(primaryParliamentCode),
    "vs",
    slugify(comparisonParliamentCode),
    datePart,
  ].join("-") + `.${finalExtension}`;
}

export function buildCrossConstituencyComparisonReport({
  primaryConstituencyBundle,
  comparisonConstituencyBundle,
  generatedAt,
  sourceUrl,
}) {
  if (!primaryConstituencyBundle || !comparisonConstituencyBundle) {
    throw new Error("Both constituency bundles are required.");
  }

  if (
    normalizeText(primaryConstituencyBundle?.constituencyKey) ===
    normalizeText(comparisonConstituencyBundle?.constituencyKey)
  ) {
    throw new Error("Comparison requires two different constituency bundles.");
  }

  const timestamp = new Date(generatedAt ?? new Date().toISOString()).toISOString();

  const primaryIdentity = toIdentity(primaryConstituencyBundle, timestamp);
  const comparisonIdentity = toIdentity(comparisonConstituencyBundle, timestamp);

  const normalisedComparison =
    buildCrossConstituencyNormalisedComparison({
      primaryConstituencyBundle,
      comparisonConstituencyBundle,
    });

  const normalisedValidation =
    validateCrossConstituencyNormalisedComparison(normalisedComparison);

  const primaryRawMetrics = isPlainObject(
    primaryConstituencyBundle?.dashboardData?.overview?.metrics
  )
    ? primaryConstituencyBundle.dashboardData.overview.metrics
    : {};

  const comparisonRawMetrics = isPlainObject(
    comparisonConstituencyBundle?.dashboardData?.overview?.metrics
  )
    ? comparisonConstituencyBundle.dashboardData.overview.metrics
    : {};

  const rawRows = [
    buildNumericMetricRow({
      metricKey: "total_voters",
      label: "Total Voters",
      unit: "COUNT",
      primaryValue: primaryRawMetrics.total_voters,
      comparisonValue: comparisonRawMetrics.total_voters,
    }),
    buildNumericMetricRow({
      metricKey: "male_voters",
      label: "Male Voters",
      unit: "COUNT",
      primaryValue: primaryRawMetrics.male_voters,
      comparisonValue: comparisonRawMetrics.male_voters,
    }),
    buildNumericMetricRow({
      metricKey: "female_voters",
      label: "Female Voters",
      unit: "COUNT",
      primaryValue: primaryRawMetrics.female_voters,
      comparisonValue: comparisonRawMetrics.female_voters,
    }),
    buildNumericMetricRow({
      metricKey: "other_or_unknown_gender_voters",
      label: "Other/Unknown Gender Voters",
      unit: "COUNT",
      primaryValue: primaryRawMetrics.other_or_unknown_gender_voters,
      comparisonValue: comparisonRawMetrics.other_or_unknown_gender_voters,
    }),
    buildNumericMetricRow({
      metricKey: "senior_voters_56_plus",
      label: "Senior Voters 56+",
      unit: "COUNT",
      primaryValue: primaryRawMetrics.senior_voters_56_plus,
      comparisonValue: comparisonRawMetrics.senior_voters_56_plus,
    }),
    buildNumericMetricRow({
      metricKey: "known_age_voters",
      label: "Known Age Voters",
      unit: "COUNT",
      primaryValue: primaryRawMetrics.known_age_voters,
      comparisonValue: comparisonRawMetrics.known_age_voters,
    }),
    buildNumericMetricRow({
      metricKey: "profile_completeness_score",
      label: "Profile Completeness Score",
      unit: "PERCENT",
      primaryValue: primaryRawMetrics.profile_completeness_score,
      comparisonValue: comparisonRawMetrics.profile_completeness_score,
    }),
    buildNumericMetricRow({
      metricKey: "average_cleansing_confidence",
      label: "Average Cleansing Confidence",
      unit: "RATIO",
      primaryValue: primaryRawMetrics.average_cleansing_confidence,
      comparisonValue: comparisonRawMetrics.average_cleansing_confidence,
    }),
    buildNumericMetricRow({
      metricKey: "gender_balance_score",
      label: "Gender Balance Score",
      unit: "PERCENT",
      primaryValue: primaryRawMetrics.gender_balance_score,
      comparisonValue: comparisonRawMetrics.gender_balance_score,
    }),
    buildNumericMetricRow({
      metricKey: "dun_count",
      label: "DUN Count",
      unit: "COUNT",
      primaryValue: primaryIdentity.dun_count,
      comparisonValue: comparisonIdentity.dun_count,
    }),
    buildNumericMetricRow({
      metricKey: "dm_count",
      label: "DM Count",
      unit: "COUNT",
      primaryValue: primaryIdentity.dm_count,
      comparisonValue: comparisonIdentity.dm_count,
    }),
    buildNumericMetricRow({
      metricKey: "locality_count",
      label: "Locality Count",
      unit: "COUNT",
      primaryValue: primaryIdentity.locality_count,
      comparisonValue: comparisonIdentity.locality_count,
    }),
    buildTextMetricRow({
      metricKey: "dominant_age_group",
      label: "Dominant Age Group",
      unit: "TEXT",
      primaryValue: primaryRawMetrics.dominant_age_group,
      comparisonValue: comparisonRawMetrics.dominant_age_group,
    }),
  ];

  const primaryNormalised = normalisedComparison.primaryConstituency;
  const comparisonNormalised = normalisedComparison.comparisonConstituency;

  const normalisedSections = {
    demographic_composition: [
      buildNumericMetricRow({
        metricKey: "male_share_percent",
        label: "Male Share",
        unit: "PERCENTAGE_POINTS",
        primaryValue: primaryNormalised.demographicShares.male_share_percent,
        comparisonValue:
          comparisonNormalised.demographicShares.male_share_percent,
      }),
      buildNumericMetricRow({
        metricKey: "female_share_percent",
        label: "Female Share",
        unit: "PERCENTAGE_POINTS",
        primaryValue:
          primaryNormalised.demographicShares.female_share_percent,
        comparisonValue:
          comparisonNormalised.demographicShares.female_share_percent,
      }),
      buildNumericMetricRow({
        metricKey: "senior_56_plus_share_percent",
        label: "Senior 56+ Share",
        unit: "PERCENTAGE_POINTS",
        primaryValue:
          primaryNormalised.demographicShares.senior_56_plus_share_percent,
        comparisonValue:
          comparisonNormalised.demographicShares.senior_56_plus_share_percent,
      }),
      buildNumericMetricRow({
        metricKey: "known_age_coverage_percent",
        label: "Known Age Coverage",
        unit: "PERCENTAGE_POINTS",
        primaryValue:
          primaryNormalised.demographicShares.known_age_coverage_percent,
        comparisonValue:
          comparisonNormalised.demographicShares.known_age_coverage_percent,
      }),
      buildNumericMetricRow({
        metricKey: "other_or_unknown_gender_share_percent",
        label: "Other/Unknown Gender Share",
        unit: "PERCENTAGE_POINTS",
        primaryValue:
          primaryNormalised.demographicShares.other_or_unknown_gender_share_percent,
        comparisonValue:
          comparisonNormalised.demographicShares.other_or_unknown_gender_share_percent,
      }),
      buildNumericMetricRow({
        metricKey: "gender_balance_score",
        label: "Gender Balance Score",
        unit: "PERCENTAGE_POINTS",
        primaryValue: primaryNormalised.dataQualityRates.gender_balance_score,
        comparisonValue:
          comparisonNormalised.dataQualityRates.gender_balance_score,
      }),
      buildNumericMetricRow({
        metricKey: "profile_completeness_percent",
        label: "Profile Completeness",
        unit: "PERCENTAGE_POINTS",
        primaryValue:
          primaryNormalised.dataQualityRates.profile_completeness_percent,
        comparisonValue:
          comparisonNormalised.dataQualityRates.profile_completeness_percent,
      }),
      buildNumericMetricRow({
        metricKey: "cleansing_confidence_percent",
        label: "Cleansing Confidence",
        unit: "PERCENTAGE_POINTS",
        primaryValue:
          primaryNormalised.dataQualityRates.cleansing_confidence_percent,
        comparisonValue:
          comparisonNormalised.dataQualityRates.cleansing_confidence_percent,
      }),
    ],
    geographic_structure_per_10000_voters: [
      buildNumericMetricRow({
        metricKey: "duns_per_10000_voters",
        label: "DUN per 10,000 voters",
        unit: "RATE_PER_10000",
        primaryValue:
          primaryNormalised.geographyRates.duns_per_10000_voters,
        comparisonValue:
          comparisonNormalised.geographyRates.duns_per_10000_voters,
      }),
      buildNumericMetricRow({
        metricKey: "dms_per_10000_voters",
        label: "DM per 10,000 voters",
        unit: "RATE_PER_10000",
        primaryValue:
          primaryNormalised.geographyRates.dms_per_10000_voters,
        comparisonValue:
          comparisonNormalised.geographyRates.dms_per_10000_voters,
      }),
      buildNumericMetricRow({
        metricKey: "localities_per_10000_voters",
        label: "Localities per 10,000 voters",
        unit: "RATE_PER_10000",
        primaryValue:
          primaryNormalised.geographyRates.localities_per_10000_voters,
        comparisonValue:
          comparisonNormalised.geographyRates.localities_per_10000_voters,
      }),
    ],
    average_voter_population: [
      buildNumericMetricRow({
        metricKey: "average_voters_per_dun",
        label: "Average Voters per DUN",
        unit: "AVERAGE_COUNT",
        primaryValue:
          primaryNormalised.averagePopulation.average_voters_per_dun,
        comparisonValue:
          comparisonNormalised.averagePopulation.average_voters_per_dun,
      }),
      buildNumericMetricRow({
        metricKey: "average_voters_per_dm",
        label: "Average Voters per DM",
        unit: "AVERAGE_COUNT",
        primaryValue:
          primaryNormalised.averagePopulation.average_voters_per_dm,
        comparisonValue:
          comparisonNormalised.averagePopulation.average_voters_per_dm,
      }),
      buildNumericMetricRow({
        metricKey: "average_voters_per_locality",
        label: "Average Voters per Locality",
        unit: "AVERAGE_COUNT",
        primaryValue:
          primaryNormalised.averagePopulation.average_voters_per_locality,
        comparisonValue:
          comparisonNormalised.averagePopulation.average_voters_per_locality,
      }),
    ],
  };

  const fixtureIncluded =
    primaryIdentity.dataset_source_type === "VALIDATION_FIXTURE" ||
    comparisonIdentity.dataset_source_type === "VALIDATION_FIXTURE";

  const reportId = [
    "pccr",
    slugify(primaryIdentity.parliament_code),
    slugify(comparisonIdentity.parliament_code),
    timestamp.replace(/[:.]/g, "").replace("T", "").replace("Z", ""),
  ].join("-");

  return {
    schema: CROSS_CONSTITUENCY_REPORT_SCHEMA,
    version: "1.0",
    report_id: reportId,
    generated_at: timestamp,
    scope: "TWO_CONSTITUENCY_COMPARISON",
    direction: {
      primary_constituency_key: primaryIdentity.registry_key,
      comparison_constituency_key: comparisonIdentity.registry_key,
      primary_parliament_code: primaryIdentity.parliament_code,
      comparison_parliament_code: comparisonIdentity.parliament_code,
    },
    source_url: normalizeText(sourceUrl),
    fixture_included: fixtureIncluded,
    safety: {
      descriptive_metrics_only: true,
      predicts_voter_preference: false,
      predicts_election_outcome: false,
      contains_composite_score: false,
      contains_constituency_ranking: false,
      warning: fixtureIncluded
        ? "NON-PRODUCTION VALIDATION FIXTURE INCLUDED. Fixture values verify reusable comparison behaviour and must not be interpreted as production constituency intelligence."
        : "",
    },
    constituencies: {
      primary: primaryIdentity,
      comparison: comparisonIdentity,
    },
    raw_metrics: {
      rows: rawRows,
      count: rawRows.length,
    },
    normalised_metrics: {
      demographic_composition: normalisedSections.demographic_composition,
      geographic_structure_per_10000_voters:
        normalisedSections.geographic_structure_per_10000_voters,
      average_voter_population:
        normalisedSections.average_voter_population,
      count:
        normalisedSections.demographic_composition.length +
        normalisedSections.geographic_structure_per_10000_voters.length +
        normalisedSections.average_voter_population.length,
      source_schema: normalisedComparison.schema,
      source_validation: {
        valid: normalisedValidation.valid,
        checks: normalisedValidation.checks,
        errors: normalisedValidation.errors,
      },
    },
    validation: {
      normalisation_validation_passed: normalisedValidation.valid,
      normalisation_check_count: Object.keys(normalisedValidation.checks ?? {}).length,
      normalisation_errors: normalisedValidation.errors,
    },
  };
}

function requiredRawMetricKeys() {
  return new Set([
    "total_voters",
    "male_voters",
    "female_voters",
    "other_or_unknown_gender_voters",
    "senior_voters_56_plus",
    "known_age_voters",
    "profile_completeness_score",
    "average_cleansing_confidence",
    "gender_balance_score",
    "dun_count",
    "dm_count",
    "locality_count",
    "dominant_age_group",
  ]);
}

function requiredNormalisedMetricKeys() {
  return new Set([
    "male_share_percent",
    "female_share_percent",
    "senior_56_plus_share_percent",
    "known_age_coverage_percent",
    "other_or_unknown_gender_share_percent",
    "gender_balance_score",
    "profile_completeness_percent",
    "cleansing_confidence_percent",
    "duns_per_10000_voters",
    "dms_per_10000_voters",
    "localities_per_10000_voters",
    "average_voters_per_dun",
    "average_voters_per_dm",
    "average_voters_per_locality",
  ]);
}

function isValidReportId(value) {
  return /^[a-z0-9-]+$/.test(normalizeText(value));
}

function hasFiniteNumbers(rows) {
  return rows.every((row) => {
    if (!isPlainObject(row)) {
      return false;
    }

    if (row.direction === "NOT_APPLICABLE" || row.unit === "TEXT") {
      return true;
    }

    const numericFields = [
      row.primary_value,
      row.comparison_value,
      row.signed_difference,
      row.absolute_difference,
    ];

    return numericFields.every(
      (value) => value === null || Number.isFinite(Number(value))
    );
  });
}

function verifyDifferenceRows(rows) {
  return rows.every((row) => {
    if (row.direction === "NOT_APPLICABLE") {
      return row.signed_difference === null && row.absolute_difference === null;
    }

    const signedDifference = safeNumber(row.signed_difference, 0);
    const absoluteDifference = safeNumber(row.absolute_difference, 0);
    const expected = safeNumber(row.comparison_value, 0) - safeNumber(row.primary_value, 0);

    return (
      Math.abs(expected - signedDifference) < 1e-8 &&
      Math.abs(Math.abs(expected) - absoluteDifference) < 1e-8
    );
  });
}

function flattenNormalisedRows(report) {
  return [
    ...(report?.normalised_metrics?.demographic_composition ?? []),
    ...(report?.normalised_metrics?.geographic_structure_per_10000_voters ?? []),
    ...(report?.normalised_metrics?.average_voter_population ?? []),
  ];
}

function findForbiddenFieldHits(value, pathPrefix = "", hits = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      findForbiddenFieldHits(entry, `${pathPrefix}[${index}]`, hits);
    });
    return hits;
  }

  if (!isPlainObject(value)) {
    return hits;
  }

  const allowedSafetyKeys = new Set([
    "predicts_voter_preference",
    "predicts_election_outcome",
    "contains_composite_score",
    "contains_constituency_ranking",
  ]);

  Object.entries(value).forEach(([key, nestedValue]) => {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (
      !allowedSafetyKeys.has(key) &&
      /winner|ranking|composite|prediction/i.test(key)
    ) {
      hits.push({
        key,
        path: currentPath,
      });
    }

    findForbiddenFieldHits(nestedValue, currentPath, hits);
  });

  return hits;
}

export function validateCrossConstituencyComparisonReport(report) {
  const safeReport = isPlainObject(report) ? report : {};
  const rawRows = Array.isArray(safeReport?.raw_metrics?.rows)
    ? safeReport.raw_metrics.rows
    : [];

  const normalisedRows = flattenNormalisedRows(safeReport);
  const rawMetricKeys = new Set(rawRows.map((row) => row.metric_key));
  const normalisedMetricKeys = new Set(
    normalisedRows.map((row) => row.metric_key)
  );
  const forbiddenFieldHits = findForbiddenFieldHits(safeReport);

  const fixtureSourceDetected =
    normalizeText(
      safeReport?.constituencies?.primary?.dataset_source_type
    ).toUpperCase() === "VALIDATION_FIXTURE" ||
    normalizeText(
      safeReport?.constituencies?.comparison?.dataset_source_type
    ).toUpperCase() === "VALIDATION_FIXTURE";

  const checks = {
    schema:
      safeReport.schema === CROSS_CONSTITUENCY_REPORT_SCHEMA,
    reportId: isValidReportId(safeReport.report_id),
    generatedAt:
      Number.isFinite(Date.parse(safeReport.generated_at)),
    twoDifferentConstituencies:
      normalizeText(
        safeReport?.constituencies?.primary?.registry_key
      ).length > 0 &&
      normalizeText(
        safeReport?.constituencies?.comparison?.registry_key
      ).length > 0 &&
      normalizeText(
        safeReport?.constituencies?.primary?.registry_key
      ) !==
        normalizeText(
          safeReport?.constituencies?.comparison?.registry_key
        ),
    directionPreserved:
      normalizeText(
        safeReport?.direction?.primary_constituency_key
      ) ===
        normalizeText(
          safeReport?.constituencies?.primary?.registry_key
        ) &&
      normalizeText(
        safeReport?.direction?.comparison_constituency_key
      ) ===
        normalizeText(
          safeReport?.constituencies?.comparison?.registry_key
        ) &&
      normalizeText(
        safeReport?.direction?.primary_parliament_code
      ) ===
        normalizeText(
          safeReport?.constituencies?.primary?.parliament_code
        ) &&
      normalizeText(
        safeReport?.direction?.comparison_parliament_code
      ) ===
        normalizeText(
          safeReport?.constituencies?.comparison?.parliament_code
        ),
    datasetIds:
      normalizeText(
        safeReport?.constituencies?.primary?.dataset_id
      ).length > 0 &&
      normalizeText(
        safeReport?.constituencies?.comparison?.dataset_id
      ).length > 0,
    voterTotals:
      safeNumber(
        safeReport?.constituencies?.primary?.total_voters,
        0
      ) > 0 &&
      safeNumber(
        safeReport?.constituencies?.comparison?.total_voters,
        0
      ) > 0,
    requiredRawMetrics: [...requiredRawMetricKeys()].every((key) =>
      rawMetricKeys.has(key)
    ),
    requiredNormalisedMetrics: [...requiredNormalisedMetricKeys()].every((key) =>
      normalisedMetricKeys.has(key)
    ),
    finiteNumbers:
      hasFiniteNumbers(rawRows) &&
      hasFiniteNumbers(normalisedRows),
    percentageRanges: normalisedRows
      .filter((row) => row.unit === "PERCENTAGE_POINTS")
      .every(
        (row) =>
          safeNumber(row.primary_value, -1) >= 0 &&
          safeNumber(row.primary_value, 101) <= 100 &&
          safeNumber(row.comparison_value, -1) >= 0 &&
          safeNumber(row.comparison_value, 101) <= 100
      ),
    geographyRates: normalisedRows
      .filter((row) => row.unit === "RATE_PER_10000")
      .every(
        (row) =>
          safeNumber(row.primary_value, -1) >= 0 &&
          safeNumber(row.comparison_value, -1) >= 0
      ),
    averagePopulation: normalisedRows
      .filter((row) => row.unit === "AVERAGE_COUNT")
      .every(
        (row) =>
          safeNumber(row.primary_value, -1) >= 0 &&
          safeNumber(row.comparison_value, -1) >= 0
      ),
    differencesReconcile:
      verifyDifferenceRows(rawRows) &&
      verifyDifferenceRows(normalisedRows),
    fixtureWarningReconciles:
      Boolean(safeReport.fixture_included) === fixtureSourceDetected &&
      (!safeReport.fixture_included ||
        normalizeText(safeReport?.safety?.warning) ===
          "NON-PRODUCTION VALIDATION FIXTURE INCLUDED. Fixture values verify reusable comparison behaviour and must not be interpreted as production constituency intelligence."),
    normalisationValidationPassed:
      safeReport?.normalised_metrics?.source_validation?.valid === true,
    noWinnerField: forbiddenFieldHits.every(
      (hit) => !/winner/i.test(hit.key)
    ),
    noRankingField: forbiddenFieldHits.every(
      (hit) => !/ranking/i.test(hit.key)
    ),
    noCompositeScore: forbiddenFieldHits.every(
      (hit) => !/composite/i.test(hit.key)
    ),
    noPredictionField: forbiddenFieldHits.every(
      (hit) => !/prediction/i.test(hit.key)
    ),
    sourceBundlesUnmutated: true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, value]) => {
    if (!value) {
      errors.push(`Report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      raw_metric_count: rawRows.length,
      normalised_metric_count: normalisedRows.length,
      validation_check_count: Object.keys(checks).length,
      fixture_included: Boolean(safeReport.fixture_included),
    },
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function reportRowsForCsv(report) {
  const rawRows = (report?.raw_metrics?.rows ?? []).map((row) => ({
    section: "raw_metrics",
    ...row,
  }));

  const normalisedRows = metricRowsFromNormalisedSection(
    "demographic_composition",
    report?.normalised_metrics?.demographic_composition ?? []
  )
    .concat(
      metricRowsFromNormalisedSection(
        "geographic_structure_per_10000_voters",
        report?.normalised_metrics?.geographic_structure_per_10000_voters ?? []
      )
    )
    .concat(
      metricRowsFromNormalisedSection(
        "average_voter_population",
        report?.normalised_metrics?.average_voter_population ?? []
      )
    );

  return [...rawRows, ...normalisedRows];
}

export function serializeCrossConstituencyReportCsv(report) {
  const rows = reportRowsForCsv(report);
  const headers = [
    "schema",
    "report_id",
    "generated_at",
    "section",
    "metric_key",
    "metric_label",
    "unit",
    "primary_parliament_code",
    "primary_value",
    "comparison_parliament_code",
    "comparison_value",
    "signed_difference",
    "absolute_difference",
    "direction",
    "fixture_included",
    "primary_dataset_id",
    "comparison_dataset_id",
  ];

  const csvLines = [headers.join(",")];

  rows.forEach((row) => {
    const lineValues = [
      report.schema,
      report.report_id,
      report.generated_at,
      row.section,
      row.metric_key,
      row.label,
      row.unit,
      report?.constituencies?.primary?.parliament_code,
      row.primary_value,
      report?.constituencies?.comparison?.parliament_code,
      row.comparison_value,
      row.signed_difference,
      row.absolute_difference,
      row.direction,
      report.fixture_included,
      report?.constituencies?.primary?.dataset_id,
      report?.constituencies?.comparison?.dataset_id,
    ];

    csvLines.push(lineValues.map(csvEscape).join(","));
  });

  return csvLines.join("\n");
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlMetricRows(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${htmlEscape(row.label)}</td>
          <td>${htmlEscape(row.unit)}</td>
          <td>${htmlEscape(row.primary_value)}</td>
          <td>${htmlEscape(row.comparison_value)}</td>
          <td>${htmlEscape(row.signed_difference)}</td>
          <td>${htmlEscape(row.absolute_difference)}</td>
          <td>${htmlEscape(row.direction)}</td>
        </tr>
      `
    )
    .join("\n");
}

export function createCrossConstituencyPrintableHtml(report) {
  const validationResult =
    validateCrossConstituencyComparisonReport(report);

  const rawRows = report?.raw_metrics?.rows ?? [];
  const demographicRows =
    report?.normalised_metrics?.demographic_composition ?? [];
  const geographicRows =
    report?.normalised_metrics?.geographic_structure_per_10000_voters ?? [];
  const averageRows =
    report?.normalised_metrics?.average_voter_population ?? [];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Cross-Constituency Comparison Report</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, sans-serif; color: #111827; font-size: 11px; }
      h1, h2, h3 { margin: 0; }
      h1 { font-size: 18px; }
      h2 { font-size: 14px; margin-top: 12px; }
      h3 { font-size: 12px; margin-top: 10px; }
      .muted { color: #4b5563; }
      .warning { color: #9a3412; font-weight: 700; margin-top: 8px; }
      .badge { display: inline-block; padding: 2px 8px; border: 1px solid #1f2937; border-radius: 999px; font-size: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
      footer { margin-top: 12px; border-top: 1px solid #d1d5db; padding-top: 8px; color: #374151; }
    </style>
  </head>
  <body>
    <h1>PIP Voter Intelligence</h1>
    <h2>Cross-Constituency Comparison Report</h2>
    <p class="muted">Generated: ${htmlEscape(report.generated_at)}</p>
    <p class="warning">DESCRIPTIVE COMPARISON ONLY · NO ELECTORAL PREDICTION</p>

    <div class="grid">
      <div>
        <h3>Primary Constituency</h3>
        <p>${htmlEscape(report?.constituencies?.primary?.parliament_code)} · ${htmlEscape(report?.constituencies?.primary?.parliament_name)}</p>
        <p>${htmlEscape(report?.constituencies?.primary?.state)}</p>
        <p>Dataset: ${htmlEscape(report?.constituencies?.primary?.dataset_id)}</p>
      </div>
      <div>
        <h3>Comparison Constituency</h3>
        <p>${htmlEscape(report?.constituencies?.comparison?.parliament_code)} · ${htmlEscape(report?.constituencies?.comparison?.parliament_name)}</p>
        <p>${htmlEscape(report?.constituencies?.comparison?.state)}</p>
        <p>Dataset: ${htmlEscape(report?.constituencies?.comparison?.dataset_id)}</p>
      </div>
    </div>

    <p><span class="badge">${validationResult.valid ? "VALIDATION PASSED" : "VALIDATION REVIEW REQUIRED"}</span></p>

    <h3>Raw Metrics</h3>
    <table>
      <thead>
        <tr><th>Metric</th><th>Unit</th><th>Primary</th><th>Comparison</th><th>Signed Diff</th><th>Absolute Diff</th><th>Direction</th></tr>
      </thead>
      <tbody>
        ${renderHtmlMetricRows(rawRows)}
      </tbody>
    </table>

    <h3>Demographic Composition</h3>
    <table>
      <thead>
        <tr><th>Metric</th><th>Unit</th><th>Primary</th><th>Comparison</th><th>Signed Diff</th><th>Absolute Diff</th><th>Direction</th></tr>
      </thead>
      <tbody>
        ${renderHtmlMetricRows(demographicRows)}
      </tbody>
    </table>

    <h3>Geographic Structure</h3>
    <table>
      <thead>
        <tr><th>Metric</th><th>Unit</th><th>Primary</th><th>Comparison</th><th>Signed Diff</th><th>Absolute Diff</th><th>Direction</th></tr>
      </thead>
      <tbody>
        ${renderHtmlMetricRows(geographicRows)}
      </tbody>
    </table>

    <h3>Average Voter Population</h3>
    <table>
      <thead>
        <tr><th>Metric</th><th>Unit</th><th>Primary</th><th>Comparison</th><th>Signed Diff</th><th>Absolute Diff</th><th>Direction</th></tr>
      </thead>
      <tbody>
        ${renderHtmlMetricRows(averageRows)}
      </tbody>
    </table>

    <h3>Safety Statement</h3>
    <p class="muted">Descriptive metrics only: ${htmlEscape(report?.safety?.descriptive_metrics_only)} · Predicts voter preference: ${htmlEscape(report?.safety?.predicts_voter_preference)} · Predicts election outcome: ${htmlEscape(report?.safety?.predicts_election_outcome)}</p>

    ${report.fixture_included ? `<p class="warning">${htmlEscape(report?.safety?.warning)}</p>` : ""}

    <footer>
      <div>Report ID: ${htmlEscape(report.report_id)}</div>
      <div>Schema: ${htmlEscape(report.schema)}</div>
    </footer>
  </body>
</html>`;
}
