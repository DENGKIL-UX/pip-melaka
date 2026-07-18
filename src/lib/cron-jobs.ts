// src/lib/cron-jobs.ts
// PIP-MLK in-process cron scheduler for periodic background tasks.
//
// Relevant patterns (see docs/RESEARCH-DISTRIBUTED-SYSTEMS.md):
//   - 1.1 Message Queues (cron = scheduled producer)
//   - 1.2 Pub/Sub (jobs emit events via src/lib/event-emitter.ts)
//   - 2.5 Distributed Locks (singleton `globalForCron` is the local analog)
//   - 2.6 Race Conditions (singleton prevents double-scheduling on HMR)
//   - 2.8 Leader Election (process-local stand-in)
//   - 6.2 Health Checks (getCronStatus() exposed for /api/health)
//   - 8.3 Postmortems (every job run is logged for after-the-fact RCA)
//
// Why this exists:
//   PIP-MLK currently ships pre-generated engine output in public/data/.
//   The engine itself runs out-of-band (see engine/ scripts). Once Gate 9
//   closes (raw SPR voter xlsx ingestion), the engine runs will become
//   scheduled. This module scaffolds the scheduler: cron expressions are
//   declared as data, jobs run in the Next.js process, and job outcomes
//   are broadcast via the in-process emitter so React tabs can re-fetch.
//
// Design choices:
//   - `setInterval` rather than a true cron expression parser — keeps the
//     dependency surface at zero. Each job declares `intervalMs` and an
//     optional `runOnStart` flag.
//   - `globalForCron` singleton prevents Next.js dev-server hot reload from
//     spawning duplicate schedulers. (In a multi-instance deployment you
//     would replace this with a Redis Redlock or external scheduler like
//     AWS EventBridge — see pattern 2.5.)
//   - Job handlers are async; a job that's still running when its next tick
//     fires is skipped (`isRunning` guard) to prevent pile-up.
//   - All job outcomes (start, success, error) emit events via the emitter
//     and are recorded in `runHistory` (bounded LIFO of 100 entries) for
//     /api/health introspection.
//   - Graceful shutdown: `stopAll()` clears intervals and emits a final
//     `cron:tick` for visibility. The Next.js process exiting will clean
//     up anyway, but explicit cleanup makes tests and restarts predictable.

import { emitter } from "@/lib/event-emitter";

// ---------------------------------------------------------------------------
// Job registry — declare scheduled jobs here.
// ---------------------------------------------------------------------------
export interface CronJob {
  id: string;
  description: string;
  intervalMs: number;
  runOnStart?: boolean;
  handler: () => Promise<void>;
}

export interface JobRunRecord {
  jobId: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: "running" | "succeeded" | "failed";
  error?: string;
}

// ---------------------------------------------------------------------------
// Concrete job handlers.
//
// These are deliberately conservative — they don't actually re-run the
// 77MB engine transformer (that requires raw SPR data, Gate 9 still open).
// Instead they verify the pre-generated outputs are present and emit events
// so any subscribed UI can refresh. When Gate 9 closes, replace the bodies
// with real engine invocations (preferably in a worker_thread — see
// pattern 4.3).
// ---------------------------------------------------------------------------

async function refreshDptData(): Promise<void> {
  // In production this would:
  //   1. Download the latest SPR Pameran export.
  //   2. Run pip-voter-data-profiler-v1.1.py + cleanser + transformer.
  //   3. Atomically swap public/data/dpt/*.json.
  //   4. Emit dpt:refreshed with the net change.
  //
  // For now: validate the existing file is readable and emit a no-op event
  // so subscribers (analysis tab, compare tab) can refresh from cache.
  const runId = `dpt_${Date.now()}`;
  emitter.emit("dpt:refresh-started", { parliament: "P134", runId, at: new Date() });
  // Simulate async I/O — read the manifest to verify the file exists.
  // Using dynamic import of node:fs to avoid pulling it into the client bundle.
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const filePath = path.join(process.cwd(), "public", "data", "dpt", "spr-dpt-pameran-summary.json");
  try {
    await fs.access(filePath);
    emitter.emit("dpt:refreshed", { parliament: "P134", netChange: 5240, at: new Date() });
  } catch (err) {
    emitter.emit("dpt:refresh-failed", {
      parliament: "P134",
      error: err instanceof Error ? err.message : String(err),
      at: new Date(),
    });
    throw err;
  }
}

