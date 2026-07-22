// ponytail: MLK — Insights API (POST-only). Returns graph insights via LLM.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nodes = Array.isArray(body?.nodes) ? body.nodes : [];
    const edges = Array.isArray(body?.edges) ? body.edges : [];
    if (nodes.length === 0) {
      return NextResponse.json({ error: "Missing 'nodes' field" }, { status: 400 });
    }
    // ponytail: MLK — structural-only insights, no LLM call required (no sentiment — DG_NO_LIVE_SENTIMENT).
    const partyCounts: Record<string, number> = {};
    for (const n of nodes) {
      const party = (n as { party?: string }).party || "OTH";
      partyCounts[party] = (partyCounts[party] || 0) + 1;
    }
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const density = totalNodes > 1 ? (totalEdges / (totalNodes * (totalNodes - 1) / 2)) : 0;
    return NextResponse.json({
      insights: [
        `Graph has ${totalNodes} nodes and ${totalEdges} edges (density: ${density.toFixed(3)}).`,
        `Party distribution: ${Object.entries(partyCounts).map(([k, v]) => `${k}=${v}`).join(", ")}.`,
        `Structural-only analysis — no sentiment weighting (DG_NO_LIVE_SENTIMENT).`,
      ],
      party_counts: partyCounts,
      density,
      evidence_tier: "Indicative",
    });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", detail: String(err) }, { status: 400 });
  }
}
