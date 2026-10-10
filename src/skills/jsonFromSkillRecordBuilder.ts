import type { ChatMessage } from "../shared/chatMessages"
import type { CollectedRecord } from "../db/records/types"

import { extractJsonFromAssistant } from "./extractJsonFromAssistant"
import { titleFromMessage } from "./defaultRecordBuilder"
import type { RecordBuilder } from "./types"

export const JSON_FROM_SKILL_BUILDER_ID = "json-from-skill"

function sourceUrlBeforeMessage(
  message: ChatMessage,
  messages: ChatMessage[] | undefined
): string {
  if (!messages?.length) {
    return message.attachment?.url ?? ""
  }
  const index = messages.findIndex((item) => item.id === message.id)
  const before = index >= 0 ? messages.slice(0, index) : messages
  for (let i = before.length - 1; i >= 0; i--) {
    const url = before[i]?.attachment?.url
    if (url) {
      return url
    }
  }
  return ""
}

function titleFromParsed(parsed: unknown, message: ChatMessage): string {
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>
    if (typeof record.title === "string" && record.title.trim()) {
      return record.title.trim().slice(0, 80)
    }
    if (typeof record.id === "string" && record.id.trim()) {
      return record.id.trim().slice(0, 80)
    }
  }
  // Avoid ```json / raw JSON first lines when structured fields are null.
  return titleFromMessage(message)
}

export const jsonFromSkillRecordBuilder: RecordBuilder = {
  id: JSON_FROM_SKILL_BUILDER_ID,
  name: "Skill JSON",
  buildRecord({ message, messages }): CollectedRecord {
    if (!message.skillId) {
      throw new Error("缺少 skillId")
    }
    const parsed = extractJsonFromAssistant(message.content)
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      skillId: message.skillId,
      sourceUrl: sourceUrlBeforeMessage(message, messages),
      title: titleFromParsed(parsed, message),
      payload: JSON.stringify(parsed)
    }
  }
}
