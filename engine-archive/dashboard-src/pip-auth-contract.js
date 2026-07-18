export const PIP_AUTH_CONTRACT_SCHEMA = "pip.auth.contract.v1";
export const PIP_AUTH_REPOSITORY_SCHEMA = "pip.auth.repository.v1";
export const PIP_AUTH_SESSION_SCHEMA = "pip.auth.session.v1";
export const PIP_AUTH_VERSION = 1;
export const PIP_AUTH_COOKIE_NAME = "pip_session";
export const PIP_AUTH_PASSWORD_MIN_LENGTH = 14;
export const PIP_AUTH_PASSWORD_MAX_LENGTH = 128;
export const PIP_AUTH_SESSION_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
export const PIP_AUTH_SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
export const PIP_AUTH_MAX_ACTIVE_SESSIONS_PER_USER = 5;
export const PIP_AUTH_MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const PIP_AUTH_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
export const PIP_AUTH_PASSWORD_HASH_ALGORITHM = "SCRYPT";
export const PIP_AUTH_SESSION_MODE = "OPAQUE_HTTP_ONLY_COOKIE";

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

export function normalizePipAuthEmail(value) {
  if (typeof value !== "string") {
    throw new Error("Email must be a string.");
  }

  const trimmed = value.trim();
  const lowered = trimmed.toLowerCase();

  if (!lowered) {
    throw new Error("Email is required.");
  }

  if (lowered.length > 254) {
    throw new Error("Email exceeds maximum length of 254 characters.");
  }

  // Strict format without silently repairing malformed addresses.
  const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!emailPattern.test(lowered)) {
    throw new Error("Email format is invalid.");
  }

  return lowered;
}

export function validatePipAuthPasswordPolicy(password) {
  const checks = {
    is_string: typeof password === "string",
    min_length: false,
    max_length: false,
    no_leading_whitespace: false,
    no_trailing_whitespace: false,
    not_all_whitespace: false,
  };

  const errors = [];

  if (!checks.is_string) {
    errors.push("Password must be a string.");
    return {
      valid: false,
      checks,
      errors,
    };
  }

  const raw = password;

  checks.min_length = raw.length >= PIP_AUTH_PASSWORD_MIN_LENGTH;
  checks.max_length = raw.length <= PIP_AUTH_PASSWORD_MAX_LENGTH;
  checks.no_leading_whitespace = !/^\s/.test(raw);
  checks.no_trailing_whitespace = !/\s$/.test(raw);
  checks.not_all_whitespace = raw.trim().length > 0;

  if (!checks.min_length) {
    errors.push(
      `Password must be at least ${PIP_AUTH_PASSWORD_MIN_LENGTH} characters.`
    );
  }

  if (!checks.max_length) {
    errors.push(
      `Password must be at most ${PIP_AUTH_PASSWORD_MAX_LENGTH} characters.`
    );
  }

  if (!checks.no_leading_whitespace) {
    errors.push("Password must not start with whitespace.");
  }

  if (!checks.no_trailing_whitespace) {
    errors.push("Password must not end with whitespace.");
  }

  if (!checks.not_all_whitespace) {
    errors.push("Password must not be empty or whitespace-only.");
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
  };
}

