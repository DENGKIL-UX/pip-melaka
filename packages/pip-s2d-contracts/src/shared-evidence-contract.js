import { deepClone, isIsoUtc, isNumberInRange } from './common-contracts.js';

export function createSharedEvidenceReference(input = {}) {
  return {
    evidenceId: typeof input.evidenceId === 'string' ? input.evidenceId.trim() : '',
    evidenceType: typeof input.evidenceType === 'string' ? input.evidenceType.trim() : '',
    evidenceHash: typeof input.evidenceHash === 'string' ? input.evidenceHash.trim() : '',
    capturedAt: typeof input.capturedAt === 'string' ? input.capturedAt.trim() : '',
    publishedAt: input.publishedAt ?? null,
    accessScope: input.accessScope || 'ANALYST_EVIDENCE',
    verificationStatus: input.verificationStatus || 'UNVERIFIED',
    confidence: input.confidence ?? null,
  };
}

export function normalizeSharedEvidenceReference(input = {}) {
  return createSharedEvidenceReference(input);
}

export function validateSharedEvidenceReference(input = {}) {
  const evidence = createSharedEvidenceReference(input);
  const errors = [];
  if (!evidence.evidenceId) errors.push('evidenceId is required');
  if (!evidence.evidenceType) errors.push('evidenceType is required');
  if (!evidence.evidenceHash) errors.push('evidenceHash is required');
  if (!isIsoUtc(evidence.capturedAt)) errors.push('capturedAt must be ISO UTC');
  if (evidence.publishedAt !== null && !isIsoUtc(evidence.publishedAt)) errors.push('publishedAt must be ISO UTC or null');
  if (!['ANALYST_EVIDENCE', 'VALIDATOR_FIXTURE_ONLY'].includes(evidence.accessScope)) errors.push('accessScope is invalid');
  if (!['UNVERIFIED', 'VERIFIED', 'REJECTED'].includes(evidence.verificationStatus)) errors.push('verificationStatus is invalid');
  if (evidence.confidence !== null && !isNumberInRange(evidence.confidence, 0, 1)) errors.push('confidence must be null or between 0 and 1');
  return { valid: errors.length === 0, errors, evidence };
}

export function buildSharedEvidenceSummary(input = {}) {
  const evidence = createSharedEvidenceReference(input);
  return `${evidence.evidenceType || 'Evidence'} ${evidence.evidenceId || ''}`.trim();
}

export function sanitizeSharedEvidenceReference(input = {}) {
  const evidence = deepClone(input || {});
  delete evidence.username;
  delete evidence.handle;
  delete evidence.accountId;
  delete evidence.authorProfile;
  delete evidence.voterId;
  delete evidence.identityNumber;
  delete evidence.phoneNumber;
  delete evidence.email;
  delete evidence.residentialAddress;
  return createSharedEvidenceReference(evidence);
}
