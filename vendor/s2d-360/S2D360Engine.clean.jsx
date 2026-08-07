import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  AreaChart, Area,
} from 'recharts'
import * as XLSX from 'xlsx'
import S2DNetworkGraphPanel from './components/S2DNetworkGraphPanel'
import S2DDigitalBrainPanel from './components/S2DDigitalBrainPanel'
import S2DLiveMonitoringPage from './components/S2DLiveMonitoringPage'
import S2DBackendIntegrationPage from './components/S2DBackendIntegrationPage'
import S2DAuditLogPage from './components/S2DAuditLogPage'
import S2DNotificationCenterPage from './components/S2DNotificationCenterPage'
import S2DMVPReadinessPage from './components/S2DMVPReadinessPage'
import S2DEngineFamilyTreePage from './components/S2DEngineFamilyTreePage.jsx'
import S2DNarrativeEchoPanel from './components/S2DNarrativeEchoPanel'
import EvidenceLogPanel from './components/EvidenceLogPanel'
import ApprovalGatePanel from './components/ApprovalGatePanel'
import ResponseDraftPanel from './components/ResponseDraftPanel'
import ReadinessPanel from './components/ReadinessPanel'
import OutcomeUpdatePanel from './components/OutcomeUpdatePanel'
import S2DDebugPanel from './components/S2DDebugPanel'
import S2DAssistantConsole from './components/S2DAssistantConsole'
import S2DSocialListeningCrawlerPage from "./components/S2DSocialListeningCrawlerPage";
import S2DIngestionOperationsPage from "./components/S2DIngestionOperationsPage.jsx";
import S2DMonitoringProfilesPage from "./components/S2DMonitoringProfilesPage.jsx";
import S2DLinkMemoryLibraryPage from "./components/S2DLinkMemoryLibraryPage";
import { addLinkToMemory, getLinkMemoryLibrary,} from "./lib/s2d-link-memory-library";
import S2DLinkRecallIntelligencePage from "./components/S2DLinkRecallIntelligencePage.jsx";
import S2DAnnotationWorkbenchPage from "./components/S2DAnnotationWorkbenchPage.jsx";
import S2DAnnotationAcceptancePage from "./components/S2DAnnotationAcceptancePage.jsx";
import S2DJohorCorpusGovernancePage from "./components/S2DJohorCorpusGovernancePage.jsx";
import S2DJohorCorpusStagingPage from "./components/S2DJohorCorpusStagingPage.jsx";
import S2DJohorDualAnnotationPage from "./components/S2DJohorDualAnnotationPage.jsx";
import S2DJohorCorpusAcceptancePage from "./components/S2DJohorCorpusAcceptancePage.jsx";
import S2DDailySentimentSnapshotsPage from "./components/S2DDailySentimentSnapshotsPage.jsx";
import S2DLocalSignalProfilesPage from "./components/S2DLocalSignalProfilesPage.jsx";
import S2DAutomatedDescriptiveReportsPage from "./components/S2DAutomatedDescriptiveReportsPage.jsx";
import S2DChangePointDetectionPage from "./components/S2DChangePointDetectionPage.jsx";
import S2DNarrativeDriverDecompositionPage from "./components/S2DNarrativeDriverDecompositionPage.jsx";
import S2DNarrativePropagationGraphPage from "./components/S2DNarrativePropagationGraphPage.jsx";
import facebookSourceRegistry from "../config/s2d-facebook-source-pages.json";
import { Panel, KPI, Badge } from "./components/s2dUiKit.jsx";
import { saveApifyToken } from "./lib/s2d-apify-token-store";
import {
  resolveS2dApprovedMaximum,
  validateS2dRequestedMaximum,
  enforceGovernedRecordLimit,
} from './lib/s2d-governed-record-limit.js'
import {
  createS2dSignalRecord,
  isS2dSignalRecord,
  normalizeS2dPlatform,
  normalizeS2dSentimentLabel,
  normalizeS2dPolarity,
  normalizeS2dConfidence,
  validateS2dSignalRecord,
} from "./contracts/s2d-signal-contract.js";
import {
  adaptLegacySignalToS2dRecord,
  adaptScrapedRecordToS2dRecord,
  projectS2dSignalForLegacyUi,
  normalizeStoredS2dSignals,
  applyLegacyPatchToS2dSignal,
  inferS2dPlatform,
} from "./adapters/s2d-signal-compatibility-adapter.js";
import {
  createUniqueS2dSignalForInsert,
  reconcileDuplicateS2dSignalIds,
} from "./services/s2d-signal-identity-service.js";
import {
  createS2dDurableStorageGateway,
} from "./storage/s2d-durable-storage-gateway.js";
import {
  createS2dIngestionArtifactStore,
} from "./storage/s2d-ingestion-artifact-store.js";
import {
  createS2dMonitoringProfileStore,
} from "./storage/s2d-monitoring-profile-store.js";
import {
  createS2dIngestionPipeline,
} from "./services/s2d-ingestion-pipeline-service.js";
import {
  createS2dIngestionRecoveryService,
} from "./services/s2d-ingestion-recovery-service.js";
import {
  createS2dMonitoringProfileService,
} from "./services/s2d-monitoring-profile-service.js";
import {
  createS2dCollectionExecutionClient,
} from "./services/s2d-collection-execution-client.js";
import {
  createS2dDatasetRetrievalClient,
} from "./services/s2d-dataset-retrieval-client.js";
import {
  createS2dCollectionScheduleClient,
} from "./services/s2d-collection-schedule-client.js";
import {
  createS2dWebhookEventClient,
} from "./services/s2d-webhook-event-client.js";
import {
  createS2dRemoteActivationClient,
} from "./services/s2d-remote-activation-client.js";
import {
  createS2dRunReconciliationClient,
} from "./services/s2d-run-reconciliation-client.js";
import {
  createS2dRawEvidenceStagingClient,
} from "./services/s2d-raw-evidence-staging-client.js";
import {
  createS2dPhase1AcceptanceClient,
} from "./services/s2d-phase1-acceptance-client.js";
import {
  createS2dAnnotationDurableStore,
} from "./annotation/storage/s2d-annotation-durable-store.js";
import {
  createS2dAnnotationWorkflowService,
} from "./annotation/services/s2d-annotation-workflow-service.js";
import {
  createS2dAnnotationSuggestionService,
} from "./annotation/services/s2d-annotation-suggestion-service.js";
import {
  createS2dAnnotationPlatformAcceptanceService,
} from "./annotation/services/s2d-annotation-platform-acceptance-service.js";
import {
  createS2dJohorCorpusStagingStore,
} from "./corpus/storage/s2d-johor-corpus-staging-store.js";
import {
  createS2dJohorCorpusAcquisitionService,
} from "./corpus/services/s2d-johor-corpus-acquisition-service.js";
import {
  createS2dJohorDualAnnotationService,
} from "./corpus/services/s2d-johor-dual-annotation-service.js";
import {
  createS2dJohorCorpusAcceptanceService,
} from "./corpus/services/s2d-johor-corpus-acceptance-service.js";
import {
  createS2dDailySentimentSnapshotService,
} from "./intelligence/services/s2d-daily-sentiment-snapshot-service.js";
import {
  createS2dLocalSignalProfileService,
} from "./intelligence/services/s2d-local-signal-profile-service.js";
import {
  createS2dAutomatedDescriptiveReportService,
} from "./intelligence/services/s2d-automated-descriptive-report-service.js";
import {
  createS2dChangePointDetectionService,
} from "./intelligence/services/s2d-change-point-detection-service.js";
import {
  createS2dNarrativeDriverDecompositionService,
} from "./intelligence/services/s2d-narrative-driver-decomposition-service.js";
import {
  createS2dNarrativePropagationGraphService,
} from "./intelligence/services/s2d-narrative-propagation-graph-service.js";
import {
  createS2dDiagnosticCaseBuilderService,
} from "./intelligence/services/s2d-diagnostic-case-builder-service.js";
import {
  createS2dForecastTargetService,
} from "./intelligence/services/s2d-forecast-target-service.js";
import {
  createS2dBaselineForecastingService,
} from "./intelligence/services/s2d-baseline-forecasting-service.js";
import {
  createS2dFeatureEngineeringService,
} from "./intelligence/services/s2d-feature-engineering-service.js";
import {
  createS2dPredictiveModelTrainingService,
} from "./intelligence/services/s2d-predictive-model-training-service.js";
import {
  createS2dBacktestingCalibrationService,
} from "./intelligence/services/s2d-backtesting-calibration-service.js";
import {
  createS2dDecisionPolicyService,
} from "./intelligence/services/s2d-decision-policy-service.js";
import {
  createS2dRecommendationScoringService,
} from "./intelligence/services/s2d-recommendation-scoring-service.js";
import {
  createS2dRecommendationJustificationService,
} from "./intelligence/services/s2d-recommendation-justification-service.js";
import {
  createS2dNarrativeContentBriefService,
} from "./intelligence/services/s2d-narrative-content-brief-service.js";
import {
  createS2dDailyIntelligenceBriefService,
} from "./intelligence/services/s2d-daily-intelligence-brief-service.js";
import {
  createS2dWeeklyDiagnosticReportService,
} from "./intelligence/services/s2d-weekly-diagnostic-report-service.js";
import {
  createS2dConstituencyIntelligenceReportService,
} from "./intelligence/services/s2d-constituency-intelligence-report-service.js";
import {
  createS2dAfterActionEffectivenessService,
} from "./intelligence/services/s2d-after-action-effectiveness-service.js";
import {
  createS2dJohorModelPackService,
} from "./transfer/services/s2d-johor-model-pack-service.js";
import {
  createS2dJohorModelPackStore,
} from "./transfer/storage/s2d-johor-model-pack-store.js";
import {
  createS2dStateLearningSeparationService,
} from "./transfer/services/s2d-state-learning-separation-service.js";
import {
  createS2dStateTransferPlanStore,
} from "./transfer/storage/s2d-state-transfer-plan-store.js";
import {
  createS2dDomainAdaptationService,
} from "./transfer/services/s2d-domain-adaptation-service.js";
import {
  createS2dDomainAdaptationStore,
} from "./transfer/storage/s2d-domain-adaptation-store.js";
import {
  createS2dPipSharedContractService,
} from "./integration/pip360/services/s2d-pip-shared-contract-service.js";
import {
  createS2dPipIntelligenceApiService,
} from "./integration/pip360/services/s2d-pip-intelligence-api-service.js";
import {
  createS2dPipContextFusionService,
} from "./integration/pip360/services/s2d-pip-context-fusion-service.js";
import S2DDiagnosticCaseBuilderPage from "./components/S2DDiagnosticCaseBuilderPage.jsx";
import S2DForecastTargetsPage from "./components/S2DForecastTargetsPage.jsx";
import S2DBaselineForecastingPage from "./components/S2DBaselineForecastingPage.jsx";
import S2DFeatureEngineeringPage from "./components/S2DFeatureEngineeringPage.jsx";
import S2DPredictiveModelTrainingPage from "./components/S2DPredictiveModelTrainingPage.jsx";
import S2DBacktestingCalibrationPage from "./components/S2DBacktestingCalibrationPage.jsx";
import S2DDecisionPolicyEnginePage from "./components/S2DDecisionPolicyEnginePage.jsx";
import S2DRecommendationScoringPage from "./components/S2DRecommendationScoringPage.jsx";
import S2DRecommendationJustificationPage from "./components/S2DRecommendationJustificationPage.jsx";
import S2DNarrativeContentBriefPage from "./components/S2DNarrativeContentBriefPage.jsx";
import S2DDailyIntelligenceBriefPage from "./components/S2DDailyIntelligenceBriefPage.jsx";
import S2DWeeklyDiagnosticReportPage from "./components/S2DWeeklyDiagnosticReportPage.jsx";
import S2DConstituencyIntelligenceReportPage from "./components/S2DConstituencyIntelligenceReportPage.jsx";
import S2DAfterActionEffectivenessReportPage from "./components/S2DAfterActionEffectivenessReportPage.jsx";
import S2DJohorModelPackPage from "./components/S2DJohorModelPackPage.jsx";
import S2DStateLearningSeparationPage from "./components/S2DStateLearningSeparationPage.jsx";
import S2DDomainAdaptationPage from "./components/S2DDomainAdaptationPage.jsx";
import S2DSharedContractsPage from "./components/S2DSharedContractsPage.jsx";
import S2DIntelligenceApiPage from "./components/S2DIntelligenceApiPage.jsx";
import S2DPipContextFusionPage from "./components/S2DPipContextFusionPage.jsx";

