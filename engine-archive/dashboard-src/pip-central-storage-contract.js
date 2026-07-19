import {
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES,
  PIP_SCENARIO_API_MAX_BODY_BYTES,
} from "./pip-scenario-api-contract.js";

export const PIP_CENTRAL_STORAGE_CONTRACT_SCHEMA =
  "pip.central-storage.contract.v1";

export const PIP_CENTRAL_STORAGE_REPOSITORY_SCHEMA =
  "pip.central-storage.repository.v1";

export const PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA =
  "pip.api.scenario-collection.v1";

export const PIP_CENTRAL_STORAGE_VERSION = 1;

export const PIP_CENTRAL_STORAGE_MODE = "DURABLE_FILE";

export const PIP_CENTRAL_STORAGE_REPOSITORY_ID =
  "pip-central-store-v1";

export const PIP_CENTRAL_STORAGE_DEFAULT_DIRECTORY = ".pip-data";

export const PIP_CENTRAL_STORAGE_DEFAULT_FILENAME =
  "pip-central-store-v1.json";

export const PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS = 100;

export const PIP_CENTRAL_STORAGE_COLLECTION_ENDPOINTS = {
  listCollections: {
    method: "GET",
    path: "/collections",
  },
  createCollection: {
    method: "POST",
    path: "/collections",
  },
  readCollection: {
    method: "GET",
    path: "/collections/:collectionId",
  },
  replaceCollection: {
    method: "PUT",
    path: "/collections/:collectionId",
  },
  patchCollection: {
    method: "PATCH",
    path: "/collections/:collectionId",
  },
  deleteCollection: {
    method: "DELETE",
    path: "/collections/:collectionId",
  },
};

const FORBIDDEN_FIELD_NAME_SET = new Set(
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.map((entry) =>
    String(entry).toLowerCase()
  )
);

const COLLECTION_MUTABLE_FIELDS = [
  "name",
  "description",
  "scenario_ids",
  "tags",
  "pinned",
  "acceptance_fixture",
  "metadata",
];

const COLLECTION_IMMUTABLE_FIELDS = [
  "id",
  "schema",
  "constituency_key",
  "parliament_code",
  "created_at",
  "revision",
  "deleted_at",
  "api_record",
];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeIsoTimestamp(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return null;
  }

  return new Date(Date.parse(value)).toISOString();
}

function normalizeUniqueStringList(values, maxCount) {
  const source = Array.isArray(values) ? values : [];
  const out = [];
  const seen = new Set();

  for (const entry of source) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    out.push(trimmed);

    if (typeof maxCount === "number" && out.length >= maxCount) {
      break;
    }
  }

  return out;
}

function hasTrimmedDuplicateString(values) {
  if (!Array.isArray(values)) {
    return false;
  }

  const seen = new Set();
  for (const entry of values) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    if (seen.has(trimmed)) {
      return true;
    }

    seen.add(trimmed);
  }

  return false;
}

function findForbiddenFieldPaths(value, parentPath = "") {
  const paths = [];

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPath = `${parentPath}[${index}]`;
      paths.push(...findForbiddenFieldPaths(entry, nextPath));
    });
    return paths;
  }

  if (!isPlainObject(value)) {
    return paths;
  }

  Object.entries(value).forEach(([key, entryValue]) => {
    const keyLower = String(key).toLowerCase();
    const nextPath = parentPath
      ? `${parentPath}.${String(key)}`
      : String(key);

    if (FORBIDDEN_FIELD_NAME_SET.has(keyLower)) {
      paths.push(nextPath);
    }

    paths.push(...findForbiddenFieldPaths(entryValue, nextPath));
  });

  return paths;
}

function hasProhibitedVoterStructure(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasProhibitedVoterStructure(entry));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).some(([key, entry]) => {
    const normalizedKey = String(key).toLowerCase();
    const keyMentionsVoter =
      normalizedKey.includes("voter") ||
      normalizedKey.includes("vtr_") ||
      normalizedKey === "ic" ||
      normalizedKey.startsWith("ic_");

    if (
      keyMentionsVoter &&
      (Array.isArray(entry) || isPlainObject(entry))
    ) {
      return true;
    }

    return hasProhibitedVoterStructure(entry);
  });
}

