import {
  PIP_STORAGE_COMPATIBILITY_MODE,
  PIP_STORAGE_CUTOVER_ENABLED,
  PIP_STORAGE_DATABASES,
  PIP_STORAGE_KEYS,
} from "./pip-storage-namespace.js";
import {
  openPipStatewideDatabase,
  inspectPipStatewideDatabaseSchema,
} from "./pip-statewide-browser-db.js";

export const PIP_STATEWIDE_SHADOW_MIGRATION_SCHEMA =
  "pip.storage.statewide-shadow-migration.v1";

export const PIP_STATEWIDE_SHADOW_MIGRATION_RECEIPT_SCHEMA =
  "pip.storage.statewide-shadow-migration-receipt.v1";

export const PIP_STATEWIDE_SHADOW_ROLLBACK_RECEIPT_SCHEMA =
  "pip.storage.statewide-shadow-rollback-receipt.v1";

export const PIP_STATEWIDE_SHADOW_MIGRATION_ID =
  "p134-statewide-shadow-v1";

export const PIP_STATEWIDE_SHADOW_ROLLBACK_ID =
  "p134-statewide-shadow-v1:rollback";

const PIP_STATEWIDE_SCHEMA_RECEIPT_ID = "statewide-schema-v1";

export const PIP_STATEWIDE_SHADOW_DESTINATION_STORES = [
  "scenarioLibrary",
  "workspaceState",
  "recoveryCheckpoints",
  "migrationReceipts",
];

const FORBIDDEN_DESTINATION_STORES = [
  "constituencyBundles",
  "reconciliationEvidence",
  "cachedSignals",
  "cachedSnapshots",
  "pendingSync",
];

export const PIP_STATEWIDE_SHADOW_RESOURCE_MAPPINGS = [
  {
    resource_name: "scenarioLibrary",
    legacy_key: PIP_STORAGE_KEYS.scenarioLibrary.legacy,
    destination_store: "scenarioLibrary",
    deterministic_id_prefix: "shadow:p134:scenario:",
  },
  {
    resource_name: "comparisonBasket",
    legacy_key: PIP_STORAGE_KEYS.comparisonBasket.legacy,
    destination_store: "workspaceState",
    deterministic_id: "shadow:p134:workspace:comparison-basket",
    workspace_type: "LOCALITY_COMPARISON_BASKET",
  },
  {
    resource_name: "comparisonWorkspaceVisibility",
    legacy_key:
      PIP_STORAGE_KEYS.comparisonWorkspaceVisibility.legacy,
    destination_store: "workspaceState",
    deterministic_id: "shadow:p134:workspace:comparison-visibility",
    workspace_type: "LOCALITY_COMPARISON_VISIBILITY",
  },
  {
    resource_name: "scenarioAuditLog",
    legacy_key: PIP_STORAGE_KEYS.scenarioAuditLog.legacy,
    destination_store: "recoveryCheckpoints",
    deterministic_id: "shadow:p134:recovery:scenario-audit-log",
    resource_type: "SCENARIO_AUDIT_LOG",
    status: "SHADOW_BACKUP",
  },
  {
    resource_name: "scenarioAuditArchiveReceipt",
    legacy_key:
      PIP_STORAGE_KEYS.scenarioAuditArchiveReceipt.legacy,
    destination_store: "recoveryCheckpoints",
    deterministic_id:
      "shadow:p134:recovery:audit-archive-receipt",
    resource_type: "SCENARIO_AUDIT_ARCHIVE_RECEIPT",
  },
  {
    resource_name: "scenarioAuditRestoreRollback",
    legacy_key:
      PIP_STORAGE_KEYS.scenarioAuditRestoreRollback.legacy,
    destination_store: "recoveryCheckpoints",
    deterministic_id:
      "shadow:p134:recovery:audit-restore-rollback",
    resource_type: "SCENARIO_AUDIT_RESTORE_ROLLBACK",
  },
  {
    resource_name: "scenarioAuditRestoreReceipt",
    legacy_key:
      PIP_STORAGE_KEYS.scenarioAuditRestoreReceipt.legacy,
    destination_store: "recoveryCheckpoints",
    deterministic_id:
      "shadow:p134:recovery:audit-restore-receipt",
    resource_type: "SCENARIO_AUDIT_RESTORE_RECEIPT",
  },
];

const INTENTIONALLY_EXCLUDED_RESOURCES = [
  {
    resource_name: "governanceSession",
    legacy_key: PIP_STORAGE_KEYS.governanceSession.legacy,
    reason:
      "Session-scoped resource is intentionally excluded from statewide shadow migration.",
  },
];

const REQUIRED_CONTRACT_SAFETY_FLAGS = [
  "manually_initiated",
  "shadow_copy_only",
  "verified_backup_required",
  "legacy_storage_remains_authoritative",
  "legacy_records_not_modified",
  "legacy_records_not_deleted",
  "statewide_operational_reads_disabled",
  "statewide_operational_writes_disabled",
  "automatic_fallback_disabled",
  "rollback_removes_only_migration_owned_shadow_records",
  "schema_receipt_must_be_preserved",
];

const REQUIRED_PLAN_SAFETY_FLAGS = [
  "backup_verified",
  "source_signature_matches_backup",
  "shadow_copy_only",
  "no_legacy_mutation",
  "no_read_cutover",
  "no_write_cutover",
  "no_automatic_fallback",
];

const SHADOW_STATUS_VALUES = new Set([
  "COPIED",
  "SKIPPED_MISSING",
  "BLOCKED",
  "INVALID",
]);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const out = {};
    keys.forEach((key) => {
      out[key] = canonicalizeValue(value[key]);
    });
    return out;
  }

  return value;
}

