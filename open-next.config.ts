import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // ponytail: MLK — incremental cache off (Free Tier; no KV binding).
  incrementalCache: { deferred: false } as any,
  // Middleware must be treated as external Edge function by OpenNext.
  middleware: {
    external: true,
  },
} as any);
