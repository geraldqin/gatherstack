import {
  pageContentFormat,
  withPageHtml,
  withPageMarkdown,
  type PageAttachment
} from "~shared/chatMessages"
import { htmlStringToPageMarkdown } from "~shared/htmlStringToPageMarkdown"
import type { ReadActiveTabOuterHtmlResult } from "~shared/readActiveTabOuterHtml"
import { stripHtmlNoise } from "~shared/stripHtmlNoise"

export type PageAttachmentToolbarAction =
  | "loadOriginal"
  | "simplifyMarkdown"
  | "stripNoise"

export function isPageAttachmentEditable(
  attachment: PageAttachment,
  onAttachmentChange?: (next: PageAttachment) => void
): boolean {
  return Boolean(onAttachmentChange) && attachment.kind !== "record"
}

export function pageAttachmentToolbar(
  attachment: PageAttachment,
  editable: boolean
): PageAttachmentToolbarAction[] {
  if (!editable || attachment.kind === "record") {
    return []
  }
  if (pageContentFormat(attachment) === "html") {
    return ["simplifyMarkdown", "stripNoise"]
  }
  return ["loadOriginal"]
}

export function applyEditedBody(
  attachment: PageAttachment,
  body: string
): PageAttachment {
  if (pageContentFormat(attachment) === "html") {
    return withPageHtml(attachment, body)
  }
  return withPageMarkdown(attachment, body)
}

export function applyLoadOriginal(
  current: PageAttachment,
  result: ReadActiveTabOuterHtmlResult
): { next?: PageAttachment; errorMessage: string | null } {
  if (current.kind === "record") {
    return { errorMessage: null }
  }
  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }
  return {
    // Do not truncate outerHTML here: a 32k string slice often cuts off
    // <body> after a large <head>, so "简化为 markdown" would convert garbage.
    // Send path still truncateForLlm; simplify truncates the resulting MD.
    next: withPageHtml(
      { ...current, url: result.url || current.url },
      result.html
    ),
    errorMessage: null
  }
}

export function resolveLoadOriginalAfterAwait(args: {
  startedGen: number
  currentGen: number
  draft: PageAttachment | null
}): { apply: boolean; clearPending: boolean } {
  if (args.startedGen !== args.currentGen) {
    return { apply: false, clearPending: false }
  }
  if (!args.draft || args.draft.kind === "record") {
    return { apply: false, clearPending: true }
  }
  return { apply: true, clearPending: true }
}

export function applySimplify(
  current: PageAttachment,
  html: string
): PageAttachment {
  return withPageMarkdown(current, htmlStringToPageMarkdown(html))
}

export function applyStrip(
  current: PageAttachment,
  html: string
): PageAttachment {
  return withPageHtml(current, stripHtmlNoise(html))
}
