// src/lib/s2d-seed-data.ts
// Seed data for S2D 360 modules — based on P134 Melaka real geography.
// Per S2D Architecture_v2.txt: Apify collection → sentiment → narrative → evidence → response.

import {
  SENTIMENT, TREND, NARRATIVE_VELOCITY, SIGNAL_CONFIDENCE, ESCALATION,
  RESPONSE_RECOMMENDATIONS, CASE_TYPES, CASE_STATUSES,
  INCIDENT_STATUSES, INCIDENT_SEVERITIES, CHECKLIST_STATUSES,
  ALERT_SEVERITIES, ALERT_CODES, PLATFORMS,
  type S2DSignal, type DailySentiment, type NarrativeRadarEntry,
  type LocalitySignalMap, type PublicCommCase, type IncidentCase, type OperationalAlert,
} from "./s2d-contracts";

const now = new Date();
const isoNow = now.toISOString();
const isoHoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const isoDaysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

// ─── S2D Signals (6) ──────────────────────────────────────────────────────────
export const SEED_SIGNALS: S2DSignal[] = [
  {
    id: "sig-001", timestamp: isoHoursAgo(2),
    platform: PLATFORMS.TIKTOK, sentiment: SENTIMENT.NEGATIVE, trend: TREND.RISING,
    narrative_velocity: NARRATIVE_VELOCITY.HIGH, confidence: SIGNAL_CONFIDENCE.HIGH,
    parliament: "134", dun: "05", locality: "Taboh Naning",
    escalation: ESCALATION.HUMAN_REVIEW_REQUIRED,
    content_summary: "Viral TikTok about senior healthcare access in Taboh Naning — 30.6% senior dependency cited.",
    evidence_count: 3, engagement_count: 12450,
  },
  {
    id: "sig-002", timestamp: isoHoursAgo(5),
    platform: PLATFORMS.FACEBOOK, sentiment: SENTIMENT.MIXED, trend: TREND.STABLE,
    narrative_velocity: NARRATIVE_VELOCITY.MODERATE, confidence: SIGNAL_CONFIDENCE.MEDIUM,
    parliament: "134", dun: "03", locality: "Ayer Limau",
    escalation: ESCALATION.MONITOR,
    content_summary: "Facebook discussion on DPT voter-roll additions in Ayer Limau — net +153 over 5 months.",
    evidence_count: 2, engagement_count: 3200,
  },
  {
    id: "sig-003", timestamp: isoHoursAgo(8),
    platform: PLATFORMS.INSTAGRAM, sentiment: SENTIMENT.POSITIVE, trend: TREND.EMERGING,
    narrative_velocity: NARRATIVE_VELOCITY.LOW, confidence: SIGNAL_CONFIDENCE.VERIFIED,
    parliament: "134", dun: "01", locality: "Kuala Linggi",
    escalation: ESCALATION.INFORMATIONAL,
    content_summary: "Community event coverage — MP visits Kuala Linggi fishing village.",
    evidence_count: 5, engagement_count: 890,
  },
  {
    id: "sig-004", timestamp: isoHoursAgo(12),
    platform: PLATFORMS.THREADS, sentiment: SENTIMENT.NEGATIVE, trend: TREND.RISING,
    narrative_velocity: NARRATIVE_VELOCITY.HIGH, confidence: SIGNAL_CONFIDENCE.HIGH,
    parliament: "134", dun: "05", locality: "Taboh Naning",
    escalation: ESCALATION.EVIDENCE_REVIEW_REQUIRED,
    content_summary: "Threads thread alleging road infrastructure neglect in Taboh Naning area.",
    evidence_count: 1, engagement_count: 5600,
  },
  {
    id: "sig-005", timestamp: isoHoursAgo(18),
    platform: PLATFORMS.NEWS, sentiment: SENTIMENT.NEUTRAL, trend: TREND.STABLE,
    narrative_velocity: NARRATIVE_VELOCITY.MODERATE, confidence: SIGNAL_CONFIDENCE.VERIFIED,
    parliament: "134", dun: "02", locality: "Tanjung Bidara",
    escalation: ESCALATION.INFORMATIONAL,
    content_summary: "News report on Tanjung Bidara coastal development project progress.",
    evidence_count: 4, engagement_count: 1200,
  },
  {
    id: "sig-006", timestamp: isoHoursAgo(24),
    platform: PLATFORMS.TIKTOK, sentiment: SENTIMENT.MIXED, trend: TREND.FALLING,
    narrative_velocity: NARRATIVE_VELOCITY.LOW, confidence: SIGNAL_CONFIDENCE.MEDIUM,
    parliament: "134", dun: "04", locality: "Lendu",
    escalation: ESCALATION.MONITOR,
    content_summary: "TikTok trend on Lendu education hub — mixed reactions to campus expansion.",
    evidence_count: 2, engagement_count: 4500,
  },
];

