// PIP-MLK S2D Intelligence API — Phase 2 ported engine routes.
//
// Exposes the ported S2D intelligence modules via Next.js API routes.
// These endpoints provide the same data contracts as the S2D-360 engine's
// src/integration/pip360/api/ but run natively in PIP-MLK's Next.js runtime.
//
// Endpoints:
//   GET  /api/s2d/intelligence/                   → API info
//   GET  /api/s2d/intelligence/sentiment-snapshots → Daily sentiment snapshots
//   GET  /api/s2d/intelligence/change-points      → Change-point detection results
//   GET  /api/s2d/intelligence/local-profiles     → Local signal profiles
//   GET  /api/s2d/intelligence/daily-brief         → Daily Intelligence Brief
//   POST /api/s2d/intelligence/validate-context   → PIP aggregate context validation

import { NextRequest, NextResponse } from "next/server";
import { withCORS } from "@/lib/cors";
import { buildDailySentimentSnapshot, type SignalRecord } from "@/lib/s2d-engine/sentiment-snapshot";
import { detectChangePoints, type ChangePointInput } from "@/lib/s2d-engine/change-point-detector";
import { buildLocalSignalProfiles, type LocalSignalRecord } from "@/lib/s2d-engine/local-signal-profile";
import { buildS2dDailyIntelligenceBrief, validateS2dDailyIntelligenceBrief, buildDailyBriefMarkdown, type BriefInput } from "@/lib/s2d-engine/daily-intelligence-brief";
import { validatePipAggregateContext } from "@/lib/s2d-engine/pip-aggregate-context-adapter";

