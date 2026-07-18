import {
  PIP_STORAGE_COMPATIBILITY_MODE,
  PIP_STORAGE_CUTOVER_ENABLED,
  PIP_STORAGE_DATABASES,
} from "./pip-storage-namespace.js";

export const PIP_STATEWIDE_DATABASE_SCHEMA =
  "pip.storage.statewide-database-schema.v1";

export const PIP_STATEWIDE_DATABASE_RECEIPT_SCHEMA =
  "pip.storage.statewide-database-schema-receipt.v1";

export const PIP_STATEWIDE_DATABASE_SCHEMA_VERSION =
  PIP_STORAGE_DATABASES.statewide.version;

const STATEWIDE_MIGRATION_ID = "statewide-schema-v1";

const STORE_DEFINITION_PAIRS = [
  [
    "constituencyBundles",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_constituency_key",
          keyPath: "constituency_key",
          unique: false,
        },
        {
          name: "by_parliament_code",
          keyPath: "parliament_code",
          unique: false,
        },
        {
          name: "by_dataset_id",
          keyPath: "dataset_id",
          unique: false,
        },
        {
          name: "by_updated_at",
          keyPath: "updated_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "scenarioLibrary",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_constituency_key",
          keyPath: "constituency_key",
          unique: false,
        },
        {
          name: "by_workflow_status",
          keyPath: "workflow_status",
          unique: false,
        },
        {
          name: "by_updated_at",
          keyPath: "updated_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "workspaceState",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_workspace_type",
          keyPath: "workspace_type",
          unique: false,
        },
        {
          name: "by_constituency_key",
          keyPath: "constituency_key",
          unique: false,
        },
        {
          name: "by_updated_at",
          keyPath: "updated_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "reconciliationEvidence",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_parliament_code",
          keyPath: "parliament_code",
          unique: false,
        },
        {
          name: "by_reconciliation_status",
          keyPath: "reconciliation_status",
          unique: false,
        },
        {
          name: "by_generated_at",
          keyPath: "generated_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "cachedSignals",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_platform",
          keyPath: "platform",
          unique: false,
        },
        {
          name: "by_parliament_code",
          keyPath: "parliament_code",
          unique: false,
        },
        {
          name: "by_captured_at",
          keyPath: "captured_at",
          unique: false,
        },
        {
          name: "by_signal_status",
          keyPath: "signal_status",
          unique: false,
        },
      ],
    },
  ],
  [
    "cachedSnapshots",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_snapshot_type",
          keyPath: "snapshot_type",
          unique: false,
        },
        {
          name: "by_parliament_code",
          keyPath: "parliament_code",
          unique: false,
        },
        {
          name: "by_generated_at",
          keyPath: "generated_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "pendingSync",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_status",
          keyPath: "status",
          unique: false,
        },
        {
          name: "by_resource_type",
          keyPath: "resource_type",
          unique: false,
        },
        {
          name: "by_next_attempt_at",
          keyPath: "next_attempt_at",
          unique: false,
        },
        {
          name: "by_updated_at",
          keyPath: "updated_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "recoveryCheckpoints",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_resource_type",
          keyPath: "resource_type",
          unique: false,
        },
        {
          name: "by_status",
          keyPath: "status",
          unique: false,
        },
        {
          name: "by_created_at",
          keyPath: "created_at",
          unique: false,
        },
      ],
    },
  ],
  [
    "migrationReceipts",
    {
      keyPath: "id",
      autoIncrement: false,
      indexes: [
        {
          name: "by_migration_id",
          keyPath: "migration_id",
          unique: true,
        },
        {
          name: "by_status",
          keyPath: "status",
          unique: false,
        },
        {
          name: "by_created_at",
          keyPath: "created_at",
          unique: false,
        },
      ],
    },
  ],
];

