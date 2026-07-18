// PIP-MLK API resilience — retry with exponential backoff + jitter.
// Truth Above All: the LLM endpoint, the filesystem reads, and the upstream
// SPR/ElectionData.my sources all occasionally glitch. A blind retry storm
// makes things worse (thundering herd). Exponential backoff with full jitter
// spreads retries across time so the upstream can recover.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** total attempts INCLUDING the first call (so 3 = 1 try + 2 retries) */
  attempts?: number;
  /** base delay in ms for the FIRST retry */
  baseDelayMs?: number;
  /** ceiling on the per-attempt delay */
  maxDelayMs?: number;
  /** backoff multiplier — 2 = classic exponential. Default 2 */
  multiplier?: number;
  /** "full" | "none" — full jitter = random between 0 and computed delay */
  jitter?: "full" | "none";
  /**
   * Decide whether a thrown error is retryable. Default = retry on any error.
   * Override to e.g. skip 4xx HTTP errors that will never succeed.
   */
  retryIf?: (err: unknown, attempt: number) => boolean;
  /** optional sleep override — used by tests; defaults to setTimeout */
  sleep?: (ms: number) => Promise<void>;
  /** optional callback fired before each retry (for logging / metrics) */
  onRetry?: (info: { attempt: number; nextDelayMs: number; error: unknown }) => void;
}

export interface RetryOutcome<T> {
  /** final returned value */
  value: T;
  /** number of attempts actually made (1 = succeeded first try) */
  attempts: number;
  /** the last error thrown, if the final attempt failed — undefined on success */
  lastError?: unknown;
}

// ---------------------------------------------------------------------------
// Defaults — match the task spec: 3 attempts, base 500ms, max 5s.
// ---------------------------------------------------------------------------

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;
const DEFAULT_MULTIPLIER = 2;

// ---------------------------------------------------------------------------
// Sleep helper — defaults to setTimeout. Exposed for testing.
// ---------------------------------------------------------------------------

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Backoff computation
// ---------------------------------------------------------------------------

/**
 * Classic exponential backoff: delay = base * (mult ^ attempt).
 * Capped at maxDelayMs. With base=500, mult=2, max=5000:
 *   attempt 0 (after first failure) -> 500ms
 *   attempt 1                       -> 1000ms
 *   attempt 2                       -> 2000ms
 *   attempt 3                       -> 4000ms
 *   attempt 4                       -> 5000ms (capped)
 *
 * With "full" jitter (default) we then pick a uniform random in [0, delay],
 * which is the AWS-recommended strategy for spreading load. See:
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export function computeBackoff(
  attempt: number,
  baseDelayMs: number,
  multiplier: number,
  maxDelayMs: number,
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(multiplier, attempt));
  return Math.max(0, exp);
}

function applyJitter(delay: number, jitter: "full" | "none"): number {
  if (jitter === "none") return delay;
  // full jitter: uniform in [0, delay]
  return Math.floor(Math.random() * (delay + 1));
}

// ---------------------------------------------------------------------------
// retryWithBackoff
// ---------------------------------------------------------------------------

/**
 * Retry an async function with exponential backoff + jitter.
 *
 *   const r = await retryWithBackoff(() => fetchJsonWithTimeout(url), { attempts: 3 });
 *   if (r.lastError) throw r.lastError;
 *   return r.value;
 *
 * Throws the LAST error if all attempts fail (preserving the original error
 * type for callers that want to inspect it). Use the `RetryOutcome` overload
 * below if you'd rather receive `{ value, attempts, lastError }`.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const outcome = await retryWithBackoffDetailed(fn, options);
  if (outcome.lastError !== undefined) {
    throw outcome.lastError;
  }
  return outcome.value;
}

/**
 * Same as `retryWithBackoff` but never throws — returns the outcome object
 * so callers can branch on success/failure without try/catch.
 */
export async function retryWithBackoffDetailed<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryOutcome<T>> {
  const attempts = Math.max(1, options.attempts ?? DEFAULT_ATTEMPTS);
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const multiplier = options.multiplier ?? DEFAULT_MULTIPLIER;
  const jitter = options.jitter ?? "full";
  const retryIf = options.retryIf ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      const isLast = attempt === attempts - 1;
      if (isLast || !retryIf(err, attempt)) {
        return { value: undefined as T, attempts: attempt + 1, lastError: err };
      }
      const computed = computeBackoff(attempt, baseDelayMs, multiplier, maxDelayMs);
      const nextDelayMs = applyJitter(computed, jitter);
      options.onRetry?.({ attempt: attempt + 1, nextDelayMs, error: err });
      await sleep(nextDelayMs);
    }
  }
  // Unreachable — the loop always returns. Kept for TS exhaustiveness.
  return { value: undefined as T, attempts, lastError };
}
