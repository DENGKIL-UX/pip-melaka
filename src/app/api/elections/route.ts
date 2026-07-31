// ponytail: MLK — Elections API. Returns GE14/PRN15/GE15 results from ElectionData.my.
// Workers-compatible: build-time JSON import (no runtime fs).
import { NextResponse } from "next/server";
import electionsJson from "@/../public/data/elections/melaka-elections.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(electionsJson, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
