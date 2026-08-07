import { createBaseRecord, validateBaseRecord } from './common-contracts.js';
import { createSharedGeography } from './shared-geography-contract.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const SENTIMENT_SNAPSHOT_SCHEMA = 'pip-s2d.sentiment-snapshot.v1';

function calcNet(positiveShare, negativeShare) {
  if (positiveShare == null || negativeShare == null) return null;
  return Number((positiveShare - negativeShare).toFixed(6));
}

export function createSentimentSnapshot(input = {}) {
  const base = createBaseRecord({ schema: SENTIMENT_SNAPSHOT_SCHEMA, contractName: 'SentimentSnapshot', input, recordIdPrefix: 'SNP' });
  const positiveCount = input.positiveCount ?? null;
  const neutralCount = input.neutralCount ?? null;
  const negativeCount = input.negativeCount ?? null;
  const total = input.totalAcceptedSignals ?? (positiveCount != null && neutralCount != null && negativeCount != null ? positiveCount + neutralCount + negativeCount : null);
  const positiveShare = input.positiveShare ?? (total ? positiveCount / total : null);
  const neutralShare = input.neutralShare ?? (total ? neutralCount / total : null);
  const negativeShare = input.negativeShare ?? (total ? negativeCount / total : null);
  return {
    ...base,
    sentimentSnapshotId: input.sentimentSnapshotId || base.recordId,
    periodStart: input.periodStart || base.exchange.generatedAt,
    periodEnd: input.periodEnd || base.exchange.generatedAt,
    snapshotGranularity: input.snapshotGranularity || 'STATE',
    geography: createSharedGeography(input.geography || base.geography),
    totalAcceptedSignals: total,
    uniqueSourceCount: input.uniqueSourceCount ?? null,
    positiveCount,
    neutralCount,
    negativeCount,
    positiveShare,
    neutralShare,
    negativeShare,
    netSentiment: input.netSentiment ?? calcNet(positiveShare, negativeShare),
    movementFromPrevious: input.movementFromPrevious ?? null,
    conversationShare: input.conversationShare ?? null,
    engagement: input.engagement ?? null,
    narrativeVelocity: input.narrativeVelocity ?? null,
    sourceDiversity: input.sourceDiversity ?? null,
    crossPlatformSpread: input.crossPlatformSpread ?? null,
    evidenceConfidence: input.evidenceConfidence ?? null,
    issueBreakdown: Array.isArray(input.issueBreakdown) ? input.issueBreakdown : [],
    entityBreakdown: Array.isArray(input.entityBreakdown) ? input.entityBreakdown : [],
    missingness: input.missingness ?? null,
    dataCompleteness: input.dataCompleteness ?? null,
  };
}

export function normalizeSentimentSnapshot(input = {}) {
  return createSentimentSnapshot(input);
}

export function validateSentimentSnapshot(input = {}) {
  const normalized = createSentimentSnapshot(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: SENTIMENT_SNAPSHOT_SCHEMA,
    contractName: 'SentimentSnapshot',
    additionalRequiredFields: ['sentimentSnapshotId', 'periodStart', 'periodEnd', 'snapshotGranularity'],
  });
  const errors = [...baseValidation.errors];
  const total = normalized.totalAcceptedSignals;
  if (total != null && normalized.positiveCount != null && normalized.neutralCount != null && normalized.negativeCount != null) {
    if (total !== normalized.positiveCount + normalized.neutralCount + normalized.negativeCount) errors.push('counts must reconcile with totalAcceptedSignals');
  }
  if (normalized.positiveShare != null && normalized.neutralShare != null && normalized.negativeShare != null) {
    const totalShare = normalized.positiveShare + normalized.neutralShare + normalized.negativeShare;
    if (Math.abs(totalShare - 1) > 0.01) errors.push('shares must reconcile when all classes are available');
  }
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeSentimentSnapshotForPip(input = {}) {
  const normalized = createSentimentSnapshot(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  if (value.individualSourceRanking) delete value.individualSourceRanking;
  return { record: createSentimentSnapshot(value), report };
}

export function buildSentimentSnapshotSummary(input = {}) {
  const record = createSentimentSnapshot(input);
  return {
    sentimentSnapshotId: record.sentimentSnapshotId,
    snapshotGranularity: record.snapshotGranularity,
    totalAcceptedSignals: record.totalAcceptedSignals,
    netSentiment: record.netSentiment,
  };
}
