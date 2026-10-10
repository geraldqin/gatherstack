import { t } from "~shared/i18n"
import {
  captureCleanedPageHtml,
  htmlToMarkdown
} from "~shared/pageDomToMarkdown"
import { truncateForLlm } from "~shared/truncateForLlm"

export function getReadDomNoTab(): string {
  return t("errorReadDomNoTab")
}

export function getReadDomRestricted(): string {
  return t("errorReadDomRestricted")
}

export function getReadDomFail(): string {
  return t("errorReadDomFail")
}

export type ReadDomOk = {
  ok: true
  url: string
  markdown: string
  title?: string
}

export type ReadDomErr = {
  ok: false
  errorMessage: string
}

export type ReadActiveTabDomResult = ReadDomOk | ReadDomErr

export type QueryActiveTab = () => Promise<
  { id?: number; url?: string } | undefined
>

export type ExecuteCleanedPage = (
  tabId: number
) => Promise<{ title: string; html: string } | undefined>

export type ReadActiveTabDomDeps = {
  queryActiveTab?: QueryActiveTab
  executeCleanedPage?: ExecuteCleanedPage
}

export function isInjectableUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }
    if (parsed.hostname === "chromewebstore.google.com") {
      return false
    }
    if (
      parsed.hostname === "chrome.google.com" &&
      parsed.pathname.startsWith("/webstore")
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

async function defaultQueryActiveTab(): Promise<
  { id?: number; url?: string } | undefined
> {
  const [current] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })
  if (current?.id != null) {
    return current
  }
  const [last] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })
  return last
}

async function defaultExecuteCleanedPage(
  tabId: number
): Promise<{ title: string; html: string } | undefined> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: captureCleanedPageHtml
  })
  return results[0]?.result
}

function failReadDom(): ReadDomErr {
  return { ok: false, errorMessage: getReadDomFail() }
}

export async function readActiveTabDom(
  deps: ReadActiveTabDomDeps = {}
): Promise<ReadActiveTabDomResult> {
  const queryActiveTab = deps.queryActiveTab ?? defaultQueryActiveTab
  const executeCleanedPage =
    deps.executeCleanedPage ?? defaultExecuteCleanedPage

  try {
    const tab = await queryActiveTab()
    if (tab?.id == null) {
      return { ok: false, errorMessage: getReadDomNoTab() }
    }
    if (!isInjectableUrl(tab.url)) {
      return { ok: false, errorMessage: getReadDomRestricted() }
    }

    const cleaned = await executeCleanedPage(tab.id)
    if (!cleaned?.html?.trim()) {
      return failReadDom()
    }
    let markdown = htmlToMarkdown(cleaned.html).trim()
    const title = cleaned.title.trim()
    if (title) {
      markdown = `标题：${title}\n\n${markdown}`
    }
    markdown = truncateForLlm(markdown)
    if (!markdown.trim()) {
      return failReadDom()
    }
    return {
      ok: true,
      url: tab.url ?? "",
      markdown,
      title: cleaned.title || undefined
    }
  } catch {
    return failReadDom()
  }
}