function fnv1a32Hex(input) {
  let hash = 0x811c9dc5;
  const text = String(input ?? "");

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
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

function isValidShadowSignature(value) {
  return /^fnv1a-[0-9a-f]{8}$/.test(String(value ?? ""));
}

function encodeShadowIdValue(value) {
  return encodeURIComponent(String(value ?? ""));
}

function normalizeConstituencyKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeParliamentCode(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (/^\d{3}$/.test(normalized)) {
    return `P${normalized}`;
  }

  return normalized;
}

function getStoreMap() {
  return new Map(
    PIP_STATEWIDE_SHADOW_RESOURCE_MAPPINGS.map((entry) => [
      entry.legacy_key,
      entry,
    ])
  );
}

function buildDestinationSignature(records) {
  const canonicalRecords = [...records]
    .map((entry) => canonicalizeValue(entry))
    .sort((left, right) =>
      String(left?.id ?? "").localeCompare(
        String(right?.id ?? "")
      )
    );

  return createPipStatewideShadowSignature(canonicalRecords);
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(
        transaction.error instanceof Error
          ? transaction.error
          : new Error("IndexedDB transaction failed.")
      );
    };
    transaction.onabort = () => {
      reject(
        transaction.error instanceof Error
          ? transaction.error
          : new Error("IndexedDB transaction aborted.")
      );
    };
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(
        request.error instanceof Error
          ? request.error
          : new Error("IndexedDB request failed.")
      );
    };
  });
}

function iterateStoreRecords(store) {
  return new Promise((resolve, reject) => {
    const out = [];
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(out);
        return;
      }

      out.push(cursor.value);
      cursor.continue();
    };

    request.onerror = () => {
      reject(
        request.error instanceof Error
          ? request.error
          : new Error("Failed to iterate IndexedDB store.")
      );
    };
  });
}

function validateShadowStoreName(storeName) {
  if (
    !PIP_STATEWIDE_SHADOW_DESTINATION_STORES.includes(storeName)
  ) {
    throw new Error(
      `Unsupported shadow destination store: ${storeName}`
    );
  }

  if (FORBIDDEN_DESTINATION_STORES.includes(storeName)) {
    throw new Error(
      `Forbidden shadow destination store: ${storeName}`
    );
  }
}

function buildContractSafety() {
  return {
    manually_initiated: true,
    shadow_copy_only: true,
    verified_backup_required: true,
    legacy_storage_remains_authoritative: true,
    legacy_records_not_modified: true,
    legacy_records_not_deleted: true,
    statewide_operational_reads_disabled: true,
    statewide_operational_writes_disabled: true,
    automatic_fallback_disabled: true,
    rollback_removes_only_migration_owned_shadow_records: true,
    schema_receipt_must_be_preserved: true,
  };
}

function buildPlanSafety() {
  return {
    backup_verified: true,
    source_signature_matches_backup: true,
    shadow_copy_only: true,
    no_legacy_mutation: true,
    no_read_cutover: true,
    no_write_cutover: true,
    no_automatic_fallback: true,
  };
}

function ensureJsonParseable(entry) {
  if (entry.present !== true) {
    return { ok: true, parsed: null };
  }

  try {
    return {
      ok: true,
      parsed: JSON.parse(String(entry.raw_value ?? "")),
    };
  } catch {
    return { ok: false, parsed: null };
  }
}

function ensureStringArrayUnique(values) {
  const normalized = values.map((entry) =>
    String(entry ?? "")
  );
  return new Set(normalized).size === normalized.length;
}

export function createPipStatewideShadowSignature(value) {
  const canonical = canonicalizeValue(value);
  const payload = JSON.stringify(canonical);
  return `fnv1a-${fnv1a32Hex(payload)}`;
}

export function buildPipStatewideShadowMigrationContract({
  generatedAt,
} = {}) {
  return {
    schema: PIP_STATEWIDE_SHADOW_MIGRATION_SCHEMA,
    generated_at:
      normalizeIsoTimestamp(generatedAt) ??
      new Date().toISOString(),
    migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
    compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
    cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    source_database_authority: "LEGACY",
    destination_database: {
      name: PIP_STORAGE_DATABASES.statewide.name,
      version: PIP_STORAGE_DATABASES.statewide.version,
    },
    resource_mappings:
      PIP_STATEWIDE_SHADOW_RESOURCE_MAPPINGS.map((entry) => ({
        ...entry,
      })),
    intentionally_excluded_resources:
      INTENTIONALLY_EXCLUDED_RESOURCES.map((entry) => ({
        ...entry,
      })),
    permitted_destination_stores: [
      ...PIP_STATEWIDE_SHADOW_DESTINATION_STORES,
    ],
    forbidden_destination_stores: [
      ...FORBIDDEN_DESTINATION_STORES,
    ],
    safety: buildContractSafety(),
    summary: {
      mapped_resource_count:
        PIP_STATEWIDE_SHADOW_RESOURCE_MAPPINGS.length,
      excluded_resource_count:
        INTENTIONALLY_EXCLUDED_RESOURCES.length,
      permitted_store_count:
        PIP_STATEWIDE_SHADOW_DESTINATION_STORES.length,
      compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    },
  };
}

