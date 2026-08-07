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

type Aggregate = (typeof DUN_AGGREGATES)[string];

function roundShare(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function aggregateP134(): Aggregate {
  const rows = Object.values(DUN_AGGREGATES);
  const totalPopulation = rows.reduce((sum, row) => sum + row.totalPopulation, 0);
  const weighted = (selector: (row: Aggregate) => number) => roundShare(
    rows.reduce((sum, row) => sum + selector(row) * row.totalPopulation, 0) / totalPopulation,
  );
  const weightedBands = (key: "ageBandShares" | "broadPopulationSegments") =>
    rows[0][key].map(({ label }) => ({
      label,
      share: weighted((row) => row[key].find((band) => band.label === label)?.share ?? 0),
    }));

  return {
    totalPopulation,
    totalRegisteredElectors: rows.reduce((sum, row) => sum + row.totalRegisteredElectors, 0),
    localityCount: rows.reduce((sum, row) => sum + row.localityCount, 0),
    dmCount: rows.reduce((sum, row) => sum + row.dmCount, 0),
    geographyMix: {
      urbanShare: weighted((row) => row.geographyMix.urbanShare),
      semiUrbanShare: weighted((row) => row.geographyMix.semiUrbanShare),
      ruralShare: weighted((row) => row.geographyMix.ruralShare),
    },
    ageBandShares: weightedBands("ageBandShares"),
    broadPopulationSegments: weightedBands("broadPopulationSegments"),
  };
}

function buildAggregateContext(level: "DUN" | "PARLIAMENT", code: string): PipAggregateContextInput | null {
  let aggregate: Aggregate | undefined;
  let parliamentCode: string;
  let constituencyCode: string;
  let constituencyName: string;

  if (level === "DUN") {
    const dunCode = code.padStart(2, "0");
    const parliament = PARLIAMENTS.find((candidate) => candidate.dunCodes.includes(dunCode));
    parliamentCode = parliament?.code ?? "";
    aggregate = parliamentCode === "134" ? DUN_AGGREGATES[dunCode] : undefined;
    constituencyCode = `N${dunCode}`;
    constituencyName = getDunName(parliamentCode, dunCode);
  } else {
    parliamentCode = code;
    aggregate = parliamentCode === "134" ? aggregateP134() : undefined;
    constituencyCode = `P${parliamentCode}`;
    constituencyName = PARLIAMENTS.find((candidate) => candidate.code === parliamentCode)?.name ?? constituencyCode;
  }

  if (!aggregate) return null;
  return {
    schema: "pip.constituency-aggregate-context.v1",
    status: "ACTIVE",
    constituency: {
      level,
      code: constituencyCode,
      name: constituencyName,
      stateCode: "04",
      stateName: "Melaka",
    },
    populationContext: aggregate,
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
  const level = (searchParams.get("level") || "DUN").toUpperCase();
  if (level !== "DUN" && level !== "PARLIAMENT") {
    return NextResponse.json({ error: "level must be DUN or PARLIAMENT", code: "BAD_REQUEST" }, { status: 400 });
  }

  const rawCode = searchParams.get("code") || (level === "DUN" ? "01" : "134");
  const code = rawCode.toUpperCase().replace(level === "DUN" ? /^N/ : /^P/, "");
  if (!(level === "DUN" ? /^\d{1,2}$/ : /^\d{3}$/).test(code)) {
    return NextResponse.json({ error: `Invalid ${level} code`, code: "BAD_REQUEST" }, { status: 400 });
  }

  if (level === "DUN" && searchParams.has("parliamentCode")) {
    const requestedParliament = searchParams.get("parliamentCode")!.toUpperCase().replace(/^P/, "");
    const actualParliament = PARLIAMENTS.find((candidate) => candidate.dunCodes.includes(code.padStart(2, "0")))?.code;
    if (requestedParliament !== actualParliament) {
      return NextResponse.json({ error: `DUN N${code.padStart(2, "0")} does not belong to P${requestedParliament}`, code: "GEOGRAPHY_MISMATCH" }, { status: 400 });
    }
  }

  const context = buildAggregateContext(level, code);
  if (!context) {
    return NextResponse.json({
      error: `No verified aggregate context available for ${level} ${rawCode}.`,
      detail: "Only P134 / N01–N05 currently have verified aggregate demographics. P135–P139 / N06–N28 remain unavailable until an approved aggregate source is loaded.",
      available: { parliaments: ["134"], duns: ["01", "02", "03", "04", "05"] },
    }, { status: 404 });
  }

  const validation = validatePipAggregateContext(context);
  if (!validation.valid) {
    return NextResponse.json({
      error: "Internal aggregate-context validation failed",
      status: validation.status,
      failures: validation.failures,
    }, { status: 500 });
  }

  return NextResponse.json({
    ...context,
    _validation: { valid: true, status: validation.status, checkedAt: new Date().toISOString() },
  });
});

export async function OPTIONS(req: NextRequest) {
  const { handlePreflight } = await import("@/lib/cors");
  return handlePreflight(req) ?? new NextResponse(null, { status: 403 });
}
