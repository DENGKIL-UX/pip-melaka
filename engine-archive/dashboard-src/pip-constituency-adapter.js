export const DEFAULT_CONSTITUENCY_CONFIG = {
  parliamentCode: "P134",
  parliamentName: "",
  shortLabel: "P134",
  filePrefix: "p134",
};

export const PIP_CONSTITUENCY_METADATA_SCHEMA =
  "pip.constituency-metadata.v1";

const DEFAULT_CONSTITUENCY_METADATA = {
  schema: PIP_CONSTITUENCY_METADATA_SCHEMA,
  constituency: {
    parliamentCode: "P134",
    parliamentName: "MASJID TANAH",
    shortLabel: "P134",
    stateName: "MELAKA",
    filePrefix: "p134",
  },
  dataset: {
    datasetId: "P134.MT.71416",
    datasetLabel: "P134 Masjid Tanah Voter Intelligence",
    datasetVersion: "1.0",
    sourceType: "TRANSFORMED_VOTER_INTELLIGENCE",
    expectedTotalVoters: 71415,
    expectedRecordCounts: {
      dun: 5,
      dm: 30,
      locality: 368,
    },
    files: {
      overview: "/data/dashboard-overview.json",
      dun: "/data/dun-intelligence.jsonl",
      dm: "/data/dm-intelligence.jsonl",
      locality: "/data/locality-intelligence.jsonl",
    },
  },
};

function toSafeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function normalizeFilePrefix(value) {
  const normalized = toSafeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || DEFAULT_CONSTITUENCY_CONFIG.filePrefix;
}

function normalizeInteger(value, fallback, minimum = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  const integerValue = Math.trunc(numericValue);

  if (integerValue < minimum) {
    return fallback;
  }

  return integerValue;
}

function normalizeDatasetFilePath(value, fallback) {
  const normalizedValue = toSafeString(value)
    .replace(/\\+/g, "/")
    .replace(/\/+/g, "/");

  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue.startsWith("/")) {
    return normalizedValue;
  }

  return `/${normalizedValue}`;
}

export function normalizeConstituencyConfig(value) {
  const source = toPlainObject(value);

  const parliamentCode =
    toSafeString(source.parliamentCode).toUpperCase() ||
    DEFAULT_CONSTITUENCY_CONFIG.parliamentCode;

  const parliamentName = toSafeString(source.parliamentName);

  const shortLabel =
    toSafeString(source.shortLabel) || parliamentCode;

  const filePrefix = normalizeFilePrefix(source.filePrefix);

  return {
    parliamentCode,
    parliamentName,
    shortLabel,
    filePrefix,
  };
}

export function createConstituencyDisplayAdapter(value) {
  const normalized = normalizeConstituencyConfig(value);

  const displayName =
    normalized.parliamentName || normalized.parliamentCode;

  return {
    ...normalized,
    displayName,
    dashboardTitle: `${normalized.parliamentCode} Voter Intelligence Dashboard`,
    voterIntelligenceLabel: `${normalized.parliamentCode} voter intelligence`,
    transformedDatasetLabel: `transformed ${normalized.parliamentCode} voter intelligence`,
    benchmarkLabel: normalized.parliamentCode,
    reportTitlePrefix: normalized.parliamentCode,
  };
}

