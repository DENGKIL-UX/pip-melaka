import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  sanitizePipExternalOperatorChecklist,
  validatePipExternalOperatorChecklist,
  validatePipExternalOperatorEvaluation,
  validatePipExternalOperatorHandoffReceipt,
} from "./pip-external-deployment-operator-governance-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  return (raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );
}

function sanitizeText(value, fallback) {
  return (
    String(value ?? fallback)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240) || fallback
  );
}

function createClientError(message, details = {}) {
  const error = new Error(
    sanitizeText(message, "External operator governance request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "EXTERNAL_OPERATOR_GOVERNANCE_REQUEST_FAILED");
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
    throw createClientError("Malformed JSON response from governance API.", {
      status: response.status,
      code: "EXTERNAL_OPERATOR_GOVERNANCE_MALFORMED_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return createClientError(
      `External operator governance request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "EXTERNAL_OPERATOR_GOVERNANCE_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return createClientError(
    safeError.message ||
      `External operator governance request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: String(safeError.code ?? "EXTERNAL_OPERATOR_GOVERNANCE_HTTP_ERROR"),
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw createClientError("Malformed success envelope.", {
      status: response.status,
      code: "EXTERNAL_OPERATOR_GOVERNANCE_MALFORMED_SUCCESS",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA || payload.success !== true) {
    throw createClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "EXTERNAL_OPERATOR_GOVERNANCE_SUCCESS_SCHEMA_MISMATCH",
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

export function createPipExternalDeploymentOperatorGovernanceClient({
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
        requestId:
          envelope.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw createClientError("External operator governance request timed out.", {
          status: 0,
          code: "EXTERNAL_OPERATOR_GOVERNANCE_TIMEOUT",
          details: { timeout_ms: resolvedTimeoutMs },
        });
      }

      if (error instanceof Error) {
        throw error;
      }

      throw createClientError("External operator governance request failed.", {
        status: 0,
        code: "EXTERNAL_OPERATOR_GOVERNANCE_REQUEST_FAILED",
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  function clearRawAliasPayload(payload) {
    if (!isPlainObject(payload) || !isPlainObject(payload.role_assignments)) {
      return;
    }
    Object.keys(payload.role_assignments).forEach((key) => {
      payload.role_assignments[key] = "";
    });
  }

  async function getCurrentGovernance() {
    const result = await send({
      method: "GET",
      path: withP134Context("/admin/external-operator-governance"),
    });

    const checklistValidation = validatePipExternalOperatorChecklist(
      result?.data?.checklist
    );
    const evaluationValidation = validatePipExternalOperatorEvaluation(
      result?.data?.evaluation
    );
    const handoffValidation = validatePipExternalOperatorHandoffReceipt(
      result?.data?.handoff_receipt
    );

    return {
      checklist: checklistValidation.valid ? checklistValidation.normalized : null,
      evaluation: evaluationValidation.valid ? evaluationValidation.normalized : null,
      handoffReceipt: handoffValidation.valid ? handoffValidation.normalized : null,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function prepareChecklist(payload) {
    const rawPayload = isPlainObject(payload) ? { ...payload } : {};
    const result = await send({
      method: "POST",
      path: withP134Context("/admin/external-operator-governance/prepare"),
      body: rawPayload,
    });

    clearRawAliasPayload(rawPayload);

    const validation = validatePipExternalOperatorChecklist(result?.data?.checklist);
    if (!validation.valid) {
      throw createClientError(
        validation.errors?.[0] || "Invalid governance checklist response.",
        {
          status: 200,
          code: "EXTERNAL_OPERATOR_GOVERNANCE_CHECKLIST_INVALID",
          details: { validation_errors: validation.errors ?? [] },
          request_id: result.requestId,
        }
      );
    }

    return {
      checklist: validation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function evaluateSeparationOfDuties(payload) {
    const rawPayload = isPlainObject(payload) ? { ...payload } : {};
    const result = await send({
      method: "POST",
      path: withP134Context("/admin/external-operator-governance/evaluate"),
      body: rawPayload,
    });

    clearRawAliasPayload(rawPayload);

    const checklistValidation = validatePipExternalOperatorChecklist(
      result?.data?.checklist
    );
    const evaluationValidation = validatePipExternalOperatorEvaluation(
      result?.data?.evaluation
    );

    if (!checklistValidation.valid || !evaluationValidation.valid) {
      throw createClientError("Invalid governance evaluation response.", {
        status: 200,
        code: "EXTERNAL_OPERATOR_GOVERNANCE_EVALUATION_INVALID",
        details: {
          checklist_errors: checklistValidation.errors ?? [],
          evaluation_errors: evaluationValidation.errors ?? [],
        },
        request_id: result.requestId,
      });
    }

    return {
      checklist: checklistValidation.normalized,
      evaluation: evaluationValidation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function acknowledgeExternalOperatorHandoff(payload) {
    const sanitized = sanitizePipExternalOperatorChecklist(payload);
    const result = await send({
      method: "POST",
      path: withP134Context("/admin/external-operator-governance/acknowledge"),
      body: {
        request_id: sanitized.request_id,
        checklist_id: sanitized.checklist_id,
        checklist_digest: sanitized.checklist_digest,
      },
    });

    const validation = validatePipExternalOperatorHandoffReceipt(
      result?.data?.handoff_receipt
    );
    if (!validation.valid) {
      throw createClientError(
        validation.errors?.[0] || "Invalid governance handoff response.",
        {
          status: 200,
          code: "EXTERNAL_OPERATOR_GOVERNANCE_HANDOFF_INVALID",
          details: { validation_errors: validation.errors ?? [] },
          request_id: result.requestId,
        }
      );
    }

    return {
      handoffReceipt: validation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  return Object.freeze({
    getCurrentGovernance,
    prepareChecklist,
    evaluateSeparationOfDuties,
    acknowledgeExternalOperatorHandoff,
  });
}
