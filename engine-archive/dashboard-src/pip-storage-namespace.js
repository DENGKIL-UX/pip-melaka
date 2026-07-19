export const PIP_STORAGE_NAMESPACE_SCHEMA =
  "pip.storage.namespace-manifest.v1";

export const PIP_STORAGE_NAMESPACE_VERSION = 1;

export const PIP_STORAGE_COMPATIBILITY_MODE =
  "LEGACY_READ_WRITE";

export const PIP_STORAGE_CUTOVER_ENABLED = false;

export const PIP_STORAGE_PREFIXES = {
  legacy: "pip-p134-",
  statewide: "pip-",
};

export const PIP_STORAGE_DATABASES = {
  legacy: {
    name: "pip-p134-dashboard-db",
    version: 1,
    store_name: "keyValue",
  },
  statewide: {
    name: "pip-dashboard-db",
    version: 1,
    stores: [
      "constituencyBundles",
      "scenarioLibrary",
      "workspaceState",
      "reconciliationEvidence",
      "cachedSignals",
      "cachedSnapshots",
      "pendingSync",
      "recoveryCheckpoints",
      "migrationReceipts",
    ],
  },
};

export const PIP_STORAGE_KEYS = {
  comparisonBasket: {
    logical_name: "comparisonBasket",
    legacy: "pip-p134-comparison-localities-v1",
    statewide: "pip-comparison-localities-v1",
    medium: "localStorage",
  },
  comparisonWorkspaceVisibility: {
    logical_name: "comparisonWorkspaceVisibility",
    legacy: "pip-p134-comparison-workspace-visible-v1",
    statewide: "pip-comparison-workspace-visible-v1",
    medium: "localStorage",
  },
  scenarioLibrary: {
    logical_name: "scenarioLibrary",
    legacy: "pip-p134-saved-comparison-scenarios-v1",
    statewide: "pip-scenario-library-v1",
    medium: "localStorage",
  },
  scenarioAuditLog: {
    logical_name: "scenarioAuditLog",
    legacy: "pip-p134-saved-scenario-audit-log-v1",
    statewide: "pip-scenario-audit-log-v1",
    medium: "localStorage",
  },
  scenarioAuditArchiveReceipt: {
    logical_name: "scenarioAuditArchiveReceipt",
    legacy: "pip-p134-saved-scenario-audit-archive-receipt-v1",
    statewide: "pip-scenario-audit-archive-receipt-v1",
    medium: "localStorage",
  },
  scenarioAuditRestoreRollback: {
    logical_name: "scenarioAuditRestoreRollback",
    legacy: "pip-p134-saved-scenario-audit-restore-rollback-v1",
    statewide: "pip-scenario-audit-restore-rollback-v1",
    medium: "localStorage",
  },
  scenarioAuditRestoreReceipt: {
    logical_name: "scenarioAuditRestoreReceipt",
    legacy: "pip-p134-saved-scenario-audit-restore-receipt-v1",
    statewide: "pip-scenario-audit-restore-receipt-v1",
    medium: "localStorage",
  },
  governanceSession: {
    logical_name: "governanceSession",
    legacy: "pip-p134-governance-session-id-v1",
    statewide: "pip-governance-session-id-v1",
    medium: "sessionStorage",
  },
  scenarioSyncReceipt: {
    logical_name: "scenarioSyncReceipt",
    legacy: "pip-p134-scenario-sync-receipt-v1",
    statewide: "pip-scenario-sync-receipt-v1",
    medium: "localStorage",
  },
  scenarioSyncRollback: {
    logical_name: "scenarioSyncRollback",
    legacy: "pip-p134-scenario-sync-rollback-v1",
    statewide: "pip-scenario-sync-rollback-v1",
    medium: "localStorage",
  },
};

