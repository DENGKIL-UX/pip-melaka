export const PIP_SCENARIO_API_CONTRACT_SCHEMA =
  "pip.api.scenario-contract.v1";

export const PIP_SCENARIO_API_RECORD_SCHEMA =
  "pip.api.scenario-record.v1";

export const PIP_SCENARIO_API_RESPONSE_SCHEMA =
  "pip.api.response.v1";

export const PIP_SCENARIO_API_ERROR_SCHEMA =
  "pip.api.error.v1";

export const PIP_SCENARIO_API_VERSION = "v1";

export const PIP_SCENARIO_API_DEFAULT_HOST = "127.0.0.1";

export const PIP_SCENARIO_API_DEFAULT_PORT = 4181;

export const PIP_SCENARIO_API_DEFAULT_BASE_URL =
  "http://127.0.0.1:4181/api/v1";

export const PIP_SCENARIO_API_MAX_BODY_BYTES = 1048576;

export const PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "UNDER_REVIEW",
  "COMPLETED",
  "ARCHIVED",
];

export const PIP_SCENARIO_API_ENDPOINTS = {
  health: {
    method: "GET",
    path: "/health",
  },
  listScenarios: {
    method: "GET",
    path: "/scenarios",
  },
  createScenario: {
    method: "POST",
    path: "/scenarios",
  },
  readScenario: {
    method: "GET",
    path: "/scenarios/:scenarioId",
  },
  replaceScenario: {
    method: "PUT",
    path: "/scenarios/:scenarioId",
  },
  patchScenario: {
    method: "PATCH",
    path: "/scenarios/:scenarioId",
  },
  deleteScenario: {
    method: "DELETE",
    path: "/scenarios/:scenarioId",
  },
};

export const PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES = [
  "IC",
  "IC_LAMA",
  "IC_PERSONEL",
  "IC_SPOUSE",
  "NAMA",
  "NO_TEL_HF",
  "NOAHLI",
  "CATATAN",
  "VTR_ID",
  "VTR_LABEL",
  "voter_records",
  "raw_voter_records",
  "individual_voters",
  "voter_profiles",
  "raw_records",
];

const FORBIDDEN_FIELD_NAME_SET = new Set(
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.map((entry) =>
    String(entry).toLowerCase()
  )
);

const CREATE_SUPPORTED_FIELDS = [
  "id",
  "schema",
  "constituency_key",
  "parliament_code",
  "name",
  "locality_keys",
  "description",
  "operational_notes",
  "owner",
  "workflow_status",
  "review_date",
  "tags",
  "pinned",
  "source_legacy_id",
  "acceptance_fixture",
  "metadata",
  "created_at",
  "updated_at",
  "revision",
  "deleted_at",
  "api_record",
];

const MUTABLE_FIELDS = [
  "name",
  "locality_keys",
  "description",
  "operational_notes",
  "owner",
  "workflow_status",
  "review_date",
  "tags",
  "pinned",
  "source_legacy_id",
  "acceptance_fixture",
  "metadata",
  "updated_at",
];