export const PIP_STATEWIDE_DATABASE_STORE_DEFINITIONS =
  Object.freeze(
    Object.fromEntries(
      STORE_DEFINITION_PAIRS.map(([storeName, definition]) => [
        storeName,
        {
          keyPath: definition.keyPath,
          autoIncrement: definition.autoIncrement,
          indexes: definition.indexes.map((indexDefinition) => ({
            ...indexDefinition,
          })),
        },
      ])
    )
  );

export const PIP_STATEWIDE_DATABASE_MIGRATIONS = Object.freeze([
  {
    migration_id: STATEWIDE_MIGRATION_ID,
    from_version: 0,
    to_version: 1,
    operation: "CREATE_STORES_AND_INDEXES",
    destructive: false,
    copies_legacy_data: false,
    activates_cutover: false,
    store_names: [...PIP_STORAGE_DATABASES.statewide.stores],
  },
]);

const REQUIRED_SAFETY_INVARIANTS = [
  "schema_creation_non_destructive",
  "legacy_database_remains_authoritative",
  "no_legacy_records_are_copied",
  "no_legacy_records_are_modified",
  "no_legacy_database_is_deleted",
  "statewide_application_writes_remain_disabled",
  "statewide_application_reads_remain_disabled",
  "cutover_requires_later_batch",
  "rollback_planning_remains_required",
];

function normalizeIsoTimestamp(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return null;
  }

  return new Date(Date.parse(value)).toISOString();
}

function createSchemaStoreDefinitionsSnapshot() {
  return STORE_DEFINITION_PAIRS.map(
    ([storeName, definition]) => ({
      store_name: storeName,
      key_path: definition.keyPath,
      auto_increment: definition.autoIncrement,
      indexes: definition.indexes.map((indexDefinition) => ({
        index_name: indexDefinition.name,
        key_path: indexDefinition.keyPath,
        unique: indexDefinition.unique,
      })),
    })
  );
}

function countStoreIndexes(stores) {
  return stores.reduce(
    (sum, store) =>
      sum +
      (Array.isArray(store?.indexes)
        ? store.indexes.length
        : 0),
    0
  );
}

function createManifestSummary({ stores, migrations }) {
  const indexCount = countStoreIndexes(stores);
  const destructiveMigrationCount = migrations.filter(
    (entry) => entry?.destructive === true
  ).length;

  return {
    database_name: PIP_STORAGE_DATABASES.statewide.name,
    database_version: PIP_STATEWIDE_DATABASE_SCHEMA_VERSION,
    store_count: stores.length,
    index_count: indexCount,
    migration_count: migrations.length,
    destructive_migration_count: destructiveMigrationCount,
    compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
    cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
  };
}

function normalizeStoreNames(value) {
  return Array.isArray(value)
    ? value
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0)
    : [];
}

function isBoolean(value) {
  return value === true || value === false;
}

function createSafetyInvariants() {
  return {
    schema_creation_non_destructive: true,
    legacy_database_remains_authoritative: true,
    no_legacy_records_are_copied: true,
    no_legacy_records_are_modified: true,
    no_legacy_database_is_deleted: true,
    statewide_application_writes_remain_disabled: true,
    statewide_application_reads_remain_disabled: true,
    cutover_requires_later_batch: true,
    rollback_planning_remains_required: true,
  };
}

function hasUniqueValues(values) {
  return new Set(values).size === values.length;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error instanceof Error
          ? request.error
          : new Error("IndexedDB request failed.")
      );
    };
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onabort = () => {
      reject(
        transaction.error instanceof Error
          ? transaction.error
          : new Error("IndexedDB transaction aborted.")
      );
    };

    transaction.onerror = () => {
      reject(
        transaction.error instanceof Error
          ? transaction.error
          : new Error("IndexedDB transaction failed.")
      );
    };
  });
}

