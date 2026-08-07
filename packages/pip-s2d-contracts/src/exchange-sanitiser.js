import { deepClone } from './common-contracts.js';

const PROHIBITED_IDENTITY_FIELDS = [
  'voterId',
  'voter_id',
  'voterName',
  'identityNumber',
  'ic',
  'icNumber',
  'phone',
  'phoneNumber',
  'email',
  'residentialAddress',
  'username',
  'userName',
  'handle',
  'accountId',
  'account_id',
  'profileId',
  'authorId',
];

const TARGETING_FIELDS = [
  'targetSegment',
  'targetAudienceId',
  'demographicTarget',
  'individualTargeting',
  'personalisedPersuasion',
];

const ELECTION_PREDICTION_FIELDS = [
  'partyWinner',
  'candidateWinner',
  'constituencyWinner',
  'voteSharePrediction',
  'turnoutPrediction',
  'electionResultPrediction',
  'voterPreference',
  'votingPreference',
  'predictedVote',
  'persuasionScore',
  'supportScore',
  'turnoutProbability',
];

function walk(value, visitor, path = []) {
  if (Array.isArray(value)) {
    return value.map((entry, index) => walk(entry, visitor, path.concat(index)));
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path.concat(key);
      const action = visitor({ key, value: child, path: nextPath, container: value });
      if (action?.skip) continue;
      result[key] = walk(action?.value ?? child, visitor, nextPath);
    }
    return result;
  }
  return value;
}

function detectFields(payload, fieldNames) {
  const matches = [];
  walk(payload, ({ key, path }) => {
    if (fieldNames.includes(key)) matches.push(path.join('.'));
    return { value: payload?.[key] };
  });
  return [...new Set(matches)];
}

export function detectProhibitedIdentityFields(payload) {
  return detectFields(payload, PROHIBITED_IDENTITY_FIELDS);
}

export function detectVoterLinkageFields(payload) {
  return detectFields(payload, ['voterId', 'voter_id', 'voterName', 'identityNumber', 'ic', 'icNumber', 'username', 'handle', 'accountId', 'profileId']);
}

export function detectTargetingFields(payload) {
  return detectFields(payload, TARGETING_FIELDS);
}

export function detectElectionPredictionFields(payload) {
  return detectFields(payload, ELECTION_PREDICTION_FIELDS);
}

function removeFields(payload, fieldNames) {
  if (Array.isArray(payload)) return payload.map((entry) => removeFields(entry, fieldNames));
  if (!payload || typeof payload !== 'object') return payload;
  const result = {};
  for (const [key, value] of Object.entries(payload)) {
    if (fieldNames.includes(key)) continue;
    result[key] = removeFields(value, fieldNames);
  }
  return result;
}

export function sanitizeForSharedAggregateExchange(payload = {}) {
  const cloned = deepClone(payload);
  const removedFields = [
    ...detectProhibitedIdentityFields(cloned),
    ...detectVoterLinkageFields(cloned),
    ...detectTargetingFields(cloned),
    ...detectElectionPredictionFields(cloned),
  ];
  const value = removeFields(cloned, [
    ...PROHIBITED_IDENTITY_FIELDS,
    ...TARGETING_FIELDS,
    ...ELECTION_PREDICTION_FIELDS,
  ]);
  return { value, report: buildSanitisationReport(cloned, value, removedFields) };
}

export function sanitizeForPipReferenceExchange(payload = {}) {
  const report = buildSanitisationReport(payload, payload, [
    ...detectProhibitedIdentityFields(payload),
    ...detectVoterLinkageFields(payload),
    ...detectTargetingFields(payload),
    ...detectElectionPredictionFields(payload),
  ]);
  if (!report.safe) {
    throw new Error('Unsafe payload rejected for PIP reference exchange');
  }
  return deepClone(payload);
}

export function assertNoIndividualLinkage(payload = {}) {
  const fields = [...detectProhibitedIdentityFields(payload), ...detectVoterLinkageFields(payload)];
  if (fields.length > 0) throw new Error(`Individual linkage prohibited: ${fields.join(', ')}`);
  return true;
}

export function assertNoTargetingPayload(payload = {}) {
  const fields = detectTargetingFields(payload);
  if (fields.length > 0) throw new Error(`Targeting payload prohibited: ${fields.join(', ')}`);
  return true;
}

export function assertNoElectionPredictionPayload(payload = {}) {
  const fields = detectElectionPredictionFields(payload);
  if (fields.length > 0) throw new Error(`Election prediction payload prohibited: ${fields.join(', ')}`);
  return true;
}

export function buildSanitisationReport(originalPayload = {}, sanitizedPayload = {}, removedPaths = []) {
  const safe = removedPaths.length === 0;
  const retained = [];
  const originalKeys = new Set(Object.keys(originalPayload || {}));
  const sanitizedKeys = new Set(Object.keys(sanitizedPayload || {}));
  for (const key of sanitizedKeys) {
    retained.push(key);
  }
  return {
    schema: 'pip-s2d.exchange-sanitisation-report.v1',
    safe,
    prohibitedFieldsRemoved: [...new Set(removedPaths)],
    safeAggregateFieldsRetained: retained.filter((key) => originalKeys.has(key)),
  };
}

export { PROHIBITED_IDENTITY_FIELDS as SANITISER_PROHIBITED_IDENTITY_FIELDS, TARGETING_FIELDS as SANITISER_TARGETING_FIELDS, ELECTION_PREDICTION_FIELDS as SANITISER_ELECTION_PREDICTION_FIELDS };
