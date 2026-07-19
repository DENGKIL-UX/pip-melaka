const NORMALISATION_SCHEMA = "pip.cross-constituency-normalisation.v1";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function safeNormalisedNumber(value, fallback = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return numericValue;
}

export function calculatePercentage(part, total) {
  const safeTotal = safeNormalisedNumber(total, 0);

  if (safeTotal <= 0) {
    return 0;
  }

  return (safeNormalisedNumber(part, 0) / safeTotal) * 100;
}

export function calculateRatePerTenThousand(count, total) {
  const safeTotal = safeNormalisedNumber(total, 0);

  if (safeTotal <= 0) {
    return 0;
  }

  return (safeNormalisedNumber(count, 0) / safeTotal) * 10000;
}

export function calculateAveragePopulation(total, groups) {
  const safeGroups = safeNormalisedNumber(groups, 0);

  if (safeGroups <= 0) {
    return 0;
  }

  return safeNormalisedNumber(total, 0) / safeGroups;
}

function roundDisplay(value, digits = 2) {
  const safeValue = safeNormalisedNumber(value, 0);
  return Number.isFinite(safeValue)
    ? Number(safeValue.toFixed(digits))
    : 0;
}

function toSourceMetrics(bundle) {
  return isPlainObject(bundle?.dashboardData?.overview?.metrics)
    ? bundle.dashboardData.overview.metrics
    : {};
}

function toSourceGeographyCounts(bundle) {
  return isPlainObject(bundle?.dashboardData?.geography_counts)
    ? bundle.dashboardData.geography_counts
    : {};
}

function buildMetricRow(primaryValue, comparisonValue, digits = 2) {
  const primary = safeNormalisedNumber(primaryValue, 0);
  const comparison = safeNormalisedNumber(comparisonValue, 0);
  const difference = comparison - primary;

  return {
    primary,
    comparison,
    difference,
    displayPrimary: roundDisplay(primary, digits),
    displayComparison: roundDisplay(comparison, digits),
    displayDifference: roundDisplay(difference, digits),
    direction:
      comparison > primary
        ? "higher"
        : comparison < primary
          ? "lower"
          : "equal",
  };
}

export function buildNormalisedConstituencyMetrics(bundle) {
  const metrics = toSourceMetrics(bundle);
  const geographyCounts = toSourceGeographyCounts(bundle);

  const totalVoters = safeNormalisedNumber(metrics.total_voters, 0);
  const duns = safeNormalisedNumber(geographyCounts.duns, 0);
  const dms = safeNormalisedNumber(geographyCounts.dms, 0);
  const localities = safeNormalisedNumber(geographyCounts.localities, 0);

  const normalised = {
    parliamentCode: String(bundle?.constituencyConfig?.parliamentCode ?? "").trim().toUpperCase(),
    stateName: String(bundle?.constituencyConfig?.stateName ?? "").trim().toUpperCase(),
    datasetId: String(bundle?.constituencyConfig?.datasetId ?? "").trim(),
    datasetSourceType: String(bundle?.constituencyConfig?.datasetSourceType ?? "").trim().toUpperCase(),
    validationFixture:
      String(bundle?.constituencyConfig?.datasetSourceType ?? "")
        .trim()
        .toUpperCase() === "VALIDATION_FIXTURE",
    totalVoters,
    demographicShares: {
      male_share_percent: calculatePercentage(metrics.male_voters, totalVoters),
      female_share_percent: calculatePercentage(metrics.female_voters, totalVoters),
      senior_56_plus_share_percent: calculatePercentage(
        metrics.senior_voters_56_plus,
        totalVoters
      ),
      known_age_coverage_percent: calculatePercentage(
        metrics.known_age_voters,
        totalVoters
      ),
      other_or_unknown_gender_share_percent: calculatePercentage(
        metrics.other_or_unknown_gender_voters,
        totalVoters
      ),
    },
    dataQualityRates: {
      profile_completeness_percent: calculatePercentage(
        metrics.profile_completeness_score,
        100
      ),
      cleansing_confidence_percent: calculatePercentage(
        metrics.average_cleansing_confidence,
        1
      ),
      gender_balance_score: calculatePercentage(
        metrics.gender_balance_score,
        100
      ),
    },
    geographyRates: {
      duns_per_10000_voters: calculateRatePerTenThousand(duns, totalVoters),
      dms_per_10000_voters: calculateRatePerTenThousand(dms, totalVoters),
      localities_per_10000_voters: calculateRatePerTenThousand(
        localities,
        totalVoters
      ),
    },
    averagePopulation: {
      average_voters_per_dun: calculateAveragePopulation(totalVoters, duns),
      average_voters_per_dm: calculateAveragePopulation(totalVoters, dms),
      average_voters_per_locality: calculateAveragePopulation(
        totalVoters,
        localities
      ),
    },
    sourceMetrics: {
      male_voters: safeNormalisedNumber(metrics.male_voters, 0),
      female_voters: safeNormalisedNumber(metrics.female_voters, 0),
      senior_voters_56_plus: safeNormalisedNumber(
        metrics.senior_voters_56_plus,
        0
      ),
      known_age_voters: safeNormalisedNumber(metrics.known_age_voters, 0),
      other_or_unknown_gender_voters: safeNormalisedNumber(
        metrics.other_or_unknown_gender_voters,
        0
      ),
      profile_completeness_score: safeNormalisedNumber(
        metrics.profile_completeness_score,
        0
      ),
      average_cleansing_confidence: safeNormalisedNumber(
        metrics.average_cleansing_confidence,
        0
      ),
      gender_balance_score: safeNormalisedNumber(
        metrics.gender_balance_score,
        0
      ),
    },
    sourceGeographyCounts: {
      duns,
      dms,
      localities,
    },
  };

  return normalised;
}

