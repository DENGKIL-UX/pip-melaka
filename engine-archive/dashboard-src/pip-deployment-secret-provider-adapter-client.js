import {
  buildPipSecretProviderAdapterAcceptanceReceipt,
  sanitizePipSecretProviderAdapterAcceptanceReceipt,
  sanitizePipSecretProviderAdapterReport,
  validatePipSecretProviderAdapterAcceptanceReceipt,
  validatePipSecretProviderAdapterReport,
} from "./pip-deployment-secret-provider-adapter-contract.js";

const PIP_SECRET_PROVIDER_ADAPTER_CLIENT_TIMEOUT_MS = 5000;
const PIP_SECRET_PROVIDER_ADAPTER_ROUTE =
  "/deployment/secret-provider-adapter";

function resolveBaseUrl(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "http://127.0.0.1:4181/api/v1";
  }
  return normalized.replace(/\/+$/, "");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createTimeoutSignal(timeoutMs) {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new Error("Request timed out."));
  }, timeoutMs);
  return controller.signal;
}

function sanitizeErrorMessage(error) {
  const fallback = "Secret-provider adapter request failed.";
  if (!(error instanceof Error)) {
    return fallback;
  }

  return String(error.message || fallback)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240) || fallback;
}

function assertNoSensitiveFields(payload) {
  const serialized = JSON.stringify(payload ?? {});
  if (
    /secret_name|secret_value|environment_variable|environment_value|password|username|hostname|host|port|database|connection_string|credential|token|cookie|session_id|filesystem_path|raw_error/i.test(
      serialized
    )
  ) {
    throw new Error(
      "Secret-provider adapter payload contains prohibited sensitive fields."
    );
  }
}

async function parseEnvelope(response) {
  const payload = await response.json().catch(() => ({}));
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      status: response.status,
      error: "Malformed API response envelope.",
    };
  }

  if (response.ok !== true || payload.success !== true) {
    return {
      ok: false,
      status: response.status,
      error:
        String(payload.error ?? payload.message ?? "Request failed.")
          .replace(/[\u0000-\u001F\u007F]/g, " ")
          .trim() || "Request failed.",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: isPlainObject(payload.data) ? payload.data : {},
  };
}

export function createPipDeploymentSecretProviderAdapterClient({
  baseUrl,
  fetchImpl,
  timeoutMs = PIP_SECRET_PROVIDER_ADAPTER_CLIENT_TIMEOUT_MS,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const rootUrl = resolveBaseUrl(baseUrl);
  const fetcher =
    typeof fetchImpl === "function"
      ? fetchImpl
      : (typeof fetch === "function" ? fetch.bind(globalThis) : null);

  if (typeof fetcher !== "function") {
    throw new Error("Global fetch is unavailable for adapter client.");
  }

  async function request({ method, path, body, csrfToken } = {}) {
    const url = `${rootUrl}${path}`;
    const headers = {
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (csrfToken) {
      headers["x-pip-csrf-token"] = csrfToken;
    }

    const response = await fetcher(url, {
      method,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: createTimeoutSignal(timeoutMs),
    });

    if (response.status === 401 && typeof onAuthenticationRequired === "function") {
      onAuthenticationRequired();
    }

    if (response.status === 403 && typeof onAuthorizationDenied === "function") {
      onAuthorizationDenied();
    }

    return parseEnvelope(response);
  }

  async function getReport({ includeAuth = true } = {}) {
    try {
      const reportResult = await request({
        method: "GET",
        path: PIP_SECRET_PROVIDER_ADAPTER_ROUTE,
      });

      const authSnapshot =
        includeAuth === true && typeof getAuthorizationSnapshot === "function"
          ? getAuthorizationSnapshot() ?? null
          : null;

      const resolvedCsrfToken =
        typeof getCsrfToken === "function"
          ? getCsrfToken() ?? null
          : null;

      if (!reportResult.ok) {
        return {
          ok: false,
          status: reportResult.status,
          error: reportResult.error,
          report: null,
          authSnapshot,
          csrfToken: resolvedCsrfToken,
        };
      }

      const reportValidation = validatePipSecretProviderAdapterReport(
        reportResult.data.report
      );

      if (reportValidation.valid !== true) {
        return {
          ok: false,
          status: 500,
          error: "Secret-provider adapter report validation failed.",
          report: null,
          authSnapshot,
          csrfToken: resolvedCsrfToken,
        };
      }

      assertNoSensitiveFields(reportValidation.normalized);

      return {
        ok: true,
        status: reportResult.status,
        error: null,
        report: sanitizePipSecretProviderAdapterReport(
          reportValidation.normalized
        ),
        authSnapshot,
        csrfToken:
          typeof reportResult.data.csrf_token === "string"
            ? reportResult.data.csrf_token
            : resolvedCsrfToken,
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: sanitizeErrorMessage(error),
        report: null,
        authSnapshot: null,
        csrfToken: null,
      };
    }
  }

  async function acknowledge(payload = {}) {
    try {
      const safe = isPlainObject(payload) ? payload : {};
      const body = {
        acceptance_reason:
          typeof safe.acceptance_reason === "string"
            ? safe.acceptance_reason.slice(0, 240)
            : "",
        acknowledged_by:
          typeof safe.acknowledged_by === "string"
            ? safe.acknowledged_by.slice(0, 160)
            : "",
        acknowledgement_reference:
          typeof safe.acknowledgement_reference === "string"
            ? safe.acknowledgement_reference.slice(0, 120)
            : "",
      };

      const resolvedCsrfToken =
        typeof safe.csrf_token === "string"
          ? safe.csrf_token
          : typeof getCsrfToken === "function"
            ? getCsrfToken() ?? undefined
            : undefined;

      const result = await request({
        method: "POST",
        path: `${PIP_SECRET_PROVIDER_ADAPTER_ROUTE}/acceptance`,
        body,
        csrfToken: resolvedCsrfToken,
      });

      if (!result.ok) {
        return {
          ok: false,
          status: result.status,
          error: result.error,
          report: null,
          receipt: null,
        };
      }

      const reportValidation = validatePipSecretProviderAdapterReport(
        result.data.report
      );

      if (reportValidation.valid !== true) {
        return {
          ok: false,
          status: 500,
          error: "Secret-provider adapter acknowledgement report validation failed.",
          report: null,
          receipt: null,
        };
      }

      const receiptValidation =
        validatePipSecretProviderAdapterAcceptanceReceipt(result.data.receipt);

      if (receiptValidation.valid !== true) {
        return {
          ok: false,
          status: 500,
          error:
            "Secret-provider adapter acknowledgement receipt validation failed.",
          report: null,
          receipt: null,
        };
      }

      const sanitizedReport = sanitizePipSecretProviderAdapterReport(
        reportValidation.normalized
      );
      const sanitized = sanitizePipSecretProviderAdapterAcceptanceReceipt(
        buildPipSecretProviderAdapterAcceptanceReceipt(
          receiptValidation.normalized
        )
      );
      assertNoSensitiveFields(sanitizedReport);
      assertNoSensitiveFields(sanitized);

      return {
        ok: true,
        status: result.status,
        error: null,
        report: sanitizedReport,
        receipt: sanitized,
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: sanitizeErrorMessage(error),
        report: null,
        receipt: null,
      };
    }
  }

  return {
    getReport,
    acknowledge,
  };
}
