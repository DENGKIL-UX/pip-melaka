// src/lib/s2d-contracts.ts
// PIP-MLK S2D Contracts — TypeScript port of archive's pip-360-* and pip-*-contract.js schemas.
// Ported from: dashboard/src/pip-360-command-centre-contract.js,
//   pip-360-dual-layer-locality-contract.js, pip-public-communication-response-case-contract.js,
//   pip-incident-casebook-contract.js, pip-operational-alert-contract.js

// ─── Sentiment ────────────────────────────────────────────────────────────────
export const SENTIMENT = {
  POSITIVE: "POSITIVE", NEUTRAL: "NEUTRAL", NEGATIVE: "NEGATIVE",
  MIXED: "MIXED", INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
} as const;
export type Sentiment = typeof SENTIMENT[keyof typeof SENTIMENT];

// ─── Trend ────────────────────────────────────────────────────────────────────
export const TREND = {
  RISING: "RISING", STABLE: "STABLE", FALLING: "FALLING",
  EMERGING: "EMERGING", MIXED: "MIXED", INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
} as const;
export type Trend = typeof TREND[keyof typeof TREND];

// ─── Narrative Velocity ───────────────────────────────────────────────────────
export const NARRATIVE_VELOCITY = {
  HIGH: "HIGH", MODERATE: "MODERATE", LOW: "LOW",
  NONE: "NONE", INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
} as const;
export type NarrativeVelocity = typeof NARRATIVE_VELOCITY[keyof typeof NARRATIVE_VELOCITY];

// ─── Signal Confidence ────────────────────────────────────────────────────────
export const SIGNAL_CONFIDENCE = {
  VERIFIED: "VERIFIED", HIGH: "HIGH", MEDIUM: "MEDIUM",
  LOW: "LOW", INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
} as const;
export type SignalConfidence = typeof SIGNAL_CONFIDENCE[keyof typeof SIGNAL_CONFIDENCE];

// ─── Escalation Classifications ───────────────────────────────────────────────
export const ESCALATION = {
  INFORMATIONAL: "INFORMATIONAL", MONITOR: "MONITOR",
  EVIDENCE_REVIEW_REQUIRED: "EVIDENCE_REVIEW_REQUIRED",
  GEOGRAPHY_REVIEW_REQUIRED: "GEOGRAPHY_REVIEW_REQUIRED",
  HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
} as const;

// ─── Response Recommendations (Prescriptive) ──────────────────────────────────
export const RESPONSE_RECOMMENDATIONS = {
  MONITOR: "MONITOR", CLARIFY: "CLARIFY",
  CORRECT_WITH_EVIDENCE: "CORRECT_WITH_EVIDENCE",
  PROVIDE_SERVICE_UPDATE: "PROVIDE_SERVICE_UPDATE",
  AMPLIFY_VERIFIED_INFORMATION: "AMPLIFY_VERIFIED_INFORMATION",
  ESCALATE_FOR_REVIEW: "ESCALATE_FOR_REVIEW",
  NO_RESPONSE_REQUIRED: "NO_RESPONSE_REQUIRED",
} as const;

// ─── Response Case Types ──────────────────────────────────────────────────────
export const CASE_TYPES = {
  GENERAL_MONITORING: "GENERAL_MONITORING",
  PUBLIC_CONFUSION: "PUBLIC_CONFUSION",
  VERIFIED_FACTUAL_ERROR: "VERIFIED_FACTUAL_ERROR",
  SERVICE_INFORMATION_NEED: "SERVICE_INFORMATION_NEED",
  VERIFIED_INFORMATION_OPPORTUNITY: "VERIFIED_INFORMATION_OPPORTUNITY",
  CONFLICTING_INFORMATION: "CONFLICTING_INFORMATION",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  GEOGRAPHY_REVIEW: "GEOGRAPHY_REVIEW",
} as const;

// ─── Response Case Statuses ───────────────────────────────────────────────────
export const CASE_STATUSES = {
  ELIGIBLE_FOR_HUMAN_REVIEW: "ELIGIBLE_FOR_HUMAN_REVIEW",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  BLOCKED_INSUFFICIENT_EVIDENCE: "BLOCKED_INSUFFICIENT_EVIDENCE",
  BLOCKED_INVALID_GEOGRAPHY: "BLOCKED_INVALID_GEOGRAPHY",
  NO_CASE_REQUIRED: "NO_CASE_REQUIRED",
  RESOLVED: "RESOLVED",
} as const;

// ─── Incident Case Statuses ───────────────────────────────────────────────────
export const INCIDENT_STATUSES = {
  OPEN: "OPEN", INVESTIGATING: "INVESTIGATING",
  MITIGATION_IN_PROGRESS: "MITIGATION_IN_PROGRESS",
  READY_FOR_CLOSURE: "READY_FOR_CLOSURE", CLOSED: "CLOSED",
} as const;

