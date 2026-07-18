import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipCutoverBlockReceipt,
  validatePipDatabaseReconciliationManifest,
  validatePipDatabaseRehearsalReport,
} from "./pip-production-database-rehearsal-contract.js";

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
    String(message ?? "Production rehearsal request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "REHEARSAL_REQUEST_FAILED");
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
      code: "MALFORMED_REHEARSAL_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw makeClientError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_REHEARSAL_SUCCESS_ENVELOPE",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (
    payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA ||
    payload.success !== true
  ) {
    throw makeClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "REHEARSAL_SUCCESS_SCHEMA_MISMATCH",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return makeClientError(
      `Rehearsal request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "REHEARSAL_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return makeClientError(
    safeError.message || `Rehearsal request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: safeError.code || "REHEARSAL_HTTP_ERROR",
      request_id:
        payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

export function createPipProductionDatabaseRehearsalClient({
  baseUrl,
  timeoutMs = 5000,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function sendRequest({ path, body }) {
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

      if (typeof getCsrfToken === "function") {
        headers["X-PIP-CSRF"] = String(getCsrfToken() ?? "");
      }

      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(body ?? {}),
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
          envelope.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw makeClientError("Rehearsal request timed out.", {
          status: 0,
          code: "REHEARSAL_REQUEST_TIMEOUT",
          request_id: null,
        });
      }

      if (error instanceof Error) {
        throw error;
      }

      throw makeClientError("Rehearsal request failed.", {
        status: 0,
        code: "REHEARSAL_REQUEST_FAILED",
        request_id: null,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function runOfflineRehearsal() {
    const result = await sendRequest({
      path: "/central-repository/migration-rehearsal/run",
      body: {},
    });

    const payload = isPlainObject(result.envelope.data) ? result.envelope.data : {};
    const rehearsalValidation = validatePipDatabaseRehearsalReport(
      payload.rehearsal_report
    );
    const reconciliationValidation = validatePipDatabaseReconciliationManifest(
      payload.reconciliation_manifest
    );

    if (rehearsalValidation.valid !== true || reconciliationValidation.valid !== true) {
      throw makeClientError(
        rehearsalValidation.errors?.[0] ||
          reconciliationValidation.errors?.[0] ||
          "Offline rehearsal response validation failed.",
        {
          status: 200,
          code: "OFFLINE_REHEARSAL_INVALID",
          request_id: result.requestId,
          details: {
            rehearsal_errors: rehearsalValidation.errors ?? [],
            reconciliation_errors: reconciliationValidation.errors ?? [],
          },
        }
      );
    }

    return {
      data: {
        rehearsal_report: rehearsalValidation.normalized,
        reconciliation_manifest: reconciliationValidation.normalized,
      },
      meta: isPlainObject(result.envelope.meta) ? result.envelope.meta : {},
      requestId: result.requestId,
    };
  }

  async function verifyCutoverBlockers() {
    const result = await sendRequest({
      path: "/central-repository/migration-rehearsal/verify-blockers",
      body: {},
    });

    const receiptValidation = validatePipCutoverBlockReceipt(result.envelope.data);
    if (receiptValidation.valid !== true) {
      throw makeClientError(
        receiptValidation.errors?.[0] || "Cutover blocker receipt validation failed.",
        {
          status: 200,
          code: "CUTOVER_BLOCK_RECEIPT_INVALID",
          request_id: result.requestId,
          details: {
            validation_errors: receiptValidation.errors ?? [],
          },
        }
      );
    }

    return {
      data: receiptValidation.normalized,
      meta: isPlainObject(result.envelope.meta) ? result.envelope.meta : {},
      requestId: result.requestId,
    };
  }

  return {
    runOfflineRehearsal,
    verifyCutoverBlockers,
  };
}
