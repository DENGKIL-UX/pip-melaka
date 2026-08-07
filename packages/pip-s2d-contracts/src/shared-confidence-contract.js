import { isNumberInRange } from './common-contracts.js';

export function createSharedConfidence(input = {}) {
  return {
    score: input.score ?? null,
    level: input.level || 'NOT_AVAILABLE',
    basis: Array.isArray(input.basis) ? [...new Set(input.basis.filter((item) => typeof item === 'string' && item.trim()))] : [],
    sampleSize: input.sampleSize ?? null,
  };
}

export function normalizeSharedConfidence(input = {}) {
  return createSharedConfidence(input);
}

export function validateSharedConfidence(input = {}) {
  const confidence = createSharedConfidence(input);
  const errors = [];
  if (confidence.score !== null && !isNumberInRange(confidence.score, 0, 1)) errors.push('score must be null or between 0 and 1');
  if (!['AVAILABLE', 'PARTIAL', 'NOT_AVAILABLE', 'NOT_APPLICABLE'].includes(confidence.level)) errors.push('level is invalid');
  if (!Array.isArray(confidence.basis)) errors.push('basis must be an array');
  if (confidence.sampleSize !== null && (!Number.isInteger(confidence.sampleSize) || confidence.sampleSize <= 0)) errors.push('sampleSize must be null or a positive integer');
  return { valid: errors.length === 0, errors, confidence };
}
