// ponytail: MLK — Pipeline provenance API. Returns the 9-gate provenance summary.
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const path = join(process.cwd(), "src", "data", "pipeline-provenance.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (err) {
    return NextResponse.json({ error: "Provenance file not found", detail: String(err) }, { status: 500 });
  }
}
