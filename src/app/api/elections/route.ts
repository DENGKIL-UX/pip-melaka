// ponytail: MLK — Elections API. Returns GE14/PRN15/GE15 results from ElectionData.my.
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const path = join(process.cwd(), "public", "data", "elections", "melaka-elections.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=86400" } });
  } catch (err) {
    return NextResponse.json({ error: "Elections data unavailable", detail: String(err) }, { status: 500 });
  }
}
