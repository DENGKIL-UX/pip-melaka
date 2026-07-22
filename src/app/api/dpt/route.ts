// ponytail: MLK — DPT Pameran summary API. Pre-computed at build time.
// Returns the 5-month × 6-parliament DPT summary. ~6ms response.
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const path = join(process.cwd(), "public", "data", "dpt", "spr-dpt-pameran-summary.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    return NextResponse.json({ error: "DPT summary unavailable", detail: String(err) }, { status: 500 });
  }
}
