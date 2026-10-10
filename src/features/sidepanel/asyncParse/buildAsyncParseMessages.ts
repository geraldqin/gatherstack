import {
  buildSendMessages,
  type ApiChatMessage,
  type DraftSkill,
  type PageAttachment
} from "~shared/chatMessages"

export function buildAsyncParseMessages(input: {
  text: string
  attachment: PageAttachment | null
  skillMarkdown?: string
}): ApiChatMessage[] {
  const userMessage = {
    id: "async-parse-user",
    role: "user" as const,
    content: input.text,
    ...(input.attachment ? { attachment: input.attachment } : {})
  }
  return buildSendMessages([userMessage], {
    ...(input.skillMarkdown ? { skillMarkdown: input.skillMarkdown } : {})
  })
}

export function buildAsyncParseMessagesFromSkill(input: {
  text: string
  attachment: PageAttachment | null
  skill: DraftSkill | null
}): ApiChatMessage[] {
  return buildAsyncParseMessages({
    text: input.text,
    attachment: input.attachment,
    ...(input.skill ? { skillMarkdown: input.skill.markdown } : {})
  })
}
