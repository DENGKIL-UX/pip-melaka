import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipCentralAuditAcceptanceReceipt,
  validatePipCentralAuditHealth,
} from "./pip-central-audit-contract.js";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected =
    raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function makeClientError(message, details = {}) {
  const error = new Error(
    String(message ?? "Central audit request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "AUDIT_REQUEST_FAILED");
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
      code: "MALFORMED_AUDIT_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_AUDIT_SUCCESS_ENVELOPE",
      request_id: response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
    });
  }

  const valid =
    payload.schema === PIP_SCENARIO_API_RESPONSE_SCHEMA &&
    payload.success === true &&
    typeof payload.request_id === "string" &&
    payload.request_id.length > 0;

  if (!valid) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "INVALID_AUDIT_SUCCESS_ENVELOPE",
      request_id:
        payload.request_id ??
        response.headers.get("x-pip-request-id") ??
        null,
      details: { endpoint },
    });
  }

  return {
    status: response.status,
    request_id: payload.request_id,
    generated_at: payload.generated_at ?? null,
    data: payload.data,
    meta: isPlainObject(payload.meta) ? payload.meta : {},
  };
}

function throwErrorEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed error envelope.", {
      status: response.status,
      code: "MALFORMED_AUDIT_ERROR_ENVELOPE",
      request_id: response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
    });
  }

  const valid =
    payload.schema === PIP_SCENARIO_API_ERROR_SCHEMA &&
    payload.success === false &&
    typeof payload.request_id === "string" &&
    payload.request_id.length > 0 &&
    isPlainObject(payload.error) &&
    typeof payload.error.code === "string";

  if (!valid) {
    throw makeClientError("Malformed error envelope.", {
      status: response.status,
      code: "INVALID_AUDIT_ERROR_ENVELOPE",
      request_id:
        payload.request_id ??
        response.headers.get("x-pip-request-id") ??
        null,
      details: { endpoint },
    });
  }

  throw makeClientError(
    String(payload.error.message ?? "Central audit request failed."),
    {
      status: response.status,
      code: payload.error.code,
      request_id: payload.request_id,
      details: payload.error.details ?? null,
    }
  );
}

function withTimeout(fetchImpl, request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    credentials: "include",
    signal: controller.signal,
  })
    .catch((error) => {
      if (error?.name === "AbortError") {
        throw makeClientError("Central audit request timed out.", {
          status: 0,
          code: "AUDIT_REQUEST_TIMEOUT",
          details: {
            endpoint: request.endpoint,
            timeout_ms: timeoutMs,
          },
        });
      }

      throw makeClientError("Central audit connection failed.", {
        status: 0,
        code: "AUDIT_CONNECTION_FAILED",
        details: {
          endpoint: request.endpoint,
          reason: String(error?.message ?? error),
        },
      });
    })
    .finally(() => {
      clearTimeout(timer);
    });
}

export function createPipCentralAuditClient({
  baseUrl,
  fetchImpl,
  timeoutMs,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedFetch =
    fetchImpl ??
    (typeof globalThis !== "undefined" ? globalThis.fetch : null);

  if (typeof resolvedFetch !== "function") {
    throw new Error(
      "PIP central audit client requires a fetch implementation."
    );
  }

  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 5000;

  const request = async ({
    method,
    endpoint,
    query,
    body,
    requiresCsrf = false,
  }) => {
    const url = new URL(`${resolvedBaseUrl}${endpoint}`);

    if (isPlainObject(query)) {
      Object.entries(query).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }

        url.searchParams.set(key, String(value));
      });
    }

    const headers = {
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (requiresCsrf === true) {
      const csrfToken =
        typeof getCsrfToken === "function"
          ? String(getCsrfToken() ?? "").trim()
          : "";

      if (!csrfToken) {
        throw makeClientError(
          "CSRF token is required for this request.",
          {
            status: 0,
            code: "MISSING_CSRF_TOKEN",
            details: { endpoint },
          }
        );
      }

      headers["X-PIP-CSRF"] = csrfToken;
    }

    if (typeof getAuthorizationSnapshot === "function") {
      getAuthorizationSnapshot();
    }

    const response = await withTimeout(
      resolvedFetch,
      {
        url: url.toString(),
        method,
        headers,
        body:
          body === undefined ? undefined : JSON.stringify(body),
        endpoint,
      },
      resolvedTimeoutMs
    );

    const payload = await parseJsonResponse(response);

    if (response.ok) {
      return parseSuccessEnvelope(payload, response, endpoint);
    }

    try {
      throwErrorEnvelope(payload, response, endpoint);
    } catch (error) {
      const status = Number(error?.status ?? 0);
      const code = String(error?.code ?? "");

      if (status === 401) {
        if (typeof onAuthenticationRequired === "function") {
          onAuthenticationRequired({
            endpoint,
            status,
            code,
          });
        }
      } else if (
        status === 403 &&
        code === "AUTHORIZATION_DENIED"
      ) {
        if (typeof onAuthorizationDenied === "function") {
          onAuthorizationDenied({
            endpoint,
            status,
            code,
          });
        }
      }

      throw error;
    }
  };

  return {
    async checkHealth() {
      const response = await request({
        method: "GET",
        endpoint: "/audit/health",
      });

      const validation = validatePipCentralAuditHealth(
        response.data
      );
      if (validation.valid !== true) {
        throw makeClientError(
          validation.errors?.[0] ?? "Invalid central audit health payload.",
          {
            status: response.status,
            code: "INVALID_AUDIT_HEALTH_PAYLOAD",
            request_id: response.request_id,
            details: { checks: validation.checks },
          }
        );
      }

      return response;
    },

    async listEvents({ limit, category, eventType } = {}) {
      return request({
        method: "GET",
        endpoint: "/audit/events",
        query: {
          limit,
          category,
          event_type: eventType,
        },
      });
    },

    async runAcceptance({
      constituencyKey,
      parliamentCode,
    } = {}) {
      const response = await request({
        method: "POST",
        endpoint: "/audit/acceptance",
        requiresCsrf: true,
        body: {
          constituency_key: constituencyKey,
          parliament_code: parliamentCode,
        },
      });

      const validation =
        validatePipCentralAuditAcceptanceReceipt(response.data);
      if (validation.valid !== true) {
        throw makeClientError(
          validation.errors?.[0] ??
            "Invalid central audit acceptance receipt.",
          {
            status: response.status,
            code: "INVALID_AUDIT_ACCEPTANCE_RECEIPT",
            request_id: response.request_id,
            details: { checks: validation.checks },
          }
        );
      }

      return response;
    },
  };
}
