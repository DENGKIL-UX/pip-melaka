import { createBaseRecord, validateBaseRecord, buildCsv, deepClone } from './common-contracts.js';
import { createSharedGeography } from './shared-geography-contract.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const SIGNAL_RECORD_SCHEMA = 'pip-s2d.signal-record.v1';

function normalizeMetrics(metrics = {}) {
  return {
    views: metrics.views ?? null,
    likes: metrics.likes ?? null,
    comments: metrics.comments ?? null,
    shares: metrics.shares ?? null,
    mentions: metrics.mentions ?? null,
    engagement: metrics.engagement ?? null,
    uniqueSourceCount: metrics.uniqueSourceCount ?? null,
  };
}

function normalizeClassification(classification = {}) {
  return {
    primaryIssue: classification.primaryIssue || '',
    secondaryIssues: Array.isArray(classification.secondaryIssues) ? [...new Set(classification.secondaryIssues.filter((item) => typeof item === 'string' && item.trim()))] : [],
    sentimentLabel: classification.sentimentLabel || '',
    sentimentPolarity: classification.sentimentPolarity ?? null,
    sentimentConfidence: classification.sentimentConfidence ?? null,
    narrativeFunction: classification.narrativeFunction ?? null,
    entityRefs: Array.isArray(classification.entityRefs) ? deepClone(classification.entityRefs) : [],
    narrativeClusterIds: Array.isArray(classification.narrativeClusterIds) ? [...new Set(classification.narrativeClusterIds)] : [],
  };
}

function normalizeSignalBehaviour(value = {}) {
  return {
    velocity: value.velocity ?? null,
    reach: value.reach ?? null,
    sensitivity: value.sensitivity ?? null,
    coordination: value.coordination ?? null,
    localityConcentration: value.localityConcentration ?? null,
    evidenceConfidence: value.evidenceConfidence ?? null,
    echoStage: value.echoStage ?? null,
  };
}

export function createSignalRecord(input = {}) {
  const base = createBaseRecord({
    schema: SIGNAL_RECORD_SCHEMA,
    contractName: 'SignalRecord',
    input,
    recordIdPrefix: 'SIG',
  });
  return {
    ...base,
    signalId: input.signalId || input.recordId || base.recordId,
    collectionRunId: input.collectionRunId ?? null,
    headline: input.headline || '',
    platform: input.platform || '',
    sourceType: input.sourceType || '',
    observedAt: input.observedAt || base.exchange.generatedAt,
    metrics: normalizeMetrics(input.metrics),
    classification: normalizeClassification(input.classification),
    signalBehaviour: normalizeSignalBehaviour(input.signalBehaviour),
    geography: createSharedGeography(input.geography || base.geography),
  };
}

export function normalizeSignalRecord(input = {}) {
  return createSignalRecord(input);
}

export function validateSignalRecord(input = {}) {
  const normalized = createSignalRecord(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: SIGNAL_RECORD_SCHEMA,
    contractName: 'SignalRecord',
    additionalRequiredFields: ['signalId', 'headline', 'platform', 'sourceType', 'observedAt'],
  });
  const errors = [...baseValidation.errors];
  if (!normalized.metrics || typeof normalized.metrics !== 'object') errors.push('metrics is required');
  for (const [key, value] of Object.entries(normalized.metrics || {})) {
    if (value !== null && (typeof value !== 'number' || value < 0)) errors.push(`metrics.${key} must be null or >= 0`);
  }
  if (!normalized.classification || typeof normalized.classification !== 'object') errors.push('classification is required');
  if (!normalized.signalBehaviour || typeof normalized.signalBehaviour !== 'object') errors.push('signalBehaviour is required');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeSignalRecordForPip(input = {}) {
  const normalized = createSignalRecord(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createSignalRecord(value), report };
}

export function buildSignalRecordSummary(input = {}) {
  const record = createSignalRecord(input);
  return {
    signalId: record.signalId,
    headline: record.headline,
    platform: record.platform,
    sourceType: record.sourceType,
    observedAt: record.observedAt,
    primaryIssue: record.classification.primaryIssue,
    sentimentLabel: record.classification.sentimentLabel,
  };
}

export function buildSignalRecordCsv(records = []) {
  const rows = records.map((entry) => buildSignalRecordSummary(entry));
  return buildCsv(rows, ['signalId', 'headline', 'platform', 'sourceType', 'observedAt', 'primaryIssue', 'sentimentLabel']);
}
