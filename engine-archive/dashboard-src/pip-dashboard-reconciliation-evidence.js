export const PIP_DASHBOARD_RECONCILIATION_EVIDENCE_SCHEMA =
  "pip.dashboard.reconciliation-evidence.v1";

const SUPPORTED_RECONCILIATION_STATUSES = new Set([
  "PASSED",
  "REVIEW_REQUIRED",
]);

const SUPPORTED_PERFORMANCE_STATUSES = new Set([
  "FAST",
  "ACCEPTABLE",
  "REVIEW",
]);

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

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function toUpper(value) {
  return normalizeText(value).toUpperCase();
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableValue(entry));
  }

  if (isPlainObject(value)) {
    const ordered = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        ordered[key] = stableValue(value[key]);
      });
    return ordered;
  }

  return value;
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toUtcSuffix(generatedAt) {
  const date = new Date(generatedAt);

  if (!Number.isFinite(date.getTime())) {
    return "00000000T000000Z";
  }

  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function toConstituencyEvidence(bundle) {
  const report = isPlainObject(bundle?.performanceReconciliationReport)
    ? bundle.performanceReconciliationReport
    : {};

  const validation = isPlainObject(
    bundle?.performanceReconciliationValidation
  )
    ? bundle.performanceReconciliationValidation
    : { valid: false, errors: [] };

  const reconciliationChecks = isPlainObject(
    report.reconciliation_checks
  )
    ? report.reconciliation_checks
    : {};

  const passedChecks = Object.values(reconciliationChecks).filter(Boolean)
    .length;

  const totalChecks = Object.keys(reconciliationChecks).length;

  return {
    constituency_key: normalizeKey(
      report?.constituency?.key ?? bundle?.constituencyKey
    ),
    parliament_code: toUpper(
      report?.constituency?.parliament_code ??
        bundle?.constituencyConfig?.parliamentCode
    ),
    parliament_name: normalizeText(
      report?.constituency?.parliament_name ??
        bundle?.constituencyConfig?.parliamentName
    ),
    state_name: toUpper(
      report?.constituency?.state_name ??
        bundle?.constituencyConfig?.stateName
    ),
    dataset_id: normalizeText(
      report?.dataset?.dataset_id ??
        bundle?.constituencyConfig?.datasetId
    ),
    dataset_version: normalizeText(
      report?.dataset?.dataset_version ??
        bundle?.constituencyConfig?.datasetVersion
    ),
    source_type: toUpper(
      report?.dataset?.source_type ??
        bundle?.constituencyConfig?.datasetSourceType
    ),
    validation_fixture:
      report?.dataset?.validation_fixture === true,
    reconciliation_status: normalizeText(
      report?.reconciliation_status
    ),
    performance_status: normalizeText(
      report?.performance_status
    ),
    overall_valid: report?.overall_valid === true,
    report_validation_valid: validation.valid === true,
    loaded_record_counts: {
      dun: safeNumber(report?.loaded_record_counts?.dun, 0),
      dm: safeNumber(report?.loaded_record_counts?.dm, 0),
      locality: safeNumber(
        report?.loaded_record_counts?.locality,
        0
      ),
    },
    overview_total_voters: safeNumber(
      report?.overview_metric_values?.total_voters,
      0
    ),
    dun_voter_sum: safeNumber(
      report?.aggregate_sums?.dun?.metric_sums?.total_voters,
      0
    ),
    dm_voter_sum: safeNumber(
      report?.aggregate_sums?.dm?.metric_sums?.total_voters,
      0
    ),
    locality_voter_sum: safeNumber(
      report?.aggregate_sums?.locality?.metric_sums?.total_voters,
      0
    ),
    performance_measurements: stableValue(
      isPlainObject(report?.performance_measurements)
        ? report.performance_measurements
        : {}
    ),
    payload_byte_measurements: stableValue(
      isPlainObject(report?.payload_byte_measurements)
        ? report.payload_byte_measurements
        : {}
    ),
    reconciliation_checks: stableValue(reconciliationChecks),
    passed_check_count: passedChecks,
    total_check_count: totalChecks,
    validation_errors: Array.isArray(validation.errors)
      ? validation.errors.map((entry) => normalizeText(entry))
      : [],
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function collectForbiddenRawRecordKeys(value, pathPrefix = "", hits = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectForbiddenRawRecordKeys(
        entry,
        `${pathPrefix}[${index}]`,
        hits
      );
    });
    return hits;
  }

  if (!isPlainObject(value)) {
    return hits;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (
      /^(dunRecords|dmRecords|localityRecords|dun_records|dm_records|locality_records)$/i.test(
        key
      )
    ) {
      hits.push(currentPath);
    }

    collectForbiddenRawRecordKeys(nestedValue, currentPath, hits);
  });

  return hits;
}

