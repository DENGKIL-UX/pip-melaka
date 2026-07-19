import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipEdgeSecurityAcceptanceReceipt,
  validatePipEdgeSecurityReport,
} from "./pip-edge-security-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function makeClientError(message, details = {}) {
  const error = new Error(String(message ?? "Edge security request failed."));
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "EDGE_SECURITY_REQUEST_FAILED");
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
      code: "MALFORMED_EDGE_SECURITY_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_EDGE_SECURITY_SUCCESS_ENVELOPE",
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
      code: "INVALID_EDGE_SECURITY_SUCCESS_ENVELOPE",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
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
      code: "MALFORMED_EDGE_SECURITY_ERROR_ENVELOPE",
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
      code: "INVALID_EDGE_SECURITY_ERROR_ENVELOPE",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
    });
  }

  throw makeClientError(String(payload.error.message ?? "Edge security request failed."), {
    status: response.status,
    code: payload.error.code,
    request_id: payload.request_id,
    details: payload.error.details ?? null,
  });
}

function withTimeout(fetchImpl, request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    credentials: "include",
    signal: controller.signal,
  })
    .catch((error) => {
      if (error?.name === "AbortError") {
        throw makeClientError("Edge security request timed out.", {
          status: 0,
          code: "EDGE_SECURITY_REQUEST_TIMEOUT",
          details: { endpoint: request.endpoint, timeout_ms: timeoutMs },
        });
      }

      throw makeClientError("Edge security connection failed.", {
        status: 0,
        code: "EDGE_SECURITY_CONNECTION_FAILED",
        details: { endpoint: request.endpoint },
      });
    })
    .finally(() => clearTimeout(timer));
}

export function createPipEdgeSecurityClient({
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
    fetchImpl ?? (typeof globalThis !== "undefined" ? globalThis.fetch : null);

  if (typeof resolvedFetch !== "function") {
    throw new Error("PIP edge security client requires a fetch implementation.");
  }

  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 5000;

  const request = async ({ method, endpoint, body, requiresCsrf = false }) => {
    const url = new URL(`${resolvedBaseUrl}${endpoint}`);
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
        throw makeClientError("CSRF token is required for this request.", {
          status: 0,
          code: "MISSING_CSRF_TOKEN",
          details: { endpoint },
        });
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
        body: body === undefined ? undefined : JSON.stringify(body),
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
      if (status === 401 && typeof onAuthenticationRequired === "function") {
        onAuthenticationRequired({ endpoint, status, code });
      } else if (status === 403 && code === "AUTHORIZATION_DENIED" && typeof onAuthorizationDenied === "function") {
        onAuthorizationDenied({ endpoint, status, code });
      }
      throw error;
    }
  };

  return {
    async getReport({ targetEnvironment } = {}) {
      const target = String(targetEnvironment ?? "").trim();
      const query = target.length > 0 ? `?targetEnvironment=${encodeURIComponent(target)}` : "";
      const response = await request({ method: "GET", endpoint: `/edge-security${query}` });
      const validation = validatePipEdgeSecurityReport(response?.data);
      if (validation.valid !== true) {
        throw makeClientError(
          validation.errors?.[0] ?? "Edge security report validation failed.",
          {
            status: response.status,
            code: "EDGE_SECURITY_REPORT_VALIDATION_FAILED",
            request_id: response.request_id,
          }
        );
      }
      return {
        ...response,
        data: validation.normalized,
      };
    },

    async runAcceptance({ targetEnvironment, constituencyKey, parliamentCode } = {}) {
      const response = await request({
        method: "POST",
        endpoint: "/edge-security/acceptance",
        requiresCsrf: true,
        body: {
          targetEnvironment,
          constituencyKey,
          parliamentCode,
        },
      });

      const validation = validatePipEdgeSecurityAcceptanceReceipt(response?.data);
      if (validation.valid !== true) {
        throw makeClientError(
          validation.errors?.[0] ?? "Edge security acceptance validation failed.",
          {
            status: response.status,
            code: "EDGE_SECURITY_ACCEPTANCE_VALIDATION_FAILED",
            request_id: response.request_id,
          }
        );
      }

      return {
        ...response,
        data: validation.normalized,
      };
    },
  };
}
