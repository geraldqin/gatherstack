import { extractJsonFromAssistant } from "./extractJsonFromAssistant"

export function tryParseJsonPayload(content: string): unknown | null {
  const trimmed = content.trim()
  if (!trimmed) {
    return null
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    // fall through
  }
  try {
    return extractJsonFromAssistant(content)
  } catch {
    return null
  }
}