function validateMigrationDefinition(migration) {
  const expectedStoreNames = [
    ...PIP_STORAGE_DATABASES.statewide.stores,
  ];

  if (
    !migration ||
    typeof migration !== "object" ||
    String(migration.migration_id ?? "").trim().length === 0
  ) {
    throw new Error(
      "Invalid statewide migration definition: migration_id is required."
    );
  }

  if (
    !Number.isInteger(migration.from_version) ||
    !Number.isInteger(migration.to_version) ||
    migration.to_version <= migration.from_version
  ) {
    throw new Error(
      `Invalid statewide migration definition ${migration.migration_id}: version path is invalid.`
    );
  }

  if (
    migration.destructive !== false ||
    migration.copies_legacy_data !== false ||
    migration.activates_cutover !== false
  ) {
    throw new Error(
      `Invalid statewide migration definition ${migration.migration_id}: migration safety invariants are violated.`
    );
  }

  const storeNames = normalizeStoreNames(
    migration.store_names
  );

  if (
    storeNames.length !== expectedStoreNames.length ||
    JSON.stringify(storeNames) !==
      JSON.stringify(expectedStoreNames)
  ) {
    throw new Error(
      `Invalid statewide migration definition ${migration.migration_id}: store_names do not match reserved statewide stores.`
    );
  }
}

function storeHasName(storeNames, targetName) {
  return storeNames.some(
    (entry) => String(entry) === String(targetName)
  );
}

export function buildPipStatewideDatabaseSchemaManifest({
  generatedAt,
} = {}) {
  const stores = createSchemaStoreDefinitionsSnapshot();
  const migrations = PIP_STATEWIDE_DATABASE_MIGRATIONS.map(
    (entry) => ({
      ...entry,
      store_names: normalizeStoreNames(entry.store_names),
    })
  );

  return {
    schema: PIP_STATEWIDE_DATABASE_SCHEMA,
    generated_at:
      normalizeIsoTimestamp(generatedAt) ??
      new Date().toISOString(),
    database_name: PIP_STORAGE_DATABASES.statewide.name,
    database_version: PIP_STATEWIDE_DATABASE_SCHEMA_VERSION,
    compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
    cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
    stores,
    migrations,
    safety: createSafetyInvariants(),
    summary: createManifestSummary({ stores, migrations }),
  };
}

