/** Pretty-print object/array JSON; otherwise return raw (including JSON primitives). */
export function normalizeRecordPayload(raw: string): string {
  try {
    const parsed = JSON.parse(raw.trim())
    if (parsed !== null && typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2)
    }
  } catch {
    // fall through
  }
  return raw
}
