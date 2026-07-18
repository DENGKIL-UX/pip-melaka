export const PIP_RUNTIME_STARTUP_FAILURE_SCHEMA =
  "pip.runtime-startup.failure.v1";

export const PIP_RUNTIME_STARTUP_FAILURE_CODES = Object.freeze({
  STARTUP_AUTH_CONTRACT_BLOCKED: "STARTUP_AUTH_CONTRACT_BLOCKED",
  STARTUP_ROLE_CONTRACT_BLOCKED: "STARTUP_ROLE_CONTRACT_BLOCKED",
  STARTUP_AUTHORIZATION_CONTRACT_BLOCKED:
    "STARTUP_AUTHORIZATION_CONTRACT_BLOCKED",
  STARTUP_STORAGE_CONTRACT_BLOCKED: "STARTUP_STORAGE_CONTRACT_BLOCKED",
  STARTUP_DATABASE_CONTRACT_BLOCKED: "STARTUP_DATABASE_CONTRACT_BLOCKED",
  STARTUP_MODULE_LOAD_BLOCKED: "STARTUP_MODULE_LOAD_BLOCKED",
  STARTUP_UNKNOWN_BLOCKED: "STARTUP_UNKNOWN_BLOCKED",
});

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeCode(value) {
  const code = sanitizeText(value).toUpperCase();
  return Object.values(PIP_RUNTIME_STARTUP_FAILURE_CODES).includes(code)
    ? code
    : PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_UNKNOWN_BLOCKED;
}

function resolveSafeMessage(code) {
  switch (code) {
    case PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_AUTH_CONTRACT_BLOCKED:
      return "Authentication startup contract did not pass validation.";
    case PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_ROLE_CONTRACT_BLOCKED:
      return "Role startup contract did not pass validation.";
    case PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_AUTHORIZATION_CONTRACT_BLOCKED:
      return "Authorization startup contract did not pass validation.";
    case PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_STORAGE_CONTRACT_BLOCKED:
      return "Storage startup contract did not pass validation.";
    case PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_DATABASE_CONTRACT_BLOCKED:
      return "Database startup contract did not pass validation.";
    case PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_MODULE_LOAD_BLOCKED:
      return "Application module loading was blocked by startup safety gate.";
    default:
      return "Startup safety gate blocked application initialization.";
  }
}

export function classifyPipRuntimeStartupFailure(error) {
  const message = sanitizeText(error?.message ?? error).toLowerCase();

  if (message.includes("authentication contract")) {
    return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_AUTH_CONTRACT_BLOCKED;
  }

  if (message.includes("role contract")) {
    return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_ROLE_CONTRACT_BLOCKED;
  }

  if (message.includes("authorization contract")) {
    return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_AUTHORIZATION_CONTRACT_BLOCKED;
  }

  if (message.includes("storage") && message.includes("contract")) {
    return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_STORAGE_CONTRACT_BLOCKED;
  }

  if (message.includes("database") && message.includes("contract")) {
    return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_DATABASE_CONTRACT_BLOCKED;
  }

  if (message.includes("import") || message.includes("module")) {
    return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_MODULE_LOAD_BLOCKED;
  }

  return PIP_RUNTIME_STARTUP_FAILURE_CODES.STARTUP_UNKNOWN_BLOCKED;
}

export function sanitizePipRuntimeStartupFailure(input) {
  const code = normalizeCode(
    isPlainObject(input) ? input.code : classifyPipRuntimeStartupFailure(input)
  );

  return {
    schema: PIP_RUNTIME_STARTUP_FAILURE_SCHEMA,
    code,
    title: "PIP STARTUP SAFETY GATE",
    safe_message: resolveSafeMessage(code),
    blocked: true,
    retry_allowed: true,
    raw_error_excluded: true,
    stack_trace_excluded: true,
    credential_values_excluded: true,
    token_values_excluded: true,
    environment_values_excluded: true,
  };
}

export function validatePipRuntimeStartupFailure(value) {
  const normalized = sanitizePipRuntimeStartupFailure(value);
  const safe = isPlainObject(value) ? value : {};

  const allowedKeys = new Set([
    "schema",
    "code",
    "title",
    "safe_message",
    "blocked",
    "retry_allowed",
    "raw_error_excluded",
    "stack_trace_excluded",
    "credential_values_excluded",
    "token_values_excluded",
    "environment_values_excluded",
  ]);

  const keys = isPlainObject(safe) ? Object.keys(safe) : [];

  const checks = {
    schema_valid: normalized.schema === PIP_RUNTIME_STARTUP_FAILURE_SCHEMA,
    code_valid: Object.values(PIP_RUNTIME_STARTUP_FAILURE_CODES).includes(
      normalized.code
    ),
    title_valid: normalizeTextLength(normalized.title, 1, 120),
    safe_message_valid: normalizeTextLength(normalized.safe_message, 1, 240),
    blocked_true: normalized.blocked === true,
    retry_allowed_true: normalized.retry_allowed === true,
    raw_error_excluded_true: normalized.raw_error_excluded === true,
    stack_trace_excluded_true: normalized.stack_trace_excluded === true,
    credential_values_excluded_true:
      normalized.credential_values_excluded === true,
    token_values_excluded_true: normalized.token_values_excluded === true,
    environment_values_excluded_true:
      normalized.environment_values_excluded === true,
    no_extra_keys:
      keys.length === 0 || keys.every((key) => allowedKeys.has(String(key))),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Runtime startup failure check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized,
  };
}

function normalizeTextLength(value, minLength, maxLength) {
  const text = sanitizeText(value);
  return text.length >= minLength && text.length <= maxLength;
}
