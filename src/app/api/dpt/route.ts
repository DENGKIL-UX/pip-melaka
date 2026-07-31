// ponytail: MLK — DPT Pameran summary API. Pre-computed at build time.
// Workers-compatible: build-time JSON import (no runtime fs).
import { NextResponse } from "next/server";
import dptJson from "@/../public/data/dpt/spr-dpt-pameran-summary.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(dptJson, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