const S2D_CONTRACT_SMOKE_RECORD = createS2dSignalRecord({
  signalId: "SIG-MANUAL-CONTRACT-SMOKE",
  collectionRunId: "",
  platform: "manual",
  headline: "S2D contract smoke record",
  source: {
    collectedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: null,
  },
  metrics: {
    likes: 1,
    comments: 1,
    shares: 1,
  },
  classification: {
    sentimentLabel: "Neutral",
    sentimentPolarity: 0,
    sentimentConfidence: 1,
  },
  scores: {
    sentimentRisk: 45,
  },
  timestamps: {
    capturedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
});

const S2D_CONTRACT_SMOKE_VALIDATION = validateS2dSignalRecord(S2D_CONTRACT_SMOKE_RECORD);

if (!S2D_CONTRACT_SMOKE_VALIDATION.valid) {
  throw new Error(
    `S2D signal contract smoke validation failed: ${S2D_CONTRACT_SMOKE_VALIDATION.errors.join("; ")}`
  );
}

/* ===========================================================================
   S2D 360 — Signal-to-Decision Intelligence Engine
   Dark theme consistent with MIP / PIP design tokens.
   Single-file React artifact. Persists to window.storage.
   =========================================================================== */

/* ---- design tokens (MIP/PIP) -------------------------------------------- */
const T = {
  bg: '#0C0C0E', bg2: '#151517', card: '#151517', card2: '#1b1b1f', card3: '#24242a',
  border: '#27272A', borderSoft: '#1f1f24',
  text: '#f4f4f5', sub: '#c7c7cf', muted: '#A1A1AA',
  blue: '#00E5FF', amber: '#f59e0b', purple: '#8b5cf6', teal: '#2dd4bf', green: '#22c55e',
  greenBright: '#22c55e', red: '#FF3B30', gold: '#facc15', purpleBright: '#a78bfa',
  pink: '#ec4899', magenta: '#f0398b',
}
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif"
const FONT_HEAD = "'Space Grotesk', 'Inter', sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track { background: ${T.bg2}; }
::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: #31405a; }

.cmd-kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.cmd-two-col-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.cmd-kpi-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.cmd-kpi-card:hover { transform: translateY(-2px) scale(1.01); border-color: ${T.blue}; box-shadow: 0 0 0 1px ${T.blue}44, 0 14px 28px rgba(0, 229, 255, 0.12); }

@media (max-width: 1200px) {
  .cmd-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .cmd-two-col-grid { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .cmd-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`

/* ===========================================================================
   SCORING PIPELINE — ported from tiktokSignalNormalizer.js (verbatim logic)
   =========================================================================== */
function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, Number(v) || 0)) }
function parseNumber(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  const c = String(value).replace(/,/g, '').replace(/k/i, '000').replace(/m/i, '000000').replace(/[^\d.]/g, '')
  return Number(c) || 0
}
function parseGrowthPercent(value) {
  if (!value) return 0
  const m = String(value).match(/[-+]?\d+/)
  return m ? Number(m[0]) : 0
}
function scoreVelocity(growth, views, comments, shares) {
  const g = parseGrowthPercent(growth)
  const push = comments * 0.015 + shares * 0.02
  const vp = views > 100000 ? 20 : views > 50000 ? 12 : views > 10000 ? 6 : 0
  return clamp(g * 0.12 + push + vp)
}
function scoreReach(views, mentions) {
  if (views >= 500000 || mentions >= 20000) return 92
  if (views >= 250000 || mentions >= 10000) return 82
  if (views >= 100000 || mentions >= 5000) return 70
  if (views >= 50000 || mentions >= 1000) return 58
  return 35
}
function scoreSentimentRisk(s) {
  const v = String(s || '').toLowerCase()
  if (v.includes('negative')) return 85
  if (v.includes('angry')) return 90
  if (v.includes('neutral')) return 45
  if (v.includes('positive')) return 20
  return 60
}
function scoreInfluence(sourceType, shares, views) {
  const src = String(sourceType || '').toLowerCase()
  let s = 35
  if (src.includes('influencer')) s += 25
  if (src.includes('political')) s += 20
  if (src.includes('community')) s += 15
  if (src.includes('media')) s += 20
  if (shares >= 3000) s += 20; else if (shares >= 1000) s += 12; else if (shares >= 300) s += 6
  if (views >= 250000) s += 10; else if (views >= 100000) s += 6
  return clamp(s)
}
function scoreSensitivity(cat) {
  const c = String(cat || '').toLowerCase()
  if (c.includes('integrity')) return 90
  if (c.includes('religion')) return 90
  if (c.includes('race')) return 90
  if (c.includes('security')) return 85
  if (c.includes('economy')) return 75
  if (c.includes('public service')) return 65
  if (c.includes('infrastructure')) return 55
  return 50
}
function scoreCoordination(raw) {
  const t = String(raw || '').toLowerCase()
  if (t.includes('repeated') || t.includes('same message') || t.includes('identical')) return 80
  if (t.includes('multiple')) return 65
  if (t.includes('organic')) return 35
  return 45
}
function scoreLocality(loc) {
  if (!loc) return 35
  const t = String(loc).toLowerCase()
  if (t.includes('dun') || t.includes('pdm') || t.includes('locality')) return 88
  if (t.includes('melaka')) return 70
  if (t.includes('state')) return 55
  return 45
}

const PLATFORM_LABELS = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  manual: 'Manual',
  unknown: 'Public',
}

function parseEcho(stage) { const m = String(stage).match(/echo\s*(\d)/i); return m ? Number(m[1]) : 1 }

function getMetricValue(raw, key) {
  return parseNumber(raw?.metrics?.[key] ?? raw?.[key])
}

function getOptionalText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return ''
}

function buildCanonicalSignalRecord(raw = {}) {
  const platform = inferS2dPlatform(raw)
  const source = raw.source || {}
  const classification = raw.classification || {}
  const geography = raw.geography || {}
  const scores = raw.scores || {}
  const workflow = raw.workflow || {}
  const evidence = raw.evidence || {}
  const provenance = raw.provenance || {}
  const timestamps = raw.timestamps || {}

  const views = getMetricValue(raw, 'views')
  const likes = getMetricValue(raw, 'likes')
  const comments = getMetricValue(raw, 'comments')
  const shares = getMetricValue(raw, 'shares')
  const followers = getMetricValue(raw, 'followers')
  const mentions = getMetricValue(raw, 'mentions') || Math.round(comments + shares + likes * 0.15)
  const growth = getOptionalText(source.growthLabel, raw.growth, raw.growthLabel) || '+0% / 1h'
  const sourceType = getOptionalText(source.sourceType, raw.sourceType) || 'Public video'
  const issueCategory = getOptionalText(classification.primaryIssue, raw.issueCategory, raw.category, raw.primaryIssue) || 'Public service'
  const location = getOptionalText(geography.rawLabel, geography.localityName, raw.location, raw.locality) || 'Unassigned locality'
  const sparkPoint = getOptionalText(workflow.sparkPoint, raw.sparkPoint, raw.caption) || `${PLATFORM_LABELS[platform] || PLATFORM_LABELS.unknown} post detected as early public signal`
  const sentimentText = getOptionalText(classification.sentimentLabel, raw.sentimentLabel)
  const sentimentValue = raw.sentiment
  const sentimentRisk =
    scores.sentimentRisk ?? raw.sentimentRisk ?? raw.sentimentScore ?? (typeof sentimentValue === 'number' ? sentimentValue : scoreSentimentRisk(sentimentValue || sentimentText))

  const calculatedScores = {
    velocity: scores.velocity ?? raw.velocity ?? scoreVelocity(growth, views, comments, shares),
    reach: scores.reach ?? raw.reach ?? scoreReach(views, mentions),
    sentimentRisk: clamp(Number(sentimentRisk) || 0),
    influence: scores.influence ?? raw.influence ?? scoreInfluence(sourceType, shares, views),
    sensitivity: scores.sensitivity ?? raw.sensitivity ?? scoreSensitivity(issueCategory),
    coordination: scores.coordination ?? raw.coordination ?? scoreCoordination(sparkPoint || raw.coordinationNote),
    locality: scores.locality ?? raw.locality ?? scoreLocality(location),
    priority: scores.priority ?? raw.priority,
  }

  const canonical = adaptLegacySignalToS2dRecord(raw, {
    calculatedScores,
    defaultCollectionRunId: raw.collectionRunId || '',
  })

  const finalSignal = createS2dSignalRecord({
    ...canonical,
    schema: canonical.schema || 's2d.signal-record.v1',
    version: canonical.version || 1,
    signalId: canonical.signalId || raw.signalId || raw.id || '',
    collectionRunId: canonical.collectionRunId || raw.collectionRunId || '',
    platform: canonical.platform || platform,
    headline:
      canonical.headline ||
      raw.headline ||
      raw.title ||
      `${PLATFORM_LABELS[platform] || PLATFORM_LABELS.unknown} signal: ${getOptionalText(raw.keyword, raw.hashtag, raw.source?.keyword, raw.source?.hashtag) || 'tracked issue'}`,
    source: {
      ...canonical.source,
      sourceId: canonical.source?.sourceId || raw.source?.sourceId || '',
      sourceType,
      authorLabel: getOptionalText(source.authorLabel, raw.username, raw.author),
      url: getOptionalText(source.url, raw.url),
      text: getOptionalText(source.text, raw.caption, raw.text),
      keyword: getOptionalText(source.keyword, raw.keyword),
      hashtag: getOptionalText(source.hashtag, raw.hashtag),
      publishedAt: source.publishedAt ?? raw.publishedAt ?? null,
      collectedAt: source.collectedAt || raw.collectedAt || new Date().toISOString(),
    },
    metrics: {
      ...canonical.metrics,
      followers,
      views,
      likes,
      comments,
      shares,
      mentions,
      growthLabel: growth,
      engagement: likes + comments + shares,
    },
    classification: {
      ...canonical.classification,
      entities: Array.isArray(classification.entities) ? classification.entities : Array.isArray(raw.entities) ? raw.entities : [],
      primaryIssue: issueCategory,
      secondaryIssues: Array.isArray(classification.secondaryIssues) ? classification.secondaryIssues : Array.isArray(raw.secondaryIssues) ? raw.secondaryIssues : [],
      sentimentLabel: normalizeS2dSentimentLabel(sentimentText || sentimentValue),
      sentimentPolarity: normalizeS2dPolarity(classification.sentimentPolarity ?? raw.sentimentPolarity ?? raw.polarity, sentimentText || sentimentValue),
      sentimentConfidence: normalizeS2dConfidence(classification.sentimentConfidence ?? raw.sentimentConfidence ?? raw.confidence),
      emotions: Array.isArray(classification.emotions) ? classification.emotions : Array.isArray(raw.emotions) ? raw.emotions : [],
      narrativeClusterId: classification.narrativeClusterId ?? raw.narrativeClusterId ?? null,
    },
    geography: {
      ...canonical.geography,
      stateCode: geography.stateCode ?? raw.stateCode ?? null,
      parliamentCode: geography.parliamentCode ?? raw.parliamentCode ?? null,
      dunCode: geography.dunCode ?? raw.dunCode ?? null,
      dmCode: geography.dmCode ?? raw.dmCode ?? null,
      localityCode: geography.localityCode ?? raw.localityCode ?? null,
      localityName: getOptionalText(geography.localityName, raw.localityName, raw.location, geography.rawLabel),
      rawLabel: getOptionalText(geography.rawLabel, raw.rawLabel, raw.location, geography.localityName),
      confidence: normalizeS2dConfidence(geography.confidence ?? raw.localityConfidence ?? raw.geographyConfidence),
      basis: getOptionalText(geography.basis, raw.geographyBasis),
    },
    scores: {
      ...canonical.scores,
      velocity: clamp(scores.velocity ?? calculatedScores.velocity ?? 0),
      reach: clamp(scores.reach ?? calculatedScores.reach ?? 0),
      sentimentRisk: clamp(scores.sentimentRisk ?? calculatedScores.sentimentRisk ?? 0),
      influence: clamp(scores.influence ?? calculatedScores.influence ?? 0),
      sensitivity: clamp(scores.sensitivity ?? calculatedScores.sensitivity ?? 0),
      coordination: clamp(scores.coordination ?? calculatedScores.coordination ?? 0),
      locality: clamp(scores.locality ?? calculatedScores.locality ?? 0),
      priority: clamp(scores.priority ?? calculatedScores.priority ?? 0),
    },
    workflow: {
      ...canonical.workflow,
      stage: workflow.stage || raw.stage || 'Echo 1 - Early signal',
      echoNumber: clamp(parseEcho(workflow.stage || raw.stage || canonical.workflow?.stage || 'Echo 1 - Early signal'), 1, 5),
      approvalStatus: workflow.approvalStatus || raw.approvalStatus || 'Draft',
      analystNote: workflow.analystNote || raw.analystNote || 'Captured from intake. Verify facts before response.',
      sparkPoint,
      removed: workflow.removed ?? raw.removed ?? false,
    },
    evidence: {
      ...canonical.evidence,
      items: Array.isArray(evidence.items) ? evidence.items : Array.isArray(raw.evidenceLog) ? raw.evidenceLog : [],
      confidence: normalizeS2dConfidence(evidence.confidence ?? raw.evidenceConfidence ?? raw.confidence),
      status: getOptionalText(evidence.status, raw.evidenceStatus) || 'UNVERIFIED',
    },
    provenance: {
      ...canonical.provenance,
      sourceSystem: provenance.sourceSystem || raw.sourceSystem || '',
      adapterVersion: provenance.adapterVersion || raw.adapterVersion || 's2d.signal-adapter.v1',
      rawRecordId: provenance.rawRecordId || raw.rawRecordId || '',
      legacyRecordId: provenance.legacyRecordId || raw.id || raw.legacyRecordId || '',
    },
    timestamps: {
      ...canonical.timestamps,
      capturedAt: timestamps.capturedAt || raw.capturedAt || new Date().toISOString(),
      updatedAt: timestamps.updatedAt || raw.updatedAt || new Date().toISOString(),
    },
  })

  return finalSignal
}

function normalizeSignal(raw = {}) {
  return projectS2dSignalForLegacyUi(buildCanonicalSignalRecord(raw))
}
/* derived: S2D priority + echo number */
function s2dPriority(s) {
  const scores = isS2dSignalRecord(s) ? s.scores : (s?.scores || {})
  const legacy = s || {}
  const velocity = parseNumber(scores.velocity ?? legacy.velocity ?? legacy.scores?.velocity)
  const reach = parseNumber(scores.reach ?? legacy.reach ?? legacy.scores?.reach)
  const sensitivity = parseNumber(scores.sensitivity ?? legacy.sensitivity ?? legacy.scores?.sensitivity)
  const coordination = parseNumber(scores.coordination ?? legacy.coordination ?? legacy.scores?.coordination)
  const influence = parseNumber(scores.influence ?? legacy.influence ?? legacy.scores?.influence)
  const sentimentRisk = parseNumber(scores.sentimentRisk ?? legacy.sentimentRisk ?? legacy.sentimentScore ?? legacy.sentiment ?? legacy.scores?.sentimentRisk)
  return clamp(Math.round(
    velocity * 0.22 + reach * 0.18 + sensitivity * 0.22 +
    coordination * 0.16 + influence * 0.12 + sentimentRisk * 0.10,
  ))
}
function finalize(s) {
  const canonical = isS2dSignalRecord(s) ? createS2dSignalRecord(s) : buildCanonicalSignalRecord(s)
  const priority = s2dPriority(canonical)
  const echoNumber = clamp(parseEcho(canonical.workflow?.stage || canonical.stage || 'Echo 1 - Early signal'), 1, 5)
  const nextCanonical = createS2dSignalRecord({
    ...canonical,
    scores: { ...canonical.scores, priority },
    workflow: { ...canonical.workflow, echoNumber },
  })
  return projectS2dSignalForLegacyUi(nextCanonical)
}
function buildSignal(raw) { return finalize(raw) }

function tierOf(p) {
  if (p >= 72) return { label: 'Critical', color: T.red }
  if (p >= 58) return { label: 'High', color: T.amber }
  if (p >= 42) return { label: 'Watch', color: T.blue }
  return { label: 'Low', color: T.muted }
}

const ECHO_LABELS = ['Echo 1 - Early signal', 'Echo 2 - Community spread', 'Echo 3 - Influencer pickup', 'Echo 4 - Media pickup', 'Echo 5 - Public pressure']
const ECHO_SHORT = ['Echo 1', 'Echo 2', 'Echo 3', 'Echo 4', 'Echo 5']
const ISSUE_OPTIONS = ['Public service', 'Economy', 'Integrity', 'Infrastructure', 'Youth', 'Security', 'Local complaint']
const SOURCE_OPTIONS = ['Public video', 'Community page', 'Influencer', 'Political page', 'Media page', 'Comment cluster']
const SENTIMENT_OPTIONS = ['Negative', 'Neutral', 'Positive']

/* ---- helpers ------------------------------------------------------------- */
const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n) || 0)
const hashColor = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); const c = [T.blue, T.amber, T.purple, T.teal, T.green]; return c[Math.abs(h) % c.length] }

/* ===========================================================================
   SEED DATA  (raw → built on first load)
   =========================================================================== */
const SEED = [
  { id: 'TT-001', keyword: 'water disruption', hashtag: '#airmelaka', title: 'Water disruption complaint gaining traction', caption: 'Residents discussing water disruption timeline and asking for official clarification.', username: 'community_watch', url: 'https://www.tiktok.com/@s/video/1', issueCategory: 'Public service', location: 'Melaka Tengah / DUN Ayer Keroh', sourceType: 'Community page', views: 68000, likes: 4200, comments: 680, shares: 510, growth: '+218% / 6h', sentiment: 'Negative', stage: 'Echo 2 - Community spread', sparkPoint: 'Organic resident video reshared by community page', approvalStatus: 'Approved' },
  { id: 'TT-002', keyword: 'cost of living', hashtag: '#kosSaraHidup', title: 'Cost of living linked to youth jobs', caption: 'Youth users connecting cost of living concerns with job opportunity and income pressure.', username: 'youth_signal', url: 'https://www.tiktok.com/@s/video/2', issueCategory: 'Economy', location: 'Melaka / Youth cluster', sourceType: 'Public video', views: 240000, likes: 18000, comments: 2400, shares: 1600, growth: '+460% / 12h', sentiment: 'Negative', stage: 'Echo 3 - Influencer pickup', sparkPoint: 'Youth creator video picked up by multiple comment threads', approvalStatus: 'Draft' },
  { id: 'TT-003', keyword: 'project allocation', hashtag: '#projekrakyat', title: 'Rumour on project allocation spreading', caption: 'Comment section repeating unverified claim about local project allocation.', username: 'local_politics_watch', url: 'https://www.tiktok.com/@s/video/3', issueCategory: 'Integrity', location: 'Melaka Tengah / Locality cluster', sourceType: 'Political page', views: 410000, likes: 22000, comments: 6200, shares: 3100, growth: '+620% / 8h', sentiment: 'Negative', stage: 'Echo 4 - Media pickup', sparkPoint: 'Repeated identical captions amplified across multiple political pages', approvalStatus: 'Draft' },
  { id: 'TT-004', keyword: 'flood readiness', hashtag: '#banjirmelaka', title: 'Flood readiness questions before monsoon', caption: 'Residents asking about drainage upgrades ahead of monsoon season.', username: 'jasin_updates', url: 'https://www.tiktok.com/@s/video/4', issueCategory: 'Infrastructure', location: 'Jasin / DUN Bemban', sourceType: 'Community page', views: 31000, likes: 1900, comments: 240, shares: 180, growth: '+90% / 4h', sentiment: 'Neutral', stage: 'Echo 1 - Early signal', sparkPoint: 'Organic resident question post', approvalStatus: 'Draft' },
  { id: 'TT-005', keyword: 'clinic waiting time', hashtag: '#klinikkesihatan', title: 'Long clinic waiting time complaints', caption: 'Patients sharing long waiting times at a district clinic.', username: 'alorgajah_voice', url: 'https://www.tiktok.com/@s/video/5', issueCategory: 'Public service', location: 'Alor Gajah / DUN Rembia', sourceType: 'Public video', views: 84000, likes: 5100, comments: 920, shares: 430, growth: '+150% / 5h', sentiment: 'Negative', stage: 'Echo 2 - Community spread', sparkPoint: 'Organic patient video, several supporting comments', approvalStatus: 'Draft' },
  { id: 'TT-006', keyword: 'school bus safety', hashtag: '#busSekolah', title: 'School bus safety concern resolved fast', caption: 'Parents raised a bus safety concern; local response acknowledged.', username: 'parent_group_mlk', url: 'https://www.tiktok.com/@s/video/6', issueCategory: 'Public service', location: 'Melaka Tengah / DUN Kota Laksamana', sourceType: 'Community page', views: 22000, likes: 1500, comments: 160, shares: 95, growth: '+40% / 3h', sentiment: 'Positive', stage: 'Echo 1 - Early signal', sparkPoint: 'Organic parent post, official reply noted', approvalStatus: 'Approved' },
  { id: 'TT-007', keyword: 'youth unemployment', hashtag: '#kerjamuda', title: 'Youth unemployment frustration rising', caption: 'Creator highlighting limited job openings for fresh graduates.', username: 'gradlife_my', url: 'https://www.tiktok.com/@s/video/7', issueCategory: 'Youth', location: 'Melaka / Youth cluster', sourceType: 'Influencer', views: 320000, likes: 26000, comments: 4100, shares: 2700, growth: '+390% / 10h', sentiment: 'Negative', stage: 'Echo 3 - Influencer pickup', sparkPoint: 'Influencer video, multiple stitch reactions', approvalStatus: 'Draft' },
  { id: 'TT-008', keyword: 'road potholes', hashtag: '#jalanrosak', title: 'Pothole damage on main road', caption: 'Motorbike riders reporting potholes causing damage.', username: 'gadek_rider', url: 'https://www.tiktok.com/@s/video/8', issueCategory: 'Infrastructure', location: 'Alor Gajah / DUN Gadek', sourceType: 'Public video', views: 47000, likes: 2600, comments: 410, shares: 260, growth: '+120% / 6h', sentiment: 'Negative', stage: 'Echo 2 - Community spread', sparkPoint: 'Organic rider video', approvalStatus: 'Draft' },
  { id: 'TT-009', keyword: 'safety rumour', hashtag: '#amaranMelaka', title: 'Unverified public-safety claim circulating', caption: 'Comment clusters repeating an unverified safety warning.', username: 'anon_alerts', url: 'https://www.tiktok.com/@s/video/9', issueCategory: 'Security', location: 'Melaka Tengah / Locality cluster', sourceType: 'Comment cluster', views: 190000, likes: 9000, comments: 5400, shares: 2900, growth: '+540% / 7h', sentiment: 'Angry', stage: 'Echo 2 - Community spread', sparkPoint: 'Same message repeated across multiple accounts', approvalStatus: 'Draft' },
  { id: 'TT-010', keyword: 'subsidy delay', hashtag: '#subsidilewat', title: 'Subsidy disbursement delay raised by media page', caption: 'Local media page asking about a delayed subsidy disbursement.', username: 'berita_mlk', url: 'https://www.tiktok.com/@s/video/10', issueCategory: 'Economy', location: 'Jasin / DUN Nyalas', sourceType: 'Media page', views: 270000, likes: 12000, comments: 3300, shares: 1800, growth: '+300% / 9h', sentiment: 'Negative', stage: 'Echo 3 - Influencer pickup', sparkPoint: 'Media page post, multiple shares', approvalStatus: 'Approved' },
]

/* ===========================================================================
   STORAGE  (window.storage with in-memory fallback — no localStorage)
   =========================================================================== */
const storage = {
  async get(key, fallback) {
    try { if (typeof window !== 'undefined' && window.storage) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback } } catch (e) {}
    return fallback
  },
  async set(key, value) {
    try { if (typeof window !== 'undefined' && window.storage) await window.storage.set(key, JSON.stringify(value)) } catch (e) {}
  },
}
const LEGACY_SIGNAL_STORAGE_KEY = 's2d-signals-v1'
const LEGACY_SCRAPE_STORAGE_KEY = 's2d-scrape-v1'
const LEGACY_WATCHLIST_STORAGE_KEY = 's2d-watchlist-v1'
const LEGACY_SCRAPER_CFG_KEY = 's2d-scraper-cfg'
const durableStorage = createS2dDurableStorageGateway({
  legacyStorage: storage,
});
const ingestionArtifactStore = createS2dIngestionArtifactStore({
  legacyStorage: storage,
});
const ingestionPipeline = createS2dIngestionPipeline({
  artifactStore: ingestionArtifactStore,
  buildSignal,
});
const ingestionRecoveryService = createS2dIngestionRecoveryService({
  artifactStore: ingestionArtifactStore,
  pipeline: ingestionPipeline,
});
const monitoringProfileStore = createS2dMonitoringProfileStore({
  legacyStorage: storage,
});
const monitoringProfileService = createS2dMonitoringProfileService({
  store: monitoringProfileStore,
});
const collectionExecutionClient = createS2dCollectionExecutionClient();
const datasetRetrievalClient = createS2dDatasetRetrievalClient();
const scheduleClient = createS2dCollectionScheduleClient();
const webhookEventClient = createS2dWebhookEventClient();
const remoteActivationClient = createS2dRemoteActivationClient();
const runReconciliationClient = createS2dRunReconciliationClient();
const rawEvidenceStagingClient = createS2dRawEvidenceStagingClient();
const phase1AcceptanceClient = createS2dPhase1AcceptanceClient();
const annotationDurableStore = createS2dAnnotationDurableStore();
const annotationWorkflowService = createS2dAnnotationWorkflowService({ store: annotationDurableStore });
const annotationSuggestionService = createS2dAnnotationSuggestionService();
const annotationAcceptanceService =
  createS2dAnnotationPlatformAcceptanceService({
    store: annotationDurableStore,
    workflowService: annotationWorkflowService,
  });
const S2D2C2_TEST_DB_NAME =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('s2d2c2TestDb') || ''
    : '';
const S2D2C3_STAGING_TEST_DB_NAME =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('s2d2c3StagingTestDb') || ''
    : '';
const S2D2C3_ANNOTATION_TEST_DB_NAME =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('s2d2c3AnnotationTestDb') || ''
    : '';
const S2D_CORPUS_RUNTIME =
  typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('s2dCorpusRuntime') || 'johor').toLowerCase()
    : 'johor';
const S2D_RUNTIME_IS_MELAKA = S2D_CORPUS_RUNTIME === 'melaka';
const S2D_RUNTIME_CORPUS_ID = S2D_RUNTIME_IS_MELAKA ? 'S2D-MLK-PILOT-2026' : 'S2D-JHR-DN16-2026';
const S2D_RUNTIME_SAMPLING_MANIFEST_ID = S2D_RUNTIME_IS_MELAKA
  ? 'S2D-MLK-PILOT-2026-ANNOTATION-PROMOTION-V1'
  : 'S2D-JHR-DN16-2026-SAMPLING-V1';
const S2D_RUNTIME_STAGING_DB_DEFAULT = S2D_RUNTIME_IS_MELAKA
  ? 's2d-melaka-pilot-corpus-db'
  : 's2d-johor-reference-corpus-db';
const S2D_RUNTIME_PACKAGE_SCHEMA = S2D_RUNTIME_IS_MELAKA
  ? 's2d.melaka-public-source-package.v1'
  : 's2d.johor-public-source-package.v1';
const S2D_RUNTIME_STAGING_TITLE = S2D_RUNTIME_IS_MELAKA ? 'Melaka Pilot Corpus Staging' : 'Johor Corpus Staging';
const S2D_RUNTIME_DUAL_TITLE = S2D_RUNTIME_IS_MELAKA ? 'Melaka Pilot Dual Annotation' : 'Johor Dual Annotation';
const S2D_RUNTIME_STAGING_BATCH_LABEL = S2D_RUNTIME_IS_MELAKA ? 'Batch S2D-10D.4' : 'Batch S2D-2C.2';
const S2D_RUNTIME_DUAL_BATCH_LABEL = S2D_RUNTIME_IS_MELAKA ? 'Batch S2D-10D.4' : 'Batch S2D-2C.3';
const S2D2C3_ISOLATED_TEST_MODE = Boolean(S2D2C3_STAGING_TEST_DB_NAME || S2D2C3_ANNOTATION_TEST_DB_NAME);
const johorCorpusStagingStore =
  createS2dJohorCorpusStagingStore({
    databaseName: S2D2C3_STAGING_TEST_DB_NAME || S2D2C2_TEST_DB_NAME || S2D_RUNTIME_STAGING_DB_DEFAULT,
  });

const johorCorpusAcquisitionService =
  createS2dJohorCorpusAcquisitionService({
    stagingStore: johorCorpusStagingStore,
  });
const S2D2C3_CORPUS_STAGING_DATABASE_NAME = S2D2C3_STAGING_TEST_DB_NAME || S2D_RUNTIME_STAGING_DB_DEFAULT;
const S2D2C3_ANNOTATION_DATABASE_NAME = S2D2C3_ANNOTATION_TEST_DB_NAME || 's2d-360-intelligence-db';
const johorAnnotationStore = S2D2C3_ISOLATED_TEST_MODE
  ? createS2dAnnotationDurableStore({
      databaseName: S2D2C3_ANNOTATION_DATABASE_NAME,
    })
  : annotationDurableStore;
const johorAnnotationWorkflowService = S2D2C3_ISOLATED_TEST_MODE
  ? createS2dAnnotationWorkflowService({
      store: johorAnnotationStore,
    })
  : annotationWorkflowService;
const johorDualAnnotationService =
  createS2dJohorDualAnnotationService({
    runtimeMode: S2D2C3_ISOLATED_TEST_MODE ? 'ISOLATED_TEST' : 'PRODUCTION',
    corpusId: S2D_RUNTIME_CORPUS_ID,
    stagingStore: johorCorpusStagingStore,
    annotationStore: johorAnnotationStore,
    annotationWorkflowService: johorAnnotationWorkflowService,
  });
const johorCorpusAcceptanceService =
  createS2dJohorCorpusAcceptanceService({
    corpusId: S2D_RUNTIME_CORPUS_ID,
    stagingStore: johorCorpusStagingStore,
    annotationStore: johorAnnotationStore,
    dualAnnotationService: johorDualAnnotationService,
  });
const dailySentimentSnapshotService =
  createS2dDailySentimentSnapshotService({
    annotationService: johorAnnotationStore,
    johorCorpusAcceptanceService,
  });
const localSignalProfileService =
  createS2dLocalSignalProfileService({
    dailySentimentSnapshotService,
  });
const automatedDescriptiveReportService =
  createS2dAutomatedDescriptiveReportService({
    dailySentimentSnapshotService,
    localSignalProfileService,
  });
const changePointDetectionService =
  createS2dChangePointDetectionService({
    dailySentimentSnapshotService,
    localSignalProfileService,
    automatedDescriptiveReportService,
  });
const narrativeDriverDecompositionService =
  createS2dNarrativeDriverDecompositionService({
    changePointDetectionService,
    dailySentimentSnapshotService,
    localSignalProfileService,
    automatedDescriptiveReportService,
  });
const narrativePropagationGraphService =
  createS2dNarrativePropagationGraphService({
    changePointDetectionService,
    narrativeDriverDecompositionService,
    automatedDescriptiveReportService,
  });
const diagnosticCaseBuilderService =
  createS2dDiagnosticCaseBuilderService({
    changePointDetectionService,
    narrativeDriverDecompositionService,
    narrativePropagationGraphService,
    automatedDescriptiveReportService,
    localSignalProfileService,
  });
const forecastTargetService =
  createS2dForecastTargetService({
    dailySentimentSnapshotService,
    localSignalProfileService,
    automatedDescriptiveReportService,
    narrativePropagationGraphService,
  });
const baselineForecastingService =
  createS2dBaselineForecastingService({
    forecastTargetService,
    changePointDetectionService,
    narrativePropagationGraphService,
  });
const featureEngineeringService =
  createS2dFeatureEngineeringService({
    forecastTargetService,
    baselineForecastingService,
    dailySentimentSnapshotService,
    localSignalProfileService,
    narrativePropagationGraphService,
  });
const predictiveModelTrainingService =
  createS2dPredictiveModelTrainingService({
    featureEngineeringService,
    baselineForecastingService,
    forecastTargetService,
    narrativePropagationGraphService,
  });
const backtestingCalibrationService =
  createS2dBacktestingCalibrationService({
    predictiveModelTrainingService,
    featureEngineeringService,
    forecastTargetService,
  });
const decisionPolicyService =
  createS2dDecisionPolicyService({
    diagnosticCaseBuilderService,
    narrativePropagationGraphService,
    backtestingCalibrationService,
  });
const recommendationScoringService =
  createS2dRecommendationScoringService({
    decisionPolicyService,
    diagnosticCaseBuilderService,
    backtestingCalibrationService,
    narrativePropagationGraphService,
  });
const recommendationJustificationService =
  createS2dRecommendationJustificationService({
    policyService: decisionPolicyService,
    scoringService: recommendationScoringService,
    listCases: async () => {
      const report = await diagnosticCaseBuilderService.buildCasesForDate({});
      return Array.isArray(report?.cases) ? report.cases : [];
    },
  });
const narrativeContentBriefService =
  createS2dNarrativeContentBriefService({
    recommendationJustificationService,
    decisionPolicyService,
    diagnosticCaseBuilderService,
  });
const dailyIntelligenceBriefService =
  createS2dDailyIntelligenceBriefService({
    dailySentimentSnapshotService,
    localSignalProfileService,
    automatedDescriptiveReportService,
    changePointDetectionService,
    narrativeDriverDecompositionService,
    diagnosticCaseBuilderService,
    forecastTargetService,
    backtestingCalibrationService,
    recommendationJustificationService,
  });
const weeklyDiagnosticReportService =
  createS2dWeeklyDiagnosticReportService({
    dailyIntelligenceBriefService,
    dailySentimentSnapshotService,
    localSignalProfileService,
    changePointDetectionService,
    narrativeDriverDecompositionService,
    narrativePropagationGraphService,
    diagnosticCaseBuilderService,
    forecastTargetService,
    backtestingCalibrationService,
    recommendationJustificationService,
  });
const constituencyIntelligenceReportService =
  createS2dConstituencyIntelligenceReportService({
    dailySentimentSnapshotService,
    localSignalProfileService,
    weeklyDiagnosticReportService,
    narrativePropagationGraphService,
    diagnosticCaseBuilderService,
    backtestingCalibrationService,
    recommendationJustificationService,
  });
const afterActionEffectivenessService =
  createS2dAfterActionEffectivenessService({
    annotationStore: johorAnnotationStore,
    recommendationJustificationService,
    decisionPolicyService,
    narrativePropagationGraphService,
    localSignalProfileService,
    constituencyIntelligenceReportService,
  });
const johorModelPackStore =
  createS2dJohorModelPackStore();

const stateTransferPlanStore =
  createS2dStateTransferPlanStore();

const johorModelPackService =
  createS2dJohorModelPackService({
    johorCorpusAcquisitionService,
    johorCorpusAcceptanceService,
    annotationStore: johorAnnotationStore,
    annotationWorkflowService: johorAnnotationWorkflowService,
    dailySentimentSnapshotService,
    forecastTargetService,
    baselineForecastingService,
    featureEngineeringService,
    predictiveModelTrainingService,
    backtestingCalibrationService,
    modelPackStore: johorModelPackStore,
  });

const stateLearningSeparationService =
  createS2dStateLearningSeparationService({
    stateTransferPlanStore,
  });

const domainAdaptationStore =
  createS2dDomainAdaptationStore();

const domainAdaptationService =
  createS2dDomainAdaptationService({
    stateLearningSeparationService,
    stateTransferPlanStore,
    johorModelPackService,
    johorModelPackStore,
    adaptationStore: domainAdaptationStore,
    annotationStore: johorAnnotationStore,
    annotationWorkflowService: johorAnnotationWorkflowService,
    featureEngineeringService,
    forecastTargetService,
    baselineForecastingService,
    predictiveModelTrainingService,
    backtestingCalibrationService,
  });

const pipSharedContractService =
  createS2dPipSharedContractService();
const pipIntelligenceApiService =
  createS2dPipIntelligenceApiService({
    sharedContractService: pipSharedContractService,
    dailySentimentSnapshotService,
    narrativePropagationGraphService,
    diagnosticCaseBuilderService,
    backtestingCalibrationService,
    recommendationJustificationService,
  });
const pipContextFusionService =
  createS2dPipContextFusionService({
    sharedContractService: pipSharedContractService,
    intelligenceApiService: pipIntelligenceApiService,
    backtestingCalibrationService,
  });
const PHASE1_CLOSURE_MANIFEST_STATUS = "PASSED";
const S2D2B_CLOSURE_MANIFEST_STATUS = "PASSED";
const S2D2C1_CORPUS_CONTRACT_STATUS = "PASSED";
const S2D2C2_CORPUS_STAGING_STATUS = "PASSED";
const S2D2C3_DUAL_ANNOTATION_IMPLEMENTATION_STATUS = "PASSED";
const S2D2C4_CORPUS_ACCEPTANCE_IMPLEMENTATION_STATUS = "PASSED";
const S2D3A_DAILY_SENTIMENT_SNAPSHOTS_STATUS = "PASSED";
const S2D3B_LOCAL_SIGNAL_PROFILES_STATUS = "PASSED";
const S2D3C_AUTOMATED_DESCRIPTIVE_REPORTS_STATUS = "PASSED";
const S2D4A_CHANGE_POINT_DETECTION_STATUS = "PASSED";
const S2D4B_NARRATIVE_DRIVER_DECOMPOSITION_STATUS = "PASSED";
const S2D4C_NARRATIVE_PROPAGATION_GRAPH_STATUS = "PASSED";
const S2D4D_DIAGNOSTIC_CASE_BUILDER_STATUS = "PASSED";
const S2D5A_FORECAST_TARGETS_STATUS = "PASSED";
const S2D5B_BASELINE_FORECASTING_STATUS = "PASSED";
const S2D5C_FEATURE_ENGINEERING_STATUS = "PASSED";
const S2D5D_PREDICTIVE_MODEL_TRAINING_STATUS = "PASSED";
const S2D5E_BACKTESTING_CALIBRATION_STATUS = "PASSED";
const S2D6A_DECISION_POLICY_ENGINE_STATUS = "PASSED";
const S2D6B_RECOMMENDATION_SCORING_STATUS = "PASSED";
const S2D6C_RECOMMENDATION_JUSTIFICATION_STATUS = "PASSED";
const S2D6D_NARRATIVE_CONTENT_BRIEF_STATUS = "PASSED";
const S2D7A_DAILY_INTELLIGENCE_BRIEF_STATUS = "PASSED";
const S2D7B_WEEKLY_DIAGNOSTIC_REPORT_STATUS = "PASSED";
const S2D7C_CONSTITUENCY_INTELLIGENCE_REPORT_STATUS = "PASSED";
const S2D7D_AFTER_ACTION_EFFECTIVENESS_STATUS = "PASSED";
const S2D8A_JOHOR_MODEL_PACK_STATUS = "PASSED";
const S2D8B_STATE_LEARNING_SEPARATION_STATUS = "PASSED";
const S2D8C_DOMAIN_ADAPTATION_STATUS = "PASSED";
const S2D9A_SHARED_CONTRACTS_STATUS = "PASSED";
const S2D9A_PIP_RUNTIME_CONNECTION_STATUS = "DISABLED";
const S2D9A_PIP_PRODUCTION_ACTIVATION_STATUS = "NOT_AUTHORISED";
const S2D9B_INTELLIGENCE_API_STATUS = "PASSED";
const S2D9B_API_RUNTIME_MODE = "CONTROLLED_LOCAL";
const S2D9B_API_VERSION = "v1";
const S2D9B_PUBLIC_NETWORK_EXPOSURE_STATUS = "DISABLED";
const S2D9B_PIP_RUNTIME_CONNECTION_STATUS = "DISABLED";
const S2D9B_PRODUCTION_ACTIVATION_STATUS = "NOT_AUTHORISED";
const S2D9B_AUTOMATIC_EXECUTION_STATUS = "DISABLED";
const S2D9B_AUTOMATIC_PUBLICATION_STATUS = "DISABLED";
const S2D9C_PIP_CONTEXT_FUSION_STATUS = "PASSED";
const S2D9C_RUNTIME_MODE = "CONTROLLED_IMPORT";
const S2D9C_JOIN_POLICY = "EXACT_GEOGRAPHY_CODE_ONLY";
const S2D9C_PIP_RUNTIME_CONNECTION_STATUS = "DISABLED";
const S2D9C_PIP_WRITE_STATUS = "DISABLED";
const S2D9C_PRODUCTION_ACTIVATION_STATUS = "NOT_AUTHORISED";
const S2D9C_SOCIAL_VOTER_LINKAGE_STATUS = "PROHIBITED";
const S2D9C_INDIVIDUAL_TARGETING_STATUS = "DISABLED";
const S2D9C_DEMOGRAPHIC_TARGETING_STATUS = "DISABLED";
const S2D9C_MICROTARGETING_STATUS = "DISABLED";
const S2D9C_PERSONALISED_PERSUASION_STATUS = "DISABLED";
function useSignalStore() {
  const [signals, setSignals] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [storageStatus, setStorageStatus] = useState({ mode: 'uninitialised' })
  const signalsRef = useRef([])
  useEffect(() => { signalsRef.current = signals }, [signals])
  useEffect(() => {
    let alive = true
    durableStorage.getSignals(SEED.map(buildSignal)).then((records) => {
      if (!alive) return
      const normalized = normalizeStoredS2dSignals(records, {})
      const reconciled = reconcileDuplicateS2dSignalIds(normalized)
      setSignals(reconciled.records)
      signalsRef.current = reconciled.records
      setLoaded(true)
      setStorageStatus(durableStorage.getStorageStatus())
      if (reconciled.changed) {
        void durableStorage.setSignals(reconciled.records)
      }
    }).catch(() => {
      if (!alive) return
      const fallback = normalizeStoredS2dSignals(SEED.map(buildSignal), {})
      const reconciled = reconcileDuplicateS2dSignalIds(fallback)
      setSignals(reconciled.records)
      signalsRef.current = reconciled.records
      setLoaded(true)
      setStorageStatus(durableStorage.getStorageStatus())
      if (reconciled.changed) {
        void durableStorage.setSignals(reconciled.records)
      }
    })
       
    return () => { alive = false }
  }, [])
  
  const removeSignal = useCallback((id) => {
  setSignals((prev) => {
    const next = prev.map((s) =>
      s.id === id
        ? applyLegacyPatchToS2dSignal(s, {
            removed: true,
            approvalStatus: 'Removed',
            updatedAt: new Date().toISOString(),
          })
        : s
    );

    void durableStorage.setSignals(next);
    return next;
  });
}, []);

const deleteSignal = useCallback((id) => {
  setSignals((prev) => {
    const next = prev.filter((s) => s.id !== id);
    void durableStorage.setSignals(next);
    return next;
  });
}, []);

  const addSignal = useCallback((raw) => setSignals((cur) => {
    const inserted = createUniqueS2dSignalForInsert(raw, cur, {})
    const next = [inserted, ...cur]
    signalsRef.current = next
    void durableStorage.setSignals(next)
    return next
  }), [])
  const patchSignal = useCallback((id, patch) => setSignals((cur) => {
    const next = cur.map((s) => s.id === id ? applyLegacyPatchToS2dSignal(s, patch) : s)
    void durableStorage.setSignals(next)
    return next
  }), [])
  
  const reset = useCallback(() => {
  const next = [];
  setSignals(next);
  signalsRef.current = next
  void durableStorage.setSignals(next);
}, []);

  const ingestScrapedRecords = useCallback(async (records, options = {}) => {
    const existingSignals = Array.isArray(signalsRef.current) ? signalsRef.current : []
    const result = await ingestionPipeline.ingestScrapedRecords(records, {
      existingSignals,
      issueMap: PIP_TO_S2D_ISSUE,
      sourceTypeMap: SC_SOURCE,
      collectionRunId: options.collectionRunId || '',
      actorId: options.actorId || '',
      datasetId: options.datasetId || '',
    })

    const accepted = Array.isArray(result.acceptedSignals) ? result.acceptedSignals : []
    if (!accepted.length) {
      return result
    }

    const existingIds = new Set(existingSignals.map((s) => s.signalId || s.id).filter(Boolean))
    const uniqueAccepted = accepted.filter((s) => {
      const id = s.signalId || s.id
      if (!id || existingIds.has(id)) {
        return false
      }
      existingIds.add(id)
      return true
    })

    if (!uniqueAccepted.length) {
      return result
    }

    const next = [...uniqueAccepted, ...existingSignals]
    setSignals(next)
    signalsRef.current = next
    void durableStorage.setSignals(next)
    setStorageStatus(durableStorage.getStorageStatus())
    return result
  }, [])

  const commitRecoveredSignals = useCallback((records) => {
    const input = Array.isArray(records) ? records : []
    const existingSignals = Array.isArray(signalsRef.current) ? signalsRef.current : []
    const existingIds = new Set(existingSignals.map((s) => s.signalId || s.id).filter(Boolean))
    const recovered = []

    for (const record of input) {
      const id = record?.signalId || record?.id
      if (!id || existingIds.has(id)) {
        continue
      }
      existingIds.add(id)
      recovered.push(record)
    }

    if (!recovered.length) {
      return 0
    }

    const next = [...recovered, ...existingSignals]
    setSignals(next)
    signalsRef.current = next
    void durableStorage.setSignals(next)
    return recovered.length
  }, [])

  return { signals, loaded, storageStatus, addSignal, patchSignal, removeSignal, deleteSignal, reset, ingestScrapedRecords, commitRecoveredSignals };
}
function useWatchlistStore() {
  const SEED_W = [
    { id: 'W1', term: '#airmelaka', kind: 'hashtag', issueCategory: 'Public service', location: 'Melaka Tengah / DUN Ayer Keroh' },
    { id: 'W2', term: 'cost of living', kind: 'keyword', issueCategory: 'Economy', location: 'Melaka / Youth cluster' },
    { id: 'W3', term: '#projekrakyat', kind: 'hashtag', issueCategory: 'Integrity', location: 'Melaka Tengah / Locality cluster' },
  ]
  const [items, setItems] = useState([])
  useEffect(() => { durableStorage.getWatchlist(SEED_W).then((d) => setItems(d || SEED_W)).catch(() => setItems(SEED_W)) }, [])
  const save = useCallback((next) => { setItems(next); void durableStorage.setWatchlist(next) }, [])
  return { items, save }
}
function useScrapeStore() {
  const [scraped, setScraped] = useState([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { durableStorage.getScrapeRecords([]).then((d) => { setScraped(d || []); setLoaded(true) }).catch(() => { setScraped([]); setLoaded(true) }) }, [])
  const add = useCallback((items) => setScraped((cur) => {
    const seen = new Set(cur.map((x) => x.id))
    const next = [...items.filter((x) => !seen.has(x.id)), ...cur].slice(0, 3000)
    void durableStorage.setScrapeRecords(next); return next
  }), [])
  const remove = useCallback((id) => setScraped((cur) => { const next = cur.filter((x) => x.id !== id); void durableStorage.setScrapeRecords(next); return next }), [])
  const clear = useCallback(() => { setScraped([]); void durableStorage.setScrapeRecords([]) }, [])
  return { scraped, loaded, add, remove, clear }
}

/* ===========================================================================
   SHARED PRIMITIVES
   =========================================================================== */
const S = {
  card: { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 },
  label: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: T.muted, fontWeight: 600, fontFamily: FONT_BODY },
  input: { width: '100%', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px', color: T.text, fontSize: 13.5, fontFamily: FONT_BODY, outline: 'none' },
}
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: T.sub }}>{label}</span>
        <span style={{ color, fontFamily: FONT_MONO, fontWeight: 600 }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 6, background: T.bg2, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  )
}
function Field({ label, children, hint }) {
  return <label style={{ display: 'block' }}><div style={{ ...S.label, marginBottom: 6 }}>{label}</div>{children}{hint && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{hint}</div>}</label>
}
function FInput(props) { return <input {...props} style={{ ...S.input, ...(props.style || {}) }} /> }
function FSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ ...S.input, cursor: 'pointer' }}>
      {options.map((o) => (
        <option key={o || 'blank'} value={o} style={{ background: T.bg2 }}>
          {o || 'Select scan type'}
        </option>
      ))}
    </select>
  )
}
function Btn({ children, onClick, accent = T.blue, ghost, disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: ghost ? 'transparent' : accent, border: `1px solid ${accent}`, color: ghost ? accent : '#06121a', padding: '9px 16px', borderRadius: 10, fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>{children}</button>
}
function Toast({ toast }) {
  if (!toast) return null
  return <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 100, background: T.card3, border: `1px solid ${toast.color || T.green}`, borderLeft: `3px solid ${toast.color || T.green}`, borderRadius: 10, padding: '12px 16px', color: T.text, fontSize: 13, fontFamily: FONT_BODY, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>{toast.msg}</div>
}
function Empty({ msg }) { return <div style={{ ...S.card, padding: 36, textAlign: 'center', color: T.muted, fontSize: 13.5 }}>{msg}</div> }

/* radar of the 7-axis S2D score */
function S2DRadar({ signal, accent = T.blue }) {
  const data = [
    { k: 'Velocity', v: signal.velocity }, { k: 'Reach', v: signal.reach },
    { k: 'Sentiment', v: signal.sentiment }, { k: 'Influence', v: signal.influence },
    { k: 'Sensitivity', v: signal.sensitivity }, { k: 'Coordination', v: signal.coordination },
    { k: 'Locality', v: signal.locality },
  ]
  return (
    <div style={{ height: 230 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={T.border} />
          <PolarAngleAxis dataKey="k" tick={{ fill: T.sub, fontSize: 10.5 }} />
          <Radar dataKey="v" stroke={accent} fill={accent} fillOpacity={0.28} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ===========================================================================
   MODULE 1 — COMMAND TOWER
   =========================================================================== */
function CommandTower({ signals, go }) {
  const stats = useMemo(() => {
    const total = signals.length
    const critical = signals.filter((s) => s.priority >= 72).length
    const high = signals.filter((s) => s.priority >= 58 && s.priority < 72).length
    const avgVel = total ? Math.round(signals.reduce((a, s) => a + s.velocity, 0) / total) : 0
    const negPct = total ? Math.round((signals.filter((s) => s.sentiment >= 80).length / total) * 100) : 0
    const sensitive = signals.filter((s) => s.sensitivity >= 85).length
    const pending = signals.filter((s) => s.approvalStatus === 'Draft').length
    return { total, critical, high, avgVel, negPct, sensitive, pending }
  }, [signals])

  const echoData = useMemo(() => ECHO_SHORT.map((e, i) => ({ name: e, count: signals.filter((s) => s.echoNum === i + 1).length })), [signals])
  const catData = useMemo(() => {
    const m = {}; signals.forEach((s) => { m[s.issueCategory] = (m[s.issueCategory] || 0) + 1 })
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [signals])
  const catMixData = useMemo(() => {
    const total = catData.reduce((acc, item) => acc + item.count, 0)
    return catData.map((item) => ({
      ...item,
      pct: total ? Math.round((item.count / total) * 100) : 0,
    }))
  }, [catData])
  const topEmerging = useMemo(() => [...signals].sort((a, b) => b.priority - a.priority).slice(0, 5), [signals])
  const lead = topEmerging[0]
  const issuePalette = [T.teal, T.blue, T.purple, T.amber, T.green, '#7dd3fc', '#5eead4']
  const systemLog = useMemo(() => {
    const lines = [
      `S2D 360 :: decision-support over public signals :: human approval required before any response`,
      `Storage: IndexedDB Core DB v4 :: Annotation: Human review :: Apify execution: Manual`,
      `Dataset retrieval: Controlled`,
      `Monitoring queue: ${stats.total} active signal(s)`,
      `Critical threshold crossed: ${stats.critical}`,
      `Negative sentiment concentration: ${stats.negPct}%`,
      `Pipeline state: PHASE-1 accepted :: PHASE-2 audience shell aligned`,
      `Operational readiness: ${stats.pending} awaiting decision item(s)`,
      `Lifecycle clocks: ingestion -> normalization -> scoring -> escalation -> decision`,
    ]
    return lines.join(' | ')
  }, [stats])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Executive roll-up" title="Command Tower" accent={T.green} sub="Live picture across every tracked signal" />
      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card"><KPI label="Active signals" value={stats.total} accent={T.green} /></div>
        <div className="cmd-kpi-card"><KPI label="Critical" value={stats.critical} accent={T.red} dot={stats.critical ? T.red : undefined} delta={`${stats.high} high`} /></div>
        <div className="cmd-kpi-card"><KPI label="Avg velocity" value={stats.avgVel} accent={T.blue} /></div>
        <div className="cmd-kpi-card"><KPI label="Negative tone" value={`${stats.negPct}%`} accent={T.amber} /></div>
        <div className="cmd-kpi-card"><KPI label="Sensitivity alerts" value={stats.sensitive} accent={T.purple} dot={stats.sensitive ? T.purple : undefined} /></div>
        <div className="cmd-kpi-card"><KPI label="Awaiting decision" value={stats.pending} accent={T.gold} dot={stats.pending ? T.gold : undefined} /></div>
      </div>

      {lead && (
        <div style={{ ...S.card, padding: 16, border: `1px solid ${T.border}`, boxShadow: `inset 0 0 0 1px ${T.blue}22`, background: `linear-gradient(90deg, ${T.blue}14 0%, ${T.red}14 100%)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...S.label, color: tierOf(lead.priority).color }}>Highest priority right now</div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginTop: 4 }}>{lead.title}</div>
            <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>{lead.location} · {lead.issueCategory} · {ECHO_SHORT[lead.echoNum - 1]} · velocity {Math.round(lead.velocity)}</div>
          </div>
          <Btn accent={T.blue} onClick={() => go('decision')}>Review in Decision Console →</Btn>
        </div>
      )}

      <div className="cmd-two-col-grid">
        <Panel title="Echo stage distribution" accent={T.purple}>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={echoData}>
                <XAxis dataKey="name" tick={{ fill: T.sub, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                <YAxis tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
<Tooltip
  cursor={{ fill: 'rgba(96, 165, 250, 0.12)' }}
  contentStyle={{
    background: '#101a29',
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: '#e8f1ff',
    boxShadow: '0 12px 30px rgba(0,0,0,.45)'
  }}
  labelStyle={{
    color: '#ffffff',
    fontWeight: 800
  }}
  itemStyle={{
    color: '#7dd3fc',
    fontWeight: 800
  }}
  wrapperStyle={{
    outline: 'none'
  }}
/>
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>{echoData.map((_, i) => <Cell key={i} fill={[T.green, T.blue, T.purple, T.amber, T.red][i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Issue category mix" accent={T.teal}>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catMixData} layout="vertical" margin={{ left: 10, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fill: T.sub, fontSize: 11 }} width={92} axisLine={false} tickLine={false} />
<Tooltip
  cursor={{ fill: 'rgba(96, 165, 250, 0.12)' }}
  contentStyle={{
    background: '#101a29',
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: '#e8f1ff',
    boxShadow: '0 12px 30px rgba(0,0,0,.45)'
  }}
  labelStyle={{
    color: '#ffffff',
    fontWeight: 800
  }}
  itemStyle={{
    color: '#7dd3fc',
    fontWeight: 800
  }}
  wrapperStyle={{
    outline: 'none'
  }}
/>
                <Bar dataKey="pct" radius={[0, 5, 5, 0]} barSize={15}>
                  {catMixData.map((_, idx) => (
                    <Cell key={`mix-${idx}`} fill={issuePalette[idx % issuePalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="cmd-two-col-grid">
        <Panel title="Top emerging signals" accent={T.green}>
          {topEmerging.map((s) => {
            const tier = tierOf(s.priority)
            return (
              <div key={s.signalId || s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
                <div style={{ width: 40, textAlign: 'center', fontFamily: FONT_MONO, fontSize: 20, fontWeight: 700, color: tier.color }}>{s.priority}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>{s.location || s.geography?.rawLabel || s.geography?.localityName} · {s.issueCategory || 'General'} · {s.source?.hashtag || s.source?.keyword || s.platform || 'Signal'}</div>
                </div>
                <Badge color={tier.color}>{tier.label}</Badge>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.green, width: 80, textAlign: 'right' }}>{(s.growth || '').split('/')[0]?.trim() || '+0%'}</span>
              </div>
            )
          })}
        </Panel>

        <Panel
          title="System activity logs"
          accent={T.blue}
          right={<Btn ghost accent={T.blue} onClick={() => go('feed')}>Open Signal Feed →</Btn>}
        >
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              background: '#101014',
              padding: 12,
              fontFamily: FONT_MONO,
              fontSize: 11,
              lineHeight: 1.55,
              color: T.green,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {systemLog}
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* ===========================================================================
   MODULE 2 — SIGNAL FEED
   =========================================================================== */
function SignalFeed({ signals, go, setActiveSignal, patchSignal, removeSignal, deleteSignal }) {
  const [fStage, setFStage] = useState('All'), [fCat, setFCat] = useState('All'), [fSent, setFSent] = useState('All')
  const [sort, setSort] = useState('priority'), [sel, setSel] = useState(null)
  
const [editingSignalId, setEditingSignalId] = useState(null);
const [signalEditDraft, setSignalEditDraft] = useState({
  title: "",
  category: "",
  locality: "",
  priority: "",
});

const visibleSignals = useMemo(
  () => signals.filter((s) => !s.removed),
  [signals]
);

function startEditSignal(signal) {
  setEditingSignalId(signal.id);
  setSignalEditDraft({
    title: signal.title || signal.name || "",
    category: signal.issueCategory || signal.category || "",
    locality: signal.location || signal.locality || "",
    priority: String(signal.priority || signal.score || ""),
  });
}

function saveSignalEdit() {
  if (!editingSignalId || !patchSignal) return;

  patchSignal(editingSignalId, {
    title: signalEditDraft.title,
    issueCategory: signalEditDraft.category,
    category: signalEditDraft.category,
    location: signalEditDraft.locality,
    locality: signalEditDraft.locality,
    priority: Number(signalEditDraft.priority) || 0,
    score: Number(signalEditDraft.priority) || 0,
    updatedAt: new Date().toISOString(),
  });

  setEditingSignalId(null);
}

  const filtered = useMemo(() => {
    let r = visibleSignals.filter((s) =>
      (fStage === 'All' || ECHO_SHORT[s.echoNum - 1] === fStage) &&
      (fCat === 'All' || s.issueCategory === fCat) &&
      (fSent === 'All' || s.sentimentLabel === fSent))
    r = [...r].sort((a, b) => sort === 'priority' ? b.priority - a.priority : sort === 'velocity' ? b.velocity - a.velocity : b.capturedAt - a.capturedAt)
    return r
  }, [visibleSignals, fStage, fCat, fSent, sort])

  const active = sel ? visibleSignals.find((s) => s.id === sel) : filtered[0]
  const editInputStyle = {
  width: '100%',
  background: 'rgba(2,6,23,.76)',
  border: '1px solid rgba(148,163,184,.22)',
  color: '#e5f0ff',
  borderRadius: 12,
  padding: '10px 12px',
  outline: 'none',
  fontSize: 12,
  fontFamily: FONT_BODY,
};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Live intake" title="Signal Feed" accent={T.blue} sub={`${filtered.length} of ${signals.length} signals`} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterPills label="Stage" value={fStage} set={setFStage} options={['All', ...ECHO_SHORT]} />
        <FilterPills label="Category" value={fCat} set={setFCat} options={['All', ...ISSUE_OPTIONS]} />
        <FilterPills label="Tone" value={fSent} set={setFSent} options={['All', ...SENTIMENT_OPTIONS]} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={S.label}>Sort</span>
          <div style={{ width: 150 }}><FSelect value={sort} onChange={(e) => setSort(e.target.value)} options={['priority', 'velocity', 'newest']} /></div>
        </div>
      </div>

    {editingSignalId && (
  <div
    style={{
      marginBottom: 14,
      border: '1px solid rgba(34,211,238,.25)',
      background: 'rgba(15,23,42,.88)',
      borderRadius: 18,
      padding: 14,
      boxShadow: '0 18px 36px rgba(0,0,0,.18)',
    }}
  >
    <div
      style={{
        color: '#22d3ee',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: '.14em',
        marginBottom: 10,
      }}
    >
      EDIT SIGNAL
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr 120px',
        gap: 10,
      }}
    >
      <input
        value={signalEditDraft.title}
        onChange={(e) =>
          setSignalEditDraft((d) => ({ ...d, title: e.target.value }))
        }
        placeholder="Signal title"
        style={editInputStyle}
      />

      <input
        value={signalEditDraft.category}
        onChange={(e) =>
          setSignalEditDraft((d) => ({ ...d, category: e.target.value }))
        }
        placeholder="Category"
        style={editInputStyle}
      />

      <input
        value={signalEditDraft.locality}
        onChange={(e) =>
          setSignalEditDraft((d) => ({ ...d, locality: e.target.value }))
        }
        placeholder="Locality"
        style={editInputStyle}
      />

      <input
        value={signalEditDraft.priority}
        onChange={(e) =>
          setSignalEditDraft((d) => ({ ...d, priority: e.target.value }))
        }
        placeholder="Priority"
        type="number"
        style={editInputStyle}
              />
    </div>

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
      <button
        onClick={() => setEditingSignalId(null)}
        style={{
          border: '1px solid rgba(148,163,184,.25)',
          background: 'rgba(2,6,23,.65)',
          color: '#cbd5e1',
          borderRadius: 12,
          padding: '9px 12px',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>

      <button
        onClick={saveSignalEdit}
        style={{
          border: '1px solid rgba(34,211,238,.45)',
          background: 'rgba(34,211,238,.12)',
          color: '#22d3ee',
          borderRadius: 12,
          padding: '9px 12px',
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        Save changes
      </button>
    </div>
  </div>
)}  

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
        <Panel title="Signals" accent={T.blue} pad={0}>
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: 30 }}><Empty msg="No signals match these filters." /></div>}
            {filtered.map((s) => {
              const tier = tierOf(s.priority), on = active && active.id === s.id
              return (
                <div key={s.signalId || s.id} onClick={() => setSel(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer', background: on ? T.card2 : 'transparent', borderLeft: `3px solid ${on ? tier.color : 'transparent'}` }}>
                  <div style={{ width: 34, textAlign: 'center', fontFamily: FONT_MONO, fontSize: 16, fontWeight: 600, color: tier.color }}>{s.priority}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{ECHO_SHORT[s.echoNum - 1]} · {s.issueCategory} · {s.location}</div>
                  </div>
                  {s.approvalStatus === 'Draft' ? (
  <Badge color={T.gold}>Draft</Badge>
) : (
  <Badge color={T.green}>Approved</Badge>
)}

                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      startEditSignal(s);
    }}
    style={{
      border: '1px solid rgba(34,211,238,.35)',
      background: 'rgba(34,211,238,.08)',
      color: '#22d3ee',
      borderRadius: 999,
      padding: '5px 8px',
      fontSize: 10,
      fontWeight: 800,
      cursor: 'pointer',
    }}
  >
    Edit
  </button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      removeSignal?.(s.id);
    }}
    style={{
      border: '1px solid rgba(251,191,36,.35)',
      background: 'rgba(251,191,36,.08)',
      color: '#fbbf24',
      borderRadius: 999,
      padding: '5px 8px',
      fontSize: 10,
      fontWeight: 800,
      cursor: 'pointer',
    }}
  >
    Remove
  </button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      deleteSignal?.(s.id);
    }}
    style={{
      border: '1px solid rgba(251,113,133,.35)',
      background: 'rgba(251,113,133,.08)',
      color: '#fb7185',
      borderRadius: 999,
      padding: '5px 8px',
      fontSize: 10,
      fontWeight: 800,
      cursor: 'pointer',
    }}
  >
    Delete
  </button>
                 </div>
                
                </div>
              )
            })}
          </div>
        </Panel>

        {active ? (
          <Panel title="Signal detail" accent={tierOf(active.priority).color} right={<Badge color={tierOf(active.priority).color} solid>{tierOf(active.priority).label} · {active.priority}</Badge>}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{active.title}</div>
            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>
              {active.source?.authorLabel ? `@${active.source.authorLabel} · ` : ''}
              {active.platform || 'Public'} · {active.location || active.geography?.rawLabel || active.geography?.localityName || 'Unassigned locality'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <Badge color={T.blue}>{active.source?.hashtag || active.source?.keyword || active.title}</Badge>
              <Badge color={T.purple}>{active.sourceType}</Badge>
              <Badge color={active.sentiment >= 80 ? T.red : active.sentiment >= 45 ? T.amber : T.green}>{active.sentimentLabel}</Badge>
            </div>
            <S2DRadar signal={active} accent={tierOf(active.priority).color} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, margin: '12px 0', textAlign: 'center' }}>
              {[['Views', fmt(active.metrics?.views)], ['Comments', fmt(active.metrics?.comments)], ['Shares', fmt(active.metrics?.shares)], ['Mentions', fmt(active.metrics?.mentions)]].map(([k, v]) => (
                <div key={k} style={{ background: T.bg2, borderRadius: 9, padding: '8px 4px' }}><div style={{ fontFamily: FONT_MONO, fontSize: 14, color: T.text }}>{v}</div><div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{k}</div></div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: T.sub, background: T.bg2, borderRadius: 9, padding: 10, marginBottom: 12 }}><span style={{ color: T.muted }}>Spark: </span>{active.sparkPoint}</div>
            <Btn accent={T.amber} onClick={() => { setActiveSignal(active.id); go('decision') }}>Send to Decision Console →</Btn>
          </Panel>
        ) : <Empty msg="Select a signal to inspect its S2D profile." />}
      </div>
    </div>
  )
}
function FilterPills({ label, value, set, options }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...S.label, marginRight: 2 }}>{label}</span>
      {options.map((o) => <button key={o} onClick={() => set(o)} style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 18, cursor: 'pointer', fontFamily: FONT_BODY, border: `1px solid ${value === o ? T.blue : T.border}`, background: value === o ? `${T.blue}22` : 'transparent', color: value === o ? T.blue : T.sub }}>{o}</button>)}
    </div>
  )
}

