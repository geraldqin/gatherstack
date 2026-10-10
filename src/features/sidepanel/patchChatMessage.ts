import type { ChatMessage } from "~shared/chatMessages"

export function patchChatMessageList(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage>
): ChatMessage[] {
  return messages.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  )
}
