import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipCentralRepositoryReport,
} from "./pip-central-repository-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function makeClientError(message, details = {}) {
  const error = new Error(String(message ?? "Central repository request failed."));
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "CENTRAL_REPOSITORY_REQUEST_FAILED");
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
      code: "MALFORMED_CENTRAL_REPOSITORY_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_CENTRAL_REPOSITORY_SUCCESS_ENVELOPE",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA || payload.success !== true) {
    throw makeClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "CENTRAL_REPOSITORY_SUCCESS_SCHEMA_MISMATCH",
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return makeClientError(`Central repository request failed with HTTP ${response.status}.`, {
      status: response.status,
      code: "CENTRAL_REPOSITORY_HTTP_ERROR",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return makeClientError(
    safeError.message || `Central repository request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: safeError.code || "CENTRAL_REPOSITORY_HTTP_ERROR",
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

export function createPipCentralRepositoryClient({
  baseUrl,
  timeoutMs = 5000,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function inspectRepository() {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, Math.max(1, Number(timeoutMs) || 5000));

    try {
      const authSnapshot =
        typeof getAuthorizationSnapshot === "function"
          ? getAuthorizationSnapshot()
          : null;

      const response = await fetch(
        `${normalizedBaseUrl}/central-repository`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-PIP-Authorization-Snapshot": JSON.stringify(authSnapshot ?? null),
          },
          signal: controller.signal,
        }
      );

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        if (typeof onAuthenticationRequired === "function") {
          try {
            onAuthenticationRequired(parseErrorEnvelope(payload, response));
          } catch {
            // no-op callback protection
          }
        }
        throw parseErrorEnvelope(payload, response);
      }

      if (response.status === 403) {
        if (typeof onAuthorizationDenied === "function") {
          try {
            onAuthorizationDenied(parseErrorEnvelope(payload, response));
          } catch {
            // no-op callback protection
          }
        }
        throw parseErrorEnvelope(payload, response);
      }

      if (!response.ok) {
        throw parseErrorEnvelope(payload, response);
      }

      const envelope = parseSuccessEnvelope(payload, response);
      const reportValidation = validatePipCentralRepositoryReport(envelope.data);
      if (reportValidation.valid !== true) {
        throw makeClientError(
          reportValidation.errors?.[0] ?? "Central repository report validation failed.",
          {
            status: response.status,
            code: "CENTRAL_REPOSITORY_REPORT_INVALID",
            request_id: envelope.request_id ?? response.headers.get("x-pip-request-id") ?? null,
            details: {
              validation_errors: reportValidation.errors ?? [],
            },
          }
        );
      }

      return {
        data: reportValidation.normalized,
        meta: isPlainObject(envelope.meta) ? envelope.meta : {},
        requestId:
          envelope.request_id ??
          response.headers.get("x-pip-request-id") ??
          null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw makeClientError("Central repository request timed out.", {
          status: 0,
          code: "CENTRAL_REPOSITORY_REQUEST_TIMEOUT",
          request_id: null,
        });
      }

      if (error instanceof Error) {
        throw error;
      }

      throw makeClientError("Central repository request failed.", {
        status: 0,
        code: "CENTRAL_REPOSITORY_REQUEST_FAILED",
        request_id: null,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  return {
    inspectRepository,
  };
}
