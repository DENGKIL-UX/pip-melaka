# Distributed Systems Patterns — Research & PIP-MLK Application

> Task ID: DISTRIBUTED-01
> Scope: 48 distributed-systems patterns researched, documented, and mapped to the PIP-MLK Next.js 16 project (Melaka political-intelligence dashboard, P134 71,415 verified voters, S2D Action Console).
> Authoritative spec: `worklog.md`, `S2D Architecture_v2.txt`, `engine/pip-voter-source-contract-p134-v1.0.json`.

PIP-MLK is a **single-process Next.js 16 app** rendering a political-intelligence dashboard over pre-generated P134 engine JSON/JSONL datasets shipped in `public/data/`. It is **not** a horizontally-scaled microservices system, so many of the patterns below are documented for awareness and marked **Not applicable** with a concrete reason. The patterns that *do* apply (in-process pub/sub, cron jobs, WebSockets, optimistic locking, health checks, backups, postmortems) get concrete PIP-MLK code references.

Each pattern below has four sections: **What**, **Why**, **PIP-MLK Application**, **Code Example**.

---

## Table of Contents

1. Message Queues + Event-Driven Architecture
   - 1.1 Message Queues
   - 1.2 Pub/Sub
   - 1.3 Event-Driven Architecture
   - 1.4 Distributed Transactions
   - 1.5 Saga Pattern
   - 1.6 Dead Letter Queues
2. Consistency + Concurrency
   - 2.1 CAP Theorem
   - 2.2 Eventual Consistency
   - 2.3 Optimistic Locking
   - 2.4 Pessimistic Locking
   - 2.5 Distributed Locks
   - 2.6 Race Conditions
   - 2.7 Deadlocks
   - 2.8 Leader Election
3. Replication + Sharding
   - 3.1 Read Replicas
   - 3.2 Sharding
   - 3.3 Partitioning
   - 3.4 Replication
4. Memory + Performance
   - 4.1 Memory Leaks
   - 4.2 Garbage Collection
   - 4.3 Thread Safety
   - 4.4 Backpressure
5. Networking
   - 5.1 Network Partitions
   - 5.2 Clock Skew
   - 5.3 DNS
   - 5.4 TCP vs UDP
   - 5.5 HTTP/2 & HTTP/3
   - 5.6 gRPC
   - 5.7 Webhooks
   - 5.8 WebSockets
   - 5.9 Server-Sent Events
   - 5.10 Long Polling
6. Deployment + Operations
   - 6.1 Rollbacks
   - 6.2 Health Checks
   - 6.3 Liveness & Readiness Probes
   - 6.4 Chaos Engineering
   - 6.5 Disaster Recovery
   - 6.6 Backups
   - 6.7 Failover
   - 6.8 Multi-Region Deployments
7. Cost + Serverless
   - 7.1 Cost Optimization
   - 7.2 Cold Starts
   - 7.3 Serverless Limits
   - 7.4 Throughput
   - 7.5 Tail Latency
8. Incidents
   - 8.1 Production Incidents
   - 8.2 On-call
   - 8.3 Postmortems
9. Practical implementations shipped with this task
   - `src/lib/event-emitter.ts`
   - `src/lib/cron-jobs.ts`
   - `src/lib/websocket-server.ts`

---

## 1. Message Queues + Event-Driven Architecture

### 1.1 Message Queues

**What.** A durable buffer between a producer and a consumer. Producers push messages onto a queue; consumers pull them off, one at a time, in FIFO order. The queue survives process restarts because messages live in Redis/RabbitMQ/SQS, not in your app's memory.

**Why.** Decouples producers from consumers. Lets you (a) absorb traffic spikes (queue grows, consumers catch up later), (b) retry failed messages without losing them, (c) scale consumers independently of producers, (d) survive consumer crashes — the message is redelivered. The 4 a.m. database backup job doesn't need to block the 4:01 a.m. voter-import API call.

**Redis vs RabbitMQ vs SQS — quick comparison:**

| Feature | Redis (lists / streams) | RabbitMQ | AWS SQS |
|---|---|---|---|
| Latency | sub-ms | 1-5 ms | 10-50 ms |
| Persistence | Optional (RDB/AOF) | Always (disk) | Always (managed) |
| Throughput | 100k+/s | 20k/s | 3k/s standard, 10k/s FIFO |
| Ordering | Streams yes / lists no | Yes per-queue | FIFO queues only |
| Routing | Pub/sub channels | Exchanges + bindings | None (pull only) |
| Ops cost | Self-host | Self-host | Zero (managed) |
| Best for | Caching + queues together | Complex routing | Set-and-forget |

**PIP-MLK Application.** Not applicable — PIP-MLK is a single-process Next.js app serving pre-generated JSONL datasets from disk. There is no producer/consumer split that would benefit from an external queue. The closest analog is the in-process event emitter (`src/lib/event-emitter.ts`) which handles pub/sub within the same Node.js process. If PIP-MLK ever ingests raw SPR voter rolls in the background (Gate 9 closure), a queue would let the import run async without blocking the dashboard.

**Code Example (conceptual — BullMQ on Redis):**
```ts
// producer: schedule a DPT refresh
import { Queue } from "bullmq";
const dptQueue = new Queue("dpt-refresh", { connection: { host: "redis", port: 6379 } });
await dptQueue.add("refresh", { parliament: "P134" }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });

// consumer (separate worker process)
import { Worker } from "bullmq";
new Worker("dpt-refresh", async (job) => {
  await refreshDpt(job.data.parliament);
}, { connection: { host: "redis", port: 6379 } });
```

---

### 1.2 Pub/Sub

**What.** Publishers emit events to named topics; subscribers listen to topics. Unlike a queue (1 consumer), pub/sub delivers a copy of each event to **every** subscriber. There's no reply channel — fire and forget.

**Why.** Decouples "something happened" from "who cares about it." The S2D Console can subscribe to `signal:new` events without the producer (DPT refresh job, demographics engine) knowing the console exists. New subscribers can be added without touching publishers.

**PIP-MLK Application.** **Applicable — implemented in `src/lib/event-emitter.ts`.** The dashboard already has Zustand stores (`useS2DStore`, `useDashboardStore`) for component state, but a typed event emitter is the right primitive for cross-cutting concerns: when a cron job refreshes DPT data, it emits `dpt:refreshed`; the analysis tab and S2D console both subscribe and re-fetch. No coupling between the cron job and the tabs.

**Code Example.** See `src/lib/event-emitter.ts` (shipped with this task):
```ts
import { emitter } from "@/lib/event-emitter";

// publisher (cron job)
emitter.emit("dpt:refreshed", { parliament: "P134", netChange: 5240, at: new Date() });

// subscriber (React component)
useEffect(() => {
  const off = emitter.on("dpt:refreshed", (payload) => refetch());
  return off; // unsubscribe on unmount
}, []);
```

---

### 1.3 Event-Driven Architecture

**What.** The system's behavior emerges from a stream of immutable events (`VoterRegistered`, `SignalAcknowledged`, `DptRefreshed`) rather than from direct method calls. Services react to events; state is derived by replaying them.

**Events vs commands** (often confused):
- **Event** — past tense, immutable fact. `VoterAdded(voterId, …)`. Anyone can consume it. Cannot be rejected.
- **Command** — imperative request, may be rejected. `AddVoter(voterId, …)`. Addressed to one handler.

**Event sourcing** — storing the full event log instead of current state. Current state is a projection (`fold` over the event log). Lets you rebuild state at any point in time and add new projections retroactively.

