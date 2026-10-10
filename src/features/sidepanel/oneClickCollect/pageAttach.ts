import type { PageAttachment } from "~shared/chatMessages"
import {
  isInjectableUrl,
  type ReadActiveTabDomResult
} from "~shared/readActiveTabDom"

import { pageUrlsEqual } from "./pageUrl"

export function emptyPageAttachment(url: string): PageAttachment {
  return { url, markdown: "" }
}

export function attachmentFromReadResult(
  result: ReadActiveTabDomResult,
  fallbackUrl: string
): PageAttachment {
  if (result.ok) {
    const attachment: PageAttachment = {
      url: result.url,
      markdown: result.markdown
    }
    if (result.title !== undefined) {
      attachment.title = result.title
    }
    return attachment
  }
  return emptyPageAttachment(fallbackUrl || "about:blank")
}

/**
 * After a send-time refresh read: keep the prior page on failure so we never
 * stamp chrome-extension:// (or other failed tabs) as sourceUrl.
 */
export function resolveRefreshAttachment(input: {
  previous: PageAttachment
  result: ReadActiveTabDomResult
  activeTabUrl: string | undefined
}): PageAttachment {
  if (!input.result.ok) {
    return input.previous
  }
  return attachmentFromReadResult(input.result, input.result.url)
}

export type SelectAttachDecision =
  | { action: "noop" }
  | { action: "read" }

export function decideAttachOnSelect(input: {
  hasAttachment: boolean
  suppressAutoPageAttach: boolean
}): SelectAttachDecision {
  if (input.hasAttachment || input.suppressAutoPageAttach) {
    return { action: "noop" }
  }
  return { action: "read" }
}

export type SendAttachDecision =
  | { action: "keep" }
  | { action: "refresh" }
  | { action: "none" }

export function decideAttachOnSend(input: {
  attachment: PageAttachment | null
  activeTabUrl: string | undefined
}): SendAttachDecision {
  if (!input.attachment) {
    return { action: "none" }
  }
  if (input.activeTabUrl === undefined) {
    return { action: "keep" }
  }
  if (!isInjectableUrl(input.activeTabUrl)) {
    return { action: "keep" }
  }
  if (pageUrlsEqual(input.attachment.url, input.activeTabUrl)) {
    return { action: "keep" }
  }
  return { action: "refresh" }
}
