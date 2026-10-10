import {
  getReadDomFail,
  getReadDomNoTab,
  getReadDomRestricted,
  isInjectableUrl
} from "./readActiveTabDom"

export type ReadOuterHtmlOk = {
  ok: true
  url: string
  html: string
}

export type ReadOuterHtmlErr = {
  ok: false
  errorMessage: string
}

export type ReadActiveTabOuterHtmlResult = ReadOuterHtmlOk | ReadOuterHtmlErr

export type QueryActiveTab = () => Promise<
  { id?: number; url?: string } | undefined
>

export type ExecuteOuterHtml = (tabId: number) => Promise<string | undefined>

export type ReadActiveTabOuterHtmlDeps = {
  queryActiveTab?: QueryActiveTab
  executeOuterHtml?: ExecuteOuterHtml
}

export function captureDocumentOuterHtml(): string {
  return document.documentElement.outerHTML
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

async function defaultExecuteOuterHtml(
  tabId: number
): Promise<string | undefined> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: captureDocumentOuterHtml
  })
  return results[0]?.result
}

function failReadOuterHtml(): ReadOuterHtmlErr {
  return { ok: false, errorMessage: getReadDomFail() }
}

export async function readActiveTabOuterHtml(
  deps: ReadActiveTabOuterHtmlDeps = {}
): Promise<ReadActiveTabOuterHtmlResult> {
  const queryActiveTab = deps.queryActiveTab ?? defaultQueryActiveTab
  const executeOuterHtml = deps.executeOuterHtml ?? defaultExecuteOuterHtml

  try {
    const tab = await queryActiveTab()
    if (tab?.id == null) {
      return { ok: false, errorMessage: getReadDomNoTab() }
    }
    if (!isInjectableUrl(tab.url)) {
      return { ok: false, errorMessage: getReadDomRestricted() }
    }

    const html = await executeOuterHtml(tab.id)
    if (!html?.trim()) {
      return failReadOuterHtml()
    }
    return {
      ok: true,
      url: tab.url ?? "",
      html
    }
  } catch {
    return failReadOuterHtml()
  }
}
