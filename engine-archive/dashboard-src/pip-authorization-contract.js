import {
  PIP_STORAGE_COMPATIBILITY_MODE,
  PIP_STORAGE_CUTOVER_ENABLED,
} from "./pip-storage-namespace.js";
import {
  PIP_USER_ROLES,
  isPipUserRole,
  normalizePipUserRole,
} from "./pip-role-contract.js";

export const PIP_AUTHORIZATION_CONTRACT_SCHEMA =
  "pip.auth.authorization.contract.v1";

export const PIP_AUTHORIZATION_CONTRACT_VERSION = 1;

export const PIP_AUTHORIZATION_PERMISSIONS = Object.freeze({
  DASHBOARD_READ: "dashboard:read",
  REPORT_EXPORT: "report:export",
  ANALYSIS_RUN: "analysis:run",
  SCENARIO_READ: "scenario:read",
  SCENARIO_CREATE: "scenario:create",
  SCENARIO_UPDATE: "scenario:update",
  SCENARIO_IMPORT: "scenario:import",
  SCENARIO_EXPORT: "scenario:export",
  SCENARIO_DELETE: "scenario:delete",
  COLLECTION_READ: "collection:read",
  COLLECTION_CREATE: "collection:create",
  COLLECTION_UPDATE: "collection:update",
  COLLECTION_DELETE: "collection:delete",
  COLLECTION_EXPORT: "collection:export",
  SYNC_PREVIEW: "sync:preview",
  SYNC_APPLY: "sync:apply",
  SYNC_VERIFY: "sync:verify",
  SYNC_ROLLBACK: "sync:rollback",
  DURABILITY_INSPECT: "durability:inspect",
  DURABILITY_MANAGE: "durability:manage",
  STORAGE_MIGRATE: "storage:migrate",
  AUDIT_MAINTAIN: "audit:maintain",
  USER_ADMIN: "user:admin",
});

function uniquePermissions(items) {
  return [...new Set(Array.isArray(items) ? items : [])];
}

function freezePermissionArray(items) {
  return Object.freeze(uniquePermissions(items));
}

const VIEWER_PERMISSIONS = freezePermissionArray([
  PIP_AUTHORIZATION_PERMISSIONS.DASHBOARD_READ,
  PIP_AUTHORIZATION_PERMISSIONS.REPORT_EXPORT,
  PIP_AUTHORIZATION_PERMISSIONS.SCENARIO_READ,
  PIP_AUTHORIZATION_PERMISSIONS.COLLECTION_READ,
]);

const ANALYST_PERMISSIONS = freezePermissionArray([
  ...VIEWER_PERMISSIONS,
  PIP_AUTHORIZATION_PERMISSIONS.ANALYSIS_RUN,
  PIP_AUTHORIZATION_PERMISSIONS.SCENARIO_CREATE,
  PIP_AUTHORIZATION_PERMISSIONS.SCENARIO_UPDATE,
  PIP_AUTHORIZATION_PERMISSIONS.SCENARIO_IMPORT,
  PIP_AUTHORIZATION_PERMISSIONS.SCENARIO_EXPORT,
  PIP_AUTHORIZATION_PERMISSIONS.COLLECTION_CREATE,
  PIP_AUTHORIZATION_PERMISSIONS.COLLECTION_UPDATE,
  PIP_AUTHORIZATION_PERMISSIONS.COLLECTION_EXPORT,
  PIP_AUTHORIZATION_PERMISSIONS.SYNC_PREVIEW,
  PIP_AUTHORIZATION_PERMISSIONS.SYNC_APPLY,
  PIP_AUTHORIZATION_PERMISSIONS.SYNC_VERIFY,
  PIP_AUTHORIZATION_PERMISSIONS.DURABILITY_INSPECT,
]);

