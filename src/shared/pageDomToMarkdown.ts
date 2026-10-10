import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"
import { polishPageMarkdown } from "./polishPageMarkdown"

export const SHORT_MARKDOWN_FALLBACK_CHARS = 80

/** Hard noise: never useful for LLM / preview. Keep in sync with captureCleanedPageHtml. */
const HARD_NOISE_SELECTOR =
  "script,noscript,style,template,svg,iframe,canvas,object,embed,img"

/**
 * Chrome / chrome-adjacent chrome. Conservative: no bare `header` (业务页标题常在里头).
 * Keep in sync with captureCleanedPageHtml.
 */
const CHROME_SELECTOR = [
  "nav",
  "footer",
  "aside",
  "dialog",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
  "[role=complementary]",
  "[role=search]",
  "[role=dialog]",
  "[role=alertdialog]",
  "[hidden]",
  '[aria-hidden="true"]'
].join(",")

const MAIN_SELECTORS = ["main", "article", "[role=main]"] as const

function createTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: "atx" })
  td.use(gfm)
  return td
}

function removeMatches(root: ParentNode, selector: string): void {
  root.querySelectorAll(selector).forEach((el) => {
    el.remove()
  })
}

/** Drop empty anchors that become `[](...)` after Turndown. */
function removeEmptyAnchors(root: ParentNode): void {
  root.querySelectorAll("a").forEach((a) => {
    if (!(a.textContent ?? "").trim()) {
      a.remove()
    }
  })
}

function pickMainRoot(doc: Document): Element {
  for (const selector of MAIN_SELECTORS) {
    const el = doc.querySelector(selector)
    if (el) {
      return el
    }
  }
  return doc.body ?? doc.documentElement
}

function cloneDocument(doc: Document): Document {
  return doc.cloneNode(true) as Document
}

function parseHtmlDocument(html: string): Document {
  if (typeof DOMParser === "undefined") {
    throw new Error(
      "DOMParser is not available; htmlToMarkdown requires a browser-like environment"
    )
  }
  return new DOMParser().parseFromString(html, "text/html")
}

function cleanCloneForMarkdown(doc: Document): Document {
  const cleaned = cloneDocument(doc)
  removeMatches(cleaned, HARD_NOISE_SELECTOR)
  removeMatches(cleaned, CHROME_SELECTOR)
  removeEmptyAnchors(cleaned)
  return cleaned
}

function turndownPolished(root: Element): string {
  return polishPageMarkdown(createTurndown().turndown(root))
}

export function htmlToMarkdown(html: string): string {
  const doc = parseHtmlDocument(html)
  const root = doc.body ?? doc.documentElement
  removeMatches(root, HARD_NOISE_SELECTOR)
  removeMatches(root, CHROME_SELECTOR)
  removeEmptyAnchors(root)
  return turndownPolished(root)
}

export function documentToMarkdown(doc: Document): {
  title: string
  markdown: string
} {
  const title = doc.title ?? ""
  const cleaned = cleanCloneForMarkdown(doc)
  const mainRoot = pickMainRoot(cleaned)
  let markdown = turndownPolished(mainRoot)
  if (markdown.length < SHORT_MARKDOWN_FALLBACK_CHARS) {
    // Fallback: only hard-noise (aside 等可能承载列表，少删)
    const fallbackDoc = cloneDocument(doc)
    removeMatches(fallbackDoc, HARD_NOISE_SELECTOR)
    removeEmptyAnchors(fallbackDoc)
    const body = fallbackDoc.body ?? fallbackDoc.documentElement
    const fallbackMarkdown = turndownPolished(body)
    if (
      !markdown.trim() ||
      fallbackMarkdown.length >= SHORT_MARKDOWN_FALLBACK_CHARS
    ) {
      markdown = fallbackMarkdown
    }
  }
  return { title, markdown }
}

/**
 * Page-world helper for `chrome.scripting.executeScript({ func })`.
 * Selectors are inlined so the function serializes (no closed-over imports).
 */
export function captureCleanedPageHtml(): { title: string; html: string } {
  const hardNoise =
    "script,noscript,style,template,svg,iframe,canvas,object,embed,img"
  const chromeSel = [
    "nav",
    "footer",
    "aside",
    "dialog",
    "[role=navigation]",
    "[role=banner]",
    "[role=contentinfo]",
    "[role=complementary]",
    "[role=search]",
    "[role=dialog]",
    "[role=alertdialog]",
    "[hidden]",
    '[aria-hidden="true"]'
  ].join(",")
  const cloned = document.cloneNode(true) as Document
  cloned.querySelectorAll(hardNoise).forEach((el) => {
    el.remove()
  })
  cloned.querySelectorAll(chromeSel).forEach((el) => {
    el.remove()
  })
  cloned.querySelectorAll("a").forEach((a) => {
    if (!(a.textContent ?? "").trim()) {
      a.remove()
    }
  })
  const root =
    cloned.querySelector("main") ??
    cloned.querySelector("article") ??
    cloned.querySelector("[role=main]") ??
    cloned.body ??
    cloned.documentElement
  const probe = (root.textContent ?? "").trim()
  if (probe.length < 80) {
    const fallback = document.cloneNode(true) as Document
    fallback.querySelectorAll(hardNoise).forEach((el) => {
      el.remove()
    })
    fallback.querySelectorAll("a").forEach((a) => {
      if (!(a.textContent ?? "").trim()) {
        a.remove()
      }
    })
    const body = fallback.body ?? fallback.documentElement
    const fallbackText = (body.textContent ?? "").trim()
    if (!probe || fallbackText.length >= 80) {
      return { title: document.title, html: body.outerHTML }
    }
  }
  return { title: document.title, html: root.outerHTML }
}
