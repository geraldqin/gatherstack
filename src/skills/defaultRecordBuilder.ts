import type { ChatMessage } from "../shared/chatMessages"
import { t } from "~shared/i18n"
import type { CollectedRecord } from "../db/records/types"

import type { RecordBuilder } from "./types"
import { tryParseJsonPayload } from "./tryParseJsonPayload"

export const DEFAULT_RECORD_BUILDER_ID = "default"

const TITLE_MAX = 80

function isUnusableTitleLine(line: string): boolean {
  if (!line) return true
  if (/^```/.test(line)) return true
  if (line.startsWith("{") || line.startsWith("[")) return true
  return false
}

export function titleFromMessage(message: ChatMessage): string {
  const lines = message.content.trim().split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (isUnusableTitleLine(trimmed)) {
      continue
    }
    return trimmed.length > TITLE_MAX
      ? `${trimmed.slice(0, TITLE_MAX)}…`
      : trimmed
  }
  return message.role === "user"
    ? t("recordTitleUserMessage")
    : t("recordTitleAssistantMessage")
}

export function buildDefaultPayload(message: ChatMessage): string {
  return JSON.stringify({
    role: message.role,
    content: message.content,
    ...(message.attachment ? { attachment: message.attachment } : {})
  })
}

function clipTitle(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= TITLE_MAX) {
    return trimmed
  }
  return `${trimmed.slice(0, TITLE_MAX)}…`
}

/** Shared with direct-store: avoid title "{" for pretty-printed JSON. */
export function titleFromJsonValue(
  parsed: unknown,
  message: ChatMessage
): string {
  if (Array.isArray(parsed)) {
    return clipTitle(t("recordTitleArrayItems", [String(parsed.length)]))
  }
  if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>
    for (const key of ["title", "display_name", "name", "id"] as const) {
      const value = obj[key]
      if (typeof value === "string" && value.trim()) {
        return clipTitle(value)
      }
    }
    if (typeof obj.object === "string" && Array.isArray(obj.data)) {
      return clipTitle(
        t("recordTitleObjectItems", [obj.object, String(obj.data.length)])
      )
    }
    if (typeof obj.object === "string" && obj.object.trim()) {
      return clipTitle(obj.object)
    }
  }
  return titleFromMessage(message)
}

export const defaultRecordBuilder: RecordBuilder = {
  id: DEFAULT_RECORD_BUILDER_ID,
  name: "默认（整条消息）",
  buildRecord({ message }): CollectedRecord {
    const parsed = tryParseJsonPayload(message.content)
    if (parsed !== null && typeof parsed === "object") {
      return {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        skillId: "",
        sourceUrl: message.attachment?.url ?? "",
        title: titleFromJsonValue(parsed, message),
        payload: JSON.stringify(parsed)
      }
    }
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      skillId: "",
      sourceUrl: message.attachment?.url ?? "",
      title: titleFromMessage(message),
      payload: buildDefaultPayload(message)
    }
  }
}
