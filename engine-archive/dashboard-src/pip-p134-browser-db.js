export const PIP_P134_DATABASE_NAME =
  "pip-p134-dashboard-db";

export const PIP_P134_DATABASE_VERSION =
  1;

export const PIP_P134_KEY_VALUE_STORE =
  "keyValue";

export const PIP_P134_PRE_MIGRATION_BACKUP_KEY =
  "__pip_p134_pre_migration_backup_v1__";

export const PIP_P134_PRE_MIGRATION_RECEIPT_KEY =
  "__pip_p134_pre_migration_backup_receipt_v1__";

export const PIP_P134_SAVED_SCENARIO_MIGRATION_RECEIPT_KEY =
  "__pip_p134_saved_scenario_library_migration_receipt_v1__";

export const PIP_P134_SAVED_SCENARIO_READ_CUTOVER_RECEIPT_KEY =
  "__pip_p134_saved_scenario_read_cutover_receipt_v1__";

export const PIP_P134_SAVED_SCENARIO_RECOVERY_CHECKPOINT_KEY =
  "__pip_p134_saved_scenario_cutover_recovery_checkpoint_v1__";

export const PIP_P134_SAVED_SCENARIO_LEGACY_RETENTION_RECEIPT_KEY =
  "__pip_p134_saved_scenario_legacy_retention_receipt_v1__";

export function createPipP134FNV1aSignature(
  value
) {
  const normalizedValue = String(value ?? "");
  let hash = 0x811c9dc5;

  for (
    let index = 0;
    index < normalizedValue.length;
    index += 1
  ) {
    hash ^= normalizedValue.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const hexHash = hash
    .toString(16)
    .padStart(8, "0")
    .slice(-8)
    .toLowerCase();

  return `fnv1a-${hexHash}`;
}

function isIndexedDbAvailable() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    window.indexedDB !== null
  );
}

function validatePipP134Key(key) {
  const normalizedKey = String(
    key ?? ""
  ).trim();

  if (!normalizedKey) {
    throw new Error(
      "IndexedDB key must be a non-empty string."
    );
  }

  return normalizedKey;
}

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

export function openPipP134Database() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(
        new Error(
          "IndexedDB is unavailable in this environment."
        )
      );

      return;
    }

    let settled = false;

    const request = window.indexedDB.open(
      PIP_P134_DATABASE_NAME,
      PIP_P134_DATABASE_VERSION
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(
          PIP_P134_KEY_VALUE_STORE
        )
      ) {
        database.createObjectStore(
          PIP_P134_KEY_VALUE_STORE,
          {
            keyPath: "key",
          }
        );
      }
    };

    request.onerror = () => {
      if (settled) {
        return;
      }

      settled = true;

      reject(
        request.error ||
          new Error(
            "Failed to open PIP P134 IndexedDB database."
          )
      );
    };

    request.onblocked = () => {
      if (settled) {
        return;
      }

      settled = true;

      reject(
        new Error(
          "IndexedDB open request was blocked by another open connection."
        )
      );
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }

      settled = true;

      const database = request.result;

      database.onversionchange = () => {
        database.close();
      };

      resolve(database);
    };
  });
}

function runPipP134Transaction(
  mode,
  operation
) {
  return openPipP134Database().then(
    (database) =>
      new Promise((resolve, reject) => {
        let settled = false;
        let operationResult;

        const transaction =
          database.transaction(
            PIP_P134_KEY_VALUE_STORE,
            mode
          );

        const store = transaction.objectStore(
          PIP_P134_KEY_VALUE_STORE
        );

        transaction.oncomplete = () => {
          database.close();

          if (settled) {
            return;
          }

          settled = true;
          resolve(operationResult);
        };

        transaction.onerror = () => {
          database.close();

          if (settled) {
            return;
          }

          settled = true;

          reject(
            transaction.error ||
              new Error(
                "IndexedDB transaction failed."
              )
          );
        };

        transaction.onabort = () => {
          database.close();

          if (settled) {
            return;
          }

          settled = true;

          reject(
            transaction.error ||
              new Error(
                "IndexedDB transaction was aborted."
              )
          );
        };

        try {
          const operationResponse =
            operation(store, transaction);

          Promise.resolve(operationResponse)
            .then((value) => {
              operationResult = value;
            })
            .catch((error) => {
              transaction.abort();

              if (!settled) {
                settled = true;
                database.close();
                reject(error);
              }
            });
        } catch (error) {
          transaction.abort();

          if (!settled) {
            settled = true;
            database.close();
            reject(error);
          }
        }
      })
  );
}

export function readPipP134DatabaseValue(
  key
) {
  const validatedKey =
    validatePipP134Key(key);

  return runPipP134Transaction(
    "readonly",
    (store) =>
      new Promise((resolve, reject) => {
        const request =
          store.get(validatedKey);

        request.onsuccess = () => {
          const record = request.result;
          resolve(
            record
              ? record.value
              : null
          );
        };

        request.onerror = () => {
          reject(
            request.error ||
              new Error(
                "IndexedDB read request failed."
              )
          );
        };
      })
  );
}

