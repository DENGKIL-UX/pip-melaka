import {
  createPipCentralStorageSignature,
  PIP_CENTRAL_STORAGE_MODE,
  PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA,
} from "./pip-central-storage-contract.js";
import {
  PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES,
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES,
} from "./pip-scenario-api-contract.js";

export const PIP_SCENARIO_SYNC_CONTRACT_SCHEMA =
  "pip.scenario-sync.contract.v1";

export const PIP_SCENARIO_SYNC_PLAN_SCHEMA =
  "pip.scenario-sync.plan.v1";

export const PIP_SCENARIO_SYNC_EXECUTION_SCHEMA =
  "pip.scenario-sync.execution.v1";

export const PIP_SCENARIO_SYNC_RECEIPT_SCHEMA =
  "pip.p134.scenario-sync-receipt.v1";

export const PIP_SCENARIO_SYNC_ROLLBACK_SCHEMA =
  "pip.p134.scenario-sync-rollback.v1";

export const PIP_SCENARIO_SYNC_VERSION = 1;

export const PIP_SCENARIO_SYNC_COLLECTION_ID_PREFIX =
  "pip-sync-library";

export const PIP_SCENARIO_SYNC_MODES = [
  "UPLOAD_LOCAL_TO_CENTRAL",
  "DOWNLOAD_CENTRAL_TO_LOCAL",
  "BIDIRECTIONAL_RECONCILE",
];

export const PIP_SCENARIO_SYNC_CONFLICT_POLICIES = [
  "MANUAL_REVIEW",
  "PREFER_LOCAL",
  "PREFER_CENTRAL",
  "PREFER_NEWEST",
];

export const PIP_SCENARIO_SYNC_ITEM_STATES = [
  "LOCAL_ONLY",
  "CENTRAL_ONLY",
  "IN_SYNC",
  "LOCAL_CHANGED",
  "CENTRAL_CHANGED",
  "DIVERGED",
  "LOCAL_MISSING",
  "CENTRAL_DELETED",
  "INVALID_LOCAL",
  "INVALID_CENTRAL",
  "SKIPPED_FIXTURE",
];

export const PIP_SCENARIO_SYNC_ACTIONS = [
  "CREATE_CENTRAL",
  "UPDATE_CENTRAL",
  "CREATE_LOCAL",
  "UPDATE_LOCAL",
  "NO_CHANGE",
  "MANUAL_CONFLICT",
  "SKIP",
  "UPSERT_COLLECTION",
];

export const PIP_SCENARIO_SYNC_MAX_LOCAL_SCENARIOS = 20;

export const PIP_SCENARIO_SYNC_MAX_CENTRAL_SCENARIOS = 100;

const FORBIDDEN_FIELD_NAME_SET = new Set(
  PIP_SCENARIO_API_FORBIDDEN_FIELD_NAMES.map((entry) =>
    String(entry).toLowerCase()
  )
);

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

function isValidSignature(value) {
  return /^fnv1a-[0-9a-f]{8}$/.test(String(value ?? ""));
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

function canonicalizePairs(pairs) {
  const source = Array.isArray(pairs) ? pairs : [];

  const normalized = source
    .map((entry) => {
      const safeEntry = isPlainObject(entry) ? entry : {};
      return {
        local_id: String(safeEntry.local_id ?? "").trim(),
        central_id: String(safeEntry.central_id ?? "").trim(),
        local_signature: String(
          safeEntry.local_signature ?? ""
        ).trim(),
        central_signature: String(
          safeEntry.central_signature ?? ""
        ).trim(),
        central_revision: Number(safeEntry.central_revision ?? 0),
        last_synced_at:
          normalizeIsoTimestamp(safeEntry.last_synced_at) ??
          null,
      };
    })
    .filter(
      (entry) =>
        entry.local_id.length > 0 && entry.central_id.length > 0
    )
    .sort((left, right) => {
      if (left.local_id !== right.local_id) {
        return left.local_id.localeCompare(right.local_id);
      }
      return left.central_id.localeCompare(right.central_id);
    });

  return normalized;
}

function validateConstituencyIdentity(receipt, checks, errors) {
  checks.constituency_key_valid =
    String(receipt.constituency_key ?? "") === "p134";
  checks.parliament_code_valid =
    /^P[0-9]{3}$/.test(
      String(receipt.parliament_code ?? "").trim()
    );

  if (checks.constituency_key_valid !== true) {
    errors.push("Sync receipt must be bound to constituency p134.");
  }

  if (checks.parliament_code_valid !== true) {
    errors.push("Sync receipt must include a valid parliament code.");
  }
}

export function createPipScenarioSyncSignature(value) {
  return createPipCentralStorageSignature(value);
}

export function createPipScenarioSyncCollectionId({
  constituencyKey,
}) {
  const normalizedConstituencyKey = String(
    constituencyKey ?? ""
  )
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(normalizedConstituencyKey)) {
    throw new Error("Invalid constituency key for sync collection id.");
  }

  const collectionId = `${PIP_SCENARIO_SYNC_COLLECTION_ID_PREFIX}-${normalizedConstituencyKey}`;

  if (collectionId.length > 160) {
    throw new Error("Sync collection id exceeds 160 characters.");
  }

  return collectionId;
}

