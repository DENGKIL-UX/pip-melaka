# PIP-MLK Engine Archive — Comprehensive Feature Research

> Truth Above All. This document catalogues ALL features found in the 162MB engine
> archive (7,525 files extracted, 144 JS/JSX modules in dashboard/src/) and maps
> each to its implementation status in the PIP-MLK Next.js 16 project.

## Archive source

- **Zip**: `upload/pipML-app1.zip` + `.z01/.z02/.z03` (162 MB total)
- **SHA-256**: `65623e788d1de0c2678e0f964fbbb35fcad762440000fd2f17573b68da64c69b`
- **Extracted source**: `engine-archive/` (146 files, 7.1 MB)
- **Main app**: `engine-archive/dashboard-src/App.jsx` (3 MB, 94,727 lines)

---

## Feature inventory (from archive + S2D Architecture_v2.txt)

### 1. Social Media Scraper / Apify Collection (S2D-1A)

**Archive status**: Architecture spec in S2D Architecture_v2.txt. App.jsx references `live_apify_execution_enabled` but shows "NO LIVE APIFY EXECUTION" (validation fixtures only).

**S2D Architecture spec**:
```
Apify public-source collection → S2D data foundation
Platforms: TikTok, Facebook, Instagram, Threads
```

**Signal model** (S2D-1A):
```json
{
  "signalId": "SIG-xxx-000001",
  "collectionRunId": "RUN-0001",
  "platform": "facebook|tiktok|instagram|threads",
  "source": { "sourceId", "authorLabel", "url", "text", "publishedAt", "collectedAt" },
  "metrics": { "followers", "views", "likes", "comments", "shares" },
  "classification": { "entities", "primaryIssue", "sentimentLabel", "sentimentPolarity", "narrativeClusterId" },
  "geography": { "stateCode", "parliamentCode", "dunCode", "dmCode", "localityCode", "confidence", "basis" }
}
```

**PIP-MLK status**: ✅ Implemented (S2D 360 tab with 6 seed signals across platforms)

### 2. Signal Feed (259 references in App.jsx)

**Archive**: `IntelligenceSignalsPanel` function at line 8023. Shows voter intelligence signals (age, gender, density, senior dependency).

**360 Command Centre**: `Pip360CommandCentrePanel` at line 85773. Shows signal summaries with sentiment, trend, narrative velocity, confidence.

**Signal summary fields** (from `pip-360-dual-layer-locality-contract.js`):
- `signal_summary_id`, `source_system`, `observation_window_start/end`
- `state_code`, `parliament_code`, `dun_code`, `dm_code`, `locality_code`
- `issue_label`, `issue_category`
- `sentiment_classification` (POSITIVE/NEUTRAL/NEGATIVE/MIXED/INSUFFICIENT_EVIDENCE)
- `positive/neutral/negative_observation_count`, `total_sentiment_observation_count`
- `trend_classification` (RISING/STABLE/FALLING/EMERGING/MIXED)
- `narrative_velocity_classification` (HIGH/MODERATE/LOW/NONE)
- `narrative_observations_per_hour`
- `total_public_engagement`, `source_record_count`
- `evidence_count`, `evidence_source_count`, `evidence_references`
- `confidence_classification` (VERIFIED/HIGH/MEDIUM/LOW)
- `validation_fixture`, `production_signal`

**PIP-MLK status**: ✅ Implemented (S2D 360 tab + S2D Console tab)

### 3. Sentiment Analysis (28 references)

**Archive**: Daily sentiment snapshots in `PIP_360_DAILY_SENTIMENT_SCHEMA`. Sentiment classifications: POSITIVE, NEUTRAL, NEGATIVE, MIXED, INSUFFICIENT_EVIDENCE.

**S2D-3A spec**: Daily snapshots for State, Parliament, DUN, DM, Locality, Entity, Issue, Platform. Metrics: total records, accepted evidence, unique sources, positive/neutral/negative share, net sentiment, conversation share, engagement, velocity, persistence, cross-platform spread, evidence confidence.

**PIP-MLK status**: ✅ Implemented (Daily sentiment trend chart in S2D 360 tab)

### 4. Narrative Radar (23 references)

**Archive**: `PIP_360_NARRATIVE_RADAR_SCHEMA`. Narrative velocity: HIGH/MODERATE/LOW/NONE/INSUFFICIENT_EVIDENCE.

**S2D-4B spec**: Narrative driver decomposition — calculate contribution by issue, entity, platform, locality, source type, language, narrative cluster.

**S2D-4C spec**: Narrative propagation graph — track how narratives spread across localities and platforms.

**PIP-MLK status**: ✅ Implemented (Narrative radar table in S2D 360 tab with 4 entries)

### 5. Public Communication Workflow (18 modules)