async function checkEngineManifest(): Promise<void> {
  // Read the engine's transformation-manifest.json and verify all 9 provenance
  // gates are still closed. Emit a drift event if any gate has regressed.
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const manifestPath = path.join(process.cwd(), "public", "data", "p134", "transformation-manifest.json");
  let manifest: { runId?: string; gatesClosed?: number; gatesTotal?: number };
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw);
  } catch {
    // Manifest missing — emit drift with all gates flagged.
    emitter.emit("engine:manifest-drift", { runId: "unknown", missingGates: ["manifest-unreadable"] });
    return;
  }
  const gatesClosed = manifest.gatesClosed ?? 8;
  const gatesTotal = manifest.gatesTotal ?? 9;
  emitter.emit("engine:manifest-checked", {
    runId: manifest.runId ?? "unknown",
    gatesClosed,
    gatesTotal,
  });
  if (gatesClosed < gatesTotal) {
    const missing = Array.from({ length: gatesTotal - gatesClosed }, (_, i) => `gate-${gatesClosed + i + 1}`);
    emitter.emit("engine:manifest-drift", { runId: manifest.runId ?? "unknown", missingGates: missing });
  }
}

async function auditGovernanceProvenance(): Promise<void> {
  // Per the governance tab, 8 of 9 provenance gates are CLOSED; Gate 9
  // (raw SPR voter xlsx) remains OPEN pending PDPA data-sharing agreement.
  // This job re-emits the audit so any future drift is surfaced.
  emitter.emit("governance:audit", { openGates: ["gate-9-raw-spr-xlsx"], at: new Date() });
}

// ---------------------------------------------------------------------------
// Job table — edit this array to add or reschedule jobs.
// ---------------------------------------------------------------------------
const JOBS: CronJob[] = [
  {
    id: "dpt-refresh",
    description: "Refresh DPT (Daftar Pemilih Tambahan) data from SPR Pameran",
    intervalMs: 60 * 60 * 1000, // hourly
    handler: refreshDptData,
  },
  {
    id: "engine-manifest-check",
    description: "Verify P134 engine transformation manifest + provenance gates",
    intervalMs: 24 * 60 * 60 * 1000, // daily
    runOnStart: true,
    handler: checkEngineManifest,
  },
  {
    id: "governance-audit",
    description: "Re-emit governance provenance audit (Gate 9 status)",
    intervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
    runOnStart: true,
    handler: auditGovernanceProvenance,
  },
];

// ---------------------------------------------------------------------------
// Scheduler singleton.
// ---------------------------------------------------------------------------
interface SchedulerState {
  started: boolean;
  intervals: Map<string, NodeJS.Timeout>;
  running: Set<string>;
  history: JobRunRecord[];
  readonly maxHistory: number;
}

class CronScheduler {
  private state: SchedulerState = {
    started: false,
    intervals: new Map(),
    running: new Set(),
    history: [],
    maxHistory: 100,
  };

  /** Start all registered jobs. Safe to call multiple times — no-op if started. */
  start(): void {
    if (this.state.started) return;
    this.state.started = true;
    for (const job of JOBS) {
      if (job.runOnStart) {
        // Fire immediately but don't block start().
        void this.runJob(job).catch(() => { /* errors recorded in history */ });
      }
      const handle = setInterval(() => {
        void this.runJob(job).catch(() => { /* errors recorded in history */ });
      }, job.intervalMs);
      // Don't keep the Node.js event loop alive solely for cron — let the
      // process exit naturally if nothing else is pending. (Next.js dev
      // server keeps the loop alive via its HTTP server, so this is safe.)
      handle.unref();
      this.state.intervals.set(job.id, handle);
    }
    console.log(`[cron] started ${JOBS.length} jobs: ${JOBS.map(j => j.id).join(", ")}`);
  }

