import { deepClone, isIsoUtc, stableStringify } from './common-contracts.js';

const EXCHANGE_ENVELOPE_SCHEMA = 'pip-s2d.exchange-envelope.v1';

function sha256(value) {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (code << 1) >>> 0;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  const left = h1.toString(16).padStart(8, '0');
  const right = h2.toString(16).padStart(8, '0');
  return `${left}${right}${left}${right}`;
}

export function createExchangeEnvelope(input = {}) {
  const payload = deepClone(input.payload ?? {});
  const envelope = {
    envelopeId: typeof input.envelopeId === 'string' && input.envelopeId.trim() ? input.envelopeId.trim() : `ENV-${Date.now()}`,
    packageVersion: input.packageVersion || '1.0.0',
    contractName: typeof input.contractName === 'string' ? input.contractName : '',
    contractVersion: input.contractVersion || '1.0',
    producerSystem: input.producerSystem || 'S2D_360',
    consumerSystem: input.consumerSystem || 'PIP_360',
    exchangeScope: input.exchangeScope || 'SHARED_AGGREGATE',
    correlationId: typeof input.correlationId === 'string' ? input.correlationId : '',
    generatedAt: input.generatedAt ? new Date(input.generatedAt).toISOString() : new Date().toISOString(),
    payloadHash: input.payloadHash || sha256(stableStringify(payload)),
    payload,
    validation: {
      valid: Boolean(input.validation?.valid),
      validatedAt: input.validation?.validatedAt || null,
      validatorVersion: input.validation?.validatorVersion || '',
    },
    governance: input.governance ? deepClone(input.governance) : {},
  };
  if (!envelope.validation.valid) {
    envelope.validation.valid = false;
  }
  return envelope;
}

export function verifyExchangeEnvelopeHash(envelope = {}) {
  const expected = sha256(stableStringify(envelope.payload ?? {}));
  return expected === envelope.payloadHash;
}

export function validateExchangeEnvelope(envelope = {}) {
  const record = createExchangeEnvelope(envelope);
  const errors = [];
  if (record.packageVersion !== '1.0.0') errors.push('packageVersion must be 1.0.0');
  if (!record.contractName) errors.push('contractName is required');
  if (record.contractVersion !== '1.0') errors.push('contractVersion must be 1.0');
  if (!['S2D_360', 'PIP_360'].includes(record.producerSystem)) errors.push('producerSystem is invalid');
  if (!['S2D_360', 'PIP_360'].includes(record.consumerSystem)) errors.push('consumerSystem is invalid');
  if (!['S2D_INTERNAL', 'SHARED_AGGREGATE', 'PIP_REFERENCE', 'ANALYST_EVIDENCE', 'VALIDATOR_FIXTURE_ONLY'].includes(record.exchangeScope)) errors.push('exchangeScope is invalid');
  if (!isIsoUtc(record.generatedAt)) errors.push('generatedAt must be ISO UTC');
  if (!verifyExchangeEnvelopeHash(record)) errors.push('payload hash mismatch');
  const valid = errors.length === 0;
  return {
    valid,
    errors,
    normalized: { ...record, validation: { valid, validatedAt: new Date().toISOString(), validatorVersion: '1.0.0' } },
  };
}

export function serializeExchangeEnvelope(envelope = {}) {
  return JSON.stringify(createExchangeEnvelope(envelope), null, 2);
}

export function deserializeExchangeEnvelope(serialized = '{}') {
  return createExchangeEnvelope(JSON.parse(serialized));
}

export { EXCHANGE_ENVELOPE_SCHEMA as PIP_S2D_EXCHANGE_ENVELOPE_SCHEMA };
