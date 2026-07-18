import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  incrementalCache: { deferred: false } as any,
  proxy: {
    external: true,
  },
} as any);