export const PIP_STORAGE_SCHEMAS = {
  filteredLocalities: {
    logical_name: "filteredLocalities",
    legacy: "pip.p134.filtered-localities.v1",
    statewide: "pip.filtered-localities.v1",
  },
  localityComparisonPriority: {
    logical_name: "localityComparisonPriority",
    legacy: "pip.p134.locality-comparison-priority.v1",
    statewide: "pip.locality-comparison-priority.v1",
  },
  localityRecommendation: {
    logical_name: "localityRecommendation",
    legacy: "pip.p134.locality-recommendation.v1",
    statewide: "pip.locality-recommendation.v1",
  },
  persistenceMigrationPreview: {
    logical_name: "persistenceMigrationPreview",
    legacy: "pip.p134.persistence-migration-preview.v1",
    statewide: "pip.persistence-migration-preview.v1",
  },
  preMigrationBackupReceipt: {
    logical_name: "preMigrationBackupReceipt",
    legacy: "pip.p134.pre-migration-backup-receipt.v1",
    statewide: "pip.pre-migration-backup-receipt.v1",
  },
  preMigrationBackup: {
    logical_name: "preMigrationBackup",
    legacy: "pip.p134.pre-migration-backup.v1",
    statewide: "pip.pre-migration-backup.v1",
  },
  savedComparisonScenarioBundle: {
    logical_name: "savedComparisonScenarioBundle",
    legacy: "pip.p134.saved-comparison-scenario-bundle.v1",
    statewide: "pip.saved-comparison-scenario-bundle.v1",
  },
  savedComparisonScenario: {
    logical_name: "savedComparisonScenario",
    legacy: "pip.p134.saved-comparison-scenario.v1",
    statewide: "pip.saved-comparison-scenario.v1",
  },
  scenarioAuditArchiveReceipt: {
    logical_name: "scenarioAuditArchiveReceipt",
    legacy: "pip.p134.saved-scenario-audit-archive-receipt.v1",
    statewide: "pip.saved-scenario-audit-archive-receipt.v1",
  },
  scenarioAuditArchive: {
    logical_name: "scenarioAuditArchive",
    legacy: "pip.p134.saved-scenario-audit-archive.v1",
    statewide: "pip.saved-scenario-audit-archive.v1",
  },
  scenarioAuditLog: {
    logical_name: "scenarioAuditLog",
    legacy: "pip.p134.saved-scenario-audit-log.v1",
    statewide: "pip.saved-scenario-audit-log.v1",
  },
  scenarioAuditRestoreReceipt: {
    logical_name: "scenarioAuditRestoreReceipt",
    legacy: "pip.p134.saved-scenario-audit-restore-receipt.v1",
    statewide: "pip.saved-scenario-audit-restore-receipt.v1",
  },
  scenarioAuditRestoreRollback: {
    logical_name: "scenarioAuditRestoreRollback",
    legacy: "pip.p134.saved-scenario-audit-restore-rollback.v1",
    statewide: "pip.saved-scenario-audit-restore-rollback.v1",
  },
  scenarioRecoveryCheckpoint: {
    logical_name: "scenarioRecoveryCheckpoint",
    legacy:
      "pip.p134.saved-scenario-cutover-recovery-checkpoint.v1",
    statewide:
      "pip.saved-scenario-cutover-recovery-checkpoint.v1",
  },
  scenarioLegacyRetentionReceipt: {
    logical_name: "scenarioLegacyRetentionReceipt",
    legacy:
      "pip.p134.saved-scenario-legacy-retention-receipt.v1",
    statewide:
      "pip.saved-scenario-legacy-retention-receipt.v1",
  },
  scenarioLibraryMigrationReceipt: {
    logical_name: "scenarioLibraryMigrationReceipt",
    legacy:
      "pip.p134.saved-scenario-library-migration-receipt.v1",
    statewide:
      "pip.saved-scenario-library-migration-receipt.v1",
  },
  scenarioLibraryReadCutoverReceipt: {
    logical_name: "scenarioLibraryReadCutoverReceipt",
    legacy:
      "pip.p134.saved-scenario-library-read-cutover-receipt.v1",
    statewide:
      "pip.saved-scenario-library-read-cutover-receipt.v1",
  },
  scenarioLibraryRecord: {
    logical_name: "scenarioLibraryRecord",
    legacy: "pip.p134.saved-scenario-library-record.v1",
    statewide: "pip.saved-scenario-library-record.v1",
  },
  scenarioGovernanceChange: {
    logical_name: "scenarioGovernanceChange",
    legacy: "pip.p134.scenario-governance-change.v1",
    statewide: "pip.scenario-governance-change.v1",
  },
  scenarioLibraryAuditReport: {
    logical_name: "scenarioLibraryAuditReport",
    legacy: "pip.p134.scenario-library-audit-report.v1",
    statewide: "pip.scenario-library-audit-report.v1",
  },
  scenarioLifecycleEvent: {
    logical_name: "scenarioLifecycleEvent",
    legacy: "pip.p134.scenario-lifecycle-event.v1",
    statewide: "pip.scenario-lifecycle-event.v1",
  },
  scenarioSyncReceipt: {
    logical_name: "scenarioSyncReceipt",
    legacy: "pip.p134.scenario-sync-receipt.v1",
    statewide: "pip.scenario-sync-receipt.v1",
  },
  scenarioSyncRollback: {
    logical_name: "scenarioSyncRollback",
    legacy: "pip.p134.scenario-sync-rollback.v1",
    statewide: "pip.scenario-sync-rollback.v1",
  },
};