function toBodyBytes(value) {
  const json = JSON.stringify(value ?? {});

  if (typeof TextEncoder === "function") {
    return new TextEncoder().encode(json).byteLength;
  }

  return json.length;
}

function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (isPlainObject(value)) {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        out[key] = canonicalizeValue(value[key]);
      });
    return out;
  }

  return value;
}

function fnv1a32Hex(input) {
  let hash = 0x811c9dc5;
  const text = String(input ?? "");

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function createPipCentralStorageSignature(value) {
  const canonical = canonicalizeValue(value);
  return `fnv1a-${fnv1a32Hex(JSON.stringify(canonical))}`;
}

export function normalizePipScenarioCollectionCreatePayload(
  payload,
  {
    generatedAt,
    generatedId,
  } = {}
) {
  const source = isPlainObject(payload) ? payload : {};

  const resolvedGeneratedAt =
    normalizeIsoTimestamp(generatedAt) ??
    new Date().toISOString();

  const resolvedGeneratedId =
    typeof generatedId === "string" && generatedId.trim().length > 0
      ? generatedId.trim()
      : `collection-${Date.parse(resolvedGeneratedAt)}`;

  const normalized = {
    id:
      typeof source.id === "string" && source.id.trim().length > 0
        ? source.id.trim()
        : resolvedGeneratedId,
    schema: PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA,
    constituency_key: String(
      source.constituency_key ?? ""
    )
      .trim()
      .toLowerCase(),
    parliament_code: String(
      source.parliament_code ?? ""
    )
      .trim()
      .toUpperCase(),
    name: String(source.name ?? "").trim(),
    description: String(source.description ?? "").trim(),
    scenario_ids: normalizeUniqueStringList(
      source.scenario_ids,
      PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS
    ),
    tags: normalizeUniqueStringList(source.tags, 8),
    pinned: source.pinned === true,
    acceptance_fixture: source.acceptance_fixture === true,
    metadata: isPlainObject(source.metadata) ? source.metadata : {},
    created_at:
      normalizeIsoTimestamp(source.created_at) ??
      resolvedGeneratedAt,
    updated_at:
      normalizeIsoTimestamp(source.updated_at) ??
      resolvedGeneratedAt,
    revision: Number.isInteger(source.revision)
      ? Number(source.revision)
      : 1,
    deleted_at: normalizeIsoTimestamp(source.deleted_at),
    api_record: source.api_record !== false,
  };

  normalized.schema = PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA;

  return normalized;
}

export function validatePipScenarioCollectionCreatePayload(payload) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(payload);
  if (!checks.plain_object) {
    errors.push("Collection create payload must be a plain object.");
  }

  const safePayload = checks.plain_object ? payload : {};
  const normalized = checks.plain_object
    ? normalizePipScenarioCollectionCreatePayload(payload)
    : null;

  const forbiddenPaths = findForbiddenFieldPaths(safePayload);
  checks.no_forbidden_fields = forbiddenPaths.length === 0;

  checks.body_size_within_limit =
    toBodyBytes(safePayload) <= PIP_SCENARIO_API_MAX_BODY_BYTES;

  checks.no_raw_voter_structures =
    !hasProhibitedVoterStructure(safePayload);

  if (!normalized) {
    return {
      valid: false,
      checks,
      errors,
      normalized: null,
    };
  }

  const sourceScenarioIds = Array.isArray(safePayload.scenario_ids)
    ? safePayload.scenario_ids
    : [];
  const sourceTags = Array.isArray(safePayload.tags)
    ? safePayload.tags
    : [];

  checks.id_valid =
    typeof normalized.id === "string" &&
    normalized.id.length >= 1 &&
    normalized.id.length <= 160;

  checks.constituency_key_valid =
    /^[a-z0-9][a-z0-9-]{0,79}$/.test(
      String(safePayload.constituency_key ?? "").trim()
    ) &&
    String(safePayload.constituency_key ?? "").trim() ===
      String(safePayload.constituency_key ?? "")
        .trim()
        .toLowerCase();

  checks.parliament_code_valid = /^P[0-9]{3}$/.test(
    String(safePayload.parliament_code ?? "").trim()
  );

  checks.name_valid =
    normalized.name.length >= 1 && normalized.name.length <= 120;

  checks.description_valid = normalized.description.length <= 300;

  checks.scenario_ids_count_valid =
    sourceScenarioIds.length <=
    PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS;

  checks.scenario_ids_values_valid =
    sourceScenarioIds.every(
      (entry) =>
        typeof entry === "string" &&
        entry.trim().length > 0 &&
        entry.trim().length <= 160
    ) &&
    !hasTrimmedDuplicateString(sourceScenarioIds);

  checks.tags_valid =
    sourceTags.length <= 8 &&
    sourceTags.every(
      (entry) =>
        typeof entry === "string" &&
        entry.trim().length > 0 &&
        entry.trim().length <= 24
    ) &&
    !hasTrimmedDuplicateString(sourceTags);

  checks.pinned_boolean = typeof normalized.pinned === "boolean";

  checks.acceptance_fixture_boolean =
    typeof normalized.acceptance_fixture === "boolean";

  checks.metadata_plain_object = isPlainObject(normalized.metadata);

  checks.metadata_no_forbidden_fields =
    findForbiddenFieldPaths(normalized.metadata).length === 0;

  checks.schema_valid =
    normalized.schema === PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA;

  checks.timestamps_valid =
    normalizeIsoTimestamp(normalized.created_at) !== null &&
    normalizeIsoTimestamp(normalized.updated_at) !== null;

  checks.revision_valid =
    Number.isInteger(normalized.revision) && normalized.revision > 0;

  checks.deleted_at_valid =
    normalized.deleted_at === null ||
    normalizeIsoTimestamp(normalized.deleted_at) !== null;

  checks.api_record_true = normalized.api_record === true;

  Object.entries(checks).forEach(([name, valid]) => {
    if (valid !== true) {
      errors.push(`Collection create check failed: ${name}`);
    }
  });

  if (!checks.no_forbidden_fields) {
    errors.push(
      `Collection create payload contains forbidden fields: ${forbiddenPaths.join(
        ", "
      )}`
    );
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipScenarioCollectionPatchPayload(payload) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(payload);
  if (!checks.plain_object) {
    errors.push("Collection patch payload must be a plain object.");
  }

  const safePayload = checks.plain_object ? payload : {};

  const forbiddenPaths = findForbiddenFieldPaths(safePayload);
  checks.no_forbidden_fields = forbiddenPaths.length === 0;

  checks.body_size_within_limit =
    toBodyBytes(safePayload) <= PIP_SCENARIO_API_MAX_BODY_BYTES;

  const immutableFieldsPresent = COLLECTION_IMMUTABLE_FIELDS.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(safePayload, field)
  );

  checks.immutable_fields_absent =
    immutableFieldsPresent.length === 0;

  const mutableFieldsPresent = COLLECTION_MUTABLE_FIELDS.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(safePayload, field)
  );

  checks.has_mutable_field = mutableFieldsPresent.length > 0;

  const normalized = {};

  COLLECTION_MUTABLE_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(safePayload, field)) {
      return;
    }

    if (field === "scenario_ids") {
      normalized[field] = normalizeUniqueStringList(
        safePayload[field],
        PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS
      );
      return;
    }

    if (field === "tags") {
      normalized[field] = normalizeUniqueStringList(
        safePayload[field],
        8
      );
      return;
    }

    if (field === "metadata") {
      normalized[field] = isPlainObject(safePayload[field])
        ? safePayload[field]
        : {};
      return;
    }

    if (field === "pinned" || field === "acceptance_fixture") {
      normalized[field] = safePayload[field] === true;
      return;
    }

    normalized[field] = String(safePayload[field] ?? "").trim();
  });

  checks.name_valid =
    !Object.prototype.hasOwnProperty.call(normalized, "name") ||
    (normalized.name.length >= 1 && normalized.name.length <= 120);

  checks.description_valid =
    !Object.prototype.hasOwnProperty.call(normalized, "description") ||
    normalized.description.length <= 300;

  const sourceScenarioIds = Array.isArray(safePayload.scenario_ids)
    ? safePayload.scenario_ids
    : [];

  checks.scenario_ids_valid =
    !Object.prototype.hasOwnProperty.call(
      safePayload,
      "scenario_ids"
    ) ||
    (sourceScenarioIds.length <=
      PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS &&
      sourceScenarioIds.every(
        (entry) =>
          typeof entry === "string" &&
          entry.trim().length > 0 &&
          entry.trim().length <= 160
      ) &&
      !hasTrimmedDuplicateString(sourceScenarioIds));

  const sourceTags = Array.isArray(safePayload.tags)
    ? safePayload.tags
    : [];

  checks.tags_valid =
    !Object.prototype.hasOwnProperty.call(safePayload, "tags") ||
    (sourceTags.length <= 8 &&
      sourceTags.every(
        (entry) =>
          typeof entry === "string" &&
          entry.trim().length > 0 &&
          entry.trim().length <= 24
      ) &&
      !hasTrimmedDuplicateString(sourceTags));

  checks.metadata_valid =
    !Object.prototype.hasOwnProperty.call(safePayload, "metadata") ||
    (isPlainObject(normalized.metadata) &&
      findForbiddenFieldPaths(normalized.metadata).length === 0);

  checks.no_raw_voter_structures =
    !hasProhibitedVoterStructure(safePayload);

  Object.entries(checks).forEach(([name, valid]) => {
    if (valid !== true) {
      errors.push(`Collection patch check failed: ${name}`);
    }
  });

  if (!checks.no_forbidden_fields) {
    errors.push(
      `Collection patch payload contains forbidden fields: ${forbiddenPaths.join(
        ", "
      )}`
    );
  }

  if (!checks.immutable_fields_absent) {
    errors.push(
      `Collection patch payload contains immutable fields: ${immutableFieldsPresent.join(
        ", "
      )}`
    );
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipScenarioCollectionRecord(record) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(record);

  if (!checks.plain_object) {
    errors.push("Collection record must be a plain object.");
    return {
      valid: false,
      checks,
      errors,
    };
  }

  const createValidation =
    validatePipScenarioCollectionCreatePayload(record);

  checks.create_rules_valid = createValidation.valid === true;
  checks.schema_valid =
    record.schema === PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA;
  checks.created_at_valid =
    normalizeIsoTimestamp(record.created_at) !== null;
  checks.updated_at_valid =
    normalizeIsoTimestamp(record.updated_at) !== null;
  checks.revision_positive =
    Number.isInteger(record.revision) && record.revision > 0;
  checks.deleted_at_valid =
    record.deleted_at === null ||
    normalizeIsoTimestamp(record.deleted_at) !== null;
  checks.api_record_true = record.api_record === true;
  checks.no_forbidden_fields =
    findForbiddenFieldPaths(record).length === 0;

  Object.entries(checks).forEach(([name, valid]) => {
    if (valid !== true) {
      errors.push(`Collection record check failed: ${name}`);
    }
  });

  if (!createValidation.valid) {
    errors.push(...createValidation.errors);
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
  };
}

