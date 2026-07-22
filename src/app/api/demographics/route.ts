// ponytail: MLK — Demographics API. Returns aggregate intelligence records.
// Supports ?parliament=P134&level=DUN query params.
import { NextRequest, NextResponse } from "next/server";
import { fetchIntelligence, fetchOverview, fetchAllOverviews } from "@/lib/pip-engine-adapter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parliament = sp.get("parliament") || "134";
  const level = (sp.get("level") || "PARLIAMENT").toUpperCase() as
    | "STATE" | "PARLIAMENT" | "DUN" | "DM" | "LOCALITY";

  if (sp.get("overview") === "all") {
    const overviews = await fetchAllOverviews();
    return NextResponse.json({ overviews });
  }
  if (sp.get("overview") === "1") {
    const o = await fetchOverview(parliament);
    if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(o);
  }
  const records = await fetchIntelligence(parliament, level);
  return NextResponse.json({ parliament, level, count: records.length, records });
}
