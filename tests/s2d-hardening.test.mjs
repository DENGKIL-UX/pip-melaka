import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(relativePath, "utf8");
  const output = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const encoded = Buffer.from(output).toString("base64");
  return import(`data:text/javascript;base64,${encoded}#${encodeURIComponent(relativePath)}`);
}

const validContext = {
  schema: "pip.constituency-aggregate-context.v1",
  status: "ACTIVE",
  constituency: { level: "DUN", code: "N05", name: "Taboh Naning", stateCode: "04", stateName: "Melaka" },
  populationContext: {
    totalPopulation: 16000,
    totalRegisteredElectors: 13602,
    localityCount: 8,
    dmCount: 25,
    geographyMix: { urbanShare: 0.1, semiUrbanShare: 0.3, ruralShare: 0.6 },
    ageBandShares: [{ label: "18-30", share: 0.2 }, { label: "31+", share: 0.8 }],
    broadPopulationSegments: [{ label: "B40", share: 0.65 }, { label: "Other", share: 0.35 }],
  },
  provenance: { sourceSystem: "PIP", datasetVersion: "test", generatedAt: "2026-08-07T00:00:00.000Z", aggregateOnly: true },
};

test("request hardening rejects nested prototype keys and redacts credentials", async () => {
  const security = await loadTypeScriptModule("src/lib/s2d-request-security.ts");
  assert.equal(security.hasPrototypePollution(JSON.parse('{"safe":{"__proto__":{"polluted":true}}}')), true);
  assert.equal(security.hasPrototypePollution({ safe: [{ value: 1 }] }), false);
  const redacted = security.sanitizeS2dError("Bearer abc.def.ghi apify_api_SECRET123?token=raw-secret");
  assert.equal(redacted.includes("abc.def.ghi"), false);
  assert.equal(redacted.includes("SECRET123"), false);
  assert.equal(redacted.includes("raw-secret"), false);
});

test("PIP identity firewall accepts valid aggregates and rejects identity variants", async () => {
  const adapter = await loadTypeScriptModule("src/lib/s2d-engine/pip-aggregate-context-adapter.ts");
  assert.deepEqual(adapter.validatePipAggregateContext(validContext).status, "ACCEPTED");

  for (const dirty of [
    { firstName: "Example" },
    { first_name: "Example" },
    { nested: { voter_ID: "v-1" } },
    { nested: { supportScore: 0.9 } },
    { nested: { handle: "@example" } },
    { records: [{ label: "person" }] },
  ]) {
    const result = adapter.validatePipAggregateContext({ ...validContext, ...dirty });
    assert.equal(result.status, "REJECTED_INDIVIDUAL_DATA", JSON.stringify(dirty));
  }
});

test("PIP identity firewall fails closed on schema and provenance errors", async () => {
  const adapter = await loadTypeScriptModule("src/lib/s2d-engine/pip-aggregate-context-adapter.ts");
  assert.equal(adapter.validatePipAggregateContext({ ...validContext, schema: "wrong" }).status, "REJECTED_SCHEMA_MISMATCH");
  assert.equal(adapter.validatePipAggregateContext({ ...validContext, provenance: { ...validContext.provenance, aggregateOnly: false } }).valid, false);
  assert.equal(adapter.validatePipAggregateContext({}).valid, false);
});

test("shared contracts sanitizer removes identity, targeting and prediction fields", async () => {
  const contracts = await import(pathToFileURL("packages/pip-s2d-contracts/src/index.js"));
  const result = contracts.sanitizeForSharedAggregateExchange({
    signals: [{ signalId: "s-1", voterId: "v-1", handle: "@person", supportScore: 0.8, targetSegment: "x" }],
  });
  assert.equal(result.value.signals[0].voterId, undefined);
  assert.equal(result.value.signals[0].handle, undefined);
  assert.equal(result.value.signals[0].supportScore, undefined);
  assert.equal(result.value.signals[0].targetSegment, undefined);
  assert.equal(result.report.prohibitedFieldsRemoved.length, 4);
});

test("Apify plans enforce actor/source governance and never place token in URL", async () => {
  const apify = await loadTypeScriptModule("src/lib/s2d-apify.ts");
  const plan = apify.buildS2dApifyPlan({ platform: "tiktok", keywords: ["Melaka"], limit: 100, env: {} });
  assert.equal(plan.requestedMaximum, 20);
  assert.deepEqual(plan.actorInput.searchQueries, ["Melaka"]);
  assert.throws(() => apify.buildS2dApifyPlan({ platform: "threads", env: {} }), /No approved Apify actor/);
  assert.throws(() => apify.buildS2dApifyPlan({ platform: "facebook", env: {} }), /curated Melaka Facebook sources/);

  let request;
  const result = await apify.runS2dApifyPlan(plan, "apify_api_TEST_SECRET", {
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(request.url.includes("TEST_SECRET"), false);
  assert.equal(request.init.headers.Authorization, "Bearer apify_api_TEST_SECRET");
  assert.equal(result.retained, 2);
});

test("embedded engine source, bundle paths and security fixtures are internally consistent", () => {
  const vendor = readFileSync("vendor/s2d-360/S2D360Engine.clean.jsx");
  const publishedSource = readFileSync("public/s2d-360/S2D360Engine.clean.jsx");
  assert.equal(createHash("sha256").update(vendor).digest("hex"), createHash("sha256").update(publishedSource).digest("hex"));
  assert.equal(vendor.toString("utf8").split("\n").length - 1, 5185);
  assert.match(vendor.toString("utf8"), /S2DAuthorizedNetworkEvidencePage/);

  const index = readFileSync("public/s2d-360/index.html", "utf8");
  const bundlePath = index.match(/src="([^"]+index-[^"]+\.js)"/)?.[1];
  assert.ok(bundlePath);
  assert.equal(existsSync(`public${bundlePath}`), true);
  const bundle = readFileSync(`public${bundlePath}`, "utf8");
  assert.equal(/(?<!s2d-360)\/assets\//.test(bundle), false);
  // Upstream xlsx@0.18.5 carries two high-severity advisories. The engine
  // only used it for optional export, so the Worker build removes that path.
  assert.equal(bundle.includes("SheetJS"), false);
  assert.equal(bundle.includes("XLSX"), false);

  const posture = JSON.parse(readFileSync("public/s2d-360/assets/s2d-pet-3a-authorized-security-posture.json", "utf8"));
  const network = JSON.parse(readFileSync("public/s2d-360/assets/s2d-pet-3b-authorized-network-evidence.json", "utf8"));
  assert.equal(posture.execution.mode, "ACTIVE SCANNING DISABLED");
  assert.equal(posture.openServices.length, 0);
  assert.equal(network.analysis.status, "NOT_RUN");
  assert.equal(network.governance.liveCapturePerformed, false);
});

test("Melaka sample signals use the canonical parliament/DUN mapping", () => {
  const route = readFileSync("src/app/api/s2d/intelligence/[...path]/route.ts", "utf8");
  assert.match(route, /parliamentCode: "135"[^\n]+dunCode: "08"[^\n]+dunName: "Machap Jaya"/);
  assert.match(route, /parliamentCode: "136"[^\n]+dunCode: "12"[^\n]+dunName: "Pantai Kundor"/);
  assert.doesNotMatch(route, /parliamentCode: "136"[^\n]+dunName: "Lendu"/);
});