export function buildPipCentralStorageContractManifest({
  generatedAt,
} = {}) {
  const timestamp =
    normalizeIsoTimestamp(generatedAt) ??
    new Date().toISOString();

  return {
    schema: PIP_CENTRAL_STORAGE_CONTRACT_SCHEMA,
    generated_at: timestamp,
    repository: {
      repository_schema: PIP_CENTRAL_STORAGE_REPOSITORY_SCHEMA,
      repository_version: PIP_CENTRAL_STORAGE_VERSION,
      repository_id: PIP_CENTRAL_STORAGE_REPOSITORY_ID,
      storage_mode: PIP_CENTRAL_STORAGE_MODE,
      default_directory: PIP_CENTRAL_STORAGE_DEFAULT_DIRECTORY,
      default_filename: PIP_CENTRAL_STORAGE_DEFAULT_FILENAME,
      resource_types: ["scenarios", "collections"],
    },
    collection: {
      collection_schema: PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA,
      maximum_collection_scenarios:
        PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS,
    },
    endpoints: {
      ...PIP_CENTRAL_STORAGE_COLLECTION_ENDPOINTS,
    },
    persistence: {
      durable_json_file: true,
      server_restart_persistence: true,
      atomic_replacement: true,
      deterministic_repository_signature: true,
      monotonic_repository_revision: true,
      soft_deleted_records_remain_persisted: true,
    },
    atomicity: {
      writes_use_temporary_file: true,
      file_data_flushed_before_replacement: true,
      primary_replacement_atomic: true,
      backup_refreshed_after_successful_commit: true,
      incomplete_temporary_files_not_committed: true,
      operations_serialized_per_server_process: true,
    },
    recovery: {
      primary_validated_on_startup: true,
      valid_backup_restores_invalid_primary: true,
      invalid_primary_and_backup_block_startup: true,
      recovery_status_reported_in_health: true,
      no_silent_empty_store_reset: true,
    },
    compatibility: {
      imported_factory_default_mode: "VOLATILE_MEMORY",
      direct_execution_default_mode: "DURABLE_FILE",
      batch_52a_volatile_regression_available: true,
      api_v1_scenario_routes_compatible: true,
    },
    privacy: {
      aggregate_scenario_metadata_only: true,
      aggregate_collection_metadata_only: true,
      no_raw_voter_records: true,
      no_individual_voter_profiles: true,
      no_removed_privacy_fields: true,
      no_browser_storage_snapshots_in_repository: true,
    },
    safety: {
      legacy_browser_storage_authoritative: true,
      no_automatic_browser_to_server_copy: true,
      no_automatic_server_to_browser_copy: true,
      no_read_cutover: true,
      no_write_cutover: true,
      no_automatic_synchronisation: true,
      no_automatic_fallback: true,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      authenticated_user_role_from_server_repository: true,
      client_payload_role_not_trusted: true,
      role_based_denials_deferred_to_batch_53c: true,
      local_file_mode_is_not_production_deployment: true,
    },
    summary: {
      repository_version: 1,
      resource_type_count: 2,
      collection_endpoint_count: 6,
      storage_mode: "DURABLE_FILE",
      central_persistence_enabled: true,
      restart_persistence_enabled: true,
      operational_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
    },
  };
}

