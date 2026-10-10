import {
  defaultRecordBuilder,
  DEFAULT_RECORD_BUILDER_ID
} from "./defaultRecordBuilder"
import {
  jsonFromSkillRecordBuilder,
  JSON_FROM_SKILL_BUILDER_ID
} from "./jsonFromSkillRecordBuilder"
import type { RecordBuilder } from "./types"
import type { ChatMessage } from "../shared/chatMessages"

const registry: Record<string, RecordBuilder> = {
  [DEFAULT_RECORD_BUILDER_ID]: defaultRecordBuilder,
  [JSON_FROM_SKILL_BUILDER_ID]: jsonFromSkillRecordBuilder
}

export function getRecordBuilder(
  id: string = DEFAULT_RECORD_BUILDER_ID
): RecordBuilder {
  return registry[id] ?? defaultRecordBuilder
}

export function getRecordBuilderForMessage(message: ChatMessage): RecordBuilder {
  if (message.role === "assistant" && message.skillId) {
    return jsonFromSkillRecordBuilder
  }
  return defaultRecordBuilder
}

export type { RecordBuilder } from "./types"
export {
  defaultRecordBuilder,
  DEFAULT_RECORD_BUILDER_ID,
  titleFromMessage,
  titleFromJsonValue,
  buildDefaultPayload
} from "./defaultRecordBuilder"
export {
  jsonFromSkillRecordBuilder,
  JSON_FROM_SKILL_BUILDER_ID
} from "./jsonFromSkillRecordBuilder"
export {
  extractJsonFromAssistant,
  getNoJsonToSaveMessage
} from "./extractJsonFromAssistant"
export { tryParseJsonPayload } from "./tryParseJsonPayload"
export { buildDirectStoreRecord } from "./buildDirectStoreRecord"
