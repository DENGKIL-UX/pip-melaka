import {
  PIP_360_GEOGRAPHY_LEVELS,
  PIP_360_GEOGRAPHY_MAPPING_METHODS,
  PIP_360_GEOGRAPHY_MAPPING_STATUSES,
  PIP_360_GEOGRAPHY_MAPPING_SUMMARY_SCHEMA,
  PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES,
  normalizePip360GeographyToken,
  sanitizePip360MappedSignal,
  sanitizePip360SignalGeographyHint,
  validatePip360MappedSignal,
} from "./pip-360-geography-mapping-contract.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeText(value, max = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeIso(value) {
  const text = sanitizeText(value, 80);
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeParliamentCode(value) {
  const normalized = sanitizeText(value, 24).toUpperCase();
  if (/^\d{3}$/.test(normalized)) {
    return `P${normalized}`;
  }
  return normalized;
}

function normalizeCode(level, value) {
  const normalized = sanitizeText(value, 32).toUpperCase();
  return level === PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT
    ? normalizeParliamentCode(normalized)
    : normalized;
}

function toRecordArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function levelOrder() {
  return [
    PIP_360_GEOGRAPHY_LEVELS.STATE,
    PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT,
    PIP_360_GEOGRAPHY_LEVELS.DUN,
    PIP_360_GEOGRAPHY_LEVELS.DM,
    PIP_360_GEOGRAPHY_LEVELS.LOCALITY,
  ];
}

function deepestOf(levels) {
  const order = levelOrder();
  return order
    .slice()
    .reverse()
    .find((level) => levels.includes(level)) || "";
}

function levelRank(level) {
  return levelOrder().indexOf(level);
}

function geographyFromRecord(record = {}) {
  const geography = isPlainObject(record.geography) ? record.geography : {};
  return {
    state_code: normalizeCode(PIP_360_GEOGRAPHY_LEVELS.STATE, geography.state_code),
    state_name: sanitizeText(geography.state_name, 120).toUpperCase(),
    parliament_code: normalizeCode(
      PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT,
      geography.parliament_code
    ),
    parliament_name: sanitizeText(geography.parliament_name, 120).toUpperCase(),
    dun_code: normalizeCode(PIP_360_GEOGRAPHY_LEVELS.DUN, geography.dun_code),
    dun_name: sanitizeText(geography.dun_name, 120).toUpperCase(),
    dm_code: normalizeCode(PIP_360_GEOGRAPHY_LEVELS.DM, geography.dm_code),
    dm_name: sanitizeText(geography.dm_name, 120).toUpperCase(),
    locality_code: normalizeCode(
      PIP_360_GEOGRAPHY_LEVELS.LOCALITY,
      geography.locality_code
    ),
    locality_name: sanitizeText(geography.locality_name, 160).toUpperCase(),
  };
}

function createNode(level, geography) {
  return {
    level,
    state_code: geography.state_code,
    state_name: geography.state_name,
    parliament_code: geography.parliament_code,
    parliament_name: geography.parliament_name,
    dun_code: geography.dun_code,
    dun_name: geography.dun_name,
    dm_code: geography.dm_code,
    dm_name: geography.dm_name,
    locality_code: geography.locality_code,
    locality_name: geography.locality_name,
  };
}

function levelCodeField(level) {
  switch (level) {
    case PIP_360_GEOGRAPHY_LEVELS.STATE:
      return "state_code";
    case PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT:
      return "parliament_code";
    case PIP_360_GEOGRAPHY_LEVELS.DUN:
      return "dun_code";
    case PIP_360_GEOGRAPHY_LEVELS.DM:
      return "dm_code";
    default:
      return "locality_code";
  }
}

function levelNameField(level) {
  switch (level) {
    case PIP_360_GEOGRAPHY_LEVELS.STATE:
      return "state_name";
    case PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT:
      return "parliament_name";
    case PIP_360_GEOGRAPHY_LEVELS.DUN:
      return "dun_name";
    case PIP_360_GEOGRAPHY_LEVELS.DM:
      return "dm_name";
    default:
      return "locality_name";
  }
}

function levelParentKey(level, node) {
  switch (level) {
    case PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT:
      return node.state_code || node.state_name;
    case PIP_360_GEOGRAPHY_LEVELS.DUN:
      return node.parliament_code;
    case PIP_360_GEOGRAPHY_LEVELS.DM:
      return `${node.parliament_code}|${node.dun_code}`;
    case PIP_360_GEOGRAPHY_LEVELS.LOCALITY:
      return `${node.parliament_code}|${node.dun_code}|${node.dm_code}`;
    default:
      return "ROOT";
  }
}

