/**
 * Mojibake repair — undo UTF-8 ↔ Latin-1 double-encoding.
 *
 * Mojibake happens when UTF-8 bytes are interpreted as Latin-1 (single byte per
 * char) and then re-encoded as UTF-8. Classic examples:
 *   - "Colón"  (correct)
 *   - "Colã³n" (mojibake)
 *   - "café"   (correct)
 *   - "cafÃ©"  (mojibake)
 *
 * Detection signal: the string contains `Ã` (capital A-tilde) or `â€` (a-circumflex
 * followed by Euro sign) — both byte patterns that would never appear in
 * properly-encoded UTF-8 unless the source was a mis-encoded round-trip.
 *
 * Repair: re-interpret the string as Latin-1 bytes, then decode as UTF-8.
 * The result is validated to ensure the decode actually produced valid characters
 * (Arabic, Latin accents). If validation fails, the original string is returned
 * unchanged — never make it worse.
 *
 * May 17 2026 re-audit caught "Willie Colã³N" on /events.
 */

/**
 * Detect if a string likely contains mojibake.
 * Cheap pre-filter to avoid Buffer allocation on every clean string.
 */
export function hasMojibake(s: string): boolean {
  if (!s) return false;
  return /Ã[-¿]/.test(s) || /â€/.test(s);
}

/**
 * Repair a mojibake-encoded string. Idempotent and safe:
 *   - Returns the original string if no mojibake detected.
 *   - Returns the original string if repair produces a worse result.
 *   - NFC-normalizes the decoded output for downstream consistency.
 *
 * Examples:
 *   repairMojibake("Willie Colã³n") === "Willie Colón"
 *   repairMojibake("Café Brûlé")     === "Café Brûlé"  (already clean → unchanged)
 *   repairMojibake("")               === ""
 */
export function repairMojibake(s: string): string {
  if (!s || !hasMojibake(s)) return s;
  try {
    const decoded = Buffer.from(s, "latin1").toString("utf8");
    // Validate: must contain accented Latin (À-ſ) or Arabic (؀-ۿ), AND must not
    // still contain the mojibake markers. Otherwise we made it worse.
    const hasValidChars = /[À-ſ؀-ۿ]/.test(decoded);
    const stillBroken = /Ã[-¿]/.test(decoded) || /â€/.test(decoded);
    if (hasValidChars && !stillBroken) {
      return decoded.normalize("NFC");
    }
  } catch {
    // Buffer.from / toString errors mean the input wasn't a valid Latin-1
    // re-interpretation — fall through and return original.
  }
  return s;
}

/**
 * Apply mojibake repair to a record object, returning the diff.
 * Useful when scanning DB rows where most fields are clean.
 *
 * Returns null if no field was changed (caller can skip the DB update).
 * Otherwise returns an object containing only the repaired fields.
 */
export function repairRecord<T extends Record<string, string | null | undefined>>(
  record: T,
  fields: Array<keyof T>,
): Partial<T> | null {
  const diff: Partial<T> = {};
  let changed = false;
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string" || !value) continue;
    const repaired = repairMojibake(value);
    if (repaired !== value) {
      (diff as Record<string, string>)[field as string] = repaired;
      changed = true;
    }
  }
  return changed ? diff : null;
}