/* ===========================================================================
   MODULE 3 — ECHO TRACKER
   =========================================================================== */
function EchoTracker({ signals }) {
  const cols = useMemo(() => ECHO_LABELS.map((label, i) => ({ label, short: ECHO_SHORT[i], items: signals.filter((s) => s.echoNum === i + 1).sort((a, b) => b.priority - a.priority) })), [signals])
  const climbers = useMemo(() => [...signals].sort((a, b) => b.velocity - a.velocity).slice(0, 4), [signals])
  const accents = [T.green, T.blue, T.purple, T.amber, T.red]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Escalation flow" title="Echo Tracker" accent={T.purple} sub="Signals moving from early chatter toward media pickup and public pressure" />
      <div style={{ ...S.card, padding: 14, borderLeft: `3px solid ${T.purple}` }}>
        <div style={{ ...S.label, color: T.purple, marginBottom: 6 }}>Fastest climbers (velocity)</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {climbers.map((s) => <div key={s.signalId || s.id} style={{ fontSize: 12.5 }}><span style={{ fontFamily: FONT_MONO, color: T.green }}>{s.growth.split('/')[0].trim()}</span> <span style={{ color: T.sub }}>{s.source?.hashtag || s.source?.keyword || s.title}</span></div>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, alignItems: 'start' }}>
        {cols.map((c, i) => (
          <div key={c.short} style={{ ...S.card, padding: 12, minHeight: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: accents[i] }} />
              <span style={{ fontFamily: FONT_HEAD, fontSize: 12.5, fontWeight: 600 }}>{c.short}</span>
              <span style={{ marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: 12, color: T.muted }}>{c.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.items.length === 0 && <div style={{ fontSize: 11.5, color: T.muted, padding: '8px 0' }}>—</div>}
              {c.items.map((s) => {
                const tier = tierOf(s.priority)
                return (
                  <div key={s.signalId || s.id} style={{ background: T.bg2, border: `1px solid ${T.borderSoft}`, borderRadius: 9, padding: 9, borderTop: `2px solid ${tier.color}` }}>
                    <div style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.35 }}>{s.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: T.muted }}>
                      <span>{s.issueCategory}</span>
                      <span style={{ fontFamily: FONT_MONO, color: T.green }}>{s.growth.split('/')[0].trim()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===========================================================================
   MODULE 4 — LOCALITY INTEL
   =========================================================================== */
function LocalityIntel({ signals }) {
  const rows = useMemo(() => {
    const m = {}
    signals.forEach((s) => {
      const key = s.location || 'Unassigned'
      if (!m[key]) m[key] = { location: key, count: 0, sens: 0, vel: 0, neg: 0 }
      m[key].count++; m[key].sens += s.sensitivity; m[key].vel += s.velocity; if (s.sentiment >= 80) m[key].neg++
    })
    return Object.values(m).map((r) => ({ ...r, avgSens: Math.round(r.sens / r.count), avgVel: Math.round(r.vel / r.count) })).sort((a, b) => b.count - a.count)
  }, [signals])
  const hottest = rows[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Geographic view" title="Locality Intelligence" accent={T.teal} sub="Signal load and sensitivity by constituency / locality" />
      {hottest && (
        <div style={{ ...S.card, padding: 14, borderLeft: `3px solid ${T.teal}` }}>
          <span style={{ ...S.label, color: T.teal }}>Hottest area</span>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 600, marginTop: 3 }}>{hottest.location}</div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2 }}>{hottest.count} signals · avg sensitivity {hottest.avgSens} · {hottest.neg} running negative</div>
        </div>
      )}
      <Panel title="Signal load by locality" accent={T.teal}>
        <div style={{ height: Math.max(180, rows.length * 34) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="location" tick={{ fill: T.sub, fontSize: 10.5 }} width={180} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: T.card3 }} contentStyle={{ background: T.card3, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={16}>{rows.map((r, i) => <Cell key={i} fill={r.avgSens >= 80 ? T.red : r.avgSens >= 65 ? T.amber : T.teal} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 6 }}>Bar colour reflects average sensitivity — red ≥ 80, amber ≥ 65, teal below.</div>
      </Panel>
      <Panel title="Locality breakdown" accent={T.teal} pad={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ color: T.muted, textAlign: 'left' }}>{['Locality', 'Signals', 'Avg sensitivity', 'Avg velocity', 'Negative'].map((h, i) => <th key={h} style={{ padding: '10px 16px', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.location} style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                <td style={{ padding: '10px 16px' }}>{r.location}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontFamily: FONT_MONO }}>{r.count}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontFamily: FONT_MONO, color: r.avgSens >= 80 ? T.red : T.sub }}>{r.avgSens}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontFamily: FONT_MONO, color: T.sub }}>{r.avgVel}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontFamily: FONT_MONO, color: r.neg ? T.amber : T.muted }}>{r.neg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

/* ===========================================================================
   MODULE 5 — DECISION CONSOLE
   =========================================================================== */
function DecisionConsole({ signals, patchSignal, activeSignal, toast }) {
  const drafts = useMemo(() => signals.filter((s) => s.approvalStatus !== 'Approved' && s.approvalStatus !== 'Dismissed').sort((a, b) => b.priority - a.priority), [signals])
  const approved = useMemo(() => signals.filter((s) => s.approvalStatus === 'Approved').sort((a, b) => b.capturedAt - a.capturedAt), [signals])
  const [sel, setSel] = useState(activeSignal || null)
  const [wfTab, setWfTab] = useState('evidence')
  useEffect(() => { if (activeSignal) setSel(activeSignal) }, [activeSignal])
  const active = signals.find((s) => s.id === (sel || (drafts[0] && drafts[0].id)))

  function recommend(s) {
    if (!s) return ''
    if (s.coordination >= 70) return 'Likely coordinated amplification — verify authenticity before any public response; do not amplify.'
    if (s.sensitivity >= 85 && s.sentiment >= 80) return 'High-sensitivity negative signal — route to senior approver; prepare factual clarification.'
    if (s.velocity >= 60) return 'Fast-moving — prepare a holding response and monitor hourly.'
    return 'Monitor. Acknowledge if it reaches Echo 3.'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Signal to decision" title="Decision Console" accent={T.amber} sub="Human sign-off before any response — drafts wait here until reviewed" />
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.3fr', gap: 16, alignItems: 'start' }}>
        <Panel title={`Awaiting decision · ${drafts.length}`} accent={T.gold} pad={0}>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {drafts.length === 0 && <div style={{ padding: 28 }}><Empty msg="No drafts pending. All clear." /></div>}
            {drafts.map((s) => {
              const tier = tierOf(s.priority), on = active && active.id === s.id
              return (
                <div key={s.signalId || s.id} onClick={() => setSel(s.id)} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSoft}`, cursor: 'pointer', background: on ? T.card2 : 'transparent', borderLeft: `3px solid ${on ? T.gold : 'transparent'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{s.title}</span>
                    <span style={{ fontFamily: FONT_MONO, color: tier.color, fontSize: 14 }}>{s.priority}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{ECHO_SHORT[s.echoNum - 1]} · {s.location}</div>
                </div>
              )
            })}
          </div>
        </Panel>

        {active ? (
          <Panel title="Decision brief" accent={T.amber} right={<Badge color={active.approvalStatus === 'Approved' ? T.green : T.gold}>{active.approvalStatus}</Badge>}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 600 }}>{active.title}</div>
            <div style={{ fontSize: 12.5, color: T.sub, margin: '4px 0 12px' }}>{active.location} · {active.issueCategory} · {active.sourceType} · {ECHO_SHORT[active.echoNum - 1]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <ScoreBar label="Velocity" value={active.velocity} color={T.blue} />
                <ScoreBar label="Reach" value={active.reach} color={T.teal} />
                <ScoreBar label="Sensitivity" value={active.sensitivity} color={T.purple} />
                <ScoreBar label="Coordination" value={active.coordination} color={active.coordination >= 70 ? T.red : T.amber} />
              </div>
              <S2DRadar signal={active} accent={T.amber} />
            </div>
            <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.amber}`, borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 12.5 }}>
              <div style={{ ...S.label, color: T.amber, marginBottom: 4 }}>Recommended action</div>
              <div style={{ color: T.text, lineHeight: 1.5 }}>{recommend(active)}</div>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>⚠ {active.analystNote}</div>
            {active.approvalStatus === 'Draft' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn accent={T.green} onClick={() => { patchSignal(active.id, { approvalStatus: 'Approved' }); toast('Signal approved for response', T.green) }}>Approve for response</Btn>
                <Btn ghost accent={T.muted} onClick={() => { patchSignal(active.id, { approvalStatus: 'Dismissed' }); toast('Signal dismissed', T.muted) }}>Dismiss</Btn>
              </div>
            ) : <Btn ghost accent={T.gold} onClick={() => { patchSignal(active.id, { approvalStatus: 'Draft' }); toast('Returned to draft', T.gold) }}>Return to draft</Btn>}
          </Panel>
        ) : <Empty msg="No signal selected." />}
      </div>

      {active && (() => {
        const evLog = Array.isArray(active.evidenceLog) ? active.evidenceLog : []
        const verified = evLog.filter((i) => i.verification === 'Verified').length
        const rChecks = [evLog.length > 0, verified > 0, active.approvalStatus === 'Approved', Boolean(active.responseDraft), Boolean(active.analystNote)]
        const rScore = Math.round((rChecks.filter(Boolean).length / rChecks.length) * 100)
        const rColor = rScore >= 80 ? T.green : rScore >= 50 ? T.amber : T.red
        const tabs = [
          ['evidence', 'Evidence', evLog.length ? `${evLog.length}` : ''],
          ['approval', 'Approval', ''],
          ['draft', 'Response Draft', active.responseDraft ? '✓' : ''],
          ['readiness', 'Readiness', `${rScore}%`],
          ['outcome', 'Outcome', ''],
        ]
        return (
          <Panel title="Case file workflow" accent={T.amber} right={<Badge color={rColor}>Readiness {rScore}%</Badge>} pad={0}>
            <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', flexWrap: 'wrap' }}>
              {tabs.map(([id, lbl, badge]) => (
                <button key={id} onClick={() => setWfTab(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: '10px 10px 0 0', border: `1px solid ${wfTab === id ? T.border : 'transparent'}`, borderBottom: 'none', background: wfTab === id ? T.card : 'transparent', color: wfTab === id ? T.text : T.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY }}>
                  {lbl}{badge && <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: wfTab === id ? T.amber : T.muted }}>{badge}</span>}
                </button>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, padding: 16 }}>
              {wfTab === 'evidence' && <EvidenceLogPanel signal={active} onUpdateSignal={patchSignal} />}
              {wfTab === 'approval' && <ApprovalGatePanel signal={active} onUpdateSignal={patchSignal} />}
              {wfTab === 'draft' && <ResponseDraftPanel signal={active} onUpdateSignal={patchSignal} />}
              {wfTab === 'readiness' && <ReadinessPanel signal={active} />}
              {wfTab === 'outcome' && <OutcomeUpdatePanel signal={active} onUpdateSignal={patchSignal} />}
            </div>
          </Panel>
        )
      })()}

      {approved.length > 0 && (
        <Panel title={`Approved decision log · ${approved.length}`} accent={T.green} pad={0}>
          {approved.map((s) => (
            <div key={s.signalId || s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${T.borderSoft}` }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: T.green }} />
              <span style={{ flex: 1, fontSize: 13 }}>{s.title}</span>
              <span style={{ fontSize: 11.5, color: T.muted }}>{s.location}</span>
              <Badge color={T.green}>Approved</Badge>
            </div>
          ))}
        </Panel>
      )}
    </div>
  )
}

