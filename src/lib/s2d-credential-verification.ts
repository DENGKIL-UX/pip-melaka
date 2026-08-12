import { createHmac } from "node:crypto";
import { safeFetch, isSafeURL } from "@/lib/ssrf-protection";
import type { S2dCredentialKey, VerificationMode } from "@/lib/s2d-credential-vault";
import { sanitizeS2dError } from "@/lib/s2d-request-security";
import { isApifyTokenFormat } from "@/lib/s2d-apify";

export interface CredentialVerificationResult {
  verified: boolean;
  provider: string;
  mode: VerificationMode;
  error?: string;
}

interface VerifyOptions {
  getCredential: (key: S2dCredentialKey) => string | undefined;
  fetchImpl?: typeof fetch;
}

async function providerFetch(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs = 8_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, redirect: "error", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function failed(provider: string, mode: VerificationMode, error: unknown): CredentialVerificationResult {
  return { verified: false, provider, mode, error: sanitizeS2dError(error, `${provider} verification failed`) };
}

export async function verifyS2dCredential(
  key: S2dCredentialKey,
  value: string,
  options: VerifyOptions,
): Promise<CredentialVerificationResult> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    if (key === "APIFY_TOKEN") {
      const provider = "Apify";
      if (!isApifyTokenFormat(value)) {
        return failed(provider, "FORMAT_ONLY", "Token must look like apify_api_… from Console → Settings → API & Integrations");
      }
      // Official identity check: GET /v2/users/me with Authorization: Bearer
      // https://docs.apify.com/api/v2/getting-started#verify-your-account
      const response = await providerFetch("https://api.apify.com/v2/users/me", {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${value}` },
      }, fetchImpl);
      if (!response.ok) {
        const hint = response.status === 401
          ? "HTTP 401 — token is invalid, revoked, or copied with extra whitespace"
          : response.status === 403
            ? "HTTP 403 — token is not allowed to read account identity"
            : `Provider rejected credential (HTTP ${response.status})`;
        return failed(provider, "LIVE_PROVIDER", hint);
      }
      const payload = await response.json().catch(() => null);
      const user = payload?.data;
      return user && (user.id || user.username)
        ? { verified: true, provider, mode: "LIVE_PROVIDER" }
        : failed(provider, "LIVE_PROVIDER", "Provider response did not contain user data");
    }

    if (key === "S2D_ALERT_WHATSAPP_TOKEN") {
      const provider = "WhatsApp Cloud API";
      const response = await providerFetch("https://graph.facebook.com/me?fields=id,name", {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${value}` },
      }, fetchImpl);
      return response.ok
        ? { verified: true, provider, mode: "LIVE_PROVIDER" }
        : failed(provider, "LIVE_PROVIDER", `Provider rejected credential (HTTP ${response.status})`);
    }

    if (key === "S2D_ALERT_EMAIL_TOKEN") {
      const provider = "SendGrid";
      if (!value.startsWith("SG.")) {
        return failed(provider, "LIVE_PROVIDER", "Only SendGrid API keys can be live-verified by this deployment");
      }
      const response = await providerFetch("https://api.sendgrid.com/v3/user/profile", {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${value}` },
      }, fetchImpl);
      return response.ok
        ? { verified: true, provider, mode: "LIVE_PROVIDER" }
        : failed(provider, "LIVE_PROVIDER", `Provider rejected credential (HTTP ${response.status})`);
    }

    if (key === "S2D_BURP_DAST_GRAPHQL_URL") {
      const provider = "Burp DAST GraphQL URL";
      const parsed = new URL(value);
      if (!(["https:", "http:"] as string[]).includes(parsed.protocol)) {
        return failed(provider, "FORMAT_ONLY", "URL must use HTTP or HTTPS");
      }
      if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
        return failed(provider, "FORMAT_ONLY", "Production Burp DAST URLs must use HTTPS");
      }
      const safe = await isSafeURL(value);
      return safe.ok
        ? { verified: true, provider, mode: "FORMAT_ONLY" }
        : failed(provider, "FORMAT_ONLY", safe.reason ?? "SSRF policy rejected URL");
    }

    if (key === "S2D_BURP_DAST_API_KEY") {
      const provider = "Burp DAST";
      const url = options.getCredential("S2D_BURP_DAST_GRAPHQL_URL");
      if (!url) return failed(provider, "LIVE_PROVIDER", "Configure the Burp DAST GraphQL URL first");
      const response = await safeFetch(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${value}` },
        body: JSON.stringify({ query: "query CredentialHealth { __typename }" }),
        signal: AbortSignal.timeout(8_000),
      });
      return response.ok
        ? { verified: true, provider, mode: "LIVE_PROVIDER" }
        : failed(provider, "LIVE_PROVIDER", `Provider rejected credential (HTTP ${response.status})`);
    }

    if (key === "S2D_NETWORK_EVIDENCE_PRIVACY_KEY" || key === "S2D_APIFY_WEBHOOK_SHARED_SECRET") {
      const provider = key === "S2D_NETWORK_EVIDENCE_PRIVACY_KEY" ? "Network evidence HMAC" : "Apify webhook HMAC";
      if (value.length < 32) return failed(provider, "LOCAL_CRYPTO", "HMAC secret must contain at least 32 characters");
      createHmac("sha256", value).update("s2d-credential-self-test").digest("hex");
      return { verified: true, provider, mode: "LOCAL_CRYPTO" };
    }

    if (key === "TIKTOK_API_KEY") {
      const provider = "TikTok";
      if (value.length < 16 || !/^[A-Za-z0-9_.-]+$/.test(value)) {
        return failed(provider, "FORMAT_ONLY", "TikTok key format is invalid");
      }
      // TikTok client keys do not have a universal identity endpoint. A
      // deployment may configure an approved server-side health endpoint.
      const testUrl = process.env.S2D_TIKTOK_CREDENTIAL_TEST_URL?.trim();
      if (!testUrl) return { verified: true, provider, mode: "FORMAT_ONLY" };
      const safe = await isSafeURL(testUrl);
      if (!safe.ok) return failed(provider, "LIVE_PROVIDER", safe.reason ?? "SSRF policy rejected test URL");
      const response = await providerFetch(testUrl, {
        method: "HEAD",
        headers: { Authorization: `Bearer ${value}` },
      }, fetchImpl);
      return response.ok
        ? { verified: true, provider, mode: "LIVE_PROVIDER" }
        : failed(provider, "LIVE_PROVIDER", `Provider rejected credential (HTTP ${response.status})`);
    }

    return failed("Unknown provider", "FORMAT_ONLY", "Unsupported credential key");
  } catch (error) {
    return failed(key, "LIVE_PROVIDER", error);
  }
}
