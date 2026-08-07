import { createBaseRecord, validateBaseRecord, deepClone } from './common-contracts.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const FORECAST_RECORD_SCHEMA = 'pip-s2d.forecast-record.v1';

export const PERMITTED_FORECAST_TARGETS = [
  'NARRATIVE_GROWTH_6H',
  'NARRATIVE_GROWTH_24H',
  'NARRATIVE_GROWTH_72H',
  'NEXT_ECHO_STAGE',
  'POST_VOLUME',
  'ENGAGEMENT',
  'CROSS_PLATFORM_SPREAD',
  'MEDIA_PICKUP',
  'ISSUE_PERSISTENCE_7D',
  'LOCALITY_SPREAD',
  'RESPONSE_URGENCY',
];

export const PROHIBITED_FORECAST_TARGETS = [
  'PARTY_WINNER',
  'CONSTITUENCY_WINNER',
  'CANDIDATE_WINNER',
  'VOTER_PREFERENCE',
  'INDIVIDUAL_POLITICAL_SUPPORT',
  'TURNOUT',
  'INDIVIDUAL_BEHAVIOUR',
  'PERSUASION_RESPONSE',
];

export function createForecastRecord(input = {}) {
  const base = createBaseRecord({ schema: FORECAST_RECORD_SCHEMA, contractName: 'ForecastRecord', input, recordIdPrefix: 'FRC' });
  return {
    ...base,
    forecastRecordId: input.forecastRecordId || base.recordId,
    forecastTarget: input.forecastTarget || '',
    subjectType: input.subjectType || '',
    subjectId: input.subjectId || '',
    generatedAt: input.generatedAt || base.exchange.generatedAt,
    horizonStart: input.horizonStart || base.exchange.generatedAt,
    horizonEnd: input.horizonEnd || base.exchange.generatedAt,
    prediction: input.prediction ?? null,
    probability: input.probability ?? null,
    lowerBound: input.lowerBound ?? null,
    upperBound: input.upperBound ?? null,
    unit: input.unit || '',
    modelId: input.modelId || '',
    modelVersion: input.modelVersion || '',
    modelRole: input.modelRole || '',
    dataWindow: deepClone(input.dataWindow || {}),
    featureSnapshotHash: input.featureSnapshotHash || '',
    baselineReference: input.baselineReference || '',
    calibrationStatus: input.calibrationStatus || 'NOT_AVAILABLE',
    mainContributingFactors: Array.isArray(input.mainContributingFactors) ? deepClone(input.mainContributingFactors) : [],
  };
}

export function normalizeForecastRecord(input = {}) {
  return createForecastRecord(input);
}

export function validateForecastRecord(input = {}) {
  const normalized = createForecastRecord(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: FORECAST_RECORD_SCHEMA,
    contractName: 'ForecastRecord',
    additionalRequiredFields: ['forecastRecordId', 'forecastTarget', 'subjectType', 'subjectId', 'generatedAt', 'horizonStart', 'horizonEnd', 'unit'],
  });
  const errors = [...baseValidation.errors];
  if (!PERMITTED_FORECAST_TARGETS.includes(normalized.forecastTarget)) errors.push('forecastTarget is not permitted');
  if (PROHIBITED_FORECAST_TARGETS.includes(normalized.forecastTarget)) errors.push('forecastTarget is prohibited');
  if (normalized.probability !== null && (typeof normalized.probability !== 'number' || normalized.probability < 0 || normalized.probability > 1)) errors.push('probability must be null or between 0 and 1');
  if (normalized.lowerBound !== null && normalized.upperBound !== null && normalized.lowerBound > normalized.upperBound) errors.push('prediction interval is invalid');
  if (normalized.prediction != null && !normalized.modelVersion) errors.push('modelVersion is required for executed forecasts');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizeForecastRecordForPip(input = {}) {
  const normalized = createForecastRecord(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createForecastRecord(value), report };
}

export function buildForecastRecordSummary(input = {}) {
  const record = createForecastRecord(input);
  return {
    forecastRecordId: record.forecastRecordId,
    forecastTarget: record.forecastTarget,
    subjectId: record.subjectId,
    probability: record.probability,
    modelVersion: record.modelVersion,
  };
}