export const PIP_STORAGE_RESERVED_RESOURCE_KEYS = [
  "constituencyBundles",
  "scenarioLibrary",
  "workspaceState",
  "reconciliationEvidence",
  "cachedSignals",
  "cachedSnapshots",
  "pendingSync",
  "recoveryCheckpoints",
  "migrationReceipts",
];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function listStorageKeyMappings() {
  return Object.values(PIP_STORAGE_KEYS).map((entry) => ({
    ...entry,
  }));
}

function listSchemaMappings() {
  return Object.values(PIP_STORAGE_SCHEMAS).map((entry) => ({
    ...entry,
  }));
}

function resolveMappingOrThrow(collection, logicalName, typeLabel) {
  const key = String(logicalName ?? "").trim();
  const entry = collection[key];

  if (!entry) {
    throw new Error(
      `Unsupported ${typeLabel} logical name: ${key || "<empty>"}`
    );
  }

  return entry;
}

export function resolvePipLegacyStorageKey(logicalName) {
  return resolveMappingOrThrow(
    PIP_STORAGE_KEYS,
    logicalName,
    "storage key"
  ).legacy;
}

export function resolvePipStatewideStorageKey(logicalName) {
  return resolveMappingOrThrow(
    PIP_STORAGE_KEYS,
    logicalName,
    "storage key"
  ).statewide;
}

export function resolvePipLegacySchema(logicalName) {
  return resolveMappingOrThrow(
    PIP_STORAGE_SCHEMAS,
    logicalName,
    "schema"
  ).legacy;
}

export function resolvePipStatewideSchema(logicalName) {
  return resolveMappingOrThrow(
    PIP_STORAGE_SCHEMAS,
    logicalName,
    "schema"
  ).statewide;
}

