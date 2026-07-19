import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipDatabaseReferenceCompletenessReport,
  validatePipDatabaseReferenceSlotRegistrySnapshot,
} from "./pip-production-database-reference-registry-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function toQueryParams({ constituencyKey, parliamentCode } = {}) {
  const query = new URLSearchParams();

  const key = String(constituencyKey ?? "").trim();
  if (key.length > 0) {
    query.set("constituencyKey", key);
  }

  const code = String(parliamentCode ?? "").trim();
  if (code.length > 0) {
    query.set("parliamentCode", code);
  }

  const encoded = query.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

function makeClientError(message, details = {}) {
  const error = new Error(
    String(message ?? "Database reference registry request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(
    details.code ?? "DATABASE_REFERENCE_REGISTRY_REQUEST_FAILED"
  );
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
      code: "MALFORMED_REFERENCE_REGISTRY_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_REFERENCE_REGISTRY_SUCCESS_ENVELOPE",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (
    payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA ||
    payload.success !== true
  ) {
    throw makeClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "REFERENCE_REGISTRY_SUCCESS_SCHEMA_MISMATCH",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return makeClientError(
      `Reference registry request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "REFERENCE_REGISTRY_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return makeClientError(
    safeError.message ||
      `Reference registry request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: safeError.code || "REFERENCE_REGISTRY_HTTP_ERROR",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

export function createPipProductionDatabaseReferenceRegistryClient({
  baseUrl,
  timeoutMs = 5000,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function sendRequest({ method, path, queryParams, body }) {
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
        "Content-Type": "application/json",
        "X-PIP-Authorization-Snapshot": JSON.stringify(authSnapshot ?? null),
      };

      if (method === "POST" && typeof getCsrfToken === "function") {
        headers["X-PIP-CSRF"] = String(getCsrfToken() ?? "");
      }

      const response = await fetch(
        `${normalizedBaseUrl}${path}${toQueryParams(queryParams)}`,
        {
          method,
          credentials: "include",
          headers,
          body: JSON.stringify(body ?? {}),
          signal: controller.signal,
        }
      );

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
          envelope.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw makeClientError("Reference registry request timed out.", {
          status: 0,
          code: "REFERENCE_REGISTRY_REQUEST_TIMEOUT",
          request_id: null,
        });
      }

      if (error instanceof Error) {
        throw error;
      }

      throw makeClientError("Reference registry request failed.", {
        status: 0,
        code: "REFERENCE_REGISTRY_REQUEST_FAILED",
        request_id: null,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function inspectReferenceRegistry({ constituencyKey, parliamentCode } = {}) {
    const result = await sendRequest({
      method: "GET",
      path: "/central-repository/database-provider/reference-registry",
      queryParams: { constituencyKey, parliamentCode },
      body: {},
    });

    const validation = validatePipDatabaseReferenceSlotRegistrySnapshot(
      result.envelope.data
    );
    if (validation.valid !== true) {
      throw makeClientError(
        validation.errors?.[0] || "Reference registry snapshot validation failed.",
        {
          status: 200,
          code: "DATABASE_REFERENCE_REGISTRY_INVALID",
          request_id: result.requestId,
          details: {
            validation_errors: validation.errors ?? [],
          },
        }
      );
    }

    return {
      data: validation.normalized,
      meta: isPlainObject(result.envelope.meta) ? result.envelope.meta : {},
      requestId: result.requestId,
    };
  }

  async function registerReferenceSlots({
    constituencyKey,
    parliamentCode,
    registrations,
  } = {}) {
    const body = {
      registrations: Array.isArray(registrations) ? registrations : [],
    };

    const result = await sendRequest({
      method: "POST",
      path: "/central-repository/database-provider/reference-registry/register",
      queryParams: { constituencyKey, parliamentCode },
      body,
    });

    const safeData = isPlainObject(result.envelope.data) ? result.envelope.data : {};
    const snapshotValidation = validatePipDatabaseReferenceSlotRegistrySnapshot(
      safeData.registry_snapshot
    );
    const completenessValidation = validatePipDatabaseReferenceCompletenessReport(
      safeData.completeness_report
    );

    if (snapshotValidation.valid !== true || completenessValidation.valid !== true) {
      throw makeClientError(
        snapshotValidation.errors?.[0] ||
          completenessValidation.errors?.[0] ||
          "Reference slot registration response validation failed.",
        {
          status: 200,
          code: "DATABASE_REFERENCE_REGISTRATION_INVALID",
          request_id: result.requestId,
          details: {
            snapshot_errors: snapshotValidation.errors ?? [],
            completeness_errors: completenessValidation.errors ?? [],
          },
        }
      );
    }

    return {
      data: {
        changed: safeData.changed === true,
        processed_slot_count: Number(safeData.processed_slot_count ?? 0),
        processed_slot_keys: Array.isArray(safeData.processed_slot_keys)
          ? safeData.processed_slot_keys.map((entry) => String(entry ?? "").trim())
          : [],
        registry_snapshot: snapshotValidation.normalized,
        completeness_report: completenessValidation.normalized,
      },
      meta: isPlainObject(result.envelope.meta) ? result.envelope.meta : {},
      requestId: result.requestId,
    };
  }

  async function verifyReferenceRegistryCompleteness({
    constituencyKey,
    parliamentCode,
  } = {}) {
    const result = await sendRequest({
      method: "POST",
      path: "/central-repository/database-provider/reference-registry/verify",
      queryParams: { constituencyKey, parliamentCode },
      body: {},
    });

    const validation = validatePipDatabaseReferenceCompletenessReport(
      result.envelope.data
    );

    if (validation.valid !== true) {
      throw makeClientError(
        validation.errors?.[0] || "Reference completeness report validation failed.",
        {
          status: 200,
          code: "DATABASE_REFERENCE_COMPLETENESS_INVALID",
          request_id: result.requestId,
          details: {
            validation_errors: validation.errors ?? [],
          },
        }
      );
    }

    return {
      data: validation.normalized,
      meta: isPlainObject(result.envelope.meta) ? result.envelope.meta : {},
      requestId: result.requestId,
    };
  }

  return Object.freeze({
    inspectReferenceRegistry,
    registerReferenceSlots,
    verifyReferenceRegistryCompleteness,
  });
}