function levelChainKey(level, node) {
  switch (level) {
    case PIP_360_GEOGRAPHY_LEVELS.STATE:
      return node.state_code || node.state_name;
    case PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT:
      return `${node.state_code}|${node.parliament_code}`;
    case PIP_360_GEOGRAPHY_LEVELS.DUN:
      return `${node.parliament_code}|${node.dun_code}`;
    case PIP_360_GEOGRAPHY_LEVELS.DM:
      return `${node.parliament_code}|${node.dun_code}|${node.dm_code}`;
    default:
      return `${node.parliament_code}|${node.dun_code}|${node.dm_code}|${node.locality_code}`;
  }
}

function pushIndexEntry(map, key, value) {
  if (!key) {
    return;
  }
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(value);
}

function extractHintEnvelope(input) {
  if (isPlainObject(input) && isPlainObject(input.hint)) {
    return {
      hint: input.hint,
      validation_fixture: input.validation_fixture === true,
      production_signal: input.production_signal === true,
      label: sanitizeText(input.label, 120),
      expected_status: sanitizeText(input.expected_status, 48).toUpperCase(),
    };
  }

  return {
    hint: input,
    validation_fixture: false,
    production_signal: true,
    label: "",
    expected_status: "",
  };
}

export function buildPip360GeographyHierarchyIndex({
  constituencyConfig,
  dunRecords,
  dmRecords,
  localityRecords,
  validationFixtureMode = false,
} = {}) {
  const safeDunRecords = toRecordArray(dunRecords);
  const safeDmRecords = toRecordArray(dmRecords);
  const safeLocalityRecords = toRecordArray(localityRecords);
  const config = isPlainObject(constituencyConfig) ? constituencyConfig : {};
  const parliamentCode = normalizeParliamentCode(
    config.parliamentCode ?? config.parliament_code
  );
  const parliamentName = sanitizeText(
    config.parliamentName ?? config.parliament_name,
    120
  ).toUpperCase();
  const stateName = sanitizeText(config.stateName ?? config.state_name, 120).toUpperCase();
  const stateCode = normalizeCode(
    PIP_360_GEOGRAPHY_LEVELS.STATE,
    safeDunRecords[0]?.geography?.state_code ??
      safeDmRecords[0]?.geography?.state_code ??
      safeLocalityRecords[0]?.geography?.state_code
  );
  const validationFixture = validationFixtureMode === true || parliamentCode === "P999";

  const codeIndexes = {
    DUN: new Map(),
    DM: new Map(),
    LOCALITY: new Map(),
  };
  const chainIndexes = {
    DUN: new Map(),
    DM: new Map(),
    LOCALITY: new Map(),
  };
  const nameIndexes = {
    PARLIAMENT: new Map(),
    DUN: new Map(),
    DM: new Map(),
    LOCALITY: new Map(),
  };
  const parentNameIndexes = {
    DUN: new Map(),
    DM: new Map(),
    LOCALITY: new Map(),
  };
  const collisionIndex = {
    DUN: new Map(),
    DM: new Map(),
    LOCALITY: new Map(),
  };

  let duplicateCodeCount = 0;
  let duplicateNameWithinParentCount = 0;
  let invalidRecordCount = 0;

  const parliamentNode = createNode(PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT, {
    state_code: stateCode,
    state_name: stateName,
    parliament_code: parliamentCode,
    parliament_name: parliamentName,
    dun_code: "",
    dun_name: "",
    dm_code: "",
    dm_name: "",
    locality_code: "",
    locality_name: "",
  });

  pushIndexEntry(
    nameIndexes.PARLIAMENT,
    normalizePip360GeographyToken(parliamentNode.parliament_name),
    parliamentNode
  );

  const duns = [];
  const dms = [];
  const localities = [];

  const registerNode = (level, geography) => {
    const node = createNode(level, geography);
    const requiredFields = {
      DUN: [node.parliament_code, node.dun_code, node.dun_name],
      DM: [node.parliament_code, node.dun_code, node.dm_code, node.dm_name],
      LOCALITY: [
        node.parliament_code,
        node.dun_code,
        node.dm_code,
        node.locality_code,
        node.locality_name,
      ],
    };

    if (requiredFields[level].some((entry) => !entry)) {
      invalidRecordCount += 1;
      return null;
    }

    const chainKey = levelChainKey(level, node);
    if (chainIndexes[level].has(chainKey)) {
      duplicateCodeCount += 1;
      return chainIndexes[level].get(chainKey);
    }
    chainIndexes[level].set(chainKey, node);
    pushIndexEntry(codeIndexes[level], node[levelCodeField(level)], node);

    const nameField = node[levelNameField(level)];
    const normalizedName = normalizePip360GeographyToken(nameField);
    const parentKey = levelParentKey(level, node);
    pushIndexEntry(nameIndexes[level], normalizedName, node);
    pushIndexEntry(parentNameIndexes[level], `${parentKey}|${normalizedName}`, node);
    pushIndexEntry(collisionIndex[level], normalizedName, parentKey);

    if ((parentNameIndexes[level].get(`${parentKey}|${normalizedName}`) ?? []).length > 1) {
      duplicateNameWithinParentCount += 1;
    }

    return node;
  };

  safeDunRecords.forEach((record) => {
    const node = registerNode(PIP_360_GEOGRAPHY_LEVELS.DUN, geographyFromRecord(record));
    if (node) {
      duns.push(node);
    }
  });

  safeDmRecords.forEach((record) => {
    const node = registerNode(PIP_360_GEOGRAPHY_LEVELS.DM, geographyFromRecord(record));
    if (node) {
      dms.push(node);
    }
  });

  safeLocalityRecords.forEach((record) => {
    const node = registerNode(
      PIP_360_GEOGRAPHY_LEVELS.LOCALITY,
      geographyFromRecord(record)
    );
    if (node) {
      localities.push(node);
    }
  });

  const crossParentCollisions = [];
  Object.entries(collisionIndex).forEach(([level, map]) => {
    map.forEach((parentKeys, normalizedName) => {
      const uniqueParents = [...new Set(parentKeys.filter(Boolean))];
      if (uniqueParents.length > 1) {
        crossParentCollisions.push({
          level,
          normalized_name: normalizedName,
          parent_keys: uniqueParents,
        });
      }
    });
  });

  return {
    validation_fixture: validationFixture,
    constituency_identity: {
      state_code: stateCode,
      state_name: stateName,
      parliament_code: parliamentCode,
      parliament_name: parliamentName,
    },
    nodes: {
      parliament: parliamentNode,
      duns,
      dms,
      localities,
    },
    lookups: {
      codeIndexes,
      chainIndexes,
      nameIndexes,
      parentNameIndexes,
      crossParentCollisions,
    },
    summary: {
      state_count: stateName || stateCode ? 1 : 0,
      parliament_count: parliamentCode ? 1 : 0,
      dun_count: duns.length,
      dm_count: dms.length,
      locality_count: localities.length,
      duplicate_code_count: duplicateCodeCount,
      duplicate_name_within_parent_count: duplicateNameWithinParentCount,
      cross_parent_name_collision_count: crossParentCollisions.length,
      invalid_record_count: invalidRecordCount,
      source_record_count:
        safeDunRecords.length + safeDmRecords.length + safeLocalityRecords.length,
    },
  };
}

