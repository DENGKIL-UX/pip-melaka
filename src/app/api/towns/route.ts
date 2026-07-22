// ponytail: MLK — Towns API. Returns top ~50 Melaka towns with lat/lng + district + parliament + DUN.
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const path = join(process.cwd(), "public", "data", "mlk-towns.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=86400" } });
  } catch (err) {
    return NextResponse.json({ error: "Towns data unavailable", detail: String(err) }, { status: 500 });
  }
}
