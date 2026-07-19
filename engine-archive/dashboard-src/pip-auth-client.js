import { PIP_SCENARIO_API_DEFAULT_BASE_URL } from "./pip-scenario-api-contract.js";
import {
  normalizePipAuthEmail,
  validatePipAuthPasswordPolicy,
} from "./pip-auth-contract.js";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const selected = raw.length > 0 ? raw : PIP_SCENARIO_API_DEFAULT_BASE_URL;
  return selected.replace(/\/+$/, "");
}

function makeAuthClientError(message, details = {}) {
  const error = new Error(String(message ?? "Authentication request failed."));
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "AUTH_REQUEST_FAILED");
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
    throw makeAuthClientError("Malformed JSON response from authentication endpoint.", {
      status: response.status,
      code: "MALFORMED_AUTH_RESPONSE_JSON",
      request_id: response.headers.get("x-pip-request-id") ?? null,
      details: {
        response_text_sample: text.slice(0, 200),
      },
    });
  }
}

function createTimeoutWrappedFetch(fetchImpl, timeoutMs) {
  return async ({ url, method, headers, body }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchImpl(url, {
        method,
        headers,
        body,
        credentials: "include",
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw makeAuthClientError("Authentication request timed out.", {
          status: 0,
          code: "AUTH_REQUEST_TIMEOUT",
          details: { timeout_ms: timeoutMs },
        });
      }

      throw makeAuthClientError("Authentication connection failed.", {
        status: 0,
        code: "AUTH_CONNECTION_FAILED",
        details: {
          reason: String(error?.message ?? error),
        },
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

export function createPipAuthClient({
  baseUrl,
  fetchImpl,
  timeoutMs,
} = {}) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedFetch =
    fetchImpl ??
    (typeof globalThis !== "undefined" ? globalThis.fetch : null);

  if (typeof resolvedFetch !== "function") {
    throw new Error("PIP auth client requires a fetch implementation.");
  }

  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 5000;

  const withTimeout = createTimeoutWrappedFetch(resolvedFetch, resolvedTimeoutMs);

  const request = async ({ method, endpoint, body, csrfToken }) => {
    const headers = {
      Accept: "application/json",
    };

    let bodyText = undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyText = JSON.stringify(body);
    }

    if (typeof csrfToken === "string" && csrfToken.trim().length > 0) {
      headers["X-PIP-CSRF"] = csrfToken.trim();
    }

    const response = await withTimeout({
      url: `${resolvedBaseUrl}${endpoint}`,
      method,
      headers,
      body: bodyText,
    });

    const payload = await parseJsonResponse(response);

    if (!isPlainObject(payload)) {
      throw makeAuthClientError("Malformed authentication envelope.", {
        status: response.status,
        code: "MALFORMED_AUTH_ENVELOPE",
        request_id: response.headers.get("x-pip-request-id") ?? null,
      });
    }

    if (response.ok && payload.success === true) {
      return {
        data: payload.data,
        meta: isPlainObject(payload.meta) ? payload.meta : {},
        request_id: payload.request_id ?? response.headers.get("x-pip-request-id") ?? null,
        generated_at: payload.generated_at ?? null,
        status: response.status,
      };
    }

    const errorCode = String(payload?.error?.code ?? "AUTH_REQUEST_FAILED");
    const status = Number(response.status ?? 0);

    throw makeAuthClientError(
      String(payload?.error?.message ?? "Authentication request failed."),
      {
        status,
        code: errorCode,
        request_id: payload?.request_id ?? response.headers.get("x-pip-request-id") ?? null,
        details: payload?.error?.details ?? null,
      }
    );
  };

  return {
    async getSession() {
      return request({
        method: "GET",
        endpoint: "/auth/session",
      });
    },

    async signIn({ email, password }) {
      const normalizedEmail = normalizePipAuthEmail(email);
      const passwordValidation = validatePipAuthPasswordPolicy(password);

      if (passwordValidation.valid !== true) {
        throw makeAuthClientError(
          passwordValidation.errors?.[0] ?? "Password policy validation failed.",
          {
            status: 0,
            code: "INVALID_PASSWORD",
            details: {
              errors: passwordValidation.errors ?? [],
            },
          }
        );
      }

      return request({
        method: "POST",
        endpoint: "/auth/login",
        body: {
          email: normalizedEmail,
          password: String(password),
        },
      });
    },

    async signOut({ csrfToken } = {}) {
      return request({
        method: "POST",
        endpoint: "/auth/logout",
        csrfToken,
      });
    },
  };
}
