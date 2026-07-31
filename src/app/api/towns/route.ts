// ponytail: MLK — Towns API. Returns top ~50 Melaka towns.
// Workers-compatible: build-time JSON import (no runtime fs).
import { NextResponse } from "next/server";
import townsJson from "@/../public/data/mlk-towns.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(townsJson, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