export function buildPipAuthContractManifest({ generatedAt } = {}) {
  const timestamp =
    normalizeIsoTimestamp(generatedAt) ?? new Date().toISOString();

  return {
    schema: PIP_AUTH_CONTRACT_SCHEMA,
    generated_at: timestamp,
    version: PIP_AUTH_VERSION,
    schemas: {
      contract: PIP_AUTH_CONTRACT_SCHEMA,
      repository: PIP_AUTH_REPOSITORY_SCHEMA,
      session: PIP_AUTH_SESSION_SCHEMA,
    },
    password_hashing: {
      algorithm: PIP_AUTH_PASSWORD_HASH_ALGORITHM,
      scrypt_parameters: {
        N: 32768,
        r: 8,
        p: 1,
        key_length: 64,
      },
      salts_unique_and_random: true,
      comparison_timing_safe: true,
      raw_password_persistence_forbidden: true,
      pepper_required: true,
    },
    session_handling: {
      mode: PIP_AUTH_SESSION_MODE,
      absolute_ttl_ms: PIP_AUTH_SESSION_ABSOLUTE_TTL_MS,
      idle_ttl_ms: PIP_AUTH_SESSION_IDLE_TTL_MS,
      max_active_sessions_per_user: PIP_AUTH_MAX_ACTIVE_SESSIONS_PER_USER,
      token_entropy_bits_minimum: 256,
      raw_session_token_persistence_forbidden: true,
      token_hash_algorithm: "SHA-256",
      expired_sessions_rejected: true,
      revoked_sessions_rejected: true,
      revocation_supported: true,
    },
    cookie_handling: {
      name: PIP_AUTH_COOKIE_NAME,
      http_only: true,
      same_site: "Strict",
      path: "/",
      secure_required_in_production: true,
      secure_allowed_false_for_explicit_local_development: true,
      domain_attribute_omitted: true,
      max_age_limited_by_absolute_ttl: true,
    },
    csrf_handling: {
      header_name: "X-PIP-CSRF",
      required_for_authenticated_state_mutation: true,
      timing_safe_validation: true,
      required_methods: ["POST", "PUT", "PATCH", "DELETE"],
      not_required_for_methods: ["GET", "HEAD"],
    },
    login_throttling: {
      enabled: true,
      max_failed_login_attempts: PIP_AUTH_MAX_FAILED_LOGIN_ATTEMPTS,
      lockout_duration_ms: PIP_AUTH_LOCKOUT_DURATION_MS,
      generic_failure_responses: true,
    },
    account_lockout: {
      temporary: true,
      resets_after_successful_authentication: true,
      disabled_user_fails_with_generic_response: true,
    },
    session_expiry: {
      idle_expiry_enforced: true,
      absolute_expiry_enforced: true,
      maintenance_purge_enabled: true,
    },
    session_revocation: {
      logout_revokes_current_session: true,
      bulk_user_revocation_supported: true,
    },
    browser_handling: {
      no_password_storage_in_browser_persistence: true,
      no_session_token_storage_in_browser_persistence: true,
      no_auth_secret_storage_in_browser_persistence: true,
      csrf_token_in_memory_only: true,
    },
    api_protection: {
      scenario_and_collection_authentication_required: true,
      health_public_readable: true,
      authenticated_state_mutation_requires_csrf: true,
    },
    compatibility: {
      legacy_scenario_storage_operational: true,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
    },
    privacy: {
      no_password_hash_exposure: true,
      no_session_token_hash_exposure: true,
      no_user_repository_exposure_in_health: true,
    },
    roles: {
      roles_configured: true,
      authorization_enforced: true,
      current_authenticated_user_has_one_supported_role: true,
      role_originates_from_server_user_repository: true,
      role_not_accepted_from_client_payload: true,
      role_based_denials_deferred_to_batch_53c: true,
      batch_53c_pending: false,
    },
    safety: {
      no_default_credentials: true,
      bootstrap_credentials_env_only: true,
      auth_material_not_logged: true,
      browser_token_storage_enabled: false,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
    },
    summary: {
      version: 1,
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      password_hash_algorithm: PIP_AUTH_PASSWORD_HASH_ALGORITHM,
      session_mode: PIP_AUTH_SESSION_MODE,
      csrf_required: true,
      default_credentials_present: false,
      browser_token_storage_enabled: false,
      read_cutover_enabled: false,
      write_cutover_enabled: false,
    },
  };
}

