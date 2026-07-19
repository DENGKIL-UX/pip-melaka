export const PIP_ROLE_CONTRACT_SCHEMA = "pip.auth.roles.contract.v1";
export const PIP_ROLE_CONTRACT_VERSION = 1;

export const PIP_USER_ROLES = Object.freeze({
  VIEWER: "VIEWER",
  ANALYST: "ANALYST",
  ADMINISTRATOR: "ADMINISTRATOR",
});

export const PIP_USER_ROLE_ORDER = Object.freeze([
  PIP_USER_ROLES.VIEWER,
  PIP_USER_ROLES.ANALYST,
  PIP_USER_ROLES.ADMINISTRATOR,
]);

export const PIP_DEFAULT_MIGRATED_USER_ROLE = PIP_USER_ROLES.VIEWER;

const ROLE_SET = new Set(PIP_USER_ROLE_ORDER);

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

export function normalizePipUserRole(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return ROLE_SET.has(normalized) ? normalized : null;
}

export function isPipUserRole(value) {
  return normalizePipUserRole(value) !== null;
}

export function describePipUserRole(role) {
  const normalized = normalizePipUserRole(role);

  if (normalized === PIP_USER_ROLES.VIEWER) {
    return {
      role: PIP_USER_ROLES.VIEWER,
      label: "Viewer",
      summary:
        "Intended for dashboard viewing and report consumption.",
    };
  }

  if (normalized === PIP_USER_ROLES.ANALYST) {
    return {
      role: PIP_USER_ROLES.ANALYST,
      label: "Analyst",
      summary:
        "Intended for analytical workflows and scenario operations.",
    };
  }

  if (normalized === PIP_USER_ROLES.ADMINISTRATOR) {
    return {
      role: PIP_USER_ROLES.ADMINISTRATOR,
      label: "Administrator",
      summary:
        "Intended for user, storage and system administration.",
    };
  }

  return {
    role: null,
    label: "Unknown",
    summary: "Unsupported role.",
  };
}

export function buildPipRoleContractManifest({ generatedAt } = {}) {
  const timestamp =
    normalizeIsoTimestamp(generatedAt) ??
    new Date().toISOString();

  return {
    schema: PIP_ROLE_CONTRACT_SCHEMA,
    version: PIP_ROLE_CONTRACT_VERSION,
    generated_at: timestamp,
    roles: {
      supported: [...PIP_USER_ROLE_ORDER],
      anonymous_role_supported: false,
      wildcard_role_supported: false,
      super_admin_role_supported: false,
      exactly_three_supported: true,
    },
    role_order: [...PIP_USER_ROLE_ORDER],
    assignment: {
      one_role_per_user: true,
      role_arrays_forbidden: true,
      unsupported_roles_rejected: true,
      bootstrap_role_explicit_in_production: true,
      existing_roleless_users_migrate_to: PIP_DEFAULT_MIGRATED_USER_ROLE,
    },
    repository: {
      role_stored_on_user_record: true,
      role_source_stored_on_user_record: true,
      permissions_not_stored_on_user_record: true,
      role_change_revokes_active_sessions: true,
      role_change_increments_revision: true,
    },
    sessions: {
      role_not_stored_in_session_record: true,
      session_resolution_reads_current_user_role: true,
      active_sessions_revoked_after_role_change: true,
    },
    browser: {
      role_storage_local_storage: false,
      role_storage_session_storage: false,
      role_storage_indexed_db: false,
    },
    authorization: {
      roles_configured: true,
      authorization_enforced: true,
      role_specific_api_denial_enabled: false,
      batch_53c_enforcement_pending: false,
    },
    migration: {
      least_privilege_role: PIP_DEFAULT_MIGRATED_USER_ROLE,
      roleless_user_upgrade_required: true,
      idempotent_upgrade_required: true,
    },
    safety: {
      role_accepted_from_cookie: false,
      role_accepted_from_header: false,
      role_accepted_from_payload: false,
      p999_read_only_independent_of_role: true,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
    },
    summary: {
      version: 1,
      supported_roles: 3,
      roles_configured: true,
      authorization_enforced: true,
      migrated_user_role: "VIEWER",
      browser_role_storage_enabled: false,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
    },
  };
}