const IMMUTABLE_PATCH_FIELDS = [
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

function normalizeDateOnly(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? trimmed
    : null;
}

function toBodyBytes(value) {
  const json = JSON.stringify(value ?? {});

  if (typeof TextEncoder === "function") {
    return new TextEncoder().encode(json).byteLength;
  }

  return json.length;
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
    if (!trimmed) {
      continue;
    }

    if (seen.has(trimmed)) {
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

function normalizeWorkflowStatus(value) {
  if (typeof value !== "string") {
    return "DRAFT";
  }

  const normalized = value.trim().toUpperCase();
  return PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES.includes(
    normalized
  )
    ? normalized
    : normalized;
}

function normalizedSchema(value) {
  return value === PIP_SCENARIO_API_RECORD_SCHEMA
    ? value
    : PIP_SCENARIO_API_RECORD_SCHEMA;
}

function normalizePatchMutableFields(payload) {
  const source = isPlainObject(payload) ? payload : {};
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(source, "name")) {
    normalized.name = String(source.name ?? "").trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(source, "locality_keys")
  ) {
    normalized.locality_keys = normalizeUniqueStringList(
      source.locality_keys,
      4
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(source, "description")
  ) {
    normalized.description = String(
      source.description ?? ""
    ).trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      source,
      "operational_notes"
    )
  ) {
    normalized.operational_notes = String(
      source.operational_notes ?? ""
    ).trim();
  }

  if (Object.prototype.hasOwnProperty.call(source, "owner")) {
    normalized.owner = String(source.owner ?? "").trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      source,
      "workflow_status"
    )
  ) {
    normalized.workflow_status = normalizeWorkflowStatus(
      source.workflow_status
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(source, "review_date")
  ) {
    normalized.review_date = normalizeDateOnly(source.review_date);
  }

  if (Object.prototype.hasOwnProperty.call(source, "tags")) {
    normalized.tags = normalizeUniqueStringList(source.tags, 8);
  }

  if (Object.prototype.hasOwnProperty.call(source, "pinned")) {
    normalized.pinned = source.pinned === true;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      source,
      "source_legacy_id"
    )
  ) {
    const value = source.source_legacy_id;
    normalized.source_legacy_id =
      typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      source,
      "acceptance_fixture"
    )
  ) {
    normalized.acceptance_fixture =
      source.acceptance_fixture === true;
  }

  if (
    Object.prototype.hasOwnProperty.call(source, "metadata")
  ) {
    normalized.metadata = isPlainObject(source.metadata)
      ? source.metadata
      : {};
  }

  if (
    Object.prototype.hasOwnProperty.call(source, "updated_at")
  ) {
    normalized.updated_at =
      normalizeIsoTimestamp(source.updated_at) ?? null;
  }

  return normalized;
}

export function createPipScenarioApiEtag(record) {
  const safeRecord = isPlainObject(record) ? record : null;

  if (!safeRecord) {
    throw new Error("ETag generation requires a plain object record.");
  }

  const id = String(safeRecord.id ?? "").trim();
  const revision = Number(safeRecord.revision ?? NaN);

  if (!id || id.length > 160) {
    throw new Error("ETag generation requires a valid record id.");
  }

  if (!Number.isInteger(revision) || revision <= 0) {
    throw new Error(
      "ETag generation requires a positive integer revision."
    );
  }

  return `W/"${encodeURIComponent(id)}:${revision}"`;
}

export function normalizePipScenarioApiCreatePayload(
  payload,
  options = {}
) {
  const source = isPlainObject(payload) ? payload : {};

  const generatedAt =
    normalizeIsoTimestamp(options.generatedAt) ??
    new Date().toISOString();

  const fallbackId =
    typeof options.generatedId === "string" &&
    options.generatedId.trim().length > 0
      ? options.generatedId.trim()
      : `scenario-${Date.parse(generatedAt)}`;

  const providedId =
    typeof source.id === "string" && source.id.trim().length > 0
      ? source.id.trim()
      : fallbackId;

  const normalized = {
    id: providedId,
    schema: normalizedSchema(source.schema),
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
    locality_keys: normalizeUniqueStringList(
      source.locality_keys,
      4
    ),
    description: String(source.description ?? "").trim(),
    operational_notes: String(
      source.operational_notes ?? ""
    ).trim(),
    owner: String(source.owner ?? "").trim(),
    workflow_status: normalizeWorkflowStatus(
      source.workflow_status ?? "DRAFT"
    ),
    review_date: normalizeDateOnly(source.review_date),
    tags: normalizeUniqueStringList(source.tags, 8),
    pinned: source.pinned === true,
    source_legacy_id:
      typeof source.source_legacy_id === "string" &&
      source.source_legacy_id.trim().length > 0
        ? source.source_legacy_id.trim()
        : null,
    acceptance_fixture: source.acceptance_fixture === true,
    metadata: isPlainObject(source.metadata) ? source.metadata : {},
    created_at:
      normalizeIsoTimestamp(source.created_at) ?? generatedAt,
    updated_at:
      normalizeIsoTimestamp(source.updated_at) ?? generatedAt,
    revision: Number.isInteger(source.revision)
      ? Number(source.revision)
      : 1,
    deleted_at: normalizeIsoTimestamp(source.deleted_at),
    api_record: source.api_record !== false,
  };

  normalized.schema = PIP_SCENARIO_API_RECORD_SCHEMA;

  if (!CREATE_SUPPORTED_FIELDS.every((key) => key in normalized)) {
    return { ...normalized };
  }

  return normalized;
}

