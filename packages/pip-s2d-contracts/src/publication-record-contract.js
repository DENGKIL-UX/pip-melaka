import { createBaseRecord, validateBaseRecord } from './common-contracts.js';
import { createSharedGeography } from './shared-geography-contract.js';
import { sanitizeForSharedAggregateExchange } from './exchange-sanitiser.js';

export const PUBLICATION_RECORD_SCHEMA = 'pip-s2d.publication-record.v1';

export const ALLOWED_PUBLICATION_MODES = ['MANUAL_CONTROLLED', 'EXTERNAL_APPROVED_SYSTEM', 'RECORDED_ONLY'];
export const PROHIBITED_PUBLICATION_MODE = 'AUTOMATIC_S2D_PUBLICATION';

const ALLOWED_AUDIENCE_SCOPES = ['GENERAL_PUBLIC', 'STATEWIDE_PUBLIC', 'CONSTITUENCY_PUBLIC', 'LOCALITY_PUBLIC'];
const PROHIBITED_AUDIENCE_SCOPES = ['INDIVIDUAL_VOTER', 'DEMOGRAPHIC_TARGET', 'PERSUASION_SEGMENT', 'BEHAVIOURAL_TARGET'];

export function createPublicationRecord(input = {}) {
  const base = createBaseRecord({ schema: PUBLICATION_RECORD_SCHEMA, contractName: 'PublicationRecord', input, recordIdPrefix: 'PUB' });
  return {
    ...base,
    publicationRecordId: input.publicationRecordId || base.recordId,
    contentBriefId: input.contentBriefId || '',
    publicationChannel: input.publicationChannel || '',
    publicationStatus: input.publicationStatus || 'RECORDED',
    approvedAt: input.approvedAt ?? null,
    approvedByRole: input.approvedByRole || '',
    publishedAt: input.publishedAt ?? null,
    officialPublicUrl: input.officialPublicUrl || '',
    publicationMode: input.publicationMode || 'RECORDED_ONLY',
    audienceScope: input.audienceScope || 'GENERAL_PUBLIC',
    geography: createSharedGeography(input.geography || base.geography),
    manualConfirmation: input.manualConfirmation ?? false,
  };
}

export function normalizePublicationRecord(input = {}) {
  return createPublicationRecord(input);
}

export function validatePublicationRecord(input = {}) {
  const normalized = createPublicationRecord(input);
  const baseValidation = validateBaseRecord(normalized, {
    schema: PUBLICATION_RECORD_SCHEMA,
    contractName: 'PublicationRecord',
    additionalRequiredFields: ['publicationRecordId', 'contentBriefId', 'publicationChannel', 'publicationStatus', 'publicationMode', 'audienceScope'],
  });
  const errors = [...baseValidation.errors];
  if (!ALLOWED_PUBLICATION_MODES.includes(normalized.publicationMode)) errors.push('publicationMode is invalid');
  if (normalized.publicationMode === PROHIBITED_PUBLICATION_MODE) errors.push('automatic publication mode is prohibited');
  if (!ALLOWED_AUDIENCE_SCOPES.includes(normalized.audienceScope)) errors.push('audienceScope is invalid');
  if (PROHIBITED_AUDIENCE_SCOPES.includes(normalized.audienceScope)) errors.push('audienceScope is prohibited');
  if (!normalized.manualConfirmation) errors.push('manualConfirmation is required');
  return { valid: errors.length === 0, errors, normalized };
}

export function sanitizePublicationRecordForPip(input = {}) {
  const normalized = createPublicationRecord(input);
  const { value, report } = sanitizeForSharedAggregateExchange(normalized);
  return { record: createPublicationRecord(value), report };
}

export function buildPublicationRecordSummary(input = {}) {
  const record = createPublicationRecord(input);
  return {
    publicationRecordId: record.publicationRecordId,
    publicationMode: record.publicationMode,
    audienceScope: record.audienceScope,
    officialPublicUrl: record.officialPublicUrl,
  };
}
