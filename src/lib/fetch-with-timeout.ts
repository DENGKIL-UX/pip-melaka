// PIP-MLK API resilience — fetch() with a hard timeout.
// Truth Above All: the AI assistant calls the z-ai-web-dev-sdk LLM endpoint.
// When that endpoint stalls (network blip, upstream queue), an unbounded
// fetch can hang for minutes and eat the rate-limiter's in-flight budget.
// This wrapper aborts via AbortController after `timeoutMs` so the caller
// can fall back to a static answer or retry.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class FetchTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;
  constructor(url: string, timeoutMs: number) {
    super(`fetch timed out after ${timeoutMs}ms: ${url}`);
    this.name = "FetchTimeoutError";
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  /** override default timeout for this single call */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Default 5s — chosen because the AI assistant's max_tokens is 600 and the
// model usually streams in well under 3s. 5s gives a generous buffer without
// letting a stalled request eat the in-flight budget.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * fetch() with a hard timeout. Aborts the underlying request via
 * AbortController when `timeoutMs` elapses. If the caller passes their own
 * `signal`, the timeout is composed with it — whichever fires first wins.
 *
 * Throws `FetchTimeoutError` on timeout, re-throws the caller's AbortError
 * if the user manually aborted, otherwise rejects with the original fetch
 * error.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  options: FetchWithTimeoutOptions = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new FetchTimeoutError(url, timeoutMs)), timeoutMs);

  // Compose with caller-provided signal (if any).
  const externalSignal = options.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), {
        once: true,
      });
    }
  }

  try {
    const { signal: _omit, ...rest } = options;
    const response = await fetch(input, { ...rest, signal: controller.signal });
    return response;
  } catch (err) {
    // Distinguish "we aborted because of timeout" from "user aborted" from
    // a real network error.
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof FetchTimeoutError) throw reason;
      // Re-throw the original user-abort reason.
      throw reason instanceof Error ? reason : new DOMException("Aborted", "AbortError");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * fetchWithTimeout + JSON parsing. Returns the parsed body and the response
 * status code. Throws if the response is not ok (4xx/5xx).
 *
 *   const { data, status } = await fetchJsonWithTimeout(url, { method: "POST", body: JSON.stringify(...) });
 */
export async function fetchJsonWithTimeout<T = unknown>(
  input: string | URL | Request,
  options: FetchWithTimeoutOptions = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<{ data: T; status: number; response: Response }> {
  const response = await fetchWithTimeout(input, options, timeoutMs);
  const status = response.status;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${status} ${response.statusText} — ${body.slice(0, 200)}`);
  }
  const data = (await response.json()) as T;
  return { data, status, response };
}