**Archive modules**:
- `pip-public-communication-response-case-contract.js` — 7 recommendations, 8 case types, 6 statuses
- `pip-public-communication-evidence-recommendation.js` — evidence-based recommendations
- `pip-public-communication-content-package.js` — content package management
- `pip-public-communication-production-queue.js` — production queue
- `pip-public-communication-publication-register.js` — publication tracking
- `pip-public-communication-outcome-observation.js` — outcome tracking
- `pip-public-communication-outcome-classification.js` — outcome classification
- `pip-public-communication-effectiveness-library.js` — effectiveness library
- `pip-public-communication-manual-publishing-boundary.js` — publishing boundaries

**App.jsx panels** (7 panels):
- `PipPublicCommunicationResponseCasePanel` (line 86796)
- `PipPublicCommunicationEvidenceRecommendationPanel` (line 87621)
- `PipPublicCommunicationContentPackagePanel` (line 88294)
- `PipPublicCommunicationProductionQueuePanel` (line 89104)
- `PipPublicCommunicationPublicationRegisterPanel` (line 89632)
- `PipPublicCommunicationManualPublishingBoundaryPanel` (line 90615)
- `PipPublicCommunicationOutcomeObservationPanel` (line 91178)
- `PipPublicCommunicationOutcomeClassificationPanel` (line 91688)
- `PipPublicCommunicationEffectivenessLibraryPanel` (line 92154)

**S2D-6A spec** — Decision-policy engine recommendations:
- NO_RESPONSE_MONITOR, VERIFY_EVIDENCE, INVESTIGATE_LOCAL_SERVICE
- ACKNOWLEDGE_CONCERN, CLARIFY_CONTEXT, CORRECT_WITH_EVIDENCE
- PROVIDE_SERVICE_UPDATE, AMPLIFY_VERIFIED_POSITIVE
- PREPARE_FAQ, ESCALATE_TO_SENIOR_REVIEW

**PIP-MLK status**: ✅ Implemented (Public Communication tab with 4 cases)

### 6. Incident Casebook (4 modules)

**Archive modules**: `pip-incident-casebook-contract.js` + `pip-incident-casebook-client.js`

**Statuses**: OPEN, INVESTIGATING, MITIGATION_IN_PROGRESS, READY_FOR_CLOSURE, CLOSED
**Severities**: INFO, WARNING, HIGH, CRITICAL
**Checklist**: PENDING, IN_PROGRESS, VERIFIED

**PIP-MLK status**: ✅ Implemented (Incident Casebook tab with 3 cases + checklists)

### 7. Operational Alerts (4 modules)

**Archive modules**: `pip-operational-alert-contract.js` + `pip-operational-alert-client.js`

**Alert codes**: SYSTEM_HEALTH_UNAVAILABLE, SYSTEM_HEALTH_DEGRADED, AUTHENTICATION_COMPONENT_DEGRADED, AUTHORIZATION_COMPONENT_DEGRADED, SCENARIO_STORE_DEGRADED, AUDIT_STORE_DEGRADED, ERROR_LOGGER_DEGRADED, RECENT_ERROR_ACTIVITY, CRITICAL_ERROR_ACTIVITY, SECURITY_BASELINE_VIOLATION, PERSISTENCE_BASELINE_VIOLATION

**PIP-MLK status**: ✅ Seed data created (5 alerts in s2d-seed-data.ts)

### 8. Scenario Management (5 modules)

**Archive modules**: `pip-scenario-api-client.js`, `pip-scenario-api-contract.js`, `pip-scenario-sharing.js`, `pip-scenario-sync-contract.js`, `pip-scenario-sync-engine.js`

**Features**: Scenario create/read/update/delete, sharing (export/import), sync (local ↔ central), rollback

**PIP-MLK status**: ❌ Not implemented — could add scenario persistence for S2D signals

### 9. Dual-Layer Locality Context (Population + Signal Fusion)

**Archive**: `pip-360-dual-layer-locality-context.js` + `pip-360-dual-layer-locality-contract.js`

**Concept**: Each locality has TWO layers:
1. **POPULATION_CONTEXT** — from engine pipeline (voter demographics)
2. **PUBLIC_SIGNAL_CONTEXT** — from S2D signal monitoring (sentiment, narrative)

The dual-layer fuses engine demographics with S2D signals per locality.

**Privacy protections** (from contract):
- `combined_targeting_score_enabled: false`
- `cross_layer_persuasion_scoring_enabled: false`
- `cross_layer_prediction_enabled: false`
- `demographic_signal_correlation_enabled: false`
- `voter_preference_inference_enabled: false`
- `election_prediction_enabled: false`
- `individual_targeting_enabled: false`
- `political_affiliation_inference_enabled: false`

**PIP-MLK status**: ✅ Partially implemented (locality signal map in S2D 360 tab)

### 10. Cross-Constituency Comparison (4 modules)

**Archive modules**: `pip-constituency-adapter.js`, `pip-constituency-registry.js`, `pip-cross-constituency-normalisation.js`, `pip-cross-constituency-report.js`

**Features**: Multi-constituency workflow, normalised comparison, raw comparison, export panel