// ─── Daily Sentiment (3 days) ────────────────────────────────────────────────
export const SEED_DAILY_SENTIMENT: DailySentiment[] = [
  { date: isoDaysAgo(2).slice(0,10), parliament: "134", positive_pct: 35, neutral_pct: 40, negative_pct: 25, total_signals: 42, top_narrative: "Senior healthcare access" },
  { date: isoDaysAgo(1).slice(0,10), parliament: "134", positive_pct: 28, neutral_pct: 35, negative_pct: 37, total_signals: 58, top_narrative: "Road infrastructure neglect" },
  { date: isoNow.slice(0,10), parliament: "134", positive_pct: 22, neutral_pct: 33, negative_pct: 45, total_signals: 71, top_narrative: "Senior healthcare + road neglect" },
];

// ─── Narrative Radar (4 entries) ──────────────────────────────────────────────
export const SEED_NARRATIVE_RADAR: NarrativeRadarEntry[] = [
  { narrative_id: "nar-001", title: "Senior healthcare access crisis in Taboh Naning", velocity: NARRATIVE_VELOCITY.HIGH, trend: TREND.RISING, sentiment: SENTIMENT.NEGATIVE, first_seen: isoDaysAgo(3), last_seen: isoHoursAgo(2), locality_count: 3, signal_count: 18, platforms: [PLATFORMS.TIKTOK, PLATFORMS.THREADS, PLATFORMS.FACEBOOK] },
  { narrative_id: "nar-002", title: "DPT voter-roll churn in Ayer Limau", velocity: NARRATIVE_VELOCITY.MODERATE, trend: TREND.STABLE, sentiment: SENTIMENT.MIXED, first_seen: isoDaysAgo(5), last_seen: isoHoursAgo(5), locality_count: 2, signal_count: 12, platforms: [PLATFORMS.FACEBOOK, PLATFORMS.NEWS] },
  { narrative_id: "nar-003", title: "Coastal development in Tanjung Bidara", velocity: NARRATIVE_VELOCITY.LOW, trend: TREND.STABLE, sentiment: SENTIMENT.NEUTRAL, first_seen: isoDaysAgo(7), last_seen: isoHoursAgo(18), locality_count: 1, signal_count: 6, platforms: [PLATFORMS.NEWS, PLATFORMS.INSTAGRAM] },
  { narrative_id: "nar-004", title: "Lendu campus expansion debate", velocity: NARRATIVE_VELOCITY.MODERATE, trend: TREND.FALLING, sentiment: SENTIMENT.MIXED, first_seen: isoDaysAgo(4), last_seen: isoHoursAgo(24), locality_count: 2, signal_count: 9, platforms: [PLATFORMS.TIKTOK, PLATFORMS.THREADS] },
];