export function validatePipStatewideShadowMigrationContract(
  contract
) {
  const safeContract = isPlainObject(contract)
    ? contract
    : {};

  const mappings = Array.isArray(
    safeContract.resource_mappings
  )
    ? safeContract.resource_mappings
    : [];

  const excluded = Array.isArray(
    safeContract.intentionally_excluded_resources
  )
    ? safeContract.intentionally_excluded_resources
    : [];

  const permittedStores = Array.isArray(
    safeContract.permitted_destination_stores
  )
    ? safeContract.permitted_destination_stores
    : [];

  const forbiddenStores = Array.isArray(
    safeContract.forbidden_destination_stores
  )
    ? safeContract.forbidden_destination_stores
    : [];

  const safety = isPlainObject(safeContract.safety)
    ? safeContract.safety
    : {};

  const summary = isPlainObject(safeContract.summary)
    ? safeContract.summary
    : {};

  const legacyKeys = mappings.map((entry) =>
    String(entry?.legacy_key ?? "")
  );

  const checks = {
    schema_valid:
      safeContract.schema ===
      PIP_STATEWIDE_SHADOW_MIGRATION_SCHEMA,
    generated_at_iso_valid:
      normalizeIsoTimestamp(safeContract.generated_at) !== null,
    migration_id_valid:
      safeContract.migration_id ===
      PIP_STATEWIDE_SHADOW_MIGRATION_ID,
    compatibility_mode_valid:
      safeContract.compatibility_mode ===
        "LEGACY_READ_WRITE" &&
      PIP_STORAGE_COMPATIBILITY_MODE ===
        "LEGACY_READ_WRITE",
    cutover_disabled:
      safeContract.cutover_enabled === false &&
      PIP_STORAGE_CUTOVER_ENABLED === false,
    mapping_count_valid: mappings.length === 7,
    legacy_keys_unique: ensureStringArrayUnique(legacyKeys),
    mapping_targets_permitted_store: mappings.every((entry) =>
      PIP_STATEWIDE_SHADOW_DESTINATION_STORES.includes(
        String(entry?.destination_store ?? "")
      )
    ),
    mapping_avoids_forbidden_store: mappings.every(
      (entry) =>
        !FORBIDDEN_DESTINATION_STORES.includes(
          String(entry?.destination_store ?? "")
        )
    ),
    governance_session_excluded: excluded.some(
      (entry) =>
        String(entry?.resource_name ?? "") ===
          "governanceSession" &&
        String(entry?.legacy_key ?? "") ===
          PIP_STORAGE_KEYS.governanceSession.legacy
    ),
    required_safety_invariants: REQUIRED_CONTRACT_SAFETY_FLAGS.every(
      (flag) => safety[flag] === true
    ),
    summary_consistent:
      summary.mapped_resource_count === mappings.length &&
      summary.excluded_resource_count === excluded.length &&
      summary.permitted_store_count === permittedStores.length &&
      summary.compatibility_mode === "LEGACY_READ_WRITE" &&
      summary.cutover_enabled === false,
    permitted_store_count_valid:
      permittedStores.length ===
        PIP_STATEWIDE_SHADOW_DESTINATION_STORES.length &&
      ensureStringArrayUnique(permittedStores),
    forbidden_store_count_valid:
      forbiddenStores.length === FORBIDDEN_DESTINATION_STORES.length,
  };

  const errors = Object.entries(checks)
    .filter(([, valid]) => valid !== true)
    .map(
      ([name]) =>
        `Statewide shadow migration contract check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      mapped_resource_count: mappings.length,
      excluded_resource_count: excluded.length,
      permitted_store_count: permittedStores.length,
    },
  };
}

export function buildPipStatewideShadowMigrationPlan({
  sourceRecords,
  sourceSignature,
  verifiedBackupReceipt,
  constituencyKey,
  parliamentCode,
  generatedAt,
}) {
  const normalizedConstituencyKey =
    normalizeConstituencyKey(constituencyKey);
  const normalizedParliamentCode =
    normalizeParliamentCode(parliamentCode);

  if (normalizedConstituencyKey !== "p134") {
    throw new Error(
      "Statewide shadow migration plan requires constituency_key p134."
    );
  }

  if (normalizedParliamentCode !== "P134") {
    throw new Error(
      "Statewide shadow migration plan requires parliament_code P134."
    );
  }

  if (!isValidShadowSignature(sourceSignature)) {
    throw new Error(
      "Statewide shadow migration plan requires a valid source signature."
    );
  }

  if (!isPlainObject(verifiedBackupReceipt)) {
    throw new Error(
      "Statewide shadow migration plan requires a verified backup receipt."
    );
  }

  if (
    verifiedBackupReceipt.status !== "VERIFIED" ||
    verifiedBackupReceipt.exact_readback_verified !== true
  ) {
    throw new Error(
      "Statewide shadow migration plan requires a VERIFIED backup receipt with exact_readback_verified=true."
    );
  }

  if (verifiedBackupReceipt.signature !== sourceSignature) {
    throw new Error(
      "Statewide shadow migration plan requires backup signature to match source signature."
    );
  }

  const records = Array.isArray(sourceRecords)
    ? sourceRecords
    : [];

  const sourceKeys = records.map((entry) =>
    String(entry?.key ?? "")
  );

  if (!ensureStringArrayUnique(sourceKeys)) {
    throw new Error(
      "Statewide shadow migration plan rejected duplicate source keys."
    );
  }

  const mappingByKey = getStoreMap();

  const unsupportedSourceKey = sourceKeys.find(
    (key) => !mappingByKey.has(key)
  );

  if (unsupportedSourceKey) {
    throw new Error(
      `Statewide shadow migration plan rejected unsupported source key: ${unsupportedSourceKey}`
    );
  }

  const destinationRecords = [];
  const resourceResults = [];

  for (const mapping of PIP_STATEWIDE_SHADOW_RESOURCE_MAPPINGS) {
    const sourceRecord = records.find(
      (entry) => String(entry?.key ?? "") === mapping.legacy_key
    );

    validateShadowStoreName(mapping.destination_store);

    if (!sourceRecord || sourceRecord.present !== true) {
      resourceResults.push({
        resource_name: mapping.resource_name,
        source_legacy_key: mapping.legacy_key,
        destination_store: mapping.destination_store,
        status: "SKIPPED_MISSING",
        source_present: false,
        destination_record_count: 0,
      });
      continue;
    }

    const parseResult = ensureJsonParseable(sourceRecord);
    if (!parseResult.ok) {
      throw new Error(
        `Statewide shadow migration plan rejected invalid JSON for source key: ${mapping.legacy_key}`
      );
    }

    const parsedValue = parseResult.parsed;
    const generatedTimestamp =
      normalizeIsoTimestamp(generatedAt) ??
      new Date().toISOString();

    if (mapping.resource_name === "scenarioLibrary") {
      if (!Array.isArray(parsedValue)) {
        throw new Error(
          "Statewide shadow migration plan requires scenarioLibrary source value to be an array."
        );
      }

      const scenarioRecords = parsedValue.map(
        (scenario, scenarioIndex) => {
          const sourceScenarioId =
            String(scenario?.id ?? "").trim() ||
            `fallback-${createPipStatewideShadowSignature({
              scenario_name: String(
                scenario?.name ?? ""
              ).trim(),
              created_at: String(
                scenario?.created_at ?? ""
              ).trim(),
              source_index: scenarioIndex,
            })}`;

          const recordId =
            `${mapping.deterministic_id_prefix}${encodeShadowIdValue(
              sourceScenarioId
            )}`;

          return {
            id: recordId,
            migration_id:
              PIP_STATEWIDE_SHADOW_MIGRATION_ID,
            shadow_copy: true,
            source_legacy_key: mapping.legacy_key,
            source_scenario_id: sourceScenarioId,
            constituency_key: "p134",
            parliament_code: "P134",
            workflow_status: String(
              scenario?.workflow_status ?? "UNKNOWN"
            ),
            created_at: String(
              scenario?.created_at ?? generatedTimestamp
            ),
            updated_at: generatedTimestamp,
            source_signature: createPipStatewideShadowSignature(
              scenario
            ),
            payload: scenario,
          };
        }
      );

      destinationRecords.push(...scenarioRecords);
      resourceResults.push({
        resource_name: mapping.resource_name,
        source_legacy_key: mapping.legacy_key,
        destination_store: mapping.destination_store,
        status: "COPIED",
        source_present: true,
        destination_record_count: scenarioRecords.length,
      });
      continue;
    }

    if (mapping.destination_store === "workspaceState") {
      destinationRecords.push({
        id: mapping.deterministic_id,
        migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
        shadow_copy: true,
        source_legacy_key: mapping.legacy_key,
        constituency_key: "p134",
        parliament_code: "P134",
        workspace_type: mapping.workspace_type,
        created_at: generatedTimestamp,
        updated_at: generatedTimestamp,
        source_signature: createPipStatewideShadowSignature(
          parsedValue
        ),
        payload: parsedValue,
      });

      resourceResults.push({
        resource_name: mapping.resource_name,
        source_legacy_key: mapping.legacy_key,
        destination_store: mapping.destination_store,
        status: "COPIED",
        source_present: true,
        destination_record_count: 1,
      });
      continue;
    }

    destinationRecords.push({
      id: mapping.deterministic_id,
      migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
      shadow_copy: true,
      source_legacy_key: mapping.legacy_key,
      constituency_key: "p134",
      parliament_code: "P134",
      resource_type: mapping.resource_type,
      status: mapping.status ?? "SHADOW_BACKUP",
      created_at: generatedTimestamp,
      updated_at: generatedTimestamp,
      source_signature: createPipStatewideShadowSignature(
        parsedValue
      ),
      payload: parsedValue,
    });

    resourceResults.push({
      resource_name: mapping.resource_name,
      source_legacy_key: mapping.legacy_key,
      destination_store: mapping.destination_store,
      status: "COPIED",
      source_present: true,
      destination_record_count: 1,
    });
  }

  const destinationRecordIds = destinationRecords.map(
    (entry) => String(entry?.id ?? "")
  );

  if (!ensureStringArrayUnique(destinationRecordIds)) {
    throw new Error(
      "Statewide shadow migration plan rejected duplicate destination IDs."
    );
  }

  const destinationStoreCounts =
    PIP_STATEWIDE_SHADOW_DESTINATION_STORES.reduce(
      (accumulator, storeName) => {
        accumulator[storeName] = destinationRecords.filter(
          (record) => {
            const mapping = getStoreMap().get(
              String(record?.source_legacy_key ?? "")
            );
            return mapping?.destination_store === storeName;
          }
        ).length;
        return accumulator;
      },
      {}
    );

  const sourcePresentCount = resourceResults.filter(
    (entry) => entry.source_present === true
  ).length;

  const sourceMissingCount = resourceResults.filter(
    (entry) => entry.status === "SKIPPED_MISSING"
  ).length;

  const scenarioCount = destinationRecords.filter((entry) =>
    String(entry?.id ?? "").startsWith("shadow:p134:scenario:")
  ).length;

  return {
    schema: PIP_STATEWIDE_SHADOW_MIGRATION_SCHEMA,
    migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
    generated_at:
      normalizeIsoTimestamp(generatedAt) ??
      new Date().toISOString(),
    compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
    cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    constituency_key: "p134",
    parliament_code: "P134",
    source: records.map((entry) => ({
      key: String(entry?.key ?? ""),
      label: String(entry?.label ?? ""),
      category: String(entry?.category ?? ""),
      present: entry?.present === true,
      raw_character_count: Number(
        entry?.raw_character_count ?? 0
      ),
      estimated_bytes: Number(entry?.estimated_bytes ?? 0),
    })),
    backup: {
      status: String(verifiedBackupReceipt.status ?? ""),
      exact_readback_verified:
        verifiedBackupReceipt.exact_readback_verified === true,
      signature: String(verifiedBackupReceipt.signature ?? ""),
      verified_at: String(
        verifiedBackupReceipt.verified_at ?? ""
      ),
    },
    resource_results: resourceResults,
    destination_records: destinationRecords,
    destination_store_counts: destinationStoreCounts,
    source_signature: sourceSignature,
    destination_signature:
      buildDestinationSignature(destinationRecords),
    safety: buildPlanSafety(),
    summary: {
      source_definition_count:
        PIP_STATEWIDE_SHADOW_RESOURCE_MAPPINGS.length,
      source_present_count: sourcePresentCount,
      source_missing_count: sourceMissingCount,
      source_invalid_count: 0,
      scenario_count: scenarioCount,
      destination_record_count: destinationRecords.length,
      destination_store_count: Object.values(
        destinationStoreCounts
      ).filter((value) => Number(value) > 0).length,
      skipped_resource_count: sourceMissingCount,
      blocked_resource_count: 0,
    },
  };
}

export function validatePipStatewideShadowMigrationPlan(plan) {
  const safePlan = isPlainObject(plan) ? plan : {};

  const destinationRecords = Array.isArray(
    safePlan.destination_records
  )
    ? safePlan.destination_records
    : [];

  const resourceResults = Array.isArray(
    safePlan.resource_results
  )
    ? safePlan.resource_results
    : [];

  const destinationStoreCounts = isPlainObject(
    safePlan.destination_store_counts
  )
    ? safePlan.destination_store_counts
    : {};

  const safety = isPlainObject(safePlan.safety)
    ? safePlan.safety
    : {};

  const summary = isPlainObject(safePlan.summary)
    ? safePlan.summary
    : {};

  const destinationIds = destinationRecords.map((entry) =>
    String(entry?.id ?? "")
  );

  const destinationStores = destinationRecords.map((entry) => {
    const mapping = getStoreMap().get(
      String(entry?.source_legacy_key ?? "")
    );
    return String(mapping?.destination_store ?? "");
  });

  const blockedResourceCount = resourceResults.filter(
    (entry) =>
      entry?.status === "BLOCKED" || entry?.status === "INVALID"
  ).length;

  const scenarioCount = destinationRecords.filter((entry) =>
    String(entry?.id ?? "").startsWith("shadow:p134:scenario:")
  ).length;

  const destinationSignatureExpected =
    buildDestinationSignature(destinationRecords);

  const checks = {
    schema_valid:
      safePlan.schema === PIP_STATEWIDE_SHADOW_MIGRATION_SCHEMA,
    migration_id_valid:
      safePlan.migration_id ===
      PIP_STATEWIDE_SHADOW_MIGRATION_ID,
    generated_at_iso_valid:
      normalizeIsoTimestamp(safePlan.generated_at) !== null,
    source_signature_valid: isValidShadowSignature(
      safePlan.source_signature
    ),
    destination_signature_valid: isValidShadowSignature(
      safePlan.destination_signature
    ),
    destination_signature_matches:
      safePlan.destination_signature ===
      destinationSignatureExpected,
    backup_verified:
      safePlan?.backup?.status === "VERIFIED" &&
      safePlan?.backup?.exact_readback_verified === true,
    source_signature_matches_backup:
      safePlan?.backup?.signature === safePlan.source_signature,
    no_invalid_or_blocked_resources:
      blockedResourceCount === 0 &&
      resourceResults.every((entry) =>
        SHADOW_STATUS_VALUES.has(
          String(entry?.status ?? "")
        )
      ),
    destination_ids_unique:
      ensureStringArrayUnique(destinationIds),
    destination_stores_permitted: destinationStores.every(
      (storeName) =>
        PIP_STATEWIDE_SHADOW_DESTINATION_STORES.includes(
          storeName
        ) &&
        !FORBIDDEN_DESTINATION_STORES.includes(storeName)
    ),
    destination_store_counts_match:
      PIP_STATEWIDE_SHADOW_DESTINATION_STORES.every(
        (storeName) => {
          const actual = destinationStores.filter(
            (entry) => entry === storeName
          ).length;
          return (
            Number(destinationStoreCounts[storeName] ?? 0) ===
            actual
          );
        }
      ),
    summary_counts_match:
      Number(summary.destination_record_count ?? 0) ===
        destinationRecords.length &&
      Number(summary.scenario_count ?? 0) === scenarioCount &&
      Number(summary.blocked_resource_count ?? 0) === 0 &&
      Number(summary.source_invalid_count ?? 0) === 0,
    destination_records_target_p134: destinationRecords.every(
      (entry) =>
        String(entry?.constituency_key ?? "") === "p134" &&
        String(entry?.parliament_code ?? "") === "P134"
    ),
    destination_records_shadow_flag: destinationRecords.every(
      (entry) => entry?.shadow_copy === true
    ),
    destination_records_migration_id: destinationRecords.every(
      (entry) =>
        String(entry?.migration_id ?? "") ===
        PIP_STATEWIDE_SHADOW_MIGRATION_ID
    ),
    cutover_disabled:
      safePlan.cutover_enabled === false &&
      PIP_STORAGE_CUTOVER_ENABLED === false,
    required_safety_invariants: REQUIRED_PLAN_SAFETY_FLAGS.every(
      (flag) => safety[flag] === true
    ),
    compatibility_mode_valid:
      safePlan.compatibility_mode ===
        "LEGACY_READ_WRITE" &&
      PIP_STORAGE_COMPATIBILITY_MODE ===
        "LEGACY_READ_WRITE",
  };

  const errors = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(
      ([name]) =>
        `Statewide shadow migration plan check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      destination_record_count: destinationRecords.length,
      scenario_count: scenarioCount,
      destination_store_count: Object.values(
        destinationStoreCounts
      ).filter((value) => Number(value) > 0).length,
    },
  };
}