**Why.** Auditability (every state change has a record), replayability (rebuild read models after a schema change), loose coupling (producers don't know consumers). Trade-off: complexity, eventual consistency, harder to debug ("why is the system in this state?" requires replaying events).

**PIP-MLK Application.** **Partially applicable.** PIP-MLK is currently CRUD-style (read pre-generated JSONL, render). The S2D Console is the closest analog — signals are events (`SignalAcknowledged`, `SignalResolved`) and the S2D store derives `loopStatus` ("sensing"/"deciding"/"acting") from the latest signal status, which is a small form of event sourcing. A future migration to event sourcing would log every signal lifecycle change to a Prisma `SignalEvent` table for audit.

**Code Example.**
```ts
type SignalEvent =
  | { type: "SignalRaised"; signalId: string; at: Date }
  | { type: "SignalAcknowledged"; signalId: string; by: string; at: Date }
  | { type: "SignalResolved"; signalId: string; action: string; at: Date };

// current state = fold over events
function fold(events: SignalEvent[]): SignalStatus {
  const last = events[events.length - 1];
  return last?.type === "SignalResolved" ? "resolved"
    : last?.type === "SignalAcknowledged" ? "acknowledged" : "new";
}
```

---

### 1.4 Distributed Transactions

**What.** A transaction that spans multiple systems (e.g. write to Postgres + publish to Kafka + call a 3rd-party API). All-or-nothing: either every system commits or every system rolls back.

**Two-phase commit (2PC):**
1. **Prepare phase** — coordinator asks every participant "can you commit?" Each participant locks its resources and replies YES/NO.
2. **Commit phase** — if all said YES, coordinator sends COMMIT; otherwise ROLLBACK.

**Why it's hard.** (a) Coordinator failure between phase 1 and 2 leaves participants **blocked forever** holding locks. (b) Synchronous — every participant must respond before anyone commits, so the slowest participant dictates throughput. (c) Doesn't work across heterogeneous systems (Postgres + S3 + Stripe). (d) Network partition during prepare = stuck locks. 2PC is correct but rarely used in practice because of availability cost.

**PIP-MLK Application.** Not applicable — PIP-MLK has a single SQLite database and no external write dependencies. The AI Assistant API writes nothing; the dashboard is read-only against pre-generated files.

**Code Example (XA-style 2PC, illustrative):**
```ts
// coordinator
const participants = [db, kafka, stripe];
const txId = uuid();

// Phase 1: prepare
const prepared = await Promise.all(
  participants.map(p => p.prepare(txId).catch(() => false))
);
if (prepared.every(Boolean)) {
  await Promise.all(participants.map(p => p.commit(txId))); // Phase 2a
} else {
  await Promise.all(participants.map(p => p.rollback(txId))); // Phase 2b
}
// ↑ If coordinator crashes between 1 and 2, participants block. Use Saga instead.
```

---

### 1.5 Saga Pattern

**What.** A sequence of local transactions where each step has a **compensating transaction** that undoes it. If step 3 fails, you run the compensations for steps 2 and 1 in reverse. No global lock; eventual consistency.

**Choreography vs orchestration:**
- **Choreography** — each service emits an event when done; the next service reacts. No central brain. Simple to start, hard to trace ("which service is supposed to handle event #4?").
- **Orchestration** — a central orchestrator calls each service in order and decides compensations. Easier to debug; the orchestrator is a single point of failure.

**Why.** Avoids 2PC's availability cost while still giving all-or-nothing semantics across services. Used by every e-commerce checkout (reserve inventory → charge card → ship → mark delivered; if charge fails, release inventory).

**PIP-MLK Application.** Not applicable in the current build — there's no multi-step write flow. **Future scenario:** when Gate 9 closes (raw SPR voter xlsx ingestion), a saga would be the right pattern: `downloadSprExport → validateHash → runProfiler → runCleanser → runTransformer → publishToIntelligenceStore`. If `runTransformer` fails (e.g. schema drift), the compensating action is "delete the partial P134 outputs from this run, keep the prior run."

**Code Example (orchestrated saga):**
```ts
async function ingestSprExportSaga(file: string) {
  const steps: Array<{ do: () => Promise<void>; undo: () => Promise<void> }> = [
    { do: () => download(file),           undo: () => deleteDownload(file) },
    { do: () => validateHash(file),       undo: () => {} /* nothing to undo */ },
    { do: () => runProfiler(file),        undo: () => deleteProfileOutput(file) },
    { do: () => runCleanser(file),        undo: () => deleteCleansedOutput(file) },
    { do: () => runTransformer(file),     undo: () => deleteIntelligenceOutput(file) },
  ];
  const done: Array<() => Promise<void>> = [];
  try {
    for (const step of steps) { await step.do(); done.push(step.undo); }
  } catch (err) {
    // run compensations in reverse
    for (const undo of done.reverse()) { await undo().catch(() => {}); }
    throw err;
  }
}
```

---

### 1.6 Dead Letter Queues (DLQ)

**What.** A separate queue where messages that failed processing N times (after retries with backoff) are parked for human inspection. The poison pill doesn't block the main queue forever.

**Why.** Without a DLQ, a malformed message causes infinite redelivery (the consumer keeps crashing on the same message) and the queue grows unbounded. With a DLQ, you preserve the message for debugging while letting the rest of the queue drain. You then triage the DLQ: fix the bug + replay, or drop the message.

**PIP-MLK Application.** Not applicable — no external message queue. But the in-process emitter (`src/lib/event-emitter.ts`) implements a soft DLQ: if a subscriber throws, the error is logged to `errorHistory` and the emitter keeps delivering to other subscribers. The original message is not retried (would loop forever), preserving liveness.

**Code Example.**
```ts
// BullMQ DLQ config
new Worker("dpt-refresh", processor, {
  connection,
  settings: { maxStalledCount: 1 },
});
dptQueue.on("failed", (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`DLQ: job ${job.id} moved to dead-letter after ${job.attemptsMade} attempts`, err);
    // ship to a `dpt-refresh-dlq` queue for manual triage
  }
});
```

---

## 2. Consistency + Concurrency

### 2.1 CAP Theorem

**What.** In a distributed system that replicates state, you can have at most **two** of:
- **Consistency** — every read sees the latest write or an error (linearizability)
- **Availability** — every request gets a non-error response (no guarantee it's latest)
- **Partition tolerance** — the system keeps working when the network splits

Because partitions *will* happen (networks are unreliable), you actually choose between **CP** (reject reads/writes on the minority side during a partition — e.g. ZooKeeper, etcd, HBase) and **AP** (accept possibly-stale reads on both sides — e.g. Cassandra, DynamoDB, DNS).

**Why.** Stops you from designing a system that "feels" correct but silently violates invariants under partition. If you promise strong consistency and a partition occurs, you must sacrifice availability (return errors) — there is no free lunch.

**PIP-MLK Application.** Not applicable — single-process, single SQLite file, no replication. SQLite is **CA** in the trivial sense (no partition is possible within one node). The dashboard's "offline data" fallback (shipped in FALLBACK-DATA-01) is a deliberate **AP**-style choice: when the dev server OOMs (partition between client and server), the client shows stale inline data rather than an error page. Consistency is sacrificed for availability — the amber "Offline data mode" badge is the honesty layer.

**Code Example.**
```ts
// PIP-MLK's offline fallback is an AP choice: serve stale data, never error out
try {
  const data = await fetch("/data/p134/dun-intelligence.jsonl").then(r => r.json());
  setData(data);
} catch {
  setData(DUN_FALLBACK); // AP: available (stale) over consistent (error)
  setOffline(true);      // amber badge tells the user
}
```

---

### 2.2 Eventual Consistency

**What.** The system guarantees that, **if no new updates occur**, eventually all reads will return the last written value. No bound on *when* — could be milliseconds, could be seconds (replication lag). Reads in the meantime may return stale data.

**Why.** Vastly higher availability and throughput than strong consistency. Used by DNS (a record change takes minutes to propagate globally), social-media feeds (your like may not show for a second), shopping carts. The trade-off is acceptable when users can tolerate a slightly-stale read and you can put a "last updated at" timestamp on the UI.

**PIP-MLK Application.** **Applicable by design.** The dashboard reads pre-generated JSONL files that are refreshed on a schedule (DPT data refreshes monthly from SPR Pameran; the engine regenerates intelligence JSONL on demand). Between the source-of-truth update and the dashboard re-fetch, the dashboard shows stale data. The Governance tab's "9-gate provenance" panel and the per-tab "Offline data mode" badge are the honesty layer that makes eventual consistency acceptable.

**Code Example.**
```ts
// Show the user *when* the data was last refreshed — the contract of eventual consistency
<span className="text-xs text-muted-foreground">
  Last refreshed: {new Date(manifest.runDate).toLocaleString()} · Next refresh in {nextRefreshIn}
</span>
```

---

### 2.3 Optimistic Locking

**What.** No locks held during the read-modify-write cycle. Each row carries a `version` (or `updatedAt`) field. On write, the UPDATE statement includes `WHERE id = ? AND version = ?`; if 0 rows are updated, someone else changed it first → retry the whole read-modify-write.

**Why.** Avoids the contention and deadlock risk of pessimistic locks. Great when collisions are rare (most users edit different records). Bad when collisions are frequent (you waste work retrying).

**PIP-MLK Application.** **Applicable — recommended for any future write model.** Prisma supports `@version` natively. If a `Signal` table is added (so S2D signal acknowledgements persist server-side rather than just localStorage), optimistic locking prevents two analysts from both marking the same signal "resolved" simultaneously.

**Code Example.**
```prisma
// prisma/schema.prisma
model Signal {
  id        String   @id @default(cuid())
  title     String
  status    String   @default("new")
  version   Int      @default(0)  // ← optimistic lock field
  updatedAt DateTime @updatedAt
}
```
```ts
// safe update — retry on conflict
async function acknowledge(id: string, currentVersion: number) {
  const r = await db.signal.updateMany({
    where: { id, version: currentVersion },
    data: { status: "acknowledged", version: { increment: 1 } },
  });
  if (r.count === 0) throw new Error("CONFLICT — signal was modified by another user, refetch and retry");
}
```

---

### 2.4 Pessimistic Locking

**What.** Take a lock on the row(s) before reading, hold it through the write. Other transactions block until you commit. In SQL: `SELECT … FOR UPDATE`. Locks are released at COMMIT/ROLLBACK.

**Why.** When collisions are *frequent* (many writers fighting over the same hot row), optimistic locking just retries forever. Pessimistic locking serializes access cleanly. Trade-off: lock contention, deadlock risk, lower concurrency.

**When to use.** Short transactions. Hot rows. Financial balances where retrying is expensive. **Never** hold a pessimistic lock across a user input wait or an external API call.

**PIP-MLK Application.** Not applicable today — SQLite doesn't support `SELECT FOR UPDATE` (its locking is database-granular, not row-level). If PIP-MLK migrated to Postgres and needed to safely mutate a single "DPT import in progress" flag, `SELECT … FOR UPDATE` on that row would prevent two cron runs from both starting an import.

**Code Example.**
```ts
// Postgres + Prisma interactive transaction
await db.$transaction(async (tx) => {
  const [lock] = await tx.$queryRaw`SELECT * FROM import_lock WHERE name = 'dpt' FOR UPDATE`;
  if (lock.is_running) throw new Error("DPT import already in progress");
  await tx.$queryRaw`UPDATE import_lock SET is_running = true WHERE name = 'dpt'`;
  // … do the import …
  await tx.$queryRaw`UPDATE import_lock SET is_running = false, last_run = NOW() WHERE name = 'dpt'`;
});
```

---

### 2.5 Distributed Locks

**What.** A lock that works across multiple processes/machines. Used to ensure only one node runs a cron job, only one replica rebuilds a cache, etc.

**Redis Redlock** — acquire locks on N independent Redis nodes with short TTLs; majority quorum = acquired. Renew the TTL while working. Release by deleting the key (with a token check so you don't delete someone else's lock).

**Zookeeper / etcd** — locks are ephemeral nodes in a consensus tree (Raft/Zab). Stronger guarantees than Redis but heavier ops.

**Why they're hard.** (a) **Fencing** — if a process pauses (GC pause, swap), its lock TTL can expire while it thinks it still holds the lock; another process acquires; both now think they hold it → corruption. The fix is a fencing token (monotonic counter) that downstream services reject if stale. (b) **Clock skew** — TTL expiry depends on clocks. (c) **Network partition** — Redlock has subtle failure modes under GC pauses and partitions (Martin Kleppmann's famous critique).

**PIP-MLK Application.** Not applicable — single process. **If** PIP-MLK ran multiple Next.js instances behind a load balancer and the cron job in `src/lib/cron-jobs.ts` ran in each instance, you'd need a distributed lock so only one instance refreshes DPT data per hour. For now, the singleton `globalForCron` guard (same pattern as `globalForPrisma` in `src/lib/db.ts`) suffices.

**Code Example (Redlock):**
```ts
import Redlock from "redlock";
const redlock = new Redlock([redisClient], { retryCount: 3, retryDelay: 200 });

const lock = await redlock.acquire(["locks:dpt-refresh"], 60000); // 60s TTL
try {
  await refreshDpt(); // fenced with lock.value if downstream supports it
} finally {
  await lock.release();
}
```

---

### 2.6 Race Conditions

**What.** Two or more concurrent operations read/write shared state and the final outcome depends on the unpredictable ordering of their execution. The classic: `balance = balance - 100` run by two threads on a `balance = 500` account can produce `400` instead of `300`.

**Examples:**
- **TOCTOU** (time-of-check-to-time-of-use) — check `if (fileExists) throw` then create; another process creates between check and use.
- **Lost update** — read `v=5`, write `v=6`; another writer's update to `v=6` is overwritten.
- **Read skew** — read x at t1, read y at t2, but y was updated between — you see an inconsistent snapshot.

**Prevention strategies:**
- **Atomic operations** — `db.counter.update({ where: { id }, data: { count: { increment: 1 } } })` (one SQL UPDATE, no read-modify-write race).
- **Optimistic locking** — `WHERE version = ?` (see 2.3).
- **Pessimistic locking** — `FOR UPDATE` (see 2.4).
- **Mutex / single-writer** — only one writer at a time.
- **Immutable data** — never mutate, always create new versions.

**PIP-MLK Application.** **Applicable — addressed.** The `useS2DStore.addSignal` reducer uses Zustand's functional `set((state) => …)` so concurrent `addSignal` calls don't lose updates — each reads the latest state inside the updater. The S2D store also caps the signal list at 50 (`slice(0, 50)`) atomically inside the same updater. The cron jobs in `src/lib/cron-jobs.ts` use `globalForCron` to prevent two Next.js dev-server hot-reload instances from double-scheduling.

**Code Example.**
```ts
// WRONG — read-modify-write race if two callers fire together
const signals = useS2DStore.getState().signals;
useS2DStore.setState({ signals: [newSignal, ...signals].slice(0, 50) });

// RIGHT — functional updater; Zustand applies it atomically against the latest state
useS2DStore.setState((state) => ({ signals: [newSignal, ...state.signals].slice(0, 50) }));
```

---

### 2.7 Deadlocks

**What.** Two or more transactions each hold a lock the other needs, neither can proceed, both wait forever. Example: T1 locks A then tries to lock B; T2 locks B then tries to lock A.

**Detection.** DBMS waits-for graph — if there's a cycle, kill one transaction (the victim) and roll it back. Postgres checks periodically; MySQL's InnoDB has `innodb_deadlock_detect=ON` by default.

**Prevention.** Acquire locks in a **consistent global order** (always lock A before B). Use timeouts (`LOCK_TIMEOUT`) so a stuck transaction fails fast rather than hanging. Keep transactions short. Don't hold locks across user input.

**Avoidance.** Use optimistic locking (no locks → no deadlocks). Use `NOWAIT`/`SKIP LOCKED` to refuse to wait rather than risk deadlock.

**PIP-MLK Application.** Not applicable — single SQLite (database-level lock, no row-level locking, no deadlock possible). The conceptual relevance: if a future multi-table Postgres write path is added, lock tables in a fixed order. The cron jobs in `src/lib/cron-jobs.ts` are deliberately independent (no shared resource) so they cannot deadlock each other.

**Code Example.**
```ts
// WRONG — different callers may lock in different order
async function transferAtoB() { await lock(A); await lock(B); /* … */ }
async function transferBtoA() { await lock(B); await lock(A); /* … */ } // deadlock risk

// RIGHT — always lock in the same order (e.g. by id)
async function transfer(from, to) {
  const [first, second] = [from, to].sort((a, b) => a.id.localeCompare(b.id));
  await lock(first); await lock(second); /* … */
}
```

---

### 2.8 Leader Election

**What.** In a replicated cluster, exactly one node is the **leader** (handles writes, schedules jobs, coordinates); the others are **followers** (serve reads, stand by). If the leader dies, the remaining nodes run an election to pick a new one.

**Raft** — term-based voting. Leader sends heartbeats; if a follower doesn't hear from the leader within an election timeout, it becomes a candidate, increments the term, requests votes. Majority of votes = leader. Used by etcd, Consul, CockroachDB.

**Paxos** — older, more general, much harder to understand. Used by Spanner, Chubby. Raft was designed specifically to be "understandable Paxos."

**Why it matters.** Without a leader, multiple nodes might independently decide to run the scheduled job, accept conflicting writes, or split-brain. Leader election is the backbone of every distributed coordination service.

**PIP-MLK Application.** Not applicable — single instance. The only "leader" concept in PIP-MLK is the `globalForCron` singleton in `src/lib/cron-jobs.ts`, which ensures the Next.js dev server's hot-reload doesn't spawn two cron schedulers. That's *not* leader election — it's process-local singleton protection. If PIP-MLK ever ran multi-instance, you'd add Redis-based leader election (or use a managed scheduler like AWS EventBridge).

**Code Example (Raft pseudocode):**
```ts
type Role = "follower" | "candidate" | "leader";
let role: Role = "follower";
let currentTerm = 0;
let lastHeartbeat = Date.now();

setInterval(() => {
  if (role === "leader") {
    broadcast({ type: "AppendEntries", term: currentTerm }); // heartbeat
  } else if (Date.now() - lastHeartbeat > electionTimeout) {
    role = "candidate"; currentTerm++;
    const votes = await Promise.all(peers.map(p => p.requestVote(currentTerm)));
    if (votes.filter(Boolean).length > peers.length / 2) role = "leader";
  }
}, 50);
```

---

## 3. Replication + Sharding

### 3.1 Read Replicas

**What.** A primary database handles writes; one or more replicas apply the write-ahead-log asynchronously and serve reads. Application code routes writes to primary, reads to replicas (often via a load balancer).

**Why.** Most apps are read-heavy (10:1 read:write is common). Replicas scale read throughput linearly and provide failover targets. Trade-off: **replication lag** — a write to the primary may not be visible on a replica for milliseconds-to-seconds. For "read-your-writes" consistency, route the user's own recent writes' reads to the primary.

**PIP-MLK Application.** Not applicable — SQLite single-file. The dashboard is read-only against static JSONL files served by Next.js from `public/data/`. The closest analog: the in-process event emitter and Zustand store — components read from the store, no replication needed. **If** PIP-MLK migrated to Postgres to persist S2D signal acknowledgements server-side, a read replica would let the dashboard render the signal feed without contending with the AI Assistant API's writes.

**Code Example.**
```ts
// Prisma read-replica routing
const prismaRead = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_REPLICA_URL } } });
const prismaWrite = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_PRIMARY_URL } } });

async function listSignals() { return prismaRead.signal.findMany(); }
async function acknowledgeSignal(id: string) { return prismaWrite.signal.update({ where: { id }, data: { status: "acknowledged" } }); }
```

---

### 3.2 Sharding

**What.** Horizontal partitioning — split a large table across N database instances by a **shard key**. Each shard owns a disjoint subset of rows. Three common strategies:
- **Hash** — `shard = hash(key) % N`. Even distribution, but resharding (adding shard N+1) re-maps every row.
- **Range** — `shard 1: A-M`, `shard 2: N-Z`. Easy range scans, but hot spots if one range dominates.
- **Geographic** — Malaysian voters in `shard-my`, Singaporean in `shard-sg`. Low latency for regional reads, harder cross-region queries.

**Why.** Scales writes (each shard handles a fraction of the write load) and storage (each shard holds a fraction of the data). Trade-off: cross-shard queries are slow and complex; distributed transactions across shards are awful; resharding is painful.

**PIP-MLK Application.** Not applicable — 71,415 voters fit trivially in a single SQLite file (the engine outputs a 77MB JSONL that fits in RAM). **If** PIP-MLK scaled to all 222 Malaysian parliaments (~16M voters), geographic sharding by state would be the natural choice — one shard per state, dashboard reads fan out and merge. The current `public/data/p134/` structure (per-parliament subdirectories) already mirrors this idea at the file-system level.

**Code Example.**
```ts
// Hash-based shard router
function shardFor(parliament: string, numShards = 4): number {
  let h = 0;
  for (const ch of parliament) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % numShards;
}
const connections = [shard0, shard1, shard2, shard3];
async function getVoter(parliament: string, voterId: string) {
  return connections[shardFor(parliament)].voter.findUnique({ where: { id: voterId } });
}
```

---

### 3.3 Partitioning

**What.** Splitting a single logical table into multiple physical sub-tables within the same database (no extra instances). **Vertical** = split by columns (frequently-accessed columns in one partition, BLOBs in another). **Horizontal** = split by rows (similar to sharding but within one DB). **Partition pruning** = the query planner skips partitions that can't possibly match the WHERE clause.

**Why.** Faster scans (only the relevant partition is read), easier archival (drop an old partition instead of `DELETE FROM … WHERE …`), smaller indexes per partition.

**PIP-MLK Application.** Not applicable — SQLite has no native partitioning. The conceptual equivalent in PIP-MLK is the **file-system layout**: intelligence data is partitioned by entity type (`dun-intelligence.jsonl`, `dm-intelligence.jsonl`, `locality-intelligence.jsonl`, `parliament-intelligence.jsonl`) and by parliament (`public/data/p134/`, future `public/data/p135/` …). The dashboard's `readJsonlSafe` helper does "partition pruning" by file path — it only reads `dun-intelligence.jsonl` when demographics are requested.

**Code Example.**
```sql
-- Postgres declarative partitioning
CREATE TABLE signals (
  id          text,
  parliament  text,
  created_at  timestamptz,
  payload     jsonb
) PARTITION BY LIST (parliament);

CREATE TABLE signals_p134 PARTITION OF signals FOR VALUES IN ('P134');
CREATE TABLE signals_p135 PARTITION OF signals FOR VALUES IN ('P135');

-- Query with parliament = 'P134' → planner prunes, only scans signals_p134
SELECT * FROM signals WHERE parliament = 'P134' AND created_at > NOW() - INTERVAL '1 day';
```

---

### 3.4 Replication

**What.** Copying data across nodes for redundancy and read scaling. Three axes:

| Axis | Options | Notes |
|---|---|---|
| Sync | **Synchronous** (primary waits for replica ack before committing) vs **Asynchronous** (primary commits, replica catches up later) | Sync = zero data loss, lower throughput. Async = small loss window, higher throughput. |
| Topology | **Single-leader** (all writes go to primary, replicas apply) vs **Multi-leader** (any node accepts writes, conflicts resolved by vector clocks / last-write-wins) vs **Leaderless** (Cassandra/DynamoDB: writes go to a quorum of N nodes) | Multi-leader = no single point of write failure but conflict resolution is hard. |
| Fanout | **Statement-based** (replay SQL), **WAL** (replay binary log), **Logical** (decode WAL to row events) | Logical decouples primary/replica versions. |

**Why.** Redundancy (lose a node, keep serving), read scale, geographic locality (replicas near users), offline analytics (run heavy queries on a replica, not the primary).

**PIP-MLK Application.** Not applicable — single SQLite file. The closest analog: the inline fallback datasets in `src/lib/fallback-data.ts` are a poor-man's **asynchronous read replica** — they ship a snapshot of the engine's output to the client, and the client falls back to the snapshot when the server is unreachable. Like async replication, there's a freshness gap (the snapshot may lag the source by one engine run).

**Code Example.**
```ts
// Postgres async streaming replication (primary postgresql.conf)
// wal_level = replica
// max_wal_senders = 5
// (replica recovery.conf)
// primary_conninfo = 'host=primary port=5432 user=replicator password=...'
// restore_command = 'cp /wal_archive/%f %p'
```

---

## 4. Memory + Performance

### 4.1 Memory Leaks

**What.** Memory that's no longer reachable by the program but can't be GC'd because something still holds a reference. Symptom: RSS grows monotonically until the process is OOM-killed. In Node.js the common causes: (a) unclosed event listeners (`emitter.on` without `off`), (b) closures capturing large objects, (c) global Maps/Sets that grow without bounds, (d) detached DOM nodes still referenced from JS, (e) timers/intervals that never get cleared, (f) Prisma client connections leaking.

**Detection in Node.js:**
- `process.memoryUsage()` — log RSS, heapUsed, heapTotal, external periodically.
- `--inspect` — Chrome DevTools → Memory tab → Heap snapshot. Compare two snapshots to find what's retained.
- `--max-old-space-size=512` — set a hard ceiling so the leak fails fast in dev rather than silently growing in prod.
- `node --trace-gc` — log every GC event.
- `clinic.js heapprofiler` — flame graph of allocations.

**PIP-MLK Application.** **Applicable — actively worked around.** The worklog records "Dev server OOM on 4GB sandbox" as a recurring issue. Next.js 16 + Turbopack has high memory pressure during compilation. Mitigations already shipped: (a) the FALLBACK-DATA-01 inline datasets so OOM doesn't break UX, (b) React `useEffect` cleanups that disconnect WebSocket subscriptions and cancel in-flight fetches (the `cancelled` flag pattern in `selected-dun-drawer.tsx`). The cron jobs in `src/lib/cron-jobs.ts` are careful to clear intervals on shutdown so they don't pile up across hot reloads.

**Code Example.**
```ts
// Detect RSS growth in the dashboard API route — log every 30s
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    const m = process.memoryUsage();
    console.log(`[mem] rss=${(m.rss/1024/1024).toFixed(0)}MB heap=${(m.heapUsed/1024/1024).toFixed(0)}MB/${(m.heapTotal/1024/1024).toFixed(0)}MB external=${(m.external/1024/1024).toFixed(0)}MB`);
  }, 30_000);
}

// Heap snapshot on demand (e.g. via a /api/debug/heap endpoint)
import { writeHeapSnapshot } from "node:v8";
writeHeapSnapshot(); // writes heap-{pid}.heapsnapshot — load into Chrome DevTools
```

---

### 4.2 Garbage Collection

**What.** Automatic reclamation of memory no longer reachable. V8 (Node.js/Chrome JS engine) uses **generational collection**:
- **Young generation** (1-8 MB) — short-lived objects. **Scavenge** (minor GC) copies survivors to "old." Runs frequently (~ms).
- **Old generation** (up to ~1.4 GB default) — long-lived objects. **Mark-sweep-compact** (major GC) walks the object graph, marks reachable, frees the rest, compacts. Runs less often (~10-100ms).

**Why it matters.** GC pauses are **stop-the-world** — your server stops responding during major GC. The default `--max-old-space-size=1400` MB on 64-bit Node.js is too low for memory-hungry Next.js builds; raising it can avoid frequent major GC. Conversely, a memory leak forces major GC every few seconds, each one a latency spike.

**Tuning knobs:**
- `--max-old-space-size=4096` — raise the heap ceiling (PIP-MLK sandbox has 4 GB).
- `--max-semi-space-size=64` — larger young generation = fewer scavenges for allocation-heavy code.
- `--expose-gc` + manual `global.gc()` between batches — control when pauses happen.
- `--trace-gc-verbose` — see GC time as % of wall clock.

**PIP-MLK Application.** **Applicable.** The dev server OOM is partly a heap-ceiling issue. If it persists after the FALLBACK-DATA-01 fix, raising `--max-old-space-size` in the `dev` script (or `NODE_OPTIONS=--max-old-space-size=2048`) would give Turbopack more room. The cron jobs run in-process and use bounded data structures (no unbounded growth) so they don't add GC pressure.

**Code Example.**
```jsonc
// package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS=--max-old-space-size=2048 next dev -p 3000"
  }
}
```
```ts
// Batch processing pattern — call gc between batches to keep pause time predictable
if (global.gc) {
  for (const batch of batches) {
    processBatch(batch);
    global.gc(); // force a collection between batches, not mid-batch
  }
}
```

---

### 4.3 Thread Safety

**What.** A piece of code is thread-safe if it produces correct results when called concurrently from multiple threads. Node.js is famously **single-threaded** for JS execution (the event loop runs on one thread), so most JS code is trivially thread-safe — two callbacks can't interleave. But:
- **Native addons** (sharp, bcrypt) use libuv's worker pool (default 4 threads).
- **`worker_threads`** — true OS threads sharing `SharedArrayBuffer`. Need `Atomics` for synchronization.
- **Cluster mode** — multiple Node.js processes, no shared heap (IPC via channels).

**Why it matters.** Even single-threaded Node.js has subtle concurrency: a long-running `await` between read and write lets another request's callback run, causing race conditions (see 2.6). CPU-bound work (parsing 77MB JSONL) blocks the event loop and starves other requests — that work should go to a worker thread.

**PIP-MLK Application.** **Applicable.** The `pip-voter-intelligence-transformer-v1.0.js` engine script processes 77MB JSONL; if invoked from the Next.js process directly, it would block the event loop for seconds. The right pattern (when Gate 9 closes) is `worker_threads`. The `src/lib/cron-jobs.ts` module's `globalForCron` singleton is thread-safe by virtue of Node.js's single-threaded event loop — no mutex needed.

**Code Example.**
```ts
// worker_threads — offload heavy CPU work
import { Worker } from "node:worker_threads";

async function runTransformer(inputPath: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./engine/transformer-worker.js", { workerData: inputPath });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  });
}

// transformer-worker.js
import { parentPort, workerData } from "node:worker_threads";
import { transformP134 } from "../engine/pip-voter-intelligence-transformer-v1.0.js";
const result = transformP134(workerData);
parentPort?.postMessage(result);
```

---

### 4.4 Backpressure

**What.** When a producer emits faster than the consumer can process, the unconsumed data piles up — in queues, in memory, in TCP buffers. **Backpressure** is the mechanism that tells the producer to slow down (or buffers, or drops). Without it: OOM.

**Stream processing** — Node.js `Readable`/`Writable` streams implement backpressure via `pipe()` (pauses the source when the destination's buffer is full) or explicit `await stream.write(chunk)` checks (returns `false` → wait for `'drain'`).

**Handling slow consumers:**
- **Buffer** (bounded — drop or error if full).
- **Drop** (oldest, newest, or random).
- **Throttle** (only forward N per second).
- **Sample** (forward 1 in K).
- **Reject** (return 429 to the producer; let them retry).

**PIP-MLK Application.** **Applicable.** If the WebSocket server (`src/lib/websocket-server.ts`) broadcasts S2D signal updates to many connected clients and one client is slow (mobile on bad 3G), `ws`'s `WebSocket.send()` returns `false` when the send buffer is saturated — the server must respect that and either buffer (bounded), drop, or disconnect the slow client. The implementation ships with a `bufferedAmount` check and a slow-consumer disconnect.

**Code Example.**
```ts
// Streams: respect backpressure
import { createReadStream } from "node:fs";
const readable = createReadStream("public/data/p134/dun-intelligence.jsonl");
readable.on("data", (chunk) => {
  const ok = writable.write(chunk);
  if (!ok) readable.pause();            // destination buffer full — pause source
});
writable.on("drain", () => readable.resume()); // destination caught up — resume source

// WebSocket slow-consumer detection
function safeSend(ws: WebSocket, data: string): boolean {
  if (ws.bufferedAmount > 1_000_000) {
    ws.close(1011, "slow consumer");    // >1MB buffered → disconnect
    return false;
  }
  return ws.send(data);
}
```

---

## 5. Networking

### 5.1 Network Partitions

**What.** The network splits into two or more groups that can talk within a group but not across. Nodes on each side think the other side is dead. **Split-brain** = two leaders elected on opposite sides of a partition, both accepting writes that diverge.

**Quorum** = majority (N/2 + 1). To avoid split-brain, leader election requires a quorum; a partition that leaves the minority side without quorum can't elect a leader, so the majority side keeps operating and the minority side refuses writes (CP choice).

**Why it matters.** Networks *will* partition (switch failure, misconfigured firewall, AWS US-EAST-1 goes down). Your system's behavior under partition is what distinguishes CP from AP (see 2.1). Pretending partitions don't happen is how you get split-brain data corruption.

**PIP-MLK Application.** Not applicable — single process. The conceptual relevance: the PIP-MLK dashboard's "offline data" fallback is the client-side equivalent of tolerating a client/server partition — the client serves stale data rather than erroring. The "Offline data mode" amber badge is the user-facing honesty layer.

**Code Example.**
```ts
// Quorum-based leader election — refuse to lead without majority
function tryBecomeLeader(peers: Peer[], currentTerm: number): boolean {
  const responses = peers.map(p => p.requestVote(currentTerm));
  const yes = responses.filter(Boolean).length;
  return yes + 1 > (peers.length + 1) / 2; // +1 for self
}
```

---

### 5.2 Clock Skew

**What.** Different machines' clocks disagree. Even with NTP (Network Time Protocol, syncs to ~10ms accuracy on a LAN, ~100ms over WAN), clocks drift between syncs and can jump forward/backward. **Logical clocks** (Lamport timestamps, vector clocks) sidestep physical time entirely — they count events and use a "happened-before" relation.

**Why it matters.** (a) TTL-based cache eviction may evict too early or too late. (b) Last-write-wins replication can pick the wrong write if clocks disagree. (c) Logging across services shows events out of order. (d) TLS certificates rejected if clock is too far off. (e) Distributed locks with TTL-based expiry can be released early.

**Mitigations:**
- **NTP** — sync clocks to a stratum-1 server.
- **Google TrueTime** (Spanner) — clocks report an uncertainty interval `[earliest, latest]`; wait out the interval before committing.
- **Hybrid Logical Clocks (HLC)** — Lamport timestamp + physical time.
- **Don't use wall-clock for ordering** — use monotonic counters or DB auto-increments.

**PIP-MLK Application.** **Applicable in a small way.** The S2D signal timestamps use `new Date().toISOString()` (wall clock). Across multiple analysts' browsers, clocks may differ by seconds. The signal feed sorts by `timestamp` — if analyst A's clock is 2 minutes ahead, their signals always appear at the top. Mitigation: use the server's `Date.now()` when persisting (the AI Assistant route already runs server-side). For the current localStorage-only S2D store, the skew is acceptable (single-user). The cron jobs use `Date.now()` server-side, which is consistent.

**Code Example.**
```ts
// Lamport timestamp — logical clock, no wall-clock dependency
class LamportClock {
  private counter = 0;
  tick() { return ++this.counter; }
  observe(remote: number) { this.counter = Math.max(this.counter, remote) + 1; return this.counter; }
}
// Two nodes exchanging messages can establish happened-before without wall clocks
```

---

### 5.3 DNS

**What.** Domain Name System — translates `pip-mlk.example.com` to `1.2.3.4`. Hierarchical: root → TLD (.com) → authoritative for example.com → A record. Recursive resolver caches results for the TTL (often 300s-86400s).

**DNS caching** — every layer caches: browser, OS, home router, ISP resolver. A record change can take TTL seconds to propagate (eventual consistency, see 2.2).

**DNS round-robin** — a single name returns multiple A records in rotated order. Cheap load balancing, but no health checks — a dead IP still gets traffic. Modern alternative: GeoDNS + health checks (Route 53, Cloudflare).

**Why it matters.** DNS is the first hop of every request; getting it wrong (low TTL → resolver floods, high TTL → slow failover) impacts availability. DNS-based failover (see 6.7) takes minutes — too slow for some workloads.

**PIP-MLK Application.** Not applicable — the dashboard runs in a sandbox with a fixed URL. The `XTransformPort` query parameter in Caddy (used to route `/api/...?XTransformPort=3003` to the WebSocket service) is a port-level router that replaces DNS in this environment.

**Code Example.**
```ts
// DNS round-robin in /etc/hosts style:
// pip-mlk.example.com  A  1.1.1.1
// pip-mlk.example.com  A  2.2.2.2
// pip-mlk.example.com  A  3.3.3.3
// Resolver returns all three in rotated order; client picks one.

// Programmatic lookup with caching
import { promises as dns } from "node:dns";
const cache = new Map<string, { ips: string[]; expires: number }>();
async function resolveCached(host: string) {
  const hit = cache.get(host);
  if (hit && hit.expires > Date.now()) return hit.ips;
  const { addresses } = await dns.resolve4(host);
  cache.set(host, { ips: addresses, expires: Date.now() + 300_000 }); // 5-min TTL
  return addresses;
}
```

---

### 5.4 TCP vs UDP

**What.** Two transport protocols layered on IP:
- **TCP** — connection-oriented, reliable, ordered, byte-stream. Three-way handshake, sequence numbers, ACKs, retransmits. Used by HTTP, WebSockets, gRPC, Postgres.
- **UDP** — connectionless, unreliable, unordered, datagrams. No handshake, no retransmit. Used by DNS, VoIP, video streaming, QUIC (HTTP/3), games.

**Head-of-line blocking** — TCP delivers bytes strictly in order. If packet 3 is lost, packets 4-100 sit in the receiver's buffer waiting for 3 to be retransmitted, even though the application could process them. UDP has no HoL blocking — each datagram is independent. **QUIC** (HTTP/3) runs multiple independent streams over UDP so a lost packet on stream A doesn't block stream B.

**When to use each:**
- TCP — anything that needs reliability (file transfer, transactions, chat).
- UDP — latency-sensitive, loss-tolerant (live video, gaming, DNS), or where you implement your own reliability (QUIC).

**PIP-MLK Application.** Not applicable — both the dashboard (HTTP) and WebSocket server use TCP. **If** PIP-MLK ever streams live election results to thousands of viewers simultaneously, HTTP/3 (QUIC over UDP) would reduce head-of-line blocking for users on lossy mobile networks.

**Code Example.**
```ts
// UDP server (e.g. a statsd-like metrics collector)
import { createSocket } from "node:dgram";
const server = createSocket("udp4");
server.on("message", (msg, rinfo) => {
  console.log(`metric from ${rinfo.address}:${rinfo.port}: ${msg}`);
});
server.bind(8125);
// ↑ No handshake, no retransmit. Fire-and-forget metrics.
```

---

### 5.5 HTTP/2 & HTTP/3

**What.**
- **HTTP/1.1** (1997) — one request per TCP connection, or pipelining (rarely used). Browsers open 6 connections per origin. Head-of-line blocking at the HTTP layer.
- **HTTP/2** (2015) — binary framing, **multiplexing** (many requests share one TCP connection, each is a "stream"), header compression (HPACK), **server push** (server sends resources before client asks — largely deprecated in 2024 because browsers handle caching better). Still has TCP-level HoL blocking.
- **HTTP/3** (2022) — runs over **QUIC** (UDP). Each stream is independent — no HoL blocking. 0-RTT connection resumption. Faster connection setup on mobile.

**Why it matters.** Fewer TCP connections = less server memory, fewer TLS handshakes, faster page load. Multiplexing eliminates the "6 connections" bottleneck. Next.js 16 supports HTTP/2 out of the box when served over TLS.

**PIP-MLK Application.** **Applicable.** Next.js's dev server speaks HTTP/1.1; production deployment behind Caddy or a CDN can speak HTTP/2 or HTTP/3. The dashboard makes many parallel fetches (DUN intelligence + elections + DPT in parallel on the demographics tab) — multiplexing makes these share one connection. The 4GB-sandbox OOM issue is unrelated to HTTP version.

**Code Example.**
```ts
// Caddy enables HTTP/2 and HTTP/3 automatically for HTTPS sites:
// Caddyfile
// pip-mlk.example.com {
//   reverse_proxy localhost:3000
//   # HTTP/2 + HTTP/3 are on by default; H3 advertises via Alt-Svc header
// }
```

---

### 5.6 gRPC

**What.** Google's RPC framework. Uses **Protocol Buffers** (binary, schema-defined, compact) as the wire format, HTTP/2 as transport. Supports **unary** (request-response), **server streaming**, **client streaming**, and **bidirectional streaming**. Auto-generates client/server stubs in 11 languages from a `.proto` file.

**vs REST:**
- gRPC is binary (smaller payloads, faster parsing) — REST is JSON/text.
- gRPC has a strict schema (`.proto`) — REST schemas (OpenAPI) are optional and often drift.
- gRPC streams natively — REST streams via WebSockets/SSE/chunked encoding.
- gRPC is hard to debug from a browser (needs grpc-web proxy) — REST is curl-friendly.
- gRPC is great for internal service-to-service — REST is great for public APIs.

**Why it matters.** For internal microservices calling each other thousands of times per second, gRPC's smaller payloads and lower latency matter. For a public API consumed by browsers and mobile apps, REST/JSON is simpler.

**PIP-MLK Application.** Not applicable — PIP-MLK has no internal service mesh; the AI Assistant API is a single REST endpoint. **If** the engine (profiler/cleanser/transformer) were split into a separate service, gRPC would be a strong choice for the engine↔dashboard link (typed schemas, smaller payloads for the 77MB JSONL transfers).

**Code Example.**
```proto
// signals.proto
syntax = "proto3";
service SignalService {
  rpc Stream(StreamRequest) returns (stream Signal);  // server streaming
}
message Signal { string id = 1; string title = 2; string status = 3; }
message StreamRequest { string parliament = 1; }
```
```ts
// server
import * as grpc from "@grpc/grpc-js";
const server = new grpc.Server();
server.addService(SignalService, {
  Stream: (call) => {
    emitter.on("signal:new", (s) => call.write(s));
  },
});
server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), () => server.start());
```

---

### 5.7 Webhooks

**What.** Server-to-server HTTP POST: "event X happened, here are the details." Instead of polling ("did it happen? did it happen?"), the source pushes a notification when the event occurs.

**vs polling:** Polling wastes requests when nothing's happening and adds latency when something does (you learn on the next poll, up to `interval` late). Webhooks are real-time and zero-overhead when idle. But: webhooks require the receiver to be reachable from the internet (hard for desktop apps, firewalls), and the sender needs retry logic for receiver downtime.

**Signature verification** — the sender HMAC-signs the body with a shared secret; the receiver verifies before processing, to prevent spoofing. Stripe signs with `Stripe-Signature: t=…,v1=…` using HMAC-SHA256.

**Retry strategy** — receiver returns 2xx to acknowledge; non-2xx triggers retry with exponential backoff over 24-72 hours. After N failures, give up (and log to DLQ).

**PIP-MLK Application.** **Applicable — future.** When the engine finishes regenerating P134 intelligence (after Gate 9 closure), it could POST a webhook to the dashboard's `/api/engine/notify` route: `{"event": "intelligence.regenerated", "parliament": "P134", "runId": "…"}`. The dashboard then busts its cache and emits `dpt:refreshed` via the in-process emitter. Signature verification (HMAC-SHA256 with a shared secret) prevents spoofing.

**Code Example.**
```ts
// Receiver: verify HMAC signature
import { createHmac, timingSafeEqual } from "node:crypto";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("X-Engine-Signature") ?? "";
  const expected = createHmac("sha256", process.env.ENGINE_WEBHOOK_SECRET!)
    .update(body).digest("hex");
  const ok = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return new Response("invalid signature", { status: 401 });
  const event = JSON.parse(body);
  emitter.emit("dpt:refreshed", event);
  return Response.json({ ok: true });
}

// Sender: sign + retry with exponential backoff
async function postWebhook(url: string, payload: unknown, secret: string) {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "X-Engine-Signature": sig, "Content-Type": "application/json" }, body });
    if (res.ok) return;
    await new Promise(r => setTimeout(r, 2 ** attempt * 1000)); // 1s, 2s, 4s, 8s, 16s
  }
  // give up → DLQ
}
```

---

### 5.8 WebSockets

**What.** Full-duplex, persistent, bidirectional TCP connection upgraded from HTTP. Client and server can both push messages at any time after the handshake. Frames are tagged (text/binary/ping/pong/close). Single connection = no per-message handshake overhead.

**vs SSE** — WebSockets are bidirectional; SSE is server→client only. SSE is simpler (just `text/event-stream`), works over plain HTTP/2 (multiplexed), and auto-reconnects. Pick SSE unless you need client→server messages.

**vs Long Polling** — Long polling: client requests, server holds the request open until data is ready, responds, client immediately re-requests. Higher overhead (one HTTP request per message), simpler firewall traversal. WebSockets win once you control both ends and need <1s latency bidirectionally.

**Why it matters.** Real-time dashboards (PIP-MLK S2D Console), chat, multiplayer games, live trading. The S2D signal lifecycle ("new → acknowledged → acting → resolved") should propagate to all open dashboards instantly — that's exactly what WebSockets are for.

**PIP-MLK Application.** **Applicable — `src/lib/websocket-server.ts` ships with this task.** The S2D Console already has client-side state in `useS2DStore`; the WebSocket server broadcasts signal updates so two analysts both see when one acknowledges a signal. The frontend connects via `io("/?XTransformPort=3003")` (per the Caddy gateway pattern in `examples/websocket/`). The server emits `signal:new`, `signal:updated`, `signal:resolved` events.

**Code Example.** See `src/lib/websocket-server.ts`. Minimal usage:
```ts
// server (mini-service on port 3003)
import { startWsServer } from "@/lib/websocket-server";
startWsServer(3003);

// frontend
import { io } from "socket.io-client";
const sock = io("/?XTransformPort=3003", { transports: ["websocket"] });
sock.on("signal:new", (s) => useS2DStore.getState().addSignal(s));
```

---

### 5.9 Server-Sent Events

**What.** One-way server-to-client streaming over plain HTTP. Server sends `Content-Type: text/event-stream`; client opens an `EventSource`. Messages are `data:` lines separated by blank lines. Auto-reconnects with `Last-Event-ID` header. No client→server messages (the client would use a regular HTTP POST for those).

**Why it matters.** Simpler than WebSockets when you only need server→client push (notifications, live feeds, log tails). Works over HTTP/2 (multiplexed). Reconnects automatically. Easier to scale behind CDNs.

**PIP-MLK Application.** **Applicable — alternative to WebSockets.** If the S2D Console only needs server→client push (no need for the client to push back over the same socket — it can POST to `/api/s2d/signals` instead), SSE would be simpler than the WebSocket mini-service. The current implementation chose WebSockets for bidirectional readiness (future: analyst chat over the same socket).

**Code Example.**
```ts
// Next.js Route Handler — SSE endpoint
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const off = emitter.on("signal:new", (s) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(s)}\n\n`));
      });
      req.signal.addEventListener("abort", () => { off(); controller.close(); });
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
}