// ─── Locality Signal Map (5 entries) ──────────────────────────────────────────
export const SEED_LOCALITY_SIGNAL_MAP: LocalitySignalMap[] = [
  { locality_code: "008", locality_name: "TMN SERI AMAN", signal_count: 22, dominant_sentiment: SENTIMENT.NEGATIVE, dominant_narrative: "Senior healthcare access", trend: TREND.RISING },
  { locality_code: "002", locality_name: "KG RAMUAN CHINA BESAR", signal_count: 15, dominant_sentiment: SENTIMENT.MIXED, dominant_narrative: "DPT voter-roll churn", trend: TREND.STABLE },
  { locality_code: "001", locality_name: "KG KUALA LINGGI", signal_count: 8, dominant_sentiment: SENTIMENT.POSITIVE, dominant_narrative: "MP community visit", trend: TREND.EMERGING },
  { locality_code: "012", locality_name: "KG TANJUNG BIDARA", signal_count: 11, dominant_sentiment: SENTIMENT.NEUTRAL, dominant_narrative: "Coastal development", trend: TREND.STABLE },
  { locality_code: "005", locality_name: "KG LENDU", signal_count: 14, dominant_sentiment: SENTIMENT.MIXED, dominant_narrative: "Campus expansion", trend: TREND.FALLING },
];

// ─── Public Communication Cases (4) ──────────────────────────────────────────
export const SEED_COMM_CASES: PublicCommCase[] = [
  {
    id: "case-001", type: CASE_TYPES.PUBLIC_CONFUSION, status: CASE_STATUSES.REVIEW_REQUIRED,
    recommendation: RESPONSE_RECOMMENDATIONS.CLARIFY,
    title: "Confusion about senior healthcare funding allocation",
    description: "Viral TikTok claims no healthcare funding for Taboh Naning. Evidence shows RM 2.3M allocated in 2025.",
    evidence_count: 3, created_at: isoHoursAgo(20), updated_at: isoHoursAgo(2),
    platforms: [PLATFORMS.TIKTOK, PLATFORMS.THREADS],
  },
  {
    id: "case-002", type: CASE_TYPES.VERIFIED_FACTUAL_ERROR, status: CASE_STATUSES.ELIGIBLE_FOR_HUMAN_REVIEW,
    recommendation: RESPONSE_RECOMMENDATIONS.CORRECT_WITH_EVIDENCE,
    title: "False claim about DPT voter-roll manipulation",
    description: "Facebook post alleges voter-roll manipulation in Ayer Limau. SPR DPT data shows normal additions/deletions pattern.",
    evidence_count: 5, created_at: isoHoursAgo(36), updated_at: isoHoursAgo(12),
    platforms: [PLATFORMS.FACEBOOK],
  },
  {
    id: "case-003", type: CASE_TYPES.SERVICE_INFORMATION_NEED, status: CASE_STATUSES.REVIEW_REQUIRED,
    recommendation: RESPONSE_RECOMMENDATIONS.PROVIDE_SERVICE_UPDATE,
    title: "Community asks about Tanjung Bidara coastal project timeline",
    description: "Residents requesting updated timeline for coastal development project. No official communication in 3 months.",
    evidence_count: 2, created_at: isoDaysAgo(2), updated_at: isoHoursAgo(8),
    platforms: [PLATFORMS.INSTAGRAM, PLATFORMS.NEWS],
  },
  {
    id: "case-004", type: CASE_TYPES.VERIFIED_INFORMATION_OPPORTUNITY, status: CASE_STATUSES.NO_CASE_REQUIRED,
    recommendation: RESPONSE_RECOMMENDATIONS.AMPLIFY_VERIFIED_INFORMATION,
    title: "Positive community event in Kuala Linggi — amplification opportunity",
    description: "MP visited Kuala Linggi fishing village. Community response positive. Opportunity to amplify verified information.",
    evidence_count: 4, created_at: isoDaysAgo(1), updated_at: isoHoursAgo(6),
    platforms: [PLATFORMS.INSTAGRAM],
  },
];

