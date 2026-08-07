import { createBaseRecord, validateBaseRecord } from './common-contracts.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const OUTCOME_REPORT_SCHEMA = 'pip-s2d.outcome-report.v1';

export const REQUIRED_MEASUREMENT_WINDOWS = [
  'BEFORE_ACTION',
  'AFTER_6_HOURS',
  'AFTER_12_HOURS',
  'AFTER_24_HOURS',
  'AFTER_72_HOURS',
  'AFTER_7_DAYS',
];

export function createOutcomeReport(input = {}) {
  const base = createBaseRecord({ schema: OUTCOME_REPORT_SCHEMA, contractName: 'OutcomeReport', input, recordIdPrefix: 'OUT' });
  return {
    ...base,
    outcomeReportId: input.outcomeReportId || base.recordId,
    recommendationCaseId: input.recommendationCaseId || '',
    contentBriefId: input.contentBriefId || '',
    publicationRecordIds: Array.isArray(input.publicationRecordIds) ? [...new Set(input.publicationRecordIds)] : [],
    measurementWindows: Array.isArray(input.measurementWindows) && input.measurementWindows.length ? [...new Set(input.measurementWindows)] : [...REQUIRED_MEASUREMENT_WINDOWS],
    narrativeVolume: input.narrativeVolume ?? null,
    sentiment: input.sentiment ?? null,
    repeatedQuestions: input.repeatedQuestions ?? null,
    misinformationRepetition: input.misinformationRepetition ?? null,
    officialInformationVisibility: input.officialInformationVisibility ?? null,
    localitySpread: input.localitySpread ?? null,
    secondaryNarratives: input.secondaryNarratives ?? null,
    overallAssessment: input.overallAssessment || '',
    evidenceConfidence: input.evidenceConfidence ?? null,
    observedAssociationOnly: input.observedAssociationOnly ?? true,
    causalityClaimed: input.causalityClaimed ?? false,
    reviewerStatus: input.reviewerStatus || 'REVIEW_REQUIRED',
  };
}

export function normalizeOutcomeReport(input = {}) {
  return createOutcomeReport(input);
}

export function validateOutcomeReport(input = {}) {
  const normalized = createOutcomeReport(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: OUTCOME_REPORT_SCHEMA,
    contractName: 'OutcomeReport',
    additionalRequiredFields: ['outcomeReportId', 'recommendationCaseId', 'contentBriefId', 'overallAssessment', 'reviewerStatus'],
  });
  const errors = [...baseValidation.errors];
  for (const windowCode of REQUIRED_MEASUREMENT_WINDOWS) {
    if (!normalized.measurementWindows.includes(windowCode)) errors.push(`measurement window missing: ${windowCode}`);
  }
  if (normalized.observedAssociationOnly !== true) errors.push('observedAssociationOnly must be true');
  if (normalized.causalityClaimed !== false) errors.push('causalityClaimed must be false');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeOutcomeReportForPip(input = {}) {
  const normalized = createOutcomeReport(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createOutcomeReport(value), report };
}

export function buildOutcomeReportSummary(input = {}) {
  const record = createOutcomeReport(input);
  return {
    outcomeReportId: record.outcomeReportId,
    recommendationCaseId: record.recommendationCaseId,
    observedAssociationOnly: record.observedAssociationOnly,
    causalityClaimed: record.causalityClaimed,
  };
}
