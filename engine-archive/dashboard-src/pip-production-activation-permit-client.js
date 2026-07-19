import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipProductionActivationPermitEvaluation,
  validatePipProductionActivationPermitReceipt,
  validatePipProductionActivationPermitRequest,
  validatePipProductionActivationPermitRevocationReceipt,
} from "./pip-production-activation-permit-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  return (raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function sanitizeText(value, fallback) {
  return (
    String(value ?? fallback)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 260) || fallback
  );
}

function createClientError(message, details = {}) {
  const error = new Error(
    sanitizeText(message, "Production activation-permit request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "PRODUCTION_ACTIVATION_PERMIT_REQUEST_FAILED");
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
    throw createClientError(
      "Malformed JSON response from production activation-permit API.",
      {
        status: response.status,
        code: "PRODUCTION_ACTIVATION_PERMIT_MALFORMED_JSON",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return createClientError(
      `Production activation-permit request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "PRODUCTION_ACTIVATION_PERMIT_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return createClientError(
    safeError.message ||
      `Production activation-permit request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: String(safeError.code ?? "PRODUCTION_ACTIVATION_PERMIT_HTTP_ERROR"),
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw createClientError("Malformed success envelope.", {
      status: response.status,
      code: "PRODUCTION_ACTIVATION_PERMIT_MALFORMED_SUCCESS",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA || payload.success !== true) {
    throw createClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "PRODUCTION_ACTIVATION_PERMIT_SUCCESS_SCHEMA_MISMATCH",
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

export function createPipProductionActivationPermitClient({
  baseUrl,
  timeoutMs = 5000,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedTimeoutMs = Math.max(1, Number(timeoutMs) || 5000);

  function withP134Context(path) {
    const glue = String(path).includes("?") ? "&" : "?";
    return `${path}${glue}constituencyKey=p134&parliamentCode=P134`;
  }

  async function send({ method, path, body }) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), resolvedTimeoutMs);

    try {
      const authSnapshot =
        typeof getAuthorizationSnapshot === "function"
          ? getAuthorizationSnapshot()
          : null;
      const csrfToken = typeof getCsrfToken === "function" ? getCsrfToken() : "";

      const headers = {
        Accept: "application/json",
        "X-PIP-Authorization-Snapshot": JSON.stringify(authSnapshot ?? null),
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      if (method !== "GET" && csrfToken) {
        headers["X-PIP-CSRF"] = String(csrfToken);
      }

      const response = await fetch(`${normalizedBaseUrl}${path}`, {
        method,
        credentials: "include",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        const parsed = parseErrorEnvelope(payload, response);
        if (typeof onAuthenticationRequired === "function") {
          onAuthenticationRequired(parsed);
        }
        throw parsed;
      }

      if (response.status === 403) {
        const parsed = parseErrorEnvelope(payload, response);
        if (typeof onAuthorizationDenied === "function") {
          onAuthorizationDenied(parsed);
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
        requestId: envelope.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw createClientError("Production activation-permit request timed out.", {
          status: 0,
          code: "PRODUCTION_ACTIVATION_PERMIT_TIMEOUT",
          details: { timeout_ms: resolvedTimeoutMs },
        });
      }
      if (error instanceof Error) {
        throw error;
      }
      throw createClientError("Production activation-permit request failed.", {
        status: 0,
        code: "PRODUCTION_ACTIVATION_PERMIT_REQUEST_FAILED",
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  function parseBundle(result) {
    const requestValidation = validatePipProductionActivationPermitRequest(
      result?.data?.permit_request
    );
    const evaluationValidation = validatePipProductionActivationPermitEvaluation(
      result?.data?.permit_evaluation
    );
    const authorizationValidation = validatePipProductionActivationPermitReceipt(
      result?.data?.authorization_receipt
    );
    const revocationValidation = validatePipProductionActivationPermitRevocationReceipt(
      result?.data?.revocation_receipt
    );

    return {
      permitRequest: requestValidation.valid ? requestValidation.normalized : null,
      permitEvaluation: evaluationValidation.valid ? evaluationValidation.normalized : null,
      authorizationReceipt: authorizationValidation.valid
        ? authorizationValidation.normalized
        : null,
      revocationReceipt: revocationValidation.valid ? revocationValidation.normalized : null,
      requestId: result?.requestId ?? null,
      meta: result?.meta ?? {},
      idempotent: result?.data?.idempotent === true,
    };
  }

  async function getCurrentActivationPermit() {
    return parseBundle(
      await send({ method: "GET", path: withP134Context("/production/activation-permit") })
    );
  }

  async function prepareActivationPermit(payload) {
    return parseBundle(
      await send({
        method: "POST",
        path: withP134Context("/production/activation-permit/prepare"),
        body: payload,
      })
    );
  }

  async function evaluateActivationPermit(payload) {
    return parseBundle(
      await send({
        method: "POST",
        path: withP134Context("/production/activation-permit/evaluate"),
        body: payload,
      })
    );
  }

  async function authorizeActivationPermit(payload) {
    return parseBundle(
      await send({
        method: "POST",
        path: withP134Context("/production/activation-permit/authorize"),
        body: payload,
      })
    );
  }

  async function revokeActivationPermit(payload) {
    return parseBundle(
      await send({
        method: "POST",
        path: withP134Context("/production/activation-permit/revoke"),
        body: payload,
      })
    );
  }

  return {
    getCurrentActivationPermit,
    prepareActivationPermit,
    evaluateActivationPermit,
    authorizeActivationPermit,
    revokeActivationPermit,
  };
}