// ─── Incident Cases (3) ───────────────────────────────────────────────────────
export const SEED_INCIDENTS: IncidentCase[] = [
  {
    id: "inc-001", title: "Senior healthcare narrative escalation — Taboh Naning",
    status: INCIDENT_STATUSES.INVESTIGATING, severity: INCIDENT_SEVERITIES.HIGH,
    description: "Negative sentiment on senior healthcare rising 37% → 45% in 3 days. N05 has 30.6% senior dependency (critical threshold).",
    created_at: isoDaysAgo(2), updated_at: isoHoursAgo(3),
    checklist: [
      { id: "chk-1a", label: "Verify healthcare funding allocation data", status: CHECKLIST_STATUSES.VERIFIED },
      { id: "chk-1b", label: "Cross-reference with DOSM senior dependency data", status: CHECKLIST_STATUSES.VERIFIED },
      { id: "chk-1c", label: "Draft public communication response", status: CHECKLIST_STATUSES.IN_PROGRESS },
      { id: "chk-1d", label: "Schedule community engagement in Taboh Naning", status: CHECKLIST_STATUSES.PENDING },
    ],
  },
  {
    id: "inc-002", title: "DPT voter-roll manipulation allegation",
    status: INCIDENT_STATUSES.MITIGATION_IN_PROGRESS, severity: INCIDENT_SEVERITIES.CRITICAL,
    description: "Facebook post alleging voter-roll manipulation. Evidence verified — DPT data shows normal pattern. Response case opened.",
    created_at: isoDaysAgo(1), updated_at: isoHoursAgo(12),
    checklist: [
      { id: "chk-2a", label: "Verify DPT data against SPR Pameran PDFs", status: CHECKLIST_STATUSES.VERIFIED },
      { id: "chk-2b", label: "Draft correction statement with evidence", status: CHECKLIST_STATUSES.VERIFIED },
      { id: "chk-2c", label: "Legal review of correction statement", status: CHECKLIST_STATUSES.IN_PROGRESS },
      { id: "chk-2d", label: "Publish correction on official channels", status: CHECKLIST_STATUSES.PENDING },
    ],
  },
  {
    id: "inc-003", title: "Road infrastructure complaint — Lendu",
    status: INCIDENT_STATUSES.OPEN, severity: INCIDENT_SEVERITIES.WARNING,
    description: "Threads discussion about road conditions in Lendu. Trend falling but 5,600 engagement.",
    created_at: isoHoursAgo(18), updated_at: isoHoursAgo(6),
    checklist: [
      { id: "chk-3a", label: "Verify road maintenance schedule", status: CHECKLIST_STATUSES.PENDING },
      { id: "chk-3b", label: "Assess engagement velocity", status: CHECKLIST_STATUSES.IN_PROGRESS },
    ],
  },
];

// ─── Operational Alerts (5) ──────────────────────────────────────────────────
export const SEED_ALERTS: OperationalAlert[] = [
  { id: "alert-001", code: ALERT_CODES.CRITICAL_ERROR_ACTIVITY, severity: ALERT_SEVERITIES.CRITICAL, title: "Critical error activity detected", message: "5 errors in last 10 minutes from /api/assistant route. Circuit breaker opened.", status: "ACTIVE", created_at: isoHoursAgo(1) },
  { id: "alert-002", code: ALERT_CODES.SYSTEM_HEALTH_DEGRADED, severity: ALERT_SEVERITIES.WARNING, title: "System health degraded", message: "P135-P139 demographics not available. Dashboard showing fallback data.", status: "ACTIVE", created_at: isoHoursAgo(3) },
  { id: "alert-003", code: ALERT_CODES.RECENT_ERROR_ACTIVITY, severity: ALERT_SEVERITIES.INFO, title: "Recent error activity", message: "2 non-critical errors in last hour from map-3d-tab Three.js rendering.", status: "ACKNOWLEDGED", created_at: isoHoursAgo(5), acknowledged_at: isoHoursAgo(4) },
  { id: "alert-004", code: ALERT_CODES.SCENARIO_STORE_DEGRADED, severity: ALERT_SEVERITIES.WARNING, title: "Scenario store degraded", message: "S2D signals stored in localStorage (session-local). D1 binding not configured.", status: "ACTIVE", created_at: isoDaysAgo(1) },
  { id: "alert-005", code: ALERT_CODES.SECURITY_BASELINE_VIOLATION, severity: ALERT_SEVERITIES.CRITICAL, title: "Security baseline violation", message: "JWT_SECRET not set. Authentication features running in degraded mode.", status: "ACTIVE", created_at: isoDaysAgo(1) },
];
