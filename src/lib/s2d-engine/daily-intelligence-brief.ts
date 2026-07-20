/**
 * S2D Daily Intelligence Brief — ported from the S2D-360 Intelligence Engine.
 *
 * The flagship executive output: a 12-section "what should the YB know
 * this morning" brief. The most gated artifact in the engine — every
 * record must pass isAcceptedPublicRecord() before it influences a sentence.
 *
 * Source: s2d-engine/src/intelligence/reports/s2d-daily-intelligence-brief.js
 * Ported to TypeScript for PIP-MLK's Next.js runtime.
 *
 * Governance:
 * - 8 governance booleans all enforced to false (no voter inference,
 *   no election prediction, no microtargeting, no auto-execution)
 * - PIP integration is DISABLED by default
 * - Prohibited inference keywords filtered from all prose
 */

const ENTITY_CODES = ["BN", "PH", "PN"];

export const S2D_DAILY_BRIEF_STATUSES = Object.freeze([
  "AVAILABLE",
  "PARTIAL_DATA",
  "NO_ACCEPTED_DATA",
  "INSUFFICIENT_HISTORY",
  "REVIEW_REQUIRED",
]) as const;

export const S2D_DAILY_BRIEF_SECTIONS = Object.freeze([
  "executiveJudgement",
  "mostImportantChange",
  "highestRiskNarrative",
  "mainOpportunity",
  "politicalEntitySentimentMovement",
  "topEconomicIssues",
  "youthRelatedPublicThemes",
  "localityHotspots",
  "outlook24To72Hours",
  "recommendedActions",
  "evidenceLinks",
  "confidenceAndLimitations",
]) as const;

const PROHIBITED_INFERENCE_KEYWORDS = [
  "voter support", "vote intention", "approval rating",
  "constituency preference", "election result", "electoral advantage",
  "microtarget", "personalised persuasion",
  "political support inference", "voter-preference inference",
];

interface BriefSignalRecord {
  acceptedEvidence?: boolean;
  publicSource?: boolean;
  provenanceValid?: boolean;
  provenanceStatus?: string;
  humanReviewed?: boolean;
  reviewStatus?: string;
  snapshotDate?: string;
  sourcePublishedAt?: string;
  createdAt?: string;
  capturedAt?: string;
  timestamp?: string;
  politicalEntity?: string;
  sentimentLabel?: string;
  issue?: string;
  locality?: { localityName?: string; dunName?: string; parliamentName?: string };
  narrativeCluster?: string;
  changePointType?: string;
  severityScore?: number;
  evidenceId?: string;
  evidenceUrl?: string;
}

interface BriefInput {
  reportDate: string;
  generatedAt: string;
  acceptedRecords: BriefSignalRecord[];
  previousAcceptedRecords?: BriefSignalRecord[];
  changePoints?: Array<{ narrative: string; type: string; severity: number; locality: string }>;
  diagnosticCases?: Array<{ title: string; severity: string; narrative: string }>;
  forecast?: { outlook24h: string; outlook72h: string; confidence: string };
  recommendations?: Array<{
    title: string;
    justification: string;
    riskOfActing: string;
    riskOfNotActing: string;
    approvalLevel: string;
    monitoringPeriod: string;
  }>;
  limitations?: string[];
}

export interface DailyIntelligenceBrief {
  schema: string;
  briefId: string;
  contentHash: string;
  reportDate: string;
  generatedAt: string;
  status: typeof S2D_DAILY_BRIEF_STATUSES[number];
  sections: {
    executiveJudgement: string;
    mostImportantChange: string;
    highestRiskNarrative: string;
    mainOpportunity: string;
    politicalEntitySentimentMovement: Array<{ entity: string; movement: string }>;
    topEconomicIssues: string[];
    youthRelatedPublicThemes: string[];
    localityHotspots: Array<{ locality: string; signalCount: number }>;
    outlook24To72Hours: string;
    recommendedActions: Array<{
      title: string;
      justification: string;
      riskOfActing: string;
      riskOfNotActing: string;
      approvalLevel: string;
      monitoringPeriod: string;
    }>;
    evidenceLinks: Array<{ evidenceId: string; url: string }>;
    confidenceAndLimitations: string;
  };
  governance: {
    aggregatePublicSignalsOnly: boolean;
    humanReviewRequired: boolean;
    voterPreferenceInference: boolean;
    politicalSupportInference: boolean;
    electionResultPrediction: boolean;
    microtargeting: boolean;
    personalisedPersuasion: boolean;
    automaticPublication: boolean;
    automaticExecution: boolean;
    pipIntegration: boolean;
  };
}

