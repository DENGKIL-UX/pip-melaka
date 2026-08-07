import { buildPipS2dContractCompatibilityMatrix } from './contract-registry.js';
import { validateExchangeEnvelope, verifyExchangeEnvelopeHash } from './exchange-envelope-contract.js';

export function buildCompatibilityMatrix(records = []) {
  const matrix = buildPipS2dContractCompatibilityMatrix();
  if (Array.isArray(records) && records.length > 0) {
    return matrix.map((entry) => ({ ...entry, fixtureCount: records.filter((record) => record.contractName === entry.contractName).length }));
  }
  return matrix;
}

export function validateCompatibilityRoundTrip(input = {}) {
  const envelope = validateExchangeEnvelope(input.envelope || {});
  return {
    valid: envelope.valid && verifyExchangeEnvelopeHash(envelope.normalized),
    errors: envelope.errors,
    envelope: envelope.normalized,
  };
}

export function buildCompatibilitySummary(records = []) {
  const matrix = buildCompatibilityMatrix(records);
  return {
    schema: 'pip-s2d.contract-compatibility-summary.v1',
    contractCount: matrix.length,
    passCount: matrix.filter((row) => row.compatibility === 'PASS').length,
    failCount: matrix.filter((row) => row.compatibility !== 'PASS').length,
    matrix,
  };
}