export function buildPipDashboardReconciliationEvidence({
  primaryConstituencyBundle,
  comparisonConstituencyBundle,
  generatedAt,
  sourceUrl,
}) {
  const primaryEntry = toConstituencyEvidence(primaryConstituencyBundle);

  const entries = [primaryEntry];

  if (comparisonConstituencyBundle) {
    entries.push(
      toConstituencyEvidence(comparisonConstituencyBundle)
    );
  }

  const performanceStatusCounts = {
    FAST: entries.filter((entry) => entry.performance_status === "FAST")
      .length,
    ACCEPTABLE: entries.filter(
      (entry) => entry.performance_status === "ACCEPTABLE"
    ).length,
    REVIEW: entries.filter(
      (entry) => entry.performance_status === "REVIEW"
    ).length,
  };

  const totalChecks = entries.reduce(
    (sum, entry) => sum + safeNumber(entry.total_check_count, 0),
    0
  );

  const passedChecks = entries.reduce(
    (sum, entry) => sum + safeNumber(entry.passed_check_count, 0),
    0
  );

  const failedChecks = totalChecks - passedChecks;

  const totalPayloadBytes = entries.reduce(
    (sum, entry) =>
      sum +
      safeNumber(
        entry?.payload_byte_measurements?.total_bytes,
        0
      ),
    0
  );

  return {
    schema: PIP_DASHBOARD_RECONCILIATION_EVIDENCE_SCHEMA,
    generated_at: new Date(
      generatedAt ?? new Date().toISOString()
    ).toISOString(),
    source_url: normalizeText(sourceUrl),
    comparison_active: entries.length > 1,
    fixture_included: entries.some(
      (entry) => entry.validation_fixture === true
    ),
    constituency_count: entries.length,
    summary: {
      all_reconciliations_passed: entries.every(
        (entry) => entry.reconciliation_status === "PASSED"
      ),
      all_reports_valid: entries.every(
        (entry) => entry.report_validation_valid === true
      ),
      primary_parliament_code: entries[0]?.parliament_code || "",
      comparison_parliament_code:
        entries[1]?.parliament_code || "",
      total_constituencies: entries.length,
      total_checks: totalChecks,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      performance_status_counts: performanceStatusCounts,
      total_payload_bytes: totalPayloadBytes,
    },
    constituencies: entries,
    safety: {
      performance_classification_diagnostic_only: true,
      validation_fixture_non_production: true,
      aggregate_validation_information_only: true,
      includes_voter_preference_prediction: false,
      note:
        "This evidence package contains aggregate reconciliation diagnostics only and excludes raw records and persistence data.",
    },
  };
}

