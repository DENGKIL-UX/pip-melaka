/**
 * Privacy & threshold suppression helpers for ethnic analytics (Phase 0)
 *
 * All ethnic / demographic counts must respect MIN_CELL_N.
 * Cells below threshold are suppressed (return null) and marked.
 */

export const MIN_CELL_N = 50;

/**
 * Returns the value if >= MIN_CELL_N, otherwise null.
 * Used for any count or share that must be suppressed.
 */
export function suppressIfBelow<T extends number>(value: T): T | null {
  if (value == null || value < MIN_CELL_N) {
    return null;
  }
  return value;
}

/**
 * Applies suppression to an array of segment counts.
 * Returns a new array with suppressed values set to null.
 */
export function suppressDemographicArray(
  counts: Array<{ segment: string; count: number; share: number }>,
): Array<{ segment: string; count: number | null; share: number | null }> {
  return counts.map((item) => ({
    segment: item.segment,
    count: suppressIfBelow(item.count),
    share: suppressIfBelow(item.share * 100) != null ? item.share : null,
  }));
}

/**
 * Helper for API responses: attach suppression metadata.
 */
export interface SuppressedMeta {
  suppressed: boolean;
  reason?: string;
  minCellN: number;
}

export function createSuppressionMeta(suppressed: boolean): SuppressedMeta {
  return {
    suppressed,
    reason: suppressed ? "Below minimum cell threshold" : undefined,
    minCellN: MIN_CELL_N,
  };
}
