import { buildCsv, stableStringify } from './common-contracts.js';

export function exportSchemaBundleJson(bundle = {}) {
  return `${stableStringify(bundle)}\n`;
}

export function exportContractRegistryJson(registry = {}) {
  return `${stableStringify(registry)}\n`;
}

export function exportCompatibilityMatrixJson(matrix = []) {
  return `${stableStringify(matrix)}\n`;
}

export function exportCompatibilityMatrixCsv(matrix = []) {
  return buildCsv(matrix, ['contractName', 'schema', 's2dProducer', 'pipConsumer', 'validatorFixture', 'compatibility']);
}

export function exportSanitisationReportJson(report = {}) {
  return `${stableStringify(report)}\n`;
}

export function exportReadinessJson(readiness = {}) {
  return `${stableStringify(readiness)}\n`;
}

export function exportGovernanceMarkdown(markdown = '') {
  return `${markdown.trim()}\n`;
}
