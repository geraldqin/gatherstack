import type { ChatMessage } from "~shared/chatMessages"

export function canSaveMessage(message: ChatMessage): boolean {
  if (message.savedRecordId) {
    return false
  }
  const hasBody = Boolean(message.content.trim()) || Boolean(message.attachment)
  if (!hasBody) {
    return false
  }
  if (message.role === "user") {
    return true
  }
  return message.status === "complete"
}