// frontend
const es = new EventSource("/api/s2d/stream");
es.onmessage = (e) => { const s = JSON.parse(e.data); useS2DStore.getState().addSignal(s); };
```

---

### 5.10 Long Polling

**What.** Client sends a request; server holds it open (without responding) until an event is available, then responds. Client immediately re-requests. Variants: **HTTP long polling** (server holds open) vs **JSONP polling** (legacy, for old browsers).

**Why it matters.** Pre-WebSocket fallback for environments where WebSockets are blocked (some corporate proxies, old mobile networks). Higher overhead than WebSockets (one HTTP request per event, plus handshake), but works everywhere HTTP works.

**When to use:** Only when WebSockets and SSE are both unavailable. Otherwise prefer SSE (server→client) or WebSocket (bidirectional).

**PIP-MLK Application.** Not applicable — PIP-MLK runs in a controlled sandbox where WebSockets work. **If** the dashboard ever needed to support ancient corporate-firewall users, the Socket.IO client already auto-falls back to long polling (`transports: ["websocket", "polling"]` in `examples/websocket/frontend.tsx`).

**Code Example.**
```ts
// Server holds the request open until an event arrives (or timeout)
export async function GET() {
  const deadline = Date.now() + 25_000; // 25s max hold (below typical proxy 30s timeout)
  while (Date.now() < deadline) {
    const signal = pendingSignals.shift();
    if (signal) return Response.json({ signal });
    await new Promise(r => setTimeout(r, 500));
  }
  return Response.json({ signal: null }); // timeout — client re-polls
}

