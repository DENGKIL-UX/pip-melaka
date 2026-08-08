import assert from "node:assert/strict";
import test from "node:test";

// Load the real TypeScript module via Node's native type-stripping
// (requires `node --experimental-strip-types`). The previous loader used a
// fragile regex/Function() trick that could not parse typed class fields.
const telemetryModule = await import("../src/lib/analytics/runtime-telemetry.ts");

function loadRuntimeTelemetryModule() {
  return telemetryModule;
}

test("runtime telemetry envelope initializes with safe defaults", () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({
    requestId: "req-1",
    route: "/api/compare",
    authenticated: true,
    cacheStatus: "miss",
    dataVersion: "fixture-v1",
  });

  assert.deepEqual(meta, {
    requestId: "req-1",
    route: "/api/compare",
    tool: undefined,
    authenticated: true,
    cacheStatus: "miss",
    queryCount: 0,
    rowsRead: 0,
    resultRows: 0,
    rowsWritten: 0,
    durationMs: 0,
    responseBytes: 0,
    status: 200,
    dataVersion: "fixture-v1",
  });
});

test("runD1 records D1 rows_read and rows_written metadata", async () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-2", route: "/api/margins", authenticated: true });

  const rows = await telemetry.runD1({
    all: async () => ({
      results: [{ area_code: "N.01" }, { area_code: "N.02" }],
      meta: { rows_read: 28, rows_written: 0 },
    }),
  }, meta);

  assert.deepEqual(rows, [{ area_code: "N.01" }, { area_code: "N.02" }]);
  assert.equal(meta.queryCount, 1);
  assert.equal(meta.rowsRead, 28);
  assert.equal(meta.resultRows, 2);
  assert.equal(meta.rowsWritten, 0);
});

test("runD1 tolerates missing D1 metadata and result arrays", async () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-3", route: "/api/constituency", authenticated: false });

  const rows = await telemetry.runD1({ all: async () => ({ success: true }) }, meta);

  assert.deepEqual(rows, []);
  assert.equal(meta.queryCount, 1);
  assert.equal(meta.rowsRead, 0);
  assert.equal(meta.rowsWritten, 0);
});

test("runD1 accumulates query and D1 metadata counters across statements", async () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-3b", route: "/api/compare", authenticated: true });

  await telemetry.runD1({ all: async () => ({ results: [{ id: 1 }], meta: { rows_read: 12, rows_written: 0 } }) }, meta);
  await telemetry.runD1({ all: async () => ({ results: [{ id: 2 }], meta: { rows_read: 8, rows_written: 3 } }) }, meta);

  assert.equal(meta.queryCount, 2);
  assert.equal(meta.rowsRead, 20);
  assert.equal(meta.resultRows, 2);
  assert.equal(meta.rowsWritten, 3);
});

test("runD1 distinguishes rows scanned/read from rows returned", async () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-3d", route: "/api/margins", authenticated: true });

  const results = Array.from({ length: 20 }, (_, i) => ({ area_code: `N.${String(i + 1).padStart(2, "0")}` }));

  const rows = await telemetry.runD1({
    all: async () => ({
      results,
      meta: { rows_read: 2500, rows_written: 0 },
    }),
  }, meta);

  assert.equal(rows.length, 20);
  assert.equal(meta.queryCount, 1);
  assert.equal(meta.rowsRead, 2500);
  assert.equal(meta.resultRows, 20);
  assert.equal(meta.rowsWritten, 0);
});

test("runD1 wraps failed statements without leaking SQL or parameters", async () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-3c", route: "/mcp", tool: "compare_areas", authenticated: true });
  const sql = "SELECT * FROM voters WHERE nric = ?";
  const secretParam = "900101-01-1234";

  await assert.rejects(
    () => telemetry.runD1({ all: async () => { throw new Error(`${sql} :: ${secretParam}`); } }, meta),
    (error) => {
      assert.equal(error.name, "RuntimeTelemetryD1Error");
      assert.equal(error.code, "D1_QUERY_FAILED");
      assert.equal(error.requestId, "req-3c");
      assert.equal(error.route, "/mcp");
      assert.equal(error.tool, "compare_areas");
      assert.equal(error.message.includes(sql), false);
      assert.equal(error.message.includes(secretParam), false);
      return true;
    },
  );

  assert.equal(meta.requestId, "req-3c");
  assert.equal(meta.queryCount, 1);
  assert.equal(meta.rowsRead, 0);
  assert.equal(meta.rowsWritten, 0);
  assert.equal(meta.status, 500);
});

test("finalizeRuntimeTelemetry keeps CPU and duration distinct", () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-4", route: "/mcp", tool: "compare_areas", authenticated: true });
  const started = performance.now() - 12;

  telemetry.finalizeRuntimeTelemetry(meta, started, {
    status: 200,
    cpuMs: 3.5,
    payload: { ok: true, data: ["N.01"] },
    cacheStatus: "hit",
  });

  assert.equal(meta.cpuMs, 3.5);
  assert.ok(meta.durationMs >= 0);
  assert.ok(meta.responseBytes > 0);
  assert.equal(meta.cacheStatus, "hit");
});

test("telemetry warnings flag v0 budget overages without throwing", () => {
  const telemetry = loadRuntimeTelemetryModule();
  const meta = telemetry.createRuntimeTelemetry({ requestId: "req-5", route: "/api/compare", authenticated: true });
  Object.assign(meta, { queryCount: 3, rowsRead: 101, responseBytes: 8193, cpuMs: 8.1, durationMs: 501 });

  assert.deepEqual(telemetry.getRuntimeTelemetryWarnings(meta), [
    "queryCount",
    "rowsRead",
    "responseBytes",
    "cpuMs",
    "durationMs",
  ]);
});
