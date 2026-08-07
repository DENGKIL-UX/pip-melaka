export const PIP_S2D_CONTRACT_SCHEMA = "pip-s2d.intelligence-contract-package.v1";
export const PIP_S2D_CONTRACT_VERSION = "1.0";
export const PIP_S2D_CONTRACT_PACKAGE_VERSION = "1.0.0";

export const PIP_S2D_CONTRACT_LIFECYCLE_STATUSES = [
  "DRAFT",
  "VALIDATED",
  "ACCEPTED",
  "SUPERSEDED",
  "RETIRED",
  "REJECTED",
  "INVALID",
];

export const PIP_S2D_AVAILABILITY_STATUSES = [
  "AVAILABLE",
  "PARTIAL",
  "NOT_AVAILABLE",
  "NOT_APPLICABLE",
];

export const PIP_S2D_PRODUCER_SYSTEMS = ["S2D_360", "PIP_360", "VALIDATOR_FIXTURE"];
export const PIP_S2D_CONSUMER_SYSTEMS = ["S2D_360", "PIP_360", "ANALYST_EXPORT", "VALIDATOR_FIXTURE"];
export const PIP_S2D_EXCHANGE_SCOPES = [
  "S2D_INTERNAL",
  "SHARED_AGGREGATE",
  "PIP_REFERENCE",
  "ANALYST_EVIDENCE",
  "VALIDATOR_FIXTURE_ONLY",
];

export const PIP_S2D_GOVERNANCE_BOUNDARY = {
  aggregateOnly: true,
  publicSignalOnly: true,
  individualVoterLinkage: false,
  individualTargeting: false,
  demographicTargeting: false,
  voterPreferenceInference: false,
  politicalSupportInference: false,
  electionResultPrediction: false,
  microtargeting: false,
  personalisedPersuasion: false,
  automaticExecution: false,
  automaticPublication: false,
  humanReviewRequired: true,
};

export const PIP_S2D_CONTRACT_NAMES = [
  "SignalRecord",
  "NarrativeCluster",
  "SentimentSnapshot",
  "DiagnosticCase",
  "ForecastRecord",
  "RecommendationCase",
  "ContentBrief",
  "PublicationRecord",
  "OutcomeReport",
];

export const PIP_S2D_CONTRACT_SCHEMAS = {
  SignalRecord: "pip-s2d.signal-record.v1",
  NarrativeCluster: "pip-s2d.narrative-cluster.v1",
  SentimentSnapshot: "pip-s2d.sentiment-snapshot.v1",
  DiagnosticCase: "pip-s2d.diagnostic-case.v1",
  ForecastRecord: "pip-s2d.forecast-record.v1",
  RecommendationCase: "pip-s2d.recommendation-case.v1",
  ContentBrief: "pip-s2d.content-brief.v1",
  PublicationRecord: "pip-s2d.publication-record.v1",
  OutcomeReport: "pip-s2d.outcome-report.v1",
};

