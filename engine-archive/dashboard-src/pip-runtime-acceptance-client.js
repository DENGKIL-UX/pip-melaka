import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import { validatePipRuntimeAcceptanceReport } from "./pip-runtime-acceptance-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function sanitizeErrorText(value, fallback) {
  return (
    String(value ?? fallback)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240) || fallback
  );
}

function makeClientError(message, details = {}) {
  const error = new Error(
    sanitizeErrorText(message, "Runtime acceptance request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "RUNTIME_ACCEPTANCE_REQUEST_FAILED");
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
    throw makeClientError("Malformed JSON response from runtime acceptance API.", {
      status: response.status,
      code: "RUNTIME_ACCEPTANCE_MALFORMED_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return makeClientError(
      `Runtime acceptance request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "RUNTIME_ACCEPTANCE_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};

  return makeClientError(
    safeError.message || `Runtime acceptance request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: String(safeError.code ?? "RUNTIME_ACCEPTANCE_HTTP_ERROR"),
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "RUNTIME_ACCEPTANCE_MALFORMED_SUCCESS",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (
    payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA ||
    payload.success !== true
  ) {
    throw makeClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "RUNTIME_ACCEPTANCE_SUCCESS_SCHEMA_MISMATCH",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

export function createPipRuntimeAcceptanceClient({
  baseUrl,
  timeoutMs = 5000,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedTimeoutMs = Math.max(1, Number(timeoutMs) || 5000);

  async function sendGet(path) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, resolvedTimeoutMs);

    try {
      const authSnapshot =
        typeof getAuthorizationSnapshot === "function"
          ? getAuthorizationSnapshot()
          : null;

      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-PIP-Authorization-Snapshot": JSON.stringify(authSnapshot ?? null),
        },
        signal: controller.signal,
      });

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        const parsed = parseErrorEnvelope(payload, response);
        if (typeof onAuthenticationRequired === "function") {
          try {
            onAuthenticationRequired(parsed);
          } catch {
            // noop
          }
        }
        throw parsed;
      }

      if (response.status === 403) {
        const parsed = parseErrorEnvelope(payload, response);
        if (typeof onAuthorizationDenied === "function") {
          try {
            onAuthorizationDenied(parsed);
          } catch {
            // noop
          }
        }
        throw parsed;
      }

      if (!response.ok) {
        throw parseErrorEnvelope(payload, response);
      }

      const envelope = parseSuccessEnvelope(payload, response);
      return {
        data: envelope.data,
        meta: isPlainObject(envelope.meta) ? envelope.meta : {},
        requestId:
          envelope.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw makeClientError("Runtime acceptance request timed out.", {
          status: 0,
          code: "RUNTIME_ACCEPTANCE_TIMEOUT",
          request_id: null,
          details: { timeout_ms: resolvedTimeoutMs },
        });
      }

      if (error instanceof Error) {
        throw error;
      }

      throw makeClientError("Runtime acceptance request failed.", {
        status: 0,
        code: "RUNTIME_ACCEPTANCE_REQUEST_FAILED",
        request_id: null,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function getHealth() {
    const result = await sendGet("/system/health");
    return {
      data: isPlainObject(result.data) ? result.data : {},
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function getRuntimeAcceptanceReport({ constituencyKey, parliamentCode } = {}) {
    const query = new URLSearchParams();

    const normalizedConstituencyKey = String(constituencyKey ?? "").trim();
    if (normalizedConstituencyKey.length > 0) {
      query.set("constituencyKey", normalizedConstituencyKey);
    }

    const normalizedParliamentCode = String(parliamentCode ?? "").trim();
    if (normalizedParliamentCode.length > 0) {
      query.set("parliamentCode", normalizedParliamentCode);
    }

    const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";

    const result = await sendGet(`/runtime/acceptance${suffix}`);
    const validation = validatePipRuntimeAcceptanceReport(result.data?.report);

    if (validation.valid !== true) {
      throw makeClientError(
        validation.errors?.[0] ?? "Runtime acceptance report validation failed.",
        {
          status: 200,
          code: "RUNTIME_ACCEPTANCE_REPORT_INVALID",
          request_id: result.requestId,
          details: {
            validation_errors: validation.errors ?? [],
          },
        }
      );
    }

    return {
      report: validation.normalized,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  return Object.freeze({
    getHealth,
    getRuntimeAcceptanceReport,
  });
}
