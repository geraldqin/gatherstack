import type { ChatMessage } from "~shared/chatMessages"

/** Visible bubble text for clipboard; falls back to attachment URL. */
export function copyableMessageText(message: ChatMessage): string {
  if (message.content) {
    return message.content
  }
  return message.attachment?.url ?? ""
}

export function canCopyMessage(message: ChatMessage): boolean {
  return copyableMessageText(message).length > 0
}
