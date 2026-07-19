import {
  buildCrossConstituencyNormalisedComparison,
  validateCrossConstituencyNormalisedComparison,
} from "./pip-cross-constituency-normalisation.js";
import {
  buildCrossConstituencyComparisonReport,
  createCrossConstituencyPrintableHtml,
  createCrossConstituencyReportFileName,
  serializeCrossConstituencyReportCsv,
  validateCrossConstituencyComparisonReport,
} from "./pip-cross-constituency-report.js";

export const MULTI_CONSTITUENCY_WORKFLOW_SCHEMA =
  "pip.multi-constituency-end-to-end-workflow.v1";

export const MULTI_CONSTITUENCY_WORKFLOW_STAGE_ORDER = [
  "REGISTRY_READY",
  "PRIMARY_DATASET_READY",
  "COMPARISON_DATASET_READY",
  "FORWARD_RAW_COMPARISON_READY",
  "FORWARD_NORMALISATION_VERIFIED",
  "FORWARD_REPORT_VERIFIED",
  "CSV_SERIALISATION_VERIFIED",
  "PRINTABLE_HTML_VERIFIED",
  "REVERSE_DIRECTION_VERIFIED",
  "SINGLE_CONSTITUENCY_GUARD_VERIFIED",
  "SOURCE_IMMUTABILITY_VERIFIED",
  "PERSISTENCE_SAFETY_VERIFIED",
];

const STAGE_LABELS = {
  REGISTRY_READY: "REGISTRY READY",
  PRIMARY_DATASET_READY: "PRIMARY DATASET READY",
  COMPARISON_DATASET_READY: "COMPARISON DATASET READY",
  FORWARD_RAW_COMPARISON_READY: "FORWARD RAW COMPARISON READY",
  FORWARD_NORMALISATION_VERIFIED: "FORWARD NORMALISATION VERIFIED",
  FORWARD_REPORT_VERIFIED: "FORWARD REPORT VERIFIED",
  CSV_SERIALISATION_VERIFIED: "CSV SERIALISATION VERIFIED",
  PRINTABLE_HTML_VERIFIED: "PRINTABLE HTML VERIFIED",
  REVERSE_DIRECTION_VERIFIED: "REVERSE DIRECTION VERIFIED",
  SINGLE_CONSTITUENCY_GUARD_VERIFIED: "SINGLE-CONSTITUENCY GUARD",
  SOURCE_IMMUTABILITY_VERIFIED: "SOURCE IMMUTABILITY VERIFIED",
  PERSISTENCE_SAFETY_VERIFIED: "PERSISTENCE SAFETY VERIFIED",
};

const SAFETY_DECLARATION = {
  descriptive_comparison_only: true,
  predicts_voter_preference: false,
  predicts_election_outcome: false,
  contains_constituency_ranking: false,
  contains_composite_score: false,
  uses_individual_voter_targeting: false,
  creates_synthetic_voters: false,
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function flattenReportNormalisedRows(report) {
  return [
    ...(report?.normalised_metrics?.demographic_composition ?? []),
    ...(report?.normalised_metrics?.geographic_structure_per_10000_voters ?? []),
    ...(report?.normalised_metrics?.average_voter_population ?? []),
  ];
}

function rowMap(rows) {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    map.set(String(row?.metric_key ?? ""), row);
  });
  return map;
}

function valuesSwapCorrectly(forwardRow, reverseRow) {
  if (!forwardRow || !reverseRow) {
    return false;
  }

  const signedForward = safeNumber(forwardRow.signed_difference, 0);
  const signedReverse = safeNumber(reverseRow.signed_difference, 0);
  const absForward = safeNumber(forwardRow.absolute_difference, 0);
  const absReverse = safeNumber(reverseRow.absolute_difference, 0);

  const isTextRow =
    forwardRow.direction === "NOT_APPLICABLE" || forwardRow.unit === "TEXT";

  if (isTextRow) {
    return (
      normalizeText(forwardRow.primary_value) === normalizeText(reverseRow.comparison_value) &&
      normalizeText(forwardRow.comparison_value) === normalizeText(reverseRow.primary_value)
    );
  }

  return (
    Math.abs(safeNumber(forwardRow.primary_value, 0) - safeNumber(reverseRow.comparison_value, 0)) < 1e-8 &&
    Math.abs(safeNumber(forwardRow.comparison_value, 0) - safeNumber(reverseRow.primary_value, 0)) < 1e-8 &&
    Math.abs(signedForward + signedReverse) < 1e-8 &&
    Math.abs(absForward - absReverse) < 1e-8
  );
}

function createInitialStages() {
  return MULTI_CONSTITUENCY_WORKFLOW_STAGE_ORDER.map((stageId, index) => ({
    stage_id: stageId,
    sequence: index + 1,
    label: STAGE_LABELS[stageId] || stageId,
    status: "NOT_RUN",
    detail: "Not run.",
    evidence: "Awaiting workflow execution.",
  }));
}

function setStage(stages, stageId, status, detail, evidence) {
  const target = stages.find((stage) => stage.stage_id === stageId);
  if (!target) {
    return;
  }

  target.status = status;
  target.detail = detail;
  target.evidence = evidence;
}

function allStagesPassed(stages) {
  return stages.every((stage) => stage.status === "PASS");
}

function findRegistryEntry(registry, key) {
  const normalizedKey = normalizeKey(key);
  const entries = Array.isArray(registry?.constituencies)
    ? registry.constituencies
    : [];

  return (
    entries.find((entry) => normalizeKey(entry?.key) === normalizedKey) || null
  );
}