export function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function isIsoUtc(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function normalizeIsoUtc(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

export function isNumberInRange(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function listUniqueStrings(values = []) {
  return [...new Set((values || []).filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
}

export function buildContractRegistryEntry({ contractName, schema, validatorStatus = "VALIDATED", packageVersion = PIP_S2D_CONTRACT_PACKAGE_VERSION, producerSystems = PIP_S2D_PRODUCER_SYSTEMS, consumerSystems = PIP_S2D_CONSUMER_SYSTEMS }) {
  return {
    contractName,
    schema,
    contractVersion: PIP_S2D_CONTRACT_VERSION,
    packageVersion,
    validatorStatus,
    producerSystems: [...producerSystems],
    consumerSystems: [...consumerSystems],
  };
}

export function createBaseRecord({ schema, contractName, input = {}, recordIdPrefix = "REC" }) {
  const now = normalizeIsoUtc(input.lifecycle?.createdAt || input.exchange?.generatedAt || input.generatedAt || input.createdAt, new Date().toISOString());
  const recordId = typeof input.recordId === "string" && input.recordId.trim() ? input.recordId.trim() : `${recordIdPrefix}-${Date.now()}`;
  const recordVersion = isPositiveInteger(input.recordVersion) ? input.recordVersion : 1;
  const producer = {
    system: input.producer?.system || "S2D_360",
    systemVersion: input.producer?.systemVersion || "",
    component: input.producer?.component || "",
  };
  const exchange = {
    scope: input.exchange?.scope || "SHARED_AGGREGATE",
    correlationId: input.exchange?.correlationId || input.correlationId || "",
    generatedAt: normalizeIsoUtc(input.exchange?.generatedAt || input.generatedAt, now),
    expiresAt: normalizeIsoUtc(input.exchange?.expiresAt, null),
  };
  const confidence = {
    score: input.confidence?.score ?? null,
    level: input.confidence?.level || "NOT_AVAILABLE",
    basis: listUniqueStrings(input.confidence?.basis || []),
    sampleSize: input.confidence?.sampleSize ?? null,
  };
  const lifecycle = {
    status: input.lifecycle?.status || "DRAFT",
    createdAt: now,
    updatedAt: normalizeIsoUtc(input.lifecycle?.updatedAt || input.updatedAt, now),
    acceptedAt: normalizeIsoUtc(input.lifecycle?.acceptedAt, null),
    supersededBy: input.lifecycle?.supersededBy ?? null,
  };
  const provenance = {
    sourceRecordIds: listUniqueStrings(input.provenance?.sourceRecordIds || []),
    sourceDatasetIds: listUniqueStrings(input.provenance?.sourceDatasetIds || []),
    sourceRunIds: listUniqueStrings(input.provenance?.sourceRunIds || []),
    lineageHash: input.provenance?.lineageHash ?? null,
    adapterVersion: input.provenance?.adapterVersion || "",
  };
  const base = {
    schema,
    contractName,
    contractVersion: PIP_S2D_CONTRACT_VERSION,
    recordId,
    recordVersion,
    producer,
    exchange,
    geography: input.geography ? deepClone(input.geography) : {},
    evidenceRefs: Array.isArray(input.evidenceRefs) ? deepClone(input.evidenceRefs) : [],
    confidence,
    lifecycle,
    provenance,
    limitations: Array.isArray(input.limitations) ? input.limitations.filter((item) => typeof item === "string" && item.trim().length > 0) : [],
    governance: input.governance ? { ...PIP_S2D_GOVERNANCE_BOUNDARY, ...deepClone(input.governance) } : { ...PIP_S2D_GOVERNANCE_BOUNDARY },
  };
  return { ...base, ...deepClone(input.payload || {}), ...deepClone(input.flat || {}), ...deepClone(input), schema, contractName, contractVersion: PIP_S2D_CONTRACT_VERSION, recordId, recordVersion, producer, exchange, geography: base.geography, evidenceRefs: base.evidenceRefs, confidence, lifecycle, provenance, limitations: base.limitations, governance: base.governance };
}

export function validateBaseRecord(record, { schema, contractName, additionalRequiredFields = [], prohibitedFields = [] } = {}) {
  const errors = [];
  const normalized = deepClone(record || {});
  if (!normalized || typeof normalized !== "object") errors.push("record must be an object");
  if (normalized.schema !== schema) errors.push("schema is required and must match contract schema");
  if (normalized.contractName !== contractName) errors.push("contractName is required and must match contract name");
  if (normalized.contractVersion !== PIP_S2D_CONTRACT_VERSION) errors.push("contractVersion must be 1.0");
  if (typeof normalized.recordId !== "string" || normalized.recordId.trim().length === 0) errors.push("recordId is required");
  if (!isPositiveInteger(normalized.recordVersion)) errors.push("recordVersion must be a positive integer");
  if (!normalized.producer || typeof normalized.producer !== "object") errors.push("producer is required");
  else {
    if (!PIP_S2D_PRODUCER_SYSTEMS.includes(normalized.producer.system)) errors.push("producer.system is invalid");
    if (typeof normalized.producer.systemVersion !== "string") errors.push("producer.systemVersion is required");
    if (typeof normalized.producer.component !== "string") errors.push("producer.component is required");
  }
  if (!normalized.exchange || typeof normalized.exchange !== "object") errors.push("exchange is required");
  else {
    if (!PIP_S2D_EXCHANGE_SCOPES.includes(normalized.exchange.scope)) errors.push("exchange.scope is invalid");
    if (typeof normalized.exchange.correlationId !== "string") errors.push("exchange.correlationId is required");
    if (!isIsoUtc(normalized.exchange.generatedAt)) errors.push("exchange.generatedAt must be ISO-8601 UTC");
    if (normalized.exchange.expiresAt !== null && !isIsoUtc(normalized.exchange.expiresAt)) errors.push("exchange.expiresAt must be ISO-8601 UTC or null");
  }
  if (!normalized.confidence || typeof normalized.confidence !== "object") errors.push("confidence is required");
  else {
    if (normalized.confidence.score !== null && !isNumberInRange(normalized.confidence.score, 0, 1)) errors.push("confidence.score must be null or between 0 and 1");
    if (!PIP_S2D_AVAILABILITY_STATUSES.includes(normalized.confidence.level)) errors.push("confidence.level is invalid");
    if (!Array.isArray(normalized.confidence.basis)) errors.push("confidence.basis must be an array");
    if (normalized.confidence.sampleSize !== null && !isPositiveInteger(normalized.confidence.sampleSize)) errors.push("confidence.sampleSize must be null or a positive integer");
  }
  if (!normalized.lifecycle || typeof normalized.lifecycle !== "object") errors.push("lifecycle is required");
  else {
    if (!PIP_S2D_CONTRACT_LIFECYCLE_STATUSES.includes(normalized.lifecycle.status)) errors.push("lifecycle.status is invalid");
    if (!isIsoUtc(normalized.lifecycle.createdAt)) errors.push("lifecycle.createdAt must be ISO-8601 UTC");
    if (!isIsoUtc(normalized.lifecycle.updatedAt)) errors.push("lifecycle.updatedAt must be ISO-8601 UTC");
    if (normalized.lifecycle.acceptedAt !== null && !isIsoUtc(normalized.lifecycle.acceptedAt)) errors.push("lifecycle.acceptedAt must be ISO-8601 UTC or null");
    if (normalized.lifecycle.status === "ACCEPTED" && normalized.lifecycle.acceptedAt === null) errors.push("acceptedAt must be set when status is ACCEPTED");
    if (normalized.lifecycle.status !== "ACCEPTED" && normalized.lifecycle.acceptedAt !== null) errors.push("acceptedAt must remain null unless status is ACCEPTED");
  }
  if (!normalized.provenance || typeof normalized.provenance !== "object") errors.push("provenance is required");
  else {
    if (!Array.isArray(normalized.provenance.sourceRecordIds)) errors.push("provenance.sourceRecordIds must be an array");
    if (!Array.isArray(normalized.provenance.sourceDatasetIds)) errors.push("provenance.sourceDatasetIds must be an array");
    if (!Array.isArray(normalized.provenance.sourceRunIds)) errors.push("provenance.sourceRunIds must be an array");
    if (normalized.provenance.lineageHash !== null && typeof normalized.provenance.lineageHash !== "string") errors.push("provenance.lineageHash must be null or a string");
    if (typeof normalized.provenance.adapterVersion !== "string") errors.push("provenance.adapterVersion is required");
  }
  if (!Array.isArray(normalized.limitations)) errors.push("limitations must be an array");
  if (!normalized.governance || typeof normalized.governance !== "object") errors.push("governance is required");
  else {
    for (const [key, value] of Object.entries(PIP_S2D_GOVERNANCE_BOUNDARY)) {
      if (normalized.governance[key] !== value) errors.push(`governance.${key} must be ${value}`);
    }
  }
  for (const field of additionalRequiredFields) {
    if (normalized[field] == null || normalized[field] === "") errors.push(`${field} is required`);
  }
  for (const field of prohibitedFields) {
    if (field in normalized && normalized[field] != null && normalized[field] !== "") errors.push(`${field} is prohibited`);
  }
  return { valid: errors.length === 0, errors, normalized };
}

export function buildCsv(rows, headers) {
  const escapeCell = (value) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => escapeCell(row?.[header])).join(","));
  return `${lines.join("\n")}\n`;
}

export function buildCompatibilityRow({ contractName, schema, producer, consumer, status, notes = [] }) {
  return {
    contractName,
    schema,
    producer,
    consumer,
    status,
    notes: notes.filter((item) => typeof item === "string" && item.trim().length > 0),
  };
}
