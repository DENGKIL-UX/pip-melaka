import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  incrementalCache: { deferred: false } as any,
} as any);
