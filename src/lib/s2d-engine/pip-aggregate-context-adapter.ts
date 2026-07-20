/**
 * S2D PIP Aggregate Context Adapter — ported from the S2D-360 Intelligence Engine.
 *
 * This is the identity firewall that guards the PIP↔S2D boundary.
 * It validates that population context payloads contain ONLY aggregate
 * data — never individual voter records.
 *
 * Source: s2d-engine/src/intelligence/integration/s2d-pip-aggregate-context-adapter.js
 * Ported to TypeScript for PIP-MLK's Next.js runtime.
 *
 * Key rules:
 * - 28 rejected keys (voters, names, ic, nric, phone, address, etc.)
 * - 9 regex patterns to catch obfuscated variants
 * - If ANY individual-level key is found, the ENTIRE payload is REJECTED
 * - Status: REJECTED_INDIVIDUAL_DATA (not filtered — rejected)
 */

// 28 hard-coded rejected keys — any of these in the payload = instant rejection
const REJECTED_KEYS = Object.freeze([
  "voters", "voterRecords", "persons", "people", "individuals", "citizens",
  "fullName", "firstName", "lastName", "ic", "icNumber", "nric",
  "phone", "phoneNumber", "mobile", "address", "addresses",
  "voterId", "voterIds", "username", "usernames", "personName",
  "preferenceScore", "supportScore", "politicalClassification",
  "individualPoliticalClassification",
]);

// 9 regex patterns to catch obfuscated variants
const REJECTED_PATTERNS = Object.freeze([
  { pattern: /voter.?id/i, reason: "voter_id variant" },
  { pattern: /political.?classification/i, reason: "political classification variant" },
  { pattern: /\bic\b|\bnric\b/i, reason: "IC/NRIC variant" },
  { pattern: /preference.?score/i, reason: "preference score variant" },
  { pattern: /support.?score/i, reason: "support score variant" },
  { pattern: /individual.?profile/i, reason: "individual profile variant" },
  { pattern: /personal.?data/i, reason: "personal data variant" },
  { pattern: /household.?data/i, reason: "household data variant" },
  { pattern: /social.?account/i, reason: "social account variant" },
]);

export interface PipAggregateContextInput {
  schema?: string;
  status?: string;
  constituency?: {
    level?: string;
    code?: string;
    name?: string;
    stateCode?: string;
    stateName?: string;
  };
  populationContext?: Record<string, unknown>;
  provenance?: {
    sourceSystem?: string;
    datasetVersion?: string;
    generatedAt?: string;
    aggregateOnly?: boolean;
  };
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  status: "ACCEPTED" | "REJECTED_INDIVIDUAL_DATA" | "REJECTED_SCHEMA_MISMATCH";
  failures: string[];
  rejectedFields: string[];
}

export interface NormalisedContext {
  context: PipAggregateContextInput | null;
  validation: ValidationResult;
  trace: Array<{ stage: string; status: string; timestamp: string }>;
  canonical: string;
}

/**
 * Recursively scan an object for any rejected keys or patterns.
 * Returns an array of findings (key paths where individual data was detected).
 */
export function scanForIndividualData(
  obj: unknown,
  path = "",
): Array<{ path: string; key: string; reason: string }> {
  const findings: Array<{ path: string; key: string; reason: string }> = [];

  if (obj === null || obj === undefined || typeof obj !== "object") {
    return findings;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      findings.push(...scanForIndividualData(obj[i], `${path}[${i}]`));
    }
    return findings;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const currentPath = path ? `${path}.${key}` : key;
    const lowerKey = key.toLowerCase();

    // Check exact key matches
    if (REJECTED_KEYS.includes(lowerKey)) {
      findings.push({ path: currentPath, key, reason: `Rejected key: ${key}` });
    }

    // Check regex patterns
    for (const { pattern, reason } of REJECTED_PATTERNS) {
      if (pattern.test(key)) {
        findings.push({ path: currentPath, key, reason });
        break;
      }
    }

    // Recurse into nested objects
    if (typeof record[key] === "object" && record[key] !== null) {
      findings.push(...scanForIndividualData(record[key], currentPath));
    }
  }

  return findings;
}

/**
 * Validate a PIP aggregate context payload.
 * Returns ACCEPTED if the payload contains only aggregate data,
 * or REJECTED_INDIVIDUAL_DATA if any individual-level data is detected.
 */
export function validatePipAggregateContext(input: unknown): ValidationResult {
  const failures: string[] = [];
  const rejectedFields: string[] = [];

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      status: "REJECTED_SCHEMA_MISMATCH",
      failures: ["Input is not an object"],
      rejectedFields: [],
    };
  }

  const ctx = input as PipAggregateContextInput;

  // Check schema
  if (ctx.schema && ctx.schema !== "pip.constituency-aggregate-context.v1") {
    failures.push(`Unexpected schema: ${ctx.schema}`);
  }

  // Run identity firewall scan
  const findings = scanForIndividualData(ctx);

  if (findings.length > 0) {
    for (const finding of findings) {
      rejectedFields.push(finding.path);
    }
    return {
      valid: false,
      status: "REJECTED_INDIVIDUAL_DATA",
      failures: [
        `Found ${findings.length} individual-level data field(s):`,
        ...findings.slice(0, 10).map((f) => `  ${f.path} — ${f.reason}`),
        ...(findings.length > 10 ? [`  ... and ${findings.length - 10} more`] : []),
        "The entire payload is REJECTED. No individual voter data may enter S2D.",
      ],
      rejectedFields,
    };
  }

  return {
    valid: true,
    status: "ACCEPTED",
    failures: [],
    rejectedFields: [],
  };
}

/**
 * Create an empty (zero-value) PIP aggregate context — used as a template.
 */
export function createEmptyPipAggregateContext(params: {
  level: string;
  code: string;
  name: string;
  stateCode: string;
  stateName: string;
  status?: string;
}): PipAggregateContextInput {
  return {
    schema: "pip.constituency-aggregate-context.v1",
    status: params.status || "DRAFT",
    constituency: {
      level: params.level,
      code: params.code,
      name: params.name,
      stateCode: params.stateCode,
      stateName: params.stateName,
    },
    populationContext: {
      totalPopulation: 0,
      totalRegisteredElectors: 0,
      localityCount: 0,
      dmCount: 0,
      geographyMix: { urbanShare: 0, semiUrbanShare: 0, ruralShare: 0 },
      ageBandShares: [],
      broadPopulationSegments: [],
    },
    provenance: {
      sourceSystem: "PIP",
      datasetVersion: "",
      generatedAt: new Date().toISOString(),
      aggregateOnly: true,
    },
  };
}

/**
 * Normalise a PIP aggregate context input — validate + canonicalise.
 */
export function normalisePipAggregateContext(input: unknown): NormalisedContext {
  const validation = validatePipAggregateContext(input);
  const trace = [
    { stage: "PIP_INPUT_BOUNDARY", status: validation.status, timestamp: new Date().toISOString() },
    { stage: "AGGREGATE_ONLY_VALIDATION", status: validation.valid ? "PASSED" : "FAILED", timestamp: new Date().toISOString() },
    { stage: "GOVERNANCE_BOUNDARY", status: validation.valid ? "ACCEPTED" : "REJECTED", timestamp: new Date().toISOString() },
  ];

  return {
    context: validation.valid ? (input as PipAggregateContextInput) : null,
    validation,
    trace,
    canonical: validation.valid ? JSON.stringify(input) : "",
  };
}