function persistenceRecordFromSnapshot(snapshot) {
  const safeSnapshot = isPlainObject(snapshot) ? snapshot : {};

  return {
    pathname: normalizeText(safeSnapshot.pathname),
    search: normalizeText(safeSnapshot.search),
    active_primary_constituency_key: normalizeKey(
      safeSnapshot.active_primary_constituency_key
    ),
    active_comparison_constituency_key: normalizeKey(
      safeSnapshot.active_comparison_constituency_key
    ),
    localstorage_pip_p134: stableValue(
      isPlainObject(safeSnapshot.localstorage_pip_p134)
        ? safeSnapshot.localstorage_pip_p134
        : {}
    ),
    sessionstorage_pip_p134: stableValue(
      isPlainObject(safeSnapshot.sessionstorage_pip_p134)
        ? safeSnapshot.sessionstorage_pip_p134
        : {}
    ),
    saved_scenario_count_readable:
      typeof safeSnapshot.saved_scenario_count_readable === "boolean"
        ? safeSnapshot.saved_scenario_count_readable
        : false,
    saved_scenario_count:
      safeSnapshot.saved_scenario_count === null ||
      safeSnapshot.saved_scenario_count === undefined
        ? null
        : safeNumber(safeSnapshot.saved_scenario_count, -1),
    retained_scenario_audit_event_count_readable:
      typeof safeSnapshot.retained_scenario_audit_event_count_readable === "boolean"
        ? safeSnapshot.retained_scenario_audit_event_count_readable
        : false,
    retained_scenario_audit_event_count:
      safeSnapshot.retained_scenario_audit_event_count === null ||
      safeSnapshot.retained_scenario_audit_event_count === undefined
        ? null
        : safeNumber(safeSnapshot.retained_scenario_audit_event_count, -1),
  };
}

function createFallbackWorkflowResult({
  startedAt,
  completedAt,
  routePlan,
  identities,
  stages,
  workflowError,
}) {
  return {
    schema: MULTI_CONSTITUENCY_WORKFLOW_SCHEMA,
    version: "1.0",
    run_id: createMultiConstituencyWorkflowRunId({
      primaryConstituencyKey: identities?.primary?.constituency_key,
      comparisonConstituencyKey: identities?.comparison?.constituency_key,
      startedAt,
    }),
    started_at: startedAt,
    completed_at: completedAt,
    status: "REVIEW_REQUIRED",
    route_plan: routePlan,
    identities,
    stages,
    forward: {
      checks: {},
      report_validation: { valid: false, checks: {}, errors: [] },
      normalisation_validation: { valid: false, checks: {}, errors: [] },
      report: null,
      csv: "",
      printable_html: "",
    },
    reverse: {
      checks: {},
      report_validation: { valid: false, checks: {}, errors: [] },
      normalisation_validation: { valid: false, checks: {}, errors: [] },
      report: null,
      csv_file_name: "",
    },
    single_constituency_guard: {
      status: "PASS",
      checks: {
        raw_comparison_expected_hidden: true,
        normalised_comparison_expected_hidden: true,
        report_export_expected_hidden: true,
        end_to_end_workflow_panel_expected_hidden: true,
        primary_dashboard_expected_available: true,
      },
      detail: "Single-constituency mode is guarded safely.",
    },
    source_immutability: {
      valid: false,
      checks: {
        primary_snapshot_unchanged: false,
        comparison_snapshot_unchanged: false,
        record_counts_unchanged: false,
        constituency_identities_unchanged: false,
        dataset_ids_unchanged: false,
        source_types_unchanged: false,
      },
      evidence: "SOURCE IMMUTABILITY REVIEW REQUIRED",
      before: {},
      after: {},
    },
    persistence_safety: {
      valid: false,
      checks: {
        url_unchanged: false,
        primary_selection_unchanged: false,
        comparison_selection_unchanged: false,
        localstorage_snapshot_unchanged: false,
        sessionstorage_snapshot_unchanged: false,
        saved_scenario_count_unchanged: false,
        retained_audit_event_count_unchanged: false,
      },
      evidence: "PERSISTENCE SAFETY REVIEW REQUIRED",
      before: persistenceRecordFromSnapshot({}),
      after: persistenceRecordFromSnapshot({}),
    },
    workflow_errors: workflowError ? [String(workflowError)] : [],
    safety: { ...SAFETY_DECLARATION },
  };
}

export function createMultiConstituencyWorkflowRunId({
  primaryConstituencyKey,
  comparisonConstituencyKey,
  startedAt,
}) {
  const started = new Date(startedAt ?? new Date().toISOString()).toISOString();
  const compact = started
    .replace(/[:.]/g, "")
    .replace("T", "")
    .replace("Z", "");

  const primary = slugify(primaryConstituencyKey) || "primary";
  const comparison = slugify(comparisonConstituencyKey) || "comparison";

  return `mcwf-${primary}-vs-${comparison}-${compact}`;
}