// Client
async function poll() {
  while (true) {
    const { signal } = await fetch("/api/s2d/long-poll").then(r => r.json());
    if (signal) useS2DStore.getState().addSignal(signal);
  }
}
```

---

## 6. Deployment + Operations

### 6.1 Rollbacks

**What.** Revert a deployment to the previous known-good version. Three flavors:
- **Code rollback** — deploy the previous Docker image / git SHA. Fast (minutes), but assumes the new code didn't already migrate the database forward in a non-backward-compatible way.
- **Database rollback** — undo schema migrations (drop columns, restore tables). Painful; requires forward-compatible migration discipline (expand-then-contract / parallel-change pattern).
- **Feature flag rollback** — flip a flag in your config service (LaunchDarkly, Unleash, in-process `next.config.js` env); the new code stays deployed but the feature is hidden. Instant, no redeploy.

**Why it matters.** Every deployment is a risk. The mean time to recovery (MTTR) of a bad deploy is dominated by *how fast you can roll back*. A 30-second feature-flag flip beats a 10-minute redeploy.

**PIP-MLK Application.** **Applicable.** The dashboard has no database migrations yet, but the FALLBACK-DATA-01 inline datasets are a form of **data rollback** — if a fetch returns garbage (e.g. a bad engine run ships corrupt JSONL), the dashboard can fall back to the inline snapshot. A future feature-flag system (e.g. `NEXT_PUBLIC_ENABLE_AI_ASSISTANT=true`) would let the team ship the AI Assistant code disabled and flip it on without redeploying.

**Code Example.**
```ts
// Feature flag pattern — instant rollback without redeploy
const FLAGS = {
  aiAssistant: process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === "true",
  s2dConsole:  process.env.NEXT_PUBLIC_ENABLE_S2D_CONSOLE !== "false",
};
// In dashboard.tsx:
{FLAGS.aiAssistant && <AssistantPanel />}
// Rollback: set env var to "false", restart. No code change, no rebuild.
```

---

### 6.2 Health Checks

**What.** An endpoint that reports whether the service is healthy. Two flavors:
- **Liveness** — "is the process alive and not deadlocked?" If liveness fails, restart the container. Liveness should be cheap (return 200 immediately) and not depend on downstream services.
- **Readiness** — "is the service ready to serve traffic?" If readiness fails, remove from the load balancer (don't restart). Readiness can check downstream deps (DB, Redis).

**Why it matters.** Without health checks, a process that's wedged (high CPU, deadlocked event loop, OOM-adjacent) keeps receiving traffic. With them, the orchestrator (Kubernetes, ECS, Nomad) detects the wedge and either restarts (liveness) or routes around it (readiness).

**PIP-MLK Application.** **Applicable.** Next.js has a built-in `/` route but no dedicated health endpoint. Adding `/api/health` that checks (a) Prisma can reach SQLite, (b) the static data files exist, would let a future orchestrator detect drift. The cron jobs in `src/lib/cron-jobs.ts` expose a `getCronStatus()` function that the health endpoint could include.

**Code Example.**
```ts
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    process: "ok",
    cron: getCronStatus(),
    dataDir: "ok" as "ok" | "fail",
  };
  try {
    await fs.access(path.join(process.cwd(), "public/data/p134/dashboard-overview.json"));
  } catch { checks.dataDir = "fail"; }
  const healthy = checks.dataDir === "ok";
  return Response.json({ status: healthy ? "ok" : "degraded", checks }, { status: healthy ? 200 : 503 });
}
```

---

### 6.3 Liveness & Readiness Probes

**What.** Kubernetes-specific configuration that wraps health checks (see 6.2). Each pod gets:
- `livenessProbe` — failure → kill + restart pod.
- `readinessProbe` — failure → remove pod from Service endpoints (no traffic), but don't restart.
- `startupProbe` — until it succeeds, liveness/readiness are disabled (for slow-starting apps).

**Configuration knobs:**
- `initialDelaySeconds` — wait this long before first probe (let the app boot).
- `periodSeconds` — probe every N seconds.
- `timeoutSeconds` — give up after N seconds.
- `successThreshold` — N consecutive successes to be "healthy."
- `failureThreshold` — N consecutive failures to be "unhealthy."

**Why it matters.** Misconfigured probes cause cascading failures: too-aggressive liveness → infinite restart loop (the app never finishes booting); too-lenient → wedged pods keep traffic. A common gotcha: liveness probe that checks the DB → DB blip → all pods restart simultaneously → thundering herd on DB recovery.

**PIP-MLK Application.** Not applicable — PIP-MLK runs in a single-process sandbox, not Kubernetes. **If** containerized, the recommended probes are: liveness = `GET /api/health/live` (process-only check, returns 200 if event loop is responsive); readiness = `GET /api/health` (checks data dir + DB). `initialDelaySeconds: 10` to let Next.js boot.

**Code Example.**
```yaml
# kubernetes/deployment.yaml
spec:
  containers:
    - name: pip-mlk
      image: pip-mlk:v1
      livenessProbe:
        httpGet: { path: /api/health/live, port: 3000 }
        initialDelaySeconds: 10
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet: { path: /api/health, port: 3000 }
        initialDelaySeconds: 5
        periodSeconds: 5
        failureThreshold: 2