export function validatePipStatewideDatabaseSchemaManifest(
  manifest
) {
  const errors = [];

  const safeManifest =
    manifest && typeof manifest === "object"
      ? manifest
      : {};

  const stores = Array.isArray(safeManifest.stores)
    ? safeManifest.stores
    : [];

  const migrations = Array.isArray(safeManifest.migrations)
    ? safeManifest.migrations
    : [];

  const safety =
    safeManifest.safety &&
    typeof safeManifest.safety === "object"
      ? safeManifest.safety
      : {};

  const summary =
    safeManifest.summary &&
    typeof safeManifest.summary === "object"
      ? safeManifest.summary
      : {};

  const storeNames = stores.map((store) =>
    String(store?.store_name ?? "").trim()
  );

  const expectedStoreNames = [
    ...PIP_STORAGE_DATABASES.statewide.stores,
  ];

  const storeNamesMatchReserved =
    JSON.stringify(storeNames) ===
    JSON.stringify(expectedStoreNames);

  const storesHaveRequiredShape = stores.every((store) => {
    const indexes = Array.isArray(store?.indexes)
      ? store.indexes
      : [];
    const indexNames = indexes.map((entry) =>
      String(entry?.index_name ?? "").trim()
    );

    const indexNamesUnique =
      indexNames.length > 0 &&
      hasUniqueValues(indexNames) &&
      indexNames.every((entry) => entry.length > 0);

    const indexKeyPathsValid = indexes.every(
      (entry) =>
        typeof entry?.key_path === "string" &&
        entry.key_path.trim().length > 0
    );

    const indexUniqueFlagsBoolean = indexes.every((entry) =>
      isBoolean(entry?.unique)
    );

    return (
      typeof store?.store_name === "string" &&
      store.store_name.trim().length > 0 &&
      store.key_path === "id" &&
      store.auto_increment === false &&
      indexNamesUnique &&
      indexKeyPathsValid &&
      indexUniqueFlagsBoolean
    );
  });

  const containsMigrationReceipts = stores.some(
    (store) => store?.store_name === "migrationReceipts"
  );

  const migrationsSorted = [...migrations].sort(
    (left, right) =>
      Number(left?.from_version ?? 0) -
      Number(right?.from_version ?? 0)
  );

  const migrationSafetyValid = migrationsSorted.every(
    (migration) => {
      try {
        validateMigrationDefinition(migration);
        return true;
      } catch {
        return false;
      }
    }
  );

  const migrationContinuous = migrationsSorted.every(
    (migration, index) => {
      if (index === 0) {
        return migration.from_version === 0;
      }

      return (
        migration.from_version ===
        migrationsSorted[index - 1].to_version
      );
    }
  );

  const migrationHighestToVersion = migrationsSorted.length
    ? migrationsSorted[migrationsSorted.length - 1].to_version
    : 0;

  const highestMatchesSchemaVersion =
    migrationHighestToVersion ===
    PIP_STATEWIDE_DATABASE_SCHEMA_VERSION;

  const migrationAllNonDestructive = migrationsSorted.every(
    (entry) => entry?.destructive === false
  );

  const migrationNoLegacyCopy = migrationsSorted.every(
    (entry) => entry?.copies_legacy_data === false
  );

  const migrationNoCutoverActivation =
    migrationsSorted.every(
      (entry) => entry?.activates_cutover === false
    );

  const expectedIndexCount = stores.reduce(
    (sum, store) =>
      sum +
      (Array.isArray(store?.indexes)
        ? store.indexes.length
        : 0),
    0
  );

  const destructiveMigrationCount = migrationsSorted.filter(
    (entry) => entry?.destructive === true
  ).length;

  const requiredSafetyInvariantsValid =
    REQUIRED_SAFETY_INVARIANTS.every(
      (entry) => safety[entry] === true
    );

  const checks = {
    schema_valid:
      safeManifest.schema ===
      PIP_STATEWIDE_DATABASE_SCHEMA,
    generated_at_iso_valid:
      typeof safeManifest.generated_at === "string" &&
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    database_name_valid:
      safeManifest.database_name ===
      PIP_STORAGE_DATABASES.statewide.name,
    database_version_valid:
      safeManifest.database_version ===
      PIP_STORAGE_DATABASES.statewide.version,
    compatibility_mode_valid:
      safeManifest.compatibility_mode ===
        "LEGACY_READ_WRITE" &&
      PIP_STORAGE_COMPATIBILITY_MODE ===
        "LEGACY_READ_WRITE",
    cutover_disabled:
      safeManifest.cutover_enabled === false &&
      PIP_STORAGE_CUTOVER_ENABLED === false,
    store_count_valid: stores.length === 9,
    store_names_unique:
      storeNames.length === 9 && hasUniqueValues(storeNames),
    store_names_match_reserved: storeNamesMatchReserved,
    store_shape_valid: storesHaveRequiredShape,
    migration_receipts_store_present:
      containsMigrationReceipts,
    migration_non_destructive:
      migrationAllNonDestructive,
    migration_no_legacy_copy: migrationNoLegacyCopy,
    migration_no_cutover_activation:
      migrationNoCutoverActivation,
    migration_definition_valid: migrationSafetyValid,
    migration_continuous: migrationContinuous,
    migration_starts_at_zero:
      migrationsSorted.length > 0 &&
      migrationsSorted[0].from_version === 0,
    migration_targets_database_version:
      highestMatchesSchemaVersion,
    summary_counts_valid:
      summary.database_name ===
        PIP_STORAGE_DATABASES.statewide.name &&
      summary.database_version ===
        PIP_STORAGE_DATABASES.statewide.version &&
      summary.store_count === 9 &&
      summary.index_count === expectedIndexCount &&
      summary.migration_count === migrationsSorted.length &&
      summary.destructive_migration_count ===
        destructiveMigrationCount &&
      summary.compatibility_mode ===
        "LEGACY_READ_WRITE" &&
      summary.cutover_enabled === false,
    safety_invariants_valid: requiredSafetyInvariantsValid,
  };

  Object.entries(checks).forEach(([key, passed]) => {
    if (!passed) {
      errors.push(
        `Statewide schema manifest check failed: ${key}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      store_count: stores.length,
      index_count: expectedIndexCount,
      migration_count: migrationsSorted.length,
      destructive_migration_count: destructiveMigrationCount,
      migration_highest_to_version: migrationHighestToVersion,
    },
  };
}

export function applyPipStatewideDatabaseMigrations({
  database,
  transaction,
  oldVersion,
  newVersion,
}) {
  if (!database || !transaction) {
    throw new Error(
      "Statewide migration requires database and transaction."
    );
  }

  const fromVersion = Number.isInteger(oldVersion)
    ? oldVersion
    : Number(oldVersion ?? 0);
  const targetVersion = Number.isInteger(newVersion)
    ? newVersion
    : Number(newVersion ?? PIP_STATEWIDE_DATABASE_SCHEMA_VERSION);

  const selectedMigrations =
    PIP_STATEWIDE_DATABASE_MIGRATIONS.filter(
      (migration) =>
        migration.from_version >= fromVersion &&
        migration.to_version <= targetVersion
    ).sort(
      (left, right) =>
        left.from_version - right.from_version
    );

  selectedMigrations.forEach((migration) => {
    validateMigrationDefinition(migration);

    const storeNames = normalizeStoreNames(
      migration.store_names
    );

    storeNames.forEach((storeName) => {
      const storeDefinition =
        PIP_STATEWIDE_DATABASE_STORE_DEFINITIONS[
          storeName
        ];

      if (!storeDefinition) {
        throw new Error(
          `Invalid statewide migration definition ${migration.migration_id}: unknown store ${storeName}.`
        );
      }

      const hasStore = storeHasName(
        Array.from(database.objectStoreNames),
        storeName
      );

      const objectStore = hasStore
        ? transaction.objectStore(storeName)
        : database.createObjectStore(storeName, {
            keyPath: storeDefinition.keyPath,
            autoIncrement: storeDefinition.autoIncrement,
          });

      const discoveredIndexNames = Array.from(
        objectStore.indexNames
      );

      storeDefinition.indexes.forEach((indexDefinition) => {
        if (
          !storeHasName(
            discoveredIndexNames,
            indexDefinition.name
          )
        ) {
          objectStore.createIndex(
            indexDefinition.name,
            indexDefinition.keyPath,
            {
              unique: indexDefinition.unique,
            }
          );
        }
      });
    });
  });
}

export function openPipStatewideDatabase({
  indexedDb,
  onBlocked,
} = {}) {
  const databaseFactory =
    indexedDb ?? globalThis?.indexedDB;

  if (!databaseFactory) {
    return Promise.reject(
      new Error("IndexedDB is unavailable in this environment.")
    );
  }

  return new Promise((resolve, reject) => {
    const openRequest = databaseFactory.open(
      PIP_STORAGE_DATABASES.statewide.name,
      PIP_STATEWIDE_DATABASE_SCHEMA_VERSION
    );

    openRequest.onupgradeneeded = (event) => {
      try {
        applyPipStatewideDatabaseMigrations({
          database: openRequest.result,
          transaction: openRequest.transaction,
          oldVersion: event?.oldVersion ?? 0,
          newVersion:
            event?.newVersion ??
            PIP_STATEWIDE_DATABASE_SCHEMA_VERSION,
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error(
                "Statewide database upgrade failed."
              )
        );
      }
    };

    openRequest.onerror = () => {
      reject(
        openRequest.error instanceof Error
          ? openRequest.error
          : new Error("Failed to open statewide IndexedDB.")
      );
    };

    openRequest.onblocked = (event) => {
      if (typeof onBlocked === "function") {
        onBlocked(event);
      }

      reject(
        new Error(
          "Statewide IndexedDB open request is blocked by another connection."
        )
      );
    };

    openRequest.onsuccess = () => {
      const database = openRequest.result;
      database.onversionchange = () => {
        database.close();
      };
      resolve(database);
    };
  });
}

export function inspectPipStatewideDatabaseSchema(database) {
  if (!database) {
    throw new Error(
      "Database handle is required for statewide schema inspection."
    );
  }

  const expectedStores =
    createSchemaStoreDefinitionsSnapshot();

  const discoveredStoreNames = Array.from(
    database.objectStoreNames
  );

  const unexpectedStoreNames = discoveredStoreNames.filter(
    (storeName) =>
      !storeHasName(
        PIP_STORAGE_DATABASES.statewide.stores,
        storeName
      )
  );

  const presentStoreNames = expectedStores
    .map((entry) => entry.store_name)
    .filter((storeName) =>
      storeHasName(discoveredStoreNames, storeName)
    );

  const transaction =
    presentStoreNames.length > 0
      ? database.transaction(presentStoreNames, "readonly")
      : null;

  const storeResults = expectedStores.map((storeDefinition) => {
    const storeName = storeDefinition.store_name;
    const present = storeHasName(
      discoveredStoreNames,
      storeName
    );

    if (!present || !transaction) {
      return {
        store_name: storeName,
        present,
        key_path: null,
        auto_increment: null,
        expected_indexes: storeDefinition.indexes.map(
          (indexDefinition) => indexDefinition.index_name
        ),
        discovered_indexes: [],
        missing_indexes: storeDefinition.indexes.map(
          (indexDefinition) => indexDefinition.index_name
        ),
        unexpected_indexes: [],
        indexes_valid: false,
      };
    }

    const objectStore = transaction.objectStore(storeName);
    const discoveredIndexes = Array.from(
      objectStore.indexNames
    );
    const expectedIndexes = storeDefinition.indexes.map(
      (indexDefinition) => indexDefinition.index_name
    );

    const missingIndexes = expectedIndexes.filter(
      (indexName) =>
        !storeHasName(discoveredIndexes, indexName)
    );

    const unexpectedIndexes = discoveredIndexes.filter(
      (indexName) =>
        !storeHasName(expectedIndexes, indexName)
    );

    const normalizedKeyPath = Array.isArray(objectStore.keyPath)
      ? objectStore.keyPath.join("|")
      : objectStore.keyPath;

    return {
      store_name: storeName,
      present,
      key_path: normalizedKeyPath,
      auto_increment: objectStore.autoIncrement,
      expected_indexes: expectedIndexes,
      discovered_indexes: discoveredIndexes,
      missing_indexes: missingIndexes,
      unexpected_indexes: unexpectedIndexes,
      indexes_valid:
        String(normalizedKeyPath) === "id" &&
        objectStore.autoIncrement === false &&
        missingIndexes.length === 0 &&
        unexpectedIndexes.length === 0,
    };
  });

  const discoveredIndexCount = storeResults.reduce(
    (sum, storeResult) =>
      sum +
      (Array.isArray(storeResult.discovered_indexes)
        ? storeResult.discovered_indexes.length
        : 0),
    0
  );

  const expectedIndexCount = storeResults.reduce(
    (sum, storeResult) =>
      sum +
      (Array.isArray(storeResult.expected_indexes)
        ? storeResult.expected_indexes.length
        : 0),
    0
  );

  const allStoresPresent = storeResults.every(
    (storeResult) => storeResult.present === true
  );

  const allIndexesPresent = storeResults.every(
    (storeResult) =>
      storeResult.missing_indexes.length === 0
  );

  const schemaValid =
    allStoresPresent &&
    allIndexesPresent &&
    unexpectedStoreNames.length === 0 &&
    storeResults.every(
      (storeResult) => storeResult.indexes_valid === true
    );

  return {
    database_name: database.name,
    database_version: database.version,
    discovered_store_names: discoveredStoreNames,
    discovered_store_count: discoveredStoreNames.length,
    store_results: storeResults,
    expected_index_count: expectedIndexCount,
    discovered_index_count: discoveredIndexCount,
    all_stores_present: allStoresPresent,
    all_indexes_present: allIndexesPresent,
    unexpected_store_names: unexpectedStoreNames,
    schema_valid: schemaValid,
  };
}

export async function initializePipStatewideDatabaseSchema({
  indexedDb,
  generatedAt,
} = {}) {
  const manifest = buildPipStatewideDatabaseSchemaManifest({
    generatedAt,
  });

  const validation =
    validatePipStatewideDatabaseSchemaManifest(manifest);

  if (validation.valid !== true) {
    throw new Error(
      `Statewide schema manifest validation failed: ${
        validation.errors?.[0] ??
        "Unknown statewide schema validation error."
      }`
    );
  }

  const database = await openPipStatewideDatabase({
    indexedDb,
  });

  try {
    const inspection = inspectPipStatewideDatabaseSchema(
      database
    );

    if (inspection.schema_valid !== true) {
      throw new Error(
        "Statewide schema inspection failed: expected stores and indexes are not fully present."
      );
    }

    const receipt = {
      id: STATEWIDE_MIGRATION_ID,
      schema: PIP_STATEWIDE_DATABASE_RECEIPT_SCHEMA,
      migration_id: STATEWIDE_MIGRATION_ID,
      migration_type: "SCHEMA_INITIALISATION",
      database_name: PIP_STORAGE_DATABASES.statewide.name,
      database_version:
        PIP_STATEWIDE_DATABASE_SCHEMA_VERSION,
      status: "APPLIED",
      created_at: manifest.generated_at,
      compatibility_mode:
        PIP_STORAGE_COMPATIBILITY_MODE,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
      schema_store_count:
        manifest.summary?.store_count ?? 0,
      schema_index_count:
        manifest.summary?.index_count ?? 0,
      schema_valid: true,
      data_copy_performed: false,
      legacy_data_modified: false,
      application_read_cutover_enabled: false,
      application_write_cutover_enabled: false,
    };

    const writeTransaction = database.transaction(
      ["migrationReceipts"],
      "readwrite"
    );

    writeTransaction
      .objectStore("migrationReceipts")
      .put(receipt);

    await transactionToPromise(writeTransaction);

    const readTransaction = database.transaction(
      ["migrationReceipts"],
      "readonly"
    );

    const storedReceipt = await requestToPromise(
      readTransaction
        .objectStore("migrationReceipts")
        .get(STATEWIDE_MIGRATION_ID)
    );

    await transactionToPromise(readTransaction);

    const receiptVerified =
      storedReceipt?.id === STATEWIDE_MIGRATION_ID &&
      storedReceipt?.migration_id ===
        STATEWIDE_MIGRATION_ID &&
      storedReceipt?.status === "APPLIED" &&
      storedReceipt?.data_copy_performed === false &&
      storedReceipt?.legacy_data_modified === false &&
      storedReceipt?.application_read_cutover_enabled ===
        false &&
      storedReceipt?.application_write_cutover_enabled ===
        false;

    if (!receiptVerified) {
      throw new Error(
        "Statewide schema receipt verification failed."
      );
    }

    return {
      initialized: true,
      schema_valid: true,
      receipt_verified: true,
      manifest,
      inspection,
      receipt: storedReceipt,
      compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
      cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
      data_copy_performed: false,
      legacy_data_modified: false,
    };
  } finally {
    database.close();
  }
}
