import {
  PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES,
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES,
  validatePipScenarioApiCreatePayload,
  validatePipScenarioApiPatchPayload,
} from "./pip-scenario-api-contract.js";
import {
  PIP_SCENARIO_SYNC_ACTIONS,
  PIP_SCENARIO_SYNC_COLLECTION_ID_PREFIX,
  PIP_SCENARIO_SYNC_EXECUTION_SCHEMA,
  PIP_SCENARIO_SYNC_MAX_CENTRAL_SCENARIOS,
  PIP_SCENARIO_SYNC_MAX_LOCAL_SCENARIOS,
  PIP_SCENARIO_SYNC_MODES,
  PIP_SCENARIO_SYNC_PLAN_SCHEMA,
  PIP_SCENARIO_SYNC_RECEIPT_SCHEMA,
  PIP_SCENARIO_SYNC_ROLLBACK_SCHEMA,
  PIP_SCENARIO_SYNC_CONFLICT_POLICIES,
  PIP_SCENARIO_SYNC_ITEM_STATES,
  PIP_SCENARIO_SYNC_VERSION,
  createPipScenarioSyncCollectionId,
  createPipScenarioSyncSignature,
  normalizePipScenarioSyncReceipt,
  validatePipScenarioSyncReceipt,
} from "./pip-scenario-sync-contract.js";

const FORBIDDEN_FIELD_NAME_SET = new Set(
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.map((entry) =>
    String(entry).toLowerCase()
  )
);

const LOCAL_SYNC_FIELDS = [
  "id",
  "name",
  "locality_keys",
  "description",
  "operational_notes",
  "owner",
  "workflow_status",
  "review_date",
  "tags",
  "pinned",
  "created_at",
  "updated_at",
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

function assertNoPrivacyViolation(value, label) {
  const forbidden = findForbiddenFieldPaths(value);
  if (forbidden.length > 0) {
    throw new Error(
      `${label} contains forbidden fields: ${forbidden.join(", ")}`
    );
  }

  if (hasProhibitedVoterStructure(value)) {
    throw new Error(`${label} contains raw voter structures.`);
  }
}

function normalizeWorkflowStatus(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return "DRAFT";
  }

  return PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES.includes(normalized)
    ? normalized
    : "DRAFT";
}

function normalizeLocalRecordIdentity({
  id,
  constituencyKey,
  parliamentCode,
}) {
  const normalizedId = String(id ?? "").trim();
  if (!normalizedId) {
    throw new Error("Local scenario id is required.");
  }

  const normalizedConstituencyKey = String(
    constituencyKey ?? ""
  )
    .trim()
    .toLowerCase();

  const normalizedParliamentCode = String(
    parliamentCode ?? ""
  )
    .trim()
    .toUpperCase();

  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedConstituencyKey)) {
    throw new Error("Invalid constituency key for scenario sync.");
  }

  if (!/^P[0-9]{3}$/.test(normalizedParliamentCode)) {
    throw new Error("Invalid parliament code for scenario sync.");
  }

  return {
    id: normalizedId,
    constituency_key: normalizedConstituencyKey,
    parliament_code: normalizedParliamentCode,
  };
}

function normalizeComparableCentralScenario(centralScenario) {
  const source = isPlainObject(centralScenario)
    ? centralScenario
    : {};

  return {
    id: String(source.id ?? "").trim(),
    name: String(source.name ?? "").trim(),
    locality_keys: normalizeUniqueStringList(source.locality_keys, 4),
    description: String(source.description ?? "").trim(),
    operational_notes: String(source.operational_notes ?? "").trim(),
    owner: String(source.owner ?? "").trim(),
    workflow_status: normalizeWorkflowStatus(source.workflow_status),
    review_date: normalizeDateOnly(source.review_date),
    tags: normalizeUniqueStringList(source.tags, 8),
    pinned: source.pinned === true,
    source_legacy_id: String(source.source_legacy_id ?? "").trim(),
    updated_at: normalizeIsoTimestamp(source.updated_at),
  };
}

function createPairKey(localId, centralId) {
  return `${String(localId ?? "<none>")}|${String(centralId ?? "<none>")}`;
}

function dedupeByScenarioId(records) {
  const map = new Map();

  (Array.isArray(records) ? records : []).forEach((record) => {
    const id = String(record?.id ?? "").trim();
    if (!id) {
      return;
    }

    map.set(id, record);
  });

  return [...map.values()];
}

function parseUpdatedAtMillis(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function createPlanItemBase({
  localId,
  centralId,
  localSignature,
  centralSignature,
  baseLocalSignature,
  baseCentralSignature,
  localUpdatedAt,
  centralUpdatedAt,
  centralRevision,
  centralEtag,
}) {
  return {
    pair_key: createPairKey(localId, centralId),
    local_id: localId ?? null,
    central_id: centralId ?? null,
    state: "IN_SYNC",
    action: "NO_CHANGE",
    resolution: "NO_ACTION",
    conflict_reason: null,
    local_signature: localSignature ?? null,
    central_signature: centralSignature ?? null,
    base_local_signature: baseLocalSignature ?? null,
    base_central_signature: baseCentralSignature ?? null,
    local_updated_at: localUpdatedAt ?? null,
    central_updated_at: centralUpdatedAt ?? null,
    central_revision:
      Number.isInteger(centralRevision) && centralRevision > 0
        ? centralRevision
        : null,
    central_etag: typeof centralEtag === "string" ? centralEtag : null,
    validation_errors: [],
  };
}

function resolveDivergedAction({
  conflictPolicy,
  localUpdatedAt,
  centralUpdatedAt,
}) {
  if (conflictPolicy === "PREFER_LOCAL") {
    return {
      action: "UPDATE_CENTRAL",
      resolution: "PREFER_LOCAL",
      conflict_reason: "DIVERGED_PREFER_LOCAL",
    };
  }

  if (conflictPolicy === "PREFER_CENTRAL") {
    return {
      action: "UPDATE_LOCAL",
      resolution: "PREFER_CENTRAL",
      conflict_reason: "DIVERGED_PREFER_CENTRAL",
    };
  }

  if (conflictPolicy === "PREFER_NEWEST") {
    const localMillis = parseUpdatedAtMillis(localUpdatedAt);
    const centralMillis = parseUpdatedAtMillis(centralUpdatedAt);

    if (localMillis === null || centralMillis === null) {
      return {
        action: "MANUAL_CONFLICT",
        resolution: "MANUAL_REVIEW_REQUIRED",
        conflict_reason: "INVALID_OR_MISSING_TIMESTAMP",
      };
    }

    if (localMillis > centralMillis) {
      return {
        action: "UPDATE_CENTRAL",
        resolution: "PREFER_NEWEST_LOCAL",
        conflict_reason: "DIVERGED_LOCAL_NEWER",
      };
    }

    if (centralMillis > localMillis) {
      return {
        action: "UPDATE_LOCAL",
        resolution: "PREFER_NEWEST_CENTRAL",
        conflict_reason: "DIVERGED_CENTRAL_NEWER",
      };
    }

    return {
      action: "MANUAL_CONFLICT",
      resolution: "MANUAL_REVIEW_REQUIRED",
      conflict_reason: "TIMESTAMPS_EQUAL",
    };
  }

  return {
    action: "MANUAL_CONFLICT",
    resolution: "MANUAL_REVIEW_REQUIRED",
    conflict_reason: "DIVERGED_MANUAL_REVIEW",
  };
}

function classifyMappedPair({
  localScenario,
  centralScenario,
  basePair,
  mode,
  conflictPolicy,
  localSignature,
  centralSignature,
  localUpdatedAt,
  centralUpdatedAt,
  centralRevision,
  centralEtag,
}) {
  const item = createPlanItemBase({
    localId: localScenario?.id ?? null,
    centralId: centralScenario?.id ?? null,
    localSignature,
    centralSignature,
    baseLocalSignature: basePair?.local_signature ?? null,
    baseCentralSignature: basePair?.central_signature ?? null,
    localUpdatedAt,
    centralUpdatedAt,
    centralRevision,
    centralEtag,
  });

  const hasBase =
    typeof basePair?.local_signature === "string" &&
    typeof basePair?.central_signature === "string";

  const localChanged = hasBase
    ? basePair.local_signature !== localSignature
    : localSignature !== centralSignature;

  const centralChanged = hasBase
    ? basePair.central_signature !== centralSignature
    : localSignature !== centralSignature;

  if (!localChanged && !centralChanged) {
    item.state = "IN_SYNC";
    item.action = "NO_CHANGE";
    item.resolution = "NO_ACTION";
    return item;
  }

  if (localChanged && !centralChanged) {
    item.state = "LOCAL_CHANGED";
    if (mode === "DOWNLOAD_CENTRAL_TO_LOCAL") {
      item.action = "MANUAL_CONFLICT";
      item.resolution = "MANUAL_REVIEW_REQUIRED";
      item.conflict_reason = "LOCAL_CHANGED_DOWNLOAD_BLOCKED";
    } else {
      item.action = "UPDATE_CENTRAL";
      item.resolution = "LOCAL_AUTHORITATIVE";
    }
    return item;
  }

  if (!localChanged && centralChanged) {
    item.state = "CENTRAL_CHANGED";
    if (mode === "UPLOAD_LOCAL_TO_CENTRAL") {
      item.action = "MANUAL_CONFLICT";
      item.resolution = "MANUAL_REVIEW_REQUIRED";
      item.conflict_reason = "CENTRAL_CHANGED_UPLOAD_BLOCKED";
    } else {
      item.action = "UPDATE_LOCAL";
      item.resolution = "CENTRAL_AUTHORITATIVE";
    }
    return item;
  }

  item.state = "DIVERGED";
  const resolved = resolveDivergedAction({
    conflictPolicy,
    localUpdatedAt,
    centralUpdatedAt,
  });
  item.action = resolved.action;
  item.resolution = resolved.resolution;
  item.conflict_reason = resolved.conflict_reason;
  return item;
}

export function normalizeLegacyScenarioForSync(
  scenario,
  {
    constituencyKey,
    parliamentCode,
  }
) {
  const source = isPlainObject(scenario) ? scenario : {};

  assertNoPrivacyViolation(source, "Local scenario");

  const identity = normalizeLocalRecordIdentity({
    id: source.id,
    constituencyKey,
    parliamentCode,
  });

  const normalized = {
    id: identity.id,
    name: String(source.name ?? "").trim(),
    locality_keys: normalizeUniqueStringList(source.locality_keys, 4),
    description: String(source.description ?? "").trim(),
    operational_notes: String(source.operational_notes ?? "").trim(),
    owner: String(source.owner ?? "").trim(),
    workflow_status: normalizeWorkflowStatus(source.workflow_status),
    review_date: normalizeDateOnly(source.review_date),
    tags: normalizeUniqueStringList(source.tags, 8),
    pinned: source.pinned === true,
    created_at: normalizeIsoTimestamp(source.created_at),
    updated_at:
      normalizeIsoTimestamp(source.updated_at) ??
      normalizeIsoTimestamp(source.created_at) ??
      new Date().toISOString(),
  };

  LOCAL_SYNC_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(normalized, field)) {
      normalized[field] = null;
    }
  });

  if (!normalized.name) {
    throw new Error("Local scenario name is required for synchronization.");
  }

  return normalized;
}

