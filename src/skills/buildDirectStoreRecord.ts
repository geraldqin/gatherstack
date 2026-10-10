import type { ChatMessage } from "../shared/chatMessages"
import type { CollectedRecord } from "../db/records/types"
import {
  buildDefaultPayload,
  titleFromJsonValue,
  titleFromMessage
} from "./defaultRecordBuilder"
import { tryParseJsonPayload } from "./tryParseJsonPayload"

function isJsonObjectOrArray(parsed: unknown): parsed is object {
  return parsed !== null && typeof parsed === "object"
}

export function buildDirectStoreRecord(message: ChatMessage): {
  record: CollectedRecord
  usedJsonPayload: boolean
} {
  const sourceUrl = message.attachment?.url ?? ""
  const skillId = message.skillId ?? ""
  const parsed = tryParseJsonPayload(message.content)

  // Object/array → store as JSON payload (with or without Skill). Primitives → whole pack.
  if (isJsonObjectOrArray(parsed)) {
    return {
      record: {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        skillId,
        sourceUrl,
        title: titleFromJsonValue(parsed, message),
        payload: JSON.stringify(parsed)
      },
      usedJsonPayload: true
    }
  }

  return {
    record: {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      skillId,
      sourceUrl,
      title: titleFromMessage(message),
      payload: buildDefaultPayload(message)
    },
    usedJsonPayload: false
  }
}
