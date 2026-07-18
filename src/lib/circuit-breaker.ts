// PIP-MLK API resilience — circuit breaker.
// Truth Above All: when the z-ai-web-dev-sdk LLM endpoint is failing, every
// retry is wasted budget. A circuit breaker "opens" after N consecutive
// failures so subsequent requests fail-fast (and the assistant route can
// drop straight to its static fallback) instead of queuing behind doomed
// calls. After a cool-down, the breaker enters "half-open" and lets ONE
// probe through; success closes it again.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** consecutive failures required to open the circuit */
  failureThreshold: number;
  /** ms to wait before transitioning open -> half-open */
  resetTimeoutMs: number;
  /** half-open probe budget: how many calls are allowed through in half-open */
  halfOpenProbeBudget: number;
  /** decide whether an error counts as a "failure" for the breaker.
   *  Default = every thrown error counts. Override to ignore e.g. 4xx
   *  client errors that the user can fix. */
  isFailure?: (err: unknown) => boolean;
  /** optional callback fired on every state transition (logging/metrics) */
  onStateChange?: (info: { name: string; from: CircuitState; to: CircuitState; consecutiveFailures: number }) => void;
  /** optional callback fired on every call (logging/metrics) */
  onCall?: (info: { name: string; state: CircuitState; success: boolean; attemptMs: number }) => void;
}

export interface CircuitBreakerStatus {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  totalCalls: number;
  totalFailures: number;
  totalRejections: number;
  openedAt: number | null;
  lastStateChangeAt: number;
}

