import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipDatabaseMigrationPlan,
  validatePipShadowWriteVerificationReceipt,
} from "./pip-production-database-migration-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function makeClientError(message, details = {}) {
  const error = new Error(
    String(message ?? "Production migration request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "MIGRATION_REQUEST_FAILED");
  error.request_id = details.request_id ?? null;
  error.details = details.details ?? null;
  return error;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw makeClientError("Malformed JSON response.", {
      status: response.status,
      code: "MALFORMED_MIGRATION_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_MIGRATION_SUCCESS_ENVELOPE",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (
    payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA ||
    payload.success !== true
  ) {
    throw makeClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "MIGRATION_SUCCESS_SCHEMA_MISMATCH",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

function parseErrorEnvelope(payload, response) {
  if (
    !isPlainObject(payload) ||
    payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA
  ) {
    return makeClientError(
      `Migration request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "MIGRATION_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return makeClientError(
    safeError.message ||
      `Migration request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: safeError.code || "MIGRATION_HTTP_ERROR",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

export function createPipProductionDatabaseMigrationClient({
  baseUrl,
  timeoutMs = 5000,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function sendRequest({ path, method, body, includeCsrf }) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, Math.max(1, Number(timeoutMs) || 5000));

    try {
      const authSnapshot =
        typeof getAuthorizationSnapshot === "function"
          ? getAuthorizationSnapshot()
          : null;

      const headers = {
        Accept: "application/json",
        "X-PIP-Authorization-Snapshot": JSON.stringify(
          authSnapshot ?? null
        ),
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      if (includeCsrf === true && typeof getCsrfToken === "function") {
        headers["X-PIP-CSRF"] = String(getCsrfToken() ?? "");
      }

      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method,
        credentials: "include",
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        const parsedError = parseErrorEnvelope(payload, response);
        if (typeof onAuthenticationRequired === "function") {
          try {
            onAuthenticationRequired(parsedError);
          } catch {
            // noop
          }
        }
        throw parsedError;
      }

      if (response.status === 403) {
        const parsedError = parseErrorEnvelope(payload, response);
        if (typeof onAuthorizationDenied === "function") {
          try {
            onAuthorizationDenied(parsedError);
          } catch {
            // noop
          }
        }
        throw parsedError;
      }

      if (!response.ok) {
        throw parseErrorEnvelope(payload, response);
      }

      const envelope = parseSuccessEnvelope(payload, response);
      return {
        envelope,
        requestId:
          envelope.request_id ??
          response.headers.get("x-pip-request-id") ??
          null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw makeClientError("Migration request timed out.", {
          status: 0,
          code: "MIGRATION_REQUEST_TIMEOUT",
          request_id: null,
        });
      }

      if (error instanceof Error) {
        throw error;
      }

      throw makeClientError("Migration request failed.", {
        status: 0,
        code: "MIGRATION_REQUEST_FAILED",
        request_id: null,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function inspectMigrationReadiness() {
    const result = await sendRequest({
      path: "/central-repository/migration-readiness",
      method: "GET",
      includeCsrf: false,
    });

    const planValidation = validatePipDatabaseMigrationPlan(
      result.envelope.data
    );

    if (planValidation.valid !== true) {
      throw makeClientError(
        planValidation.errors?.[0] ?? "Migration plan validation failed.",
        {
          status: 200,
          code: "MIGRATION_PLAN_INVALID",
          request_id: result.requestId,
          details: {
            validation_errors: planValidation.errors ?? [],
          },
        }
      );
    }

    return {
      data: planValidation.normalized,
      meta: isPlainObject(result.envelope.meta)
        ? result.envelope.meta
        : {},
      requestId: result.requestId,
    };
  }

  async function verifyShadowWriteDisabled() {
    const result = await sendRequest({
      path: "/central-repository/shadow-write/verify",
      method: "POST",
      body: {},
      includeCsrf: true,
    });

    const receiptValidation = validatePipShadowWriteVerificationReceipt(
      result.envelope.data
    );

    if (receiptValidation.valid !== true) {
      throw makeClientError(
        receiptValidation.errors?.[0] ??
          "Shadow write verification receipt validation failed.",
        {
          status: 200,
          code: "SHADOW_WRITE_VERIFICATION_INVALID",
          request_id: result.requestId,
          details: {
            validation_errors: receiptValidation.errors ?? [],
          },
        }
      );
    }

    return {
      data: receiptValidation.normalized,
      meta: isPlainObject(result.envelope.meta)
        ? result.envelope.meta
        : {},
      requestId: result.requestId,
    };
  }

  return {
    inspectMigrationReadiness,
    verifyShadowWriteDisabled,
  };
}
