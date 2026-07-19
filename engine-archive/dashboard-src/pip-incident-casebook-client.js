import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipIncidentCase,
  validatePipIncidentCaseMutationReceipt,
  validatePipIncidentCasebookReport,
  validatePipIncidentClosureEvidence,
} from "./pip-incident-casebook-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function makeClientError(message, details = {}) {
  const error = new Error(String(message ?? "Incident casebook request failed."));
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "INCIDENT_CASEBOOK_REQUEST_FAILED");
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
      code: "MALFORMED_INCIDENT_CASEBOOK_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_INCIDENT_CASEBOOK_SUCCESS_ENVELOPE",
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
      code: "INVALID_INCIDENT_CASEBOOK_SUCCESS_ENVELOPE",
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
      code: "MALFORMED_INCIDENT_CASEBOOK_ERROR_ENVELOPE",
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
      code: "INVALID_INCIDENT_CASEBOOK_ERROR_ENVELOPE",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
    });
  }

  throw makeClientError(
    String(payload.error.message ?? "Incident casebook request failed."),
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
        throw makeClientError("Incident casebook request timed out.", {
          status: 0,
          code: "INCIDENT_CASEBOOK_REQUEST_TIMEOUT",
          details: {
            endpoint: request.endpoint,
            timeout_ms: timeoutMs,
          },
        });
      }

      throw makeClientError("Incident casebook connection failed.", {
        status: 0,
        code: "INCIDENT_CASEBOOK_CONNECTION_FAILED",
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

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function createPipIncidentCasebookClient({
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
    throw new Error("PIP incident casebook client requires a fetch implementation.");
  }

  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 5000;

  const request = async ({ endpoint, method = "GET", payload }) => {
    const url = new URL(`${resolvedBaseUrl}${endpoint}`);
    const upperMethod = String(method).toUpperCase();

    const headers = {
      Accept: "application/json",
    };

    let body;
    if (payload !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(payload);
    }

    if (typeof getAuthorizationSnapshot === "function") {
      getAuthorizationSnapshot();
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
      const csrfToken =
        typeof getCsrfToken === "function" ? String(getCsrfToken() ?? "") : "";
      if (csrfToken) {
        headers["X-PIP-CSRF"] = csrfToken;
      }
    }

    const response = await withTimeout(
      resolvedFetch,
      {
        url: url.toString(),
        method: upperMethod,
        headers,
        body,
        endpoint,
      },
      resolvedTimeoutMs
    );

    const payloadBody = await parseJsonResponse(response);

    if (response.ok) {
      return parseSuccessEnvelope(payloadBody, response, endpoint);
    }

    try {
      throwErrorEnvelope(payloadBody, response, endpoint);
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
    async listCases({ targetEnvironment, status, severity, limit } = {}) {
      const query = toQuery({
        targetEnvironment,
        status,
        severity,
        limit,
      });

      const response = await request({
        endpoint: `/incident-cases${query}`,
      });

      const validation = validatePipIncidentCasebookReport(response.data);
      if (validation.valid !== true) {
        throw makeClientError(
          validation.errors?.[0] ?? "Incident casebook report validation failed.",
          {
            status: 0,
            code: "INCIDENT_CASEBOOK_REPORT_INVALID",
            details: {
              endpoint: "/incident-cases",
            },
          }
        );
      }

      return {
        ...response,
        data: validation.normalized,
      };
    },

    async getCase({ caseId } = {}) {
      const normalizedCaseId = String(caseId ?? "").trim();
      if (!normalizedCaseId) {
        throw makeClientError("Case id is required.", {
          status: 0,
          code: "INCIDENT_CASE_ID_REQUIRED",
        });
      }

      const response = await request({
        endpoint: `/incident-cases/${encodeURIComponent(normalizedCaseId)}`,
      });

      const validation = validatePipIncidentCase(response.data);
      if (validation.valid !== true) {
        throw makeClientError(
          validation.errors?.[0] ?? "Incident case validation failed.",
          {
            status: 0,
            code: "INCIDENT_CASE_INVALID",
            details: {
              endpoint: "/incident-cases/:caseId",
            },
          }
        );
      }

      return {
        ...response,
        data: validation.normalized,
      };
    },

    async createCase({
      targetEnvironment,
      constituencyKey,
      parliamentCode,
      severity,
      title,
      safeSummary,
      snapshotIds,
      timelineEventIds,
    } = {}) {
      const response = await request({
        endpoint: "/incident-cases",
        method: "POST",
        payload: {
          targetEnvironment,
          constituencyKey,
          parliamentCode,
          severity,
          title,
          safeSummary,
          snapshotIds,
          timelineEventIds,
        },
      });

      const receiptValidation = validatePipIncidentCaseMutationReceipt(
        response.data?.receipt
      );
      const caseValidation = validatePipIncidentCase(response.data?.case);

      if (receiptValidation.valid !== true || caseValidation.valid !== true) {
        throw makeClientError(
          receiptValidation.errors?.[0] ??
            caseValidation.errors?.[0] ??
            "Incident case create response validation failed.",
          {
            status: 0,
            code: "INCIDENT_CASE_CREATE_RESPONSE_INVALID",
            details: {
              endpoint: "/incident-cases",
            },
          }
        );
      }

      return {
        ...response,
        data: {
          receipt: receiptValidation.normalized,
          case: caseValidation.normalized,
        },
      };
    },

    async updateChecklist({
      caseId,
      targetEnvironment,
      constituencyKey,
      parliamentCode,
      itemId,
      status,
      safeNote,
      evidenceReference,
    } = {}) {
      const normalizedCaseId = String(caseId ?? "").trim();
      if (!normalizedCaseId) {
        throw makeClientError("Case id is required.", {
          status: 0,
          code: "INCIDENT_CASE_ID_REQUIRED",
        });
      }

      const response = await request({
        endpoint: `/incident-cases/${encodeURIComponent(normalizedCaseId)}/checklist`,
        method: "POST",
        payload: {
          targetEnvironment,
          constituencyKey,
          parliamentCode,
          itemId,
          status,
          safeNote,
          evidenceReference,
        },
      });

      const receiptValidation = validatePipIncidentCaseMutationReceipt(
        response.data?.receipt
      );
      const caseValidation = validatePipIncidentCase(response.data?.case);

      if (receiptValidation.valid !== true || caseValidation.valid !== true) {
        throw makeClientError(
          receiptValidation.errors?.[0] ??
            caseValidation.errors?.[0] ??
            "Incident checklist update response validation failed.",
          {
            status: 0,
            code: "INCIDENT_CASE_CHECKLIST_RESPONSE_INVALID",
            details: {
              endpoint: "/incident-cases/:caseId/checklist",
            },
          }
        );
      }

      return {
        ...response,
        data: {
          receipt: receiptValidation.normalized,
          case: caseValidation.normalized,
        },
      };
    },

    async closeCase({
      caseId,
      targetEnvironment,
      constituencyKey,
      parliamentCode,
      closureOutcome,
      closureSummary,
      closureAcknowledged,
    } = {}) {
      const normalizedCaseId = String(caseId ?? "").trim();
      if (!normalizedCaseId) {
        throw makeClientError("Case id is required.", {
          status: 0,
          code: "INCIDENT_CASE_ID_REQUIRED",
        });
      }

      const response = await request({
        endpoint: `/incident-cases/${encodeURIComponent(normalizedCaseId)}/close`,
        method: "POST",
        payload: {
          targetEnvironment,
          constituencyKey,
          parliamentCode,
          closureOutcome,
          closureSummary,
          closureAcknowledged,
        },
      });

      const receiptValidation = validatePipIncidentCaseMutationReceipt(
        response.data?.receipt
      );
      const caseValidation = validatePipIncidentCase(response.data?.case);
      const evidenceValidation = validatePipIncidentClosureEvidence(
        response.data?.closure_evidence
      );

      if (
        receiptValidation.valid !== true ||
        caseValidation.valid !== true ||
        evidenceValidation.valid !== true
      ) {
        throw makeClientError(
          receiptValidation.errors?.[0] ??
            caseValidation.errors?.[0] ??
            evidenceValidation.errors?.[0] ??
            "Incident case closure response validation failed.",
          {
            status: 0,
            code: "INCIDENT_CASE_CLOSURE_RESPONSE_INVALID",
            details: {
              endpoint: "/incident-cases/:caseId/close",
            },
          }
        );
      }

      return {
        ...response,
        data: {
          receipt: receiptValidation.normalized,
          case: caseValidation.normalized,
          closure_evidence: evidenceValidation.normalized,
        },
      };
    },
  };
}
