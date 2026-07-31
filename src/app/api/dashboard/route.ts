// PIP-MLK Dashboard API route — assembled dashboard summary.
// Workers-compatible: build-time JSON imports (no runtime fs).
import { NextResponse } from "next/server";
import overviewJson from "@/../public/data/p134/dashboard-overview.json";
import electionsJson from "@/../public/data/elections/melaka-elections.json";
import dptJson from "@/../public/data/dpt/spr-dpt-pameran-summary.json";
import socioeconomicJson from "@/../public/data/socioeconomic/melaka-dosm.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      overview: overviewJson,
      elections: electionsJson,
      dpt: dptJson,
      socioeconomic: socioeconomicJson,
      cachedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  } catch (err) {
    return NextResponse.json(
      { error: "Dashboard data unavailable", detail: String(err) },
      { status: 500 },
    );
  }
}
