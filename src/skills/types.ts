import type { ChatMessage } from "../shared/chatMessages"
import type { CollectedRecord } from "../db/records/types"

/** 将对话消息打包成 IndexedDB 落库记录的策略（非 Options 里的 Markdown Skill）。 */
export type RecordBuilder = {
  id: string
  name: string
  buildRecord(input: {
    message: ChatMessage
    messages?: ChatMessage[]
  }): CollectedRecord
}
