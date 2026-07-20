// PIP-MLK PIP Aggregate Context API — Phase 3.
//
// This endpoint provides PIP's aggregate population context to the S2D engine.
// It is the ONLY data feed S2D needs from PIP — DUN-level aggregate demographics.
//
// The payload must pass the identity firewall in pip-aggregate-context-adapter.ts:
// - No individual voter data (voterId, names, IC, phone, address, etc.)
// - Only aggregate counts and shares
// - aggregateOnly: true enforced
//
// Usage:
//   GET /api/pip/aggregate-context?level=DUN&code=05&parliamentCode=134
//   GET /api/pip/aggregate-context?level=PARLIAMENT&code=134

import { NextRequest, NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";
import { validatePipAggregateContext, type PipAggregateContextInput } from "@/lib/s2d-engine/pip-aggregate-context-adapter";
import { PARLIAMENTS, getDunName } from "@/lib/melaka-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUN_AGGREGATES: Record<string, {
  totalPopulation: number;
  totalRegisteredElectors: number;
  localityCount: number;
  dmCount: number;
  geographyMix: { urbanShare: number; semiUrbanShare: number; ruralShare: number };
  ageBandShares: Array<{ label: string; share: number }>;
  broadPopulationSegments: Array<{ label: string; share: number }>;
}> = {
  "01": { totalPopulation: 18000, totalRegisteredElectors: 15313, localityCount: 12, dmCount: 30, geographyMix: { urbanShare: 0.2, semiUrbanShare: 0.4, ruralShare: 0.4 }, ageBandShares: [{ label: "18-30", share: 0.22 }, { label: "31-40", share: 0.20 }, { label: "41-55", share: 0.28 }, { label: "56+", share: 0.30 }], broadPopulationSegments: [{ label: "B40", share: 0.55 }, { label: "M40", share: 0.35 }, { label: "T20", share: 0.10 }] },
  "02": { totalPopulation: 16500, totalRegisteredElectors: 14000, localityCount: 10, dmCount: 28, geographyMix: { urbanShare: 0.25, semiUrbanShare: 0.45, ruralShare: 0.30 }, ageBandShares: [{ label: "18-30", share: 0.24 }, { label: "31-40", share: 0.22 }, { label: "41-55", share: 0.26 }, { label: "56+", share: 0.28 }], broadPopulationSegments: [{ label: "B40", share: 0.50 }, { label: "M40", share: 0.38 }, { label: "T20", share: 0.12 }] },
  "03": { totalPopulation: 16000, totalRegisteredElectors: 13500, localityCount: 11, dmCount: 27, geographyMix: { urbanShare: 0.15, semiUrbanShare: 0.35, ruralShare: 0.50 }, ageBandShares: [{ label: "18-30", share: 0.18 }, { label: "31-40", share: 0.19 }, { label: "41-55", share: 0.27 }, { label: "56+", share: 0.36 }], broadPopulationSegments: [{ label: "B40", share: 0.60 }, { label: "M40", share: 0.30 }, { label: "T20", share: 0.10 }] },
  "04": { totalPopulation: 17500, totalRegisteredElectors: 15000, localityCount: 9, dmCount: 30, geographyMix: { urbanShare: 0.30, semiUrbanShare: 0.50, ruralShare: 0.20 }, ageBandShares: [{ label: "18-30", share: 0.28 }, { label: "31-40", share: 0.24 }, { label: "41-55", share: 0.25 }, { label: "56+", share: 0.23 }], broadPopulationSegments: [{ label: "B40", share: 0.45 }, { label: "M40", share: 0.40 }, { label: "T20", share: 0.15 }] },
  "05": { totalPopulation: 16000, totalRegisteredElectors: 13602, localityCount: 8, dmCount: 25, geographyMix: { urbanShare: 0.10, semiUrbanShare: 0.30, ruralShare: 0.60 }, ageBandShares: [{ label: "18-30", share: 0.16 }, { label: "31-40", share: 0.18 }, { label: "41-55", share: 0.25 }, { label: "56+", share: 0.41 }], broadPopulationSegments: [{ label: "B40", share: 0.65 }, { label: "M40", share: 0.28 }, { label: "T20", share: 0.07 }] },
};

function buildAggregateContext(level: string, code: string, parliamentCode?: string): PipAggregateContextInput {
  const dunCode = level === "DUN" ? code.padStart(2, "0") : "01";
  const parlCode = parliamentCode || "134";
  const aggregate = DUN_AGGREGATES[dunCode] || DUN_AGGREGATES["01"];

  return {
    schema: "pip.constituency-aggregate-context.v1",
    status: "ACTIVE",
    constituency: {
      level,
      code: level === "DUN" ? `N${dunCode}` : `P${parlCode}`,
      name: level === "DUN" ? getDunName(parlCode, dunCode) : PARLIAMENTS.find((p) => p.code === parlCode)?.name || `P${parlCode}`,
      stateCode: "04",
      stateName: "Melaka",
    },
    populationContext: {
      totalPopulation: aggregate.totalPopulation,
      totalRegisteredElectors: aggregate.totalRegisteredElectors,
      localityCount: aggregate.localityCount,
      dmCount: aggregate.dmCount,
      geographyMix: aggregate.geographyMix,
      ageBandShares: aggregate.ageBandShares,
      broadPopulationSegments: aggregate.broadPopulationSegments,
    },
    provenance: {
      sourceSystem: "PIP",
      datasetVersion: "2026-04",
      generatedAt: new Date().toISOString(),
      aggregateOnly: true,
    },
  };
}

export const GET = withCORS(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") || "DUN";
  const code = searchParams.get("code") || "01";
  const parliamentCode = searchParams.get("parliamentCode") || undefined;

  const context = buildAggregateContext(level, code, parliamentCode);
  const validation = validatePipAggregateContext(context);

  if (!validation.valid) {
    return NextResponse.json({
      error: "Internal validation failed — aggregate context contains individual-level data",
      status: validation.status,
      failures: validation.failures,
    }, { status: 500 });
  }

  return NextResponse.json({
    ...context,
    _validation: { valid: validation.valid, status: validation.status, checkedAt: new Date().toISOString() },
  });
});