export function validatePip360GeographyHierarchyIndex(index = {}) {
  const safe = isPlainObject(index) ? index : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};
  const identity = isPlainObject(safe.constituency_identity)
    ? safe.constituency_identity
    : {};
  const errors = [];

  if (Number(summary.state_count ?? 0) !== 1) {
    errors.push("Hierarchy index must contain exactly one state.");
  }
  if (Number(summary.parliament_count ?? 0) !== 1) {
    errors.push("Hierarchy index must contain exactly one parliament.");
  }
  if (!identity.parliament_code) {
    errors.push("Hierarchy index must have a parliament_code.");
  }
  if (Number(summary.invalid_record_count ?? 0) !== 0) {
    errors.push("Hierarchy index contains invalid records.");
  }
  if (Number(summary.duplicate_code_count ?? 0) !== 0) {
    errors.push("Hierarchy index contains duplicate code chains.");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: safe.summary ?? {},
  };
}

function resolveRequestedLevel(hint) {
  if (hint.locality_code || hint.locality_name) {
    return PIP_360_GEOGRAPHY_LEVELS.LOCALITY;
  }
  if (hint.dm_code || hint.dm_name) {
    return PIP_360_GEOGRAPHY_LEVELS.DM;
  }
  if (hint.dun_code || hint.dun_name) {
    return PIP_360_GEOGRAPHY_LEVELS.DUN;
  }
  if (hint.parliament_code || hint.parliament_name) {
    return PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT;
  }
  return PIP_360_GEOGRAPHY_LEVELS.STATE;
}