export async function inspectPipStatewideShadowMigration({
  indexedDb,
  migrationId,
} = {}) {
  const targetMigrationId =
    String(migrationId ?? PIP_STATEWIDE_SHADOW_MIGRATION_ID) ||
    PIP_STATEWIDE_SHADOW_MIGRATION_ID;

  const database = await openPipStatewideDatabase({ indexedDb });

  try {
    const schemaInspection = inspectPipStatewideDatabaseSchema(
      database
    );

    const readStoreRecords = async (storeName) => {
      const tx = database.transaction([storeName], "readonly");
      const records = await iterateStoreRecords(
        tx.objectStore(storeName)
      );
      await transactionToPromise(tx);
      return records;
    };

    const readReceiptById = async (receiptId) => {
      const tx = database.transaction(
        ["migrationReceipts"],
        "readonly"
      );
      const record = await requestToPromise(
        tx.objectStore("migrationReceipts").get(receiptId)
      );
      await transactionToPromise(tx);
      return record;
    };

    const scenarioRecords = await readStoreRecords(
      "scenarioLibrary"
    );
    const workspaceRecords = await readStoreRecords(
      "workspaceState"
    );
    const recoveryRecords = await readStoreRecords(
      "recoveryCheckpoints"
    );

    const migrationReceipt = await readReceiptById(
      targetMigrationId
    );
    const rollbackReceipt = await readReceiptById(
      PIP_STATEWIDE_SHADOW_ROLLBACK_ID
    );

    const copiedRecords = [
      ...scenarioRecords,
      ...workspaceRecords,
      ...recoveryRecords,
    ].filter(
      (entry) =>
        entry?.migration_id === targetMigrationId &&
        entry?.shadow_copy === true
    );

    const storeCounts = {
      scenarioLibrary: scenarioRecords.filter(
        (entry) =>
          entry?.migration_id === targetMigrationId &&
          entry?.shadow_copy === true
      ).length,
      workspaceState: workspaceRecords.filter(
        (entry) =>
          entry?.migration_id === targetMigrationId &&
          entry?.shadow_copy === true
      ).length,
      recoveryCheckpoints: recoveryRecords.filter(
        (entry) =>
          entry?.migration_id === targetMigrationId &&
          entry?.shadow_copy === true
      ).length,
      migrationReceipts: migrationReceipt ? 1 : 0,
    };

    const destinationSignature =
      copiedRecords.length > 0
        ? buildDestinationSignature(copiedRecords)
        : null;

    const verified =
      migrationReceipt?.status === "VERIFIED" &&
      migrationReceipt?.migration_id === targetMigrationId &&
      migrationReceipt?.application_read_cutover_enabled ===
        false &&
      migrationReceipt?.application_write_cutover_enabled ===
        false &&
      migrationReceipt?.automatic_fallback_enabled === false &&
      Number(migrationReceipt?.destination_record_count ?? 0) ===
        copiedRecords.length &&
      String(migrationReceipt?.destination_signature ?? "") ===
        String(destinationSignature ?? "");

    const rolledBack =
      migrationReceipt?.status === "ROLLED_BACK" ||
      rollbackReceipt?.status === "ROLLED_BACK";

    return {
      schema_valid: schemaInspection.schema_valid === true,
      migration_id: targetMigrationId,
      migration_receipt: migrationReceipt ?? null,
      rollback_receipt: rollbackReceipt ?? null,
      copied_records: copiedRecords,
      store_counts: storeCounts,
      destination_record_count: copiedRecords.length,
      destination_signature: destinationSignature,
      verified,
      rolled_back: Boolean(rolledBack),
    };
  } finally {
    database.close();
  }
}

