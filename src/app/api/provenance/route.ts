// ponytail: MLK — Pipeline provenance API. Returns the 9-gate provenance summary.
// Workers-compatible: build-time JSON import (no runtime fs).
// Note: provenance.json lives in src/data/ (not public/data/), so we use a
// relative import path. The JSON is bundled at build time.
import { NextResponse } from "next/server";
import provenanceJson from "@/data/pipeline-provenance.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(provenanceJson, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
