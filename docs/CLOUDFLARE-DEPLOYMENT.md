# PIP-MLK Cloudflare Deployment Guide

> Truth Above All. PIP-MLK runs entirely on Cloudflare Free Tier — no credit card required.

## Build Configuration (Cloudflare Dashboard)

| Setting | Value |
|---------|-------|
| **Build command** | `npx @opennextjs/cloudflare build` |
| **Deploy command** | `npx @opennextjs/cloudflare deploy` |
| **Version command** | `npx wrangler versions upload` |
| **Root directory** | `/` |
| **Production branch** | `main` |
| **Builds for non-production branches** | Enabled |

## Files

### `wrangler.jsonc`
```jsonc
{
  "name": "pip-mlk",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".open-next/worker.js",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

### `open-next.config.ts`
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({
  incrementalCache: { deferred: false },
});
```

### `next.config.ts`
```ts
const config: NextConfig = {
  images: { unoptimized: true },  // Workers can't optimise images
  // NO output: 'standalone' — OpenNext handles bundling
};
```

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run build:cf` | Build for Cloudflare Workers (OpenNext) |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run deploy:version` | Upload a new version (wrangler versions upload) |
| `npm run preview:cf` | Build + run locally via wrangler dev |
| `npm run verify:no-pdpa-files` | PDPA compliance check (no voter data shipped) |

## Setup Path A — Git-Connected (Recommended)

1. Go to Cloudflare Dashboard → Workers & Pages → Create → Connect to Git
2. Select the `pip-melaka` repository
3. Set build command: `npx @opennextjs/cloudflare build`
4. Set deploy command: `npx @opennextjs/cloudflare deploy`
5. Set root directory: `/`
6. Set production branch: `main`
7. Enable builds for non-production branches
8. Set secrets:
   ```bash
   npx wrangler secret put PIP_VOTER_HASH_SALT
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put CSRF_SECRET
   ```
9. Trigger first deploy: push to `main`

## Setup Path B — CLI Deploy

```bash
git clone https://github.com/DENGKIL-UX/pip-melaka.git
cd pip-melaka
bun install
npx @opennextjs/cloudflare build
npx wrangler login              # one-time browser auth
npx wrangler secret put PIP_VOTER_HASH_SALT   # paste rotated salt
npx @opennextjs/cloudflare deploy
```

## Critical Rules

1. **`compatibility_flags: ["nodejs_compat"]`** — REQUIRED for Next.js 16 on Workers
2. **NO `runtime = "edge"`** in API routes — use `runtime = "nodejs"` or omit
3. **NO `/api/engine` route** — engine is build-time only (404 by design)
4. **NO PDPA files** — `voter-intelligence.jsonl`, `voter-cleaned.*`, `cleansing-audit.json` must NOT be in `public/`
5. **`images: { unoptimized: true }`** — Workers can't optimise images
6. **NO `output: "standalone"`** — OpenNext handles bundling
7. **Worker bundle ≤ 3 MB** — static JSONLs in `/public/data/` don't count toward this limit

## Free Tier Limits

| Resource | Free Tier | PIP-MLK Expected | Headroom |
|----------|-----------|------------------|----------|
| Worker requests | 100k/day | <1k/day | 99% |
| Worker CPU time | 10ms/req | <100ms/req | OK |
| Pages builds | 500/month | <50/month | 90% |
| Worker bundle | 3 MB (gzip) | ~1.5 MB | 50% |
| Pages deploy size | unlimited | ~3 MB | OK |

**Cost: $0/month**

## Troubleshooting

### `runtime = "edge"` error (500 in production)
Remove `export const runtime = "edge"` from all API routes. Use `runtime = "nodejs"` or omit entirely. The `nodejs_compat` flag in `wrangler.jsonc` handles Node.js compatibility.

### Worker bundle exceeds 3 MB
Tree-shake heavy deps. Lazy-load Three.js, d3-force, Leaflet via `next/dynamic`. Static JSONLs in `/public/data/` don't count toward the limit.

### PDPA verification fails
Run `npm run verify:no-pdpa-files` locally. Remove any `voter-intelligence.jsonl`, `voter-cleaned.*`, or `cleansing-audit.json` from `public/`.

### Cold starts
Cloudflare Workers have minimal cold starts (<50ms). OpenNext caches the Worker bundle. For even faster starts, ensure lazy-loaded modules are code-split.
