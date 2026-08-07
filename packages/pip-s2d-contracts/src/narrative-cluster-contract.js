import { createBaseRecord, validateBaseRecord, deepClone } from './common-contracts.js';
import { createSharedGeography } from './shared-geography-contract.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const NARRATIVE_CLUSTER_SCHEMA = 'pip-s2d.narrative-cluster.v1';

export function createNarrativeCluster(input = {}) {
  const base = createBaseRecord({ schema: NARRATIVE_CLUSTER_SCHEMA, contractName: 'NarrativeCluster', input, recordIdPrefix: 'NAR' });
  const memberSignalIds = Array.isArray(input.memberSignalIds) ? [...new Set(input.memberSignalIds)] : [];
  return {
    ...base,
    narrativeClusterId: input.narrativeClusterId || base.recordId,
    title: input.title || '',
    summary: input.summary || '',
    primaryIssue: input.primaryIssue || '',
    secondaryIssues: Array.isArray(input.secondaryIssues) ? [...new Set(input.secondaryIssues)] : [],
    narrativeFunction: input.narrativeFunction || '',
    memberSignalIds,
    memberCount: input.memberCount ?? memberSignalIds.length,
    acceptedEvidenceCount: input.acceptedEvidenceCount ?? null,
    firstDetectedAt: input.firstDetectedAt || base.exchange.generatedAt,
    lastDetectedAt: input.lastDetectedAt || base.exchange.generatedAt,
    lifecycleStatus: input.lifecycleStatus || base.lifecycle.status,
    echoStage: input.echoStage ?? null,
    narrativeVelocity: input.narrativeVelocity ?? null,
    persistence: input.persistence ?? null,
    platformDistribution: deepClone(input.platformDistribution || {}),
    sourceTypeDistribution: deepClone(input.sourceTypeDistribution || {}),
    aggregateSentiment: deepClone(input.aggregateSentiment || {}),
    sourceDiversity: input.sourceDiversity ?? null,
    crossPlatformSpread: input.crossPlatformSpread ?? null,
    localityConcentration: input.localityConcentration ?? null,
    geography: createSharedGeography(input.geography || base.geography),
    publicEntityReferences: Array.isArray(input.publicEntityReferences) ? deepClone(input.publicEntityReferences) : [],
  };
}

export function normalizeNarrativeCluster(input = {}) {
  return createNarrativeCluster(input);
}

export function validateNarrativeCluster(input = {}) {
  const normalized = createNarrativeCluster(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: NARRATIVE_CLUSTER_SCHEMA,
    contractName: 'NarrativeCluster',
    additionalRequiredFields: ['narrativeClusterId', 'title', 'summary', 'primaryIssue', 'narrativeFunction'],
  });
  const errors = [...baseValidation.errors];
  if (normalized.memberCount !== normalized.memberSignalIds.length) errors.push('memberCount must reconcile with memberSignalIds');
  if (Date.parse(normalized.firstDetectedAt) > Date.parse(normalized.lastDetectedAt)) errors.push('firstDetectedAt must not be after lastDetectedAt');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeNarrativeClusterForPip(input = {}) {
  const normalized = createNarrativeCluster(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createNarrativeCluster(value), report };
}

export function buildNarrativeClusterSummary(input = {}) {
  const record = createNarrativeCluster(input);
  return {
    narrativeClusterId: record.narrativeClusterId,
    title: record.title,
    primaryIssue: record.primaryIssue,
    memberCount: record.memberCount,
    lifecycleStatus: record.lifecycleStatus,
  };
}