```

---

### 6.4 Chaos Engineering

**What.** Deliberately inject failures into production (or staging) to verify the system behaves as expected. **Chaos Monkey** (Netflix, 2011) randomly kills production instances during business hours; the assumption is that an instance *will* die eventually, so you'd better know now whether the system survives it.

**Failure injection patterns:**
- Kill pods / VMs / containers.
- Add network latency, packet loss, partition between zones.
- Saturate disk, fill memory.
- Expire TLS certificates.
- Revoke DB credentials.

**Why it matters.** Untested failure modes fail in production at 3 a.m. Chaos engineering surfaces them in business hours with on-call ready. Builds confidence in redundancy, failover, circuit breakers.

**PIP-MLK Application.** **Partially applicable — manual.** PIP-MLK has no chaos automation, but the FALLBACK-DATA-01 work was effectively a chaos exercise: the team killed the dev server (OOM) and verified the dashboard still rendered with inline fallback data. A future chaos test: delete `public/data/p134/dun-intelligence.jsonl` and verify the dashboard shows the offline badge + fallback dataset, not a 404 page.

**Code Example.**
```bash
# Manual chaos test: delete a data file, verify graceful degradation
rm public/data/p134/dun-intelligence.jsonl
# → reload dashboard → Demographics tab should show amber "Offline data mode" badge + fallback
# → restore: git checkout public/data/p134/dun-intelligence.jsonl
```

---

### 6.5 Disaster Recovery

**What.** The plan for when a region dies, ransomware encrypts everything, or a config error drops the primary database. Two key metrics:
- **RPO** (Recovery Point Objective) — how much data loss is acceptable? RPO=0 = no loss (synchronous replication). RPO=1h = up to 1h of transactions may be lost.
- **RTO** (Recovery Time Objective) — how long until service is back? RTO=15min = hot standby. RTO=4h = restore from backup.

**Backup strategies** (see 6.6) and **failover** (see 6.7) are the building blocks. DR drills (deliberately fail over to the DR site quarterly) are how you find out the DR plan is broken *before* the disaster.

**Why it matters.** Without a tested DR plan, a single region outage = your business is down until that region comes back. With one, you fail over to the DR region and keep serving. Companies have gone bankrupt from untested DR plans that failed at the moment of truth.

**PIP-MLK Application.** Not applicable — single sandbox, no production data, no DR requirements. **Conceptually:** the worklog's "Dev server OOM on 4GB sandbox" is the closest analog. RPO is "since last engine run" (acceptable — engine output is regenerable from raw SPR data); RTO is "restart dev server" (~10s). The FALLBACK-DATA-01 inline datasets are a tiny DR measure — the client can render even with the server down.

**Code Example.**
```ts
// DR plan template (kept in /docs/dr-plan.md):
// - RPO: 1 engine run (~monthly). Acceptable because raw SPR data is the source of truth.
// - RTO: 15 minutes (redeploy Next.js + restore engine output from git LFS).
// - Backup: engine output committed to git; raw SPR xlsx in encrypted S3 bucket.
// - Failover: none (single-region); in disaster, dashboard is read-only against fallback data.
// - Drill: quarterly, delete public/data/, verify fallback renders.
```

---

### 6.6 Backups

**What.** Copies of data stored separately so you can restore after loss. Three types:
- **Full** — everything, every time. Simple, slow, storage-heavy.
- **Incremental** — only what changed since the last backup (full or incremental). Fast, small, but restore requires the full + every incremental in order (long restore chain).
- **Differential** — everything changed since the last *full*. Compromise: bigger than incremental, but restore is full + one differential.

**3-2-1 rule** — 3 copies of data, on 2 different media, with 1 off-site. Survives: disk failure, building fire, ransomware.

**Why it matters.** Backups are the only thing between you and permanent data loss. Untested backups are no backups — verify restores regularly. Encrypt backups at rest; the backup server is a prime ransomware target.

**PIP-MLK Application.** **Applicable in a simple form.** The engine output is committed to git (full backup, versioned). The 77MB `voter-intelligence.jsonl` (raw PDPA-sensitive data) is excluded from git but documented in the worklog as "NO PDPA files shipped." A real production setup would: (a) full backup of `public/data/` to S3 nightly, (b) incremental backup of engine output on each run, (c) quarterly restore drill.

**Code Example.**
```bash
# Nightly full backup of engine output to S3
aws s3 sync public/data/ s3://pip-mlk-backups/data/$(date +%Y-%m-%d)/ \
  --exclude "*" --include "*.json" --include "*.jsonl"