/* ===========================================================================
   DATA ENTRY 1 — SIGNAL INTAKE
   =========================================================================== */
const EMPTY_FORM = { platform: 'manual', keyword: '', hashtag: '', title: '', caption: '', username: '', url: '', issueCategory: 'Public service', location: 'Melaka Tengah / Locality cluster', sourceType: 'Public video', views: '', likes: '', comments: '', shares: '', mentions: '', growth: '+0% / 1h', sentiment: 'Negative', stage: 'Echo 1 - Early signal', sparkPoint: '' }
function buildSignalIntakeForm(sample = {}) {
  const source = sample?.source || {}
  const metrics = sample?.metrics || {}
  const classification = sample?.classification || {}
  const geography = sample?.geography || {}
  const workflow = sample?.workflow || {}
  const toMetricString = (value) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? String(numeric) : ''
  }

  return {
    ...EMPTY_FORM,
    platform: inferS2dPlatform(sample),
    keyword: source.keyword || sample.keyword || '',
    hashtag: source.hashtag || sample.hashtag || '',
    title: sample.headline || sample.title || '',
    caption: source.text || sample.caption || sample.text || '',
    username: source.authorLabel || sample.username || sample.author || '',
    url: source.url || sample.url || '',
    issueCategory: classification.primaryIssue || sample.issueCategory || sample.category || EMPTY_FORM.issueCategory,
    location: geography.rawLabel || geography.localityName || sample.location || sample.localityName || EMPTY_FORM.location,
    sourceType: source.sourceType || sample.sourceType || EMPTY_FORM.sourceType,
    views: toMetricString(metrics.views ?? sample.views),
    likes: toMetricString(metrics.likes ?? sample.likes),
    comments: toMetricString(metrics.comments ?? sample.comments),
    shares: toMetricString(metrics.shares ?? sample.shares),
    mentions: toMetricString(metrics.mentions ?? sample.mentions),
    growth: metrics.growthLabel || sample.growth || EMPTY_FORM.growth,
    sentiment: classification.sentimentLabel || sample.sentimentLabel || sample.sentiment || EMPTY_FORM.sentiment,
    stage: workflow.stage || sample.stage || EMPTY_FORM.stage,
    sparkPoint: workflow.sparkPoint || sample.sparkPoint || EMPTY_FORM.sparkPoint,
  }
}
function SignalIntake({ addSignal, toast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }))
  const preview = useMemo(() => buildSignal(form), [form])
  const tier = tierOf(preview.priority)
  const canSave = form.keyword.trim() || form.hashtag.trim() || form.title.trim()
  function loadSample() { const s = SEED[Math.floor(Math.random() * SEED.length)]; setForm(buildSignalIntakeForm(s)) }
  function submit() {
    const { id, signalId, ...payload } = { ...form }
    addSignal(payload)
    setForm({ ...EMPTY_FORM, platform: 'manual' })
    toast('Signal added as Draft', T.blue)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Data entry" title="Signal Intake" accent={T.blue} sub="Capture a precursor signal — it scores live and lands in the feed as a Draft" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
        <Panel title="New signal" accent={T.blue} right={<Btn ghost accent={T.amber} onClick={loadSample}>Load sample</Btn>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Platform"><select value={form.platform} onChange={(e) => set('platform', e.target.value)} style={{ ...S.input, cursor: 'pointer' }}>{['manual', 'tiktok', 'facebook', 'instagram', 'threads'].map((option) => <option key={option} value={option} style={{ background: T.bg2 }}>{option === 'manual' ? 'Manual' : option.charAt(0).toUpperCase() + option.slice(1)}</option>)}</select></Field>
            <Grid2><Field label="Keyword"><FInput value={form.keyword} onChange={(e) => set('keyword', e.target.value)} placeholder="water disruption" /></Field><Field label="Hashtag"><FInput value={form.hashtag} onChange={(e) => set('hashtag', e.target.value)} placeholder="#airmelaka" /></Field></Grid2>
            <Field label="Signal title"><FInput value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Resident complaint gaining attention" /></Field>
            <Field label="Caption / context"><textarea value={form.caption} onChange={(e) => set('caption', e.target.value)} rows={2} placeholder="Paste public-post text or analyst summary." style={{ ...S.input, resize: 'vertical' }} /></Field>
            <Grid2><Field label="Username"><FInput value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="community_watch" /></Field><Field label="URL"><FInput value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://example.com/public-post" /></Field></Grid2>
            <Grid2><Field label="Issue category"><FSelect value={form.issueCategory} onChange={(e) => set('issueCategory', e.target.value)} options={ISSUE_OPTIONS} /></Field><Field label="Source type"><FSelect value={form.sourceType} onChange={(e) => set('sourceType', e.target.value)} options={SOURCE_OPTIONS} /></Field></Grid2>
            <Field label="Locality / DUN"><FInput value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Melaka Tengah / DUN Ayer Keroh" /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <Field label="Views"><FInput value={form.views} onChange={(e) => set('views', e.target.value)} placeholder="68000" /></Field>
              <Field label="Likes"><FInput value={form.likes} onChange={(e) => set('likes', e.target.value)} placeholder="4200" /></Field>
              <Field label="Comments"><FInput value={form.comments} onChange={(e) => set('comments', e.target.value)} placeholder="680" /></Field>
              <Field label="Shares"><FInput value={form.shares} onChange={(e) => set('shares', e.target.value)} placeholder="510" /></Field>
            </div>
            <Grid2><Field label="Growth" hint="e.g. +218% / 6h"><FInput value={form.growth} onChange={(e) => set('growth', e.target.value)} /></Field><Field label="Sentiment"><FSelect value={form.sentiment} onChange={(e) => set('sentiment', e.target.value)} options={['Negative', 'Neutral', 'Positive', 'Angry']} /></Field></Grid2>
            <Grid2><Field label="Echo stage"><FSelect value={form.stage} onChange={(e) => set('stage', e.target.value)} options={ECHO_LABELS} /></Field><Field label="Spark point" hint="'organic' / 'repeated' affects coordination score"><FInput value={form.sparkPoint} onChange={(e) => set('sparkPoint', e.target.value)} /></Field></Grid2>
            <div><Btn accent={T.blue} onClick={submit} disabled={!canSave}>Add signal to feed</Btn></div>
          </div>
        </Panel>

        <Panel title="Live S2D preview" accent={tier.color} right={<Badge color={tier.color} solid>{tier.label} · {preview.priority}</Badge>}>
          <S2DRadar signal={preview} accent={tier.color} />
          <div style={{ marginTop: 12 }}>
            <ScoreBar label="Velocity" value={preview.velocity} color={T.blue} />
            <ScoreBar label="Reach" value={preview.reach} color={T.teal} />
            <ScoreBar label="Sentiment (negativity)" value={preview.sentiment} color={T.amber} />
            <ScoreBar label="Influence" value={preview.influence} color={T.purple} />
            <ScoreBar label="Sensitivity" value={preview.sensitivity} color={T.purpleBright} />
            <ScoreBar label="Coordination" value={preview.coordination} color={preview.coordination >= 70 ? T.red : T.gold} />
            <ScoreBar label="Locality" value={preview.locality} color={T.green} />
          </div>
        </Panel>
      </div>
    </div>
  )
}
function Grid2({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div> }

/* ===========================================================================
   EXPORT  — CSV · Excel (SheetJS) · PDF (print)
   =========================================================================== */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 120)
}
function buildCSV(rows, cols) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => cols.map((c) => esc(c.get(r))).join(',')).join('\r\n')
  return '\uFEFF' + head + '\r\n' + body // BOM for Excel UTF-8
}
function buildXLSXBlob(rows, cols, sheet) {
  const aoa = [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => c.get(r)))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = cols.map((c) => ({ wch: Math.min(40, Math.max(10, c.label.length + 4)) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 28))
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])) }
function exportPDF(rows, cols, title) {
  const when = new Date().toLocaleString('en-GB')
  const thead = cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')
  const tbody = rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(c.get(r))}</td>`).join('')}</tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px}
      h1{font-size:18px;margin:0 0 2px} .meta{font-size:11px;color:#64748b;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:9.5px} th{background:#0f1620;color:#fff;text-align:left;padding:5px 6px}
      td{padding:4px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top} tr:nth-child(even) td{background:#f8fafc}
      .foot{margin-top:14px;font-size:9px;color:#94a3b8}
      @media print{@page{margin:12mm;size:A4 landscape}}
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">S2D 360 · ${rows.length} records · generated ${escapeHtml(when)} · public-signal decision-support</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <div class="foot">Exported from S2D 360. Public data only — verify before any response action.</div>
    </body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  iframe.onload = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print() } catch (e) {} setTimeout(() => document.body.removeChild(iframe), 1500) }
}
function exportData(format, rows, cols, baseName) {
  if (!rows.length) return
  const name = `${baseName}-${new Date().toISOString().slice(0, 10)}`
  if (format === 'csv') downloadBlob(new Blob([buildCSV(rows, cols)], { type: 'text/csv;charset=utf-8' }), name + '.csv')
  else if (format === 'xlsx') downloadBlob(buildXLSXBlob(rows, cols, baseName), name + '.xlsx')
  else exportPDF(rows, cols, baseName)
}
function ExportBar({ rows, cols, baseName = 'export', label = 'Export' }) {
  const off = !rows.length
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {label && <span style={S.label}>{label}</span>}
      <Btn ghost accent={T.green} disabled={off} onClick={() => exportData('csv', rows, cols, baseName)}>CSV</Btn>
      <Btn ghost accent={T.teal} disabled={off} onClick={() => exportData('xlsx', rows, cols, baseName)}>Excel</Btn>
      <Btn ghost accent={T.amber} disabled={off} onClick={() => exportData('pdf', rows, cols, baseName)}>PDF</Btn>
    </div>
  )
}
const SIGNAL_COLS = [
  { label: 'Signal ID', get: (s) => s.signalId || s.id },
  { label: 'Platform', get: (s) => s.platform },
  { label: 'Headline', get: (s) => s.headline || s.title },
  { label: 'Primary Issue', get: (s) => s.classification?.primaryIssue || s.issueCategory || s.category },
  { label: 'Locality', get: (s) => s.geography?.rawLabel || s.geography?.localityName || s.location },
  { label: 'Source Type', get: (s) => s.source?.sourceType || s.sourceType },
  { label: 'Author Label', get: (s) => s.source?.authorLabel },
  { label: 'Source URL', get: (s) => s.source?.url },
  { label: 'Source Text', get: (s) => s.source?.text },
  { label: 'Keyword', get: (s) => s.source?.keyword },
  { label: 'Hashtag', get: (s) => s.source?.hashtag },
  { label: 'Published At', get: (s) => s.source?.publishedAt },
  { label: 'Collected At', get: (s) => s.source?.collectedAt },
  { label: 'Followers', get: (s) => s.metrics?.followers },
  { label: 'Views', get: (s) => s.metrics?.views },
  { label: 'Likes', get: (s) => s.metrics?.likes },
  { label: 'Comments', get: (s) => s.metrics?.comments },
  { label: 'Shares', get: (s) => s.metrics?.shares },
  { label: 'Mentions', get: (s) => s.metrics?.mentions },
  { label: 'Engagement', get: (s) => s.metrics?.engagement },
  { label: 'Growth', get: (s) => s.metrics?.growthLabel || s.growth },
  { label: 'Sentiment Label', get: (s) => s.classification?.sentimentLabel || s.sentimentLabel },
  { label: 'Sentiment Polarity', get: (s) => s.classification?.sentimentPolarity ?? s.sentimentPolarity },
  { label: 'Sentiment Confidence', get: (s) => s.classification?.sentimentConfidence ?? s.sentimentConfidence },
  { label: 'Sentiment Risk', get: (s) => s.scores?.sentimentRisk ?? s.sentimentRisk ?? s.sentiment },
  { label: 'Velocity', get: (s) => s.scores?.velocity ?? s.velocity },
  { label: 'Reach', get: (s) => s.scores?.reach ?? s.reach },
  { label: 'Influence', get: (s) => s.scores?.influence ?? s.influence },
  { label: 'Sensitivity', get: (s) => s.scores?.sensitivity ?? s.sensitivity },
  { label: 'Coordination', get: (s) => s.scores?.coordination ?? s.coordination },
  { label: 'Locality Score', get: (s) => s.scores?.locality ?? s.locality },
  { label: 'Priority', get: (s) => s.scores?.priority ?? s.priority },
  { label: 'Echo Stage', get: (s) => s.workflow?.stage ?? s.stage },
  { label: 'Echo Number', get: (s) => s.workflow?.echoNumber ?? s.echoNum },
  { label: 'Approval Status', get: (s) => s.workflow?.approvalStatus ?? s.approvalStatus },
  { label: 'Evidence Status', get: (s) => s.evidence?.status },
  { label: 'Evidence Confidence', get: (s) => s.evidence?.confidence },
  { label: 'Captured At', get: (s) => s.timestamps?.capturedAt ?? s.capturedAt },
  { label: 'Updated At', get: (s) => s.timestamps?.updatedAt ?? s.updatedAt },
]
const SCRAPE_COLS = [
  { label: 'Platform', get: (r) => r.platform }, { label: 'Author', get: (r) => '@' + r.author },
  { label: 'Fans', get: (r) => r.fans }, { label: 'Date', get: (r) => r.date },
  { label: 'Sentiment', get: (r) => r.sentiment }, { label: 'Polarity', get: (r) => r.polarity },
  { label: 'Issue', get: (r) => r.issue }, { label: 'Locality', get: (r) => r.locality },
  { label: 'Likes', get: (r) => r.likes }, { label: 'Views', get: (r) => r.views },
  { label: 'Comments', get: (r) => r.comments }, { label: 'Shares', get: (r) => r.shares },
  { label: 'Engagement', get: (r) => r.engagement }, { label: 'Score', get: (r) => r.score },
  { label: 'Text', get: (r) => r.text }, { label: 'URL', get: (r) => r.url },
]

/* ===========================================================================
   SOCIAL SCRAPER  — TikTok / Facebook / Instagram / Threads (Apify)
   Demo mode runs offline; live mode calls the apifyScraperService backend.
   "Push to Signal Feed" bridges each scraped record into an S2D signal.
   =========================================================================== */
const SC_PLATFORMS = {
  tiktok: { label: 'TikTok', icon: '♪', accent: T.magenta, noun: 'videos' },
  facebook: { label: 'Facebook', icon: 'f', accent: T.blue, noun: 'posts' },
  instagram: { label: 'Instagram', icon: '◙', accent: T.pink, noun: 'posts' },
  threads: { label: 'Threads', icon: '@', accent: T.teal, noun: 'threads' },
}
const SC_ORDER = ['tiktok', 'facebook', 'instagram', 'threads']
const SC_KEYWORDS = []

const SC_SEARCH_META = {
  'Keyword Search': {
    label: 'Keywords',
    placeholder: 'Enter keywords, locality, issue, hashtag, page name, or URL',
    hint: 'Comma-separated. Leave blank if not required.',
  },
  'Hashtag': {
    label: 'Hashtags',
    placeholder: '#issue, #locality, #campaign, #complaint',
    hint: 'Use one or multiple hashtags.',
  },
  'Profile / Page': {
    label: 'Username / Page',
    placeholder: '@username or page name',
    hint: 'Enter public profile, creator, or page name.',
  },
  'Post URL': {
    label: 'Post URL',
    placeholder: 'https://www.tiktok.com/@user/video/123...',
    hint: 'Paste a public post URL.',
  },
  default: {
    label: 'Search terms',
    placeholder: 'Enter search terms',
    hint: '',
  },
}

const SC_LOCALITIES = []
const SC_ISSUE_RULES = [
  { cat: 'Roads Traffic', kw: ['jalan', 'road', 'traffic', 'jam', 'lebuhraya', 'sesak'] },
  { cat: 'Cost of Living', kw: ['harga', 'cost', 'living', 'mahal', 'sara hidup', 'inflation'] },
  { cat: 'Public Transport', kw: ['bas', 'bus', 'mrt', 'lrt', 'ktm', 'transport', 'rapid'] },
  { cat: 'Flood Drainage', kw: ['banjir', 'flood', 'longkang', 'drain', 'takungan'] },
  { cat: 'Utilities', kw: ['air', 'water', 'elektrik', 'electric', 'tnb', 'bekalan', 'gangguan'] },
  { cat: 'Healthcare', kw: ['klinik', 'clinic', 'hospital', 'health', 'kesihatan', 'doktor'] },
  { cat: 'Housing Land', kw: ['rumah', 'house', 'housing', 'tanah', 'land', 'perumahan'] },
]
const SC_NEG = ['marah', 'teruk', 'masalah', 'gagal', 'mahal', 'rosak', 'kecewa', 'tipu', 'rasuah', 'angry', 'broken', 'fail', 'problem', 'delay', 'unfair', 'tiada', 'lambat', 'sesak', 'banjir']
const SC_POS = ['bagus', 'baik', 'terbaik', 'syabas', 'puas hati', 'settle', 'good', 'great', 'thanks', 'terima kasih', 'improve', 'resolved', 'mantap']
const SC_DEMO_AUTHORS = ['warga_dengkil', 'cyberjaya.daily', 'salaktinggi_info', 'sepang_voice', 'tvs_entertainment', 'iced.mekdi', 'beritadengkil', 'myhometown']
const SC_DEMO_TEXTS = [
  'Jalan ke Cyberjaya sesak teruk waktu pagi, traffic jam makin lama', 'Harga barang naik lagi, kos sara hidup mahal di Dengkil',
  'Banjir kilat di Salak Tinggi semalam, longkang tersumbat', 'Bekalan air terganggu di Sepang, bila nak settle?',
  'Klinik kesihatan Dengkil ramai orang, waiting lama', 'Bas ke Putrajaya jarang sangat, transport susah',
  'Syabas kerja baik upgrade taman permainan, terbaik', 'Projek perumahan baru di Dengkil, isu tanah belum selesai',
  'Update event komuniti Cyberjaya minggu ni', 'Pasar malam Salak Tinggi meriah malam tadi',
]
function scNum(v) { return typeof v === 'number' ? v : Number(String(v || '').replace(/[^\d.]/g, '')) || 0 }
function scClassifyIssue(t) { t = String(t || '').toLowerCase(); for (const r of SC_ISSUE_RULES) if (r.kw.some((k) => t.includes(k))) return r.cat; return 'Others' }
function scDetectLocality(t) {
  t = String(t || '').toLowerCase();

  for (const l of SC_LOCALITIES) {
    if (t.includes(l.toLowerCase().replace('n55 ', ''))) return l;
  }

  return 'Unassigned';
}
function scSentiment(t) {
  t = String(t || '').toLowerCase(); let n = 0, p = 0
  for (const w of SC_NEG) if (t.includes(w)) n++; for (const w of SC_POS) if (t.includes(w)) p++
  const conf = Math.min(0.95, 0.5 + (n + p) * 0.09)
  if (n > p) return { label: 'Negative', polarity: -Math.min(1, 0.4 + n * 0.12), conf }
  if (p > n) return { label: 'Positive', polarity: Math.min(1, 0.4 + p * 0.12), conf }
  return { label: 'Neutral', polarity: 0, conf: 0.5 }
}
function scExtract(platform, raw) {
  if (platform === 'tiktok') return { author: raw.authorMeta?.name || raw.author || '', fans: scNum(raw.authorMeta?.fans), text: raw.text || raw.desc || '', likes: scNum(raw.diggCount), views: scNum(raw.playCount), comments: scNum(raw.commentCount), shares: scNum(raw.shareCount), url: raw.webVideoUrl || raw.url || '', date: raw.createTimeISO || '' }
  if (platform === 'instagram') return { author: raw.ownerUsername || '', fans: scNum(raw.followersCount), text: raw.caption || '', likes: scNum(raw.likesCount), views: scNum(raw.videoViewCount), comments: scNum(raw.commentsCount), shares: 0, url: raw.url || '', date: raw.timestamp || '' }
  if (platform === 'facebook') return { author: raw.pageName || raw.user?.name || '', fans: scNum(raw.pageLikes), text: raw.text || raw.message || '', likes: scNum(raw.likes), views: 0, comments: scNum(raw.comments), shares: scNum(raw.shares), url: raw.url || raw.postUrl || '', date: raw.time || '' }
  return { author: raw.username || '', fans: scNum(raw.followersCount), text: raw.text || '', likes: scNum(raw.likeCount || raw.likes), views: 0, comments: scNum(raw.replyCount || raw.comments), shares: scNum(raw.repostCount), url: raw.url || '', date: raw.timestamp || '' }
}
function scNormalize(platform, raw) {
  const c = scExtract(platform, raw), sent = scSentiment(c.text)
  const vol = c.likes + c.comments + c.shares + Math.round(c.views * 0.05)
  const sw = (platform === 'facebook' ? 1.1 : platform === 'threads' ? 0.9 : 1) * (c.fans >= 100000 ? 1.3 : c.fans >= 10000 ? 1.15 : 1)
  const ow = 1 + Math.min(1.5, c.views / 500000)
  const score = sent.polarity * Math.log(1 + vol) * sent.conf * sw * ow
  const normalizedPlatform = normalizeS2dPlatform(platform)
  return {
    id: `${normalizedPlatform}-${c.url || Math.random().toString(36).slice(2)}`, platform: normalizedPlatform, author: c.author, fans: c.fans, text: c.text,
    sentiment: sent.label, polarity: Number(sent.polarity.toFixed(2)), issue: scClassifyIssue(c.text), locality: scDetectLocality(c.text),
    likes: c.likes, views: c.views, comments: c.comments, shares: c.shares, engagement: c.likes + c.comments + c.shares,
    sentimentConfidence: sent.conf, publishedAt: c.date || null, collectedAt: new Date().toISOString(),
    url: c.url, date: c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—', score: Number(score.toFixed(2)),
  }
}
function scMakeDemo(platform, n) {
  const out = []
  const run = Date.now().toString(36)
  for (let i = 0; i < n; i++) {
    const text = SC_DEMO_TEXTS[Math.floor(Math.random() * SC_DEMO_TEXTS.length)]
    const fans = [152, 506, 2400, 12000, 57000, 307000, 660000][Math.floor(Math.random() * 7)]
    const base = Math.floor(Math.random() * 4000)
    const views = platform === 'tiktok' || platform === 'instagram' ? base * (5 + Math.floor(Math.random() * 30)) : 0
    const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 864e5).toISOString()
    const a = SC_DEMO_AUTHORS[i % SC_DEMO_AUTHORS.length]
    const item = scNormalize(platform, { authorMeta: { name: a, fans }, text, diggCount: base, playCount: views, commentCount: Math.floor(base / 8), shareCount: Math.floor(base / 20), webVideoUrl: `https://${platform}.com/@${a}/${run}${i}`, createTimeISO: date, ownerUsername: a, followersCount: fans, caption: text, likesCount: base, videoViewCount: views, commentsCount: Math.floor(base / 8), url: `https://${platform}.com/@${a}/${run}${i}`, timestamp: date, pageName: a, pageLikes: fans, message: text, likes: base, comments: Math.floor(base / 8), shares: Math.floor(base / 20), username: a, likeCount: base, replyCount: Math.floor(base / 8), repostCount: Math.floor(base / 20) })
    item.id = `${platform}-demo-${run}-${i}`
    out.push(item)
  }
  return out
}

