import {
  MAX_SESSION_BYTES,
  MAX_SESSION_MESSAGES,
  TITLE_MAX
} from "../schema"
import { t } from "~shared/i18n"
import type {
  ChatMessageInput,
  ChatSession,
  ChatSessionInput,
  PageRefInput,
  PersistedChatMessage,
  PersistedPageRef
} from "./types"

export type TrimLimits = {
  maxMessages: number
  maxBytes: number
  titleMax: number
}

const DEFAULT_LIMITS: TrimLimits = {
  maxMessages: MAX_SESSION_MESSAGES,
  maxBytes: MAX_SESSION_BYTES,
  titleMax: TITLE_MAX
}

function toPersistedPageRef(ref: PageRefInput): PersistedPageRef {
  return { url: ref.url }
}

function stripAttachment(
  attachment: PageRefInput | undefined
): PersistedPageRef | undefined {
  if (!attachment) {
    return undefined
  }
  return toPersistedPageRef(attachment)
}

function normalizeMessage(message: ChatMessageInput): PersistedChatMessage {
  const { attachment, status, ...rest } = message
  return {
    ...rest,
    attachment: stripAttachment(attachment),
    status: status === "streaming" ? "complete" : status
  }
}

function sessionByteSize(session: ChatSession): number {
  return new TextEncoder().encode(JSON.stringify(session)).length
}

function truncateContentToFit(
  session: ChatSession,
  maxBytes: number
): ChatSession {
  const messages = [...session.messages]
  if (messages.length === 0) {
    return session
  }

  let base = messages[0]!.content.replace(/…$/, "")

  while (true) {
    const content = base.length === 0 ? "…" : `${base}…`
    messages[0] = { ...messages[0]!, content }
    const candidate = { ...session, messages }

    if (sessionByteSize(candidate) <= maxBytes || base.length === 0) {
      return candidate
    }

    base = base.slice(
      0,
      Math.max(0, base.length - Math.max(1, Math.ceil(base.length / 4)))
    )
  }
}

function trimMessagesByBytes(
  session: ChatSession,
  maxBytes: number
): ChatSession {
  let messages = [...session.messages]

  while (messages.length > 1 && sessionByteSize({ ...session, messages }) > maxBytes) {
    messages = messages.slice(1)
  }

  let candidate = { ...session, messages }
  if (candidate.messages.length === 1 && sessionByteSize(candidate) > maxBytes) {
    candidate = truncateContentToFit(candidate, maxBytes)
  }

  return candidate
}

export function titleFromMessages(
  messages: PersistedChatMessage[],
  titleMax: number = TITLE_MAX
): string {
  const firstUser = messages.find((message) => message.role === "user")
  const firstLine = firstUser?.content.trim().split("\n")[0]?.trim() ?? ""

  if (!firstLine) {
    return t("sessionDefaultTitle")
  }

  if (firstLine.length > titleMax) {
    return `${firstLine.slice(0, titleMax)}…`
  }

  return firstLine
}

export function trimSession(
  session: ChatSessionInput,
  limits: TrimLimits = DEFAULT_LIMITS
): ChatSession {
  const normalizedMessages = session.messages.map(normalizeMessage)
  const recentMessages = normalizedMessages.slice(-limits.maxMessages)

  let trimmed: ChatSession = {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    sessionModel: session.sessionModel,
    draftAttachment: session.draftAttachment
      ? toPersistedPageRef(session.draftAttachment)
      : null,
    draftSkill: session.draftSkill
      ? {
          id: session.draftSkill.id,
          name: session.draftSkill.name,
          markdown: session.draftSkill.markdown
        }
      : null,
    ...(session.sendMode !== undefined ? { sendMode: session.sendMode } : {}),
    ...(session.suppressAutoPageAttach !== undefined
      ? { suppressAutoPageAttach: session.suppressAutoPageAttach }
      : {}),
    messages: recentMessages
  }

  trimmed = trimMessagesByBytes(trimmed, limits.maxBytes)
  trimmed = {
    ...trimmed,
    title: titleFromMessages(trimmed.messages, limits.titleMax)
  }

  return trimmed
}