export function validatePipCentralStorageContractManifest(
  manifest
) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};
  const checks = {
    schema_valid:
      safeManifest.schema === PIP_CENTRAL_STORAGE_CONTRACT_SCHEMA,
    generated_at_valid:
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    repository_schema_valid:
      safeManifest?.repository?.repository_schema ===
      PIP_CENTRAL_STORAGE_REPOSITORY_SCHEMA,
    repository_version_valid:
      safeManifest?.repository?.repository_version ===
      PIP_CENTRAL_STORAGE_VERSION,
    repository_id_valid:
      safeManifest?.repository?.repository_id ===
      PIP_CENTRAL_STORAGE_REPOSITORY_ID,
    storage_mode_valid:
      safeManifest?.repository?.storage_mode ===
      PIP_CENTRAL_STORAGE_MODE,
    default_directory_valid:
      safeManifest?.repository?.default_directory ===
      PIP_CENTRAL_STORAGE_DEFAULT_DIRECTORY,
    default_filename_valid:
      safeManifest?.repository?.default_filename ===
      PIP_CENTRAL_STORAGE_DEFAULT_FILENAME,
    resource_types_valid:
      Array.isArray(safeManifest?.repository?.resource_types) &&
      safeManifest.repository.resource_types.length === 2 &&
      safeManifest.repository.resource_types.includes("scenarios") &&
      safeManifest.repository.resource_types.includes("collections"),
    endpoint_count_valid:
      Object.keys(safeManifest.endpoints ?? {}).length === 6,
    collection_schema_valid:
      safeManifest?.collection?.collection_schema ===
      PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA,
    collection_limit_valid:
      safeManifest?.collection?.maximum_collection_scenarios ===
      PIP_CENTRAL_STORAGE_MAX_COLLECTION_SCENARIOS,
    persistence_rules_valid:
      safeManifest?.persistence?.durable_json_file === true &&
      safeManifest?.persistence?.server_restart_persistence ===
        true &&
      safeManifest?.persistence?.atomic_replacement === true &&
      safeManifest?.persistence
        ?.deterministic_repository_signature === true &&
      safeManifest?.persistence?.monotonic_repository_revision ===
        true,
    atomicity_rules_valid:
      safeManifest?.atomicity?.writes_use_temporary_file ===
        true &&
      safeManifest?.atomicity
        ?.file_data_flushed_before_replacement === true &&
      safeManifest?.atomicity?.primary_replacement_atomic ===
        true &&
      safeManifest?.atomicity
        ?.backup_refreshed_after_successful_commit === true &&
      safeManifest?.atomicity
        ?.incomplete_temporary_files_not_committed === true &&
      safeManifest?.atomicity
        ?.operations_serialized_per_server_process === true,
    recovery_rules_valid:
      safeManifest?.recovery?.primary_validated_on_startup ===
        true &&
      safeManifest?.recovery
        ?.valid_backup_restores_invalid_primary === true &&
      safeManifest?.recovery
        ?.invalid_primary_and_backup_block_startup === true &&
      safeManifest?.recovery
        ?.recovery_status_reported_in_health === true &&
      safeManifest?.recovery?.no_silent_empty_store_reset ===
        true,
    compatibility_rules_valid:
      safeManifest?.compatibility?.imported_factory_default_mode ===
        "VOLATILE_MEMORY" &&
      safeManifest?.compatibility
        ?.direct_execution_default_mode === "DURABLE_FILE" &&
      safeManifest?.compatibility
        ?.batch_52a_volatile_regression_available === true &&
      safeManifest?.compatibility?.api_v1_scenario_routes_compatible ===
        true,
    privacy_rules_valid:
      safeManifest?.privacy?.aggregate_scenario_metadata_only ===
        true &&
      safeManifest?.privacy
        ?.aggregate_collection_metadata_only === true &&
      safeManifest?.privacy?.no_raw_voter_records === true &&
      safeManifest?.privacy?.no_individual_voter_profiles ===
        true &&
      safeManifest?.privacy?.no_removed_privacy_fields ===
        true &&
      safeManifest?.privacy
        ?.no_browser_storage_snapshots_in_repository === true,
    safety_rules_valid:
      safeManifest?.safety
        ?.legacy_browser_storage_authoritative === true &&
      safeManifest?.safety
        ?.no_automatic_browser_to_server_copy === true &&
      safeManifest?.safety
        ?.no_automatic_server_to_browser_copy === true &&
      safeManifest?.safety?.no_read_cutover === true &&
      safeManifest?.safety?.no_write_cutover === true &&
      safeManifest?.safety?.no_automatic_synchronisation === true &&
      safeManifest?.safety?.no_automatic_fallback === true &&
      safeManifest?.safety?.authentication_configured === true &&
      safeManifest?.safety?.authentication_required === true &&
      safeManifest?.safety?.roles_configured === true &&
      safeManifest?.safety?.authorization_enforced === true &&
      safeManifest?.safety
        ?.authenticated_user_role_from_server_repository === true &&
      safeManifest?.safety?.client_payload_role_not_trusted ===
        true &&
      safeManifest?.safety
        ?.role_based_denials_deferred_to_batch_53c === true,
    summary_valid:
      safeManifest?.summary?.repository_version === 1 &&
      safeManifest?.summary?.resource_type_count === 2 &&
      safeManifest?.summary?.collection_endpoint_count === 6 &&
      safeManifest?.summary?.storage_mode === "DURABLE_FILE" &&
      safeManifest?.summary?.central_persistence_enabled === true &&
      safeManifest?.summary?.restart_persistence_enabled === true &&
      safeManifest?.summary?.operational_cutover_enabled === false &&
      safeManifest?.summary?.automatic_synchronisation_enabled ===
        false &&
      safeManifest?.summary?.authentication_configured === true &&
      safeManifest?.summary?.authentication_required === true &&
      safeManifest?.summary?.roles_configured === true &&
      safeManifest?.summary?.authorization_enforced === true,
  };

  const errors = Object.entries(checks)
    .filter(([, valid]) => valid !== true)
    .map(
      ([name]) =>
        `Central storage contract manifest check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      resource_type_count: Array.isArray(
        safeManifest?.repository?.resource_types
      )
        ? safeManifest.repository.resource_types.length
        : 0,
      collection_endpoint_count: Object.keys(
        safeManifest.endpoints ?? {}
      ).length,
      storage_mode: String(
        safeManifest?.repository?.storage_mode ?? ""
      ),
    },
  };
}
