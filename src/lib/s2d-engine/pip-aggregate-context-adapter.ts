/**
 * PIP → S2D aggregate-context identity firewall.
 *
 * The boundary rejects the entire payload when individual, targeting, or
 * election-prediction fields are detected. It never attempts to "clean" an
 * unsafe PIP context because partial filtering can hide a modelling error.
 */

const REJECTED_CANONICAL_KEYS = new Set([
  "voters", "voterrecords", "persons", "people", "individuals", "citizens", "records", "names",
  "fullname", "firstname", "lastname", "personname", "identitynumber", "ic", "icnumber", "nric",
  "phone", "phonenumber", "mobile", "email", "address", "addresses", "residentialaddress",
  "voterid", "voterids", "username", "usernames", "handle", "accountid", "profileid", "socialaccount",
  "preferencescore", "supportscore", "politicalclassification", "individualpoliticalclassification",
  "targetsegment", "targetaudienceid", "demographictarget", "individualtargeting", "personalisedpersuasion",
  "partywinner", "candidatewinner", "constituencywinner", "voteshareprediction", "turnoutprediction",
  "electionresultprediction", "voterpreference", "votingpreference", "predictedvote", "persuasionscore",
  "turnoutprobability", "personaldata", "householddata", "individualprofile",
]);

const ALLOWED_NAME_PATHS = new Set([
  "constituency.name",
  "constituency.stateName",
]);
const ALLOWED_OBJECT_ARRAY_PATHS = new Set([
  "populationContext.ageBandShares",
  "populationContext.broadPopulationSegments",
]);

function canonicalKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

export interface IndividualDataFinding {
  path: string;
  key: string;
  reason: string;
}

/** Scan recursively using separator/case-insensitive key canonicalisation. */
export function scanForIndividualData(obj: unknown, path = ""): IndividualDataFinding[] {
  const findings: IndividualDataFinding[] = [];
  const seen = new WeakSet<object>();
  let visited = 0;

  function scan(value: unknown, currentPath: string, depth: number): void {
    if (!value || typeof value !== "object") return;
    if (depth > 64 || ++visited > 10_000) {
      findings.push({ path: currentPath || "root", key: "", reason: "Payload nesting/size limit exceeded" });
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      if (!ALLOWED_OBJECT_ARRAY_PATHS.has(currentPath) && value.some(isRecord)) {
        findings.push({ path: currentPath, key: "", reason: "Record-level object array rejected" });
      }
      value.forEach((entry, index) => scan(entry, `${currentPath}[${index}]`, depth + 1));
      return;
    }

    for (const key of Object.keys(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      const canonical = canonicalKey(key);
      const isAllowedAggregateName = ALLOWED_NAME_PATHS.has(nextPath);
      if (!isAllowedAggregateName && REJECTED_CANONICAL_KEYS.has(canonical)) {
        findings.push({ path: nextPath, key, reason: `Rejected individual/targeting key: ${key}` });
      }
      if (["__proto__", "prototype", "constructor"].includes(key.toLowerCase())) {
        findings.push({ path: nextPath, key, reason: "Prototype manipulation key rejected" });
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) scan(descriptor.value, nextPath, depth + 1);
    }
  }

  scan(obj, path, 0);
  return findings;
}

function validateNumber(value: unknown, field: string, failures: string[], integer = false): void {
  if (value === null || value === undefined || value === "") return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    failures.push(`${field} must be a non-negative${integer ? " integer" : " number"} when present`);
  }
}

function validateShareRows(value: unknown, field: string, failures: string[]): void {
  if (!Array.isArray(value)) {
    failures.push(`${field} must be an array`);
    return;
  }
  let total = 0;
  value.forEach((row, index) => {
    if (!isRecord(row) || typeof row.label !== "string" || !row.label.trim()) {
      failures.push(`${field}[${index}].label is required`);
      return;
    }
    if (typeof row.share !== "number" || !Number.isFinite(row.share) || row.share < 0 || row.share > 1) {
      failures.push(`${field}[${index}].share must be between 0 and 1`);
      return;
    }
    total += row.share;
  });
  if (value.length && Math.abs(total - 1) > 0.02) failures.push(`${field} shares must total approximately 1`);
}