export class CircuitOpenError extends Error {
  readonly breakerName: string;
  readonly retryAfterMs: number;
  constructor(name: string, retryAfterMs: number) {
    super(`circuit breaker "${name}" is OPEN — try again in ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "CircuitOpenError";
    this.breakerName = name;
    this.retryAfterMs = retryAfterMs;
  }
}

// ---------------------------------------------------------------------------
// Internal registry — one Breaker per name.
// ---------------------------------------------------------------------------

interface Breaker {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  totalCalls: number;
  totalFailures: number;
  totalRejections: number;
  openedAt: number | null;
  lastStateChangeAt: number;
  /** how many half-open probes have been allowed through in the current half-open window */
  halfOpenProbeCount: number;
  options: CircuitBreakerOptions;
}

const breakers = new Map<string, Breaker>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreate(name: string, options: CircuitBreakerOptions): Breaker {
  let b = breakers.get(name);
  if (!b) {
    b = {
      name,
      state: "closed",
      consecutiveFailures: 0,
      totalCalls: 0,
      totalFailures: 0,
      totalRejections: 0,
      openedAt: null,
      lastStateChangeAt: Date.now(),
      halfOpenProbeCount: 0,
      options,
    };
    breakers.set(name, b);
  }
  return b;
}

function transition(b: Breaker, to: CircuitState): void {
  if (b.state === to) return;
  const from = b.state;
  b.state = to;
  b.lastStateChangeAt = Date.now();
  if (to === "open") {
    b.openedAt = Date.now();
  } else if (to === "closed") {
    b.openedAt = null;
    b.consecutiveFailures = 0;
    b.halfOpenProbeCount = 0;
  } else if (to === "half-open") {
    b.halfOpenProbeCount = 0;
  }
  b.options.onStateChange?.({
    name: b.name,
    from,
    to,
    consecutiveFailures: b.consecutiveFailures,
  });
}

/**
 * Returns the number of ms the caller should wait before the breaker will
 * transition open -> half-open. 0 if the breaker is not open or has already
 * elapsed the cool-down.
 */
function msUntilHalfOpen(b: Breaker, now: number): number {
  if (b.state !== "open" || b.openedAt === null) return 0;
  const elapsed = now - b.openedAt;
  return Math.max(0, b.options.resetTimeoutMs - elapsed);
}

// ---------------------------------------------------------------------------
// circuitBreaker — execute fn() with breaker protection.
//
// Returns:
//   - fn()'s resolved value on success (state may transition half-open -> closed)
//   - throws CircuitOpenError if the breaker is open and the cool-down hasn't elapsed
//   - re-throws fn()'s error otherwise (and counts it as a failure)
//
// State machine:
//   closed    -> closed      (normal success)
//   closed    -> open        (after `failureThreshold` consecutive failures)
//   open      -> half-open   (after `resetTimeoutMs` cool-down elapses AND a call arrives)
//   half-open -> closed      (probe succeeds)
//   half-open -> open        (probe fails — re-arm the cool-down)
// ---------------------------------------------------------------------------

export async function circuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenProbeBudget: 1,
  },
): Promise<T> {
  const b = getOrCreate(name, options);
  const now = Date.now();
  const isFailure = options.isFailure ?? (() => true);

  // State reconciliation first — if we're OPEN but the cool-down has
  // elapsed, transition to half-open and let one probe through.
  if (b.state === "open") {
    const waitMs = msUntilHalfOpen(b, now);
    if (waitMs > 0) {
      b.totalRejections++;
      throw new CircuitOpenError(name, waitMs);
    }
    transition(b, "half-open");
  }

  // Half-open gate: only let `halfOpenProbeBudget` calls through at a time.
  // Extra calls in half-open state are rejected with CircuitOpenError so the
  // probe isn't drowned by retrying clients.
  if (b.state === "half-open" && b.halfOpenProbeCount >= options.halfOpenProbeBudget) {
    b.totalRejections++;
    throw new CircuitOpenError(name, options.resetTimeoutMs);
  }

  if (b.state === "half-open") {
    b.halfOpenProbeCount++;
  }

  const start = Date.now();
  b.totalCalls++;
  try {
    const value = await fn();
    // Success path.
    const attemptMs = Date.now() - start;
    if (b.state === "half-open") {
      // Probe succeeded — close the breaker.
      transition(b, "closed");
    } else if (b.state === "closed") {
      // Reset the failure streak on any success while closed.
      b.consecutiveFailures = 0;
    }
    options.onCall?.({ name, state: b.state, success: true, attemptMs });
    return value;
  } catch (err) {
    const attemptMs = Date.now() - start;
    b.totalFailures++;

    if (!isFailure(err)) {
      // Caller said this error doesn't count. Re-throw without changing state.
      options.onCall?.({ name, state: b.state, success: false, attemptMs });
      throw err;
    }

    b.consecutiveFailures++;

    if (b.state === "half-open") {
      // Probe failed — re-open with a fresh cool-down.
      transition(b, "open");
    } else if (b.state === "closed" && b.consecutiveFailures >= options.failureThreshold) {
      transition(b, "open");
    }

    options.onCall?.({ name, state: b.state, success: false, attemptMs });
    throw err;
  }
}

/** Inspect a named breaker. Returns undefined if no breaker of that name exists. */
export function getCircuitBreakerStatus(name: string): CircuitBreakerStatus | undefined {
  const b = breakers.get(name);
  if (!b) return undefined;
  return {
    name: b.name,
    state: b.state,
    consecutiveFailures: b.consecutiveFailures,
    totalCalls: b.totalCalls,
    totalFailures: b.totalFailures,
    totalRejections: b.totalRejections,
    openedAt: b.openedAt,
    lastStateChangeAt: b.lastStateChangeAt,
  };
}

/** List every breaker's status (for /api/health or admin dashboards). */
export function getAllCircuitBreakerStatuses(): CircuitBreakerStatus[] {
  return Array.from(breakers.values()).map((b) => ({
    name: b.name,
    state: b.state,
    consecutiveFailures: b.consecutiveFailures,
    totalCalls: b.totalCalls,
    totalFailures: b.totalFailures,
    totalRejections: b.totalRejections,
    openedAt: b.openedAt,
    lastStateChangeAt: b.lastStateChangeAt,
  }));
}

/** Test hook — force a breaker into a specific state. */
export function __setCircuitBreakerStateForTests(name: string, state: CircuitState): void {
  const b = breakers.get(name);
  if (!b) return;
  transition(b, state);
}

/** Test hook — remove all breakers. */
export function __resetCircuitBreakersForTests(): void {
  breakers.clear();
}
