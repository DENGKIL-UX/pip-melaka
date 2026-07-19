import { createPipP134FNV1aSignature } from "./pip-p134-browser-db";

function isPlainObject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeIsoTimestamp(value, fieldName) {
  const normalizedValue =
    String(value ?? "").trim();

  const parsedTimestamp =
    Date.parse(normalizedValue);

  if (!Number.isFinite(parsedTimestamp)) {
    throw new Error(
      `Invalid ${fieldName} timestamp.`
    );
  }

  return new Date(parsedTimestamp).toISOString();
}

function ensureNonEmptyString(value, fieldName) {
  const normalizedValue = String(
    value ?? ""
  ).trim();

  if (!normalizedValue) {
    throw new Error(
      `Missing required field: ${fieldName}.`
    );
  }

  return normalizedValue;
}

function createCanonicalReadOnlySharingPayload({
  schema,
  publishedAt,
  source,
  sharingControls,
  scenario,
  localityReferences,
}) {
  return {
    schema,
    published_at: publishedAt,
    source: {
      application: source.application,
      parliament_code:
        source.parliament_code,
      portability_version:
        source.portability_version,
      sharing_profile:
        source.sharing_profile,
    },
    sharing_controls: {
      package_mode:
        sharingControls.package_mode,
      can_overwrite_existing:
        sharingControls.can_overwrite_existing,
      requires_conflict_resolution:
        sharingControls.requires_conflict_resolution,
      target_import_behavior:
        sharingControls.target_import_behavior,
    },
    scenario,
    locality_references: localityReferences,
  };
}

function sanitizeFileToken(value, fallback = "scenario") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return normalized || fallback;
}

export function createReadOnlyScenarioSharingFileName({
  scenarioName,
  exportedAt,
  packageId,
}) {
  const safeScenario = sanitizeFileToken(
    scenarioName,
    "saved-scenario"
  );

  const safePackageToken = sanitizeFileToken(
    packageId,
    "pkg"
  );

  const dateToken = String(exportedAt ?? "")
    .slice(0, 10)
    .replace(/[^0-9-]/g, "") || "unknown-date";

  return `p134-readonly-scenario-share-${safeScenario}-${dateToken}-${safePackageToken}.json`;
}

export function buildReadOnlyScenarioSharingPackage({
  scenario,
  localityReferences,
  exportedAt,
  source,
}) {
  if (!scenario || typeof scenario !== "object") {
    throw new Error(
      "A saved scenario is required to create a sharing package."
    );
  }

  if (!Array.isArray(scenario.locality_keys)) {
    throw new Error(
      "Saved scenario locality keys are required to create a sharing package."
    );
  }

  const publishedAt =
    typeof exportedAt === "string" && exportedAt.trim().length > 0
      ? exportedAt
      : new Date().toISOString();

  const normalizedScenario = {
    id: String(scenario.id ?? ""),
    name: String(scenario.name ?? ""),
    description: String(scenario.description ?? ""),
    operational_notes: String(
      scenario.operational_notes ?? ""
    ),
    owner: String(scenario.owner ?? ""),
    workflow_status: String(
      scenario.workflow_status ?? "DRAFT"
    ),
    review_date: scenario.review_date ?? null,
    tags: Array.isArray(scenario.tags)
      ? [...scenario.tags]
      : [],
    metadata_updated_at:
      scenario.metadata_updated_at ?? null,
    locality_keys: [...scenario.locality_keys],
    locality_count: scenario.locality_keys.length,
    created_at: scenario.created_at ?? null,
    updated_at: scenario.updated_at ?? null,
    pinned: Boolean(scenario.pinned),
    pinned_at: scenario.pinned_at ?? null,
    source_scenario_id:
      scenario.source_scenario_id ?? null,
    source_exported_at:
      scenario.source_exported_at ?? null,
    imported_from_file:
      scenario.imported_from_file ?? null,
    imported_at: scenario.imported_at ?? null,
  };

  const canonicalPayload = {
    ...createCanonicalReadOnlySharingPayload({
      schema:
        "pip.p134.saved-comparison-scenario-share-readonly.v1",
      publishedAt,
      source: {
        application:
          source?.application ||
          "PIP Voter Intelligence Dashboard",
        parliament_code:
          source?.parliament_code || "P134",
        portability_version: 1,
        sharing_profile: "READ_ONLY",
      },
      sharingControls: {
        package_mode: "READ_ONLY",
        can_overwrite_existing: false,
        requires_conflict_resolution: true,
        target_import_behavior:
          "append_without_overwrite",
      },
      scenario: normalizedScenario,
      localityReferences: Array.isArray(
        localityReferences
      )
        ? localityReferences
        : [],
    }),
  };

  const canonicalJson = JSON.stringify(
    canonicalPayload
  );

  const payloadSignature =
    createPipP134FNV1aSignature(
      canonicalJson
    );

  const packageId =
    `shr-${payloadSignature.replace("fnv1a-", "")}-${Date.now().toString(36)}`;

  return {
    ...canonicalPayload,
    package_id: packageId,
    integrity: {
      signature_algorithm: "FNV-1a-32",
      payload_signature: payloadSignature,
      canonical_json_bytes:
        new Blob([canonicalJson]).size,
    },
  };
}

