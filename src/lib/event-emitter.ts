// src/lib/event-emitter.ts
// PIP-MLK in-process typed pub/sub event emitter.
//
// Implements pattern 1.2 (Pub/Sub) + soft in-process DLQ (pattern 1.6).
//
// Why this exists:
//   PIP-MLK is a single-process Next.js app — no external message broker is
//   warranted. But we still need decoupled notification: the cron job that
//   refreshes DPT data (src/lib/cron-jobs.ts) should not know which React
//   components care about the refresh. The emitter lets producers `emit`
//   events and consumers `on` them, with no direct import coupling.
//
// Design choices:
//   - Typed via a `EventMap` interface so subscribers get auto-completion
//     and producers can't emit unknown event names.
//   - Wildcard listeners (`*`) for cross-cutting concerns (logging, metrics).
//   - `on()` returns an `unsubscribe` function — call it from useEffect
//     cleanup to avoid leaks (pattern 4.1 — Memory Leaks).
//   - Errors in subscribers are caught, logged, and recorded in a bounded
//     `errorHistory` (soft DLQ) so one bad listener doesn't break delivery
//     to others. The original event is NOT retried (would loop forever).
//   - Synchronous dispatch (like Node's EventEmitter) — keeps ordering
//     predictable. For async work, subscribers should `await` inside their
//     own handlers; the emitter does not wait.
//   - Bounded `errorHistory` (50 entries) prevents unbounded memory growth
//     if a listener is permanently broken.

// ---------------------------------------------------------------------------
// Event map — extend this interface to add new event types.
// Keep namespaced as `domain:action` (e.g. `dpt:refreshed`, `signal:new`).
// ---------------------------------------------------------------------------
export interface EventMap {
  // DPT (Daftar Pemilih Tambahan) refresh lifecycle
  "dpt:refresh-started": { parliament: string; runId: string; at: Date };
  "dpt:refreshed": { parliament: string; netChange: number; at: Date };
  "dpt:refresh-failed": { parliament: string; error: string; at: Date };

  // S2D signal lifecycle (mirrors useS2DStore actions)
  "signal:new": { signalId: string; title: string; severity: "critical" | "warning" | "info" };
  "signal:updated": { signalId: string; status: "new" | "acknowledged" | "acting" | "resolved" };
  "signal:resolved": { signalId: string; action: string };

  // Engine manifest audit
  "engine:manifest-checked": { runId: string; gatesClosed: number; gatesTotal: number };
  "engine:manifest-drift": { runId: string; missingGates: string[] };

  // Cron lifecycle
  "cron:tick": { jobId: string; at: Date };
  "cron:error": { jobId: string; error: string; at: Date };

  // Governance provenance audit
  "governance:audit": { openGates: string[]; at: Date };
}

export type EventName = keyof EventMap;

// A listener that takes the typed payload of an event.
export type EventListener<K extends EventName> = (payload: EventMap[K]) => void;

// A wildcard listener receives the event name + the untyped payload.
export type WildcardListener = (name: EventName, payload: unknown) => void;

interface ErrorRecord {
  event: EventName;
  error: string;
  listenerIndex: number;
  at: Date;
}

class TypedEmitter {
  private listeners = new Map<EventName, Set<EventListener<EventName>>>();
  private wildcardListeners = new Set<WildcardListener>();
  private errorHistory: ErrorRecord[] = [];
  private readonly maxErrorHistory = 50;