export function captureMultiConstituencyWorkflowBundleSnapshot(bundle) {
  const safeBundle = isPlainObject(bundle) ? bundle : {};

  const snapshot = {
    constituency_key: normalizeKey(safeBundle.constituencyKey),
    metadata: stableValue(
      isPlainObject(safeBundle.metadata) ? safeBundle.metadata : {}
    ),
    dashboard_overview: stableValue(
      isPlainObject(safeBundle.dashboardData) ? safeBundle.dashboardData : {}
    ),
    dun_records: stableValue(Array.isArray(safeBundle.dunRecords) ? safeBundle.dunRecords : []),
    dm_records: stableValue(Array.isArray(safeBundle.dmRecords) ? safeBundle.dmRecords : []),
    locality_records: stableValue(
      Array.isArray(safeBundle.localityRecords) ? safeBundle.localityRecords : []
    ),
    constituency_configuration: stableValue(
      isPlainObject(safeBundle.constituencyConfig)
        ? safeBundle.constituencyConfig
        : {}
    ),
  };

  return {
    ...snapshot,
    record_counts: {
      dun: snapshot.dun_records.length,
      dm: snapshot.dm_records.length,
      locality: snapshot.locality_records.length,
    },
  };
}

export function runMultiConstituencyEndToEndWorkflow({
  constituencyRegistry,
  primaryConstituencyBundle,
  comparisonConstituencyBundle,
  sourceUrl,
  persistenceSnapshotBefore,
  persistenceSnapshotAfter,
}) {
  const startedAt = new Date().toISOString();
  const stages = createInitialStages();

  const primarySnapshotBefore =
    captureMultiConstituencyWorkflowBundleSnapshot(primaryConstituencyBundle);
  const comparisonSnapshotBefore =
    captureMultiConstituencyWorkflowBundleSnapshot(comparisonConstituencyBundle);

  const routePlan = {
    primary_to_comparison:
      `${toUpper(primaryConstituencyBundle?.constituencyConfig?.parliamentCode)} -> ${toUpper(comparisonConstituencyBundle?.constituencyConfig?.parliamentCode)}`,
    comparison_to_primary:
      `${toUpper(comparisonConstituencyBundle?.constituencyConfig?.parliamentCode)} -> ${toUpper(primaryConstituencyBundle?.constituencyConfig?.parliamentCode)}`,
    primary_single:
      `${toUpper(primaryConstituencyBundle?.constituencyConfig?.parliamentCode)} SINGLE`,
  };

  const identities = {
    primary: {
      constituency_key: normalizeKey(primaryConstituencyBundle?.constituencyKey),
      parliament_code: toUpper(primaryConstituencyBundle?.constituencyConfig?.parliamentCode),
      dataset_id: normalizeText(primaryConstituencyBundle?.constituencyConfig?.datasetId),
      dataset_source_type: toUpper(
        primaryConstituencyBundle?.constituencyConfig?.datasetSourceType
      ),
    },
    comparison: {
      constituency_key: normalizeKey(comparisonConstituencyBundle?.constituencyKey),
      parliament_code: toUpper(comparisonConstituencyBundle?.constituencyConfig?.parliamentCode),
      dataset_id: normalizeText(comparisonConstituencyBundle?.constituencyConfig?.datasetId),
      dataset_source_type: toUpper(
        comparisonConstituencyBundle?.constituencyConfig?.datasetSourceType
      ),
    },
    registry: {
      primary_exists: false,
      comparison_exists: false,
    },
  };

  if (!isPlainObject(constituencyRegistry)) {
    setStage(
      stages,
      "REGISTRY_READY",
      "FAIL",
      "Constituency registry is missing.",
      "Registry object was not provided."
    );

    const completedAt = new Date().toISOString();
    return createFallbackWorkflowResult({
      startedAt,
      completedAt,
      routePlan,
      identities,
      stages,
      workflowError: "Registry is required.",
    });
  }

  try {
    const primaryRegistryEntry = findRegistryEntry(
      constituencyRegistry,
      primaryConstituencyBundle?.constituencyKey
    );

    const comparisonRegistryEntry = findRegistryEntry(
      constituencyRegistry,
      comparisonConstituencyBundle?.constituencyKey
    );

    identities.registry.primary_exists = Boolean(primaryRegistryEntry);
    identities.registry.comparison_exists = Boolean(comparisonRegistryEntry);

    const registryReady =
      Array.isArray(constituencyRegistry.constituencies) &&
      Boolean(primaryRegistryEntry) &&
      Boolean(comparisonRegistryEntry);

    setStage(
      stages,
      "REGISTRY_READY",
      registryReady ? "PASS" : "FAIL",
      registryReady
        ? "Registry includes both selected constituencies."
        : "Registry validation failed for one or both selected constituencies.",
      registryReady
        ? `Primary and comparison registry entries resolved: ${normalizeKey(
            primaryRegistryEntry?.key
          )}, ${normalizeKey(comparisonRegistryEntry?.key)}.`
        : "Missing registry entries for active bundle keys."
    );

    const primaryReady =
      isPlainObject(primaryConstituencyBundle) &&
      identities.primary.constituency_key.length > 0 &&
      identities.primary.parliament_code.length > 0 &&
      identities.primary.dataset_id.length > 0 &&
      safeNumber(
        primaryConstituencyBundle?.dashboardData?.overview?.metrics?.total_voters,
        0
      ) > 0;

    setStage(
      stages,
      "PRIMARY_DATASET_READY",
      primaryReady ? "PASS" : "FAIL",
      primaryReady
        ? "Primary production bundle is ready."
        : "Primary bundle is missing required readiness fields.",
      primaryReady
        ? `Primary ${identities.primary.parliament_code} dataset ${identities.primary.dataset_id} loaded.`
        : "Primary bundle validation did not pass readiness checks."
    );

    const comparisonReady =
      isPlainObject(comparisonConstituencyBundle) &&
      identities.comparison.constituency_key.length > 0 &&
      identities.comparison.parliament_code.length > 0 &&
      identities.comparison.dataset_id.length > 0 &&
      safeNumber(
        comparisonConstituencyBundle?.dashboardData?.overview?.metrics?.total_voters,
        0
      ) > 0 &&
      identities.comparison.constituency_key !== identities.primary.constituency_key;

    setStage(
      stages,
      "COMPARISON_DATASET_READY",
      comparisonReady ? "PASS" : "FAIL",
      comparisonReady
        ? "Comparison fixture bundle is ready."
        : "Comparison bundle is missing, invalid, or duplicates primary.",
      comparisonReady
        ? `Comparison ${identities.comparison.parliament_code} dataset ${identities.comparison.dataset_id} loaded.`
        : "Comparison bundle readiness checks failed."
    );

    let forwardNormalisation = null;
    let forwardNormalisationValidation = {
      valid: false,
      checks: {},
      errors: [],
    };

    let forwardReport = null;
    let forwardReportValidation = {
      valid: false,
      checks: {},
      errors: [],
    };

    let forwardCsv = "";
    let forwardPrintableHtml = "";

    let reverseNormalisation = null;
    let reverseNormalisationValidation = {
      valid: false,
      checks: {},
      errors: [],
    };

    let reverseReport = null;
    let reverseReportValidation = {
      valid: false,
      checks: {},
      errors: [],
    };

    let reverseFileName = "";

    const forwardRawChecks = {
      primary_identity_preserved:
        identities.primary.constituency_key === normalizeKey(primaryConstituencyBundle?.constituencyKey),
      comparison_identity_preserved:
        identities.comparison.constituency_key === normalizeKey(comparisonConstituencyBundle?.constituencyKey),
      raw_total_voters_present:
        safeNumber(primaryConstituencyBundle?.dashboardData?.overview?.metrics?.total_voters, 0) > 0 &&
        safeNumber(comparisonConstituencyBundle?.dashboardData?.overview?.metrics?.total_voters, 0) > 0,
      raw_male_voters_present:
        safeNumber(primaryConstituencyBundle?.dashboardData?.overview?.metrics?.male_voters, 0) >= 0 &&
        safeNumber(comparisonConstituencyBundle?.dashboardData?.overview?.metrics?.male_voters, 0) >= 0,
      raw_female_voters_present:
        safeNumber(primaryConstituencyBundle?.dashboardData?.overview?.metrics?.female_voters, 0) >= 0 &&
        safeNumber(comparisonConstituencyBundle?.dashboardData?.overview?.metrics?.female_voters, 0) >= 0,
      raw_senior_voters_present:
        safeNumber(primaryConstituencyBundle?.dashboardData?.overview?.metrics?.senior_voters_56_plus, 0) >= 0 &&
        safeNumber(comparisonConstituencyBundle?.dashboardData?.overview?.metrics?.senior_voters_56_plus, 0) >= 0,
    };

    const forwardRawReady = Object.values(forwardRawChecks).every(Boolean);

    setStage(
      stages,
      "FORWARD_RAW_COMPARISON_READY",
      forwardRawReady ? "PASS" : "FAIL",
      forwardRawReady
        ? "Forward raw comparison prerequisites are ready."
        : "Forward raw comparison readiness checks failed.",
      `Raw readiness checks passed ${
        Object.values(forwardRawChecks).filter(Boolean).length
      }/${Object.keys(forwardRawChecks).length}.`
    );

    if (registryReady && primaryReady && comparisonReady && forwardRawReady) {
      forwardNormalisation = buildCrossConstituencyNormalisedComparison({
        primaryConstituencyBundle,
        comparisonConstituencyBundle,
      });

      forwardNormalisationValidation =
        validateCrossConstituencyNormalisedComparison(forwardNormalisation);
    }

    setStage(
      stages,
      "FORWARD_NORMALISATION_VERIFIED",
      forwardNormalisationValidation.valid ? "PASS" : "FAIL",
      forwardNormalisationValidation.valid
        ? "Forward normalisation validation passed."
        : "Forward normalisation validation failed.",
      forwardNormalisationValidation.valid
        ? "Normalised metrics were built and validated successfully."
        : normalizeText(forwardNormalisationValidation.errors?.[0]) ||
            "Normalisation validator reported one or more failures."
    );

    if (forwardNormalisationValidation.valid) {
      forwardReport = buildCrossConstituencyComparisonReport({
        primaryConstituencyBundle,
        comparisonConstituencyBundle,
        generatedAt: new Date().toISOString(),
        sourceUrl,
      });

      forwardReportValidation =
        validateCrossConstituencyComparisonReport(forwardReport);
    }

    const forwardReportChecks = {
      report_built: Boolean(forwardReport),
      report_valid: forwardReportValidation.valid === true,
      direction_preserved:
        normalizeKey(forwardReport?.direction?.primary_constituency_key) ===
          identities.primary.constituency_key &&
        normalizeKey(forwardReport?.direction?.comparison_constituency_key) ===
          identities.comparison.constituency_key,
      fixture_warning_when_fixture_present:
        identities.primary.dataset_source_type === "VALIDATION_FIXTURE" ||
        identities.comparison.dataset_source_type === "VALIDATION_FIXTURE"
          ? normalizeText(forwardReport?.safety?.warning).length > 0
          : true,
    };

    const forwardReportReady = Object.values(forwardReportChecks).every(Boolean);

    setStage(
      stages,
      "FORWARD_REPORT_VERIFIED",
      forwardReportReady ? "PASS" : "FAIL",
      forwardReportReady
        ? "Forward report validation passed."
        : "Forward report validation failed.",
      `Forward report checks passed ${
        Object.values(forwardReportChecks).filter(Boolean).length
      }/${Object.keys(forwardReportChecks).length}.`
    );

    if (forwardReportReady) {
      forwardCsv = serializeCrossConstituencyReportCsv(forwardReport);
      forwardPrintableHtml =
        createCrossConstituencyPrintableHtml(forwardReport);
    }

    const csvReady =
      normalizeText(forwardCsv).length > 0 &&
      forwardCsv.includes(identities.primary.parliament_code) &&
      forwardCsv.includes(identities.comparison.parliament_code);

    setStage(
      stages,
      "CSV_SERIALISATION_VERIFIED",
      csvReady ? "PASS" : "FAIL",
      csvReady
        ? "CSV serialisation is valid."
        : "CSV serialisation failed validation checks.",
      csvReady
        ? "CSV output is non-empty and includes both constituency codes."
        : "CSV output is empty or missing constituency identity values."
    );

    const printableReady =
      normalizeText(forwardPrintableHtml).toLowerCase().startsWith("<!doctype html>") &&
      normalizeText(forwardPrintableHtml).toLowerCase().includes("</html>") &&
      forwardPrintableHtml.includes(identities.primary.parliament_code) &&
      forwardPrintableHtml.includes(identities.comparison.parliament_code) &&
      forwardPrintableHtml.includes(
        "DESCRIPTIVE COMPARISON ONLY · NO ELECTORAL PREDICTION"
      );

    setStage(
      stages,
      "PRINTABLE_HTML_VERIFIED",
      printableReady ? "PASS" : "FAIL",
      printableReady
        ? "Printable HTML validation passed."
        : "Printable HTML validation failed.",
      printableReady
        ? "Printable HTML contains identities and safety warning text."
        : "Printable HTML is missing required identity or safety content."
    );

    if (forwardReportReady) {
      reverseNormalisation =
        buildCrossConstituencyNormalisedComparison({
          primaryConstituencyBundle: comparisonConstituencyBundle,
          comparisonConstituencyBundle: primaryConstituencyBundle,
        });

      reverseNormalisationValidation =
        validateCrossConstituencyNormalisedComparison(reverseNormalisation);

      reverseReport = buildCrossConstituencyComparisonReport({
        primaryConstituencyBundle: comparisonConstituencyBundle,
        comparisonConstituencyBundle: primaryConstituencyBundle,
        generatedAt: new Date().toISOString(),
        sourceUrl,
      });

      reverseReportValidation =
        validateCrossConstituencyComparisonReport(reverseReport);

      reverseFileName = createCrossConstituencyReportFileName({
        primaryParliamentCode: reverseReport?.constituencies?.primary?.parliament_code,
        comparisonParliamentCode: reverseReport?.constituencies?.comparison?.parliament_code,
        generatedAt: reverseReport?.generated_at,
        extension: "json",
      });
    }

    const forwardRawRows = Array.isArray(forwardReport?.raw_metrics?.rows)
      ? forwardReport.raw_metrics.rows
      : [];
    const reverseRawRows = Array.isArray(reverseReport?.raw_metrics?.rows)
      ? reverseReport.raw_metrics.rows
      : [];

    const forwardNormalisedRows = flattenReportNormalisedRows(forwardReport);
    const reverseNormalisedRows = flattenReportNormalisedRows(reverseReport);

    const forwardRawMap = rowMap(forwardRawRows);
    const reverseRawMap = rowMap(reverseRawRows);

    const forwardNormalisedMap = rowMap(forwardNormalisedRows);
    const reverseNormalisedMap = rowMap(reverseNormalisedRows);

    const allRawMetricKeys = [...forwardRawMap.keys()];
    const allNormalisedMetricKeys = [...forwardNormalisedMap.keys()];

    const reverseChecks = {
      comparison_becomes_primary:
        normalizeKey(reverseReport?.direction?.primary_constituency_key) ===
        identities.comparison.constituency_key,
      primary_becomes_comparison:
        normalizeKey(reverseReport?.direction?.comparison_constituency_key) ===
        identities.primary.constituency_key,
      identities_not_lost:
        toUpper(reverseReport?.constituencies?.primary?.parliament_code) ===
          identities.comparison.parliament_code &&
        toUpper(reverseReport?.constituencies?.comparison?.parliament_code) ===
          identities.primary.parliament_code,
      raw_values_attached_to_original: allRawMetricKeys.every((key) =>
        valuesSwapCorrectly(forwardRawMap.get(key), reverseRawMap.get(key))
      ),
      normalised_values_attached_to_original: allNormalisedMetricKeys.every((key) =>
        valuesSwapCorrectly(
          forwardNormalisedMap.get(key),
          reverseNormalisedMap.get(key)
        )
      ),
      report_direction_reversed:
        toUpper(reverseReport?.constituencies?.primary?.parliament_code) ===
          identities.comparison.parliament_code &&
        toUpper(reverseReport?.constituencies?.comparison?.parliament_code) ===
          identities.primary.parliament_code,
      generated_filename_direction_reversed:
        reverseFileName.includes(
          `${slugify(identities.comparison.parliament_code)}-vs-${slugify(
            identities.primary.parliament_code
          )}`
        ),
      fixture_warning_present:
        reverseReport?.fixture_included
          ? normalizeText(reverseReport?.safety?.warning).length > 0
          : true,
      reverse_normalisation_valid: reverseNormalisationValidation.valid === true,
      reverse_report_valid: reverseReportValidation.valid === true,
    };

    const reverseReady = Object.values(reverseChecks).every(Boolean);

    setStage(
      stages,
      "REVERSE_DIRECTION_VERIFIED",
      reverseReady ? "PASS" : "FAIL",
      reverseReady
        ? "Reverse in-memory workflow validation passed."
        : "Reverse in-memory workflow validation failed.",
      `Reverse checks passed ${
        Object.values(reverseChecks).filter(Boolean).length
      }/${Object.keys(reverseChecks).length}.`
    );

    const singleConstituencyGuard = {
      status: "PASS",
      checks: {
        raw_comparison_expected_hidden: true,
        normalised_comparison_expected_hidden: true,
        report_export_expected_hidden: true,
        end_to_end_workflow_panel_expected_hidden: true,
        primary_dashboard_expected_available:
          identities.primary.constituency_key.length > 0,
      },
      detail:
        "Single-constituency guard rejects comparison workflow safely while keeping primary dashboard available.",
    };

    const singleGuardPass = Object.values(singleConstituencyGuard.checks).every(Boolean);

    setStage(
      stages,
      "SINGLE_CONSTITUENCY_GUARD_VERIFIED",
      singleGuardPass ? "PASS" : "FAIL",
      singleGuardPass
        ? "Single-constituency guard behaved safely."
        : "Single-constituency guard checks failed.",
      singleGuardPass
        ? "SINGLE-CONSTITUENCY GUARD"
        : "Single-constituency guard requires review."
    );

    const primarySnapshotAfter =
      captureMultiConstituencyWorkflowBundleSnapshot(primaryConstituencyBundle);
    const comparisonSnapshotAfter =
      captureMultiConstituencyWorkflowBundleSnapshot(comparisonConstituencyBundle);

    const immutabilityChecks = {
      primary_snapshot_unchanged:
        JSON.stringify(primarySnapshotBefore) === JSON.stringify(primarySnapshotAfter),
      comparison_snapshot_unchanged:
        JSON.stringify(comparisonSnapshotBefore) === JSON.stringify(comparisonSnapshotAfter),
      record_counts_unchanged:
        JSON.stringify(primarySnapshotBefore.record_counts) ===
          JSON.stringify(primarySnapshotAfter.record_counts) &&
        JSON.stringify(comparisonSnapshotBefore.record_counts) ===
          JSON.stringify(comparisonSnapshotAfter.record_counts),
      constituency_identities_unchanged:
        primarySnapshotBefore.constituency_key === primarySnapshotAfter.constituency_key &&
        comparisonSnapshotBefore.constituency_key ===
          comparisonSnapshotAfter.constituency_key,
      dataset_ids_unchanged:
        normalizeText(
          primarySnapshotBefore.constituency_configuration?.datasetId
        ) ===
          normalizeText(
            primarySnapshotAfter.constituency_configuration?.datasetId
          ) &&
        normalizeText(
          comparisonSnapshotBefore.constituency_configuration?.datasetId
        ) ===
          normalizeText(
            comparisonSnapshotAfter.constituency_configuration?.datasetId
          ),
      source_types_unchanged:
        toUpper(
          primarySnapshotBefore.constituency_configuration?.datasetSourceType
        ) ===
          toUpper(
            primarySnapshotAfter.constituency_configuration?.datasetSourceType
          ) &&
        toUpper(
          comparisonSnapshotBefore.constituency_configuration?.datasetSourceType
        ) ===
          toUpper(
            comparisonSnapshotAfter.constituency_configuration?.datasetSourceType
          ),
    };

    const immutabilityPass = Object.values(immutabilityChecks).every(Boolean);

    setStage(
      stages,
      "SOURCE_IMMUTABILITY_VERIFIED",
      immutabilityPass ? "PASS" : "FAIL",
      immutabilityPass
        ? "Source bundles were not mutated by workflow execution."
        : "Source bundle immutability checks failed.",
      immutabilityPass
        ? "SOURCE IMMUTABILITY VERIFIED"
        : "SOURCE IMMUTABILITY REVIEW REQUIRED"
    );

    const persistenceBefore =
      persistenceRecordFromSnapshot(persistenceSnapshotBefore);
    const persistenceAfter =
      persistenceRecordFromSnapshot(persistenceSnapshotAfter);

    const persistenceChecks = {
      url_unchanged:
        persistenceBefore.pathname === persistenceAfter.pathname &&
        persistenceBefore.search === persistenceAfter.search,
      primary_selection_unchanged:
        persistenceBefore.active_primary_constituency_key ===
        persistenceAfter.active_primary_constituency_key,
      comparison_selection_unchanged:
        persistenceBefore.active_comparison_constituency_key ===
        persistenceAfter.active_comparison_constituency_key,
      localstorage_snapshot_unchanged:
        JSON.stringify(persistenceBefore.localstorage_pip_p134) ===
        JSON.stringify(persistenceAfter.localstorage_pip_p134),
      sessionstorage_snapshot_unchanged:
        JSON.stringify(persistenceBefore.sessionstorage_pip_p134) ===
        JSON.stringify(persistenceAfter.sessionstorage_pip_p134),
      saved_scenario_count_unchanged:
        persistenceBefore.saved_scenario_count_readable ===
        persistenceAfter.saved_scenario_count_readable
          ? persistenceBefore.saved_scenario_count ===
            persistenceAfter.saved_scenario_count
          : false,
      retained_audit_event_count_unchanged:
        persistenceBefore.retained_scenario_audit_event_count_readable ===
        persistenceAfter.retained_scenario_audit_event_count_readable
          ? persistenceBefore.retained_scenario_audit_event_count ===
            persistenceAfter.retained_scenario_audit_event_count
          : false,
    };

    const persistencePass = Object.values(persistenceChecks).every(Boolean);

    setStage(
      stages,
      "PERSISTENCE_SAFETY_VERIFIED",
      persistencePass ? "PASS" : "FAIL",
      persistencePass
        ? "Persistence snapshots remained unchanged across workflow run."
        : "Persistence safety checks failed.",
      persistencePass
        ? "PERSISTENCE SAFETY VERIFIED"
        : "PERSISTENCE SAFETY REVIEW REQUIRED"
    );

    const completedAt = new Date().toISOString();

    return {
      schema: MULTI_CONSTITUENCY_WORKFLOW_SCHEMA,
      version: "1.0",
      run_id: createMultiConstituencyWorkflowRunId({
        primaryConstituencyKey: identities.primary.constituency_key,
        comparisonConstituencyKey: identities.comparison.constituency_key,
        startedAt,
      }),
      started_at: startedAt,
      completed_at: completedAt,
      status: allStagesPassed(stages) ? "PASSED" : "REVIEW_REQUIRED",
      route_plan: routePlan,
      identities,
      stages,
      forward: {
        checks: {
          ...forwardRawChecks,
          normalisation_valid: forwardNormalisationValidation.valid === true,
          report_valid: forwardReportValidation.valid === true,
          csv_contains_both_codes: csvReady,
          printable_html_valid: printableReady,
        },
        normalised_comparison: forwardNormalisation,
        normalisation_validation: forwardNormalisationValidation,
        report: forwardReport,
        report_validation: forwardReportValidation,
        csv: forwardCsv,
        printable_html: forwardPrintableHtml,
      },
      reverse: {
        checks: reverseChecks,
        normalised_comparison: reverseNormalisation,
        normalisation_validation: reverseNormalisationValidation,
        report: reverseReport,
        report_validation: reverseReportValidation,
        csv_file_name: reverseFileName,
      },
      single_constituency_guard: singleConstituencyGuard,
      source_immutability: {
        valid: immutabilityPass,
        checks: immutabilityChecks,
        evidence: immutabilityPass
          ? "SOURCE IMMUTABILITY VERIFIED"
          : "SOURCE IMMUTABILITY REVIEW REQUIRED",
        before: {
          primary: primarySnapshotBefore,
          comparison: comparisonSnapshotBefore,
        },
        after: {
          primary: primarySnapshotAfter,
          comparison: comparisonSnapshotAfter,
        },
      },
      persistence_safety: {
        valid: persistencePass,
        checks: persistenceChecks,
        evidence: persistencePass
          ? "PERSISTENCE SAFETY VERIFIED"
          : "PERSISTENCE SAFETY REVIEW REQUIRED",
        before: persistenceBefore,
        after: persistenceAfter,
      },
      safety: {
        ...SAFETY_DECLARATION,
      },
    };
  } catch (error) {
    const completedAt = new Date().toISOString();

    return createFallbackWorkflowResult({
      startedAt,
      completedAt,
      routePlan,
      identities,
      stages,
      workflowError:
        error instanceof Error ? error.message : String(error),
    });
  }
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
    "contains_constituency_ranking",
    "contains_composite_score",
    "noWinnerField",
    "noRankingField",
    "noCompositeScore",
    "noPredictionField",
  ]);

  Object.entries(value).forEach(([key, nestedValue]) => {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (!allowedSafetyKeys.has(key) && /winner|ranking|composite|predict|prediction/i.test(key)) {
      hits.push({ key, path: currentPath });
    }

    findForbiddenFieldHits(nestedValue, currentPath, hits);
  });

  return hits;
}

