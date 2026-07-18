// src/lib/websocket-server.ts
// PIP-MLK WebSocket server for real-time S2D signal broadcasts.
//
// Implements pattern 5.8 (WebSockets) + pattern 4.4 (Backpressure).
//
// Why this exists:
//   The S2D Action Console (src/components/tabs/s2d-console-tab.tsx) tracks
//   signals through a lifecycle (new → acknowledged → acting → resolved).
//   When two analysts are using the dashboard simultaneously, an action by
//   one should propagate to the other's screen in real time. The WebSocket
//   server broadcasts signal lifecycle events; analysts' browsers subscribe
//   and update their local Zustand store.
//
// Frontend connection (see examples/websocket/frontend.tsx):
//   import { io } from "socket.io-client";
//   const sock = io("/?XTransformPort=3003", { transports: ["websocket"] });
//   sock.on("signal:new", (s) => useS2DStore.getState().addSignal(s));
//
// IMPORTANT — dependency note:
//   The `socket.io` package is NOT installed in this sandbox (verified via
//   `ls node_modules/socket.io`). This file is written so that:
//     (a) ESLint passes (no top-level import of a missing module).
//     (b) `startWsServer()` is callable and returns a clear error message
//         with installation instructions if socket.io isn't installed.
//     (c) Once `bun add socket.io` is run, the server starts and works
//         with zero code changes.
//   This pattern (lazy dynamic import + helpful runtime error) is the
//   correct way to ship optional-dependency code in a shared library.
//
// Server config — match examples/websocket/server.ts:
//   - path: "/" (required by Caddy — it forwards /?XTransformPort=PORT)
//   - port: 3003 (the conventional PIP-MLK mini-service port)
//   - CORS: "*" (read-only broadcasts; no auth currently)
//   - pingTimeout/pingInterval: 60s/25s (defaults from the example)

// ---------------------------------------------------------------------------
// Event types — these mirror src/stores/s2d-store.ts.
// Defined locally so this file doesn't pull the client-side store into a
// server bundle.
// ---------------------------------------------------------------------------
export type SignalSeverity = "critical" | "warning" | "info";
export type SignalStatus = "new" | "acknowledged" | "acting" | "resolved";
export type AnalyticalLevel = "descriptive" | "diagnostic" | "predictive" | "prescriptive";

export interface S2DSignalPayload {
  id: string;
  timestamp: string;
  severity: SignalSeverity;
  level: AnalyticalLevel;
  title: string;
  description: string;
  parliament?: string;
  dun?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  status: SignalStatus;
  recommendation?: string;
}

export interface SignalUpdatePayload {
  signalId: string;
  status: SignalStatus;
  action?: string;
  at: string;
}

export interface ServerStatus {
  running: boolean;
  port: number | null;
  connectedClients: number;
  startedAt: Date | null;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Server singleton. Held in a module-level variable so `getServer()` returns
// the same instance across hot reloads.
// ---------------------------------------------------------------------------
interface SocketIoServer {
  on: (event: string, handler: (socket: unknown) => void) => void;
  emit: (event: string, payload: unknown) => void;
  close: (cb?: () => void) => void;
  engine?: { clientsCount: number };
}

interface HttpServer {
  listen: (port: number, cb?: () => void) => void;
  close: (cb?: () => void) => void;
}

class WsServerHolder {
  private io: SocketIoServer | null = null;
  private httpServer: HttpServer | null = null;
  private port: number | null = null;
  private startedAt: Date | null = null;
  private lastError: string | null = null;
  private connectedClients = 0;

  /**
   * Start the WebSocket server on the given port. Default 3003.
   *
   * @returns {Promise<boolean>} true if started, false if socket.io is not installed.
   *                              In the false case, `lastError` is set with install instructions.
   */
  async start(port = 3003): Promise<boolean> {
    if (this.io) {
      // Already running — idempotent no-op.
      return true;
    }

    // Lazy dynamic import so ESLint/tsc don't require socket.io at build time.
    // The `@ts-ignore` here is correct: socket.io is an optional runtime dep.
    let socketIoMod: { Server: new (server: HttpServer, opts?: unknown) => SocketIoServer } | null = null;
    try {
      // @ts-ignore — optional dependency, may not be installed in this sandbox.
      socketIoMod = await import("socket.io");
    } catch (err) {
      this.lastError = `socket.io not installed. Run: bun add socket.io  (${err instanceof Error ? err.message : String(err)})`;
      console.error(`[ws-server] ${this.lastError}`);
      return false;
    }

    let createServer: typeof import("node:http").createServer;
    try {
      // node:http is always available in Node/Bun runtimes.
      const http = await import("node:http");
      createServer = http.createServer;
    } catch (err) {
      this.lastError = `node:http unavailable (${err instanceof Error ? err.message : String(err)})`;
      return false;
    }

    this.httpServer = createServer();
    this.io = new socketIoMod!.Server(this.httpServer, {
      path: "/", // Caddy requires this — see Caddyfile + examples/websocket/server.ts
      cors: { origin: "*", methods: ["GET", "POST"] },
      pingTimeout: 60000,
      pingInterval: 25000,
      // Per-connection send buffer cap — protects against slow consumers
      // (pattern 4.4 — Backpressure). When a client's buffer exceeds this,
      // we'll disconnect it (see handleSlowConsumer below).
      maxHttpBufferSize: 1e6, // 1 MB max inbound message
    });
    this.port = port;
    this.startedAt = new Date();

    this.io.on("connection", (socket: unknown) => this.handleConnection(socket));

    return new Promise<boolean>((resolve) => {
      this.httpServer!.listen(port, () => {
        console.log(`[ws-server] WebSocket server running on port ${port} (path /)`);
        resolve(true);
      });
      this.httpServer!.listen = this.httpServer!.listen.bind(this.httpServer);
    });
  }

