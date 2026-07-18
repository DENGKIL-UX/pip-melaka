// PIP-MLK Structured JSON Logger
// --------------------------------
// Truth Above All: every log line is a single JSON object written to stdout
// (and stderr for warn/error), so downstream collectors (Loki, CloudWatch,
// journald, etc.) can parse without regex. Each line carries:
//
//   {
//     "ts":        ISO-8601 timestamp,
//     "level":     "debug" | "info" | "warn" | "error",
//     "message":   human-readable summary,
//     "requestId": per-request correlation ID (if inside a request),
//     "traceId":   distributed trace ID (if a trace is active),
//     "spanId":    current span ID (if a span is active),
//     "context":   arbitrary structured key/value pairs
//   }
//
// Levels are filtered via PIP_MLK_LOG_LEVEL (default "info"). Trace fields
// are populated by reading the active span from `@/lib/tracing` — this is
// a runtime lookup so the ESM circular reference between logger ↔ tracing
// resolves cleanly (functions are called at runtime, not at import time).

import { getRequestId, getRequestStartedAt } from "@/lib/request-id";

// Lazy type-only import to avoid a runtime circular dependency at module
// init. The actual call happens inside log functions at runtime.
import type { TraceContext } from "@/lib/tracing";

// ---------------------------------------------------------------------------
// Log levels + severity ordering.
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = "info";

function getConfiguredLevel(): LogLevel {
  const env = (typeof process !== "undefined" && process.env?.PIP_MLK_LOG_LEVEL) || "";
  const lvl = env.toLowerCase() as LogLevel;
  if (lvl === "debug" || lvl === "info" || lvl === "warn" || lvl === "error") {
    return lvl;
  }
  return DEFAULT_LEVEL;
}

// ---------------------------------------------------------------------------
// Context type — the structured payload attached to each log entry.
// ---------------------------------------------------------------------------

export type LogContext = Record<string, unknown>;

export interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  requestId: string | null;
  traceId: string | null;
  spanId: string | null;
  context: LogContext;
}

// ---------------------------------------------------------------------------
// Trace-context provider hook.
// tracing.ts calls setTraceContextProvider() at module init to register its
// getTraceContext() function. This breaks what would otherwise be a hard
// import cycle. Until tracing.ts has registered, we return null.
// ---------------------------------------------------------------------------

type TraceContextProvider = () => TraceContext | null;
let traceContextProvider: TraceContextProvider | null = null;

export function setTraceContextProvider(provider: TraceContextProvider): void {
  traceContextProvider = provider;
}

function readTraceContext(): TraceContext | null {
  try {
    return traceContextProvider ? traceContextProvider() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core emit function — builds the entry, filters by level, writes to stdout
// or stderr.
// ---------------------------------------------------------------------------

function isoTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel, configured: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configured];
}

function emit(level: LogLevel, message: string, context: LogContext): LogEntry | null {
  const configured = getConfiguredLevel();
  if (!shouldLog(level, configured)) {
    return null;
  }

  const trace = readTraceContext();
  const entry: LogEntry = {
    ts: isoTimestamp(),
    level,
    message,
    requestId: getRequestId(),
    traceId: trace?.traceId ?? null,
    spanId: trace?.spanId ?? null,
    context,
  };

  // warn + error → stderr; debug + info → stdout.
  const line = JSON.stringify(entry);
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  try {
    stream.write(line + "\n");
  } catch {
    // If the stream is closed (e.g. during process exit), drop silently.
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Public logger API.
// ---------------------------------------------------------------------------

export const logger = {
  debug(message: string, context: LogContext = {}): LogEntry | null {
    return emit("debug", message, context);
  },
  info(message: string, context: LogContext = {}): LogEntry | null {
    return emit("info", message, context);
  },
  warn(message: string, context: LogContext = {}): LogEntry | null {
    return emit("warn", message, context);
  },
  error(message: string, context: LogContext = {}): LogEntry | null {
    return emit("error", message, context);
  },
};

/**
 * Returns the time elapsed (in ms) since the current request started, or
 * null if called outside a request context. Useful for logging duration
 * fields like `{ durationMs: elapsedSinceRequestStart() }`.
 */
export function elapsedSinceRequestStart(): number | null {
  const startedAt = getRequestStartedAt();
  return startedAt === null ? null : Date.now() - startedAt;
}

export default logger;
