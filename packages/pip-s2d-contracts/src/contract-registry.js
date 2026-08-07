import { PIP_S2D_CONTRACT_NAMES, PIP_S2D_CONTRACT_SCHEMAS, PIP_S2D_CONTRACT_PACKAGE_VERSION, buildContractRegistryEntry } from './common-contracts.js';

export const PIP_S2D_CONTRACT_DEFINITIONS = PIP_S2D_CONTRACT_NAMES.map((contractName) => buildContractRegistryEntry({ contractName, schema: PIP_S2D_CONTRACT_SCHEMAS[contractName], packageVersion: PIP_S2D_CONTRACT_PACKAGE_VERSION }));

export function buildPipS2dContractRegistry() {
  return {
    schema: 'pip-s2d.contract-registry.v1',
    packageVersion: PIP_S2D_CONTRACT_PACKAGE_VERSION,
    contractCount: PIP_S2D_CONTRACT_DEFINITIONS.length,
    contracts: PIP_S2D_CONTRACT_DEFINITIONS.map((entry) => ({ ...entry })),
  };
}

export function validatePipS2dContractRegistry(registry = buildPipS2dContractRegistry()) {
  const errors = [];
  if (registry.packageVersion !== PIP_S2D_CONTRACT_PACKAGE_VERSION) errors.push('package version mismatch');
  if (!Array.isArray(registry.contracts) || registry.contracts.length !== PIP_S2D_CONTRACT_NAMES.length) errors.push('contract count mismatch');
  const names = new Set();
  const schemas = new Set();
  for (const contract of registry.contracts || []) {
    if (!contract.contractName || !contract.schema) errors.push('registry entry incomplete');
    if (names.has(contract.contractName)) errors.push(`duplicate contract name: ${contract.contractName}`);
    if (schemas.has(contract.schema)) errors.push(`duplicate schema: ${contract.schema}`);
    names.add(contract.contractName);
    schemas.add(contract.schema);
  }
  return { valid: errors.length === 0, errors, registry };
}

export function buildPipS2dContractCompatibilityMatrix() {
  return PIP_S2D_CONTRACT_NAMES.map((contractName) => ({
    contractName,
    schema: PIP_S2D_CONTRACT_SCHEMAS[contractName],
    s2dProducer: 'AVAILABLE',
    pipConsumer: 'AVAILABLE',
    validatorFixture: 'AVAILABLE',
    compatibility: 'PASS',
  }));
}

export function buildPipS2dContractSummary() {
  return PIP_S2D_CONTRACT_NAMES.map((contractName) => ({
    contractName,
    schema: PIP_S2D_CONTRACT_SCHEMAS[contractName],
    status: 'AVAILABLE',
  }));
}

export function buildPipS2dContractSummaryCsv() {
  const rows = buildPipS2dContractSummary();
  return ['contractName,schema,status', ...rows.map((row) => `${row.contractName},${row.schema},${row.status}`)].join('\n') + '\n';
}

export function buildPipS2dContractGovernanceMarkdown() {
  return `# PIP 360 Shared Contracts\n\n- Contract foundation only\n- No live PIP connection\n- No PIP mutation\n- No context fusion\n- No production activation\n- No individual voter linkage\n- No individual targeting\n- No election prediction\n- No automatic publication\n`;
}