export function writePipP134DatabaseValue(
  key,
  value,
  metadata = null
) {
  const validatedKey =
    validatePipP134Key(key);

  const safeMetadata = isPlainObject(metadata)
    ? metadata
    : null;

  return runPipP134Transaction(
    "readwrite",
    (store) =>
      new Promise((resolve, reject) => {
        const nextRecord = {
          key: validatedKey,
          value,
          updated_at:
            new Date().toISOString(),
          metadata: safeMetadata,
        };

        const request =
          store.put(nextRecord);

        request.onsuccess = () => {
          resolve(nextRecord);
        };

        request.onerror = () => {
          reject(
            request.error ||
              new Error(
                "IndexedDB write request failed."
              )
          );
        };
      })
  );
}

export function deletePipP134DatabaseValue(
  key
) {
  const validatedKey =
    validatePipP134Key(key);

  return runPipP134Transaction(
    "readwrite",
    (store) =>
      new Promise((resolve, reject) => {
        const request =
          store.delete(validatedKey);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(
            request.error ||
              new Error(
                "IndexedDB delete request failed."
              )
          );
        };
      })
  );
}

export function listPipP134DatabaseRecords() {
  return runPipP134Transaction(
    "readonly",
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(
            Array.isArray(request.result)
              ? request.result
              : []
          );
        };

        request.onerror = () => {
          reject(
            request.error ||
              new Error(
                "IndexedDB list request failed."
              )
          );
        };
      })
  );
}

export function clearPipP134DatabaseStore() {
  return runPipP134Transaction(
    "readwrite",
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(
            request.error ||
              new Error(
                "IndexedDB clear request failed."
              )
          );
        };
      })
  );
}

export async function probePipP134Database() {
  const checkedAt =
    new Date().toISOString();

  const report = {
    supported: false,
    database_opened: false,
    write_passed: false,
    read_passed: false,
    delete_passed: false,
    probe_passed: false,
    checked_at: checkedAt,
    database_name: PIP_P134_DATABASE_NAME,
    database_version:
      PIP_P134_DATABASE_VERSION,
    store_name: PIP_P134_KEY_VALUE_STORE,
    error_message: null,
  };

  const healthcheckKey =
    "__pip_p134_healthcheck__";

  const nonce = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  let database = null;

  try {
    report.supported =
      isIndexedDbAvailable();

    if (!report.supported) {
      throw new Error(
        "IndexedDB is unavailable in this environment."
      );
    }

    database = await openPipP134Database();
    report.database_opened = true;

    database.close();
    database = null;

    await writePipP134DatabaseValue(
      healthcheckKey,
      {
        nonce,
      },
      {
        scope: "probe",
      }
    );
    report.write_passed = true;

    const readValue =
      await readPipP134DatabaseValue(
        healthcheckKey
      );

    if (
      !readValue ||
      readValue.nonce !== nonce
    ) {
      throw new Error(
        "IndexedDB probe read validation failed."
      );
    }

    report.read_passed = true;

    await deletePipP134DatabaseValue(
      healthcheckKey
    );

    const deletedValue =
      await readPipP134DatabaseValue(
        healthcheckKey
      );

    if (deletedValue !== null) {
      throw new Error(
        "IndexedDB probe record still exists after deletion."
      );
    }

    report.delete_passed = true;
    report.probe_passed = true;

    return report;
  } catch (error) {
    report.error_message =
      error instanceof Error
        ? error.message
        : "IndexedDB probe failed.";

    return report;
  } finally {
    if (database) {
      database.close();
    }
  }
}

export function estimatePipP134SerializedBytes(
  value
) {
  let serializedValue = "";

  try {
    serializedValue = JSON.stringify(value);
  } catch {
    serializedValue = String(value ?? "");
  }

  if (serializedValue === undefined) {
    serializedValue = "";
  }

  if (typeof TextEncoder !== "undefined") {
    const encodedValue =
      new TextEncoder().encode(
        serializedValue
      );

    return Math.max(
      0,
      Number(encodedValue.length || 0)
    );
  }

  if (typeof Blob !== "undefined") {
    return Math.max(
      0,
      Number(
        new Blob([serializedValue]).size || 0
      )
    );
  }

  return Math.max(
    0,
    Number(serializedValue.length || 0)
  );
}

export function formatPipP134StorageBytes(
  bytes
) {
  const normalizedBytes = Math.max(
    0,
    Number(bytes || 0)
  );

  if (normalizedBytes < 1024) {
    return `${normalizedBytes} B`;
  }

  if (normalizedBytes < 1024 * 1024) {
    return `${(
      normalizedBytes / 1024
    ).toFixed(2)} KB`;
  }

  return `${(
    normalizedBytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}