const ADMINISTRATOR_PERMISSIONS = freezePermissionArray([
  ...ANALYST_PERMISSIONS,
  PIP_AUTHORIZATION_PERMISSIONS.SCENARIO_DELETE,
  PIP_AUTHORIZATION_PERMISSIONS.COLLECTION_DELETE,
  PIP_AUTHORIZATION_PERMISSIONS.SYNC_ROLLBACK,
  PIP_AUTHORIZATION_PERMISSIONS.DURABILITY_MANAGE,
  PIP_AUTHORIZATION_PERMISSIONS.STORAGE_MIGRATE,
  PIP_AUTHORIZATION_PERMISSIONS.AUDIT_MAINTAIN,
  PIP_AUTHORIZATION_PERMISSIONS.USER_ADMIN,
]);

export const PIP_ROLE_PERMISSION_MATRIX = Object.freeze({
  [PIP_USER_ROLES.VIEWER]: VIEWER_PERMISSIONS,
  [PIP_USER_ROLES.ANALYST]: ANALYST_PERMISSIONS,
  [PIP_USER_ROLES.ADMINISTRATOR]: ADMINISTRATOR_PERMISSIONS,
});

const SUPPORTED_PERMISSION_SET = new Set(
  Object.values(PIP_AUTHORIZATION_PERMISSIONS)
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

export function normalizePipAuthorizationPermission(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return SUPPORTED_PERMISSION_SET.has(normalized)
    ? normalized
    : null;
}

export function isPipAuthorizationPermission(value) {
  return normalizePipAuthorizationPermission(value) !== null;
}

export function getPipRolePermissions(role) {
  const normalizedRole = normalizePipUserRole(role);
  if (!normalizedRole) {
    return [];
  }

  return [...(PIP_ROLE_PERMISSION_MATRIX[normalizedRole] ?? [])];
}

export function hasPipRolePermission(role, permission) {
  const normalizedRole = normalizePipUserRole(role);
  const normalizedPermission =
    normalizePipAuthorizationPermission(permission);

  if (!normalizedRole || !normalizedPermission) {
    return false;
  }

  const rolePermissions = PIP_ROLE_PERMISSION_MATRIX[normalizedRole];
  return Array.isArray(rolePermissions)
    ? rolePermissions.includes(normalizedPermission)
    : false;
}

export function buildPipAuthorizationSnapshot({ role } = {}) {
  const normalizedRole = normalizePipUserRole(role);

  return {
    schema: PIP_AUTHORIZATION_CONTRACT_SCHEMA,
    version: PIP_AUTHORIZATION_CONTRACT_VERSION,
    role: normalizedRole,
    authorization_enforced: true,
    permissions: getPipRolePermissions(normalizedRole),
  };
}

export function validatePipAuthorizationSnapshot(snapshot) {
  const safeSnapshot = isPlainObject(snapshot) ? snapshot : {};
  const normalizedRole = normalizePipUserRole(safeSnapshot.role);

  const expectedPermissions = normalizedRole
    ? getPipRolePermissions(normalizedRole)
    : [];

  const providedPermissionsRaw = Array.isArray(
    safeSnapshot.permissions
  )
    ? safeSnapshot.permissions
    : [];

  const providedPermissions = providedPermissionsRaw
    .map((entry) => normalizePipAuthorizationPermission(entry))
    .filter(Boolean);

  const providedSet = new Set(providedPermissions);
  const expectedSet = new Set(expectedPermissions);

  const checks = {
    schema_valid:
      safeSnapshot.schema === PIP_AUTHORIZATION_CONTRACT_SCHEMA,
    version_valid:
      Number(safeSnapshot.version) ===
      PIP_AUTHORIZATION_CONTRACT_VERSION,
    role_supported: isPipUserRole(normalizedRole),
    authorization_enforced_true:
      safeSnapshot.authorization_enforced === true,
    permission_array: Array.isArray(safeSnapshot.permissions),
    no_permission_duplicates:
      providedSet.size === providedPermissionsRaw.length,
    no_unsupported_permissions:
      providedPermissions.length === providedPermissionsRaw.length,
    exact_permission_count:
      providedPermissions.length === expectedPermissions.length,
    no_missing_permissions: expectedPermissions.every((permission) =>
      providedSet.has(permission)
    ),
    no_additional_permissions: providedPermissions.every((permission) =>
      expectedSet.has(permission)
    ),
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(
      ([name]) =>
        `Authorization snapshot check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      role: normalizedRole,
      declared_permission_count: providedPermissions.length,
      expected_permission_count: expectedPermissions.length,
      authorization_enforced:
        safeSnapshot.authorization_enforced === true,
    },
  };
}

export function buildPipAuthorizationContractManifest({
  generatedAt,
} = {}) {
  const timestamp =
    normalizeIsoTimestamp(generatedAt) ?? new Date().toISOString();

  const declaredPermissions = Object.values(
    PIP_AUTHORIZATION_PERMISSIONS
  );

  return {
    schema: PIP_AUTHORIZATION_CONTRACT_SCHEMA,
    version: PIP_AUTHORIZATION_CONTRACT_VERSION,
    generated_at: timestamp,
    permissions: {
      declared: [...declaredPermissions],
      declared_permissions_unique:
        new Set(declaredPermissions).size === declaredPermissions.length,
      wildcard_permission_supported: false,
    },
    role_matrix: {
      [PIP_USER_ROLES.VIEWER]: [...VIEWER_PERMISSIONS],
      [PIP_USER_ROLES.ANALYST]: [...ANALYST_PERMISSIONS],
      [PIP_USER_ROLES.ADMINISTRATOR]: [
        ...ADMINISTRATOR_PERMISSIONS,
      ],
      exactly_one_matrix: true,
      runtime_inheritance_enabled: false,
    },
    route_policy: {
      authentication_before_authorization: true,
      csrf_before_mutation_execution: true,
      authorization_denied_http_status: 403,
      unauthenticated_http_status: 401,
    },
    browser_policy: {
      controls_mirror_permissions_only: true,
      controls_not_authoritative: true,
      no_browser_permission_storage: true,
      no_browser_role_storage: true,
    },
    server_policy: {
      authorization_server_enforced: true,
      role_from_server_user_record: true,
      permissions_derived_from_role_server_side: true,
      client_supplied_role_ignored: true,
      client_supplied_permissions_ignored: true,
    },
    fixture_policy: {
      p999_read_only_all_roles: true,
      p999_override_independent_of_role_matrix: true,
    },
    storage_policy: {
      compatibility_mode: PIP_STORAGE_COMPATIBILITY_MODE,
      read_cutover_enabled: false,
      write_cutover_enabled: PIP_STORAGE_CUTOVER_ENABLED,
      automatic_synchronization_enabled: false,
    },
    safety: {
      viewer_has_no_mutation_permissions: true,
      analyst_has_no_delete_permissions: true,
      analyst_has_no_administration_permissions: true,
      administrator_has_all_declared_permissions: true,
    },
    summary: {
      version: 1,
      declared_permissions: declaredPermissions.length,
      roles_configured: true,
      authorization_enforced: true,
      viewer_mutation_enabled: false,
      analyst_delete_enabled: false,
      administrator_full_access: true,
      browser_permission_storage_enabled: false,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
    },
  };
}

export function validatePipAuthorizationContractManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  const declaredPermissions = Array.isArray(
    safeManifest?.permissions?.declared
  )
    ? safeManifest.permissions.declared
    : [];

  const viewerPermissions = Array.isArray(
    safeManifest?.role_matrix?.[PIP_USER_ROLES.VIEWER]
  )
    ? safeManifest.role_matrix[PIP_USER_ROLES.VIEWER]
    : [];

  const analystPermissions = Array.isArray(
    safeManifest?.role_matrix?.[PIP_USER_ROLES.ANALYST]
  )
    ? safeManifest.role_matrix[PIP_USER_ROLES.ANALYST]
    : [];

  const adminPermissions = Array.isArray(
    safeManifest?.role_matrix?.[PIP_USER_ROLES.ADMINISTRATOR]
  )
    ? safeManifest.role_matrix[PIP_USER_ROLES.ADMINISTRATOR]
    : [];

  const checks = {
    schema_valid:
      safeManifest.schema === PIP_AUTHORIZATION_CONTRACT_SCHEMA,
    version_valid:
      Number(safeManifest.version) ===
      PIP_AUTHORIZATION_CONTRACT_VERSION,
    generated_at_valid:
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    declared_permissions_count: declaredPermissions.length === 23,
    declared_permissions_unique:
      new Set(declaredPermissions).size === declaredPermissions.length,
    wildcard_absent:
      safeManifest?.permissions?.wildcard_permission_supported === false,
    role_matrix_exact: JSON.stringify(viewerPermissions) === JSON.stringify(VIEWER_PERMISSIONS) &&
      JSON.stringify(analystPermissions) === JSON.stringify(ANALYST_PERMISSIONS) &&
      JSON.stringify(adminPermissions) === JSON.stringify(ADMINISTRATOR_PERMISSIONS),
    authorization_server_enforced:
      safeManifest?.server_policy?.authorization_server_enforced === true,
    role_from_server_user_record:
      safeManifest?.server_policy?.role_from_server_user_record === true,
    permissions_derived_server_side:
      safeManifest?.server_policy
        ?.permissions_derived_from_role_server_side === true,
    client_role_ignored:
      safeManifest?.server_policy?.client_supplied_role_ignored === true,
    client_permissions_ignored:
      safeManifest?.server_policy?.client_supplied_permissions_ignored === true,
    authentication_before_authorization:
      safeManifest?.route_policy?.authentication_before_authorization === true,
    csrf_before_mutation_execution:
      safeManifest?.route_policy?.csrf_before_mutation_execution === true,
    authorization_denial_403:
      Number(safeManifest?.route_policy?.authorization_denied_http_status) === 403,
    unauthenticated_401:
      Number(safeManifest?.route_policy?.unauthenticated_http_status) === 401,
    viewer_no_mutation:
      safeManifest?.safety?.viewer_has_no_mutation_permissions === true,
    analyst_no_delete:
      safeManifest?.safety?.analyst_has_no_delete_permissions === true,
    analyst_no_admin:
      safeManifest?.safety?.analyst_has_no_administration_permissions === true,
    admin_full_access:
      safeManifest?.safety?.administrator_has_all_declared_permissions === true,
    p999_read_only_all_roles:
      safeManifest?.fixture_policy?.p999_read_only_all_roles === true,
    browser_mirror_only:
      safeManifest?.browser_policy?.controls_mirror_permissions_only === true &&
      safeManifest?.browser_policy?.controls_not_authoritative === true,
    no_browser_permission_storage:
      safeManifest?.browser_policy?.no_browser_permission_storage === true &&
      safeManifest?.browser_policy?.no_browser_role_storage === true,
    read_cutover_false:
      safeManifest?.storage_policy?.read_cutover_enabled === false,
    write_cutover_false:
      safeManifest?.storage_policy?.write_cutover_enabled === false,
    automatic_sync_false:
      safeManifest?.storage_policy?.automatic_synchronization_enabled === false,
    summary_valid:
      safeManifest?.summary?.version === 1 &&
      safeManifest?.summary?.declared_permissions === 23 &&
      safeManifest?.summary?.roles_configured === true &&
      safeManifest?.summary?.authorization_enforced === true &&
      safeManifest?.summary?.viewer_mutation_enabled === false &&
      safeManifest?.summary?.analyst_delete_enabled === false &&
      safeManifest?.summary?.administrator_full_access === true &&
      safeManifest?.summary?.browser_permission_storage_enabled === false &&
      safeManifest?.summary?.read_cutover_enabled === false &&
      safeManifest?.summary?.write_cutover_enabled === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(
      ([name]) =>
        `Authorization contract manifest check failed: ${name}`
    );

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      declared_permissions: declaredPermissions.length,
      roles_configured: true,
      authorization_enforced: true,
    },
  };
}