# Restore drill (quarterly)
aws s3 sync s3://pip-mlk-backups/data/2026-01-15/ /tmp/restore-test/
diff -r /tmp/restore-test public/data/   # verify match
```

---

### 6.7 Failover

**What.** When the active node dies, switch traffic to a standby. Three patterns:
- **Active-passive** — one node serves traffic, the other stands by. Failover = promote standby, demote broken active. DNS or load balancer updates. Simpler; standby is idle cost.
- **Active-active** — both nodes serve traffic. Failover = just stop sending traffic to the dead one. No idle cost, but needs a way to keep state in sync (replication) and resolve write conflicts (single-leader or multi-leader).
- **DNS failover** — health-checked DNS record (Route 53, Cloudflare). When primary is unhealthy, DNS returns the standby's IP. Slow (TTL seconds to minutes) but simple and works across regions.

**Why it matters.** Without failover, a single node death = downtime. With it, the death is invisible to users (or a brief blip). The choice between active-passive and active-active is the choice between idle cost and consistency complexity.

**PIP-MLK Application.** Not applicable — single sandbox. **Conceptually:** the FALLBACK-DATA-01 inline datasets are a client-side "failover" — when the server is unreachable, the client serves stale data. This is **client-side failover to a cached snapshot**, not infrastructure failover, but the user-facing effect is the same: the dashboard stays available.

**Code Example.**
```ts
// Active-passive via DNS failover (Route 53 health check)
// Primary: pip-mlk.example.com → A 1.1.1.1 (health checked every 10s)
// Standby: pip-mlk.example.com → A 2.2.2.2 (only returned when primary unhealthy)
// TTL 60s → failover takes ~60s after the health check fails (3 consecutive failures)
```

---

### 6.8 Multi-Region Deployments

**What.** Run the application in multiple geographically separated regions (e.g. AWS ap-southeast-1 Singapore + us-east-1 Virginia). Users are routed to the closest region (latency-based routing) or based on data-residency rules (EU users → EU region).

**Latency-based routing** — GeoDNS / Anycast / Cloudflare's Argo Smart Routing. Each user's DNS query returns the lowest-latency region's IP.

**Data residency** — GDPR requires EU personal data to stay in the EU (or in countries with adequacy decisions). Malaysia's PDPA (Akta 709, which PIP-MLK complies with per the governance tab) has similar cross-border transfer rules. Multi-region lets you keep Malaysian voter data in an SG region and analytics in us-east-1.

**Why it matters.** Latency (a 250ms Singapore↔Virginia round trip is noticeable), compliance (data residency laws), and disaster recovery (a whole AWS region can fail — us-east-1 has, multiple times).

**PIP-MLK Application.** Not applicable — single sandbox. **If** PIP-MLK went to production: voter intelligence (PDPA-sensitive per Akta 709) must stay in a Malaysian or Singaporean region. The dashboard (read-only, no PII) could be deployed globally behind a CDN, with API calls routed to the SG region. The 71,415-voter P134 JSONL ships pre-generated and is PII-free (pseudonymised BANGSA, no IC numbers), so it could be CDN-cached globally.

**Code Example.**
```ts
// Latency-based routing via Cloudflare Workers
export default {
  async fetch(req: Request, env: { SG_URL: string; US_URL: string; EU_URL: string }) {
    const country = req.cf?.country as string;
    const url = new URL(req.url);
    if (["MY", "SG", "ID", "TH"].includes(country)) url.hostname = env.SG_URL;
    else if (["GB", "DE", "FR"].includes(country)) url.hostname = env.EU_URL;
    else url.hostname = env.US_URL;
    return fetch(url.toString(), req);
  },
};
```

---

## 7. Cost + Serverless

### 7.1 Cost Optimization

**What.** Reducing cloud spend without sacrificing functionality. Three primary levers:
- **Right-sizing** — match instance size to actual load. A `t3.2xlarge` averaging 5% CPU should be a `t3.medium`. Use CloudWatch / Vercel analytics to find over-provisioned resources.
- **Reserved capacity** — commit to 1-3 years of usage for 30-72% off. Reserved Instances (AWS), Committed Use Discounts (GCP). Only commit to steady-state baseline; keep bursty traffic on-demand.
- **Spot instances** — bid on AWS spare capacity for 90% off. Can be terminated with 2 minutes' notice. Great for batch jobs (engine runs), bad for the dashboard frontend.

Other levers: tiered storage (move old data to S3 Glacier), autoscaling (scale to zero at night), CDN caching (reduce origin requests), query optimization (fewer DB round trips).

**Why it matters.** Cloud bills scale linearly with usage; without active management, costs balloon as the product grows. A 30% optimization compounds across every future month.

**PIP-MLK Application.** **Applicable in a small way.** The dashboard serves static JSONL from `public/data/` — these should be CDN-cached (long `Cache-Control` headers) so the Next.js server doesn't pay per-request I/O. The AI Assistant API calls ZAI for each message — caching common questions (e.g. "How many voters in P134?") in memory would cut LLM costs. The cron jobs in `src/lib/cron-jobs.ts` are scheduled hourly, not minutely, to avoid burning cycles when nothing changes.

**Code Example.**
```ts
// Static data: long-cache headers via next.config.ts
// next.config.ts
export default {
  async headers() {
    return [{
      source: "/data/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    }];
  },
};

// LLM response cache (in-process, LRUs)
import { LRUCache } from "lru-cache";
const llmCache = new LRUCache<string, string>({ max: 200, ttl: 1000 * 60 * 60 });
async function ask(question: string) {
  const key = question.toLowerCase().trim();
  if (llmCache.has(key)) return llmCache.get(key)!;
  const answer = await zai.chat.completions.create({ /* … */ });
  llmCache.set(key, answer);
  return answer;
}
```

---

### 7.2 Cold Starts

**What.** Serverless functions (AWS Lambda, Vercel Edge Functions, Cloudflare Workers) spin up a fresh container/VM on first invocation after idle. The user pays this spin-up time as added latency: 100-500ms for Node.js Lambda, 5-50ms for V8-isolate-based Workers.

**Mitigation:**
- **Provisioned concurrency** (Lambda) — keep N instances warm. Pays for idle.
- **Scheduled pings** — invoke the function every 5 minutes to keep it warm.
- **Smaller bundle** — less code to load = faster init. Tree-shake aggressively.
- **V8 isolates** (Cloudflare Workers, Vercel Edge Runtime) — no container, sub-50ms cold starts.
- **Lazy initialization** — defer `new PrismaClient()` and other heavy constructors until first request, not at module load.

**Why it matters.** A 500ms cold start on a login flow feels broken. Architectures with predictable traffic avoid serverless for latency-critical paths; architectures with spiky traffic love it.

**PIP-MLK Application.** **Partially applicable.** Next.js runs as a long-lived server (not serverless) in the sandbox, so there's no cold start on the dashboard. The AI Assistant API route (`src/app/api/assistant/route.ts`) is serverless-style: each request loads the ZAI SDK and reads RAG context from disk. If deployed to Vercel as a serverless function, the first request after idle would pay a cold-start cost. The route's lazy `ZAI.create()` (deferred until request) is already the right pattern.

**Code Example.**
```ts
// Lazy initialization — module-load cost is near-zero, heavy work happens per-request
let _zai: typeof ZAI | null = null;
async function getZai() {
  if (!_zai) _zai = await ZAI.create(); // happens on first request, not at cold start
  return _zai;
}
export async function POST(req: NextRequest) {
  const zai = await getZai();
  // …
}
```

---

### 7.3 Serverless Limits

**What.** Serverless platforms impose per-invocation limits:

| Platform | Max Duration | Max Memory | Max Payload | Concurrency |
|---|---|---|---|---|
| AWS Lambda | 15 min | 10 GB | 6 MB sync / 256 KB async | 1000 default |
| Vercel Serverless (Node) | 10s Hobby / 60s Pro / 300s Enterprise | 1 GB / 3 GB | 4.5 MB request | 1000 per region |
| Vercel Edge | 25s (Hobby) / 300s (Pro) | 128 MB | 4.5 MB request | varies |
| Cloudflare Workers | 30s CPU / unlimited wall | 128 MB | 100 MB | unlimited |

**Why it matters.** Hit a limit and your function dies mid-request. The 10-second Vercel Hobby limit is famous for killing long DB queries. 4.5 MB request bodies rule out large file uploads (must use pre-signed S3 URLs instead).

**PIP-MLK Application.** Not applicable in the sandbox (long-lived server, no per-request limits). **If** deployed to Vercel serverless: the AI Assistant route must finish under 10-60s (the ZAI call usually takes 1-3s, safe). The engine transformer (77MB JSONL, ~30s runtime) cannot run serverless — would need to run on a long-lived worker (AWS Fargate, Cloud Run) or be split into chunks.

**Code Example.**
```ts
// Streaming a long-running LLM response to avoid the 10s limit
export async function POST(req: NextRequest) {
  const zai = await ZAI.create();
  const stream = await zai.chat.completions.create({ /* … */, stream: true });
  const enc = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(enc.encode(chunk.choices[0]?.delta?.content ?? ""));
      }
      controller.close();
    },
  });
  return new Response(readable); // each chunk resets the timer
}
```

---

### 7.4 Throughput

**What.** Requests per second (RPS) a system can sustain. Bottlenecks typically fall into: CPU (parsing, crypto), memory (working set > RAM → swapping), disk IOPS, network bandwidth, DB connection pool, third-party API rate limits.

**Identifying bottlenecks:**
- Load test (k6, Artillery, wrk) — find the RPS where p99 latency spikes.
- Profile (clinic.js, `--prof`) — find the hot function.
- APM (DataDog, New Relic, OpenTelemetry) — see where time goes per request.

**Why it matters.** You don't know your real ceiling until you load test. Production traffic at 2x your tested ceiling is a guaranteed outage.

**PIP-MLK Application.** **Applicable.** The dashboard's bottleneck is the Next.js dev server on 4 GB RAM (the worklog records OOM). In production the bottleneck would shift to (a) the AI Assistant API's ZAI call (1-3s per request, so ~0.3-1 RPS per server instance) and (b) the JSONL parse on each dashboard load (~50ms for 5 DUN records, ~500ms for the 77MB voter file). Mitigations shipped: parallel fetches in tabs, LRU caches in cron jobs, lazy SDK initialization.

**Code Example.**
```ts
// Load test with k6 — find PIP-MLK's ceiling
// k6 script
import http from "k6/http";
export const options = { vus: 50, duration: "30s" };
export default function () {
  http.get("http://localhost:3000/");
  http.get("http://localhost:3000/api/assistant", { method: "POST", body: JSON.stringify({ question: "How many voters in P134?" }), headers: { "Content-Type": "application/json" } });
}
// → watch p99 latency; the RPS where p99 exceeds 2s is your ceiling
```

---

### 7.5 Tail Latency

**What.** The slowest requests — p99 (99th percentile), p99.9, p99.99 — not the average. **Why averages lie:** if 99% of requests take 100ms and 1% take 10s, the average is 200ms (looks great!) but the 1% of users with 10s latency are furious. At Google scale, p99.99 = one in ten thousand requests = thousands of users per minute.

**Causes of tail latency:**
- **GC pauses** (see 4.2) — major GC = 50-200ms stop-the-world.
- **Network jitter** — packet retransmits, route flaps.
- **Slow disks** — SSD garbage collection, RAID rebuilds.
- **Neighbor noise** — noisy neighbor on a shared VM.
- **Lock contention** — one slow request holding a lock blocks the queue.

**Mitigation:**
- **Hedged requests** (Jeff Dean's pattern) — send the same request to 2 replicas; use whichever responds first; cancel the other. Cuts p99 dramatically at the cost of 2x load.
- **Request prioritization** — important requests jump the queue.
- **Tied requests** — like hedged, but cancel the loser faster.
- **Provision for the tail** — your cluster must handle p99 load, not average load.

**Why it matters.** The slowest 1% of users have the worst experience and write the angriest reviews. SLOs are written in p99/p99.9, not averages, precisely because averages hide the pain.

**PIP-MLK Application.** **Applicable.** The dashboard's worst-case latency is the demographics tab's JSONL parse — 5 DUN records parse in ~5ms, but if the file is later expanded to all 28 DUNs across 6 parliaments, the parse could spike to 500ms+. The AI Assistant API has high p99 (ZAI call can take 5-10s for complex questions); the UI shows a spinner so the user knows work is happening. The cron jobs run in the background so they don't add to user-facing latency.

**Code Example.**
```ts
// Measure p99 — instrument every API call
const latencies: number[] = [];
export async function POST(req: NextRequest) {
  const t0 = performance.now();
  try {
    const result = await handle(req);
    return result;
  } finally {
    latencies.push(performance.now() - t0);
    if (latencies.length % 100 === 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      console.log(`[lat] p50=${p50.toFixed(0)}ms p99=${p99.toFixed(0)}ms`);
    }
  }
}
```

---

## 8. Incidents

### 8.1 Production Incidents

**What.** An unplanned disruption to production: site down, data loss, security breach, degraded performance. Handled via an **incident response** process:
1. **Detect** (alert fires, user reports, dashboard anomaly).
2. **Triage** — assign severity, page the on-call.
3. **Mitigate** — stop the bleeding (rollback, failover, scale up). Not "fix the bug" — "stop the impact."
4. **Resolve** — fix the root cause.
5. **Postmortem** (see 8.3).

**Severity levels** (typical):
- **SEV1** — major outage, customer data loss, total service down. Page everyone. War room.
- **SEV2** — significant degradation, partial outage, no workaround. Page on-call.
- **SEV3** — minor degradation, workaround exists. Fix in business hours.
- **SEV4** — cosmetic, no user impact. File a ticket.

**Why it matters.** Without an IR process, an incident is chaos — five people debugging, no communication, customers furious. With one, mitigation is fast, communication is clear, and the postmortem prevents recurrence.

**PIP-MLK Application.** **Applicable — informal.** The worklog records "Dev server OOM on 4GB sandbox" as a recurring incident. Severity: SEV3 (degraded UX, workaround = FALLBACK-DATA-01 inline data). Mitigation: shipped fallback datasets + offline badges. Root cause: Next.js 16 + Turbopack memory pressure on 4GB. Postmortem: this very worklog entry. No formal SEV system, but the worklog functions as one.

**Code Example.**
```ts
// Incident severity helper — used by the AI Assistant API to tag errors
type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";
function classifyError(err: unknown): Severity {
  if (err instanceof DatabaseDown) return "SEV1";
  if (err instanceof ZaiTimeout) return "SEV2";
  if (err instanceof MissingDataset) return "SEV3"; // fallback covers it
  return "SEV4";
}
```

---

### 8.2 On-call

**What.** A rotation ( PagerDuty, Opsgenie) where one engineer is "on-call" — reachable 24/7 for a week, responds to pages within SLA (e.g. 5 min ack, 30 min mitigate). Rotates weekly across the team.

**Pager rotation** — primary + secondary on-call. Primary gets paged first; secondary is the escalation if primary doesn't ack. Weekly rotation avoids burnout.

**Alert fatigue** — too many noisy alerts → engineers start ignoring pages → real incidents get missed. Mitigation: tune alerts (only page on user-impacting issues), route low-severity to Slack/email not pager, suppress alerts during known incidents.

**Why it matters.** Sustainable on-call is the difference between a team that responds well at 3 a.m. and a team that burns out in 6 months. Burnt-out engineers miss real alerts.

**PIP-MLK Application.** Not applicable — no production users, no on-call rotation. **If** PIP-MLK went to production supporting live election-night analysis, on-call during election periods (PRN, GE) would be essential. Outside election periods, the dashboard is read-only against static data and could run without on-call.

**Code Example.**
```yaml
# PagerDuty schedule — weekly rotation
schedules:
  - name: pip-mlk-primary
    rotation_type: weekly
    users: [alice, bob, carol, dave]
    handoff_time: "Mon 09:00 Asia/Kuala_Lumpur"
  - name: pip-mlk-secondary
    rotation_type: weekly
    users: [eve, frank, grace, heidi]
    handoff_time: "Mon 09:00 Asia/Kuala_Lumpur"