function resolveUiRequestedMaximum({ scanType, limit, approvedMaximum }) {
  if (scanType === 'Post URL') {
    return {
      valid: true,
      requestedMaximum: 1,
      errors: [],
    }
  }

  return validateS2dRequestedMaximum(limit, { approvedMaximum })
}
/* bridge: scraped record -> S2D signal raw (scored by buildSignal in the store) */
const PIP_TO_S2D_ISSUE = { 'Roads Traffic': 'Infrastructure', 'Cost of Living': 'Economy', 'Public Transport': 'Infrastructure', 'Flood Drainage': 'Infrastructure', 'Utilities': 'Public service', 'Healthcare': 'Public service', 'Housing Land': 'Infrastructure', 'Others': 'Public service' }
const SC_SOURCE = { tiktok: 'Public video', facebook: 'Media page', instagram: 'Public video', threads: 'Comment cluster' }
function scrapedToSignalRaw(rec) {
  return buildSignal(adaptScrapedRecordToS2dRecord(rec, {
    issueMap: PIP_TO_S2D_ISSUE,
    sourceTypeMap: SC_SOURCE,
    defaultCollectionRunId: '',
  }))
}
function SocialScraper({ addSignal, ingestScrapedRecords, toast, scrapeStore }) {
  const results = scrapeStore.scraped
  const [linkMemory, setLinkMemory] = useState([])

useEffect(() => {
  setLinkMemory(getLinkMemoryLibrary())
}, [])

function MemoryPill({ record }) {
  const status = record.memoryStatus || "New"

  if (status === "Recalled") {
    return (
      <span
        title={`Recalled from Link Library · ${record.memoryRelevance} · ${record.memoryMonitor}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 999,
          border: `1px solid ${T.green}88`,
          background: `${T.green}18`,
          color: T.green,
          fontSize: 10.5,
          fontWeight: 800,
        }}
      >
        ↺ Recalled
      </span>
    )
  }

  if (status === "Known") {
    return (
      <span
        title={`Known in Link Library · ${record.memoryRelevance}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 999,
          border: `1px solid ${T.amber}88`,
          background: `${T.amber}18`,
          color: T.amber,
          fontSize: 10.5,
          fontWeight: 800,
        }}
      >
        ◌ Known
      </span>
    )
  }

  if (status === "Filtered") {
    return (
      <span
        title="Filtered by Link Library"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 999,
          border: `1px solid ${T.red}88`,
          background: `${T.red}18`,
          color: T.red,
          fontSize: 10.5,
          fontWeight: 800,
        }}
      >
        ⊘ Filtered
      </span>
    )
  }

  return (
    <span
      title="New link, not yet reviewed in Link Library"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 999,
        border: `1px solid ${T.border}`,
        background: T.card3,
        color: T.muted,
        fontSize: 10.5,
        fontWeight: 800,
      }}
    >
      New
    </span>
  )
}

function normalizeMemoryUrl(url = "") {
  return String(url || "")
    .trim()
    .replace(/\/$/, "")
    .toLowerCase()
}

const memoryIndex = useMemo(() => {
  const map = new Map()

  linkMemory.forEach((item) => {
    const key = normalizeMemoryUrl(item.url || item.urlKey)
    if (key) map.set(key, item)
  })

  return map
}, [linkMemory])

function getMemoryRecord(record) {
  const key = normalizeMemoryUrl(record.url || record.link || record.evidenceUrl)
  if (!key) return null
  return memoryIndex.get(key) || null
}