export function validatePipDashboardReconciliationEvidence(evidence) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};

  const constituencies = Array.isArray(safeEvidence.constituencies)
    ? safeEvidence.constituencies
    : [];

  const constituencyKeys = constituencies.map((entry) =>
    normalizeKey(entry?.constituency_key)
  );

  const parliamentCodes = constituencies.map((entry) =>
    toUpper(entry?.parliament_code)
  );

  const totalChecks = constituencies.reduce(
    (sum, entry) =>
      sum + safeNumber(entry?.total_check_count, 0),
    0
  );

  const passedChecks = constituencies.reduce(
    (sum, entry) =>
      sum + safeNumber(entry?.passed_check_count, 0),
    0
  );

  const failedChecks = totalChecks - passedChecks;

  const statusSupported = constituencies.every(
    (entry) =>
      SUPPORTED_RECONCILIATION_STATUSES.has(
        normalizeText(entry?.reconciliation_status)
      ) &&
      SUPPORTED_PERFORMANCE_STATUSES.has(
        normalizeText(entry?.performance_status)
      )
  );

  const passedCountMatchesChecks = constituencies.every((entry) => {
    const checks = isPlainObject(entry?.reconciliation_checks)
      ? entry.reconciliation_checks
      : {};

    const passed = Object.values(checks).filter(Boolean).length;

    return (
      safeNumber(entry?.passed_check_count, -1) === passed &&
      safeNumber(entry?.total_check_count, -1) ===
        Object.keys(checks).length
    );
  });

  const summary = isPlainObject(safeEvidence.summary)
    ? safeEvidence.summary
    : {};

  const forbiddenRawKeyHits = collectForbiddenRawRecordKeys(
    safeEvidence
  );

  const checks = {
    schema:
      safeEvidence.schema ===
      PIP_DASHBOARD_RECONCILIATION_EVIDENCE_SCHEMA,
    generatedAt:
      Number.isFinite(Date.parse(safeEvidence.generated_at)),
    atLeastOneConstituency: constituencies.length >= 1,
    constituencyCountMatchesArray:
      safeNumber(safeEvidence.constituency_count, -1) ===
      constituencies.length,
    uniqueConstituencyKeys:
      new Set(constituencyKeys).size ===
        constituencyKeys.length &&
      constituencyKeys.every((value) => value.length > 0),
    uniqueParliamentCodes:
      new Set(parliamentCodes).size ===
        parliamentCodes.length &&
      parliamentCodes.every((value) => value.length > 0),
    supportedStatuses: statusSupported,
    passedCountsMatchChecks: passedCountMatchesChecks,
    summaryTotalsMatchEntries:
      safeNumber(summary.total_constituencies, -1) ===
        constituencies.length &&
      safeNumber(summary.total_checks, -1) === totalChecks &&
      safeNumber(summary.passed_checks, -1) === passedChecks &&
      safeNumber(summary.failed_checks, -1) === failedChecks,
    summaryAllReconciliationsMatches:
      Boolean(summary.all_reconciliations_passed) ===
      constituencies.every(
        (entry) =>
          normalizeText(entry.reconciliation_status) === "PASSED"
      ),
    summaryAllReportsValidMatches:
      Boolean(summary.all_reports_valid) ===
      constituencies.every(
        (entry) => entry.report_validation_valid === true
      ),
    fixtureStatusMatchesEntries:
      Boolean(safeEvidence.fixture_included) ===
      constituencies.some(
        (entry) => entry.validation_fixture === true
      ),
    comparisonActiveMatchesEntries:
      Boolean(safeEvidence.comparison_active) ===
      (constituencies.length > 1),
    forbiddenRawRecordKeysAbsent:
      forbiddenRawKeyHits.length === 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([checkName, passed]) => {
    if (!passed) {
      errors.push(`Evidence check failed: ${checkName}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      constituency_count: constituencies.length,
      total_checks: totalChecks,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      fixture_included: Boolean(safeEvidence.fixture_included),
      comparison_active: Boolean(safeEvidence.comparison_active),
    },
  };
}

export function serializePipDashboardReconciliationEvidenceCsv(
  evidence
) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  const constituencies = Array.isArray(safeEvidence.constituencies)
    ? safeEvidence.constituencies
    : [];

  const headers = [
    "schema",
    "generated_at",
    "source_url",
    "constituency_key",
    "parliament_code",
    "parliament_name",
    "state_name",
    "dataset_id",
    "dataset_version",
    "source_type",
    "validation_fixture",
    "reconciliation_status",
    "performance_status",
    "overall_valid",
    "report_validation_valid",
    "dun_count",
    "dm_count",
    "locality_count",
    "overview_total_voters",
    "dun_voter_sum",
    "dm_voter_sum",
    "locality_voter_sum",
    "passed_checks",
    "total_checks",
    "metadata_load_ms",
    "aggregate_fetch_ms",
    "response_decode_ms",
    "jsonl_parse_ms",
    "reconciliation_validation_ms",
    "total_bundle_load_ms",
    "total_payload_bytes",
  ];

  const lines = [headers.join(",")];

  constituencies.forEach((entry) => {
    const line = [
      safeEvidence.schema,
      safeEvidence.generated_at,
      safeEvidence.source_url,
      entry.constituency_key,
      entry.parliament_code,
      entry.parliament_name,
      entry.state_name,
      entry.dataset_id,
      entry.dataset_version,
      entry.source_type,
      entry.validation_fixture,
      entry.reconciliation_status,
      entry.performance_status,
      entry.overall_valid,
      entry.report_validation_valid,
      entry?.loaded_record_counts?.dun,
      entry?.loaded_record_counts?.dm,
      entry?.loaded_record_counts?.locality,
      entry.overview_total_voters,
      entry.dun_voter_sum,
      entry.dm_voter_sum,
      entry.locality_voter_sum,
      entry.passed_check_count,
      entry.total_check_count,
      entry?.performance_measurements?.metadata_load_ms,
      entry?.performance_measurements?.aggregate_fetch_ms,
      entry?.performance_measurements?.response_decode_ms,
      entry?.performance_measurements?.jsonl_parse_ms,
      entry?.performance_measurements
        ?.reconciliation_validation_ms,
      entry?.performance_measurements?.total_bundle_load_ms,
      entry?.payload_byte_measurements?.total_bytes,
    ];

    lines.push(line.map(csvEscape).join(","));
  });

  return lines.join("\r\n");
}

export function createPipDashboardReconciliationEvidenceFileName({
  primaryParliamentCode,
  comparisonParliamentCode,
  generatedAt,
  extension,
}) {
  const safePrimary = slugify(primaryParliamentCode);
  const safeComparison = slugify(comparisonParliamentCode);
  const utcSuffix = toUtcSuffix(generatedAt);

  const safeExtension = slugify(extension);
  const supportedExtensions = new Set(["json", "csv"]);
  const finalExtension = supportedExtensions.has(safeExtension)
    ? safeExtension
    : "json";

  const base = safeComparison
    ? `pip-dashboard-reconciliation-${safePrimary}-vs-${safeComparison}`
    : `pip-dashboard-reconciliation-${safePrimary}`;

  return `${base}-${utcSuffix}.${finalExtension}`;
}