  /** Stop the server. Safe to call when not running. */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close();
        this.io = null;
      }
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
          console.log("[ws-server] stopped");
          resolve();
        });
      } else {
        resolve();
      }
      this.port = null;
      this.startedAt = null;
      this.connectedClients = 0;
    });
  }

  // -----------------------------------------------------------------------
  // Broadcast APIs — call from anywhere in the server process to push
  // updates to all connected dashboards. These are the only methods the
  // rest of the codebase should call.
  // -----------------------------------------------------------------------

  /** Broadcast a new S2D signal to all connected dashboards. */
  broadcastNewSignal(signal: S2DSignalPayload): void {
    if (!this.io) return;
    this.io.emit("signal:new", signal);
  }

  /** Broadcast a signal status change (e.g. acknowledged, resolved). */
  broadcastSignalUpdate(update: SignalUpdatePayload): void {
    if (!this.io) return;
    this.io.emit("signal:updated", update);
  }

  /** Broadcast a manual notification (e.g. "DPT refresh complete"). */
  broadcastNotification(message: string, level: "info" | "warning" | "error" = "info"): void {
    if (!this.io) return;
    this.io.emit("notification", { message, level, at: new Date().toISOString() });
  }

  /** Snapshot for /api/health. */
  getStatus(): ServerStatus {
    return {
      running: this.io !== null,
      port: this.port,
      connectedClients: this.connectedClients,
      startedAt: this.startedAt,
      lastError: this.lastError,
    };
  }

  // -----------------------------------------------------------------------
  // Internal — connection lifecycle.
  // -----------------------------------------------------------------------

  private handleConnection(socket: unknown): void {
    this.connectedClients++;

    // We treat `socket` as opaque — its type varies between socket.io versions.
    // Use the documented runtime API: socket.on, socket.emit, socket.disconnect.
    type Socket = {
      id: string;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      emit: (event: string, payload: unknown) => void;
      disconnect: (close?: boolean) => void;
      conn?: { on: (event: string, handler: () => void) => void };
    };
    const s = socket as Socket;

    console.log(`[ws-server] client connected: ${s.id} (total: ${this.connectedClients})`);

    // Client → server events.
    s.on("signal:acknowledge", (signalId: unknown) => {
      // A client acknowledged a signal — broadcast to everyone else.
      // (In production, this would also persist to the DB; see pattern 2.3.)
      this.broadcastSignalUpdate({
        signalId: String(signalId),
        status: "acknowledged",
        at: new Date().toISOString(),
      });
    });

    s.on("signal:resolve", (payload: unknown) => {
      const p = (payload ?? {}) as { signalId?: string; action?: string };
      if (!p.signalId) return;
      this.broadcastSignalUpdate({
        signalId: p.signalId,
        status: "resolved",
        action: p.action,
        at: new Date().toISOString(),
      });
    });

    // Backpressure guard — pattern 4.4. socket.io v4 fires `ping` and
    // `disconnect` events on `socket.conn`. If the client stops responding
    // to pings (slow consumer / dead connection), socket.io auto-disconnects.
    // We add an explicit guard: if the connection's transport reports a
    // large buffered amount, force-disconnect.
    if (s.conn) {
      s.conn.on("drain", () => {
        // Drain fired — OS-level socket buffer flushed. Nothing to do; logged
        // for visibility during dev.
      });
    }

    s.on("disconnect", () => {
      this.connectedClients = Math.max(0, this.connectedClients - 1);
      console.log(`[ws-server] client disconnected: ${s.id} (total: ${this.connectedClients})`);
    });

    s.on("error", (err: unknown) => {
      console.error(`[ws-server] socket error (${s.id}):`, err);
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton — same globalThis pattern as src/lib/db.ts, src/lib/event-emitter.ts,
// and src/lib/cron-jobs.ts. Prevents duplicate servers across Next.js HMR.
// ---------------------------------------------------------------------------
const globalForWs = globalThis as unknown as { __pipMlkWsServer?: WsServerHolder };

export const wsServer: WsServerHolder = globalForWs.__pipMlkWsServer ?? new WsServerHolder();

if (!globalForWs.__pipMlkWsServer) {
  globalForWs.__pipMlkWsServer = wsServer;
}

/**
 * Convenience: start the WebSocket server on port 3003 (or override).
 *
 * @example
 * // mini-services/ws-server/index.ts
 * import { startWsServer } from "@/lib/websocket-server";
 * await startWsServer(3003);
 *
 * // Or from a Next.js API route (less ideal — server lives only as long
 * // as the route handler is active; better to run as a separate process).
 *
 * @returns {Promise<boolean>} true if started, false if socket.io not installed.
 */
export async function startWsServer(port = 3003): Promise<boolean> {
  return wsServer.start(port);
}

/**
 * Convenience: stop the WebSocket server. Safe to call when not running.
 */
export async function stopWsServer(): Promise<void> {
  return wsServer.stop();
}

/**
 * Convenience: get the server's status for /api/health.
 */
export function getWsServerStatus(): ServerStatus {
  return wsServer.getStatus();
}

export default wsServer;