export function normalizeConstituencyMetadata(value) {
  const source = toPlainObject(value);

  const constituencySource = toPlainObject(
    source.constituency
  );

  const datasetSource = toPlainObject(source.dataset);

  const expectedRecordCountsSource = toPlainObject(
    datasetSource.expected_record_counts ??
      datasetSource.expectedRecordCounts
  );

  const filesSource = toPlainObject(datasetSource.files);

  const parliamentCode =
    toSafeString(
      constituencySource.parliament_code ??
        constituencySource.parliamentCode
    ).toUpperCase() ||
    DEFAULT_CONSTITUENCY_METADATA.constituency.parliamentCode;

  const parliamentName =
    toSafeString(
      constituencySource.parliament_name ??
        constituencySource.parliamentName
    ) ||
    DEFAULT_CONSTITUENCY_METADATA.constituency.parliamentName;

  const shortLabel =
    toSafeString(
      constituencySource.short_label ??
        constituencySource.shortLabel
    ) ||
    DEFAULT_CONSTITUENCY_METADATA.constituency.shortLabel;

  const stateName =
    toSafeString(
      constituencySource.state_name ??
        constituencySource.stateName
    ).toUpperCase() ||
    DEFAULT_CONSTITUENCY_METADATA.constituency.stateName;

  const filePrefix = normalizeFilePrefix(
    constituencySource.file_prefix ??
      constituencySource.filePrefix
  );

  return {
    schema:
      toSafeString(source.schema) ||
      DEFAULT_CONSTITUENCY_METADATA.schema,

    constituency: {
      parliamentCode,
      parliamentName,
      shortLabel,
      stateName,
      filePrefix,
    },

    dataset: {
      datasetId:
        toSafeString(
          datasetSource.dataset_id ?? datasetSource.datasetId
        ) ||
        DEFAULT_CONSTITUENCY_METADATA.dataset.datasetId,

      datasetLabel:
        toSafeString(
          datasetSource.dataset_label ??
            datasetSource.datasetLabel
        ) ||
        DEFAULT_CONSTITUENCY_METADATA.dataset.datasetLabel,

      datasetVersion:
        toSafeString(
          datasetSource.dataset_version ??
            datasetSource.datasetVersion
        ) ||
        DEFAULT_CONSTITUENCY_METADATA.dataset.datasetVersion,

      sourceType:
        toSafeString(
          datasetSource.source_type ??
            datasetSource.sourceType
        ).toUpperCase() ||
        DEFAULT_CONSTITUENCY_METADATA.dataset.sourceType,

      expectedTotalVoters: normalizeInteger(
        datasetSource.expected_total_voters ??
          datasetSource.expectedTotalVoters,
        DEFAULT_CONSTITUENCY_METADATA.dataset.expectedTotalVoters,
        0
      ),

      expectedRecordCounts: {
        dun: normalizeInteger(
          expectedRecordCountsSource.dun,
          DEFAULT_CONSTITUENCY_METADATA.dataset.expectedRecordCounts.dun,
          0
        ),

        dm: normalizeInteger(
          expectedRecordCountsSource.dm,
          DEFAULT_CONSTITUENCY_METADATA.dataset.expectedRecordCounts.dm,
          0
        ),

        locality: normalizeInteger(
          expectedRecordCountsSource.locality,
          DEFAULT_CONSTITUENCY_METADATA.dataset.expectedRecordCounts.locality,
          0
        ),
      },

      files: {
        overview: normalizeDatasetFilePath(
          filesSource.overview,
          DEFAULT_CONSTITUENCY_METADATA.dataset.files.overview
        ),

        dun: normalizeDatasetFilePath(
          filesSource.dun,
          DEFAULT_CONSTITUENCY_METADATA.dataset.files.dun
        ),

        dm: normalizeDatasetFilePath(
          filesSource.dm,
          DEFAULT_CONSTITUENCY_METADATA.dataset.files.dm
        ),

        locality: normalizeDatasetFilePath(
          filesSource.locality,
          DEFAULT_CONSTITUENCY_METADATA.dataset.files.locality
        ),
      },
    },
  };
}

