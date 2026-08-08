import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { once } from "node:events";

const PORT = 3456;
const BASE = `http://localhost:${PORT}`;

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = spawn("npm", ["run", "dev"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
    });

    const ready = (data) => {
      if (data.toString().includes("Ready")) {
        server.stdout.off("data", ready);
        resolve();
      }
    };
    server.stdout.on("data", ready);

    setTimeout(() => resolve(), 8000); // fallback
  });
}

async function stopServer() {
  if (server) {
    server.kill("SIGTERM");
    await once(server, "exit").catch(() => {});
  }
}

describe("Security Middleware Contract", () => {
  before(async () => {
    await startServer();
    // Give the dev server a moment to fully boot
    await new Promise((r) => setTimeout(r, 1200));
  });

  after(async () => {
    await stopServer();
  });

  it("returns 429 + Retry-After on rate limit exceeded", async () => {
    // Fire 70 requests quickly (default policy is 60/min)
    const promises = Array.from({ length: 70 }, () =>
      fetch(`${BASE}/api/health`, { method: "GET" }),
    );

    const results = await Promise.all(promises);
    const tooMany = results.find((r) => r.status === 429);

    assert.ok(tooMany, "Expected at least one 429 response");
    assert.ok(
      tooMany.headers.get("retry-after"),
      "Missing Retry-After header",
    );
    assert.ok(
      tooMany.headers.get("x-ratelimit-limit"),
      "Missing rate limit headers",
    );
  });

  it("applies security headers on every response", async () => {
    const res = await fetch(`${BASE}/api/health`);
    const headers = res.headers;

    assert.ok(headers.get("content-security-policy"), "CSP header missing");
    assert.ok(headers.get("x-content-type-options"), "X-Content-Type-Options missing");
    assert.ok(headers.get("x-frame-options"), "X-Frame-Options missing");
    assert.ok(headers.get("strict-transport-security"), "HSTS header missing");
  });

  it("rejects mutating request without valid CSRF token (403)", async () => {
    const res = await fetch(`${BASE}/api/s2d/credentials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "APIFY_TOKEN", token: "test" }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json().catch(() => ({}));
    assert.match(body.error || "", /CSRF/i);
  });
});
