// ponytail: MLK — DUN code normalization helper.
// Different modules use different formats for DUN codes:
//   - 2D map: "N15" (with N prefix)
//   - 3D map / Brain: "15" (no prefix)
//   - JSONL / GeoJSON / elections: "15" (2-digit string, no prefix)
// This helper normalizes any of these to the canonical "15" format for
// lookups, and to "N15" for display.

/** Strip any "N" prefix and pad to 2 digits. "N15" → "15", "5" → "05", "N5" → "05". */
export function normalizeDunCode(code: string): string {
  if (!code) return "";
  const stripped = String(code).replace(/^N/i, "").replace(/^0+/, "");
  return stripped.padStart(2, "0");
}

/** Add "N" prefix + pad to 2 digits. "15" → "N15", "5" → "N05", "N15" → "N15". */
export function displayDunCode(code: string): string {
  return `N${normalizeDunCode(code)}`;
}

/** Normalize parliament code: "P134" → "134", "134" → "134". */
export function normalizeParlCode(code: string): string {
  if (!code) return "";
  return String(code).replace(/^P/i, "");
}
