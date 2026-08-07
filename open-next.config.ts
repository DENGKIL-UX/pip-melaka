import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig({
  incrementalCache: { deferred: false } as any,
} as any);

export default {
  ...cloudflareConfig,
  // bun.lock is retained for CI reproducibility, but OpenNext must also build
  // in standard Node images where a global Bun binary is not installed.
  buildCommand: "npm run build",
} as any;
