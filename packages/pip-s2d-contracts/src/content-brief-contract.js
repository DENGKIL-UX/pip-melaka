import { createBaseRecord, validateBaseRecord, deepClone } from './common-contracts.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const CONTENT_BRIEF_SCHEMA = 'pip-s2d.content-brief.v1';

export function createContentBrief(input = {}) {
  const base = createBaseRecord({ schema: CONTENT_BRIEF_SCHEMA, contractName: 'ContentBrief', input, recordIdPrefix: 'CBF' });
  return {
    ...base,
    contentBriefId: input.contentBriefId || base.recordId,
    recommendationCaseId: input.recommendationCaseId || '',
    approvalReference: input.approvalReference || '',
    factualCommunicationObjective: input.factualCommunicationObjective || '',
    coreMessage: input.coreMessage || '',
    supportingEvidenceRefs: Array.isArray(input.supportingEvidenceRefs) ? deepClone(input.supportingEvidenceRefs) : [],
    wordingToAvoid: Array.isArray(input.wordingToAvoid) ? deepClone(input.wordingToAvoid) : [],
    faq: Array.isArray(input.faq) ? deepClone(input.faq) : [],
    facebookDraft: input.facebookDraft || '',
    instagramCaption: input.instagramCaption || '',
    threadsPost: input.threadsPost || '',
    shortVideoBrief: input.shortVideoBrief || '',
    infographicBrief: input.infographicBrief || '',
    holdingStatement: input.holdingStatement || '',
    reviewStatus: input.reviewStatus || 'REVIEW_REQUIRED',
    publicationEligibility: input.publicationEligibility || 'NOT_ELIGIBLE',
  };
}

export function normalizeContentBrief(input = {}) {
  return createContentBrief(input);
}

export function validateContentBrief(input = {}) {
  const normalized = createContentBrief(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: CONTENT_BRIEF_SCHEMA,
    contractName: 'ContentBrief',
    additionalRequiredFields: ['contentBriefId', 'recommendationCaseId', 'factualCommunicationObjective', 'coreMessage', 'reviewStatus', 'publicationEligibility'],
  });
  const errors = [...baseValidation.errors];
  if (!normalized.supportingEvidenceRefs.length) errors.push('supportingEvidenceRefs is required');
  if (normalized.publicationEligibility === 'ELIGIBLE' && !normalized.approvalReference) errors.push('approvalReference is required when publicationEligibility is ELIGIBLE');
  if (normalized.governance.automaticPublication !== false) errors.push('automatic publication must remain disabled');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeContentBriefForPip(input = {}) {
  const normalized = createContentBrief(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createContentBrief(value), report };
}

export function buildContentBriefSummary(input = {}) {
  const record = createContentBrief(input);
  return {
    contentBriefId: record.contentBriefId,
    recommendationCaseId: record.recommendationCaseId,
    reviewStatus: record.reviewStatus,
    publicationEligibility: record.publicationEligibility,
  };
}