export async function executePipStatewideShadowMigration({
  plan,
  indexedDb,
  executedAt,
}) {
  const planValidation =
    validatePipStatewideShadowMigrationPlan(plan);

  if (planValidation.valid !== true) {
    throw new Error(
      `Statewide shadow migration execution blocked: ${
        planValidation.errors?.[0] ??
        "Invalid migration plan."
      }`
    );
  }

  if (PIP_STORAGE_COMPATIBILITY_MODE !== "LEGACY_READ_WRITE") {
    throw new Error(
      "Statewide shadow migration execution blocked: compatibility mode must remain LEGACY_READ_WRITE."
    );
  }

  if (PIP_STORAGE_CUTOVER_ENABLED !== false) {
    throw new Error(
      "Statewide shadow migration execution blocked: cutover must remain disabled."
    );
  }

  const database = await openPipStatewideDatabase({ indexedDb });

  try {
    const schemaInspection = inspectPipStatewideDatabaseSchema(
      database
    );

    if (schemaInspection.schema_valid !== true) {
      throw new Error(
        "Statewide shadow migration execution blocked: statewide schema inspection failed."
      );
    }

    const startedAt =
      normalizeIsoTimestamp(executedAt) ?? new Date().toISOString();

    const transaction = database.transaction(
      PIP_STATEWIDE_SHADOW_DESTINATION_STORES,
      "readwrite"
    );

    const scenarioStore = transaction.objectStore(
      "scenarioLibrary"
    );
    const workspaceStore = transaction.objectStore(
      "workspaceState"
    );
    const recoveryStore = transaction.objectStore(
      "recoveryCheckpoints"
    );
    const receiptStore = transaction.objectStore(
      "migrationReceipts"
    );

    const schemaReceipt = await requestToPromise(
      receiptStore.get(PIP_STATEWIDE_SCHEMA_RECEIPT_ID)
    );

    if (
      !schemaReceipt ||
      schemaReceipt.status !== "APPLIED" ||
      schemaReceipt.schema_valid !== true ||
      schemaReceipt.data_copy_performed !== false ||
      schemaReceipt.legacy_data_modified !== false ||
      schemaReceipt.application_read_cutover_enabled !== false ||
      schemaReceipt.application_write_cutover_enabled !== false
    ) {
      throw new Error(
        "Statewide shadow migration execution blocked: statewide schema receipt validation failed."
      );
    }

    const existingMigrationReceipt = await requestToPromise(
      receiptStore.get(PIP_STATEWIDE_SHADOW_MIGRATION_ID)
    );

    if (
      existingMigrationReceipt?.status === "VERIFIED" &&
      String(existingMigrationReceipt?.source_signature ?? "") !==
        String(plan.source_signature ?? "")
    ) {
      throw new Error(
        "Statewide shadow migration execution blocked: existing verified receipt uses a different source signature. Roll back or run a later refresh migration batch."
      );
    }

    const storeByName = {
      scenarioLibrary: scenarioStore,
      workspaceState: workspaceStore,
      recoveryCheckpoints: recoveryStore,
    };

    let existingIdCount = 0;
    const copiedRecordIds = [];

    for (const record of plan.destination_records) {
      const sourceKey = String(record?.source_legacy_key ?? "");
      const mapping = getStoreMap().get(sourceKey);
      const destinationStore = String(
        mapping?.destination_store ?? ""
      );
      validateShadowStoreName(destinationStore);

      const store = storeByName[destinationStore];

      if (!store) {
        throw new Error(
          `Statewide shadow migration execution blocked: missing destination store ${destinationStore}.`
        );
      }

      const existing = await requestToPromise(
        store.get(record.id)
      );

      if (existing) {
        const sameMigration =
          existing.migration_id ===
            PIP_STATEWIDE_SHADOW_MIGRATION_ID &&
          existing.shadow_copy === true;

        if (!sameMigration) {
          throw new Error(
            `Statewide shadow migration execution blocked: conflicting non-migration record exists for id ${record.id}.`
          );
        }

        existingIdCount += 1;
      }

      store.put(record);
      copiedRecordIds.push(record.id);
    }

    const completedAt = new Date().toISOString();
    const destinationSignature = buildDestinationSignature(
      plan.destination_records
    );

    const migrationReceipt = {
      id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
      schema: PIP_STATEWIDE_SHADOW_MIGRATION_RECEIPT_SCHEMA,
      migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
      migration_type: "SHADOW_COPY",
      status: "VERIFIED",
      started_at: startedAt,
      completed_at: completedAt,
      constituency_key: "p134",
      parliament_code: "P134",
      source_signature: plan.source_signature,
      destination_signature: destinationSignature,
      backup_signature: String(plan?.backup?.signature ?? ""),
      backup_verified: true,
      source_resource_count: Number(
        plan?.summary?.source_definition_count ?? 0
      ),
      destination_record_count: plan.destination_records.length,
      destination_store_counts: {
        ...plan.destination_store_counts,
      },
      copied_record_ids: [...copiedRecordIds],
      shadow_copy_only: true,
      data_copy_performed: true,
      legacy_data_modified: false,
      automatic_fallback_enabled: false,
      application_read_cutover_enabled: false,
      application_write_cutover_enabled: false,
      compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    };

    receiptStore.put(migrationReceipt);

    await transactionToPromise(transaction);

    const inspection = await inspectPipStatewideShadowMigration({
      indexedDb,
      migrationId: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
    });

    const receiptReadback = inspection.migration_receipt;
    const verified =
      inspection.verified === true &&
      receiptReadback?.status === "VERIFIED" &&
      Number(inspection.destination_record_count) ===
        plan.destination_records.length &&
      String(inspection.destination_signature ?? "") ===
        String(destinationSignature);

    if (!verified) {
      throw new Error(
        "Statewide shadow migration verification failed after write commit."
      );
    }

    return {
      executed: true,
      verified: true,
      idempotent: existingIdCount === plan.destination_records.length,
      plan_validation: planValidation,
      schema_inspection: {
        schema_valid: schemaInspection.schema_valid,
      },
      migration_receipt: receiptReadback,
      store_counts: inspection.store_counts,
      destination_record_count:
        inspection.destination_record_count,
      destination_signature: inspection.destination_signature,
      legacy_data_modified: false,
      application_read_cutover_enabled: false,
      application_write_cutover_enabled: false,
      automatic_fallback_enabled: false,
    };
  } finally {
    database.close();
  }
}