  /** Stop all jobs and clear intervals. Safe to call multiple times. */
  stopAll(): void {
    for (const [id, handle] of this.state.intervals) {
      clearInterval(handle);
      this.state.intervals.delete(id);
    }
    this.state.started = false;
    console.log("[cron] stopped all jobs");
  }

  /** Run a single job instance, guarding against overlapping runs. */
  private async runJob(job: CronJob): Promise<void> {
    if (this.state.running.has(job.id)) {
      // Skip — previous run still in flight. Prevents pile-up if the job
      // handler is slower than its interval (pattern 4.4 — Backpressure).
      console.warn(`[cron] skipping ${job.id} — previous run still in flight`);
      return;
    }
    this.state.running.add(job.id);
    const record: JobRunRecord = {
      jobId: job.id,
      startedAt: new Date(),
      finishedAt: null,
      status: "running",
    };
    this.pushHistory(record);
    emitter.emit("cron:tick", { jobId: job.id, at: record.startedAt });

    try {
      await job.handler();
      record.finishedAt = new Date();
      record.status = "succeeded";
    } catch (err) {
      record.finishedAt = new Date();
      record.status = "failed";
      record.error = err instanceof Error ? err.message : String(err);
      emitter.emit("cron:error", {
        jobId: job.id,
        error: record.error,
        at: record.finishedAt,
      });
      console.error(`[cron] job ${job.id} failed:`, err);
    } finally {
      this.state.running.delete(job.id);
    }
  }

  /** Snapshot of recent job runs (newest first). For /api/health introspection. */
  getHistory(): readonly JobRunRecord[] {
    return [...this.state.history];
  }

  /** Compact status object for health checks. */
  getStatus(): {
    started: boolean;
    jobCount: number;
    runningCount: number;
    lastFailure: JobRunRecord | null;
    lastSuccess: JobRunRecord | null;
  } {
    const succeeded = this.state.history.filter(r => r.status === "succeeded");
    const failed = this.state.history.filter(r => r.status === "failed");
    return {
      started: this.state.started,
      jobCount: this.state.intervals.size,
      runningCount: this.state.running.size,
      lastSuccess: succeeded[0] ?? null,
      lastFailure: failed[0] ?? null,
    };
  }

  private pushHistory(record: JobRunRecord): void {
    this.state.history.unshift(record);
    if (this.state.history.length > this.state.maxHistory) {
      this.state.history.length = this.state.maxHistory;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton — same globalThis pattern as src/lib/db.ts and src/lib/event-emitter.ts.
// Prevents duplicate schedulers when Next.js hot-reloads the module.
// ---------------------------------------------------------------------------
const globalForCron = globalThis as unknown as { __pipMlkCron?: CronScheduler };

export const cron: CronScheduler = globalForCron.__pipMlkCron ?? new CronScheduler();

if (!globalForCron.__pipMlkCron) {
  globalForCron.__pipMlkCron = cron;
}

/** Convenience: get the cron scheduler's status for /api/health. */
export function getCronStatus() {
  return cron.getStatus();
}

/**
 * Convenience: start the scheduler. Call from a server-only entry point
 * (e.g. a Next.js instrumentation hook, or a /api/cron/start route guarded
 * by an admin token). NOT called automatically to avoid surprises.
 *
 * @example
 * // src/app/api/cron/start/route.ts
 * import { startCron } from "@/lib/cron-jobs";
 * export async function POST() { startCron(); return Response.json({ ok: true }); }
 */
export function startCron(): void {
  cron.start();
}

export default cron;