// ─── Incident Case Severities ─────────────────────────────────────────────────
export const INCIDENT_SEVERITIES = {
  INFO: "INFO", WARNING: "WARNING", HIGH: "HIGH", CRITICAL: "CRITICAL",
} as const;

// ─── Incident Checklist Statuses ──────────────────────────────────────────────
export const CHECKLIST_STATUSES = {
  PENDING: "PENDING", IN_PROGRESS: "IN_PROGRESS", VERIFIED: "VERIFIED",
} as const;

// ─── Operational Alert Severities ─────────────────────────────────────────────
export const ALERT_SEVERITIES = {
  INFO: "INFO", WARNING: "WARNING", CRITICAL: "CRITICAL",
} as const;

// ─── Operational Alert Codes ──────────────────────────────────────────────────
export const ALERT_CODES = {
  SYSTEM_HEALTH_UNAVAILABLE: "SYSTEM_HEALTH_UNAVAILABLE",
  SYSTEM_HEALTH_DEGRADED: "SYSTEM_HEALTH_DEGRADED",
  AUTHENTICATION_COMPONENT_DEGRADED: "AUTHENTICATION_COMPONENT_DEGRADED",
  AUTHORIZATION_COMPONENT_DEGRADED: "AUTHORIZATION_COMPONENT_DEGRADED",
  SCENARIO_STORE_DEGRADED: "SCENARIO_STORE_DEGRADED",
  AUDIT_STORE_DEGRADED: "AUDIT_STORE_DEGRADED",
  ERROR_LOGGER_DEGRADED: "ERROR_LOGGER_DEGRADED",
  RECENT_ERROR_ACTIVITY: "RECENT_ERROR_ACTIVITY",
  CRITICAL_ERROR_ACTIVITY: "CRITICAL_ERROR_ACTIVITY",
  SECURITY_BASELINE_VIOLATION: "SECURITY_BASELINE_VIOLATION",
  PERSISTENCE_BASELINE_VIOLATION: "PERSISTENCE_BASELINE_VIOLATION",
} as const;

// ─── Platforms (from S2D Architecture: TikTok, Facebook, Instagram, Threads) ──
export const PLATFORMS = {
  TIKTOK: "TIKTOK", FACEBOOK: "FACEBOOK", INSTAGRAM: "INSTAGRAM",
  THREADS: "THREADS", NEWS: "NEWS", OTHER: "OTHER",
} as const;
export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

// ─── S2D Analytical Levels (from S2D Architecture_v2.txt §3) ──────────────────
export const ANALYTICAL_LEVELS = {
  DESCRIPTIVE: "DESCRIPTIVE",
  DIAGNOSTIC: "DIAGNOSTIC",
  PREDICTIVE: "PREDICTIVE",
  PRESCRIPTIVE: "PRESCRIPTIVE",
  INSIGHT: "INSIGHT",
} as const;

// ─── S2D Loop Phases ──────────────────────────────────────────────────────────
export const LOOP_PHASES = {
  SENSING: "SENSING", DECIDING: "DECIDING", ACTING: "ACTING",
} as const;

// ─── Evidence Statuses ────────────────────────────────────────────────────────
export const EVIDENCE_STATUSES = {
  VERIFIED: "VERIFIED", PARTIAL: "PARTIAL", UNVERIFIED: "UNVERIFIED",
} as const;

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export interface S2DSignal {
  id: string;
  timestamp: string;
  platform: Platform;
  sentiment: Sentiment;
  trend: Trend;
  narrative_velocity: NarrativeVelocity;
  confidence: SignalConfidence;
  parliament?: string;
  dun?: string;
  locality?: string;
  escalation: string;
  content_summary: string;
  evidence_count: number;
  engagement_count: number;
}

export interface DailySentiment {
  date: string;
  parliament?: string;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  total_signals: number;
  top_narrative: string;
}

export interface NarrativeRadarEntry {
  narrative_id: string;
  title: string;
  velocity: NarrativeVelocity;
  trend: Trend;
  sentiment: Sentiment;
  first_seen: string;
  last_seen: string;
  locality_count: number;
  signal_count: number;
  platforms: Platform[];
}

export interface LocalitySignalMap {
  locality_code: string;
  locality_name: string;
  signal_count: number;
  dominant_sentiment: Sentiment;
  dominant_narrative: string;
  trend: Trend;
}

export interface PublicCommCase {
  id: string;
  type: string;
  status: string;
  recommendation: string;
  title: string;
  description: string;
  evidence_count: number;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  platforms: Platform[];
}

export interface IncidentCase {
  id: string;
  title: string;
  status: string;
  severity: string;
  description: string;
  created_at: string;
  updated_at: string;
  checklist: Array<{ id: string; label: string; status: string }>;
}

export interface OperationalAlert {
  id: string;
  code: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  acknowledged_at?: string;
}
