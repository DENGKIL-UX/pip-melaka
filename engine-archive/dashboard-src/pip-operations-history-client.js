import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipIncidentTimelineReport,
  validatePipOperationsHistoryReport,
  validatePipOperationsTrendReport,
} from "./pip-operations-history-contract.js";

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
    String(message ?? "Operations history request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "OPERATIONS_HISTORY_REQUEST_FAILED");
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
      code: "MALFORMED_OPERATIONS_HISTORY_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_OPERATIONS_HISTORY_SUCCESS_ENVELOPE",
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
      code: "INVALID_OPERATIONS_HISTORY_SUCCESS_ENVELOPE",
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
      code: "MALFORMED_OPERATIONS_HISTORY_ERROR_ENVELOPE",
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
      code: "INVALID_OPERATIONS_HISTORY_ERROR_ENVELOPE",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
    });
  }

  throw makeClientError(
    String(payload.error.message ?? "Operations history request failed."),
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
    credentials: "include",
    signal: controller.signal,
  })
    .catch((error) => {
      if (error?.name === "AbortError") {
        throw makeClientError("Operations history request timed out.", {
          status: 0,
          code: "OPERATIONS_HISTORY_REQUEST_TIMEOUT",
          details: {
            endpoint: request.endpoint,
            timeout_ms: timeoutMs,
          },
        });
      }

      throw makeClientError("Operations history connection failed.", {
        status: 0,
        code: "OPERATIONS_HISTORY_CONNECTION_FAILED",
        details: {
          endpoint: request.endpoint,
        },
      });
    })
    .finally(() => {
      clearTimeout(timer);
    });
}

function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const normalized = String(value).trim();
    if (!normalized) {
      return;
    }

    query.set(key, normalized);
  });

  const result = query.toString();
  return result ? `?${result}` : "";
}

export function createPipOperationsHistoryClient({
  baseUrl,
  fetchImpl,
  timeoutMs,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedFetch =
    fetchImpl ??
    (typeof globalThis !== "undefined" ? globalThis.fetch : null);

  if (typeof resolvedFetch !== "function") {
    throw new Error("PIP operations history client requires a fetch implementation.");
  }

  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 5000;

  const request = async ({ endpoint }) => {
    const url = new URL(`${resolvedBaseUrl}${endpoint}`);

    const headers = {
      Accept: "application/json",
    };

    if (typeof getAuthorizationSnapshot === "function") {
      getAuthorizationSnapshot();
    }

    const response = await withTimeout(
      resolvedFetch,
      {
        url: url.toString(),
        method: "GET",
        headers,
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
      } else if (
        status === 403 &&
        code === "AUTHORIZATION_DENIED" &&
        typeof onAuthorizationDenied === "function"
      ) {
        onAuthorizationDenied({ endpoint, status, code });
      }

      throw error;
    }
  };

  return {
    async getHistory({ targetEnvironment, limit } = {}) {
      const query = toQuery({
        targetEnvironment,
        limit,
      });

      const response = await request({
        endpoint: `/observability/history${query}`,
      });

      const reportValidation = validatePipOperationsHistoryReport(response.data);
      if (reportValidation.valid !== true) {
        throw makeClientError(
          reportValidation.errors?.[0] ??
            "Operations history report validation failed.",
          {
            status: response.status,
            code: "OPERATIONS_HISTORY_REPORT_INVALID",
            request_id: response.request_id,
            details: { endpoint: "/observability/history" },
          }
        );
      }

      return {
        ...response,
        data: reportValidation.normalized,
      };
    },

    async compareSnapshots({
      targetEnvironment,
      baselineSnapshotId,
      currentSnapshotId,
    } = {}) {
      const query = toQuery({
        targetEnvironment,
        baselineSnapshotId,
        currentSnapshotId,
      });

      const response = await request({
        endpoint: `/observability/history/compare${query}`,
      });

      const trendValidation = validatePipOperationsTrendReport(response.data);
      if (trendValidation.valid !== true) {
        throw makeClientError(
          trendValidation.errors?.[0] ??
            "Operations trend report validation failed.",
          {
            status: response.status,
            code: "OPERATIONS_TREND_REPORT_INVALID",
            request_id: response.request_id,
            details: { endpoint: "/observability/history/compare" },
          }
        );
      }

      return {
        ...response,
        data: trendValidation.normalized,
      };
    },

    async getIncidentTimeline({
      targetEnvironment,
      limit,
      source,
      severity,
    } = {}) {
      const query = toQuery({
        targetEnvironment,
        limit,
        source,
        severity,
      });

      const response = await request({
        endpoint: `/observability/incidents${query}`,
      });

      const timelineValidation = validatePipIncidentTimelineReport(response.data);
      if (timelineValidation.valid !== true) {
        throw makeClientError(
          timelineValidation.errors?.[0] ??
            "Incident timeline report validation failed.",
          {
            status: response.status,
            code: "INCIDENT_TIMELINE_REPORT_INVALID",
            request_id: response.request_id,
            details: { endpoint: "/observability/incidents" },
          }
        );
      }

      return {
        ...response,
        data: timelineValidation.normalized,
      };
    },
  };
}