# Alert rules: only SEV1 + SEV2 page; SEV3 → Slack #pip-mlk-alerts
```

---

### 8.3 Postmortems

**What.** A written document produced after every SEV1/SEV2 incident (and ideally SEV3). Captures: timeline, impact, root cause, contributing factors, action items. Follows a **blameless** culture — the question is "what about the system let this happen?" not "who is at fault?"

**RCA (Root Cause Analysis)** — use the "5 Whys": keep asking why until you reach a system-level cause, not a human one. "An engineer deployed bad code" → "why did the bad code pass review?" → "why did CI not catch it?" → "why did the deploy go to prod without staging?" → system-level fixes.

**Action items** — concrete, owned, dated. "Add integration test for X" (owner: Alice, due: 2026-02-15). Not "be more careful." Tracked to completion.

**Why it matters.** Without postmortems, the same incident recurs. With them, each incident is a one-time tax on system improvement. Blameless culture is critical — blame makes engineers hide incidents, which prevents learning.

**PIP-MLK Application.** **Applicable — the worklog is a postmortem log.** Every task entry in `worklog.md` follows a loose postmortem format: status, goals/completed mods/verification, unresolved issues. The "Dev server OOM" issue is recorded with root cause (Next.js 16 + Turbopack memory pressure on 4GB), mitigation (FALLBACK-DATA-01), and unresolved root-cause fix (would need `--max-old-space-size` tuning or more RAM).

**Code Example.**
```markdown
# Postmortem: Dev server OOM (SEV3)

