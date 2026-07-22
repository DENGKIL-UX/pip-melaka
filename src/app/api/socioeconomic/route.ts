// ponytail: MLK — Socioeconomic API. Returns DOSM poverty / HIES / Gini for state + 3 districts.
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const path = join(process.cwd(), "public", "data", "socioeconomic", "melaka-dosm.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=86400" } });
  } catch (err) {
    return NextResponse.json({ error: "Socioeconomic data unavailable", detail: String(err) }, { status: 500 });
  }
}
