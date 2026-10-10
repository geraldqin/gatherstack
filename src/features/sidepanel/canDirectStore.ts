import type { DraftSkill, PageAttachment } from "~shared/chatMessages"

export function canDirectStore(input: {
  text: string
  attachment: PageAttachment | null
  skill: DraftSkill | null
  isStreaming: boolean
}): boolean {
  if (input.isStreaming) {
    return false
  }
  if (input.text.trim().length > 0) {
    return true
  }
  return input.attachment != null && input.skill != null
}