function applyMemoryFlag(record) {
  const memory = getMemoryRecord(record)

  if (!memory) {
    return {
      ...record,
      memoryStatus: "New",
      memoryDecision: "show",
      memoryRelevance: "Unreviewed",
      memoryMonitor: "Not monitored",
      memorySeenCount: 0,
    }
  }

  const isExcluded =
    memory.relevance === "Not Relevant" || memory.monitorStatus === "Ignore"

  const isRecalled =
    memory.relevance === "Relevant" || memory.monitorStatus === "Watchlist"

  return {
    ...record,
    memoryId: memory.id,
    memoryStatus: isExcluded ? "Filtered" : isRecalled ? "Recalled" : "Known",
    memoryDecision: isExcluded ? "exclude" : "show",
    memoryRelevance: memory.relevance || "Unreviewed",
    memoryMonitor: memory.monitorStatus || "Not monitored",
    memorySeenCount: memory.seenCount || 1,
    memoryNotes: memory.notes || "",
  }
}

const memoryAwareResults = useMemo(() => {
  return results.map((item) => applyMemoryFlag(item))
}, [results, memoryIndex])

const visibleResults = useMemo(() => {
  return memoryAwareResults.filter((item) => item.memoryDecision !== "exclude")
}, [memoryAwareResults])

const filteredMemoryResults = useMemo(() => {
  return memoryAwareResults.filter((item) => item.memoryDecision === "exclude")
}, [memoryAwareResults])

const recalledResults = useMemo(() => {
  return memoryAwareResults.filter((item) => item.memoryStatus === "Recalled")
}, [memoryAwareResults])

  const [platform, setPlatform] = useState('tiktok')
  const [scanType, setScanType] = useState('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState('20')
  const [demoMode, setDemoMode] = useState(false)
  const [status, setStatus] = useState('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [pushBusy, setPushBusy] = useState(false)
  const [lastIngestionSummary, setLastIngestionSummary] = useState(null)
  const [lastLimitOutcome, setLastLimitOutcome] = useState(null)
  const [token, setToken] = useState('')
  const [showCfg, setShowCfg] = useState(false)
  const approvedMaximum = resolveS2dApprovedMaximum({ tier: 'smokeTest' })
  const liveFacebookSources = useMemo(() => {
    return Array.isArray(facebookSourceRegistry?.sources)
      ? facebookSourceRegistry.sources.filter((entry) => String(entry?.pageUrl || '').trim())
      : []
  }, [])
  const [limitPlan, setLimitPlan] = useState({
    requestedMaximum: 20,
    actorRequestMaximum: 20,
    retrievalMaximum: 20,
    governedRetentionMaximum: 20,
    actorRequestParameter: '',
    actorSupportsHardLimit: false,
    actorRequestApplied: false,
    warnings: [],
  })
  const P = SC_PLATFORMS[platform]
  const governedVisibleResults = useMemo(() => {
    const requestedMaximum = Number(lastLimitOutcome?.requestedMaximum || limitPlan.requestedMaximum || approvedMaximum)
    const governed = enforceGovernedRecordLimit(visibleResults, requestedMaximum, { approvedMaximum })
    return governed.enforcementStatus === 'FAIL' ? [] : governed.retainedRecords
  }, [visibleResults, lastLimitOutcome, limitPlan.requestedMaximum, approvedMaximum])
  const isAuto = false
  const searchMeta = SC_SEARCH_META[scanType] || SC_SEARCH_META.default
  const terms = useMemo(() => {
  return String(query)
    .split(/[,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}, [query])
  const canScan = isAuto || terms.length > 0
  function changeScanType(v) { setScanType(v); setQuery('') }
  useEffect(() => { storage.get(LEGACY_SCRAPER_CFG_KEY, null).then((c) => { if (c) setToken(c.token || '') }) }, [])

  useEffect(() => {
    const uiLimit = resolveUiRequestedMaximum({
      scanType,
      limit,
      approvedMaximum,
    })

    if (!uiLimit.valid) {
      setLimitPlan((current) => ({
        ...current,
        warnings: ['Invalid results limit. Silent fallback is disabled; choose a valid approved maximum.'],
      }))
      return
    }

    const requestedMaximum = uiLimit.requestedMaximum

    if (demoMode || !token || !platform) {
      setLimitPlan({
        requestedMaximum,
        actorRequestMaximum: requestedMaximum,
        retrievalMaximum: requestedMaximum,
        governedRetentionMaximum: requestedMaximum,
        actorRequestParameter: scanType === 'Post URL' ? 'postURL' : 'limit',
        actorSupportsHardLimit: false,
        actorRequestApplied: false,
        warnings: [],
      })
      return
    }

    fetch('/api/scrape/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        scanType,
        query: terms.join(', '),
        keywords: isAuto ? SC_KEYWORDS : [],
        limit: requestedMaximum,
        dateFilter: 'Last Month',
        proxy: true,
      }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(body.error || `Prepare failed: ${response.status}`)
        }
        return body
      })
      .then((body) => {
        const prepared = body.limitPlan || {}
        setLimitPlan({
          requestedMaximum,
          actorRequestMaximum: Number(prepared.actorRequestMaximum || requestedMaximum),
          retrievalMaximum: Number(prepared.retrievalMaximum || requestedMaximum),
          governedRetentionMaximum: Number(prepared.governedRetentionMaximum || requestedMaximum),
          actorRequestParameter: prepared.actorRequestParameter || '',
          actorSupportsHardLimit: prepared.actorSupportsHardLimit === true,
          actorRequestApplied: prepared.actorRequestApplied === true,
          warnings: Array.isArray(prepared.warnings) ? prepared.warnings : [],
        })
      })
      .catch((error) => {
        setLimitPlan((current) => ({
          ...current,
          requestedMaximum,
          actorRequestMaximum: requestedMaximum,
          retrievalMaximum: requestedMaximum,
          governedRetentionMaximum: requestedMaximum,
          warnings: [error.message || 'Unable to prepare limit plan.'],
        }))
      })
  }, [platform, scanType, limit, approvedMaximum, token, demoMode, terms, isAuto])

  async function runScan() {
    if (!canScan) { toast(`Enter ${searchMeta.label.toLowerCase()} first`, T.amber); return }
    const uiLimit = resolveUiRequestedMaximum({ scanType, limit, approvedMaximum })
    if (!uiLimit.valid) {
      setStatus('error')
      setStatusMsg(`Invalid requested maximum: ${uiLimit.errors.join(', ')}`)
      toast('Invalid results limit. Silent fallback is disabled.', T.red)
      return
    }

    const requestedMaximum = uiLimit.requestedMaximum
    setStatus('running'); setStatusMsg(`Scanning ${P.label} for "${terms.join(', ')}"…`)
    try {
      let items
      let providerReturnedCount = 0
      let retainedCount = 0
      let excessDiscardedCount = 0
      let limitEnforcementStatus = 'PASS'
      let runStats = {}
      if (demoMode) { await new Promise((r) => setTimeout(r, 800)); items = scMakeDemo(platform, requestedMaximum) }
      else {
        if (!token) { setStatus('error'); setStatusMsg('No Apify token configured.'); toast('Set Apify token in Connection settings', T.amber); return }
        const res = await fetch(`/api/scrape/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, scanType, query: terms.join(', '), keywords: isAuto ? SC_KEYWORDS : [], limit: requestedMaximum, dateFilter: 'Last Month', proxy: true, apifyToken: token }) })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(`${body.code ? `${body.code}: ` : ''}${body.error || `Backend ${res.status}`}`)
        }
        const body = await res.json()
        const governedRaw = enforceGovernedRecordLimit(body.items || [], requestedMaximum, { approvedMaximum })
        if (governedRaw.enforcementStatus === 'FAIL') {
          throw new Error(`Governed retention failed: ${(governedRaw.errors || []).join(', ')}`)
        }

        providerReturnedCount = Number(body?.runStats?.providerReturned || governedRaw.providerReturnedCount || 0)
        retainedCount = governedRaw.retainedCount
        excessDiscardedCount = governedRaw.excessDiscardedCount
        limitEnforcementStatus = body?.runStats?.limitEnforcementStatus || governedRaw.enforcementStatus || 'PASS'
        runStats = body?.runStats || {}

        items = governedRaw.retainedRecords.map((raw) => scNormalize(platform, raw))
      }
      if (demoMode) {
        const governedDemo = enforceGovernedRecordLimit(items, requestedMaximum, { approvedMaximum })
        if (governedDemo.enforcementStatus === 'FAIL') {
          throw new Error(`Governed retention failed: ${(governedDemo.errors || []).join(', ')}`)
        }
        items = governedDemo.retainedRecords
        providerReturnedCount = governedDemo.providerReturnedCount
        retainedCount = governedDemo.retainedCount
        excessDiscardedCount = governedDemo.excessDiscardedCount
        limitEnforcementStatus = governedDemo.enforcementStatus
      }
      const taggedItems = items.map((item) => applyMemoryFlag(item))
const visibleCount = taggedItems.filter((item) => item.memoryDecision !== "exclude").length
const filteredCount = taggedItems.filter((item) => item.memoryDecision === "exclude").length
const recalledCount = taggedItems.filter((item) => item.memoryStatus === "Recalled").length

scrapeStore.add(taggedItems)
setLastLimitOutcome({
  requestedMaximum,
  providerReturnedCount,
  retainedCount,
  excessDiscardedCount,
  limitEnforcementStatus,
  actorRequestMaximum: Number(runStats.actorRequestMaximum || requestedMaximum),
  retrievalMaximum: Number(runStats.retrievalMaximum || requestedMaximum),
  governedRetentionMaximum: Number(runStats.governedRetentionMaximum || requestedMaximum),
  actorRequestParameter: runStats.actorRequestParameter || limitPlan.actorRequestParameter || '',
  actorSupportsHardLimit: runStats.actorSupportsHardLimit === true || limitPlan.actorSupportsHardLimit === true,
  actorRequestApplied: runStats.actorRequestApplied === true || limitPlan.actorRequestApplied === true,
})
setStatus('done')
setStatusMsg(
  `Provider returned ${providerReturnedCount} · retained ${retainedCount} (approved max ${requestedMaximum}) · ${visibleCount} visible ${P.noun}${terms.length ? ` for "${terms.join(', ')}"` : ''} · ${filteredCount} filtered · ${recalledCount} recalled`
)
toast(
  `${providerReturnedCount} provider returned · ${retainedCount} retained · ${filteredCount} filtered by Link Library · ${recalledCount} recalled`,
  P.accent
)
    } catch (e) {
      const net = /failed to fetch|networkerror|load failed/i.test(e.message || '')
      setStatus('error'); setStatusMsg(net ? 'Cannot reach /api/scrape/run — restart `npm run dev` so the new vite.config.js loads.' : e.message); toast(net ? 'Proxy unreachable' : `Scan failed: ${e.message}`, T.red)
    }
  }
  async function testConnection() {
    if (demoMode) { toast('Demo mode is on — untick it to test live', T.blue); return }
    if (!token) { toast('Paste your Apify token first', T.amber); return }
    setStatusMsg('Testing connection…')
    try {
      const res = await fetch(`/api/scrape/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apifyToken: token }) })
      const body = await res.json().catch(() => ({}))
      
      if (res.ok) {
        saveApifyToken(token);

        setStatus('done');
        setStatusMsg(`Backend OK · Apify plan: ${body.plan || 'free'}`);
        toast('Connection OK', T.green);
      }
      else { setStatus('error'); setStatusMsg(`Rejected: ${body.error || res.status}`); toast(`Apify: ${body.error || res.status}`, T.amber) }
    } catch (e) {
      const net = /failed to fetch|networkerror|load failed/i.test(e.message || '')
      setStatus('error'); setStatusMsg(net ? 'Cannot reach /api/scrape/test — restart `npm run dev` so vite.config.js loads.' : e.message); toast('Proxy unreachable', T.red)
    }
  }
  async function pushToFeed() {
    if (!governedVisibleResults.length) {
      toast('No visible scraper results to push', T.amber)
      return
    }
    if (typeof ingestScrapedRecords !== 'function') {
      toast('Ingestion pipeline is unavailable', T.red)
      return
    }

    setPushBusy(true)
    try {
      const requestedMaximum = Number(lastLimitOutcome?.requestedMaximum || limitPlan.requestedMaximum || approvedMaximum)
      const governedForIngestion = enforceGovernedRecordLimit(governedVisibleResults, requestedMaximum, { approvedMaximum })
      if (governedForIngestion.enforcementStatus === 'FAIL') {
        throw new Error(`Ingestion blocked by limit enforcement: ${(governedForIngestion.errors || []).join(', ')}`)
      }
      if (governedForIngestion.excessDiscardedCount > 0) {
        toast(`Ingestion capped to approved maximum ${requestedMaximum}; ${governedForIngestion.excessDiscardedCount} excess records discarded before Signal Feed.`, T.amber)
      }

      const result = await ingestScrapedRecords(governedForIngestion.retainedRecords, {
        collectionRunId: `SCRAPE-${Date.now()}`,
        actorId: '',
        datasetId: '',
      })
      const summary = result?.summary || {
        received: governedForIngestion.retainedCount,
        accepted: 0,
        duplicates: 0,
        quarantined: 0,
        rejected: 0,
        failed: 0,
      }
      setLastIngestionSummary(summary)
      toast(`${summary.accepted} accepted · ${summary.duplicates} duplicates · ${summary.quarantined} quarantined · ${summary.rejected} rejected · ${summary.failed} failed`, summary.failed ? T.amber : T.green)
    } catch (error) {
      toast(`Ingestion failed: ${error?.message || 'Unknown error'}`, T.red)
    } finally {
      setPushBusy(false)
    }
  }
  const counts = useMemo(
  () => SC_ORDER.map((id) => [id, governedVisibleResults.filter((r) => r.platform === id).length]),
  [governedVisibleResults]
)
    const availableLimitOptions = useMemo(
      () => ['10', '20', '25', '50', '100'].filter((entry) => Number(entry) <= approvedMaximum),
      [approvedMaximum]
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Data entry · Apify" title="Social Scraper" accent={T.magenta} sub="TikTok · Facebook · Instagram · Threads — public posts into S2D signals" />

      <div style={{ ...S.card, padding: 14, borderLeft: `3px solid ${demoMode ? T.blue : T.green}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: T.sub }}>{demoMode ? 'Demo mode — synthetic public posts, no API calls. Untick to scan live via Apify.' : 'Live mode — calls /api/scrape/run through the built-in Vite proxy. Just paste your token and Test.'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: T.sub, cursor: 'pointer' }}><input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} style={{ accentColor: T.green }} /> Demo mode</label>
          <Btn ghost accent={T.teal} onClick={() => setShowCfg(!showCfg)}>⚙ Connection</Btn>
        </div>
      </div>

      {showCfg && (
        <Panel title="Apify connection (PDPA — public data only)" accent={T.teal}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'end' }}>
            <Field label="Apify API token" hint="From console.apify.com. Sent to the built-in proxy; no separate backend needed."><FInput type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="apify_api_••••" /></Field>
            <Btn ghost accent={T.blue} onClick={testConnection}>Test</Btn>
            <Btn accent={T.teal} onClick={() => { storage.set(LEGACY_SCRAPER_CFG_KEY, { token }); toast('Connection saved', T.green); setShowCfg(false) }}>Save</Btn>
          </div>
        </Panel>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {SC_ORDER.map((id) => { const pp = SC_PLATFORMS[id], on = platform === id; return (
          <button key={id} onClick={() => setPlatform(id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${on ? pp.accent : T.border}`, background: on ? `${pp.accent}1c` : T.card, color: on ? pp.accent : T.sub, fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 13.5 }}><span style={{ fontSize: 15 }}>{pp.icon}</span>{pp.label}</button>
        ) })}
      </div>

      <Panel title={`${P.label} scan`} accent={P.accent} right={<span style={{ fontSize: 11, color: T.muted, fontFamily: FONT_MONO }}>score = polarity × ln(1+vol) × conf × SW × OW</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.7fr 1.6fr', gap: 12, marginBottom: 14 }}>
          <Field label="Scan type">
            <FSelect
            value={scanType}
            onChange={(e) => changeScanType(e.target.value)}
            options={['', 'Keyword Search', 'Hashtag', 'Profile / Page', 'Post URL']}
          />
        </Field>
          <Field label="Results"><FSelect value={limit} onChange={(e) => setLimit(e.target.value)} options={availableLimitOptions} /></Field>
          <Field label={searchMeta.label} hint={searchMeta.hint}>
            <FInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchMeta.placeholder} onKeyDown={(e) => { if (e.key === 'Enter') runScan() }} />
            {isAuto && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                {SC_KEYWORDS.map((k) => <button key={k} onClick={() => setQuery((q) => (q.trim() ? q + ', ' + k : k))} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 14, cursor: 'pointer', border: `1px solid ${T.border}`, background: T.card3, color: T.sub }}>+ {k}</button>)}
              </div>
            )}
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn accent={P.accent} onClick={runScan} busy={status === 'running'} disabled={!canScan}>▶ Run scan</Btn>
            <Btn ghost accent={T.green} onClick={pushToFeed} disabled={!governedVisibleResults.length || pushBusy}>
          ↥ Push {governedVisibleResults.length || ''} to Signal Feed
</Btn>
          <Btn ghost accent={T.muted} onClick={() => { scrapeStore.clear(); toast('Scraped results cleared', T.muted) }} disabled={!results.length}>Clear scraped</Btn>
            <div style={{ marginLeft: 'auto' }}><ExportBar rows={governedVisibleResults} cols={SCRAPE_COLS} baseName={`scrape-${platform}`} label="Export visible" /></div>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 12, color: T.sub }}>
          <div>Requested maximum: <b style={{ color: T.text }}>{limitPlan.requestedMaximum}</b></div>
          <div>Effective actor request maximum: <b style={{ color: T.text }}>{limitPlan.actorRequestMaximum}</b></div>
          <div>Governed retention maximum: <b style={{ color: T.text }}>{limitPlan.governedRetentionMaximum}</b></div>
          <div>Hard actor limit support: <b style={{ color: limitPlan.actorSupportsHardLimit ? T.green : T.amber }}>{limitPlan.actorSupportsHardLimit ? 'Supported' : 'Not confirmed'}</b></div>
        </div>
        {platform === 'facebook' && (
          <div style={{ ...S.card, marginTop: 12, padding: 14, background: T.card2, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: T.muted, fontWeight: 700 }}>Live registry preview</div>
                <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4 }}>Read directly from config/s2d-facebook-source-pages.json before the paid run.</div>
              </div>
              <div style={{ fontSize: 11.5, color: T.blue, fontWeight: 700 }}>{liveFacebookSources.length} sources</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 12 }}>
              {liveFacebookSources.map((entry) => (
                <div key={`${entry.category}-${entry.pageUrl}`} style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, background: T.bg2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 13.5, fontWeight: 600, color: T.text }}>{entry.label || entry.category || 'Facebook source'}</div>
                    <div style={{ fontSize: 10.5, color: T.blue, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Verified</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 5 }}>{entry.category || 'uncategorized'} · {entry.localityHint || 'Melaka'}</div>
                  <div style={{ fontSize: 11.5, color: T.sub, marginTop: 8, wordBreak: 'break-all' }}>{entry.pageUrl}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!limitPlan.actorSupportsHardLimit && !demoMode && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.amber }}>
            Provider hard limit support is not confirmed. Retrieval and governed retention limits are enforced to control excess collection and ingestion risk.
          </div>
        )}
        {limitPlan.warnings.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.amber }}>{limitPlan.warnings[0]}</div>
        )}
        {!canScan && <div style={{ marginTop: 10, fontSize: 12, color: T.amber }}>Enter {searchMeta.label.toLowerCase()} above to run a "{scanType}" scan.</div>}
        {status !== 'idle' && <div style={{ marginTop: 12, fontSize: 12.5, fontFamily: FONT_MONO, color: status === 'error' ? T.red : status === 'running' ? T.amber : T.green }}>{status === 'running' ? '◌ ' : status === 'done' ? '✓ ' : '✕ '}{statusMsg}</div>}
        {lastLimitOutcome && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: T.sub, fontFamily: FONT_MONO }}>
            Provider returned {lastLimitOutcome.providerReturnedCount} · Governed retained {lastLimitOutcome.retainedCount} · Excess discarded {lastLimitOutcome.excessDiscardedCount} · Status {lastLimitOutcome.limitEnforcementStatus}
          </div>
        )}
        {lastLimitOutcome?.excessDiscardedCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.amber }}>
            Provider returned more records than requested. S2D retained only the approved maximum and discarded excess records before normalization or storage.
          </div>
        )}
        {lastIngestionSummary && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: T.sub, fontFamily: FONT_MONO }}>
            {lastIngestionSummary.received} received · {lastIngestionSummary.accepted} accepted · {lastIngestionSummary.duplicates} duplicates · {lastIngestionSummary.quarantined} quarantined · {lastIngestionSummary.rejected} rejected · {lastIngestionSummary.failed} failed
          </div>
        )}
      </Panel>

      {memoryAwareResults.length > 0 && (
  <Panel
    title={`Scraped results · ${governedVisibleResults.length} visible · ${filteredMemoryResults.length} filtered`}
    accent={T.magenta}
    right={
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge color={T.green}>↺ {recalledResults.length} recalled</Badge>
        <Badge color={T.red}>⊘ {filteredMemoryResults.length} filtered</Badge>
        {counts.map(([id, n]) => (
          <Badge key={id} color={SC_PLATFORMS[id].accent}>
            {SC_PLATFORMS[id].icon} {n}
          </Badge>
        ))}
      </div>
    }
    pad={0}
  >
    <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 820 }}>
        <thead>
          <tr style={{ color: T.muted }}>
            {['Platform', 'Author', 'Date', 'Sentiment', 'Issue', 'Locality', 'Engagement', 'Score', 'Memory', 'Link', ''].map((h) => (
              <th
                key={h}
                style={{
                  padding: '9px 12px',
                  textAlign: 'left',
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  position: 'sticky',
                  top: 0,
                  background: T.card,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {governedVisibleResults.slice(0, 80).map((r) => (
            <tr key={r.id} style={{ borderTop: `1px solid ${T.borderSoft}` }}>
              <td style={{ padding: '8px 12px', color: SC_PLATFORMS[r.platform].accent }}>
                {SC_PLATFORMS[r.platform].icon}
              </td>

              <td style={{ padding: '8px 12px' }}>
                <div>@{r.author}</div>
                <div style={{ fontSize: 10.5, color: T.muted }}>{fmt(r.fans)} fans</div>
              </td>

              <td style={{ padding: '8px 12px', color: T.sub, whiteSpace: 'nowrap' }}>
                {r.date}
              </td>

              <td style={{ padding: '8px 12px' }}>
                <Badge color={r.sentiment === 'Positive' ? T.green : r.sentiment === 'Negative' ? T.red : T.amber}>
                  {r.sentiment}
                </Badge>
              </td>

              <td style={{ padding: '8px 12px', color: T.sub }}>{r.issue}</td>
              <td style={{ padding: '8px 12px', color: T.sub }}>{r.locality}</td>

              <td style={{ padding: '8px 12px', fontFamily: FONT_MONO, color: T.sub }}>
                ♥{fmt(r.likes)}{r.views ? ` ▶${fmt(r.views)}` : ''}
              </td>

              <td style={{ padding: '8px 12px', fontFamily: FONT_MONO, color: r.score > 0 ? T.green : r.score < 0 ? T.red : T.muted }}>
                {r.score.toFixed(2)}
              </td>

              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                <MemoryPill record={r} />
              </td>

              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: T.blue, textDecoration: 'none' }}>
                    ↗ view
                  </a>
                ) : (
                  <span style={{ color: T.muted }}>—</span>
                )}
              </td>

              <td style={{ padding: '8px 12px' }}>
                <button
                  title="Move to Link Library"
                  onClick={() => {
                    const nextMemory = addLinkToMemory({
                      ...r,
                      url: r.url,
                      platform: r.platform,
                      author: r.author,
                      handle: r.author,
                      title: r.text || r.title,
                      text: r.text,
                      locality: r.locality,
                      issue: r.issue,
                      sentiment: r.sentiment,
                      score: r.score,
                      relevance: "Unreviewed",
                      monitorStatus: "Not monitored",
                      deletedReason: "Deleted from Social Scraper table",
                      deletedFrom: "Social Scraper",
                    })

                    setLinkMemory(nextMemory)
                    scrapeStore.remove(r.id)
                    toast('Link moved to Link Library as Unreviewed', T.amber)
                  }}
                  style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer' }}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {filteredMemoryResults.length > 0 && (
      <div
        style={{
          margin: 12,
          padding: 12,
          border: `1px solid ${T.red}55`,
          background: `${T.red}12`,
          borderRadius: 12,
          color: T.sub,
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <b style={{ color: T.red }}>⊘ {filteredMemoryResults.length} result(s) filtered by Link Library.</b>
        <div>
          These links were previously marked as <b>Not Relevant</b> or <b>Ignore</b>, so they are excluded from visible scraper results and Signal Feed push.
        </div>
      </div>
    )}
  </Panel>
)}
    </div>
  )
}

