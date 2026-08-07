const PREFIXES = {
  monitorProfileId: 'MON-',
  collectionRunId: 'RUN-',
  sourceRecordId: 'SRC-',
  signalId: 'SIG-',
  narrativeClusterId: 'NAR-',
  sentimentSnapshotId: 'SNP-',
  diagnosticCaseId: 'DGC-',
  forecastRecordId: 'FRC-',
  recommendationCaseId: 'REC-',
  contentBriefId: 'CBF-',
  publicationRecordId: 'PUB-',
  outcomeReportId: 'OUT-',
  evidenceId: 'EVD-',
  correlationId: 'COR-',
};

const IDENTIFIER_PATTERNS = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
  /\busername\b/i,
  /@\w+/, 
  /\bvoter(?:id|\s*id)\b/i,
  /\bic(?:number)?\b/i,
  /\bidentity(?:card|\s*number)?\b/i,
];

export function createSharedIdentifier(prefix, value) {
  const resolvedPrefix = PREFIXES[prefix] || String(prefix || '').toUpperCase();
  const identifier = String(value || '').trim();
  if (!resolvedPrefix) {
    throw new Error('Unknown identifier prefix');
  }
  if (!identifier.startsWith(resolvedPrefix)) {
    return `${resolvedPrefix}${identifier.replace(/^[-_]+/, '')}`;
  }
  return identifier;
}

export function normalizeSharedIdentifier(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function validateSharedIdentifier(value) {
  const identifier = String(value || '').trim();
  const errors = [];
  if (!identifier) errors.push('identifier is required');
  if (!/^[A-Z]{3}-[A-Z0-9][A-Z0-9._-]*$/.test(identifier)) errors.push('identifier format is invalid');
  for (const pattern of IDENTIFIER_PATTERNS) {
    if (pattern.test(identifier)) errors.push('identifier contains prohibited personal information');
  }
  return { valid: errors.length === 0, errors, identifier };
}

export function identifySharedIdentifierType(value) {
  const identifier = String(value || '').trim();
  for (const [type, prefix] of Object.entries(PREFIXES)) {
    if (identifier.startsWith(prefix)) return type;
  }
  return 'unknown';
}

export function validateSharedIdentifierCollection(values = []) {
  const seen = new Set();
  const errors = [];
  for (const value of values) {
    const validation = validateSharedIdentifier(value);
    if (!validation.valid) errors.push(...validation.errors);
    if (seen.has(validation.identifier)) errors.push(`duplicate identifier: ${validation.identifier}`);
    seen.add(validation.identifier);
  }
  return { valid: errors.length === 0, errors };
}

export { PREFIXES as SHARED_IDENTIFIER_PREFIXES };