export function normalizePipScenarioSyncReceipt(receipt, options = {}) {
  const source = isPlainObject(receipt) ? receipt : {};
  const generatedAt =
    normalizeIsoTimestamp(options.generatedAt) ?? new Date().toISOString();

  const normalized = {
    schema: PIP_SCENARIO_SYNC_RECEIPT_SCHEMA,
    version: PIP_SCENARIO_SYNC_VERSION,
    constituency_key: String(
      source.constituency_key ?? "p134"
    )
      .trim()
      .toLowerCase(),
    parliament_code: String(
      source.parliament_code ?? "P134"
    )
      .trim()
      .toUpperCase(),
    collection_id: String(source.collection_id ?? "").trim(),
    last_sync_id: String(source.last_sync_id ?? "").trim(),
    last_sync_mode: String(source.last_sync_mode ?? "").trim(),
    last_conflict_policy: String(
      source.last_conflict_policy ?? ""
    ).trim(),
    last_plan_signature: String(
      source.last_plan_signature ?? ""
    ).trim(),
    last_local_library_signature: String(
      source.last_local_library_signature ?? ""
    ).trim(),
    last_central_repository_signature: String(
      source.last_central_repository_signature ?? ""
    ).trim(),
    last_synced_at:
      normalizeIsoTimestamp(source.last_synced_at) ?? generatedAt,
    pairs: canonicalizePairs(source.pairs),
    receipt_signature: "",
  };

  if (!normalized.collection_id) {
    normalized.collection_id = createPipScenarioSyncCollectionId({
      constituencyKey: normalized.constituency_key,
    });
  }

  const signatureTarget = {
    ...normalized,
    receipt_signature: undefined,
  };

  normalized.receipt_signature =
    createPipScenarioSyncSignature(signatureTarget);

  return normalized;
}

