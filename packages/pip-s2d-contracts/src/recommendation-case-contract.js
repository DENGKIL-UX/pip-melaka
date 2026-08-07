import { createBaseRecord, validateBaseRecord, deepClone } from './common-contracts.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const RECOMMENDATION_CASE_SCHEMA = 'pip-s2d.recommendation-case.v1';

export const ALLOWED_RECOMMENDATION_CODES = [
  'NO_RESPONSE_MONITOR',
  'VERIFY_EVIDENCE',
  'INVESTIGATE_LOCAL_SERVICE',
  'ACKNOWLEDGE_CONCERN',
  'CLARIFY_CONTEXT',
  'CORRECT_WITH_EVIDENCE',
  'PROVIDE_SERVICE_UPDATE',
  'AMPLIFY_VERIFIED_POSITIVE',
  'PREPARE_FAQ',
  'ESCALATE_TO_SENIOR_REVIEW',
];

export function createRecommendationCase(input = {}) {
  const base = createBaseRecord({ schema: RECOMMENDATION_CASE_SCHEMA, contractName: 'RecommendationCase', input, recordIdPrefix: 'REC' });
  return {
    ...base,
    recommendationCaseId: input.recommendationCaseId || base.recordId,
    diagnosticCaseId: input.diagnosticCaseId || '',
    policyVersion: input.policyVersion || '1.0',
    recommendedAction: input.recommendedAction || '',
    reason: input.reason || '',
    supportingEvidenceRefs: Array.isArray(input.supportingEvidenceRefs) ? deepClone(input.supportingEvidenceRefs) : [],
    supportingForecastIds: Array.isArray(input.supportingForecastIds) ? [...new Set(input.supportingForecastIds)] : [],
    alternativeAction: input.alternativeAction || '',
    riskOfResponding: input.riskOfResponding || '',
    riskOfNotResponding: input.riskOfNotResponding || '',
    informationRequired: input.informationRequired || '',
    approvalLevel: input.approvalLevel || 'SENIOR_REVIEW',
    monitoringPeriod: input.monitoringPeriod || '24h',
    responseNeedScore: input.responseNeedScore ?? null,
    amplificationRiskScore: input.amplificationRiskScore ?? null,
    evidenceConfidenceScore: input.evidenceConfidenceScore ?? null,
    publicImpactScore: input.publicImpactScore ?? null,
    urgencyScore: input.urgencyScore ?? null,
    reputationalRiskScore: input.reputationalRiskScore ?? null,
    serviceDeliveryImpactScore: input.serviceDeliveryImpactScore ?? null,
    forecastedEscalationScore: input.forecastedEscalationScore ?? null,
    reviewerStatus: input.reviewerStatus || 'REVIEW_REQUIRED',
    executionStatus: input.executionStatus || 'DISABLED',
  };
}

export function normalizeRecommendationCase(input = {}) {
  return createRecommendationCase(input);
}

export function validateRecommendationCase(input = {}) {
  const normalized = createRecommendationCase(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: RECOMMENDATION_CASE_SCHEMA,
    contractName: 'RecommendationCase',
    additionalRequiredFields: ['recommendationCaseId', 'diagnosticCaseId', 'recommendedAction', 'reason', 'reviewerStatus', 'executionStatus'],
  });
  const errors = [...baseValidation.errors];
  if (!ALLOWED_RECOMMENDATION_CODES.includes(normalized.recommendedAction)) errors.push('recommendedAction is not allowed');
  if (normalized.executionStatus !== 'DISABLED') errors.push('executionStatus must default to DISABLED');
  if (normalized.governance.humanReviewRequired !== true) errors.push('human review is required');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeRecommendationCaseForPip(input = {}) {
  const normalized = createRecommendationCase(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createRecommendationCase(value), report };
}

export function buildRecommendationCaseSummary(input = {}) {
  const record = createRecommendationCase(input);
  return {
    recommendationCaseId: record.recommendationCaseId,
    diagnosticCaseId: record.diagnosticCaseId,
    recommendedAction: record.recommendedAction,
    executionStatus: record.executionStatus,
  };
}
