import { t } from "~shared/i18n"

export function getNoJsonToSaveMessage(): string {
  return t("recordNoJsonFound")
}

function extractBalancedObject(text: string): string | null {
  const start = text.indexOf("{")
  if (start < 0) {
    return null
  }
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === "\\") {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === "{") {
      depth += 1
    } else if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

export function extractJsonFromAssistant(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || extractBalancedObject(content)
  if (!candidate) {
    throw new Error(getNoJsonToSaveMessage())
  }
  try {
    return JSON.parse(candidate) as unknown
  } catch {
    throw new Error(getNoJsonToSaveMessage())
  }
}
