import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  validatePipIndependentReviewBoardCase,
  validatePipIndependentReviewBoardDecisionReceipt,
  validatePipIndependentReviewBoardEvaluation,
} from "./pip-independent-go-no-go-review-contract.js";

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
    sanitizeText(message, "Independent review-board request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "INDEPENDENT_REVIEW_BOARD_REQUEST_FAILED");
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
    throw createClientError("Malformed JSON response from review-board API.", {
      status: response.status,
      code: "INDEPENDENT_REVIEW_BOARD_MALFORMED_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return createClientError(
      `Independent review-board request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "INDEPENDENT_REVIEW_BOARD_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return createClientError(
    safeError.message ||
      `Independent review-board request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: String(safeError.code ?? "INDEPENDENT_REVIEW_BOARD_HTTP_ERROR"),
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw createClientError("Malformed success envelope.", {
      status: response.status,
      code: "INDEPENDENT_REVIEW_BOARD_MALFORMED_SUCCESS",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA || payload.success !== true) {
    throw createClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "INDEPENDENT_REVIEW_BOARD_SUCCESS_SCHEMA_MISMATCH",
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

export function createPipIndependentGoNoGoReviewClient({
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
        throw createClientError("Independent review-board request timed out.", {
          status: 0,
          code: "INDEPENDENT_REVIEW_BOARD_TIMEOUT",
          details: { timeout_ms: resolvedTimeoutMs },
        });
      }
      if (error instanceof Error) {
        throw error;
      }
      throw createClientError("Independent review-board request failed.", {
        status: 0,
        code: "INDEPENDENT_REVIEW_BOARD_REQUEST_FAILED",
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function getCurrentReviewBoard() {
    const result = await send({
      method: "GET",
      path: withP134Context("/production/review-board"),
    });

    const caseValidation = validatePipIndependentReviewBoardCase(result?.data?.review_case);
    const evaluationValidation = validatePipIndependentReviewBoardEvaluation(
      result?.data?.review_evaluation
    );
    const decisionValidation = validatePipIndependentReviewBoardDecisionReceipt(
      result?.data?.decision_receipt
    );

    return {
      reviewCase: caseValidation.valid ? caseValidation.normalized : null,
      reviewEvaluation: evaluationValidation.valid
        ? evaluationValidation.normalized
        : null,
      decisionReceipt: decisionValidation.valid ? decisionValidation.normalized : null,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function prepareReviewBoardCase(payload) {
    const result = await send({
      method: "POST",
      path: withP134Context("/production/review-board/prepare"),
      body: payload,
    });

    const caseValidation = validatePipIndependentReviewBoardCase(result?.data?.review_case);
    if (!caseValidation.valid) {
      throw createClientError(
        caseValidation.errors?.[0] || "Invalid review-case response.",
        {
          status: 200,
          code: "INDEPENDENT_REVIEW_BOARD_CASE_INVALID",
          details: { validation_errors: caseValidation.errors ?? [] },
          request_id: result.requestId,
        }
      );
    }

    return {
      reviewCase: caseValidation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function evaluateReviewBoard(payload) {
    const result = await send({
      method: "POST",
      path: withP134Context("/production/review-board/evaluate"),
      body: payload,
    });

    const caseValidation = validatePipIndependentReviewBoardCase(result?.data?.review_case);
    const evaluationValidation = validatePipIndependentReviewBoardEvaluation(
      result?.data?.review_evaluation
    );

    if (!caseValidation.valid || !evaluationValidation.valid) {
      throw createClientError("Invalid review-board evaluation response.", {
        status: 200,
        code: "INDEPENDENT_REVIEW_BOARD_EVALUATION_INVALID",
        details: {
          case_errors: caseValidation.errors ?? [],
          evaluation_errors: evaluationValidation.errors ?? [],
        },
        request_id: result.requestId,
      });
    }

    return {
      reviewCase: caseValidation.normalized,
      reviewEvaluation: evaluationValidation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function recordReviewBoardDecision(payload) {
    const result = await send({
      method: "POST",
      path: withP134Context("/production/review-board/decision"),
      body: payload,
    });

    const decisionValidation = validatePipIndependentReviewBoardDecisionReceipt(
      result?.data?.decision_receipt
    );

    if (!decisionValidation.valid) {
      throw createClientError(
        decisionValidation.errors?.[0] || "Invalid review-board decision response.",
        {
          status: 200,
          code: "INDEPENDENT_REVIEW_BOARD_DECISION_INVALID",
          details: { validation_errors: decisionValidation.errors ?? [] },
          request_id: result.requestId,
        }
      );
    }

    return {
      decisionReceipt: decisionValidation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  return {
    getCurrentReviewBoard,
    prepareReviewBoardCase,
    evaluateReviewBoard,
    recordReviewBoardDecision,
  };
}