export function validatePipScenarioSyncReceipt(receipt) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(receipt);
  if (!checks.plain_object) {
    errors.push("Sync receipt must be a plain object.");
    return {
      valid: false,
      checks,
      errors,
      summary: {
        pair_count: 0,
      },
    };
  }

  const normalized = normalizePipScenarioSyncReceipt(receipt);
  const safeReceipt = receipt;

  checks.schema_valid =
    safeReceipt.schema === PIP_SCENARIO_SYNC_RECEIPT_SCHEMA;
  checks.version_valid =
    Number(safeReceipt.version) === PIP_SCENARIO_SYNC_VERSION;

  validateConstituencyIdentity(normalized, checks, errors);

  checks.collection_id_valid =
    normalized.collection_id ===
    createPipScenarioSyncCollectionId({
      constituencyKey: normalized.constituency_key,
    });

  checks.timestamps_valid =
    normalizeIsoTimestamp(normalized.last_synced_at) !== null &&
    normalized.pairs.every(
      (entry) => normalizeIsoTimestamp(entry.last_synced_at) !== null
    );

  checks.signatures_valid =
    isValidSignature(normalized.last_plan_signature) &&
    isValidSignature(normalized.last_local_library_signature) &&
    isValidSignature(normalized.last_central_repository_signature) &&
    isValidSignature(normalized.receipt_signature) &&
    normalized.pairs.every(
      (entry) =>
        isValidSignature(entry.local_signature) &&
        isValidSignature(entry.central_signature)
    );

  const localIdSet = new Set();
  const centralIdSet = new Set();
  let duplicateLocal = false;
  let duplicateCentral = false;

  normalized.pairs.forEach((entry) => {
    if (localIdSet.has(entry.local_id)) {
      duplicateLocal = true;
    }
    localIdSet.add(entry.local_id);

    if (centralIdSet.has(entry.central_id)) {
      duplicateCentral = true;
    }
    centralIdSet.add(entry.central_id);
  });

  checks.unique_local_mapping = duplicateLocal === false;
  checks.unique_central_mapping = duplicateCentral === false;
  checks.central_revisions_positive = normalized.pairs.every(
    (entry) => Number.isInteger(entry.central_revision) && entry.central_revision > 0
  );

  checks.pairs_sorted =
    JSON.stringify(normalized.pairs) ===
    JSON.stringify(canonicalizePairs(normalized.pairs));

  const canonicalForSignature = {
    ...normalized,
    receipt_signature: undefined,
  };
  checks.receipt_signature_valid =
    createPipScenarioSyncSignature(canonicalForSignature) ===
    String(safeReceipt.receipt_signature ?? "").trim();

  checks.no_forbidden_privacy_fields =
    findForbiddenFieldPaths(safeReceipt).length === 0;

  checks.no_raw_voter_arrays =
    hasProhibitedVoterStructure(safeReceipt) !== true;

  Object.entries(checks).forEach(([name, passed]) => {
    if (passed !== true) {
      errors.push(`Sync receipt check failed: ${name}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      pair_count: normalized.pairs.length,
      unique_local_count: localIdSet.size,
      unique_central_count: centralIdSet.size,
      constituency_key: normalized.constituency_key,
      collection_id: normalized.collection_id,
    },
  };
}

function normalizeRollbackPackage(rollbackPackage) {
  const source = isPlainObject(rollbackPackage)
    ? rollbackPackage
    : {};

  const localBefore = isPlainObject(source.local_before)
    ? source.local_before
    : {};

  const centralBefore = isPlainObject(source.central_before)
    ? source.central_before
    : {};

  return {
    schema: PIP_SCENARIO_SYNC_ROLLBACK_SCHEMA,
    version: PIP_SCENARIO_SYNC_VERSION,
    sync_id: String(source.sync_id ?? "").trim(),
    created_at: normalizeIsoTimestamp(source.created_at),
    plan_signature: String(source.plan_signature ?? "").trim(),
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
    local_before: {
      scenario_library: Array.isArray(localBefore.scenario_library)
        ? localBefore.scenario_library
        : [],
      scenario_library_signature: String(
        localBefore.scenario_library_signature ?? ""
      ).trim(),
      sync_receipt: localBefore.sync_receipt ?? null,
      sync_receipt_signature:
        localBefore.sync_receipt_signature === null
          ? null
          : String(
              localBefore.sync_receipt_signature ?? ""
            ).trim(),
      protected_storage_signature: String(
        localBefore.protected_storage_signature ?? ""
      ).trim(),
    },
    central_before: {
      repository_id: String(
        centralBefore.repository_id ?? ""
      ).trim(),
      repository_signature: String(
        centralBefore.repository_signature ?? ""
      ).trim(),
      collection: centralBefore.collection ?? null,
      collection_etag:
        centralBefore.collection_etag === null
          ? null
          : String(centralBefore.collection_etag ?? "").trim(),
      created_scenario_ids: Array.isArray(
        centralBefore.created_scenario_ids
      )
        ? centralBefore.created_scenario_ids
            .map((entry) => String(entry ?? "").trim())
            .filter(Boolean)
        : [],
      updated_scenarios: Array.isArray(
        centralBefore.updated_scenarios
      )
        ? centralBefore.updated_scenarios
            .map((entry) => {
              const safeEntry = isPlainObject(entry) ? entry : {};
              return {
                id: String(safeEntry.id ?? "").trim(),
                record: safeEntry.record ?? null,
                etag: String(safeEntry.etag ?? "").trim(),
              };
            })
            .filter((entry) => entry.id.length > 0 && entry.record)
        : [],
    },
    completed_operations: Array.isArray(source.completed_operations)
      ? source.completed_operations
      : [],
    rollback_signature: String(
      source.rollback_signature ?? ""
    ).trim(),
  };
}

export function validatePipScenarioSyncRollbackPackage(
  rollbackPackage
) {
  const checks = {};
  const errors = [];

  checks.plain_object = isPlainObject(rollbackPackage);
  if (!checks.plain_object) {
    errors.push("Rollback package must be a plain object.");
    return {
      valid: false,
      checks,
      errors,
      summary: {
        created_central_count: 0,
        updated_central_count: 0,
      },
    };
  }

  const normalized = normalizeRollbackPackage(rollbackPackage);

  checks.schema_valid =
    normalized.schema === PIP_SCENARIO_SYNC_ROLLBACK_SCHEMA;
  checks.version_valid =
    normalized.version === PIP_SCENARIO_SYNC_VERSION;
  checks.sync_id_valid = normalized.sync_id.length > 0;
  checks.created_at_valid = normalized.created_at !== null;
  checks.plan_signature_valid = isValidSignature(
    normalized.plan_signature
  );
  checks.constituency_valid =
    normalized.constituency_key === "p134";
  checks.parliament_valid = /^P[0-9]{3}$/.test(
    normalized.parliament_code
  );
  checks.local_before_limited =
    Array.isArray(normalized.local_before.scenario_library) &&
    isValidSignature(
      normalized.local_before.scenario_library_signature
    ) &&
    isValidSignature(
      normalized.local_before.protected_storage_signature
    );
  checks.local_before_receipt_valid =
    normalized.local_before.sync_receipt === null ||
    validatePipScenarioSyncReceipt(
      normalized.local_before.sync_receipt
    ).valid === true;
  checks.central_before_valid =
    normalized.central_before.repository_id.length > 0 &&
    isValidSignature(
      normalized.central_before.repository_signature
    ) &&
    Array.isArray(normalized.central_before.created_scenario_ids) &&
    Array.isArray(normalized.central_before.updated_scenarios);

  checks.updated_scenarios_valid =
    normalized.central_before.updated_scenarios.every(
      (entry) =>
        entry.id.length > 0 &&
        isPlainObject(entry.record) &&
        String(entry.etag).length > 0
    );

  checks.no_forbidden_privacy_fields =
    findForbiddenFieldPaths(normalized).length === 0;
  checks.no_raw_voter_arrays =
    hasProhibitedVoterStructure(normalized) !== true;
  checks.no_audit_log_body =
    !isPlainObject(normalized.local_before.scenario_audit_log);
  checks.no_comparison_basket_body =
    !isPlainObject(normalized.local_before.comparison_basket);
  checks.no_migration_backup_body =
    !isPlainObject(normalized.local_before.pre_migration_backup);

  const signatureTarget = {
    ...normalized,
    rollback_signature: undefined,
  };

  checks.rollback_signature_valid =
    createPipScenarioSyncSignature(signatureTarget) ===
    normalized.rollback_signature;

  Object.entries(checks).forEach(([name, passed]) => {
    if (passed !== true) {
      errors.push(`Sync rollback package check failed: ${name}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      created_central_count:
        normalized.central_before.created_scenario_ids.length,
      updated_central_count:
        normalized.central_before.updated_scenarios.length,
      has_previous_receipt:
        normalized.local_before.sync_receipt !== null,
    },
  };
}

export function buildPipScenarioSyncContractManifest({
  generatedAt,
} = {}) {
  const timestamp =
    normalizeIsoTimestamp(generatedAt) ?? new Date().toISOString();

  return {
    schema: PIP_SCENARIO_SYNC_CONTRACT_SCHEMA,
    generated_at: timestamp,
    version: PIP_SCENARIO_SYNC_VERSION,
    modes: [...PIP_SCENARIO_SYNC_MODES],
    conflict_policies: [...PIP_SCENARIO_SYNC_CONFLICT_POLICIES],
    item_states: [...PIP_SCENARIO_SYNC_ITEM_STATES],
    actions: [...PIP_SCENARIO_SYNC_ACTIONS],
    pairing: {
      existing_receipt_mapping_authoritative: true,
      fallback_source_legacy_id_matching: true,
      fallback_id_to_id_matching: true,
      acceptance_fixtures_excluded: true,
      soft_deleted_central_excluded: true,
      unpaired_state_local_only_or_central_only: true,
    },
    preview: {
      reads_only: true,
      deterministic_plan_signature: true,
      local_library_signature_recorded: true,
      central_repository_signature_recorded: true,
      apply_requires_unchanged_signatures: true,
    },
    execution: {
      apply_manual_only: true,
      acknowledgement_required: true,
      optimistic_concurrency_required: true,
      local_commit_after_central_success: true,
      partial_central_failure_requires_compensation: true,
      sync_receipt_created_on_success: true,
      rollback_package_created_before_local_commit: true,
    },
    conflict_handling: {
      manual_review_never_auto_resolves: true,
      prefer_local_updates_central: true,
      prefer_central_updates_local: true,
      prefer_newest_compares_valid_timestamps: true,
      equal_or_invalid_timestamps_unresolved: true,
      unresolved_conflicts_block_apply: true,
    },
    deletion_policy: {
      local_deletion_not_auto_propagated: true,
      central_deletion_not_auto_propagated: true,
      missing_paired_record_is_conflict: true,
      compensation_created_records_soft_deleted: true,
      physical_deletion_forbidden: true,
    },
    rollback: {
      explicit_manual_operation: true,
      central_collection_restored_first: true,
      updated_central_scenarios_restored_second: true,
      created_central_scenarios_soft_deleted_last: true,
      local_library_and_receipt_restored: true,
      audit_history_retained: true,
      rollback_auditable: true,
    },
    compatibility: {
      legacy_browser_storage_authoritative: true,
      central_api_synchronized_secondary_storage: true,
      no_read_cutover: true,
      no_write_cutover: true,
      no_automatic_synchronisation: true,
      no_automatic_fallback: true,
      p999_read_only_fixture: true,
      batch_52a_volatile_supported: true,
      batch_52b_durable_supported: true,
      central_storage_mode: PIP_CENTRAL_STORAGE_MODE,
      central_collection_schema: PIP_CENTRAL_STORAGE_COLLECTION_SCHEMA,
    },
    privacy: {
      scenario_metadata_only: true,
      locality_ids_only: true,
      no_raw_dun_dm_locality_records: true,
      no_individual_voter_records: true,
      no_individual_voter_profiles: true,
      no_removed_privacy_fields: true,
      no_full_browser_storage_backup_to_server: true,
    },
    safety: {
      default_mode: "UPLOAD_LOCAL_TO_CENTRAL",
      default_conflict_policy: "MANUAL_REVIEW",
      preview_mandatory: true,
      acknowledgement_mandatory: true,
      stale_plan_blocked: true,
      fixtures_excluded: true,
      soft_deleted_records_excluded: true,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      authenticated_user_role_from_server_repository: true,
      client_payload_role_not_trusted: true,
      role_based_denials_deferred_to_batch_53c: true,
      production_deployment_not_enabled: true,
    },
    summary: {
      version: 1,
      mode_count: 3,
      conflict_policy_count: 4,
      state_count: 11,
      action_count: 8,
      automatic_synchronisation_enabled: false,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      rollback_supported: true,
      deletion_propagation_enabled: false,
    },
  };
}

export function validatePipScenarioSyncContractManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safeManifest.schema === PIP_SCENARIO_SYNC_CONTRACT_SCHEMA,
    generated_at_valid:
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    version_valid:
      Number(safeManifest.version) === PIP_SCENARIO_SYNC_VERSION,
    modes_valid:
      JSON.stringify(safeManifest.modes) ===
      JSON.stringify(PIP_SCENARIO_SYNC_MODES),
    conflict_policies_valid:
      JSON.stringify(safeManifest.conflict_policies) ===
      JSON.stringify(PIP_SCENARIO_SYNC_CONFLICT_POLICIES),
    states_valid:
      JSON.stringify(safeManifest.item_states) ===
      JSON.stringify(PIP_SCENARIO_SYNC_ITEM_STATES),
    actions_valid:
      JSON.stringify(safeManifest.actions) ===
      JSON.stringify(PIP_SCENARIO_SYNC_ACTIONS),
    pairing_valid:
      safeManifest?.pairing?.existing_receipt_mapping_authoritative === true &&
      safeManifest?.pairing?.fallback_source_legacy_id_matching === true &&
      safeManifest?.pairing?.fallback_id_to_id_matching === true &&
      safeManifest?.pairing?.acceptance_fixtures_excluded === true &&
      safeManifest?.pairing?.soft_deleted_central_excluded === true,
    preview_valid:
      safeManifest?.preview?.reads_only === true &&
      safeManifest?.preview?.deterministic_plan_signature === true &&
      safeManifest?.preview?.local_library_signature_recorded === true &&
      safeManifest?.preview?.central_repository_signature_recorded === true &&
      safeManifest?.preview?.apply_requires_unchanged_signatures === true,
    execution_valid:
      safeManifest?.execution?.apply_manual_only === true &&
      safeManifest?.execution?.acknowledgement_required === true &&
      safeManifest?.execution?.optimistic_concurrency_required === true &&
      safeManifest?.execution
        ?.local_commit_after_central_success === true &&
      safeManifest?.execution
        ?.partial_central_failure_requires_compensation === true,
    conflict_handling_valid:
      safeManifest?.conflict_handling
        ?.manual_review_never_auto_resolves === true &&
      safeManifest?.conflict_handling
        ?.prefer_local_updates_central === true &&
      safeManifest?.conflict_handling
        ?.prefer_central_updates_local === true &&
      safeManifest?.conflict_handling
        ?.prefer_newest_compares_valid_timestamps === true &&
      safeManifest?.conflict_handling
        ?.equal_or_invalid_timestamps_unresolved === true &&
      safeManifest?.conflict_handling?.unresolved_conflicts_block_apply === true,
    deletion_policy_valid:
      safeManifest?.deletion_policy
        ?.local_deletion_not_auto_propagated === true &&
      safeManifest?.deletion_policy
        ?.central_deletion_not_auto_propagated === true &&
      safeManifest?.deletion_policy
        ?.missing_paired_record_is_conflict === true &&
      safeManifest?.deletion_policy
        ?.physical_deletion_forbidden === true,
    rollback_valid:
      safeManifest?.rollback?.explicit_manual_operation === true &&
      safeManifest?.rollback?.central_collection_restored_first === true &&
      safeManifest?.rollback
        ?.updated_central_scenarios_restored_second === true &&
      safeManifest?.rollback
        ?.created_central_scenarios_soft_deleted_last === true,
    compatibility_valid:
      safeManifest?.compatibility
        ?.legacy_browser_storage_authoritative === true &&
      safeManifest?.compatibility
        ?.central_api_synchronized_secondary_storage === true &&
      safeManifest?.compatibility?.no_read_cutover === true &&
      safeManifest?.compatibility?.no_write_cutover === true &&
      safeManifest?.compatibility
        ?.no_automatic_synchronisation === true &&
      safeManifest?.compatibility?.no_automatic_fallback === true &&
      safeManifest?.compatibility?.p999_read_only_fixture === true,
    privacy_valid:
      safeManifest?.privacy?.scenario_metadata_only === true &&
      safeManifest?.privacy?.locality_ids_only === true &&
      safeManifest?.privacy
        ?.no_raw_dun_dm_locality_records === true &&
      safeManifest?.privacy?.no_individual_voter_records === true &&
      safeManifest?.privacy?.no_individual_voter_profiles === true &&
      safeManifest?.privacy?.no_removed_privacy_fields === true,
    safety_valid:
      safeManifest?.safety?.default_mode ===
        "UPLOAD_LOCAL_TO_CENTRAL" &&
      safeManifest?.safety?.default_conflict_policy ===
        "MANUAL_REVIEW" &&
      safeManifest?.safety?.preview_mandatory === true &&
      safeManifest?.safety?.acknowledgement_mandatory === true &&
      safeManifest?.safety?.stale_plan_blocked === true &&
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
      safeManifest?.summary?.version === 1 &&
      safeManifest?.summary?.mode_count === 3 &&
      safeManifest?.summary?.conflict_policy_count === 4 &&
      safeManifest?.summary?.state_count === 11 &&
      safeManifest?.summary?.action_count === 8 &&
      safeManifest?.summary?.automatic_synchronisation_enabled === false &&
      safeManifest?.summary?.operational_read_cutover_enabled === false &&
      safeManifest?.summary?.operational_write_cutover_enabled === false &&
      safeManifest?.summary?.authentication_configured === true &&
      safeManifest?.summary?.authentication_required === true &&
      safeManifest?.summary?.roles_configured === true &&
      safeManifest?.summary?.authorization_enforced === true &&
      safeManifest?.summary?.rollback_supported === true &&
      safeManifest?.summary?.deletion_propagation_enabled === false,
  };

  const errors = Object.entries(checks)
    .filter(([, valid]) => valid !== true)
    .map(
      ([name]) =>
        `Scenario sync contract manifest check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      mode_count: Array.isArray(safeManifest.modes)
        ? safeManifest.modes.length
        : 0,
      conflict_policy_count: Array.isArray(
        safeManifest.conflict_policies
      )
        ? safeManifest.conflict_policies.length
        : 0,
      state_count: Array.isArray(safeManifest.item_states)
        ? safeManifest.item_states.length
        : 0,
      action_count: Array.isArray(safeManifest.actions)
        ? safeManifest.actions.length
        : 0,
      default_mode: String(
        safeManifest?.safety?.default_mode ?? ""
      ),
      default_conflict_policy: String(
        safeManifest?.safety?.default_conflict_policy ?? ""
      ),
      workflow_status_count:
        PIP_SCENARIO_API_ALLOWED_WORKFLOW_STATUSES.length,
    },
  };
}