export async function rollbackPipStatewideShadowMigration({
  indexedDb,
  rolledBackAt,
} = {}) {
  const database = await openPipStatewideDatabase({ indexedDb });

  try {
    const precheckTransaction = database.transaction(
      ["migrationReceipts"],
      "readonly"
    );

    const existingReceipt = await requestToPromise(
      precheckTransaction
        .objectStore("migrationReceipts")
        .get(PIP_STATEWIDE_SHADOW_MIGRATION_ID)
    );

    const existingRollbackReceipt = await requestToPromise(
      precheckTransaction
        .objectStore("migrationReceipts")
        .get(PIP_STATEWIDE_SHADOW_ROLLBACK_ID)
    );

    const schemaReceipt = await requestToPromise(
      precheckTransaction
        .objectStore("migrationReceipts")
        .get(PIP_STATEWIDE_SCHEMA_RECEIPT_ID)
    );

    await transactionToPromise(precheckTransaction);

    if (!existingReceipt) {
      throw new Error(
        "Statewide shadow rollback blocked: no migration receipt exists."
      );
    }

    if (
      existingReceipt.status !== "VERIFIED" &&
      existingReceipt.status !== "ROLLED_BACK"
    ) {
      throw new Error(
        "Statewide shadow rollback blocked: migration receipt is not verified."
      );
    }

    if (existingReceipt.status === "ROLLED_BACK") {
      return {
        rolled_back: true,
        rollback_receipt: existingRollbackReceipt ?? null,
        deleted_record_count: Number(
          existingRollbackReceipt?.deleted_record_count ?? 0
        ),
        deleted_store_counts: isPlainObject(
          existingRollbackReceipt?.deleted_store_counts
        )
          ? existingRollbackReceipt.deleted_store_counts
          : {
              scenarioLibrary: 0,
              workspaceState: 0,
              recoveryCheckpoints: 0,
            },
        schema_receipt_preserved: Boolean(schemaReceipt),
        unrelated_records_preserved: true,
        legacy_data_modified: false,
        cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
      };
    }

    const copiedRecordIds = Array.isArray(
      existingReceipt.copied_record_ids
    )
      ? existingReceipt.copied_record_ids
      : [];

    const ownershipPlan = new Map();

    for (const recordId of copiedRecordIds) {
      const candidates = [
        "scenarioLibrary",
        "workspaceState",
        "recoveryCheckpoints",
      ];

      for (const storeName of candidates) {
        const readTx = database.transaction(
          [storeName],
          "readonly"
        );

        const record = await requestToPromise(
          readTx.objectStore(storeName).get(recordId)
        );

        await transactionToPromise(readTx);

        if (!record) {
          continue;
        }

        if (
          record.shadow_copy !== true ||
          record.migration_id !==
            PIP_STATEWIDE_SHADOW_MIGRATION_ID
        ) {
          throw new Error(
            `Statewide shadow rollback blocked: non-owned record encountered for id ${recordId}.`
          );
        }

        ownershipPlan.set(recordId, {
          store_name: storeName,
        });
        break;
      }
    }

    const tx = database.transaction(
      PIP_STATEWIDE_SHADOW_DESTINATION_STORES,
      "readwrite"
    );

    const scenarioStore = tx.objectStore("scenarioLibrary");
    const workspaceStore = tx.objectStore("workspaceState");
    const recoveryStore = tx.objectStore("recoveryCheckpoints");
    const receiptStore = tx.objectStore("migrationReceipts");

    const deletedStoreCounts = {
      scenarioLibrary: 0,
      workspaceState: 0,
      recoveryCheckpoints: 0,
    };

    for (const recordId of copiedRecordIds) {
      const ownership = ownershipPlan.get(recordId);
      if (!ownership) {
        continue;
      }

      if (ownership.store_name === "scenarioLibrary") {
        scenarioStore.delete(recordId);
        deletedStoreCounts.scenarioLibrary += 1;
      } else if (ownership.store_name === "workspaceState") {
        workspaceStore.delete(recordId);
        deletedStoreCounts.workspaceState += 1;
      } else if (
        ownership.store_name === "recoveryCheckpoints"
      ) {
        recoveryStore.delete(recordId);
        deletedStoreCounts.recoveryCheckpoints += 1;
      }
    }

    const rolledBackAtIso =
      normalizeIsoTimestamp(rolledBackAt) ??
      new Date().toISOString();

    const updatedMigrationReceipt = {
      id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
      schema: PIP_STATEWIDE_SHADOW_MIGRATION_RECEIPT_SCHEMA,
      migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
      migration_type: "SHADOW_COPY",
      status: "ROLLED_BACK",
      started_at: String(existingReceipt.started_at ?? ""),
      completed_at: String(existingReceipt.completed_at ?? ""),
      constituency_key: "p134",
      parliament_code: "P134",
      source_signature: String(
        existingReceipt.source_signature ?? ""
      ),
      destination_signature: String(
        existingReceipt.destination_signature ?? ""
      ),
      backup_signature: String(
        existingReceipt.backup_signature ?? ""
      ),
      backup_verified: true,
      source_resource_count: Number(
        existingReceipt.source_resource_count ?? 0
      ),
      destination_record_count: Number(
        existingReceipt.destination_record_count ?? 0
      ),
      destination_store_counts: isPlainObject(
        existingReceipt.destination_store_counts
      )
        ? { ...existingReceipt.destination_store_counts }
        : {
            scenarioLibrary: 0,
            workspaceState: 0,
            recoveryCheckpoints: 0,
            migrationReceipts: 0,
          },
      copied_record_ids: Array.isArray(
        existingReceipt.copied_record_ids
      )
        ? [...existingReceipt.copied_record_ids]
        : [],
      shadow_copy_only: true,
      data_copy_performed: true,
      rolled_back_at: rolledBackAtIso,
      application_read_cutover_enabled: false,
      application_write_cutover_enabled: false,
      automatic_fallback_enabled: false,
      legacy_data_modified: false,
      compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    };

    const rollbackReceipt = {
      id: PIP_STATEWIDE_SHADOW_ROLLBACK_ID,
      schema: PIP_STATEWIDE_SHADOW_ROLLBACK_RECEIPT_SCHEMA,
      migration_id: PIP_STATEWIDE_SHADOW_ROLLBACK_ID,
      target_migration_id: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
      rollback_id: PIP_STATEWIDE_SHADOW_ROLLBACK_ID,
      status: "ROLLED_BACK",
      rolled_back_at: rolledBackAtIso,
      deleted_record_count:
        deletedStoreCounts.scenarioLibrary +
        deletedStoreCounts.workspaceState +
        deletedStoreCounts.recoveryCheckpoints,
      deleted_store_counts: deletedStoreCounts,
      schema_receipt_preserved: true,
      unrelated_records_preserved: true,
      legacy_data_modified: false,
      application_read_cutover_enabled: false,
      application_write_cutover_enabled: false,
      automatic_fallback_enabled: false,
    };

    receiptStore.put(updatedMigrationReceipt);
    receiptStore.put(rollbackReceipt);

    await transactionToPromise(tx);

    const inspection = await inspectPipStatewideShadowMigration({
      indexedDb,
      migrationId: PIP_STATEWIDE_SHADOW_MIGRATION_ID,
    });

    const schemaTx = database.transaction(
      ["migrationReceipts"],
      "readonly"
    );
    const schemaReceiptReadback = await requestToPromise(
      schemaTx
        .objectStore("migrationReceipts")
        .get(PIP_STATEWIDE_SCHEMA_RECEIPT_ID)
    );
    await transactionToPromise(schemaTx);

    if (inspection.destination_record_count !== 0) {
      throw new Error(
        "Statewide shadow rollback verification failed: migration records still exist."
      );
    }

    if (!schemaReceiptReadback) {
      throw new Error(
        "Statewide shadow rollback verification failed: statewide schema receipt was not preserved."
      );
    }

    return {
      rolled_back: true,
      rollback_receipt: rollbackReceipt,
      deleted_record_count: rollbackReceipt.deleted_record_count,
      deleted_store_counts: rollbackReceipt.deleted_store_counts,
      schema_receipt_preserved: true,
      unrelated_records_preserved: true,
      legacy_data_modified: false,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    };
  } finally {
    database.close();
  }
}

export function resolvePipStatewideShadowFallbackPolicy({
  legacyAvailable,
  shadowVerified,
  cutoverEnabled,
}) {
  const legacyOnline = legacyAvailable === true;
  const shadowReady = shadowVerified === true;
  const cutoverActive = cutoverEnabled === true;

  if (legacyOnline) {
    return {
      status: "LEGACY_ACTIVE",
      active_read_source: "LEGACY",
      shadow_recovery_available: shadowReady,
      automatic_fallback_enabled: false,
      manual_recovery_required: false,
      cutover_enabled: cutoverActive,
    };
  }

  if (!legacyOnline && shadowReady) {
    return {
      status: "MANUAL_RECOVERY_AVAILABLE",
      active_read_source: "NONE",
      shadow_recovery_available: true,
      automatic_fallback_enabled: false,
      manual_recovery_required: true,
      cutover_enabled: cutoverActive,
    };
  }

  return {
    status: "RECOVERY_BLOCKED",
    active_read_source: "NONE",
    shadow_recovery_available: false,
    automatic_fallback_enabled: false,
    manual_recovery_required: true,
    cutover_enabled: cutoverActive,
  };
}