**App.jsx panels**: `CrossConstituencyRawComparisonPanel`, `CrossConstituencyNormalisedComparisonPanel`, `CrossConstituencyComparisonExportPanel`, `MultiConstituencyEndToEndWorkflowPanel`

**PIP-MLK status**: ✅ Implemented (Compare tab)

### 11. 360 Full Pipeline Test + Reconciliation (4 modules)

**Archive modules**: `pip-360-full-pipeline-test.js`, `pip-360-full-pipeline-reconciliation.js`, `pip-360-final-uat-handoff.js`

**Features**: End-to-end pipeline testing, reconciliation evidence, final UAT handoff

**PIP-MLK status**: ❌ Not implemented — production deployment feature

### 12. Auth/Security (7 modules)

**Archive modules**: `pip-auth-client.js`, `pip-auth-contract.js`, `pip-authorization-contract.js`, `pip-edge-security-client.js`, `pip-edge-security-contract.js`, `pip-role-contract.js`, `pip-authenticated-runtime-acceptance-contract.js`

**PIP-MLK status**: ✅ Implemented (src/lib/jwt.ts, src/lib/cors.ts, src/lib/csrf.ts, src/lib/security-headers.ts)

### 13. Production/Deployment (24 modules)

**Archive modules**: 12 contract + 12 client files for production database, deployment readiness, secret management, activation permits, configuration approval

**PIP-MLK status**: ❌ Not implemented — enterprise deployment features (not needed for Free Tier)

### 14. Observability/Health (6 modules)

**Archive modules**: `pip-observability-client.js`, `pip-observability-contract.js`, `pip-system-health-client.js`, `pip-system-health-contract.js`, `pip-operations-history-client.js`, `pip-operations-history-contract.js`

**PIP-MLK status**: ✅ Implemented (src/lib/metrics.ts, src/lib/logger.ts, src/lib/tracing.ts, src/lib/alerting.ts, /api/health, /api/metrics)

### 15. S2D 9-Phase Development Roadmap

| Phase | Batch | Description | PIP-MLK status |
|-------|-------|-------------|----------------|
| S2D-1 | 1A | Generalise signal model | ✅ Contracts ported |
| S2D-1 | 1B | Durable ingestion + evidence store | ❌ Needs Apify integration |
| S2D-1 | 1C | Deduplication + source validation | ❌ |
| S2D-2 | 2A | Malaysian political ontology | ❌ |
| S2D-2 | 2B | Annotation platform | ❌ |
| S2D-2 | 2C | Johor reference corpus | ❌ |
| S2D-3 | 3A | Daily sentiment snapshots | ✅ Seed data (3 days) |
| S2D-3 | 3B | Local signal profiles | ✅ Locality signal map |
| S2D-3 | 3C | Automated descriptive reports | ❌ |
| S2D-4 | 4A | Change-point detection | ❌ |
| S2D-4 | 4B | Narrative driver decomposition | ❌ |
| S2D-4 | 4C | Narrative propagation graph | ❌ |
| S2D-4 | 4D | Diagnostic case builder | ❌ |
| S2D-5 | 5A-5E | Predictive intelligence | ❌ (not started) |
| S2D-6 | 6A | Decision-policy engine | ✅ Response recommendations |
| S2D-6 | 6B | Recommendation scoring | ❌ |
| S2D-6 | 6C | Recommendation justification | ❌ |
| S2D-6 | 6D | Narrative + content brief | ❌ |
| S2D-7 | 7A | Daily intelligence brief | ❌ |
| S2D-7 | 7B | Weekly diagnostic report | ❌ |
| S2D-7 | 7C | Constituency intelligence report | ❌ |
| S2D-7 | 7D | After-action + effectiveness report | ❌ |
| S2D-8 | 8A-8D | Johor→Melaka transfer | ❌ |
| S2D-9 | 9A | Shared contracts | ✅ s2d-contracts.ts |
| S2D-9 | 9C | PIP context fusion | ✅ Dual-layer locality |

---

## Summary

| Feature area | Archive modules | PIP-MLK status |
|-------------|----------------|----------------|
| Social media scraper (Apify) | Architecture spec | ✅ Seed data |
| Signal feed | 259 refs in App.jsx | ✅ S2D 360 tab |
| Sentiment analysis | 28 refs | ✅ Daily sentiment chart |
| Narrative radar | 23 refs | ✅ Narrative radar table |
| Public communication | 18 modules + 9 panels | ✅ Public Comm tab |
| Incident casebook | 4 modules | ✅ Incidents tab |
| Operational alerts | 4 modules | ✅ Seed data |
| Scenario management | 5 modules | ❌ Not implemented |
| Dual-layer locality | 2 modules | ✅ Partially |
| Cross-constituency | 4 modules | ✅ Compare tab |
| 360 pipeline test | 4 modules | ❌ Enterprise feature |
| Auth/security | 7 modules | ✅ JWT/CORS/CSRF |
| Production/deployment | 24 modules | ❌ Enterprise feature |
| Observability/health | 6 modules | ✅ Health/metrics |
