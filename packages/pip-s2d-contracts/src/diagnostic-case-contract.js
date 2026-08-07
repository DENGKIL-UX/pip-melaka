import { createBaseRecord, validateBaseRecord, deepClone } from './common-contracts.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const DIAGNOSTIC_CASE_SCHEMA = 'pip-s2d.diagnostic-case.v1';

export const DRIVER_CONTRIBUTION_LABEL = 'DRIVER CONTRIBUTION - NOT PROOF OF CAUSALITY';

export function createDiagnosticCase(input = {}) {
  const base = createBaseRecord({ schema: DIAGNOSTIC_CASE_SCHEMA, contractName: 'DiagnosticCase', input, recordIdPrefix: 'DGC' });
  return {
    ...base,
    diagnosticCaseId: input.diagnosticCaseId || base.recordId,
    caseTitle: input.caseTitle || '',
    observation: input.observation || '',
    detectedChange: deepClone(input.detectedChange || {}),
    likelyDrivers: Array.isArray(input.likelyDrivers) ? deepClone(input.likelyDrivers) : [],
    driverContributions: Array.isArray(input.driverContributions) ? input.driverContributions.map((entry) => ({ ...entry, label: DRIVER_CONTRIBUTION_LABEL })) : [],
    alternativeExplanations: Array.isArray(input.alternativeExplanations) ? deepClone(input.alternativeExplanations) : [],
    geographicConcentration: deepClone(input.geographicConcentration || {}),
    publicRelevance: input.publicRelevance || '',
    missingEvidence: Array.isArray(input.missingEvidence) ? deepClone(input.missingEvidence) : [],
    recommendedInvestigation: input.recommendedInvestigation || '',
    status: input.status || 'DRAFT',
    reviewerStatus: input.reviewerStatus || 'REVIEW_REQUIRED',
  };
}

export function normalizeDiagnosticCase(input = {}) {
  return createDiagnosticCase(input);
}

export function validateDiagnosticCase(input = {}) {
  const normalized = createDiagnosticCase(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: DIAGNOSTIC_CASE_SCHEMA,
    contractName: 'DiagnosticCase',
    additionalRequiredFields: ['diagnosticCaseId', 'caseTitle', 'observation', 'status', 'reviewerStatus'],
  });
  const errors = [...baseValidation.errors];
  if (!Array.isArray(normalized.alternativeExplanations)) errors.push('alternativeExplanations must be an array');
  if (!Array.isArray(normalized.driverContributions)) errors.push('driverContributions must be an array');
  for (const contribution of normalized.driverContributions || []) {
    if (contribution.label !== DRIVER_CONTRIBUTION_LABEL) errors.push('driver contribution must carry non-causality label');
  }
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeDiagnosticCaseForPip(input = {}) {
  const normalized = createDiagnosticCase(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createDiagnosticCase(value), report };
}

export function buildDiagnosticCaseSummary(input = {}) {
  const record = createDiagnosticCase(input);
  return {
    diagnosticCaseId: record.diagnosticCaseId,
    caseTitle: record.caseTitle,
    status: record.status,
    reviewerStatus: record.reviewerStatus,
  };
}