function contextMismatch(index, hint) {
  const context = index.constituency_identity ?? {};
  if (
    hint.parliament_code &&
    hint.parliament_code !== context.parliament_code
  ) {
    return true;
  }
  if (
    hint.parliament_name &&
    normalizePip360GeographyToken(hint.parliament_name) !==
      normalizePip360GeographyToken(context.parliament_name)
  ) {
    return true;
  }
  if (
    hint.state_name &&
    normalizePip360GeographyToken(hint.state_name) !==
      normalizePip360GeographyToken(context.state_name)
  ) {
    return true;
  }
  if (context.parliament_code === "P999" && hint.parliament_code === "P134") {
    return true;
  }
  if (context.parliament_code === "P134" && hint.parliament_code === "P999") {
    return true;
  }
  return false;
}

function matchesConstraint(node, field, rawValue, isName = false) {
  if (!rawValue) {
    return true;
  }
  const nodeValue = sanitizeText(node[field], 160).toUpperCase();
  if (!nodeValue) {
    return false;
  }
  return isName
    ? normalizePip360GeographyToken(rawValue) === normalizePip360GeographyToken(nodeValue)
    : sanitizeText(rawValue, 160).toUpperCase() === nodeValue;
}

function applyHintConstraints(candidates, hint) {
  return candidates.filter((candidate) =>
    matchesConstraint(candidate, "state_code", hint.state_code) &&
    matchesConstraint(candidate, "state_name", hint.state_name, true) &&
    matchesConstraint(candidate, "parliament_code", hint.parliament_code) &&
    matchesConstraint(candidate, "parliament_name", hint.parliament_name, true) &&
    matchesConstraint(candidate, "dun_code", hint.dun_code) &&
    matchesConstraint(candidate, "dun_name", hint.dun_name, true) &&
    matchesConstraint(candidate, "dm_code", hint.dm_code) &&
    matchesConstraint(candidate, "dm_name", hint.dm_name, true) &&
    matchesConstraint(candidate, "locality_code", hint.locality_code) &&
    matchesConstraint(candidate, "locality_name", hint.locality_name, true)
  );
}

function resolveByCode(index, hint) {
  const lookups = index.lookups ?? {};
  if (hint.locality_code) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.LOCALITY,
      candidates: applyHintConstraints(
        lookups.codeIndexes?.LOCALITY?.get(hint.locality_code) ?? [],
        hint
      ),
      initialCandidates: lookups.codeIndexes?.LOCALITY?.get(hint.locality_code) ?? [],
      completeChain: Boolean(
        hint.parliament_code && hint.dun_code && hint.dm_code && hint.locality_code
      ),
    };
  }
  if (hint.dm_code) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.DM,
      candidates: applyHintConstraints(
        lookups.codeIndexes?.DM?.get(hint.dm_code) ?? [],
        hint
      ),
      initialCandidates: lookups.codeIndexes?.DM?.get(hint.dm_code) ?? [],
      completeChain: Boolean(hint.parliament_code && hint.dun_code && hint.dm_code),
    };
  }
  if (hint.dun_code) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.DUN,
      candidates: applyHintConstraints(
        lookups.codeIndexes?.DUN?.get(hint.dun_code) ?? [],
        hint
      ),
      initialCandidates: lookups.codeIndexes?.DUN?.get(hint.dun_code) ?? [],
      completeChain: Boolean(hint.parliament_code && hint.dun_code),
    };
  }
  if (hint.parliament_code) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT,
      candidates:
        normalizeParliamentCode(hint.parliament_code) ===
        index.constituency_identity?.parliament_code
          ? [index.nodes?.parliament].filter(Boolean)
          : [],
      initialCandidates: [index.nodes?.parliament].filter(Boolean),
      completeChain: true,
    };
  }
  if (hint.state_code) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.STATE,
      candidates:
        sanitizeText(hint.state_code, 24).toUpperCase() ===
          sanitizeText(index.constituency_identity?.state_code, 24).toUpperCase() &&
        (hint.state_code || index.constituency_identity?.state_code)
          ? [index.nodes?.parliament].filter(Boolean)
          : [],
      initialCandidates: [index.nodes?.parliament].filter(Boolean),
      completeChain: true,
    };
  }
  return null;
}

