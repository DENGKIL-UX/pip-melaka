import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
} from "./pip-scenario-api-contract.js";
import {
  sanitizePipProductionChangeHandoffReceipt,
  sanitizePipProductionChangePackage,
  validatePipProductionChangeDryRunReport,
  validatePipProductionChangeHandoffReceipt,
  validatePipProductionChangePackage,
} from "./pip-production-activation-change-package-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
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
    sanitizeText(message, "Production activation change package request failed.")
  );
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "PRODUCTION_CHANGE_PACKAGE_REQUEST_FAILED");
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
      "Malformed JSON response from production activation change package API.",
      {
        status: response.status,
        code: "PRODUCTION_CHANGE_PACKAGE_MALFORMED_JSON",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }
}

function parseErrorEnvelope(payload, response) {
  if (!isPlainObject(payload) || payload.schema !== PIP_SCENARIO_API_ERROR_SCHEMA) {
    return createClientError(
      `Production activation change package request failed with HTTP ${response.status}.`,
      {
        status: response.status,
        code: "PRODUCTION_CHANGE_PACKAGE_HTTP_ERROR",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      }
    );
  }

  const safeError = isPlainObject(payload.error) ? payload.error : {};
  return createClientError(
    safeError.message ||
      `Production activation change package request failed with HTTP ${response.status}.`,
    {
      status: response.status,
      code: String(safeError.code ?? "PRODUCTION_CHANGE_PACKAGE_HTTP_ERROR"),
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
      details: safeError.details ?? null,
    }
  );
}

function parseSuccessEnvelope(payload, response) {
  if (!isPlainObject(payload)) {
    throw createClientError("Malformed success envelope.", {
      status: response.status,
      code: "PRODUCTION_CHANGE_PACKAGE_MALFORMED_SUCCESS",
      request_id: response.headers.get("x-pip-request-id") ?? null,
    });
  }

  if (payload.schema !== PIP_SCENARIO_API_RESPONSE_SCHEMA || payload.success !== true) {
    throw createClientError("Unexpected success envelope schema.", {
      status: response.status,
      code: "PRODUCTION_CHANGE_PACKAGE_SUCCESS_SCHEMA_MISMATCH",
      request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
    });
  }

  return payload;
}

export function createPipProductionActivationChangePackageClient({
  baseUrl,
  timeoutMs = 5000,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedTimeoutMs = Math.max(1, Number(timeoutMs) || 5000);

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
        throw createClientError(
          "Production activation change package request timed out.",
          {
            status: 0,
            code: "PRODUCTION_CHANGE_PACKAGE_TIMEOUT",
            details: { timeout_ms: resolvedTimeoutMs },
          }
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw createClientError(
        "Production activation change package request failed.",
        {
          status: 0,
          code: "PRODUCTION_CHANGE_PACKAGE_REQUEST_FAILED",
        }
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function getCurrentChangePackage() {
    const result = await send({
      method: "GET",
      path: "/admin/production-change-package",
    });

    const pkgValidation = validatePipProductionChangePackage(result?.data?.package);
    const dryRunValidation = validatePipProductionChangeDryRunReport(
      result?.data?.dry_run_report
    );
    const handoffValidation = validatePipProductionChangeHandoffReceipt(
      result?.data?.handoff_receipt
    );

    return {
      package: pkgValidation.valid ? pkgValidation.normalized : null,
      dryRunReport: dryRunValidation.valid ? dryRunValidation.normalized : null,
      handoffReceipt: handoffValidation.valid ? handoffValidation.normalized : null,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function prepareChangePackage(payload) {
    const sanitized = sanitizePipProductionChangePackage(payload);
    const result = await send({
      method: "POST",
      path: "/admin/production-change-package/prepare",
      body: {
        request_id: sanitized.request_id,
        change_window_classification: sanitized.change_window_classification,
        rollback_classification: sanitized.rollback_classification,
        monitoring_classification: sanitized.monitoring_classification,
      },
    });

    const pkgValidation = validatePipProductionChangePackage(result?.data?.package);
    if (!pkgValidation.valid) {
      throw createClientError(
        pkgValidation.errors?.[0] || "Invalid production change package response.",
        {
          status: 200,
          code: "PRODUCTION_CHANGE_PACKAGE_INVALID",
          details: { validation_errors: pkgValidation.errors ?? [] },
          request_id: result.requestId,
        }
      );
    }

    return {
      package: pkgValidation.normalized,
      idempotent: result?.data?.idempotent === true,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function runStaticDryRun(payload) {
    const sanitized = sanitizePipProductionChangePackage(payload);

    const result = await send({
      method: "POST",
      path: "/admin/production-change-package/dry-run",
      body: {
        request_id: sanitized.request_id,
        package_id: sanitized.package_id,
        package_digest: sanitized.package_digest,
      },
    });

    const validation = validatePipProductionChangeDryRunReport(
      result?.data?.dry_run_report
    );

    if (!validation.valid) {
      throw createClientError(
        validation.errors?.[0] || "Invalid production change dry-run response.",
        {
          status: 200,
          code: "PRODUCTION_CHANGE_DRY_RUN_INVALID",
          details: { validation_errors: validation.errors ?? [] },
          request_id: result.requestId,
        }
      );
    }

    return {
      dryRunReport: validation.normalized,
      meta: result.meta,
      requestId: result.requestId,
    };
  }

  async function acknowledgeOperatorHandoff(payload) {
    const sanitized = sanitizePipProductionChangeHandoffReceipt(payload);

    const result = await send({
      method: "POST",
      path: "/admin/production-change-package/acknowledge",
      body: {
        request_id: sanitized.request_id,
        package_id: sanitized.package_id,
        package_digest: sanitized.package_digest,
      },
    });

    const validation = validatePipProductionChangeHandoffReceipt(
      result?.data?.handoff_receipt
    );

    if (!validation.valid) {
      throw createClientError(
        validation.errors?.[0] || "Invalid production change handoff response.",
        {
          status: 200,
          code: "PRODUCTION_CHANGE_HANDOFF_INVALID",
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
    getCurrentChangePackage,
    prepareChangePackage,
    runStaticDryRun,
    acknowledgeOperatorHandoff,
  });
}
