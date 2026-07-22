// ponytail: MLK — DUN redelineation bidirectional map.
// 2023 redelineation renamed N03/N04/N05 in P134 Masjid Tanah:
//   N03: Ayer Limau   ← Lubok China
//   N04: Lendu        ← Klebang
//   N05: Taboh Naning ← Gadek
// Engine uses 2026 names; ElectionData.my uses 2018/2021 names. This module
// provides the bidirectional map + tooltip helper. Resolves DG_DUN_REDELINEATION_MAPPING.
// See MELAKA-FACTS.md §4.1, DESIGN.md §5.7, AGENT.md §4.2 rule 10.

export interface DUNRedelineationEntry {
  code: string; // e.g. "N03"
  parliamentCode: string; // e.g. "P134"
  name2026: string; // engine name (post-2023)
  name2018: string; // ElectionData.my name (pre-2023)
  renamed: boolean;
}

const REDELINEATION_MAP: DUNRedelineationEntry[] = [
  { code: "N03", parliamentCode: "P134", name2026: "Ayer Limau", name2018: "Lubok China", renamed: true },
  { code: "N04", parliamentCode: "P134", name2026: "Lendu", name2018: "Klebang", renamed: true },
  { code: "N05", parliamentCode: "P134", name2026: "Taboh Naning", name2018: "Gadek", renamed: true },
];

const REDELINEATION_BY_2026 = new Map(REDELINEATION_MAP.map((r) => [r.name2026.toLowerCase(), r]));
const REDELINEATION_BY_2018 = new Map(REDELINEATION_MAP.map((r) => [r.name2018.toLowerCase(), r]));
const REDELINEATION_BY_CODE = new Map(REDELINEATION_MAP.map((r) => [r.code, r]));

/** Lookup by 2026 (engine) name. Returns the entry if this DUN was renamed. */
export function lookupBy2026Name(name: string): DUNRedelineationEntry | undefined {
  return REDELINEATION_BY_2026.get(name.toLowerCase());
}

/** Lookup by 2018/2021 (ElectionData.my) name. Returns the entry if this DUN was renamed. */
export function lookupBy2018Name(name: string): DUNRedelineationEntry | undefined {
  return REDELINEATION_BY_2018.get(name.toLowerCase());
}

/** Lookup by DUN code (e.g. "N03"). Returns the entry if this DUN was renamed. */
export function lookupByCode(code: string): DUNRedelineationEntry | undefined {
  const normalised = code.toUpperCase().startsWith("N") ? code.toUpperCase() : `N${code.padStart(2, "0")}`;
  return REDELINEATION_BY_CODE.get(normalised);
}

/** Returns the 2026 name for a 2018 name, or the input unchanged if no rename. */
export function to2026Name(name: string): string {
  return lookupBy2018Name(name)?.name2026 ?? name;
}

/** Returns the 2018 name for a 2026 name, or the input unchanged if no rename. */
export function to2018Name(name: string): string {
  return lookupBy2026Name(name)?.name2018 ?? name;
}

/** Returns true if a DUN name (either 2026 or 2018) was affected by the 2023 redelineation. */
export function wasRenamed(name: string): boolean {
  return lookupBy2026Name(name) !== undefined || lookupBy2018Name(name) !== undefined;
}

/**
 * Returns the tooltip text for a renamed DUN. Empty string if not renamed.
 * Format: "Ayer Limau (formerly Lubok China, pre-2023 redelineation)"
 * Used as `aria-label` on every renamed DUN's label (DESIGN.md §5.7).
 */
export function redelineationTooltip(name2026: string): string {
  const entry = lookupBy2026Name(name2026);
  if (!entry) return "";
  return `${entry.name2026} (formerly ${entry.name2018}, pre-2023 redelineation)`;
}

/**
 * Returns the short label "(formerly X)" for a renamed DUN. Empty string if not renamed.
 * Visible label paired with the full tooltip in `aria-label`.
 */
export function redelineationShortLabel(name2026: string): string {
  const entry = lookupBy2026Name(name2026);
  if (!entry) return "";
  return `(formerly ${entry.name2018})`;
}

/** Returns all renamed DUNs (3 entries for P134). */
export function allRenamedDUNs(): DUNRedelineationEntry[] {
  return [...REDELINEATION_MAP];
}
