import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // ponytail: MLK — incremental cache off (Free Tier; no KV binding).
  incrementalCache: { deferred: false },
});