  /**
   * Subscribe to a typed event. Returns an unsubscribe function — call it
   * from React useEffect cleanup to prevent memory leaks (pattern 4.1).
   *
   * @example
   * useEffect(() => {
   *   return emitter.on("dpt:refreshed", ({ parliament }) => refetch(parliament));
   * }, []);
   */
  on<K extends EventName>(name: K, listener: EventListener<K>): () => void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(listener as EventListener<EventName>);
    return () => this.off(name, listener);
  }

  /**
   * Subscribe to all events (wildcard). Useful for logging/metrics/audit.
   * Returns an unsubscribe function.
   */
  onAny(listener: WildcardListener): () => void {
    this.wildcardListeners.add(listener);
    return () => this.wildcardListeners.delete(listener);
  }

  /**
   * Unsubscribe a specific listener. Usually called via the function
   * returned by `on()`; provided separately for explicit cleanup paths.
   */
  off<K extends EventName>(name: K, listener: EventListener<K>): void {
    const set = this.listeners.get(name);
    if (!set) return;
    set.delete(listener as EventListener<EventName>);
    if (set.size === 0) this.listeners.delete(name);
  }

  /**
   * Emit an event. Synchronous — all listeners are called before emit returns.
   * Listener errors are caught and logged to `errorHistory` (soft DLQ);
   * delivery to other listeners continues. Wildcard listeners are invoked
   * AFTER typed listeners and never receive retried events.
   */
  emit<K extends EventName>(name: K, payload: EventMap[K]): void {
    const set = this.listeners.get(name);
    let listenerIndex = 0;
    if (set) {
      // Iterate over a snapshot so a listener that unsubscribes itself
      // doesn't perturb the iteration.
      for (const listener of Array.from(set)) {
        try {
          (listener as EventListener<K>)(payload);
        } catch (err) {
          const record: ErrorRecord = {
            event: name,
            error: err instanceof Error ? err.message : String(err),
            listenerIndex,
            at: new Date(),
          };
          this.pushError(record);
          // Log to stderr so it shows in dev.log / server logs.
          console.error(`[emitter] listener error on "${name}" (#${listenerIndex}):`, err);
        }
        listenerIndex++;
      }
    }

    // Wildcard listeners — fire after typed, swallow their errors too.
    for (const wl of Array.from(this.wildcardListeners)) {
      try {
        wl(name, payload);
      } catch (err) {
        const record: ErrorRecord = {
          event: name,
          error: err instanceof Error ? err.message : String(err),
          listenerIndex: -1, // -1 marks wildcard
          at: new Date(),
        };
        this.pushError(record);
        console.error(`[emitter] wildcard listener error on "${name}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a specific event (or all events if no arg).
   * Useful in tests and during graceful shutdown.
   */
  removeAll(name?: EventName): void {
    if (name) {
      this.listeners.delete(name);
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
    }
  }

  /**
   * Return a snapshot of recent listener errors (soft DLQ). Newest first.
   * Use this in a /api/debug/emitter-errors endpoint or health check.
   */
  getErrorHistory(): readonly ErrorRecord[] {
    return [...this.errorHistory];
  }

  /**
   * Introspection — number of typed listeners for a given event.
   * Mainly for health checks and debugging.
   */
  listenerCount(name: EventName): number {
    return this.listeners.get(name)?.size ?? 0;
  }

  private pushError(record: ErrorRecord): void {
    this.errorHistory.unshift(record);
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.length = this.maxErrorHistory;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton — one emitter per process. Next.js dev-server hot reload can
// re-import this module; the `globalForEmitter` guard prevents multiple
// emitters from coexisting (same pattern as globalForPrisma in src/lib/db.ts).
// ---------------------------------------------------------------------------
const globalForEmitter = globalThis as unknown as { __pipMlkEmitter?: TypedEmitter };

export const emitter: TypedEmitter =
  globalForEmitter.__pipMlkEmitter ?? new TypedEmitter();

if (!globalForEmitter.__pipMlkEmitter) {
  globalForEmitter.__pipMlkEmitter = emitter;

  // Wire a default wildcard logger so every event is visible in dev.log.
  // This is intentionally verbose — comment out in production if noisy.
  if (process.env.NODE_ENV !== "production") {
    emitter.onAny((name, payload) => {
      console.log(`[emitter] ${name}`, payload);
    });
  }
}

export default emitter;