export function validatePipAuthContractManifest(manifest) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safeManifest.schema === PIP_AUTH_CONTRACT_SCHEMA,
    generated_at_valid:
      normalizeIsoTimestamp(safeManifest.generated_at) !== null,
    version_valid: Number(safeManifest.version) === PIP_AUTH_VERSION,
    repository_schema_valid:
      safeManifest?.schemas?.repository === PIP_AUTH_REPOSITORY_SCHEMA,
    session_schema_valid:
      safeManifest?.schemas?.session === PIP_AUTH_SESSION_SCHEMA,
    password_hash_algorithm_valid:
      safeManifest?.password_hashing?.algorithm === "SCRYPT",
    salts_random_required:
      safeManifest?.password_hashing?.salts_unique_and_random === true,
    password_timing_safe_required:
      safeManifest?.password_hashing?.comparison_timing_safe === true,
    no_raw_password_persistence:
      safeManifest?.password_hashing?.raw_password_persistence_forbidden === true,
    no_raw_session_token_persistence:
      safeManifest?.session_handling?.raw_session_token_persistence_forbidden === true,
    session_token_hash_required:
      safeManifest?.session_handling?.token_hash_algorithm === "SHA-256",
    cookie_http_only:
      safeManifest?.cookie_handling?.http_only === true,
    cookie_same_site_strict:
      safeManifest?.cookie_handling?.same_site === "Strict",
    cookie_secure_required_in_production:
      safeManifest?.cookie_handling?.secure_required_in_production === true,
    cookie_path_root:
      safeManifest?.cookie_handling?.path === "/",
    token_entropy_bits_valid:
      Number(safeManifest?.session_handling?.token_entropy_bits_minimum) >= 256,
    csrf_required:
      safeManifest?.csrf_handling?.required_for_authenticated_state_mutation === true,
    generic_auth_failure_required:
      safeManifest?.login_throttling?.generic_failure_responses === true,
    login_throttling_enabled:
      safeManifest?.login_throttling?.enabled === true,
    temporary_lockout_enabled:
      safeManifest?.account_lockout?.temporary === true,
    expired_sessions_rejected:
      safeManifest?.session_handling?.expired_sessions_rejected === true,
    revoked_sessions_rejected:
      safeManifest?.session_handling?.revoked_sessions_rejected === true,
    api_authentication_required:
      safeManifest?.api_protection?.scenario_and_collection_authentication_required === true,
    health_public_readable:
      safeManifest?.api_protection?.health_public_readable === true,
    roles_unconfigured:
      safeManifest?.roles?.roles_configured === true,
    authorization_unconfigured:
      safeManifest?.roles?.authorization_enforced === true,
    role_source_invariants_valid:
      safeManifest?.roles
        ?.current_authenticated_user_has_one_supported_role ===
        true &&
      safeManifest?.roles
        ?.role_originates_from_server_user_repository === true &&
      safeManifest?.roles?.role_not_accepted_from_client_payload ===
        true &&
      safeManifest?.roles
        ?.role_based_denials_deferred_to_batch_53c === true,
    no_default_credentials:
      safeManifest?.safety?.no_default_credentials === true,
    bootstrap_env_only:
      safeManifest?.safety?.bootstrap_credentials_env_only === true,
    no_browser_auth_persistence:
      safeManifest?.browser_handling?.no_password_storage_in_browser_persistence === true &&
      safeManifest?.browser_handling?.no_session_token_storage_in_browser_persistence === true &&
      safeManifest?.browser_handling?.no_auth_secret_storage_in_browser_persistence === true,
    summary_valid:
      safeManifest?.summary?.version === 1 &&
      safeManifest?.summary?.authentication_configured === true &&
      safeManifest?.summary?.authentication_required === true &&
      safeManifest?.summary?.roles_configured === true &&
      safeManifest?.summary?.authorization_enforced === true &&
      safeManifest?.summary?.password_hash_algorithm === "SCRYPT" &&
      safeManifest?.summary?.session_mode === "OPAQUE_HTTP_ONLY_COOKIE" &&
      safeManifest?.summary?.csrf_required === true &&
      safeManifest?.summary?.default_credentials_present === false &&
      safeManifest?.summary?.browser_token_storage_enabled === false &&
      safeManifest?.summary?.read_cutover_enabled === false &&
      safeManifest?.summary?.write_cutover_enabled === false,
  };

  const errors = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => `Authentication contract manifest check failed: ${name}`);

  return {
    valid: errors.length === 0,
    checks,
    errors,
    summary: {
      authentication_required:
        safeManifest?.summary?.authentication_required === true,
      roles_configured:
        safeManifest?.summary?.roles_configured === true,
      authorization_enforced:
        safeManifest?.summary?.authorization_enforced === true,
      csrf_required:
        safeManifest?.summary?.csrf_required === true,
      session_mode: String(safeManifest?.summary?.session_mode ?? ""),
    },
  };
}