export function buildCrossConstituencyNormalisedComparison({
  primaryConstituencyBundle,
  comparisonConstituencyBundle,
}) {
  const primaryMetrics =
    buildNormalisedConstituencyMetrics(primaryConstituencyBundle);
  const comparisonMetrics =
    buildNormalisedConstituencyMetrics(comparisonConstituencyBundle);

  return {
    schema: NORMALISATION_SCHEMA,
    primaryConstituency: primaryMetrics,
    comparisonConstituency: comparisonMetrics,
    validationFixtureIncluded:
      primaryMetrics.validationFixture ||
      comparisonMetrics.validationFixture,
  };
}

function validateMetricPresence(metrics, requiredPaths) {
  const missing = [];

  requiredPaths.forEach((pathParts) => {
    let current = metrics;
    for (const part of pathParts) {
      current = current?.[part];
    }

    if (current === undefined || current === null) {
      missing.push(pathParts.join("."));
    }
  });

  return missing;
}

function validateFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

export function validateCrossConstituencyNormalisedComparison(value) {
  const comparison = isPlainObject(value) ? value : {};
  const primary = isPlainObject(comparison.primaryConstituency)
    ? comparison.primaryConstituency
    : null;
  const secondary = isPlainObject(comparison.comparisonConstituency)
    ? comparison.comparisonConstituency
    : null;

  const checks = {
    schema: comparison.schema === NORMALISATION_SCHEMA,
    identities: Boolean(
      primary?.parliamentCode &&
        secondary?.parliamentCode &&
        primary?.datasetId &&
        secondary?.datasetId
    ),
    requiredMetrics:
      primary &&
      secondary &&
      validateMetricPresence(primary, [
        ["demographicShares", "male_share_percent"],
        ["demographicShares", "female_share_percent"],
        ["demographicShares", "senior_56_plus_share_percent"],
        ["demographicShares", "known_age_coverage_percent"],
        ["demographicShares", "other_or_unknown_gender_share_percent"],
        ["dataQualityRates", "profile_completeness_percent"],
        ["dataQualityRates", "cleansing_confidence_percent"],
        ["dataQualityRates", "gender_balance_score"],
        ["geographyRates", "duns_per_10000_voters"],
        ["geographyRates", "dms_per_10000_voters"],
        ["geographyRates", "localities_per_10000_voters"],
        ["averagePopulation", "average_voters_per_dun"],
        ["averagePopulation", "average_voters_per_dm"],
        ["averagePopulation", "average_voters_per_locality"],
      ]).length === 0 &&
      validateMetricPresence(secondary, [
        ["demographicShares", "male_share_percent"],
        ["demographicShares", "female_share_percent"],
        ["demographicShares", "senior_56_plus_share_percent"],
        ["demographicShares", "known_age_coverage_percent"],
        ["demographicShares", "other_or_unknown_gender_share_percent"],
        ["dataQualityRates", "profile_completeness_percent"],
        ["dataQualityRates", "cleansing_confidence_percent"],
        ["dataQualityRates", "gender_balance_score"],
        ["geographyRates", "duns_per_10000_voters"],
        ["geographyRates", "dms_per_10000_voters"],
        ["geographyRates", "localities_per_10000_voters"],
        ["averagePopulation", "average_voters_per_dun"],
        ["averagePopulation", "average_voters_per_dm"],
        ["averagePopulation", "average_voters_per_locality"],
      ]).length === 0,
    finiteValues:
      [primary, secondary].every((bundle) => {
        const allNumbers = [
          bundle.totalVoters,
          bundle.demographicShares.male_share_percent,
          bundle.demographicShares.female_share_percent,
          bundle.demographicShares.senior_56_plus_share_percent,
          bundle.demographicShares.known_age_coverage_percent,
          bundle.demographicShares.other_or_unknown_gender_share_percent,
          bundle.dataQualityRates.profile_completeness_percent,
          bundle.dataQualityRates.cleansing_confidence_percent,
          bundle.dataQualityRates.gender_balance_score,
          bundle.geographyRates.duns_per_10000_voters,
          bundle.geographyRates.dms_per_10000_voters,
          bundle.geographyRates.localities_per_10000_voters,
          bundle.averagePopulation.average_voters_per_dun,
          bundle.averagePopulation.average_voters_per_dm,
          bundle.averagePopulation.average_voters_per_locality,
        ];

        return allNumbers.every(validateFiniteNumber);
      }),
    percentageRanges:
      [primary, secondary].every((bundle) =>
        [
          bundle.demographicShares.male_share_percent,
          bundle.demographicShares.female_share_percent,
          bundle.demographicShares.senior_56_plus_share_percent,
          bundle.demographicShares.known_age_coverage_percent,
          bundle.demographicShares.other_or_unknown_gender_share_percent,
          bundle.dataQualityRates.profile_completeness_percent,
          bundle.dataQualityRates.cleansing_confidence_percent,
          bundle.dataQualityRates.gender_balance_score,
        ].every((value) => value >= 0 && value <= 100)
      ),
    denominators:
      [primary, secondary].every((bundle) => bundle.totalVoters > 0),
    preservedDirection:
      primary.parliamentCode !== secondary.parliamentCode ||
      primary.datasetId !== secondary.datasetId ||
      primary.stateName !== secondary.stateName ||
      primary.validationFixture !== secondary.validationFixture,
    sourceBundlesUnmutated:
      Boolean(primary && secondary && comparison.primaryConstituency && comparison.comparisonConstituency),
  };

  const errors = [];

  if (!checks.schema) {
    errors.push(`Normalization schema must be ${NORMALISATION_SCHEMA}.`);
  }

  if (!checks.identities) {
    errors.push("Both constituency identities must exist.");
  }

  if (!checks.requiredMetrics) {
    errors.push("One or more normalised metrics are missing.");
  }

  if (!checks.finiteValues) {
    errors.push("One or more normalised metrics are NaN or Infinity.");
  }

  if (!checks.percentageRanges) {
    errors.push("Percentage metrics must remain between 0 and 100.");
  }

  if (!checks.denominators) {
    errors.push("Total-voter denominators must be greater than zero.");
  }

  if (!checks.preservedDirection) {
    errors.push("Comparison direction must be preserved.");
  }

  if (!checks.sourceBundlesUnmutated) {
    errors.push("Source bundles must not be mutated.");
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    comparison,
  };
}