/* ===========================================================================
   DATA ENTRY 2 — WATCHLIST
   =========================================================================== */
function Watchlist({ store, toast }) {
  const { items, save } = store
  const [draft, setDraft] = useState({ term: '', kind: 'hashtag', issueCategory: 'Public service', location: '' })
  function add() {
    if (!draft.term.trim()) return
    save([{ id: `W${Date.now()}`, ...draft }, ...items]); setDraft({ term: '', kind: 'hashtag', issueCategory: 'Public service', location: '' }); toast('Added to watchlist', T.teal)
  }
  function remove(id) { save(items.filter((i) => i.id !== id)); toast('Removed from watchlist', T.muted) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Data entry" title="Watchlist" accent={T.teal} sub="Keywords and hashtags the collector polls — each carries a default category and locality" />
      <Panel title="Add tracked term" accent={T.teal}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr 1.4fr auto', gap: 10, alignItems: 'end' }}>
          <Field label="Term"><FInput value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} placeholder="#airmelaka or 'water disruption'" /></Field>
          <Field label="Kind"><FSelect value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} options={['hashtag', 'keyword', 'username']} /></Field>
          <Field label="Category"><FSelect value={draft.issueCategory} onChange={(e) => setDraft({ ...draft, issueCategory: e.target.value })} options={ISSUE_OPTIONS} /></Field>
          <Field label="Default locality"><FInput value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Melaka Tengah / DUN …" /></Field>
          <Btn accent={T.teal} onClick={add}>Add</Btn>
        </div>
      </Panel>
      <Panel title={`Tracked terms · ${items.length}`} accent={T.teal} pad={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ color: T.muted }}>{['Term', 'Kind', 'Category', 'Locality', ''].map((h) => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                <td style={{ padding: '10px 16px', fontFamily: FONT_MONO, color: T.teal }}>{i.term}</td>
                <td style={{ padding: '10px 16px', color: T.sub }}>{i.kind}</td>
                <td style={{ padding: '10px 16px' }}><Badge color={T.purple}>{i.issueCategory}</Badge></td>
                <td style={{ padding: '10px 16px', color: T.sub }}>{i.location || '—'}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}><button onClick={() => remove(i.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 13 }}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

/* ===========================================================================
   COMBINED SENTIMENT ANALYSIS  — persistent unified view of all scraped data
   =========================================================================== */
function CombinedSentiment({ scrapeStore }) {
  const items = scrapeStore.scraped
  const stats = useMemo(() => {
    const total = items.length
    const pos = items.filter((r) => r.sentiment === 'Positive').length
    const neg = items.filter((r) => r.sentiment === 'Negative').length
    const eng = items.reduce((a, r) => a + r.engagement, 0)
    const avgPol = total ? items.reduce((a, r) => a + r.polarity, 0) / total : 0
    return { total, pos, neg, neu: total - pos - neg, eng, avgPol }
  }, [items])
  const issues = useMemo(() => { const m = {}; items.forEach((r) => { m[r.issue] = (m[r.issue] || 0) + 1 }); return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) }, [items])
  const counts = SC_ORDER.map((id) => [id, items.filter((r) => r.platform === id).length])
  const issueChipColors = [T.blue, T.amber, T.purple, T.teal, T.pink, T.green, T.red, T.muted]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHead eyebrow="Unified social view" title="Combined Sentiment Analysis" accent={T.pink} sub={`TikTok · Facebook · Instagram · Threads — ${stats.total} saved items`} />

      {items.length === 0 ? (
        <Empty msg="No scraped data yet. Run a scan in Social Scraper — results are saved here automatically." />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {counts.map(([id, n]) => <Badge key={id} color={SC_PLATFORMS[id].accent}>{SC_PLATFORMS[id].icon} {SC_PLATFORMS[id].label}: {n}</Badge>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ExportBar rows={items} cols={SCRAPE_COLS} baseName="combined-sentiment" label="Export all" />
              <button onClick={() => scrapeStore.clear()} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 12.5 }}>🗑 Clear All</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, background: T.bg2, borderRadius: 12, padding: 16 }}>
            {[['Total Posts', stats.total, T.blue], ['Positive', stats.pos, T.green], ['Negative', stats.neg, T.red], ['Neutral', stats.neu, T.amber], ['Engagement', fmt(stats.eng), T.purple], ['Avg Polarity', (stats.avgPol >= 0 ? '+' : '') + stats.avgPol.toFixed(2), stats.avgPol >= 0 ? T.green : T.red]].map(([k, v, c]) => (
              <div key={k} style={{ textAlign: 'center' }}><div style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 }}>{k}</div></div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel title="Top issues by volume" accent={T.blue}>
              <div style={{ height: Math.max(160, issues.length * 30) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={issues} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: T.sub, fontSize: 10.5 }} width={104} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: T.card3 }} contentStyle={{ background: T.card3, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
                    <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={15}>{issues.map((_, i) => <Cell key={i} fill={issueChipColors[i % 8]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Issue categories" accent={T.teal}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {issues.map((it, i) => <Badge key={it.name} color={issueChipColors[i % 8]}>{it.name.toUpperCase()}: {it.count}</Badge>)}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Sentiment split: <span style={{ color: T.green }}>{stats.pos} positive</span> · <span style={{ color: T.red }}>{stats.neg} negative</span> · <span style={{ color: T.amber }}>{stats.neu} neutral</span> across {stats.total} public posts. All data is publicly available and held locally.</div>
            </Panel>
          </div>

          <Panel title="Timeline — newest first" accent={T.pink} pad={0}>
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 780 }}>
                <thead><tr style={{ color: T.muted }}>{['Platform', 'Author', 'Date', 'Sentiment', 'Issue', 'Locality', 'Engagement', 'Score', 'Link', ''].map((h) => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, position: 'sticky', top: 0, background: T.card }}>{h}</th>)}</tr></thead>
                <tbody>
                  {items.slice(0, 200).map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                      <td style={{ padding: '8px 12px', color: SC_PLATFORMS[r.platform].accent }}>{SC_PLATFORMS[r.platform].icon}</td>
                      <td style={{ padding: '8px 12px' }}><div>@{r.author}</div><div style={{ fontSize: 10.5, color: T.muted }}>{fmt(r.fans)} fans</div></td>
                      <td style={{ padding: '8px 12px', color: T.sub, whiteSpace: 'nowrap' }}>{r.date}</td>
                      <td style={{ padding: '8px 12px' }}><Badge color={r.sentiment === 'Positive' ? T.green : r.sentiment === 'Negative' ? T.red : T.amber}>{r.sentiment}</Badge></td>
                      <td style={{ padding: '8px 12px', color: T.sub }}>{r.issue}</td>
                      <td style={{ padding: '8px 12px', color: T.sub }}>{r.locality}</td>
                      <td style={{ padding: '8px 12px', fontFamily: FONT_MONO, color: T.sub }}>♥{fmt(r.likes)}{r.views ? ` ▶${fmt(r.views)}` : ''}</td>
                      <td style={{ padding: '8px 12px', fontFamily: FONT_MONO, color: r.score > 0 ? T.green : r.score < 0 ? T.red : T.muted }}>{r.score.toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer" style={{ color: T.blue, textDecoration: 'none' }}>↗ view</a> : <span style={{ color: T.muted }}>—</span>}</td>
                      <td style={{ padding: '8px 12px' }}><button title="Remove" onClick={() => scrapeStore.remove(r.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer' }}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length > 200 && <div style={{ fontSize: 11.5, color: T.muted, padding: '10px 16px' }}>Showing 200 of {items.length}. Export for the full set.</div>}
          </Panel>
        </>
      )}
    </div>
  )
}

/* ===========================================================================
   CHROME — SectionHead, Sidebar, TopBar, App
   =========================================================================== */
function SectionHead({ eyebrow, title, sub, accent }) {
  return (
    <div>
      <div style={{ ...S.label, color: accent }}>{eyebrow}</div>
      <h1 style={{ margin: '4px 0 0', fontFamily: FONT_HEAD, fontSize: 25, fontWeight: 700, letterSpacing: -0.5 }}>{title}</h1>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>{sub}</p>}
    </div>
  )
}

const NAV_MODULES = [
  {
    key: 'intel-overview',
    group: 'Intelligence',
    label: 'Overview',
    items: [
      { id: 'tower', label: 'Command Tower', icon: '◈', accent: T.green },
      { id: 'daily-sentiment-snapshots', label: 'Daily Snapshots', icon: '◌', accent: T.teal },
      { id: 'feed', label: 'Signal Feed', icon: '≋', accent: T.blue },
      { id: 'echo', label: 'Echo Tracker', icon: '◊', accent: T.purple },
      { id: 'narrative', label: 'Narrative Echo', icon: '⚡', accent: T.magenta },
      { id: 'assistant', label: 'Assistant Console', icon: '🤖', accent: T.cyan },
      { id: 'link-recall-intelligence', label: 'Link Recall', icon: '◇', accent: T.cyan },
    ],
  },
  {
    key: 'intel-analysis',
    group: 'Intelligence',
    label: 'Analysis',
    items: [
      { id: 'local-signal-profiles', label: 'Local Signal Profiles', icon: '⬡', accent: T.blue },
      { id: 'change-point-detection', label: 'Change-Point Detection', icon: '⌁', accent: T.red },
      { id: 'narrative-driver-decomposition', label: 'Driver Decomposition', icon: '⌘', accent: T.purple },
      { id: 'narrative-propagation-graph', label: 'Propagation Graph', icon: '⌬', accent: T.teal },
      { id: 'diagnostic-case-builder', label: 'Diagnostic Cases', icon: '▧', accent: T.gold },
      { id: 'combined', label: 'Combined Sentiment', icon: '◉', accent: T.pink },
      { id: 'locality', label: 'Locality Intel', icon: '⬡', accent: T.teal },
      { id: 'brain', label: 'Digital Brain', icon: '◎', accent: T.purple },
    ],
  },
  {
    key: 'intel-forecasting',
    group: 'Intelligence',
    label: 'Forecasting',
    items: [
      { id: 'forecast-targets', label: 'Forecast Targets', icon: '⌁', accent: T.cyan },
      { id: 'baseline-forecasting', label: 'Baseline Forecasting', icon: '≈', accent: T.green },
      { id: 'feature-engineering', label: 'Feature Engineering', icon: '▦', accent: T.purple },
      { id: 'predictive-model-training', label: 'Model Training', icon: '∑', accent: T.gold },
      { id: 'backtesting-calibration', label: 'Backtesting & Calibration', icon: '◎', accent: T.blue },
      { id: 'decision-policy-engine', label: 'Decision Policy', icon: '⚖', accent: T.amber },
      { id: 'recommendation-scoring', label: 'Recommendation Scoring', icon: '▥', accent: T.purple },
      { id: 'recommendation-justification', label: 'Recommendation Justification', icon: '▨', accent: T.teal },
      { id: 'decision', label: 'Decision Console', icon: '✦', accent: T.amber },
    ],
  },
  {
    key: 'intel-reports',
    group: 'Intelligence',
    label: 'Reporting',
    items: [
      { id: 'automated-descriptive-reports', label: 'Descriptive Reports', icon: '▤', accent: T.amber },
      { id: 'narrative-content-brief', label: 'Narrative Content Brief', icon: '▧', accent: T.cyan },
      { id: 'daily-intelligence-brief', label: 'Daily Intelligence Brief', icon: '▩', accent: T.teal },
      { id: 'weekly-diagnostic-report', label: 'Weekly Diagnostic Report', icon: '▤', accent: T.purple },
      { id: 'constituency-intelligence-report', label: 'Constituency Intelligence', icon: '⬢', accent: T.blue },
      { id: 'after-action-effectiveness', label: 'After-Action Effectiveness', icon: '◫', accent: T.green },
    ],
  },
  {
    key: 'data-collection',
    group: 'Data Entry',
    label: 'Collection',
    items: [
      { id: 'intake', label: 'Signal Intake', icon: '＋', accent: T.blue },
      { id: 'watchlist', label: 'Watchlist', icon: '◎', accent: T.teal },
      { id: 'scraper', label: 'Social Scraper', icon: '⌖', accent: T.magenta },
      { id: 'social-listening-crawler', label: 'Listening Crawler', icon: '⌕', accent: T.cyan },
      { id: 'link-memory-library', label: 'Link Library', icon: '▣', accent: T.cyan },
    ],
  },
  {
    key: 'ops-hub',
    group: 'Operations',
    label: 'Operations Hub',
    items: [
      { id: 'live', label: 'Live Monitoring', icon: '📡', accent: T.teal },
      { id: 'family-tree', label: 'Engine Family Tree', icon: '⌂', accent: T.teal },
      { id: 'notify', label: 'Notification Center', icon: '🔔', accent: T.purple },
      { id: 'audit', label: 'Audit Log', icon: '📜', accent: T.blue },
      { id: 'backend', label: 'Backend Integration', icon: '🧩', accent: T.blue },
      { id: 'mvp', label: 'MVP Readiness', icon: '✅', accent: T.green },
      { id: 'monitoring-profiles', label: 'Monitoring Profiles', icon: '⌘', accent: T.teal },
      { id: 'ingestion-queue', label: 'Ingestion Queue', icon: '⎘', accent: T.amber },
      { id: 'diagnostics', label: 'Engine Diagnostics', icon: '🧪', accent: T.cyan },
      { id: 'johor-model-pack', label: 'Johor Model Pack', icon: '▣', accent: T.gold },
    ],
  },
  {
    key: 'ops-annotation',
    group: 'Operations',
    label: 'Annotation Ops',
    items: [
      { id: 'annotation-workbench', label: 'Annotation Workbench', icon: '✎', accent: T.purple },
      { id: 'annotation-acceptance', label: 'Annotation Acceptance', icon: '✓', accent: T.green },
      { id: 'johor-corpus-governance', label: 'Johor Corpus Governance', icon: '▤', accent: T.teal },
      { id: 'johor-corpus-staging', label: 'Johor Corpus Staging', icon: '▥', accent: T.amber },
      { id: 'johor-dual-annotation', label: 'Johor Dual Annotation', icon: '▦', accent: T.green },
      { id: 'johor-corpus-acceptance', label: 'Johor Corpus Acceptance', icon: '◆', accent: T.teal },
    ],
  },
  {
    key: 'ops-integration',
    group: 'Operations',
    label: 'Integration',
    items: [
      { id: 'state-learning-separation', label: 'State Learning Separation', icon: '▣', accent: T.amber },
      { id: 'domain-adaptation', label: 'Domain Adaptation', icon: '⇄', accent: T.teal },
      { id: 'pip-shared-contracts', label: 'PIP Shared Contracts', icon: '⇆', accent: T.purple },
      { id: 'pip-intelligence-api', label: 'Intelligence API', icon: '⇌', accent: T.blue },
      { id: 'pip-context-fusion', label: 'PIP Context Fusion', icon: '⧉', accent: T.teal },
    ],
  },
]

const NAV = NAV_MODULES.flatMap((section) => section.items.map((item) => ({ ...item, group: section.group, section: section.key })))
const NAV_BY_ID = Object.fromEntries(NAV.map((item) => [item.id, item]))
const PRIMARY_NAV_IDS = ['tower', 'daily-sentiment-snapshots', 'intake', 'decision']
const AUDIENCE_NAV_IDS = [
  'tower',
  'daily-sentiment-snapshots',
  'feed',
  'local-signal-profiles',
  'narrative-propagation-graph',
  'combined',
  'decision',
  'daily-intelligence-brief',
  'constituency-intelligence-report',
  'intake',
  'live',
]
const AUDIENCE_NAV_ID_SET = new Set(AUDIENCE_NAV_IDS)

