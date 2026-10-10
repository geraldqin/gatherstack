import type { GeminiNanoAvailability } from "~shared/geminiNano"

export function isNanoReloadVisible(
  status: GeminiNanoAvailability
): boolean {
  return status === "downloading"
}