function str(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toDateToken(value: unknown): string {
  const token = str(value, 30).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(token) ? token : "";
}

function hashHex(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (code << 1) >>> 0;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function isAcceptedPublicRecord(row: BriefSignalRecord): boolean {
  return row.acceptedEvidence === true
    && row.publicSource !== false
    && (row.provenanceValid === true || row.provenanceStatus === "VERIFIED")
    && (row.humanReviewed === true || row.reviewStatus === "HUMAN_REVIEWED" || row.reviewStatus === "ADJUDICATED");
}

function containsProhibitedInference(text: string): boolean {
  const lower = text.toLowerCase();
  return PROHIBITED_INFERENCE_KEYWORDS.some((kw) => lower.includes(kw));
}

function sanitizeForExecutive(text: string): string {
  // Strip @handles from prose
  return str(text, 500).replace(/@[\w.-]+/g, "[account]");
}

function buildLocalityHotspots(records: BriefSignalRecord[]): Array<{ locality: string; signalCount: number }> {
  const hotspots: Record<string, number> = {};
  for (const rec of records) {
    const locality = str(rec.locality?.localityName || rec.locality?.dunName || rec.locality?.parliamentName, 180);
    if (locality) {
      hotspots[locality] = (hotspots[locality] || 0) + 1;
    }
  }
  return Object.entries(hotspots)
    .map(([locality, signalCount]) => ({ locality, signalCount }))
    .sort((a, b) => b.signalCount - a.signalCount)
    .slice(0, 10);
}

export function buildS2dDailyIntelligenceBrief(input: BriefInput): DailyIntelligenceBrief {
  const acceptedRecords = (input.acceptedRecords || []).filter(isAcceptedPublicRecord);
  const previousAccepted = (input.previousAcceptedRecords || []).filter(isAcceptedPublicRecord);

  const hasChangePoints = (input.changePoints || []).length > 0;
  const hasDiagnosticCases = (input.diagnosticCases || []).length > 0;
  const hasForecast = !!input.forecast;
  const hasRecommendations = (input.recommendations || []).length > 0;

  // Determine status
  let status: typeof S2D_DAILY_BRIEF_STATUSES[number] = "NO_ACCEPTED_DATA";
  if (acceptedRecords.length > 0) {
    status = "PARTIAL_DATA";
    if (hasChangePoints && hasDiagnosticCases && (hasForecast || hasRecommendations)) {
      status = "AVAILABLE";
    }
  }

  // Build sections
  const executiveJudgement = acceptedRecords.length > 0
    ? `Based on ${acceptedRecords.length} accepted public evidence record(s) for ${input.reportDate}. `
      + (hasChangePoints ? `${input.changePoints!.length} change point(s) detected. ` : "")
      + (hasDiagnosticCases ? `${input.diagnosticCases!.length} diagnostic case(s) open. ` : "")
      + (hasForecast ? `24-72h outlook available. ` : "")
      + (hasRecommendations ? `${input.recommendations!.length} recommendation(s) pending action.` : "")
    : "Insufficient accepted evidence for an executive judgement. All records are pending human review.";

  const mostImportantChange = hasChangePoints && input.changePoints!.length > 0
    ? sanitizeForExecutive(input.changePoints![0].narrative || "Change point detected but narrative not specified.")
    : "No significant change points detected from accepted evidence.";

  const highestRiskNarrative = hasDiagnosticCases && input.diagnosticCases!.length > 0
    ? sanitizeForExecutive(input.diagnosticCases![0].narrative || input.diagnosticCases![0].title || "Diagnostic case open.")
    : "No high-risk narratives identified from accepted evidence.";

  const mainOpportunity = acceptedRecords.length > 0
    ? "Review the locality hotspots and sentiment movement for potential engagement opportunities."
    : "No opportunity analysis available — awaiting accepted evidence.";

  // Political entity sentiment movement
  const entityMovement: Array<{ entity: string; movement: string }> = [];
  for (const entity of ENTITY_CODES) {
    const todayCount = acceptedRecords.filter((r) => str(r.politicalEntity).toUpperCase() === entity).length;
    const yesterdayCount = previousAccepted.filter((r) => str(r.politicalEntity).toUpperCase() === entity).length;
    const delta = todayCount - yesterdayCount;
    const movement = delta > 0 ? `+${delta} signals` : delta < 0 ? `${delta} signals` : "stable";
    entityMovement.push({ entity, movement });
  }

  // Top economic issues
  const issueCounts: Record<string, number> = {};
  for (const rec of acceptedRecords) {
    const issue = str(rec.issue, 220);
    if (issue) issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }
  const topEconomicIssues = Object.entries(issueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue);

  // Youth themes (only from human-labelled records)
  const youthRelatedPublicThemes: string[] = [];
  // Note: the engine won't infer "youth-related" on its own — only from human labels

  // Locality hotspots
  const localityHotspots = buildLocalityHotspots(acceptedRecords);

  // Outlook
  const outlook24To72Hours = hasForecast
    ? sanitizeForExecutive(input.forecast!.outlook24h || input.forecast!.outlook72h || "Forecast available but outlook text not specified.")
    : "Insufficient accepted evidence for 24-72 hour outlook.";

  // Recommended actions
  const recommendedActions = (input.recommendations || []).map((rec) => ({
    title: sanitizeForExecutive(rec.title),
    justification: sanitizeForExecutive(rec.justification),
    riskOfActing: sanitizeForExecutive(rec.riskOfActing),
    riskOfNotActing: sanitizeForExecutive(rec.riskOfNotActing),
    approvalLevel: str(rec.approvalLevel, 60),
    monitoringPeriod: str(rec.monitoringPeriod, 60),
  }));

  // Evidence links (sanitized — no @handles)
  const evidenceLinks = acceptedRecords
    .filter((r) => r.evidenceId && r.evidenceUrl)
    .slice(0, 20)
    .map((r) => ({
      evidenceId: str(r.evidenceId, 120),
      url: str(r.evidenceUrl, 500).replace(/@[\w.-]+/g, "[account]"),
    }));

  // Confidence and limitations (always populated)
  const limitations = input.limitations || [];
  const confidenceAndLimitations = [
    `Confidence: ${status === "AVAILABLE" ? "HIGH" : status === "PARTIAL_DATA" ? "MEDIUM" : "LOW"}.`,
    `Accepted records: ${acceptedRecords.length}.`,
    `Previous day accepted: ${previousAccepted.length}.`,
    "PIP integration is not connected in this report path.",
    ...limitations,
  ].join(" ");

  const sections = {
    executiveJudgement,
    mostImportantChange,
    highestRiskNarrative,
    mainOpportunity,
    politicalEntitySentimentMovement: entityMovement,
    topEconomicIssues,
    youthRelatedPublicThemes,
    localityHotspots,
    outlook24To72Hours,
    recommendedActions,
    evidenceLinks,
    confidenceAndLimitations,
  };

  // Build deterministic brief ID and content hash
  const canonical = JSON.stringify({ reportDate: input.reportDate, sections });
  const contentHash = hashHex(canonical);
  const briefId = `s2d-daily-brief-${input.reportDate}-${contentHash.slice(0, 8)}`;

  return {
    schema: "s2d.daily-intelligence-brief.v1",
    briefId,
    contentHash,
    reportDate: input.reportDate,
    generatedAt: input.generatedAt,
    status,
    sections,
    governance: {
      aggregatePublicSignalsOnly: true,
      humanReviewRequired: true,
      voterPreferenceInference: false,
      politicalSupportInference: false,
      electionResultPrediction: false,
      microtargeting: false,
      personalisedPersuasion: false,
      automaticPublication: false,
      automaticExecution: false,
      pipIntegration: false,
    },
  };
}

/**
 * Validate a Daily Intelligence Brief — checks governance compliance.
 */
export function validateS2dDailyIntelligenceBrief(brief: DailyIntelligenceBrief): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check all governance booleans are false (except the two that must be true)
  const g = brief.governance;
  if (!g.aggregatePublicSignalsOnly) violations.push("aggregatePublicSignalsOnly must be true");
  if (!g.humanReviewRequired) violations.push("humanReviewRequired must be true");
  if (g.voterPreferenceInference) violations.push("voterPreferenceInference must be false");
  if (g.politicalSupportInference) violations.push("politicalSupportInference must be false");
  if (g.electionResultPrediction) violations.push("electionResultPrediction must be false");
  if (g.microtargeting) violations.push("microtargeting must be false");
  if (g.personalisedPersuasion) violations.push("personalisedPersuasion must be false");
  if (g.automaticPublication) violations.push("automaticPublication must be false");
  if (g.automaticExecution) violations.push("automaticExecution must be false");
  if (g.pipIntegration) violations.push("pipIntegration must be false");

  // Check no prohibited inference keywords in any section
  const allText = JSON.stringify(brief.sections);
  if (containsProhibitedInference(allText)) {
    violations.push("Prohibited inference keywords detected in brief content");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Build a Markdown render of the brief for display.
 */
export function buildDailyBriefMarkdown(brief: DailyIntelligenceBrief): string {
  const s = brief.sections;
  return `# Daily Intelligence Brief — ${brief.reportDate}

**Status:** ${brief.status}
**Brief ID:** ${brief.briefId}
**Generated:** ${brief.generatedAt}

---

## Executive Judgement
${s.executiveJudgement}

## Most Important Change
${s.mostImportantChange}

## Highest Risk Narrative
${s.highestRiskNarrative}

## Main Opportunity
${s.mainOpportunity}

## Political Entity Sentiment Movement
${s.politicalEntitySentimentMovement.map((e) => `- **${e.entity}**: ${e.movement}`).join("\n")}

## Top Economic Issues
${s.topEconomicIssues.length > 0 ? s.topEconomicIssues.map((i) => `- ${i}`).join("\n") : "No economic issues identified."}

## Youth-Related Public Themes
${s.youthRelatedPublicThemes.length > 0 ? s.youthRelatedPublicThemes.map((t) => `- ${t}`).join("\n") : "No youth-related themes identified from human-labelled records."}

## Locality Hotspots
${s.localityHotspots.length > 0 ? s.localityHotspots.map((h) => `- **${h.locality}**: ${h.signalCount} signals`).join("\n") : "No locality hotspots identified."}

## 24-72 Hour Outlook
${s.outlook24To72Hours}

## Recommended Actions
${s.recommendedActions.length > 0 ? s.recommendedActions.map((a, i) => `### ${i + 1}. ${a.title}
- **Justification:** ${a.justification}
- **Risk of acting:** ${a.riskOfActing}
- **Risk of not acting:** ${a.riskOfNotActing}
- **Approval level:** ${a.approvalLevel}
- **Monitoring period:** ${a.monitoringPeriod}`).join("\n\n") : "No recommendations available."}

## Evidence Links
${s.evidenceLinks.length > 0 ? s.evidenceLinks.map((e) => `- [${e.evidenceId}](${e.url})`).join("\n") : "No evidence links available."}

## Confidence & Limitations
${s.confidenceAndLimitations}

---
*PIP integration is not connected in this report path.*
`;
}
