# PIP-MLK Security Research — `SECURITY-01`

> Truth Above All. Defense-in-depth for a public-facing political intelligence
> dashboard. Every pattern below is implemented in `src/lib/` and applied via
> `src/middleware.ts`; this document is the canonical reference for why each
> layer exists and how to use it correctly.

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [CORS — Cross-Origin Resource Sharing](#2-cors)
3. [CSRF — Cross-Site Request Forgery](#3-csrf)
4. [SQL Injection Prevention](#4-sql-injection-prevention)
5. [XSS Prevention](#5-xss-prevention)
6. [SSRF Prevention](#6-ssrf-prevention)
7. [Secrets Management](#7-secrets-management)
8. [Security Headers](#8-security-headers)
9. [JWT — Rotation & Validation](#9-jwt--rotation--validation)
10. [TLS / Encryption](#10-tls--encryption)
11. [Rate Limiting](#11-rate-limiting)
12. [Audit Checklist](#12-audit-checklist)

---

## 1. Threat Model

PIP-MLK is a read-mostly dashboard, but it exposes two server-side surfaces:

| Surface | Risk |
|---------|------|
| `/api/assistant` POST | LLM cost abuse, prompt injection, brute-force extraction of verified facts |
| `/api/*` (any future route) | CORS bypass, CSRF on state-changing endpoints, SSRF via webhook/callback URLs |
| Public dashboard pages | XSS via reflected/inserted content; clickjacking via iframe embedding |
| Server-side DB access (Prisma) | SQL injection via `$queryRawUnsafe` if used incorrectly |
| Outbound HTTP from server (ZAI SDK) | SSRF if a future route accepts a user-controlled URL |

Each section below addresses one of these risks.

---

## 2. CORS

**File**: [`src/lib/cors.ts`](../src/lib/cors.ts)

### Why

The browser's same-origin policy prevents `evil.com` from reading responses
from `pip-mlk.example.gov.my`. CORS is the explicit opt-out mechanism — but a
wildcard `Access-Control-Allow-Origin: *` paired with `credentials: true` is
a known misconfiguration that lets any site read authenticated responses.

### Implementation

- **Allowlist** (not wildcard): `localhost:3000`, `127.0.0.1:3000`, and the
  production domain from `NEXT_PUBLIC_APP_ORIGIN`. Exact-string match only —
  no substring tricks (e.g. `evil-pip-mlk.example.gov.my.attacker.com`).
- **`withCORS(handler)`** HOF wraps every App Router route handler:
  - OPTIONS preflight → 204 with full CORS header set if origin is allowed,
    else 403.
  - Actual request → handler runs, response gets `Access-Control-Allow-Origin`
    stamped only if origin is on the allowlist.
- **Credentials**: `Access-Control-Allow-Credentials: true` so the CSRF cookie
  and any auth cookies travel with the request.
- **`Vary: Origin`** always set so CDNs don't cache a response with one origin
  and serve it to another.

### Usage

```ts
// src/app/api/anything/route.ts
import { withCORS } from "@/lib/cors";
export const GET = withCORS(async (req) => { ... });
export const POST = withCORS(async (req) => { ... });
```

### What it stops

- A malicious page on `evil.com` calling `/api/assistant` with `fetch(..., {credentials: 'include'})` and reading the response.
- A misconfigured CDN serving a CORS-allowed response to a different origin.

### What it does NOT stop

- Same-origin XSS (use CSP — §8).
- CSRF on state-changing endpoints (use §3).

---

## 3. CSRF

**File**: [`src/lib/csrf.ts`](../src/lib/csrf.ts)

### Why

State-changing endpoints (POST/PUT/PATCH/DELETE) are vulnerable to CSRF: a
logged-in user visits `evil.com`, which posts a hidden form to
`pip-mlk.example.gov.my/api/settings`. The browser attaches the session
cookie automatically. Without a CSRF token, the server can't tell the
request came from `evil.com`.

### Implementation — Double-Submit Cookie Pattern

1. **On login / first visit**: server generates a token
   `nonce.HMAC-SHA256(secret, nonce)` and sets it as a cookie
   (`pipmlk_csrf`, `SameSite=Lax`, NOT `HttpOnly` so JS can read it).
2. **On every state-changing request**: client must send the same token in
   the `X-CSRF-Token` header, mirroring the cookie value.
3. **Server validates**:
   - Cookie value === header value (double-submit).
   - HMAC signature is valid (so an attacker can't forge a token even if they
     can plant a cookie).
   - Constant-time comparison on the HMAC via `crypto.timingSafeEqual`.

### Why double-submit (not synchronizer token)

- Stateless — no server-side session table to look up.
- Works across multiple server instances without shared state.
- Sufficient for read-mostly dashboards; high-security apps should layer on
  the synchronizer pattern (server-stored nonce per session).

### Usage

```ts
import { validateCSRFRequest, issueCSRFToken } from "@/lib/csrf";

export const POST = withCORS(async (req) => {
  if (!validateCSRFRequest(req)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // ... do the state change
  const res = NextResponse.json({ ok: true });
  issueCSRFToken(res); // rotate the token on the response
  return res;
});
```

The client reads the cookie via `document.cookie`, then sets
`X-CSRF-Token: <cookieValue>` on every POST.

### What it stops

- Cross-site form posts (the classic CSRF attack).
- Cross-site `fetch` with `credentials: 'include'` (browser blocks the
  preflight OR the cookie-header mismatch fails validation).

### What it does NOT stop

- Same-origin XSS (the script can read the cookie and mirror it).
- Vulnerabilities in subdomains that share the cookie scope (mitigate via
  `SameSite=Lax` + a strict cookie path).

---

## 4. SQL Injection Prevention

### Why

SQL injection is the #1 OWASP Top 10 risk. Even with an ORM, raw-SQL escape
hatches (`$queryRawUnsafe`, `$executeRawUnsafe`) re-introduce the
vulnerability if used with string concatenation.

### Prisma parameterises everything by default

Every standard Prisma call compiles to a parameterised query:

```ts
// SAFE — parameterised by Prisma. userId is sent as a bound parameter, never
// interpolated into the SQL string.
const user = await db.user.findUnique({
  where: { id: userId },
});

// SAFE — even with complex filters, values are bound.
const voters = await db.voter.findMany({
  where: { ethnicity: { in: ethnicities }, age: { gte: 21 } },
});
```

### Tagged-template raw SQL — SAFE

When you MUST use raw SQL (e.g. for Prisma-unfriendly aggregations), use the
**tagged template** form. Prisma parameterises the interpolated values:

```ts
// SAFE — userId becomes a bound parameter, not string interpolation.
const rows = await db.$queryRaw`SELECT * FROM User WHERE id = ${userId}`;
```

### String-call raw SQL — UNSAFE (banned by eslint)

```ts
// UNSAFE — string concatenation. userId is interpolated into the SQL.
// If userId = "1' OR '1'='1", the query becomes:
//   SELECT * FROM User WHERE id = '1' OR '1'='1'
// → returns every user.
const rows = await db.$queryRawUnsafe(`SELECT * FROM User WHERE id = '${userId}'`);

// ALSO UNSAFE — even though this LOOKS like a template, calling $queryRaw as
// a FUNCTION (with parens) bypasses the tagged-template parameterisation.
const rows = await db.$queryRaw(`SELECT * FROM User WHERE id = '${userId}'`);
```

### ESLint rule

[`eslint.config.mjs`](../eslint.config.mjs) adds a `no-restricted-syntax`
rule that errors on:

- `db.$queryRawUnsafe(...)` — always injectable, never needed.
- `db.$executeRawUnsafe(...)` — same.
- `db.$queryRaw(...)` (called as function) — should be a tagged template.
- `db.$executeRaw(...)` (called as function) — should be a tagged template.

The rule forces every raw-SQL usage into the safe tagged-template form. Any
deviation fails `bun run lint` and is caught in CI.

### What it stops

- Classic SQL injection via string concatenation.
- The "I'll just use $queryRawUnsafe this once" shortcut.

### What it does NOT stop

- Logic bugs in the query itself (e.g. returning too many rows).
- Privilege escalation if the DB user has too many grants (mitigate with
  least-privilege DB roles — not applicable to SQLite single-user).

---

## 5. XSS Prevention

### Why

XSS lets an attacker execute arbitrary JS in a victim's browser, in the
context of the trusted origin. Cookies (including CSRF + auth) become
stealable, the DOM becomes mutable, and the user's session is fully
compromised.

### React auto-escapes JSX

```tsx
// SAFE — React escapes the angle brackets, so this renders as text:
const comment = "<script>alert('xss')</script>";
return <div>{comment}</div>;
// Renders: <div>&lt;script&gt;alert('xss')&lt;/script&gt;</div>
```

### `dangerouslySetInnerHTML` is the escape hatch — and the danger

```tsx
// DANGEROUS — bypasses React's escaping. If `html` comes from user input,
// the script tag will execute.
return <div dangerouslySetInnerHTML={{ __html: html }} />;

// DANGEROUS EVEN WITH SANITISATION — sanitiser bugs are common. If you MUST
// do this, use DOMPurify and an allowlist, and add an eslint-disable comment
// so the warning forces a code review.
//
// eslint-disable-next-line react/no-danger
return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
```

### ESLint rule

`react/no-danger: "warn"` flags every `dangerouslySetInnerHTML` usage. The
reviewer must add an inline `eslint-disable-next-line` to silence it —
forcing a conscious decision each time.

### Content-Security-Policy (CSP) — defense in depth

Even if an XSS slips through, CSP stops it from doing damage by restricting
where scripts can load from and what they can do. See [`src/lib/security-headers.ts`](../src/lib/security-headers.ts):

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';   # dev only — see file
style-src 'self' 'unsafe-inline';                    # Tailwind needs inline
img-src 'self' data: blob:;
connect-src 'self' ws://localhost:3000;              # dev HMR
frame-ancestors 'none';                              # = X-Frame-Options: DENY
object-src 'none';                                   # no Flash/Java
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
block-all-mixed-content;
```

**Production hardening**: drop `'unsafe-eval'` from `script-src` once the
build is verified (Turbopack only needs it in dev). Use nonces or hashes for
inline scripts if you want to drop `'unsafe-inline'` too.

### What it stops

- Reflected XSS (URL parameters echoed into HTML) — React escapes them.
- Stored XSS (DB content rendered) — same.
- Clickjacking — `frame-ancestors 'none'` blocks iframe embedding.

### What it does NOT stop

- XSS via `dangerouslySetInnerHTML` (mitigated by `react/no-danger` rule).
- XSS via `eval()` / `Function()` in app code (avoid these).

---

## 6. SSRF Prevention

**File**: [`src/lib/ssrf-protection.ts`](../src/lib/ssrf-protection.ts)

### Why

If the server ever fetches a URL the user controls (webhook registration,
OAuth callback URL, image proxy, URL preview), an attacker can submit
`http://169.254.169.254/latest/meta-data/` (the AWS/GCP IMDS endpoint) or
`http://localhost:3000/admin` and the server will dutifully fetch the
internal resource on their behalf.

### Implementation

1. **URL parsing** — reject anything that isn't `http:` or `https:`
   (no `file://`, `gopher://`, `ftp://`, `data:`).
2. **Userinfo block** — `http://user:pass@host/` is a classic bypass.
3. **Hostname blocklist** — `localhost`, `metadata.google.internal`,
   `metadata`, etc.
4. **Literal IP check** — if the URL contains a literal IP, check it against
   the blocklist directly (no DNS).
5. **DNS resolution** — if the URL contains a hostname, resolve every A/AAAA
   record and verify ALL of them are public.
6. **Redirect pinning** — `safeFetch` defaults to `redirect: 'manual'` and
   re-validates every `Location` header before following, so a public URL
   that 302s to `http://169.254.169.254/` is rejected.

### Blocked IP ranges

| Range | Why |
|-------|-----|
| `127.0.0.0/8` | IPv4 loopback |
| `10.0.0.0/8` | RFC 1918 private |
| `172.16.0.0/12` | RFC 1918 private |
| `192.168.0.0/16` | RFC 1918 private |
| `169.254.0.0/16` | Link-local + cloud IMDS (169.254.169.254) |
| `100.64.0.0/10` | Carrier-grade NAT |
| `0.0.0.0/8` | Unspecified |
| `255.255.255.255/32` | Broadcast |
| `::1/128` | IPv6 loopback |
| `fe80::/10` | IPv6 link-local |
| `fc00::/7` | IPv6 unique-local |
| `::ffff:a.b.c.d` | IPv4-mapped IPv6 |

### Usage

```ts
import { safeFetch, isSafeURL } from "@/lib/ssrf-protection";

// Validate without fetching (e.g. webhook URL on user settings form).
const check = await isSafeURL(userInputUrl);
if (!check.ok) {
  return NextResponse.json({ error: check.reason }, { status: 400 });
}

// Fetch with automatic validation + redirect pinning.
try {
  const res = await safeFetch(userInputUrl, { method: "GET" });
} catch (err) {
  // "SSRF blocked: ..." — log and reject.
}
```

### DNS-rebinding caveat

`isSafeURL` resolves the hostname at validation time. A sophisticated
attacker can run a DNS server that returns a public IP at validation time
and an internal IP a millisecond later at fetch time (DNS rebinding). The
`safeFetch` wrapper re-validates after fetch by checking the redirect chain,
but for true protection you'd need a custom HTTP agent that pins the
resolved IP across the socket connection. That's beyond this layer — for
high-risk integrations, route through a hardened proxy (e.g. a
sandboxed headless browser).

### What it stops

- 99% of SSRF attacks (literal internal IPs, internal hostnames, IMDS).
- Redirect-based SSRF bypass.
- Malicious-scheme SSRF (`file://`, `gopher://`).

### What it does NOT stop

- DNS rebinding (mitigate with custom agent, see above).
- Timing attacks on the validation step.

---

## 7. Secrets Management

**Files**: [`src/lib/secrets.ts`](../src/lib/secrets.ts), [`src/lib/secrets-check.ts`](../src/lib/secrets-check.ts)

### Why

Hardcoded secrets in source are a top cause of breaches (especially when
repos are leaked or forked). Logging secrets is another — they end up in
log aggregators, dashboards, and Slack shared with vendors.

### Implementation

1. **Registry**: `SECRET_REGISTRY` in `secrets.ts` is the single source of
   truth for what env vars the app needs. Each entry has a name, a `required`
   flag, a `hint` (for dev-mode logs), and an optional `minLength`.
2. **`getSecret(name)`**: the ONLY way to read an env var. Throws
   `MissingSecretError` if the var is missing — failures are loud at the
   call site, not silent in a log.
3. **`validateSecrets()`**: runs at startup via `secrets-check.ts`, logs a
   redacted summary (`present: JWT_SECRET, CSRF_SECRET`, `MISSING: ...`).
   Never logs values.
4. **`redactSecrets(input)`**: utility that scans a log string for any known
   secret value and replaces it with `[REDACTED:name]`. Belt-and-suspenders
   for accidental logging.
5. **Eager boot**: `secrets-check.ts` runs the check on first import. In
   production, a failed check logs `FATAL` (the `process.exit(1)` line is
   commented out for dev convenience — uncomment for prod hardening).

### Required secrets (production)

| Name | Min length | Why |
|------|-----------|-----|
| `DATABASE_URL` | 5 | Prisma connection string |
| `JWT_SECRET` | 32 | HMAC-SHA256 signing key for JWTs |
| `CSRF_SECRET` | 32 | HMAC-SHA256 signing key for CSRF tokens |
| `NEXTAUTH_SECRET` | 32 | (If NextAuth enabled) |
| `NEXT_PUBLIC_APP_ORIGIN` | — | Production origin for CORS allowlist |

### Generate secrets

```bash
openssl rand -hex 32  # → 64 hex chars, copy to .env as JWT_SECRET
openssl rand -hex 32  # → CSRF_SECRET
```

### What it stops

- "Forgot to set JWT_SECRET in prod" → app boots without crypto capability.
- Accidental secret logging → `redactSecrets()` strips known values.
- Hardcoded secrets in source → `getSecret()` enforces env-var access.

### What it does NOT stop

- Compromised env files (mitigate with a secrets manager — Vault, AWS SM).
- Runtime memory dumps (mitigate with strict process isolation).

---

## 8. Security Headers

**File**: [`src/lib/security-headers.ts`](../src/lib/security-headers.ts), applied via [`src/middleware.ts`](../src/middleware.ts)

### Headers applied to every response

| Header | Value | Why |
|--------|-------|-----|
| `X-Content-Type-Options` | `nosniff` | Stops browsers from MIME-sniffing a response away from the declared Content-Type (e.g. interpreting a `.txt` as HTML). |
| `X-Frame-Options` | `DENY` | Blocks the page from being embedded in an iframe → clickjacking defense. (Superseded by CSP `frame-ancestors` but still respected by older browsers.) |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS auditor (deprecated in modern browsers, replaced by CSP). Harmless on old ones. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends the full referrer for same-origin, only the origin for cross-origin HTTPS, nothing for HTTPS→HTTP. Prevents leaking URL params in referrer headers. |
| `Content-Security-Policy` | (see §5) | Restricts script/style/img/conn sources — primary XSS mitigation. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (prod) | Forces HTTPS for 1 year, including subdomains. Allows submission to the HSTS preload list. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), ...` | Disables powerful APIs the app doesn't use, so a future XSS can't quietly turn on the camera. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context — defends against cross-origin window-handle attacks. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Blocks cross-origin loads of the response — prevents resource-corpus-leak attacks. |

### Application

`src/middleware.ts` runs `applySecurityHeaders(res)` on every response
before it leaves Next.js. Even 429 rate-limit rejections and 404s get the
full header set. Caddy terminates TLS in front and passes the response
through untouched.

### What it stops

- MIME-sniffing XSS (`X-Content-Type-Options`).
- Clickjacking (`X-Frame-Options` + CSP `frame-ancestors`).
- Mixed-content downgrade attacks (`upgrade-insecure-requests`).
- Plugin-based exploits (`object-src 'none'`).

### What it does NOT stop

- XSS that gets past CSP (e.g. via an allowed `unsafe-inline` script) —
  tighten CSP with nonces/hashes for production.

---

## 9. JWT — Rotation & Validation

**File**: [`src/lib/jwt.ts`](../src/lib/jwt.ts)

### Why

Long-lived tokens are a liability — if stolen, they're valid until expiry.
Short-lived access tokens limit the damage window; refresh tokens let the
client get new access tokens without re-authenticating.

### Implementation

- **Algorithm**: HMAC-SHA256 (`HS256`) using `JWT_SECRET` from env.
- **Access token**: 15-minute expiry. Sent on every API call as
  `Authorization: Bearer <token>`.
- **Refresh token**: 7-day expiry. Sent ONLY to `/api/auth/refresh` to mint
  a new access token. Never accepted for normal API authorisation.
- **Token rotation**: `rotateTokens({ sub, scope })` returns a fresh
  `{ accessToken, refreshToken, accessExpiresAt, refreshExpiresAt }`.
  Call this on login AND on every refresh. The old refresh token's `jti`
  should be recorded as "used" in the DB so it can't be replayed (token
  replay detection).
- **Constant-time signature comparison** via `crypto.timingSafeEqual` —
  prevents timing-oracle attacks that could forge signatures byte-by-byte.

### Token shape

```json
// Header
{ "alg": "HS256", "typ": "JWT" }

// Payload (access token)
{
  "sub": "user_abc",
  "iat": 1718000000,
  "exp": 1718000900,   // 15 min later
  "jti": "a1b2c3...",  // unique per token
  "typ": "access",
  "scope": ["read:voters", "write:settings"]
}

// Payload (refresh token) — same shape but "typ": "refresh", exp = +7d
```

### Usage

```ts
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  rotateTokens,
} from "@/lib/jwt";

// On login:
const pair = rotateTokens({ sub: user.id, scope: ["read:voters"] });
res.cookies.set("access_token", pair.accessToken, {
  httpOnly: true, secure: true, sameSite: "lax", maxAge: 15 * 60,
});
res.cookies.set("refresh_token", pair.refreshToken, {
  httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60,
});

// On API call:
const auth = req.headers.get("authorization");
const token = auth?.replace(/^Bearer /, "");
const result = verifyAccessToken(token ?? "");
if (!result.ok) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const { sub, scope } = result.payload;
```

### What it stops

- Stolen-token reuse beyond 15 minutes (access token).
- Stolen-refresh-token reuse beyond 7 days (refresh token).
- Timing-oracle signature forgery.

### What it does NOT stop

- Refresh-token replay within its 7-day window (mitigate with jti tracking
  in the DB — out of scope for this stateless module).
- Token theft via XSS (mitigate with `HttpOnly` cookies — never store
  tokens in `localStorage`).

---

## 10. TLS / Encryption

### In transit — HTTPS everywhere

- **Caddy terminates TLS** in front of the Next.js server (see `Caddyfile`).
  The browser sees a valid cert; Caddy proxies to `localhost:3000` over
  plain HTTP (acceptable because localhost traffic never leaves the host).
- **HSTS** (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`)
  forces browsers to use HTTPS for 1 year, even if a user types `http://`.
- **`upgrade-insecure-requests`** CSP directive tells the browser to
  rewrite any `http://` URL the page tries to load into `https://`.
- **Cloudflare** (if used in front of Caddy) provides edge TLS, DDoS
  protection, and bot mitigation. Edge → Caddy traffic should also be HTTPS
  (Cloudflare "Full SSL" mode).

### At rest — SQLite

- SQLite stores the DB as a single file on disk. There is no built-in
  encryption for the file itself.
- **Not applicable** for PIP-MLK's threat model: the DB contains only
  public voter intelligence (already published by SPR/DOSM) and no PII
  beyond what's in the public voter roll.
- **If PII is added later**: switch to SQLCipher (encrypted SQLite) or
  Postgres with `pgcrypto` for column-level encryption. Application-layer
  encryption (encrypt fields with AES-GCM before writing) is also viable
  for high-sensitivity columns.

### In transit — API calls (server → external)

- The ZAI SDK (`z-ai-web-dev-sdk`) calls `https://...` endpoints — TLS is
  enforced by the SDK.
- Any future outbound HTTP from the server MUST go through `safeFetch`
  (§6) which only permits `https:` (and `http:` for localhost dev).

### What it stops

- Network sniffing of browser↔server traffic (TLS).
- Network sniffing of server↔LLM traffic (TLS).
- Mixed-content downgrade attacks (CSP `upgrade-insecure-requests`).

### What it does NOT stop

- Disk theft of the SQLite file (no at-rest encryption — see above).
- Compromised Caddy/Cloudflare cert (mitigate with cert pinning for
  high-security clients).

---

## 11. Rate Limiting

**File**: [`src/lib/rate-limiter.ts`](../src/lib/rate-limiter.ts)

### Why

Without rate limiting, a single abusive client can:
- Exhaust the LLM budget on `/api/assistant` (each call costs real money).
- Brute-force the CSRF token (computationally infeasible, but free to try).
- Scrape every public endpoint at 10k req/s.
- Amplify a DoS via the regex/redos surface in user-supplied patterns.

### Implementation

- **Fixed-window** algorithm: counter per `(route, identifier)` bucket,
  reset every `windowSeconds`.
- **In-memory** `Map` — fine for single-instance deploys. For multi-node,
  swap for Redis (the `rateLimit(opts)` API stays the same).
- **Lazy sweep**: stale buckets deleted every 60s, so memory stays bounded.
- **Identifier resolution**: `x-forwarded-for` (first IP) → `x-real-ip` →
  `cf-connecting-ip` → `"anonymous"` fallback.

### Policies

| Route | Limit | Window | Why |
|-------|-------|--------|-----|
| `/api/*` (default) | 60 | 60s | Generous default for normal API use |
| `/api/assistant` | 10 | 60s (middleware) + 5 (route) | LLM calls are expensive |
| `/api/auth/*` | 5 | 60s | Stop credential stuffing |

### Application

`src/middleware.ts` runs `rateLimit()` on every `/api/*` request BEFORE the
route handler runs. Rejected requests get `429 Too Many Requests` with
`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset` headers so well-behaved clients can self-throttle.

### What it stops

- Brute-force / scraping / DoS at the IP level.
- LLM budget exhaustion.

### What it does NOT stop

- Distributed attacks (mitigate with Cloudflare WAF / bot mitigation).
- Authenticated abuse (a logged-in user hitting the limit under one account
  then creating another — mitigate with per-account limits in the DB).

---

## 12. Audit Checklist

Use this checklist when adding a new API route or modifying an existing one:

- [ ] Route handler is wrapped with `withCORS(handler)`.
- [ ] If POST/PUT/PATCH/DELETE: `validateCSRFRequest(req)` is called and
      rejects on missing/mismatched token.
- [ ] If route accepts a URL from the user: `isSafeURL(url)` is called
      before any `fetch()`, and `safeFetch()` is used instead of `fetch()`.
- [ ] No `db.$queryRawUnsafe(...)` or `db.$queryRaw(...)` (called as
      function). Raw SQL uses tagged-template form only.
- [ ] No `dangerouslySetInnerHTML` without an `eslint-disable-next-line`
      comment and DOMPurify sanitisation.
- [ ] No `console.log(process.env.X)` — use `getSecret(name)` for access,
      `redactSecrets()` for any log that might contain a secret value.
- [ ] If route issues auth tokens: uses `createAccessToken()` /
      `createRefreshToken()` from `@/lib/jwt`, never hand-rolled JWT.
- [ ] Rate-limit policy is appropriate (default 60/min, tighter for
      expensive routes).
- [ ] Security headers are applied (automatic via middleware, but verify
      with browser DevTools → Network → Response Headers).
- [ ] HTTPS-only in production (Caddy + HSTS).

---

## File Index

| File | Purpose |
|------|---------|
| [`src/lib/cors.ts`](../src/lib/cors.ts) | CORS allowlist + `withCORS()` HOF |
| [`src/lib/csrf.ts`](../src/lib/csrf.ts) | CSRF token gen/validate (double-submit) |
| [`src/lib/ssrf-protection.ts`](../src/lib/ssrf-protection.ts) | `isSafeURL()` + `safeFetch()` |
| [`src/lib/secrets.ts`](../src/lib/secrets.ts) | `getSecret()` + `validateSecrets()` + `redactSecrets()` |
| [`src/lib/secrets-check.ts`](../src/lib/secrets-check.ts) | Startup validation |
| [`src/lib/security-headers.ts`](../src/lib/security-headers.ts) | `getSecurityHeaders()` + `applySecurityHeaders()` |
| [`src/lib/jwt.ts`](../src/lib/jwt.ts) | JWT create/verify/rotate (HS256) |
| [`src/lib/rate-limiter.ts`](../src/lib/rate-limiter.ts) | `rateLimit()` + `getClientIdentifier()` + policies |
| [`src/middleware.ts`](../src/middleware.ts) | Next.js middleware (applies all of the above) |
| [`eslint.config.mjs`](../eslint.config.mjs) | `no-restricted-syntax` (SQL guardrails) + `react/no-danger` |

---

## References

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Prisma: Raw SQL safety](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access)
- [hstspreload.org](https://hstspreload.org/)
- [Next.js Middleware docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
