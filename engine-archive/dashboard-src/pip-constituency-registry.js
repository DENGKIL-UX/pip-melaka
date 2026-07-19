const REGISTRY_SCHEMA = "pip.constituency-registry.v1";
const DEFAULT_PRIMARY_CONSTITUENCY_KEY = "p134";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function normalizeConstituencyKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeConstituencyRegistry(value) {
  const source = isPlainObject(value) ? value : {};
  const constituencies = Array.isArray(source.constituencies)
    ? source.constituencies
    : [];

  const normalizedConstituencies = constituencies
    .filter((entry) => isPlainObject(entry))
    .map((entry) => {
      const key = normalizeConstituencyKey(entry.key);
      const metadataPath = String(entry.metadata_path ?? "").trim();

      return {
        key,
        label: String(entry.label ?? "").trim() || key.toUpperCase(),
        parliamentCode: String(entry.parliament_code ?? "").trim().toUpperCase(),
        parliamentName: String(entry.parliament_name ?? "").trim(),
        stateName: String(entry.state_name ?? "").trim().toUpperCase(),
        metadataPath,
        validationFixture: entry.validation_fixture === true,
      };
    })
    .filter(
      (entry) => entry.key.length > 0 && entry.metadataPath.startsWith("/data/")
    );

  const defaultPrimaryKey = normalizeConstituencyKey(
    source.default_primary_key ?? DEFAULT_PRIMARY_CONSTITUENCY_KEY
  );

  return {
    schema: String(source.schema ?? "").trim() || REGISTRY_SCHEMA,
    defaultPrimaryKey: defaultPrimaryKey || DEFAULT_PRIMARY_CONSTITUENCY_KEY,
    constituencies: normalizedConstituencies,
  };
}

export function validateConstituencyRegistry(value) {
  const registry = normalizeConstituencyRegistry(value);

  const keys = registry.constituencies.map((entry) => entry.key);
  const checks = {
    schema: registry.schema === REGISTRY_SCHEMA,
    hasConstituencies: registry.constituencies.length > 0,
    uniqueKeys: new Set(keys).size === keys.length,
    defaultPrimaryKeyKnown: keys.includes(registry.defaultPrimaryKey),
  };

  const errors = [];

  if (!checks.schema) {
    errors.push(`Registry schema must be ${REGISTRY_SCHEMA}.`);
  }

  if (!checks.hasConstituencies) {
    errors.push("Registry must define at least one constituency.");
  }

  if (!checks.uniqueKeys) {
    errors.push("Registry constituency keys must be unique.");
  }

  if (!checks.defaultPrimaryKeyKnown) {
    errors.push("Registry default primary key must exist in constituencies.");
  }

  return {
    valid: errors.length === 0,
    checks,
    registry,
    errors,
  };
}

export function findConstituencyRegistryEntry(registry, key) {
  const normalizedKey = normalizeConstituencyKey(key);

  return (
    registry?.constituencies?.find(
      (entry) => entry.key === normalizedKey
    ) ?? null
  );
}

export function resolveConstituencyRegistrySelection(searchValue, registry) {
  const params = new URLSearchParams(
    String(searchValue ?? "").startsWith("?")
      ? String(searchValue).slice(1)
      : String(searchValue ?? "")
  );

  const normalizedPrimary = normalizeConstituencyKey(
    params.get("constituency") ?? registry?.defaultPrimaryKey
  );

  const normalizedComparison = normalizeConstituencyKey(
    params.get("compare") ?? ""
  );

  const primaryConstituencyKey =
    normalizedPrimary || registry?.defaultPrimaryKey || DEFAULT_PRIMARY_CONSTITUENCY_KEY;

  const comparisonConstituencyKey = normalizedComparison || "";

  if (!findConstituencyRegistryEntry(registry, primaryConstituencyKey)) {
    throw new Error(
      `Unsupported constituency validation route: ${primaryConstituencyKey}`
    );
  }

  if (
    comparisonConstituencyKey &&
    !findConstituencyRegistryEntry(registry, comparisonConstituencyKey)
  ) {
    throw new Error(
      `Unsupported constituency validation route: ${comparisonConstituencyKey}`
    );
  }

  return {
    primaryConstituencyKey,
    comparisonConstituencyKey,
  };
}

export function createConstituencyComparisonUrl({
  primaryConstituencyKey,
  comparisonConstituencyKey,
  defaultPrimaryKey = DEFAULT_PRIMARY_CONSTITUENCY_KEY,
}) {
  const normalizedPrimary = normalizeConstituencyKey(primaryConstituencyKey);
  const normalizedComparison = normalizeConstituencyKey(comparisonConstituencyKey);

  const params = new URLSearchParams();

  if (normalizedPrimary && normalizedPrimary !== normalizeConstituencyKey(defaultPrimaryKey)) {
    params.set("constituency", normalizedPrimary);
  } else if (normalizedComparison) {
    params.set("constituency", normalizeConstituencyKey(defaultPrimaryKey));
  }

  if (normalizedComparison) {
    params.set("compare", normalizedComparison);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