// Sample signal data for demonstration (would come from Apify scraper in production)
const SAMPLE_SIGNALS: SignalRecord[] = [
  {
    snapshotId: "sig-001",
    locality: { stateCode: "04", stateName: "Melaka", parliamentCode: "134", parliamentName: "Masjid Tanah", dunCode: "05", dunName: "Taboh Naning", localityName: "Taboh Naning" },
    politicalEntity: "BN",
    issue: "Healthcare funding",
    platform: "TikTok",
    sourceType: "SOCIAL_MEDIA",
    language: "ms",
    sentimentLabel: "Negative",
    engagementScore: 78,
    velocityScore: 65,
    persistenceScore: 82,
    crossPlatformSpread: 3,
    evidenceConfidence: 0.85,
    acceptedEvidence: true,
    publicSource: true,
    provenanceValid: true,
    humanReviewed: true,
    reviewStatus: "HUMAN_REVIEWED",
    snapshotDate: "2026-07-20",
  },
  {
    snapshotId: "sig-002",
    locality: { stateCode: "04", stateName: "Melaka", parliamentCode: "138", parliamentName: "Kota Melaka", dunCode: "19", dunName: "Kesidang", localityName: "Kesidang" },
    politicalEntity: "PH",
    issue: "Road infrastructure",
    platform: "Facebook",
    sourceType: "SOCIAL_MEDIA",
    language: "ms",
    sentimentLabel: "Positive",
    engagementScore: 55,
    velocityScore: 40,
    persistenceScore: 30,
    crossPlatformSpread: 1,
    evidenceConfidence: 0.72,
    acceptedEvidence: true,
    publicSource: true,
    provenanceValid: true,
    humanReviewed: true,
    reviewStatus: "HUMAN_REVIEWED",
    snapshotDate: "2026-07-20",
  },
  {
    snapshotId: "sig-003",
    locality: { stateCode: "04", stateName: "Melaka", parliamentCode: "139", parliamentName: "Jasin", dunCode: "27", dunName: "Merlimau", localityName: "Merlimau" },
    politicalEntity: "PN",
    issue: "Coastal development",
    platform: "Threads",
    sourceType: "SOCIAL_MEDIA",
    language: "en",
    sentimentLabel: "Neutral",
    engagementScore: 30,
    velocityScore: 25,
    persistenceScore: 20,
    crossPlatformSpread: 2,
    evidenceConfidence: 0.68,
    acceptedEvidence: true,
    publicSource: true,
    provenanceValid: true,
    humanReviewed: true,
    reviewStatus: "HUMAN_REVIEWED",
    snapshotDate: "2026-07-20",
  },
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const path = pathname.replace("/api/s2d/intelligence", "");

  if (path === "" || path === "/") {
    return withCORS(() => NextResponse.json({
      endpoint: "/api/s2d/intelligence",
      description: "S2D Intelligence API — ported engine (Phase 3)",
      routes: [
        "GET /sentiment-snapshots — Daily sentiment snapshots",
        "GET /change-points — Change-point detection results",
        "GET /local-profiles — Local signal profiles",
        "GET /daily-brief — Daily Intelligence Brief",
        "GET /signals — Signal records (sanitised public signals)",
        "GET /narratives — Narrative clusters",
        "GET /forecasts — Forecast records (24-72h outlook)",
        "GET /recommendations — Recommendation cases",
        "POST /validate-context — PIP aggregate context validation",
      ],
      engineVersion: "v1.0.0 (ported)",
      governance: { aggregatePublicSignalsOnly: true, humanReviewRequired: true, pipIntegration: false },
    }))(req, {} as never);
  }

  let response: NextResponse;

  if (path === "/sentiment-snapshots") {
    const snapshots = buildDailySentimentSnapshot({
      reportDate: new Date().toISOString().slice(0, 10),
      records: SAMPLE_SIGNALS,
      totalEligibleForDate: SAMPLE_SIGNALS.length,
      previousDayTotalRecords: 2,
    });
    response = NextResponse.json({ snapshots, count: snapshots.length });
  } else if (path === "/change-points") {
    const inputs: ChangePointInput[] = [
      {
        narrative: "Healthcare funding narrative",
        currentPeriod: { startDate: "2026-07-20", endDate: "2026-07-20", recordCount: 5, sentimentScore: 0.3 },
        previousPeriod: { startDate: "2026-07-19", endDate: "2026-07-19", recordCount: 2, sentimentScore: 0.1 },
        locality: "Taboh Naning",
      },
      {
        narrative: "Road infrastructure",
        currentPeriod: { startDate: "2026-07-20", endDate: "2026-07-20", recordCount: 3, sentimentScore: 0.6 },
        previousPeriod: { startDate: "2026-07-19", endDate: "2026-07-19", recordCount: 3, sentimentScore: 0.5 },
        locality: "Kesidang",
      },
    ];
    const changePoints = detectChangePoints(inputs);
    response = NextResponse.json({ changePoints, count: changePoints.length });
  } else if (path === "/local-profiles") {
    const profiles = buildLocalSignalProfiles(SAMPLE_SIGNALS as unknown as LocalSignalRecord[]);
    response = NextResponse.json({ profiles, count: profiles.length });
  } else if (path === "/daily-brief") {
    const briefInput: BriefInput = {
      reportDate: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      acceptedRecords: SAMPLE_SIGNALS as unknown as BriefInput["acceptedRecords"],
      previousAcceptedRecords: [],
      changePoints: [{ narrative: "Healthcare funding narrative surging in Taboh Naning", type: "SURGE", severity: 75, locality: "Taboh Naning" }],
      diagnosticCases: [{ title: "Healthcare sentiment crisis — Taboh Naning", severity: "HIGH", narrative: "Negative sentiment increased 150% in 24h around healthcare funding allegations." }],
      forecast: { outlook24h: "Signal volume projected to reach 8-12.", outlook72h: "If untreated, narrative may spread.", confidence: "MEDIUM (65%)" },
      recommendations: [{ title: "Draft clarification on healthcare funding", justification: "Evidence: RM 2.3M allocated 2025.", riskOfActing: "LOW", riskOfNotActing: "HIGH", approvalLevel: "YB", monitoringPeriod: "48h" }],
    };
    const brief = buildS2dDailyIntelligenceBrief(briefInput);
    const validation = validateS2dDailyIntelligenceBrief(brief);
    const markdown = buildDailyBriefMarkdown(brief);
    response = NextResponse.json({ brief, validation, markdown });
  } else if (path === "/signals") {
    // Sanitised public signal records — no @handles, no URLs with account names
    const signals = SAMPLE_SIGNALS.map((s) => ({
      signalId: s.snapshotId,
      date: s.snapshotDate,
      locality: s.locality,
      politicalEntity: s.politicalEntity,
      issue: s.issue,
      platform: s.platform,
      sentimentLabel: s.sentimentLabel,
      engagementScore: s.engagementScore,
      velocityScore: s.velocityScore,
      persistenceScore: s.persistenceScore,
      crossPlatformSpread: s.crossPlatformSpread,
      evidenceConfidence: s.evidenceConfidence,
      acceptedEvidence: s.acceptedEvidence,
      humanReviewed: s.humanReviewed,
    }));
    response = NextResponse.json({ signals, count: signals.length });
  } else if (path === "/narratives") {
    // Narrative clusters — aggregated themes across signals
    const narratives = [
      { narrativeId: "nar-001", title: "Healthcare funding narrative", locality: "Taboh Naning", signalCount: 5, sentiment: "Negative", severity: "HIGH", status: "ESCALATING" },
      { narrativeId: "nar-002", title: "Road infrastructure", locality: "Kesidang", signalCount: 3, sentiment: "Positive", severity: "LOW", status: "STABLE" },
      { narrativeId: "nar-003", title: "Coastal development", locality: "Merlimau", signalCount: 2, sentiment: "Neutral", severity: "LOW", status: "STABLE" },
    ];
    response = NextResponse.json({ narratives, count: narratives.length });
  } else if (path === "/forecasts") {
    // Forecast records — 24-72h outlook with confidence intervals
    const forecasts = [
      {
        forecastId: "fc-001",
        narrative: "Healthcare funding narrative",
        locality: "Taboh Naning",
        horizon24h: { projectedSignalVolume: 8, lowerBound: 6, upperBound: 12, confidence: 0.78 },
        horizon72h: { projectedSignalVolume: 15, lowerBound: 10, upperBound: 22, confidence: 0.65 },
        trend: "RISING",
        confidence: "MEDIUM",
      },
      {
        forecastId: "fc-002",
        narrative: "Road infrastructure",
        locality: "Kesidang",
        horizon24h: { projectedSignalVolume: 3, lowerBound: 2, upperBound: 5, confidence: 0.82 },
        horizon72h: { projectedSignalVolume: 4, lowerBound: 2, upperBound: 7, confidence: 0.75 },
        trend: "STABLE",
        confidence: "HIGH",
      },
    ];
    response = NextResponse.json({ forecasts, count: forecasts.length });
  } else if (path === "/recommendations") {
    // Recommendation cases — White/Grey/Black playbook
    const recommendations = [
      {
        recommendationId: "rec-001",
        title: "Draft clarification on healthcare funding allocation",
        narrative: "Healthcare funding narrative",
        locality: "Taboh Naning",
        type: "WHITE",
        justification: "Evidence: RM 2.3M allocated 2025. Negative sentiment based on misinformation.",
        riskOfActing: "LOW — factual response based on verified allocation data.",
        riskOfNotActing: "HIGH — narrative may escalate and spread to adjacent DUNs.",
        approvalLevel: "YB",
        monitoringPeriod: "48h",
        status: "PENDING",
      },
      {
        recommendationId: "rec-002",
        title: "Amplify positive road infrastructure completion",
        narrative: "Road infrastructure",
        locality: "Kesidang",
        type: "WHITE",
        justification: "Positive sentiment presents amplification opportunity for verified information.",
        riskOfActing: "LOW",
        riskOfNotActing: "MEDIUM — opportunity window may close.",
        approvalLevel: "COMMS_TEAM",
        monitoringPeriod: "24h",
        status: "PENDING",
      },
    ];
    response = NextResponse.json({ recommendations, count: recommendations.length });
  } else {
    response = NextResponse.json({ error: "Unknown route", path }, { status: 404 });
  }

  return withCORS(() => response)(req, {} as never);
}

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const path = pathname.replace("/api/s2d/intelligence", "");

  if (path === "/validate-context") {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return withCORS(() => NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }))(req, {} as never);
    }

    const result = validatePipAggregateContext(body);
    const response = NextResponse.json({
      valid: result.valid,
      status: result.status,
      failures: result.failures,
      rejectedFields: result.rejectedFields,
      message: result.valid
        ? "Context payload ACCEPTED — aggregate-only data verified."
        : result.status === "REJECTED_INDIVIDUAL_DATA"
          ? "REJECTED: Individual-level data detected. No individual voter data may enter S2D."
          : "REJECTED: Schema mismatch.",
    });
    return withCORS(() => response)(req, {} as never);
  }

  return withCORS(() => NextResponse.json({ error: "Unknown POST route", path }, { status: 404 }))(req, {} as never);
}
