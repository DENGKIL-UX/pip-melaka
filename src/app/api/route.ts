// src/app/api/route.ts
// PIP-MLK root API route — health check + metadata.
// Security-01: wrapped with withCORS for origin allowlist enforcement.

import { NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";

export const GET = withCORS(async () => {
  return NextResponse.json({
    message: "Hello, world!",
    service: "PIP-MLK API",
    docs: "/docs/RESEARCH-SECURITY.md",
  });
});