function resolveByName(index, hint) {
  const lookups = index.lookups ?? {};
  if (hint.locality_name) {
    const key = normalizePip360GeographyToken(hint.locality_name);
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.LOCALITY,
      candidates: applyHintConstraints(lookups.nameIndexes?.LOCALITY?.get(key) ?? [], hint),
      initialCandidates: lookups.nameIndexes?.LOCALITY?.get(key) ?? [],
      completeChain: Boolean(
        hint.parliament_name && hint.dun_name && hint.dm_name && hint.locality_name
      ),
    };
  }
  if (hint.dm_name) {
    const key = normalizePip360GeographyToken(hint.dm_name);
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.DM,
      candidates: applyHintConstraints(lookups.nameIndexes?.DM?.get(key) ?? [], hint),
      initialCandidates: lookups.nameIndexes?.DM?.get(key) ?? [],
      completeChain: Boolean(hint.parliament_name && hint.dun_name && hint.dm_name),
    };
  }
  if (hint.dun_name) {
    const key = normalizePip360GeographyToken(hint.dun_name);
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.DUN,
      candidates: applyHintConstraints(lookups.nameIndexes?.DUN?.get(key) ?? [], hint),
      initialCandidates: lookups.nameIndexes?.DUN?.get(key) ?? [],
      completeChain: Boolean(hint.parliament_name && hint.dun_name),
    };
  }
  if (hint.parliament_name) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT,
      candidates:
        normalizePip360GeographyToken(hint.parliament_name) ===
        normalizePip360GeographyToken(index.constituency_identity?.parliament_name)
          ? [index.nodes?.parliament].filter(Boolean)
          : [],
      initialCandidates: [index.nodes?.parliament].filter(Boolean),
      completeChain: true,
    };
  }
  if (hint.state_name) {
    return {
      level: PIP_360_GEOGRAPHY_LEVELS.STATE,
      candidates:
        normalizePip360GeographyToken(hint.state_name) ===
          normalizePip360GeographyToken(index.constituency_identity?.state_name) &&
        (hint.state_name || index.constituency_identity?.state_name)
          ? [index.nodes?.parliament].filter(Boolean)
          : [],
      initialCandidates: [index.nodes?.parliament].filter(Boolean),
      completeChain: true,
    };
  }
  return null;
}

function nodeToMappedGeography(node = {}, level = "") {
  return {
    state_code: node.state_code || "",
    state_name: node.state_name || "",
    parliament_code: node.parliament_code || "",
    parliament_name: node.parliament_name || "",
    dun_code: level === PIP_360_GEOGRAPHY_LEVELS.STATE || level === PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT ? "" : node.dun_code || "",
    dun_name: level === PIP_360_GEOGRAPHY_LEVELS.STATE || level === PIP_360_GEOGRAPHY_LEVELS.PARLIAMENT ? "" : node.dun_name || "",
    dm_code:
      level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY || level === PIP_360_GEOGRAPHY_LEVELS.DM
        ? node.dm_code || ""
        : "",
    dm_name:
      level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY || level === PIP_360_GEOGRAPHY_LEVELS.DM
        ? node.dm_name || ""
        : "",
    locality_code: level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY ? node.locality_code || "" : "",
    locality_name: level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY ? node.locality_name || "" : "",
  };
}

function buildResult({
  envelope,
  hint,
  node,
  requestedLevel,
  status,
  method,
  confidence,
  candidateCount,
  parentChainVerified,
  reason,
}) {
  return sanitizePip360MappedSignal({
    signal_id: hint.signal_id,
    source_system: hint.source_system,
    source_record_id: hint.source_record_id,
    observed_at: hint.observed_at,
    supplied_geography: hint,
    mapping_status: status,
    mapping_method: method,
    confidence,
    deepest_verified_level: node?.level ?? "",
    mapped_geography: nodeToMappedGeography(node ?? {}, node?.level ?? ""),
    evidence: {
      requested_level: requestedLevel,
      matched_fields: [
        hint.locality_code ? "locality_code" : "",
        hint.locality_name ? "locality_name" : "",
        hint.dm_code ? "dm_code" : "",
        hint.dm_name ? "dm_name" : "",
        hint.dun_code ? "dun_code" : "",
        hint.dun_name ? "dun_name" : "",
        hint.parliament_code ? "parliament_code" : "",
        hint.parliament_name ? "parliament_name" : "",
        hint.state_code ? "state_code" : "",
        hint.state_name ? "state_name" : "",
      ].filter(Boolean),
      candidate_count: candidateCount,
      parent_chain_verified: parentChainVerified,
      ambiguity_count:
        status === PIP_360_GEOGRAPHY_MAPPING_STATUSES.AMBIGUOUS ? candidateCount : 0,
      reason,
    },
    validation_fixture: envelope.validation_fixture === true,
    production_signal: envelope.production_signal === true,
  });
}