export function validateReadOnlyScenarioSharingPackage(
  payload
) {
  if (!isPlainObject(payload)) {
    throw new Error(
      "Shared package must be a JSON object."
    );
  }

  const expectedSchema =
    "pip.p134.saved-comparison-scenario-share-readonly.v1";

  if (payload.schema !== expectedSchema) {
    throw new Error(
      `Invalid sharing schema. Expected "${expectedSchema}".`
    );
  }

  const packageId = ensureNonEmptyString(
    payload.package_id,
    "package_id"
  );

  const publishedAt = normalizeIsoTimestamp(
    payload.published_at,
    "published_at"
  );

  const source = payload.source;

  if (!isPlainObject(source)) {
    throw new Error(
      "Invalid package source block."
    );
  }

  const sourceApplication =
    ensureNonEmptyString(
      source.application,
      "source.application"
    );

  const sourceParliamentCode =
    ensureNonEmptyString(
      source.parliament_code,
      "source.parliament_code"
    ).toUpperCase();

  if (sourceParliamentCode !== "P134") {
    throw new Error(
      "This shared package was not exported for Parliament P134."
    );
  }

  const portabilityVersion = Number(
    source.portability_version
  );

  if (portabilityVersion !== 1) {
    throw new Error(
      "Unsupported sharing portability version."
    );
  }

  if (source.sharing_profile !== "READ_ONLY") {
    throw new Error(
      "Only READ_ONLY sharing packages are supported."
    );
  }

  const sharingControls =
    payload.sharing_controls;

  if (!isPlainObject(sharingControls)) {
    throw new Error(
      "Invalid sharing_controls block."
    );
  }

  if (
    sharingControls.package_mode !==
    "READ_ONLY"
  ) {
    throw new Error(
      "Package mode must be READ_ONLY."
    );
  }

  if (
    sharingControls.can_overwrite_existing !==
    false
  ) {
    throw new Error(
      "Shared package permits overwrite and cannot be imported in Batch 46B."
    );
  }

  const scenario = payload.scenario;

  if (!isPlainObject(scenario)) {
    throw new Error(
      "Invalid scenario payload block."
    );
  }

  const sourceScenarioId =
    ensureNonEmptyString(
      scenario.id,
      "scenario.id"
    );

  const sourceScenarioName =
    ensureNonEmptyString(
      scenario.name,
      "scenario.name"
    );

  if (!Array.isArray(scenario.locality_keys)) {
    throw new Error(
      "Scenario locality_keys must be an array."
    );
  }

  const normalizedLocalityKeys =
    scenario.locality_keys.map(
      (localityId) =>
        ensureNonEmptyString(
          localityId,
          "scenario.locality_keys[]"
        )
    );

  const uniqueLocalityKeys = [
    ...new Set(normalizedLocalityKeys),
  ];

  if (
    uniqueLocalityKeys.length !==
    normalizedLocalityKeys.length
  ) {
    throw new Error(
      "Scenario locality_keys contain duplicate locality IDs."
    );
  }

  const declaredLocalityCount = Number(
    scenario.locality_count
  );

  if (
    !Number.isInteger(
      declaredLocalityCount
    ) ||
    declaredLocalityCount < 1
  ) {
    throw new Error(
      "Scenario locality_count must be a positive integer."
    );
  }

  if (
    declaredLocalityCount !==
    uniqueLocalityKeys.length
  ) {
    throw new Error(
      "Scenario locality_count does not match scenario.locality_keys."
    );
  }

  const localityReferences =
    payload.locality_references;

  if (!Array.isArray(localityReferences)) {
    throw new Error(
      "Package locality_references must be an array."
    );
  }

  const normalizedLocalityReferences =
    localityReferences.map((reference) => {
      if (!isPlainObject(reference)) {
        throw new Error(
          "Each locality reference must be an object."
        );
      }

      const localityId =
        ensureNonEmptyString(
          reference.locality_id,
          "locality_references[].locality_id"
        );

      return {
        locality_id: localityId,
        available_in_current_dataset:
          Boolean(
            reference.available_in_current_dataset
          ),
        locality_name:
          reference.locality_name ?? null,
        locality_code:
          reference.locality_code ?? null,
        dm_name:
          reference.dm_name ?? null,
        dm_code:
          reference.dm_code ?? null,
        dun_name:
          reference.dun_name ?? null,
        dun_code:
          reference.dun_code ?? null,
      };
    });

  const referenceLocalityIds =
    normalizedLocalityReferences.map(
      (reference) =>
        reference.locality_id
    );

  if (
    new Set(referenceLocalityIds).size !==
    referenceLocalityIds.length
  ) {
    throw new Error(
      "Package locality_references contain duplicate locality IDs."
    );
  }

  if (
    normalizedLocalityReferences.length !==
    uniqueLocalityKeys.length
  ) {
    throw new Error(
      "Package locality_references count does not match scenario.locality_keys."
    );
  }

  const missingReference =
    uniqueLocalityKeys.find(
      (localityId) =>
        !referenceLocalityIds.includes(
          localityId
        )
    );

  if (missingReference) {
    throw new Error(
      `Missing locality reference for ID "${missingReference}".`
    );
  }

  const normalizedScenario = {
    id: sourceScenarioId,
    name: sourceScenarioName,
    description: String(
      scenario.description ?? ""
    ),
    operational_notes: String(
      scenario.operational_notes ?? ""
    ),
    owner: String(scenario.owner ?? ""),
    workflow_status: String(
      scenario.workflow_status ?? "DRAFT"
    )
      .trim()
      .toUpperCase(),
    review_date: scenario.review_date ?? null,
    tags: Array.isArray(scenario.tags)
      ? [...scenario.tags]
      : [],
    metadata_updated_at:
      scenario.metadata_updated_at ?? null,
    locality_keys: uniqueLocalityKeys,
    locality_count:
      uniqueLocalityKeys.length,
    created_at: scenario.created_at ?? null,
    updated_at: scenario.updated_at ?? null,
    pinned: Boolean(scenario.pinned),
    pinned_at: scenario.pinned_at ?? null,
    source_scenario_id:
      scenario.source_scenario_id ?? null,
    source_exported_at:
      scenario.source_exported_at ?? null,
    imported_from_file:
      scenario.imported_from_file ?? null,
    imported_at: scenario.imported_at ?? null,
  };

  const integrity = payload.integrity;

  if (!isPlainObject(integrity)) {
    throw new Error(
      "Invalid package integrity block."
    );
  }

  if (
    String(
      integrity.signature_algorithm ?? ""
    ).trim() !== "FNV-1a-32"
  ) {
    throw new Error(
      "Unsupported integrity signature algorithm."
    );
  }

  const providedSignature =
    ensureNonEmptyString(
      integrity.payload_signature,
      "integrity.payload_signature"
    );

  if (!/^fnv1a-[0-9a-f]{8}$/i.test(providedSignature)) {
    throw new Error(
      "Invalid payload signature format."
    );
  }

  const canonicalPayload =
    createCanonicalReadOnlySharingPayload({
      schema: expectedSchema,
      publishedAt,
      source: {
        application:
          sourceApplication,
        parliament_code:
          sourceParliamentCode,
        portability_version:
          portabilityVersion,
        sharing_profile: "READ_ONLY",
      },
      sharingControls: {
        package_mode: "READ_ONLY",
        can_overwrite_existing: false,
        requires_conflict_resolution:
          Boolean(
            sharingControls.requires_conflict_resolution
          ),
        target_import_behavior: String(
          sharingControls.target_import_behavior ??
            "append_without_overwrite"
        ),
      },
      scenario: normalizedScenario,
      localityReferences:
        normalizedLocalityReferences,
    });

  const canonicalJson = JSON.stringify(
    canonicalPayload
  );

  const recalculatedSignature =
    createPipP134FNV1aSignature(
      canonicalJson
    );

  if (
    recalculatedSignature !==
    providedSignature
  ) {
    throw new Error(
      "Read-only package signature verification failed."
    );
  }

  const canonicalByteLength = new Blob([
    canonicalJson,
  ]).size;

  if (
    integrity.canonical_json_bytes !==
      undefined &&
    Number(integrity.canonical_json_bytes) !==
      canonicalByteLength
  ) {
    throw new Error(
      "Package canonical JSON byte count does not match the payload."
    );
  }

  const availableLocalityCount =
    normalizedLocalityReferences.filter(
      (reference) =>
        reference.available_in_current_dataset
    ).length;

  const validationSummary = {
    package_id: packageId,
    package_mode: "READ_ONLY",
    overwrite_allowed: false,
    exported_at: publishedAt,
    source_application:
      sourceApplication,
    source_parliament_code:
      sourceParliamentCode,
    source_scenario_id:
      normalizedScenario.id,
    source_scenario_name:
      normalizedScenario.name,
    locality_count:
      normalizedScenario.locality_count,
    available_locality_count:
      availableLocalityCount,
    unavailable_locality_count:
      normalizedScenario.locality_count -
      availableLocalityCount,
    payload_signature:
      recalculatedSignature,
  };

  return {
    normalizedPackage: {
      ...canonicalPayload,
      package_id: packageId,
      integrity: {
        signature_algorithm:
          "FNV-1a-32",
        payload_signature:
          recalculatedSignature,
        canonical_json_bytes:
          canonicalByteLength,
      },
    },
    validationSummary,
  };
}