export function validatePipAggregateContext(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { valid: false, status: "REJECTED_SCHEMA_MISMATCH", failures: ["Input must be an object"], rejectedFields: [] };
  }

  const findings = scanForIndividualData(input);
  if (findings.length) {
    return {
      valid: false,
      status: "REJECTED_INDIVIDUAL_DATA",
      failures: [
        `Found ${findings.length} prohibited field(s) or record structure(s).`,
        ...findings.slice(0, 10).map((finding) => `${finding.path} — ${finding.reason}`),
        "The entire payload is rejected; no individual data may enter S2D.",
      ],
      rejectedFields: [...new Set(findings.map((finding) => finding.path))],
    };
  }

  const failures: string[] = [];
  const ctx = input as PipAggregateContextInput;
  if (ctx.schema !== "pip.constituency-aggregate-context.v1") failures.push("schema must be pip.constituency-aggregate-context.v1");

  const constituency = ctx.constituency;
  if (!isRecord(constituency)) {
    failures.push("constituency is required");
  } else {
    if (constituency.level !== "DUN" && constituency.level !== "PARLIAMENT") failures.push("constituency.level must be DUN or PARLIAMENT");
    if (typeof constituency.code !== "string" || !constituency.code.trim()) failures.push("constituency.code is required");
    if (typeof constituency.name !== "string" || !constituency.name.trim()) failures.push("constituency.name is required");
  }

  const provenance = ctx.provenance;
  if (!isRecord(provenance)) {
    failures.push("provenance is required");
  } else {
    if (provenance.sourceSystem !== "PIP") failures.push("provenance.sourceSystem must be PIP");
    if (provenance.aggregateOnly !== true) failures.push("provenance.aggregateOnly must be true");
  }

  const population = ctx.populationContext;
  if (!isRecord(population)) {
    failures.push("populationContext is required");
  } else {
    validateNumber(population.totalPopulation, "populationContext.totalPopulation", failures, true);
    validateNumber(population.totalRegisteredElectors, "populationContext.totalRegisteredElectors", failures, true);
    validateNumber(population.localityCount, "populationContext.localityCount", failures, true);
    validateNumber(population.dmCount, "populationContext.dmCount", failures, true);

    const mix = population.geographyMix;
    if (!isRecord(mix)) {
      failures.push("populationContext.geographyMix is required");
    } else {
      const values = [mix.urbanShare, mix.semiUrbanShare, mix.ruralShare];
      values.forEach((value, index) => {
        if (value !== null && value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)) {
          failures.push(`populationContext.geographyMix share ${index + 1} must be between 0 and 1`);
        }
      });
      if (values.every((value) => typeof value === "number")) {
        const total = (values as number[]).reduce((sum, value) => sum + value, 0);
        if (total > 0 && Math.abs(total - 1) > 0.02) failures.push("populationContext.geographyMix shares must total approximately 1");
      }
    }
    validateShareRows(population.ageBandShares, "populationContext.ageBandShares", failures);
    validateShareRows(population.broadPopulationSegments, "populationContext.broadPopulationSegments", failures);
  }

  return {
    valid: failures.length === 0,
    status: failures.length === 0 ? "ACCEPTED" : "REJECTED_SCHEMA_MISMATCH",
    failures,
    rejectedFields: [],
  };
}

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

export function normalisePipAggregateContext(input: unknown): NormalisedContext {
  const validation = validatePipAggregateContext(input);
  const now = new Date().toISOString();
  const trace = [
    { stage: "PIP_INPUT_BOUNDARY", status: validation.status, timestamp: now },
    { stage: "AGGREGATE_ONLY_VALIDATION", status: validation.valid ? "PASSED" : "FAILED", timestamp: now },
    { stage: "GOVERNANCE_BOUNDARY", status: validation.valid ? "ACCEPTED" : "REJECTED", timestamp: now },
  ];

  return {
    context: validation.valid ? input as PipAggregateContextInput : null,
    validation,
    trace,
    canonical: validation.valid ? JSON.stringify(input) : "",
  };
}