export function mapPip360PublicSignalToGeography(index, input) {
  const hierarchy = isPlainObject(index) ? index : {};
  const envelope = extractHintEnvelope(input);
  const hint = sanitizePip360SignalGeographyHint(envelope.hint);
  const requestedLevel = resolveRequestedLevel(hint);

  if (contextMismatch(hierarchy, hint)) {
    return buildResult({
      envelope,
      hint,
      node: null,
      requestedLevel,
      status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.INVALID,
      method: PIP_360_GEOGRAPHY_MAPPING_METHODS.NO_MATCH,
      confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.NOT_APPLICABLE,
      candidateCount: 0,
      parentChainVerified: false,
      reason: "Mixed constituency mapping context is not allowed.",
    });
  }

  const codeResolution = resolveByCode(hierarchy, hint);
  if (codeResolution && codeResolution.level === requestedLevel) {
    if (codeResolution.candidates.length === 1) {
      const node = codeResolution.candidates[0];
      const status =
        node.level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY
          ? PIP_360_GEOGRAPHY_MAPPING_STATUSES.MAPPED
          : PIP_360_GEOGRAPHY_MAPPING_STATUSES.PARTIALLY_MAPPED;
      return buildResult({
        envelope,
        hint,
        node,
        requestedLevel,
        status,
        method: codeResolution.completeChain
          ? PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_CODE_CHAIN
          : PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_PARENT_CODE,
        confidence: codeResolution.completeChain
          ? PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.VERIFIED
          : PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.HIGH,
        candidateCount: 1,
        parentChainVerified: true,
        reason: "Exact code-based hierarchy match.",
      });
    }

    if (codeResolution.candidates.length > 1) {
      return buildResult({
        envelope,
        hint,
        node: null,
        requestedLevel,
        status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.AMBIGUOUS,
        method: codeResolution.completeChain
          ? PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_CODE_CHAIN
          : PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_PARENT_CODE,
        confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.LOW,
        candidateCount: codeResolution.candidates.length,
        parentChainVerified: false,
        reason: "Multiple code candidates remain after parent-chain filtering.",
      });
    }

    if (codeResolution.initialCandidates.length > 0) {
      return buildResult({
        envelope,
        hint,
        node: null,
        requestedLevel,
        status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.INVALID,
        method: PIP_360_GEOGRAPHY_MAPPING_METHODS.NO_MATCH,
        confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.NOT_APPLICABLE,
        candidateCount: 0,
        parentChainVerified: false,
        reason: "Provided code chain contradicts the authoritative parent hierarchy.",
      });
    }
  }

  const nameResolution = resolveByName(hierarchy, hint);
  if (nameResolution) {
    if (nameResolution.candidates.length === 1) {
      const node = nameResolution.candidates[0];
      const status =
        node.level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY
          ? PIP_360_GEOGRAPHY_MAPPING_STATUSES.MAPPED
          : PIP_360_GEOGRAPHY_MAPPING_STATUSES.PARTIALLY_MAPPED;
      return buildResult({
        envelope,
        hint,
        node,
        requestedLevel,
        status,
        method: nameResolution.completeChain
          ? PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_NORMALIZED_NAME_CHAIN
          : PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_PARENT_NAME,
        confidence: nameResolution.completeChain
          ? PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.HIGH
          : PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.MEDIUM,
        candidateCount: 1,
        parentChainVerified: true,
        reason: "Exact normalized-name hierarchy match.",
      });
    }

    if (nameResolution.candidates.length > 1) {
      return buildResult({
        envelope,
        hint,
        node: null,
        requestedLevel,
        status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.AMBIGUOUS,
        method: PIP_360_GEOGRAPHY_MAPPING_METHODS.EXACT_NORMALIZED_NAME_CHAIN,
        confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.LOW,
        candidateCount: nameResolution.candidates.length,
        parentChainVerified: false,
        reason: "Duplicate normalized names exist under different parents.",
      });
    }

    if (nameResolution.initialCandidates.length > 0) {
      return buildResult({
        envelope,
        hint,
        node: null,
        requestedLevel,
        status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.INVALID,
        method: PIP_360_GEOGRAPHY_MAPPING_METHODS.NO_MATCH,
        confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.NOT_APPLICABLE,
        candidateCount: 0,
        parentChainVerified: false,
        reason: "Provided name chain contradicts the authoritative parent hierarchy.",
      });
    }
  }

  if (
    codeResolution &&
    levelRank(codeResolution.level) >= 0 &&
    levelRank(requestedLevel) >= 0 &&
    levelRank(codeResolution.level) < levelRank(requestedLevel)
  ) {
    return buildResult({
      envelope,
      hint,
      node: null,
      requestedLevel,
      status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.UNMAPPED,
      method: PIP_360_GEOGRAPHY_MAPPING_METHODS.NO_MATCH,
      confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.LOW,
      candidateCount: 0,
      parentChainVerified: false,
      reason: "Deeper geography hint did not resolve within the authoritative hierarchy.",
    });
  }

  return buildResult({
    envelope,
    hint,
    node: null,
    requestedLevel,
    status: PIP_360_GEOGRAPHY_MAPPING_STATUSES.UNMAPPED,
    method: PIP_360_GEOGRAPHY_MAPPING_METHODS.NO_MATCH,
    confidence: PIP_360_GEOGRAPHY_CONFIDENCE_CLASSES.LOW,
    candidateCount: 0,
    parentChainVerified: false,
    reason: "No deterministic geography match exists for the supplied hint.",
  });
}