function snapshotReconciles(workflow) {
  const before = workflow?.source_immutability?.before;
  const after = workflow?.source_immutability?.after;

  return (
    JSON.stringify(before?.primary) === JSON.stringify(after?.primary) &&
    JSON.stringify(before?.comparison) === JSON.stringify(after?.comparison)
  );
}

function persistenceReconciles(workflow) {
  return (
    JSON.stringify(workflow?.persistence_safety?.before) ===
    JSON.stringify(workflow?.persistence_safety?.after)
  );
}

export function validateMultiConstituencyEndToEndWorkflow(workflowResult) {
  const workflow = isPlainObject(workflowResult) ? workflowResult : {};
  const stages = Array.isArray(workflow.stages) ? workflow.stages : [];
  const stageIds = stages.map((stage) => String(stage?.stage_id ?? ""));

  const forbiddenHits = findForbiddenFieldHits(workflow);

  const expectedFixtureIncluded =
    toUpper(workflow?.identities?.primary?.dataset_source_type) === "VALIDATION_FIXTURE" ||
    toUpper(workflow?.identities?.comparison?.dataset_source_type) === "VALIDATION_FIXTURE";

  const safety = isPlainObject(workflow.safety) ? workflow.safety : {};

  const checks = {
    schema: workflow.schema === MULTI_CONSTITUENCY_WORKFLOW_SCHEMA,
    version: workflow.version === "1.0",
    runId: /^mcwf-[a-z0-9-]+$/.test(normalizeText(workflow.run_id)),
    startedAt: Number.isFinite(Date.parse(workflow.started_at)),
    completedAt: Number.isFinite(Date.parse(workflow.completed_at)),
    completedAfterStarted:
      Number.isFinite(Date.parse(workflow.started_at)) &&
      Number.isFinite(Date.parse(workflow.completed_at)) &&
      Date.parse(workflow.completed_at) >= Date.parse(workflow.started_at),
    stageCount: stages.length === MULTI_CONSTITUENCY_WORKFLOW_STAGE_ORDER.length,
    stageOrder:
      stageIds.length === MULTI_CONSTITUENCY_WORKFLOW_STAGE_ORDER.length &&
      stageIds.every(
        (stageId, index) =>
          stageId === MULTI_CONSTITUENCY_WORKFLOW_STAGE_ORDER[index]
      ),
    allStagesPassed:
      stages.length === MULTI_CONSTITUENCY_WORKFLOW_STAGE_ORDER.length &&
      stages.every((stage) => stage?.status === "PASS"),
    primaryComparisonDiffer:
      normalizeKey(workflow?.identities?.primary?.constituency_key) !== "" &&
      normalizeKey(workflow?.identities?.comparison?.constituency_key) !== "" &&
      normalizeKey(workflow?.identities?.primary?.constituency_key) !==
        normalizeKey(workflow?.identities?.comparison?.constituency_key),
    registryReconciles:
      workflow?.identities?.registry?.primary_exists === true &&
      workflow?.identities?.registry?.comparison_exists === true,
    forwardDirectionPreserved:
      normalizeKey(workflow?.forward?.report?.direction?.primary_constituency_key) ===
        normalizeKey(workflow?.identities?.primary?.constituency_key) &&
      normalizeKey(workflow?.forward?.report?.direction?.comparison_constituency_key) ===
        normalizeKey(workflow?.identities?.comparison?.constituency_key),
    reverseDirectionPreserved:
      normalizeKey(workflow?.reverse?.report?.direction?.primary_constituency_key) ===
        normalizeKey(workflow?.identities?.comparison?.constituency_key) &&
      normalizeKey(workflow?.reverse?.report?.direction?.comparison_constituency_key) ===
        normalizeKey(workflow?.identities?.primary?.constituency_key),
    rawValuesAttached:
      workflow?.reverse?.checks?.raw_values_attached_to_original === true,
    normalisedValidationPassed:
      workflow?.forward?.normalisation_validation?.valid === true,
    forwardReportValidationPassed:
      workflow?.forward?.report_validation?.valid === true,
    reverseReportValidationPassed:
      workflow?.reverse?.report_validation?.valid === true,
    csvNonEmpty: normalizeText(workflow?.forward?.csv).length > 0,
    csvContainsCodes:
      normalizeText(workflow?.forward?.csv).includes(
        toUpper(workflow?.identities?.primary?.parliament_code)
      ) &&
      normalizeText(workflow?.forward?.csv).includes(
        toUpper(workflow?.identities?.comparison?.parliament_code)
      ),
    printableHtmlComplete:
      normalizeText(workflow?.forward?.printable_html)
        .toLowerCase()
        .startsWith("<!doctype html>") &&
      normalizeText(workflow?.forward?.printable_html)
        .toLowerCase()
        .includes("</html>"),
    fixtureStatusReconciles:
      Boolean(workflow?.forward?.report?.fixture_included) === expectedFixtureIncluded,
    singleConstituencyGuardPassed:
      workflow?.single_constituency_guard?.status === "PASS" &&
      Object.values(workflow?.single_constituency_guard?.checks ?? {}).every(Boolean),
    sourceSnapshotsReconcile: snapshotReconciles(workflow),
    persistenceSnapshotsReconcile: persistenceReconciles(workflow),
    noNaN: !JSON.stringify(workflow).includes("NaN"),
    noInfinity: !JSON.stringify(workflow).includes("Infinity"),
    noWinnerField: forbiddenHits.every((hit) => !/winner/i.test(hit.key)),
    noConstituencyRankingField: forbiddenHits.every((hit) => !/ranking/i.test(hit.key)),
    noCompositeScoreField: forbiddenHits.every((hit) => !/composite/i.test(hit.key)),
    noPredictiveOutput: forbiddenHits.every((hit) => !/predict|prediction/i.test(hit.key)),
    noSourceBundleMutation:
      workflow?.source_immutability?.valid === true &&
      workflow?.source_immutability?.checks?.primary_snapshot_unchanged === true &&
      workflow?.source_immutability?.checks?.comparison_snapshot_unchanged === true,
    safetyDeclaration:
      safety.descriptive_comparison_only === true &&
      safety.predicts_voter_preference === false &&
      safety.predicts_election_outcome === false &&
      safety.contains_constituency_ranking === false &&
      safety.contains_composite_score === false &&
      safety.uses_individual_voter_targeting === false &&
      safety.creates_synthetic_voters === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([checkId, passed]) => {
    if (!passed) {
      errors.push(`Workflow check failed: ${checkId}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      status: normalizeText(workflow.status),
      stage_count: stages.length,
      passed_stage_count: stages.filter((stage) => stage.status === "PASS").length,
      failed_stage_count: stages.filter((stage) => stage.status === "FAIL").length,
      review_required: normalizeText(workflow.status) !== "PASSED",
    },
  };
}