export function adaptLegacyScenarioToCentralPayload({
  localScenario,
  constituencyKey,
  parliamentCode,
  centralId,
  localSignature,
}) {
  const normalizedLocal = normalizeLegacyScenarioForSync(localScenario, {
    constituencyKey,
    parliamentCode,
  });

  const payload = {
    id: String(centralId ?? "").trim(),
    constituency_key: String(constituencyKey ?? "")
      .trim()
      .toLowerCase(),
    parliament_code: String(parliamentCode ?? "")
      .trim()
      .toUpperCase(),
    name: normalizedLocal.name,
    locality_keys: [...normalizedLocal.locality_keys],
    description: normalizedLocal.description,
    operational_notes: normalizedLocal.operational_notes,
    owner: normalizedLocal.owner,
    workflow_status: normalizedLocal.workflow_status,
    review_date: normalizedLocal.review_date,
    tags: [...normalizedLocal.tags],
    pinned: normalizedLocal.pinned === true,
    source_legacy_id: normalizedLocal.id,
    acceptance_fixture: false,
    metadata: {
      sync_origin: "LEGACY_BROWSER",
      sync_contract: "pip.scenario-sync.contract.v1",
      local_signature: String(localSignature ?? "").trim(),
      aggregate_only: true,
    },
  };

  const validation = validatePipScenarioApiCreatePayload(payload);
  if (validation.valid !== true) {
    throw new Error(
      `Unable to adapt local scenario to central payload: ${validation.errors?.[0] ?? "invalid payload"}`
    );
  }

  return validation.normalized;
}

export function adaptCentralScenarioToLegacyRecord({
  centralScenario,
  localId,
}) {
  const source = isPlainObject(centralScenario) ? centralScenario : {};

  if (source.acceptance_fixture === true) {
    throw new Error("Central acceptance fixtures cannot be synchronized to local.");
  }

  if (source.deleted_at) {
    throw new Error("Soft-deleted central scenarios cannot be synchronized to local.");
  }

  assertNoPrivacyViolation(source, "Central scenario");

  const normalizedLocalId = String(localId ?? "").trim();
  if (!normalizedLocalId) {
    throw new Error("A target local id is required for central-to-local adaptation.");
  }

  return {
    id: normalizedLocalId,
    name: String(source.name ?? "").trim(),
    locality_keys: normalizeUniqueStringList(source.locality_keys, 4),
    description: String(source.description ?? "").trim(),
    operational_notes: String(source.operational_notes ?? "").trim(),
    owner: String(source.owner ?? "").trim(),
    workflow_status: normalizeWorkflowStatus(source.workflow_status),
    review_date: normalizeDateOnly(source.review_date),
    tags: normalizeUniqueStringList(source.tags, 8),
    pinned: source.pinned === true,
    created_at: normalizeIsoTimestamp(source.created_at),
    updated_at:
      normalizeIsoTimestamp(source.updated_at) ??
      normalizeIsoTimestamp(source.created_at) ??
      new Date().toISOString(),
  };
}

export function createPipScenarioSyncLocalLibrarySignature(localScenarios) {
  const normalized = dedupeByScenarioId(localScenarios)
    .map((entry) =>
      normalizeLegacyScenarioForSync(entry, {
        constituencyKey: "p134",
        parliamentCode: "P134",
      })
    )
    .sort((left, right) => left.id.localeCompare(right.id));

  return createPipScenarioSyncSignature(normalized);
}

export function createPipScenarioSyncProtectedStorageSignature({
  rawSnapshot,
  allowedMutableKeys,
}) {
  const safeSnapshot = isPlainObject(rawSnapshot) ? rawSnapshot : {};
  const mutableSet = new Set(
    (Array.isArray(allowedMutableKeys) ? allowedMutableKeys : []).map((entry) =>
      String(entry ?? "")
    )
  );

  const protectedEntries = Object.entries(safeSnapshot)
    .filter(([key]) => !mutableSet.has(String(key)))
    .sort(([left], [right]) => left.localeCompare(right));

  const canonical = {};
  protectedEntries.forEach(([key, value]) => {
    canonical[key] = value;
  });

  return createPipScenarioSyncSignature(canonical);
}

function determineActionForSingleState({ state, mode }) {
  if (mode === "UPLOAD_LOCAL_TO_CENTRAL") {
    if (state === "LOCAL_ONLY") return "CREATE_CENTRAL";
    if (state === "CENTRAL_ONLY") return "SKIP";
    if (state === "LOCAL_MISSING") return "MANUAL_CONFLICT";
    if (state === "CENTRAL_DELETED") return "MANUAL_CONFLICT";
    if (state === "INVALID_LOCAL") return "SKIP";
    if (state === "INVALID_CENTRAL") return "SKIP";
    if (state === "SKIPPED_FIXTURE") return "SKIP";
    return "NO_CHANGE";
  }

  if (mode === "DOWNLOAD_CENTRAL_TO_LOCAL") {
    if (state === "LOCAL_ONLY") return "SKIP";
    if (state === "CENTRAL_ONLY") return "CREATE_LOCAL";
    if (state === "LOCAL_MISSING") return "MANUAL_CONFLICT";
    if (state === "CENTRAL_DELETED") return "MANUAL_CONFLICT";
    if (state === "INVALID_LOCAL") return "SKIP";
    if (state === "INVALID_CENTRAL") return "SKIP";
    if (state === "SKIPPED_FIXTURE") return "SKIP";
    return "NO_CHANGE";
  }

  if (state === "LOCAL_ONLY") return "CREATE_CENTRAL";
  if (state === "CENTRAL_ONLY") return "CREATE_LOCAL";
  if (state === "LOCAL_MISSING") return "MANUAL_CONFLICT";
  if (state === "CENTRAL_DELETED") return "MANUAL_CONFLICT";
  if (state === "INVALID_LOCAL") return "SKIP";
  if (state === "INVALID_CENTRAL") return "SKIP";
  if (state === "SKIPPED_FIXTURE") return "SKIP";
  return "NO_CHANGE";
}

function buildActionCounts(items) {
  const actionCounts = {};
  PIP_SCENARIO_SYNC_ACTIONS.forEach((action) => {
    actionCounts[action] = 0;
  });

  items.forEach((item) => {
    if (!actionCounts[item.action]) {
      actionCounts[item.action] = 0;
    }
    actionCounts[item.action] += 1;
  });

  return actionCounts;
}