export function validatePipRoleContractManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safeManifest.schema === PIP_ROLE_CONTRACT_SCHEMA,
    version_valid:
      Number(safeManifest.version) === PIP_ROLE_CONTRACT_VERSION,
    generated_at_valid:
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    exactly_three_roles:
      Array.isArray(safeManifest?.roles?.supported) &&
      safeManifest.roles.supported.length === 3,
    supported_roles_match:
      JSON.stringify(safeManifest?.roles?.supported ?? []) ===
      JSON.stringify(PIP_USER_ROLE_ORDER),
    no_anonymous_role:
      safeManifest?.roles?.anonymous_role_supported === false,
    no_super_admin_role:
      safeManifest?.roles?.super_admin_role_supported === false,
    no_wildcard_role:
      safeManifest?.roles?.wildcard_role_supported === false,
    one_role_per_user:
      safeManifest?.assignment?.one_role_per_user === true,
    role_arrays_forbidden:
      safeManifest?.assignment?.role_arrays_forbidden === true,
    role_stored_on_user_record:
      safeManifest?.repository?.role_stored_on_user_record === true,
    role_not_stored_in_session:
      safeManifest?.sessions?.role_not_stored_in_session_record === true,
    session_reads_current_role:
      safeManifest?.sessions
        ?.session_resolution_reads_current_user_role === true,
    role_change_revokes_sessions:
      safeManifest?.repository?.role_change_revokes_active_sessions ===
      true,
    role_in_user_summary:
      safeManifest?.sessions
        ?.session_resolution_reads_current_user_role === true,
    no_browser_role_storage:
      safeManifest?.browser?.role_storage_local_storage === false &&
      safeManifest?.browser?.role_storage_session_storage === false &&
      safeManifest?.browser?.role_storage_indexed_db === false,
    roles_configured_true:
      safeManifest?.authorization?.roles_configured === true,
    authorization_enforced_false:
      safeManifest?.authorization?.authorization_enforced === true,
    no_role_specific_denial_53b:
      safeManifest?.authorization?.role_specific_api_denial_enabled ===
      false,
    migration_role_viewer:
      safeManifest?.migration?.least_privilege_role ===
      PIP_DEFAULT_MIGRATED_USER_ROLE,
    bootstrap_role_explicit_in_production:
      safeManifest?.assignment
        ?.bootstrap_role_explicit_in_production === true,
    unsupported_roles_rejected:
      safeManifest?.assignment?.unsupported_roles_rejected === true,
    p999_independent_role_protection:
      safeManifest?.safety
        ?.p999_read_only_independent_of_role === true,
    read_cutover_false:
      safeManifest?.safety?.read_cutover_enabled === false,
    write_cutover_false:
      safeManifest?.safety?.write_cutover_enabled === false,
    summary_valid:
      safeManifest?.summary?.version === 1 &&
      safeManifest?.summary?.supported_roles === 3 &&
      safeManifest?.summary?.roles_configured === true &&
      safeManifest?.summary?.authorization_enforced === true &&
      safeManifest?.summary?.migrated_user_role === "VIEWER" &&
      safeManifest?.summary?.browser_role_storage_enabled === false &&
      safeManifest?.summary?.read_cutover_enabled === false &&
      safeManifest?.summary?.write_cutover_enabled === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(
      ([name]) =>
        `Role contract manifest check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      supported_roles: Array.isArray(
        safeManifest?.roles?.supported
      )
        ? safeManifest.roles.supported.length
        : 0,
      roles_configured:
        safeManifest?.authorization?.roles_configured === true,
      authorization_enforced:
        safeManifest?.authorization?.authorization_enforced === true,
      read_cutover_enabled:
        safeManifest?.summary?.read_cutover_enabled === true,
      write_cutover_enabled:
        safeManifest?.summary?.write_cutover_enabled === true,
    },
  };
}
