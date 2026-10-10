import { skillBodyFromMarkdown } from "../db/skills/markdown"
import { truncateForLlm } from "./truncateForLlm"

export type ChatRole = "user" | "assistant"

export type ApiChatRole = "system" | "user" | "assistant"

export type ChatStatus = "streaming" | "complete" | "stopped" | "error"

export type PageAttachmentKind = "page" | "record"

export type PageContentFormat = "markdown" | "html"

export type PageAttachment = {
  url: string
  markdown?: string
  html?: string
  /** Local collected-record export; omit slim/truncate and use JSON fence. */
  kind?: PageAttachmentKind
  title?: string
  contentFormat?: PageContentFormat
}

export type DraftSkill = {
  id: string
  name: string
  markdown: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  status?: ChatStatus
  errorMessage?: string
  attachment?: PageAttachment
  skillId?: string
  skillName?: string
  savedRecordId?: string
}

export type ApiChatMessage = {
  role: ApiChatRole
  content: string
}

export type FormatUserContentOptions = {
  /** When false, only keep URL stub — for prior turns to save context. Default true. */
  includeFullHtml?: boolean
}

export type BuildSendMessagesOptions = {
  /** Full skill markdown (frontmatter stripped when building system). */
  skillMarkdown?: string
  /** When false, only the latest user turn is sent (default true). */
  includeHistory?: boolean
}

export function pageContentFormat(attachment: PageAttachment): PageContentFormat {
  if (attachment.kind === "record") {
    return "markdown"
  }
  return attachment.contentFormat ?? "markdown"
}

export function pageAttachmentLabel(
  url: string,
  format: PageContentFormat = "markdown"
): string {
  const suffix = format === "html" ? ".html" : ".md"
  try {
    const host = new URL(url).hostname
    return host ? `${host}${suffix}` : `page${suffix}`
  } catch {
    return `page${suffix}`
  }
}

export function withPageMarkdown(
  base: PageAttachment,
  markdown: string,
  title?: string
): PageAttachment {
  return {
    url: base.url,
    kind: base.kind,
    title: title ?? base.title,
    contentFormat: "markdown",
    markdown,
    html: undefined
  }
}

export function withPageHtml(base: PageAttachment, html: string): PageAttachment {
  return {
    url: base.url,
    kind: base.kind,
    title: base.title,
    contentFormat: "html",
    html,
    markdown: undefined
  }
}

export function attachmentChipLabel(attachment: PageAttachment): string {
  if (attachment.kind === "record") {
    const name = attachment.title?.trim()
    if (name) {
      return name.endsWith(".json") ? name : `${name}.json`
    }
    return "record.json"
  }
  const format = pageContentFormat(attachment)
  const suffix = format === "html" ? ".html" : ".md"
  const name = attachment.title?.trim()
  if (name) {
    if (name.endsWith(".md") || name.endsWith(".html")) {
      return name
    }
    return `${name}${suffix}`
  }
  return pageAttachmentLabel(attachment.url, format)
}

export function formatPageAttachmentStub(attachment: PageAttachment): string {
  if (attachment.kind === "record") {
    const name = attachment.title?.trim() || attachment.url || "本地数据"
    return `本地数据：${name}\n（已附上数据，正文未再次附上）`
  }
  return `当前网页：${attachment.url}\n（已读取网页，正文未再次附上）`
}

export function formatPageAttachmentFull(attachment: PageAttachment): string {
  if (attachment.kind === "record") {
    const heading = attachment.title?.trim()
      ? `本地数据：${attachment.title.trim()}`
      : "本地数据"
    const urlLine = attachment.url ? `来源：${attachment.url}` : ""
    const header = urlLine ? `${heading}\n${urlLine}` : heading
    return `${header}\n\n\`\`\`json\n${attachment.html}\n\`\`\``
  }
  const format = pageContentFormat(attachment)
  if (format === "html") {
    const html = truncateForLlm(attachment.html ?? "")
    return `当前网页：${attachment.url}\n\n\`\`\`html\n${html}\n\`\`\``
  }
  const markdown = truncateForLlm(attachment.markdown ?? "")
  return `当前网页：${attachment.url}\n\n\`\`\`markdown\n${markdown}\n\`\`\``
}

export function formatUserContent(
  text: string,
  attachment?: PageAttachment,
  options: FormatUserContentOptions = {}
): string {
  const includeFullHtml = options.includeFullHtml !== false
  const trimmed = text.trim()
  const page = attachment
    ? includeFullHtml
      ? formatPageAttachmentFull(attachment)
      : formatPageAttachmentStub(attachment)
    : ""
  if (trimmed && page) {
    return `${trimmed}\n\n${page}`
  }
  return trimmed || page
}

function toHistoryApiMessages(messages: ChatMessage[]): ApiChatMessage[] {
  let lastUserIndex = -1
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i
    }
  }

  return messages
    .map((item, index) => ({
      role: item.role as ApiChatRole,
      content:
        item.role === "user"
          ? formatUserContent(item.content, item.attachment, {
              includeFullHtml: index === lastUserIndex
            })
          : item.content
    }))
    .filter((item) => item.content.length > 0)
}

/**
 * Build API messages for a send.
 * When the latest user turn has a page attachment, history is omitted.
 * When includeHistory is false, only the latest user turn (+ skill) is sent.
 * Optional skill markdown becomes a leading system message (body only).
 */
export function buildSendMessages(
  messages: ChatMessage[],
  options: BuildSendMessagesOptions = {}
): ApiChatMessage[] {
  const skillBody = options.skillMarkdown
    ? skillBodyFromMarkdown(options.skillMarkdown)
    : ""
  const systemMessages: ApiChatMessage[] =
    skillBody.length > 0 ? [{ role: "system", content: skillBody }] : []

  let lastUserIndex = -1
  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i
    }
  }
  const lastUser = lastUserIndex >= 0 ? messages[lastUserIndex] : undefined
  const omitHistory =
    options.includeHistory === false || Boolean(lastUser?.attachment)
  if (omitHistory) {
    const userContent = lastUser
      ? formatUserContent(lastUser.content, lastUser.attachment, {
          includeFullHtml: true
        })
      : ""
    const out: ApiChatMessage[] = [...systemMessages]
    if (userContent.length > 0) {
      out.push({ role: "user", content: userContent })
    }
    return out
  }

  return [...systemMessages, ...toHistoryApiMessages(messages)]
}

/**
 * Build API messages. Full page markdown is only inlined on the **latest** user
 * turn; earlier turns with attachments keep a short URL stub so small-context
 * models (e.g. Gemini Nano) are not flooded every round.
 */
export function toApiMessages(messages: ChatMessage[]): ApiChatMessage[] {
  return buildSendMessages(messages)
}
