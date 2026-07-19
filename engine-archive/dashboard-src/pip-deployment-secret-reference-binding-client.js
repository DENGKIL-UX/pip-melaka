import {
  buildPipSecretReferenceBindingAcceptanceReceipt,
  buildPipSecretReferenceBindingReport,
  validatePipSecretReferenceBindingAcceptanceReceipt,
  validatePipSecretReferenceBindingReport,
} from "./pip-deployment-secret-reference-binding-contract.js";

const PIP_SECRET_REFERENCE_BINDING_CLIENT_TIMEOUT_MS = 5000;
const PIP_SECRET_REFERENCE_BINDING_ROUTE =
  "/deployment/secret-reference-binding";

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
  const fallback = "Secret reference binding request failed.";
  if (!(error instanceof Error)) {
    return fallback;
  }

  return String(error.message || fallback)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240) || fallback;
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

export function createPipDeploymentSecretReferenceBindingClient({
  baseUrl,
  fetchImpl,
  timeoutMs = PIP_SECRET_REFERENCE_BINDING_CLIENT_TIMEOUT_MS,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const rootUrl = resolveBaseUrl(baseUrl);
  const fetcher =
    typeof fetchImpl === "function"
      ? fetchImpl
      : typeof fetch === "function"
        ? fetch.bind(globalThis)
        : null;

  if (typeof fetcher !== "function") {
    throw new Error("Global fetch is unavailable for secret-reference client.");
  }

  async function request({ method, path, body, csrfToken } = {}) {
    const url = `${rootUrl}${path}`;
    const headers = {
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const authSnapshot =
      typeof getAuthorizationSnapshot === "function"
        ? getAuthorizationSnapshot()
        : null;
    headers["X-PIP-Authorization-Snapshot"] = JSON.stringify(
      authSnapshot ?? null
    );

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

    if (
      response.status === 401 &&
      typeof onAuthenticationRequired === "function"
    ) {
      onAuthenticationRequired();
    }

    if (
      response.status === 403 &&
      typeof onAuthorizationDenied === "function"
    ) {
      onAuthorizationDenied();
    }

    return parseEnvelope(response);
  }

  async function getReport() {
    try {
      const response = await request({
        method: "GET",
        path: PIP_SECRET_REFERENCE_BINDING_ROUTE,
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: response.error,
          report: null,
          csrfToken: null,
        };
      }

      const reportValidation = validatePipSecretReferenceBindingReport(
        response.data.report
      );
      if (reportValidation.valid !== true) {
        return {
          ok: false,
          status: 500,
          error: "Secret reference binding report validation failed.",
          report: null,
          csrfToken: null,
        };
      }

      return {
        ok: true,
        status: response.status,
        error: null,
        report: buildPipSecretReferenceBindingReport(
          reportValidation.normalized
        ),
        csrfToken:
          typeof response.data.csrf_token === "string"
            ? response.data.csrf_token
            : typeof getCsrfToken === "function"
              ? getCsrfToken() ?? null
              : null,
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: sanitizeErrorMessage(error),
        report: null,
        csrfToken: null,
      };
    }
  }

  async function acknowledge(payload = {}) {
    try {
      const safe = isPlainObject(payload) ? payload : {};
      const body = {
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

      const response = await request({
        method: "POST",
        path: `${PIP_SECRET_REFERENCE_BINDING_ROUTE}/acknowledge`,
        body,
        csrfToken: resolvedCsrfToken,
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: response.error,
          report: null,
          receipt: null,
        };
      }

      const reportValidation = validatePipSecretReferenceBindingReport(
        response.data.report
      );
      const receiptValidation =
        validatePipSecretReferenceBindingAcceptanceReceipt(
          response.data.receipt
        );

      if (reportValidation.valid !== true || receiptValidation.valid !== true) {
        return {
          ok: false,
          status: 500,
          error:
            reportValidation.errors?.[0] ||
            receiptValidation.errors?.[0] ||
            "Secret reference binding acknowledgement validation failed.",
          report: null,
          receipt: null,
        };
      }

      return {
        ok: true,
        status: response.status,
        error: null,
        report: buildPipSecretReferenceBindingReport(
          reportValidation.normalized
        ),
        receipt: buildPipSecretReferenceBindingAcceptanceReceipt(
          buildPipSecretReferenceBindingAcceptanceReceipt(
            receiptValidation.normalized
          )
        ),
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