export function validatePipScenarioApiCreatePayload(payload) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(payload);
  if (!checks.plain_object) {
    errors.push("Create payload must be a plain object.");
  }

  const forbiddenPaths = checks.plain_object
    ? findForbiddenFieldPaths(payload)
    : [];

  checks.no_forbidden_fields = forbiddenPaths.length === 0;
  if (!checks.no_forbidden_fields) {
    errors.push(
      `Create payload contains forbidden fields: ${forbiddenPaths.join(", ")}`
    );
  }

  checks.body_size_within_limit =
    checks.plain_object &&
    toBodyBytes(payload) <= PIP_SCENARIO_API_MAX_BODY_BYTES;
  if (!checks.body_size_within_limit) {
    errors.push(
      `Create payload exceeds ${PIP_SCENARIO_API_MAX_BODY_BYTES} bytes.`
    );
  }

  const normalized = checks.plain_object
    ? normalizePipScenarioApiCreatePayload(payload)
    : null;

  const safePayload = checks.plain_object ? payload : {};
  const sourceConstituencyKey = String(
    safePayload.constituency_key ?? ""
  ).trim();
  const sourceParliamentCode = String(
    safePayload.parliament_code ?? ""
  ).trim();
  const sourceLocalityKeys = Array.isArray(
    safePayload.locality_keys
  )
    ? safePayload.locality_keys
    : [];
  const sourceTags = Array.isArray(safePayload.tags)
    ? safePayload.tags
    : [];

  if (!normalized) {
    return {
      valid: false,
      checks,
      errors,
      normalized: null,
    };
  }

  checks.id_valid =
    typeof normalized.id === "string" &&
    normalized.id.length >= 1 &&
    normalized.id.length <= 160;

  checks.constituency_key_valid =
    sourceConstituencyKey === sourceConstituencyKey.toLowerCase() &&
    /^[a-z0-9][a-z0-9-]{0,79}$/.test(sourceConstituencyKey);

  checks.parliament_code_valid = /^P[0-9]{3}$/.test(
    sourceParliamentCode
  );

  checks.name_valid =
    normalized.name.length >= 1 && normalized.name.length <= 120;

  checks.locality_keys_valid =
    Array.isArray(sourceLocalityKeys) &&
    sourceLocalityKeys.length <= 4 &&
    sourceLocalityKeys.every(
      (entry) =>
        typeof entry === "string" && entry.trim().length > 0
    );

  checks.locality_keys_no_duplicates =
    !hasTrimmedDuplicateString(safePayload.locality_keys);

  checks.description_valid = normalized.description.length <= 160;

  checks.operational_notes_valid =
    normalized.operational_notes.length <= 600;

  checks.owner_valid = normalized.owner.length <= 80;

  checks.workflow_status_valid =
    PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES.includes(
      normalized.workflow_status
    );

  checks.review_date_valid =
    normalized.review_date === null ||
    /^\d{4}-\d{2}-\d{2}$/.test(normalized.review_date);

  checks.tags_valid =
    Array.isArray(sourceTags) &&
    sourceTags.length <= 8 &&
    sourceTags.every(
      (entry) =>
        typeof entry === "string" &&
        entry.trim().length > 0 &&
        entry.trim().length <= 24
    );

  checks.tags_no_duplicates =
    !hasTrimmedDuplicateString(safePayload.tags);

  checks.pinned_boolean = typeof normalized.pinned === "boolean";

  checks.acceptance_fixture_boolean =
    typeof normalized.acceptance_fixture === "boolean";

  checks.metadata_plain_object = isPlainObject(normalized.metadata);

  checks.metadata_no_forbidden_fields =
    findForbiddenFieldPaths(normalized.metadata).length === 0;

  checks.no_raw_voter_structures =
    !hasProhibitedVoterStructure(payload);

  checks.schema_valid =
    normalized.schema === PIP_SCENARIO_API_RECORD_SCHEMA;

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
      errors.push(`Create payload check failed: ${name}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipScenarioApiPatchPayload(payload) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(payload);
  if (!checks.plain_object) {
    errors.push("Patch payload must be a plain object.");
  }

  const safePayload = checks.plain_object ? payload : {};

  const forbiddenPaths = findForbiddenFieldPaths(safePayload);
  checks.no_forbidden_fields = forbiddenPaths.length === 0;
  if (!checks.no_forbidden_fields) {
    errors.push(
      `Patch payload contains forbidden fields: ${forbiddenPaths.join(", ")}`
    );
  }

  checks.body_size_within_limit =
    toBodyBytes(safePayload) <= PIP_SCENARIO_API_MAX_BODY_BYTES;

  const immutablePresent = IMMUTABLE_PATCH_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(safePayload, field)
  );

  checks.immutable_fields_absent = immutablePresent.length === 0;
  if (!checks.immutable_fields_absent) {
    errors.push(
      `Patch payload contains immutable fields: ${immutablePresent.join(", ")}`
    );
  }

  const mutablePresent = MUTABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(safePayload, field)
  );

  checks.has_mutable_fields = mutablePresent.length > 0;

  const normalized = normalizePatchMutableFields(safePayload);

  checks.mutable_rules_valid = true;

  if (Object.prototype.hasOwnProperty.call(normalized, "name")) {
    const ok =
      normalized.name.length >= 1 && normalized.name.length <= 120;
    checks.name_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "locality_keys")
  ) {
    const ok =
      Array.isArray(normalized.locality_keys) &&
      normalized.locality_keys.length <= 4 &&
      normalized.locality_keys.every((entry) =>
        Boolean(String(entry).trim())
      ) &&
      new Set(normalized.locality_keys).size ===
        normalized.locality_keys.length;
    checks.locality_keys_valid = ok;
    checks.locality_keys_no_duplicates =
      !hasTrimmedDuplicateString(safePayload.locality_keys);
    checks.mutable_rules_valid =
      checks.mutable_rules_valid &&
      checks.locality_keys_no_duplicates;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "description")
  ) {
    const ok = normalized.description.length <= 160;
    checks.description_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      normalized,
      "operational_notes"
    )
  ) {
    const ok = normalized.operational_notes.length <= 600;
    checks.operational_notes_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "owner")) {
    const ok = normalized.owner.length <= 80;
    checks.owner_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      normalized,
      "workflow_status"
    )
  ) {
    const ok = PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES.includes(
      normalized.workflow_status
    );
    checks.workflow_status_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "review_date")
  ) {
    const ok =
      normalized.review_date === null ||
      /^\d{4}-\d{2}-\d{2}$/.test(normalized.review_date);
    checks.review_date_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "tags")) {
    const ok =
      Array.isArray(normalized.tags) &&
      normalized.tags.length <= 8 &&
      normalized.tags.every(
        (entry) =>
          typeof entry === "string" &&
          entry.length > 0 &&
          entry.length <= 24
      ) &&
      new Set(normalized.tags).size === normalized.tags.length;
    checks.tags_valid = ok;
    checks.tags_no_duplicates =
      !hasTrimmedDuplicateString(safePayload.tags);
    checks.mutable_rules_valid =
      checks.mutable_rules_valid && checks.tags_no_duplicates;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "pinned")) {
    const ok = typeof normalized.pinned === "boolean";
    checks.pinned_boolean = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      normalized,
      "acceptance_fixture"
    )
  ) {
    const ok = typeof normalized.acceptance_fixture === "boolean";
    checks.acceptance_fixture_boolean = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "metadata")
  ) {
    const ok =
      isPlainObject(normalized.metadata) &&
      findForbiddenFieldPaths(normalized.metadata).length === 0;
    checks.metadata_valid = ok;
    checks.mutable_rules_valid = checks.mutable_rules_valid && ok;
  }

  checks.no_raw_voter_structures =
    !hasProhibitedVoterStructure(safePayload);

  Object.entries(checks).forEach(([name, valid]) => {
    if (valid !== true) {
      errors.push(`Patch payload check failed: ${name}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

export function validatePipScenarioApiRecord(record) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(record);
  if (!checks.plain_object) {
    errors.push("Scenario record must be a plain object.");
  }

  const safeRecord = checks.plain_object ? record : null;

  if (!safeRecord) {
    return {
      valid: false,
      checks,
      errors,
    };
  }

  const createValidation = validatePipScenarioApiCreatePayload(
    safeRecord
  );

  checks.create_rules_valid = createValidation.valid === true;
  checks.schema_valid =
    safeRecord.schema === PIP_SCENARIO_API_RECORD_SCHEMA;
  checks.created_at_iso =
    normalizeIsoTimestamp(safeRecord.created_at) !== null;
  checks.updated_at_iso =
    normalizeIsoTimestamp(safeRecord.updated_at) !== null;
  checks.revision_positive =
    Number.isInteger(safeRecord.revision) && safeRecord.revision > 0;
  checks.deleted_at_valid =
    safeRecord.deleted_at === null ||
    normalizeIsoTimestamp(safeRecord.deleted_at) !== null;
  checks.api_record_true = safeRecord.api_record === true;
  checks.workflow_status_supported =
    PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES.includes(
      String(safeRecord.workflow_status ?? "")
    );
  checks.no_forbidden_fields =
    findForbiddenFieldPaths(safeRecord).length === 0;

  Object.entries(checks).forEach(([name, valid]) => {
    if (valid !== true) {
      errors.push(`Scenario record check failed: ${name}`);
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

export function buildPipScenarioApiContractManifest({
  generatedAt,
} = {}) {
  const timestamp =
    normalizeIsoTimestamp(generatedAt) ?? new Date().toISOString();

  return {
    schema: PIP_SCENARIO_API_CONTRACT_SCHEMA,
    generated_at: timestamp,
    api_version: PIP_SCENARIO_API_VERSION,
    default_host: PIP_SCENARIO_API_DEFAULT_HOST,
    default_port: PIP_SCENARIO_API_DEFAULT_PORT,
    default_base_url: PIP_SCENARIO_API_DEFAULT_BASE_URL,
    maximum_body_bytes: PIP_SCENARIO_API_MAX_BODY_BYTES,
    endpoints: { ...PIP_SCENARIO_API_ENDPOINTS },
    allowed_workflow_statuses: [
      ...PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES,
    ],
    forbidden_field_names: [
      ...PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES,
    ],
    concurrency: {
      etag_returned_for_individual_resources: true,
      if_match_required_for_put_patch_delete: true,
      stale_revisions_rejected: true,
      revision_increments_after_mutation: true,
    },
    deletion_policy: {
      soft_delete_only: true,
      deleted_at_recorded: true,
      deleted_records_excluded_by_default: true,
      include_deleted_requires_explicit_request: true,
    },
    privacy: {
      aggregate_metadata_only: true,
      no_individual_voter_records: true,
      no_raw_voter_data: true,
      no_removed_privacy_fields: true,
      unsupported_fields_discarded: true,
    },
    safety: {
      legacy_browser_storage_authoritative: true,
      api_storage_development_only: true,
      api_repository_volatile_memory: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      automatic_fallback_enabled: false,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      authenticated_user_role_from_server_repository: true,
      client_payload_role_not_trusted: true,
      role_based_api_denials_deferred_to_batch_53c: true,
      production_deployment_permitted: false,
    },
    summary: {
      endpoint_count: 7,
      workflow_status_count: 5,
      forbidden_field_count:
        PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.length,
      maximum_body_bytes: PIP_SCENARIO_API_MAX_BODY_BYTES,
      storage_mode: "VOLATILE_MEMORY",
      operational_cutover_enabled: false,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
    },
  };
}

export function validatePipScenarioApiContractManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};
  const checks = {
    schema_valid:
      safeManifest.schema === PIP_SCENARIO_API_CONTRACT_SCHEMA,
    generated_at_valid:
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    api_version_valid:
      safeManifest.api_version === PIP_SCENARIO_API_VERSION,
    default_host_valid:
      safeManifest.default_host === PIP_SCENARIO_API_DEFAULT_HOST,
    default_port_valid:
      safeManifest.default_port === PIP_SCENARIO_API_DEFAULT_PORT,
    base_url_valid:
      safeManifest.default_base_url ===
      PIP_SCENARIO_API_DEFAULT_BASE_URL,
    max_body_bytes_valid:
      safeManifest.maximum_body_bytes ===
      PIP_SCENARIO_API_MAX_BODY_BYTES,
    endpoint_count_valid:
      Object.keys(safeManifest.endpoints ?? {}).length === 7,
    workflow_status_count_valid:
      Array.isArray(safeManifest.allowed_workflow_statuses) &&
      safeManifest.allowed_workflow_statuses.length === 5,
    forbidden_fields_present:
      Array.isArray(safeManifest.forbidden_field_names) &&
      PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.every((name) =>
        safeManifest.forbidden_field_names.includes(name)
      ),
    concurrency_rules_valid:
      safeManifest?.concurrency
        ?.etag_returned_for_individual_resources === true &&
      safeManifest?.concurrency
        ?.if_match_required_for_put_patch_delete === true &&
      safeManifest?.concurrency?.stale_revisions_rejected ===
        true &&
      safeManifest?.concurrency
        ?.revision_increments_after_mutation === true,
    deletion_policy_valid:
      safeManifest?.deletion_policy?.soft_delete_only === true &&
      safeManifest?.deletion_policy?.deleted_at_recorded ===
        true &&
      safeManifest?.deletion_policy
        ?.deleted_records_excluded_by_default === true &&
      safeManifest?.deletion_policy
        ?.include_deleted_requires_explicit_request === true,
    privacy_rules_valid:
      safeManifest?.privacy?.aggregate_metadata_only === true &&
      safeManifest?.privacy?.no_individual_voter_records ===
        true &&
      safeManifest?.privacy?.no_raw_voter_data === true &&
      safeManifest?.privacy?.no_removed_privacy_fields ===
        true &&
      safeManifest?.privacy?.unsupported_fields_discarded ===
        true,
    safety_rules_valid:
      safeManifest?.safety
        ?.legacy_browser_storage_authoritative === true &&
      safeManifest?.safety?.api_storage_development_only ===
        true &&
      safeManifest?.safety?.api_repository_volatile_memory ===
        true &&
      safeManifest?.safety?.operational_read_cutover_enabled ===
        false &&
      safeManifest?.safety
        ?.operational_write_cutover_enabled === false &&
      safeManifest?.safety
        ?.automatic_synchronisation_enabled === false &&
      safeManifest?.safety?.automatic_fallback_enabled ===
        false &&
      safeManifest?.safety?.authentication_configured === true &&
      safeManifest?.safety?.authentication_required === true &&
      safeManifest?.safety?.roles_configured === true &&
      safeManifest?.safety?.authorization_enforced === true &&
      safeManifest?.safety
        ?.authenticated_user_role_from_server_repository === true &&
      safeManifest?.safety?.client_payload_role_not_trusted ===
        true &&
      safeManifest?.safety
        ?.role_based_api_denials_deferred_to_batch_53c === true &&
      safeManifest?.safety?.production_deployment_permitted ===
        false,
    summary_counts_valid:
      safeManifest?.summary?.endpoint_count === 7 &&
      safeManifest?.summary?.workflow_status_count === 5 &&
      safeManifest?.summary?.forbidden_field_count ===
        PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.length &&
      safeManifest?.summary?.maximum_body_bytes ===
        PIP_SCENARIO_API_MAX_BODY_BYTES &&
      safeManifest?.summary?.storage_mode ===
        "VOLATILE_MEMORY" &&
      safeManifest?.summary?.operational_cutover_enabled ===
        false &&
      safeManifest?.summary?.authentication_configured === true &&
      safeManifest?.summary?.authentication_required === true &&
      safeManifest?.summary?.roles_configured === true &&
      safeManifest?.summary?.authorization_enforced === true,
  };

  const errors = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(
      ([name]) =>
        `Scenario API contract manifest check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      endpoint_count: Object.keys(
        safeManifest.endpoints ?? {}
      ).length,
      workflow_status_count: Array.isArray(
        safeManifest.allowed_workflow_statuses
      )
        ? safeManifest.allowed_workflow_statuses.length
        : 0,
      forbidden_field_count: Array.isArray(
        safeManifest.forbidden_field_names
      )
        ? safeManifest.forbidden_field_names.length
        : 0,
    },
  };
}