export function mapPip360PublicSignalsToGeography(index, inputs = []) {
  const safeInputs = Array.isArray(inputs) ? inputs : [];
  return safeInputs.map((input) => mapPip360PublicSignalToGeography(index, input));
}

export function buildPip360GeographyMappingSummary({
  index,
  mappedSignals,
} = {}) {
  const safeIndex = isPlainObject(index) ? index : {};
  const safeSignals = Array.isArray(mappedSignals) ? mappedSignals : [];
  const counts = {
    mapped_count: 0,
    partially_mapped_count: 0,
    ambiguous_count: 0,
    unmapped_count: 0,
    invalid_count: 0,
  };

  safeSignals.forEach((entry) => {
    const status = sanitizeText(entry?.mapping_status, 40).toUpperCase();
    if (status === PIP_360_GEOGRAPHY_MAPPING_STATUSES.MAPPED) {
      counts.mapped_count += 1;
    } else if (status === PIP_360_GEOGRAPHY_MAPPING_STATUSES.PARTIALLY_MAPPED) {
      counts.partially_mapped_count += 1;
    } else if (status === PIP_360_GEOGRAPHY_MAPPING_STATUSES.AMBIGUOUS) {
      counts.ambiguous_count += 1;
    } else if (status === PIP_360_GEOGRAPHY_MAPPING_STATUSES.INVALID) {
      counts.invalid_count += 1;
    } else {
      counts.unmapped_count += 1;
    }
  });

  const successful = counts.mapped_count + counts.partially_mapped_count;
  const coverageRatio = safeSignals.length > 0 ? successful / safeSignals.length : 0;
  const deepestVerifiedLevel = deepestOf(
    safeSignals
      .map((entry) => sanitizeText(entry?.deepest_verified_level, 24).toUpperCase())
      .filter(Boolean)
  );

  return {
    schema: PIP_360_GEOGRAPHY_MAPPING_SUMMARY_SCHEMA,
    generated_at: new Date().toISOString(),
    constituency_identity: safeIndex.constituency_identity ?? {},
    hierarchy_summary: safeIndex.summary ?? {},
    test_signal_count: safeSignals.length,
    ...counts,
    mapping_coverage_ratio: Number(coverageRatio.toFixed(6)),
    mapping_coverage_percent: Number((coverageRatio * 100).toFixed(2)),
    deepest_verified_level: deepestVerifiedLevel || PIP_360_GEOGRAPHY_LEVELS.STATE,
    validation_fixture_status:
      safeIndex.validation_fixture === true ? "VALIDATION_FIXTURE" : "PRODUCTION_CONTEXT",
    safety_flags: {
      descriptive_geography_mapping_only: true,
      population_records_modified: false,
      public_signal_content_persisted: false,
      demographic_inference_enabled: false,
      voter_preference_inference_enabled: false,
      election_prediction_enabled: false,
      browser_storage_modified: false,
      source_records_modified: false,
      external_network_geocoding_enabled: false,
    },
  };
}