export function buildPipStorageNamespaceManifest({
  browserDbReceiptKeys,
} = {}) {
  const safeBrowserDbReceiptKeys = isPlainObject(
    browserDbReceiptKeys
  )
    ? { ...browserDbReceiptKeys }
    : {};

  const storageKeyMappings = listStorageKeyMappings();
  const schemaMappings = listSchemaMappings();

  const safetyInvariants = {
    legacy_records_remain_authoritative: true,
    statewide_writes_are_disabled: true,
    no_automatic_deletion_is_permitted: true,
    no_automatic_key_renaming_is_permitted: true,
    migration_requires_verified_backup: true,
    migration_requires_separate_activation_batch: true,
    rollback_must_remain_available: true,
  };

  const migrationControls = {
    active_migration: false,
    active_cutover: false,
    automatic_deletion: false,
    automatic_key_renaming: false,
  };

  return {
    schema: PIP_STORAGE_NAMESPACE_SCHEMA,
    version: PIP_STORAGE_NAMESPACE_VERSION,
    generated_at: new Date().toISOString(),
    compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
    cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    prefixes: {
      legacy: PIP_STORAGE_PREFIXES.legacy,
      statewide: PIP_STORAGE_PREFIXES.statewide,
    },
    databases: {
      legacy: { ...PIP_STORAGE_DATABASES.legacy },
      statewide: {
        ...PIP_STORAGE_DATABASES.statewide,
        stores: [...PIP_STORAGE_DATABASES.statewide.stores],
      },
    },
    storage_key_mappings: storageKeyMappings,
    schema_mappings: schemaMappings,
    browser_db_receipt_key_inventory: safeBrowserDbReceiptKeys,
    reserved_resource_keys: [
      ...PIP_STORAGE_RESERVED_RESOURCE_KEYS,
    ],
    safety_invariants: safetyInvariants,
    migration_controls: migrationControls,
    summary: {
      storage_key_mapping_count: storageKeyMappings.length,
      schema_mapping_count: schemaMappings.length,
      receipt_key_count: Object.keys(
        safeBrowserDbReceiptKeys
      ).length,
      reserved_store_count:
        PIP_STORAGE_RESERVED_RESOURCE_KEYS.length,
      compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    },
  };
}

export function validatePipStorageNamespaceManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  const storageKeyMappings = Array.isArray(
    safeManifest.storage_key_mappings
  )
    ? safeManifest.storage_key_mappings
    : [];

  const schemaMappings = Array.isArray(safeManifest.schema_mappings)
    ? safeManifest.schema_mappings
    : [];

  const reservedResourceKeys = Array.isArray(
    safeManifest.reserved_resource_keys
  )
    ? safeManifest.reserved_resource_keys
    : [];

  const browserDbReceiptKeyInventory = isPlainObject(
    safeManifest.browser_db_receipt_key_inventory
  )
    ? safeManifest.browser_db_receipt_key_inventory
    : {};

  const summary = isPlainObject(safeManifest.summary)
    ? safeManifest.summary
    : {};

  const safetyInvariants = isPlainObject(
    safeManifest.safety_invariants
  )
    ? safeManifest.safety_invariants
    : {};

  const statewideStores = Array.isArray(
    safeManifest?.databases?.statewide?.stores
  )
    ? safeManifest.databases.statewide.stores
    : [];

  const migrationControls = isPlainObject(
    safeManifest.migration_controls
  )
    ? safeManifest.migration_controls
    : {};

  const legacyKeys = storageKeyMappings.map((entry) =>
    String(entry?.legacy ?? "")
  );

  const statewideKeys = storageKeyMappings.map((entry) =>
    String(entry?.statewide ?? "")
  );

  const legacySchemas = schemaMappings.map((entry) =>
    String(entry?.legacy ?? "")
  );

  const statewideSchemas = schemaMappings.map((entry) =>
    String(entry?.statewide ?? "")
  );

  const checks = {
    schema:
      safeManifest.schema === PIP_STORAGE_NAMESPACE_SCHEMA,
    version:
      Number(safeManifest.version) ===
      PIP_STORAGE_NAMESPACE_VERSION,
    generatedTimestamp: Number.isFinite(
      Date.parse(safeManifest.generated_at)
    ),
    compatibilityMode:
      safeManifest.compatibility_mode ===
      "LEGACY_READ_WRITE",
    cutoverDisabled: safeManifest.cutover_enabled === false,
    distinctPrefixes:
      String(safeManifest?.prefixes?.legacy ?? "").length > 0 &&
      String(safeManifest?.prefixes?.statewide ?? "").length >
        0 &&
      safeManifest.prefixes.legacy !==
        safeManifest.prefixes.statewide,
    distinctDatabaseNames:
      String(safeManifest?.databases?.legacy?.name ?? "").length >
        0 &&
      String(safeManifest?.databases?.statewide?.name ?? "")
        .length > 0 &&
      safeManifest.databases.legacy.name !==
        safeManifest.databases.statewide.name,
    everyStorageMappingHasLogicalName:
      storageKeyMappings.length > 0 &&
      storageKeyMappings.every(
        (entry) => String(entry?.logical_name ?? "").length > 0
      ),
    everySchemaMappingHasLogicalName:
      schemaMappings.length > 0 &&
      schemaMappings.every(
        (entry) => String(entry?.logical_name ?? "").length > 0
      ),
    legacyKeysUnique:
      new Set(legacyKeys).size === legacyKeys.length,
    statewideKeysUnique:
      new Set(statewideKeys).size === statewideKeys.length,
    noLegacyEqualsStatewideKey: storageKeyMappings.every(
      (entry) =>
        String(entry?.legacy ?? "") !==
        String(entry?.statewide ?? "")
    ),
    allowedStorageMediums: storageKeyMappings.every(
      (entry) =>
        entry?.medium === "localStorage" ||
        entry?.medium === "sessionStorage"
    ),
    legacySchemasPrefixed: legacySchemas.every((value) =>
      value.startsWith("pip.p134.")
    ),
    statewideSchemasPrefixed: statewideSchemas.every((value) =>
      value.startsWith("pip.")
    ),
    statewideSchemasExcludeP134: statewideSchemas.every(
      (value) => !value.startsWith("pip.p134.")
    ),
    mappingCountsAgree:
      Number(summary.storage_key_mapping_count) ===
        storageKeyMappings.length &&
      Number(summary.schema_mapping_count) ===
        schemaMappings.length,
    reservedCountsAgree:
      Number(summary.reserved_store_count) ===
      reservedResourceKeys.length,
    statewideStoresUniqueAndNonEmpty:
      statewideStores.length > 0 &&
      statewideStores.every(
        (storeName) =>
          typeof storeName === "string" &&
          storeName.trim().length > 0
      ) &&
      new Set(statewideStores).size === statewideStores.length,
    requiredSafetyInvariants:
      safetyInvariants.legacy_records_remain_authoritative ===
        true &&
      safetyInvariants.statewide_writes_are_disabled === true &&
      safetyInvariants.no_automatic_deletion_is_permitted ===
        true &&
      safetyInvariants.no_automatic_key_renaming_is_permitted ===
        true &&
      safetyInvariants.migration_requires_verified_backup ===
        true &&
      safetyInvariants.migration_requires_separate_activation_batch ===
        true &&
      safetyInvariants.rollback_must_remain_available === true,
    noActiveMigrationOrCutoverInstruction:
      migrationControls.active_migration === false &&
      migrationControls.active_cutover === false &&
      migrationControls.automatic_deletion === false &&
      migrationControls.automatic_key_renaming === false,
  };

  const errors = [];

  Object.entries(checks).forEach(([checkName, passed]) => {
    if (!passed) {
      errors.push(
        `Storage namespace check failed: ${checkName}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      storage_key_mapping_count: storageKeyMappings.length,
      schema_mapping_count: schemaMappings.length,
      receipt_key_count: Object.keys(browserDbReceiptKeyInventory)
        .length,
      reserved_store_count: reservedResourceKeys.length,
      compatibility_mode: String(
        safeManifest.compatibility_mode ?? ""
      ),
      cutover_enabled: safeManifest.cutover_enabled === true,
    },
  };
}