**Date**: 2026-01-15
**Severity**: SEV3 (degraded UX, workaround exists)
**Impact**: Dashboard tabs intermittently showed "Failed to fetch" errors when dev server died.

## Timeline
- 2026-01-15 14:00 — Dashboard tabs began showing destructive-red error Cards.
- 2026-01-15 14:30 — Diagnosed as dev server OOM (4GB sandbox).
- 2026-01-15 15:00 — Mitigation shipped (FALLBACK-DATA-01 inline datasets + offline badges).

## Root Cause
Next.js 16 + Turbopack memory pressure on 4GB sandbox exceeds the default
`--max-old-space-size=1400` MB V8 heap ceiling during compilation.

## 5 Whys
1. Why did tabs error? Dev server died.
2. Why did the dev server die? OOM.
3. Why OOM? V8 heap exhausted.
4. Why exhausted? Turbopack compilation is memory-hungry.
5. Why no recovery? Default heap ceiling too low for the workload.

## Action Items
- [ ] Raise `--max-old-space-size=2048` in dev script (owner: main, due: 2026-02-01)
- [ ] Add `/api/health` endpoint with RSS report (owner: main, due: 2026-02-15)
- [ ] Consider switching to webpack (lower memory) (owner: main, due: 2026-02-15)
```

---

## 9. Practical Implementations Shipped With This Task

Three new files in `src/lib/` demonstrate the patterns most relevant to PIP-MLK:

### 9.1 `src/lib/event-emitter.ts`
In-process typed pub/sub (pattern 1.2). Used by the cron jobs to broadcast "DPT refreshed" without coupling to the React components that care. Supports wildcard listeners (`*`) for logging, returns an `unsubscribe` function for `useEffect` cleanup, and keeps a bounded error history (a soft in-process DLQ, pattern 1.6).

### 9.2 `src/lib/cron-jobs.ts`
Cron scheduler (patterns 1.1, 2.6). Schedules hourly DPT refresh, daily engine manifest check, and weekly governance provenance audit. Uses `globalForCron` (same singleton pattern as `globalForPrisma` in `src/lib/db.ts`) to prevent double-scheduling across Next.js hot reloads — a process-local stand-in for distributed leader election (2.8) and distributed locks (2.5). Jobs emit events via the emitter on completion.

### 9.3 `src/lib/websocket-server.ts`
Socket.IO server (pattern 5.8) for real-time S2D signal broadcasts. Listens on port 3003, exposes `path: "/"` so Caddy forwards `io("/?XTransformPort=3003")` correctly. Broadcasts `signal:new`, `signal:updated`, `signal:resolved` events. Includes slow-consumer detection (backpressure, pattern 4.4) and graceful shutdown.

See each file's header comment for full API docs and usage examples.

---

## Summary Table

| # | Pattern | PIP-MLK Applicability |
|---|---|---|
| 1.1 | Message Queues | Not applicable — single process; would apply for async engine runs |
| 1.2 | Pub/Sub | **Applicable** — `src/lib/event-emitter.ts` shipped |
| 1.3 | Event-Driven Architecture | Partial — S2D store already event-style |
| 1.4 | Distributed Transactions | Not applicable — single DB |
| 1.5 | Saga Pattern | Not applicable today; would apply for engine ingestion |
| 1.6 | Dead Letter Queues | Not applicable — soft in-process DLQ in emitter |
| 2.1 | CAP Theorem | Not applicable — single process; offline-fallback is AP-style |
| 2.2 | Eventual Consistency | **Applicable** — dashboard accepts stale data with badges |
| 2.3 | Optimistic Locking | Applicable if Signal table is added (Prisma `@version`) |
| 2.4 | Pessimistic Locking | Not applicable — SQLite has no row-level locks |
| 2.5 | Distributed Locks | Not applicable — `globalForCron` singleton is the local analog |
| 2.6 | Race Conditions | **Applicable** — Zustand functional updaters + cron singleton |
| 2.7 | Deadlocks | Not applicable — single SQLite, lock-free cron jobs |
| 2.8 | Leader Election | Not applicable — `globalForCron` is process-local |
| 3.1 | Read Replicas | Not applicable — SQLite; concept applies to fallback data |
| 3.2 | Sharding | Not applicable at 71k voters; file-system partitioning by parliament |
| 3.3 | Partitioning | Not applicable — SQLite; file-system layout is the analog |
| 3.4 | Replication | Not applicable — SQLite; fallback data is the analog |
| 4.1 | Memory Leaks | **Applicable** — dev server OOM is documented |
| 4.2 | Garbage Collection | **Applicable** — `--max-old-space-size` tuning documented |
| 4.3 | Thread Safety | Applicable — `worker_threads` for heavy engine runs |
| 4.4 | Backpressure | **Applicable** — WebSocket slow-consumer detection shipped |
| 5.1 | Network Partitions | Not applicable — single process; offline-fallback tolerates client/server partition |
| 5.2 | Clock Skew | Partial — S2D uses client wall clock; acceptable for single-user |
| 5.3 | DNS | Not applicable — sandbox uses fixed URL + Caddy `XTransformPort` |
| 5.4 | TCP vs UDP | Not applicable — both HTTP and WebSocket use TCP |
| 5.5 | HTTP/2 & HTTP/3 | Applicable via production reverse proxy (Caddy) |
| 5.6 | gRPC | Not applicable — no internal service mesh |
| 5.7 | Webhooks | Applicable future — engine → dashboard notify |
| 5.8 | WebSockets | **Applicable** — `src/lib/websocket-server.ts` shipped |
| 5.9 | Server-Sent Events | Applicable alternative to WebSockets for server→client only |
| 5.10 | Long Polling | Not applicable — Socket.IO fallback handles it |
| 6.1 | Rollbacks | **Applicable** — fallback datasets + future feature flags |
| 6.2 | Health Checks | **Applicable** — recommended `/api/health` endpoint |
| 6.3 | Liveness & Readiness Probes | Not applicable in sandbox; documented for K8s |
| 6.4 | Chaos Engineering | Partial — FALLBACK-DATA-01 was a manual chaos test |
| 6.5 | Disaster Recovery | Not applicable — sandbox; documented for production |
| 6.6 | Backups | Applicable — engine output committed to git |
| 6.7 | Failover | Not applicable — single sandbox |
| 6.8 | Multi-Region | Not applicable — single sandbox; PDPA rules documented |
| 7.1 | Cost Optimization | **Applicable** — CDN caching + LLM response cache |
| 7.2 | Cold Starts | Partial — applies if deployed serverless |
| 7.3 | Serverless Limits | Not applicable — long-lived server |
| 7.4 | Throughput | **Applicable** — dev server OOM is the current ceiling |
| 7.5 | Tail Latency | **Applicable** — AI Assistant p99 is high; spinner UX |
| 8.1 | Production Incidents | **Applicable** — worklog is the incident log |
| 8.2 | On-call | Not applicable — no production users |
| 8.3 | Postmortems | **Applicable** — worklog follows postmortem format |

**Bolded "Applicable"** items are actively demonstrated in shipped code or documented workflows.

---

*End of document. 48 patterns covered. 3 implementation files shipped. `bun run lint` to be run as final verification.*