export function buildPip360GeographyMappingValidationFixture(index) {
  const safeIndex = isPlainObject(index) ? index : {};
  const parliament = safeIndex.nodes?.parliament ?? {};
  const firstDun = safeIndex.nodes?.duns?.[0] ?? {};
  const firstDm = safeIndex.nodes?.dms?.[0] ?? {};
  const firstLocality = safeIndex.nodes?.localities?.[0] ?? {};
  const alternativeDm =
    (safeIndex.nodes?.dms ?? []).find(
      (entry) => entry.dm_code !== firstLocality.dm_code && entry.dun_code === firstLocality.dun_code
    ) ??
    (safeIndex.nodes?.dms ?? []).find((entry) => entry.dm_code !== firstLocality.dm_code) ??
    firstDm;
  const ambiguousCollision = (safeIndex.lookups?.crossParentCollisions ?? []).find(
    (entry) => entry.level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY
  );
  const ambiguousNameSet = new Set(
    (safeIndex.lookups?.crossParentCollisions ?? [])
      .filter((entry) => entry.level === PIP_360_GEOGRAPHY_LEVELS.LOCALITY)
      .map((entry) => entry.normalized_name)
  );
  const uniqueLocalityForInvalid =
    (safeIndex.nodes?.localities ?? []).find(
      (entry) =>
        !ambiguousNameSet.has(normalizePip360GeographyToken(entry.locality_name))
    ) ?? firstLocality;
  const ambiguousCandidate = ambiguousCollision
    ? (safeIndex.nodes?.localities ?? []).find(
        (entry) =>
          normalizePip360GeographyToken(entry.locality_name) ===
          ambiguousCollision.normalized_name
      )
    : null;

  const createFixtureItem = (label, expectedStatus, hint) => ({
    label,
    expected_status: expectedStatus,
    validation_fixture: true,
    production_signal: false,
    hint: {
      schema: "pip.360-geography-hint.v1",
      ...hint,
      observed_at: normalizeIso(hint.observed_at) ?? new Date().toISOString(),
    },
  });

  return {
    validation_fixture: true,
    production_signal: false,
    items: [
      createFixtureItem("exact locality code chain", PIP_360_GEOGRAPHY_MAPPING_STATUSES.MAPPED, {
        signal_id: "FIXTURE-LOCALITY-CODE",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0001",
        state_code: firstLocality.state_code,
        parliament_code: firstLocality.parliament_code,
        dun_code: firstLocality.dun_code,
        dm_code: firstLocality.dm_code,
        locality_code: firstLocality.locality_code,
      }),
      createFixtureItem("exact locality name chain", PIP_360_GEOGRAPHY_MAPPING_STATUSES.MAPPED, {
        signal_id: "FIXTURE-LOCALITY-NAME",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0002",
        state_name: firstLocality.state_name,
        parliament_name: firstLocality.parliament_name,
        dun_name: firstLocality.dun_name,
        dm_name: firstLocality.dm_name,
        locality_name: firstLocality.locality_name,
      }),
      createFixtureItem("exact DM-level mapping", PIP_360_GEOGRAPHY_MAPPING_STATUSES.PARTIALLY_MAPPED, {
        signal_id: "FIXTURE-DM-CODE",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0003",
        state_code: firstDm.state_code,
        parliament_code: firstDm.parliament_code,
        dun_code: firstDm.dun_code,
        dm_code: firstDm.dm_code,
      }),
      createFixtureItem("exact DUN-level mapping", PIP_360_GEOGRAPHY_MAPPING_STATUSES.PARTIALLY_MAPPED, {
        signal_id: "FIXTURE-DUN-CODE",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0004",
        parliament_code: firstDun.parliament_code,
        dun_code: firstDun.dun_code,
      }),
      createFixtureItem("Parliament-level mapping", PIP_360_GEOGRAPHY_MAPPING_STATUSES.PARTIALLY_MAPPED, {
        signal_id: "FIXTURE-PARLIAMENT-CODE",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0005",
        parliament_code: parliament.parliament_code,
      }),
      createFixtureItem("unknown locality", PIP_360_GEOGRAPHY_MAPPING_STATUSES.UNMAPPED, {
        signal_id: "FIXTURE-UNKNOWN-LOCALITY",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0006",
        parliament_code: firstLocality.parliament_code,
        dun_code: firstLocality.dun_code,
        dm_code: firstLocality.dm_code,
        locality_name: "UNKNOWN LOCALITY",
      }),
      createFixtureItem("invalid hierarchy", PIP_360_GEOGRAPHY_MAPPING_STATUSES.INVALID, {
        signal_id: "FIXTURE-INVALID-HIERARCHY",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0007",
        parliament_name: uniqueLocalityForInvalid.parliament_name,
        dun_name: uniqueLocalityForInvalid.dun_name,
        dm_name: alternativeDm.dm_name,
        locality_name: uniqueLocalityForInvalid.locality_name,
      }),
      createFixtureItem("ambiguous normalized name", PIP_360_GEOGRAPHY_MAPPING_STATUSES.AMBIGUOUS, {
        signal_id: "FIXTURE-AMBIGUOUS-NAME",
        source_system: "PIP_360_VALIDATION",
        source_record_id: "FIXTURE-0008",
        parliament_code: ambiguousCandidate?.parliament_code ?? firstLocality.parliament_code,
        locality_name: ambiguousCandidate?.locality_name ?? firstLocality.locality_name,
      }),
    ],
  };
}