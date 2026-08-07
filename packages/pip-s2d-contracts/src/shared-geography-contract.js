import { deepClone, isNumberInRange, listUniqueStrings } from './common-contracts.js';

export const SHARED_GEOGRAPHY_LEVELS = [
  'COUNTRY',
  'STATE',
  'PARLIAMENT',
  'DUN',
  'DM',
  'LOCALITY',
  'UNASSIGNED',
];

const STATE_PARENT_MAP = {
  JHR: 'MY',
  KDH: 'MY',
  KTN: 'MY',
  MLK: 'MY',
  NSN: 'MY',
  PHG: 'MY',
  PLS: 'MY',
  PLS: 'MY',
  PNL: 'MY',
  PRK: 'MY',
  SBH: 'MY',
  SRW: 'MY',
  SGR: 'MY',
  TRG: 'MY',
  KUL: 'MY',
  PJY: 'MY',
  LBN: 'MY',
  PUT: 'MY',
};

function createDefaultGeography() {
  return {
    countryCode: 'MY',
    stateCode: 'JHR',
    parliamentCode: null,
    dunCode: null,
    dmCode: null,
    localityCode: null,
    localityName: null,
    geographyLevel: 'STATE',
    confidence: null,
    basis: [],
    unresolved: false,
  };
}

function normalizeCode(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

function inferLevel(record) {
  if (record.unresolved) return 'UNASSIGNED';
  if (record.localityCode) return 'LOCALITY';
  if (record.dmCode) return 'DM';
  if (record.dunCode) return 'DUN';
  if (record.parliamentCode) return 'PARLIAMENT';
  if (record.stateCode) return 'STATE';
  return 'COUNTRY';
}

export function createSharedGeography(input = {}) {
  const record = { ...createDefaultGeography(), ...deepClone(input) };
  record.countryCode = normalizeCode(record.countryCode) || 'MY';
  record.stateCode = normalizeCode(record.stateCode) || 'JHR';
  record.parliamentCode = normalizeCode(record.parliamentCode);
  record.dunCode = normalizeCode(record.dunCode);
  record.dmCode = normalizeCode(record.dmCode);
  record.localityCode = normalizeCode(record.localityCode);
  record.localityName = typeof record.localityName === 'string' && record.localityName.trim() ? record.localityName.trim() : null;
  record.geographyLevel = SHARED_GEOGRAPHY_LEVELS.includes(record.geographyLevel) ? record.geographyLevel : inferLevel(record);
  record.confidence = record.confidence == null ? null : Number(record.confidence);
  record.basis = listUniqueStrings(record.basis || []);
  record.unresolved = Boolean(record.unresolved || record.geographyLevel === 'UNASSIGNED');
  if (record.unresolved) {
    record.geographyLevel = 'UNASSIGNED';
  }
  return record;
}

export function normalizeSharedGeography(input = {}) {
  return createSharedGeography(input);
}

export function validateSharedGeography(input = {}) {
  const geography = createSharedGeography(input);
  const errors = [];
  if (geography.countryCode !== 'MY') errors.push('countryCode must be MY');
  if (!/^[A-Z]{2,3}$/.test(geography.stateCode || '')) errors.push('stateCode must be a stable three-character code');
  if (geography.parliamentCode && !/^P[0-9A-Z.\-]+$/.test(geography.parliamentCode)) errors.push('parliamentCode is invalid');
  if (geography.dunCode && !/^[A-Z0-9.\-]+$/.test(geography.dunCode)) errors.push('dunCode is invalid');
  if (geography.dmCode && !/^[A-Z0-9.\-]+$/.test(geography.dmCode)) errors.push('dmCode is invalid');
  if (geography.localityCode && !/^[A-Z0-9.\-]+$/.test(geography.localityCode)) errors.push('localityCode is invalid');
  if (geography.confidence !== null && !isNumberInRange(geography.confidence, 0, 1)) errors.push('confidence must be between 0 and 1 or null');
  if (!SHARED_GEOGRAPHY_LEVELS.includes(geography.geographyLevel)) errors.push('geographyLevel is invalid');
  if (geography.geographyLevel === 'UNASSIGNED' && (geography.parliamentCode || geography.dunCode || geography.dmCode || geography.localityCode)) errors.push('unresolved geography cannot include lower-level codes');
  if (geography.localityCode && (!geography.dunCode || !geography.parliamentCode || !geography.stateCode)) errors.push('locality requires parent geography');
  if (geography.dmCode && (!geography.dunCode || !geography.parliamentCode || !geography.stateCode)) errors.push('dm requires parent geography');
  if (geography.dunCode && (!geography.parliamentCode || !geography.stateCode)) errors.push('dun requires parent geography');
  if (geography.parliamentCode && !geography.stateCode) errors.push('parliament requires parent geography');
  return { valid: errors.length === 0, errors, geography };
}

export function compareSharedGeography(left, right) {
  const normalizedLeft = createSharedGeography(left);
  const normalizedRight = createSharedGeography(right);
  return buildSharedGeographyKey(normalizedLeft) === buildSharedGeographyKey(normalizedRight);
}

export function buildSharedGeographyKey(input) {
  const geography = createSharedGeography(input);
  return [geography.countryCode, geography.stateCode, geography.parliamentCode || '-', geography.dunCode || '-', geography.dmCode || '-', geography.localityCode || '-'].join('|');
}

export function buildSharedGeographyHierarchy(input) {
  const geography = createSharedGeography(input);
  const hierarchy = [{ level: 'COUNTRY', code: geography.countryCode }];
  if (geography.stateCode) hierarchy.push({ level: 'STATE', code: geography.stateCode });
  if (geography.parliamentCode) hierarchy.push({ level: 'PARLIAMENT', code: geography.parliamentCode });
  if (geography.dunCode) hierarchy.push({ level: 'DUN', code: geography.dunCode });
  if (geography.dmCode) hierarchy.push({ level: 'DM', code: geography.dmCode });
  if (geography.localityCode) hierarchy.push({ level: 'LOCALITY', code: geography.localityCode, name: geography.localityName || null });
  return hierarchy;
}

export function isSharedGeographyCompatible(left, right) {
  const a = createSharedGeography(left);
  const b = createSharedGeography(right);
  if (a.countryCode !== b.countryCode) return false;
  if (a.stateCode !== b.stateCode) return false;
  if (a.parliamentCode && b.parliamentCode && a.parliamentCode !== b.parliamentCode) return false;
  if (a.dunCode && b.dunCode && a.dunCode !== b.dunCode) return false;
  if (a.dmCode && b.dmCode && a.dmCode !== b.dmCode) return false;
  if (a.localityCode && b.localityCode && a.localityCode !== b.localityCode) return false;
  return true;
}

export function ensureSharedGeography(input = {}) {
  const validation = validateSharedGeography(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
  return validation.geography;
}