export function validateConstituencyMetadata(value) {
  const metadata = normalizeConstituencyMetadata(value);

  const checks = {
    schema:
      metadata.schema === PIP_CONSTITUENCY_METADATA_SCHEMA,

    parliamentCode:
      /^P\d{3}$/.test(metadata.constituency.parliamentCode),

    parliamentName:
      metadata.constituency.parliamentName.length > 0,

    shortLabel:
      metadata.constituency.shortLabel.length > 0,

    stateName:
      metadata.constituency.stateName.length > 0,

    datasetId:
      metadata.dataset.datasetId.length > 0,

    datasetLabel:
      metadata.dataset.datasetLabel.length > 0,

    datasetVersion:
      metadata.dataset.datasetVersion.length > 0,

    sourceType:
      metadata.dataset.sourceType.length > 0,

    expectedTotalVoters:
      Number.isInteger(metadata.dataset.expectedTotalVoters) &&
      metadata.dataset.expectedTotalVoters > 0,

    expectedRecordCounts:
      Number.isInteger(metadata.dataset.expectedRecordCounts.dun) &&
      metadata.dataset.expectedRecordCounts.dun >= 0 &&
      Number.isInteger(metadata.dataset.expectedRecordCounts.dm) &&
      metadata.dataset.expectedRecordCounts.dm >= 0 &&
      Number.isInteger(metadata.dataset.expectedRecordCounts.locality) &&
      metadata.dataset.expectedRecordCounts.locality >= 0,

    datasetFilePaths:
      [
        metadata.dataset.files.overview,
        metadata.dataset.files.dun,
        metadata.dataset.files.dm,
        metadata.dataset.files.locality,
      ].every(
        (path) =>
          typeof path === "string" &&
          path.startsWith("/data/")
      ),

    uniqueDatasetFilePaths:
      new Set([
        metadata.dataset.files.overview,
        metadata.dataset.files.dun,
        metadata.dataset.files.dm,
        metadata.dataset.files.locality,
      ]).size === 4,

    filePrefix:
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        metadata.constituency.filePrefix
      ),
  };

  const errors = [];

  if (!checks.schema) {
    errors.push(
      `Metadata schema must be ${PIP_CONSTITUENCY_METADATA_SCHEMA}.`
    );
  }

  if (!checks.parliamentCode) {
    errors.push(
      "Constituency parliament_code must match P followed by three digits."
    );
  }

  if (!checks.parliamentName) {
    errors.push("Constituency parliament_name is required.");
  }

  if (!checks.shortLabel) {
    errors.push("Constituency short_label is required.");
  }

  if (!checks.stateName) {
    errors.push("Constituency state_name is required.");
  }

  if (!checks.datasetId) {
    errors.push("Dataset dataset_id is required.");
  }

  if (!checks.datasetLabel) {
    errors.push("Dataset dataset_label is required.");
  }

  if (!checks.datasetVersion) {
    errors.push("Dataset dataset_version is required.");
  }

  if (!checks.sourceType) {
    errors.push("Dataset source_type is required.");
  }

  if (!checks.expectedTotalVoters) {
    errors.push(
      "Dataset expected_total_voters must be a positive integer."
    );
  }

  if (!checks.expectedRecordCounts) {
    errors.push(
      "Dataset expected_record_counts values must be non-negative integers."
    );
  }

  if (!checks.datasetFilePaths) {
    errors.push(
      "Dataset file paths must begin with /data/."
    );
  }

  if (!checks.uniqueDatasetFilePaths) {
    errors.push("Dataset file paths must be unique.");
  }

  if (!checks.filePrefix) {
    errors.push(
      "Constituency file_prefix must be filename-safe lowercase text."
    );
  }

  return {
    valid: errors.length === 0,
    metadata,
    checks,
    errors,
  };
}

export function createConstituencyDisplayAdapterFromMetadata(value) {
  const normalizedMetadata =
    normalizeConstituencyMetadata(value);

  const displayAdapter =
    createConstituencyDisplayAdapter({
      parliamentCode:
        normalizedMetadata.constituency.parliamentCode,
      parliamentName:
        normalizedMetadata.constituency.parliamentName,
      shortLabel:
        normalizedMetadata.constituency.shortLabel,
      filePrefix:
        normalizedMetadata.constituency.filePrefix,
    });

  return {
    ...displayAdapter,
    stateName: normalizedMetadata.constituency.stateName,
    datasetId: normalizedMetadata.dataset.datasetId,
    datasetLabel: normalizedMetadata.dataset.datasetLabel,
    datasetVersion:
      normalizedMetadata.dataset.datasetVersion,
    datasetSourceType: normalizedMetadata.dataset.sourceType,
    expectedTotalVoters:
      normalizedMetadata.dataset.expectedTotalVoters,
    expectedRecordCounts:
      normalizedMetadata.dataset.expectedRecordCounts,
    datasetFiles: normalizedMetadata.dataset.files,
  };
}
