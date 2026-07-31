// ponytail: MLK — Socioeconomic API. Returns DOSM poverty / HIES / Gini.
// Workers-compatible: build-time JSON import (no runtime fs).
import { NextResponse } from "next/server";
import socioeconomicJson from "@/../public/data/socioeconomic/melaka-dosm.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(socioeconomicJson, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