function Sidebar({ active, go, collapsed, setCollapsed, pendingCount, portalMode }) {
  const groups = ['Intelligence', 'Data Entry', 'Operations']
  const [expandedSections, setExpandedSections] = useState(() => new Set(['intel-overview', 'data-collection']))
  const isAudienceMode = portalMode === 'AUDIENCE'

  const visibleSections = useMemo(() => {
    return NAV_MODULES.map((section) => ({
      ...section,
      items: section.items.filter((item) => !isAudienceMode || AUDIENCE_NAV_ID_SET.has(item.id)),
    })).filter((section) => section.items.length > 0)
  }, [isAudienceMode])

  useEffect(() => {
    const activeSection = NAV_BY_ID[active]?.section
    if (!activeSection) {
      return
    }
    setExpandedSections((prev) => {
      if (prev.has(activeSection)) {
        return prev
      }
      const next = new Set(prev)
      next.add(activeSection)
      return next
    })
  }, [active])

  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionKey)) {
        next.delete(sectionKey)
      } else {
        next.add(sectionKey)
      }
      return next
    })
  }, [])

  const renderNavButton = (n) => {
    const on = active === n.id
    return (
      <button
        key={n.id}
        onClick={() => go(n.id)}
        title={n.label}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: collapsed ? '11px 0' : '10px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          marginBottom: 2,
          borderRadius: 9,
          border: 'none',
          cursor: 'pointer',
          background: on ? T.card2 : 'transparent',
          color: on ? T.text : T.sub,
          fontFamily: FONT_BODY,
          fontSize: 13,
          position: 'relative',
        }}
      >
        <span style={{ color: on ? n.accent : T.muted, fontSize: 15, width: 18, textAlign: 'center' }}>{n.icon}</span>
        {!collapsed && <span style={{ fontWeight: on ? 600 : 400 }}>{n.label}</span>}
        {n.id === 'decision' && pendingCount > 0 && (
          <span style={{ marginLeft: 'auto', background: T.gold, color: '#06121a', fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: '1px 7px', fontFamily: FONT_MONO }}>
            {collapsed ? '' : pendingCount}
          </span>
        )}
        {on && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: n.accent, borderRadius: 3 }} />}
      </button>
    )
  }

  const quickItems = PRIMARY_NAV_IDS
    .map((id) => NAV_BY_ID[id])
    .filter((item) => item && (!isAudienceMode || AUDIENCE_NAV_ID_SET.has(item.id)))

  return (
    <div style={{ width: collapsed ? 64 : 230, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', transition: 'width .18s', flexShrink: 0 }}>
      <div style={{ padding: collapsed ? '18px 0' : '18px 18px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <img
          src="/assets/ritz-analytics-logo.png"
          alt="Ritz Analytics logo"
          style={{
           height: 42,
           width: 42,
           objectFit: 'contain',
           borderRadius: 10,
           flexShrink: 0
         }}
       />        
       {!collapsed && <div><div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, lineHeight: 1 }}>S2D 360</div><div style={{ fontSize: 10, color: T.muted, letterSpacing: 1 }}>RITZ ANALYTICS</div></div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
        <div style={{ marginBottom: 10 }}>
          {!collapsed && <div style={{ ...S.label, padding: '10px 8px 6px', fontSize: 10 }}>Quick Access</div>}
          {quickItems.map(renderNavButton)}
        </div>
        {groups.map((g) => {
          const groupSections = visibleSections
            .filter((section) => section.group === g)
            .map((section) => ({
              ...section,
              items: section.items.filter((item) => !PRIMARY_NAV_IDS.includes(item.id)),
            }))
            .filter((section) => section.items.length > 0)

          if (!groupSections.length) {
            return null
          }

          return (
            <div key={g} style={{ marginBottom: 8 }}>
              {!collapsed && <div style={{ ...S.label, padding: '8px 8px 6px', fontSize: 10 }}>{g}</div>}
              {groupSections.map((section) => {
                const open = expandedSections.has(section.key)
                const hasActive = section.items.some((item) => item.id === active)
                return (
                  <div key={section.key} style={{ marginBottom: 4 }}>
                    {!collapsed && (
                      <button
                        onClick={() => toggleSection(section.key)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          background: hasActive ? T.card2 : 'transparent',
                          color: hasActive ? T.text : T.muted,
                          fontFamily: FONT_BODY,
                          fontSize: 12,
                          letterSpacing: 0.2,
                        }}
                        title={`${open ? 'Collapse' : 'Expand'} ${section.label}`}
                      >
                        <span>{section.label}</span>
                        <span style={{ fontSize: 11 }}>{open ? '▾' : '▸'}</span>
                      </button>
                    )}
                    {!collapsed && open && section.items.map(renderNavButton)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, padding: collapsed ? '12px 0' : 14, display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: T.card3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: T.teal, fontWeight: 600, flexShrink: 0 }}>AN</div>
        {!collapsed && <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 500 }}>Analyst</div><div style={{ fontSize: 10.5, color: T.green }}>● Live monitoring</div></div>}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14 }}>{collapsed ? '»' : '«'}</button>
      </div>
    </div>
  )
}
function TopBar({ active, lang, setLang, count, portalMode, setPortalMode }) {
  const label = NAV_BY_ID[active]?.label || ''
  return (
    <div style={{ height: 56, borderBottom: `1px solid ${T.border}`, background: T.bg2, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 16, flexShrink: 0 }}>
      <div style={{ fontSize: 12.5, color: T.muted }}>S2D 360 <span style={{ margin: '0 6px' }}>/</span> <span style={{ color: T.text }}>{label}</span></div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11.5, color: T.muted, fontFamily: FONT_MONO }}>{count} signals · updated just now</span>
        <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {['AUDIENCE', 'OPERATIONS'].map((mode) => (
            <button
              key={mode}
              onClick={() => setPortalMode(mode)}
              style={{
                padding: '5px 10px',
                fontSize: 11,
                border: 'none',
                cursor: 'pointer',
                background: portalMode === mode ? T.card3 : 'transparent',
                color: portalMode === mode ? T.text : T.muted,
                fontFamily: FONT_BODY,
              }}
            >
              {mode === 'AUDIENCE' ? 'Audience' : 'Operations'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {['EN', 'BM'].map((l) => <button key={l} onClick={() => setLang(l)} style={{ padding: '5px 11px', fontSize: 11.5, border: 'none', cursor: 'pointer', background: lang === l ? T.card3 : 'transparent', color: lang === l ? T.text : T.muted, fontFamily: FONT_BODY }}>{l}</button>)}
        </div>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
      </div>
    </div>
  )
}

export default function App() {
  const { signals, loaded, storageStatus, addSignal, patchSignal, removeSignal, deleteSignal, reset, ingestScrapedRecords, commitRecoveredSignals } = useSignalStore()
  const watchStore = useWatchlistStore()
  const scrapeStore = useScrapeStore()
  const [active, setActive] = useState('tower')
  const [collapsed, setCollapsed] = useState(false)
  const [lang, setLang] = useState('EN')
  const [portalMode, setPortalMode] = useState('AUDIENCE')
  const [toast, setToast] = useState(null)
  const [activeSignal, setActiveSignal] = useState(null)
  const showToast = useCallback((msg, color) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2600) }, [])
  const go = useCallback((id) => setActive(id), [])
  const pending = useMemo(() => signals.filter((s) => s.approvalStatus === 'Draft').length, [signals])

  useEffect(() => {
    if (portalMode !== 'AUDIENCE') {
      return
    }
    if (!AUDIENCE_NAV_ID_SET.has(active)) {
      setActive('tower')
    }
  }, [portalMode, active])

  useEffect(() => {
    pipIntelligenceApiService.setRuntimeSignalSnapshot?.(signals)
    return () => {
      pipIntelligenceApiService.clearRuntimeSignalSnapshot?.()
    }
  }, [signals])
  useEffect(() => {
    pipContextFusionService.setRuntimeSignalSnapshot?.(signals)
    return () => {
      pipContextFusionService.clearRuntimeSignalSnapshot?.()
    }
  }, [signals])
  useEffect(() => () => {
    void pipContextFusionService.close?.()
    void pipIntelligenceApiService.close?.()
    void johorModelPackService.close?.()
    void johorModelPackStore.close?.()
    void pipSharedContractService.close?.()
    void domainAdaptationService.close?.()
    void domainAdaptationStore.close?.()
    void stateLearningSeparationService.close?.()
    void stateTransferPlanStore.close?.()
    void afterActionEffectivenessService.close?.()
    void constituencyIntelligenceReportService.close?.()
    void weeklyDiagnosticReportService.close?.()
    void dailyIntelligenceBriefService.close?.()
    void narrativeContentBriefService.close?.()
    void recommendationJustificationService.close?.()
    void recommendationScoringService.close?.()
    void decisionPolicyService.close?.()
    void backtestingCalibrationService.close?.()
    void predictiveModelTrainingService.close?.()
    void featureEngineeringService.close?.()
    void baselineForecastingService.close?.()
    void forecastTargetService.close?.()
    void diagnosticCaseBuilderService.close?.()
    void narrativePropagationGraphService.close?.()
    void narrativeDriverDecompositionService.close?.()
    void changePointDetectionService.close?.()
    void automatedDescriptiveReportService.close?.()
    void localSignalProfileService.close?.()
    void dailySentimentSnapshotService.close?.()
    void johorCorpusAcceptanceService.close?.()
    void johorDualAnnotationService.close?.()
    if (johorAnnotationWorkflowService !== annotationWorkflowService) {
      void johorAnnotationWorkflowService.close?.()
    }
    if (johorAnnotationStore !== annotationDurableStore) {
      void johorAnnotationStore.close?.()
    }
    void johorCorpusAcquisitionService.close?.()
    void johorCorpusStagingStore.close?.()
    void durableStorage.close()
    void ingestionPipeline.close()
    void ingestionArtifactStore.close()
    void ingestionRecoveryService.close()
    void monitoringProfileService.close()
    void monitoringProfileStore.close()
    void collectionExecutionClient.close()
    void datasetRetrievalClient.close()
    void scheduleClient.close()
    void webhookEventClient.close()
    void remoteActivationClient.close()
    void runReconciliationClient.close?.()
    void rawEvidenceStagingClient.close?.()
    void phase1AcceptanceClient.close?.()
    void annotationSuggestionService.close?.()
    void annotationWorkflowService.close?.()
    void annotationAcceptanceService.close?.()
    void annotationDurableStore.close?.()
  }, [])

  

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, color: T.text, fontFamily: FONT_BODY, fontSize: 14, overflow: 'hidden' }}>
      <style>{FONTS_CSS}</style>
      <Sidebar active={active} go={go} collapsed={collapsed} setCollapsed={setCollapsed} pendingCount={pending} portalMode={portalMode} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar active={active} lang={lang} setLang={setLang} count={signals.length} portalMode={portalMode} setPortalMode={setPortalMode} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {!loaded ? <Empty msg="Loading signals…" /> : (
            <div style={{ maxWidth: 1180, margin: '0 auto' }}>
              {active === 'tower' && <CommandTower signals={signals} go={go} />}
              {active === 'daily-sentiment-snapshots' && (
                <S2DDailySentimentSnapshotsPage
                  dailySentimentSnapshotService={dailySentimentSnapshotService}
                />
              )}
              {active === 'local-signal-profiles' && (
                <S2DLocalSignalProfilesPage
                  localSignalProfileService={localSignalProfileService}
                  lang={lang}
                />
              )}
              {active === 'automated-descriptive-reports' && (
                <S2DAutomatedDescriptiveReportsPage
                  reportService={automatedDescriptiveReportService}
                />
              )}
              {active === 'change-point-detection' && (
                <S2DChangePointDetectionPage
                  changePointService={changePointDetectionService}
                />
              )}
              {active === 'narrative-driver-decomposition' && (
                <S2DNarrativeDriverDecompositionPage
                  driverService={narrativeDriverDecompositionService}
                />
              )}
              {active === 'narrative-propagation-graph' && (
                <S2DNarrativePropagationGraphPage
                  propagationService={narrativePropagationGraphService}
                />
              )}
              {active === 'diagnostic-case-builder' && (
                <S2DDiagnosticCaseBuilderPage
                  diagnosticCaseService={diagnosticCaseBuilderService}
                />
              )}
              {active === 'forecast-targets' && (
                <S2DForecastTargetsPage
                  forecastTargetService={forecastTargetService}
                />
              )}
              {active === 'baseline-forecasting' && (
                <S2DBaselineForecastingPage
                  baselineForecastingService={baselineForecastingService}
                />
              )}
              {active === 'feature-engineering' && (
                <S2DFeatureEngineeringPage
                  featureEngineeringService={featureEngineeringService}
                />
              )}
              {active === 'predictive-model-training' && (
                <S2DPredictiveModelTrainingPage
                  predictiveModelTrainingService={predictiveModelTrainingService}
                />
              )}
              {active === 'backtesting-calibration' && (
                <S2DBacktestingCalibrationPage
                  backtestingCalibrationService={backtestingCalibrationService}
                />
              )}
              {active === 'decision-policy-engine' && (
                <S2DDecisionPolicyEnginePage
                  decisionPolicyService={decisionPolicyService}
                />
              )}
              {active === 'recommendation-scoring' && (
                <S2DRecommendationScoringPage
                  recommendationScoringService={recommendationScoringService}
                />
              )}
              {active === 'recommendation-justification' && (
                <S2DRecommendationJustificationPage
                  service={recommendationJustificationService}
                />
              )}
              {active === 'narrative-content-brief' && (
                <S2DNarrativeContentBriefPage
                  service={narrativeContentBriefService}
                />
              )}
              {active === 'daily-intelligence-brief' && (
                <S2DDailyIntelligenceBriefPage
                  service={dailyIntelligenceBriefService}
                  lang={lang}
                  snapshotService={dailySentimentSnapshotService}
                />
              )}
              {active === 'weekly-diagnostic-report' && (
                <S2DWeeklyDiagnosticReportPage
                  service={weeklyDiagnosticReportService}
                />
              )}
              {active === 'constituency-intelligence-report' && (
                <S2DConstituencyIntelligenceReportPage
                  service={constituencyIntelligenceReportService}
                  lang={lang}
                />
              )}
              {active === 'after-action-effectiveness' && (
                <S2DAfterActionEffectivenessReportPage
                  service={afterActionEffectivenessService}
                />
              )}
              {active === 'johor-model-pack' && (
                <S2DJohorModelPackPage
                  service={johorModelPackService}
                />
              )}
              {active === 'state-learning-separation' && (
                <S2DStateLearningSeparationPage
                  service={stateLearningSeparationService}
                />
              )}
              {active === 'domain-adaptation' && (
                <S2DDomainAdaptationPage
                  service={domainAdaptationService}
                />
              )}
              {active === 'pip-shared-contracts' && (
                <S2DSharedContractsPage
                  service={pipSharedContractService}
                />
              )}
              {active === 'pip-intelligence-api' && (
                <S2DIntelligenceApiPage
                  service={pipIntelligenceApiService}
                  signals={signals}
                />
              )}
              {active === 'pip-context-fusion' && (
                <S2DPipContextFusionPage
                  service={pipContextFusionService}
                  signals={signals}
                />
              )}
              {active === 'feed' && (
                <SignalFeed
                  signals={signals}
                  go={go}
                  setActiveSignal={setActiveSignal}
                  patchSignal={patchSignal}
                  removeSignal={removeSignal}
                  deleteSignal={deleteSignal}
                />
     )}
              {active === 'echo' && <EchoTracker signals={signals} />}
              {active === 'narrative' && <S2DNarrativeEchoPanel signals={signals} />}
              {active === 'assistant' && <S2DAssistantConsole signals={signals} />}
              {active === 'locality' && <LocalityIntel signals={signals} />}
              {active === 'decision' && <DecisionConsole signals={signals} patchSignal={patchSignal} activeSignal={activeSignal} toast={showToast} />}
              {active === 'combined' && <CombinedSentiment scrapeStore={scrapeStore} />}
              {active === 'intake' && <SignalIntake addSignal={addSignal} toast={showToast} />}
              {active === 'watchlist' && <Watchlist store={watchStore} toast={showToast} />}
              {active === 'scraper' && <SocialScraper addSignal={addSignal} ingestScrapedRecords={ingestScrapedRecords} toast={showToast} scrapeStore={scrapeStore} />}
              {active === 'link-memory-library' && <S2DLinkMemoryLibraryPage />}
              {active === 'social-listening-crawler' && <S2DSocialListeningCrawlerPage />}
              {active === 'brain' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <S2DNetworkGraphPanel signals={signals} />
                <S2DDigitalBrainPanel signals={signals} />
               </div>
          )}
              {active === 'live' && <S2DLiveMonitoringPage signals={signals} lang={lang} go={go} />}
              {active === 'family-tree' && (
                <S2DEngineFamilyTreePage
                  navModules={NAV_MODULES}
                  audienceNavIds={AUDIENCE_NAV_IDS}
                  portalMode={portalMode}
                  active={active}
                  go={go}
                  lang={lang}
                />
              )}
              {active === 'notify' && <S2DNotificationCenterPage />}
              {active === 'audit' && <S2DAuditLogPage />}
              {active === 'backend' && <S2DBackendIntegrationPage />}
              {active === 'mvp' && <S2DMVPReadinessPage />}
              {active === 'monitoring-profiles' && (
                <S2DMonitoringProfilesPage
                  monitoringService={monitoringProfileService}
                  executionClient={collectionExecutionClient}
                  retrievalClient={datasetRetrievalClient}
                  scheduleClient={scheduleClient}
                  webhookEventClient={webhookEventClient}
                  remoteActivationClient={remoteActivationClient}
                  runReconciliationClient={runReconciliationClient}
                  rawEvidenceStagingClient={rawEvidenceStagingClient}
                  phase1AcceptanceClient={phase1AcceptanceClient}
                  toast={showToast}
                />
              )}
              {active === 'ingestion-queue' && (
                <S2DIngestionOperationsPage
                  recoveryService={ingestionRecoveryService}
                  onRecoveredSignals={commitRecoveredSignals}
                  onIngestTestRecords={ingestScrapedRecords}
                  toast={showToast}
                />
              )}
              {active === 'annotation-workbench' && (
                <S2DAnnotationWorkbenchPage
                  annotationStore={annotationDurableStore}
                  annotationWorkflowService={annotationWorkflowService}
                  annotationSuggestionService={annotationSuggestionService}
                  signals={signals}
                  toast={showToast}
                />
              )}
              {active === 'annotation-acceptance' && (
                <S2DAnnotationAcceptancePage
                  acceptanceService={annotationAcceptanceService}
                  toast={showToast}
                />
              )}
              {active === 'johor-corpus-governance' && (
                <S2DJohorCorpusGovernancePage
                  toast={showToast}
                />
              )}
              {active === 'johor-corpus-staging' && (
                <S2DJohorCorpusStagingPage
                  acquisitionService={johorCorpusAcquisitionService}
                  toast={showToast}
                  batchLabel={S2D_RUNTIME_STAGING_BATCH_LABEL}
                  corpusLabel={S2D_RUNTIME_STAGING_TITLE}
                  defaultCorpusId={S2D_RUNTIME_CORPUS_ID}
                  defaultSamplingManifestId={S2D_RUNTIME_SAMPLING_MANIFEST_ID}
                  defaultPackageSchema={S2D_RUNTIME_PACKAGE_SCHEMA}
                />
              )}
              {active === 'johor-dual-annotation' && (
                <S2DJohorDualAnnotationPage
                  dualAnnotationService={johorDualAnnotationService}
                  toast={showToast}
                  batchLabel={S2D_RUNTIME_DUAL_BATCH_LABEL}
                  title={S2D_RUNTIME_DUAL_TITLE}
                  stagingDatabaseFallback={S2D2C3_CORPUS_STAGING_DATABASE_NAME}
                  corpusIdFallback={S2D_RUNTIME_CORPUS_ID}
                  stagingGuideLabel={S2D_RUNTIME_STAGING_TITLE}
                  dualAnnotationGuideLabel={S2D_RUNTIME_DUAL_TITLE}
                />
              )}
              {active === 'johor-corpus-acceptance' && (
                <S2DJohorCorpusAcceptancePage
                  acceptanceService={johorCorpusAcceptanceService}
                  toast={showToast}
                />
              )}
              {active === 'diagnostics' && <S2DDebugPanel signals={signals} />}
              {active === 'link-recall-intelligence' && <S2DLinkRecallIntelligencePage />}
              
              {portalMode === 'AUDIENCE' ? (
                <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, fontSize: 11.5, color: T.muted }}>
                  S2D 360 analyses public signals for decision support. Human approval is required before any response.
                </div>
              ) : (
                <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: T.muted }}>
                  <span>
                    S2D 360 · decision-support over public signals · human approval required before any response ·
                    <span style={{ marginLeft: 6, color: storageStatus.mode === 'indexeddb' ? T.green : storageStatus.mode === 'legacy-fallback' ? T.amber : T.muted }}>
                      Storage: {storageStatus.mode === 'indexeddb' ? 'IndexedDB' : storageStatus.mode === 'legacy-fallback' ? 'Legacy fallback' : 'Uninitialised'}
                    </span>
                    <span style={{ marginLeft: 6, color: T.teal }}>Core DB: v4</span>
                    <span style={{ marginLeft: 6, color: T.teal }}>Annotation: Human review</span>
                    <span style={{ marginLeft: 6, color: T.blue }}>Apify execution: Manual</span>
                    <span style={{ marginLeft: 6, color: T.amber }}>Dataset retrieval: Controlled</span>
                    <span style={{ marginLeft: 6, color: T.green }}>Scheduling: Governance only</span>
                    <span style={{ marginLeft: 6, color: T.purple }}>Webhook receiver: Staged</span>
                    <span style={{ marginLeft: 6, color: T.teal }}>Remote automation: Controlled</span>
                    <span style={{ marginLeft: 6, color: T.blue }}>Run reconciliation: Staged</span>
                    <span style={{ marginLeft: 6, color: T.green }}>Raw evidence staging: Controlled</span>
                    {PHASE1_CLOSURE_MANIFEST_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.green }}>Phase S2D-1: Accepted</span>
                    )}
                    {S2D2B_CLOSURE_MANIFEST_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.green }}>Phase S2D-2B: Accepted</span>
                    )}
                    {S2D2C1_CORPUS_CONTRACT_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Johor Corpus Contract: Accepted</span>
                    )}
                    {S2D2C2_CORPUS_STAGING_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.amber }}>Johor Corpus Staging: Accepted</span>
                    )}
                    {S2D2C3_DUAL_ANNOTATION_IMPLEMENTATION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.green }}>Johor Dual Annotation: Implemented</span>
                    )}
                    {S2D2C4_CORPUS_ACCEPTANCE_IMPLEMENTATION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Johor Corpus Acceptance: Implemented</span>
                    )}
                    {S2D3A_DAILY_SENTIMENT_SNAPSHOTS_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Daily Sentiment Snapshots: Implemented</span>
                    )}
                    {S2D3B_LOCAL_SIGNAL_PROFILES_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.blue }}>Local Signal Profiles: Implemented</span>
                    )}
                    {S2D3C_AUTOMATED_DESCRIPTIVE_REPORTS_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.amber }}>Automated Descriptive Reports: Implemented</span>
                    )}
                    {S2D4A_CHANGE_POINT_DETECTION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.red }}>Change-Point Detection: Implemented</span>
                    )}
                    {S2D4B_NARRATIVE_DRIVER_DECOMPOSITION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.purple }}>Driver Decomposition: Implemented</span>
                    )}
                    {S2D4C_NARRATIVE_PROPAGATION_GRAPH_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Narrative Propagation Graph: Implemented</span>
                    )}
                    {S2D4D_DIAGNOSTIC_CASE_BUILDER_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.gold }}>Diagnostic Case Builder: Implemented</span>
                    )}
                    {S2D5A_FORECAST_TARGETS_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.blue }}>Forecast Targets: Implemented</span>
                    )}
                    {S2D5B_BASELINE_FORECASTING_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.green }}>Baseline Forecasting: Implemented</span>
                    )}
                    {S2D5C_FEATURE_ENGINEERING_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.purple }}>Feature Engineering: Implemented</span>
                    )}
                    {S2D5D_PREDICTIVE_MODEL_TRAINING_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.gold }}>Predictive Model Training: Implemented</span>
                    )}
                    {S2D5E_BACKTESTING_CALIBRATION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.blue }}>Backtesting and Calibration: Implemented</span>
                    )}
                    {S2D6A_DECISION_POLICY_ENGINE_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.amber }}>Decision Policy Engine: Implemented</span>
                    )}
                    {S2D6B_RECOMMENDATION_SCORING_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.purple }}>Recommendation Scoring: Implemented</span>
                    )}
                    {S2D6C_RECOMMENDATION_JUSTIFICATION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Recommendation Justification: Implemented</span>
                    )}
                    {S2D6D_NARRATIVE_CONTENT_BRIEF_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.cyan }}>Narrative Content Brief: Implemented</span>
                    )}
                    {S2D7A_DAILY_INTELLIGENCE_BRIEF_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Daily Intelligence Brief: Implemented</span>
                    )}
                    {S2D7B_WEEKLY_DIAGNOSTIC_REPORT_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.purple }}>Weekly Diagnostic Report: Implemented</span>
                    )}
                    {S2D7C_CONSTITUENCY_INTELLIGENCE_REPORT_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.blue }}>Constituency Intelligence Report: Implemented</span>
                    )}
                    {S2D7D_AFTER_ACTION_EFFECTIVENESS_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.green }}>After-Action Effectiveness Report: Implemented</span>
                    )}
                    {S2D8A_JOHOR_MODEL_PACK_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.gold }}>Johor Model Pack: Implemented</span>
                    )}
                    {S2D8B_STATE_LEARNING_SEPARATION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.amber }}>State Learning Separation: Implemented</span>
                    )}
                    {S2D8C_DOMAIN_ADAPTATION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>Domain Adaptation: Implemented</span>
                    )}
                    {S2D9A_SHARED_CONTRACTS_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.purple }}>PIP Shared Contracts: Implemented</span>
                    )}
                    {S2D9B_INTELLIGENCE_API_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.blue }}>Intelligence API v1: Implemented</span>
                    )}
                    {S2D9C_PIP_CONTEXT_FUSION_STATUS === "PASSED" && (
                      <span style={{ marginLeft: 6, color: T.teal }}>PIP Context Fusion: Implemented</span>
                    )}
                    <span style={{ marginLeft: 6, color: T.teal }}>
                      Fusion Mode: {S2D9C_RUNTIME_MODE === "CONTROLLED_IMPORT" ? "Controlled Import" : S2D9C_RUNTIME_MODE}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>
                      Fusion Join: {S2D9C_JOIN_POLICY === "EXACT_GEOGRAPHY_CODE_ONLY" ? "Exact Geography Code Only" : S2D9C_JOIN_POLICY}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>
                      PIP Fusion Connection: {S2D9C_PIP_RUNTIME_CONNECTION_STATUS === "DISABLED" ? "Disabled" : S2D9C_PIP_RUNTIME_CONNECTION_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>
                      PIP Fusion Write: {S2D9C_PIP_WRITE_STATUS === "DISABLED" ? "Disabled" : S2D9C_PIP_WRITE_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.amber }}>
                      Fusion Production: {S2D9C_PRODUCTION_ACTIVATION_STATUS === "NOT_AUTHORISED" ? "Not Authorised" : S2D9C_PRODUCTION_ACTIVATION_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.red }}>
                      Social Account–Voter Linkage: {S2D9C_SOCIAL_VOTER_LINKAGE_STATUS === "PROHIBITED" ? "Prohibited" : S2D9C_SOCIAL_VOTER_LINKAGE_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.blue }}>
                      API Mode: {S2D9B_API_RUNTIME_MODE === "CONTROLLED_LOCAL" ? "Controlled Local" : S2D9B_API_RUNTIME_MODE}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>
                      Public API Exposure: {S2D9B_PUBLIC_NETWORK_EXPOSURE_STATUS === "DISABLED" ? "Disabled" : S2D9B_PUBLIC_NETWORK_EXPOSURE_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>
                      PIP API Connection: {S2D9B_PIP_RUNTIME_CONNECTION_STATUS === "DISABLED" ? "Disabled" : S2D9B_PIP_RUNTIME_CONNECTION_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.amber }}>
                      API Production: {S2D9B_PRODUCTION_ACTIVATION_STATUS === "NOT_AUTHORISED" ? "Not Authorised" : S2D9B_PRODUCTION_ACTIVATION_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>
                      PIP Runtime: {S2D9A_PIP_RUNTIME_CONNECTION_STATUS === "DISABLED" ? "Disabled" : S2D9A_PIP_RUNTIME_CONNECTION_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.amber }}>
                      PIP Production: {S2D9A_PIP_PRODUCTION_ACTIVATION_STATUS === "NOT_AUTHORISED" ? "Not Authorised" : S2D9A_PIP_PRODUCTION_ACTIVATION_STATUS}
                    </span>
                    <span style={{ marginLeft: 6, color: T.muted }}>Corpus staging DB: {S2D2C3_CORPUS_STAGING_DATABASE_NAME}</span>
                    <span style={{ marginLeft: 6, color: T.muted }}>Annotation DB: {S2D2C3_ANNOTATION_DATABASE_NAME}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <ExportBar rows={signals} cols={SIGNAL_COLS} baseName="s2d-signals" label="Export signals" />
                    <button onClick={() => { reset(); showToast('Reset to seed data', T.purple) }} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.sub, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5 }}>Reset signals</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  )
}