function buildStateCounts(items) {
  const stateCounts = {};

  PIP_SCENARIO_SYNC_ITEM_STATES.forEach((state) => {
    stateCounts[state] = 0;
  });

  items.forEach((item) => {
    if (!stateCounts[item.state]) {
      stateCounts[item.state] = 0;
    }
    stateCounts[item.state] += 1;
  });

  return stateCounts;
}

function makeSyncPlanId({ generatedAt, mode, conflictPolicy }) {
  const base = String(generatedAt ?? "").replace(/[^0-9]/g, "").slice(0, 14);
  const modeKey = String(mode ?? "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const policyKey = String(conflictPolicy ?? "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `sync-${base || Date.now()}-${modeKey}-${policyKey}`;
}

function validateStateActionCombination(item) {
  const state = String(item.state ?? "");
  const action = String(item.action ?? "");

  if (state === "LOCAL_ONLY") {
    return action === "CREATE_CENTRAL" || action === "SKIP";
  }

  if (state === "CENTRAL_ONLY") {
    return action === "CREATE_LOCAL" || action === "SKIP";
  }

  if (state === "IN_SYNC") {
    return action === "NO_CHANGE";
  }

  if (state === "LOCAL_CHANGED") {
    return action === "UPDATE_CENTRAL" || action === "MANUAL_CONFLICT";
  }

  if (state === "CENTRAL_CHANGED") {
    return action === "UPDATE_LOCAL" || action === "MANUAL_CONFLICT";
  }

  if (state === "DIVERGED") {
    return (
      action === "UPDATE_CENTRAL" ||
      action === "UPDATE_LOCAL" ||
      action === "MANUAL_CONFLICT"
    );
  }

  if (state === "LOCAL_MISSING" || state === "CENTRAL_DELETED") {
    return action === "MANUAL_CONFLICT";
  }

  if (
    state === "INVALID_LOCAL" ||
    state === "INVALID_CENTRAL" ||
    state === "SKIPPED_FIXTURE"
  ) {
    return action === "SKIP";
  }

  return false;
}

export function buildPipScenarioSyncPlan({
  localScenarios,
  centralScenarios,
  centralCollection,
  previousReceipt,
  mode,
  conflictPolicy,
  constituencyKey,
  parliamentCode,
  localLibrarySignature,
  protectedStorageSignature,
  centralRepositoryId,
  centralRepositorySignature,
  generatedAt,
}) {
  const normalizedMode = String(mode ?? "").trim();
  const normalizedConflictPolicy = String(conflictPolicy ?? "").trim();
  const generatedTimestamp =
    normalizeIsoTimestamp(generatedAt) ?? new Date().toISOString();

  const errors = [];
  if (!PIP_SCENARIO_SYNC_MODES.includes(normalizedMode)) {
    errors.push("Unsupported sync mode.");
  }

  if (!PIP_SCENARIO_SYNC_CONFLICT_POLICIES.includes(normalizedConflictPolicy)) {
    errors.push("Unsupported conflict policy.");
  }

  const normalizedConstituencyKey = String(
    constituencyKey ?? ""
  )
    .trim()
    .toLowerCase();

  const normalizedParliamentCode = String(
    parliamentCode ?? ""
  )
    .trim()
    .toUpperCase();

  const collectionId = createPipScenarioSyncCollectionId({
    constituencyKey: normalizedConstituencyKey,
  });

  const previousReceiptValidation = previousReceipt
    ? validatePipScenarioSyncReceipt(previousReceipt)
    : { valid: true };

  const validPreviousPairs =
    previousReceiptValidation.valid === true
      ? normalizePipScenarioSyncReceipt(previousReceipt).pairs
      : [];

  const localMap = new Map();
  const items = [];

  dedupeByScenarioId(localScenarios)
    .slice(0, PIP_SCENARIO_SYNC_MAX_LOCAL_SCENARIOS)
    .forEach((scenario) => {
      try {
        const normalized = normalizeLegacyScenarioForSync(scenario, {
          constituencyKey: normalizedConstituencyKey,
          parliamentCode: normalizedParliamentCode,
        });
        localMap.set(normalized.id, normalized);
      } catch (error) {
        const id = String(scenario?.id ?? "").trim() || null;
        items.push({
          ...createPlanItemBase({
            localId: id,
            centralId: null,
            localSignature: null,
            centralSignature: null,
            baseLocalSignature: null,
            baseCentralSignature: null,
            localUpdatedAt: null,
            centralUpdatedAt: null,
            centralRevision: null,
            centralEtag: null,
          }),
          state: "INVALID_LOCAL",
          action: "SKIP",
          resolution: "INVALID_LOCAL_RECORD",
          conflict_reason: null,
          validation_errors: [
            error instanceof Error
              ? error.message
              : "Invalid local scenario record.",
          ],
        });
      }
    });

  const centralMap = new Map();
  const centralBySourceLegacyId = new Map();

  dedupeByScenarioId(centralScenarios)
    .slice(0, PIP_SCENARIO_SYNC_MAX_CENTRAL_SCENARIOS)
    .forEach((scenario) => {
      const scenarioId = String(scenario?.id ?? "").trim();
      if (!scenarioId) {
        return;
      }

      if (scenario?.acceptance_fixture === true) {
        items.push({
          ...createPlanItemBase({
            localId: null,
            centralId: scenarioId,
            localSignature: null,
            centralSignature: null,
            baseLocalSignature: null,
            baseCentralSignature: null,
            localUpdatedAt: null,
            centralUpdatedAt: normalizeIsoTimestamp(scenario.updated_at),
            centralRevision: Number(scenario.revision ?? 0),
            centralEtag: String(scenario.etag ?? "").trim() || null,
          }),
          state: "SKIPPED_FIXTURE",
          action: "SKIP",
          resolution: "FIXTURE_EXCLUDED",
          validation_errors: [],
        });
        return;
      }

      if (scenario?.deleted_at) {
        return;
      }

      try {
        assertNoPrivacyViolation(scenario, "Central scenario");
        const normalizedCentral = normalizeComparableCentralScenario(scenario);
        if (!normalizedCentral.id) {
          throw new Error("Central scenario id is required.");
        }

        centralMap.set(normalizedCentral.id, {
          ...scenario,
          etag: String(scenario?.etag ?? "").trim() || null,
          normalized_sync_view: normalizedCentral,
        });

        if (normalizedCentral.source_legacy_id) {
          if (!centralBySourceLegacyId.has(normalizedCentral.source_legacy_id)) {
            centralBySourceLegacyId.set(normalizedCentral.source_legacy_id, []);
          }
          centralBySourceLegacyId
            .get(normalizedCentral.source_legacy_id)
            .push(normalizedCentral.id);
        }
      } catch (error) {
        items.push({
          ...createPlanItemBase({
            localId: null,
            centralId: scenarioId,
            localSignature: null,
            centralSignature: null,
            baseLocalSignature: null,
            baseCentralSignature: null,
            localUpdatedAt: null,
            centralUpdatedAt: normalizeIsoTimestamp(scenario.updated_at),
            centralRevision: Number(scenario.revision ?? 0),
            centralEtag: String(scenario?.etag ?? "").trim() || null,
          }),
          state: "INVALID_CENTRAL",
          action: "SKIP",
          resolution: "INVALID_CENTRAL_RECORD",
          conflict_reason: null,
          validation_errors: [
            error instanceof Error
              ? error.message
              : "Invalid central scenario record.",
          ],
        });
      }
    });

  const pairedLocalIds = new Set();
  const pairedCentralIds = new Set();

  const addMappedItem = ({
    localId,
    centralId,
    basePair,
    forcedState,
    forcedAction,
    forcedReason,
  }) => {
    const localRecord = localId ? localMap.get(localId) ?? null : null;
    const centralRecord = centralId ? centralMap.get(centralId) ?? null : null;

    const localSignature = localRecord
      ? createPipScenarioSyncSignature(localRecord)
      : null;

    const centralSignature = centralRecord
      ? createPipScenarioSyncSignature(
          centralRecord.normalized_sync_view
        )
      : null;

    if (localRecord) {
      pairedLocalIds.add(localRecord.id);
    }

    if (centralRecord) {
      pairedCentralIds.add(centralRecord.id);
    }

    if (forcedState) {
      items.push({
        ...createPlanItemBase({
          localId: localRecord?.id ?? localId ?? null,
          centralId: centralRecord?.id ?? centralId ?? null,
          localSignature,
          centralSignature,
          baseLocalSignature: basePair?.local_signature ?? null,
          baseCentralSignature: basePair?.central_signature ?? null,
          localUpdatedAt: localRecord?.updated_at ?? null,
          centralUpdatedAt:
            centralRecord?.normalized_sync_view?.updated_at ?? null,
          centralRevision: Number(centralRecord?.revision ?? 0),
          centralEtag: centralRecord?.etag ?? null,
        }),
        state: forcedState,
        action: forcedAction,
        resolution:
          forcedAction === "MANUAL_CONFLICT"
            ? "MANUAL_REVIEW_REQUIRED"
            : forcedAction,
        conflict_reason: forcedReason ?? null,
        validation_errors: [],
      });
      return;
    }

    if (!localRecord || !centralRecord) {
      return;
    }

    items.push(
      classifyMappedPair({
        localScenario: localRecord,
        centralScenario: centralRecord,
        basePair,
        mode: normalizedMode,
        conflictPolicy: normalizedConflictPolicy,
        localSignature,
        centralSignature,
        localUpdatedAt: localRecord.updated_at,
        centralUpdatedAt: centralRecord.normalized_sync_view.updated_at,
        centralRevision: Number(centralRecord.revision ?? 0),
        centralEtag: centralRecord.etag,
      })
    );
  };

  validPreviousPairs.forEach((pair) => {
    const localExists = localMap.has(pair.local_id);
    const centralExists = centralMap.has(pair.central_id);

    if (!localExists && !centralExists) {
      return;
    }

    if (!localExists) {
      addMappedItem({
        localId: pair.local_id,
        centralId: pair.central_id,
        basePair: pair,
        forcedState: "LOCAL_MISSING",
        forcedAction: "MANUAL_CONFLICT",
        forcedReason: "PAIRED_LOCAL_MISSING",
      });
      return;
    }

    if (!centralExists) {
      addMappedItem({
        localId: pair.local_id,
        centralId: pair.central_id,
        basePair: pair,
        forcedState: "CENTRAL_DELETED",
        forcedAction: "MANUAL_CONFLICT",
        forcedReason: "PAIRED_CENTRAL_MISSING_OR_DELETED",
      });
      return;
    }

    addMappedItem({
      localId: pair.local_id,
      centralId: pair.central_id,
      basePair: pair,
    });
  });

  [...localMap.keys()]
    .filter((localId) => !pairedLocalIds.has(localId))
    .sort((left, right) => left.localeCompare(right))
    .forEach((localId) => {
      const sourceMatches =
        centralBySourceLegacyId.get(localId) ?? [];

      const unmatchedSourceMatch = sourceMatches.find(
        (centralId) => !pairedCentralIds.has(centralId)
      );

      if (unmatchedSourceMatch) {
        addMappedItem({
          localId,
          centralId: unmatchedSourceMatch,
          basePair: null,
        });
        return;
      }

      if (centralMap.has(localId) && !pairedCentralIds.has(localId)) {
        addMappedItem({
          localId,
          centralId: localId,
          basePair: null,
        });
        return;
      }

      const localRecord = localMap.get(localId);
      items.push({
        ...createPlanItemBase({
          localId,
          centralId: null,
          localSignature: createPipScenarioSyncSignature(localRecord),
          centralSignature: null,
          baseLocalSignature: null,
          baseCentralSignature: null,
          localUpdatedAt: localRecord.updated_at,
          centralUpdatedAt: null,
          centralRevision: null,
          centralEtag: null,
        }),
        state: "LOCAL_ONLY",
        action: determineActionForSingleState({
          state: "LOCAL_ONLY",
          mode: normalizedMode,
        }),
        resolution: "UNPAIRED_LOCAL_RECORD",
      });
      pairedLocalIds.add(localId);
    });

  [...centralMap.keys()]
    .filter((centralId) => !pairedCentralIds.has(centralId))
    .sort((left, right) => left.localeCompare(right))
    .forEach((centralId) => {
      const centralRecord = centralMap.get(centralId);
      items.push({
        ...createPlanItemBase({
          localId: null,
          centralId,
          localSignature: null,
          centralSignature: createPipScenarioSyncSignature(
            centralRecord.normalized_sync_view
          ),
          baseLocalSignature: null,
          baseCentralSignature: null,
          localUpdatedAt: null,
          centralUpdatedAt: centralRecord.normalized_sync_view.updated_at,
          centralRevision: Number(centralRecord.revision ?? 0),
          centralEtag: centralRecord.etag,
        }),
        state: "CENTRAL_ONLY",
        action: determineActionForSingleState({
          state: "CENTRAL_ONLY",
          mode: normalizedMode,
        }),
        resolution: "UNPAIRED_CENTRAL_RECORD",
      });
      pairedCentralIds.add(centralId);
    });

  items.sort((left, right) => {
    const leftLocal = left.local_id ?? "";
    const rightLocal = right.local_id ?? "";
    if (leftLocal !== rightLocal) {
      return leftLocal.localeCompare(rightLocal);
    }

    const leftCentral = left.central_id ?? "";
    const rightCentral = right.central_id ?? "";
    return leftCentral.localeCompare(rightCentral);
  });

  const stateCounts = buildStateCounts(items);
  const actionCounts = buildActionCounts(items);

  const unresolvedConflictCount = items.filter(
    (item) => item.action === "MANUAL_CONFLICT"
  ).length;

  const hasActionableMutation = items.some((item) =>
    ["CREATE_CENTRAL", "UPDATE_CENTRAL", "CREATE_LOCAL", "UPDATE_LOCAL"].includes(
      item.action
    )
  );

  const hasInvalidRecords = items.some(
    (item) => Array.isArray(item.validation_errors) && item.validation_errors.length > 0
  );

  const executable =
    hasActionableMutation &&
    unresolvedConflictCount === 0 &&
    hasInvalidRecords === false &&
    PIP_SCENARIO_SYNC_MODES.includes(normalizedMode) &&
    PIP_SCENARIO_SYNC_CONFLICT_POLICIES.includes(normalizedConflictPolicy) &&
    String(centralRepositoryId ?? "").trim().length > 0 &&
    String(centralRepositorySignature ?? "").trim().length > 0;

  const plan = {
    schema: PIP_SCENARIO_SYNC_PLAN_SCHEMA,
    version: PIP_SCENARIO_SYNC_VERSION,
    plan_id: makeSyncPlanId({
      generatedAt: generatedTimestamp,
      mode: normalizedMode,
      conflictPolicy: normalizedConflictPolicy,
    }),
    generated_at: generatedTimestamp,
    constituency_key: normalizedConstituencyKey,
    parliament_code: normalizedParliamentCode,
    mode: normalizedMode,
    conflict_policy: normalizedConflictPolicy,
    collection_id:
      String(centralCollection?.id ?? "").trim() || collectionId,
    local_library_signature: String(localLibrarySignature ?? "").trim(),
    protected_storage_signature: String(
      protectedStorageSignature ?? ""
    ).trim(),
    central_repository_id: String(centralRepositoryId ?? "").trim(),
    central_repository_signature: String(
      centralRepositorySignature ?? ""
    ).trim(),
    items,
    counts: {
      total_items: items.length,
      states: stateCounts,
      actions: actionCounts,
      paired_count: items.filter(
        (item) => item.local_id && item.central_id
      ).length,
    },
    unresolved_conflict_count: unresolvedConflictCount,
    executable,
    safety: {
      cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      deletion_propagation_enabled: false,
    },
    plan_signature: "",
  };

  const signatureTarget = {
    ...plan,
    plan_signature: undefined,
  };

  plan.plan_signature = createPipScenarioSyncSignature(signatureTarget);

  if (errors.length > 0) {
    plan.executable = false;
  }

  return plan;
}

export function validatePipScenarioSyncPlan(plan) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(plan);
  if (!checks.plain_object) {
    errors.push("Sync plan must be a plain object.");
    return {
      valid: false,
      checks,
      errors,
      summary: {
        item_count: 0,
      },
    };
  }

  const items = Array.isArray(plan.items) ? plan.items : [];

  checks.schema_valid = plan.schema === PIP_SCENARIO_SYNC_PLAN_SCHEMA;
  checks.version_valid = Number(plan.version) === PIP_SCENARIO_SYNC_VERSION;
  checks.mode_supported = PIP_SCENARIO_SYNC_MODES.includes(plan.mode);
  checks.policy_supported =
    PIP_SCENARIO_SYNC_CONFLICT_POLICIES.includes(plan.conflict_policy);
  checks.collection_id_valid =
    String(plan.collection_id ?? "").trim() ===
    createPipScenarioSyncCollectionId({
      constituencyKey: String(plan.constituency_key ?? "").trim().toLowerCase(),
    });

  checks.item_states_valid = items.every((item) =>
    PIP_SCENARIO_SYNC_ITEM_STATES.includes(item.state)
  );
  checks.item_actions_valid = items.every((item) =>
    PIP_SCENARIO_SYNC_ACTIONS.includes(item.action)
  );
  checks.state_action_valid = items.every((item) =>
    validateStateActionCombination(item)
  );

  const localIds = items
    .map((item) => String(item.local_id ?? "").trim())
    .filter(Boolean);
  const centralIds = items
    .map((item) => String(item.central_id ?? "").trim())
    .filter(Boolean);

  checks.unique_local_ids =
    localIds.length === new Set(localIds).size;
  checks.unique_central_ids =
    centralIds.length === new Set(centralIds).size;

  const stateCounts = buildStateCounts(items);
  const actionCounts = buildActionCounts(items);
  checks.counts_reconcile =
    Number(plan?.counts?.total_items ?? 0) === items.length &&
    JSON.stringify(plan?.counts?.states ?? {}) ===
      JSON.stringify(stateCounts) &&
    JSON.stringify(plan?.counts?.actions ?? {}) ===
      JSON.stringify(actionCounts);

  const unresolvedCount = items.filter(
    (item) => item.action === "MANUAL_CONFLICT"
  ).length;

  checks.unresolved_count_valid =
    Number(plan.unresolved_conflict_count ?? 0) === unresolvedCount;

  const hasActionableMutation = items.some((item) =>
    ["CREATE_CENTRAL", "UPDATE_CENTRAL", "CREATE_LOCAL", "UPDATE_LOCAL"].includes(
      item.action
    )
  );

  const hasInvalidRecords = items.some(
    (item) => Array.isArray(item.validation_errors) && item.validation_errors.length > 0
  );

  const expectedExecutable =
    hasActionableMutation &&
    unresolvedCount === 0 &&
    hasInvalidRecords === false &&
    checks.mode_supported &&
    checks.policy_supported &&
    String(plan.central_repository_id ?? "").trim().length > 0 &&
    String(plan.central_repository_signature ?? "").trim().length > 0 &&
    plan?.safety?.cutover_enabled === false &&
    plan?.safety?.automatic_synchronisation_enabled === false;

  checks.executable_valid =
    Boolean(plan.executable) === expectedExecutable;

  const signatureTarget = {
    ...plan,
    plan_signature: undefined,
  };

  checks.plan_signature_valid =
    createPipScenarioSyncSignature(signatureTarget) ===
    String(plan.plan_signature ?? "").trim();

  checks.no_fixture_actionable = items.every(
    (item) =>
      item.state !== "SKIPPED_FIXTURE" || item.action === "SKIP"
  );

  checks.no_deletion_action = items.every(
    (item) => item.action !== "DELETE_CENTRAL" && item.action !== "DELETE_LOCAL"
  );

  checks.no_forbidden_privacy_fields =
    findForbiddenFieldPaths(plan).length === 0;

  Object.entries(checks).forEach(([name, passed]) => {
    if (passed !== true) {
      errors.push(`Sync plan check failed: ${name}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      item_count: items.length,
      unresolved_conflict_count: unresolvedCount,
      executable: Boolean(plan.executable),
    },
  };
}

export async function preparePipScenarioSyncPreview({
  client,
  localScenarios,
  previousReceipt,
  rawBrowserSnapshot,
  scenarioLibraryStorageKey,
  scenarioAuditStorageKey,
  syncReceiptStorageKey,
  syncRollbackStorageKey,
  mode,
  conflictPolicy,
  constituencyKey,
  parliamentCode,
}) {
  const result = {
    prepared: false,
    health: null,
    plan: null,
    validation: null,
    central_scenarios: [],
    central_collection: null,
    central_collection_etag: null,
    excluded_fixture_count: 0,
    excluded_deleted_count: 0,
    errors: [],
  };

  try {
    if (!client || typeof client.checkHealth !== "function") {
      throw new Error("Sync preview requires a valid API client.");
    }

    const healthResponse = await client.checkHealth();
    const health = healthResponse?.data ?? null;
    result.health = health;

    const repositoryId = String(
      health?.repository?.repository_id ?? health?.repository_id ?? ""
    ).trim();
    const repositorySignature = String(
      health?.repository?.signature ?? health?.repository_signature ?? ""
    ).trim();

    const healthSafe =
      health?.status === "READY" &&
      health?.storage_mode === "DURABLE_FILE" &&
      health?.central_persistence_enabled === true &&
      (health?.repository_valid === true || repositoryId.length > 0) &&
      health?.authentication_configured === true &&
      health?.authentication_required === true &&
      health?.roles_configured === true &&
      health?.authorization_enforced === true &&
      health?.request_authenticated === true &&
      health?.automatic_synchronisation_enabled === false &&
      health?.operational_read_cutover_enabled === false &&
      health?.operational_write_cutover_enabled === false;

    if (!healthSafe) {
      throw new Error("Durable API health does not satisfy sync safety requirements.");
    }

    const listScenariosResponse = await client.listScenarios({
      constituency_key: constituencyKey,
      include_deleted: true,
      limit: PIP_SCENARIO_SYNC_MAX_CENTRAL_SCENARIOS,
    });

    const listedScenarios = Array.isArray(
      listScenariosResponse?.data?.items
    )
      ? listScenariosResponse.data.items
      : [];

    const activeScenarios = listedScenarios.filter(
      (entry) => !entry.deleted_at && entry.acceptance_fixture !== true
    );

    result.excluded_fixture_count = listedScenarios.filter(
      (entry) => entry?.acceptance_fixture === true
    ).length;
    result.excluded_deleted_count = listedScenarios.filter(
      (entry) => Boolean(entry?.deleted_at)
    ).length;

    const centralScenariosWithEtags = [];

    for (const scenario of activeScenarios) {
      const readResponse = await client.readScenario(scenario.id);
      centralScenariosWithEtags.push({
        ...(readResponse?.data ?? scenario),
        etag: readResponse?.etag ?? null,
      });
    }

    result.central_scenarios = centralScenariosWithEtags;

    const listCollectionsResponse = await client.listCollections({
      constituency_key: constituencyKey,
      include_deleted: false,
      limit: 100,
    });

    const listedCollections = Array.isArray(
      listCollectionsResponse?.data?.items
    )
      ? listCollectionsResponse.data.items
      : [];

    const collectionId = createPipScenarioSyncCollectionId({
      constituencyKey,
    });

    const candidateCollection = listedCollections.find(
      (entry) => String(entry?.id ?? "") === collectionId
    );

    let centralCollection = null;
    let centralCollectionEtag = null;

    if (candidateCollection) {
      const collectionRead = await client.readCollection(collectionId);
      centralCollection = collectionRead?.data ?? candidateCollection;
      centralCollectionEtag = collectionRead?.etag ?? null;
    }

    result.central_collection = centralCollection;
    result.central_collection_etag = centralCollectionEtag;

    const localLibrarySignature = createPipScenarioSyncLocalLibrarySignature(
      localScenarios
    );

    const protectedStorageSignature =
      createPipScenarioSyncProtectedStorageSignature({
        rawSnapshot: rawBrowserSnapshot,
        allowedMutableKeys: [
          scenarioLibraryStorageKey,
          scenarioAuditStorageKey,
          syncReceiptStorageKey,
          syncRollbackStorageKey,
        ],
      });

    const plan = buildPipScenarioSyncPlan({
      localScenarios,
      centralScenarios: centralScenariosWithEtags,
      centralCollection,
      previousReceipt,
      mode,
      conflictPolicy,
      constituencyKey,
      parliamentCode,
      localLibrarySignature,
      protectedStorageSignature,
      centralRepositoryId: repositoryId,
      centralRepositorySignature: repositorySignature,
      generatedAt: new Date().toISOString(),
    });

    const validation = validatePipScenarioSyncPlan(plan);

    result.plan = plan;
    result.validation = validation;
    result.prepared = validation.valid === true;

    if (validation.valid !== true) {
      result.errors.push(...validation.errors);
    }
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : String(error)
    );
  }

  return result;
}

function createSyncCentralId({
  localId,
  existingIds,
}) {
  const slug = String(localId ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  let suffix = 0;
  while (suffix < 10000) {
    const candidate =
      suffix === 0
        ? `pip-sync-p134-${slug || "scenario"}`
        : `pip-sync-p134-${slug || "scenario"}-${suffix}`;

    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }

    suffix += 1;
  }

  throw new Error("Unable to generate deterministic central scenario id.");
}

function createImportedLocalId({
  centralId,
  existingLocalIds,
}) {
  const slug = String(centralId ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  let suffix = 0;
  while (suffix < 10000) {
    const candidate =
      suffix === 0
        ? `central-import-${slug || "scenario"}`
        : `central-import-${slug || "scenario"}-${suffix}`;

    if (!existingLocalIds.has(candidate)) {
      existingLocalIds.add(candidate);
      return candidate;
    }

    suffix += 1;
  }

  throw new Error("Unable to generate local import scenario id.");
}

async function ensureSyncPreconditions({
  client,
  preview,
  currentLocalScenarios,
  currentRawBrowserSnapshot,
  scenarioLibraryStorageKey,
  scenarioAuditStorageKey,
  syncReceiptStorageKey,
  syncRollbackStorageKey,
}) {
  const validation = validatePipScenarioSyncPlan(preview?.plan);

  if (!preview?.prepared || validation.valid !== true) {
    const error = new Error("Invalid or missing sync preview.");
    error.code = "SYNC_INVALID_PREVIEW";
    throw error;
  }

  if (preview.plan.executable !== true) {
    const error = new Error("Sync preview plan is not executable.");
    error.code = "SYNC_NON_EXECUTABLE_PLAN";
    throw error;
  }

  if (Number(preview.plan.unresolved_conflict_count ?? 0) > 0) {
    const error = new Error("Sync preview has unresolved conflicts.");
    error.code = "SYNC_UNRESOLVED_CONFLICTS";
    throw error;
  }

  const currentLocalLibrarySignature =
    createPipScenarioSyncLocalLibrarySignature(currentLocalScenarios);

  const currentProtectedStorageSignature =
    createPipScenarioSyncProtectedStorageSignature({
      rawSnapshot: currentRawBrowserSnapshot,
      allowedMutableKeys: [
        scenarioLibraryStorageKey,
        scenarioAuditStorageKey,
        syncReceiptStorageKey,
        syncRollbackStorageKey,
      ],
    });

  const healthResponse = await client.checkHealth();
  const health = healthResponse?.data ?? null;

  const currentRepositoryId = String(
    health?.repository?.repository_id ?? health?.repository_id ?? ""
  ).trim();
  const currentRepositorySignature = String(
    health?.repository?.signature ?? health?.repository_signature ?? ""
  ).trim();

  const stale =
    currentLocalLibrarySignature !==
      String(preview.plan.local_library_signature ?? "") ||
    currentProtectedStorageSignature !==
      String(preview.plan.protected_storage_signature ?? "") ||
    currentRepositoryId !==
      String(preview.plan.central_repository_id ?? "") ||
    currentRepositorySignature !==
      String(preview.plan.central_repository_signature ?? "");

  if (stale) {
    const error = new Error(
      "The local scenario library or central repository changed after preview."
    );
    error.code = "SYNC_PLAN_STALE";
    error.details = {
      expected_local_library_signature:
        preview.plan.local_library_signature,
      current_local_library_signature: currentLocalLibrarySignature,
      expected_protected_storage_signature:
        preview.plan.protected_storage_signature,
      current_protected_storage_signature: currentProtectedStorageSignature,
      expected_repository_id: preview.plan.central_repository_id,
      current_repository_id: currentRepositoryId,
      expected_repository_signature:
        preview.plan.central_repository_signature,
      current_repository_signature: currentRepositorySignature,
    };
    throw error;
  }

  return {
    health,
    currentLocalLibrarySignature,
    currentProtectedStorageSignature,
    currentRepositoryId,
    currentRepositorySignature,
  };
}

function buildExecutionRollbackPackage({
  preview,
  syncId,
  createdAt,
  currentLocalScenarios,
  currentPreviousReceipt,
  currentProtectedStorageSignature,
  previousCollection,
  previousCollectionEtag,
  createdCentralIds,
  updatedCentralSnapshots,
}) {
  const rollbackPackage = {
    schema: PIP_SCENARIO_SYNC_ROLLBACK_SCHEMA,
    version: PIP_SCENARIO_SYNC_VERSION,
    sync_id: syncId,
    created_at: createdAt,
    plan_signature: preview.plan.plan_signature,
    constituency_key: preview.plan.constituency_key,
    parliament_code: preview.plan.parliament_code,
    local_before: {
      scenario_library: currentLocalScenarios,
      scenario_library_signature:
        createPipScenarioSyncLocalLibrarySignature(currentLocalScenarios),
      sync_receipt: currentPreviousReceipt ?? null,
      sync_receipt_signature: currentPreviousReceipt
        ? normalizePipScenarioSyncReceipt(currentPreviousReceipt)
            .receipt_signature
        : null,
      protected_storage_signature: currentProtectedStorageSignature,
    },
    central_before: {
      repository_id: preview.plan.central_repository_id,
      repository_signature: preview.plan.central_repository_signature,
      collection: previousCollection ?? null,
      collection_etag: previousCollectionEtag ?? null,
      created_scenario_ids: [...createdCentralIds],
      updated_scenarios: [...updatedCentralSnapshots],
    },
    completed_operations: [],
    rollback_signature: "",
  };

  rollbackPackage.rollback_signature = createPipScenarioSyncSignature({
    ...rollbackPackage,
    rollback_signature: undefined,
  });

  return rollbackPackage;
}

export async function executePipScenarioSyncPlan({
  client,
  preview,
  currentLocalScenarios,
  currentPreviousReceipt,
  currentRawBrowserSnapshot,
  scenarioLibraryStorageKey,
  scenarioAuditStorageKey,
  syncReceiptStorageKey,
  syncRollbackStorageKey,
}) {
  if (!client || typeof client.checkHealth !== "function") {
    throw new Error("Sync execution requires a valid API client.");
  }

  const precondition = await ensureSyncPreconditions({
    client,
    preview,
    currentLocalScenarios,
    currentRawBrowserSnapshot,
    scenarioLibraryStorageKey,
    scenarioAuditStorageKey,
    syncReceiptStorageKey,
    syncRollbackStorageKey,
  });

  const plan = preview.plan;
  const syncId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `sync-${Date.now()}`;

  const nextLocalMap = new Map();
  dedupeByScenarioId(currentLocalScenarios).forEach((entry) => {
    nextLocalMap.set(String(entry?.id ?? "").trim(), entry);
  });

  const createdCentralIds = [];
  const updatedCentralSnapshots = [];
  const operationLog = [];

  const existingCentralIds = new Set(
    preview.central_scenarios.map((entry) => String(entry.id))
  );
  const existingLocalIds = new Set(nextLocalMap.keys());

  const previousCollection = preview.central_collection ?? null;
  const previousCollectionEtag = preview.central_collection_etag ?? null;

  const pairRecords = [];

  const createOrUpdateCentralFromLocal = async (item) => {
    const localRecord = nextLocalMap.get(String(item.local_id));
    if (!localRecord) {
      throw new Error(`Missing local record for ${item.local_id}.`);
    }

    const localSignature = createPipScenarioSyncSignature(
      normalizeLegacyScenarioForSync(localRecord, {
        constituencyKey: plan.constituency_key,
        parliamentCode: plan.parliament_code,
      })
    );

    if (item.action === "CREATE_CENTRAL") {
      const centralId = item.central_id
        ? String(item.central_id)
        : createSyncCentralId({
            localId: localRecord.id,
            existingIds: existingCentralIds,
          });

      const payload = adaptLegacyScenarioToCentralPayload({
        localScenario: localRecord,
        constituencyKey: plan.constituency_key,
        parliamentCode: plan.parliament_code,
        centralId,
        localSignature,
      });

      const created = await client.createScenario(payload);
      createdCentralIds.push(centralId);

      operationLog.push({
        type: "CREATE_CENTRAL",
        local_id: localRecord.id,
        central_id: centralId,
        request_id: created.request_id,
      });

      pairRecords.push({
        local_id: localRecord.id,
        central_id: centralId,
        local_signature: localSignature,
        central_signature: createPipScenarioSyncSignature(
          normalizeComparableCentralScenario(created.data)
        ),
        central_revision: Number(created.data?.revision ?? 1),
        last_synced_at: new Date().toISOString(),
      });

      return created.data;
    }

    if (item.action === "UPDATE_CENTRAL") {
      const centralId = String(item.central_id ?? "").trim();
      const currentRead = await client.readScenario(centralId);
      updatedCentralSnapshots.push({
        id: centralId,
        record: currentRead.data,
        etag: currentRead.etag,
      });

      const payload = adaptLegacyScenarioToCentralPayload({
        localScenario: localRecord,
        constituencyKey: plan.constituency_key,
        parliamentCode: plan.parliament_code,
        centralId,
        localSignature,
      });

      const patchPayload = {
        name: payload.name,
        locality_keys: payload.locality_keys,
        description: payload.description,
        operational_notes: payload.operational_notes,
        owner: payload.owner,
        workflow_status: payload.workflow_status,
        review_date: payload.review_date,
        tags: payload.tags,
        pinned: payload.pinned,
        source_legacy_id: payload.source_legacy_id,
        acceptance_fixture: false,
        metadata: payload.metadata,
      };

      const patchValidation = validatePipScenarioApiPatchPayload(patchPayload);
      if (patchValidation.valid !== true) {
        throw new Error(
          `Invalid central patch payload: ${patchValidation.errors?.[0] ?? "invalid"}`
        );
      }

      const patched = await client.patchScenario(
        centralId,
        patchValidation.normalized,
        item.central_etag
      );

      operationLog.push({
        type: "UPDATE_CENTRAL",
        local_id: localRecord.id,
        central_id: centralId,
        request_id: patched.request_id,
      });

      pairRecords.push({
        local_id: localRecord.id,
        central_id: centralId,
        local_signature: localSignature,
        central_signature: createPipScenarioSyncSignature(
          normalizeComparableCentralScenario(patched.data)
        ),
        central_revision: Number(patched.data?.revision ?? 1),
        last_synced_at: new Date().toISOString(),
      });

      return patched.data;
    }

    if (item.action === "NO_CHANGE") {
      if (item.local_id && item.central_id) {
        pairRecords.push({
          local_id: item.local_id,
          central_id: item.central_id,
          local_signature: item.local_signature,
          central_signature: item.central_signature,
          central_revision: Number(item.central_revision ?? 1),
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    return null;
  };

  const updateLocalFromCentral = async (item) => {
    if (item.action !== "CREATE_LOCAL" && item.action !== "UPDATE_LOCAL") {
      if (item.action === "NO_CHANGE" && item.local_id && item.central_id) {
        pairRecords.push({
          local_id: item.local_id,
          central_id: item.central_id,
          local_signature: item.local_signature,
          central_signature: item.central_signature,
          central_revision: Number(item.central_revision ?? 1),
          last_synced_at: new Date().toISOString(),
        });
      }
      return;
    }

    const centralId = String(item.central_id ?? "").trim();
    const centralRead = await client.readScenario(centralId);

    let localId = String(item.local_id ?? "").trim();
    if (!localId) {
      localId = createImportedLocalId({
        centralId,
        existingLocalIds,
      });
    }

    const localRecord = adaptCentralScenarioToLegacyRecord({
      centralScenario: centralRead.data,
      localId,
    });

    nextLocalMap.set(localId, localRecord);

    operationLog.push({
      type: item.action,
      local_id: localId,
      central_id: centralId,
      request_id: centralRead.request_id,
    });

    pairRecords.push({
      local_id: localId,
      central_id: centralId,
      local_signature: createPipScenarioSyncSignature(
        normalizeLegacyScenarioForSync(localRecord, {
          constituencyKey: plan.constituency_key,
          parliamentCode: plan.parliament_code,
        })
      ),
      central_signature: createPipScenarioSyncSignature(
        normalizeComparableCentralScenario(centralRead.data)
      ),
      central_revision: Number(centralRead.data?.revision ?? 1),
      last_synced_at: new Date().toISOString(),
    });
  };

  let upsertedCollection = null;
  let upsertedCollectionEtag = null;

  try {
    for (const item of plan.items) {
      if (
        item.action === "CREATE_CENTRAL" ||
        item.action === "UPDATE_CENTRAL" ||
        item.action === "NO_CHANGE"
      ) {
        await createOrUpdateCentralFromLocal(item);
      }
    }

    for (const item of plan.items) {
      await updateLocalFromCentral(item);
    }

    const pairedCentralIds = [...new Set(
      pairRecords
        .map((entry) => String(entry.central_id ?? "").trim())
        .filter(Boolean)
    )].sort();

    const collectionPayload = {
      id: createPipScenarioSyncCollectionId({
        constituencyKey: plan.constituency_key,
      }),
      constituency_key: plan.constituency_key,
      parliament_code: plan.parliament_code,
      name: "P134 Synchronized Scenario Library",
      description:
        "Controlled browser/server scenario synchronization collection.",
      scenario_ids: pairedCentralIds,
      tags: ["batch-52c", "synchronized-library"],
      pinned: false,
      acceptance_fixture: false,
      metadata: {
        batch: "52C",
        purpose: "CONTROLLED_SCENARIO_SYNCHRONISATION",
        aggregate_only: true,
      },
    };

    if (previousCollection) {
      const replaced = await client.replaceCollection(
        collectionPayload.id,
        collectionPayload,
        previousCollectionEtag
      );
      upsertedCollection = replaced.data;
      upsertedCollectionEtag = replaced.etag;
    } else {
      const createdCollection = await client.createCollection(collectionPayload);
      upsertedCollection = createdCollection.data;
      upsertedCollectionEtag = createdCollection.etag;
    }

    operationLog.push({
      type: "UPSERT_COLLECTION",
      collection_id: collectionPayload.id,
    });

    const nextLocalScenarios = [...nextLocalMap.values()]
      .map((entry) => ({ ...entry }))
      .sort((left, right) =>
        String(left.id).localeCompare(String(right.id))
      );

    const nextLocalLibrarySignature =
      createPipScenarioSyncLocalLibrarySignature(nextLocalScenarios);

    const nextReceipt = normalizePipScenarioSyncReceipt({
      constituency_key: plan.constituency_key,
      parliament_code: plan.parliament_code,
      collection_id: collectionPayload.id,
      last_sync_id: syncId,
      last_sync_mode: plan.mode,
      last_conflict_policy: plan.conflict_policy,
      last_plan_signature: plan.plan_signature,
      last_local_library_signature: nextLocalLibrarySignature,
      last_central_repository_signature:
        plan.central_repository_signature,
      last_synced_at: new Date().toISOString(),
      pairs: pairRecords,
    });

    const rollbackPackage = buildExecutionRollbackPackage({
      preview,
      syncId,
      createdAt: new Date().toISOString(),
      currentLocalScenarios,
      currentPreviousReceipt,
      currentProtectedStorageSignature:
        precondition.currentProtectedStorageSignature,
      previousCollection,
      previousCollectionEtag,
      createdCentralIds,
      updatedCentralSnapshots,
    });

    const healthResponse = await client.checkHealth();

    return {
      applied: true,
      schema: PIP_SCENARIO_SYNC_EXECUTION_SCHEMA,
      sync_id: syncId,
      completed_at: new Date().toISOString(),
      plan_signature: plan.plan_signature,
      mode: plan.mode,
      conflict_policy: plan.conflict_policy,
      operations: operationLog,
      next_local_scenarios: nextLocalScenarios,
      next_local_library_signature: nextLocalLibrarySignature,
      next_receipt: nextReceipt,
      rollback_package: rollbackPackage,
      central_collection: upsertedCollection,
      central_collection_etag: upsertedCollectionEtag,
      central_health: healthResponse.data ?? null,
      protected_storage_signature_expected:
        precondition.currentProtectedStorageSignature,
      created_central_count: operationLog.filter(
        (entry) => entry.type === "CREATE_CENTRAL"
      ).length,
      updated_central_count: operationLog.filter(
        (entry) => entry.type === "UPDATE_CENTRAL"
      ).length,
      created_local_count: operationLog.filter(
        (entry) => entry.type === "CREATE_LOCAL"
      ).length,
      updated_local_count: operationLog.filter(
        (entry) => entry.type === "UPDATE_LOCAL"
      ).length,
      unchanged_count: operationLog.filter(
        (entry) => entry.type === "NO_CHANGE"
      ).length,
      errors: [],
    };
  } catch (error) {
    try {
      for (const snapshot of updatedCentralSnapshots.reverse()) {
        try {
          const current = await client.readScenario(snapshot.id);
          await client.replaceScenario(
            snapshot.id,
            snapshot.record,
            current.etag
          );
        } catch {
          // Best-effort compensation.
        }
      }

      for (const createdId of createdCentralIds.reverse()) {
        try {
          const current = await client.readScenario(createdId);
          await client.deleteScenario(createdId, current.etag);
        } catch {
          // Best-effort compensation.
        }
      }

      const collectionId = createPipScenarioSyncCollectionId({
        constituencyKey: plan.constituency_key,
      });

      if (previousCollection && previousCollectionEtag) {
        try {
          const currentCollection = await client.readCollection(collectionId);
          await client.replaceCollection(
            collectionId,
            previousCollection,
            currentCollection.etag
          );
        } catch {
          // Best-effort compensation.
        }
      } else {
        try {
          const currentCollection = await client.readCollection(collectionId);
          await client.deleteCollection(collectionId, currentCollection.etag);
        } catch {
          // Best-effort compensation.
        }
      }
    } finally {
      if (String(error?.code ?? "") === "SYNC_PLAN_STALE") {
        throw error;
      }

      const wrapped = new Error(
        error instanceof Error
          ? error.message
          : "Controlled sync execution failed."
      );
      wrapped.code = String(error?.code ?? "SYNC_EXECUTION_FAILED");
      throw wrapped;
    }
  }
}

export async function verifyPipScenarioSyncExecution({
  client,
  execution,
  currentLocalScenarios,
  currentReceipt,
  currentRawBrowserSnapshot,
  scenarioLibraryStorageKey,
  scenarioAuditStorageKey,
  syncReceiptStorageKey,
  syncRollbackStorageKey,
}) {
  const errors = [];

  if (!execution || execution.applied !== true) {
    return {
      verified: false,
      verified_at: new Date().toISOString(),
      paired_count: 0,
      matching_pair_count: 0,
      mismatch_count: 0,
      collection_verified: false,
      receipt_verified: false,
      protected_storage_verified: false,
      health: null,
      errors: ["Missing successful sync execution package."],
    };
  }

  const receiptValidation = validatePipScenarioSyncReceipt(currentReceipt);
  if (receiptValidation.valid !== true) {
    errors.push(...receiptValidation.errors);
  }

  const localById = new Map(
    dedupeByScenarioId(currentLocalScenarios).map((entry) => [
      String(entry.id),
      entry,
    ])
  );

  const pairs = normalizePipScenarioSyncReceipt(currentReceipt).pairs;
  let matchingPairCount = 0;

  for (const pair of pairs) {
    const localRecord = localById.get(pair.local_id) ?? null;

    if (!localRecord) {
      errors.push(`Missing local record for pair ${pair.local_id}.`);
      continue;
    }

    try {
      const normalizedLocal = normalizeLegacyScenarioForSync(localRecord, {
        constituencyKey: "p134",
        parliamentCode: "P134",
      });
      const localSignature = createPipScenarioSyncSignature(normalizedLocal);
      if (localSignature !== pair.local_signature) {
        errors.push(`Local signature mismatch for ${pair.local_id}.`);
        continue;
      }

      const centralRead = await client.readScenario(pair.central_id);
      const centralSignature = createPipScenarioSyncSignature(
        normalizeComparableCentralScenario(centralRead.data)
      );

      if (centralSignature !== pair.central_signature) {
        errors.push(`Central signature mismatch for ${pair.central_id}.`);
        continue;
      }

      if (Number(centralRead.data?.revision ?? 0) !== Number(pair.central_revision)) {
        errors.push(`Central revision mismatch for ${pair.central_id}.`);
        continue;
      }

      if (centralRead.data?.acceptance_fixture === true || centralRead.data?.deleted_at) {
        errors.push(`Invalid central pair state for ${pair.central_id}.`);
        continue;
      }

      matchingPairCount += 1;
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : `Unable to verify pair ${pair.local_id}/${pair.central_id}.`
      );
    }
  }

  let collectionVerified = false;
  try {
    const collectionRead = await client.readCollection(
      currentReceipt.collection_id
    );
    const collectionScenarioIds = new Set(
      Array.isArray(collectionRead.data?.scenario_ids)
        ? collectionRead.data.scenario_ids.map((entry) => String(entry))
        : []
    );

    collectionVerified = pairs.every((pair) =>
      collectionScenarioIds.has(pair.central_id)
    );

    if (!collectionVerified) {
      errors.push("Collection membership does not match receipt pairs.");
    }
  } catch (error) {
    errors.push(
      error instanceof Error
        ? error.message
        : "Unable to verify synchronized collection."
    );
  }

  const protectedSignature = createPipScenarioSyncProtectedStorageSignature({
    rawSnapshot: currentRawBrowserSnapshot,
    allowedMutableKeys: [
      scenarioLibraryStorageKey,
      scenarioAuditStorageKey,
      syncReceiptStorageKey,
      syncRollbackStorageKey,
    ],
  });

  const protectedStorageVerified =
    protectedSignature ===
    String(execution.protected_storage_signature_expected ?? "");

  if (!protectedStorageVerified) {
    errors.push("Protected browser storage signature mismatch.");
  }

  const localLibrarySignature = createPipScenarioSyncLocalLibrarySignature(
    currentLocalScenarios
  );

  if (
    localLibrarySignature !==
    String(currentReceipt?.last_local_library_signature ?? "")
  ) {
    errors.push("Local library signature mismatch against receipt.");
  }

  const healthResponse = await client.checkHealth();
  const health = healthResponse?.data ?? null;

  const healthSafe =
    health?.authentication_configured === true &&
    health?.authentication_required === true &&
    health?.roles_configured === true &&
    health?.authorization_enforced === true &&
    health?.request_authenticated === true &&
    health?.automatic_synchronisation_enabled === false &&
    health?.operational_read_cutover_enabled === false &&
    health?.operational_write_cutover_enabled === false;

  if (!healthSafe) {
    errors.push("API health safety flags changed unexpectedly.");
  }

  return {
    verified: errors.length === 0,
    verified_at: new Date().toISOString(),
    paired_count: pairs.length,
    matching_pair_count: matchingPairCount,
    mismatch_count: pairs.length - matchingPairCount,
    collection_verified: collectionVerified,
    receipt_verified: receiptValidation.valid === true,
    protected_storage_verified: protectedStorageVerified,
    health,
    errors,
  };
}

export async function rollbackPipScenarioSyncExecution({
  client,
  rollbackPackage,
  currentRawBrowserSnapshot,
  scenarioLibraryStorageKey,
  scenarioAuditStorageKey,
  syncReceiptStorageKey,
  syncRollbackStorageKey,
}) {
  const validation = validatePipScenarioSyncReceipt(
    rollbackPackage?.local_before?.sync_receipt ?? {
      schema: PIP_SCENARIO_SYNC_RECEIPT_SCHEMA,
      version: PIP_SCENARIO_SYNC_VERSION,
      constituency_key: "p134",
      parliament_code: "P134",
      collection_id: createPipScenarioSyncCollectionId({
        constituencyKey: "p134",
      }),
      last_sync_id: "none",
      last_sync_mode: "UPLOAD_LOCAL_TO_CENTRAL",
      last_conflict_policy: "MANUAL_REVIEW",
      last_plan_signature: createPipScenarioSyncSignature({ a: 1 }),
      last_local_library_signature: createPipScenarioSyncSignature({ b: 1 }),
      last_central_repository_signature: createPipScenarioSyncSignature({ c: 1 }),
      last_synced_at: new Date().toISOString(),
      pairs: [],
      receipt_signature: createPipScenarioSyncSignature({
        schema: PIP_SCENARIO_SYNC_RECEIPT_SCHEMA,
      }),
    }
  );

  const rollbackValid =
    rollbackPackage &&
    rollbackPackage.schema === PIP_SCENARIO_SYNC_ROLLBACK_SCHEMA &&
    rollbackPackage.version === PIP_SCENARIO_SYNC_VERSION;

  if (!rollbackValid) {
    return {
      rolled_back: false,
      rolled_back_at: new Date().toISOString(),
      restored_local_scenarios: [],
      restored_sync_receipt: null,
      central_collection_restored: false,
      central_scenarios_restored: false,
      created_central_scenarios_soft_deleted: false,
      protected_storage_signature_expected: null,
      errors: ["Invalid rollback package."],
    };
  }

  const errors = [];
  let centralCollectionRestored = false;
  let centralScenariosRestored = false;
  let createdScenariosSoftDeleted = false;

  const collectionId = createPipScenarioSyncCollectionId({
    constituencyKey: rollbackPackage.constituency_key,
  });

  try {
    if (rollbackPackage.central_before.collection) {
      const currentCollection = await client.readCollection(collectionId);
      await client.replaceCollection(
        collectionId,
        rollbackPackage.central_before.collection,
        currentCollection.etag
      );
      centralCollectionRestored = true;
    } else {
      try {
        const currentCollection = await client.readCollection(collectionId);
        await client.deleteCollection(collectionId, currentCollection.etag);
      } catch {
        // Missing collection is acceptable.
      }
      centralCollectionRestored = true;
    }

    for (const entry of rollbackPackage.central_before.updated_scenarios) {
      const current = await client.readScenario(entry.id);
      await client.replaceScenario(entry.id, entry.record, current.etag);
    }

    centralScenariosRestored = true;

    for (const createdId of rollbackPackage.central_before.created_scenario_ids) {
      try {
        const current = await client.readScenario(createdId);
        await client.deleteScenario(createdId, current.etag);
      } catch {
        // Missing created record can be treated as already compensated.
      }
    }

    createdScenariosSoftDeleted = true;
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : String(error)
    );
  }

  const expectedProtectedSignature = String(
    rollbackPackage.local_before.protected_storage_signature ?? ""
  );

  const currentProtectedSignature =
    createPipScenarioSyncProtectedStorageSignature({
      rawSnapshot: currentRawBrowserSnapshot,
      allowedMutableKeys: [
        scenarioLibraryStorageKey,
        scenarioAuditStorageKey,
        syncReceiptStorageKey,
        syncRollbackStorageKey,
      ],
    });

  if (validation.valid !== true) {
    errors.push("Restored receipt validation failed.");
  }

  return {
    rolled_back: errors.length === 0,
    rolled_back_at: new Date().toISOString(),
    restored_local_scenarios:
      rollbackPackage.local_before.scenario_library ?? [],
    restored_sync_receipt:
      rollbackPackage.local_before.sync_receipt ?? null,
    central_collection_restored: centralCollectionRestored,
    central_scenarios_restored: centralScenariosRestored,
    created_central_scenarios_soft_deleted: createdScenariosSoftDeleted,
    protected_storage_signature_expected: expectedProtectedSignature,
    protected_storage_signature_current: currentProtectedSignature,
    errors,
  };
}

